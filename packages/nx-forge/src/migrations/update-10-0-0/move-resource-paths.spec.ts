import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, Tree } from '@nx/devkit';

import update from './move-resource-paths';

describe('10.0.0 migration (move resource paths to the bundle folder)', () => {
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

  it('should move resource paths in the old src folder to the bundle folder and keep comments and formatting', async () => {
    addForgeApp(`modules:
  rovo:agent:
    - key: agent
      prompt: resource:prompts;prompt.txt
resources:
  # Files the build copies from src/assets
  - key: prompts
    path: src/assets # prompt files
  - key: data
    path: 'src'
  - key: global-page
    path: custom-ui-app
app:
  id: ari:cloud:ecosystem::app/abc
`);

    const result = await update(tree);

    expect(readManifest()).toEqual(`modules:
  rovo:agent:
    - key: agent
      prompt: resource:prompts;prompt.txt
resources:
  # Files the build copies from src/assets
  - key: prompts
    path: functions/assets # prompt files
  - key: data
    path: 'functions'
  - key: global-page
    path: custom-ui-app
app:
  id: ari:cloud:ecosystem::app/abc
`);
    expect(result).toBeUndefined();
  });

  it('should leave a resource that names an Nx project', async () => {
    addProjectConfiguration(tree, 'src/ui', { root: 'libs/ui' });
    const manifest = `resources:
  - key: ui
    path: src/ui
`;
    addForgeApp(manifest);

    await update(tree);

    expect(readManifest()).toEqual(manifest);
  });

  it('should report a manifest that it cannot update', async () => {
    const manifest = `resources: [{ key: prompts, path: src/assets }]
`;
    addForgeApp(manifest);

    const result = await update(tree);

    expect(readManifest()).toEqual(manifest);
    expect(result?.nextSteps).toEqual([
      expect.stringContaining('apps/my-app/manifest.yml'),
    ]);
  });
});
