import { runNxCommandAsync, uniq } from '@nx/plugin/testing';

/**
 * Generates a Forge app with a unique name to avoid clashes between tests running in parallel.
 *
 * The application will be generated in <directory>/<unique-app-name>.
 *
 * @param directory Directory in which to generate the application
 * @param options Options string to pass to the application generator
 * @returns Name of the generated Forge app.
 */
export const generateForgeApp = async ({
  directory,
  options,
}: {
  directory: string;
  options?: string;
}): Promise<string> => {
  const appName = uniq('nx-forge-test-app-');
  await runNxCommandAsync(
    `generate @toolsplus/nx-forge:application ${directory}/${appName} ${
      options ?? ''
    }`
  );
  return appName;
};
