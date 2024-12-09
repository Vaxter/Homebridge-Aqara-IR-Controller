<img alt="Logo" src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

# Homebridge Aqara Ir AC

## Introduction
Since Aqara is not willing to expose IR based Controllers to to HomeKit, I have decided to hack up this Homebridge plugin...
Took me a couple of hours, so don't expect a smooth experience, but I am willing to fix the issues if someone reports them. :)

This plugin currently works with IR AC only, but can easily be expanded for the rest of the Aqara devices.
I don't think that it makes sense since Aqara already has HomeKit integration for everything else.

Keep in mind that this will NOT work for AC Mode Ird control on new Aqara hubs such as M3, since Aqara API won't even list this as a device.
It works only for manually configured Ird AC controls.

It makes sense for plugin this to be expanded to handle any other Ird control, but I didn't need this.
I might accept wishes, and I will definitively accept pull requests for expansions.

## Setup
Setup is not as straight forward as I would like, but the best one I could hack up with Homebridges UI limitations.

Don't let many of fields to confuse you.

Since Aqara is charging developers for API access after some request numbers have been reached, I have decided to make it a bit more complicated so that nobody has to pay.

Aqara does offer EVERYONE a free Demo application, that everyone can use.

In order to setup an account, go to <a href="https://developer.aqara.com">Aqara Developer website</a> sign up and log into console.

Select Manage Project on the left side, and view Details of the Demo Application.

Demo app has different keys for different server regions.

Select appropriate region in plugin config, and copy the necessary keys of the appropriate region of the demo app.

In the username field of the plugin configuration enter your Aqara username, email or mobile number.

If you now how to generate access token, you can paste it directly and hit bottom save button.

If not, click Proceed, and you will be provided with a field to enter auth code that you will receive over email or SMS.

Once you enter the code plugin will authenticate.

The only thing left for you is to select Home to integrate with (if you have multiple), and plugin will configure your devices.

If home is not selected IR AC remotes from ALL homes will be added.

## Limitations
Right now plugin is not listening to Aqara events, so if you make changes with Aqara app, it will take some time for them to sync.
Handles Celsius only
Handles AC control only
Doesn't have an option to set up cooling/heating range, it's fixed  to 10 - 30

## Future plans
To implement this listener at one point.

It would be cool to make a better interface with better UX.
Homebridge has a terrible way to build interface, especially custom interface, and my plan was to hack this in a couple of hours, so I can't really investigate a way to improve this...
