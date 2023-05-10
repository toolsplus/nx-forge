import { resolve } from 'path';
import type { NormalizedOptions, RegisterExecutorOptions } from '../schema';

export function normalizeOptions(
  options: RegisterExecutorOptions,
  root: string,
  sourceRoot: string,
  projectRoot: string
): NormalizedOptions {
  return {
    ...options,
    root,
    sourceRoot,
    projectRoot,
    outputPath: resolve(root, options.outputPath),
  };
}
