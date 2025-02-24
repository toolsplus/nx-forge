# Executors

Documents [the executors](https://nx.dev/concepts/executors-and-configurations) provided by the Nx Forge plugin.

Append `--help` or `-h` for any of the plugin executors to explore all available options.

[//]: # (Used https://brianwendt.github.io/json-schema-md-doc/ to generate the properties markdown from schema.json files)

## Forge

```shell
nx forge <nx-forge-app-name> <forge-cli-options>
```

Runs any Forge CLI command in the `<nx-forge-app-name>` output directory. Refer to [the Forge CLI reference documentation](https://developer.atlassian.com/platform/forge/cli-reference/) for a list of all available commands.

:::info

Where a custom executor is provided by Nx Forge, prefer using the custom executor over calling the Forge CLI directly.

:::

**_Properties_**

- <b id="#/properties/outputPath">outputPath</b> `required`
  - _The output path of the Forge app files._
  - Type: `string`

Nx Forge-provided executors ensure that the Nx project configuration is updated where necessary when the Forge command has run. For example, registering a Forge app using `nx forge <nx-forge-app-name> register` will invoke the Forge CLI directly and only update the Forge app ID in the manifest file in the output directory. The next time you run `nx build <nx-forge-app-name>` the manifest file in the output path will be overwritten.
The correct way to do this is to run [`nx register <nx-forge-app-name>`](#register), which will update the app ID of the `manifest.yml` within the `<nx-forge-app-name>` project root.

## Build <Badge type="warning" text="Deprecated" />

```shell
nx build <nx-forge-app-name>
```

Builds the Forge app project named `<nx-forge-app-name>` to the directory specified in the `outputPath` property. If the Forge app project has dependent resource projects (Custom UI), this will build dependent projects first before building the Forge app itself. 

::: warning
The `build` executor is deprecated in favor of a native Nx build (webpack or esbuild) in combination with the `package` executor. Refer to the [migration guide](../guides/migrating-to-package-executor) for more information.
:::

**_Properties_**

- <b id="#/properties/outputPath">outputPath</b> `required`
  - _Output path of the generated files._
  - Type: `string`
- <b id="#/properties/customUIPath">customUIPath</b>
  - _Custom UI output path relative to the outputPath._
  - Type: `string`
- <b id="#/properties/resourceOutputPathMap">resourceOutputPathMap</b>
  - _Map of resource project names to their respective output path (relative to the workspace root)._
  - Type: `object`
  - Default: `{}`
- <b id="#/properties/watch">watch</b>
  - _Enable re-building when files change._
  - Type: `boolean`
  - Default: _false_
- <b id="#/properties/sourceMap">sourceMap</b>
  - _Output sourcemaps. Use 'hidden' for use with error reporting tools without generating sourcemap comment._
- <b id="#/properties/webpackConfig">webpackConfig</b>
  - _Path to a function which takes a webpack config, some context and returns the resulting webpack config. See https://nx.dev/guides/customize-webpack_
  - Type: `string`
- <b id="#/properties/uiKit2Packaging">uiKit2Packaging</b> <Badge type="warning" text="Experimental" />
  - _Enables UI Kit compatible packaging._
  - Type: `boolean`
  - Default: _false_

## Package

```shell
nx package <nx-forge-app-name>
```

Packages the Forge app project named `<nx-forge-app-name>` into a deployable artifact accepted by the Forge platform. Expects the build output from `<nx-forge-app-name>` app to be available in the `outputPath` directory.

::: info
The `package` executor is intended to be used with a standard Nx `build` executor, for example, Webpack or esbuild. Refer to the [migration guide](../guides/migrating-to-package-executor) for more information.
:::

**_Properties_**

 - <b id="#/properties/outputPath">outputPath</b> `required`
	 - _Output path of the generated files._
	 - Type: `string`
 - <b id="#/properties/resourcePath">resourcePath</b>
	 - _Path where resource files such as Custom UI output is placed relative to the outputPath._
	 - Type: `string`
 - <b id="#/properties/resourceOutputPathMap">resourceOutputPathMap</b>
   - _Map of resource project names to their respective output path (relative to the workspace root)._
   - Type: `object`
   - Default: `{}`
- <b id="#/properties/tsConfig">tsConfig</b>
  - _The path for the TypeScript configuration file, relative to the current project._
  - Type: `string`
  - Default: _"tsconfig.app.json"_
- <b id="#/properties/uiKit2Packaging">uiKit2Packaging</b> <Badge type="warning" text="Experimental" />
  - _Enables UI Kit compatible packaging._
  - Type: `boolean`
  - Default: _false_

This executor will copy the output of dependent resource project builds to the `resourcePath` directory. To do this, the executor tries to infer the output path of dependent resources (Custom UI, UI Kit) from the dependent project's `build` target configuration as follows:

  1. if a mapping is defined using `resourceOutputPathMap` use the mapping
  2. else if the `build` target definition has `options.outputPath` define use that
  3. else use the `build` target's `outputs` definition, if there is only one entry

In cases where the output path cannot be inferred or is inferred incorrectly, the output path should be defined explicitly using the `resourceOutputPathMap` option.

## Deploy

```shell
nx deploy <nx-forge-app-name>
```

Deploys the Forge app project named `<nx-forge-app-name>` to the Forge platform.

_Mirrors the [deploy command](https://developer.atlassian.com/platform/forge/cli-reference/deploy/) of the Forge CLI._

**_Properties_**

- <b id="#/properties/outputPath">outputPath</b> `required`
  - _The output path of the Forge app files._
  - Type: `string`
- <b id="#/properties/environment">environment</b>
  - _Environment to deploy to._
  - Type: `string`
  - Default: _"development"_
- <b id="#/properties/verify">verify</b>
  - _Run pre-deployment checks._
  - Type: `boolean`
  - Default: _true_
- <b id="#/properties/interactive">interactive</b>
  - _Run deployment with or without input prompts._
  - Type: `boolean`
  - Default: _true_
- <b id="#/properties/verbose">verbose</b>
  - _Run deployment in verbose mode._
  - Type: `boolean`
  - Default: _false_
- <b id="#/properties/manifestTransform">manifestTransform</b>
  - _A JSONata expression that transforms the manifest.yml content before the deployment._
  - Type: `string`

For details on how to use the `manifestTransform` parameter, refer to the [guide on transforming the manifest](../guides/transforming-the-manifest).

## Register

```shell
nx register <nx-forge-app-name>
```

Registers the Forge app project named `<nx-forge-app-name>` with the Forge platform. This command will automatically update the manifest file in the `<nx-forge-app-name>` project with the generated app id.

_Mirrors the [register command](https://developer.atlassian.com/platform/forge/cli-reference/register/) of the Forge CLI._

**_Properties_**

- <b id="#/properties/outputPath">outputPath</b> `required`
  - _The output path of the Forge app files._
  - Type: `string`
- <b id="#/properties/appName">appName</b> `required`
  - _Name of the app on the Forge platform. The app name can include dashes, spaces, and underscores. Defaults to the project name_
  - Type: `string`
- <b id="#/properties/verbose">verbose</b>
  - _Run registration in verbose mode._
  - Type: `boolean`
  - Default: _false_

## Install

```shell
nx install <nx-forge-app-name>
```

Installs the Forge app project named `<nx-forge-app-name>` for the given site and product. The CLI will prompt for site, product if they are not provided as parameters.

_Mirrors the [install command](https://developer.atlassian.com/platform/forge/cli-reference/install/) of the Forge CLI._

**_Properties_**

- <b id="#/properties/outputPath">outputPath</b> `required`
  - _The output path of the Forge app files._
  - Type: `string`
- <b id="#/properties/site">site</b> `required`
  - _Atlassian site URL (example.atlassian.net)_
  - Type: `string`
- <b id="#/properties/product">product</b> `required`
  - _Atlassian product: jira, confluence, compass, bitbucket_
  - Type: `string`
  - The value is restricted to the following:
    1. _"jira"_
    2. _"confluence"_
    3. _"compass"_
    4. _"bitbucket"_
- <b id="#/properties/environment">environment</b>
  - _Environment to install to._
  - Type: `string`
  - Default: _"development"_
- <b id="#/properties/upgrade">upgrade</b>
  - _Upgrade an existing installation._
  - Type: `boolean`
  - Default: _false_
- <b id="#/properties/confirmScopes">confirmScopes</b>
  - _Skip confirmation of scopes for the app before installing or upgrading the app._
  - Type: `boolean`
  - Default: _false_
- <b id="#/properties/interactive">interactive</b>
  - _Run installation with or without input prompts._
  - Type: `boolean`
  - Default: _true_
- <b id="#/properties/verbose">verbose</b>
  - _Run installation in verbose mode._
  - Type: `boolean`
  - Default: _false_


## Tunnel <Badge type="warning" text="Experimental" />

```shell
nx tunnel <nx-forge-app-name>
```

Starts the `tunnel` target for all Custom UI projects defined in the `manifest.yml` of the Forge app project named `<nx-forge-app-name>` on their specified tunnel port. After that, starts a build process in watch mode for the Forge app itself, before ultimately, starting the Forge `tunnel` process for the Forge app.

_Mirrors the [tunnel command](https://developer.atlassian.com/platform/forge/cli-reference/tunnel/) of the Forge CLI._

**_Properties_**

- <b id="#/properties/outputPath">outputPath</b> `required`
  - _The output path of the Forge app files._
  - Type: `string`
- <b id="#/properties/debug">debug</b>
  - _Run Forge tunnel in debug mode._
  - Type: `boolean`
  - Default: _false_
- <b id="#/properties/verbose">verbose</b>
  - _Run Forge tunnel in verbose mode._
  - Type: `boolean`
  - Default: _false_
- <b id="#/properties/preTunnelTimeout">preTunnelTimeout</b>
  - _Max milliseconds to wait for tunnel preparation tasks._
  - Type: `number`
  - Default: `5000`
