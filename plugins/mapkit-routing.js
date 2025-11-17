const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Minimal config plugin placeholder for future native MapKit routing module.
 * After adding the Swift module, ensure this plugin is referenced in app.config.ts.
 */
const withMapKitRouting = (config) => {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSLocationWhenInUseUsageDescription =
      cfg.modResults.NSLocationWhenInUseUsageDescription ||
      'Location is used to calculate driving routes.';
    cfg.modResults.NSLocationAlwaysAndWhenInUseUsageDescription =
      cfg.modResults.NSLocationAlwaysAndWhenInUseUsageDescription ||
      'Location is used to calculate driving routes even in background for mileage tracking.';
    return cfg;
  });
};

module.exports = withMapKitRouting;
