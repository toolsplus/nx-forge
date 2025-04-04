import { ExecutorContext, joinPathFragments } from '@nx/devkit';
import { Resources } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { readManifestYml } from '../../../utils/forge/manifest-yml';
import { isResourceType } from '../../../shared/manifest/util-manifest';

type ResourceWithTunnelPort = Required<HostedResourcesSchema>;

/**
 * Extracts all configured Custom UI resources and their tunnel port for this Forge app.
 *
 * @param context Executor context for this call
 * @returns Custom UI project names and the tunnel port on which they are required to serve their dev server.
 */
export async function getCustomUiProjects(
  context: ExecutorContext
): Promise<{ projectName: string; port: number }[]> {
  const projects = await extractVerifiedCustomUIProjects(context);
  return projects.map((p) => ({
    projectName: p.path,
    port: p.tunnel.port,
  }));
}

/**
 * Extracts all Custom UI projects from the manifest.yml
 *
 * This will assert that:
 *
 *   - the Nx workspace has a project configured for each Custom UI project
 *   - each Custom UI project has a 'serve' target
 *   - each Custom UI resource has a configured tunnel port in the Forge app's manifest.yml
 *
 * @param context Executor context for this call
 * @returns All configured and verified Custom UI resources
 */
async function extractVerifiedCustomUIProjects(
  context: ExecutorContext
): Promise<ResourceWithTunnelPort[]> {
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
    .filter(isResourceType(manifestSchema, ['custom-ui']))
    .map(verifyCustomUIDependency(context));
}

const verifyCustomUIDependency =
  (context: ExecutorContext) =>
  (resource: HostedResourcesSchema): ResourceWithTunnelPort => {
    const customUIProjectName = resource.path;

    const customUIProjectConfiguration =
      context.projectsConfigurations.projects[customUIProjectName];

    if (!customUIProjectConfiguration) {
      throw new Error(
        `Nx workspace is missing project for Custom UI resource path ${customUIProjectName}. Make sure the Custom UI resource path references a project in your Nx workspace.`
      );
    }

    if (!customUIProjectConfiguration.targets['serve']) {
      throw new Error(
        `Custom UI project '${customUIProjectName}' targets are missing a 'serve' target. Make sure the the project has a 'serve' target inferred, or the 'targets' property in the project's 'project.json' has a 'serve' target configured.`
      );
    }

    if (!resource.tunnel || !Number.isInteger(resource.tunnel.port)) {
      throw new Error(
        `Custom UI resource with key ${resource.key} is missing tunnel port in manifest.yml. Follow the Forge docs on how to add a tunnel port to the Custom UI resource with key ${resource.key}: https://developer.atlassian.com/platform/forge/tunneling/#connecting-the-tunnel-to-your-own-dev-server`
      );
    }

    return resource as ResourceWithTunnelPort;
  };
