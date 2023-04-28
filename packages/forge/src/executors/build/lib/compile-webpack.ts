import { ExecutorContext, joinPathFragments } from '@nx/devkit';
import type { WebpackExecutorOptions } from '@nx/webpack';
import { webpackExecutor, WebpackExecutorEvent } from '@nx/webpack';
import { NormalizedOptions } from '../schema';

export function compileWebpack(
  options: NormalizedOptions,
  context: ExecutorContext
): AsyncGenerator<WebpackExecutorEvent> {
  const builderOptions: WebpackExecutorOptions = {
    target: 'node',
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
