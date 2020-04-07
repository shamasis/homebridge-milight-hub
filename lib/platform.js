const MilightHub = require('./milight'),
  MilightAccessoryClass = require('./accessory');

module.exports = function (homebridge) {
  const MilightAccessory = MilightAccessoryClass(homebridge);

  class MilightPlatform {
    constructor (log, config, api) {
      log.debug('Platform initialisation started.');

      if (!config) {
        this.disabled = true;
        log.debug('Platform not configured. Register platform in homebridge config.');
        return;
      }

      if (!api) {
        this.disabled = true;
        log.error('Platform is not compatible with current homebridge version.');
        return;
      }

      this.log = log;
      this.config = config;
      this.api = api;
      this.hub = new MilightHub(this.config.hub, this.config.timeout);
    }

    accessories (callback) {
      this.hub.devices((err, bulbs) => {
        if (err) {
          this.log.error(err);
          return callback([]);
        }

        if (!(bulbs && bulbs.length)) {
          this.log.debug('No bulbs discovered. Try adding them as aliases from Milight hub web interface.');
          return callback([]);
        }

        this.log.debug('Enumerated %d bulbs.', bulbs.length);
        let accessories = bulbs.map((bulb) => {
          return (new MilightAccessory(this.log, {
            id: bulb.id,
            type: bulb.type,
            group: bulb.group,
            hub: this.config.hub,
            timeout: this.config.timeout
          }));
        });
        callback(accessories);
      });

    }

    static get PLUGIN_NAME () {
      return 'milight-hub';
    }

    static get PLATFORM_NAME () {
      return 'Milight Hub';
    }
  }

  return MilightPlatform;
};
