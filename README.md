# homebridge-milight-hub

This allows HomeKit (Siri) to control your MiLights using Homebridge and [DIY Milight Hub](https://github.com/sidoh/esp8266_milight_hub) hosted on ESP8266 (or equivalent).

> This plugin is intended to be used with DIY [Milight Hub](https://github.com/sidoh/esp8266_milight_hub) RF to Wifi setup. If you already have Milight 2.4G RF Bridge, then you should directly use [homebridge-milight](https://www.npmjs.com/package/homebridge-milight) plugin.

## Installation

To begin, you will need the following:

1. A working installation of [Homebridge](https://homebridge.io). Homebridge is a nifty software platform running on any computer or even a Raspberry Pi and allows you to integrate with smart home devices that do not support the HomeKit protocol.

2. A working setup of [Milight Hub](https://github.com/sidoh/esp8266_milight_hub) on an ESP8266 IoT SOC (NodeMCU, etc.)

If you have the above two working, then the rest is as simple as installing this plugin and configuring the lights.

### Installing using Homebridge Config GUI

The [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x) support of this plugin makes it super easy to install and configure this plugin. If you have Homebridge Config UI installed, the following steps will get you started:

1. Open your Homebridge Config UI page in your browser (usually http://homebridge.local) and navigate to the "Plugins" section on top navigation area
2. In the prominent search box within plugin section, search for "Milight Hub" and you would see one listed from the author `@shamasis`. Click "install".
3. It should complete installation and present you with a settings screen. Use the instructions on the settings screen to configure your Milights.

<img width="794" alt="image" src="https://user-images.githubusercontent.com/232373/109686582-6c804580-7ba8-11eb-99d8-16c87a89edb6.png">


### Installing without Homebridge Config UI

Within your homebridge system, install the plugin using the command:
```terminal
npm install homebridge-milight-hub -g;
```

Once the plugin is installed, edit homebridge `config.json` to include the following within `platforms` section. The following are the minimum required configuration parameters:

- The `"platform"` property must have `"Milight Hub"` as value
- There should be a `"hub"` property with it's value pointing to the URL of your hub (usually http://milight-hub.local.)

```
{
  "platforms": [{
    "platform": "Milight Hub",
    "hub": "http://milight-hub.local",
    "devices": [ ]
  }]
}
```

#### Configuring bulbs in config

The `"devices"` section in the config will be the place where you will define each bulb. The config of one bulb would need a `"displayName"` to name the bulb and few other configuration values.

```
{
  "displayName": "Kitchen Walkway Lamp",
  "deviceId": "0x1019",
  "remoteType": "rgb_cct",
  "deviceGroup": 1
}
```

- `"deviceId"` is the numeric identifier of the bulb as paired with the remote.
- `"remoteType"` can be the remote type Milight Hub is to emulate, such as `"fut089"` (default), `"rgb"`, etc
- `"deviceGroup"` is the numeric representation of what group you want to put this bulb in. (Setting this to `0` would trigger all bulbs with same deviceId.)

Repeat this for as many bulbs as you have.

#### Using automatic bulb discovery from the hub.

If you are directly using the Milight Hub's web interface to device devices, those can be automatically brought over to HomeKit by setting the `"autoDiscoverDevices": true` in the platform config.

```
{
  "platforms": [{
    "platform": "Milight Hub",
    "hub": "http://milight-hub.local",
    "autoDiscoverDevices": true
  }]
}
```

<img width="496" alt="image" src="https://user-images.githubusercontent.com/232373/109686315-2aef9a80-7ba8-11eb-8281-21766a4c12b6.png">


## Usage

Once the plugin is installed and Homebridge restarted, the bulb should appear within the Home app of your iOS devices.

### Important usage information

- This plugin requires you to restart Homebridge to apply any config change
- Using the IP Address of the hub in config improves performance
- This hub maintain's it's own state of the bulbs. In case you see them out of sync, make changes (such as toggle power) on Home App and it shoud re-sync.
