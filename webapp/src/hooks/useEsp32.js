import { useCallback, useEffect, useRef, useState } from 'react';

// Conexión con el firmware del ESP32 (Proyecto_Nasa/main) por USB serial, con Web Serial
// (solo Chrome / Edge, 115200 baudios). Líneas que imprime el firmware (ver main/ecg_task.c):
//   "E:n0,v1..v10"   10 muestras de ECG filtrado a 200 Hz (n0 = índice de la primera)
//   "G:n0,v1..v10"   igual en modo sEMG
//   "R:n"            latido: índice exacto de la muestra del pico R
//   "L:1" / "L:0"    electrodo suelto / reconectado
//   "M:bpm,rr,rmssd,sdnn,pnn50,resp,irreg"  cada 2 s (ventana deslizante)
//   "S:activity,pressurePa,bodyTempC,gsr"    cada 1 s (main.c)
//   "<n>"            formato viejo: muestra suelta a ~25 Hz (firmware anterior)
// La app manda "MODE EMG" / "MODE ECG" por el mismo puerto.
// El resultado queda en `live.current` y useVitals lo mezcla con la simulación.

const STALE_MS = 4000;
const GSR_BASELINE_N = 30;   // ~30 s de lecturas para fijar la línea base del GSR

// GSR V1.2 (Grove): la lectura sube con la resistencia de la piel. Se pasa a conductancia (µS)
// con la fórmula del fabricante escalada de 10 a 12 bits. GSR_CAL = lectura sin dedos
// (se ajusta con el potenciómetro del módulo; ~2048 en 12 bits).
const GSR_CAL = 2048;
export function gsrToMicroSiemens(raw) {
  const x = raw / 4, cal = GSR_CAL / 4;
  if (x >= cal || x <= 0) return null;
  const ohm = ((1024 + 2 * x) * 10000) / (cal - x);
  return ohm > 0 ? 1e6 / ohm : null;
}

const FS = 200, ECG_KEEP = 200 * 90, BEATS_KEEP_S = 300, EMG_KEEP = 200 * 4;

function emptyLive() {
  return {
    at: 0, fields: {}, lines: 0,
    ecg: [], ecgN0: 0, ecgAt: 0, fs: 25,               // onda de ECG (fs = 200 con líneas E:)
    beats: [], beatsAt: 0,                               // índices de muestra de cada pico R
    emg: [], emgN0: 0, emgAt: 0, mode: 'ECG',
    leadOffExplicit: null,
    gsrBase: null, gsrSamples: [], scrTimes: [], lastG: [], activeSec: 0, stillSince: Date.now(),
  };
}

// agrega un lote al buffer. Un hueco corto en la numeración (líneas perdidas, electrodo suelto un
// instante) se rellena repitiendo la última muestra para que la gráfica no se reinicie; solo se
// reinicia si el hueco es mayor a 2 s o la numeración retrocede (el ESP32 se reinició).
function pushBatch(L, key, n0, vals, keep) {
  const buf = L[key], n0Key = key + 'N0', expected = L[n0Key] + buf.length, gap = n0 - expected;
  if (!buf.length || gap < 0 || gap > 2 * FS) { L[key] = [...vals]; L[n0Key] = n0; }
  else { if (gap > 0) buf.push(...new Array(gap).fill(buf[buf.length - 1])); buf.push(...vals); }
  const over = L[key].length - keep;
  if (over > 0) { L[key].splice(0, over); L[n0Key] += over; }
}

export function useEsp32() {
  const live = useRef(emptyLive());
  const [status, setStatus] = useState({ state: 'idle', msg: '' }); // idle · live · stale · error
  const stop = useRef(() => {});
  // Web Serial: solo Chrome/Edge, y no dentro de un iframe (por ejemplo, el link publicado)
  const embedded = typeof window !== 'undefined' && window.self !== window.top;
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator && !embedded;

  const ingestMetrics = useCallback((p) => {
    const [bpm, , rmssd, , , resp, irregular] = p, f = live.current.fields;
    live.current.at = Date.now();
    if (bpm > 0) f.hr = bpm;
    if (rmssd > 0) f.hrv = rmssd;
    if (resp > 0) f.resp = resp;
    f.irregular = irregular ? 1 : 0;
  }, []);

  const ingestSlow = useCallback((p) => {
    const [activity, pressurePa, bodyTemp, gsrRaw] = p, L = live.current, f = L.fields, now = Date.now();
    L.at = now;
    // electrodo suelto: si el firmware manda L:x se usa eso; si no (firmware viejo), por ausencia de ECG
    if (L.leadOffExplicit != null) f.leadOff = L.leadOffExplicit;
    else if (L.mode === 'ECG') f.leadOff = !L.ecgAt || now - L.ecgAt > 2000 ? 1 : 0;
    if (bodyTemp > 20 && bodyTemp < 45) f.temp = bodyTemp;            // fuera de rango = termistor abierto o en corto
    if (pressurePa > 30000) {
      f.cabin = pressurePa / 1000;                                      // Pa → kPa (0 = BMP180 sin conectar)
      // referencia = presión local de los primeros 5 s (en altura no es 101.3 kPa; en Bogotá ~75, Medellín ~85)
      L.pSamples = L.pSamples || [];
      if (!L.cabinRef) { L.pSamples.push(f.cabin); if (L.pSamples.length >= 5) L.cabinRef = L.pSamples.reduce((a, b) => a + b) / L.pSamples.length; }
      if (L.cabinRef) f.cabinRef = L.cabinRef;
    }
    // GSR → conductancia → % sobre la línea base + picos (SCR) por minuto
    // conductancia: en µS con la fórmula del módulo si la lectura está por debajo de GSR_CAL; si no
    // (módulo con otro ajuste del potenciómetro), conductancia relativa ∝ 1/lectura. El método se fija
    // con la línea base para no mezclar escalas.
    if (L.gsrMethod == null && gsrRaw > 0) L.gsrMethod = gsrToMicroSiemens(gsrRaw) ? 'uS' : 'rel';
    const g = gsrRaw > 0 ? (L.gsrMethod === 'uS' ? gsrToMicroSiemens(gsrRaw) : 1e4 / gsrRaw) : null;
    if (g) {
      if (L.gsrBase == null) {
        L.gsrSamples.push(g);
        if (L.gsrSamples.length >= GSR_BASELINE_N) L.gsrBase = L.gsrSamples.reduce((a, b) => a + b, 0) / L.gsrSamples.length;
      } else {
        f.gsr = ((g - L.gsrBase) / L.gsrBase) * 100;
        L.lastG.push(g); if (L.lastG.length > 3) L.lastG.shift();
        if (L.lastG.length === 3 && L.lastG[2] - L.lastG[0] > 0.03 * L.gsrBase && now - (L.scrTimes.at(-1) || 0) > 3000) L.scrTimes.push(now);
        L.scrTimes = L.scrTimes.filter((t) => now - t < 60000);
        f.scr = L.scrTimes.length;
      }
    }
    // "activity" del firmware = intensidad de movimiento 0–100 (desviación de 1 g), no la meta diaria
    if (activity > 15) { L.activeSec += 1; L.stillSince = now; }
    f.movement = activity;
    f.sedentaryMin = (now - L.stillSince) / 60000;
  }, []);

  // procesa una línea del puerto serial (exportado también para pruebas sin hardware)
  const ingestLine = useCallback((raw) => {
    const line = raw.trim(), L = live.current;
    if (!line) return;
    L.lines++;
    const now = Date.now();
    if (line.startsWith('E:') || line.startsWith('G:')) {
      const p = line.slice(2).split(',').map(Number);
      if (p.length < 2 || p.some(Number.isNaN)) return;
      if (line[0] === 'E') { pushBatch(L, 'ecg', p[0], p.slice(1), ECG_KEEP); L.fs = FS; L.ecgAt = now; L.mode = 'ECG'; }
      else { pushBatch(L, 'emg', p[0], p.slice(1), EMG_KEEP); L.emgAt = now; L.mode = 'EMG'; }
      if (L.leadOffExplicit == null) L.fields.leadOff = 0;
      L.at = now;
    } else if (line.startsWith('R:')) {
      const n = Number(line.slice(2));
      if (!Number.isNaN(n)) {
        if (L.beats.length && n <= L.beats[L.beats.length - 1]) L.beats = [];   // el ESP32 se reinició
        L.beats.push(n); L.beatsAt = now;
        const minN = n - BEATS_KEEP_S * FS; while (L.beats.length && L.beats[0] < minN) L.beats.shift();
      }
    } else if (line.startsWith('L:')) {
      L.leadOffExplicit = line[2] === '1' ? 1 : 0; L.fields.leadOff = L.leadOffExplicit;
      // no se borra la onda: si el electrodo vuelve enseguida, la gráfica sigue sin reiniciarse
    } else if (line.startsWith('MODE:')) {
      L.mode = line.slice(5).trim() === 'EMG' ? 'EMG' : 'ECG';
    } else if (/^-?\d+$/.test(line)) {
      L.ecg.push(+line); if (L.ecg.length > 400) L.ecg.splice(0, L.ecg.length - 400);
      L.fs = 25; L.ecgAt = now; if (L.leadOffExplicit == null) L.fields.leadOff = 0; L.at = now;
    } else if (line.startsWith('M:') || line.startsWith('S:')) {
      const p = line.slice(2).split(',').map(Number);
      if (p.some(Number.isNaN)) return;
      if (line[0] === 'M' && p.length === 7) ingestMetrics(p);
      if (line[0] === 'S' && p.length === 4) ingestSlow(p);
    } else if (/leads?.?off|electrodo/i.test(line)) {
      L.fields.leadOff = 1;                                            // logs del firmware al soltarse un electrodo
    }
  }, [ingestMetrics, ingestSlow]);

  const disconnect = useCallback(() => {
    stop.current(); stop.current = () => {};
    live.current = emptyLive();
    setStatus({ state: 'idle', msg: '' });
  }, []);

  const writerRef = useRef(null);
  // manda un comando de texto al ESP32 (p. ej. "MODE EMG")
  const send = useCallback(async (cmd) => {
    const w = writerRef.current;
    if (!w) { if (cmd.startsWith('MODE ')) live.current.mode = cmd.slice(5); return false; }   // modo prueba
    try { await w.write(new TextEncoder().encode(cmd + '\n')); return true; } catch { return false; }
  }, []);

  const connect = useCallback(async () => {
    if (!supported) { setStatus({ state: 'error', msg: embedded ? 'USB is not available inside this preview. Run the app locally (npm run dev) in Chrome or Edge.' : 'This browser has no Web Serial. Open the app in Chrome or Edge.' }); return; }
    stop.current();
    let port;
    try { port = await navigator.serial.requestPort(); await port.open({ baudRate: 115200 }); }
    catch { setStatus({ state: 'error', msg: 'No port selected, or the port is busy (close the serial monitor or idf.py monitor first).' }); return; }
    live.current = emptyLive();
    setStatus({ state: 'live', msg: 'USB serial · 115200' });
    let alive = true, reader;
    (async () => {
      const dec = new TextDecoder(); let buf = '';
      try {
        reader = port.readable.getReader();
        try { writerRef.current = port.writable.getWriter(); } catch { writerRef.current = null; }
        while (alive) {
          const { value, done } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n')) >= 0) { ingestLine(buf.slice(0, i)); buf = buf.slice(i + 1); }
        }
      } catch { if (alive) setStatus({ state: 'error', msg: 'The serial connection was lost. Check the USB cable.' }); }
      finally { try { writerRef.current?.releaseLock(); writerRef.current = null; reader?.releaseLock(); await port.close(); } catch { /* ya cerrado */ } }
    })();
    stop.current = () => { alive = false; try { reader?.cancel(); } catch { /* nada */ } };
  }, [supported, ingestLine]);

  const recalibrateGsr = useCallback(() => { const L = live.current; L.gsrBase = null; L.gsrSamples = []; L.scrTimes = []; L.gsrMethod = null; }, []);

  // avisar si dejan de llegar datos
  useEffect(() => {
    const iv = setInterval(() => {
      const L = live.current;
      setStatus((s) => {
        if (s.state === 'live' && L.at && Date.now() - L.at > STALE_MS) return { state: 'stale', msg: 'No data for a few seconds…' };
        if (s.state === 'stale' && L.at && Date.now() - L.at < STALE_MS) return { state: 'live', msg: 'USB serial · 115200' };
        return s;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => () => stop.current(), []);

  // prueba sin hardware (solo en desarrollo): window.__auroraSerial('S:12,101325,36.8,1650')
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__auroraSerial = (l) => { if (status.state === 'idle') setStatus({ state: 'live', msg: 'Test feed' }); ingestLine(l); };
    return () => { delete window.__auroraSerial; };
  }, [ingestLine, status.state]);

  return { live, status, connect, disconnect, supported, recalibrateGsr, send };
}
