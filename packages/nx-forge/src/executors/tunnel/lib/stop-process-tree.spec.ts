import spawn from 'cross-spawn';
import { stopProcessTree } from './stop-process-tree';

jest.mock('cross-spawn', () => jest.fn());

const spawnMock = jest.mocked(spawn);

describe('stopProcessTree', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send SIGTERM so that Forge can deregister the tunnel', () => {
    const child = { pid: 42, kill: jest.fn().mockReturnValue(true) };

    stopProcessTree(child, 'linux');

    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('should terminate the whole process tree on Windows', () => {
    const child = { pid: 42, kill: jest.fn().mockReturnValue(true) };

    stopProcessTree(child, 'win32');

    expect(spawnMock).toHaveBeenCalledWith(
      'taskkill',
      ['/pid', '42', '/T', '/F'],
      { stdio: 'ignore' }
    );
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('should not run taskkill for a process that did not start', () => {
    const child = { pid: undefined, kill: jest.fn().mockReturnValue(false) };

    stopProcessTree(child, 'win32');

    expect(spawnMock).not.toHaveBeenCalled();
  });
});
