/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  getProjects,
  joinPathFragments,
  ProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';
import { extractCustomUIProjectNames } from '../../utils/forge/manifest-yml';
import { readManifestYml } from './utils/manifest';

export default async function update(host: Tree) {
  const projects = getProjects(host);

  const isForgeProjectProject = (config: ProjectConfiguration): boolean => {
    return (
      config.projectType === 'application' &&
      host.exists(joinPathFragments(config.root, 'manifest.yml'))
    );
  };

  for (const [name, config] of projects.entries()) {
    if (config && isForgeProjectProject(config)) {
      if (config.implicitDependencies?.length > 0) {
        const manifest = await readManifestYml(
          host,
          joinPathFragments(config.root, 'manifest.yml')
        );
        const customUIProjectNames = extractCustomUIProjectNames(manifest);
        config.implicitDependencies = config.implicitDependencies.filter(
          (d) => !customUIProjectNames.includes(d)
        );
        updateProjectConfiguration(host, name, config);
      }
    }
  }
}
