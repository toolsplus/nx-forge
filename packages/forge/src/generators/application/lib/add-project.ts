import {
  addProjectConfiguration,
  joinPathFragments,
  ProjectConfiguration,
  readWorkspaceConfiguration,
  Tree,
  updateWorkspaceConfiguration,
} from '@nrwl/devkit';
import { NormalizedOptions } from '../schema';
import { getBuildConfig } from './get-build-config';
import { getDeployConfig } from './get-deploy-config';
import { getServeConfig } from './get-serve-config';

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

  project.targets.build = getBuildConfig(project, options);
  project.targets.serve = getServeConfig(project, options);
  project.targets.deploy = getDeployConfig(project, options);

  addProjectConfiguration(
    tree,
    options.name,
    project,
    options.standaloneConfig
  );

  const workspace = readWorkspaceConfiguration(tree);

  if (!workspace.defaultProject) {
    workspace.defaultProject = options.name;
    updateWorkspaceConfiguration(tree, workspace);
  }
}
