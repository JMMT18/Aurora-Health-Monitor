import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';
import { SingleBodySVG } from '../anatomy/components/HumanBody2D.jsx';
import { ZONES, METRICS, STATUS, def, keyOf, statusOf, fmt, unitOf } from '../data/vitals.js';
import '../anatomy/components/HumanBodyViewer.css';

// El visor 3D (BodyParts3D, ~30 MB comprimidos) solo se descarga cuando se pide la vista 3D.
const HumanBody3D = lazy(() => import('../anatomy/components/HumanBody3D.jsx'));
const ALL_SYSTEMS = ['skeletal', 'urinary', 'nervous', 'digestive', 'circulatory', 'respiratory'];
const SPARK = { ok: '#5ee6ff', warn: '#fbbf24', crit: '#ff6b6b', ref: '#8a93bf' };

function Spark({ data, status }) {
  const lo = Math.min(...data), hi = Math.max(...data), span = hi - lo || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1) * 116 + 2).toFixed(1)},${(22 - (v - lo) / span * 18).toFixed(1)}`);
  const [lx, ly] = pts[pts.length - 1].split(',');
  return (
    <svg className="spark" viewBox="0 0 120 26" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke="#5ee6ff" strokeWidth="1.5" points={pts.join(' ')} />
      <circle r="2.6" cx={lx} cy={ly} fill={SPARK[status]} />
    </svg>
  );
}

export default function ZonePanel({ V, H, zone, onTest }) {
  const d = ZONES[zone];
  const [view, setView] = useState('2d');
  const zoomRef = useRef(null), listRef = useRef(null), hostRef = useRef(null);
  const [lines, setLines] = useState([]);
  const r = Number(d.vb.split(' ')[2]) / 110;

  // líneas guía desde cada punto numerado (2D o 3D) hasta su tarjeta
  useLayoutEffect(() => {
    let raf = 0, last = '';
    const draw = () => {
      const host = hostRef.current, zoom = zoomRef.current, list = listRef.current;
      if (!host || !zoom || !list || getComputedStyle(list).display === 'none') { setLines([]); return; }
      const hr = host.getBoundingClientRect(), zr = zoom.getBoundingClientRect();
      if (zr.right > list.children[0]?.getBoundingClientRect().left) { setLines([]); return; }
      let pts;
      if (view === '2d') {
        const svg = zoom.querySelector('svg.anchors'), ctm = svg?.getScreenCTM(); if (!ctm) return;
        pts = d.ids.map((id) => new DOMPoint(...METRICS[id].a).matrixTransform(ctm));
      } else {
        pts = d.ids.map((_, i) => {
          const el = zoom.querySelector(`.anchor3d[data-i="${i}"]`);
          if (!el || el.style.display === 'none') return null;
          const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        });
      }
      const next = d.ids.map((id, i) => {
        const card = list.children[i], p = pts[i]; if (!card || !p) return null;
        const c = card.getBoundingClientRect();
        const ax = Math.min(Math.max(p.x, zr.left), zr.right) - hr.left, ay = Math.min(Math.max(p.y, zr.top), zr.bottom) - hr.top;
        const by = c.top + c.height / 2 - hr.top, mx = zr.right - hr.left + 10;
        return `M${ax.toFixed(1)} ${ay.toFixed(1)}L${mx.toFixed(1)} ${by.toFixed(1)}L${(c.left - hr.left).toFixed(1)} ${by.toFixed(1)}`;
      }).filter(Boolean);
      const key = next.join('|'); if (key !== last) { last = key; setLines(next); }
    };
    // en 3D los puntos se mueven con la cámara: se redibuja en cada cuadro
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    if (view === '3d') loop(); else draw();
    const ro = new ResizeObserver(draw); ro.observe(hostRef.current);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [zone, view, d]);

  return (
    <section className="panel zonep" id="zonep" tabIndex={-1} aria-labelledby="zoneTitle" ref={hostRef}>
      <div className="title">
        <div><span className="label">Selected zone</span><h1 id="zoneTitle">{d.name}</h1></div>
        <p>{d.sub}</p>
      </div>
      <div className="zone-grid">
        <div className="zoom" ref={zoomRef}>
          {view === '2d' ? (
            <>
              <SingleBodySVG idPrefix="zoom" viewBox={d.vb} systems={ALL_SYSTEMS} skinOpacity={0.92} animate showShadow={false} ariaLabel={`Close-up view: ${d.name}`} />
              <svg className="anchors" viewBox={d.vb} aria-hidden="true">
                {d.ids.map((id, i) => {
                  const [x, y] = METRICS[id].a;
                  return (
                    <g key={id}>
                      <circle cx={x} cy={y} r={7 * r} fill="none" stroke="#9d85ff" strokeWidth={0.9 * r} opacity=".7">
                        <animate attributeName="r" values={`${5 * r};${9 * r};${5 * r}`} dur="2.4s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={x} cy={y} r={4.4 * r} fill="#9d85ff" stroke="#0a0c18" strokeWidth={0.8 * r} />
                      <text x={x} y={y + 2.3 * r} textAnchor="middle" className="anchor-n" style={{ fontSize: `${6.4 * r}px` }}>{i + 1}</text>
                    </g>
                  );
                })}
              </svg>
            </>
          ) : (
            <div className="zoom3d">
              <Suspense fallback={<div className="zoom-loading">Loading 3D model…</div>}>
                <HumanBody3D layoutMode="layered" activeSystems={ALL_SYSTEMS} skinOpacity={0.22} colorMode="realistic"
                  cameraPreset={d.cam} showCameraBar={false} showLabels={false}
                  markers={d.ids.map((id) => METRICS[id].a3)} />
              </Suspense>
            </div>
          )}
          <div className="tag3d">
            <button className="btn sm" aria-pressed={view === '2d'} onClick={() => setView('2d')}>2D</button>
            <button className="btn sm" aria-pressed={view === '3d'} onClick={() => setView('3d')}>View in 3D</button>
          </div>
        </div>
        <div className="mwrap">
          <div className="metrics" data-n={d.ids.length} ref={listRef}>
            {d.ids.map((id, i) => {
              const m = def(id), s = statusOf(V, id);
              return (
                <article key={id} className={`metric ${s}`}>
                  <span className="n">{i + 1}</span>
                  <h3>{V.live?.[id] ? <em className="livetag" title="Live from the ESP32">LIVE</em> : null}{m.name}<small>{m.tech}</small></h3>
                  <div className="val"><i className={`sdot st-${s}`} aria-label={STATUS[s].word}>{STATUS[s].icon}</i><b className="mono">{fmt(V, id)}</b><span>{unitOf(V, id)}</span></div>
                  <div className="row2">
                    <span className={`pill st-${s}`}><i>{STATUS[s].icon}</i>{STATUS[s].word}</span>
                    {m.test ? <button className="btn sm test" onClick={onTest}>Take test</button> : H[keyOf(id)] ? <Spark data={H[keyOf(id)]} status={s} /> : null}
                    <span className="meta">Normal: {m.normal}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
      <svg className="leaders" aria-hidden="true">{lines.map((p, i) => <path key={i} d={p} />)}</svg>
    </section>
  );
}
