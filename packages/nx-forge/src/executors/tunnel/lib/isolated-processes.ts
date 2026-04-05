import { ChildProcess, spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { getPackageManagerCommand, targetToTargetString } from '@nx/devkit';
import { sanitizeChildProcessEnv } from './sanitize-child-env';

export type ExitResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
};

export interface RunningProcess {
  readonly label: string;
  readonly completion: Promise<ExitResult>;
  kill(signal?: NodeJS.Signals): Promise<void>;
}

export interface ProcessGroup {
  add(process: RunningProcess): void;
  addPersistent(process: RunningProcess): void;
  waitForUnexpectedExit(): Promise<never>;
  shutdown(signal?: NodeJS.Signals): Promise<void>;
}

interface SpawnProcessOptions {
  command: string;
  args: string[];
  cwd: string;
  label: string;
  env?: NodeJS.ProcessEnv;
  clearNodeEnv?: boolean;
}

export function spawnNxTarget(
  target: {
    project: string;
    target: string;
    configuration?: string;
  },
  opts: {
    cwd: string;
    label: string;
    overrides?: Record<string, string | number | boolean | undefined>;
    env?: NodeJS.ProcessEnv;
  }
): RunningProcess {
  const pmc = getPackageManagerCommand();
  const [command, ...baseArgs] = splitCommand(pmc.exec);
  const args = [
    ...baseArgs,
    'nx',
    'run',
    targetToTargetString(target),
    ...formatCommandLineOverrides(opts.overrides),
  ];

  return spawnManagedProcess({
    command,
    args,
    cwd: opts.cwd,
    label: opts.label,
    env: {
      // Nx's interactive terminal UI is great when Nx owns the whole terminal,
      // but it causes cursor drift once we orchestrate several child processes
      // ourselves. Force the child into static output so we can prefix/log it
      // consistently from the parent process.
      NX_TASKS_RUNNER_DYNAMIC_OUTPUT: 'false',
      NX_TUI: 'false',
      ...opts.env,
    },
  });
}

export function spawnForgeTunnelProcess(
  opts: {
    cwd: string;
    label?: string;
    env?: NodeJS.ProcessEnv;
    debug?: boolean;
    verbose?: boolean;
  }
): RunningProcess {
  const args = [
    'tunnel',
    ...(opts.verbose === true ? ['--verbose'] : []),
    ...(opts.debug === true ? ['--debug'] : []),
  ];

  return spawnManagedProcess({
    command: 'forge',
    args,
    cwd: opts.cwd,
    label: opts.label ?? 'forge tunnel',
    env: opts.env,
    clearNodeEnv: true,
  });
}

export function createProcessGroup(): ProcessGroup {
  const processes: RunningProcess[] = [];
  const unexpectedExitPromises: Promise<never>[] = [];
  let shuttingDown = false;

  return {
    add(process) {
      processes.push(process);
    },
    addPersistent(process) {
      processes.push(process);
      unexpectedExitPromises.push(
        new Promise((_, reject) => {
          process.completion.then(
            ({ code, signal }) => {
              if (!shuttingDown) {
                reject(
                  new Error(
                    `${process.label} exited unexpectedly (code: ${String(
                      code
                    )}, signal: ${String(signal)})`
                  )
                );
              }
            },
            (error) => {
              if (!shuttingDown) {
                reject(
                  error instanceof Error
                    ? error
                    : new Error(String(error))
                );
              }
            }
          );
        })
      );
    },
    waitForUnexpectedExit() {
      if (unexpectedExitPromises.length === 0) {
        return new Promise<never>(() => undefined);
      }

      return Promise.race(unexpectedExitPromises);
    },
    async shutdown(signal = 'SIGTERM') {
      shuttingDown = true;
      await Promise.all(processes.map((process) => process.kill(signal)));
    },
  };
}

function spawnManagedProcess(opts: SpawnProcessOptions): RunningProcess {
  const child = spawn(opts.command, opts.args, {
    cwd: opts.cwd,
    env: sanitizeChildProcessEnv(process.env, {
      clearNodeEnv: opts.clearNodeEnv,
      overrides: opts.env,
    }),
    // Pipe child output through the parent so we can keep logs left-aligned and
    // attach stable prefixes for each long-running process.
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });

  attachPrefixedStreamForwarder(child.stdout, process.stdout, opts.label);
  attachPrefixedStreamForwarder(child.stderr, process.stderr, opts.label);

  return {
    label: opts.label,
    completion: createCompletionPromise(child, opts.label),
    async kill(signal = 'SIGTERM') {
      await killChildProcess(child, signal);
    },
  };
}

function attachPrefixedStreamForwarder(
  source: Readable | null,
  destination: NodeJS.WriteStream,
  label: string
) {
  if (!source) {
    return;
  }

  let pendingLine = '';

  const flush = () => {
    if (pendingLine.length > 0) {
      destination.write(formatPrefixedLine(label, pendingLine));
      pendingLine = '';
    }
  };

  source.setEncoding('utf8');
  source.on('data', (chunk: string) => {
    // Normalize carriage returns into newlines so spinner/progress-style output
    // from child tools does not leave the shared cursor in the middle of a line.
    const normalized = `${pendingLine}${chunk}`
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    const lines = normalized.split('\n');

    pendingLine = lines.pop() ?? '';

    for (const line of lines) {
      destination.write(formatPrefixedLine(label, line));
    }
  });
  source.on('end', flush);
  source.on('close', flush);
}

function formatPrefixedLine(label: string, line: string) {
  if (line.length === 0) {
    return '\n';
  }

  return `[${label}] ${line}\n`;
}

function createCompletionPromise(
  child: ChildProcess,
  label: string
): Promise<ExitResult> {
  return new Promise((resolve, reject) => {
    child.once('error', (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve({ code, signal });
        return;
      }

      reject(
        new Error(
          `${label} exited with code ${String(code)} and signal ${String(
            signal
          )}`
        )
      );
    });
  });
}

async function killChildProcess(
  child: ChildProcess,
  signal: NodeJS.Signals
): Promise<void> {
  if (
    child.pid === undefined ||
    child.killed ||
    child.exitCode !== null ||
    child.signalCode !== null
  ) {
    return;
  }

  try {
    if (process.platform === 'win32') {
      await new Promise<void>((resolve) => {
        const killer = spawn(
          'taskkill',
          ['/pid', String(child.pid), '/t', '/f'],
          { stdio: 'ignore' }
        );
        killer.once('exit', () => resolve());
        killer.once('error', () => resolve());
      });
      return;
    }

    process.kill(-child.pid, signal);
  } catch (error) {
    if (!isMissingProcessError(error)) {
      throw error;
    }
  }

  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
    setTimeout(resolve, 2_000).unref();
  });
}

function isMissingProcessError(error: unknown) {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ESRCH'
  );
}

function splitCommand(command: string): string[] {
  return command.split(/\s+/).filter(Boolean);
}

function formatCommandLineOverrides(
  overrides: Record<string, string | number | boolean | undefined> = {}
): string[] {
  return Object.entries(overrides).flatMap(([key, value]) => {
    if (value === undefined) {
      return [];
    }

    const cliKey = `--${camelToKebabCase(key)}`;
    if (value === true) {
      return [cliKey];
    }

    if (value === false) {
      return [`${cliKey}=false`];
    }

    return [`${cliKey}=${String(value)}`];
  });
}

function camelToKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
