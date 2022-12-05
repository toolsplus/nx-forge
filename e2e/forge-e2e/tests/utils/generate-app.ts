import {
  ensureNxProject,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';
import { ensureCorrectWorkspaceRoot } from './e2e-workspace';

export const generateForgeApp = async (options?: string): Promise<string> => {
  const plugin = uniq('my-forge-app');
  ensureNxProject('@toolsplus/nx-forge', 'dist/packages/forge');
  ensureCorrectWorkspaceRoot();
  await runNxCommandAsync(
    `generate @toolsplus/nx-forge:application ${plugin} ${options ?? ''}`
  );
  return plugin;
};
