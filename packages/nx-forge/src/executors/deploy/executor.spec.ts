import { ExecutorContext } from '@nx/devkit';
import { DeployExecutorOptions } from './schema';

jest.mock('../../utils/forge/async-commands');

import { runForgeCommandAsync } from '../../utils/forge/async-commands';
import runExecutor from './executor';

const runForgeCommandAsyncMock = runForgeCommandAsync as jest.MockedFunction<
  typeof runForgeCommandAsync
>;

describe('Deploy executor', () => {
  let context: ExecutorContext;
  let options: DeployExecutorOptions;

  beforeEach(() => {
    jest.clearAllMocks();
    runForgeCommandAsyncMock.mockResolvedValue(undefined);

    context = {
      root: '/root',
      cwd: '/root',
      isVerbose: false,
      projectName: 'my-app',
      projectsConfigurations: {
        version: 2,
        projects: {},
      },
      nxJsonConfiguration: {},
    } as ExecutorContext;

    options = {
      outputPath: 'apps/my-app',
      environment: 'development',
      verify: true,
      interactive: true,
      verbose: false,
    };
  });

  it('should not pass --approve or --major-version when not provided', async () => {
    await runExecutor(options, context);

    const args = runForgeCommandAsyncMock.mock.calls[0][0];
    expect(args).not.toContain('--approve');
    expect(args).not.toContain('--major-version');
  });

  it('should forward a single approval rule to forge deploy --approve', async () => {
    await runExecutor({ ...options, approve: ['MAJOR_VERSION_RULE'] }, context);

    const args = runForgeCommandAsyncMock.mock.calls[0][0];
    expect(args).toEqual(
      expect.arrayContaining(['--approve', 'MAJOR_VERSION_RULE'])
    );
  });

  it('should forward multiple approval rules to a single forge deploy --approve flag', async () => {
    await runExecutor(
      { ...options, approve: ['RULE_ONE', 'RULE_TWO'] },
      context
    );

    const args = runForgeCommandAsyncMock.mock.calls[0][0];
    const approveIndex = args.indexOf('--approve');
    expect(approveIndex).toBeGreaterThanOrEqual(0);
    expect(args.slice(approveIndex, approveIndex + 3)).toEqual([
      '--approve',
      'RULE_ONE',
      'RULE_TWO',
    ]);
  });

  it('should not pass --approve when the approve list is empty', async () => {
    await runExecutor({ ...options, approve: [] }, context);

    const args = runForgeCommandAsyncMock.mock.calls[0][0];
    expect(args).not.toContain('--approve');
  });

  it('should forward majorVersion to forge deploy --major-version', async () => {
    await runExecutor({ ...options, majorVersion: 2 }, context);

    const args = runForgeCommandAsyncMock.mock.calls[0][0];
    expect(args).toEqual(expect.arrayContaining(['--major-version', '2']));
  });

  it('should reject an approval rule containing shell metacharacters', async () => {
    await expect(
      runExecutor(
        { ...options, approve: ['MAJOR_VERSION_RULE; rm -rf /'] },
        context
      )
    ).rejects.toThrow(/Invalid approve option/);

    expect(runForgeCommandAsyncMock).not.toHaveBeenCalled();
  });

  it('should accept approval rule names made up of letters, numbers, "_" and "-"', async () => {
    await expect(
      runExecutor({ ...options, approve: ['MAJOR_VERSION-RULE_2'] }, context)
    ).resolves.toEqual({ success: true });
  });

  it('should forward both --approve and --major-version together', async () => {
    await runExecutor(
      { ...options, approve: ['MAJOR_VERSION_RULE'], majorVersion: 2 },
      context
    );

    const args = runForgeCommandAsyncMock.mock.calls[0][0];
    expect(args).toEqual(
      expect.arrayContaining([
        '--approve',
        'MAJOR_VERSION_RULE',
        '--major-version',
        '2',
      ])
    );
  });
});
