import type { BuildExecutorOptions, NormalizedOptions } from '../schema';

export function normalizeOptions(
  options: BuildExecutorOptions,
  root: string,
  sourceRoot: string,
  projectRoot: string
): NormalizedOptions {
  return {
    ...options,
    root,
    sourceRoot,
    projectRoot,
    customUIPath: options.customUIPath ?? 'customUI',
    outputFileName: 'index.js',
    watch: options.watch ?? false,
  };
}
