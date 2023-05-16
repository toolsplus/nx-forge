import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readJson, Tree } from '@nx/devkit';

import generator from './generator';

describe('init generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should add dependencies', async () => {
    await generator(tree, {});
    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.dependencies['@toolsplus/nx-forge']).toBeUndefined();
    expect(packageJson.devDependencies['@toolsplus/nx-forge']).toBeDefined();
  });

  it('should not add jest config if unitTestRunner is none', async () => {
    await generator(tree, { unitTestRunner: 'none' });
    expect(tree.exists('jest.config.js')).toEqual(false);
  });

  it('should register nx plugin', async () => {
    await generator(tree, {});
    const nxJson = readJson(tree, 'nx.json');
    expect(nxJson.plugins).toContain('@toolsplus/nx-forge');
  });
});
