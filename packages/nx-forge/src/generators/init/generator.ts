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
  logger,
} from '@nx/devkit';
import { InitGeneratorSchema } from './schema';
import { pluginVersion } from '../../utils/versions';

async function getLatestPackageVersion(
  pkg: string
): Promise<string | undefined> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${pkg}`);
    const json = await response.json();
    return json?.['dist-tags']?.['latest'];
  } catch (error) {
    logger.error(`Failed to fetch latest version of ${pkg}: ${error}`);
    throw new Error(`Failed to fetch latest version of ${pkg}`);
  }
}

async function addDependencies(
  tree: Tree,
  keepExistingVersions: boolean
): Promise<GeneratorCallback> {
  const latestForgeApiVersion = await getLatestPackageVersion('@forge/api');
  const latestForgeResolverVersion = await getLatestPackageVersion(
    '@forge/resolver'
  );

  return addDependenciesToPackageJson(
    tree,
    {
      '@forge/api': latestForgeApiVersion,
      '@forge/resolver': latestForgeResolverVersion,
    },
    {
      '@toolsplus/nx-forge': pluginVersion,
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
