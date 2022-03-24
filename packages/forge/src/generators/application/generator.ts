import {
  formatFiles,
  GeneratorCallback,
  joinPathFragments,
  Tree,
  updateTsConfigsToJs,
} from '@nrwl/devkit';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { Linter, lintProjectGenerator } from '@nrwl/linter';
import { jestProjectGenerator } from '@nrwl/jest';
import initGenerator from '../init/generator';
import { ApplicationGeneratorOptions } from './schema';
import { addProject, createFiles, normalizeOptions } from './lib';

export default async function (
  tree: Tree,
  rawOptions: ApplicationGeneratorOptions
): Promise<GeneratorCallback> {
  const options = normalizeOptions(tree, rawOptions);

  const tasks: GeneratorCallback[] = [];
  const initTask = await initGenerator(tree, {
    unitTestRunner: options.unitTestRunner,
    skipFormat: true,
  });
  tasks.push(initTask);

  createFiles(tree, options);
  addProject(tree, options);

  if (options.linter !== Linter.None) {
    const lintTask = await lintProjectGenerator(tree, {
      linter: options.linter,
      project: options.name,
      tsConfigPaths: [
        joinPathFragments(options.appProjectRoot, 'tsconfig.app.json'),
      ],
      eslintFilePatterns: [
        `${options.appProjectRoot}/**/*.${options.js ? 'js' : 'ts'}`,
      ],
      skipFormat: true,
      setParserOptionsProject: options.setParserOptionsProject,
    });
    tasks.push(lintTask);
  }

  if (options.unitTestRunner === 'jest') {
    const jestTask = await jestProjectGenerator(tree, {
      project: options.name,
      setupFile: 'none',
      skipSerializers: true,
      supportTsx: options.js,
      babelJest: options.babelJest,
      testEnvironment: 'node',
      skipFormat: true,
    });
    tasks.push(jestTask);
  }

  if (options.js) {
    updateTsConfigsToJs(tree, { projectRoot: options.appProjectRoot });
  }

  if (!options.skipFormat) {
    await formatFiles(tree);
  }

  return runTasksInSerial(...tasks);
}
