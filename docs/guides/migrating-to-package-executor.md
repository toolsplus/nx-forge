# Migrating to the package executor

Since plugin version 5.1.0, the existing `build` executor has been deprecated in favor of a Nx native build in combination with the `package` executor.

For all the details and motivation of this change refer to [the discussion on GitHub](https://github.com/toolsplus/nx-forge/discussions/86).

## Migration steps

1. Ensure you are on the latest plugin version by running:
  
   `nx add @toolsplus/nx-forge@latest`.
2. [Generate a new Forge app](./generating-a-forge-app.md) with the updated app generator. Make sure to set the `bundler` option to [choose if the `build` task should be run by Webpack or esbuild](../reference/generators.md#application). You do not need to run the `build`, `package`, or `register` tasks. Generating this Forge app will ensure you have the correct dependencies installed and your workspace is configured to work with Webpack or esbuild.
3. a) If you chose the Webpack bundler option (default): 
   
   Copy the `webpack.config.js` to your app's project directory and update the `output.path` to match your project layout. Delete the existing `build` target configuration.

   b) If you chose the esbuild bundler option:

   Copy the `build` target configuration from the generated app's `project.json` and replace the existing `build` target configuration in your app's `project.json`. Adjust the path configurations in the `build` target to match your project layout.
4. Run `nx g @nx/workspace:remove --projectName=<genrated-forge-app>` to remove the app generated in step 2.
