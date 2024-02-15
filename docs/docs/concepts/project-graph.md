---
sidebar_position: 30
---

# Project graph

Nx Forge extends [the Nx project graph](https://nx.dev/concepts/mental-model#the-project-graph) to teach Nx about Forge application dependencies. This is done by Nx Forge inspecting the `resources` declared in the manifest.yml of each Forge application in the workspace. Nx Forge expects [the `path` parameter of the resource declaration](https://developer.atlassian.com/platform/forge/manifest-reference/resources/) to point to a project name in the Nx workspace. It then registers those project dependencies with the Nx project graph. The result is that Nx now knows which other projects in a workspace a Forge application depends on. It can then run dependent tasks (such as build) on dependent projects before running them on a particular Forge application.

Because the Nx Forge plugin knows its resource dependencies, it automatically copies the dependent resource project artifacts into the Forge app output directory at build time. It then patches the Nx project reference in the manifest file with the actual path pointing to the copied resource artifacts, producing a deployable Forge application.