import { formatFiles, GeneratorCallback, Tree } from '@nrwl/devkit';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { InitGeneratorSchema } from './schema';
import { addDependencies, normalizeOptions } from './lib';
import { jestInitGenerator } from '@nrwl/jest';

export default async function (
  tree: Tree,
  rawOptions: InitGeneratorSchema
): Promise<GeneratorCallback> {
  const options = normalizeOptions(rawOptions);
  const jestTask = jestInitGenerator(tree, {});
  const installPackagesTask = addDependencies(tree);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(jestTask, installPackagesTask);
}
