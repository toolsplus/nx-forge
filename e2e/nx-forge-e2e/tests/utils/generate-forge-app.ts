import { runNxCommandAsync, uniq } from '@nx/plugin/testing';

/**
 * Generates a Forge app with a unique name to avoid clashes between tests running in parallel.
 *
 * @param options Options string to pass to the application generator
 * @returns Name of the generated Forge app.
 */
export const generateForgeApp = async (options?: string): Promise<string> => {
  const appName = uniq('nx-forge-test-app-');
  await runNxCommandAsync(
    `generate @toolsplus/nx-forge:application ${appName} ${options ?? ''}`
  );
  return appName;
};
