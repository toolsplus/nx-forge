import { copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@nrwl/devkit';
import { directoryExists } from '@nrwl/workspace/src/utilities/fileutils';
import { NormalizedOptions } from '../schema';

export function copyForgeAppAssets(options: NormalizedOptions) {
  logger.info('Copying Forge app assets...');

  if (!directoryExists(options.outputPath)) {
    mkdirSync(options.outputPath, { recursive: true });
  }

  copyFileSync(
    join(options.root, options.projectRoot, 'manifest.yml'),
    join(options.outputPath, 'manifest.yml')
  );

  logger.info('Done copying Forge app assets.');
}
