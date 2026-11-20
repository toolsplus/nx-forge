# Build one self-contained bundle per Forge app

nx-forge 10 no longer lets the Forge CLI bundle the app. The Nx `build` target of each Forge app (a project with a `manifest.yml`) must produce the bundle that Forge ships unchanged.

The migration updates build configurations in the shape that the nx-forge application generator writes. For each one it reports as "by hand", change the build so that:

- It writes to the `bundle` folder of the artifact directory instead of `src`. For example, `dist/apps/my-app/src` becomes `dist/apps/my-app/bundle`.
- `bundle/index.js` is CommonJS and exports the handlers that the manifest refers to.
- It inlines every dependency except Node built-ins: workspace libraries and npm packages.
  - Webpack with `NxAppWebpackPlugin`: set `externalDependencies: 'none'`, and keep `output.library.type: 'commonjs2'`.
  - `@nx/esbuild:esbuild`: set `bundle: true`, `format: ['cjs']` and `thirdParty: true`. If `esbuildOptions.outfile` or `outdir` is set, point it at the `bundle` folder.
- It emits a source map next to `index.js` if the app uploads source maps.

Then update anything else that refers to the old `src` output folder, such as source-map upload globs or scripts.

Check the result with `nx run <app>:package`. It fails if the bundle loads a module that is neither a Node built-in nor a file in the bundle, and lists those modules. Use its `allowMissingModules` option only for optional modules that the code loads inside a `try`.
