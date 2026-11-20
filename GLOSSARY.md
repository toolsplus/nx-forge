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
The single CommonJS build output of a Forge app's functions, with every dependency except Node built-ins inlined, in the `bundle` folder of the artifact directory.
_Avoid_: build output, function code, `src` folder

**Packaging keys**:
The `app.package` entries of the manifest that make Forge ship the bundle as it is instead of bundling the app again.

**Resource**:
A Custom UI or UI Kit build output that the manifest references by project name and that is copied into the `resources` folder of the artifact directory.
