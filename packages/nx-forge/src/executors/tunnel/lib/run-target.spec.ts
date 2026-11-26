import {
  ExecutorContext,
  TargetConfiguration,
  workspaceRoot,
} from '@nx/devkit';
import { runTarget } from './run-target';

// Prints what a command started for the target sees: the task variables, a
// variable from the target's `env` option, and the arguments Nx forwards to
// it after `--`.
const printCommand = `node -p "[process.env.NX_TASK_TARGET_PROJECT, process.env.NX_TASK_TARGET_TARGET, process.env.NX_TASK_TARGET_CONFIGURATION, process.env.FROM_TARGET].join('|') + ' args:' + process.argv.slice(1).join(' ')" --`;

const contextWithServeTarget = (
  serve: TargetConfiguration
): ExecutorContext => ({
  root: workspaceRoot,
  cwd: workspaceRoot,
  isVerbose: false,
  projectName: 'forge-app',
  targetName: 'tunnel',
  projectsConfigurations: {
    version: 2,
    projects: {
      'forge-app': { root: 'apps/forge-app', targets: {} },
      'custom-ui': { root: 'apps/custom-ui', targets: { serve } },
    },
  },
  nxJsonConfiguration: {},
  projectGraph: { nodes: {}, dependencies: {} },
});

const runServe = async (serve: TargetConfiguration) => {
  const outputs: { success: boolean; terminalOutput?: string }[] = [];
  for await (const output of await runTarget(
    { project: 'custom-ui', target: 'serve' },
    { port: 4201 },
    contextWithServeTarget(serve)
  )) {
    outputs.push(output);
  }
  expect(outputs).toEqual([expect.objectContaining({ success: true })]);
  // The last line is the one the command printed, after Nx echoed the command.
  return outputs[0].terminalOutput?.trim().split(/\r?\n/).at(-1);
};

describe('runTarget', () => {
  const tunnelTaskEnv = {
    NX_TASK_TARGET_PROJECT: 'forge-app',
    NX_TASK_TARGET_TARGET: 'tunnel',
    NX_TASK_TARGET_CONFIGURATION: 'tunnel-configuration',
  };
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // The variables that Nx sets for the tunnel task's process.
    Object.assign(process.env, tunnelTaskEnv);
  });

  afterEach(() => {
    for (const key of Object.keys(tunnelTaskEnv)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it('should describe the run-commands target to its commands, not the tunnel task', async () => {
    const printed = await runServe({
      executor: 'nx:run-commands',
      options: { command: printCommand },
    });

    expect(printed).toBe('custom-ui|serve|| args:--port=4201');
  });

  it('should keep the env option of the target', async () => {
    const printed = await runServe({
      executor: 'nx:run-commands',
      options: { command: printCommand, env: { FROM_TARGET: 'kept' } },
    });

    expect(printed).toBe('custom-ui|serve||kept args:--port=4201');
  });

  it('should use the default configuration of the target and its env option', async () => {
    const printed = await runServe({
      executor: 'nx:run-commands',
      options: { command: printCommand, env: { FROM_TARGET: 'options' } },
      defaultConfiguration: 'development',
      configurations: {
        development: { env: { FROM_TARGET: 'development' } },
      },
    });

    expect(printed).toBe(
      'custom-ui|serve|development|development args:--port=4201'
    );
  });
});
