import type { ProjectGraph } from '@nx/devkit';
import { DependencyType, readJsonFile, writeJsonFile } from '@nx/devkit';
import { sortObjectByKeys } from 'nx/src/utils/object-sort';
import { NormalizedOptions } from '../schema';
import { Resources } from '@forge/manifest';
import { resolve } from 'path';

/**
 * Merges the existing package.json details with a generated package.json that includes
 * all required dependencies.
 *
 * @param projectName Name of the project
 * @param graph Graph associated with the project
 * @param customUIResources Configured Custom UI resources
 * @param options Builder options
 */
export function generatePackageJson(
  projectName: string,
  graph: ProjectGraph,
  customUIResources: Resources,
  options: NormalizedOptions
) {
  const packageJson = createPackageJson(
    projectName,
    graph,
    customUIResources,
    options
  );
  packageJson.main = packageJson.main ?? options.outputFileName;
  delete packageJson.devDependencies;
  writeJsonFile(
    `${resolve(options.root, options.outputPath)}/package.json`,
    packageJson
  );
}

/**
 * Creates a package.json in the output directory for support to install dependencies within containers.
 *
 * If a package.json exists in the project, it will reuse that.
 *
 * Initial implementation copied from `create-package.json.ts` in Nx 15.2.4 linked below. The implementation is
 * modified to not include dependencies from Custom UI projects marked as implicit dependencies.
 *
 * @see https://github.com/nrwl/nx/blob/15.2.4/packages/workspace/src/utilities/create-package-json.ts
 */
function createPackageJson(
  projectName: string,
  graph: ProjectGraph,
  customUIResources: Resources,
  options: {
    projectRoot?: string;
    root?: string;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const customUIProjectNames = customUIResources.map((r) => r.path);
  const npmDeps = findAllNpmDeps(projectName, graph, customUIProjectNames);
  // default package.json if one does not exist
  let packageJson = {
    name: projectName,
    version: '0.0.1',
    dependencies: {},
    devDependencies: {},
  };
  try {
    packageJson = readJsonFile(`${options.projectRoot}/package.json`);
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }
  } catch (e) {
    // do nothing
  }

  const rootPackageJson = readJsonFile(`${options.root}/package.json`);
  Object.entries(npmDeps).forEach(([packageName, version]) => {
    if (
      rootPackageJson.devDependencies?.[packageName] &&
      !packageJson.dependencies[packageName]
    ) {
      packageJson.devDependencies[packageName] = version;
    } else {
      packageJson.dependencies[packageName] = version;
    }
  });

  packageJson.devDependencies &&= sortObjectByKeys(packageJson.devDependencies);
  packageJson.dependencies &&= sortObjectByKeys(packageJson.dependencies);

  return packageJson;
}

function findAllNpmDeps(
  projectName: string,
  graph: ProjectGraph,
  customUIProjectNames: string[],
  list: { [packageName: string]: string } = {},
  seen = new Set<string>()
) {
  if (seen.has(projectName)) {
    return list;
  }

  seen.add(projectName);

  const node = graph.externalNodes[projectName];

  if (node) {
    list[node.data.packageName] = node.data.version;
    recursivelyCollectPeerDependencies(node.name, graph, list);
  } else {
    // we are not interested in the dependencies of external projects
    graph.dependencies[projectName]?.forEach((dep) => {
      // Only include dependencies if they are either not implicit, or if it is not a Custom UI project
      if (
        dep.type !== DependencyType.implicit ||
        !customUIProjectNames.includes(dep.target)
      ) {
        findAllNpmDeps(dep.target, graph, customUIProjectNames, list, seen);
      }
    });
  }

  return list;
}

function recursivelyCollectPeerDependencies(
  projectName: string,
  graph: ProjectGraph,
  list: { [packageName: string]: string } = {},
  seen = new Set<string>()
) {
  const npmPackage = graph.externalNodes[projectName];
  if (!npmPackage || seen.has(projectName)) {
    return list;
  }

  seen.add(projectName);
  const packageName = npmPackage.data.packageName;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const packageJson = require(`${packageName}/package.json`);
    if (!packageJson.peerDependencies) {
      return list;
    }

    Object.keys(packageJson.peerDependencies)
      .map((dependencyName) => `npm:${dependencyName}`)
      .map((dependency) => graph.externalNodes[dependency])
      .filter(Boolean)
      .forEach((node) => {
        if (
          !packageJson.peerDependenciesMeta?.[node.data.packageName]?.optional
        ) {
          list[node.data.packageName] = node.data.version;
          recursivelyCollectPeerDependencies(node.name, graph, list, seen);
        }
      });
    return list;
  } catch (e) {
    return list;
  }
}
