import { TargetConfiguration } from '@nx/devkit';

export function getTunnelConfig(): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:tunnel',
    metadata: {
      technologies: ['forge'],
      description: 'Tunnels the Forge app',
    },
  };
}
