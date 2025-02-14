import {
  CreateDependencies,
  CreateDependenciesContext,
  DependencyType,
  FileData,
  logger,
  RawProjectGraphDependency,
} from '@nx/devkit';
import {
  extractUIResourceProjectNames,
  readManifestYml,
} from '../utils/forge/manifest-yml';

const getUIResourceDependencies = async (
  [projectName, manifestFile]: [string, FileData],
  context: CreateDependenciesContext
): Promise<RawProjectGraphDependency[]> => {
  const manifestSchema = await readManifestYml(manifestFile.file, {
    interpolate: false,
  });
  const uiResourceProjectNames = extractUIResourceProjectNames(manifestSchema);

  const getUIResourceStaticDependency = (
    uiResourceProjectName: string
  ): RawProjectGraphDependency => {
    const uiResourceProjectConfiguration =
      context.projects[uiResourceProjectName];

    if (!uiResourceProjectConfiguration) {
      throw new Error(
        `Failed to find UI resource project in Nx workspace: The UI resource dependency to project ${uiResourceProjectName} declared in the Forge manifest.yml of project ${projectName} cannot be found. Make sure the path property of the resource definition references a project in the Nx workspace.`
      );
    }

    const projectConfiguration = context.projects[projectName];

    if (!projectConfiguration) {
      throw new Error(
        `Missing project configuration in Nx workspace for project ${projectName}`
      );
    }

    return {
      sourceFile: manifestFile.file,
      source: projectName,
      target: uiResourceProjectName,
      type: DependencyType.static,
    };
  };

  return uiResourceProjectNames.reduce((acc, uiResourceProjectName) => {
    return (manifestFile.deps || []).find(
      ([source, target, type]) =>
        type === 'static' &&
        target === uiResourceProjectName &&
        source === projectName
    )
      ? acc // Dependency already exists, skip adding it again.
      : [...acc, getUIResourceStaticDependency(uiResourceProjectName)];
  }, []);
};

export const createDependencies: CreateDependencies = async (
  options,
  context
) => {
  let dependencies: RawProjectGraphDependency[] = [];

  for (const projectName in context.filesToProcess.projectFileMap) {
    const changed = context.filesToProcess.projectFileMap[projectName];
    for await (const manifestFile of changed.filter((f) =>
      f.file.endsWith('manifest.yml')
    )) {
      logger.info(`[nx-forge] Processing ${projectName}:${manifestFile.file}`);
      const uiResourceDependencies = await getUIResourceDependencies(
        [projectName, manifestFile],
        context
      );
      dependencies = dependencies.concat(uiResourceDependencies);
    }
  }

  return dependencies;
};
