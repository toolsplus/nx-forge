import type { Tree } from '@nx/devkit';
import {
  generateFiles,
  joinPathFragments,
  offsetFromRoot,
  toJS,
} from '@nx/devkit';
import { getRelativePathToRootTsConfig } from '@nx/js';
import type { NormalizedOptions } from '../schema';
import { hasWebpackPlugin } from '../../../utils/has-webpack-plugin';

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
      rootTsConfigPath: getRelativePathToRootTsConfig(
        tree,
        options.appProjectRoot
      ),
      webpackPluginOptions: hasWebpackPlugin(tree)
        ? {
            outputPath: joinPathFragments(
              'dist',
              (options.rootProject ? options.name : options.appProjectRoot) ??
                '',
              'src'
            ),
            main: './src/index' + (options.js ? '.js' : '.ts'),
            tsConfig: './tsconfig.app.json',
            assets: ['./src/assets'],
          }
        : null,
    }
  );

  if (options.bundler !== 'webpack') {
    tree.delete(joinPathFragments(options.appProjectRoot, 'webpack.config.js'));
  }

  if (options.js) {
    toJS(tree);
  }
}
