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
    outputPath: joinPathFragments(options.outputPath, 'src'),
    outputFileName: 'index.js',
    tsConfig: `${options.projectRoot}/tsconfig.app.json`,
    main: `${options.projectRoot}/src/index.ts`,
    generatePackageJson: false,
    assets: [],
    watch: options.watch,
    transformers: [],
    fileReplacements: [],
    extractLicenses: false,
    externalDependencies: 'all',
  };

  return webpackExecutor(builderOptions, context);
}
