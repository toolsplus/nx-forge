import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { readJson, Tree } from '@nrwl/devkit';

import generator from './generator';

describe('application generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  describe('not nested', () => {
    it('should update workspace.json', async () => {
      await generator(tree, { name: 'myApp' });

      const workspaceJson = readJson(tree, 'workspace.json');

      expect(workspaceJson.projects['my-app'].root).toEqual('apps/my-app');
    });

    it('should add tags to workspace.json', async () => {
      await generator(tree, {
        name: 'myApp',
        tags: 'one,two',
      });

      const workspaceJson = readJson(tree, 'workspace.json');

      expect(workspaceJson.projects['my-app'].tags).toEqual(
        expect.arrayContaining(['one', 'two'])
      );
    });

    it('should generate files', async () => {
      await generator(tree, { name: 'myApp' });
      expect(tree.exists('apps/my-app/tsconfig.json')).toBeTruthy();
      expect(tree.exists('apps/my-app/manifest.yml')).toBeTruthy();
      expect(tree.exists('apps/my-app/src/index.ts')).toBeTruthy();
    });
  });

  describe('nested', () => {
    it('should update workspace.json', async () => {
      await generator(tree, {
        name: 'myForgeApp',
        directory: 'myDir',
      });
      const workspaceJson = readJson(tree, '/workspace.json');

      expect(workspaceJson.projects['my-dir-my-forge-app'].root).toEqual(
        'apps/my-dir/my-forge-app'
      );
    });

    it('should add tags to workspace.json', async () => {
      await generator(tree, {
        name: 'myForgeApp',
        directory: 'myDir',
        tags: 'one,two',
      });
      const workspaceJson = readJson(tree, '/workspace.json');

      expect(workspaceJson.projects['my-dir-my-forge-app'].tags).toEqual(
        expect.arrayContaining(['one', 'two'])
      );
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
