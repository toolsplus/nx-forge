import { joinPathFragments } from '@nx/devkit';

/**
 * Workspace-relative artifact directory that a Forge app is packaged into.
 * The build writes the bundle to its `bundle` subdirectory.
 *
 * @param projectRoot Root of the Forge app project, `.` for a root project.
 */
export const getForgeOutputPath = (projectRoot: string): string =>
  joinPathFragments('dist', projectRoot);

/**
 * Folder in the artifact directory that the build writes the bundle to.
 * Forge ships it unchanged through manual packaging.
 */
export const BUNDLE_DIRECTORY = 'bundle';
