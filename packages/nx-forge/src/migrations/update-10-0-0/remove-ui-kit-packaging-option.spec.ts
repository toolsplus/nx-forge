import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  addProjectConfiguration,
  readNxJson,
  readProjectConfiguration,
  Tree,
  updateNxJson,
} from '@nx/devkit';

import update from './remove-ui-kit-packaging-option';

describe('10.0.0 migration (remove package uiKit2Packaging option)', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should remove uiKit2Packaging from package targets of Forge apps', async () => {
    addProjectConfiguration(tree, 'my-app', {
      root: 'apps/my-app',
      targets: {
        package: {
          options: { uiKit2Packaging: true, resourcePath: 'ui' },
          configurations: { production: { uiKit2Packaging: true } },
        },
      },
    });
    tree.write('apps/my-app/manifest.yml', 'modules: {}\n');

    await update(tree);

    expect(readProjectConfiguration(tree, 'my-app').targets?.package).toEqual({
      options: { resourcePath: 'ui' },
      configurations: { production: {} },
    });
  });

  it('should remove uiKit2Packaging from target defaults, also when they do not name the package executor', async () => {
    updateNxJson(tree, {
      ...readNxJson(tree),
      targetDefaults: {
        '@toolsplus/nx-forge:package': { options: { uiKit2Packaging: true } },
        package: { dependsOn: ['build'], options: { uiKit2Packaging: true } },
        build: { cache: true },
      },
    });

    await update(tree);

    expect(readNxJson(tree)?.targetDefaults).toEqual({
      '@toolsplus/nx-forge:package': { options: {} },
      package: { dependsOn: ['build'], options: {} },
      build: { cache: true },
    });
  });
});
