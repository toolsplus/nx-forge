# Transforming the manifest

When developing, it is common to update the Forge manifest file before deploying the application. For this purpose, [the `deploy` executor](../reference/executors.md#deploy) provides the `manifestTransform` configuration property to add, update, or remove properties from the manifest.yml file.

To transform the manifest file, Nx Forge expects the `manifestTransform` to be a valid [JSONata](https://jsonata.org/) expression. The JSONata expression is given the Forge manifest content as input and is expected to return valid Forge manifest content as output. The [JSONata `transform` operator](https://docs.jsonata.org/other-operators#-------transform) (**... ~> | ... | ... |**) is ideal for this and will be used in the following examples.

## Developing and testing manifest transforms

To develop manifest transform expressions, convert the manifest YAML content to JSON and paste it into [the JSONata exerciser](https://try.jsonata.org/), allowing you to test JSONata expressions.

If you are [injecting environment variables in your expression](#using-environment-variables-in-transforms), you may want to use the following code block to emulate the `$env` function:

```jsonata
(
    $env := $lookup({
        'CONNECT_APP_KEY': 'io.toolsplus.hello',
        'CONNECT_REMOTE_BASE_URL': 'https://connect-base-url.com'
    }, ?);
    
    $ ~> |app.connect|{'key': $env('CONNECT_APP_KEY')}| ~> |remotes[key='connect']|{'baseUrl': $env('CONNECT_REMOTE_BASE_URL')}|
)
```

## Manifest transform examples

Below is a list of manifest transform examples to get you started. Note that `$` in the following examples always refers to the manifest root. Refer to the [JSONata `transform` operator and documentation](https://docs.jsonata.org/other-operators#-------transform) for more details on how to write JSONata expressions.

### Replacing or adding a property

Replacing or adding the `app.id` property with the given value:

```jsonata
$ ~> |app|{'id': 'ari:cloud:ecosystem::app/407bc6a8-...'}|
```

### Deleting a property

Deleting the `app.licensing` property:
```jsonata
$ ~> |app|{}, ['licensing']|
```

### Chaining multiple transforms

```jsonata
$ 
~> |app|{'id': 'ari:cloud:ecosystem::app/407bc6a8-...'}|
~> |app|{'licensing': {'enabled': true}}|
~> |app.connect|{'key': 'my-connect-key'}| 
~> |remotes|{'baseUrl': 'https://my-connect-base-url.com'}|
```

## Using environment variables in transforms

Nx Forge provides two functions `$env(string): string` and `$envOrNull(string): string|null` to allow `manifestTransform` expressions to read environment variables at runtime. Prefer the `$env()` function to inject environment variables, as this will throw and abort the deployment process if the variable is undefined. 

```jsonata
$ 
~> |app|{'id': $env('APP_ID')}|
~> |app|{'licensing': {'enabled': $env('APP_LICENSING_ENABLED') = 'true' ? true : false}}|
```

## Configuring transforms for different Forge environments

Nx executors accept a [`configurations` property](https://nx.dev/concepts/executors-and-configurations#use-task-configurations) to configure presets to be merged into the executor options when activated. This Nx-built-in feature allows configuring different manifest transforms based on the Forge environment the executor is deploying to. Below is an example of different manifest transform configurations.

:::code-group
```json[project.json]
{
    "deploy": {
      "executor": "@toolsplus/nx-forge:deploy",
      "options": {
        "outputPath": "dist/apps/my-forge-app"
      },
      "configurations": {
        "development-exra": {
          "manifestTransform": "$ ~> |app|{'licensing': {'enabled': false}}| ~> |remotes|{'baseUrl': 'https://my-local-connect-base-url.com'}|"
        },
        "development": {
          "manifestTransform": "$ ~> |app|{'licensing': {'enabled': false}}|"
        },
        "staging": {
          "manifestTransform": "$ ~> |app|{'licensing': {'enabled': true}}|"
        },
        "production": {
          "manifestTransform": "$ ~> |app|{'licensing': {'enabled': true}}|"
        }
      }
    }
  }
```
:::

You can name your configurations whatever you like and activate them using the `-c=<configuration-name>` or `--configuration=<configuration-name>` argument on the `deploy` executor.

::: tip

If the configuration name matches one of the Forge environments, `development`, `staging`, or `production`, the `deploy` executor will automatically set the respective Forge environment argument. For example, the following two commands are equivalent:

```shell
nx deploy <my-forge-app> --environment=staging --configuration=staging
```

is the same as

```shell
nx deploy <my-forge-app> --configuration=staging
```
:::
