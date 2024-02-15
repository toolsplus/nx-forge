---
sidebar_position: 30
---

# Adding a Forge CLI executor

The Nx framework provides [the `nx:run-commands` executor](https://nx.dev/nx-api/nx/executors/run-commands), which is a very versatile and adaptable executor that can cover to many use cases. This guide shows how to use the `nx:run-commands` executor to run any Forge CLI command for a Forge app that may not be covered by the Nx Forge plugin.

To get started, open the `project.json` of the Forge app to which you would like to add the Forge CLI command and add the following target. Replace the value of the `cwd` property with the path defined in the build target's `outputPath` option to ensure Forge CLI commands run on the built Forge app artifact.

```json title="project.json"
{
  // ...
  "targets": {
    //...
    "forge": {
      "executor": "nx:run-commands",
      "options": {
        "command": "forge",
        "cwd": "<nx-forge-app-output-path>"
      }
    }
  }
}
```

Refer to [the options documentation](https://nx.dev/nx-api/nx/executors/run-commands#options) for all the available executor options.

You can now run Forge CLI commands as follows:

```shell
nx forge <nx-forge-app-name> install list
```

Refer to [the Forge CLI reference documentation](https://developer.atlassian.com/platform/forge/cli-reference/) for a list of all available commands.

:::info

Where [a custom executor is provided by Nx Forge](../references/executors.md), please prefer using the custom executor over calling the Forge CLI directly.

:::

Custom executors ensure that the Nx project configuration is updated where necessary when the Forge command has run. For example, registering a Forge app using `nx forge <nx-forge-app-name> register` will invoke the Forge CLI directly and only update the Forge app id in the manifest file in the output directory. The next time you run `nx build <nx-forge-app-name>` the manifest file in the output path will be overwritten.
The correct way to do this is to run [`nx register <nx-forge-app-name>`](../references/executors.md#register) which will update the app id of the `manifest.yml` within the `<nx-forge-app-name>` project root.
