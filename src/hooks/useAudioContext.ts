import { useEffect, useRef, useState } from 'react';

/**
 * Hook pour gérer l'AudioContext de manière centralisée
 * et gérer les permissions utilisateur
 */
export function useAudioContext() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const Ctx: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) {
      setError('Web Audio API non supportée par ce navigateur');
      return;
    }

    const ctx = new Ctx();
    contextRef.current = ctx;
    setIsReady(true);

    return () => {
      if (contextRef.current?.state !== 'closed') {
        contextRef.current?.close();
      }
    };
  }, []);

  const resume = async () => {
    if (!contextRef.current) return;
    if (contextRef.current.state === 'suspended') {
      try {
        await contextRef.current.resume();
      } catch (e) {
        setError('Impossible de reprendre le contexte audio: ' + String(e));
      }
    }
  };

  return {
    context: contextRef.current,
    isReady,
    error,
    resume,
  };
}
