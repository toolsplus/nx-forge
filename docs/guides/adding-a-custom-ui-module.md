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

With the React plugin installed, we can use the [React application generator](https://nx.dev/nx-api/react/generators/application) to scaffold a React application for our Custom UI. Replace `<custom-ui-app-name>` with the name of the Custom UI project you want to create. You can add the `--dry-run` flag to preview what will be generated.

::: tip
If you are asked about the project name and where the project should be generated, select "as provided" (this will become the default in Nx 19).
:::

```shell
nx g @nx/react:app <custom-ui-app-name> --directory apps/<custom-ui-app-name>
```

To get the React application working as a Forge Custom UI we have to update the `apps/<custom-ui-app-name>/project.json` file. Open the file and replace the `baseHref` value in the build options with `.` instead of `/`. Refer to [the Forge documentation on accessing static assets for additional details](https://developer.atlassian.com/platform/forge/custom-ui/#accessing-static-assets).

:::code-group
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

The wiring of the Custom UI to the Forge application happens in the `path` property of the `project-page` resource. The `path` property must reference the Custom UI project name from the previous step. The plugin will replace this path with the path to the actual Custom UI build artifact during the Forge app build. Refer to [the project graph concept documentation](../concepts/project-graph) for further details.

With the default Nx workspace configuration, [the task pipeline](https://nx.dev/features/run-tasks#defining-a-task-pipeline) is preconfigured such that before running the `build` target, it needs to run the `build` target on all the projects the current project depends on. This means if we run:

```shell
nx build <nx-forge-app-name>
```

Nx will invoke the `build` target of the Custom UI app first and then invoke the `build` target for the Forge app itself. We can now build our complete Forge application with a single command.
