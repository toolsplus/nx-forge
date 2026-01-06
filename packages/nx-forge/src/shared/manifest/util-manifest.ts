import { getAllModules, ManifestSchema } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { logger } from '@nx/devkit';

// https://stackoverflow.com/a/8511350/5115898
const isObject = (v: unknown): v is object =>
  typeof v === 'object' && v !== null;

export type ResourceType = 'ui-kit' | 'custom-ui' | 'static';

/**
 * Determines the resource type based on the module definition.
 *
 * The criteria are as follows:
 * - UI Kit:    module has the `resource` property and the `render` property is
 *              `native`
 * - Custom UI: module has the `resource` property and the `render` property is
 *              not `native` or missing
 * - Static:    none of the above, consider it a static resource
 *
 * @param moduleDefinition Module definition to analyze
 */
const resourceTypeByModuleDefinition = (
  moduleDefinition: any
): ResourceType => {
  if (moduleDefinition.resource && moduleDefinition.render === 'native')
    return 'ui-kit';
  if (moduleDefinition.resource && moduleDefinition.render !== 'native')
    return 'custom-ui';
  return 'static';
};

export type ResourceTypeIndex = { [resourceKey: string]: ResourceType };
/**
 * Computes an index from resource key to resource type which is either `ui-kit`,
 * `custom-ui` or `static`.
 *
 * Refer to the docs on {@link resourceTypeByResourceDefinition} for details
 * on how the resource type is inferred.
 *
 * @param manifestSchema Complete manifest definition to analyze
 */
export const getResourceTypeIndex = (
  manifestSchema: ManifestSchema
): ResourceTypeIndex =>
  (manifestSchema.resources || []).reduce((acc, resource) => {
    const resourceKey = resource.key;
    const resourceType =
      resourceTypeByResourceDefinition(manifestSchema)(resource);
    const existingIndexEntry = acc[resourceKey];

    if (existingIndexEntry && existingIndexEntry !== resourceType) {
      logger.warn(
        `Inconsistent resource type inference: Resource with key ${resource.key} has been inferred as type '${resourceType}' but has already been inferred as type '${existingIndexEntry}'`
      );
    }

    return {
      ...acc,
      [resourceKey]: resourceType,
    };
  }, {} as ResourceTypeIndex);

/**
 * Determines if type of the given resource.
 *
 * The resource type is determined by the following reduction:
 *
 * - If the resource is referenced by a module as a 'resource', infer a Custom
 *   UI or UI Kit resource.
 * - If the resource key is referenced via resource string interpolation
 *   (resource:<resource-key>;) anywhere in the manifest, infer a static resource.
 * - Else infer Custom UI. These kind of resources are typically used as Modal
 *   dialogs in Custom UIs. They are not referenced in the manifest and instead,
 *   opened via @forge/bridge in Custom UI code.
 *
 * @see https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/modal/
 *
 * @param manifestSchema Complete manifest definition
 * @param resource Resource to resolve against the manifest definition
 */
export const resourceTypeByResourceDefinition = (
  manifestSchema: ManifestSchema
) => {
  const manifestSchemaString = JSON.stringify(manifestSchema);
  return (resource: HostedResourcesSchema): ResourceType => {
    for (const moduleDefinition of getAllModules(
      manifestSchema.modules ?? {}
    )) {
      if (
        isObject(moduleDefinition) &&
        Object.hasOwn(moduleDefinition, 'resource') &&
        typeof (moduleDefinition as any).resource === 'string' &&
        (moduleDefinition as any).resource === resource.key
      ) {
        return resourceTypeByModuleDefinition(moduleDefinition);
      }
    }

    // If the resource key is referenced in the manifest via a resource
    // string interpolation, assume it is a static resource
    if (manifestSchemaString.includes(`resource:${resource.key};`)) {
      return 'static';
    }

    // Assume that the resource is a Custom UI. There may be resources which are
    // not directly referenced in the manifest. For example, UI Kit modal dialogs
    // can be referenced in other Custom UI projects and loaded via @forge/bridge.
    // https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/modal/
    return 'custom-ui';
  };
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
