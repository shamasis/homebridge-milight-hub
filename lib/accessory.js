const MilightHub = require('./milight');

module.exports = function (homebridge) {
  const
    Service = homebridge.hap.Service,
    Characteristic = homebridge.hap.Characteristic,
    UUIDGen = homebridge.hap.uuid,

    hubs = {};

  const
    COLOR_VARIANTS = {
      "rgbw": true,
      "rgb_cct": true,
      "rgb": true,
      "fut089": true,
      "fut020": true
    },
    WHITE_VARIANTS = {
      "rgbw": true,
      "rgb_cct": true,
      "cct": true,
      "fut089": true,
      "fut091": true
    };

  class MilightAccessory {
    constructor (logger, config) {
      logger.debug('Initialising Milight Accessory.');

      if (!MilightAccessory.isConfigValid(config, logger)) {
        this.disabled = true;
        return;
      }

      this.log = logger;
      this.rfid = String(config.id);
      this.type = String(config.type);
      this.group = String(config.group || 0);
      this.name = String(config.name);
      this.id = UUIDGen.generate(this.friendly);

      this.hub = MilightAccessory.findOrCreateHub(config);
      this.reachable = true;
      this.context = {};

      logger.debug('Accessory %s initialised.', this.friendly);
    }

    get displayName () {
      return this.name || `${MilightAccessory.ACCESSORY_NAME} ${this.type}-${this.rfid}-${this.group}`;
    }

    get friendly () {
      return `${this.type}-${this.rfid}-${this.group}`;
    }

    getPowerState (done) {
      this.fetchState((err, state) => {
        if (err) {
          this.log.error('%s faced error reporting power state', this.friendly);
          this.log.error(err);
          return done(err);
        }

        let powered = state.powered;
        this.log.debug('%s reported power state as %s', this.friendly, powered);
        done(null, powered);
      });
    }

    setPowerState (powerOn, done) {
      this.setState('state', powerOn ? 'on': 'off', (err, state) => {
        if (err) {
          this.log.error('%s faced error reporting power state ' + powerOn, this.friendly);
          this.log.error(err);
          return done(err);
        }

        this.log.debug('%s power state was set to %s (%s)', this.friendly, state.powered, powerOn);
        done(null);
      });
    }

    getBrightness (done) {
      this.fetchState((err, state) => {
        if (err) {
          this.log.error('%s faced error reporting brightness', this.friendly);
          this.log.error(err);
          return done(err);
        }

        let brightness = state.brightness;
        this.log.debug('%s reported brightness as %s', this.friendly, brightness);
        done(null, brightness);
      });
    }

    setBrightness (value, done) {
      this.setState('brightness', value, (err, state) => {
        if (err) {
          this.log.error('%s faced error setting brightness', this.friendly);
          this.log.error(err);
          return done(err);
        }

        this.log.debug('%s brightness was set to %s (%s)', this.friendly, state.brightness, value);
        done(null);
      });
    }

    getColourTemperature (done) {
      this.fetchState((err, state) => {
        if (err) {
          this.log.error('%s faced error reporting temperature', this.friendly);
          this.log.error(err);
          return done(err);
        }

        let temperature = state.temperature;
        this.log.debug('%s reported temperature as %s', this.friendly, temperature);
        done(null, temperature);
      });
    }

    setColourTemperature (value, done) {
      // the bulb mode has to be auto switched to white when temperature is set
      // while being in colour mode
      if (this.context.mode !== 'white') {
        let cachedBulbMode = this.context.mode;

        this.setState('set_white', null, (err, state) => {
          this.context.mode = 'white'; // force context to avoid infinite recursion

          if (err) {
            this.log.error('%s faced error switching to white mode', this.friendly);
            this.log.error(err);
            return done(err);
          }

          this.log.debug('%s switched from %s to %s mode', this.friendly, cachedBulbMode, this.context.mode);
          // recurse into setting temperature
          this.setColourTemperature(value, done);
        });

        return;
      };

      this.setState('color_temp', value, (err, state) => {
        if (err) {
          this.log.error('%s faced error setting temperature', this.friendly);
          this.log.error(err);
          return done(err);
        }

        this.log.debug('%s temperature was set to %s (%s)', this.friendly, state.temperature, value);
        done(null);
      });
    }

    getColourHue (done) {
      this.fetchState((err, state) => {
        if (err) {
          this.log.error('%s faced error reporting hue', this.friendly);
          this.log.error(err);
          return done(err);
        }

        let hue = state.hue;
        this.log.debug('%s reported hue as %s', this.friendly, hue);
        done(null, hue);
      });
    }

    setColourHue (value, done) {
      this.setState('hue', value, (err, state) => {
        if (err) {
          this.log.error('%s faced error setting hue', this.friendly);
          this.log.error(err);
          return done(err);
        }

        this.log.debug('%s hue was set to %s (%s)', this.friendly, state.hue, value);
        done(null);
      });
    }

    getColourSaturation (done) {
      this.fetchState((err, state) => {
        if (err) {
          this.log.error('%s faced error reporting saturation', this.friendly);
          this.log.error(err);
          return done(err);
        }

        let saturation = state.saturation;
        this.log.debug('%s reported saturation as %s', this.friendly, saturation);
        done(null, saturation);
      });
    }

    setColourSaturation (value, done) {
      this.setState('saturation', value, (err, state) => {
        if (err) {
          this.log.error('%s faced error setting saturation', this.friendly);
          this.log.error(err);
          return done(err);
        }

        this.log.debug('%s saturation was set to %s (%s)', this.friendly, state.saturation, value);
        done(null);
      });
    }

    setState (key, value, done) {
      this.hub.command(key, value, this.rfid, this.type, this.group, (err, state) => {
        if (err) { return done(err); }

        // cache the last retrieved bulb mode
        if (state && (this.context.mode !== state.mode)) {
          this.log.debug('%s saving bulb mode %s in context after set', this.friendly, state.mode);
          this.context.mode = state.mode;
        }

        done(null, state);
      });
    }

    fetchState (done) {
      this.hub.state(this.rfid, this.type, this.group, (err, state) => {
        if (err) { return done(err); }

        // cache the last retrieved bulb mode
        if (state && (this.context.mode !== state.mode)) {
          this.log.debug('%s saving bulb mode %s in context after fetch', this.friendly, state.mode);
          this.context.mode = state.mode;
        }

        done(null, state);
      });
    }

    getServices () {
      if (this.services) {
        return this.services;
      }

      let lightbulb = new Service.Lightbulb(this.displayName),
        information = new Service.AccessoryInformation();

      information
        .setCharacteristic(Characteristic.Manufacturer, MilightAccessory.ACCESSORY_NAME)
        .setCharacteristic(Characteristic.Model, this.type)
        .setCharacteristic(Characteristic.SerialNumber, this.rfid);

      lightbulb.getCharacteristic(Characteristic.On)
        .on('get', this.getPowerState.bind(this))
        .on('set', this.setPowerState.bind(this));

      lightbulb.addCharacteristic(Characteristic.Brightness)
        .on('get', this.getBrightness.bind(this))
        .on('set', this.setBrightness.bind(this))
        .setProps({
          minValue: 0,
          maxValue: 255
        });

      WHITE_VARIANTS[this.type] && lightbulb.addCharacteristic(Characteristic.ColorTemperature)
        .on('get', this.getColourTemperature.bind(this))
        .on('set', this.setColourTemperature.bind(this))
        .setProps({
            minValue: 153,
            maxValue: 370
        });

      COLOR_VARIANTS[this.type] && lightbulb.addCharacteristic(Characteristic.Hue)
        .on('get', this.getColourHue.bind(this))
        .on('set', this.setColourHue.bind(this));

      COLOR_VARIANTS[this.type] && lightbulb.addCharacteristic(Characteristic.Saturation)
        .on('get', this.getColourSaturation.bind(this))
        .on('set', this.setColourSaturation.bind(this));

      return (this.services  = [information, lightbulb]);
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

      if (!(WHITE_VARIANTS.hasOwnProperty(config.type) || COLOR_VARIANTS.hasOwnProperty(config.type))) {
        log && log.error('The bulb remote type "%s" is not supported for %s', config.type, config.id);
        return false;
      }

      return true;
    }

    static findOrCreateHub (config) {
      if (hubs[config.hub]) {
        return hubs[config.hub];
      }

      // if hub url is undefined, we use `undefined` string to track default
      return hubs[config.hub] = new MilightHub(config.hub, config.timeout);
    }
  }

  return MilightAccessory;
};
