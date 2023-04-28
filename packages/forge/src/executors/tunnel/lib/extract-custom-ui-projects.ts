import { ExecutorContext, joinPathFragments } from '@nx/devkit';
import { Resources } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { loadManifestYml } from '../../../utils/forge/load-manifest-yml';

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
  const projects = await extractVerifiedCustomUiProjects(context);
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
 *   - each Custom UI project is listed as an implicit dependency of the Forge app
 *   - each Custom UI resource has a configured tunnel port in the Forge app's manifest.yml
 *
 * @param context Executor context for this call
 * @returns All configured and verified Custom UI resources
 */
async function extractVerifiedCustomUiProjects(
  context: ExecutorContext
): Promise<ResourceWithTunnelPort[]> {
  const manifestPath = joinPathFragments(
    context.root,
    'apps',
    context.projectName,
    'manifest.yml'
  );
  const manifestSchema = await loadManifestYml(manifestPath);
  const resources: Resources = manifestSchema.resources ?? [];
  return resources.map(verifyCustomUIDependency(context));
}

const verifyCustomUIDependency =
  (context: ExecutorContext) =>
  (resource: HostedResourcesSchema): ResourceWithTunnelPort => {
    const customUIProjectName = resource.path;

    const customUIProjectConfiguration =
      context.workspace.projects[customUIProjectName];

    if (!customUIProjectConfiguration) {
      throw new Error(
        `Nx workspace is missing project for Custom UI path ${customUIProjectName}. Make sure the Custom UI resource path references a project in your Nx workspace.`
      );
    }

    if (!customUIProjectConfiguration.targets['serve']) {
      throw new Error(
        `Custom UI project '${customUIProjectName}' targets is missing a 'serve' executor. Make sure the 'targets' property in the project's 'project.json' has a 'serve' executor configured.`
      );
    }

    if (
      !context.workspace.projects[
        context.projectName
      ].implicitDependencies?.includes(customUIProjectName)
    ) {
      throw new Error(
        `Project ${customUIProjectName} is configured as Forge Custom UI resource but not listed as implicit dependency of the Forge project (${context.projectName}). Add ${customUIProjectName} to the 'implicitDependencies' array in this project's 'project.json', or remove the Custom UI resource from the app's manifest.yml.`
      );
    }

    if (!resource.tunnel || !Number.isInteger(resource.tunnel.port)) {
      throw new Error(
        `Custom UI resource with key ${resource.key} is missing tunnel port in manifest.yml. Follow the Forge docs on how to add a tunnel port to the Custom UI resource with key ${resource.key}: https://developer.atlassian.com/platform/forge/tunneling/#connecting-the-tunnel-to-your-own-dev-server`
      );
    }

    return resource as ResourceWithTunnelPort;
  };
