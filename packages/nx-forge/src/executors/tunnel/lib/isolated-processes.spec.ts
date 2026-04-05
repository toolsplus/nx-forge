import { createProcessGroup, RunningProcess } from './isolated-processes';

describe('createProcessGroup', () => {
  it('fails when a persistent process exits unexpectedly', async () => {
    const group = createProcessGroup();
    const process = createRunningProcess('forge-app:build --watch');

    group.addPersistent(process.instance);
    process.reject(new Error('watch failed'));

    await expect(group.waitForUnexpectedExit()).rejects.toThrow('watch failed');
  });

  it('shuts down all tracked processes', async () => {
    const group = createProcessGroup();
    const processA = createRunningProcess('custom-ui:serve');
    const processB = createRunningProcess('forge tunnel');

    group.addPersistent(processA.instance);
    group.add(processB.instance);

    await group.shutdown();

    expect(processA.kill).toHaveBeenCalledWith('SIGTERM');
    expect(processB.kill).toHaveBeenCalledWith('SIGTERM');
  });
});

function createRunningProcess(label: string) {
  let rejectPromise: (reason?: unknown) => void = () => undefined;

  const completion = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((_, reject) => {
    rejectPromise = reject;
  });

  const kill = jest.fn().mockResolvedValue(undefined);

  return {
    instance: {
      label,
      completion,
      kill,
    } satisfies RunningProcess,
    kill,
    reject: rejectPromise,
  };
}
