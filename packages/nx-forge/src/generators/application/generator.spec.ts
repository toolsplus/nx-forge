import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readJson, readProjectConfiguration, Tree } from '@nx/devkit';

import generator from './generator';

describe('application generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  describe('not nested', () => {
    it('should update project config', async () => {
      await generator(tree, { name: 'myApp' });

      const project = readProjectConfiguration(tree, 'my-app');

      expect(project.root).toEqual('apps/my-app');

      const executor = (name: string) => `@toolsplus/nx-forge:${name}`;
      const expectedExecutorTargets = [
        ['register', 'register'],
        ['build', 'build'],
        ['serve', 'tunnel'],
        ['deploy', 'deploy'],
        ['install', 'install'],
      ];
      expectedExecutorTargets.forEach(([target, executorName]) =>
        expect(project.targets[target].executor).toEqual(executor(executorName))
      );
    });

    it('should add tags to project config', async () => {
      await generator(tree, {
        name: 'myApp',
        tags: 'one,two',
      });

      const project = readProjectConfiguration(tree, 'my-app');

      expect(project.tags).toEqual(expect.arrayContaining(['one', 'two']));
    });

    it('should generate files', async () => {
      await generator(tree, { name: 'myApp' });
      expect(tree.exists('apps/my-app/tsconfig.json')).toBeTruthy();
      expect(tree.exists('apps/my-app/manifest.yml')).toBeTruthy();
      expect(tree.exists('apps/my-app/src/index.ts')).toBeTruthy();

      const tsconfig = readJson(tree, 'apps/my-app/tsconfig.json');
      expect(tsconfig).toMatchInlineSnapshot(`
        {
          "extends": "../../tsconfig.base.json",
          "files": [],
          "include": [],
          "references": [
            {
              "path": "./tsconfig.app.json",
            },
            {
              "path": "./tsconfig.spec.json",
            },
          ],
        }
      `);
    });
  });

  describe('nested', () => {
    it('should update project config', async () => {
      await generator(tree, {
        name: 'myForgeApp',
        directory: 'myDir',
      });

      const project = readProjectConfiguration(tree, 'my-dir-my-forge-app');

      expect(project.root).toEqual('apps/my-dir/my-forge-app');
    });

    it('should add tags to project config', async () => {
      await generator(tree, {
        name: 'myForgeApp',
        directory: 'myDir',
        tags: 'one,two',
      });

      const project = readProjectConfiguration(tree, 'my-dir-my-forge-app');

      expect(project.tags).toEqual(expect.arrayContaining(['one', 'two']));
    });

    it('should generate files', async () => {
      await generator(tree, {
        name: 'myForgeApp',
        directory: 'myDir',
      });

      [
        `apps/my-dir/my-forge-app/tsconfig.json`,
        `apps/my-dir/my-forge-app/manifest.yml`,
        'apps/my-dir/my-forge-app/src/index.ts',
      ].forEach((path) => {
        expect(tree.exists(path)).toBeTruthy();
      });
    });
  });
});
