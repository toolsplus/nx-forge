import {
  ExecutorContext,
  joinPathFragments,
  runExecutor,
  TargetConfiguration,
} from '@nx/devkit';
import { PackageExecutorSchema } from '../../package/schema';

export async function startUIKitProjectBuilds(
  outputPath: string,
  uiKitProjects: { projectName: string }[],
  context: ExecutorContext
) {
  const forgeAppProjectConfiguration =
    context.projectsConfigurations.projects[context.projectName];
  if (!forgeAppProjectConfiguration) {
    throw new Error(
      `Failed to start UI Kit project builds: Nx workspace is missing project configuration for project ${context.projectName}.`
    );
  }

  const packageTargetConfiguration: TargetConfiguration<PackageExecutorSchema> =
    forgeAppProjectConfiguration.targets['package'];
  if (!packageTargetConfiguration) {
    throw new Error(
      `Failed to start UI Kit project builds: Failed to read 'package' target configuration for project ${context.projectName}.`
    );
  }

  const resourcePath =
    packageTargetConfiguration.options.resourcePath ?? 'resources';

  const uiKitIters: AsyncIterable<{ success: boolean }>[] = [];

  for (const { projectName } of uiKitProjects) {
    uiKitIters.push(
      await runExecutor(
        {
          project: projectName,
          target: 'build',
        },
        {
          watch: true,
          outputPath: joinPathFragments(
            context.root,
            outputPath,
            resourcePath,
            projectName
          ),
        },
        context
      )
    );
  }
  return uiKitIters;
}
