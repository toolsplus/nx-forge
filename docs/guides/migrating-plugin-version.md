# Migrating to a newer plugin version

As of plugin version 2.2.0, the plugin ships with migration scripts that allow you to use the [`nx migrate`](https://nx.dev/packages/nx/documents/migrate) to update your workspace to a newer version of `nx-forge`.

Each plugin version supports the Nx versions in its `nx` peer dependency, for example plugin version 9 requires Nx 24. `nx migrate` only updates the package you name, so if the new plugin version requires a newer Nx version, update Nx first and then the plugin. Run the migrations of each step and follow the instructions in the terminal output before you start the next step:

```shell
nx migrate 24
nx migrate --run-migrations
nx migrate @toolsplus/nx-forge@latest
nx migrate --run-migrations
```

Since plugin version 9.0.0, the plugin only ships migrations for plugin versions 7.0.0 and later. If your workspace uses an older plugin version, first update the plugin to the latest 8.x version, which requires Nx 23, and then follow the steps above:

```shell
nx migrate 23
nx migrate --run-migrations
nx migrate @toolsplus/nx-forge@8
nx migrate --run-migrations
```

Refer to the [Nx migrate docs](https://nx.dev/packages/nx/documents/migrate) for more details on how to use `nx migrate`.
