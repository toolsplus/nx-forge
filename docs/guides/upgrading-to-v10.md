# Upgrading to v10

This guide shows you how to upgrade a workspace from Nx Forge 9 to Nx Forge 10.

## What changed

In version 9, a Forge app was bundled twice. The Nx `build` target bundled the app code but left npm dependencies as `require()` calls in `<artifact>/src`. Then `forge deploy` bundled it again with Forge's Webpack, resolving the dependencies from the artifact directory in `dist`. This broke with pnpm and other layouts where dependencies are not all hoisted to one `node_modules`, and it needed a generated `package.json`.

In version 10, the Nx `build` target is the only bundler. It inlines everything, including npm dependencies, into `<artifact>/functions/index.js`. The Forge CLI then ships that bundle as it is, through Forge's [manual packaging](https://developer.atlassian.com/platform/forge/manifest-reference/packaging/).

```mermaid
---
config:
  flowchart:
    rankSpacing: 28
    nodeSpacing: 70
    padding: 18
---
flowchart TB
  subgraph v10["Version 10: bundled once"]
    direction TB
    b1("`**nx build**
    inlines npm packages`") --> b2("`**nx package**
    checks manifest and bundle`") --> b3["`**Artifact**
    functions/index.js`"] --> b4("`**forge deploy**
    ships it unchanged`")
  end
  subgraph v9["Version 9: bundled twice"]
    direction TB
    a1("`**nx build**
    leaves npm packages out`") --> a2("`**nx package**
    adds package.json`") --> a3["`**Artifact**
    src/ + package.json`"] --> a4("`**forge deploy**
    bundles again`")
  end
  a3@{ shape: doc }
  b3@{ shape: doc }
  class a1,a2,b1,b2 nx
  class a4 warn
  class b4 forge
  class a3,b3 file
```

For the reasoning behind this design, see [Plugin concepts](../concepts/plugin-concepts.md).

In practice, this means:

- The build writes to `<artifact>/functions` instead of `<artifact>/src`, and must inline npm dependencies.
- `manifest.yml` needs [manual Forge packaging](https://developer.atlassian.com/platform/forge/manifest-reference/packaging/) configured.
- The `package` executor no longer generates a `package.json`. Its `tsConfig` option is removed. It checks that manual Forge packaging is configured and that the bundle is complete.
- You need Forge CLI 15.1.0 or later.

## Before you start

This guide assumes your workspace uses Nx Forge 9 and Nx 24. If it uses an older version, first upgrade to the latest 9.x release, following the [release notes](https://github.com/toolsplus/nx-forge/releases) of each major version.

Nx Forge 10 supports classic Nx workspaces, where projects are linked through TypeScript path aliases.

Commit or stash your changes, so you can review what the migration changes.

## 1. Update the Forge CLI

Older versions of the Forge CLI do not support manual packaging. Install version 15.1.0 or later, and check the version with `forge --version`:

```shell
npm install -g @forge/cli@latest
```

If your workspace has `@forge/cli` as a dependency, update it there as well: Nx Forge runs the workspace's Forge CLI before the global one.

## 2. Run the migration

Update the plugin and run its migrations:

```shell
nx migrate @toolsplus/nx-forge@latest
nx migrate --run-migrations
```

The migration makes these changes to each Forge app project:

- If the build configuration has the shape of a generated app, it changes the build output path from `.../src` to `.../functions` and makes the build inline npm dependencies:
  - Webpack: in the `NxAppWebpackPlugin` options in `webpack.config.js`, it changes `outputPath` and adds `externalDependencies: 'none'`.
  - esbuild: in the `@nx/esbuild:esbuild` build target in `project.json`, it changes `outputPath` and sets `thirdParty: true`.
- If `manifest.yml` has no `package` section yet, it configures manual Forge packaging there and keeps your comments and formatting.
- It removes the `tsConfig` option from `package` targets.

When it finishes, the migration prints next steps for everything it could not change. Keep that output for the next steps. If you work with an AI agent, run `nx migrate --run-migrations --agentic` instead: Nx gives the agent instructions for the changes that the migration could not make.

## 3. Review the build configuration

Compare each app's build configuration with what a new app gets. Make the changes the migration listed, and the ones below that it does not make.

### Webpack

A new app's `webpack.config.js` looks like this:

```js
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');

module.exports = {
  output: {
    // Forge loads function handlers from the exports of index.js, so the
    // bundle must assign the entry module's exports to `module.exports`.
    library: { type: 'commonjs2' },
    filename: 'index.js',
  },
  optimization: { nodeEnv: process.env.NODE_ENV },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      outputPath: '../../dist/apps/my-app/functions',
      main: './src/index.ts',
      outputFileName: 'index.js',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      externalDependencies: 'none',
      sourceMap: true,
      optimization: false,
      outputHashing: 'none',
      deleteOutputPath: false,
    }),
  ],
};
```

The migration does not add these parts. Add them by hand:

- **`optimization.nodeEnv`.** The Forge runtime does not set `NODE_ENV`, and the Forge CLI's bundler used to set it to `production`. Without it, libraries that check `NODE_ENV` run their development code. Nx sets `NODE_ENV` for the build to match the build configuration: `production` by default, `development` with `--configuration=development`. `mode: 'production'` does not set it, because Nx sets the Webpack mode to `none` for Node apps.
- **`sourceMap: true`.** It writes `index.js.map` next to the bundle.

Check that `output.library` is set to `{ type: 'commonjs2' }`. Without it, the bundle does not export the handlers.

### esbuild

A new app's `build` target includes these options:

```json
{
  "executor": "@nx/esbuild:esbuild",
  "options": {
    "platform": "node",
    "outputPath": "dist/apps/my-app/functions",
    "format": ["cjs"],
    "bundle": true,
    "thirdParty": true,
    "main": "apps/my-app/src/index.ts",
    "outputFileName": "index.js",
    "tsConfig": "apps/my-app/tsconfig.app.json",
    "assets": ["apps/my-app/src/assets"],
    "esbuildOptions": {
      "sourcemap": true,
      "outExtension": { ".js": ".js" },
      "define": { "process.env.NODE_ENV": "\"production\"" }
    }
  }
}
```

The migration does not change `esbuildOptions`. Add `define` and `sourcemap: true` by hand. If a configuration sets its own `esbuildOptions`, it replaces the ones in `options`. Apps generated with version 9 have such a `production` configuration, which also turns source maps off. Remove its `esbuildOptions`, or add `define` and `sourcemap: true` to it.

### Workarounds for the Forge CLI's bundler

If you added settings so that the Forge CLI's bundler could find your dependencies, remove them. The build must now inline every npm dependency, so remove any `externals` or `externalDependencies` lists that leave packages out of the bundle.

If the migration reported that it could not update a build configuration, make the changes above by hand.

## 4. Check the packaging configuration

Open each app's `manifest.yml` and check that it configures manual Forge packaging:

```yaml
app:
  package:
    bundler: manual@2026
    path: functions
```

`path` is relative to the artifact directory, not to the project. If the configuration is missing or different, `package` fails and prints the lines to add.

## 5. Update custom paths

The bundle now lives in `<artifact>/functions` instead of `<artifact>/src`. Search your workspace for the old path, for example `dist/apps/my-app/src`, and update anything you wrote by hand, such as:

- source map upload globs for error monitoring tools,
- scripts and CI steps that read or copy the build output,
- options passed on the command line, such as `--tsConfig` for `package`, which no longer exists.

## 6. Verify

Delete each app's artifact directory first, for example `dist/apps/my-app`. The build and `package` do not remove the old `src/` folder and `package.json`.

Then build, package and deploy each app:

```shell
nx run my-app:build
nx run my-app:package
nx run my-app:deploy
```

Check the result:

- `dist/apps/my-app` contains `functions/` and `manifest.yml`, and no `package.json`. If the app has Custom UI or UI Kit resources, it also contains their build output in `resources/`, or in the folder that the `package` target's `resourcePath` option names.
- `package` passes. If it reports modules missing from the bundle, see [Bundle completeness](../reference/executors.md#bundle-completeness).
- After the deploy, call a function of the app, for example by opening a module that uses a resolver. The upload contains exactly the bundle you built, so this is the real test.
