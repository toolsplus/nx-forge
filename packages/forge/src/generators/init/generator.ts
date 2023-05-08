import {
  formatFiles,
  runTasksInSerial,
  GeneratorCallback,
  Tree,
} from '@nx/devkit';
import { InitGeneratorSchema } from './schema';
import { addDependencies, normalizeOptions } from './lib';
import { jestInitGenerator } from '@nx/jest';

export default async function (
  tree: Tree,
  rawOptions: InitGeneratorSchema
): Promise<GeneratorCallback> {
  const options = normalizeOptions(rawOptions);
  const jestTask = await jestInitGenerator(tree, {});
  const installPackagesTask = addDependencies(tree);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(jestTask, installPackagesTask);
}
