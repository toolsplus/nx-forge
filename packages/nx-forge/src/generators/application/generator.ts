import {
  ensurePackage,
  formatFiles,
  GeneratorCallback,
  joinPathFragments,
  NX_VERSION,
  runTasksInSerial,
  Tree,
  updateJson,
  updateTsConfigsToJs,
} from '@nx/devkit';
import { lintProjectGenerator } from '@nx/eslint';
import { configurationGenerator } from '@nx/jest';
import { initGenerator as jsInitGenerator, tsConfigBaseOptions } from '@nx/js';
import initGenerator from '../init/generator';
import { ApplicationGeneratorOptions, NormalizedOptions } from './schema';
import { addProject, addAppFiles, normalizeOptions } from './lib';
import { addProjectDependencies } from './lib/add-project-dependencies';
import { logShowProjectCommand } from '@nx/devkit/src/utils/log-show-project-command';

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

export async function applicationGenerator(
  tree: Tree,
  schema: ApplicationGeneratorOptions
) {
  return await applicationGeneratorInternal(tree, {
    addPlugin: false,
    ...schema,
  });
}

export async function applicationGeneratorInternal(
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

  const installTask = await addProjectDependencies(tree, options);
  tasks.push(installTask);

  if (options.bundler === 'webpack') {
    const { webpackInitGenerator } = ensurePackage<
      typeof import('@nx/webpack')
    >('@nx/webpack', NX_VERSION);
    const webpackInitTask = await webpackInitGenerator(tree, {
      skipPackageJson: options.skipPackageJson,
      skipFormat: true,
      addPlugin: options.addPlugin,
    });
    tasks.push(webpackInitTask);
  }

  addAppFiles(tree, options);
  addProject(tree, options);

  updateTsConfigOptions(tree, options);

  if (options.linter === 'eslint') {
    const lintTask = await lintProjectGenerator(tree, {
      linter: options.linter,
      project: options.name,
      tsConfigPaths: [
        joinPathFragments(options.appProjectRoot, 'tsconfig.app.json'),
      ],
      unitTestRunner: options.unitTestRunner,
      skipFormat: true,
      setParserOptionsProject: options.setParserOptionsProject,
      rootProject: options.rootProject,
      addPlugin: options.addPlugin,
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

  tasks.push(() => {
    logShowProjectCommand(options.name);
  });

  return runTasksInSerial(...tasks);
}

export default applicationGenerator;
