import { TargetConfiguration } from '@nx/devkit';

interface GetBuildConfigOptions {
  outputPath: string;
  webpackConfig: string;
}

export function getBuildConfig(
  options: GetBuildConfigOptions
): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:build',
    outputs: ['{options.outputPath}'],
    options: {
      outputPath: options.outputPath,
      webpackConfig: options.webpackConfig,
    },
  };
}
