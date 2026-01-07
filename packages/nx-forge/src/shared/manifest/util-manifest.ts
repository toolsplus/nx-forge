import { ManifestSchema, Modules } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { logger } from '@nx/devkit';

// https://stackoverflow.com/a/8511350/5115898
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

type ModuleDefinition = {
  key: string;
  [p: string]: unknown;
};

const isModuleDefinitionWithKey = (m: unknown): m is ModuleDefinition =>
  isObject(m) && 'key' in m && typeof m.key === 'string';

type Module = {
  type: string;
  definition: ModuleDefinition;
};

/**
 * Adapted version of getAllModules from @forge/manifest that preserves the module type for each module and validates
 * that each module definition is a record with a key property.
 */
const allModulesWithType = (modules: Modules): Module[] =>
  Object.keys(modules).reduce<Module[]>(
    (acc, moduleType) => [
      ...acc,
      ...(modules[moduleType] as unknown[]).reduce<Module[]>(
        (innerAcc, m: unknown) => {
          if (!isModuleDefinitionWithKey(m)) {
            logger.warn(
              `Unexpected module definition for type ${moduleType}: Module is missing a 'key' property: ${JSON.stringify(
                m
              )}`
            );
            return innerAcc;
          }
          return [
            ...innerAcc,
            {
              type: moduleType,
              definition: m,
            },
          ];
        },
        []
      ),
    ],
    []
  );

export type ResourceType = 'ui-kit' | 'custom-ui' | 'static';

type ResourceRef = {
  key: string;
  type: ResourceType;
};

/**
 * Extracts the resource reference from the given module like definition if the
 * definition is an object with a `resource` property.
 *
 * The resource type is determined as follows:
 * - UI Kit: module has the `resource` property and the `render` property is `native`
 * - Custom UI: module has the `resource` property, and the `render` property is not `native` or missing
 *
 * @param moduleLikeDefinition
 * @returns Resource reference if the definition is an object with a `resource` property, undefined otherwise.
 */
const extractResourceFromModuleLike = (
  moduleLikeDefinition: unknown
): ResourceRef | undefined => {
  if (
    !isObject(moduleLikeDefinition) ||
    typeof moduleLikeDefinition.resource !== 'string'
  ) {
    return undefined;
  }

  const { resource, render } = moduleLikeDefinition;
  return {
    key: resource,
    type: render === 'native' ? 'ui-kit' : 'custom-ui',
  };
};

type ExtractionStrategy = (def: unknown) => unknown[];

/**
 * Searches at the root of the module definition for resource references.
 * @param def Module definition to analyze
 */
const defaultExtractionStrategy: ExtractionStrategy = (def) => [def];

/**
 * Specialized resource reference extraction strategies for certain module types.
 */
const extractionStrategies: Record<string, ExtractionStrategy> = {
  'jira:customField': (def) => {
    return [
      (def as Record<string, unknown>)?.view,
      (def as Record<string, unknown>)?.edit,
    ];
  },
};

/**
 * Extracts resource references from the given module definition indexed by the
 * resource key.
 *
 * Note that some modules may not define resources at the root, so for certain
 * module types, we need to look deeper into the definition to find potential
 * resource references.
 *
 * The resource type is determined as follows:
 * - UI Kit: module has the `resource` property and the `render` property is `native`
 * - Custom UI: module has the `resource` property, and the `render` property is not `native` or missing
 * - otherwise: assume there is no resource reference in the module definition
 *
 * @param type Module type, e.g. `jira:customField`
 * @param definition Module definition to analyze
 */
const extractResourceReferencesFromModule = ({
  type,
  definition,
}: Module): Record<string, ResourceRef> => {
  const getSearchInputs =
    extractionStrategies[type] ?? defaultExtractionStrategy;
  return getSearchInputs(definition).reduce<Record<string, ResourceRef>>(
    (acc, m) => {
      const resource = extractResourceFromModuleLike(m);
      return resource === undefined
        ? acc
        : { ...acc, [resource.key]: resource };
    },
    {}
  );
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
 * Determines the type of the given resource.
 *
 * The resource type is determined by the following reduction:
 *
 * - If the resource is referenced by a module as a 'resource', infer a Custom
 *   UI or UI Kit resource.
 * - If the resource key is referenced via resource string interpolation
 *   (resource:<resource-key>;) anywhere in the manifest, infer a static resource.
 * - Else infer Custom UI. These kinds of resources are typically used as Modal
 *   dialogs in Custom UIs. They are not referenced in the manifest and instead,
 *   opened via @forge/bridge in Custom UI code.
 *
 * @see https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/modal/
 *
 * @param manifestSchema Complete manifest definition
 * @returns Function that takes the resource to resolve against the manifest definition
 */
export const resourceTypeByResourceDefinition = (
  manifestSchema: ManifestSchema
) => {
  const manifestSchemaString = JSON.stringify(manifestSchema);
  const modules = allModulesWithType(manifestSchema.modules ?? {});
  const moduleResourceReferencesByResourceKey = modules.reduce<
    Record<string, ResourceRef>
  >((acc, module) => {
    const resourceReferences = extractResourceReferencesFromModule(module);
    for (const r of Object.values(resourceReferences)) {
      if (r.key in acc && acc[r.key].type !== r.type) {
        logger.warn(
          `nx-forge has already been inferred resource with key ${
            r.key
          } to a different type. The current module ${module.type}:${
            module.definition.key
          } inferred the type as ${r.type} but it was previously inferred as ${
            acc[r.key].type
          }. This may be a bug, please report it at https://github.com/toolsplus/nx-forge/issues including your Forge manifest.yml`
        );
      }
    }
    return {
      ...acc,
      ...resourceReferences,
    };
  }, {});
  return (resource: HostedResourcesSchema): ResourceType => {
    const maybeResourceRef =
      moduleResourceReferencesByResourceKey[resource.key];
    if (maybeResourceRef) {
      return maybeResourceRef.type;
    }

    // If the resource key is referenced in the manifest via a resource
    // string interpolation, assume it is a static resource
    if (manifestSchemaString.includes(`resource:${resource.key};`)) {
      return 'static';
    }

    // Assume that the resource is a Custom UI. There may be resources that are
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
 * @returns Function that takes a resource to resolve against the manifest definition
 */
export const isResourceType =
  (manifestSchema: ManifestSchema, acceptedResourceTypes: ResourceType[]) =>
  (resource: HostedResourcesSchema): boolean =>
    acceptedResourceTypes.includes(
      resourceTypeByResourceDefinition(manifestSchema)(resource)
    );
