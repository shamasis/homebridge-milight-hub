const MilightAccessory = require('./lib/accessory');

module.exports = function (homebridge) {
  let accessory = MilightAccessory(homebridge);
  homebridge.registerAccessory(accessory.PLUGIN_NAME, accessory.ACCESSORY_NAME, accessory);

  // const MilightHubPlatform = require('./lib/platform');
  // let platform = MilightHubPlatform(homebridge);
  // homebridge.registerPlatform(platform.PLUGIN_NAME, platform.PLATFORM_NAME, platform, true);
};
