# Generating a Forge app

Nx Forge provides a Forge app generator that creates a blank Forge app project. While this generator looks quite similar to the Forge CLI `create` command, there are a few differences to note:

* The generator does not register the Forge app with the Forge platform.
* The generator does not support Forge templates.

:::info
The following instructions assume [you have the `nx-forge` plugin installed](getting-started#installing-the-plugin). If you are unfamiliar with Nx generators, refer to [the Nx generator documentation](https://nx.dev/features/generate-code).
:::

To generate a Forge app, replace `<nx-forge-app-name>` with the name of the app you want to create and then run the command. You can add the `--dry-run` flag to preview what will be generated.

```shell
nx g @toolsplus/nx-forge:app <nx-forge-app-name>
```

Refer to [the generator reference documentation](../reference/generators#application) for details on the available generator options.

When the generator completes, you have a blank Forge app project. To register the new app with the Forge platform, run the following [build](../reference/executors#build), [package](../reference/executors#package), and [register](../reference/executors#register) commands in this order:

```shell
nx build <nx-forge-app-name>
nx package <nx-forge-app-name>
nx register <nx-forge-app-name> --appName="My Forge App"
```

The register command updates the `app.id` in the manifest file to the value returned from the registration.
