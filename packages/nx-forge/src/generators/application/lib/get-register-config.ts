import {
  joinPathFragments,
  ProjectConfiguration,
  TargetConfiguration,
} from '@nx/devkit';
import { NormalizedOptions } from '../schema';

export function getRegisterConfig(
  project: ProjectConfiguration,
  options: NormalizedOptions
): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:register',
    options: {
      outputPath: joinPathFragments('dist', options.appProjectRoot),
    },
  };
}
