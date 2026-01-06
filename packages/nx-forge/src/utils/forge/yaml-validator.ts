import {
  ManifestObject,
  ManifestParserBuilder,
  errors,
  References,
} from '@forge/manifest';
import { readFileSync } from 'node:fs';
import { YAMLError } from 'yaml';
import { ValidatorInterface } from '@forge/manifest/out/validators/validator-interface';
import { ManifestValidationResult } from '@forge/manifest/out/types';

/**
 * Copy of @forge/manifest YamlValidator with the only difference that the
 * validator can be constructed with or without manifest interpolation. The
 * validator provided by @forge/manifest does not provide an option to skip
 * interpolation.
 */
class YamlValidator<T>
  implements ValidatorInterface<ManifestObject<T> | undefined, T>
{
  constructor(protected options: { interpolate: boolean }) {}
  async validate(
    manifest: ManifestObject<T> | undefined
  ): Promise<ManifestValidationResult<T>> {
    if (!manifest?.filePath) {
      return {
        success: false,
        manifestObject: manifest,
      };
    }
    try {
      const content = readFileSync(manifest.filePath, 'utf8');
      const parserBuilder = this.options.interpolate
        ? new ManifestParserBuilder().withInterpolators()
        : new ManifestParserBuilder();
      const manifestContent = parserBuilder
        .build()
        .parseManifest({ content, filePath: manifest.filePath });
      return {
        success: true,
        manifestObject: {
          filePath: manifest.filePath,
          yamlContent: manifestContent,
          yamlContentByLine: content.split('\n'),
        },
      };
    } catch (e) {
      if (e instanceof YAMLError) {
        const pos = e.linePos?.[0];
        return {
          success: false,
          errors: [
            {
              message: errors.invalidManifest(
                e.message.replace(/(at line).+/gms, '').trim()
              ),
              reference: References.InvalidManifest,
              level: 'error',
              line: pos?.line ?? 0,
              column: pos?.col ?? 0,
            },
          ],
        };
      }
      return {
        success: false,
        errors: [
          {
            message: errors.invalidManifest(
              e instanceof Error ? e.message : String(e)
            ),
            reference: References.InvalidManifest,
            level: 'error',
            line: 0,
            column: 0,
          },
        ],
      };
    }
  }
}
export default YamlValidator;
