# Contributing to Nx Forge

## Plugin development

### Running unit tests

To execute the unit tests via [Jest](https://jestjs.io) run

    nx test forge

To execute the unit tests affected by a change run

    nx affected:test

### Running end-to-end tests

To build the plugin and run end-to-end tests on a generated project run

    nx run forge-e2e:e2e

Alternatively, you can also use the short from: `nx e2e forge-e2e`.

To execute the end-to-end tests affected by a change

    nx affected:e2e

## Publishing to a local registry

To test if your changes will actually work once the changes are published,
it can be useful to publish to a local registry.

> We may adopt [Nx' local-registry script approach](https://github.com/nrwl/nx/blob/master/CONTRIBUTING.md#publishing-to-a-local-registry) by providing [a script](https://github.com/nrwl/nx/blob/master/scripts/local-registry.sh).

To publish packages to a local registry, do the following:

1. Install `npm install -g verdaccio` or refer to the [Verdaccio installation docs for other options](https://verdaccio.org/docs/installation).
2. Start Verdaccio by running `verdaccio` in a terminal
3. From the plugin project root run `nx build forge`
4. Make sure the `version` field in `dist/packages/forge/package.json` is unique (not yet published, you may use `9.9.9-alpha.1` and increase the alpha count on each subsequent release).
5. From `dist/packages/forge` run `npm publish --registry=http://localhost:4873/`
6. On the consumer side you can now install the latest package version by running `npm i @toolsplus/nx-forge@latest --registry=http://localhost:4873`
