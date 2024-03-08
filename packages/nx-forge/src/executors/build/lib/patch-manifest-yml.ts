import { join, resolve } from 'path';
import { joinPathFragments, logger } from '@nx/devkit';
import { ManifestSchema, Modules, Resources } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { NormalizedOptions } from '../schema';
import {
  readManifestYml,
  writeManifestYml,
} from '../../../utils/forge/manifest-yml';
import { existsSync } from 'fs';

type Options = Pick<
  NormalizedOptions,
  'root' | 'outputPath' | 'uiKit2Packaging'
> & {
  resourcePath: string;
};

interface CustomUiResourceContext {
  type: 'custom-ui';
  modules: Entries<Modules>;
}

// https://stackoverflow.com/a/60142095/5115898
type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

interface UiKit2ResourceContext {
  type: 'ui-kit-2';
  modules: Entries<Modules>;
}

type ResourceContext = CustomUiResourceContext | UiKit2ResourceContext;
type ResourceType = ResourceContext['type'];
type ResourceKey = string;
type ResourceTypeIndex = Record<ResourceKey, ResourceContext>;

/**
 * Patches the output manifest.yml file to replace resource path parameters to point to the actual resource build
 * artifacts instead of the Nx project reference.
 *
 * This assumes that resource artifacts have already been copied to the output directory in a previous step.
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
  if (!options.uiKit2Packaging) {
    return {
      ...manifestSchema,
      resources: resources.map((resource) => ({
        ...resource,
        path: `${options.resourcePath}/${resource.path}`,
      })),
    };
  } else {
    const resourceTypeIndex: ResourceTypeIndex = getResourceTypeIndex(
      manifestSchema.modules ?? {},
      resources
    );
    return {
      ...manifestSchema,
      resources: resources.map((r) =>
        patchResource(
          options.resourcePath,
          r,
          absoluteOutputPath,
          resourceTypeIndex[r.key]
        )
      ),
    };
  }
}

/**
 * Computes an index from resource key to resource type which is either UI Kit 2 or Custom UI. The resource type
 * is inferred from the module declaration. If a module has both the `resource` property and `render: native` declared,
 * it means its resource has to be of type UI Kit 2. If a module, on the other hand, only declares the `resource`
 * property, it means the resource must be a Custom UI.
 *
 * @param modules Modules declared in the manifest
 * @param resources Resources declared in the manifest
 */
function getResourceTypeIndex(
  modules: Modules,
  resources: HostedResourcesSchema[]
): ResourceTypeIndex {
  const modulesEntries = Object.entries(modules);
  const resourceKeys = resources.map((r) => r.key);

  const indexModuleDefinition = (
    acc: ResourceTypeIndex,
    moduleType: string,
    moduleDefinition: unknown
  ): ResourceTypeIndex => {
    const moduleResourceKey = moduleDefinition['resource'];
    if (resourceKeys.includes(moduleResourceKey)) {
      const type =
        moduleDefinition['render'] === 'native' ? 'ui-kit-2' : 'custom-ui';
      const existingIndexEntry = acc[moduleResourceKey];

      if (existingIndexEntry && existingIndexEntry.type !== type) {
        logger.warn(
          `Inconsistent resource mapping in manifest.yml: Module ${moduleType} (${
            moduleDefinition['key']
          }) declares its resource to be of type ${type} but other modules with keys [${existingIndexEntry.modules
            .map(([, m]) => m['key'])
            .join(
              ', '
            )}] pointing to the same resource appear to be of a different type`
        );
      }

      const existingModules = existingIndexEntry?.modules ?? [];
      return {
        ...acc,
        [moduleResourceKey]: {
          type,
          modules: [...existingModules, [moduleType, moduleDefinition]],
        },
      };
    } else {
      return acc;
    }
  };

  const resourceTypeIndex: ResourceTypeIndex = modulesEntries.reduce(
    (acc, [moduleType, moduleDefinitions]) => {
      return (moduleDefinitions as unknown[]).reduce<ResourceTypeIndex>(
        (innerAcc, moduleDefinition) =>
          indexModuleDefinition(innerAcc, moduleType, moduleDefinition),
        acc
      );
    },
    {} as ResourceTypeIndex
  );

  const resourceTypeIndexKeySet = new Set(Object.keys(resourceTypeIndex));
  const resourceKeySet = new Set(resourceKeys);

  if (
    resourceTypeIndexKeySet.size === resourceKeySet.size &&
    [...resourceTypeIndexKeySet].every((k) => resourceKeySet.has(k))
  ) {
    return resourceTypeIndex;
  } else {
    const missingResourceKeys = [...resourceKeySet].filter(
      (k) => !resourceTypeIndexKeySet.has(k)
    );
    logger.warn(
      `Failed to find module definition for resources with keys ${missingResourceKeys}`
    );
    return resourceTypeIndex;
  }
}

/**
 * Returns the final resource path based on the given resource type.
 *
 * Verifies that the path/file exists in the computed directory. UI Kit 2 builds are expected to produce an accepted
 * bundle filename.
 *
 * @param resourcePath Path where all resource build artifacts are placed, relative to the app root directory
 * @param resourceType Type of the given resource, `ui-kit-2` or `custom-ui`
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

  logger.info(`Detected resource '${resource.key}' as UI Kit 2 dependency`);

  const acceptedUiKit2EntryPoints = [
    'index.js',
    'index.jsx',
    'main.js',
    'main.jsx',
  ];

  const entryPointFile = acceptedUiKit2EntryPoints.find((entryPointFile) =>
    existsSync(join(absoluteResourcePath, entryPointFile))
  );

  if (entryPointFile) {
    return `${relativeResourcePath}/${entryPointFile}`;
  } else {
    throw new Error(
      `Failed to patch resource with key '${
        resource.key
      }': Could not find entry point file in ${absoluteResourcePath}. Make sure the UI Kit 2 build produces a files with one of these names: [${acceptedUiKit2EntryPoints.join(
        ','
      )}]`
    );
  }
}

function patchResource(
  resourcePath: string,
  resource: HostedResourcesSchema,
  absoluteOutputPath: string,
  resourceContext?: ResourceContext
): HostedResourcesSchema {
  logger.info(`Patching resource with key '${resource.key}'...`);

  if (!resourceContext) {
    logger.warn(
      `Resource with key '${resource.key}' appears not to be used by any module. Skip patching.`
    );
    return resource;
  }

  const verifiedResourcePath = getVerifiedResourcePath(
    resourcePath,
    resourceContext.type,
    resource,
    absoluteOutputPath
  );

  return {
    ...resource,
    path: verifiedResourcePath,
  };
}
