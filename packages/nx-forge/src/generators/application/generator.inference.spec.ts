import { readNxJson, readProjectConfiguration, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import './test-utils/mock-plugin-inference.spec-helper';

import { applicationGenerator } from './generator';

describe('application generator ESLint inference', () => {
  let tree: Tree;
  let nxAddPlugins: string | undefined;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    nxAddPlugins = process.env.NX_ADD_PLUGINS;
    delete process.env.NX_ADD_PLUGINS;
  });

  afterEach(() => {
    if (nxAddPlugins === undefined) {
      delete process.env.NX_ADD_PLUGINS;
    } else {
      process.env.NX_ADD_PLUGINS = nxAddPlugins;
    }
  });

  it('uses the inferred lint target by default', async () => {
    await applicationGenerator(tree, {
      directory: 'my-forge-app',
      skipFormat: true,
    });

    const nxJson = readNxJson(tree);
    expect(nxJson.plugins).toContainEqual({
      plugin: '@nx/eslint/plugin',
      options: { targetName: 'lint' },
    });

    const project = readProjectConfiguration(tree, 'my-forge-app');
    expect(project.targets?.lint).toBeUndefined();
    expect(project.targets?.build?.executor).toBe('@nx/webpack:webpack');
    expect(project.targets?.test?.executor).toBe('@nx/jest:jest');
    expect(tree.exists('my-forge-app/eslint.config.mjs')).toBe(true);
  });
});
