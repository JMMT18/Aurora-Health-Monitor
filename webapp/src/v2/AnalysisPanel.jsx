import { useEffect } from 'react';

// Panel "Cardiac analysis": muestra todas las fórmulas calculadas en src/lib/hrv.js.
const f = (v, d = 0) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d));

function Row({ label, value, unit, note }) {
  return (<div className="an-row"><span className="an-l">{label}{note ? <small>{note}</small> : null}</span><span className="an-v mono">{value}<i>{unit}</i></span></div>);
}

function Poincare({ nn }) {
  if (!nn || nn.length < 3) return <div className="an-empty">Waiting for beats…</div>;
  const pts = nn.slice(0, -1).map((v, i) => [v, nn[i + 1]]);
  const all = nn, lo = Math.min(...all) - 20, hi = Math.max(...all) + 20, s = (v) => ((v - lo) / (hi - lo)) * 180 + 10;
  return (
    <svg viewBox="0 0 200 200" className="an-plot" role="img" aria-label="Poincaré plot: RR(i) versus RR(i+1)">
      <rect x="10" y="10" width="180" height="180" fill="none" stroke="var(--line)" />
      <line x1="10" y1="190" x2="190" y2="10" stroke="var(--line)" strokeDasharray="3 3" />
      {pts.map(([a, b], i) => <circle key={i} cx={s(a)} cy={200 - s(b)} r="2.6" fill="var(--cyan)" opacity=".75" />)}
      <text x="100" y="199" className="an-ax">RRᵢ (ms)</text>
      <text x="4" y="100" className="an-ax" transform="rotate(-90 4 100)">RRᵢ₊₁</text>
    </svg>
  );
}

function Psd({ sp }) {
  if (!sp) return <div className="an-empty">Needs at least 60 s of beats.</div>;
  const pts = sp.psd.filter((e) => e.f <= 0.5), maxP = Math.max(...pts.map((e) => e.p)) || 1;
  const x = (fr) => 10 + (fr / 0.5) * 280, y = (p) => 110 - (p / maxP) * 95;
  const bands = [['VLF', 0.0033, 0.04, '#5b6491'], ['LF', 0.04, 0.15, '#9d85ff'], ['HF', 0.15, 0.4, '#5ee6ff']];
  return (
    <svg viewBox="0 0 300 130" className="an-plot wide" role="img" aria-label="HRV power spectrum with VLF, LF and HF bands">
      {bands.map(([n, a, b, c]) => <g key={n}><rect x={x(a)} y="12" width={x(b) - x(a)} height="98" fill={c} opacity=".12" /><text x={(x(a) + x(b)) / 2} y="24" className="an-ax" fill={c}>{n}</text></g>)}
      <polyline fill="none" stroke="var(--text-1)" strokeWidth="1.4" points={pts.map((e) => `${x(e.f).toFixed(1)},${y(e.p).toFixed(1)}`).join(' ')} />
      <line x1="10" y1="110" x2="290" y2="110" stroke="var(--line)" />
      {[0, 0.1, 0.2, 0.3, 0.4, 0.5].map((t) => <text key={t} x={x(t)} y="124" className="an-ax">{t}</text>)}
    </svg>
  );
}

function Wave({ data }) {
  if (!data || data.length < 10) return <div className="an-empty">Waiting for signal…</div>;
  const lo = Math.min(...data), hi = Math.max(...data), sp = hi - lo || 1;
  return (<svg viewBox="0 0 300 80" className="an-plot wide" aria-hidden="true"><polyline fill="none" stroke="var(--cyan)" strokeWidth="1" points={data.map((v, i) => `${(i / (data.length - 1)) * 300},${75 - ((v - lo) / sp) * 70}`).join(' ')} /></svg>);
}

export default function AnalysisPanel({ a, onClose }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [onClose]);
  const td = a.td, pc = a.pc, bv = a.bv, sp = a.sp, qt = a.qt, edr = a.edr, emg = a.emg;
  const siLevel = bv?.SI == null ? '' : bv.SI < 150 ? 'normal' : bv.SI < 500 ? 'moderate stress' : 'high stress';
  return (
    <div className="rt-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="an-dialog" role="dialog" aria-modal="true" aria-labelledby="an-title">
        <div className="an-head">
          <div>
            <h2 id="an-title">{a.uiMode === 'EMG' ? 'Muscle analysis (sEMG)' : 'Cardiac analysis'}</h2>
            <p className="an-sub">{a.source === 'live' ? 'Live · ESP32 (AD8232, 200 Hz)' : 'Simulated 200 Hz ECG (no ESP32 connected)'} · updates every 2 s{a.uiMode !== 'EMG' ? ` · ${a.beats} beats · ${f(a.window, 0)} s of RR` : ''}</p>
          </div>
          <div className="an-actions">
            <div className="seg" role="group" aria-label="Sensor mode">
              <button className="btn sm" aria-pressed={a.uiMode === 'ECG'} onClick={() => a.setMode('ECG')}>ECG</button>
              <button className="btn sm" aria-pressed={a.uiMode === 'EMG'} onClick={() => a.setMode('EMG')}>sEMG</button>
            </div>
            <button className="btn sm" onClick={onClose}>Close</button>
          </div>
        </div>

        {a.uiMode === 'EMG' ? (
          <div className="an-grid">
            <section className="an-card"><h3>Surface EMG · last 1.28 s</h3>
              <Row label="MAV · mean absolute value" value={f(emg?.mav, 1)} unit=" ADC" />
              <Row label="RMS · root mean square" value={f(emg?.rms, 1)} unit=" ADC" />
              <Row label="WL · waveform length" value={f(emg?.wl, 0)} unit=" ADC" />
              <Row label="MNF · mean frequency" value={f(emg?.mnf, 1)} unit=" Hz" note="falls as the muscle fatigues" />
            </section>
            <section className="an-card"><h3>Signal (20 Hz high-pass)</h3><Wave data={a.emgWave} />
              <p className="an-note">The AD8232 board has an analog low-pass near 40 Hz, so activity above it arrives attenuated: MAV and RMS still track contraction, MNF reads lower than with a dedicated EMG amplifier.</p></section>
          </div>
        ) : (
          <div className="an-grid">
            <section className="an-card"><h3>Heart rate and HRV · time domain</h3>
              <Row label="Mean heart rate" value={f(a.bpm, 0)} unit=" bpm" note="mean of 60000/RRᵢ, last 10 s" />
              <Row label="Mean RR" value={f(td?.rrMean, 0)} unit=" ms" />
              <Row label="SDNN" value={f(td?.sdnn, 1)} unit=" ms" />
              <Row label="RMSSD" value={f(td?.rmssd, 1)} unit=" ms" />
              <Row label="SDSD" value={f(td?.sdsd, 1)} unit=" ms" />
              <Row label="NN50 · pNN50" value={`${td ? td.nn50 : '—'} · ${f(td?.pnn50, 1)}`} unit=" %" />
              <p className="an-note">Normal (NN) intervals of the last 60 s ({td ? td.N : 0} intervals; artifacts and ectopic beats removed).</p>
            </section>
            <section className="an-card"><h3>Poincaré plot</h3>
              <div className="an-split"><Poincare nn={a.nn} />
                <div>
                  <Row label="SD1" value={f(pc?.sd1, 1)} unit=" ms" note="short-term · parasympathetic" />
                  <Row label="SD2" value={f(pc?.sd2, 1)} unit=" ms" note="long-term" />
                  <Row label="SD2 / SD1" value={f(pc?.ratio, 2)} unit="" />
                  <Row label="Ellipse area S" value={f(pc?.area, 0)} unit=" ms²" />
                </div></div>
            </section>
            <section className="an-card"><h3>Baevsky stress index</h3>
              <Row label="Mo · mode" value={f(bv?.Mo, 3)} unit=" s" />
              <Row label="AMo · mode amplitude" value={f(bv?.AMo, 0)} unit=" %" />
              <Row label="MxDMn · range" value={f(bv?.MxDMn, 3)} unit=" s" />
              <Row label="SI = AMo / (2·Mo·MxDMn)" value={f(bv?.SI, 0)} unit=" s⁻²" note={siLevel && `${siLevel} (normal 50–150)`} />
            </section>
            <section className="an-card wide"><h3>Frequency domain · RR interpolated at 4 Hz, Hann window</h3>
              <Psd sp={sp} />
              <div className="an-cols">
                <Row label="VLF" value={f(sp?.vlf, 0)} unit=" ms²" note={sp && !sp.reliable.vlf ? 'needs 5 min' : ''} />
                <Row label="LF" value={f(sp?.lf, 0)} unit=" ms²" note={sp && !sp.reliable.lf ? 'needs 2 min' : ''} />
                <Row label="HF" value={f(sp?.hf, 0)} unit=" ms²" />
                <Row label="LF nu · HF nu" value={`${f(sp?.lfNu, 0)} · ${f(sp?.hfNu, 0)}`} unit="" />
                <Row label="LF / HF" value={f(sp?.lfHf, 2)} unit="" note="sympathovagal balance" />
              </div>
            </section>
            <section className="an-card"><h3>QT interval · corrected</h3>
              <Row label="QT (median)" value={f(qt && qt.QT * 1000, 0)} unit=" ms" note={qt ? `${qt.beats} beats, tangent method` : 'needs a clean ECG'} />
              <Row label="RR" value={f(qt && qt.RR * 1000, 0)} unit=" ms" />
              <Row label="QTc Bazett · QT/√RR" value={f(qt && qt.qtcB * 1000, 0)} unit=" ms" />
              <Row label="QTc Fridericia · QT/∛RR" value={f(qt && qt.qtcF * 1000, 0)} unit=" ms" />
              <Row label="QTc Framingham" value={f(qt && qt.qtcFram * 1000, 0)} unit=" ms" note="normal < 450 ms (men) / 460 ms (women)" />
            </section>
            <section className="an-card"><h3>ECG-derived respiration</h3>
              <Row label="R–S amplitude method" value={f(edr?.rpm, 1)} unit=" br/min" note={edr ? `${edr.peaks} breaths detected in the last minute` : 'needs ~20 s'} />
              <Row label="Mean breath period" value={f(edr?.Tresp, 2)} unit=" s" />
              <p className="an-note">Aᵢ = V(R peak) − V(S trough) per beat, band-pass 0.1–0.5 Hz, RPM = 60 / T̄.</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
