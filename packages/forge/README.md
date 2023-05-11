# Nx Forge

[Nx plugin](https://nx.dev) for [Atlassian Forge](https://developer.atlassian.com/platform/forge/) that aims to assist in efficient, scalable app development and remove the mental overhead of how to set up a Forge project.
Building on top of Nx means shared code can easily be extracted into libraries, and [Custom UI](https://developer.atlassian.com/platform/forge/custom-ui/) can be integrated into the app and dev workflow without having to break with the monorepo structure that Nx provides.

## Prerequisites

The following setup procedure assumes you already have a Nx workspace. If you do not, make sure to create one using

```shell
npx create-nx-workspace <workspace-name> --preset=apps
```

You will be asked if you would like to use Nx Cloud or not (either option is fine). Once, the workspace has been created run `cd <workspace-name>`.

Finally, make sure your workspace has the following packages (peer dependencies) installed

```shell
npm install --save-dev @nx/node
```

## Setting up

### Install the plugin

Add the plugin to your Nx workspace using

```shell
npm install --save-dev @toolsplus/nx-forge
```

or

```shell
yarn add --dev @toolsplus/nx-forge
```

### Generate a Forge app

Once installed, run the Forge app generator to generate a Forge app.

```shell
nx g @toolsplus/nx-forge:app <forge-app-name>
```

> Hint: You can use the `--dry-run` flag to see what will be generated.

Replacing `<forge-app-name>` with the name of the app you're wanting to create.

### Add a Custom UI module

Forge apps require at least one module before they can be deployed. Let's start with a simple Custom UI module to get started. If you have not yet installed `@nx/react` in your workspace call `npm i -D @nx/react`. This allows us to generate a React application for our Custom UI:

    nx g @nx/react:app <custom-ui-app-name>

> Hint: You can use the `--dry-run` flag to see what will be generated.

Replacing `<custom-ui-app-name>` with the name of the Custom UI project you're wanting to create.

To get this React app working as a Forge Custom UI update the `apps/<custom-ui-app-name>/project.json` file by replacing the `baseHref` value in the build options with `.` instead of `/` ([refer to the Forge docs for additional details](https://developer.atlassian.com/platform/forge/custom-ui/#accessing-static-assets)):

```
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
----->  "baseHref": ".",
        ...
      }
    },
    ...
  }
}
```

### Wire the Custom UI project with the Forge app project

Back in the Forge app project, open the generated `manifest.yml` file and add a Custom UI module and the corresponding resource entry:

```yaml
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

The most important bit to note here is that the `path` property of the `project-page` resource should refer to the Custom UI project name from the previous step. This tells the Nx Forge plugin which Nx app project corresponds to `project-page` resource. The plugin will replace this path with the actual Custom UI build artifact during the Forge app build.

Finally, update the `apps/<forge-app-name>/project.json` file in the generated Forge app project to define an implicit dependency to the Custom UI project.

```json
{
  "root": "apps/<forge-app-name>",
  "sourceRoot": "apps/<forge-app-name>/src",
  "projectType": "application",
  "targets": {...},
  "implicitDependencies": ["<custom-ui-app-name>"]
}
```

This tells Nx that each time we build our Forge app, it needs to build the Custom UI project first.

### Initial build, registration, deployment and installation

Before you can deploy the Forge app it needs to be registered with the Forge platform. To do this, initially build the Forge app using

    nx build <forge-app-name>

Once that's finished, run

    nx register <forge-app-name>

This will use `<forge-app-name>` by default as the app name on the Forge platform. If you would like to use a different name add the app name flag as follows: `--appName="My Forge App"`.

Then run

    nx deploy <forge-app-name>

to deploy the Forge app to the default development environment.

Finally go to `dist/apps/<forge-app-name>` and run the following command
  
    forge install

The Forge app is now registered, deployed and installed with the Forge platform.

That's it for the setup steps. You can now generate additional Custom UI resources, generate shared Nx libraries to keep shared app logic and depend on it in one or more Forge apps.

## Using the Nx Forge plugin

### Register

Run `nx register <forge-app-name>` to register the Forge app with the Forge platform.

### Build

Run `nx build <forge-app-name>` to build the project. The build artifacts will be stored in the `dist/` directory.

### Deploy

Run `nx deploy <forge-app-name>` to deploy the project. The build artifacts will be deployed using the Forge CLI deploy command.

### Tunnel

Run `nx serve <forge-app-name>` to serve the project. This will start the `serve` target for all Custom UI projects defined in the app `manifest.yml` on their specified tunnel port. After that, it will start a build process in watch mode for the Forge app itself, before ultimately, starting the `forge tunnel` process for the Forge app.

## Further help on how to develop with Nx

Visit the [Nx Documentation](https://nx.dev) to learn more.
