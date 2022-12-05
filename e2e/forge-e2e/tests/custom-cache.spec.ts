import {
  ensureNxProject,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';
import { updateFile } from '@nrwl/nx-plugin/src/utils/testing-utils/utils';
import { ensureCorrectWorkspaceRoot } from './utils/e2e-workspace';

describe('forge app with custom Nx caching', () => {
  it('should build Forge app after changing to custom cache location', async () => {
    const plugin = uniq('my-forge-app');
    ensureNxProject('@toolsplus/nx-forge', 'dist/packages/forge');
    ensureCorrectWorkspaceRoot();

    await runNxCommandAsync(
      `generate @toolsplus/nx-forge:application ${plugin}`
    );
    const resultBeforeCustomCache = await runNxCommandAsync(`build ${plugin}`);
    expect(resultBeforeCustomCache.stdout).toContain('Executor ran');

    // https://nx.dev/concepts/how-caching-works#customizing-the-cache-location
    updateFile(`nx.json`, (configString) => {
      let config = JSON.parse(configString);
      config.tasksRunnerOptions.default.options = {
        ...config.tasksRunnerOptions.default.options,
        cacheDirectory: '.nx/cache',
      };
      return JSON.stringify(config);
    });

    const resultAfterCustomCache = await runNxCommandAsync(`build ${plugin}`);
    expect(resultAfterCustomCache.stdout).toContain('Executor ran');
  }, 240000);
});
