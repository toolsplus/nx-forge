import { ExecutorContext } from '@nx/devkit';
import { runForgeCommandAsync } from '../../utils/forge/async-commands';
import runExecutor from './executor';
import { DeployExecutorOptions } from './schema';

jest.mock('../../utils/forge/async-commands', () => ({
  runForgeCommandAsync: jest.fn().mockResolvedValue(undefined),
}));

const runForgeCommandAsyncMock = jest.mocked(runForgeCommandAsync);

describe('deploy executor', () => {
  const context = {
    configurationName: undefined,
  } as ExecutorContext;

  const defaultOptions: DeployExecutorOptions = {
    outputPath: 'dist/apps/example',
    environment: 'development',
    verify: true,
    interactive: true,
    verbose: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards an approval rule to Forge', async () => {
    await runExecutor(
      {
        ...defaultOptions,
        approve: ['MAJOR_VERSION_RULE'],
      },
      context
    );

    expect(runForgeCommandAsyncMock).toHaveBeenCalledWith(
      [
        'deploy',
        '--environment=development',
        '--approve',
        'MAJOR_VERSION_RULE',
      ],
      { cwd: 'dist/apps/example' }
    );
  });

  it('forwards a major version backport to Forge', async () => {
    await runExecutor(
      {
        ...defaultOptions,
        majorVersion: 2,
      },
      context
    );

    expect(runForgeCommandAsyncMock).toHaveBeenCalledWith(
      ['deploy', '--environment=development', '--major-version', '2'],
      { cwd: 'dist/apps/example' }
    );
  });

  it('forwards multiple approval rules to Forge', async () => {
    // Forge documents MAJOR_VERSION_RULE and accepts multiple server-provided rule names:
    // https://developer.atlassian.com/platform/forge/cli-reference/deploy/#pre-approval
    const approvals = ['MAJOR_VERSION_RULE', 'LICENSE_RULE'];

    await runExecutor(
      {
        ...defaultOptions,
        approve: approvals,
      },
      context
    );

    expect(runForgeCommandAsyncMock).toHaveBeenCalledWith(
      ['deploy', '--environment=development', '--approve', ...approvals],
      { cwd: 'dist/apps/example' }
    );
  });

  it('forwards approval rules and a major version backport together', async () => {
    await runExecutor(
      {
        ...defaultOptions,
        approve: ['MAJOR_VERSION_RULE', 'LICENSE_RULE'],
        majorVersion: 2,
      },
      context
    );

    expect(runForgeCommandAsyncMock).toHaveBeenCalledWith(
      [
        'deploy',
        '--environment=development',
        '--approve',
        'MAJOR_VERSION_RULE',
        'LICENSE_RULE',
        '--major-version',
        '2',
      ],
      { cwd: 'dist/apps/example' }
    );
  });

  it('preserves the default Forge invocation', async () => {
    await runExecutor(defaultOptions, context);

    expect(runForgeCommandAsyncMock).toHaveBeenCalledWith(
      ['deploy', '--environment=development'],
      { cwd: 'dist/apps/example' }
    );
  });
});
