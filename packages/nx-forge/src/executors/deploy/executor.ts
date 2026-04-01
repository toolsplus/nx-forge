import { ExecutorContext } from '@nx/devkit';
import { DeployExecutorOptions } from './schema';
import { runForgeCommandAsync } from '../../utils/forge/async-commands';
import { transformManifestYml } from './lib/transform-manifest-yml';
import { logTerminalInfo } from '../../utils/log-terminal';

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

  if (options.manifestTransform && options.manifestTransform !== '') {
    logTerminalInfo(
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
  ];

  logTerminalInfo(`Running: forge ${args.join(' ')}`);

  await runForgeCommandAsync(args, {
    cwd: options.outputPath,
  });

  logTerminalInfo('✅ Forge app deployed');
  return {
    success: true,
  };
}
