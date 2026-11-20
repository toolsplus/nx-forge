# Add the manual packaging keys to Forge manifests

nx-forge 10 ships the Nx build output unchanged through Forge manual packaging. The `manifest.yml` of each Forge app must contain:

```yaml
app:
  package:
    bundler: manual@2026
    path: bundle
```

The migration adds these keys when the `app` section has no `package` section. For each manifest it reports as "by hand", set `app.package.bundler` and `app.package.path` to the values above. Keep the other keys of an existing `package` section and the manifest's comments and formatting.

Check the result with `nx run <app>:package`. It fails and prints the lines to add if a key is missing or has a different value.
