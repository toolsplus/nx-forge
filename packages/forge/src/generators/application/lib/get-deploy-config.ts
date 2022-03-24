import {
  ProjectConfiguration,
  TargetConfiguration,
} from 'nx/src/shared/workspace';
import { NormalizedOptions } from '../schema';
import { joinPathFragments } from '@nrwl/devkit';

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
