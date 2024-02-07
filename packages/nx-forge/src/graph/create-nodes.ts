import { dirname } from 'path';
import { CreateNodes, TargetConfiguration } from '@nx/devkit';
import { getRegisterConfig } from '../shared/targets/get-register-config';
import { getBuildConfig } from '../shared/targets/get-build-config';
import { getServeConfig } from '../shared/targets/get-serve-config';
import { getDeployConfig } from '../shared/targets/get-deploy-config';
import { getInstallConfig } from '../shared/targets/get-install-config';

const registerProjectTargets = (projectRoot: string) => {
  const outputPath =
    projectRoot === '.'
      ? `{projectRoot}/dist}`
      : `{workspaceRoot}/dist/{projectRoot}`;

  const targets: Record<string, TargetConfiguration> = {};

  targets.register = getRegisterConfig({ outputPath });
  targets.build = getBuildConfig({
    outputPath,
    webpackConfig: `{projectRoot}/webpack.config.js}`,
  });
  targets.serve = getServeConfig({ outputPath });
  targets.deploy = getDeployConfig({ outputPath });
  targets.install = getInstallConfig({ outputPath });

  return targets;
};

export const createNodes: CreateNodes = [
  `**/manifest.yml`,
  (manifestFilePath) => {
    const projectRoot = dirname(manifestFilePath);
    return {
      projects: {
        [projectRoot]: {
          root: projectRoot,
          type: 'application',
          targets: registerProjectTargets(projectRoot),
        },
      },
    };
  },
];
