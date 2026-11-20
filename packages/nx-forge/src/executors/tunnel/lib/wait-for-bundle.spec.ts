import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { waitForBundle } from './run-tunnel';

describe('waitForBundle', () => {
  let outputPath: string;

  beforeEach(() => {
    jest.useFakeTimers();
    outputPath = mkdtempSync(join(tmpdir(), 'nx-forge-artifact-'));
  });

  afterEach(() => {
    jest.useRealTimers();
    rmSync(outputPath, { recursive: true, force: true });
  });

  const writeBundle = () => {
    mkdirSync(join(outputPath, 'bundle'), { recursive: true });
    writeFileSync(join(outputPath, 'bundle', 'index.js'), '');
  };

  it('should see a bundle that is written late in the timeout window', async () => {
    const ready = waitForBundle(outputPath, 5000);
    const result = expect(ready).resolves.toBe(true);

    await jest.advanceTimersByTimeAsync(3300);
    writeBundle();
    await jest.advanceTimersByTimeAsync(1600);

    await result;
  });

  it('should check once more at the deadline', async () => {
    const ready = waitForBundle(outputPath, 5000);
    const result = expect(ready).resolves.toBe(true);

    await jest.advanceTimersByTimeAsync(4700);
    writeBundle();
    await jest.advanceTimersByTimeAsync(300);

    await result;
  });

  it('should time out if the build writes no bundle', async () => {
    const ready = waitForBundle(outputPath, 1000);
    const result = expect(ready).rejects.toThrow(
      'Tunnel preparation timed out'
    );

    await jest.advanceTimersByTimeAsync(1000);

    await result;
  });
});
