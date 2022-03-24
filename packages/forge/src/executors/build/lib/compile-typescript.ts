import { ExecutorContext, joinPathFragments } from '@nrwl/devkit';
import { ExecutorOptions as TscExecutorOptions } from '@nrwl/js/src/utils/schema';
import { tscExecutor } from '@nrwl/js/src/executors/tsc/tsc.impl';
import { NormalizedOptions } from '../schema';

export function compileTypescript(
  options: NormalizedOptions,
  context: ExecutorContext
): AsyncGenerator<{
  success: boolean;
  outfile: string;
}> {
  const tscOptions: TscExecutorOptions = {
    outputPath: joinPathFragments('dist', options.projectRoot),
    tsConfig: `${options.projectRoot}/tsconfig.app.json`,
    updateBuildableProjectDepsInPackageJson: false,
    main: `${options.projectRoot}/src/index.ts`,
    assets: [
      `${options.projectRoot}/*.md`,
      `${options.projectRoot}/manifest.yml`,
    ],
    watch: options.watch,
    transformers: [],
  };

  return tscExecutor(tscOptions, context);
}
