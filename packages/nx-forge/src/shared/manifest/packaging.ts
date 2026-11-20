import { BUNDLE_DIRECTORY } from '../forge-output-path';

/**
 * The `app.package` keys that make the Forge CLI ship the bundle unchanged
 * instead of bundling the app again.
 *
 * @see https://developer.atlassian.com/platform/forge/manifest-reference/packaging/
 */
export const PACKAGING_KEYS = {
  bundler: 'manual@2026',
  path: BUNDLE_DIRECTORY,
} as const;

export const PACKAGING_KEYS_YAML = [
  'app:',
  '  package:',
  `    bundler: ${PACKAGING_KEYS.bundler}`,
  `    path: ${PACKAGING_KEYS.path}`,
].join('\n');

/**
 * Fails unless the manifest sets the manual packaging keys, and prints the
 * lines to add.
 *
 * It takes the parsed manifest before schema validation, so that a wrong value
 * fails with the lines to add instead of a schema error.
 *
 * @param manifest Parsed source manifest of the Forge app
 * @param manifestPath Path of the source manifest, used in the error message
 */
export const verifyPackagingKeys = (
  manifest: unknown,
  manifestPath: string
): void => {
  const packageKeys: Record<string, unknown> =
    (manifest as { app?: { package?: Record<string, unknown> } } | undefined)
      ?.app?.package ?? {};
  const differentKeys = (
    Object.keys(PACKAGING_KEYS) as (keyof typeof PACKAGING_KEYS)[]
  )
    .filter((key) => packageKeys[key] !== PACKAGING_KEYS[key])
    .map((key) => `app.package.${key}`);

  if (differentKeys.length > 0) {
    throw new Error(
      [
        `${manifestPath} must set the manual packaging keys. Add these lines:`,
        '',
        PACKAGING_KEYS_YAML,
        '',
        `Missing or different: ${differentKeys.join(', ')}`,
      ].join('\n')
    );
  }
};
