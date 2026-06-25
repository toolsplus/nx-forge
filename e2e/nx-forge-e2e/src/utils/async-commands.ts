import { exec } from 'child_process';
import type { ExecException } from 'child_process';
import { detectPackageManager, getPackageManagerCommand } from '@nx/devkit';

export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: string | number | null;
  signal: NodeJS.Signals | null;
};

type CommandOptions = {
  cwd: string;
  silenceError?: boolean;
  env?: NodeJS.ProcessEnv;
};

const getCommandResult = (
  error: ExecException | null,
  stdout: string,
  stderr: string
): CommandResult => ({
  stdout,
  stderr,
  exitCode: error ? error.code ?? null : 0,
  signal: error?.signal ?? null,
});

export const formatCommandResult = (
  command: string,
  result: CommandResult
): string => {
  const sections = [
    `Command: ${command}`,
    `Exit code: ${String(result.exitCode)}`,
  ];

  if (result.signal) {
    sections.push(`Signal: ${result.signal}`);
  }

  sections.push(`stdout:\n${result.stdout.trimEnd() || '<empty>'}`);
  sections.push(`stderr:\n${result.stderr.trimEnd() || '<empty>'}`);

  return sections.join('\n\n');
};

export const formatCommandFailure = (
  command: string,
  result: CommandResult,
  reason = `Command failed: ${command}`
): string => [reason, formatCommandResult(command, result)].join('\n\n');

const getCommandEnv = (env?: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  const commandEnv = { ...process.env, ...env };

  // The parent test process in this environment provides NO_COLOR=1.
  // Nx then forces FORCE_COLOR for forked tasks, which produces noisy
  // warnings on stderr unless NO_COLOR is removed for the child command.
  delete commandEnv.NO_COLOR;

  // Nx runs task processes with NX_ADD_PLUGINS=false, but these e2e commands
  // execute inside fresh child workspaces that should follow their own nx.json
  // inference settings instead of inheriting the parent workspace task setting.
  delete commandEnv.NX_ADD_PLUGINS;

  // The e2e suite creates and mutates fresh workspaces on disk between
  // commands. Disabling the Nx daemon avoids stale project graph state
  // causing follow-up commands to miss newly generated projects.
  commandEnv.NX_DAEMON = 'false';

  return commandEnv;
};

/**
 * Runs the given command asynchronously inside the provided working directory.
 *
 * This is a local re-implementation of the helper from `@nx/plugin/testing`
 * so the e2e suite can control the child process environment.
 *
 * The upstream helper forwards `process.env` as-is, but in this execution
 * environment the parent test process provides `NO_COLOR=1`. Nx then forces
 * `FORCE_COLOR` for forked tasks, which adds warnings to stderr and makes
 * output assertions flaky. Removing `NO_COLOR` here keeps the child command
 * output stable while preserving the original helper behavior otherwise.
 *
 * @see https://github.com/nrwl/nx/blob/e8c31d7ac72a6eeb98d07b61f6ae945a2612d8ac/packages/plugin/src/utils/testing-utils/async-commands.ts#L15
 */
export const runCommandAsync = (
  command: string,
  opts: CommandOptions
): Promise<CommandResult> => {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd: opts.cwd,
        env: getCommandEnv(opts.env),
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        const result = getCommandResult(err, stdout, stderr);

        if (!opts.silenceError && err) {
          reject(new Error(formatCommandFailure(command, result)));
          return;
        }
        resolve(result);
      }
    );
  });
};

/**
 * Runs an Nx command asynchronously inside the provided working directory.
 *
 * This mirrors `runNxCommandAsync` from `@nx/plugin/testing`, but delegates to
 * the local `runCommandAsync` above so the same NO_COLOR cleanup is applied to
 * Nx child processes used by this e2e suite.
 *
 * @see https://github.com/nrwl/nx/blob/e8c31d7ac72a6eeb98d07b61f6ae945a2612d8ac/packages/plugin/src/utils/testing-utils/async-commands.ts#L36
 */
export const runNxCommandAsync = (
  command: string,
  opts: CommandOptions
): Promise<CommandResult> => {
  const pmc = getPackageManagerCommand(detectPackageManager(opts.cwd));

  return runCommandAsync(`${pmc.exec} nx ${command}`, {
    ...opts,
  });
};

/**
 * Runs the given Forge CLI command asynchronously inside the provided working directory.
 *
 * Note that this implementation is only meant to be used in testing code. It is using `exec`
 * to run the Forge CLI command. `exec` returns `stdout` and `stderr` as strings which is convenient
 * for validating or processing the console output in tests.
 *
 * @see https://github.com/nrwl/nx/blob/e8c31d7ac72a6eeb98d07b61f6ae945a2612d8ac/packages/plugin/src/utils/testing-utils/async-commands.ts#L40
 *
 * @param command Forge CLI command to execute, e.g. lint, install, register
 * @param opts Execution options
 * @returns Console outputs
 */
export const runForgeCommandAsync = (
  command: string,
  opts: CommandOptions
): Promise<CommandResult> => {
  const pmc = getPackageManagerCommand();

  return runCommandAsync(`${pmc.exec} forge ${command}`, {
    ...opts,
  });
};
