
module.exports = {
    /**
     * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
     * @constant
     */
    PLATFORM_NAME: 'Milight Hub',

    /**
     * This must match the name of your plugin as defined the package.json
     * @constant
     */
    PLUGIN_NAME: 'homebridge-milight-hub',

    /**
     * This is the name to identify as accessory manufacurer
     * @constant
     */
    MANUFACTURER: 'ESP Milight Hub',

    /**
     * Use package version to identify accessory version
     * @constant
     */
    PACKAGE_VERSION: String(require('../package.json').version)
};