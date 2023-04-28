import { writeFileSync } from 'fs';
import { joinPathFragments } from '@nx/devkit';
import { tmpProjPath } from '@nx/plugin/testing';

/**
 * Set Nx workspace root path via environment variable.
 *
 * This can be removed once the related issue with e2e tests is fixed.
 *
 * @see https://github.com/nrwl/nx/issues/5065
 * @see https://github.com/nrwl/nx/issues/5065#issuecomment-834367298
 * @see https://nrwlcommunity.slack.com/archives/CMFKWPU6Q/p1648642872807809
 */
export const ensureCorrectWorkspaceRoot = () => {
  writeFileSync(
    joinPathFragments(tmpProjPath(), '.local.env'),
    `NX_WORKSPACE_ROOT_PATH=${tmpProjPath()}`,
    {
      encoding: 'utf8',
    }
  );
};
