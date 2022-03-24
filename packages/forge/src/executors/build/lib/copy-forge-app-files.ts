import { copyFileSync, mkdirSync } from 'fs';
import { copySync } from 'fs-extra';
import { join } from 'path';
import { logger } from '@nrwl/devkit';
import { directoryExists } from '@nrwl/workspace/src/utilities/fileutils';
import { NormalizedOptions } from '../schema';

export function copyForgeAppFiles(options: NormalizedOptions) {
  logger.info('Copying Forge app files...');

  if (!directoryExists(options.outputPath)) {
    mkdirSync(options.outputPath, { recursive: true });
  }

  copyFileSync(
    join(options.root, options.projectRoot, 'manifest.yml'),
    join(options.outputPath, 'manifest.yml')
  );
  copyFileSync(
    join(options.root, options.projectRoot, 'tsconfig.json'),
    join(options.outputPath, 'tsconfig.json')
  );
  copySync(
    join(options.root, options.sourceRoot),
    join(options.outputPath, 'src'),
    { recursive: true }
  );

  logger.info('Done copying Forge app files.');
}
