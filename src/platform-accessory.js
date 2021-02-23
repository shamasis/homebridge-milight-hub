const request = require('request'),
  {MANUFACTURER, PACKAGE_VERSION} = require('./settings');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
class MilightPlatformAccessory {
  
  constructor(platform/*: MilightPlatform*/, accessory/*: PlatformAccessory*/) {
    this.platform = platform;
    this.accessory = accessory;
    this.device = this.accessory.context.device || (this.accessory.context.device = {});
    this.state = this.accessory.context.state || (this.accessory.context.state = {});

    /**
     * These are just used to create a working example
     * You should implement your own code to track the state of your accessory
     */
    (typeof this.state.status !== 'string') && (this.state.status = 'off');
    (!Number.isFinite(this.state.level)) && (this.state.level = 50);
    (!Number.isFinite(this.state.color_temp)) && (this.state.color_temp = 262);
    (!Number.isFinite(this.state.hue)) && (this.state.hue = 0);
    (!Number.isFinite(this.state.saturation)) && (this.state.saturation = 0);

    this.request = request.defaults({
      baseUrl: this.platform.config.hub,
      uri: `/gateways/${this.device.deviceId}/${this.device.remoteType}/${this.device.deviceGroup}`,
      json: true,
      timeout: 5000
    });

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)
      .setCharacteristic(this.platform.Characteristic.Manufacturer, MANUFACTURER)
      .setCharacteristic(this.platform.Characteristic.Model, PACKAGE_VERSION)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `${this.device.deviceId}-${this.device.remoteType}-${this.device.deviceGroup}`);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setOn.bind(this))
      .on('get', this.getOn.bind(this));

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .on('set', this.setBrightness.bind(this))
      .on('get', this.getBrightness.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Hue)
      .on('set', this.setHue.bind(this))
      .on('get', this.getHue.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Saturation)
      .on('set', this.setSaturation.bind(this))
      .on('get', this.getSaturation.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
      .on('set', this.setColorTemperature.bind(this))
      .on('get', this.getColorTemperature.bind(this))
      .setProps({
        minValue: 153,
        maxValue: 370
      });
  }

  setOn(value/*: CharacteristicValue*/, callback/*: CharacteristicSetCallback*/) {
    value = Boolean(value);

    // implement your own code to turn your device on/off
    this.state.status = value ? 'on' : 'off';

    this.request({
      method: 'put',
      json: {
        status: this.state.status,
        level: this.state.level
      }
    }, (err, res) => {
      this.platform.log.debug('Set Characteristic On ->', value);
      callback(err);
    });
  }

  getOn(callback/*: CharacteristicGetCallback*/) {
    const value = (this.state.status === 'on');
    this.platform.log.debug('Get Characteristic On ->', value);
    callback(null, value);
  }

  setBrightness(value/*: CharacteristicValue*/, callback/*: CharacteristicSetCallback*/) {
    value = Number(value);
    
    // implement your own code to set the brightness
    this.state.level = value;

    this.request({
      method: 'put',
      json: {
        status: this.state.status,
        level: this.state.level
      }
    }, (err, res) => {
      this.platform.log.debug('Set Characteristic Brightness -> ', value);
      callback(err);
    });
  }

  getBrightness(callback/*: CharacteristicGetCallback*/) {
    const value = this.state.level;
    this.platform.log.debug('Get Characteristic Brightness ->', value);
    callback(null, value);
  }

  setHue(value, callback) {
    value = Number(value);
    this.state.hue = value;

    this.request({
      method: 'put',
      json: {
        status: this.state.status,
        level: this.state.level,
        hue: this.state.hue,
        saturation: this.state.saturation
      }
    }, (err, res) => {
      this.platform.log.debug('Set Characteristic Hue -> ', value);
      callback(err);
    });
  }

  getHue(callback) {
    const value = this.state.hue;
    this.platform.log.debug('Get Characteristic Hue -> ', value);
    callback(null, value);
  }

  setSaturation(value, callback) {
    value = Number(value);
    this.state.saturation = value;

    this.request({
      method: 'put',
      json: {
        status: this.state.status,
        level: this.state.level,
        hue: this.state.hue,
        saturation: this.state.saturation
      }
    }, (err, res) => {
      this.platform.log.debug('Set Characteristic Saturation -> ', value);
      callback(err);
    });
  }

  getSaturation(callback) {
    const value = this.state.saturation;
    this.platform.log.debug('Get Characteristic Saturation -> ', value);
    callback(null, value);
  }

  setColorTemperature(value, callback) {
    value = Number(value);
    this.state.color_temp = value;

    this.request({
      method: 'put',
      json: {
        status: this.state.status,
        level: this.state.level,
        color_temp: this.state.color_temp
      }
    }, (err, res) => {
      this.platform.log.debug('Set Characteristic ColorTemperature -> ', value);
      callback(err);
    });
  }

  getColorTemperature(callback) {
    const value = this.state.color_temp;
    this.platform.log.debug('Get Characteristic ColorTemperature -> ', value);
    callback(null, value);
  }
}

module.exports = {MilightPlatformAccessory};