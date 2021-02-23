# homebridge-milight-hub

> v2.0.0 beta is under development. v2.0.0 is NOT compatible with v1. You will need to re-setup your config and bulbs for v2.0.0

This allows HomeKit (Siri) to control your MiLights using Homebridge and [DIY Milight Hub](https://github.com/sidoh/esp8266_milight_hub) hosted on ESP8266 (or equivalent).

> This plugin is intended to be used with DIY [Milight Hub](https://github.com/sidoh/esp8266_milight_hub) RF to Wifi setup. If you already have Milight 2.4G RF Bridge, then you should directly use [homebridge-milight](https://www.npmjs.com/package/homebridge-milight) plugin.

## Installation

To begin, you will need the following:

1. A working installation of [Homebridge](https://homebridge.io). Homebridge is a nifty software platform running on any computer or even a Raspberry Pi and allows you to integrate with smart home devices that do not support the HomeKit protocol.

2. A working setup of [Milight Hub](https://github.com/sidoh/esp8266_milight_hub) on an ESP8266 IoT SOC (NodeMCU, etc.)

If you have the above two working, then the rest is as simple as installing this plugin and configuring the lights.

Within your homebridge system, install the plugin using the command:
```terminal
npm install homebridge-milight-hub -g;
```

Once the plugin is installed, edit homebridge `config.json` to include the following within `accessories` section. The following are the minimum required configuration parameters:

- The `"accessory"` key must have `"Milight"` as value
- The bulb must be provided a name to begin with
- You should have the "group" and "id" of the bulb as defined in your Milight Hub web interface when you paired it.

```
{
  "accessories": [{
    "accessory": "Milight",
    "name": "My Bulb Name",
    "id": "0x3039",
    "group": "1"
  }]
}
```

Repeat this for as many bulbs as you have.

You can optionally add more advanced configuration such as:

- `"type"` can be the remote type Milight Hub is to emulate, such as `"fut089"` (default), `"rgb"`, etc
- `"hub"` the URL of the hub. This is set to `"http://milight-hub.local"` as default and should work out of the box.
- `"white"` can be set to boolean `true` if your bulb does not support colour.

## Usage

Once the plugin is installed and Homebridge restarted, the bulb should appear within the Home app of your ios devices.

## Future Roadmap

- [ ] Add Homebridge platform support for automatic configuration of bulbs (waiting on APIs on Milight Hub.)
