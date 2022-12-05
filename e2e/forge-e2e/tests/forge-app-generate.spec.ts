import {
  checkFilesExist,
  readJson,
  runNxCommandAsync,
} from '@nrwl/nx-plugin/testing';
import { generateForgeApp } from './utils/generate-app';

describe('forge app generate', () => {
  it('should create Forge app', async () => {
    const plugin = await generateForgeApp();
    const result = await runNxCommandAsync(`build ${plugin}`);
    expect(result.stdout).toContain('Executor ran');
  }, 240000);

  describe('--directory', () => {
    it('should create Forge app with src in the specified directory', async () => {
      const subdir = 'subdir';
      const plugin = await generateForgeApp(`--directory ${subdir}`);
      expect(() =>
        checkFilesExist(`apps/${subdir}/${plugin}/src/index.ts`)
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
