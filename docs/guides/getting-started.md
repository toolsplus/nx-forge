---
sidebar_position: 10
---

<script setup>
const nxVersion = 22
</script>

# Getting started

## Prerequisites

The following setup procedure assumes you are somewhat [familiar with Nx](https://nx.dev/getting-started/why-nx) and have an existing Nx workspace. If you do not, make sure to create one using

```shell-vue
npx create-nx-workspace@{{nxVersion}} <workspace-name> --preset=apps
```

You will be asked if you would like to use Nx Cloud and/or remote caching. Either option is fine. Once the workspace has been created, run `cd <workspace-name>`.

## Setting up

:::info

The following steps assume that nx is installed globally. If you have not, you can do so by running `npm install -g nx`.

:::

### Installing Nx Console

Nx Console is the Nx IDE plugin for VSCode and JetBrains IDEs. This step is optional, however, if you are new to Nx or generally prefer a user interface over a terminal, installing Nx Console is highly recommend: https://nx.dev/getting-started/editor-setup

With Nx Console, you can run generator and executor commands from your IDE user interface instead of using the terminal. It also helps with task discovery, since [plugin targets are inferred](https://nx.dev/concepts/inferred-tasks) from configuration instead of explicitly defined (where possible).

### Installing the plugin

Add the plugin to your Nx workspace using

```shell
nx add @toolsplus/nx-forge
```

:::tip NOTE

The plugin is compatible with Nx version {{nxVersion}}. If you use an older Nx version, we recommend upgrading to avoid compatibility issues. 

:::

### Generating a Forge app

Once installed, run the Forge app generator to generate a Forge app. Replace `<nx-forge-app-name>` with the name of the app you want to create. You can add the `--dry-run` flag to preview what will be generated.

```shell
nx g @toolsplus/nx-forge:app apps/<nx-forge-app-name>
```

### Adding a Custom UI module

Forge apps require at least one module before they can be deployed. Let's start with a simple Custom UI module to get started. Run the following command from the workspace root to add Nx React support:

```shell-vue
nx add @nx/react@{{nxVersion}}
```

This plugin allows us to generate a React application for our Custom UI. Replace `<custom-ui-app-name>` with the name of the Custom UI project you want to create. You can add the `--dry-run` flag to preview what will be generated.

```shell
nx g @nx/react:app apps/<custom-ui-app-name>
```


To get the React app working as a Forge Custom UI, ensure that the configured bundler loads assets from relative paths. Refer to [the Forge documentation for additional details](https://developer.atlassian.com/platform/forge/custom-ui/#accessing-static-assets). The configuration varies based on the configured bundler, but there are typically one or two places to adjust: 

1. base path in the bundler's configuration file
1. base tag in the `index.html`

Make sure both of these are relative. For Webpack, it should be enough to set `baseHref` to `.` in `webpack.config.js`. For Vite, apart from setting `base` to `./` in `vite.config.js`, you may also need to update the base tag in `index.html` from `<base href="/" />` to `<base href="./" />`.

::: code-group
```json[webpack.config.js]:line-numbers{23}
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { NxReactWebpackPlugin } = require('@nx/react/webpack-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/<custom-ui-app-name>'),
  },
  devServer: {
    port: 4200,
    historyApiFallback: {
      index: '/index.html',
      disableDotRule: true,
      htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
    },
  },
  plugins: [
    new NxAppWebpackPlugin({
      tsConfig: './tsconfig.app.json',
      compiler: 'babel',
      main: './src/main.tsx',
      index: './src/index.html',
      baseHref: '.',
      assets: ['./src/favicon.ico', './src/assets'],
      styles: [],
      outputHashing: process.env['NODE_ENV'] === 'production' ? 'all' : 'none',
      optimization: process.env['NODE_ENV'] === 'production',
    }),
    new NxReactWebpackPlugin({
      // Uncomment this line if you don't want to use SVGR
      // See: https://react-svgr.com/
      // svgr: false
    }),
  ],
};
```
```json[vite.config.js]:line-numbers{9}
/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

export default defineConfig({
  root: __dirname,
  base: './',
  cacheDir: '../../node_modules/.vite/apps/<custom-ui-app-name>',
  server: {
    port: 4200,
    host: 'localhost',
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/apps/<custom-ui-app-name>',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
```
:::

### Wiring the Custom UI project with the Forge app project

Back in the Forge app project, open the generated `manifest.yml` file, add a Custom UI module, the corresponding resource entry, and the `permissions` declaration:

::: code-group
```yaml{2-8,12-20}[manifest.yml]:line-numbers
modules:
  jira:projectPage:
    - key: project-page
      title: Project page Custom UI
      layout: basic
      resource: project-page
      resolver:
        function: resolver  
  function:
    - key: resolver
      handler: index.handler
resources:
  - key: project-page
    path: <custom-ui-app-name>
    tunnel:
      port: 4200
permissions:
  content:
    styles:
      - 'unsafe-inline'
app:
  id: ari:cloud:ecosystem::app/to-be-generated
```
:::

The most significant bit to note here is that the `path` property of the `project-page` resource must reference the Custom UI project name from the previous step. This declaration tells the Nx Forge plugin which Nx app project corresponds to the `project-page` resource. If you are unsure about the project name, you can always look it up via the `name` property in the `project.json` file. The plugin will replace the project name path with the path to the actual Custom UI build artifact during the Forge app build. Refer to [the project graph concept documentation](../concepts/project-graph) for further details.

### Configuring target defaults

Technically, we have everything in place to build, package, and deploy our Forge app. However, to make our lives even easier, it is helpful to configure a few target defaults. Open the `nx.json` file in your workspace root and update or add the `targetDefaults` as follows:

::: code-group
```json{4-8}[nx.json]:line-numbers
{
  ...
  "targetDefaults": {
    "deploy": {
      "dependsOn": ["package"],
    },
    "package": {
      "dependsOn": ["build"],
    },
    ...
  },
  ...
}
```
:::

These settings tell Nx that when we call the `deploy` target on a project, it should first run the `package` target. Additionally, we make the `package` target dependent on the `build` target. With these ([target dependencies](https://nx.dev/reference/project-configuration#dependson)) in place, we can call `nx deploy <nx-forge-app-name>`, and Nx will ensure that the app is first built, then packaged and finally deployed.

Feel free to customize and play around with these settings to tune them to your liking.

### Initial build, registration, deployment, and installation

Before you can deploy the Forge app it needs to be registered with the Forge platform. To do this, initially build and package the Forge app (assuming you have configured the target dependencies above):

```shell
nx package <nx-forge-app-name>
```

Once that's finished, run

```shell
nx register <nx-forge-app-name>
```

This command will use `<nx-forge-app-name>` by default as the app name on the Forge platform. If you would like to use a different name, add the app name flag as follows: `--appName="My Forge App"`.

Then run

```shell
nx deploy <nx-forge-app-name>
```

to deploy the Forge app to the default development environment.

Finally, install the app on any of your sites with the following command

```shell
nx install <nx-forge-app-name> --site <my-atlassian-site.atlassian.net> --product jira --no-interactive
```

:tada: The Forge app is now registered, deployed, and installed with the Forge platform.

That's it for the setup steps. You can now generate additional [Forge application projects](generating-a-forge-app), [Custom UI projects](adding-a-custom-ui-module), or [library projects](https://nx.dev/concepts/more-concepts/applications-and-libraries) to maintain shared app logic and depend on it in one or more Forge apps.
