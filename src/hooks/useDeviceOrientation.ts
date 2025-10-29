import { useEffect, useState } from 'react';

interface OrientationPermissionState {
  isSupported: boolean;
  permissionGranted: boolean | null; // null = inconnu, true = accordé, false = refusé
  isListening: boolean;
}

/**
 * Hook pour gérer les permissions et l'état de l'orientation du dispositif
 */
export function useDeviceOrientation() {
  const [state, setState] = useState<OrientationPermissionState>({
    isSupported: 'DeviceOrientationEvent' in window,
    permissionGranted: null,
    isListening: false,
  });

  useEffect(() => {
    if (!state.isSupported) return;

    // iOS 13+ nécessite une permission explicite
    const checkIOSPermission = async () => {
      const doe: any = (window as any).DeviceOrientationEvent;
      if (doe && typeof doe.requestPermission === 'function') {
        // Sur iOS, on doit demander la permission
        return;
      }
      // Sur Android/autres, la permission est généralement accordée
      setState((prev) => ({ ...prev, permissionGranted: true }));
    };

    checkIOSPermission();
  }, [state.isSupported]);

  const requestPermission = async (): Promise<boolean> => {
    if (!state.isSupported) {
      throw new Error('DeviceOrientationEvent non supporté');
    }

    const doe: any = (window as any).DeviceOrientationEvent;
    if (doe && typeof doe.requestPermission === 'function') {
      try {
        const result = await doe.requestPermission();
        const granted = result === 'granted';
        setState((prev) => ({
          ...prev,
          permissionGranted: granted,
          isListening: granted,
        }));
        return granted;
      } catch (e) {
        setState((prev) => ({ ...prev, permissionGranted: false }));
        throw e;
      }
    }

    // Sur les navigateurs non-iOS, on considère comme accordé
    setState((prev) => ({
      ...prev,
      permissionGranted: true,
      isListening: true,
    }));
    return true;
  };

  return {
    ...state,
    requestPermission,
  };
}
