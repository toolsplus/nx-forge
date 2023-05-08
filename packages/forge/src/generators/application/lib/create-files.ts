import type { Tree } from '@nx/devkit';
import {
  generateFiles,
  joinPathFragments,
  offsetFromRoot,
  toJS,
} from '@nx/devkit';
import { getRelativePathToRootTsConfig } from '@nx/js';
import type { NormalizedOptions } from '../schema';

export function createFiles(tree: Tree, options: NormalizedOptions): void {
  generateFiles(
    tree,
    joinPathFragments(__dirname, '..', 'files'),
    options.appProjectRoot,
    {
      tmpl: '',
      name: options.name,
      root: options.appProjectRoot,
      offset: offsetFromRoot(options.appProjectRoot),
      rootTsConfigPath: getRelativePathToRootTsConfig(
        tree,
        options.appProjectRoot
      ),
    }
  );

  if (options.js) {
    toJS(tree);
  }
}
