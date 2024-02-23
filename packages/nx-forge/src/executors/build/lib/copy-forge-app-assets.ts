import { copyFileSync, mkdirSync, statSync, PathLike } from 'fs';
import { join, resolve } from 'path';
import { logger } from '@nx/devkit';
import { NormalizedOptions } from '../schema';

/**
 * Check if a directory exists
 * @param path Path to directory
 */
function directoryExists(path: PathLike): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function copyForgeAppAssets(options: NormalizedOptions) {
  logger.info('Copying Forge app assets...');

  const absoluteOutputPath = resolve(options.root, options.outputPath);

  if (!directoryExists(absoluteOutputPath)) {
    mkdirSync(absoluteOutputPath, { recursive: true });
  }

  // Copies the Forge app manifest file from the project root directory into the
  // build output directory.
  copyFileSync(
    join(options.root, options.projectRoot, 'manifest.yml'),
    join(absoluteOutputPath, 'manifest.yml')
  );

  logger.info('Done copying Forge app assets.');
}
