import { ExecutorContext, joinPathFragments } from '@nrwl/devkit';
import { BuildNodeBuilderOptions } from '@nrwl/node/src/utils/types';
import { webpackExecutor } from '@nrwl/node/src/executors/webpack/webpack.impl';
import { NormalizedOptions } from '../schema';

export function compileWebpack(
  options: NormalizedOptions,
  context: ExecutorContext
): AsyncGenerator<{
  success: boolean;
  outfile: string;
}> {
  const builderOptions: BuildNodeBuilderOptions = {
    outputPath: joinPathFragments('dist', options.projectRoot),
    tsConfig: `${options.projectRoot}/tsconfig.app.json`,
    main: `${options.projectRoot}/src/index.ts`,
    generatePackageJson: true,
    assets: [],
    watch: options.watch,
    transformers: [],
    fileReplacements: [],
    extractLicenses: false,
    externalDependencies: 'none',
  };

  return webpackExecutor(builderOptions, context);
}
