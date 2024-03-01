import { resolve } from 'path';
import { joinPathFragments, logger } from '@nx/devkit';
import { Resources } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { NormalizedOptions } from '../schema';
import {
  readManifestYml,
  writeManifestYml,
} from '../../../utils/forge/manifest-yml';

type Options = Pick<NormalizedOptions, 'root' | 'outputPath' | 'customUIPath'>;

/**
 * Patches the output manifest.yml file to replace resource path parameters to point to the actual Custom UI build
 * artifacts instead of the Nx project reference.
 *
 * This assumes that Custom UI artifacts have already been copied to the output directory in a previous step.
 *
 * @param options Executor options
 */
export async function patchManifestYml(options: Options) {
  const manifestPath = joinPathFragments(
    resolve(options.root, options.outputPath),
    'manifest.yml'
  );

  logger.info(`Patching ${manifestPath}...`);

  const manifestSchema = await readManifestYml(manifestPath);

  const resources: Resources = manifestSchema.resources || [];
  const patchedManifest = {
    ...manifestSchema,
    resources: resources.map((r) => patchResource(options.customUIPath, r)),
  };

  writeManifestYml(manifestPath, patchedManifest);

  logger.info(`Done patching ${manifestPath}.`);
}

function patchResource(
  customUIPath: string,
  resource: HostedResourcesSchema
): HostedResourcesSchema {
  return {
    ...resource,
    path: `${customUIPath}/${resource.path}`,
  };
}
