import { useEffect, useRef } from 'react';
import { STATUS, cabinStatus, CABIN_BAND, CABIN_TEMP_BAND, LEAK_BAND, SCENARIOS, band, fmt, overall, RECS } from '../data/vitals.js';

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function TopBar({ V, startedAt, scenario, onScenario, esp }) {
  const st = esp.status.state, on = st === 'live' || st === 'stale';
  const L = esp.live.current, calib = on && L.gsrBase == null && L.gsrSamples.length > 0;
  const cab = cabinStatus(V), ct = band(V.cabinTemp, CABIN_TEMP_BAND), lk = band(V.leak, LEAK_BAND);
  const el = Math.floor((Date.now() - startedAt) / 1000);
  const clock = `Day 47 · ${String(9 + Math.floor(el / 60)).padStart(2, '0')}:${String(el % 60).padStart(2, '0')}`;
  return (
    <header className="bar">
      <div className="brand">
        <img src={`${import.meta.env.BASE_URL}logo-aurora.svg`} alt="" width="34" height="34" />
        <b>Aurora</b>
      </div>
      {on ? (
        <span className={`chip esp ${st}`}><span className="dot" />{st === 'live' ? 'Live · ESP32' : 'ESP32 · waiting for data'} <span className="mono">{esp.status.msg}</span>
          <button className="linkbtn" onClick={esp.disconnect}>Disconnect</button></span>
      ) : (
        <label className="chip scen"><span className="dot" />Simulated data · scenario
          <select value={scenario} onChange={(e) => onScenario(e.target.value)} aria-label="Demo scenario">
            {Object.entries(SCENARIOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      )}
      {!on && <button className="btn sm connect" onClick={esp.connect} title={esp.supported ? 'Connect the ESP32 by USB' : 'Web Serial needs Chrome or Edge'}>Connect ESP32 (USB)</button>}
      {calib && <span className="chip">GSR baseline <span className="mono">{L.gsrSamples.length}/30 s</span></span>}
      {on && L.gsrBase != null && <button className="btn sm" onClick={esp.recalibrateGsr}>Recalibrate GSR</button>}
      {esp.status.state === 'error' && <span className="chip err" role="alert">{esp.status.msg}</span>}
      <span className="spacer" />
      <span className="chip mono">{clock}</span>
      <span className="chip"><span className={`pill st-${cab} mini`}><i>{STATUS[cab].icon}</i></span>Cabin <span className="mono">{fmt(V, 'cabin')} kPa</span>{V.cabinRef ? <small className="ref"> ref {V.cabinRef.toFixed(1)}</small> : null}</span>
      <span className="chip"><span className={`pill st-${ct} mini`}><i>{STATUS[ct].icon}</i></span><span className="mono">{fmt(V, 'cabinTemp')} °C</span></span>
      {lk !== 'ok' && <span className="chip leak"><span className={`pill st-${lk} mini`}><i>{STATUS[lk].icon}</i></span>Leak <span className="mono">{V.leak.toFixed(1)} hPa/min</span></span>}
    </header>
  );
}

export function StatusPanel({ V, top }) {
  const o = overall(V);
  // el estado general nunca es menos grave que la recomendación más urgente
  if (top && top !== 'ok' && (top === 'crit' || o.status === 'ok')) o.status = top;
  return (
    <section className="panel ind" aria-labelledby="h-ind" aria-live="polite">
      <div className={`ring ${o.status}`}><span>{STATUS[o.status].icon}</span></div>
      <div className="ind-text">
        <span className="label" id="h-ind">Overall status</span>
        <strong className={o.status}>{STATUS[o.status].word}</strong>
        <p>{o.bad ? `${o.bad} of ${o.total} readings out of range · check: ${o.zonesBad.join(', ')}.` : `All ${o.total} readings are in range. Keep it up.`}</p>
      </div>
    </section>
  );
}

function ecgWave(p) {
  const g = (c, w, a) => a * Math.exp(-((p - c) ** 2) / (2 * w * w));
  return g(.18, .025, .12) - g(.335, .008, .12) + g(.36, .011, 1) - g(.385, .009, .25) + g(.6, .045, .28);
}

export function EcgPanel({ V, liveRef, onAnalysis }) {
  const ref = useRef(null), hr = useRef(V.hr), off = useRef(V.leadOff);
  hr.current = V.hr; off.current = V.leadOff;
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d');
    let x = 0, phase = 0, lastY = null, lastT = performance.now(), raf, iv;
    const grid = (x0, w) => {
      ctx.save(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(42,48,96,.55)'; ctx.lineWidth = 1;
      const step = 20 * Math.min(2, devicePixelRatio || 1);
      for (let gx = Math.ceil(x0 / step) * step; gx < x0 + w; gx += step) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, c.height); ctx.stroke(); }
      for (let gy = 0; gy < c.height; gy += step) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + w, gy); ctx.stroke(); }
      ctx.restore();
    };
    let wasLive = false;
    const loop = (now) => {
      const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) {
        c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); x = 0; lastY = null; grid(0, c.width);
      }
      // ECG real del AD8232 (muestras filtradas que manda el ESP32 por serial): se dibuja la ventana completa
      const L = liveRef?.current;
      if (L && L.ecgAt && Date.now() - L.ecgAt < 2000 && L.ecg.length > 20) {
        // eje de tiempo fijo de 5 s: si hay pocas muestras se dibujan a la derecha, sin estirarse
        const win = (L.fs || 25) * 5, s = L.ecg.slice(-win), lo = Math.min(...s), hi = Math.max(...s), span = Math.max(40, hi - lo), off = win - s.length;
        ctx.save(); ctx.shadowBlur = 0; ctx.clearRect(0, 0, c.width, c.height); grid(0, c.width); ctx.restore();
        ctx.lineWidth = 2 * dpr; ctx.strokeStyle = '#5ee6ff'; ctx.shadowColor = 'rgba(94,230,255,.6)'; ctx.shadowBlur = 6 * dpr;
        ctx.beginPath();
        s.forEach((v, i) => { const px = ((i + off) / (win - 1)) * c.width, py = c.height * .9 - ((v - lo) / span) * c.height * .8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        ctx.stroke(); wasLive = true;
        if (!RM) raf = requestAnimationFrame(loop);
        return;
      }
      if (wasLive) { wasLive = false; x = 0; lastY = null; ctx.save(); ctx.shadowBlur = 0; ctx.clearRect(0, 0, c.width, c.height); grid(0, c.width); ctx.restore(); }
      const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
      const speed = c.width / 4, n = Math.max(1, Math.round(speed * dt));
      ctx.lineWidth = 2 * dpr; ctx.strokeStyle = '#5ee6ff'; ctx.shadowColor = 'rgba(94,230,255,.6)'; ctx.shadowBlur = 6 * dpr;
      for (let i = 0; i < n; i++) {
        phase = (phase + hr.current / 60 / speed) % 1;
        const y = off.current ? c.height * .5 + (Math.random() - .5) * dpr * 3 : c.height * .68 - ecgWave(phase) * c.height * .55 + (Math.random() - .5) * dpr * 1.2;
        ctx.save(); ctx.shadowBlur = 0; ctx.clearRect(x + 1, 0, 14 * dpr, c.height); grid(x + 1, 14 * dpr); ctx.restore();
        if (lastY !== null && x > 0) { ctx.beginPath(); ctx.moveTo(x - 1, lastY); ctx.lineTo(x, y); ctx.stroke(); }
        lastY = y; x++; if (x >= c.width) { x = 0; lastY = null; }
      }
      if (!RM) raf = requestAnimationFrame(loop);
    };
    if (RM) iv = setInterval(() => { lastT = performance.now() - 250; loop(performance.now()); }, 250);
    else raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); };
  }, []);
  return (
    <section className="panel ecg" aria-labelledby="h-ecg">
      <div className="panel-head"><h2 id="h-ecg">{V.live?.hr ? 'Live ECG' : 'ECG (simulated)'}</h2>{V.leadOff ? <span className="pill st-crit"><i>✕</i>Electrode off</span> : <span className="pill st-ok"><i>✓</i>Electrodes</span>}</div>
      <canvas ref={ref} role="img" aria-label="Real-time electrocardiogram" />
      <div className="ecg-foot"><span><b className="mono">{fmt(V, 'hr')}</b> <small>bpm · AD8232</small></span><small>{V.leadOff ? 'Signal paused' : `RR ${Math.round(60000 / V.hr)} ms`}</small><button className="btn sm" onClick={onAnalysis}>Analysis</button></div>
    </section>
  );
}

export function RecsPanel({ recs, active, onPick }) {
  return (
    <section className="panel recs" aria-labelledby="h-recs">
      <div className="panel-head"><h2 id="h-recs">What to do now</h2><span className="label">Based on your data</span></div>
      <div className="rec-list">
        {recs.map((r) => (
          <button key={r.k} className={`rec ${r.st}`} title={r.why} aria-pressed={active === r.k} onClick={() => onPick(r.k)}>
            <span className="stripe" />
            <span className="rec-txt"><strong>{RECS[r.k].title}</strong><small>{RECS[r.k].dur} · {r.why}</small></span>
            <span className="go">▶ View</span>
          </button>
        ))}
      </div>
    </section>
  );
}
