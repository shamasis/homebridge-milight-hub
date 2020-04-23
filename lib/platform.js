const
  milight = require('./milight'),
  MilightHub = milight.MilightHub,
  MilightAccessoryClass = require('./accessory');

module.exports = function (homebridge) {
  const
    Accessory = homebridge.platformAccessory,
    Service = homebridge.hap.Service,
    Characteristic = homebridge.hap.Characteristic,
    UUIDGen = homebridge.hap.uuid,
    MilightAccessory = MilightAccessoryClass(homebridge);


  class MilightPlatformAccessory extends Accessory {
    constructor (bulb, logger = console) {
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

      this.log = logger;
      this.log.debug('%s accessory was instantiated.', this.name);
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

      if (config.disabled) {
        this.disabled = true;
        log.info('Platform is disabled in config, not proceeding with discovery.');
        return;
      }

      if (!api) {
        this.disabled = true;
        log.error('Platform is not compatible with current homebridge version.');
        return;
      }

      this.log = log;
      this.api = api;
      this.config = config;
      this.hub = new MilightHub(config.hub, config.timeout, log);
      this.devices = {};
    }

    accessories (callback) {
      if (this.disabled) {
        return callback([]);
      }

      this.hub.bulbs((err, bulbs) => {
        if (err) {
          this.log.error('Error enumerating bulbs.');
          this.log.error(err);
          return callback([]);
        }

        this.log.debug('Enumerated %s bulbs with defined aliases.', bulbs.length);
        callback(bulbs.map((bulb) => this.createAccessory(bulb)));

        // @todo move this code to a cleaner place
        if (!this.config.disablePolling) {
          setInterval(() => {
            this.syncAccessories();
          }, 20000);
        }
      });
    }

    syncAccessories () {
      this.log.debug('Attempting to synchronise accessories.');

      this.hub.bulbs((err, bulbs) => {
        if (err) {
          this.log.error('Error synchronising bulbs.');
          this.log.error(err);
          return;
        }

        this.log.debug('Enumerated %s bulbs with defined aliases.', bulbs.length);

        // convert the array to an object to ensure simpler iteration logic and reduce
        // iteration complexity
        bulbs = bulbs.reduce((hash, bulb) => ((hash[bulb.identifier] = bulb), hash), {});

        // add all missing bulbs
        for (const [identifier, bulb] of Object.entries(bulbs)) {
          if (!this.hasAccessory(bulb)) {
            this.addAccessory(bulb);
            this.log.info('Accessory %s registered', identifier);
          }
        }

        // remove all extra accessories
        for (const [identifier, accessory] of Object.entries(this.devices)) {
          if (!bulbs.hasOwnProperty(identifier)) {
            this.removeAccessory(accessory);
            this.log.info('Accessory %s unregistered', identifier);
          }
        }

        this.log.debug('Enumerated accessories have been synchronised.');
      });
    }

    hasAccessory (bulb) {
      return this.devices.hasOwnProperty(bulb.identifier);
    }

    createAccessory (bulb) {
      // do not double add if the accessory is already added in list
      if (this.hasAccessory(bulb)) {
        throw new Error('Cannot create duplicate accessory %s', bulb.identifier);
      }

      let accessory = new MilightPlatformAccessory(bulb, this.log),
        identifier = accessory.bulb.identifier;

      // add to the list of accessories
      this.devices[identifier] = accessory;

      // setup the identifier event
      accessory.on('identify', (paired, callback) => {
        accessory.bulb.identify(callback);;
      });

      // configure property update polling if the same has not been disabled via config
      if (!this.config.disablePolling) {
        MilightAccessory.enableAutoSynchronise(accessory.getService(Service.Lightbulb), bulb);
      }

      return accessory;
    }

    deleteAccessory (accessory) {
      if (!this.hasAccessory(accessory.bulb)) {
        throw new Error('Cannot delete accessory %s', accessory.displayName);
      }

      // clear polling. no harm to trigger clear irrespective of whether it was enabled or not
      MilightAccessory.disableAutoSynchronise(accessory.getService(Service.Lightbulb));
      delete this.devices[accessory.bulb.identifier]; // remove from accessory hash
    }

    addAccessory (bulb) {
      let accessory = this.createAccessory(bulb);
      this.api.registerPlatformAccessories(MilightPlatform.PLUGIN_NAME, MilightPlatform.PLATFORM_NAME, [accessory]);
    }

    removeAccessory (accessory) {
      this.deleteAccessory(accessory);
      this.api.unregisterPlatformAccessories(MilightPlatform.PLUGIN_NAME, MilightPlatform.PLATFORM_NAME, [accessory]);
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
