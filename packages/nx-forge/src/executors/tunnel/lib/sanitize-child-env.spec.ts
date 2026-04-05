import { sanitizeChildProcessEnv } from './sanitize-child-env';

describe('sanitizeChildProcessEnv', () => {
  it('removes task-scoped Nx variables', () => {
    const result = sanitizeChildProcessEnv({
      PATH: '/bin',
      HOME: '/home/test',
      NX_TASK_TARGET_PROJECT: 'forge-app',
      NX_TASK_TARGET_TARGET: 'tunnel',
      NX_BUILD_TARGET: 'forge-app:tunnel',
      NX_PREFIX_OUTPUT: 'true',
      NX_TASKS_RUNNER_DYNAMIC_OUTPUT: 'true',
      NX_TUI: 'true',
      WEBPACK_SERVE: 'true',
    });

    expect(result).toEqual({
      PATH: '/bin',
      HOME: '/home/test',
    });
  });

  it('clears NODE_ENV and applies overrides when requested', () => {
    const result = sanitizeChildProcessEnv(
      {
        PATH: '/bin',
        NODE_ENV: 'development',
      },
      {
        clearNodeEnv: true,
        overrides: {
          FORGE_EMAIL: 'dev@example.com',
        },
      }
    );

    expect(result).toEqual({
      PATH: '/bin',
      FORGE_EMAIL: 'dev@example.com',
    });
  });
});
