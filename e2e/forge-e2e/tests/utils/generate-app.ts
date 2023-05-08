import { runNxCommandAsync, uniq } from '@nx/plugin/testing';

export const generateForgeApp = async (options?: string): Promise<string> => {
  const appName = uniq('my-forge-app');
  await runNxCommandAsync(
    `generate @toolsplus/nx-forge:application ${appName} ${options ?? ''}`
  );
  return appName;
};
