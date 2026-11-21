# Executors

Documents [the executors](https://nx.dev/concepts/executors-and-configurations) provided by the Nx Forge plugin.

Append `--help` or `-h` for any of the plugin executors to explore all available options.

## Forge

```shell
nx forge <nx-forge-app-name> <forge-cli-options>
```

Runs any Forge CLI command in the artifact directory of `<nx-forge-app-name>`, for example `dist/apps/<nx-forge-app-name>`. Refer to [the Forge CLI reference documentation](https://developer.atlassian.com/platform/forge/cli-reference/) for a list of all available commands.

:::info

Where a custom executor is provided by Nx Forge, prefer using the custom executor over calling the Forge CLI directly.

:::

### Options

| Option         | Type                       | Description                         | Default |
| -------------- | -------------------------- | ----------------------------------- | ------- |
| `--outputPath` | `string`<br>**[required]** | Output path of the Forge app files. | -       |

Nx Forge-provided executors ensure that the Nx project configuration is updated where necessary when the Forge command has run. For example, registering a Forge app using `nx forge <nx-forge-app-name> register` will invoke the Forge CLI directly and only update the Forge app ID in the manifest file in the artifact directory. The next time you run `nx run <nx-forge-app-name>:package` the manifest file in the artifact directory will be overwritten.
The correct way to do this is to run [`nx run <nx-forge-app-name>:register`](#register), which will update the app ID of the `manifest.yml` within the `<nx-forge-app-name>` project root.

## Package

```shell
nx run <nx-forge-app-name>:package
```

Packages the Forge app project named `<nx-forge-app-name>` into a deployable artifact accepted by the Forge platform. Expects the output of the app's `build` target in `<outputPath>/functions`. The executor checks that the manifest has [manual Forge packaging](https://developer.atlassian.com/platform/forge/manifest-reference/packaging/) configured and that the bundle is complete, then copies `manifest.yml` and the build output of the app's Custom UI and UI Kit resources to `outputPath`.

### Options

<!-- nx-forge:options executor=package -->

### Manual Forge packaging

The project's `manifest.yml` must configure manual Forge packaging like this, so that the Forge CLI deploys the bundle as it is:

```yaml
app:
  package:
    bundler: manual@2026
    path: functions
```

`path` is relative to `outputPath`. If a key is missing or has a different value, the executor fails and prints the lines to add. It does not add them itself.

### Bundle completeness

The executor scans every `.js` and `.cjs` file in `<outputPath>/functions` for `require(...)` and `import(...)` calls with a string literal. Each loaded module must be a Node built-in or a file inside the bundle folder. Otherwise, the executor fails and lists the modules and the files that load them.

A failure usually means the build left an npm dependency external. Change the build configuration so that it inlines all dependencies.

Some packages load optional modules inside a `try`/`catch` and work without them. To allow such a module to be absent, add its name to `allowMissingModules`. A name also covers its subpaths, so `encoding` covers `encoding/lib/iconv`:

```json
{
  "package": {
    "options": {
      "allowMissingModules": ["encoding"]
    }
  }
}
```

Webpack builds rarely need this: Webpack replaces an optional module it cannot find with code that throws, and prints a warning.

### Resource output paths

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

Run [`package`](#package) first. The Forge CLI uploads the bundle in `<outputPath>/functions` as it is, without bundling it again. Forge lint, which runs unless you pass `--no-verify`, does not inspect the function code in the bundle.

### Options

<!-- nx-forge:options executor=deploy -->

Use `--approve` to pre-approve one or more Forge deployment rules. Use `--major-version` to backport a deployment to an existing major version.

```shell
nx run <nx-forge-app-name>:deploy --approve MAJOR_VERSION_RULE
nx run <nx-forge-app-name>:deploy --major-version 2
```

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

Starts the `tunnel` target for all Custom UI projects defined in the `manifest.yml` of the Forge app project named `<nx-forge-app-name>` on their specified tunnel port. After that, starts a build process in watch mode for the Forge app itself and runs [`package`](#package) once, before ultimately, starting the Forge `tunnel` process for the Forge app.

::: warning
Inside a workspace, `forge tunnel` can load a module that is missing from the bundle from the workspace's `node_modules`. Your functions then work in the tunnel but fail after deployment. The [completeness check](#bundle-completeness) of the [`package`](#package) executor catches this before you deploy, unless the code computes the module name at runtime.
:::

_Mirrors the [tunnel command](https://developer.atlassian.com/platform/forge/cli-reference/tunnel/) of the Forge CLI._

### Options

<!-- nx-forge:options executor=tunnel -->
