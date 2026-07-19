/** Synthetic ECG + scenario clock for the detection demo (no backend). */

export type Phase = 'warmup' | 'normal' | 'brady' | 'alert' | 'recover'

export interface SimSample {
  t: number
  ecg: number
  hr: number
  phase: Phase
  bradycardia: boolean
  alert: boolean
  latencyMs: number
  classLabel: 'Normal' | 'Bradycardia' | 'Other'
}

const FS = 60 // display samples per second (downsampled view)
const BUDGET_MS = 250

/** Rough single-beat QRS morphology for a scrolling strip. */
function qrsShape(phase: number): number {
  // phase in [0, 1) across one RR interval
  if (phase < 0.12) return Math.sin((phase / 0.12) * Math.PI) * 0.15 // P
  if (phase < 0.16) return -0.12 // Q
  if (phase < 0.2) return ((phase - 0.16) / 0.04) * 1.35 // R up
  if (phase < 0.24) return 1.35 - ((phase - 0.2) / 0.04) * 1.7 // R down / S
  if (phase < 0.28) return -0.35 + ((phase - 0.24) / 0.04) * 0.35
  if (phase < 0.45) return Math.sin(((phase - 0.28) / 0.17) * Math.PI) * 0.28 // T
  return 0
}

function targetHr(elapsed: number): { hr: number; phase: Phase } {
  if (elapsed < 2) return { hr: 72, phase: 'warmup' }
  if (elapsed < 8) return { hr: 72, phase: 'normal' }
  if (elapsed < 11) {
    // Ramp down into bradycardia
    const u = (elapsed - 8) / 3
    return { hr: 72 - u * 30, phase: 'brady' }
  }
  if (elapsed < 18) return { hr: 42, phase: 'alert' }
  if (elapsed < 22) {
    const u = (elapsed - 18) / 4
    return { hr: 42 + u * 30, phase: 'recover' }
  }
  // Loop: jump back conceptually handled by caller resetting
  return { hr: 72, phase: 'normal' }
}

export const SCENARIO_DURATION_SEC = 22
export const LATENCY_BUDGET_MS = BUDGET_MS

export function sampleAt(elapsedSec: number): SimSample {
  const loopT = elapsedSec % SCENARIO_DURATION_SEC
  const { hr, phase } = targetHr(loopT)
  const rrSec = 60 / Math.max(hr, 25)
  const beatPhase = (loopT % rrSec) / rrSec
  const noise = Math.sin(loopT * 37.1) * 0.015 + Math.sin(loopT * 11.3) * 0.01
  const ecg = qrsShape(beatPhase) + noise

  const bradycardia = hr < 60 && (phase === 'brady' || phase === 'alert')
  const alert = phase === 'alert'
  // Simulated pipeline reaction latency — stays under budget after first detect
  const latencyMs =
    phase === 'alert'
      ? 38 + Math.abs(Math.sin(loopT * 3)) * 42
      : phase === 'brady'
        ? 55 + Math.abs(Math.sin(loopT * 2)) * 30
        : 28 + Math.abs(Math.sin(loopT)) * 20

  return {
    t: loopT,
    ecg,
    hr,
    phase,
    bradycardia,
    alert,
    latencyMs,
    classLabel: bradycardia ? 'Bradycardia' : 'Normal',
  }
}

export function phaseCopy(phase: Phase): string {
  switch (phase) {
    case 'warmup':
      return 'Pipeline warming up — streaming synthetic ECG at display rate.'
    case 'normal':
      return 'Stable sinus rhythm ~72 bpm. Pan-Tompkins R-peaks → RR intervals → HR.'
    case 'brady':
      return 'Heart rate falling. Sustained-rate monitor arms (HR < 60 for several beats).'
    case 'alert':
      return 'Bradycardia alert fired — this is the decision that would trigger a dose/alert.'
    case 'recover':
      return 'Rate recovering. Alert clears as the sustain condition ends.'
  }
}

export { FS }
