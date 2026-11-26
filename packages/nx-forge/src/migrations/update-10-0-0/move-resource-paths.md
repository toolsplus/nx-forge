# Move manifest resource paths to the bundle folder

nx-forge 10 writes the build output to the `functions` folder of the artifact directory instead of `src`. Paths in `manifest.yml` are relative to the artifact directory, so a resource whose `path` points into the old folder, such as `src/assets` for files that a Rovo agent prompt reads, must now point into `functions`, such as `functions/assets`.

The migration changes these paths when each one is on its own `path:` line. For each manifest it reports as "by hand", change the paths of the resources that start with `src/` to start with `functions/` instead. Leave resources whose `path` names a Custom UI or UI Kit project as they are.

Check the result by deploying the app: Forge fails the deploy if a resource path does not exist.
