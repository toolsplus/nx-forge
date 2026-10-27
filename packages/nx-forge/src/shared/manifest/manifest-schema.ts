import { readJsonFile } from '@nx/devkit';

/**
 * Full Forge manifest JSON schema, resolved through the `./schema.json` entry
 * of the `@forge/manifest` exports map, which blocks deep imports into `out/`.
 */
export const FULL_MANIFEST_SCHEMA: object = readJsonFile(
  require.resolve('@forge/manifest/schema.json')
);
