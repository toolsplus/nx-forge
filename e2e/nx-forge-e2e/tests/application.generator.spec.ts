import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  runNxCommandAsync,
} from '@nx/plugin/testing';
import { generateForgeApp } from './utils/generate-forge-app';
import { ensureCorrectWorkspaceRoot } from './utils/e2e-workspace';

describe('Forge application generator', () => {
  beforeAll(() => {
    ensureNxProject('@toolsplus/nx-forge', 'dist/packages/nx-forge');
    ensureCorrectWorkspaceRoot();
  });

  afterAll(async () => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    await runNxCommandAsync('reset');
  });

  it('should generate a Forge app', async () => {
    const appName = await generateForgeApp();
    expect(() => checkFilesExist(`${appName}/manifest.yml`)).not.toThrow();
    expect(() => checkFilesExist(`${appName}/package.json`)).not.toThrow();
    expect(() => checkFilesExist(`${appName}/src/index.ts`)).not.toThrow();
  });

  describe('--directory', () => {
    it('should generate a Forge app in the specified directory', async () => {
      const subdir = 'subdir';
      const appName = await generateForgeApp(`--directory ${subdir}`);

      expect(() =>
        checkFilesExist(`${subdir}/${appName}/manifest.yml`)
      ).not.toThrow();
      expect(() =>
        checkFilesExist(`${subdir}/${appName}/package.json`)
      ).not.toThrow();
      expect(() =>
        checkFilesExist(`${subdir}/${appName}/src/index.ts`)
      ).not.toThrow();
    });
  });

  describe('--tags', () => {
    it('should generate a Forge app with tags added to the project', async () => {
      const appName = await generateForgeApp(`--tags e2etag,e2ePackage`);
      const project = readJson(`${appName}/project.json`);
      expect(project.tags).toEqual(['e2etag', 'e2ePackage']);
    });
  });
});
