import {
  formatFiles,
  GeneratorCallback,
  NxJsonConfiguration,
  readJson,
  runTasksInSerial,
  Tree,
  writeJson,
} from '@nx/devkit';
import { InitGeneratorSchema } from './schema';
import { addDependencies, normalizeOptions } from './lib';
import { jestInitGenerator } from '@nx/jest';

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
  rawOptions: InitGeneratorSchema
): Promise<GeneratorCallback> {
  const options = normalizeOptions(rawOptions);
  updateNxJson(tree);

  const tasks: GeneratorCallback[] = [];

  if (options.unitTestRunner === 'jest') {
    tasks.push(
      await jestInitGenerator(tree, { ...rawOptions, testEnvironment: 'node' })
    );
  }

  tasks.push(addDependencies(tree));

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(...tasks);
}
