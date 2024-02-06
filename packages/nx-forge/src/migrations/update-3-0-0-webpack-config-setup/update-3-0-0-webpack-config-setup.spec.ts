import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, Tree } from '@nx/devkit';

import webpackConfigSetup from './update-3-0-0-webpack-config-setup';

describe('3.0.0 migration (setup webpack.config file)', () => {
  let tree: Tree;

  const executor = '@toolsplus/nx-forge:build';

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should create webpack.config.js for projects that did not set webpackConfig', async () => {
    addProjectConfiguration(tree, 'myapp', {
      root: 'apps/myapp',
      targets: {
        build: {
          executor,
          options: {},
        },
      },
    });

    await webpackConfigSetup(tree);

    expect(tree.read('apps/myapp/webpack.config.js', 'utf-8')).toEqual(
      `const { composePlugins, withNx } = require('@nx/webpack');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config) => {
  // Note: This was added by an Nx Forge migration. Webpack builds are required to have a corresponding Webpack config file.
  // See: https://nx.dev/recipes/webpack/webpack-config-setup
  return config;
});
`
    );
  });

  it('should not create webpack.config.js when webpackConfig is already set', async () => {
    tree.write(
      `apps/myapp/webpack.config.js`,
      `
      module.exports = { /* CUSTOM */ };
    `
    );
    addProjectConfiguration(tree, 'myapp', {
      root: 'apps/myapp',
      targets: {
        build: {
          executor,
          options: {
            webpackConfig: 'apps/myapp/webpack.config.js',
          },
        },
      },
    });

    await webpackConfigSetup(tree);

    expect(tree.read('apps/myapp/webpack.config.js', 'utf-8')).toContain(
      '/* CUSTOM */'
    );
  });
});
