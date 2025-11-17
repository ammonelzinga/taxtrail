import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission denied');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        if (mounted) setLocation(loc);
      } catch (e: any) {
        setError(e.message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { location, error };
}
