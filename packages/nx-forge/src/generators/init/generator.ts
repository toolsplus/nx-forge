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
import {
  forgeApiVersion,
  forgeResolverVersion,
  pluginVersion,
} from '../../utils/versions';

function addDependencies(tree: Tree): GeneratorCallback {
  return addDependenciesToPackageJson(
    tree,
    {
      '@forge/api': forgeApiVersion,
      '@forge/resolver': forgeResolverVersion,
    },
    {
      '@toolsplus/nx-forge': pluginVersion,
    }
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

  tasks.push(
    removeDependenciesFromPackageJson(tree, ['@toolsplus/nx-forge'], [])
  );
  tasks.push(addDependencies(tree));

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(...tasks);
}
