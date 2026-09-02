import {
  logger,
  readNxJson,
  readProjectConfiguration,
  Tree,
  updateNxJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import './test-utils/mock-plugin-inference.spec-helper';
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
      directory: 'my-forge-app',
      bundler: 'webpack',
      linter: 'none',
      unitTestRunner: 'none',
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

  it('supports an explicit lint executor with a deprecation warning', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation();

    await applicationGenerator(tree, {
      directory: 'my-forge-app',
      bundler: 'esbuild',
      unitTestRunner: 'none',
      addPlugin: false,
      skipFormat: true,
    });

    const project = readProjectConfiguration(tree, 'my-forge-app');
    expect(project.targets?.lint).toEqual({ executor: '@nx/eslint:lint' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Generating a target that uses the deprecated `@nx/eslint:lint` executor.'
      )
    );
  });
});
