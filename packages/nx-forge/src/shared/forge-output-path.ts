import { joinPathFragments } from '@nx/devkit';

/**
 * Workspace-relative directory that a Forge app is packaged into. The build
 * writes the app bundle to its `src` subdirectory.
 *
 * @param projectRoot Root of the Forge app project, `.` for a root project.
 */
export const getForgeOutputPath = (projectRoot: string): string =>
  joinPathFragments('dist', projectRoot);
