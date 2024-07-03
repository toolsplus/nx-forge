# Generators

Documents [the generators](https://nx.dev/features/generate-code) provided by the Nx Forge plugin.

Append `--help` or `-h` for any of the plugin generators to explore all available options.

[//]: # (Used https://brianwendt.github.io/json-schema-md-doc/ to generate the properties markdown from schema.json files)

## Application

```shell
nx generate @toolsplus/nx-forge:app <nx-forge-app-name>
```

Generates a blank Forge app project named `<nx-forge-app-name>`. In almost all cases, you probably want to run [the Forge app registration task](executors#register) immediately after this generator to register the app with the Forge platform.

**_Properties_**

- <b id="#NxForgeApplicationGenerator/properties/name">name</b> `required`
  - _Name of the application._
  - Type: `string`
- <b id="#NxForgeApplicationGenerator/properties/directory">directory</b>
  - _Directory where the project is placed_
  - Type: `string`
- <b id="#NxForgeApplicationGenerator/properties/bundler">bundler</b>
  - _Bundler which is used to package the application_
  - Type: `string`
  - The value is restricted to the following:
    1. _"esbuild"_
    2. _"webpack"_
  - Default: _"webpack"_
- <b id="#NxForgeApplicationGenerator/properties/projectNameAndRootFormat">projectNameAndRootFormat</b>
  - _Whether to generate the project name and root directory as provided (`as-provided`) or generate them composing their values and taking the configured layout into account (`derived`)._
  - Type: `string`
  - The value is restricted to the following:
    1. _"as-provided"_
    2. _"derived"_
- <b id="#NxForgeApplicationGenerator/properties/skipFormat">skipFormat</b>
  - _Skip formatting files._
  - Type: `boolean`
  - Default: _false_
- <b id="#NxForgeApplicationGenerator/properties/linter">linter</b>
  - _Tool to use for running lint checks._
  - Type: `string`
  - The value is restricted to the following:
    1. _"eslint"_
    2. _"none"_
  - Default: _"eslint"_
- <b id="#NxForgeApplicationGenerator/properties/unitTestRunner">unitTestRunner</b>
  - _Test runner to use for unit tests._
  - Type: `string`
  - The value is restricted to the following:
    1. _"jest"_
    2. _"none"_
  - Default: _"jest"_
- <b id="#NxForgeApplicationGenerator/properties/tags">tags</b>
  - _Add tags to the project (used for linting)_
  - Type: `string`
- <b id="#NxForgeApplicationGenerator/properties/swcJest">swcJest</b>
  - _Use `@swc/jest` instead `ts-jest` for faster test compilation._
  - Type: `boolean`
  - Default: _false_
- <b id="#NxForgeApplicationGenerator/properties/babelJest">babelJest</b> <Badge type="warning" text="Deprecated" />
  - _Use `babel` instead of `ts-jest`._
  - Type: `boolean`
  - Default: _false_
  - _Deprecated: Use `--swcJest` instead_
- <b id="#NxForgeApplicationGenerator/properties/js">js</b>
  - _Generate JavaScript files rather than TypeScript files._
  - Type: `boolean`
  - Default: _false_
- <b id="#NxForgeApplicationGenerator/properties/setParserOptionsProject">setParserOptionsProject</b>
  - _Whether or not to configure the ESLint `parserOptions.project` option. We do not do this by default for lint performance reasons._
  - Type: `boolean`
  - Default: _false_
