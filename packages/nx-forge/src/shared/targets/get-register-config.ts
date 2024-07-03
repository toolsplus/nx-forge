import { TargetConfiguration } from '@nx/devkit';

interface GetRegisterConfigOptions {
  outputPath: string;
}
export function getRegisterConfig(
  options: GetRegisterConfigOptions
): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:register',
    options: {
      outputPath: options.outputPath,
    },
    metadata: {
      technologies: ['forge'],
      description: 'Registers the app with the Forge platform',
    },
  };
}
