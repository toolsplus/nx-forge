import { ExecutorContext, logger } from '@nx/devkit';
import { NormalizedOptions } from '../schema';
import { copyForgeAppAssets } from './copy-forge-app-assets';
import { processResourceDependencies } from './process-resource-dependencies';
import { patchManifestYml } from './patch-manifest-yml';
import { generatePackageJson } from './generate-package-json';

export async function prepareForgeOutput(
  options: NormalizedOptions,
  context: ExecutorContext
) {
  copyForgeAppAssets(options);

  const resources = await processResourceDependencies(
    { ...options, resourcePath: options.resourcePath },
    context
  );

  await patchManifestYml({ ...options, resourcePath: options.resourcePath });

  generatePackageJson({
    root: options.root,
    projectRoot: options.projectRoot,
    outputPath: options.outputPath,
    tsConfig: options.tsConfig,
    projectName: context.projectName!,
    projectGraph: context.projectGraph,
    manifestResources: resources,
  });

  logger.info('Forge output is ready.');
}
