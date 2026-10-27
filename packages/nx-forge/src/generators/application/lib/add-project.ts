import {
  addProjectConfiguration,
  joinPathFragments,
  ProjectConfiguration,
  TargetConfiguration,
  Tree,
} from '@nx/devkit';
import { NormalizedOptions } from '../schema';
import { addBuildTargetDefaults } from '@nx/devkit/internal';

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
      outputPath: joinPathFragments(options.outputPath, 'src'),
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
    tags: options.parsedTags,
  };

  if (options.bundler === 'esbuild') {
    addBuildTargetDefaults(tree, '@nx/esbuild:esbuild', 'build');
  }

  const targets: ProjectConfiguration['targets'] =
    options.bundler === 'esbuild'
      ? { build: getEsBuildConfig(project, options) }
      : {};

  addProjectConfiguration(tree, options.name, { ...project, targets });
}
