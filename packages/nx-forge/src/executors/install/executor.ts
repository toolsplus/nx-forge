import { InstallExecutorOptions } from './schema';
import { logger } from '@nx/devkit';
import { runForgeCommandAsync } from '../../utils/forge/async-commands';

export default async function runExecutor(options: InstallExecutorOptions) {
  // https://developer.atlassian.com/platform/forge/cli-reference/install/
  const args = [
    'install',
    `--site=${options.site}`,
    `--product=${options.product}`,
    `--environment=${options.environment}`,
    ...(options.upgrade === true ? ['--upgrade'] : []),
    ...(options.confirmScopes === true ? ['--confirm-scopes'] : []),
    ...(options.license ? [`--license ${options.license}`] : []),
    ...(options.interactive === false ? ['--non-interactive'] : []),
    ...(options.verbose === true ? ['--verbose'] : []),
  ];

  logger.log(`Running: forge ${args.join(' ')}`);

  await runForgeCommandAsync(args, {
    cwd: options.outputPath,
  });

  logger.info('✅ Forge app installed');

  return {
    success: true,
  };
}
