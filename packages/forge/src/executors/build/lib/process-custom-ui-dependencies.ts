import { copySync } from 'fs-extra';
import { existsSync, readdirSync } from 'fs';
import type { ExecutorContext } from '@nrwl/devkit';
import { joinPathFragments, logger } from '@nrwl/devkit';
import { Resources } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { NormalizedOptions } from '../schema';
import { loadManifestYml } from '../../../utils/forge/load-manifest-yml';

/**
 * Verifies that Custom UI projects are correctly linked to the Nx Forge app and copies build artifacts into the app's
 * output directory.
 *
 * In particular this will make sure that each resource listed in the manifest.yml has its path configured to point to
 * a Nx project in this workspace. Additionally, this will ensure that each specified Custom UI project is listed as an
 * implicit dependency of the project. This requirement ensures that Custom UI dependencies are being built before the
 * Forge app is being built.
 *
 * @param options Executor options
 * @param context Executor context
 */
export async function processCustomUIDependencies(
  options: NormalizedOptions,
  context: ExecutorContext
): Promise<Resources> {
  const manifestPath = joinPathFragments(
    context.root,
    'apps',
    context.projectName,
    'manifest.yml'
  );
  const manifestSchema = await loadManifestYml(manifestPath);
  const resources = manifestSchema.resources ?? [];

  resources.forEach((r) =>
    verifyAndCopyCustomUIDependency(r, context, options)
  );

  return resources;
}

const verifyAndCopyCustomUIDependency = (
  resource: HostedResourcesSchema,
  context: ExecutorContext,
  options: NormalizedOptions
): void => {
  const customUIProjectName = resource.path;

  const customUIProjectConfiguration =
    context.workspace.projects[customUIProjectName];

  if (!customUIProjectConfiguration) {
    throw new Error(
      `Nx workspace is missing project for Custom UI path ${customUIProjectName}. Make sure the Custom UI resource path references a project in your Nx workspace.`
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

  const customUIBuildTargetOutputPath =
    customUIProjectConfiguration.targets['build']?.options?.outputPath;
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
      `Project ${customUIProjectName} is missing build artifacts. Make sure the project produces Custom UI compatible build artifacts.`
    );
  }

  logger.info(`Copying ${customUIProjectName} Custom UI build artifacts...`);
  copySync(
    absoluteCustomUIBuildTargetOutputPath,
    joinPathFragments(
      options.outputPath,
      options.customUIPath,
      customUIProjectName
    ),
    { recursive: true }
  );
  logger.info(`Done copying ${customUIProjectName} Custom UI build artifacts.`);
};
