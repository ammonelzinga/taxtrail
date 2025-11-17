import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { useCallback } from 'react';

export function usePermissions() {
  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    let bg = 'denied' as Location.PermissionStatus;
    if (status === 'granted') {
      const res = await Location.requestBackgroundPermissionsAsync();
      bg = res.status;
    }
    return { foreground: status, background: bg };
  }, []);

  const requestCamera = useCallback(async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status;
  }, []);

  return { requestLocation, requestCamera };
}
