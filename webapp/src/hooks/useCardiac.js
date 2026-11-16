import { useEffect, useRef, useState } from 'react';
import { rrFromBeats, cleanNN, timeDomain, poincare, baevsky, spectrum, qtAnalysis, edrAmplitude, emgFeatures } from '../lib/hrv.js';

// Análisis cardíaco y muscular cada 2 s.
//  · Con el ESP32 conectado: latidos exactos (líneas R:) y ECG a 200 Hz (líneas E:), o sEMG (G:).
//  · Sin ESP32: un generador de ECG sintético a 200 Hz (con variabilidad, respiración y QT realistas)
//    alimenta exactamente el mismo cálculo, para la demo.
const FS = 200;
const UPDATE_MS = 2000;

function makeSim() {
  return { n: 0, beats: [], ecg: [], ecgN0: 0, nextBeat: 0.5 * FS, emg: [], emgN0: 0, t0: performance.now() };
}

// suma de gaussianas (P, Q, R, S, T) alrededor de cada latido
function simSample(sim, i, resp) {
  const g = (t, c, w, a) => a * Math.exp(-((t - c) ** 2) / (2 * w * w));
  const t = i / FS;
  let v = 0;
  for (let k = sim.beats.length - 1; k >= 0 && k >= sim.beats.length - 3; k--) {
    const tr = sim.beats[k] / FS, rr = k > 0 ? (sim.beats[k] - sim.beats[k - 1]) / FS : 0.83;
    const qt = 0.40 * Math.sqrt(rr), amp = 1 + 0.12 * Math.sin(2 * Math.PI * (resp / 60) * tr);
    v += g(t, tr - 0.16, 0.025, 0.12) - g(t, tr - 0.025, 0.008, 0.1 * amp) + g(t, tr, 0.01, amp)
      - g(t, tr + 0.025, 0.009, 0.25 * amp) + g(t, tr + qt - 0.12, 0.035, 0.3);
  }
  return Math.round(2048 + 600 * v + (Math.random() - 0.5) * 8);
}

function advanceSim(sim, samples, hr, resp, mode) {
  for (let j = 0; j < samples; j++) {
    const i = ++sim.n;
    if (i >= sim.nextBeat) {
      sim.beats.push(i);
      const ts = i / FS;
      const rr = (60 / Math.max(35, hr)) * (1 + 0.03 * Math.sin(2 * Math.PI * 0.1 * ts) + 0.04 * Math.sin(2 * Math.PI * (resp / 60) * ts)) + (Math.random() - 0.5) * 0.012;
      sim.nextBeat = i + Math.round(rr * FS);
    }
    if (mode === 'EMG') {
      const burst = Math.sin(2 * Math.PI * 0.25 * (i / FS)) > 0 ? 1 : 0.15;   // contracciones de 2 s
      sim.emg.push(Math.round((Math.random() * 2 - 1) * 180 * burst));
    } else {
      sim.ecg.push(simSample(sim, i, resp));
    }
  }
  const keep = FS * 90;
  if (sim.ecg.length > keep) { const o = sim.ecg.length - keep; sim.ecg.splice(0, o); sim.ecgN0 += o; }
  if (!sim.ecg.length) sim.ecgN0 = sim.n + 1;
  if (sim.emg.length > FS * 4) sim.emg.splice(0, sim.emg.length - FS * 4);
  const minN = sim.n - 300 * FS;
  while (sim.beats.length && sim.beats[0] < minN) sim.beats.shift();
}

function analyze(src) {
  const { beats, ecg, ecgN0, emg, mode, nowN } = src;
  const out = { mode, beats: beats.length };
  if (mode === 'EMG') { out.emg = emgFeatures(emg.slice(-256), FS); out.emgWave = emg.slice(-400); return out; }
  if (beats.length < 4) return out;
  const t = beats.map((n) => n / FS), rr = rrFromBeats(t), rrT = t.slice(1);
  // BPM: latidos de los últimos 10 s
  const rr10 = rr.filter((v, i) => rrT[i] >= nowN / FS - 10 && v >= 300 && v <= 2000);
  if (rr10.length) out.bpm = rr10.map((v) => 60000 / v).reduce((a, b) => a + b) / rr10.length;
  // HRV (tiempo, Poincaré, Baevsky): intervalos NN del último minuto
  const last60 = rr.map((v, i) => [v, rrT[i]]).filter(([, ti]) => ti >= nowN / FS - 60);
  const { nn, t: nnT } = cleanNN(last60.map((e) => e[0]), last60.map((e) => e[1]));
  out.nn = nn; out.nnT = nnT;
  out.td = timeDomain(nn);
  out.pc = poincare(out.td);
  out.bv = baevsky(nn);
  // espectro: NN de los últimos 5 min (mínimo 60 s)
  const all = cleanNN(rr, rrT);
  out.sp = spectrum(all.t, all.nn);
  out.window = all.t.length ? all.t[all.t.length - 1] - all.t[0] : 0;
  // morfología y EDR: ECG del último minuto
  if (ecg.length > FS * 10) {
    const start = Math.max(0, ecg.length - FS * 60), n0 = ecgN0 + start, seg = ecg.slice(start);
    const rIn = beats.filter((n) => n >= n0 && n < n0 + seg.length);
    out.qt = qtAnalysis(seg, n0, rIn, FS);
    out.edr = edrAmplitude(seg, n0, rIn, FS);
  }
  return out;
}

export function useCardiac(V, esp) {
  const sim = useRef(makeSim());
  const [mode, setModeState] = useState('ECG');
  const [res, setRes] = useState({ mode: 'ECG', beats: 0 });
  const vRef = useRef(V); vRef.current = V;
  const modeRef = useRef(mode); modeRef.current = mode;
  const espRef = useRef(esp); espRef.current = esp;

  // el simulador avanza en tiempo real (5 veces por segundo)
  useEffect(() => {
    let last = performance.now();
    const iv = setInterval(() => {
      const now = performance.now(), samples = Math.round(((now - last) / 1000) * FS); last += (samples / FS) * 1000;
      advanceSim(sim.current, samples, vRef.current.hr || 72, vRef.current.resp || 15, modeRef.current);
    }, 200);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      const esp = espRef.current, L = esp.live.current;
      const live = esp.status.state === 'live' && (L.beats.length > 3 || L.emg.length > 64) && L.fs === FS;
      const src = live
        ? { beats: L.beats, ecg: L.ecg, ecgN0: L.ecgN0, emg: L.emg, mode: L.mode, nowN: L.ecg.length ? L.ecgN0 + L.ecg.length : (L.beats.at(-1) || 0) }
        : { ...sim.current, mode: modeRef.current, nowN: sim.current.n };
      const r = analyze(src);
      r.source = live ? 'live' : 'sim';
      // con datos reales, la app reemplaza las métricas del firmware por las calculadas aquí (más precisas)
      if (live && r.mode === 'ECG') {
        if (r.bpm) L.fields.hr = r.bpm;
        if (r.td) L.fields.hrv = r.td.rmssd;
        if (r.edr) L.fields.resp = r.edr.rpm;
      }
      setRes(r);
    }, UPDATE_MS);
    return () => clearInterval(iv);
  }, []);

  const setMode = async (m) => {
    setModeState(m);
    if (esp.status.state === 'live') await esp.send(`MODE ${m}`);
    if (m === 'EMG') { sim.current.emg = []; } else { sim.current.ecg = []; sim.current.ecgN0 = sim.current.n + 1; }
  };
  return { ...res, setMode, uiMode: mode };
}
