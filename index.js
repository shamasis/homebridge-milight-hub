const _ = require('lodash'),
  request = require('request');

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
    this.type = config.type ? String(config.type) : 'rgb';
    this.group = config.group ? String(config.group) : '0';
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
          .on("get", (callback) => {
            this.getDeviceState((err, state) => {
              callback(err, Math.round((_.get(state, 'brightness', 0) / 254) * 100));
            });
          })
          .on("set", (value, callback) => {
            this.setDeviceState({ level: value }, (err, state) => {
              callback(err, Math.round((_.get(state, 'brightness', 0) / 254) * 100));
            });
          });

      return [lightbulbService];
    }
  });

  homebridge.registerAccessory("milight-hub", "Milight", Milight);
}
