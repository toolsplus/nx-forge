const STRIP_PREFIXES = ['NX_TASK_TARGET_'];
const STRIP_KEYS = new Set([
  'NX_BUILD_TARGET',
  'NX_PREFIX_OUTPUT',
  'NX_TASK_HASH',
  'NX_TASKS_RUNNER_DYNAMIC_OUTPUT',
  'NX_TERMINAL_OUTPUT_PATH',
  'NX_TUI',
  'NX_STREAM_OUTPUT',
  'WEBPACK_SERVE',
]);

export function sanitizeChildProcessEnv(
  env: NodeJS.ProcessEnv = process.env,
  opts: { clearNodeEnv?: boolean; overrides?: NodeJS.ProcessEnv } = {}
): NodeJS.ProcessEnv {
  const sanitized: NodeJS.ProcessEnv = {};

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      continue;
    }

    if (STRIP_KEYS.has(key)) {
      continue;
    }

    if (STRIP_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      continue;
    }

    sanitized[key] = value;
  }

  if (opts.clearNodeEnv) {
    delete sanitized.NODE_ENV;
  }

  return {
    ...sanitized,
    ...opts.overrides,
  };
}
