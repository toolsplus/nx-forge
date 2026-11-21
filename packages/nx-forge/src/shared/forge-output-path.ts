import { joinPathFragments } from '@nx/devkit';

/**
 * Workspace-relative artifact directory that a Forge app is packaged into.
 * The build writes the bundle to its `functions` subdirectory.
 *
 * @param projectRoot Root of the Forge app project, `.` for a root project.
 */
export const getForgeOutputPath = (projectRoot: string): string =>
  joinPathFragments('dist', projectRoot);

/**
 * Folder in the artifact directory that the build writes the bundle to.
 * Forge ships it unchanged through manual packaging. It holds the code of
 * the manifest's function modules, the only part of the app that Forge loads
 * from the package path.
 */
export const BUNDLE_DIRECTORY = 'functions';
