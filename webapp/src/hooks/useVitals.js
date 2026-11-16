import { useCallback, useEffect, useRef, useState } from 'react';
import { METRICS, stressIndex } from '../data/vitals.js';
import { useEsp32 } from './useEsp32.js';

// Fuente de datos de la app v2. Hoy simula; para conectar el ESP32 basta con reemplazar
// `simulateStep` por la lectura de GET /readings (ver main/http_api.c) y conservar la forma { V, H }.
const HISTORY = 40;
const TICK_MS = 1000;
const NOISY = ['temp', 'hr', 'hrv', 'resp', 'gsr', 'scr', 'activity', 'cabin', 'cabinTemp'];

// Escenarios de demo: `to` = valor objetivo de las señales con ruido, `set` = valores fijos.
const SCENES = {
  normal: { set: { sleep: 7.6 } },
  stress: { to: { gsr: 46, hr: 104, hrv: 18, resp: 21, scr: 12 } },
  fever: { to: { temp: 38.3, hr: 98 } },
  heat: { to: { cabinTemp: 29.5, temp: 37.6, gsr: 32, hr: 108 } },
  leak: { leak: true },
  fall: { set: { falls: 1 }, fall: true, to: { hr: 96 } },
  electrodes: { set: { leadOff: 1 } },
  hypoglycemia: { set: { glucose: 62, tremor: 7.5 }, to: { hr: 88 } },
  fatigue: { set: { sleep: 4.6, reaction: 356 }, to: { hrv: 21 } },
  lowbp: { set: { bpSys: 86, bpDia: 56 } },
  brady: { to: { hr: 46 } },
  sedentary: { set: { sedentary: 125 }, to: { activity: 28 } },
  cold: { to: { cabinTemp: 16, temp: 35.8 } },
  lowmood: { set: { mood: 2 } },
};

function initial() {
  const V = { bpSys: 112, bpDia: 74, posture: 'Sitting', leadOff: 0, fallAt: 0, reactionAt: 0, leak: 0, tremor: 0 };
  const H = {};
  for (const [id, m] of Object.entries(METRICS)) {
    if (m.alias || m.bp || m.posture) continue;
    V[id] = V[id] ?? m.fixed ?? m.base ?? 0;
  }
  V.stress = stressIndex(V);
  for (const id of Object.keys(V)) if (typeof V[id] === 'number') H[id] = Array.from({ length: HISTORY }, () => V[id]);
  return { V, H, t: 0, base: { ...V } };
}

function simulateStep(prev, elapsedS, scenario, sceneStart, live) {
  const V = { ...prev.V }, H = {};
  // valores fijos vuelven a su base salvo los registrados por el usuario (reaction / mood)
  for (const k of ['glucose', 'sleep', 'falls', 'tremor', 'sedentary', 'bpSys', 'bpDia', 'leadOff']) V[k] = prev.base[k];
  if (!prev.V.reactionAt) V.reaction = prev.base.reaction;
  let to = {};
  if (scenario === 'auto') {
    const el = elapsedS % 75, ramp = el > 12 && el < 40 ? Math.min(1, (el - 12) / 6, (40 - el) / 4) : 0;
    to = { gsr: 4 + 42 * ramp, hr: 72 + 34 * ramp, hrv: 44 - 24 * ramp, resp: 15 + 6 * ramp, scr: 3 + 8 * ramp };
  } else {
    const sc = SCENES[scenario] || {};
    to = sc.to || {};
    Object.assign(V, sc.set || {});
    if (sc.fall) V.fallAt = sceneStart;
  }
  if (scenario !== 'fall') V.fallAt = 0;
  for (const id of NOISY) {
    const m = METRICS[id];
    if (id === 'cabin' && scenario === 'leak') { V.cabin = Math.max(m.min, V.cabin - 0.05); continue; }
    const target = to[id] ?? m.base;
    V[id] += (target - V[id]) * 0.25 + (Math.random() * 2 - 1) * m.step;
    V[id] = Math.min(m.max, Math.max(m.min, V[id]));
  }
  if (scenario !== 'lowmood') V.mood = prev.base.mood;
  if (Math.random() < 0.5) V.steps += Math.round(Math.random() * 4);
  V.posture = scenario === 'brady' ? 'Lying down' : 'Sitting';
  V.irregular = 0;
  V.cabinRef = 0;
  // datos reales del ESP32: reemplazan la simulación en cada medida que el hardware entrega
  V.live = {};
  if (live) {
    const f = live.fields;
    for (const k of ['leadOff', 'hr', 'hrv', 'resp', 'irregular', 'temp', 'cabin', 'cabinRef', 'cabinTemp', 'gsr', 'scr', 'posture']) {
      if (f[k] !== undefined) { V[k] = f[k]; V.live[k] = true; }
    }
    if (f.sedentaryMin !== undefined) { V.sedentary = f.sedentaryMin; V.live.sedentary = true; }
    if (live.activeSec !== undefined && f.movement !== undefined) {
      V.activeMin = prev.base.activeMin + live.activeSec / 60;
      V.activity = Math.min(100, (V.activeMin / 60) * 100);
      V.live.activeMin = V.live.activity = true;
    }
    if (V.live.hr) V.live.hrHand = true;
    // al pasar de simulado a real, la presión salta: se reinicia su historial para no confundirlo con una fuga
    if (V.live.cabin && !prev.V.live?.cabin) prev = { ...prev, H: { ...prev.H, cabin: prev.H.cabin.map(() => V.cabin) } };
  }
  // velocidad de caída de presión (hPa/min): promedio de 10 s de hace 20 s contra los últimos 10 s (filtra el ruido)
  const hc = [...prev.H.cabin.slice(1), V.cabin], mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  V.leak = Math.max(0, (mean(hc.slice(-30, -20)) - mean(hc.slice(-10))) * 10 * 3);
  V.stress = stressIndex(V);
  for (const id of Object.keys(prev.H)) H[id] = [...prev.H[id].slice(1), V[id]];
  return { ...prev, V, H, t: prev.t + 1 };
}

export function useVitals() {
  const [snap, setSnap] = useState(initial);
  const [scenario, setScenarioState] = useState('auto');
  const t0 = useRef(Date.now()), sc = useRef('auto'), scStart = useRef(Date.now());
  const esp = useEsp32();
  useEffect(() => {
    const iv = setInterval(() => {
      const L = esp.live.current, fresh = L.at && Date.now() - L.at < 4000 ? L : null;
      setSnap((p) => simulateStep(p, (Date.now() - t0.current) / 1000, fresh ? 'normal' : sc.current, scStart.current, fresh));
    }, TICK_MS);
    return () => clearInterval(iv);
  }, []);
  const setScenario = useCallback((s) => {
    sc.current = s; scStart.current = Date.now(); setScenarioState(s);
    // restablecer la cabina al salir de la fuga
    if (s !== 'leak') setSnap((p) => ({ ...p, V: { ...p.V, cabin: 101.3, leak: 0 }, H: { ...p.H, cabin: p.H.cabin.map(() => 101.3) } }));
  }, []);
  // registrar un valor medido por el usuario (test de reacción, ánimo…)
  const record = useCallback((id, value) => {
    setSnap((p) => ({ ...p, base: { ...p.base, [id]: value }, V: { ...p.V, [id]: value, ...(id === 'reaction' ? { reactionAt: Date.now() } : {}) } }));
  }, []);
  // confirmar "estoy bien" después de una caída
  const clearFall = useCallback(() => { sc.current = 'normal'; setScenarioState('normal'); }, []);
  return { ...snap, startedAt: t0.current, scenario, setScenario, record, clearFall, esp };
}
