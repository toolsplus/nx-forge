# Generators

Documents [the generators](https://nx.dev/features/generate-code) provided by the Nx Forge plugin.

Append `--help` or `-h` for any of the plugin generators to explore all available options.

## Application

```shell
nx generate @toolsplus/nx-forge:app apps/<nx-forge-app-name>
```

Generates a blank Forge app project named `<nx-forge-app-name>`. In almost all cases, you probably want to run [the Forge app registration task](executors#register) immediately after this generator to register the app with the Forge platform.

The generated project contains:

- `src/index.ts` with a resolver function handler,
- `manifest.yml` with the function module and the `app.package` keys for [manual packaging](https://developer.atlassian.com/platform/forge/manifest-reference/packaging/) (`bundler: manual@2026`, `path: bundle`),
- a `build` target that bundles the app, including its workspace libraries and npm dependencies, into one CommonJS file at `dist/<project-root>/bundle/index.js`, with a source map next to it.

With `--bundler=webpack` (the default), the `build` target is inferred from the generated `webpack.config.js`. With `--bundler=esbuild`, it is an `@nx/esbuild:esbuild` target in `project.json`.

### Options

<!-- nx-forge:options generator=application -->
