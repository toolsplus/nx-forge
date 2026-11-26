import { isDeepStrictEqual } from 'node:util';
import {
  getProjects,
  joinPathFragments,
  MigrationReturnObject,
  Tree,
} from '@nx/devkit';
import { load } from 'js-yaml';

const OLD_FOLDER = 'src';
const NEW_FOLDER = 'functions';

/** A `path:` line with an unquoted or quoted value in the old folder. */
const PATH_LINE =
  /^([ \t]*(?:-[ \t]+)?path:[ \t]*)(['"]?)(src(?:\/[^'"\s#]*)?)\2(?=[ \t]*(?:#.*)?\r?$)/gm;

type Resource = { key?: unknown; path?: unknown };
type Manifest = { resources?: Resource[] };

const manifestPaths = (tree: Tree): string[] =>
  Array.from(getProjects(tree).values())
    .map(({ root }) => joinPathFragments(root, 'manifest.yml'))
    .filter((path) => tree.exists(path));

const parse = (contents: string): Manifest | undefined => {
  try {
    return load(contents) as Manifest;
  } catch {
    return undefined;
  }
};

const movedPath = (path: string): string =>
  NEW_FOLDER + path.slice(OLD_FOLDER.length);

/**
 * Moves the paths of resources in the old build output folder to the bundle
 * folder and returns the manifest path if it has to be updated by hand.
 */
const migrateManifest = (
  tree: Tree,
  path: string,
  projectNames: Set<string>
): string[] => {
  const contents = tree.read(path, 'utf-8') ?? '';
  const manifest = parse(contents);
  // A UI resource names its Nx project instead of a path.
  const isInOldFolder = (resourcePath: unknown): resourcePath is string =>
    typeof resourcePath === 'string' &&
    (resourcePath === OLD_FOLDER ||
      resourcePath.startsWith(`${OLD_FOLDER}/`)) &&
    !projectNames.has(resourcePath);

  const resources = Array.isArray(manifest?.resources)
    ? manifest.resources
    : [];
  const pathsToMove = new Set(
    resources.map((r) => r?.path).filter(isInOldFolder)
  );
  if (pathsToMove.size === 0) {
    return [];
  }

  const result = contents.replace(
    PATH_LINE,
    (line, prefix: string, quote: string, resourcePath: string) =>
      pathsToMove.has(resourcePath)
        ? `${prefix}${quote}${movedPath(resourcePath)}${quote}`
        : line
  );
  const expected = {
    ...manifest,
    resources: resources.map((r) =>
      isInOldFolder(r?.path) ? { ...r, path: movedPath(r.path) } : r
    ),
  };
  // Keep the edit only if it changed exactly the resource paths.
  if (!isDeepStrictEqual(parse(result), expected)) {
    return [path];
  }
  tree.write(path, result);
  return [];
};

/**
 * The build now writes to the `functions` folder of the artifact directory
 * instead of `src`. Move the paths of manifest resources that point into the
 * old folder, such as files that a Rovo agent prompt reads, to the new one.
 *
 * @see https://github.com/toolsplus/nx-forge/issues/222
 */
export default async function update(
  tree: Tree
): Promise<MigrationReturnObject | undefined> {
  const projectNames = new Set(getProjects(tree).keys());
  const manualPaths = manifestPaths(tree).flatMap((path) =>
    migrateManifest(tree, path, projectNames)
  );

  return manualPaths.length > 0
    ? {
        nextSteps: [
          `Change the path of resources in the old 'src' folder of the artifact directory to the 'functions' folder, for example from 'src/assets' to 'functions/assets', in these Forge manifests: ${manualPaths.join(
            ', '
          )}`,
        ],
      }
    : undefined;
}
