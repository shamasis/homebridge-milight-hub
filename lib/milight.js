const request = require('request'),
  utils = require('./utils'),
  EventEmitter = require('events');

const POWER_STATES = {
  'ON': 'on',
  'OFF': 'off',
  'true': 'on',
  'false': 'off'
};

const BULB_MODES = {
  'white': 'white',
  'color': 'color'
};

const QUEUABLE_COMMANDS = {
  'set_white': true
};

const COLOR_VARIANTS = {
  "rgbw": true,
  "rgb_cct": true,
  "rgb": true,
  "fut089": true,
  "fut020": true
};

const WHITE_VARIANTS = {
  "rgbw": true,
  "rgb_cct": true,
  "cct": true,
  "fut089": true,
  "fut091": true
};

/**
 * @class MilightBulb
 * @extends EventEmitter
 */
class MilightBulb extends EventEmitter {
  constructor (alias, type, id, group, hub) {
    super();

    this.alias = alias;
    this.type = type;
    this.id = id;
    this.group = group;
    this.hub = hub;
    this.context = {};
  }

  get identifier () {
    return `${this.type}-${this.id}-${this.group}`;
  }

  get rgb () {
    return COLOR_VARIANTS.hasOwnProperty(this.type);
  }

  get white () {
    return WHITE_VARIANTS.hasOwnProperty(this.type);
  }

  get powered () {
    return this.context.powered;
  }

  set powered (value) {
    return this.context.powered = value;
  }

  get mode () {
    return this.context.mode;
  }

  set mode (value) {
    return this.context.mode = value;
  }

  get brightness () {
    return this.context.brightness;
  }

  set brightness (value) {
    return this.context.brightness = value;
  }

  get temperature () {
    return this.context.temperature;
  }

  set temperature (value) {
    return this.context.temperature = value;
  }

  get hue () {
    return this.context.hue;
  }

  set hue (value) {
    return this.context.hue = value;
  }

  get saturation () {
    return this.context.saturation;
  }

  set saturation (value) {
    return this.context.saturation = value;
  }

  synchronise (state) {
    Object.entries(state).forEach(entry => this[entry[0]] = entry[1]);
    return state;
  }

  state (done) {
    this.hub.state(this.id, this.type, this.group, (err, state) => {
      if (err) { return done(err); }
      if (!state) { return done(new Error('State not received')); }

      done(null, this.synchronise(state));
    });
  }

  command (key, value, done) {
    this.hub.command(key, value, this.id, this.type, this.group, (err, state) => {
      if (err) { return done(err); }
      if (!state) { return done(new Error('State not received')); }

      done(null, this.synchronise(state));
    });
  }

  getPower (done) {
    this.state((err, state) => {
      if (err) { return done(err); }

      done(err, state.powered);
    })
  }

  setPower (value, done) {
    if (typeof value !== 'boolean') {
      return done(new Error('Invalid power state'));
    }

    this.command('state', POWER_STATES[value], done);
  }

  getBrightness (done) {
    this.state((err, state) => {
      if (err) { return done(err); }
      done(err, state.brightness);
    })
  }

  setBrightness (value, done) {
    if (!Number.isFinite(value)) { // && (value < 0 || value > 255)
      return done(new Error('Invalid brightness value'));
    }

    this.command('brightness', value, done);
  }

  getColourTemperature (done) {
    this.state((err, state) => {
      if (err) { return done(err); }
      done(err, state.brightness);
    })
  }

  setColourTemperature (value, done) {
    // do mode change for white
    if (this.mode !== BULB_MODES.white) {
      return this.command('set_white', null, (err) => {
        if (err) { return done(err); }
        this.setColourTemperature(value, done);
      });
    }

    if (!Number.isFinite(value)) { // && (value < 153 || value > 370)
      return done(new Error('Invalid temperature value'));
    }

    this.command('color_temp', value, done);
  }

  getHue (done) {
    this.state((err, state) => {
      if (err) { return done(err); }
      done(err, state.hue);
    })
  }

  setHue (value, done) {
    if (!Number.isFinite(value)) { // @todo note the range
      return done(new Error('Invalid hue value'));
    }
    this.command('hue', value, done);
  }

  getSaturation (done) {
    this.state((err, state) => {
      if (err) { return done(err); }
      done(err, state.saturation);
    })
  }

  setSaturation (value, done) {
    if (!Number.isFinite(value)) { // @todo note the range
      return done(new Error('Invalid saturation value'));
    }
    this.command('saturation', value, done);
  }

  static isValidType (type) {
    return COLOR_VARIANTS.hasOwnProperty(type) || WHITE_VARIANTS.hasOwnProperty(type);
  }
};

/**
 * Represents a Milight Hub connected to this using HTTP/REST API and allows one to communicate with the same.
 * @class MilightHub
 * @extends EventEmitter
 */
class MilightHub extends EventEmitter {
  /**
   * @constructor
   * @param {?String=} [host]
   * @param {?Number=} [timeout]
   */
  constructor (host = 'http://milight-hub.local', timeout = 30000) {
    super();
    /**
     * @memberof MilightBulb
     * @type {String}
     */
    this.host = host;

    /**
     * @memberof MilightBulb
     * @type {Number}
     */
    this.timeout = timeout;

    /**
     * @private
     * @memberof MilightHub
     * @type {RequestC}
     * @note base requester client to allow easy communication down the line
     */
    this.request = request.defaults({
      baseUrl: this.host,
      timeout: this.timeout,
      json: true
    });
  }

  /**
   * Converts device state responses from Milight Hub into normalised and sanitised object
   * @param {Object} body
   * @returns
   */
  static parse (body) {
    // in case body is blank, there probably was an error and hence bailing out early
    if (!body) {
      return { success: false };
    }

    let state = {},
       color = body.color;

    switch (body.state) {
      case 'ON': state.powered = true; break;
      case 'OFF': state.powered = false; break;
    }

    switch (body.bulb_mode) {
      case 'white': state.mode = 'white'; break;
      case 'color': state.mode = 'color'; break;
    }

    // if bulb is in white mode, we return equivalent colour
    if (state.mode === 'white' && body.color_temp) {
      color = utils.colorTemperatureToRGB(utils.miredToKelvin(body.color_temp));
    }

    // all colours are in hsv for homekit
    if (color) {
      let hsv = utils.rgb2hsv(color);

      if (hsv) {
        state.hue = hsv.h;
        state.saturation = hsv.s;
      }
    }

    if (Number.isFinite(body.color_temp)) {
      state.temperature = body.color_temp;
    }

    if (Number.isFinite(body.brightness)) {
      state.brightness = body.brightness;
    }

    return state;
  }

  /**
   * Returns information of hub in form of an object forwarded to callback
   * @param {Function(?err:Error, meta:Object)} done
   */
  information (done) {
    this.request.get('/about', (err, res, body) => {
      if (err) { return done(err); }

      done(null, {
        model: body.variant,
        version: body.version,
        ip: body.ip_address
      });
    });
  }

  /**
   * Returns a information of attached devices by their alias
   * {@see MilightBulb} instances to the callback.
   *
   * @param {Function(?err:Error, bulbs:Array<Object>)} done
   * @see MilightBulb
   */
  devices (done) {
    this.request.get('/settings', (err, res, body) => {
      if (err) { return done(err); }
      if (!body) { return done(new Error('Invalid hub response.')); }

      done(null, Object.entries(body.group_id_aliases || {}).map((entries => ({ // dont ask!
        alias: entries[0],
        type: entries[1][0],
        id: entries[1][1],
        group: entries[1][2]
      }))));
    });
  }

  /**
   * Returns a list of devices registered as aliases with the Milight hub. It is returned in form of array of
   * {@see MilightBulb} instances to the callback.
   *
   * @param {Function(?err:Error, bulbs:Array<MilightBulb>)} done
   * @see MilightBulb
   */
  bulbs (done) {
    this.devices((err, bulbs) => {
      if (err) { return done(err); }
      done(null, bulbs.map((bulb) => new MilightBulb(bulb.alias, bulb.type, bulb.id, bulb.group, this)));
    })
  }

  /**
   * Returns the current saved state of a device registered with Milight hub
   *
   * @param {String} id
   * @param {String} type
   * @param {String} group
   * @param {Function} done
   */
  state (id, type, group, done) {
    this.request.get(`/gateways/${id}/${type}/${group}?blockOnQueue=true`, (err, res, body) => {
      if (err) { return done(err); }
      if (!body) { return done(new Error('did not receive state from hub')); }

      done(null, MilightHub.parse(body));
    });
  }

  /**
   * Sends request to the milight hub to update one specific state of registered MilightBulb
   *
   * @param {String} key
   * @param {String|Number} value
   * @param {String} id
   * @param {String} type
   * @param {String} group
   * @param {Function} done
   */
  command (key, value, id, type, group, done) {
    // handle commands that do not go in root and instead go mqtt style
    if (QUEUABLE_COMMANDS[key]) {
      value = key;
      key = 'command';
    }

    let command = {};
    command[key] = value;

    this.request.put(`/gateways/${id}/${type}/${group}?blockOnQueue=true`, {
      json: command
    }, (err, res, body) => {
      if (err) { return done(err); }
      if (!body) { return done(new Error('did not receive state from hub')); }

      done(null, MilightHub.parse(body));
    });
  }
};

module.exports = {
  MilightHub: MilightHub,
  MilightBulb: MilightBulb
};
