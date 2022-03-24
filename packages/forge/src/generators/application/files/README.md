# <%= name %>

## Prerequisites

Before you can start using this app with Forge make sure to initially build the app using

    nx build <%= name %>

After that, proceed with the initial registration of the app with the Forge platform by running the following commands from the dist directory:  

    forge register
    forge deploy
    forge install


This will initially register the app with the Forge platform, deploy the code and finally install the app on any of your Atlassian applications.

## Dev loop

When the app code changes, the updated code has to rebuilt by calling 

    nx build <%= name %>

and re-deployed to the Forge platform using

    forge deploy

If the app's `manifest.yml` changed, you may have to upgrade an existing installation by running

    forge install --upgrade





