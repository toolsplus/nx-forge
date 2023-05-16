#  Nx Forge

[![CI](https://img.shields.io/github/actions/workflow/status/toolsplus/nx-forge/ci.yml?branch=main&label=CI&style=flat&logo=github)](https://github.com/toolsplus/nx-forge/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@toolsplus/nx-forge?style=flat&logo=npm)](https://www.npmjs.com/package/@toolsplus/nx-forge)

[Nx plugin](https://nx.dev) for [Atlassian Forge](https://developer.atlassian.com/platform/forge/) that aims to assist in efficient, scalable app development and remove the mental overhead of how to set up a Forge project. 
Building on top of Nx means shared code can easily be extracted into libraries, and [Custom UI](https://developer.atlassian.com/platform/forge/custom-ui/) can be integrated into the app and dev workflow without having to break with the monorepo structure that Nx provides.

## Plugin usage

Refer to the [plugin README.md](packages/nx-forge/README.md).

## Contributing

Refer to the [contribution guide](CONTRIBUTING.md).

## Motivation

Atlassian Forge is a platform that simplifies Atlassian app development and hosting. Unfortunately, configuring an app using multiple Custom UIs can be a challenge because the Forge app project layout requires Custom UI projects to live within the app project, or you would have to write some custom scripts to integrate Custom UI build artifacts into the app project before deploying to the Forge platform.

Additionally, as you are building out an app with Custom UI you are likely to build an API that allows your Custom UI to retrieve information from the backend (Forge functions). Setting up your project to share this code between frontend and backend provides a significant setup effort, again likely by crafting some custom scripts.

Finally, as you are developing a Forge app with multiple Custom UI dependencies you would likely want to have a command to quickly start all CustomUIs and the Forge app in dev mode. Without any additional tooling this means you would have to go into each Custom UI, start a dev server and then tunnel the Forge app. If you want to simplify these steps, you could write yet another custom scripts to do this for you.

All of this should not be that hard and many of the described challenges are actually already solved by [Nx](https://nx.dev). However, because Forge has its own tooling/CLI and opinions, this plugin was created to allow Forge developers to quickly scaffold a Forge app, add Forge modules and easily develop Custom UIs.
