import { spawn } from 'child_process';
import { logger } from '@nrwl/devkit';
import { DeployExecutorOptions } from './schema';

export default async function runExecutor(options: DeployExecutorOptions) {
  const args = [
    'deploy',
    `--environment=${options.environment}`,
    ...(options.verbose === true ? ['--verbose'] : []),
    ...(options.verify === false ? ['--no-verify'] : []),
    ...(options.interactive === false ? ['--non-interactive'] : []),
  ];

  const command = `forge ${args.join(' ')}`;
  logger.log(`Running: ${command}`);

  // https://2ality.com/2018/05/child-process-streams.html#running-commands-in-child-processes
  const deploymentProcess = spawn('forge', args, {
    cwd: options.outputPath,
    stdio: [process.stdin, process.stdout, process.stderr],
  });

  // https://2ality.com/2018/05/child-process-streams.html#waiting-for-a-child-process-to-exit-via-a-promise
  await new Promise((resolve, reject) => {
    deploymentProcess.once('exit', (code: number) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error('Exit with error code: ' + code));
      }
    });
    deploymentProcess.once('error', (err: Error) => {
      reject(err);
    });
  });

  logger.log('✅ Forge app deployed');
  return {
    success: true,
  };
}
