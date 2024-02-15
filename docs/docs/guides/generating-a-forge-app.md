---
sidebar_position: 10
---

# Generating a Forge app

The following instructions assume [you have the `nx-forge` plugin installed](../getting-started.md#installing-the-plugin). If you are unfamiliar with Nx generators, refer to [the Nx generator documentation](https://nx.dev/features/generate-code).

Nx Forge provides a Forge app generator that creates a blank Forge app project. While this generator looks quite similar to the Forge CLI `create` command, there are a few differences to note:

* The generator does not register the Forge app with the Forge platform.
* The generator does not support Forge templates.

To generate a Forge app, replace `<nx-forge-app-name>` with the name of the app you want to create and then run the command:

```shell
nx g @toolsplus/nx-forge:app <nx-forge-app-name>
```

:::tip

Use the `--dry-run` flag to see what will be generated.

:::

Refer to [the generator reference documentation](../references/generators.md#application) for details on the available generator options.

When the generator completes, you have a blank Forge app project. In most cases, you would want to run the [Forge register command](../references/executors.md#register) immediately after that:

```shell
nx register <nx-forge-app-name> --appName="My Forge App"
```

This command will register the newly created app with the Forge platform and update the `app.id` in the manifest file to the value returned from the registration.
