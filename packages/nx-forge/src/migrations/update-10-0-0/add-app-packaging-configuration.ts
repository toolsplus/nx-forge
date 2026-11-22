import {
  getProjects,
  joinPathFragments,
  MigrationReturnObject,
  Tree,
} from '@nx/devkit';
import { load } from 'js-yaml';
import {
  APP_PACKAGING_CONFIGURATION,
  APP_PACKAGING_CONFIGURATION_YAML,
} from '../../shared/manifest/packaging';

/** A top-level `app:` line that opens a block map. */
const APP_LINE = /^app:[ \t]*(#.*)?(\r?\n)/m;
/** The first entry line of the block map, which gives its indentation. */
const FIRST_ENTRY_INDENT = /^(?:[ \t]*(?:#.*)?\r?\n)*([ \t]+)\S/;

type Manifest = { app?: { package?: Record<string, unknown> } };

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

const hasAppPackagingConfiguration = (
  manifest: Manifest | undefined
): boolean =>
  Object.entries(APP_PACKAGING_CONFIGURATION).every(
    ([key, value]) => manifest?.app?.package?.[key] === value
  );

/**
 * Adds the app packaging configuration at the start of the app section, so
 * that the rest of the manifest keeps its comments and formatting. Returns
 * `undefined` unless the app section is a block map without a package
 * section.
 */
const withAppPackagingConfiguration = (
  contents: string,
  manifest: Manifest | undefined
): string | undefined => {
  const appLine = APP_LINE.exec(contents);
  if (
    typeof manifest?.app !== 'object' ||
    manifest.app === null ||
    'package' in manifest.app ||
    appLine === null
  ) {
    return undefined;
  }
  const insertAt = appLine.index + appLine[0].length;
  const indent = FIRST_ENTRY_INDENT.exec(contents.slice(insertAt))?.[1];
  if (indent === undefined) {
    return undefined;
  }
  const lineBreak = appLine[2];
  const lines = [
    `${indent}package:`,
    ...Object.entries(APP_PACKAGING_CONFIGURATION).map(
      ([key, value]) => `${indent}${indent}${key}: ${value}`
    ),
  ];
  const result =
    contents.slice(0, insertAt) +
    lines.map((line) => `${line}${lineBreak}`).join('') +
    contents.slice(insertAt);
  // Keep the edit only if the manifest still parses with the configuration
  // in place.
  return hasAppPackagingConfiguration(parse(result)) ? result : undefined;
};

/**
 * Adds the app packaging configuration to the manifest and returns the path
 * if it has to be updated by hand.
 */
const migrateManifest = (tree: Tree, path: string): string[] => {
  const contents = tree.read(path, 'utf-8') ?? '';
  const manifest = parse(contents);
  if (hasAppPackagingConfiguration(manifest)) {
    return [];
  }
  const result = withAppPackagingConfiguration(contents, manifest);
  if (result === undefined) {
    return [path];
  }
  tree.write(path, result);
  return [];
};

/**
 * Forge ships the bundle unchanged only if the manifest selects manual
 * packaging. Add the app packaging configuration to the manifest of each
 * Forge app.
 *
 * @see https://github.com/toolsplus/nx-forge/issues/222
 */
export default async function update(
  tree: Tree
): Promise<MigrationReturnObject | undefined> {
  const manualPaths = manifestPaths(tree).flatMap((path) =>
    migrateManifest(tree, path)
  );

  return manualPaths.length > 0
    ? {
        nextSteps: [
          `Add these lines to the app section of these Forge manifests: ${manualPaths.join(
            ', '
          )}\n\n${APP_PACKAGING_CONFIGURATION_YAML}`,
        ],
      }
    : undefined;
}
