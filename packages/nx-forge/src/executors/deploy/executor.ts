import { ExecutorContext, logger } from '@nx/devkit';
import { DeployExecutorOptions } from './schema';
import { runForgeCommandAsync } from '../../utils/forge/async-commands';
import { transformManifestYml } from './lib/transform-manifest-yml';

const APPROVAL_RULE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

const assertValidApprovalRules = (approve: string[] | undefined): void => {
  if (!approve) {
    return;
  }

  const invalid = approve.filter(
    (rule) => !APPROVAL_RULE_NAME_PATTERN.test(rule)
  );

  if (invalid.length > 0) {
    // `approve` is forwarded verbatim into a forge CLI invocation that runs through a shell
    // (see runForgeCommandAsync), so it must be restricted to safe rule-name characters to
    // avoid shell argument/command injection via deploy configuration or CLI overrides.
    throw new Error(
      `Invalid approve option(s): ${invalid
        .map((rule) => JSON.stringify(rule))
        .join(
          ', '
        )}. Approval rule names may only contain letters, numbers, "_" and "-".`
    );
  }
};

const normalizeOptions = (
  options: DeployExecutorOptions,
  context: ExecutorContext
): DeployExecutorOptions => {
  const isEnvironmentName = (
    c?: string
  ): c is DeployExecutorOptions['environment'] =>
    ['development', 'staging', 'production'].includes(c ?? '');

  if (isEnvironmentName(context.configurationName)) {
    return {
      ...options,
      environment: context.configurationName,
    };
  } else {
    return options;
  }
};

export default async function runExecutor(
  rawOptions: DeployExecutorOptions,
  context: ExecutorContext
) {
  const options = normalizeOptions(rawOptions, context);

  assertValidApprovalRules(options.approve);

  if (options.manifestTransform && options.manifestTransform !== '') {
    logger.info(
      `Applying Forge manifest transformation ${
        context.configurationName ? `(${context.configurationName})` : ''
      }: ${options.manifestTransform}`
    );
    await transformManifestYml(
      { ...options, manifestTransform: options.manifestTransform },
      context
    );
  }

  const args = [
    'deploy',
    `--environment=${options.environment}`,
    ...(options.verbose === true ? ['--verbose'] : []),
    ...(options.verify === false ? ['--no-verify'] : []),
    ...(options.interactive === false ? ['--non-interactive'] : []),
    ...(options.approve && options.approve.length > 0
      ? ['--approve', ...options.approve]
      : []),
    ...(options.majorVersion !== undefined
      ? ['--major-version', `${options.majorVersion}`]
      : []),
  ];

  logger.log(`Running: forge ${args.join(' ')}`);

  await runForgeCommandAsync(args, {
    cwd: options.outputPath,
  });

  logger.log('✅ Forge app deployed');
  return {
    success: true,
  };
}
