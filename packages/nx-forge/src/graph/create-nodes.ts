import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import {
  CreateNodes,
  CreateNodesContext,
  createNodesFromFiles,
  CreateNodesV2,
  logger,
  ProjectConfiguration,
} from '@nx/devkit';
import { getRegisterConfig } from '../shared/targets/get-register-config';
import { getServeConfig } from '../shared/targets/get-serve-config';
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
  targets.serve = getServeConfig({ outputPath });
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

/**
 * @deprecated This is replaced with {@link createNodesV2}. Update your plugin to export its own `createNodesV2` function that wraps this one instead.
 * This function will change to the v2 function in Nx 20.
 */
export const createNodes: CreateNodes = [
  forgeManifestGlob,
  (manifestFilePath, options, context) => {
    logger.warn(
      '`createNodes` is deprecated. Update your plugin to utilize createNodesV2 instead. In Nx 20, this will change to the createNodesV2 API.'
    );
    return createNodesInternal(manifestFilePath, options, context);
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
