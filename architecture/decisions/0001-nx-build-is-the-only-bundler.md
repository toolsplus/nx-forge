# The Nx build is the only bundler and Forge ships its output

The app's Nx `build` target produces the one and only bundle of a Forge app, and the Forge CLI ships it unchanged through manual packaging (`app.package.bundler: manual@2026`). Before, `forge deploy` and `forge tunnel` bundled the build output a second time from the artifact directory, which resolved npm dependencies from the wrong place (it fails under pnpm and other non-hoisted layouts), required a generated `package.json` that the Forge CLI never reads, forced the output into a `src` folder, and gained nothing because Forge's bundler inlines everything anyway. Manual packaging is the only mode; there is no opt-out.

## Build contract

nx-forge depends on the build output, not on the bundler that produced it. The `build` target writes to `<artifact directory>/bundle`:

- `index.js` is CommonJS and exports the handlers the manifest refers to.
- Everything is inlined except Node built-ins: workspace libraries and npm dependencies.
- A source map may sit next to it (`index.js.map`).

nx-forge scaffolds and tests Webpack (the default) and esbuild against this contract.

## Consequences

- **`package` checks completeness.** Forge ships the bundle as it is, so a module the bundle loads but does not contain only fails when a function is invoked. `forge lint` and `forge deploy` pass, and `forge tunnel` inside a workspace resolves the module from the workspace `node_modules`, which hides the problem locally. `package` therefore fails if the bundle loads a module that is neither a Node built-in nor a file in the bundle folder; `allowMissingModules` names optional requires that the code handles itself. The check reads the bundle with acorn, a small JavaScript parser that nx-forge pins: the bundle is plain JavaScript, and the TypeScript compiler API would tie the check to whichever TypeScript version the workspace installs.
- **The packaging keys live in the source manifest.** The generator writes them, the migration backfills them and `package` validates them instead of injecting them, so the committed manifest is the one Forge receives.
- Forge lint parses JavaScript only under `./src`, so it no longer inspects function code.
