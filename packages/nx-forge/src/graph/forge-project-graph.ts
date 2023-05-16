import {
  FileData,
  logger,
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
} from '@nx/devkit';
import {
  extractCustomUIProjectNames,
  readManifestYml,
} from '../utils/forge/manifest-yml';

interface StaticDependency {
  readonly sourceProjectFile: string;
  readonly sourceProjectName: string;
  readonly targetProjectName: string;
}

const getCustomUIStaticDependencies = async (
  [projectName, manifestFile]: [string, FileData],
  context: ProjectGraphProcessorContext
): Promise<StaticDependency[]> => {
  const manifestSchema = await readManifestYml(manifestFile.file);
  const customUIProjectNames = extractCustomUIProjectNames(manifestSchema);

  const getCustomUIStaticDependency = (
    customUIProjectName: string
  ): StaticDependency => {
    const customUIProjectConfiguration =
      context.projectsConfigurations.projects[customUIProjectName];

    if (!customUIProjectConfiguration) {
      throw new Error(
        `Failed to find Custom UI project in Nx workspace: The Custom UI dependency to project ${customUIProjectName} declared in the Forge manifest.yml of project ${projectName} cannot be found. Make sure the Custom UI resource path references a project in your Nx workspace.`
      );
    }

    const projectConfiguration =
      context.projectsConfigurations.projects[projectName];

    if (!projectConfiguration) {
      throw new Error(
        `Missing project configuration in Nx workspace for project ${projectName}`
      );
    }

    return {
      sourceProjectFile: manifestFile.file,
      sourceProjectName: projectName,
      targetProjectName: customUIProjectName,
    };
  };

  return customUIProjectNames.reduce((acc, customUIProjectName) => {
    return (manifestFile.dependencies || []).find(
      ({ type, target, source }) =>
        type === 'static' &&
        target === customUIProjectName &&
        source === projectName
    )
      ? acc // Dependency already exists, skip adding it again.
      : [...acc, getCustomUIStaticDependency(customUIProjectName)];
  }, []);
};

export async function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): Promise<ProjectGraph> {
  const builder = new ProjectGraphBuilder(graph);

  for (const [projectName, files] of Object.entries(context.filesToProcess)) {
    for await (const manifestFile of files.filter((f) =>
      f.file.endsWith('manifest.yml')
    )) {
      logger.info(`[nx-forge] Processing ${projectName}:${manifestFile.file}`);
      const dependencies = await getCustomUIStaticDependencies(
        [projectName, manifestFile],
        context
      );
      dependencies.forEach((dependency) => {
        logger.info(
          `[nx-forge] Adding project graph dependency from ${dependency.sourceProjectFile}:${dependency.sourceProjectFile} -> ${dependency.targetProjectName}`
        );
        builder.addStaticDependency(
          dependency.sourceProjectName,
          dependency.targetProjectName,
          dependency.sourceProjectFile
        );
      });
    }
  }

  return builder.getUpdatedProjectGraph();
}
