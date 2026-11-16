import { SingleBodySVG } from '../anatomy/components/HumanBody2D.jsx';
import { ZONES, STATUS, STATUS_HEX, zoneStatus } from '../data/vitals.js';

const ALL_SYSTEMS = ['skeletal', 'urinary', 'nervous', 'digestive', 'circulatory', 'respiratory'];

function Hit({ hit }) {
  if (hit.t === 'ellipse') return <ellipse cx={hit.cx} cy={hit.cy} rx={hit.rx} ry={hit.ry} />;
  if (hit.t === 'path') return <path d={hit.d} />;
  return hit.c.map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} />);
}

// Cuerpo 2D anatómico (SVG del atlas) con las 6 zonas clicables y su insignia de estado.
export default function BodyMap({ V, zone, onSelect }) {
  return (
    <section className="panel body" aria-labelledby="h-body">
      <div className="panel-head"><h2 id="h-body">Your body</h2><span className="label">Tap a zone</span></div>
      <div className="figure-wrap">
        <div className="figure-stack">
          <SingleBodySVG idPrefix="bodymap" systems={ALL_SYSTEMS} skinOpacity={0.92} animate ariaLabel="Human body with its systems" />
          <svg className="zone-layer" viewBox="0 0 240 500" role="group" aria-label="Body zones">
            {Object.entries(ZONES).filter(([, d]) => d.hit).map(([z, d]) => {
              const s = zoneStatus(V, z);
              const [bx, by] = d.badge;
              return (
                <g key={z} className={`zone ${s} ${zone === z ? 'sel' : ''}`} tabIndex={0} role="button"
                  aria-label={`${d.name}: ${STATUS[s].word}`} aria-pressed={zone === z}
                  onClick={() => onSelect(z)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(z); } }}>
                  <g className="hit"><Hit hit={d.hit} /></g>
                  <g className="zbadge" aria-hidden="true">
                    <circle cx={bx} cy={by} r="8.5" fill={STATUS_HEX[s]} />
                    <text x={bx} y={by}>{STATUS[s].icon}</text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <div className="whole">
        <button className="btn sm" aria-pressed={zone === 'cuerpo'} onClick={() => onSelect('cuerpo')}>Full body · sleep and posture</button>
      </div>
    </section>
  );
}
