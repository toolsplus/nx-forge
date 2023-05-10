import { ensureNxProject, runNxCommandAsync } from '@nx/plugin/testing';
import { ensureCorrectWorkspaceRoot } from './utils/e2e-workspace';
import { generateForgeApp } from './utils/generate-forge-app';
import { updateFile } from '@nx/plugin/src/utils/testing-utils/utils';

describe('Forge build executor', () => {
  beforeAll(() => {
    ensureNxProject('@toolsplus/nx-forge', 'dist/packages/forge');
    ensureCorrectWorkspaceRoot();
  });

  afterAll(async () => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    await runNxCommandAsync('reset');
  });

  it('should build a Forge app', async () => {
    const appName = await generateForgeApp();
    const nxBuildResult = await runNxCommandAsync(`build ${appName}`);
    expect(nxBuildResult.stdout).toContain('Executor ran');
  });

  it('should build a Forge app in a sub-directory', async () => {
    const subdir = 'subdir';
    const appName = await generateForgeApp(`--directory ${subdir}`);

    const nxBuildResult = await runNxCommandAsync(`build ${subdir}-${appName}`);
    expect(nxBuildResult.stdout).toContain('Executor ran');
  });

  it('should build a Forge app after changing to custom cache location', async () => {
    const appName = await generateForgeApp();

    const resultBeforeCustomCache = await runNxCommandAsync(`build ${appName}`);
    expect(resultBeforeCustomCache.stdout).toContain('Executor ran');

    // https://nx.dev/concepts/how-caching-works#customizing-the-cache-location
    updateFile(`nx.json`, (configString) => {
      let config = JSON.parse(configString);
      config.tasksRunnerOptions.default.options = {
        ...config.tasksRunnerOptions.default.options,
        cacheDirectory: 'node_modules/.custom-cache/nx',
      };
      return JSON.stringify(config);
    });

    const resultAfterCustomCache = await runNxCommandAsync(`build ${appName}`);
    expect(resultAfterCustomCache.stdout).toContain('Executor ran');
  });
});
