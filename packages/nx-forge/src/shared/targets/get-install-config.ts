import { TargetConfiguration } from '@nx/devkit';

interface GetInstallConfigOptions {
  outputPath: string;
}

export function getInstallConfig(
  options: GetInstallConfigOptions
): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:install',
    options: {
      outputPath: options.outputPath,
    },
    metadata: {
      technologies: ['forge'],
      description: 'Installs the Forge app on a Atlassian site',
    },
  };
}
