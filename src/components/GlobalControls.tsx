import { useControls } from 'leva';
import { useEffect } from 'react';
import { useAppStore } from '../state/useAppStore';

export function GlobalControls() {
  const beamWidthDeg = useAppStore((s) => s.beamWidthDeg);
  const setBeamWidthDeg = useAppStore((s) => s.setBeamWidthDeg);
  const masterGain = useAppStore((s) => s.masterGain);
  const setMasterGain = useAppStore((s) => s.setMasterGain);
  const normalize = useAppStore((s) => s.normalize);
  const setNormalize = useAppStore((s) => s.setNormalize);

  const values = useControls('Mix', {
    beamWidthDeg: { value: beamWidthDeg, min: 5, max: 180, step: 1 },
    masterGain: { value: masterGain, min: 0, max: 1, step: 0.01 },
    normalize: { value: normalize },
  });

  useEffect(() => { setBeamWidthDeg(values.beamWidthDeg); }, [values.beamWidthDeg]);
  useEffect(() => { setMasterGain(values.masterGain); }, [values.masterGain]);
  useEffect(() => { setNormalize(values.normalize); }, [values.normalize]);

  return null;
}
