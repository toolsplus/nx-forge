import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  addProjectConfiguration,
  readNxJson,
  readProjectConfiguration,
  Tree,
  updateNxJson,
} from '@nx/devkit';

import update from './remove-package-ts-config';

describe('10.0.0 migration (remove package tsConfig option)', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should remove tsConfig from package targets of Forge apps', async () => {
    addProjectConfiguration(tree, 'my-app', {
      root: 'apps/my-app',
      targets: {
        package: {
          options: { tsConfig: 'tsconfig.app.json', resourcePath: 'ui' },
          configurations: { production: { tsConfig: 'tsconfig.prod.json' } },
        },
        'package-custom': {
          executor: '@toolsplus/nx-forge:package',
          options: { outputPath: 'dist/x', tsConfig: 'tsconfig.app.json' },
        },
        build: {
          executor: '@nx/js:tsc',
          options: { tsConfig: 'apps/my-app/tsconfig.app.json' },
        },
      },
    });
    tree.write('apps/my-app/manifest.yml', 'modules: {}\n');

    await update(tree);

    const { targets } = readProjectConfiguration(tree, 'my-app');
    expect(targets?.package).toEqual({
      options: { resourcePath: 'ui' },
      configurations: { production: {} },
    });
    expect(targets?.['package-custom']).toEqual({
      executor: '@toolsplus/nx-forge:package',
      options: { outputPath: 'dist/x' },
    });
    expect(targets?.build?.options).toEqual({
      tsConfig: 'apps/my-app/tsconfig.app.json',
    });
  });

  it('should not change a package target of a project without a Forge manifest', async () => {
    addProjectConfiguration(tree, 'other', {
      root: 'apps/other',
      targets: { package: { options: { tsConfig: 'tsconfig.json' } } },
    });

    await update(tree);

    expect(
      readProjectConfiguration(tree, 'other').targets?.package?.options
    ).toEqual({ tsConfig: 'tsconfig.json' });
  });

  it('should remove tsConfig from package target defaults', async () => {
    updateNxJson(tree, {
      ...readNxJson(tree),
      targetDefaults: {
        '@toolsplus/nx-forge:package': {
          options: { tsConfig: 'tsconfig.app.json' },
        },
        package: {
          executor: '@toolsplus/nx-forge:package',
          options: { tsConfig: 'tsconfig.app.json', resourcePath: 'ui' },
        },
        'package-*': [
          {
            filter: { executor: '@toolsplus/nx-forge:package' },
            executor: '@toolsplus/nx-forge:package',
            options: { tsConfig: 'tsconfig.app.json' },
          },
          {
            filter: { executor: '@toolsplus/nx-forge:package' },
            options: { tsConfig: 'tsconfig.app.json' },
          },
          {
            filter: { executor: '@nx/js:tsc' },
            options: { tsConfig: 'tsconfig.app.json' },
          },
          { options: { tsConfig: 'tsconfig.app.json' } },
        ],
        build: { options: { tsConfig: 'tsconfig.app.json' } },
      },
    });

    await update(tree);

    expect(readNxJson(tree)?.targetDefaults).toEqual({
      '@toolsplus/nx-forge:package': { options: {} },
      package: {
        executor: '@toolsplus/nx-forge:package',
        options: { resourcePath: 'ui' },
      },
      'package-*': [
        {
          filter: { executor: '@toolsplus/nx-forge:package' },
          executor: '@toolsplus/nx-forge:package',
          options: {},
        },
        {
          filter: { executor: '@toolsplus/nx-forge:package' },
          options: {},
        },
        {
          filter: { executor: '@nx/js:tsc' },
          options: { tsConfig: 'tsconfig.app.json' },
        },
        { options: { tsConfig: 'tsconfig.app.json' } },
      ],
      build: { options: { tsConfig: 'tsconfig.app.json' } },
    });
  });
});
