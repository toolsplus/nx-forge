# Executors

Documents [the executors](https://nx.dev/concepts/executors-and-configurations) provided by the Nx Forge plugin.

Append `--help` or `-h` for any of the plugin executors to explore all available options.

## Forge

```shell
nx forge <nx-forge-app-name> <forge-cli-options>
```

Runs any Forge CLI command in the `<nx-forge-app-name>` output directory. Refer to [the Forge CLI reference documentation](https://developer.atlassian.com/platform/forge/cli-reference/) for a list of all available commands.

:::info

Where a custom executor is provided by Nx Forge, prefer using the custom executor over calling the Forge CLI directly.

:::

### Options

| Option | Type                       | Description                         | Default |
| --- |----------------------------|-------------------------------------| --- |
| `--outputPath` | `string`<br>**[required]** | Output path of the Forge app files. | - |

Nx Forge-provided executors ensure that the Nx project configuration is updated where necessary when the Forge command has run. For example, registering a Forge app using `nx forge <nx-forge-app-name> register` will invoke the Forge CLI directly and only update the Forge app ID in the manifest file in the output directory. The next time you run `nx run <nx-forge-app-name>:build` the manifest file in the output path will be overwritten.
The correct way to do this is to run [`nx run <nx-forge-app-name>:register`](#register), which will update the app ID of the `manifest.yml` within the `<nx-forge-app-name>` project root.

## Package

```shell
nx run <nx-forge-app-name>:package
```

Packages the Forge app project named `<nx-forge-app-name>` into a deployable artifact accepted by the Forge platform. Expects the build output from `<nx-forge-app-name>` app to be available in the `outputPath` directory.

::: info
The `package` executor is intended to be used with a standard Nx `build` target, for example, Webpack or esbuild. Refer to the [migration guide](../guides/migrating-to-package-executor) for more information.
:::

### Options

<!-- nx-forge:options executor=package -->

This executor will copy the output of dependent resource project builds to the `resourcePath` directory. To do this, the executor tries to infer the output path of dependent resources (Custom UI, UI Kit) from the dependent project's `build` target configuration as follows:

  1. if a mapping is defined using `resourceOutputPathMap` use the mapping
  2. else if the `build` target definition has `options.outputPath` define use that
  3. else use the `build` target's `outputs` definition, if there is only one entry

In cases where the output path cannot be inferred or is inferred incorrectly, the output path should be defined explicitly using the `resourceOutputPathMap` option.

## Deploy

```shell
nx run <nx-forge-app-name>:deploy
```

Deploys the Forge app project named `<nx-forge-app-name>` to the Forge platform.

_Mirrors the [deploy command](https://developer.atlassian.com/platform/forge/cli-reference/deploy/) of the Forge CLI._

### Options

<!-- nx-forge:options executor=deploy -->

For details on how to use the `manifestTransform` parameter, refer to the [guide on transforming the manifest](../guides/transforming-the-manifest).

## Register

```shell
nx run <nx-forge-app-name>:register
```

Registers the Forge app project named `<nx-forge-app-name>` with the Forge platform. This command will automatically update the manifest file in the `<nx-forge-app-name>` project with the generated app id.

_Mirrors the [register command](https://developer.atlassian.com/platform/forge/cli-reference/register/) of the Forge CLI._

### Options

<!-- nx-forge:options executor=register -->


## Tunnel <Badge type="warning" text="Experimental" />

```shell
nx tunnel <nx-forge-app-name>
```

Prepares the Forge app output once, starts isolated Custom UI dev servers for the resources defined in `manifest.yml`, starts a Forge app build watch process, and then launches the Forge CLI tunnel.

_Mirrors the [tunnel command](https://developer.atlassian.com/platform/forge/cli-reference/tunnel/) of the Forge CLI._

### Options

<!-- nx-forge:options executor=tunnel -->
