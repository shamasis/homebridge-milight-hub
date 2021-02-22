const _ = require('lodash'),
  request = require('request');

var rgbToHsl;

rgbToHsl = function (color) {
  !color && (color = {r: 0, g: 0, b: 0});

  var
    r = color.r / 255,
    g = color.g / 255,
    b = color.b / 255,
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    h, s, l = (max + min) / 2;

  if (max == min){
      h = s = 0; // achromatic
  }
  else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

module.exports = function (homebridge) {
  const
    Service = homebridge.hap.Service,
    Characteristic = homebridge.hap.Characteristic;

  var Milight;

  Milight = function (log, config) {
    this.request = request.defaults({
      baseUrl: _.isString(this.hub) ? this.hub : 'http://milight-hub.local',
      json: true,
      timeout: _.isNumber(config.timeout) ? config.timeout : 30000
    });

    this.id = config.id ? String(config.id) : '0';
    this.type = config.type ? String(config.type) : 'fut089';
    this.group = config.group ? String(config.group) : '0';
    this.white = Boolean(config.white);
  };

  Object.assign(Milight.prototype, {
    getDeviceState: function (callback) {
      this.request.get(`/gateways/${this.id}/${this.type}/${this.group}`, (err, resp, body) => {
        if (err) { return callback(err); }
        if (resp && (resp.statusCode !== 200)) {
          return callback(new Error('milight: unable to query device - code:' + resp.statusCode));
        }
        callback(null, body);
      });
    },

    setDeviceState: function (state, callback) {
      this.request({
        uri: `/gateways/${this.id}/${this.type}/${this.group}`,
        method: 'put',
        json: state
      }, (err, resp, body) => {
        if (err) { return callback(err); }
        if (resp && (resp.statusCode !== 200)) {
          return callback(new Error('milight: unable to query device - code:' + resp.statusCode));
        }

        callback(null, body);
      });
    },

    getServices: function () {
      var lightbulbService = new Service.Lightbulb(this.name);

      lightbulbService.addCharacteristic(Characteristic.StatusActive)
        .on('get', (callback) => {
          this.getDeviceState((err, state) => {
            callback(err, true);
          });
        });

      lightbulbService.getCharacteristic(Characteristic.On)
        .on('get', (callback) => {
          this.getDeviceState((err, state) => {
            callback(err, _.isEqual(_.get(state, 'state'), 'ON'));
          });
        })

        .on('set', (state, callback) => {
          this.setDeviceState({ status: (state > 0) }, (err, state) => {
            callback(err, _.isEqual(_.get(state, 'state'), 'ON'));
          });
        });

      lightbulbService.addCharacteristic(Characteristic.Brightness)
        .on('get', (callback) => {
          this.getDeviceState((err, state) => {
            callback(err, Math.round((_.get(state, 'brightness', 0) / 254) * 100));
          });
        })
        .on('set', (value, callback) => {
          this.setDeviceState({ level: value }, (err, state) => {
            callback(err, Math.round((_.get(state, 'brightness', 0) / 254) * 100));
          });
        });

      if (this.white) {
        lightbulbService.addCharacteristic(Characteristic.ColorTemperature)
          .on('get', (callback) => {
            this.getDeviceState((err, state) => {
              callback(err, _.get(state, 'color_temp', 262));
            });
          })
          .on('set', (value, callback) => {
            this.setDeviceState({ temperature: (((value - 153) / 217) * 100) }, (err, state) => {
              callback(err, _.get(state, 'color_temp', 262));
            });
          })
          .setProps({
              minValue: 153,
              maxValue: 370
          });
      }
      else {
        lightbulbService.addCharacteristic(Characteristic.Hue)
          .on('get', (callback) => {
            this.getDeviceState((err, state) => {
              callback(err, rgbToHsl(_.get(state, 'color')).h);
            });
          })
          .on('set', (value, callback) => {
            this.setDeviceState({ hue: value }, (err, state) => {
              callback(err, rgbToHsl(_.get(state, 'color')).h);
            });
          });

        lightbulbService.addCharacteristic(Characteristic.Saturation)
          .on('get', (callback) => {
            this.getDeviceState((err, state) => {
              callback(err, rgbToHsl(_.get(state, 'color')).s);
            });
          })
          .on('set', (value, callback) => {
            this.setDeviceState({ saturation: value }, (err, state) => {
              callback(err, rgbToHsl(_.get(state, 'color')).s);
            });
          });
      }

      return [lightbulbService];
    }
  });

  homebridge.registerAccessory('milight-hub', 'Milight', Milight);
}
