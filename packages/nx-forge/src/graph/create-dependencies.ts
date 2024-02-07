import {
  CreateDependencies,
  CreateDependenciesContext,
  DependencyType,
  FileData,
  logger,
  RawProjectGraphDependency,
} from '@nx/devkit';
import {
  extractCustomUIProjectNames,
  readManifestYml,
} from '../utils/forge/manifest-yml';

const getCustomUIDependencies = async (
  [projectName, manifestFile]: [string, FileData],
  context: CreateDependenciesContext
): Promise<RawProjectGraphDependency[]> => {
  const manifestSchema = await readManifestYml(manifestFile.file);
  const customUIProjectNames = extractCustomUIProjectNames(manifestSchema);

  const getCustomUIStaticDependency = (
    customUIProjectName: string
  ): RawProjectGraphDependency => {
    const customUIProjectConfiguration = context.projects[customUIProjectName];

    if (!customUIProjectConfiguration) {
      throw new Error(
        `Failed to find Custom UI project in Nx workspace: The Custom UI dependency to project ${customUIProjectName} declared in the Forge manifest.yml of project ${projectName} cannot be found. Make sure the Custom UI resource path references a project in your Nx workspace.`
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
      target: customUIProjectName,
      type: DependencyType.static,
    };
  };

  return customUIProjectNames.reduce((acc, customUIProjectName) => {
    return (manifestFile.deps || []).find(
      ([source, target, type]) =>
        type === 'static' &&
        target === customUIProjectName &&
        source === projectName
    )
      ? acc // Dependency already exists, skip adding it again.
      : [...acc, getCustomUIStaticDependency(customUIProjectName)];
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
      const customUIDependencies = await getCustomUIDependencies(
        [projectName, manifestFile],
        context
      );
      dependencies = dependencies.concat(customUIDependencies);
    }
  }

  return dependencies;
};
