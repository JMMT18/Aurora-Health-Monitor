import { useEffect, useRef, useState } from 'react';
import { RECS } from '../data/vitals.js';

// Escenas animadas (SVG + SMIL) del bloque A. Figura tipo pictograma con color de piel.
const SKIN = '#ebbb91';
const F = { fill: 'none', stroke: SKIN, strokeWidth: 11, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'st-fig' };
const head = (cx, cy, r = 13, extra) => <circle cx={cx} cy={cy} r={r} fill={SKIN} className="st-fig">{extra}</circle>;

function Scene({ R, phaseText, rep }) {
  const cap = R.caption;
  switch (R.anim) {
    case 'breathe': {
      // la animación sigue el ritmo real de los pasos (4-7-8 = 19 s, resonante 5-5 = 10 s)
      const secs = R.steps.map((s) => s[1]), total = secs.reduce((a, b) => a + b, 0);
      const three = secs.length === 3, k1 = (secs[0] / total).toFixed(3), k2 = three ? ((secs[0] + secs[1]) / total).toFixed(3) : null;
      const vals = three ? '38;66;66;38' : '38;66;38', keys = three ? `0;${k1};${k2};1` : `0;${k1};1`;
      return (<>
        <circle cx="160" cy="105" r="70" fill="none" stroke="#2a3060" strokeWidth="2" />
        <circle cx="160" cy="105" r="40" fill="rgba(157,133,255,.16)" stroke="#9d85ff" strokeWidth="2"><animate attributeName="r" values={vals} keyTimes={keys} dur={`${total}s`} repeatCount="indefinite" /></circle>
        {head(160, 62, 12)}<path {...F} d="M160 74V124M160 86L144 112M160 86L176 112M160 124L150 160M160 124L170 160" />
        <text className="st-text" x="160" y="214">{phaseText}</text></>);
    }
    case 'sit': return (<>
      <path className="st-prop" d="M120 170V120H150M120 140H170V170" />
      {head(146, 62, 13, <animate attributeName="cy" values="62;60;62" dur="4s" repeatCount="indefinite" />)}
      <path {...F} d="M146 75L144 132H180V172M146 92L170 112M146 92L132 120" />
      <text className="st-text" x="160" y="214">{cap || 'Sit down and breathe'}</text></>);
    case 'water': return (<>
      {head(160, 58)}<path {...F} d="M160 71V128M160 84L138 112M160 128L146 172M160 128L174 172" />
      <g><animateTransform attributeName="transform" type="rotate" values="0 160 84;-125 160 84;-125 160 84;0 160 84;0 160 84" keyTimes="0;.25;.55;.8;1" dur="5s" repeatCount="indefinite" />
        <path {...F} d="M160 84L182 112" /><rect className="st-prop" x="178" y="106" width="12" height="18" rx="3" /></g>
      <rect x="232" y="70" width="34" height="100" rx="6" fill="none" stroke="#2a3060" strokeWidth="2" />
      <rect className="st-fill" x="234" y="168" width="30" height="0" rx="4"><animate attributeName="height" values="0;96" dur="30s" fill="freeze" /><animate attributeName="y" values="168;72" dur="30s" fill="freeze" /></rect>
      <text className="st-text" x="160" y="214">{cap || 'Small sips'}</text></>);
    case 'squat': return (<>
      <path className="st-prop" d="M110 70H210"><animate attributeName="d" values="M110 70H210;M110 100H210;M110 70H210" dur="3s" repeatCount="indefinite" /></path>
      <g><animateTransform attributeName="transform" type="translate" values="0 0;0 30;0 0" dur="3s" repeatCount="indefinite" />{head(160, 56, 12)}<path {...F} d="M160 68V120M160 80L140 72M160 80L180 72" /></g>
      <polyline {...F} points="150,172 146,146 160,120 174,146 170,172"><animate attributeName="points" values="150,172 146,146 160,120 174,146 170,172;150,172 134,158 160,150 186,158 170,172;150,172 146,146 160,120 174,146 170,172" dur="3s" repeatCount="indefinite" /></polyline>
      <text className="st-text" x="160" y="214">Rep {rep}</text></>);
    case 'sleep': return (<>
      <circle cx="250" cy="52" r="18" fill="rgba(157,133,255,.3)" /><circle cx="258" cy="46" r="16" fill="#171b36" />
      <rect className="st-prop" x="70" y="132" width="180" height="34" rx="16" />{head(96, 140, 11)}<path {...F} d="M107 142H200M200 142L230 146" />
      {[0, 1, 2].map((i) => <text key={i} className="st-text" x={120 + i * 16} y={112 - i * 14} style={{ fontSize: 12 + i * 3, fill: '#9d85ff' }}>z<animate attributeName="opacity" values="0;1;0" dur="3s" begin={`${i}s`} repeatCount="indefinite" /></text>)}
      <text className="st-text" x="160" y="214">{cap || 'Rest'}</text></>);
    case 'eat': return (<>
      {head(160, 58)}<path {...F} d="M160 71V128M160 84L138 112M160 128L146 172M160 128L174 172" />
      <g><animateTransform attributeName="transform" type="rotate" values="0 160 84;-140 160 84;-140 160 84;0 160 84" keyTimes="0;.3;.6;1" dur="4s" repeatCount="indefinite" /><path {...F} d="M160 84L182 112" /><rect className="st-prop" x="180" y="108" width="14" height="10" rx="3" /></g>
      <text className="st-text" x="160" y="214">{cap || 'Eat slowly'}</text></>);
    case 'electrodes': return (<>
      {head(160, 42, 14)}
      <path d="M128 64Q160 56 192 64L198 150Q160 160 122 150Z" fill={SKIN} opacity=".9" />
      <path {...F} d="M130 70L104 132M190 70L216 132M140 154L134 196M180 154L186 196" />
      {[[136, 82, 0], [184, 82, .4], [178, 140, .8]].map(([x, y, d], i) => (
        <g key={i}><circle cx={x} cy={y} r="8" fill="#fff" stroke="#9d85ff" strokeWidth="2.5" />
          <circle cx={x} cy={y} r="8" fill="none" stroke="#5ee6ff" strokeWidth="2"><animate attributeName="r" values="8;16;8" dur="1.6s" begin={`${d}s`} repeatCount="indefinite" /><animate attributeName="opacity" values="1;0;1" dur="1.6s" begin={`${d}s`} repeatCount="indefinite" /></circle>
          <text className="st-sub" x={x} y={y + 24}>{['RA', 'LA', 'RL'][i]}</text></g>))}
      <text className="st-text" x="160" y="214">{cap}</text></>);
    case 'reaction': return (<>
      <circle cx="160" cy="100" r="54" fill="rgba(94,230,255,.15)" stroke="#5ee6ff" strokeWidth="3"><animate attributeName="fill-opacity" values=".1;.9;.1" dur="2.2s" repeatCount="indefinite" /></circle>
      <path {...F} strokeWidth="9" d="M196 168L178 130M178 130L172 150M178 130L196 140" />
      <text className="st-text" x="160" y="214">Tap when it lights up</text></>);
    default: return (<>
      <circle cx="160" cy="100" r="58" fill="none" stroke="#9d85ff" strokeWidth="3" />
      <g><animateTransform attributeName="transform" type="rotate" values="0 160 100;90 160 100;90 160 100;0 160 100" dur="6s" repeatCount="indefinite" /><circle cx="160" cy="100" r="24" fill="none" stroke="#5ee6ff" strokeWidth="3" /><path {...F} d="M160 70V130M130 100H190" /></g>
      <text className="st-text" x="160" y="214">{cap || 'Turn and check the seal'}</text></>);
  }
}

// Caída detectada: cuenta regresiva de 15 s para confirmar; si no hay respuesta, se escala.
function FallCheck({ onOk }) {
  const [left, setLeft] = useState(15);
  useEffect(() => { const iv = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000); return () => clearInterval(iv); }, []);
  const escalated = left === 0;
  return (
    <div className={`fallcheck ${escalated ? 'esc' : ''}`} role="alertdialog" aria-labelledby="fc-t">
      <strong id="fc-t">{escalated ? 'No response: crew alerted' : 'Are you OK?'}</strong>
      <span className="mono big">{escalated ? 'Emergency' : `${left} s`}</span>
      <p>{escalated ? 'A fall or trauma alert was sent to the crew (simulated).' : 'An impact over 3 g was detected, followed by stillness.'}</p>
      <button className="btn primary" onClick={onOk}>I'm OK</button>
    </div>
  );
}

export default function GuidePanel({ recKey, why, onTest, onFallOk }) {
  const R = RECS[recKey];
  const steps = Array.from({ length: R.cycles || 1 }, () => R.steps).flat();
  const total = steps.reduce((a, s) => a + s[1], 0);
  const [g, setG] = useState({ idx: 0, left: steps[0][1], done: 0, paused: false, rep: 1 });
  const svgRef = useRef(null);

  useEffect(() => {
    const iv = setInterval(() => setG((p) => {
      if (p.paused || p.idx >= steps.length) return p;
      let { idx, left, done, rep } = p; left--; done++;
      if (R.anim === 'squat' && done % 3 === 0) rep = rep % 10 + 1;
      if (left <= 0) { idx++; if (idx < steps.length) left = steps[idx][1]; }
      return { ...p, idx, left, done, rep };
    }), 1000);
    return () => clearInterval(iv);
  }, [recKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const finished = g.idx >= steps.length, cur = g.idx % R.steps.length;
  const togglePause = () => setG((p) => { const paused = !p.paused; const sv = svgRef.current; if (sv) paused ? sv.pauseAnimations() : sv.unpauseAnimations(); return { ...p, paused }; });
  const phaseText = finished ? 'Done' : `${steps[g.idx][0].split(' ').slice(0, 2).join(' ')} · ${g.left} s`;

  return (
    <section className="panel anim" aria-labelledby="h-anim">
      <div className="panel-head"><h2 id="h-anim">Guide</h2><span className="label">{R.dur}</span></div>
      <div className="stage">
        {R.anim === 'fall'
          ? <FallCheck key={recKey} onOk={onFallOk} />
          : <svg ref={svgRef} key={recKey} viewBox="0 0 320 230" role="img" aria-label={`Animation: ${R.title}`}><Scene R={R} phaseText={phaseText} rep={g.rep} /></svg>}
      </div>
      <div className="guide">
        <div><h3>{R.title}</h3><p className="why">{why}{R.note ? ` ${R.note}` : ''}</p></div>
        <ol className="steps">{R.steps.map((s, i) => <li key={i} className={finished ? 'done' : i === cur ? 'now' : i < cur ? 'done' : ''}>{s[0]}</li>)}</ol>
        <div className="prog"><i style={{ width: `${Math.min(100, g.done / total * 100)}%` }} /></div>
        <div className="guide-ctl">
          <span className="timer mono">{finished ? 'Done' : `${Math.floor(g.left / 60)}:${String(g.left % 60).padStart(2, '0')}`}</span>
          <span className="ctl">
            {R.anim === 'reaction'
              ? <button className="btn sm primary" onClick={onTest}>Start test</button>
              : <>
                  <button className="btn sm" onClick={togglePause}>{g.paused ? 'Resume' : 'Pause'}</button>
                  <button className="btn sm" onClick={() => setG({ idx: 0, left: steps[0][1], done: 0, paused: false, rep: 1 })}>Restart</button>
                </>}
          </span>
        </div>
      </div>
    </section>
  );
}
