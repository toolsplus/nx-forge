import { join, resolve } from 'path';
import { joinPathFragments, logger } from '@nx/devkit';
import { ManifestSchema, Resources } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { NormalizedOptions } from '../schema';
import {
  readManifestYml,
  writeManifestYml,
} from '../../../utils/forge/manifest-yml';
import { existsSync } from 'fs';
import {
  getResourceTypeIndex,
  isResourceType,
  ResourceType,
  ResourceTypeIndex,
} from '../../../shared/manifest/util-manifest';

type Options = Pick<
  NormalizedOptions,
  'root' | 'outputPath' | 'uiKit2Packaging'
> & {
  resourcePath: string;
};

/**
 * Patches the output manifest.yml file to replace resource path parameters to
 * point to the actual resource build artifacts instead of the Nx project
 * reference.
 *
 * This assumes that resource artifacts have already been copied to the output
 * directory in a previous step.
 *
 * @param options Executor options
 */
export async function patchManifestYml(options: Options) {
  const absoluteOutputPath = resolve(options.root, options.outputPath);
  const manifestPath = joinPathFragments(absoluteOutputPath, 'manifest.yml');

  logger.info(`Patching ${manifestPath}...`);

  const manifestSchema = await readManifestYml(manifestPath);

  const patchedManifest = patchManifestInternal(
    absoluteOutputPath,
    manifestSchema,
    options
  );

  writeManifestYml(manifestPath, patchedManifest);

  logger.info(`Done patching ${manifestPath}.`);
}

function patchManifestInternal(
  absoluteOutputPath: string,
  manifestSchema: ManifestSchema,
  options: Options
): ManifestSchema {
  const resources: Resources = manifestSchema.resources || [];
  const uiResources = resources.filter(
    isResourceType(manifestSchema, ['ui-kit', 'custom-ui'])
  );
  const genericResources = resources.filter(
    isResourceType(manifestSchema, ['generic'])
  );

  // Integrity check: We want to be sure that we are not losing any resource
  // definitions when separating them into UI and generic resources.
  const resourceKeySet = new Set(resources.map((r) => r.key));
  const uiResourcesKeySet = new Set(uiResources.map((r) => r.key));
  const genericResourcesKeySet = new Set(genericResources.map((r) => r.key));
  const missingResourceKeys = [...resourceKeySet].filter(
    (k) => !uiResourcesKeySet.has(k) && !genericResourcesKeySet.has(k)
  );
  if (missingResourceKeys.length > 0) {
    logger.warn(
      `Failed to determine resource type for resource definitions with keys ${missingResourceKeys}.

      This is most likely a plugin error and should be fixed. Please include the manifest.yml in the issue report.`
    );
  }

  if (!options.uiKit2Packaging) {
    return {
      ...manifestSchema,
      resources: [
        ...uiResources.map((resource) => ({
          ...resource,
          path: `${options.resourcePath}/${resource.path}`,
        })),
        ...genericResources,
      ],
    };
  } else {
    const resourceTypeIndex: ResourceTypeIndex =
      getResourceTypeIndex(manifestSchema);
    return {
      ...manifestSchema,
      resources: [
        ...uiResources.map((r) =>
          patchResource(
            options.resourcePath,
            r,
            absoluteOutputPath,
            resourceTypeIndex[r.key]
          )
        ),
        ...genericResources,
      ],
    };
  }
}

/**
 * Returns the final resource path based on the given resource type.
 *
 * Verifies that the path/file exists in the computed directory. UI Kit builds are expected to produce an accepted
 * bundle filename.
 *
 * @param resourcePath Path where all resource build artifacts are placed, relative to the app root directory
 * @param resourceType Type of the given resource, `ui-kit` or `custom-ui`
 * @param resource Resource to process
 * @param absoluteOutputPath Absolute project output path
 */
function getVerifiedResourcePath(
  resourcePath: string,
  resourceType: ResourceType,
  resource: HostedResourcesSchema,
  absoluteOutputPath: string
): string {
  const resourceProjectName = resource.path;
  const relativeResourcePath = join(resourcePath, resourceProjectName);
  const absoluteResourcePath = join(absoluteOutputPath, relativeResourcePath);

  if (!existsSync(absoluteResourcePath)) {
    throw new Error(
      `Failed to patch resource with key '${resource.key}': No resource artifacts found in ${absoluteOutputPath}. Did you forget to build the resource?`
    );
  }

  if (resourceType === 'custom-ui') {
    logger.info(`Detected resource '${resource.key}' as Custom UI dependency`);
    return relativeResourcePath;
  }

  logger.info(`Detected resource '${resource.key}' as UI Kit dependency`);

  const acceptedUiKitEntryPoints = [
    'index.js',
    'index.jsx',
    'main.js',
    'main.jsx',
  ];

  const entryPointFile = acceptedUiKitEntryPoints.find((entryPointFile) =>
    existsSync(join(absoluteResourcePath, entryPointFile))
  );

  if (entryPointFile) {
    return `${relativeResourcePath}/${entryPointFile}`;
  } else {
    throw new Error(
      `Failed to patch resource with key '${
        resource.key
      }': Could not find entry point file in ${absoluteResourcePath}. Make sure the UI Kit build produces a files with one of these names: [${acceptedUiKitEntryPoints.join(
        ','
      )}]`
    );
  }
}

function patchResource(
  resourcePath: string,
  resource: HostedResourcesSchema,
  absoluteOutputPath: string,
  resourceType?: ResourceType
): HostedResourcesSchema {
  logger.info(`Patching resource with key '${resource.key}'...`);

  if (!resourceType) {
    logger.warn(
      `Resource with key '${resource.key}' appears not to be used by any module. Skip patching.`
    );
    return resource;
  }

  const verifiedResourcePath = getVerifiedResourcePath(
    resourcePath,
    resourceType,
    resource,
    absoluteOutputPath
  );

  return {
    ...resource,
    path: verifiedResourcePath,
  };
}
