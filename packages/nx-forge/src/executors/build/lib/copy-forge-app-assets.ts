import { copyFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { logger } from '@nx/devkit';
import { NormalizedOptions } from '../schema';
import { directoryExists } from '../../../utils/util-fs';

type Options = Pick<NormalizedOptions, 'root' | 'outputPath' | 'projectRoot'>;

export function copyForgeAppAssets(options: Options) {
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
