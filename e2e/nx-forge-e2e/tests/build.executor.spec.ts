import {
  ensureNxProject,
  runNxCommandAsync,
  updateFile,
} from '@nx/plugin/testing';
import { ensureCorrectWorkspaceRoot } from './utils/e2e-workspace';
import { generateForgeApp } from './utils/generate-forge-app';
import stripAnsi = require('strip-ansi');

describe('Forge build executor', () => {
  beforeAll(() => {
    ensureNxProject('@toolsplus/nx-forge', 'dist/packages/nx-forge');
    ensureCorrectWorkspaceRoot();
  });

  afterAll(async () => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    await runNxCommandAsync('reset');
  });

  const buildSuccessMessage = 'Successfully ran target build for project';

  it('should build a Forge app', async () => {
    const appName = await generateForgeApp({ directory: 'apps' });
    const nxBuildResult = await runNxCommandAsync(`build ${appName}`);
    expect(stripAnsi(nxBuildResult.stdout)).toContain(buildSuccessMessage);
  });

  it('should build a Forge app in a sub-directory', async () => {
    const subdir = 'subdir';
    const appName = await generateForgeApp({ directory: subdir });

    const nxBuildResult = await runNxCommandAsync(`build ${appName}`);
    expect(stripAnsi(nxBuildResult.stdout)).toContain(buildSuccessMessage);
  });

  it('should build a Forge app after changing to custom cache location', async () => {
    const appName = await generateForgeApp({ directory: 'apps' });

    const resultBeforeCustomCache = await runNxCommandAsync(`build ${appName}`);
    expect(stripAnsi(resultBeforeCustomCache.stdout)).toContain(
      buildSuccessMessage
    );

    // https://nx.dev/concepts/how-caching-works#customizing-the-cache-location
    updateFile(`nx.json`, (configString) => {
      let config = JSON.parse(configString);
      config.cacheDirectory = 'node_modules/.custom-cache/nx';
      return JSON.stringify(config);
    });

    const resultAfterCustomCache = await runNxCommandAsync(`build ${appName}`);
    expect(stripAnsi(resultAfterCustomCache.stdout)).toContain(
      buildSuccessMessage
    );
  });
});
