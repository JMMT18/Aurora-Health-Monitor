// Validación de src/lib/hrv.js con señales de respuesta conocida.  Ejecutar:  node tests/hrv.test.mjs
import { rrFromBeats, cleanNN, timeDomain, poincare, baevsky, spectrum, qtAnalysis, edrAmplitude, emgFeatures } from '../src/lib/hrv.js';

let fails = 0;
const ok = (name, cond, detail) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  · ' + detail : ''}`); if (!cond) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const r = (v, d = 3) => Number(v.toFixed(d));

// 1. Dominio del tiempo con una serie pequeña calculada a mano
//    RR = 800, 860, 790, 900, 780  → ΔRR = 60, −70, 110, −120
{
  const rr = [800, 860, 790, 900, 780];
  const td = timeDomain(rr);
  const mean = 826, sdnn = Math.sqrt((26 ** 2 + 34 ** 2 + 36 ** 2 + 74 ** 2 + 46 ** 2) / 4);
  const rmssd = Math.sqrt((60 ** 2 + 70 ** 2 + 110 ** 2 + 120 ** 2) / 4);
  const dm = (60 - 70 + 110 - 120) / 4, sdsd = Math.sqrt([60, -70, 110, -120].map((d) => (d - dm) ** 2).reduce((a, b) => a + b) / 3);
  const bpm = [800, 860, 790, 900, 780].map((v) => 60000 / v).reduce((a, b) => a + b) / 5;
  ok('RR medio', near(td.rrMean, mean, 1e-9), `${td.rrMean} ms`);
  ok('BPM medio = promedio de 60000/RR_i', near(td.bpmMean, bpm, 1e-9), `${r(td.bpmMean)} lpm`);
  ok('SDNN (N−1)', near(td.sdnn, sdnn, 1e-9), `${r(td.sdnn)} ms`);
  ok('RMSSD (N−1 diferencias)', near(td.rmssd, rmssd, 1e-9), `${r(td.rmssd)} ms`);
  ok('SDSD (N−2)', near(td.sdsd, sdsd, 1e-9), `${r(td.sdsd)} ms`);
  // las 4 diferencias superan 50 ms → NN50 = 4, pNN50 = 4/(N−1) = 100 %
  ok('NN50 / pNN50', td.nn50 === 4 && near(td.pnn50, 100, 1e-9), `NN50=${td.nn50}, pNN50=${td.pnn50}%`);
  // serie alternante: 2·SDNN² − ½·SDSD² < 0 → SD2 no es real; la función lo deja en 0 en vez de NaN
  ok('SD2 sin valor real en serie alternante → 0', poincare(td).sd2 === 0, `2·SDNN² − ½·SDSD² = ${r(2 * sdnn ** 2 - 0.5 * sdsd ** 2, 0)}`);
}
// 1b. Poincaré en una serie realista (calculado de forma independiente)
{
  const rr = [800, 820, 810, 830, 815, 805, 825, 840, 810, 800];
  const N = rr.length, m = rr.reduce((a, b) => a + b) / N;
  const sdnn = Math.sqrt(rr.reduce((a, v) => a + (v - m) ** 2, 0) / (N - 1));
  const d = rr.slice(1).map((v, i) => v - rr[i]), dm = d.reduce((a, b) => a + b) / (N - 1);
  const sdsd = Math.sqrt(d.reduce((a, v) => a + (v - dm) ** 2, 0) / (N - 2));
  const pc = poincare(timeDomain(rr));
  ok('SD1 = √(½·SDSD²)', near(pc.sd1, Math.sqrt(0.5 * sdsd ** 2), 1e-9), `${r(pc.sd1)} ms`);
  ok('SD2 = √(2·SDNN² − ½·SDSD²)', near(pc.sd2, Math.sqrt(2 * sdnn ** 2 - 0.5 * sdsd ** 2), 1e-9), `${r(pc.sd2)} ms`);
  ok('Ratio SD2/SD1', near(pc.ratio, pc.sd2 / pc.sd1, 1e-12), `${r(pc.ratio)}`);
  ok('Área S = π·SD1·SD2', near(pc.area, Math.PI * pc.sd1 * pc.sd2, 1e-9), `${r(pc.area, 0)} ms²`);
  ok('SD1 ≈ RMSSD/√2', near(pc.sd1, pc.sd1FromRmssd, 0.15 * pc.sd1), `${r(pc.sd1)} vs ${r(pc.sd1FromRmssd)}`);
}

// 2. Baevsky a mano: RR (s) = .80 .82 .81 .79 .90 → bins de 50 ms: [.80–.85) tiene 3, [.75–.80) 1, [.90–.95) 1
{
  const b = baevsky([800, 820, 810, 790, 900]);
  ok('Baevsky Mo (centro del bin modal)', near(b.Mo, 0.825, 1e-9), `${b.Mo} s`);
  ok('Baevsky AMo', near(b.AMo, 60, 1e-9), `${b.AMo} %`);
  ok('Baevsky MxDMn', near(b.MxDMn, 0.11, 1e-9), `${r(b.MxDMn)} s`);
  ok('Baevsky SI = AMo/(2·Mo·MxDMn)', near(b.SI, 60 / (2 * 0.825 * 0.11), 1e-6), `${r(b.SI, 1)} s⁻²`);
}

// 3. Espectro: RR(t) = 1000 + 30·sin(2π·0.10·t) + 40·sin(2π·0.25·t)  durante 300 s.
//    Potencia de un seno de amplitud A = A²/2  → LF ≈ 450 ms², HF ≈ 800 ms², LF/HF ≈ 0.56
{
  const t = [0]; const rrAt = (x) => 1000 + 30 * Math.sin(2 * Math.PI * 0.1 * x) + 40 * Math.sin(2 * Math.PI * 0.25 * x);
  while (t[t.length - 1] < 300) t.push(t[t.length - 1] + rrAt(t[t.length - 1]) / 1000);
  const rr = rrFromBeats(t), sp = spectrum(t.slice(1), rr);
  ok('Espectro: LF ≈ 450 ms² (seno a 0.10 Hz)', near(sp.lf, 450, 450 * 0.15), `${r(sp.lf, 0)} ms²`);
  ok('Espectro: HF ≈ 800 ms² (seno a 0.25 Hz)', near(sp.hf, 800, 800 * 0.15), `${r(sp.hf, 0)} ms²`);
  ok('Espectro: LF/HF ≈ 0.56', near(sp.lfHf, 450 / 800, 0.1), `${r(sp.lfHf)}`);
  ok('Espectro: LFnu + HFnu = 100', near(sp.lfNu + sp.hfNu, 100, 1e-9), `${r(sp.lfNu, 1)} + ${r(sp.hfNu, 1)}`);
  ok('Espectro: VLF casi 0 (no hay componente < 0.04 Hz)', sp.vlf < 40, `${r(sp.vlf, 1)} ms²`);
  const pk = sp.psd.reduce((a, e) => (e.p > a.p ? e : a));
  ok('Espectro: pico en 0.25 Hz', near(pk.f, 0.25, 2 * sp.df), `${r(pk.f)} Hz`);
}

// 4. ECG sintético a 200 Hz con QT conocido y respiración de 15 rpm (modulación de amplitud R)
const FS = 200;
function synthEcg(seconds, bpm, respRpm, qtS) {
  const n = Math.round(seconds * FS), x = new Array(n).fill(0), rIdx = [];
  const g = (t, c, w, a) => a * Math.exp(-((t - c) ** 2) / (2 * w * w));
  let tb = 0.4;
  while (tb < seconds - 1) { rIdx.push(Math.round(tb * FS)); tb += 60 / bpm; }
  for (let i = 0; i < n; i++) {
    const t = i / FS; let v = 0;
    for (const ri of rIdx) {
      const tr = ri / FS; if (Math.abs(t - tr) > 0.7) continue;
      const amp = 1 + 0.15 * Math.sin(2 * Math.PI * (respRpm / 60) * tr); // modulación respiratoria del QRS
      v += g(t, tr - 0.16, 0.025, 0.12)            // P
        - g(t, tr - 0.025, 0.008, 0.10 * amp)      // Q
        + g(t, tr, 0.010, 1.0 * amp)               // R
        - g(t, tr + 0.025, 0.009, 0.25 * amp)      // S
        + g(t, tr + qtS - 0.04 - 0.08, 0.035, 0.3); // T (pico ~80 ms antes del fin)
    }
    x[i] = 2048 + 600 * v;
  }
  return { x, rIdx };
}
{
  const { x, rIdx } = synthEcg(60, 72, 15, 0.40);
  const qt = qtAnalysis(x, 0, rIdx, FS);
  ok('QT estimado ≈ 0.40 s (±20 ms)', qt && near(qt.QT, 0.40, 0.02), qt ? `${r(qt.QT)} s en ${qt.beats} latidos` : 'sin resultado');
  if (qt) {
    ok('QTc Bazett = QT/√RR', near(qt.qtcB, qt.QT / Math.sqrt(qt.RR), 1e-12), `${r(qt.qtcB)} s`);
    ok('QTc Fridericia = QT/∛RR', near(qt.qtcF, qt.QT / Math.cbrt(qt.RR), 1e-12), `${r(qt.qtcF)} s`);
    ok('QTc Framingham = QT + 0.154·(1−RR)', near(qt.qtcFram, qt.QT + 0.154 * (1 - qt.RR), 1e-12), `${r(qt.qtcFram)} s`);
  }
  const edr = edrAmplitude(x, 0, rIdx, FS);
  ok('EDR por amplitud R-S ≈ 15 rpm', edr && near(edr.rpm, 15, 1.5), edr ? `${r(edr.rpm, 1)} rpm` : 'sin resultado');
}

// 5. sEMG: seno de 60 Hz, amplitud 100 → RMS = 100/√2, MAV = 200/π, MNF ≈ 60 Hz
{
  // frecuencia no múltiplo de fs (57.3 Hz) y ventana larga, para que el muestreo cubra todas las fases
  const x = Array.from({ length: 4000 }, (_, i) => 100 * Math.sin(2 * Math.PI * 57.3 * i / FS));
  const e = emgFeatures(x, FS);
  ok('sEMG RMS = A/√2', near(e.rms, 100 / Math.SQRT2, 0.5), `${r(e.rms, 2)}`);
  ok('sEMG MAV = 2A/π', near(e.mav, 200 / Math.PI, 0.5), `${r(e.mav, 2)}`);
  ok('sEMG MNF ≈ 57.3 Hz', near(e.mnf, 57.3, 1), `${r(e.mnf, 2)} Hz`);
  const wl = x.slice(1).reduce((s, v, i) => s + Math.abs(v - x[i]), 0);
  ok('sEMG WL = Σ|x[k]−x[k−1]|', near(e.wl, wl, 1e-9), `${r(e.wl, 0)}`);
}

// 6. Limpieza de artefactos: un latido doble (RR corto) no debe entrar a la HRV
{
  const nn = cleanNN([800, 810, 400, 805, 795, 2500, 800]);
  ok('cleanNN descarta RR imposibles y ectópicos', !nn.includes(400) && !nn.includes(2500), JSON.stringify(nn));
}

console.log(fails ? `\n${fails} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(fails ? 1 : 0);
