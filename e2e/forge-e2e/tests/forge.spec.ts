import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  tmpProjPath,
  uniq,
} from '@nrwl/nx-plugin/testing';
import { writeFileSync } from 'fs';
import { joinPathFragments } from '@nrwl/devkit';

/**
 * Set Nx workspace root path via environment variable.
 *
 * This can be removed once the related issue with e2e tests is fixed.
 *
 * @see https://github.com/nrwl/nx/issues/5065
 * @see https://github.com/nrwl/nx/issues/5065#issuecomment-834367298
 * @see https://nrwlcommunity.slack.com/archives/CMFKWPU6Q/p1648642872807809
 */
const ensureCorrectWorkspaceRoot = () => {
  writeFileSync(
    joinPathFragments(tmpProjPath(), '.local.env'),
    `NX_WORKSPACE_ROOT_PATH=${tmpProjPath()}`,
    {
      encoding: 'utf8',
    }
  );
};

describe('forge e2e', () => {
  it('should create Forge app', async () => {
    const plugin = uniq('my-forge-app');
    ensureNxProject('@toolsplus/nx-forge', 'dist/packages/forge');
    ensureCorrectWorkspaceRoot();

    await runNxCommandAsync(
      `generate @toolsplus/nx-forge:application ${plugin}`
    );

    const result = await runNxCommandAsync(`build ${plugin}`);
    expect(result.stdout).toContain('Executor ran');
  }, 240000);

  describe('--directory', () => {
    it('should create Forge app with src in the specified directory', async () => {
      const subdir = 'subdir';
      const plugin = uniq('my-forge-app');
      ensureNxProject('@toolsplus/nx-forge', 'dist/packages/forge');
      ensureCorrectWorkspaceRoot();

      await runNxCommandAsync(
        `generate @toolsplus/nx-forge:application ${plugin} --directory ${subdir}`
      );
      expect(() =>
        checkFilesExist(`apps/${subdir}/${plugin}/src/index.ts`)
      ).not.toThrow();
    }, 240000);
  });

  describe('--tags', () => {
    it('should create Forge app with tags added to the project', async () => {
      const plugin = uniq('my-forge-app');
      ensureNxProject('@toolsplus/nx-forge', 'dist/packages/forge');
      ensureCorrectWorkspaceRoot();

      await runNxCommandAsync(
        `generate @toolsplus/nx-forge:application ${plugin} --tags e2etag,e2ePackage`
      );
      const project = readJson(`apps/${plugin}/project.json`);
      expect(project.tags).toEqual(['e2etag', 'e2ePackage']);
    }, 240000);
  });
});
