import { NormalizedOptions } from '../schema';
import {
  joinPathFragments,
  ProjectConfiguration,
  TargetConfiguration,
} from '@nx/devkit';

export function getDeployConfig(
  project: ProjectConfiguration,
  options: NormalizedOptions
): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:deploy',
    options: {
      outputPath: joinPathFragments('dist', options.appProjectRoot),
    },
  };
}
