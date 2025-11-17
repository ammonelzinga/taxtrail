import 'dotenv/config';

const NAME = 'TaxTrail';
const SLUG = 'taxtrail';

export default () => ({
  expo: {
    name: NAME,
    slug: SLUG,
    scheme: 'taxtrail',
    owner: undefined,
    version: '0.1.0',
    orientation: 'portrait',
    // Add your own icon at ./assets/icon.png and uncomment below
    // icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    // Add your own splash at ./assets/splash.png and uncomment below
    // splash: {
    //   image: './assets/splash.png',
    //   resizeMode: 'contain',
    //   backgroundColor: '#0B0F14'
    // },
    androidStatusBar: {
      backgroundColor: '#0B0F14',
      barStyle: 'light-content'
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: 'Capture receipts for expense parsing.',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'Track mileage trips automatically even in background.',
        NSLocationWhenInUseUsageDescription: 'Track mileage and show your location on the map.',
        UIBackgroundModes: ['location']
      }
    },
    android: {
      package: 'com.taxtrail.app',
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION'
      ]
    },
    plugins: [
      'expo-router',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow TaxTrail to access your location to automatically detect trips.',
          isAndroidForegroundService: true
        }
      ],
      // Native MapKit routing plugin (adds iOS module when prebuilt). Create plugins/mapkit-routing.ts.
      './plugins/mapkit-routing',
      // VisionCamera OCR route (uncomment after installing native libs).
      // 'react-native-vision-camera'
    ],
    web: {
      bundler: 'metro'
    },
    experiments: {
      typedRoutes: true
    },
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID || ''
      },
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || ''
    }
  }
});
