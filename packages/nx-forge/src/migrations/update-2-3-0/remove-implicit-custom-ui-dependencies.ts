/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  getProjects,
  joinPathFragments,
  ProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';
import { extractUIResourceProjectNames } from '../../utils/forge/manifest-yml';
import { readManifestYml } from './utils/manifest';

export default async function update(host: Tree) {
  const projects = getProjects(host);

  const isForgeProject = (config: ProjectConfiguration): boolean => {
    return (
      config.projectType === 'application' &&
      host.exists(joinPathFragments(config.root, 'manifest.yml'))
    );
  };

  for (const [name, config] of projects.entries()) {
    if (config && isForgeProject(config)) {
      if (
        config.implicitDependencies &&
        config.implicitDependencies.length > 0
      ) {
        const manifest = await readManifestYml(
          host,
          joinPathFragments(config.root, 'manifest.yml')
        );
        const customUIProjectNames = extractUIResourceProjectNames(manifest);
        config.implicitDependencies = config.implicitDependencies.filter(
          (d) => !customUIProjectNames.includes(d)
        );
        updateProjectConfiguration(host, name, config);
      }
    }
  }
}
