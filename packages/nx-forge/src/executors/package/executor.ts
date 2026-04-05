import { ExecutorContext, logger } from '@nx/devkit';
import { NormalizedOptions, PackageExecutorSchema } from './schema';
import { prepareForgeOutput } from './lib/prepare-forge-output';

export function normalizeOptions(
  options: PackageExecutorSchema,
  root: string,
  sourceRoot: string,
  projectRoot: string
): NormalizedOptions {
  return {
    ...options,
    root,
    sourceRoot,
    projectRoot,
    resourcePath: options.resourcePath ?? 'resources',
    resourceOutputPathMap: options.resourceOutputPathMap ?? {},
  };
}

export default async function runExecutor(
  rawOptions: PackageExecutorSchema,
  context: ExecutorContext
) {
  if (context.projectName === undefined) {
    throw new Error('No project name provided in executor context.');
  }

  const { root, sourceRoot } =
    context.projectsConfigurations.projects[context.projectName];

  if (!sourceRoot) {
    throw new Error(`${context.projectName} does not have a sourceRoot.`);
  }

  if (!root) {
    throw new Error(`${context.projectName} does not have a root.`);
  }

  const options = normalizeOptions(rawOptions, context.root, sourceRoot, root);
  await prepareForgeOutput(options, context);

  logger.info('Executor ran for package');
  return {
    success: true,
  };
}
