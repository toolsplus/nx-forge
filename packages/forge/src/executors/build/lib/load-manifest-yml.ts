import {
  AbstractValidationProcessor,
  FileValidator,
  ManifestSchema,
  SchemaValidator,
  YamlValidator,
} from '@forge/manifest';
import * as FULL_SCHEMA from '@forge/manifest/out/schema/manifest-schema.json';

export async function loadManifestYml(
  manifestPath: string
): Promise<ManifestSchema> {
  const {
    manifestObject,
    success: isManifestParseSuccess,
    errors,
  } = await new ManifestYmlValidator().process(manifestPath);

  if (!isManifestParseSuccess) {
    throw new Error(
      `Failed to parse manifest.yml (${manifestPath}): ${errors
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

class ManifestYmlValidator extends AbstractValidationProcessor<ManifestSchema> {
  constructor() {
    super([
      new FileValidator(),
      new YamlValidator(),
      new SchemaValidator(FULL_SCHEMA),
    ]);
  }
}
