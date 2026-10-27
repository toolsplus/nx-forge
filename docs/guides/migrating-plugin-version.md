# Migrating to a newer plugin version

As of plugin version 2.2.0, the plugin ships with migration scripts that allow you to use the [`nx migrate`](https://nx.dev/packages/nx/documents/migrate) to update your workspace to a newer version of `nx-forge`.

To update to the latest nx-forge version, run the command below and follow the instructions in the terminal output.

```shell
nx migrate @toolsplus/nx-forge@latest
```

Since plugin version 9.0.0, the plugin only ships migrations for plugin versions 7.0.0 and later. If your workspace uses an older plugin version, first update to the latest 8.x version and then to the latest version:

```shell
nx migrate @toolsplus/nx-forge@8
nx migrate @toolsplus/nx-forge@latest
```

Run the migrations of each step with `nx migrate --run-migrations` before you start the next one.

Refer to the [Nx migrate docs](https://nx.dev/packages/nx/documents/migrate) for more details on how to use `nx migrate`.
