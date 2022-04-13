#  Nx Forge

[Nx plugin](https://nx.dev) for [Atlassian Forge](https://developer.atlassian.com/platform/forge/) that aims to assist in efficient, scalable app development and remove the mental overhead of how to set up a Forge project.
Building on top of Nx means shared code can easily be extracted into libraries, and [Custom UI](https://developer.atlassian.com/platform/forge/custom-ui/) can be integrated into the app and dev workflow without having to break with the monorepo structure that Nx provides.

## Setting up

### Install the plugin

Add the plugin to your Nx workspace using

```
npm install --save-dev @toolsplus/nx-forge
```

or

```
yarn add --dev @toolsplus/nx-forge
```

### Generate a Forge app

Once installed, run the Forge app generator to generate a Forge app.

    nx g @toolsplus/nx-forge:app <forge-app-name>

> Hint: You can use the `--dry-run` flag to see what will be generated.

Replacing `<forge-app-name>` with the name of the app you're wanting to create.

### Add a Custom UI module

Forge apps require at least one module before they can be deployed. Let's start with a simple Custom UI module to get started. If you have not yet installed `@nrwl/react` in your workspace call `npm i -D @nrwl/react`. This allows us to generate a React application for our Custom UI:

    nx g @nrwl/react:app <custom-ui-app-name>

> Hint: You can use the `--dry-run` flag to see what will be generated.

Replacing `<custom-ui-app-name>` with the name of the Custom UI project you're wanting to create.

### Wire the Custom UI project with the Forge app project

Back in the Forge app project, open the generated `manifest.yml` file and add a Custom UI module and the corresponding resource entry:

```yaml
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
  "targets": {
    
  },
  "implicitDependencies": ["<custom-ui-app-name>"]
}
```

This tells Nx that each time we build our Forge app, it needs to build the Custom UI project first.

### Initial build and registration

Before you can deploy the Forge app it needs to be registered with the Forge platform. To do this, initially build the Forge app using

    nx build <forge-app-name>

Once that's finished, go to `dist/apps/<forge-app-name>` and run the following three commands

```shell
forge register
forge deploy
forge install
```

The Forge app is now registered, deployed and installed with the Forge platform. As a final last step, open the `dist/apps/<forge-app-name>/manifest.yml` and copy-paste the app id that was generated during app registration into the Forge app project under `apps/<forge-app-name>/manifest.yml`:

```yaml
app:
  id: ari:cloud:ecosystem::app/f2fc9c8f-5947-7da7-32ab-6367647e4b1a
```

That's it for the setup steps. You can now generate additional Custom UI resources, generate shared Nx libraries to keep shared app logic and depend on it in one or more Forge apps.

## Using the Nx Forge plugin

### Build

Run `nx build <forge-app-name>` to build the project. The build artifacts will be stored in the `dist/` directory.

## Further help on how to develop with Nx

Visit the [Nx Documentation](https://nx.dev) to learn more.
