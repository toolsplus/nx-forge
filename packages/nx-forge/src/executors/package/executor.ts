import { ExecutorContext, logger } from '@nx/devkit';
import { NormalizedOptions, PackageExecutorSchema } from './schema';
import { processCustomUIDependencies } from '../build/lib/process-custom-ui-dependencies';
import { patchManifestYml } from '../build/lib/patch-manifest-yml';
import { generatePackageJson } from '../build/lib/generate-package-json';
import { copyForgeAppAssets } from '../build/lib/copy-forge-app-assets';

export function normalizeOptions(
  options: PackageExecutorSchema,
  root: string,
  sourceRoot: string,
  projectRoot: string
): NormalizedOptions {
  return {
    ...options,
    root,
    sourceRoot,
    projectRoot,
    resourcePath: options.resourcePath ?? 'resources',
    resourceOutputPathMap: options.resourceOutputPathMap ?? {},
  };
}

export default async function runExecutor(
  rawOptions: PackageExecutorSchema,
  context: ExecutorContext
) {
  const { root, sourceRoot } =
    context.projectsConfigurations!.projects[context.projectName!];

  if (!sourceRoot) {
    throw new Error(`${context.projectName} does not have a sourceRoot.`);
  }

  if (!root) {
    throw new Error(`${context.projectName} does not have a root.`);
  }

  const options = normalizeOptions(rawOptions, context.root, sourceRoot, root);

  copyForgeAppAssets(options);

  const customUIResources = await processCustomUIDependencies(
    { ...options, customUIPath: options.resourcePath },
    context
  );

  await patchManifestYml({ ...options, customUIPath: options.resourcePath });

  generatePackageJson(
    context.projectName!,
    context.projectGraph!,
    customUIResources,
    options
  );

  logger.info('Executor ran for package');
  return {
    success: true,
  };
}
