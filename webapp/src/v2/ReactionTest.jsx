import { useCallback, useEffect, useRef, useState } from 'react';

// Test de tiempo de reacción (estilo PVT corto, referencia: sleepstudy).
// 5 intentos: el círculo se enciende tras una espera aleatoria; se toca (o Espacio/Enter) lo antes posible.
const TRIES = 5;

export default function ReactionTest({ onDone, onClose }) {
  const [phase, setPhase] = useState('intro'); // intro · wait · go · early · result · done
  const [times, setTimes] = useState([]);
  const goAt = useRef(0), timer = useRef(0), boxRef = useRef(null);

  const arm = useCallback(() => {
    setPhase('wait');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { goAt.current = performance.now(); setPhase('go'); }, 1500 + Math.random() * 2500);
  }, []);

  const tap = useCallback(() => {
    if (phase === 'intro' || phase === 'early' || phase === 'result') { arm(); return; }
    if (phase === 'wait') { clearTimeout(timer.current); setPhase('early'); return; }
    if (phase === 'go') {
      const ms = Math.round(performance.now() - goAt.current);
      const next = [...times, ms];
      setTimes(next);
      setPhase(next.length >= TRIES ? 'done' : 'result');
    }
  }, [phase, times, arm]);

  useEffect(() => { boxRef.current?.focus(); return () => clearTimeout(timer.current); }, []);
  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') onClose();
      else if ((e.key === ' ' || e.key === 'Enter') && phase !== 'done') { e.preventDefault(); tap(); }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [tap, phase, onClose]);

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const msg = {
    intro: ['Reaction time test', `Tap the circle (or press Space) as soon as it lights up. ${TRIES} tries.`, 'Start'],
    wait: ['Wait…', 'Don\'t tap yet.', ''],
    go: ['Tap now!', '', ''],
    early: ['Too soon', 'Wait until the circle lights up. Tap to try again.', 'Try again'],
    result: [`${times[times.length - 1]} ms`, `Try ${times.length} of ${TRIES}. Tap for the next one.`, 'Next'],
    done: [`Average: ${avg} ms`, avg > 400 ? 'Critical: avoid complex tasks and rest before retesting.' : avg > 320 ? 'Slower than usual: rest before critical tasks.' : 'Normal (under 320 ms).', ''],
  }[phase];

  return (
    <div className="rt-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rt-dialog" role="dialog" aria-modal="true" aria-labelledby="rt-title">
        <div className="rt-head">
          <h2 id="rt-title">Reaction time test</h2>
          <button className="btn sm" onClick={onClose}>Close</button>
        </div>
        <button ref={boxRef} className={`rt-pad ${phase}`} onClick={phase === 'done' ? undefined : tap} aria-live="assertive" disabled={phase === 'done'}>
          <span className="rt-circle" aria-hidden="true" />
          <strong>{msg[0]}</strong>
          {msg[1] && <small>{msg[1]}</small>}
        </button>
        <ol className="rt-tries" aria-label="Results">
          {Array.from({ length: TRIES }, (_, i) => <li key={i} className={times[i] ? 'on' : ''}>{times[i] ? `${times[i]} ms` : '—'}</li>)}
        </ol>
        {phase === 'done' && (
          <div className="rt-actions">
            <button className="btn sm" onClick={() => { setTimes([]); arm(); }}>Repeat</button>
            <button className="btn primary" onClick={() => onDone(avg)}>Save result</button>
          </div>
        )}
        <p className="rt-note">Reference: sleepstudy (reaction time rises with each day of sleep restriction). Normal &lt; 320 ms.</p>
      </div>
    </div>
  );
}
