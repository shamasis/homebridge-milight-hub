/**
 * @module homebridge-milight-hub
 *
 */
const
    /**
     * This class generates a new instance of MilightAccessory plugin. This class' main purpose is to handle common
     * accessory specific functions for Milight. Adding individual accessories in homebridge config is handled via this
     * class.
     * @const {MilightAccessory}
     */
    MilightAccessory = require('./lib/accessory'),
    /**
     * This class generates a new instance of MilightPlatform plugin. This plugin instance handles all auto generated
     * accessories that are registered directly with Milight Hub.
     * @const {MilightHubPlatform}
     */
    MilightHubPlatform = require('./lib/platform');

module.exports = function (homebridge) {
  let accessory = MilightAccessory(homebridge),
      platform = MilightHubPlatform(homebridge);

  // we register both the plugins with homebridge
  // code flow of accessories go through the accessory plugin and for platform through the platform plugin
  homebridge.registerAccessory(accessory.PLUGIN_NAME, accessory.ACCESSORY_NAME, accessory);
  homebridge.registerPlatform(platform.PLUGIN_NAME, platform.PLATFORM_NAME, platform, true);
};
