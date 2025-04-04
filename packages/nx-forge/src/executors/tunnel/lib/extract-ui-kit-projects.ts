import { ExecutorContext, joinPathFragments } from '@nx/devkit';
import { Resources } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { readManifestYml } from '../../../utils/forge/manifest-yml';
import { isResourceType } from '../../../shared/manifest/util-manifest';

/**
 * Extracts all configured UI Kit resources for this Forge app.
 *
 * @param context Executor context for this call
 * @returns UI Kit project names.
 */
export async function getUIKitProjects(
  context: ExecutorContext
): Promise<{ projectName: string }[]> {
  const projects = await extractVerifiedUIKitProjects(context);
  return projects.map((p) => ({
    projectName: p.path,
  }));
}

/**
 * Extracts all UI Kit projects from the manifest.yml
 *
 * This will assert that:
 *
 *   - the Nx workspace has a project configured for each UI Kit project
 *   - each UI Kit project has a 'build' target
 *
 * @param context Executor context for this call
 * @returns All configured and verified UI Kit resources
 */
async function extractVerifiedUIKitProjects(
  context: ExecutorContext
): Promise<HostedResourcesSchema[]> {
  const manifestPath = joinPathFragments(
    context.root,
    context.projectsConfigurations.projects[context.projectName].root,
    'manifest.yml'
  );
  const manifestSchema = await readManifestYml(manifestPath, {
    interpolate: false,
  });
  const resources: Resources = manifestSchema.resources ?? [];
  return resources
    .filter(isResourceType(manifestSchema, ['ui-kit']))
    .map(verifyUIKitDependency(context));
}

const verifyUIKitDependency =
  (context: ExecutorContext) =>
  (resource: HostedResourcesSchema): HostedResourcesSchema => {
    const uiKitProjectName = resource.path;

    const uiKitProjectConfiguration =
      context.projectsConfigurations.projects[uiKitProjectName];

    if (!uiKitProjectConfiguration) {
      throw new Error(
        `Nx workspace is missing project for UI Kit resource path ${uiKitProjectName}. Make sure the UI Kit resource path references a project in your Nx workspace.`
      );
    }

    if (!uiKitProjectConfiguration.targets['build']) {
      throw new Error(
        `UI Kit project '${uiKitProjectName}' targets are missing a 'build' target. Make sure the the project has a 'build' target inferred, or the 'targets' property in the project's 'project.json' has a 'build' target configured.`
      );
    }

    return resource;
  };
