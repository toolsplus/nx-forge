import { TargetConfiguration } from '@nx/devkit';

interface GetPackageConfigOptions {
  outputPath: string;
}
export function getPackageConfig(
  options: GetPackageConfigOptions
): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:package',
    options: {
      outputPath: options.outputPath,
    },
    metadata: {
      technologies: ['forge'],
      description: 'Packages the Forge app for deployment',
    },
  };
}
