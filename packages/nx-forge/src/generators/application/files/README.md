# <%= name %>

For the most up-to-date Nx Forge plugin documentation refer to https://toolsplus.github.io/nx-forge/

## Prerequisites

Before you can start using this app with Forge make sure to initially build the app using

    nx build <%= name %>

and package it using

    nx package <%= name %>

After that, proceed with the initial registration of the app with the Forge platform by running the following commands (from the workspace root):

    nx register <%= name %>
    nx deploy <%= name %>
    nx install <%= name %> --site <my-atlassian-site.atlassian.net> --product jira --no-interactive

This will initially register the app with the Forge platform, deploy the code and finally install the app on any of your Atlassian applications.

## Tunnel-based dev loop

Before you tunnel a Forge app, make sure you have completed the prerequisites steps above. After that, run

    nx tunnel <%= name %>

This will start the `tunnel` target for all UI projects defined in the app `manifest.yml` on their specified tunnel port. After that, it will start a build process in watch mode for the Forge app itself, before ultimately, starting the `forge tunnel` process for the Forge app.

## Manual dev loop

When the app code changes, the updated code has to rebuilt by calling

    nx build <%= name %>

then re-packaged with

    nx package <%= name %>

and re-deployed to the Forge platform using

    nx deploy <%= name %>

If the app's `manifest.yml` changed, you may have to upgrade an existing installation by running

     nx install <%= name %> --site <my-atlassian-site.atlassian.net> --product jira --upgrade
