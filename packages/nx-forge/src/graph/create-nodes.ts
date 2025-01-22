import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import {
  CreateNodesContext,
  createNodesFromFiles,
  CreateNodesV2,
  ProjectConfiguration,
} from '@nx/devkit';
import { getRegisterConfig } from '../shared/targets/get-register-config';
import { getTunnelConfig } from '../shared/targets/get-tunnel-config';
import { getDeployConfig } from '../shared/targets/get-deploy-config';
import { getInstallConfig } from '../shared/targets/get-install-config';
import { getForgeCliConfig } from '../shared/targets/get-forge-cli-config';
import { getPackageConfig } from '../shared/targets/get-package-config';

type ForgeProjectTargets = Pick<ProjectConfiguration, 'targets'>;

const buildForgeProjectTargets = (projectRoot: string): ForgeProjectTargets => {
  const outputPath =
    projectRoot === '.'
      ? `{projectRoot}/dist}`
      : `{workspaceRoot}/dist/{projectRoot}`;

  const targets: ProjectConfiguration['targets'] = {};

  targets.register = getRegisterConfig({ outputPath });
  targets.package = getPackageConfig({ outputPath });
  targets.tunnel = getTunnelConfig({ outputPath });
  targets.deploy = getDeployConfig({ outputPath });
  targets.install = getInstallConfig({ outputPath });
  targets.forge = getForgeCliConfig({ outputPath });

  return targets;
};

const forgeManifestGlob = '**/manifest.yml';

export const createNodesV2: CreateNodesV2 = [
  forgeManifestGlob,
  (manifestFilePaths, options, context) => {
    return createNodesFromFiles(
      (manifestFile, options, context) =>
        createNodesInternal(manifestFile, options, context),
      manifestFilePaths,
      options,
      context
    );
  },
];

function createNodesInternal(
  manifestFilePath: string,
  options: unknown,
  context: CreateNodesContext
) {
  const projectRoot = dirname(manifestFilePath);

  // Do not create a project if project.json isn't there.
  const siblingFiles = readdirSync(join(context.workspaceRoot, projectRoot));
  if (!siblingFiles.includes('project.json')) {
    return {};
  }

  return {
    projects: {
      [projectRoot]: {
        root: projectRoot,
        type: 'application',
        targets: buildForgeProjectTargets(projectRoot),
      },
    },
  };
}
