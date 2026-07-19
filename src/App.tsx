import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from 'recharts'
import {
  FS,
  LATENCY_BUDGET_MS,
  SCENARIO_DURATION_SEC,
  phaseCopy,
  sampleAt,
  type SimSample,
} from './sim'
import './App.css'

const WAVE_LEN = 180
const HR_LEN = 90

interface WavePt {
  i: number
  v: number
}
interface HrPt {
  i: number
  hr: number
}

export default function App() {
  const [running, setRunning] = useState(true)
  const [sample, setSample] = useState<SimSample>(() => sampleAt(0))
  const [wave, setWave] = useState<WavePt[]>(() =>
    Array.from({ length: WAVE_LEN }, (_, i) => ({ i, v: 0 })),
  )
  const [hrSeries, setHrSeries] = useState<HrPt[]>(() =>
    Array.from({ length: HR_LEN }, (_, i) => ({ i, hr: 72 })),
  )
  const [alertLatched, setAlertLatched] = useState(false)
  const startRef = useRef(performance.now())
  const pausedAtRef = useRef(0)
  const elapsedRef = useRef(0)
  const idxRef = useRef(0)

  useEffect(() => {
    if (!running) return
    let raf = 0
    const tick = () => {
      const now = performance.now()
      const elapsed = (now - startRef.current) / 1000
      elapsedRef.current = elapsed
      const s = sampleAt(elapsed)
      setSample(s)
      if (s.alert) setAlertLatched(true)
      if (s.phase === 'normal' && elapsed % SCENARIO_DURATION_SEC < 0.05) {
        setAlertLatched(false)
      }

      idxRef.current += 1
      const i = idxRef.current
      setWave((prev) => {
        const next = prev.slice(1)
        next.push({ i, v: s.ecg })
        return next
      })
      if (i % 4 === 0) {
        setHrSeries((prev) => {
          const next = prev.slice(1)
          next.push({ i, hr: s.hr })
          return next
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  const progress = (sample.t / SCENARIO_DURATION_SEC) * 100
  const latencyTone =
    sample.latencyMs <= LATENCY_BUDGET_MS ? 'good' : 'bad'
  const hrTone = sample.bradycardia ? 'bad' : 'good'
  const showAlert = alertLatched && (sample.alert || sample.bradycardia)

  const waveData = useMemo(() => wave, [wave])
  const hrData = useMemo(() => hrSeries, [hrSeries])

  function replay() {
    startRef.current = performance.now()
    setAlertLatched(false)
    setSample(sampleAt(0))
    setWave(Array.from({ length: WAVE_LEN }, (_, i) => ({ i, v: 0 })))
    setHrSeries(Array.from({ length: HR_LEN }, (_, i) => ({ i, hr: 72 })))
    idxRef.current = 0
    setRunning(true)
  }

  function toggle() {
    if (running) {
      pausedAtRef.current = performance.now()
      setRunning(false)
    } else {
      startRef.current += performance.now() - pausedAtRef.current
      setRunning(true)
    }
  }

  return (
    <div className="page">
      <header className="top">
        <div className="brand">
          <a className="brand__mark" href="https://bump-labs.com/">
            BUMP
          </a>
          <div>
            <p className="brand__title">Detection demo</p>
            <p className="brand__sub">
              Simulated live pipeline · no backend required
            </p>
          </div>
        </div>
        <nav className="top__links">
          <a href="https://bump-labs.com/">bump-labs.com</a>
          <a
            href="https://github.com/aarushkandukoori/bump-detection"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </header>

      {showAlert && (
        <div className="alert" role="alert">
          <span className="alert__dot" aria-hidden />
          <div>
            <strong>Bradycardia detected</strong>
            <p>
              Sustained HR ~{Math.round(sample.hr)} bpm — the decision that would
              trigger a dose and multi-channel alerts on device.
            </p>
          </div>
          <span className="alert__lat">
            {sample.latencyMs.toFixed(0)} ms
          </span>
        </div>
      )}

      <main className="main">
        <section className="intro">
          <h1>Watch the detection layer decide</h1>
          <p>
            A short loop of the open-source BUMP pipeline: synthetic ECG →
            R-peak / RR heart rate → sustained bradycardia rule → alert under a{' '}
            <strong>{LATENCY_BUDGET_MS} ms</strong> budget. This page is a
            client-side simulation of what the Docker stack demos locally.
          </p>
        </section>

        <div className="controls">
          <button type="button" className="btn btn--primary" onClick={replay}>
            Replay scenario
          </button>
          <button type="button" className="btn" onClick={toggle}>
            {running ? 'Pause' : 'Resume'}
          </button>
          <div className="progress" aria-hidden>
            <div className="progress__bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="phase">{phaseCopy(sample.phase)}</span>
        </div>

        <div className="stats">
          <Stat
            label="Heart rate"
            value={Math.round(sample.hr).toString()}
            unit="bpm"
            tone={hrTone}
          />
          <Stat
            label="Classification"
            value={sample.classLabel}
            tone={sample.bradycardia ? 'bad' : ''}
          />
          <Stat
            label="Reaction latency"
            value={sample.latencyMs.toFixed(0)}
            unit={`/ ${LATENCY_BUDGET_MS}ms`}
            tone={latencyTone}
          />
          <Stat
            label="Stream"
            value={running ? 'live' : 'paused'}
            tone={running ? 'good' : 'warn'}
          />
        </div>

        <section className="panel">
          <div className="panel__head">
            <h2>ECG waveform</h2>
            <span className="mono">{FS} Hz display · synthetic</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={waveData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <YAxis domain={[-0.6, 1.5]} width={36} stroke="#8a8a9a" tick={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="v"
                stroke={sample.bradycardia ? '#c45c5c' : '#2a9d6e'}
                dot={false}
                strokeWidth={1.6}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Heart-rate trend</h2>
            <span className="mono">60 bpm threshold</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hrData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <YAxis domain={[30, 100]} width={36} stroke="#8a8a9a" tick={{ fontSize: 11 }} />
              <ReferenceLine y={60} stroke="#7a1818" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="hr"
                stroke="#7a1818"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="footnotes">
          <p>
            <strong>Not a medical device.</strong> Demo only — synthetic signal,
            browser-simulated latency. Full stack (Redis, ONNX, TimescaleDB):{' '}
            <a href="https://github.com/aarushkandukoori/bump-detection">
              github.com/aarushkandukoori/bump-detection
            </a>
          </p>
        </section>
      </main>
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: string
  unit?: string
  tone?: string
}) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">
        {value}
        {unit ? <span className="stat__unit"> {unit}</span> : null}
      </div>
    </div>
  )
}
