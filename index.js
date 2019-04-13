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
    getServices: function () {
      var lightbulbService = new Service.Lightbulb(this.name);

      lightbulbService.getCharacteristic(Characteristic.On)
        .on('get', (callback) => {
          this.request.get(`/gateways/${this.id}/${this.type}/${this.group}`, (err, resp, body) => {
            callback(err, _.isEqual(_.get(body, 'state'), 'ON'));
          });
        })

        .on('set', (state, callback) => {
          this.request({
            uri: `/gateways/${this.id}/${this.type}/${this.group}`,
            method: 'put',
            json: { status: (state > 0) }
          }, (err, resp, body) => {
            callback(err, _.isEqual(_.get(body, 'state'), 'ON'));
          });
        });

      return [lightbulbService];
    }
  });

  homebridge.registerAccessory("milight", "Milight", Milight);
}
