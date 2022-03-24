import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { readJson, Tree } from '@nrwl/devkit';

import generator from './generator';

describe('init generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should add dependencies', async () => {
    await generator(tree, {});
    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.dependencies['@toolsplus/nx-forge']).toBeUndefined();
    expect(packageJson.devDependencies['@toolsplus/nx-forge']).toBeDefined();
  });

  describe('defaultCollection', () => {
    it('should be set if none was set before', async () => {
      await generator(tree, {});
      const nxJson = readJson(tree, 'nx.json');
      expect(nxJson.cli.defaultCollection).toEqual('@toolsplus/nx-forge');
    });
  });
});
