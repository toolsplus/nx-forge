import { Tree } from '@nx/devkit';
import type { ApplicationGeneratorOptions, NormalizedOptions } from '../schema';
import { determineProjectNameAndRootOptions } from '@nx/devkit/internal';
import { getForgeOutputPath } from '../../../shared/forge-output-path';

export async function normalizeOptions(
  tree: Tree,
  options: ApplicationGeneratorOptions
): Promise<NormalizedOptions> {
  const { projectName: appProjectName, projectRoot: appProjectRoot } =
    await determineProjectNameAndRootOptions(tree, {
      name: options.name,
      projectType: 'application',
      directory: options.directory,
      rootProject: options.rootProject,
    });

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    name: appProjectName,
    appProjectRoot,
    outputPath: getForgeOutputPath(appProjectRoot),
    parsedTags,
    bundler: options.bundler ?? 'webpack',
    linter: options.linter ?? 'eslint',
    unitTestRunner: options.unitTestRunner ?? 'jest',
    rootProject: appProjectRoot === '.',
  };
}
