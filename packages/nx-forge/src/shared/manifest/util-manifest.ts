import { getAllModules, ManifestSchema } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { logger } from '@nx/devkit';

// https://stackoverflow.com/a/8511350/5115898
const isObject = (v: unknown): v is object =>
  typeof v === 'object' && v !== null;

export type ResourceType = 'ui-kit' | 'custom-ui' | 'generic';

/**
 * Determines the resource type based on the module definition.
 *
 * The criteria are as follows:
 * - UI Kit:    module has the `resource` property and the `render` property is
 *              `native`
 * - Custom UI: module has the `resource` property and the `render` property is
 *              not `native` or missing
 * - Generic:   none of the above, consider it a generic resource
 *
 * @param moduleDefinition Module definition to analyze
 */
const resourceTypeByModuleDefinition = (
  moduleDefinition: object
): ResourceType => {
  if (!!moduleDefinition['resource'] && moduleDefinition['render'] === 'native')
    return 'ui-kit';
  if (!!moduleDefinition['resource'] && moduleDefinition['render'] !== 'native')
    return 'custom-ui';
  return 'generic';
};

export type ResourceTypeIndex = { [resourceKey: string]: ResourceType };
/**
 * Computes an index from resource key to resource type which is either `ui-kit`,
 * `custom-ui` or `generic`. The resource type is inferred from the module
 * declaration. If a module has both the `resource` property and `render: native`
 * declared, its resource must be of type UI Kit. If a module, only declares the
 * `resource` property and its `render` property (if exists) is not `native`,
 * its resource must be a Custom UI. In all other cases, the resource type is
 * Generic.
 *
 * @param manifestSchema Complete manifest definition to analyze
 */
export const getResourceTypeIndex = (
  manifestSchema: ManifestSchema
): ResourceTypeIndex =>
  getAllModules(manifestSchema.modules ?? {}).reduce<ResourceTypeIndex>(
    (acc, moduleDefinition) => {
      if (
        isObject(moduleDefinition) &&
        Object.hasOwn(moduleDefinition, 'resource') &&
        typeof moduleDefinition['resource'] === 'string'
      ) {
        const resourceKey = moduleDefinition['resource'];
        const resourceType = resourceTypeByModuleDefinition(moduleDefinition);
        const existingIndexEntry = acc[resourceKey];

        if (existingIndexEntry && existingIndexEntry !== resourceType) {
          logger.warn(
            `Inconsistent resource mapping in manifest.yml: Module with key ${moduleDefinition['key']} declares its resource to be of type ${resourceType} but other modules pointing to the same resource appear to be of a different type`
          );
        }

        return {
          ...acc,
          [resourceKey]: resourceType,
        };
      }
      return acc;
    },
    {} as ResourceTypeIndex
  );

/**
 * Determines if type of the given resource. If the resource is not referenced
 * by any module it is considered a generic resource.
 *
 * @param manifestSchema Complete manifest definition
 * @param resource Resource to resolve against the manifest definition
 */
export const resourceTypeByResourceDefinition =
  (manifestSchema: ManifestSchema) =>
  (resource: HostedResourcesSchema): ResourceType => {
    for (const moduleDefinition of getAllModules(
      manifestSchema.modules ?? {}
    )) {
      if (
        isObject(moduleDefinition) &&
        Object.hasOwn(moduleDefinition, 'resource') &&
        typeof moduleDefinition['resource'] === 'string' &&
        moduleDefinition['resource'] === resource.key
      ) {
        return resourceTypeByModuleDefinition(moduleDefinition);
      }
    }
    return 'generic';
  };

/**
 * Determines if the given resource definition is of a specific type. The
 * predicate can be configured with the accepted resource types.
 *
 * To determine if a resource is of a specific type, this will try to find a
 * module definition that references the key of the given resource definition
 * as its resource property.
 *
 * @param manifestSchema Complete manifest definition
 * @param acceptedResourceTypes Allows to filer for specific resource types
 * @param resource Resource to resolve against the manifest definition
 */
export const isResourceType =
  (manifestSchema: ManifestSchema, acceptedResourceTypes: ResourceType[]) =>
  (resource: HostedResourcesSchema): boolean =>
    acceptedResourceTypes.includes(
      resourceTypeByResourceDefinition(manifestSchema)(resource)
    );
