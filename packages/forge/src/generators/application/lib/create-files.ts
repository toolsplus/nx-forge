import type { Tree } from '@nrwl/devkit';
import {
  generateFiles,
  joinPathFragments,
  offsetFromRoot,
  toJS,
} from '@nrwl/devkit';
import type { NormalizedOptions } from '../schema';
import { getRelativePathToRootTsConfig } from '@nrwl/workspace/src/utilities/typescript';

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
