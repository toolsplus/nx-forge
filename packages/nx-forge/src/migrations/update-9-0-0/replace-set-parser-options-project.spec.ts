import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  addProjectConfiguration,
  readJson,
  readNxJson,
  Tree,
  updateNxJson,
  writeJson,
} from '@nx/devkit';

import update from './replace-set-parser-options-project';

describe('9.0.0 migration (replace setParserOptionsProject)', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should rename the option in flat and nested nx.json generator defaults', async () => {
    updateNxJson(tree, {
      ...readNxJson(tree),
      generators: {
        '@toolsplus/nx-forge:application': {
          setParserOptionsProject: true,
          linter: 'eslint',
        },
        '@toolsplus/nx-forge': {
          app: { setParserOptionsProject: false },
        },
      },
    });

    await update(tree);

    expect(readNxJson(tree).generators).toEqual({
      '@toolsplus/nx-forge:application': {
        enableTypedLinting: true,
        linter: 'eslint',
      },
      '@toolsplus/nx-forge': {
        app: { enableTypedLinting: false },
      },
    });
  });

  it('should rename the option in project.json generator defaults', async () => {
    addProjectConfiguration(tree, 'myapp', {
      root: 'apps/myapp',
      generators: {
        '@toolsplus/nx-forge:app': { setParserOptionsProject: true },
      },
    });

    await update(tree);

    expect(readJson(tree, 'apps/myapp/project.json').generators).toEqual({
      '@toolsplus/nx-forge:app': { enableTypedLinting: true },
    });
  });

  it('should rename the option in package.json generator defaults', async () => {
    writeJson(tree, 'apps/myapp/package.json', {
      name: 'myapp',
      nx: {
        tags: ['scope:myapp'],
        generators: {
          '@toolsplus/nx-forge': {
            application: { setParserOptionsProject: true },
          },
        },
      },
    });

    await update(tree);

    expect(readJson(tree, 'apps/myapp/package.json')).toEqual({
      name: 'myapp',
      nx: {
        tags: ['scope:myapp'],
        generators: {
          '@toolsplus/nx-forge': {
            application: { enableTypedLinting: true },
          },
        },
      },
    });
  });

  it('should not change defaults of other generators', async () => {
    const generators = {
      '@nx/node:application': { setParserOptionsProject: true },
      '@toolsplus/nx-forge': {
        init: { setParserOptionsProject: true },
        app: null,
      },
    };
    updateNxJson(tree, { ...readNxJson(tree), generators });

    await update(tree);

    expect(readNxJson(tree).generators).toEqual(generators);
  });
});
