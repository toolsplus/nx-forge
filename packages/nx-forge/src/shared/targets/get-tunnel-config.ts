import { TargetConfiguration } from '@nx/devkit';

interface GetTunnelConfigOptions {
  outputPath: string;
}
export function getTunnelConfig(
  options: GetTunnelConfigOptions
): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:tunnel',
    options: {
      outputPath: options.outputPath,
    },
    metadata: {
      technologies: ['forge'],
      description: 'Tunnels the Forge app',
    },
  };
}
