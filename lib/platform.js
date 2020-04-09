const
  milight = require('./milight'),
  MilightHub = milight.MilightHub,
  MilightBulb = milight.MilightBulb,
  MilightAccessoryClass = require('./accessory');

module.exports = function (homebridge) {
  const
    Accessory = homebridge.platformAccessory,
    Service = homebridge.hap.Service,
    Characteristic = homebridge.hap.Characteristic,
    UUIDGen = homebridge.hap.uuid,
    MilightAccessory = MilightAccessoryClass(homebridge);


  class MilightPlatformAccessory extends Accessory {
    constructor (bulb) {
      let name = `${MilightAccessory.ACCESSORY_NAME} ${bulb.identifier}`,
        id = UUIDGen.generate(name),
        displayName = bulb.alias || name;

      super(displayName, id, 5); // @todo use Accessory.Categories.LIGHTBULB

      this.context = {
        name: name,
        id: id
      };

      this.bulb = bulb;
      this.reachable = true;

      this.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, MilightAccessory.ACCESSORY_NAME)
        .setCharacteristic(Characteristic.Model, bulb.type)
        .setCharacteristic(Characteristic.SerialNumber, bulb.id);

      this.addService(MilightAccessory.createLightbulbService(this.bulb, this.displayName));
    }

    get displayName () {
      return this.bulb.alias || this.context.name;
    }

    get name () {
      return this.context.name;
    }

    get id () {
      return this.context.id;
    }

    getServices () {
      return this.services;
    }
  }

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
      this.hub = new MilightHub(this.config.hub, this.config.timeout, this.log);
    }

    accessories (callback) {
      this.hub.bulbs((err, bulbs) => {
        if (err) {
          return callback([]);
        }

        this.log.debug('Enumerated %s bulbs with defined aliases.', bulbs.length);

        callback(bulbs.map((bulb) => {
          let accessory = new MilightPlatformAccessory(bulb);

          accessory.on('identify', (paired, callback) => {
            accessory.bulb.identify(callback);;
          });
          return accessory;
        }));
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
