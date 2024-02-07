import { TargetConfiguration } from '@nx/devkit';

interface GetServeConfigOptions {
  outputPath: string;
}
export function getServeConfig(
  options: GetServeConfigOptions
): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:tunnel',
    options: {
      outputPath: options.outputPath,
    },
  };
}
