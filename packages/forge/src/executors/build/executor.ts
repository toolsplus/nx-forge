import type { ExecutorContext, ProjectGraph } from '@nrwl/devkit';
import { BuildExecutorOptions } from './schema';
import { normalizeOptions } from './lib/normalize-options';
import { processCustomUIDependencies } from './lib/process-custom-ui-dependencies';
import { patchManifestYml } from './lib/patch-manifest-yml';
import { generatePackageJson } from './lib/generate-package-json';
import { readCachedProjectGraph } from '@nrwl/workspace/src/core/project-graph';
import { compileWebpack } from './lib/compile-webpack';
import { copyForgeAppAssets } from './lib/copy-forge-app-assets';
import { createProjectGraphAsync } from '@nrwl/devkit';

/**
 *  Try to read a cached project graph. If it does not exist
 *  trigger creation to ensure the project graph exists.
 */
async function readOrCreateProjectGraph(): Promise<ProjectGraph> {
  try {
    return readCachedProjectGraph();
  } catch (e) {
    return createProjectGraphAsync();
  }
}

export default async function runExecutor(
  rawOptions: BuildExecutorOptions,
  context: ExecutorContext
) {
  const { root, sourceRoot } = context.workspace.projects[context.projectName];

  if (!sourceRoot) {
    throw new Error(`${context.projectName} does not have a sourceRoot.`);
  }

  if (!root) {
    throw new Error(`${context.projectName} does not have a root.`);
  }

  const options = normalizeOptions(rawOptions, context.root, sourceRoot, root);
  const compilation = compileWebpack(options, context);

  for await (const result of compilation) {
    if (!result.success) {
      throw new Error(
        `Failed to compile files for project ${context.projectName}.`
      );
    }
  }

  copyForgeAppAssets(options);
  const customUIResources = await processCustomUIDependencies(options, context);
  await patchManifestYml(options);
  const projectGraph = await readOrCreateProjectGraph();
  generatePackageJson(
    context.projectName,
    projectGraph,
    customUIResources,
    options
  );

  console.log('Executor ran for build');
  return {
    success: true,
  };
}
