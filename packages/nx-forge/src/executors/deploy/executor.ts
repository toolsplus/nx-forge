import { logger } from '@nx/devkit';
import { DeployExecutorOptions } from './schema';
import { runForgeCommandAsync } from '../../utils/forge/async-commands';

export default async function runExecutor(options: DeployExecutorOptions) {
  const args = [
    'deploy',
    `--environment=${options.environment}`,
    ...(options.verbose === true ? ['--verbose'] : []),
    ...(options.verify === false ? ['--no-verify'] : []),
    ...(options.interactive === false ? ['--non-interactive'] : []),
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
