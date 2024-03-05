import { Linter } from '@nx/eslint';
import { Tree } from '@nx/devkit';
import type { ApplicationGeneratorOptions, NormalizedOptions } from '../schema';
import { determineProjectNameAndRootOptions } from '@nx/devkit/src/generators/project-name-and-root-utils';

export async function normalizeOptions(
  tree: Tree,
  options: ApplicationGeneratorOptions
): Promise<NormalizedOptions> {
  const {
    projectName: appProjectName,
    projectRoot: appProjectRoot,
    projectNameAndRootFormat,
  } = await determineProjectNameAndRootOptions(tree, {
    name: options.name,
    projectType: 'application',
    directory: options.directory,
    projectNameAndRootFormat: options.projectNameAndRootFormat,
    rootProject: options.rootProject,
    callingGenerator: '@toolsplus/nx-forge:application',
  });
  options.rootProject = appProjectRoot === '.';
  options.projectNameAndRootFormat = projectNameAndRootFormat;

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const addPlugin = process.env.NX_ADD_PLUGINS !== 'false';
  // At the time we implemented this, 'useInferencePlugins' was not yet available in the NxJsonConfiguration definition.
  // Add this check once 'useInferencePlugins' is available.
  // Refer to the check here:https://github.com/nrwl/nx/blob/47df7f94aff3e08314659051817b9c8a8023ac94/packages/node/src/generators/application/application.ts#L550
  // && nxJson.useInferencePlugins !== false;

  return {
    addPlugin,
    ...options,
    name: appProjectName,
    appProjectRoot,
    parsedTags,
    linter: options.linter ?? Linter.EsLint,
    unitTestRunner: options.unitTestRunner ?? 'jest',
    rootProject: options.rootProject ?? false,
  };
}
