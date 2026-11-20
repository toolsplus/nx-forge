import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, Tree } from '@nx/devkit';

import update from './add-manifest-packaging-keys';

describe('10.0.0 migration (add manifest packaging keys)', () => {
  let tree: Tree;

  const addForgeApp = (manifest: string, root = 'apps/my-app') => {
    addProjectConfiguration(tree, root.split('/').pop() ?? root, { root });
    tree.write(`${root}/manifest.yml`, manifest);
  };

  const readManifest = (root = 'apps/my-app') =>
    tree.read(`${root}/manifest.yml`, 'utf-8');

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should add the packaging keys to the app section and keep comments and formatting', async () => {
    addForgeApp(`# My Forge app
modules:
  function:
    - key: resolver   # resolves UI calls
      handler: index.handler
app:
  id: ari:cloud:ecosystem::app/abc   # registered
  runtime:
    name: nodejs24.x
    # trailing comment

permissions:
  scopes:
    - read:jira-work
`);

    const result = await update(tree);

    expect(readManifest()).toEqual(`# My Forge app
modules:
  function:
    - key: resolver   # resolves UI calls
      handler: index.handler
app:
  package:
    bundler: manual@2026
    path: bundle
  id: ari:cloud:ecosystem::app/abc   # registered
  runtime:
    name: nodejs24.x
    # trailing comment

permissions:
  scopes:
    - read:jira-work
`);
    expect(result).toBeUndefined();
  });

  it('should use the indentation of the app section', async () => {
    addForgeApp(`app:
    id: ari:cloud:ecosystem::app/abc
    runtime:
        name: nodejs24.x`);

    await update(tree);

    expect(readManifest()).toEqual(`app:
    package:
        bundler: manual@2026
        path: bundle
    id: ari:cloud:ecosystem::app/abc
    runtime:
        name: nodejs24.x`);
  });

  it('should not change a manifest that sets the packaging keys', async () => {
    const manifest = `app:
  id: ari:cloud:ecosystem::app/abc
  runtime: { name: nodejs24.x }
  package:
    path: bundle
    bundler: manual@2026
`;
    addForgeApp(manifest);

    await update(tree);

    expect(readManifest()).toEqual(manifest);
  });

  it.each([
    `app:\n  id: ari:cloud:ecosystem::app/abc\n  package:\n    bundler: webpack\n`,
    `app: { id: ari:cloud:ecosystem::app/abc }\n`,
    `modules: {}\n`,
    `app:\n  id: [unclosed\n`,
  ])(
    'should return next steps for a manifest it cannot update (%#)',
    async (manifest) => {
      addForgeApp(manifest);

      const result = await update(tree);

      expect(readManifest()).toEqual(manifest);
      expect(result?.nextSteps).toEqual([
        expect.stringContaining('apps/my-app/manifest.yml'),
      ]);
    }
  );

  it('should not change projects without a Forge manifest', async () => {
    addProjectConfiguration(tree, 'my-lib', { root: 'libs/my-lib' });

    expect(await update(tree)).toBeUndefined();
  });
});
