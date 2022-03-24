import {
  ProjectConfiguration,
  TargetConfiguration,
} from 'nx/src/shared/workspace';
import { NormalizedOptions } from '../schema';
import { joinPathFragments } from '@nrwl/devkit';

export function getServeConfig(
  project: ProjectConfiguration,
  options: NormalizedOptions
): TargetConfiguration {
  return {
    executor: '@nrwl/workspace:run-commands',
    options: {
      commands: [
        {
          command: `nx run ${options.name}:build --watch`,
        },
        {
          command: `forge tunnel`,
        },
      ],
      cwd: joinPathFragments('dist', options.appProjectRoot),
      parallel: true,
    },
  };
}
