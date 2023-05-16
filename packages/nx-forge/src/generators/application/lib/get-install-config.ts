import { NormalizedOptions } from '../schema';
import {
  joinPathFragments,
  ProjectConfiguration,
  TargetConfiguration,
} from '@nx/devkit';

export function getInstallConfig(
  project: ProjectConfiguration,
  options: NormalizedOptions
): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:install',
    options: {
      outputPath: joinPathFragments('dist', options.appProjectRoot),
    },
  };
}
