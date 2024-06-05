import {
  readNxJson,
  readProjectConfiguration,
  Tree,
  updateNxJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { applicationGenerator } from './generator';

describe('application generator (legacy)', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    const nxJson = readNxJson(tree);
    updateNxJson(tree, nxJson);
  });

  it('should not skip the build target', async () => {
    await applicationGenerator(tree, {
      name: 'my-forge-app',
      bundler: 'webpack',
      projectNameAndRootFormat: 'as-provided',
      addPlugin: false,
    });
    const project = readProjectConfiguration(tree, 'my-forge-app');
    expect(project.root).toEqual('my-forge-app');
    expect(project.targets.build).toMatchInlineSnapshot(`
    {
      "configurations": {
        "development": {},
        "production": {},
      },
      "defaultConfiguration": "production",
      "executor": "@nx/webpack:webpack",
      "options": {
        "assets": [
          "my-forge-app/src/assets",
        ],
        "compiler": "tsc",
        "main": "my-forge-app/src/index.ts",
        "outputFileName": "index.js",
        "outputPath": "dist/my-forge-app/src",
        "target": "node",
        "tsConfig": "my-forge-app/tsconfig.app.json",
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
