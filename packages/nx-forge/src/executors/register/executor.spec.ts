import { resolve } from 'path';
import { ExecutorContext } from '@nx/devkit';
import { runForgeCommandAsync } from '../../utils/forge/async-commands';
import runExecutor from './executor';
import { patchManifestYml } from './lib/patch-manifest-yml';
import { RegisterExecutorOptions } from './schema';

jest.mock('../../utils/forge/async-commands', () => ({
  runForgeCommandAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./lib/patch-manifest-yml', () => ({
  patchManifestYml: jest.fn().mockResolvedValue(undefined),
}));

const runForgeCommandAsyncMock = jest.mocked(runForgeCommandAsync);
const patchManifestYmlMock = jest.mocked(patchManifestYml);

describe('register executor', () => {
  const context = {
    root: '/workspace',
    projectName: 'example',
    projectsConfigurations: {
      version: 2,
      projects: {
        example: {
          root: 'apps/example',
          sourceRoot: 'apps/example/src',
        },
      },
    },
  } as unknown as ExecutorContext;

  const defaultOptions: RegisterExecutorOptions = {
    outputPath: 'dist/apps/example',
    appName: 'Example app',
    verbose: false,
    developerSpaceId: '',
    acceptTerms: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the developer space flag and value as separate arguments', async () => {
    const developerSpaceId = 'space id;$(untrusted)';

    await runExecutor(
      {
        ...defaultOptions,
        developerSpaceId,
      },
      context
    );

    expect(runForgeCommandAsyncMock).toHaveBeenCalledWith(
      ['register', '--developer-space-id', developerSpaceId, 'Example app'],
      { cwd: resolve('/workspace', 'dist/apps/example') }
    );
    expect(patchManifestYmlMock).toHaveBeenCalledTimes(1);
  });
});
