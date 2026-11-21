import { BUNDLE_DIRECTORY } from '../forge-output-path';

/**
 * The app packaging configuration that makes the Forge CLI ship the bundle
 * unchanged instead of bundling the app again.
 *
 * @see https://developer.atlassian.com/platform/forge/manifest-reference/packaging/
 */
export const APP_PACKAGING_CONFIGURATION = {
  bundler: 'manual@2026',
  path: BUNDLE_DIRECTORY,
} as const;

export const APP_PACKAGING_CONFIGURATION_YAML = [
  'app:',
  '  package:',
  `    bundler: ${APP_PACKAGING_CONFIGURATION.bundler}`,
  `    path: ${APP_PACKAGING_CONFIGURATION.path}`,
].join('\n');

/**
 * Fails unless the manifest has the app packaging configuration, and prints
 * the lines to add.
 *
 * It takes the parsed manifest before schema validation, so that a wrong value
 * fails with the lines to add instead of a schema error.
 *
 * @param manifest Parsed source manifest of the Forge app
 * @param manifestPath Path of the source manifest, used in the error message
 */
export const verifyAppPackagingConfiguration = (
  manifest: unknown,
  manifestPath: string
): void => {
  const appPackage: Record<string, unknown> =
    (manifest as { app?: { package?: Record<string, unknown> } } | undefined)
      ?.app?.package ?? {};
  const differentSettings = (
    Object.keys(
      APP_PACKAGING_CONFIGURATION
    ) as (keyof typeof APP_PACKAGING_CONFIGURATION)[]
  )
    .filter((key) => appPackage[key] !== APP_PACKAGING_CONFIGURATION[key])
    .map((key) => `app.package.${key}`);

  if (differentSettings.length > 0) {
    throw new Error(
      [
        `${manifestPath} must configure manual Forge packaging. Add these lines:`,
        '',
        APP_PACKAGING_CONFIGURATION_YAML,
        '',
        `Missing or different: ${differentSettings.join(', ')}`,
      ].join('\n')
    );
  }
};
