import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins';

// Minimal config plugin placeholder for future native MapKit routing module.
// After adding the Swift module, uncomment this plugin in app.config.ts plugins array.
const withMapKitRouting: ConfigPlugin = (config) => {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSLocationWhenInUseUsageDescription = cfg.modResults.NSLocationWhenInUseUsageDescription || 'Location is used to calculate driving routes.';
    cfg.modResults.NSLocationAlwaysAndWhenInUseUsageDescription = cfg.modResults.NSLocationAlwaysAndWhenInUseUsageDescription || 'Location is used to calculate driving routes even in background for mileage tracking.';
    return cfg;
  });
};

export default withMapKitRouting;