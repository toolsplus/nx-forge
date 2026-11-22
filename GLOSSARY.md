# nx-forge

An Nx plugin that builds, packages and runs Atlassian Forge apps inside an Nx workspace.

## Language

**Forge app**:
An Nx project with a `manifest.yml` at its root that describes one Atlassian Forge app.
_Avoid_: Forge project, app project

**Source manifest**:
The `manifest.yml` in the Forge app's project root, which is committed and edited by hand.
_Avoid_: project manifest

**Artifact directory**:
The workspace-relative directory that a Forge app is packaged into and that `forge` commands run in, `dist/<project root>` by default.
_Avoid_: output directory, output path, dist folder

**Bundle**:
The single CommonJS build output of a Forge app's functions, with every dependency except Node built-ins inlined, in the `functions` folder of the artifact directory.
_Avoid_: build output, function code, `src` folder

**Manual Forge packaging**:
The Forge packaging mode, configured in the `app.package` section of the manifest, in which the Forge CLI ships the bundle as it is instead of bundling the app again. The settings in that section are the app packaging configuration.
_Avoid_: packaging keys

**Forge CLI**:
The `forge` command-line tool from `@forge/cli` that deploys, installs and tunnels Forge apps. nx-forge runs the copy installed in the workspace, and the global one if the workspace has none.
_Avoid_: Forge (for the CLI), the workspace Forge

**Resource**:
A Custom UI or UI Kit build output that the manifest references by project name and that is copied into the `resources` folder of the artifact directory.
