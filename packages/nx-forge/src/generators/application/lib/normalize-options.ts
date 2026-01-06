import { readNxJson, Tree } from '@nx/devkit';
import type { ApplicationGeneratorOptions, NormalizedOptions } from '../schema';
import { determineProjectNameAndRootOptions } from '@nx/devkit/src/generators/project-name-and-root-utils';

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
  options.rootProject = appProjectRoot === '.';

  options.bundler = options.bundler ?? 'webpack';

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const nxJson = readNxJson(tree);
  const addPlugin =
    process.env.NX_ADD_PLUGINS !== 'false' &&
    nxJson?.useInferencePlugins !== false;

  return {
    addPlugin,
    ...options,
    name: appProjectName,
    appProjectRoot,
    parsedTags,
    linter: options.linter ?? 'eslint',
    unitTestRunner: options.unitTestRunner ?? 'jest',
    rootProject: options.rootProject ?? false,
  };
}
