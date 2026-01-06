import {
  formatFiles,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';
import { forEachExecutorOptions } from '@nx/devkit/src/generators/executor-options-utils';
import { BuildExecutorOptions } from '../../executors/build/schema';

export default async function (tree: Tree) {
  const update = (
    options: BuildExecutorOptions,
    projectName: string,
    targetName: string,
    configurationName?: string
  ) => {
    // There should not be any configurations, if there are skip the update - only handle the default config
    if (configurationName) return;

    const projectConfiguration = readProjectConfiguration(tree, projectName);

    if (!options.webpackConfig) {
      options.webpackConfig = `${projectConfiguration.root}/webpack.config.js`;
      tree.write(
        options.webpackConfig,
        `
        const { composePlugins, withNx } = require('@nx/webpack');

        // Nx plugins for webpack.
        module.exports = composePlugins(withNx(), (config) => {
          // Note: This was added by an Nx Forge migration. Webpack builds are required to have a corresponding Webpack config file.
          // See: https://nx.dev/recipes/webpack/webpack-config-setup
          return config;
        });
        `
      );

      const targets = (projectConfiguration.targets ??= {});
      targets[targetName] = { ...targets[targetName], options };
      updateProjectConfiguration(tree, projectName, projectConfiguration);
    }
  };

  forEachExecutorOptions<BuildExecutorOptions>(
    tree,
    '@toolsplus/nx-forge:build',
    update
  );

  await formatFiles(tree);
}
