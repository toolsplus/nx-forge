import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readJson, Tree, writeJson } from '@nx/devkit';

import update from './add-nx-forge-plugin';

describe('update 2.2.0 migration: add-nx-forge-plugin', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should add plugin if it does not exist', async () => {
    const nxJsonBefore = readJson(tree, 'nx.json');
    expect(nxJsonBefore.plugins).toBeUndefined();

    await update(tree);

    const nxJsonAfter = readJson(tree, 'nx.json');
    expect(nxJsonAfter.plugins).toContain('@toolsplus/nx-forge');
  });

  it('should do nothing if plugin exists', async () => {
    const existingPlugins = ['plugin-1', '@toolsplus/nx-forge', 'plugin-2'];
    const nxJsonBefore = readJson(tree, 'nx.json');
    nxJsonBefore.plugins = nxJsonBefore.plugins || [];
    nxJsonBefore.plugins = existingPlugins;
    writeJson(tree, 'nx.json', nxJsonBefore);

    expect(nxJsonBefore.plugins).toContain('@toolsplus/nx-forge');

    await update(tree);

    const nxJsonAfter = readJson(tree, 'nx.json');
    expect(nxJsonAfter.plugins).toEqual(existingPlugins);
  });
});
