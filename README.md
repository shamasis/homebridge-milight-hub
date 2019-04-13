# homebridge-milight-hub
Homebridge plugin for Milight Hub hosted on ESP8266 using [https://github.com/sidoh/esp8266_milight_hub](https://github.com/sidoh/esp8266_milight_hub)

```
npm install homebridge-milight-hub -g
```


```
{
  accessories: [
    accessory: 'Milight',
    name: 'Bulb 1',
    id: '0x3039',
    type: 'fut089',
    group: '1',
    hub: 'http://milight-hub.local'
  }]
}
```
