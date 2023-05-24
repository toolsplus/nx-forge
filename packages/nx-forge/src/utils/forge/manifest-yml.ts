import {
  AbstractValidationProcessor,
  FileValidator,
  ManifestSchema,
  SchemaValidator,
  YamlValidator,
} from '@forge/manifest';
import * as FULL_SCHEMA from '@forge/manifest/out/schema/manifest-schema.json';
import { dump } from 'js-yaml';
import { writeFileSync } from 'fs';

class ManifestYmlValidator extends AbstractValidationProcessor<ManifestSchema> {
  constructor() {
    super([
      new FileValidator(),
      new YamlValidator(),
      new SchemaValidator(FULL_SCHEMA),
    ]);
  }
}
export async function readManifestYml(path: string): Promise<ManifestSchema> {
  const {
    manifestObject,
    success: isManifestParseSuccess,
    errors,
  } = await new ManifestYmlValidator().process(path);

  if (
    !isManifestParseSuccess ||
    !manifestObject ||
    !manifestObject.typedContent
  ) {
    throw new Error(
      `Failed to parse manifest.yml (${path}): ${(errors || [])
        .map((e) => e.message)
        .join('\n')}`
    );
  }

  const manifestSchema: ManifestSchema = manifestObject.typedContent;

  if (!manifestSchema) {
    throw new Error('Manifest parse result did not return any content.');
  }

  return manifestSchema;
}

/**
 * Writes the given manifest file to the specified file path.
 * @param path File path where to write the file to (incl. manifest.yml).
 * @param value Manifest contents to write.
 */
export const writeManifestYml = (path: string, value: ManifestSchema): void => {
  const content = dump(value, {});
  writeFileSync(path, content, { encoding: 'utf8' });
};

/**
 * Extracts the Custom UI project names from the given manifest.
 *
 * @param manifest Forge manifest to scan for Custom UI projects.
 * @returns List of project names representing Custom UI projects.
 */
export const extractCustomUIProjectNames = (
  manifest: ManifestSchema
): string[] => {
  return (manifest.resources || []).map((r) => r.path);
};
