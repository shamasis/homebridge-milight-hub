const milight = require('./milight')
  MilightHub = milight.MilightHub
  MilightBulb = milight.MilightBulb;

module.exports = function (homebridge) {
  const
    Service = homebridge.hap.Service,
    Characteristic = homebridge.hap.Characteristic,
    UUIDGen = homebridge.hap.uuid;

  class MilightAccessory {
    constructor (logger, config) {
      logger.debug('Initialising Milight Accessory.');

      if (!MilightAccessory.isConfigValid(config, logger)) {
        this.disabled = true;
        return;
      }

      this.log = logger;
      this.hub = new MilightHub(config.hub, config.timeout, this.log);
      this.bulb = new MilightBulb('unlisted', config.type, config.id, config.group, this.hub, this.log);

      this.name = String(config.name);
      this.id = UUIDGen.generate(this.identifier);

      this.services = {};
      this.reachable = true;

      logger.debug('Accessory %s initialised.', this.friendly);
    }

    get displayName () {
      return this.name || `${MilightAccessory.ACCESSORY_NAME} ${this.identifier}`;
    }

    get identifier () {
      return this.bulb.identifier;
    }

    getInfoService () {
      if (this.services.info) {
        return this.services.information;
      }

      let information = new Service.AccessoryInformation();
      this.services.information = information;

      information
        .setCharacteristic(Characteristic.Manufacturer, MilightAccessory.ACCESSORY_NAME)
        .setCharacteristic(Characteristic.Model, this.bulb.type)
        .setCharacteristic(Characteristic.SerialNumber, this.bulb.id);

      return this.services.information;
    }

    getLightbulbService () {
      if (this.services.lightbulb) {
        return this.services.lightbulb;
      }

      let lightbulb = new Service.Lightbulb(this.displayName);
      this.services.lightbulb = lightbulb;

      lightbulb.getCharacteristic(Characteristic.On)
        .on('get', this.bulb.getPower.bind(this.bulb))
        .on('set', this.bulb.setPower.bind(this.bulb));

      lightbulb.addCharacteristic(Characteristic.Brightness)
        .on('get', this.bulb.getBrightness.bind(this.bulb))
        .on('set', this.bulb.setBrightness.bind(this.bulb))
        .setProps({
          minValue: 0,
          maxValue: 255
        });

      this.bulb.white && lightbulb.addCharacteristic(Characteristic.ColorTemperature)
        .on('get', this.bulb.getColourTemperature.bind(this.bulb))
        .on('set', this.bulb.setColourTemperature.bind(this.bulb))
        .setProps({
            minValue: 153,
            maxValue: 370
        });

      this.bulb.rgb && lightbulb.addCharacteristic(Characteristic.Hue)
        .on('get', this.bulb.getHue.bind(this.bulb))
        .on('set', this.bulb.setHue.bind(this.bulb));

      this.bulb.rgb && lightbulb.addCharacteristic(Characteristic.Saturation)
        .on('get', this.bulb.getSaturation.bind(this.bulb))
        .on('set', this.bulb.setSaturation.bind(this.bulb));

      return this.services.lightbulb;
    }

    getServices () {
      return [this.getInfoService(), this.getLightbulbService()];
    }

    static get PLUGIN_NAME () {
      return 'milight';
    }

    static get ACCESSORY_NAME () {
      return 'Milight';
    }

    static isConfigValid (config, log) {
      if (!config) {
        log && log.error('Invalid configuration.');
        return false;
      }

      if (!config.id) {
        log && log.error('Missing "id" in configuration.');
        return false;
      }

      if (!config.type) {
        log && log.error('Unable to register "%s" without a valid type.', config.id);
        return false;
      }

      if (!MilightBulb.isValidType(config.type)) {
        log && log.error('The bulb remote type "%s" is not supported for %s', config.type, config.id);
        return false;
      }

      return true;
    }
  }

  return MilightAccessory;
};
