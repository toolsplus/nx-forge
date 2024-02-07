import {
  addProjectConfiguration,
  joinPathFragments,
  ProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { NormalizedOptions } from '../schema';
import { getRegisterConfig } from '../../../shared/targets/get-register-config';
import { getBuildConfig } from '../../../shared/targets/get-build-config';
import { getDeployConfig } from '../../../shared/targets/get-deploy-config';
import { getServeConfig } from '../../../shared/targets/get-serve-config';
import { getInstallConfig } from '../../../shared/targets/get-install-config';

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

  const outputPath = joinPathFragments('dist', options.appProjectRoot);

  project.targets = {};
  project.targets.register = getRegisterConfig({ outputPath });
  project.targets.build = getBuildConfig({
    outputPath,
    webpackConfig: joinPathFragments(project.root, 'webpack.config.js'),
  });
  project.targets.serve = getServeConfig({ outputPath });
  project.targets.deploy = getDeployConfig({ outputPath });
  project.targets.install = getInstallConfig({ outputPath });

  addProjectConfiguration(
    tree,
    options.name,
    project,
    options.standaloneConfig
  );
}
