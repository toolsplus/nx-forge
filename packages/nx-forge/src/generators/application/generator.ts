import {
  formatFiles,
  GeneratorCallback,
  joinPathFragments,
  runTasksInSerial,
  Tree,
  updateJson,
  updateTsConfigsToJs,
} from '@nx/devkit';
import { Linter, lintProjectGenerator } from '@nx/eslint';
import { configurationGenerator, jestInitGenerator } from '@nx/jest';
import { initGenerator as jsInitGenerator, tsConfigBaseOptions } from '@nx/js';
import initGenerator from '../init/generator';
import { ApplicationGeneratorOptions, NormalizedOptions } from './schema';
import { addProject, addAppFiles, normalizeOptions } from './lib';

function updateTsConfigOptions(tree: Tree, options: NormalizedOptions) {
  updateJson(tree, `${options.appProjectRoot}/tsconfig.json`, (json) => {
    if (options.rootProject) {
      return {
        compilerOptions: {
          ...tsConfigBaseOptions,
          ...json.compilerOptions,
          esModuleInterop: true,
        },
        ...json,
        extends: undefined,
        exclude: ['node_modules', 'tmp'],
      };
    } else {
      return {
        ...json,
        compilerOptions: {
          ...json.compilerOptions,
          esModuleInterop: true,
        },
      };
    }
  });
}

export default async function (
  tree: Tree,
  schema: ApplicationGeneratorOptions
) {
  return await applicationGeneratorInternal(tree, {
    projectNameAndRootFormat: 'derived',
    ...schema,
  });
}

async function applicationGeneratorInternal(
  tree: Tree,
  rawOptions: ApplicationGeneratorOptions
): Promise<GeneratorCallback> {
  const options = await normalizeOptions(tree, rawOptions);

  const tasks: GeneratorCallback[] = [];

  const jsInitTask = await jsInitGenerator(tree, {
    ...rawOptions,
    tsConfigName: rawOptions.rootProject
      ? 'tsconfig.json'
      : 'tsconfig.base.json',
    skipFormat: true,
  });
  tasks.push(jsInitTask);

  const initTask = await initGenerator(tree, {
    skipFormat: true,
  });
  tasks.push(initTask);

  addAppFiles(tree, options);
  addProject(tree, options);

  updateTsConfigOptions(tree, options);

  if (options.unitTestRunner === 'jest') {
    tasks.push(
      await jestInitGenerator(tree, { ...rawOptions, testEnvironment: 'node' })
    );
  }

  if (options.linter === Linter.EsLint) {
    const lintTask = await lintProjectGenerator(tree, {
      linter: options.linter,
      project: options.name,
      tsConfigPaths: [
        joinPathFragments(options.appProjectRoot, 'tsconfig.app.json'),
      ],
      unitTestRunner: options.unitTestRunner,
      skipFormat: true,
      setParserOptionsProject: options.setParserOptionsProject,
    });
    tasks.push(lintTask);
  }

  if (options.unitTestRunner === 'jest') {
    const jestTask = await configurationGenerator(tree, {
      ...options,
      project: options.name,
      setupFile: 'none',
      skipSerializers: true,
      supportTsx: options.js,
      testEnvironment: 'node',
      compiler: options.swcJest ? 'swc' : 'tsc',
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
