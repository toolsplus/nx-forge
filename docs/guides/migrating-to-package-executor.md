# Migrating to the package executor

Since plugin version 5.1.0, the legacy Nx Forge `build` target has been replaced by a native Nx build in combination with the `package` target.

For all the details and motivation of this change, refer to [the discussion on GitHub](https://github.com/toolsplus/nx-forge/discussions/86).

## Migration steps

1. Ensure you are on the latest plugin version by running:
  
   `nx add @toolsplus/nx-forge@latest`.
2. [Generate a new Forge app](./generating-a-forge-app.md) with the updated app generator. Make sure to set the `bundler` option to [choose if the `build` task should be run by Webpack or esbuild](../reference/generators.md#application). You do not need to run the `build`, `package`, or `register` tasks. Generating this Forge app will ensure you have the correct dependencies installed and your workspace is configured to work with Webpack or esbuild.
3. a) If you chose the Webpack bundler option (default): 
   
   Copy the generated `webpack.config.js` to your app's project directory and update the `outputPath`, `main`, `tsConfig`, and `assets` values to match your project layout. The generated app uses the `@nx/webpack/plugin` entry in `nx.json` to infer the `build` target, so you can delete the existing `build` target configuration from your app's `project.json`.

   If your workspace has inferred plugins disabled, keep an explicit `build` target instead. In that case, copy the generated app's `build` target configuration from `project.json` and adjust the paths to match your project layout.

   b) If you chose the esbuild bundler option:

   Copy the `build` target configuration from the generated app's `project.json` and replace the existing `build` target configuration in your app's `project.json`. Adjust the path configurations in the `build` target to match your project layout.
4. Run `nx g @nx/workspace:remove --projectName=<genrated-forge-app>` to remove the app generated in step 2.
