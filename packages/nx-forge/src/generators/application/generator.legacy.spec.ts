import {
  readNxJson,
  readProjectConfiguration,
  Tree,
  updateNxJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import generator from './generator';

describe('application generator (legacy)', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    const nxJson = readNxJson(tree);
    updateNxJson(tree, nxJson);
  });

  it('should not skip the build target', async () => {
    await generator(tree, {
      name: 'my-forge-app',
      projectNameAndRootFormat: 'as-provided',
      addPlugin: false,
    });
    const project = readProjectConfiguration(tree, 'my-forge-app');
    expect(project.root).toEqual('my-forge-app');
    expect(project.targets.build).toMatchInlineSnapshot(`
    {
      "executor": "@toolsplus/nx-forge:build",
      "options": {
        "outputPath": "dist/my-forge-app",
        "webpackConfig": "my-forge-app/webpack.config.js",
      },
      "outputs": [
        "{options.outputPath}",
      ],
    }
    `);

    const webpackConfig = tree.read('my-forge-app/webpack.config.js', 'utf-8');
    expect(webpackConfig).toContain(`composePlugins`);
    expect(webpackConfig).toContain(`target: 'node'`);
  });
});
