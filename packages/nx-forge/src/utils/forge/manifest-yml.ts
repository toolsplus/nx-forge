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
import { ManifestValidationResult } from '@forge/manifest/out/types';

class ManifestYmlValidator extends AbstractValidationProcessor<ManifestSchema> {
  constructor() {
    super([
      new FileValidator(),
      new YamlValidator(),
      new SchemaValidator(FULL_SCHEMA),
    ]);
  }
}

type ManifestSchemaValidator<T> = (
  input: T
) => Promise<ManifestValidationResult<ManifestSchema>>;

const schemaAndFileValidator: ManifestSchemaValidator<string> = (
  manifestFilePath: string
) => new ManifestYmlValidator().process(manifestFilePath);

const schemaContentValidator: ManifestSchemaValidator<ManifestSchema> = (
  manifestContent: ManifestSchema
) =>
  new SchemaValidator<ManifestSchema>(FULL_SCHEMA).validate({
    yamlContent: manifestContent,
  });

const validateManifestSchema =
  <T>(validator: ManifestSchemaValidator<T>) =>
  async (input: T) => {
    const {
      manifestObject,
      success: isManifestParseSuccess,
      errors,
    } = await validator(input);

    if (
      !isManifestParseSuccess ||
      !manifestObject ||
      !manifestObject.typedContent
    ) {
      throw new Error(
        `Failed to validate manifest input: ${(errors || [])
          .map((e) => e.message)
          .join('\n')}`
      );
    }

    const manifestSchema: ManifestSchema = manifestObject.typedContent;

    if (!manifestSchema) {
      throw new Error('Manifest parse result did not return any content.');
    }

    return manifestSchema;
  };

export const validateManifestContent = (manifestContent: ManifestSchema) =>
  validateManifestSchema(schemaContentValidator)(manifestContent);

export const readManifestYml = (path: string): Promise<ManifestSchema> =>
  validateManifestSchema(schemaAndFileValidator)(path);

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
