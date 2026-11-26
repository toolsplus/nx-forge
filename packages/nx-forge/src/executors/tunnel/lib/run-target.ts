import { ExecutorContext, runExecutor } from '@nx/devkit';

/**
 * Runs a target of a project from within the tunnel task, like `runExecutor`.
 *
 * Nx describes a task to the processes it starts with `NX_TASK_TARGET_*`
 * variables. The tunnel runs other targets in its own process, so the commands
 * that `nx:run-commands` starts for them inherit the tunnel task's variables.
 * Tools such as `NxAppWebpackPlugin` read these variables to find the project
 * and target they build, and would load the options of the tunnel target
 * instead. For `nx:run-commands` targets, this sets the variables to the target
 * being run, as Nx would if it ran the target itself.
 */
export function runTarget(
  target: { project: string; target: string },
  overrides: Record<string, unknown>,
  context: ExecutorContext
) {
  const targetConfig =
    context.projectsConfigurations.projects[target.project]?.targets?.[
      target.target
    ];
  if (targetConfig?.executor !== 'nx:run-commands') {
    return runExecutor(target, overrides, context);
  }

  // `runExecutor` runs the default configuration, and an override replaces
  // the `env` option of the target, so keep the variables the target sets.
  const configuration = targetConfig.defaultConfiguration;
  const targetEnv =
    (configuration
      ? targetConfig.configurations?.[configuration]?.env
      : undefined) ?? targetConfig.options?.env;

  return runExecutor(
    target,
    {
      ...overrides,
      env: {
        ...targetEnv,
        NX_TASK_TARGET_PROJECT: target.project,
        NX_TASK_TARGET_TARGET: target.target,
        // Empty rather than undefined: a command that Nx runs in a pseudo
        // terminal keeps an inherited variable whose value is undefined.
        NX_TASK_TARGET_CONFIGURATION: configuration ?? '',
      },
    },
    context
  );
}
