import {
  ProjectConfiguration,
  TargetConfiguration,
} from 'nx/src/shared/workspace';
import { NormalizedOptions } from '../schema';
import { joinPathFragments } from '@nrwl/devkit';

export function getBuildConfig(
  project: ProjectConfiguration,
  options: NormalizedOptions
): TargetConfiguration {
  return {
    executor: '@toolsplus/nx-forge:build',
    outputs: ['{options.outputPath}'],
    options: {
      outputPath: joinPathFragments('dist', options.appProjectRoot),
    },
  };
}
