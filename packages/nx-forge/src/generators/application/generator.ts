import {
  ensurePackage,
  formatFiles,
  GeneratorCallback,
  joinPathFragments,
  NX_VERSION,
  readProjectConfiguration,
  runTasksInSerial,
  Tree,
  updateJson,
  updateProjectConfiguration,
  updateTsConfigsToJs,
} from '@nx/devkit';
import { initGenerator as jsInitGenerator } from '@nx/js';
import { addLintingToProject, getTsConfigBaseOptions } from '@nx/js/internal';
import initGenerator from '../init/generator';
import { ApplicationGeneratorOptions, NormalizedOptions } from './schema';
import { addProject, addAppFiles, normalizeOptions } from './lib';
import { addProjectDependencies } from './lib/add-project-dependencies';
import { logShowProjectCommand } from '@nx/devkit/internal';

function updateTsConfigOptions(tree: Tree, options: NormalizedOptions) {
  updateJson(tree, `${options.appProjectRoot}/tsconfig.json`, (json) => {
    if (options.rootProject) {
      return {
        compilerOptions: {
          ...getTsConfigBaseOptions(tree),
          ...json.compilerOptions,
          esModuleInterop: true,
        },
        ...json,
        extends: undefined,
        exclude: ['node_modules', 'tmp'],
      };
    } else {
      return {
        ...json,
        compilerOptions: {
          ...json.compilerOptions,
          esModuleInterop: true,
        },
      };
    }
  });
}

// There are no tests by default, so set `--passWithNoTests` to avoid test failure on new project.
function addPassWithNoTests(tree: Tree, projectName: string) {
  const projectConfig = readProjectConfiguration(tree, projectName);
  updateProjectConfiguration(tree, projectName, {
    ...projectConfig,
    targets: {
      ...projectConfig.targets,
      test: {
        ...projectConfig.targets?.test,
        options: {
          ...projectConfig.targets?.test?.options,
          passWithNoTests: true,
        },
      },
    },
  });
}

export async function applicationGenerator(
  tree: Tree,
  rawOptions: ApplicationGeneratorOptions
): Promise<GeneratorCallback> {
  const options = await normalizeOptions(tree, rawOptions);

  const tasks: GeneratorCallback[] = [];

  const jsInitTask = await jsInitGenerator(tree, {
    ...rawOptions,
    tsConfigName: options.rootProject ? 'tsconfig.json' : 'tsconfig.base.json',
    skipFormat: true,
  });
  tasks.push(jsInitTask);

  const initTask = await initGenerator(tree, {
    skipFormat: true,
  });
  tasks.push(initTask);

  const installTask = await addProjectDependencies(tree, options);
  tasks.push(installTask);

  if (options.bundler === 'webpack') {
    const { webpackInitGenerator } = ensurePackage<
      typeof import('@nx/webpack')
    >('@nx/webpack', NX_VERSION);
    const webpackInitTask = await webpackInitGenerator(tree, {
      skipPackageJson: options.skipPackageJson,
      skipFormat: true,
    });
    tasks.push(webpackInitTask);
  }

  addAppFiles(tree, options);
  addProject(tree, options);

  updateTsConfigOptions(tree, options);

  if (options.linter !== 'none') {
    const lintTask = await addLintingToProject(tree, {
      linter: options.linter,
      project: options.name,
      tsConfigPaths: [
        joinPathFragments(options.appProjectRoot, 'tsconfig.app.json'),
      ],
      unitTestRunner: options.unitTestRunner,
      enableTypedLinting: options.enableTypedLinting,
      rootProject: options.rootProject,
    });
    tasks.push(lintTask);
  }

  if (options.unitTestRunner === 'jest') {
    const { configurationGenerator: jestConfigurationGenerator } =
      ensurePackage<typeof import('@nx/jest')>('@nx/jest', NX_VERSION);
    const jestTask = await jestConfigurationGenerator(tree, {
      ...options,
      project: options.name,
      setupFile: 'none',
      skipSerializers: true,
      supportTsx: options.js,
      testEnvironment: 'node',
      compiler: options.swcJest ? 'swc' : 'tsc',
      skipFormat: true,
    });
    tasks.push(jestTask);
    addPassWithNoTests(tree, options.name);
  } else if (options.unitTestRunner === 'vitest') {
    ensurePackage('@nx/vitest', NX_VERSION);
    // CommonJS `require` instead of dynamic ESM `import`: `ensurePackage`
    // exposes the temp install via `Module._initPaths`, which ESM ignores.
    const {
      configurationGenerator: vitestConfigurationGenerator,
    }: typeof import('@nx/vitest/generators') = require('@nx/vitest/generators');
    const vitestTask = await vitestConfigurationGenerator(tree, {
      project: options.name,
      uiFramework: 'none',
      coverageProvider: 'v8',
      testEnvironment: 'node',
      runtimeTsconfigFileName: 'tsconfig.app.json',
      // There are no tests by default, so avoid failing `nx test` on a new app.
      passWithNoTests: true,
      skipPackageJson: options.skipPackageJson,
      skipFormat: true,
    });
    tasks.push(vitestTask);
  }

  if (options.js) {
    updateTsConfigsToJs(tree, { projectRoot: options.appProjectRoot });
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  tasks.push(() => {
    logShowProjectCommand(options.name);
  });

  return runTasksInSerial(...tasks);
}

export default applicationGenerator;
