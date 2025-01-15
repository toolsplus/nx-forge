import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  joinPathFragments,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';
import update from './remove-implicit-custom-ui-dependencies';
import generator from '../../generators/application/generator';
import { readManifestYml, writeManifestYml } from './utils/manifest';
describe('update 2.2.0 migration: remove-implicit-custom-ui-dependencies.spec', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace({ layout: 'apps-libs' });
  });

  it('should remove Custom UI dependencies if they exist', async () => {
    await generator(tree, { name: 'my-app', directory: 'myApp' });
    const project = readProjectConfiguration(tree, 'my-app');

    const customUIProjectName = 'custom-ui-project-1';

    const manifestPath = joinPathFragments(project.root, 'manifest.yml');
    const manifest = await readManifestYml(tree, manifestPath);
    const patchedManifest = {
      ...manifest,
      resources: [
        ...(manifest.resources || []),
        {
          key: 'custom-ui-resource-key',
          path: customUIProjectName,
        },
      ],
    };
    writeManifestYml(tree, manifestPath, patchedManifest);

    const nonCustomUIImplicitDependencies = ['dep-1', 'dep-2'];
    updateProjectConfiguration(tree, project.name, {
      ...project,
      implicitDependencies: [
        ...nonCustomUIImplicitDependencies,
        customUIProjectName,
      ],
    });

    await update(tree);

    const projectConfigurationAfter = readProjectConfiguration(tree, 'my-app');
    expect(projectConfigurationAfter.implicitDependencies).toEqual(
      nonCustomUIImplicitDependencies
    );
  });
});
