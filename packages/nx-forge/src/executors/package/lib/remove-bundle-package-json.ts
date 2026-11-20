import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@nx/devkit';

/**
 * Removes a `package.json` from the bundle folder.
 *
 * The bundle needs none, but the esbuild executor copies the project's
 * `package.json` into its output unless it generates one. For a root project
 * that is the workspace `package.json`, and `"type": "module"` in it would make
 * Node load the CommonJS bundle as ESM after Forge ships it.
 *
 * @param bundlePath Absolute path of the bundle folder
 */
export const removeBundlePackageJson = (bundlePath: string): void => {
  const packageJsonPath = join(bundlePath, 'package.json');
  if (existsSync(packageJsonPath)) {
    rmSync(packageJsonPath);
    logger.info(
      `Removed ${packageJsonPath}. The bundle does not need a package.json.`
    );
  }
};
