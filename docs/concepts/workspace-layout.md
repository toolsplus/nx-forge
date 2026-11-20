# Workspace layout

This document describes the idea behind using Nx to structure and build Forge applications.

:::details What is Nx?
In one sentence, Nx is an open-source build system that provides tools and techniques for enhancing developer productivity, optimizing CI performance, and maintaining code quality.

<iframe width="560" height="315" src="https://www.youtube.com/embed/-_4WMl-Fn0w?si=_zWHiOFzci0Oo0lb" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
:::

The schema below illustrates a typical layout of an Nx workspace when using the Nx Forge plugin. Most notably, [the workspace is structured in to _apps_ and _libs_](https://nx.dev/concepts/more-concepts/applications-and-libraries). This distinction allows a more modular architecture by following a separation of concerns methodology, incentivizing the organization of our source code and logic into smaller, more focused, and highly cohesive units.

```
my-nx-workspace/
├── apps
│   ├── my-forge-app-1
│   │   |── src
│   │   |── manifest.yml
│   │   |── project.json
│   ├── my-forge-app-2
│   │   |── src
│   │   |── manifest.yml
│   │   |── project.json
│   ├── custom-ui-a
│   ├── ui-kit-ui-b
├── libs
|   ├── shared-api-code
|   ├── shared-ui-code
├── dist
├── nx.json
└── package.json
```

`/apps/` contains application projects such as one or more Forge applications or Custom UI projects. This is the main entry point for a runnable application. We recommend keeping applications as lightweight as possible, with all the heavy lifting being by libraries that are imported by each application.

`/libs/` contains library projects. This is where all shared code goes. There could be many kinds of libraries, for example, model libraries, data access, or UI libraries. Each library defines its external API so that boundaries between libraries remain clear.

`/dist/` contains the build output. Look here if you would like to inspect the compiled code and what's being deployed.

## Build output

Each Forge app gets its own folder in `dist`, at the same path as the project. This folder is the app's _artifact directory_. For `apps/my-forge-app-1`, it is `dist/apps/my-forge-app-1`. After the `build` and `package` targets have run, it looks like this:

```
dist/apps/my-forge-app-1/
├── bundle
│   ├── index.js
│   ├── index.js.map
│   └── assets
├── resources
│   ├── custom-ui-a
│   └── ui-kit-ui-b
└── manifest.yml
```

`bundle/` is written by the app's `build` target. `index.js` holds all function code, including the workspace libraries and npm dependencies it uses, and exports the handlers the manifest refers to. Next to it are its source map and the app's assets.

`resources/` holds a copy of the build output of each Custom UI and UI Kit project the manifest refers to. The `package` target copies it there.

`manifest.yml` is a copy of the project's manifest, also written by `package`. In this copy, each resource `path` points to its folder in `resources/` instead of to a project name.

This folder is everything Forge needs. The Forge CLI runs in it when you deploy or tunnel, and uploads `bundle/` as it is. There is no `package.json` and no `node_modules`, because the bundle already contains every dependency. [Plugin concepts](plugin-concepts.md) explains why.

## Benefits

### Maintain one or more Forge apps in the same workspace

The workspace layout allows maintaining one or more Forge applications within the same workspace, making code sharing between multiple Forge apps easy. This is great, for example, when building similar Forge apps for different Atlassian products or sharing an API contract between a Forge resolver implementation and a Custom UI.

### Build and test individual components independently

The fact that Forge application projects, Custom UI projects, and shared library projects can be laid out and managed as individual pieces allows building and testing each part completely independent of each other. 

### Typescript by default

When using Nx with Javascript, it defaults to Typescript. Nx provides and largely manages the Typescript setup. This includes importing code between projects and inheriting Typescript settings across the Nx workspace. Overall, there is little to no setup effort involved on the developer's part.

### Scaling

Similar to the previous point, because [Nx knows about project and task dependencies](project-graph), it can build Forge applications that are split into many different pieces in a single command. Nx will build each dependent part before building the Forge application itself. Among many other features, Nx also provides tooling to [enforce module boundaries](https://nx.dev/recipes/enforce-module-boundaries#enforce-module-boundaries) and [cache task results](https://nx.dev/features/cache-task-results) to maintain a snappy experience.
