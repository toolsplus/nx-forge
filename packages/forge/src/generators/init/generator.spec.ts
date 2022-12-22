import { createTreeWithEmptyV1Workspace } from '@nrwl/devkit/testing';
import { readJson, Tree } from '@nrwl/devkit';

import generator from './generator';

describe('init generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyV1Workspace();
  });

  it('should add dependencies', async () => {
    await generator(tree, {});
    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.dependencies['@toolsplus/nx-forge']).toBeUndefined();
    expect(packageJson.devDependencies['@toolsplus/nx-forge']).toBeDefined();
  });
});
