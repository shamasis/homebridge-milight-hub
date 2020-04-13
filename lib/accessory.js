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

      if (!config) {
        logger.error('Invalid configuration.');
        this.disabled = true;
        return;
      }

      if (!config.id) {
        logger.error('Missing "id" in configuration.');
        this.disabled = true;
        return;
      }

      if (!config.type) {
        logger.error('Unable to register "%s" without a valid type.', config.id);
        this.disabled = true;
        return;
      }

      if (!MilightBulb.isValidType(config.type)) {
        logger.error('The bulb remote type "%s" is not supported for %s', config.type, config.id);
        this.disabled = true;
        return;
      }

      this.log = logger;
      this.hub = new MilightHub(config.hub, config.timeout, this.log);
      this.bulb = new MilightBulb(null, config.type, config.id, config.group, this.hub, this.log);

      this.name = String(config.name);
      this.id = UUIDGen.generate(this.identifier);

      this.services = {};
      this.reachable = true;

      if (config.async !== false) {
        MilightAccessory.enableAutoSynchronise(this.getServices()[1], this.bulb);
      }

      logger.debug('Accessory %s initialised.', this.friendly);
    }

    get displayName () {
      return this.name || `${MilightAccessory.ACCESSORY_NAME} ${this.identifier}`;
    }

    get identifier () {
      return this.bulb.identifier;
    }

    identify (done) {
      this.log('Identifying %s (%s)', this.displayName, this.id);

      // toggle power twice
      this.bulb.togglePower(() => {
        this.bulb.togglePower(done || (() => {
          this.info('%s was blinked in order to identify', this.displayName);
        }));
      });
    }

    getServices () {
      if (!this.services.information) {
        this.services.information = MilightAccessory.createInformationService(this.bulb);
      }

      if (!this.services.lightbulb) {
        this.services.lightbulb = MilightAccessory.createLightbulbService(this.bulb, this.displayName);
      }

      return [this.services.information, this.services.lightbulb];
    }

    static get PLUGIN_NAME () {
      return 'milight';
    }

    static get ACCESSORY_NAME () {
      return 'Milight';
    }

    static get characteristics () {
      return {
        powered: Characteristic.On,
        brightness: Characteristic.Brightness,
        hue: Characteristic.Hue,
        saturation: Characteristic.Saturation,
        temperature: Characteristic.ColorTemperature
      };
    }

    static enableAutoSynchronise (service, bulb, interval = 10000) {
      if (service.__hub_polling) {
        MilightAccessory.disableAutoSynchronise(service);
      }

      let gutter = interval  * 0.8;

      service.__hub_polling = setInterval(() => {
        let msSinceLastSynchronised = (Date.now() - bulb.synchronisedAt);

        if (msSinceLastSynchronised < gutter) {
          bulb.log.debug('%s skipped polling since it was synchronised %s seconds ago', bulb.identifier,
            msSinceLastSynchronised / 1000);
          return;
        }

        bulb.log.debug('%s will be polled to fetch latest state', bulb.identifier);
        bulb.state((err) => {
          if (err) {
            bulb.log.error('Unable to update characteristics while polling');
            bulb.log.error(err);
          }

          MilightAccessory.updateLightbulbCharacteristics(service, bulb);
        });
      }, interval);
    }

    static disableAutoSynchronise (service) {
      if (service.__hub_polling) {
        clearTimeout(service.__hub_polling);
      }
    }

    static createInformationService (bulb) {
      let information = new Service.AccessoryInformation();

      information
        .setCharacteristic(Characteristic.Manufacturer, MilightAccessory.ACCESSORY_NAME)
        .setCharacteristic(Characteristic.Model, bulb.type)
        .setCharacteristic(Characteristic.SerialNumber, bulb.id);

      return information;
    }

    static createLightbulbService (bulb, name) {
      let lightbulb = new Service.Lightbulb(name || bulb.identifier);
      lightbulb.subtype = 'lightbulb';

      lightbulb.getCharacteristic(Characteristic.On)
        .on('get', bulb.getPower.bind(bulb))
        .on('set', bulb.setPower.bind(bulb));

      lightbulb.addCharacteristic(Characteristic.Brightness)
        .on('get', bulb.getBrightness.bind(bulb))
        .on('set', bulb.setBrightness.bind(bulb))
        .setProps({
          minValue: 0,
          maxValue: 255
        });

      bulb.white && lightbulb.addCharacteristic(Characteristic.ColorTemperature)
        .on('get', (callback) => {
          bulb.getColourTemperature((err, temperature) => {
            if (err) { return callback(err); }

            // homekit color picker disparity fix (causes issues in eve picker)
            if (bulb.mode === 'white') {
              lightbulb.getCharacteristic(Characteristic.Hue).updateValue(bulb.hue);
              lightbulb.getCharacteristic(Characteristic.Saturation).updateValue(bulb.saturation);
              lightbulb.getCharacteristic(Characteristic.Brightness).updateValue(bulb.brightness);
            }

            callback(null, temperature);
          });
        })
        .on('set', (value, callback) => {
          bulb.setColourTemperature(value, (err, temperature) => {
            if (err) { return callback(err); }

            // homekit color picker disparity fix (causes issues in eve picker)
            if (bulb.mode === 'white') {
              lightbulb.getCharacteristic(Characteristic.Hue).updateValue(bulb.hue);
              lightbulb.getCharacteristic(Characteristic.Saturation).updateValue(bulb.saturation);
              lightbulb.getCharacteristic(Characteristic.Brightness).updateValue(bulb.brightness);
            }

            callback(null, temperature);
          });
        })
        .setProps({
            minValue: 153,
            maxValue: 370
        });

      bulb.rgb && lightbulb.addCharacteristic(Characteristic.Hue)
        .on('get', bulb.getHue.bind(bulb))
        .on('set', bulb.setHue.bind(bulb));

      bulb.rgb && lightbulb.addCharacteristic(Characteristic.Saturation)
        .on('get', bulb.getSaturation.bind(bulb))
        .on('set', bulb.setSaturation.bind(bulb));

      return lightbulb;
    }

    static updateLightbulbCharacteristics (lightbulb, bulb) {
      for (let [prop, charactersitc] of Object.entries(MilightAccessory.characteristics)) {
        lightbulb.getCharacteristic(charactersitc).updateValue(bulb[prop]);
      }
    }
  }

  return MilightAccessory;
};
