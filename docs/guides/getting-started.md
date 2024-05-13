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

### Installing the plugin

Add the plugin to your Nx workspace using

```shell
npm install --save-dev @toolsplus/nx-forge@latest
```

:::tip NOTE

Ensure that Nx peer dependency version listed in the nx-forge package matches the Nx major version of your workspace. If you are starting new, most of the time `latest` should be fine. If you use an older Nx version, please install the nx-forge plugin version accordingly. 

:::

### Generating a Forge app

Once installed, run the Forge app generator to generate a Forge app. Replace `<nx-forge-app-name>` with the name of the app you want to create. You can add the `--dry-run` flag to preview what will be generated.

```shell
npx nx g @toolsplus/nx-forge:app <nx-forge-app-name> --directory apps/<nx-forge-app-name> --projectNameAndRootFormat as-provided
```

:::info

Starting with Nx 20 the flag `--projectNameAndRootFormat as-provided` will become the default and will no longer be required. 

:::

### Adding a Custom UI module

Forge apps require at least one module before they can be deployed. Let's start with a simple Custom UI module to get started. If you have not installed `@nx/react` in your workspace, call `npm add -D @nx/react@{{nxVersion}}`. This plugin allows us to generate a React application for our Custom UI. Replace `<custom-ui-app-name>` with the name of the Custom UI project you want to create. You can add the `--dry-run` flag to preview what will be generated.

```shell
npx nx g @nx/react:app <custom-ui-app-name>
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

### Configuring targets dependencies

Configure `build` target dependencies to ensure Nx builds the Custom UI project before the Forge app. Open the `nx.json` file in your workspace root and update the `targetDefault as follows:

::: code-group
```json{4-8}[nx.json]:line-numbers
{
  ...
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    },
    ...
  },
  ...
}
```
:::

This setting tells Nx that when we call the `build` target on a project, it should first run the `build` target on all dependent projects ([`^build`](https://nx.dev/reference/project-configuration#dependson)). This works because Nx knows about project dependencies.

Feel free to customize and play around with these settings to tune them to your liking. For example, another helpful setting could be to run the `build` target before the [`package` target](../reference/executors.md#package) runs:

::: code-group
```json{9-15}[nx.json]:line-numbers
{
  ...
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    },
    "package": {
      "dependsOn": ["build"],
      "executor": "@toolsplus/nx-forge:package",
      "options": {
        "outputPath": "dist/{projectRoot}"
      }
    }
    ...
  },
  ...
}
```
:::

### Initial build, registration, deployment, and installation

Before you can deploy the Forge app it needs to be registered with the Forge platform. To do this, initially build the Forge app using

```shell
npx nx build <nx-forge-app-name>
```

Once that's finished, run

```shell
npx nx register <nx-forge-app-name>
```

This command will use `<nx-forge-app-name>` by default as the app name on the Forge platform. If you would like to use a different name, add the app name flag as follows: `--appName="My Forge App"`.

Then run

```shell
npx nx deploy <nx-forge-app-name>
```

to deploy the Forge app to the default development environment.

Finally, install the app on any of your sites with the following command

```shell
npx nx install <nx-forge-app-name> --site <my-atlassian-site.atlassian.net> --product jira --no-interactive
```

:tada: The Forge app is now registered, deployed, and installed with the Forge platform.

That's it for the setup steps. You can now generate additional [Forge application projects](generating-a-forge-app), [Custom UI projects](adding-a-custom-ui-module), or [library projects](https://nx.dev/concepts/more-concepts/applications-and-libraries) to maintain shared app logic and depend on it in one or more Forge apps.
