import {
  ensureNxProject,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';
import { ensureCorrectWorkspaceRoot } from './e2e-workspace';

export const generateForgeApp = async (options?: string): Promise<string> => {
  const appName = uniq('my-forge-app');
  ensureNxProject('@toolsplus/nx-forge', 'dist/packages/forge');
  ensureCorrectWorkspaceRoot();
  await runNxCommandAsync(
    `generate @toolsplus/nx-forge:application ${appName} ${options ?? ''}`
  );
  return appName;
};
