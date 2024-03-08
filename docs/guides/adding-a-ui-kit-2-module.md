# Adding a UI Kit 2 module

[UI Kit 2](https://developer.atlassian.com/platform/forge/ui-kit-2/index/) is a way of providing a user interface in a Forge application. It allows developers to build natively rendered UIs in React. In this guide, we explain how to add a UI Kit 2 project to an existing Forge app.

::: info
UI Kit 2 support is experimental. Please try it out and let us know if you face any issues.
:::

## Enabling UI Kit 2 packaging

Unfortunately, UI Kit 2 and Custom UI packaging do not work the same way. To avoid breaking any existing builds, the default packaging mechanism is currently only compatible with Custom UI. However, you can enable UI Kit 2 compatible packaging by setting the `uiKit2Packaging` option on the [`build`](../reference/executors.md#build) or [`package`](../reference/executors.md#package) executor.

## Installing UI Kit 2 dependencies

Install the `@forge/react` UI Kit 2 package that includes required UI Kit 2 dependencies:

```shell
npm i @forge/react
```

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

With the React plugin installed, we can use the [React application generator](https://nx.dev/nx-api/react/generators/application) to scaffold a React application for our UI Kit 2. Replace `<ui-kit-2-app-name>` with the name of the UI Kit 2 project you want to create. You can add the `--dry-run` flag to preview the generated files.

::: tip
If you are asked about the project name and where the project should be generated, select "as provided" (this will become the default in Nx 19).
:::

```shell
nx g @nx/react:app <ui-kit-2-app-name> --directory=apps/<ui-kit-2-app-name> --style=css
```

## Updating the React application

To get the React application working as a UI Kit 2 user interface, update the `apps/<ui-kit-2-app-name>/webpack.config.js` file by making the following edits:

* Add the `commonChunk: false` and `runtimeChunk: false` options to Nx Webpack plugin configuration. We do not want Webpack to generate extra chunks.
* Update the `outputHashing` option to `none`. Output filenames containing hashes are currently not supported by the packaging process.
* Remove the `index` option and the `index.html` file indicated by the option value.
* Remove assets from the `assets` option if they are unused.

:::code-group
```js{17,21-23}[webpack.config.js]:line-numbers
const { NxWebpackPlugin } = require('@nx/webpack');
const { NxReactWebpackPlugin } = require('@nx/react');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/<ui-kit-2-app-name>'),
  },
  devServer: {
    port: 4200,
  },
  plugins: [
    new NxWebpackPlugin({
      tsConfig: './tsconfig.app.json',
      compiler: 'babel',
      main: './src/main.tsx',
      // index: './src/index.html',
      baseHref: '/',
      assets: ['./src/assets'],
      styles: [],
      commonChunk: false,
      runtimeChunk: false,
      outputHashing: 'none',
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
:::

The generated React application is not compatible with UI Kit 2. Replace the `app.tsx` and `main.tsx` files with the following example content:

:::code-group
```tsx[app.tsx]
import {Text} from '@forge/react';

const App = () => <Text>👋 Hello world!</Text>;

export default App;
```

```tsx[main.tsx]
import React from 'react';
import ForgeReconciler from '@forge/react';
import App from './app/app';

ForgeReconciler.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
```
:::


## Wiring the UI Kit 2 project

The final step is to connect the UI Kit 2 project to the Forge application. This step is crucial for Nx Forge to [register the dependency with the Nx project graph](../concepts/project-graph) and for the Nx Forge package task to assemble the Forge app correctly.

In the Forge app project, open the generated `manifest.yml` file and add a UI Kit 2 module and the corresponding resource entry. The example below adds the `jira:globalPage` module and the `global-page` resource declaration.

:::code-group
```yaml{2-8,12-20}[manifest.yml]:line-numbers
modules:
  jira:globalPage:
    - key: global-page
      title: UI Kit 2 Example
      render: native
      resource: global-page
      resolver:
        function: resolver
  function:
    - key: resolver
      handler: index.handler
resources:
  - key: global-page
    path: <ui-kit-2-app-name>
    tunnel:
      port: 4200
app:
  id: ari:cloud:ecosystem::app/to-be-generated
```
:::

The wiring of the UI Kit 2 app to the Forge application happens in the `path` property of the `global-page` resource. The `path` property must reference the UI Kit 2 project name from the previous step. The plugin will replace this path with the path to the actual UI Kit 2 build artifact during the Forge app build. Refer to [the project graph concept documentation](../concepts/project-graph) for further details.

With the default Nx workspace configuration, [the task pipeline](https://nx.dev/features/run-tasks#defining-a-task-pipeline) is preconfigured such that before running the `build` target, it needs to run the `build` target on all the projects the current project depends on. This means if we run:

```shell
nx build <nx-forge-app-name>
```

Nx will invoke the `build` target of the UI Kit 2 app first and then invoke the `build` target for the Forge app itself. We can now build our complete Forge application with a single command.
