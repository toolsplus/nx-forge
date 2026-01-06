import {
  addProjectConfiguration,
  joinPathFragments,
  ProjectConfiguration,
  TargetConfiguration,
  Tree,
} from '@nx/devkit';
import { NormalizedOptions } from '../schema';
import { addBuildTargetDefaults } from '@nx/devkit/src/generators/target-defaults-utils';
import { hasWebpackPlugin } from '../../../utils/has-webpack-plugin';

function getWebpackBuildConfig(
  project: ProjectConfiguration,
  options: NormalizedOptions
): TargetConfiguration {
  return {
    executor: `@nx/webpack:webpack`,
    outputs: ['{options.outputPath}'],
    defaultConfiguration: 'production',
    options: {
      target: 'node',
      compiler: 'tsc',
      outputPath: joinPathFragments(
        'dist',
        (options.rootProject ? options.name : options.appProjectRoot) ?? '',
        'src'
      ),
      main: joinPathFragments(
        project.sourceRoot ?? '',
        'index' + (options.js ? '.js' : '.ts')
      ),
      outputFileName: 'index.js',
      tsConfig: joinPathFragments(options.appProjectRoot, 'tsconfig.app.json'),
      assets: [joinPathFragments(project.sourceRoot ?? '', 'assets')],
      webpackConfig: joinPathFragments(
        options.appProjectRoot,
        'webpack.config.js'
      ),
    },
    configurations: {
      development: {},
      production: {},
    },
  };
}

function getEsBuildConfig(
  project: ProjectConfiguration,
  options: NormalizedOptions
): TargetConfiguration {
  return {
    executor: '@nx/esbuild:esbuild',
    outputs: ['{options.outputPath}'],
    defaultConfiguration: 'production',
    options: {
      platform: 'node',
      outputPath: joinPathFragments(
        'dist',
        (options.rootProject ? options.name : options.appProjectRoot) ?? '',
        'src'
      ),
      // Use CJS for Node apps for widest compatibility.
      format: ['cjs'],
      bundle: true,
      main: joinPathFragments(
        project.sourceRoot ?? '',
        'index' + (options.js ? '.js' : '.ts')
      ),
      outputFileName: 'index.js',
      tsConfig: joinPathFragments(options.appProjectRoot, 'tsconfig.app.json'),
      assets: [joinPathFragments(project.sourceRoot ?? '', 'assets')],
      generatePackageJson: false,
      esbuildOptions: {
        sourcemap: true,
        // Generate CJS files as .js so imports can be './foo' rather than './foo.cjs'.
        outExtension: { '.js': '.js' },
      },
    },
    configurations: {
      development: {},
      production: {
        esbuildOptions: {
          sourcemap: false,
          // Generate CJS files as .js so imports can be './foo' rather than './foo.cjs'.
          outExtension: { '.js': '.js' },
        },
      },
    },
  };
}

/**
 * Generate the new Forge app project in the workspace and configure
 * available targets.
 */
export function addProject(tree: Tree, options: NormalizedOptions) {
  const project: ProjectConfiguration = {
    root: options.appProjectRoot,
    sourceRoot: joinPathFragments(options.appProjectRoot, 'src'),
    projectType: 'application',
    targets: {},
    tags: options.parsedTags,
  };

  if (options.bundler === 'esbuild') {
    addBuildTargetDefaults(tree, '@nx/esbuild:esbuild');
    project.targets ??= {};
    project.targets.build = getEsBuildConfig(project, options);
  } else if (options.bundler === 'webpack') {
    if (!hasWebpackPlugin(tree)) {
      addBuildTargetDefaults(tree, `@nx/webpack:webpack`);
      project.targets ??= {};
      project.targets.build = getWebpackBuildConfig(project, options);
    }
  }

  addProjectConfiguration(
    tree,
    options.name || '',
    project,
    options.standaloneConfig
  );
}
