import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readProjectConfiguration, Tree } from '@nx/devkit';

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
