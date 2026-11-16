import { useState } from 'react';
import { useVitals } from './hooks/useVitals.js';
import { buildRecs } from './data/vitals.js';
import BodyMap from './v2/BodyMap.jsx';
import ZonePanel from './v2/ZonePanel.jsx';
import GuidePanel from './v2/GuidePanel.jsx';
import ReactionTest from './v2/ReactionTest.jsx';
import AnalysisPanel from './v2/AnalysisPanel.jsx';
import { useCardiac } from './hooks/useCardiac.js';
import { TopBar, StatusPanel, EcgPanel, RecsPanel } from './v2/Panels.jsx';
import './App.css';

// Pantalla 1 (rediseño v2): cuerpo 2D | zona ampliada (2D/3D) + medidas | I arriba, A abajo; fila inferior ECG · R · A.
export default function App() {
  const { V, H, startedAt, scenario, setScenario, record, clearFall, esp } = useVitals();
  const [zone, setZone] = useState('pecho');
  const [picked, setPicked] = useState(null);
  const [testing, setTesting] = useState(false);
  const [analysis, setAnalysis] = useState(false);
  const cardiac = useCardiac(V, esp);
  const recs = buildRecs(V);
  const active = recs.find((r) => r.k === picked) || recs[0];

  return (
    <>
      <a className="skip" href="#zonep">Skip to the selected zone</a>
      <main className="app" id="main">
        <TopBar V={V} startedAt={startedAt} scenario={scenario} onScenario={(s) => { setScenario(s); setPicked(null); }} esp={esp} />
        <BodyMap V={V} zone={zone} onSelect={setZone} />
        <StatusPanel V={V} top={recs[0]?.st} />
        <ZonePanel V={V} H={H} zone={zone} onTest={() => setTesting(true)} />
        <EcgPanel V={V} liveRef={esp.live} onAnalysis={() => setAnalysis(true)} />
        <RecsPanel recs={recs} active={active.k} onPick={setPicked} />
        <GuidePanel key={active.k} recKey={active.k} why={active.why} onTest={() => setTesting(true)} onFallOk={() => { clearFall(); setPicked(null); }} />
      </main>
      <footer className="credit">Anatomical model: BodyParts3D, © DBCLS, CC BY 4.0 · <a href={`${import.meta.env.BASE_URL}ATTRIBUTION.md`}>attribution</a></footer>
      {analysis && <AnalysisPanel a={cardiac} onClose={() => setAnalysis(false)} />}
      {testing && <ReactionTest onClose={() => setTesting(false)} onDone={(ms) => { record('reaction', ms); setTesting(false); setZone('cabeza'); }} />}
    </>
  );
}
