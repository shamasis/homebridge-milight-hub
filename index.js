const {PLATFORM_NAME} = require('./src/settings');
const {MilightPlatform} = require('./src/platform'); 

/**
 * This method registers the platform with Homebridge
 */
module.exports = (api) => {
    api.registerPlatform(PLATFORM_NAME, MilightPlatform);
};