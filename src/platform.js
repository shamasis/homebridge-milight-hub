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
      this.loadDevices();
      this.pruneDevices();
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
  loadDevices() {
    const accessoriesToRegister = []; // this array will hold accessories that needs to be appended

    (this.config.accessories || []).forEach((device) => {
      
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
        accessory.context.autoDiscovered = false;

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
    const configuredAccessories = this.config.accessories || [],
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
}

module.exports = { MilightPlatform };