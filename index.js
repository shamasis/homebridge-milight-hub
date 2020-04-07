const MilightAccessory = require('./lib/accessory');
// const MilightHubPlatform = require('./lib/platform');

module.exports = function (homebridge) {
  let accessory = MilightAccessory(homebridge);
    // platform = MilightHubPlatform(homebridge);

  homebridge.registerAccessory(accessory.PLUGIN_NAME, accessory.ACCESSORY_NAME, accessory);
  // homebridge.registerPlatform(platform.PLUGIN_NAME, platform.PLATFORM_NAME, platform, true);
};
