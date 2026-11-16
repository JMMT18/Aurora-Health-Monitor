// Aurora v2 · medidas, zonas del cuerpo, recomendaciones y reglas.
// `a`  = ancla en el SVG anatómico (viewBox 0 0 240 500).
// `a3` = el mismo punto en el modelo 3D BodyParts3D (metros, y arriba, +x = lado izquierdo del cuerpo, +z = frente).
// Umbrales: PRODUCT.md + RECOMENDACIONES_PARAMETROS.md (alineados entre sí).

export const STATUS = {
  ok: { word: 'Normal', icon: '✓' },
  warn: { word: 'Warning', icon: '!' },
  crit: { word: 'Critical', icon: '✕' },
  ref: { word: 'Reference', icon: 'i' },
  na: { word: 'No signal', icon: '–' },
};
export const RANK = { na: -2, ref: -1, ok: 0, warn: 1, crit: 2 };
export const STATUS_HEX = { ok: '#4ade80', warn: '#fbbf24', crit: '#ff6b6b', ref: '#8a93bf', na: '#8a93bf' };

export function band(v, b) {
  if (b.cl !== undefined && v < b.cl) return 'crit';
  if (b.ch !== undefined && v > b.ch) return 'crit';
  if (b.wl !== undefined && v < b.wl) return 'warn';
  if (b.wh !== undefined && v > b.wh) return 'warn';
  return 'ok';
}
export const worst = (a, b) => (RANK[a] >= RANK[b] ? a : b);

// Medidas que dependen del ECG: sin electrodos no hay dato.
const ECG_IDS = new Set(['hr', 'hrv', 'resp', 'hrHand']);

export const METRICS = {
  temp: { name: 'Body temperature', tech: 'Thermistor · forehead, calibrated to core', unit: '°C', dec: 1, base: 36.7, step: 0.04, min: 34.5, max: 39.5, b: { cl: 35, wl: 36.1, wh: 37.2, ch: 38 }, normal: '36.1–37.2 °C', a: [120, 40], a3: [0, 1.675, 0.098] },
  reaction: { name: 'Reaction time', tech: 'In-app test · ref. sleepstudy', unit: 'ms', dec: 0, fixed: 268, b: { wh: 320, ch: 400 }, normal: '< 320 ms', a: [108, 52], a3: [-0.035, 1.66, 0.02], test: true },
  mood: { name: 'Mood', tech: 'Self-report · MMASH', unit: '/ 5', dec: 0, fixed: 4, b: { cl: 2, wl: 3 }, normal: '3–5', a: [132, 52], a3: [0.035, 1.66, 0.02] },
  stress: { name: 'Stress index', tech: 'GSR + HRV + heart rate', unit: '/ 100', dec: 0, fixed: 22, b: { wh: 59, ch: 79 }, normal: '< 60', a: [120, 68], a3: [0, 1.62, 0.06], computed: true },
  hr: { name: 'Heart rate', tech: 'ECG · AD8232', unit: 'bpm', dec: 0, base: 72, step: 1.5, min: 38, max: 160, b: { cl: 50, wl: 60, wh: 100, ch: 120 }, normal: '60–100 bpm', a: [128, 142], a3: [0.03, 1.29, 0.06] },
  hrv: { name: 'Heart rate variability', tech: 'HRV · RMSSD · ref. SWELL', unit: 'ms', dec: 0, base: 44, step: 1.4, min: 8, max: 80, b: { cl: 15, wl: 25 }, normal: '> 25 ms', a: [98, 126], a3: [-0.08, 1.36, 0.115] },
  resp: { name: 'Breathing rate', tech: 'Derived from ECG', unit: 'br/min', dec: 0, base: 15, step: 0.4, min: 5, max: 32, b: { cl: 8, wl: 12, wh: 20, ch: 25 }, normal: '12–20 br/min', a: [104, 156], a3: [-0.08, 1.31, 0.03] },
  bp: { name: 'Blood pressure', tech: 'Manual entry', unit: 'mmHg', a: [166, 152], a3: [0.205, 1.24, 0.035], normal: '90/60 – 120/80', bp: true },
  gsr: { name: 'Sweat / stress', tech: 'GSR V1.2 · sensor', unit: '% baseline', dec: 0, base: 4, step: 2, min: -25, max: 95, b: { wl: -20, wh: 20, ch: 50 }, normal: '±20 % of your baseline', a: [192, 284], a3: [0.276, 0.745, 0.088], sign: true },
  scr: { name: 'Stress responses', tech: 'GSR · SCR peaks', unit: '/ min', dec: 0, base: 3, step: 0.5, min: 0, max: 20, b: { wh: 8, ch: 14 }, normal: '≤ 8 / min', a: [180, 292], a3: [0.29, 0.752, 0.085] },
  hrHand: { alias: 'hr', a: [186, 250], a3: [0.25, 0.87, 0.03] },
  glucose: { name: 'Glucose', tech: 'Manual entry', unit: 'mg/dL', dec: 0, fixed: 88, b: { cl: 54, wl: 70, wh: 99, ch: 125 }, normal: '70–99 mg/dL (fasting)', a: [108, 190], a3: [-0.06, 1.19, 0.05] },
  sodium: { name: 'Blood sodium', tech: 'Reference OSD-575 · Inspiration4', unit: 'mmol/L', dec: 0, fixed: 140, ref: true, normal: '135–145 mmol/L', a: [136, 206], a3: [0.062, 1.116, -0.02] },
  steps: { name: 'Steps today', tech: 'Accelerometer · ADXL345', unit: 'steps', dec: 0, base: 5120, steps: true, b: {}, normal: 'Goal 8,000', a: [140, 468], a3: [0.09, 0.04, 0.08] },
  activity: { name: 'Activity', tech: 'ADXL345 · ref. Fitbit', unit: '% of goal', dec: 0, base: 64, step: 0.4, min: 10, max: 100, b: { cl: 5, wl: 50 }, normal: '≥ 50 % of goal', a: [138, 310], a3: [0.095, 0.68, 0.06] },
  activeMin: { name: 'Active minutes', tech: 'ADXL345', unit: 'min', dec: 0, fixed: 38, b: {}, normal: 'Goal 60 min', a: [140, 400], a3: [0.092, 0.3, 0.04] },
  sedentary: { name: 'Time sitting', tech: 'ADXL345 · posture', unit: 'min', dec: 0, fixed: 35, b: { wh: 90, ch: 180 }, normal: '< 90 min in a row', a: [134, 262], a3: [0.1, 0.85, 0.06] },
  posture: { name: 'Posture', tech: 'ADXL345', unit: '', a: [120, 180], a3: [0, 1.207, -0.054], posture: true },
  sleep: { name: 'Last sleep cycle', tech: 'Actigraphy · ref. MMASH', unit: 'h', dec: 1, fixed: 5.8, b: { cl: 5, wl: 6, wh: 9 }, normal: '7–9 h', a: [120, 50], a3: [0, 1.66, 0] },
  falls: { name: 'Falls or impacts', tech: 'ADXL345 · > 3 g interrupt', unit: 'today', dec: 0, fixed: 0, b: { wh: 0 }, normal: '0', a: [154, 252], a3: [0.16, 0.92, 0] },
  tremor: { name: 'Tremor', tech: 'ADXL345 · FFT 4–12 Hz', unit: 'Hz', dec: 1, fixed: 0, normal: 'None', a: [48, 274], a3: [-0.27, 0.8, 0.05], tremor: true },
  cabin: { name: 'Cabin pressure', tech: 'BMP180', unit: 'kPa', dec: 1, base: 101.3, step: 0.004, min: 60, max: 104, env: true },
  cabinTemp: { name: 'Cabin temperature', tech: 'BMP180', unit: '°C', dec: 1, base: 22.4, step: 0.05, min: 12, max: 35, env: true },
};
export const CABIN_BAND = { cl: 91.2, wl: 96.2, wh: 106.4, ch: 111.4 };   // ±5 % / ±10 % de 101.3 kPa
// estado de la cabina relativo a la presión de referencia (101.3 kPa, o la presión local medida al conectar el ESP32)
export const cabinStatus = (V) => band(V.cabin * (101.3 / (V.cabinRef || 101.3)), CABIN_BAND);
export const CABIN_TEMP_BAND = { cl: 15, wl: 17, wh: 28, ch: 32 };
export const LEAK_BAND = { wh: 0.5, ch: 1.5 };                             // hPa/min

// hit: forma clicable sobre el cuerpo 2D · vb: recorte para la vista ampliada · cam: cámara del visor 3D
export const ZONES = {
  cabeza: { name: 'Head', sub: 'Brain, temperature, mood and stress', ids: ['temp', 'reaction', 'mood', 'stress'], vb: '78 14 84 84', cam: 'head', badge: [148, 26],
    hit: { t: 'ellipse', cx: 120, cy: 54, rx: 26, ry: 34 } },
  pecho: { name: 'Chest', sub: 'Heart, lungs and circulation', ids: ['hr', 'hrv', 'resp', 'bp'], vb: '66 92 110 110', cam: 'thorax', badge: [162, 104],
    hit: { t: 'path', d: 'M82 100H158L160 176H80Z' } },
  mano: { name: 'Hand and wrist', sub: 'Skin, stress and pulse', ids: ['gsr', 'scr', 'hrHand'], vb: '150 226 76 76', cam: 'hand', badge: [212, 248],
    hit: { t: 'circles', c: [[50, 268, 24], [190, 268, 24]] } },
  abdomen: { name: 'Abdomen', sub: 'Digestion and blood chemistry', ids: ['glucose', 'sodium'], vb: '66 160 108 108', cam: 'abdomen', badge: [160, 182],
    hit: { t: 'path', d: 'M82 176H158L160 250H80Z' } },
  piernas: { name: 'Legs', sub: 'Muscle, bone and activity', ids: ['steps', 'activity', 'activeMin', 'sedentary'], vb: '0 240 240 250', cam: 'legs', badge: [166, 262],
    hit: { t: 'path', d: 'M78 250H162L160 480H80Z' } },
  cuerpo: { name: 'Full body', sub: 'Sleep, posture, tremor and safety', ids: ['sleep', 'posture', 'falls', 'tremor'], vb: '-60 0 360 500', cam: 'threeQuarter', badge: null, hit: null },
};

/* ---------- recomendaciones (ver RECOMENDACIONES_PARAMETROS.md) ---------- */
// anim: escena del bloque A · caption: texto bajo la figura · steps: [texto, segundos]
export const RECS = {
  electrodes: { title: 'Reattach your ECG electrodes', dur: '1 min', anim: 'electrodes', caption: 'Right arm · left arm · right leg', steps: [['Clean sweat or oil off the skin', 15], ['Reattach the 3 electrodes (RA, LA, RL)', 20], ['Check the 3.5 mm jack on the AD8232', 10], ['Hold still for 10 s while the signal returns', 10]] },
  fall: { title: 'Fall detected: are you OK?', dur: '15 s', anim: 'fall', steps: [['Confirm you are OK within 15 s', 15], ['Check for pain or dizziness', 30], ['Rest before moving again', 30]] },
  leak: { title: 'Cabin leak protocol', dur: 'Now', anim: 'hatch', caption: 'Isolate the leak', steps: [['Sound the alarm and alert the crew', 5], ['Put on your oxygen mask', 10], ['Close hatches to isolate the leak', 30], ['Confirm the pressure stops dropping', 20]] },
  hatch: { title: 'Check seals and hatches', dur: 'Now', anim: 'hatch', caption: 'Turn and check the seal', steps: [['Stop physical exercise', 5], ['Check oxygen supply and cabin seals', 30], ['Take the reaction test (hypoxia check)', 20]] },
  heat: { title: 'Heat stress: cool down', dur: '15 min', anim: 'water', caption: 'Cool down and rehydrate', steps: [['Stop all physical effort', 10], ['Cool your neck and wrists', 30], ['Drink water with electrolytes', 30], ['Rest until your heart rate is below 85 bpm', 60]] },
  fever: { title: 'Possible fever', dur: '30 min', anim: 'water', caption: 'Hydrate and rest', steps: [['Remove extra layers of clothing', 15], ['Drink cool fluids', 30], ['Stop exercising', 10], ['Measure again in 30 min · tell the flight surgeon if above 38 °C', 30]] },
  cold: { title: 'Warm up', dur: '10 min', anim: 'sit', caption: 'Layer up and move gently', steps: [['Put on an extra layer and cover hands and feet', 20], ['Move gently for 3 min', 60], ['Check the cabin temperature', 10], ['If you feel stressed, breathe slowly', 30]] },
  irregular: { title: 'Irregular heartbeat', dur: '5 min', anim: 'sit', caption: 'Stop exercise and rest', steps: [['Stop intense exercise', 10], ['Drink water', 20], ['Rest seated and breathe normally', 120], ['Save a 30 s ECG trace for the flight surgeon', 30]] },
  sit: { title: 'Seated pause', dur: '3 min', anim: 'sit', caption: 'Sit down and breathe', steps: [['Stop what you are doing', 10], ['Sit down with your back supported', 20], ['Breathe slowly and relax your shoulders', 120], ['Measure your pulse again', 30]] },
  lowhr: { title: 'Low heart rate check', dur: '3 min', anim: 'sleep', caption: 'Lie down with your legs raised', steps: [['Sit or lie down', 10], ['Raise your legs if you feel dizzy', 30], ['Check your body temperature', 10], ['Take the reaction test', 20]] },
  breathe: { title: '4-7-8 breathing', dur: '2 min', anim: 'breathe', cycles: 6, steps: [['Inhale through your nose', 4], ['Hold your breath', 7], ['Exhale slowly through your mouth', 8]] },
  resonance: { title: 'High stress: slow down', dur: '3 min', anim: 'breathe', cycles: 18, steps: [['Inhale slowly', 5], ['Exhale slowly', 5]], note: 'Postpone critical maneuvers until your stress index is below 60.' },
  focus: { title: 'Reset your focus', dur: '3 min', anim: 'sit', caption: 'Rest your eyes', steps: [['Split your task into short steps', 20], ['Rest your eyes for 2 min (look far away)', 120], ['Silence notifications for 25 min', 10]] },
  slowbreath: { title: 'Slow diaphragmatic breathing', dur: '2 min', anim: 'breathe', cycles: 12, steps: [['Breathe in with your belly', 5], ['Breathe out slowly', 5]], note: 'Also check the cabin pressure.' },
  lowresp: { title: 'Low breathing rate', dur: 'Now', anim: 'sit', caption: 'Sit upright and breathe deeply', steps: [['Sit upright', 10], ['Take 5 deep breaths', 30], ['Check cabin pressure and oxygen', 20], ['Alert the crew if it stays below 8 / min', 30]] },
  ventilate: { title: 'Cabin is too hot', dur: '30 min', anim: 'water', caption: 'Ventilate and hydrate', steps: [['Turn on ventilation', 10], ['Drink 250 ml per hour', 20], ['Lower your exercise intensity', 10]] },
  heatcabin: { title: 'Cabin is too cold', dur: '15 min', anim: 'sit', caption: 'Heat up the cabin', steps: [['Turn on heating', 10], ['Protect your hands and feet', 20], ['Keep moving gently', 60]] },
  tremor: { title: 'Tremor detected', dur: '15 min', anim: 'eat', caption: 'Eat something and warm up', steps: [['If you have been fasting, eat 15 g of fast carbohydrates', 20], ['Warm up if you are cold', 20], ['Pause precision tasks', 10], ['Avoid more caffeine', 10]] },
  move: { title: 'Time to move', dur: '3 min', anim: 'squat', steps: [['1 min of slow squats', 60], ['1 min of stretching', 60], ['1 min of calf raises', 60]] },
  squat: { title: 'Resistance exercise (ARED)', dur: '20 min', anim: 'squat', steps: [['Adjust the bar to your height', 20], ['10 slow squats', 40], ['Rest', 30], ['10 more squats', 40]] },
  sleep: { title: 'Start your rest cycle earlier', dur: 'Tonight', anim: 'sleep', caption: 'Sleeping bag secured · lights low', steps: [['Take a 20 min nap before 15:00', 20], ['Dim the lights 1 h before bed', 20], ['No screens in the sleeping bag', 20], ['Sleep 8 h', 20]] },
  recovery: { title: 'Recovery day', dur: 'Today', anim: 'sleep', caption: 'Recovery comes first', steps: [['Swap intense training for light mobility', 20], ['Take a 20 min nap', 20], ['Aim for at least 8 h of sleep tonight', 20]] },
  slowreact: { title: 'Your reactions are slow', dur: '20 min', anim: 'reaction', steps: [['Avoid complex operations on your own', 10], ['Take a 20 min nap', 20], ['Retake the reaction test after resting', 10]] },
  reactiontest: { title: 'Take your reaction test', dur: '1 min', anim: 'reaction', steps: [['Tap as soon as the circle lights up', 20], ['5 tries, about 1 minute', 40]] },
  bphigh: { title: 'High blood pressure', dur: '15 min', anim: 'sit', caption: 'Rest and measure again', steps: [['Rest seated for 10 min', 60], ['Breathe slowly', 60], ['Measure again', 20], ['Eat less salt today', 10]] },
  bplow: { title: 'Low blood pressure', dur: '10 min', anim: 'water', caption: 'Hydrate before standing up', steps: [['Drink 500 ml with electrolytes', 30], ['Squeeze your calves and thighs before standing', 20], ['Stand up slowly', 10]] },
  eat: { title: '15-15 rule for low glucose', dur: '15 min', anim: 'eat', caption: '15 g of fast carbohydrates', steps: [['Eat 15 g of fast carbohydrates', 15], ['Wait 15 minutes', 60], ['Measure your glucose again', 10]] },
  glucosehigh: { title: 'High glucose', dur: '20 min', anim: 'squat', steps: [['Drink a glass of water', 10], ['Light walk or cycling for 15 min', 60], ['Avoid refined sugar today', 10]] },
  support: { title: 'Talk to someone', dur: '15 min', anim: 'sit', caption: 'You are not alone', steps: [['Talk with a crewmate or ground support', 30], ['Write in your journal for 5 min', 30], ['Do a guided breathing session', 60]] },
  water: { title: 'Drink 250 ml of water', dur: '30 min', anim: 'water', caption: 'Small sips', steps: [['Grab your water pouch', 10], ['Drink in small sips', 40], ['Check the cabin temperature', 20], ['Measure again in 30 min', 30]] },
};

/* ---------- utilidades puras sobre una lectura (V) ---------- */
export const def = (id) => (METRICS[id].alias ? METRICS[METRICS[id].alias] : METRICS[id]);
export const keyOf = (id) => METRICS[id].alias || id;

export function bpStatus(V) {
  const s = V.bpSys, d = V.bpDia;
  if (s >= 140 || d >= 90 || s < 90 || d < 60) return 'crit';
  if (s >= 120 || d >= 80) return 'warn';
  return 'ok';
}

export function statusOf(V, id) {
  const m = def(id);
  if (V.leadOff && ECG_IDS.has(id)) return 'na';
  if (m.ref) return 'ref';
  if (m.bp) return bpStatus(V);
  if (m.posture) return 'ok';
  if (m.tremor) return V.tremor >= 4 ? 'warn' : 'ok';
  if (!m.b) return 'ok';
  return band(V[keyOf(id)], m.b);
}
export function fmt(V, id) {
  const m = def(id), v = V[keyOf(id)];
  if (V.leadOff && ECG_IDS.has(id)) return '—';
  if (m.bp) return `${Math.round(V.bpSys)}/${Math.round(V.bpDia)}`;
  if (m.posture) return V.posture;
  if (m.tremor) return v >= 4 ? v.toFixed(1) : 'None';
  if (m.steps) return Math.round(v).toLocaleString('en');
  const s = v.toFixed(m.dec);
  return m.sign && v > 0 ? '+' + s : s;
}
export const unitOf = (V, id) => (def(id).tremor && V.tremor < 4 ? '' : def(id).unit);
export const zoneStatus = (V, z) => ZONES[z].ids.reduce((w, id) => worst(statusOf(V, id), w), 'ok');

export function overall(V) {
  const ids = Object.values(ZONES).flatMap((z) => z.ids).filter((id) => !METRICS[id].alias);
  const sts = ids.map((id) => statusOf(V, id)).filter((s) => s !== 'ref' && s !== 'na');
  let w = sts.reduce((a, s) => worst(s, a), 'ok');
  const env = [cabinStatus(V), band(V.cabinTemp, CABIN_TEMP_BAND), band(V.leak, LEAK_BAND)];
  env.forEach((s) => { w = worst(s, w); });
  if (V.leadOff) w = worst('warn', w);
  const bad = sts.filter((s) => s !== 'ok').length;
  const zonesBad = Object.keys(ZONES).filter((z) => zoneStatus(V, z) !== 'ok').map((z) => ZONES[z].name.toLowerCase());
  if (env.some((s) => s !== 'ok')) zonesBad.push('cabin');
  if (V.leadOff) zonesBad.push('ECG electrodes');
  return { status: w, bad, total: sts.length, zonesBad };
}

// Índice de estrés 0–100 a partir de GSR, HRV y pulso (ponderado; SWELL-KW como referencia).
export function stressIndex(V) {
  const g = Math.max(0, Math.min(1, (V.gsr + 10) / 70));
  const h = Math.max(0, Math.min(1, (55 - V.hrv) / 45));
  const p = Math.max(0, Math.min(1, (V.hr - 65) / 55));
  return Math.round(100 * (0.45 * g + 0.35 * h + 0.2 * p));
}

// Reglas: cada una devuelve [clave, severidad, motivo] o null. Orden = prioridad dentro de la misma severidad.
export function buildRecs(V, now = Date.now()) {
  const s = (id) => statusOf(V, id), out = [];
  const add = (k, st, why) => { if (st && st !== 'ok' && !out.find((r) => r.k === k)) out.push({ k, st, why }); };
  const cab = cabinStatus(V), leak = band(V.leak, LEAK_BAND), ct = band(V.cabinTemp, CABIN_TEMP_BAND);

  if (V.fallAt && now - V.fallAt < 120000) add('fall', 'crit', 'An impact over 3 g was followed by stillness.');
  if (leak !== 'ok') add('leak', leak === 'crit' ? 'crit' : 'warn', `Cabin pressure is dropping ${V.leak.toFixed(1)} hPa/min.`);
  else if (cab !== 'ok') add('hatch', cab, `Cabin pressure is ${fmt(V, 'cabin')} kPa (hypoxia risk).`);
  if (V.leadOff) add('electrodes', 'warn', 'The AD8232 reports a loose electrode, so heart rate and HRV are paused.');
  if (!V.leadOff && V.irregular) add('irregular', 'warn', 'The ECG detected premature or irregular beats.');
  if (V.cabinTemp > 27 && V.temp > 37.2 && V.gsr > 20 && V.hr > 100) add('heat', 'crit', `Cabin ${fmt(V, 'cabinTemp')} °C, body ${fmt(V, 'temp')} °C, heart rate ${fmt(V, 'hr')} bpm.`);
  if (s('temp') === 'warn' || s('temp') === 'crit') {
    if (V.temp > 37.2) add('fever', s('temp'), `Your temperature is ${fmt(V, 'temp')} °C${V.hr > 90 ? ` and your resting heart rate is up (${fmt(V, 'hr')} bpm)` : ''}.`);
    else add('cold', s('temp'), `Your temperature is ${fmt(V, 'temp')} °C.`);
  }
  if (!V.leadOff) {
    if (V.hr > 100) add('sit', s('hr'), `Your heart rate is ${fmt(V, 'hr')} bpm while ${V.posture.toLowerCase()}.`);
    if (V.hr < 60) add('lowhr', s('hr'), `Your heart rate is ${fmt(V, 'hr')} bpm.`);
    if (V.resp > 20) add('slowbreath', s('resp'), `You are breathing ${fmt(V, 'resp')} times per minute at rest.`);
    if (V.resp < 12) add('lowresp', s('resp'), `You are breathing ${fmt(V, 'resp')} times per minute.`);
  }
  if (V.stress >= 80) add('resonance', 'crit', `Your stress index is ${V.stress} / 100.`);
  if (s('gsr') !== 'ok' || (!V.leadOff && s('hrv') !== 'ok') || V.stress >= 60)
    add('breathe', worst(s('gsr'), V.leadOff ? 'ok' : s('hrv')) === 'ok' ? 'warn' : worst(s('gsr'), V.leadOff ? 'ok' : s('hrv')),
      `Your stress went up: GSR ${fmt(V, 'gsr')} % over baseline${V.leadOff ? '' : `, HRV ${fmt(V, 'hrv')} ms`}.`);
  if (s('scr') !== 'ok') add('focus', s('scr'), `${fmt(V, 'scr')} stress responses per minute without physical effort.`);
  if (ct !== 'ok') add(V.cabinTemp > 25 ? 'ventilate' : 'heatcabin', ct, `The cabin is at ${fmt(V, 'cabinTemp')} °C.`);
  if (V.tremor >= 4) add('tremor', 'warn', `The accelerometer detects a ${fmt(V, 'tremor')} Hz tremor at rest.`);
  if (s('glucose') !== 'ok') {
    if (V.glucose < 70) add('eat', s('glucose'), `Your glucose is ${fmt(V, 'glucose')} mg/dL.`);
    else add('glucosehigh', s('glucose'), `Your fasting glucose is ${fmt(V, 'glucose')} mg/dL.`);
  }
  const bp = bpStatus(V);
  if (bp !== 'ok') add(V.bpSys < 90 || V.bpDia < 60 ? 'bplow' : 'bphigh', bp, `Your blood pressure is ${fmt(V, 'bp')} mmHg.`);
  if (s('reaction') !== 'ok') add('slowreact', s('reaction'), `Your last reaction time was ${fmt(V, 'reaction')} ms (ref. sleepstudy).`);
  if (V.sleep < 6 && !V.leadOff && V.hrv < 25) add('recovery', 'warn', `Short sleep (${fmt(V, 'sleep')} h) and low HRV (${fmt(V, 'hrv')} ms).`);
  if (s('sleep') !== 'ok') add('sleep', s('sleep'), `You slept ${fmt(V, 'sleep')} h in your last cycle.`);
  if (s('sedentary') !== 'ok') add('move', s('sedentary'), `You have been sitting for ${fmt(V, 'sedentary')} min.`);
  if (s('activity') !== 'ok') add('squat', s('activity'), `You are at ${fmt(V, 'activity')} % of your activity goal.`);
  if (s('mood') !== 'ok') add('support', s('mood'), `You rated your mood ${fmt(V, 'mood')} / 5.`);

  out.sort((a, b) => RANK[b.st] - RANK[a.st]);
  const keep = out.slice(0, 3);
  // mantenimiento cuando hay poco que hacer
  const maint = [
    ['reactiontest', !V.reactionAt ? 'Check your alertness: no reaction test yet today.' : null],
    ['squat', 'Daily maintenance: protect your muscles and bones in microgravity.'],
    ['water', 'Routine: in microgravity you don\'t feel thirst the way you do on Earth.'],
  ];
  for (const [k, why] of maint) { if (keep.length >= 3) break; if (why && !keep.find((r) => r.k === k)) keep.push({ k, st: 'ok', why }); }
  return keep;
}

export const SCENARIOS = {
  auto: 'Auto demo (stress event every 75 s)',
  normal: 'Everything normal',
  stress: 'Acute stress',
  fever: 'Fever / infection',
  heat: 'Heat stress',
  leak: 'Cabin leak',
  fall: 'Fall or impact',
  electrodes: 'Loose ECG electrode',
  hypoglycemia: 'Low glucose + tremor',
  fatigue: 'Sleep debt + fatigue',
  lowbp: 'Low blood pressure',
  brady: 'Low heart rate',
  sedentary: 'Sitting too long',
  cold: 'Cold cabin',
  lowmood: 'Low mood',
};
