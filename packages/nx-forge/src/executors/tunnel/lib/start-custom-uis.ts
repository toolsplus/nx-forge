import { ExecutorContext, runExecutor } from '@nx/devkit';

export async function startCustomUIs(
  customUIProjectConfigs: { projectName: string; port: number }[],
  context: ExecutorContext
) {
  const customUIIters: AsyncIterable<{ success: boolean }>[] = [];

  for (const config of customUIProjectConfigs) {
    customUIIters.push(
      await runExecutor(
        { project: config.projectName, target: 'serve' },
        { port: config.port },
        context
      )
    );
  }
  return customUIIters;
}
