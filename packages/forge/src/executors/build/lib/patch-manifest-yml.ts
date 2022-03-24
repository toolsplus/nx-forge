import { writeFileSync } from 'fs';
import { dump } from 'js-yaml';
import { joinPathFragments, logger } from '@nrwl/devkit';
import { Resources } from '@forge/manifest';
import { HostedResourcesSchema } from '@forge/manifest/out/schema/manifest';
import { NormalizedOptions } from '../schema';
import { loadManifestYml } from './load-manifest-yml';

/**
 * Patches the output manifest.yml file to replace resource path parameters to point to the actual Custom UI build
 * artifacts instead of the Nx project reference.
 *
 * This assumes that Custom UI artifacts have already been copied to the output directory in a previous step.
 *
 * @param options Executor options
 */
export function patchManifestYml(options: NormalizedOptions) {
  const manifestPath = joinPathFragments(options.outputPath, 'manifest.yml');

  logger.info(`Patching ${manifestPath}...`);

  const manifestSchema = loadManifestYml(manifestPath);

  const resources: Resources = manifestSchema.resources || [];
  const patchedManifest = {
    ...manifestSchema,
    resources: resources.map((r) => patchResource(options.customUIPath, r)),
  };

  const patchedManifestContent = dump(patchedManifest, {});
  writeFileSync(manifestPath, patchedManifestContent, { encoding: 'utf8' });

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
