# Contributing to Nx Forge

## Plugin development

Before you start developing or making any changes to the project, ensure that you have installed the project dependencies via

    npm install

This ensures the project toolchain is set up correctly. Specifically, this will install a husky commit hook that ensures commit messages follow the project guidelines.

### Running unit tests

To execute the unit tests via [Jest](https://jestjs.io) run

    nx test nx-forge

To execute the unit tests affected by a change run

    nx affected:test

### Running end-to-end tests

To build the plugin and run end-to-end tests on a generated project run

    nx run nx-forge-e2e:e2e

Alternatively, you can also use the short from: `nx e2e nx-forge-e2e`.

To execute the end-to-end tests affected by a change

    nx affected:e2e

## Creating a beta release

If you are working on a plugin version that contains breaking changes, it should be first merged into the beta branch. The beta branch will publish beta release beta versions of the plugin, e.g. @toolsplus/nx-forge@3.0.0-beta.1. This is great for acceptance testing before the changes are merged into the main branch.  

## Pre-releasing a branch

If you create a new feature or fix that needs to be tested outside the project before the pull request is being merged you can create a new branch called `test-*` (replace `*` with the short name of your branch, e.g. `test-feat-add-prerelease-config`, or `test-fix-serious-bug`). After that, merge the branch into the `test-*` branch and push it to origin. Semantic release will pick it up and publish a pre-release version.
Once your pull request has been merged you can safely delete the `test-*` branch from origin.

This practice is inspired by this post: https://www.benmvp.com/blog/create-one-off-releases-semantic-release/#supporting-one-off-releases 

## Publishing to a local registry

To test if your changes will actually work once the changes are published, it can be useful to publish to a local registry.

To publish packages to a local registry, do the following:

1. Start Verdaccio by running `nx local-registry` in a terminal. This will become your main registry while the process is running.
2. From the plugin project root run `nx build nx-forge`
3. Make sure the `version` field in `dist/packages/nx-forge/package.json` is unique (not yet published, you may use `9.9.9-alpha.1` and increase the alpha count on each subsequent release).
4. From `dist/packages/nx-forge` run `npm publish`
5.On the consumer side you can now install the latest package version by running `npm i @toolsplus/nx-forge@latest`

Note that as soon as you terminate the process with the local Verdaccio registry, you will get back your previous registry configuration.

## Migrate to a newer Nx version

Refer to https://nx.dev/using-nx/updating-nx for details on updating Nx. The following outlines the major steps to migrate to a newer Nx version.

From the project root run 

    nx migrate latest

This will update Nx project dependencies in package.json and create a migrations.json file.
Make sure package.json changes make sense and then run 

    npm install

Once the npm command completes run

    nx migrate --run-migrations

Once that's complete, delete the migrations.json file.

If this is a Nx major version upgrade, check that the Nx versions listed under `dependencies` and `peerDependencies` in `packages/nx-forge/package.json` are matching the required Nx version.

Finally, proceed with committing and submitting the changes to the repo.  

## Update plugin dependencies

If you are add or update plugin dependencies that the nx-forge plugin depends on, i.e. not dependencies used to build the nx-forge plugin, their version must be updated in `packages/nx-forge/package.json` to match the installed version. There are ESLint rules in place to verify that this correct and that all plugin dependencies are declared in the package.json.
