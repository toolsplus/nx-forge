# Generating a Forge app

Nx Forge provides a Forge app generator that creates a blank Forge app project. While this generator looks quite similar to the Forge CLI `create` command, there are a few differences to note:

* The generator does not register the Forge app with the Forge platform.
* The generator does not support Forge templates.

:::info
The following instructions assume [you have the `nx-forge` plugin installed](getting-started#installing-the-plugin). If you are unfamiliar with Nx generators, refer to [the Nx generator documentation](https://nx.dev/features/generate-code).
:::

## Generating the app

To generate a Forge app, replace `<nx-forge-app-name>` with the name of the app you want to create and then run the command. You can add the `--dry-run` flag to preview what will be generated.

```shell
nx g @toolsplus/nx-forge:app apps/<nx-forge-app-name>
```

The app's `build` target uses Webpack. To use esbuild instead, add `--bundler=esbuild`. Refer to [the generator reference documentation](../reference/generators#application) for all options.

## What the generator creates

The generator creates the project in `apps/<nx-forge-app-name>`:

```
apps/<nx-forge-app-name>/
├── src
│   ├── assets
│   └── index.ts
├── manifest.yml
├── project.json
├── tsconfig.app.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

`src/index.ts` exports the function handlers. The manifest refers to them as `index.<export-name>`, for example `index.handler`.

`manifest.yml` is the Forge app manifest. Its `app.package` section tells the Forge CLI to deploy the bundle that the `build` target produces, as it is. Keep this section when you edit the manifest:

```yaml
app:
  package:
    bundler: manual@2026
    path: bundle
```

`webpack.config.js` configures the `build` target. It bundles `src/index.ts`, the workspace libraries it imports and its npm dependencies into one CommonJS file. With `--bundler=esbuild`, there is no `webpack.config.js`, and the `build` target in `project.json` holds the esbuild options instead.

## Building and registering the app

The `build` target writes the bundle to `dist/apps/<nx-forge-app-name>/bundle`. The [`package`](../reference/executors#package) target then completes the app in `dist/apps/<nx-forge-app-name>`, which is the folder the Forge CLI works in. See [the workspace layout](../concepts/workspace-layout#build-output) for what ends up there.

To register the new app with the Forge platform, run the `build`, [`package`](../reference/executors#package) and [`register`](../reference/executors#register) targets in this order:

```shell
nx run <nx-forge-app-name>:build
nx run <nx-forge-app-name>:package
nx run <nx-forge-app-name>:register --appName="My Forge App"
```

The register command updates the `app.id` in the project's manifest file to the value returned from the registration.

## Adding npm dependencies

Install npm packages for your functions in the workspace as usual, for example with `npm install <package>` in the workspace root. The `build` target inlines them into the bundle, so the app needs no `package.json` of its own.

If `package` reports that the bundle loads a module that is not in it, the build left that module out. Check your build configuration first. If the module is an optional dependency that the package loads only when present, and your code works without it, list it in the `allowMissingModules` option of [the `package` executor](../reference/executors#package).
