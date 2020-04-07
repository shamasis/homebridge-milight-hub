const request = require('request'),
  utils = require('./utils');

const BULB_STATES = {
  'ON': 'on',
  'OFF': 'off'
};

const BULB_MODES = {
  'white': 'white',
  'color': 'color'
};

const QUEUABLE_COMMANDS = {
  'set_white': true
}

class MilightBulb {
  constructor (alias, type, id, group, host, timeout) {
    this.alias = alias;
    this.type = type;
    this.id = id;
    this.group = group;

    this.request = request.defaults({
      baseUrl: host,
      timeout: timeout,
      json: true
    });
  }

  get identifier () {
    return `${this.alias}_${this.id}`;
  }

  status (done) {
    this.request.get(`/gateways/${this.id}/${this.type}/${this.group}?blockOnQueue=true`, (err, res, body) => {
      if (err) { return done(err); }
      if (!body) { return done(new Error('did not receive status from hub')); }

      // cache some data
      if (BULB_MODES[body.bulb_mode]) {
        this.mode = BULB_MODES[body.bulb_mode];
      }
      else {
        return done(new Error('did not receive valid bulb mode'));
      }
      this.brightness = body.brightness;

      let hsv = utils.rgbToHsv(body.color);

      done(null, {
        state: BULB_STATES[body.state],
        mode: BULB_MODES[body.bulb_mode],
        temperature: body.color_temp,
        brightness: body.brightness,
        hue: hsv.h,
        saturation: hsv.s
      });
    });
  }

  command (params, done) {
    this.request.put(`/gateways/${this.id}/${this.type}/${this.group}?blockOnQueue=true`, {
      json: params
    }, (err, res, body) => {
      if (err) { return done(err); }

      if (BULB_MODES[body.bulb_mode]) {
        this.mode = BULB_MODES[body.bulb_mode];
      }

      done();
    });
  }

  getTemperature (done) {
    this.status((err, status) => {
      if (err) { return done(err); }
      done(null, status.temperature);
    });
  }

  setTemperature (value, done) {
    if (this.mode !== BULB_MODES.white) {
      this.command({command: "set_white"}, (err) => {
        if (err) { return done(err); }

        this.command({color_temp: value}, (err) => {
          done(err);
        });
      });

      return;
    }

    this.command({color_temp: value}, (err) => {
      done(err);
    });
  }

  setBrightness (value, done) {
    this.command({brightness: value}, (err) => {
      done(err);
    });
  }

  getBrightness (done) {
    this.status((err, status) => {
      if (err) { return done(err); }
      done(null, status.brightness);
    });
  }

  setHue (value, done) {
    this.command({hue: value}, (err) => {
      done(err);
    });
  }

  getHue (done) {
    this.status((err, status) => {
      if (err) { return done(err); }
      done(null, status.hue);
    });
  }

  setSaturation (value, done) {
    this.command({saturation: value}, (err) => {
      done(err);
    });
  }

  getSaturation (done) {
    this.status((err, status) => {
      if (err) { return done(err); }
      done(null, status.saturation);
    });
  }

  getPowerState (done) {
    this.status((err, status) => {
      if (err) { return done(err); }

      if (!BULB_STATES.hasOwnProperty(status.state)) {
        return done(new Error('unrecognised bulb state received: '))
      }

      done(null, status.state === BULB_STATES.ON);
    });
  }

  setPowerState (state, done) {
    this.command({'status': state ? 'on' : 'off'}, (err, res, body) => {
      done(err);
    });
  }
};

/**
 * Represents a Milight Hub connected to this using HTTP/REST API and allows one to communicate with the same.
 * @class MilightHub
 */
class MilightHub {
  /**
   * @constructor
   * @param {?String=} [host]
   * @param {?Number=} [timeout]
   */
  constructor (host = 'http://milight-hub.local', timeout = 30000) {
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
  static parseStateResponse (body) {
    // in case body is blank, there probably was an error and hence bailing out early
    if (!body) {
      return { success: false };
    }

    let state = { success: true },
       color = body.color;

    switch (body.state) {
      case 'ON': state.powered = true; break;
      case 'OFF': state.powered = false; break;
      default: state.powered = null;
    }

    switch (body.bulb_mode) {
      case 'white': state.mode = 'white'; break;
      case 'color': state.mode = 'color'; break;
      default: state.mode = null;
    }

    // if bulb is in white mode, we return equivalent colour
    if (state.mode === 'white' && body.color_temp) {
      color = utils.colorTemperatureToRGB(utils.miredToKelvin(body.color_temp));
    }

    // all colours are in hsv for homekit
    if (color) {
      let hsv = utils.rgbToHsv(color)
      state.hue = hsv.h;
      state.saturation = hsv.s;
    }

    state.temperature = body.color_temp;
    state.brightness = body.brightness;

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
   * Returns a list of devices registered as aliases with the Milight hub. It is returned in form of array of
   * {@see MilightBulb} instances to the callback.
   *
   * @param {Function(?err:Error, bulbs:Array<MilightBulb>)} done
   * @see MilightBulb
   */
  devices (done) {
    this.request.get('/settings', (err, res, body) => {
      if (err) { return done(err); }

      let aliases = body && body.group_id_aliases || {};

      done(null, Object.keys(aliases).map((alias) => {
        let params = aliases[alias];
        return new MilightBulb(alias, params[0], params[1], params[2], this.host, this.timeout);
      }));
    });
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

      done(null, MilightHub.parseStateResponse(body));
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

      done(null, MilightHub.parseStateResponse(body));
    });
  }
};

module.exports = MilightHub;
