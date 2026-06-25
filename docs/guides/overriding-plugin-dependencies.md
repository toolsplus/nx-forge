# Overriding plugin dependencies

The Nx Forge plugin has a dependency on `@forge/manifest` that allows the plugin to read and validate Forge app manifest files. Since the Forge platform evolves fairly quickly and new features are being added to the manifest, you may see the Nx Forge plugin fail to parse your Forge app's manifest file. This is often because the manifest parser used by the plugin is outdated and does not understand the manifest structure required by the new features.

To fix this, you can instruct your package manager to override the dependency version with a different one. Refer to the example below on how you can add overrides based on the package manager you are using.

::: code-group

```json [npm: package.json] 
{
  "overrides": {
    "@forge/manifest": "13.0.0"
  }
}
```

```yaml [pnpm: pnpm-workspace.yaml]
overrides:
  "@forge/manifest": "13.0.0"
```

:::

## References
- [npm package.json overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
- [pnpm overrides](https://pnpm.io/settings#overrides)
