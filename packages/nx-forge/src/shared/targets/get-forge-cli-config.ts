import { TargetConfiguration } from '@nx/devkit';

interface GetForgeCliConfigOptions {
  outputPath: string;
}
export function getForgeCliConfig(
  options: GetForgeCliConfigOptions
): TargetConfiguration {
  return {
    executor: 'nx:run-commands',
    options: {
      command: 'forge',
      cwd: options.outputPath,
    },
    metadata: {
      technologies: ['forge'],
      description: 'Runs a Forge CLI command for the project',
    },
  };
}
