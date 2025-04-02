import { NormalizedOptions } from '../schema';
import { ProjectGraph, writeJsonFile } from '@nx/devkit';
import { Resources } from '@forge/manifest';
import {
  getHelperDependenciesFromProjectGraph,
  HelperDependency,
  readTsConfig,
} from '@nx/js';
import { resolve } from 'path';
import { createPackageJson } from './create-package-json';

type Options = Pick<
  NormalizedOptions,
  'root' | 'projectRoot' | 'outputPath'
> & {
  projectName: string;
  tsConfig: string;
  projectGraph: ProjectGraph;
  manifestResources: Resources;
};

/**
 * Generates a package.json file in the project root output directory.
 *
 * Most of the code in this file is copied from the Webpack plugin's
 * `GeneratePackageJsonPlugin` class in Nx 19.5.2.
 *
 * @see https://github.com/nrwl/nx/blob/4dc68beab7ff9ce94f9be5a73c87b5f9d11d3ee6/packages/webpack/src/plugins/generate-package-json-plugin.ts#L38
 */
export function generatePackageJson(options: Options) {
  const helperDependencies = getHelperDependenciesFromProjectGraph(
    options.root,
    options.projectName,
    options.projectGraph
  );

  const importHelpers = !!readTsConfig(options.tsConfig).options.importHelpers;
  const shouldAddHelperDependency =
    importHelpers &&
    helperDependencies.every((dep) => dep.target !== HelperDependency.tsc);

  if (shouldAddHelperDependency) {
    helperDependencies.push({
      type: 'static',
      source: options.projectName,
      target: HelperDependency.tsc,
    });
  }

  const packageJson = createPackageJson(
    options.projectName,
    options.projectGraph,
    options.manifestResources,
    {
      target: undefined,
      root: options.root,
      isProduction: true,
      helperDependencies: helperDependencies.map((dep) => dep.target),
    }
  );

  packageJson.main = packageJson.main ?? 'index.js';
  delete packageJson.devDependencies;

  writeJsonFile(
    `${resolve(options.root, options.outputPath)}/package.json`,
    packageJson
  );
}
