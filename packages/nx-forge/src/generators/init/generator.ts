import {
  addDependenciesToPackageJson,
  formatFiles,
  GeneratorCallback,
  NxJsonConfiguration,
  readJson,
  removeDependenciesFromPackageJson,
  runTasksInSerial,
  Tree,
  writeJson,
} from '@nx/devkit';
import { InitGeneratorSchema } from './schema';
import pluginPackageJson from '../../../package.json';

async function addDependencies(
  tree: Tree,
  keepExistingVersions: boolean
): Promise<GeneratorCallback> {
  return addDependenciesToPackageJson(
    tree,
    {},
    {
      '@toolsplus/nx-forge': pluginPackageJson.version,
    },
    undefined,
    keepExistingVersions
  );
}

function updateNxJson(host: Tree) {
  const nxJson: NxJsonConfiguration = readJson(host, 'nx.json');
  nxJson.plugins = nxJson.plugins || [];
  if (!nxJson.plugins.some((x) => x === '@toolsplus/nx-forge')) {
    nxJson.plugins.push('@toolsplus/nx-forge');
  }
  writeJson(host, 'nx.json', nxJson);
}

export default async function (
  tree: Tree,
  options: InitGeneratorSchema
): Promise<GeneratorCallback> {
  updateNxJson(tree);

  const tasks: GeneratorCallback[] = [];

  if (!options.skipPackageJson) {
    tasks.push(
      removeDependenciesFromPackageJson(tree, ['@toolsplus/nx-forge'], [])
    );
    const addDependenciesTask = await addDependencies(
      tree,
      options.keepExistingVersions
    );
    tasks.push(addDependenciesTask);
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(...tasks);
}
