import { copyFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { logger } from '@nx/devkit';
import { directoryExists } from '@nx/workspace/src/utilities/fileutils';
import { NormalizedOptions } from '../schema';

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
