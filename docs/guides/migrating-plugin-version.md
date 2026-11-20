<script setup>
const nxVersion = 24
</script>

# Migrating to a newer plugin version

The plugin ships migration scripts for [`nx migrate`](https://nx.dev/packages/nx/documents/migrate). They update your workspace when you move to a newer version of `@toolsplus/nx-forge`.

::: tip Major versions
A major version can need steps that `nx migrate` cannot do for you. Read the upgrade guide for the version first. For version 10, see [Upgrading to v10](upgrading-to-v10.md).
:::

## Updating Nx first

Each plugin version supports the Nx versions in its `nx` peer dependency. The current plugin version requires Nx {{nxVersion}}.

`nx migrate` only updates the package you name. If the new plugin version requires a newer Nx version, update Nx first:

```shell-vue
nx migrate {{nxVersion}}
nx migrate --run-migrations
```

Follow the instructions in the terminal output before you continue.

## Updating the plugin

Update the plugin and run its migrations:

```shell
nx migrate @toolsplus/nx-forge@latest
nx migrate --run-migrations
```

The migrations print next steps for changes they cannot make. Work through them, then build, package and deploy an app to check the result.

Refer to the [Nx migrate docs](https://nx.dev/packages/nx/documents/migrate) for more details on how to use `nx migrate`.
