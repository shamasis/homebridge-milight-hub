# homebridge-milight-hub

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

Once the plugin is installed, edit homebridge `config.json` to activate plugin. There are two ways to use this plugin:

1. Individual Manually Added Accessories.
2. Adding it as a platform to auto include all `Aliases` defined in `milight-hub.local` web interface.

### (1) Adding Bulbs Directly in Config

 Include the following within `accessories` section. The following are the minimum required configuration parameters:

- The `"accessory"` key must have `"Milight"` as value
- The bulb must be provided a name to begin with
- You should have the "group" and "id" of the bulb as defined in your Milight Hub web interface when you paired it.
- `"type"` can be the remote type Milight Hub is to emulate, such as `"rgb_cct"`, `"rgb"`, `"fut089"`, etc

```
{
  "accessories": [{
    "accessory": "Milight",
    "name": "My Bulb Name",
    "id": "0x3039",
    "type": "rgb_cct",
    "group": "1"
  }]
}
```
Repeat this for as many bulbs as you have.

> You can provide additional `"hub": "[url of your hub]"` in config in case you have multiple hubs or your hub is not
> located using default `http://milight-hub.local` DNS lookup.
>
> RECOMMENDED: Use IP address of your hub, say `http://192.168.0.200`, in hub settings in case DNS lookup takes time
> and makes the bulbs slow to respond.


### (2) Auto adding all bulbs addded directly in Milight Hub

In this manner, you would not need to manually add bulbs. This plugin will automatically list all bulbs that has been
added as an Alias in `milight-hub.local` web interface. To do that, simply add the following in config section.

```
{
  "name": "Milight Hub",
  "platform": "Milight Hub"
}
```

- You can point to a specific milight hub by providing `"hub": "http://<your-hub-ip/"` as optional setting
- You can add multiple hubs
- It is recommended that even for default hub, provide the IP address of the hub in the settings (this makes DNS
  lookup time quite fast.)

#### Device Name (Aliases)
To know more about Milight Hub device aliases, visit [https://github.com/sidoh/esp8266_milight_hub#device-aliases](https://github.com/sidoh/esp8266_milight_hub#device-aliases)

To configure your device aliases, use your browser to open your hub IP address. You will be presented with a page
similar to what is shown below. There you may select your device configuration and then add a Device Name.

![Milight Alias Apr-23-2020 00-39-08](https://user-images.githubusercontent.com/232373/80023519-45bea080-84fb-11ea-9af9-70ca941ed063.gif)


## Usage

Once the plugin is installed, configured and Homebridge restarted, the bulbs should appear within the Home app of your ios/mac devices.
