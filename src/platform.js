const request = require('request');
const { PLATFORM_NAME, PLUGIN_NAME } = require('./settings');
const { MilightPlatformAccessory } = require('./platform-accessory');

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
class MilightPlatform {

  constructor (log/*: Logger*/, config/*: PlatformConfig*/, api/*: API*/) {
    this.log = log;
    this.config = config;
    this.api = api;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    // this is used to track restored cached accessories
    this.accessories = [];

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.loadDevices(config.devices);
      this.pruneDevices();

      if (this.config.autoDiscoverDevices) {
        log.debug('Attempting to auto discover devices');
        this.discoverDevices((err) => {
          log.debug('Executed discoverDevices callback', err);
        });
      }

    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory/*: PlatformAccessory*/) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  loadDevices(devices, fromAutoDiscovery) {
    const accessoriesToRegister = []; // this array will hold accessories that needs to be appended

    (devices || []).forEach((device) => {
      
      const uuid = this.api.hap.uuid.generate(MilightPlatformAccessory.getUUIDBaseForDevice(device)),
        existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        
      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.device = device;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platform-accessory.js`
        new MilightPlatformAccessory(this, existingAccessory); // anyway this is cached
      } 
      
      else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.displayName);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.displayName, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;
        accessory.context.state = {};
        accessory.context.autoDiscovered = Boolean(fromAutoDiscovery);

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new MilightPlatformAccessory(this, accessory);

        accessoriesToRegister.push(accessory);
      }
    });

    // link the new accessories to platform
    if (accessoriesToRegister.length) {
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRegister);
    }
  }

  /**
   * Traverse the cached and configured accessory list and then remove the cached ones that are not defined
   * within config.
   */
  pruneDevices () {
    const configuredAccessories = this.config.devices || [],
      loadedAccessories = this.accessories || [];
    
    let surplusAccessories = loadedAccessories.filter((accessory) => {
      if (accessory.context.autoDiscovered === true) {
        return false;
      }

      // check if a configured accessory with same UUID is NOT found
      return !configuredAccessories.find((device) => 
        (this.api.hap.uuid.generate(MilightPlatformAccessory.getUUIDBaseForDevice(device)) === accessory.UUID));
    });

    if (surplusAccessories.length) {
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, surplusAccessories);
      this.log.info('Removing existing accessory from cache:', surplusAccessories.map((accessory) => accessory.displayName));
    }
  }

  /**
   * Query the hub to load devices
   */
  discoverDevices (callback) {

    request({
      baseUrl: this.config.hub,
      uri: '/settings',
      method: 'get',
      json: true,
      timeout: 15000
    }, (err, res, body) => {
      if (err) { return callback(err); }
      if (res.statusCode !== 200) { return callback(new Error('Received not OK response from hub')); }

      const devices = Object.entries(body.group_id_aliases || {}).map((entries => ({ // dont ask!
        displayName: entries[0],
        deviceAlias: entries[0],
        remoteType: entries[1][0],
        deviceId: entries[1][1],
        deviceGroup: entries[1][2]
      })));

      this.log.debug(`Discovered ${devices.length} device(s).`)
      if (devices.length) {
        this.loadDevices(devices, true);
      }

      // we now need to remove the previous auto-discovered devices
      const surplusAccessories = this.accessories.filter((accessory) => {
        if (!accessory.context.autoDiscovered) {
          return false;
        }

        // we mark true to filter this accessory if, it's UUID is not in the discoveredDevicelist
        return !devices.find((device) => {
          return this.api.hap.uuid.generate(MilightPlatformAccessory.getUUIDBaseForDevice(device)) === accessory.UUID;
        });
      });

      if (surplusAccessories.length) {
        this.log.info('Removing undiscovered accessory from cache:', surplusAccessories.map((accessory) => accessory.displayName));
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, surplusAccessories);
      }

      callback(null);
    })
  }
}

module.exports = { MilightPlatform };