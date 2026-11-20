import {
  formatFiles,
  getProjects,
  joinPathFragments,
  MigrationReturnObject,
  ProjectConfiguration,
  TargetConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';

/**
 * Webpack configs that `@nx/webpack/plugin` infers a build target from.
 */
const WEBPACK_CONFIG_FILES = [
  'webpack.config.js',
  'webpack.config.cjs',
  'webpack.config.mjs',
  'webpack.config.ts',
];

const ESBUILD_EXECUTOR = '@nx/esbuild:esbuild';
const BUILD_TARGET = 'build';
const OLD_FOLDER = 'src';
const NEW_FOLDER = 'bundle';

const EXTERNAL_DEPENDENCIES_LINES = [
  '// Forge ships the bundle as it is, so it must include all dependencies',
  '// except Node built-ins.',
  "externalDependencies: 'none',",
];

const PLUGIN_OPTIONS_START = /\bnew\s+NxAppWebpackPlugin\s*\(\s*\{/g;
const OUTPUT_PATH = /\boutputPath\s*:\s*(['"])([^'"\n]*)\1/g;
const EXTERNAL_DEPENDENCIES = /\bexternalDependencies\b/g;
const EXTERNAL_DEPENDENCIES_NONE = /\bexternalDependencies\s*:\s*(['"])none\1/;
const LINE_BREAK_AND_INDENT = /^[ \t]*(\r?\n)([ \t]*)/;

/**
 * Result of migrating one build configuration: either the old and new output
 * folders, or the reason it has to be updated by hand.
 */
type BuildMigration =
  | { readonly outputPaths: readonly [string, string] }
  | { readonly manual: string };

const isForgeProject = (tree: Tree, root: string): boolean =>
  tree.exists(joinPathFragments(root, 'manifest.yml'));

/**
 * Output path in the bundle folder, or `undefined` unless the path points at
 * the old `src` folder or already at the bundle folder.
 */
const toBundleOutputPath = (outputPath: unknown): string | undefined => {
  if (typeof outputPath !== 'string') {
    return undefined;
  }
  const path = outputPath.replace(/\/+$/, '');
  const segments = path.split('/');
  const folder = segments.at(-1);
  if (folder === NEW_FOLDER) {
    return path;
  }
  return folder === OLD_FOLDER
    ? [...segments.slice(0, -1), NEW_FOLDER].join('/')
    : undefined;
};

/**
 * Moves the output path of the `NxAppWebpackPlugin` options to the bundle
 * folder and makes the plugin inline all dependencies.
 *
 * Only migrates configs in the shape that the application generator writes:
 * one plugin, one literal `outputPath` and no `externalDependencies` other
 * than `'none'`. Other configs are left for a manual or agent-assisted update,
 * and the `package` executor fails on an incomplete bundle.
 */
const migrateWebpackConfig = (
  tree: Tree,
  root: string,
  path: string
): BuildMigration => {
  const contents = tree.read(path, 'utf-8') ?? '';
  const manual = { manual: path };

  const pluginStarts = Array.from(contents.matchAll(PLUGIN_OPTIONS_START));
  const outputPaths = Array.from(contents.matchAll(OUTPUT_PATH));
  const externalDependencies = Array.from(
    contents.matchAll(EXTERNAL_DEPENDENCIES)
  );
  const hasExternalDependenciesNone =
    externalDependencies.length === 1 &&
    EXTERNAL_DEPENDENCIES_NONE.test(contents);
  if (
    pluginStarts.length !== 1 ||
    outputPaths.length !== 1 ||
    (externalDependencies.length > 0 && !hasExternalDependenciesNone)
  ) {
    return manual;
  }

  const [outputPathMatch, quote, outputPath] = outputPaths[0];
  const bundleOutputPath = toBundleOutputPath(outputPath);
  if (bundleOutputPath === undefined) {
    return manual;
  }

  const outputPathAt = outputPaths[0].index ?? 0;
  const withOutputPath =
    contents.slice(0, outputPathAt) +
    outputPathMatch.replace(
      `${quote}${outputPath}${quote}`,
      `${quote}${bundleOutputPath}${quote}`
    ) +
    contents.slice(outputPathAt + outputPathMatch.length);

  const insertAt = (pluginStarts[0].index ?? 0) + pluginStarts[0][0].length;
  const rest = withOutputPath.slice(insertAt);
  const lineBreak = LINE_BREAK_AND_INDENT.exec(rest);
  const insertion = hasExternalDependenciesNone
    ? ''
    : lineBreak
    ? EXTERNAL_DEPENDENCIES_LINES.map(
        (line) => `${lineBreak[1]}${lineBreak[2]}${line}`
      ).join('')
    : ` ${EXTERNAL_DEPENDENCIES_LINES.at(-1)}`;

  tree.write(path, withOutputPath.slice(0, insertAt) + insertion + rest);

  return {
    outputPaths: [
      joinPathFragments(root, outputPath),
      joinPathFragments(root, bundleOutputPath),
    ],
  };
};

type Options = Record<string, unknown>;

const migrateEsbuildOptions = (options: Options): Options | undefined => {
  if (!('outputPath' in options)) {
    return options;
  }
  const outputPath = toBundleOutputPath(options.outputPath);
  return outputPath === undefined ? undefined : { ...options, outputPath };
};

/**
 * Moves the output path of an esbuild target to the bundle folder and turns on
 * `thirdParty`, so that esbuild inlines all dependencies.
 */
const migrateEsbuildTarget = (
  target: TargetConfiguration
): TargetConfiguration | undefined => {
  const options = migrateEsbuildOptions(target.options ?? {});
  const configurations = Object.entries(target.configurations ?? {}).map(
    ([name, configuration]) =>
      [
        name,
        migrateEsbuildOptions(
          'thirdParty' in configuration
            ? { ...configuration, thirdParty: true }
            : configuration
        ),
      ] as const
  );
  if (
    options === undefined ||
    typeof target.options?.outputPath !== 'string' ||
    [target.options, ...Object.values(target.configurations ?? {})].some(
      (configuration) =>
        // esbuild only inlines dependencies into a bundle.
        configuration?.bundle === false ||
        // Forge loads handlers from a CommonJS bundle.
        (Array.isArray(configuration?.format) &&
          configuration.format.includes('esm')) ||
        // An explicit esbuild output location wins over `outputPath`.
        configuration?.esbuildOptions?.outfile !== undefined ||
        configuration?.esbuildOptions?.outdir !== undefined
    ) ||
    configurations.some(([, configuration]) => configuration === undefined)
  ) {
    return undefined;
  }
  return {
    ...target,
    options: { ...options, thirdParty: true },
    ...(target.configurations && {
      configurations: Object.fromEntries(configurations),
    }),
  };
};

const migrateEsbuildTargets = (
  tree: Tree,
  name: string,
  project: ProjectConfiguration
): BuildMigration[] => {
  // Forge ships the output of the app's `build` target, which the tunnel
  // executor also runs.
  const targets = Object.entries(project.targets ?? {}).filter(
    ([targetName, target]) =>
      targetName === BUILD_TARGET && target.executor === ESBUILD_EXECUTOR
  );
  const migrated = targets.map(
    ([targetName, target]) =>
      [targetName, target, migrateEsbuildTarget(target)] as const
  );
  const results = migrated.map(
    ([targetName, target, migratedTarget]): BuildMigration =>
      migratedTarget === undefined
        ? {
            manual: `${name}:${targetName} (${joinPathFragments(
              project.root,
              'project.json'
            )})`,
          }
        : {
            outputPaths: [
              target.options.outputPath,
              migratedTarget.options.outputPath,
            ],
          }
  );

  if (migrated.some(([, , migratedTarget]) => migratedTarget !== undefined)) {
    updateProjectConfiguration(tree, name, {
      ...project,
      targets: {
        ...project.targets,
        ...Object.fromEntries(
          migrated.map(([targetName, target, migratedTarget]) => [
            targetName,
            migratedTarget ?? target,
          ])
        ),
      },
    });
  }

  return results;
};

const migrateProject = (
  tree: Tree,
  name: string,
  project: ProjectConfiguration
): BuildMigration[] => {
  const results = [
    ...WEBPACK_CONFIG_FILES.map((file) => joinPathFragments(project.root, file))
      .filter((path) => tree.exists(path))
      .map((path) => migrateWebpackConfig(tree, project.root, path)),
    ...migrateEsbuildTargets(tree, name, project),
  ];
  // The app builds with something other than the generated Webpack or
  // esbuild setup.
  return results.length > 0
    ? results
    : [{ manual: `${name}:${BUILD_TARGET} (${project.root})` }];
};

const nextSteps = (results: BuildMigration[]): string[] => {
  const manual = results.flatMap((result) =>
    'manual' in result ? [result.manual] : []
  );
  const outputPaths = results.flatMap((result) =>
    'outputPaths' in result && result.outputPaths[0] !== result.outputPaths[1]
      ? [result.outputPaths]
      : []
  );
  return [
    'Use Forge CLI 15.1.0 or later. Earlier versions do not support manual packaging.',
    ...(manual.length > 0
      ? [
          `Update these Forge app build configurations by hand, so that the build writes a CommonJS bundle that inlines all dependencies except Node built-ins to the 'bundle' folder of the artifact directory: ${manual.join(
            ', '
          )}`,
        ]
      : []),
    ...(outputPaths.length > 0
      ? [
          `The build now writes to the 'bundle' folder. Update hand-written references to the old folder, such as source-map upload globs or scripts: ${outputPaths
            .map(([from, to]) => `${from} -> ${to}`)
            .join(', ')}`,
        ]
      : []),
    "Forge no longer bundles the app, so it no longer sets process.env.NODE_ENV to 'production' and no longer ignores optional dependencies. New apps define NODE_ENV in their build configuration; Webpack configs also ignore the optional dependencies 'encoding', 'bufferutil', 'utf-8-validate' and 'dtrace-provider'. Add the same to existing apps if their code or dependencies need it. New esbuild targets also emit source maps in every configuration. In esbuild targets, a configuration's esbuildOptions replace the base esbuildOptions, so remove or update configurations that set them, such as the production configuration that earlier versions generated with source maps turned off.",
  ];
};

/**
 * The Nx build is now the only bundler and Forge ships its output unchanged.
 * Make the build of each Forge app inline all dependencies and write to the
 * `bundle` folder of the artifact directory instead of `src`.
 *
 * @see https://github.com/toolsplus/nx-forge/issues/222
 */
export default async function update(
  tree: Tree
): Promise<MigrationReturnObject | undefined> {
  const forgeProjects = Array.from(getProjects(tree).entries()).filter(
    ([, project]) => isForgeProject(tree, project.root)
  );
  const results = forgeProjects.flatMap(([name, project]) =>
    migrateProject(tree, name, project)
  );

  await formatFiles(tree);

  return forgeProjects.length > 0
    ? { nextSteps: nextSteps(results) }
    : undefined;
}
