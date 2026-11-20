import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { load } from 'js-yaml';
import { ExecutorContext, joinPathFragments, logger } from '@nx/devkit';
import { NormalizedOptions, PackageExecutorSchema } from './schema';
import { processResourceDependencies } from './lib/process-resource-dependencies';
import { patchManifestYml } from './lib/patch-manifest-yml';
import { copyForgeAppAssets } from './lib/copy-forge-app-assets';
import { verifyBundleCompleteness } from './lib/verify-bundle-completeness';
import { removeBundlePackageJson } from './lib/remove-bundle-package-json';
import { verifyPackagingKeys } from '../../shared/manifest/packaging';
import { BUNDLE_DIRECTORY } from '../../shared/forge-output-path';

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
    allowMissingModules: options.allowMissingModules ?? [],
  };
}

export default async function runExecutor(
  rawOptions: PackageExecutorSchema,
  context: ExecutorContext
) {
  if (context.projectName === undefined) {
    throw new Error('No project name provided in executor context.');
  }

  const { root, sourceRoot } =
    context.projectsConfigurations.projects[context.projectName];

  if (!sourceRoot) {
    throw new Error(`${context.projectName} does not have a sourceRoot.`);
  }

  if (!root) {
    throw new Error(`${context.projectName} does not have a root.`);
  }

  const options = normalizeOptions(rawOptions, context.root, sourceRoot, root);

  const manifestPath = joinPathFragments(root, 'manifest.yml');
  verifyPackagingKeys(
    load(readFileSync(join(context.root, manifestPath), 'utf8')),
    manifestPath
  );

  const bundlePath = resolve(
    options.root,
    options.outputPath,
    BUNDLE_DIRECTORY
  );
  removeBundlePackageJson(bundlePath);
  verifyBundleCompleteness(bundlePath, options.allowMissingModules);

  copyForgeAppAssets(options);

  await processResourceDependencies(
    { ...options, resourcePath: options.resourcePath },
    context
  );

  await patchManifestYml({ ...options, resourcePath: options.resourcePath });

  logger.info('Executor ran for package');
  return {
    success: true,
  };
}
