import { useEffect, useState } from 'react';
import { Camera, CameraType } from 'expo-camera';

export function useCamera() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  return { hasPermission, type, setType };
}
