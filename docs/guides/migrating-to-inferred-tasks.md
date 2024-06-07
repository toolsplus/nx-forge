# Migrating to inferred tasks

Since Nx version 18, Nx plugins can automatically infer tasks for your projects based on the configuration of different tools. Refer to the [Nx docs on inferred tasks (Project Crystal)](https://nx.dev/concepts/inferred-tasks) for more details.

::: tip Nx Console

If you are not using Nx Console yet, we [highly recommend installing it](./getting-started.md#installing-nx-console) when moving to inferred tasks as it helps you discover tasks and run them from your IDE's user interface.

:::

Staring with Nx Forge plugin version 4.0.0, the plugin could infer targets for Forge app projects and since plugin version 5.1.0, the plugin generates Forge apps with inferred targets. This means, if you generate a new Forge app, you will not see any target definitions in the app's `project.json` file if they can be inferred.

As of plugin version 5.1.0, all [executor targets provided by the plugin](../reference/executors.md) can be inferred (except for the deprecated `build` executor). This means, to migrate to inferred tasks, you can simply remove those from your app's `project.json` files.

From our experience, transitioning the configuration to inferred tasks can be tricky. If you run into issues, it often helps to [generate a clean Nx test workspace](./getting-started.md#prerequisites), run the app generators you are interested in and compare the generated configuration in `project.json` files and the `nx.json` with your existing workspace.
