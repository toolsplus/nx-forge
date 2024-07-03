---
sidebar_position: 10
---

<script setup>
const nxVersion = 19
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

Nx Console is the Nx IDE plugin for VSCode and JetBrains IDEs. This step is optional, however, if you are new to Nx or generally prefer a user interface over a terminal, we highly recommend installing Nx Console: https://nx.dev/getting-started/editor-setup

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
nx g @toolsplus/nx-forge:app <nx-forge-app-name> --directory apps/<nx-forge-app-name> --projectNameAndRootFormat as-provided
```

:::info

Starting with Nx 20 the flag `--projectNameAndRootFormat as-provided` will become the default and will no longer be required. 

:::

### Adding a Custom UI module

Forge apps require at least one module before they can be deployed. Let's start with a simple Custom UI module to get started. Run the following command from the workspace root to add Nx React support:

```shell-vue
nx add @nx/react@{{nxVersion}}
```

This plugin allows us to generate a React application for our Custom UI. Replace `<custom-ui-app-name>` with the name of the Custom UI project you want to create. You can add the `--dry-run` flag to preview what will be generated.

```shell
nx g @nx/react:app <custom-ui-app-name>
```


To get the React app working as a Forge Custom UI, update the `apps/<custom-ui-app-name>/project.json` file by replacing the `baseHref` value in the build options with `.` instead of `/`. Refer to [the Forge documentation for additional details](https://developer.atlassian.com/platform/forge/custom-ui/#accessing-static-assets):

::: code-group
```json[project.json]:line-numbers
{
  "root": "apps/<custom-ui-app-name>",
  "sourceRoot": "apps/<custom-ui-app-name>/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "outputs": ["{options.outputPath}"],
      "defaultConfiguration": "production",
      "options": {
        "compiler": "babel",
        "outputPath": "dist/apps/<custom-ui-app-name>",
        "index": "apps/<custom-ui-app-name>/src/index.html",
        "baseHref": ".", // [!code highlight]
        ...
      }
    },
    ...
  }
}
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

The most significant bit to note here is that the `path` property of the `project-page` resource must reference the Custom UI project name from the previous step. This declaration tells the Nx Forge plugin which Nx app project corresponds to the `project-page` resource. The plugin will replace this path with the path to the actual Custom UI build artifact during the Forge app build. Refer to [the project graph concept documentation](../concepts/project-graph) for further details.

### Configuring target defaults

Technically, we already have everything in place to build, package, and deploy our Forge app. However, to make our lives even easier, it is helpful to configure a few target defaults. Open the `nx.json` file in your workspace root and update or add the `targetDefaults` as follows:

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
