import { Tree } from '@nx/devkit';
import { readYaml, writeYaml } from './yml';
import { ManifestSchema, SchemaValidator } from '@forge/manifest';
import * as FULL_SCHEMA from '@forge/manifest/out/schema/manifest-schema.json';

const manifestSchemaValidator = new SchemaValidator<ManifestSchema>(
  FULL_SCHEMA
);

export const readManifestYml = async (tree: Tree, path: string) => {
  const result = await manifestSchemaValidator.validate({
    yamlContent: readYaml(tree, path),
  });

  if (result.success) {
    return result.manifestObject.typedContent;
  }

  throw new Error(`Cannot validate manifest ${path}: ${result.errors}`);
};

export const writeManifestYml = (
  tree: Tree,
  path: string,
  value: ManifestSchema
) => {
  writeYaml(tree, path, value);
};
