import { logger } from '@nx/devkit';
import { statSync } from 'node:fs';
import path from 'node:path';

export async function waitForTunnelPreparation(
  opts: {
    manifestPathAbsolute: string;
    runtimePathAbsolute: string;
    timeoutMs?: number;
  }
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (
      fileExists(opts.manifestPathAbsolute) &&
      fileExists(opts.runtimePathAbsolute)
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Tunnel preparation timed out after ${timeoutMs} ms.\n` +
      `Expected packaged manifest at ${opts.manifestPathAbsolute} and runtime bundle at ${opts.runtimePathAbsolute}.`
  );
}

export function logTunnelCommand(opts: { debug?: boolean; verbose?: boolean }) {
  const args = [
    'forge',
    'tunnel',
    ...(opts.verbose === true ? ['--verbose'] : []),
    ...(opts.debug === true ? ['--debug'] : []),
  ];

  logger.info(`Running: > ${args.join(' ')}`);
}

function fileExists(filePath: string) {
  return statSync(path.resolve(filePath), {
    throwIfNoEntry: false,
  })?.isFile();
}
