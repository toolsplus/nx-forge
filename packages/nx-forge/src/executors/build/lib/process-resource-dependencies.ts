import { copySync } from 'fs-extra';
import { existsSync, readdirSync } from 'fs';
import {
  ExecutorContext,
  getOutputsForTargetAndConfiguration,
  joinPathFragments,
  logger,
  ProjectGraphProjectNode,
} from '@nx/devkit';
import { Resources } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { NormalizedOptions } from '../schema';
import { readManifestYml } from '../../../utils/forge/manifest-yml';
import { isResourceType } from '../../../shared/manifest/util-manifest';

type Options = Pick<
  NormalizedOptions,
  'root' | 'outputPath' | 'resourceOutputPathMap'
> & {
  resourcePath: string;
};

/**
 * Verifies that UI resource projects are correctly linked to the Nx Forge app
 * and copies build artifacts into the app's output directory. In particular,
 * this will make sure that each Custom UI or UI Kit resource listed in the
 * manifest.yml has its path configured to point to a Nx project in this
 * workspace.
 *
 * @param options Executor options
 * @param context Executor context
 */
export async function processResourceDependencies(
  options: Options,
  context: ExecutorContext
): Promise<Resources> {
  const manifestPath = joinPathFragments(
    context.root,
    context.projectsConfigurations.projects[context.projectName].root,
    'manifest.yml'
  );
  const manifestSchema = await readManifestYml(manifestPath, {
    interpolate: false,
  });
  const resources = manifestSchema.resources ?? [];
  const uiResources = resources.filter(
    isResourceType(manifestSchema, ['ui-kit', 'custom-ui'])
  );

  logger.info(
    `Detected the following UI resources in the manifest.yml:\n${uiResources
      .map((r) => `  - ${r.key}`)
      .join('\n')}`
  );

  uiResources.forEach((r) =>
    verifyAndCopyResourceDependency(r, context, options)
  );

  return uiResources;
}

const getResourceOutputPath = (
  options: Options,
  resourceProjectGraphNode: ProjectGraphProjectNode,
  configurationName?: string
) => {
  const resourceProjectName = resourceProjectGraphNode.data.name;
  const maybeResourceOutputPath =
    options.resourceOutputPathMap[resourceProjectName];
  if (
    maybeResourceOutputPath &&
    typeof maybeResourceOutputPath === 'string' &&
    maybeResourceOutputPath !== ''
  ) {
    return maybeResourceOutputPath;
  }

  const maybeBuildTargetOutputPathOption =
    resourceProjectGraphNode.data.targets['build']?.options?.outputPath;
  if (maybeBuildTargetOutputPathOption) {
    return maybeBuildTargetOutputPathOption;
  }

  let firstOutputDefinition: string;
  let otherOutputDefinitions: string[];

  try {
    [firstOutputDefinition, ...otherOutputDefinitions] =
      getOutputsForTargetAndConfiguration(
        {
          project: resourceProjectName,
          target: 'build',
          configuration: configurationName,
        },
        {},
        resourceProjectGraphNode
      );
  } catch (error) {
    throw new Error(
      `Failed to find 'build' target for resource project '${resourceProjectName}': Make sure the project's build target is named 'build', or define an explicit output path mapping using the 'resourceOutputPathMap' option of this executor. Add an entry to the mapping object as follows: {'${resourceProjectName}': '<replace-with-project-output-path>'}.`
    );
  }

  if (firstOutputDefinition && otherOutputDefinitions.length === 0) {
    return firstOutputDefinition;
  }

  throw new Error(
    `Failed to infer output path for resource project '${resourceProjectName}': Try to define an explicit output path mapping using the 'resourceOutputPathMap' option of this executor. Add an entry to the mapping object as follows: {'${resourceProjectName}': '<replace-with-project-output-path>'}.`
  );
};

const verifyAndCopyResourceDependency = (
  resource: HostedResourcesSchema,
  context: ExecutorContext,
  options: Options
): void => {
  const resourceProjectName = resource.path;
  const resourceProjectGraphNode =
    context.projectGraph.nodes[resourceProjectName];
  const resourceProjectConfiguration = resourceProjectGraphNode?.data;

  if (!resourceProjectGraphNode || !resourceProjectConfiguration) {
    throw new Error(
      `Nx workspace is missing project for resource path ${resourceProjectName}. Make sure the resource path references a project in your Nx workspace.`
    );
  }

  const resourceBuildTargetOutputPath = getResourceOutputPath(
    options,
    resourceProjectGraphNode,
    context.configurationName
  );
  const absoluteResourceBuildTargetOutputPath = joinPathFragments(
    context.root,
    resourceBuildTargetOutputPath
  );

  if (
    !resourceBuildTargetOutputPath ||
    !existsSync(absoluteResourceBuildTargetOutputPath) ||
    readdirSync(absoluteResourceBuildTargetOutputPath).length === 0
  ) {
    throw new Error(
      `Project ${resourceProjectName} has no build artifacts in output directory '${resourceBuildTargetOutputPath}'. Make sure the project produces compatible build artifacts.`
    );
  }

  logger.info(
    `Copying ${resource.key} (${resourceProjectName}) resource build artifacts...`
  );
  copySync(
    absoluteResourceBuildTargetOutputPath,
    joinPathFragments(
      options.root,
      options.outputPath,
      options.resourcePath,
      resourceProjectName
    ),
    { recursive: true }
  );
  logger.info(
    `Done copying ${resource.key} (${resourceProjectName}) resource build artifacts.`
  );
};
