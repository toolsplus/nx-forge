# Generators

Documents [the generators](https://nx.dev/features/generate-code) provided by the Nx Forge plugin.

Append `--help` or `-h` for any of the plugin generators to explore all available options.

## Application

```shell
nx generate @toolsplus/nx-forge:app apps/<nx-forge-app-name>
```

Generates a blank Forge app project named `<nx-forge-app-name>`. In almost all cases, you probably want to run [the Forge app registration task](executors#register) immediately after this generator to register the app with the Forge platform.

### Options

<!-- nx-forge:options generator=application -->
