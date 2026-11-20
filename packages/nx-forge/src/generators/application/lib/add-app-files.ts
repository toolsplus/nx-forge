import type { Tree } from '@nx/devkit';
import {
  generateFiles,
  joinPathFragments,
  offsetFromRoot,
  toJS,
} from '@nx/devkit';
import { getRelativePathToRootTsConfig } from '@nx/js';
import { getTsConfigModuleResolution } from '@nx/js/internal';
import type { NormalizedOptions } from '../schema';
import { BUNDLE_DIRECTORY } from '../../../shared/forge-output-path';

export function addAppFiles(tree: Tree, options: NormalizedOptions): void {
  generateFiles(
    tree,
    joinPathFragments(__dirname, '..', 'files'),
    options.appProjectRoot,
    {
      tmpl: '',
      name: options.name,
      root: options.appProjectRoot,
      offset: offsetFromRoot(options.appProjectRoot),
      // `bundler` requires an ES `module` before TypeScript 6, which rejects
      // the `node10` resolution that `commonjs` apps need on TypeScript 5.
      moduleResolution: getTsConfigModuleResolution(tree),
      rootTsConfigPath: getRelativePathToRootTsConfig(
        tree,
        options.appProjectRoot
      ),
      webpackPluginOptions: {
        outputPath: joinPathFragments(options.outputPath, BUNDLE_DIRECTORY),
        main: './src/index' + (options.js ? '.js' : '.ts'),
        tsConfig: './tsconfig.app.json',
        assets: ['./src/assets'],
      },
    }
  );

  if (options.bundler !== 'webpack') {
    tree.delete(joinPathFragments(options.appProjectRoot, 'webpack.config.js'));
  }

  if (options.js) {
    toJS(tree);
  }
}
