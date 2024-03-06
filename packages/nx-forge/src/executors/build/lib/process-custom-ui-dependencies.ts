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

type Options = Pick<
  NormalizedOptions,
  'root' | 'outputPath' | 'customUIPath' | 'resourceOutputPathMap'
>;

/**
 * Verifies that Custom UI projects are correctly linked to the Nx Forge app and copies build artifacts into the app's
 * output directory. In particular, this will make sure that each resource listed in the manifest.yml has its path
 * configured to point to a Nx project in this workspace.
 *
 * @param options Executor options
 * @param context Executor context
 */
export async function processCustomUIDependencies(
  options: Options,
  context: ExecutorContext
): Promise<Resources> {
  const manifestPath = joinPathFragments(
    context.root,
    context.projectsConfigurations.projects[context.projectName].root,
    'manifest.yml'
  );
  const manifestSchema = await readManifestYml(manifestPath);
  const resources = manifestSchema.resources ?? [];

  resources.forEach((r) =>
    verifyAndCopyCustomUIDependency(r, context, options)
  );

  return resources;
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

  const [firstOutputDefinition, ...otherOutputDefinitions] =
    getOutputsForTargetAndConfiguration(
      {
        project: resourceProjectName,
        target: 'build',
        configuration: configurationName,
      },
      {},
      resourceProjectGraphNode
    );

  if (firstOutputDefinition && otherOutputDefinitions.length === 0) {
    return firstOutputDefinition;
  }

  throw new Error(
    `Failed to infer output path for resource project '${resourceProjectName}': Try to define an explicit output path mapping using the 'resourceOutputPathMap' option of this executor. Add an entry to the mapping object as follows: {'${resourceProjectName}': '<replace-with-project-output-path>'}.`
  );
};

const verifyAndCopyCustomUIDependency = (
  resource: HostedResourcesSchema,
  context: ExecutorContext,
  options: Options
): void => {
  const customUIProjectName = resource.path;
  const customUIProjectGraphNode =
    context.projectGraph.nodes[customUIProjectName];
  const customUIProjectConfiguration = customUIProjectGraphNode?.data;

  if (!customUIProjectGraphNode || !customUIProjectConfiguration) {
    throw new Error(
      `Nx workspace is missing project for Custom UI path ${customUIProjectName}. Make sure the Custom UI resource path references a project in your Nx workspace.`
    );
  }

  const customUIBuildTargetOutputPath = getResourceOutputPath(
    options,
    customUIProjectGraphNode,
    context.configurationName
  );
  const absoluteCustomUIBuildTargetOutputPath = joinPathFragments(
    context.root,
    customUIBuildTargetOutputPath
  );

  if (
    !customUIBuildTargetOutputPath ||
    !existsSync(absoluteCustomUIBuildTargetOutputPath) ||
    readdirSync(absoluteCustomUIBuildTargetOutputPath).length === 0
  ) {
    throw new Error(
      `Project ${customUIProjectName} has no build artifacts in output directory '${customUIBuildTargetOutputPath}'. Make sure the project produces Custom UI compatible build artifacts.`
    );
  }

  logger.info(`Copying ${customUIProjectName} Custom UI build artifacts...`);
  copySync(
    absoluteCustomUIBuildTargetOutputPath,
    joinPathFragments(
      options.root,
      options.outputPath,
      options.customUIPath,
      customUIProjectName
    ),
    { recursive: true }
  );
  logger.info(`Done copying ${customUIProjectName} Custom UI build artifacts.`);
};
