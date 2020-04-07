const request = require('request'),
  rgbToHsv = require('./utils').rgbToHsv;

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

      let hsv = rgbToHsv(body.color);

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

class MilightHub {
  constructor (host, timeout) {
    this.host = host || 'http://milight-hub.local';
    this.timeout = timeout || 30000;

    this.request = request.defaults({
      baseUrl: this.host,
      timeout: this.timeout,
      json: true
    });
  }

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

  devices (done) {
    this.request.get('/settings', (err, res, body) => {
      if (err) { return done(err); }

      let aliases = body && body.group_id_aliases || {};

      done(null, Object.keys(aliases).map((alias) => {
        let params = aliases[key];
        return new MilightBulb(alias, params[0], params[1], params[2], this.host, this.timeout);
      }));
    });
  }

  state (id, type, group, done) {
    this.request.get(`/gateways/${id}/${type}/${group}?blockOnQueue=true`, (err, res, body) => {
      if (err) { return done(err); }
      if (!body) { return done(new Error('did not receive status from hub')); }

      let state = {};

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

      if (body.color) {
        body.color = rgbToHsv(body.color);
        state.hue = body.color.h;
        state.saturation = body.color.s;
      }

      state.temperature = body.color_temp;
      state.brightness = body.brightness;

      done(null, state);
    });
  }

  command (key, value, id, type, group, done) {
    let command = {};

    if (QUEUABLE_COMMANDS[key]) {
      value = key;
      key = 'command';
    }

    command[key] = value;

    this.request.put(`/gateways/${id}/${type}/${group}?blockOnQueue=true`, {
      json: command
    }, (err, res, body) => {
      if (err) { return done(err); }

      let state = {};

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

      if (body.color) {
        body.color = rgbToHsv(body.color);
        state.hue = body.color.h;
        state.saturation = body.color.s;
      }

      state.temperature = body.color_temp;
      state.brightness = body.brightness;

      done(null, state);
    });
  }


};

module.exports = MilightHub;