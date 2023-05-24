import {
  addProjectConfiguration,
  joinPathFragments,
  ProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { NormalizedOptions } from '../schema';
import { getRegisterConfig } from './get-register-config';
import { getBuildConfig } from './get-build-config';
import { getDeployConfig } from './get-deploy-config';
import { getServeConfig } from './get-serve-config';
import { getInstallConfig } from './get-install-config';

/**
 * Generate the new Forge app project in the workspace and configure
 * available targets.
 */
export function addProject(tree: Tree, options: NormalizedOptions) {
  const project: ProjectConfiguration = {
    root: options.appProjectRoot,
    sourceRoot: joinPathFragments(options.appProjectRoot, 'src'),
    projectType: 'application',
    targets: {},
    tags: options.parsedTags,
  };

  project.targets = {};
  project.targets.register = getRegisterConfig(project, options);
  project.targets.build = getBuildConfig(project, options);
  project.targets.serve = getServeConfig(project, options);
  project.targets.deploy = getDeployConfig(project, options);
  project.targets.install = getInstallConfig(project, options);

  addProjectConfiguration(
    tree,
    options.name,
    project,
    options.standaloneConfig
  );
}
