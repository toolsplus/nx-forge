# Motivation

Atlassian Forge is a platform that simplifies Atlassian app development and hosting. However, setting up and configuring a Forge application beyond the basic use case is not that simple - here is why:

## Forge application layout

Atlassian's Forge platform requires Forge applications to be fully self-contained when they are deployed to the platform. This means the Forge application must contain all static artifacts, such as Custom UI or UI Kit, within the Forge app root directory at deployment time, as illustrated by the directory structure below:

```
my-forge-app/
├── resources
│   ├── custom-ui-1
│   ├── ui-kit-ui-1
│   │     
├── src
├── manifest.yml
└── package.json
```

## Challenges

The main challenge with the code organization requirement illustrated above is that there is no tooling to support it.

### Code sharing

Imagine your Forge app contains a Custom UI that communicates with a resolver on your Forge app backend. Ideally, you want to share code between the Custom UI frontend and the Forge app backend to ensure they have a shared communication protocol. 

Where would you place that shared code, and how would you configure the frontend and back end to have access to it? 

### Compiled artifacts

Let's say you want to write your Forge app entirely in Typescript, or you want pre-compile your Javascript code with Babel. This will introduce a compile step for the Forge app and each Custom UI and UI Kit resource<sup>*</sup>. Remember that the compiled output has to conform to the application layout shown on top to deploy it to the Forge platform.

How would you structure your Forge app to achieve this?

<sup>*</sup><small>The Forge CLI has some support to compile Typescript, but there is little to no documentation. We believe it is better to manage the compilation yourself and simply pass compiled Javascript to Forge.</small>

### Scaling

Imagine your Forge app is entirely written in Typescript and contains five Custom UI projects. To deploy the app, you must build each Custom UI app before deploying it to the Forge platform.

How do you set up your project such that you can run each Custom UI and Forge app build before deploying?

## Solution

Forge itself does not have, and probably should not have, an opinion on how you solve these challenges. However, the absence of any tooling also means that every developer will figure out their way to solve them. We believe writing a sophisticated Forge application should be easy.

:::tip IDEA

Nx Forge provides a solution to build Forge apps in a consistent, scalable way, and, most importantly, it removes the mental overhead of how to set up a Forge application project. 

:::

Nx Forge is a plugin to [Nx](https://nx.dev/) that allows us to inherit all the features Nx provides while building Forge applications. The plugin includes tooling to generate one or more Forge application projects within an Nx workspace and to build those applications (including Typescript compilation) to produce output that's deployable to the Forge platform.

Nx Forge treats Forge app resources, such as Custom UI modules, as their own projects that can be managed, built, and tested outside and independent of the Forge app project context. Yet, Nx Forge provides the context to Nx that the Forge app depends on one or more resource projects and allows developers to build the complete Forge app, including all its dependencies, in a single command.

For more details about how Nx Forge addresses the challenges described above, refer to [the workspace layout](workspace-layout) and [project graph](project-graph) documentation.
