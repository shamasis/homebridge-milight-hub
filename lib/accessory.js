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
      this.hub = new MilightHub(config.hub, config.timeout);
      this.bulb = new MilightBulb('unlisted', config.type, config.id, config.group, this.hub);

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
        .on('get', (callback) => {
          this.log.debug('%s to report power state [boolean] (͍↔%s)', this.identifier, this.bulb.powered);

          this.bulb.getPower((err, powered) => {
            if (err) {
              this.log.error('%s encountered error while fetching power state', this.identifier);
              this.log.error(err);
              return callback(err);
            }

            this.log.debug('%s reported power state [boolean] as: %s (↔%s)', this.identifier, powered,
              this.bulb.powered);
            callback(null, powered);
          });
        })
        .on('set', (value, callback) => {
          this.log.debug('%s to update its power state [boolean] %s→%s', this.identifier, this.bulb.powered, value);

          this.bulb.setPower(value, (err, powered) => {
            if (err) {
              this.log.error('$s encountered error while setting power state', this.identifier);
              this.log.error(err);
              return callback(err);
            }

            this.log.debug('%s updated power state [boolean] to %s (↔%s)', this.identifier, value, this.bulb.powered);
            callback(null, powered);
          })
        });

      lightbulb.addCharacteristic(Characteristic.Brightness)
        .on('get', (callback) => {
          this.log.debug('%s to report brightness [0-255] (↔%s)', this.identifier, this.bulb.brightness);

          this.bulb.getBrightness((err, brightness) => {
            if (err) {
              this.log.error('%s encountered error while fetching brightness', this.identifier);
              this.log.error(err);
              return callback(err);
            }

            this.log.debug('%s reported brightness [0-255] as: %s (↔%s)', this.identifier, brightness,
              this.bulb.brightness);
            callback(null, brightness);
          });
        })
        .on('set', (value, callback) => {
          this.log.debug('%s to update its brightness [0-255] %s→%s', this.identifier, this.bulb.brightness, value);

          this.bulb.setBrightness(value, (err, brightness) => {
            if (err) {
              this.log.error('$s encountered error while setting brightness', this.identifier);
              this.log.error(err);
              return callback(err);
            }

            this.log.debug('%s updated brightness [0-255] to %s (↔%s)', this.identifier, value, this.bulb.brightness);
            callback(null, brightness);
          })
        })
        .setProps({
          minValue: 0,
          maxValue: 255
        });

      this.bulb.white && lightbulb.addCharacteristic(Characteristic.ColorTemperature)
        .on('get', (callback) => {
          this.log.debug('%s to report temperature [153-370] (↔%s)', this.identifier, this.bulb.temperature);

          this.bulb.getColourTemperature((err, temperature) => {
            if (err) {
              this.log.error('%s encountered error while fetching temperature', this.identifier);
              this.log.error(err);
              return callback(err);
            }

            this.log.debug('%s reported temperature [153-370] as: %s (↔%s)', this.identifier, temperature,
              this.bulb.temperature);
            callback(null, temperature);
          });
        })
        .on('set', (value, callback) => {
          this.log.debug('%s to update its temperature [153-370] %s→%s', this.identifier, this.bulb.temperature, value);

          this.bulb.setColourTemperature(value, (err, temperature) => {
            if (err) {
              this.log.error('$s encountered error while setting temperature', this.identifier);
              this.log.error(err);
              return callback(err);
            }

            this.log.debug('%s updated temperature [153-370] to %s (↔%s)', this.identifier, value, this.bulb.temperature);
            callback(null, temperature);
          })
        })
        .setProps({
            minValue: 153,
            maxValue: 370
        });

      this.bulb.rgb && lightbulb.addCharacteristic(Characteristic.Hue)
        .on('get', (callback) => {
          this.log.debug('%s to report hue [0-359] (↔%s)', this.identifier, this.bulb.hue);

          this.bulb.getHue((err, hue) => {
            if (err) {
              this.log.error('%s encountered error while fetching hue', this.identifier);
              this.log.error(err);
              return callback(err);
            }

            this.log.debug('%s reported hue [0-359] as: %s (↔%s)', this.identifier, hue,
              this.bulb.hue);
            callback(null, hue);
          });
        })
        .on('set', (value, callback) => {
          this.log.debug('%s to update its hue [0-359] %s→%s', this.identifier, this.bulb.hue, value);

          this.bulb.setHue(value, (err, hue) => {
            if (err) {
              this.log.error('$s encountered error while setting hue', this.identifier);
              this.log.error(err);
              return callback(err);
            }

            this.log.debug('%s updated hue [0-359] to %s (↔%s)', this.identifier, value, this.bulb.hue);
            callback(null, hue);
          })
        });

      this.bulb.rgb && lightbulb.addCharacteristic(Characteristic.Saturation)
        .on('get', (callback) => {
          this.log.debug('%s to report saturation [0-100] (↔%s)', this.identifier, this.bulb.saturation);

          this.bulb.getSaturation((err, saturation) => {
            if (err) {
              this.log.error('%s encountered error while fetching saturation', this.identifier);
              this.log.error(err);
              return callback(err);
            }

            this.log.debug('%s reported saturation [0-100] as: %s (↔%s)', this.identifier, saturation,
              this.bulb.saturation);
            callback(null, saturation);
          });
        })
        .on('set', (value, callback) => {
          this.log.debug('%s to update its saturation [0-100] %s→%s', this.identifier, this.bulb.saturation, value);

          this.bulb.setSaturation(value, (err, saturation) => {
            if (err) {
              this.log.error('$s encountered error while setting saturation', this.identifier);
              this.log.error(err);
              return callback(err);
            }

            this.log.debug('%s updated saturation [0-100] to %s (↔%s)', this.identifier, value, this.bulb.saturation);
            callback(null, saturation);
          })
        });

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
