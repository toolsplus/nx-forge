import {
  checkFilesExist,
  readJson,
  runNxCommandAsync,
} from '@nrwl/nx-plugin/testing';
import { generateForgeApp } from './utils/generate-app';

describe('forge app generate', () => {
  it('should create Forge app', async () => {
    const appName = await generateForgeApp();

    expect(() => checkFilesExist(`apps/${appName}/manifest.yml`)).not.toThrow();
    expect(() => checkFilesExist(`apps/${appName}/package.json`)).not.toThrow();
    expect(() => checkFilesExist(`apps/${appName}/src/index.ts`)).not.toThrow();

    const result = await runNxCommandAsync(`build ${appName}`);
    expect(result.stdout).toContain('Executor ran');
  }, 240000);

  describe('--directory', () => {
    it('should create Forge app with src in the specified directory', async () => {
      const subdir = 'subdir';
      const appName = await generateForgeApp(`--directory ${subdir}`);

      expect(() =>
        checkFilesExist(`apps/${subdir}/${appName}/manifest.yml`)
      ).not.toThrow();
      expect(() =>
        checkFilesExist(`apps/${subdir}/${appName}/package.json`)
      ).not.toThrow();
      expect(() =>
        checkFilesExist(`apps/${subdir}/${appName}/src/index.ts`)
      ).not.toThrow();
    }, 240000);
  });

  describe('--tags', () => {
    it('should create Forge app with tags added to the project', async () => {
      const plugin = await generateForgeApp(`--tags e2etag,e2ePackage`);
      const project = readJson(`apps/${plugin}/project.json`);
      expect(project.tags).toEqual(['e2etag', 'e2ePackage']);
    }, 240000);
  });
});
