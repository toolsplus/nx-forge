# Plugin concepts

This page summarizes the main Nx Forge plugin concepts and ideas.

## Building Forge apps

When using [the app generator](../guides/generating-a-forge-app.md) to scaffold a Forge app, you will get a Nx project with a build target and a collection of inferred targets provided by the Nx Forge plugin.

The most important thing to know is that to deploy a Forge app, you need to run the following executors to get an artifact that can be deployed to the Forge platform:

::: tip Executors to get a deployable Forge app artifact

build -> package

:::

The `build` target is meant to compile and bundle the app's Typescript code. This can be done by any standard Nx plugin that supports bundling node applications, for example `@nx/webpack` or `@nx/esbuild`. The main Forge requirement is that the output is produced into a `src` directory (a Forge CLI quirk, probably because the CLI itself wants to support Typescript compilation and bundle the code).

The `package` target is provided by Nx Forge and completes the output generated by the `build` target to an artifact that can be deployed to the Forge platform. This includes, copying the manifest.yml file to the output, copying the outputs of dependent resource project (Custom UI or UI Kit) to the Forge app, as well as generating a package.json file that includes all the Forge app dependencies.

Once, the `build` and `package` stages have run, the Forge app can be deployed. Because it is so common to run these tasks in sequence, it is worth [defining target defaults for them](../guides/getting-started.md#configuring-target-defaults). Nx caches builds, so there is hardly any overhead to always running when calling the `deploy` target.

## Plugin targets

The Nx Forge plugin provides [a set of executors](../reference/executors.md) that assist with developing, building and deploying Forge apps in a Nx workspace. The plugin provides specific [`register`](../reference/executors.md#register) or [`deploy`](../reference/executors.md#deploy) executors which should be used over the Forge CLI command. They facilitate the integration with the Nx workspace and provide additional features.
In cases where the plugin does not provide specific executors, it is recommended to use the [`forge`](../reference/executors.md#forge) executor to invoke the Forge CLI. This will ensure that the command runs from the app's output directory in the Nx workspace.