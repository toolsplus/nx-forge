import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateForgeApp } from './utils/generate-forge-app';
import { runNxCommandAsync } from './utils/async-commands';
import { cleanupTestProject, createTestProject } from './utils/test-project';

describe('Forge application generator', () => {
  let projectDirectory: string;

  beforeAll(() => {
    projectDirectory = createTestProject();
  });

  afterAll(async () => {
    try {
      if (projectDirectory) {
        await runNxCommandAsync('reset', { cwd: projectDirectory });
      }
    } finally {
      cleanupTestProject(projectDirectory);
    }
  });

  it('should generate a Forge app', async () => {
    const appName = await generateForgeApp({
      cwd: projectDirectory,
      directory: 'apps',
      options: '--bundler=webpack',
    });
    expect(
      existsSync(join(projectDirectory, 'apps', appName, 'manifest.yml'))
    ).toBe(true);
    expect(
      existsSync(join(projectDirectory, 'apps', appName, 'webpack.config.js'))
    ).toBe(true);
    expect(
      existsSync(join(projectDirectory, 'apps', appName, 'src', 'index.ts'))
    ).toBe(true);
  });

  describe('--directory', () => {
    it('should generate a Forge app in the specified directory', async () => {
      const subdir = 'subdir';
      const appName = await generateForgeApp({
        cwd: projectDirectory,
        directory: subdir,
        options: `--bundler=webpack`,
      });

      expect(
        existsSync(join(projectDirectory, subdir, appName, 'manifest.yml'))
      ).toBe(true);
      expect(
        existsSync(join(projectDirectory, subdir, appName, 'webpack.config.js'))
      ).toBe(true);
      expect(
        existsSync(join(projectDirectory, subdir, appName, 'src', 'index.ts'))
      ).toBe(true);
    });
  });

  describe('--tags', () => {
    it('should generate a Forge app with tags added to the project', async () => {
      const appName = await generateForgeApp({
        cwd: projectDirectory,
        directory: 'apps',
        options: `--tags e2etag,e2ePackage`,
      });
      const project = JSON.parse(
        readFileSync(
          join(projectDirectory, 'apps', appName, 'project.json'),
          'utf8'
        )
      );
      expect(project.tags).toEqual(['e2etag', 'e2ePackage']);
    });
  });
});
