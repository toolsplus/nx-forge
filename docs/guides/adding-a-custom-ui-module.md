# Adding a Custom UI module

[Custom UI](https://developer.atlassian.com/platform/forge/custom-ui/iframe/) is a way of providing a user interface in a Forge application. It allows developers to have almost complete freedom of technology choice as long as it produces Javascript. In this guide, we explain how to add a React-based Custom UI implemented in Typescript. If you prefer to use other technologies, such as [Vue](https://nx.dev/nx-api/vue/documents/overview) or [Vite](https://nx.dev/nx-api/vite/documents/overview), it should work just as well, provided you can integrate with Atlassian's APIs.

## Installing @nx/react

If you have not installed [`@nx/react`](https://nx.dev/nx-api/react/documents/overview) in your workspace, you can install it by running the following command:

:::code-group
```shell[Nx 18+]
nx add @nx/react
```

```shell[Nx <18]
npm i -D @nx/react
```
:::

## Generating a React application

With the React plugin installed, we can use the [React application generator](https://nx.dev/nx-api/react/generators/application) to scaffold a React application for our Custom UI. Replace `<custom-ui-app-name>` with the name of the Custom UI project you want to create. The example below will generate the project under the `apps` folder in your workspace. If you prefer a different directory, you can change that as you like. You can add the `--dry-run` flag to preview what will be generated.

```shell
nx g @nx/react:app apps/<custom-ui-app-name>
```

To get the React app working as a Forge Custom UI, ensure that the configured bundler loads assets from relative paths. Refer to [the Forge documentation for additional details](https://developer.atlassian.com/platform/forge/custom-ui/#accessing-static-assets). The configuration varies based on the configured bundler, but there are typically one or two places to adjust:

1. base path in the bundler's configuration file
1. base tag in the `index.html`

Make sure both of these are relative. For Webpack, it should be enough to update `baseHref` to `.` in `webpack.config.js`. For Vite, apart from setting `base` in `vite.config.js`, you may also need to update the base tag in `index.html` from `<base href="/" />` to `<base href="./" />`.

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

## Wiring the Custom UI project

The final step is to connect the Custom UI project to our Forge application. This step is crucial for Nx Forge to [register the dependency with the Nx project graph](../concepts/project-graph) and for the Nx Forge build task to assemble the Forge app correctly.

In the Forge app project, open the generated `manifest.yml` file and add a Custom UI module, the corresponding resource entry, and the `permissions` declaration. The example below adds the `jira:projectPage` module and the `project-page` resource declaration.

:::code-group
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

The wiring of the Custom UI to the Forge application happens in the `path` property of the `project-page` resource. The `path` property must reference the Custom UI project name from the previous step. If you are unsure about the project name, you can always look it up via the `name` property in the `project.json` file. The plugin will replace the project name path with the path to the actual Custom UI build artifact during the Forge app build. Refer to [the project graph concept documentation](../concepts/project-graph) for further details.

With the default Nx workspace configuration, [the task pipeline](https://nx.dev/features/run-tasks#defining-a-task-pipeline) is preconfigured such that before running the `build` target, it needs to run the `build` target on all the projects the current project depends on. This means if we run:

```shell
nx build <nx-forge-app-name>
```

Nx will invoke the `build` target of the Custom UI app first and then invoke the `build` target for the Forge app itself. We can now build our complete Forge application with a single command.
