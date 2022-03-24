import type { ProjectGraph } from '@nrwl/devkit';
import { writeJsonFile } from '@nrwl/devkit';
import { createPackageJson } from '@nrwl/workspace/src/utilities/create-package-json';
import { NormalizedOptions } from '../schema';

/**
 * Merges the existing package.json details with a generated package.json that includes
 * all required dependencies.
 *
 * @param projectName Name of the project
 * @param graph Graph associated with the project
 * @param options Builder options
 */
export function generatePackageJson(
  projectName: string,
  graph: ProjectGraph,
  options: NormalizedOptions
) {
  const packageJson = createPackageJson(projectName, graph, options);
  packageJson.main = packageJson.main ?? options.outputFileName;
  delete packageJson.devDependencies;
  writeJsonFile(`${options.outputPath}/package.json`, packageJson);
}
