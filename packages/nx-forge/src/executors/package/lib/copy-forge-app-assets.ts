import { copyFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { NormalizedOptions } from '../schema';
import { directoryExists } from '../../../utils/util-fs';
import { logTerminalInfo } from '../../../utils/log-terminal';

type Options = Pick<NormalizedOptions, 'root' | 'outputPath' | 'projectRoot'>;

export function copyForgeAppAssets(options: Options) {
  logTerminalInfo('Copying Forge app assets...');

  const absoluteOutputPath = resolve(options.root, options.outputPath);

  if (!directoryExists(absoluteOutputPath)) {
    mkdirSync(absoluteOutputPath, { recursive: true });
  }

  copyFileSync(
    join(options.root, options.projectRoot, 'manifest.yml'),
    join(absoluteOutputPath, 'manifest.yml')
  );

  logTerminalInfo('Done copying Forge app assets.');
}
