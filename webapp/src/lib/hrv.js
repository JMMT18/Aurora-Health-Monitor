// Aurora · análisis cardíaco y muscular. Funciones puras, sin dependencias.
// Implementa las fórmulas de las secciones 4–8 de la especificación del equipo:
//   4. FC y HRV en el dominio del tiempo   5. Poincaré y Baevsky
//   6. Espectro HRV (VLF/LF/HF)            7. QTc y EDR por amplitud R-S
//   8. sEMG (MAV, RMS, WL, MNF)
// Convención: tiempos en segundos, RR en milisegundos (salvo donde la fórmula pide segundos).

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : NaN);
const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/* ---------------- 4. Intervalos RR ---------------- */

// RR_i = (t_{i+1} − t_i) × 1000   [ms],  i = 1..N  (N = M − 1)
export function rrFromBeats(t) {
  const rr = [];
  for (let i = 0; i < t.length - 1; i++) rr.push((t[i + 1] - t[i]) * 1000);
  return rr;
}

// Intervalos "normales" (NN): se descartan artefactos y latidos ectópicos, como pide la definición
// de SDNN/RMSSD: fuera de 300–2000 ms, o que difieren > 20 % del último intervalo aceptado.
export function cleanNN(rr, times = null) {
  const nn = [], tt = [];
  let last = null;
  rr.forEach((v, i) => {
    if (v < 300 || v > 2000) return;
    if (last !== null && Math.abs(v - last) > 0.2 * last) { last = v; return; }
    nn.push(v); if (times) tt.push(times[i]); last = v;
  });
  return times ? { nn, t: tt } : nn;
}

/* ---------------- 4. Dominio del tiempo ---------------- */
export function timeDomain(rr) {
  const N = rr.length;
  if (N < 3) return null;
  const bpmInst = rr.map((v) => 60000 / v);                    // BPM_i = 60000 / RR_i
  const bpmMean = mean(bpmInst);                               // BPM medio = (1/N) Σ BPM_i
  const rrMean = mean(rr);                                     // RR medio
  const sdnn = Math.sqrt(sum(rr.map((v) => (v - rrMean) ** 2)) / (N - 1));               // SDNN (N−1)
  const d = rr.slice(1).map((v, i) => v - rr[i]);              // ΔRR_i = RR_{i+1} − RR_i, i = 1..N−1
  const rmssd = Math.sqrt(sum(d.map((x) => x * x)) / (N - 1)); // RMSSD = √( Σ ΔRR² / (N−1) )
  const dMean = mean(d);                                       // ΔRR medio = Σ ΔRR / (N−1)
  const sdsd = N > 3 ? Math.sqrt(sum(d.map((x) => (x - dMean) ** 2)) / (N - 2)) : NaN;   // SDSD (N−2)
  const nn50 = d.filter((x) => Math.abs(x) > 50).length;       // NN50 = Σ I(|ΔRR| > 50 ms)
  const pnn50 = (nn50 / (N - 1)) * 100;                        // pNN50 = NN50 / (N−1) × 100
  return { N, bpmMean, rrMean, sdnn, rmssd, sdsd, nn50, pnn50, rrMin: Math.min(...rr), rrMax: Math.max(...rr) };
}

/* ---------------- 5. Poincaré ---------------- */
export function poincare(td) {
  if (!td || !Number.isFinite(td.sdsd)) return null;
  const sd1 = Math.sqrt(0.5 * td.sdsd ** 2);                   // SD1 = √(½·SDSD²)  ≈ RMSSD/√2
  const sd2sq = 2 * td.sdnn ** 2 - 0.5 * td.sdsd ** 2;         // SD2 = √(2·SDNN² − ½·SDSD²)
  const sd2 = sd2sq > 0 ? Math.sqrt(sd2sq) : 0;
  return { sd1, sd2, ratio: sd1 > 0 ? sd2 / sd1 : NaN, area: Math.PI * sd1 * sd2, sd1FromRmssd: td.rmssd / Math.SQRT2 };
}

/* ---------------- 5. Índice de estrés de Baevsky ---------------- */
// Histograma de RR (en s) con clases de Δb = 0.05 s.
export function baevsky(rr, binS = 0.05) {
  if (rr.length < 3) return null;
  const s = rr.map((v) => v / 1000), counts = new Map();
  s.forEach((v) => { const b = Math.floor(v / binS + 1e-9); counts.set(b, (counts.get(b) || 0) + 1); });
  let modeBin = null, modeCount = -1;
  for (const [b, c] of counts) if (c > modeCount || (c === modeCount && b < modeBin)) { modeBin = b; modeCount = c; }
  const Mo = modeBin * binS + binS / 2;                        // Mo = centro del bin más frecuente [s]
  const AMo = (modeCount / s.length) * 100;                    // AMo = n_modal / N × 100 [%]
  const MxDMn = Math.max(...s) - Math.min(...s);               // MxDMn = RR_max − RR_min [s]
  const SI = MxDMn > 0 ? AMo / (2 * Mo * MxDMn) : NaN;         // SI = AMo / (2·Mo·MxDMn) [s⁻²]
  return { Mo, AMo, MxDMn, SI };
}

/* ---------------- utilidades de señal ---------------- */
// spline cúbico natural: evalúa y(t) en los puntos xs (para interpolar el tacograma a 4 Hz)
function cubicSpline(x, y) {
  const n = x.length, h = [], al = [0], l = [1], mu = [0], z = [0], c = new Array(n).fill(0), b = [], d = [];
  for (let i = 0; i < n - 1; i++) h.push(x[i + 1] - x[i]);
  for (let i = 1; i < n - 1; i++) al.push((3 / h[i]) * (y[i + 1] - y[i]) - (3 / h[i - 1]) * (y[i] - y[i - 1]));
  for (let i = 1; i < n - 1; i++) { l[i] = 2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1]; mu[i] = h[i] / l[i]; z[i] = (al[i] - h[i - 1] * z[i - 1]) / l[i]; }
  l[n - 1] = 1; z[n - 1] = 0;
  for (let j = n - 2; j >= 0; j--) { c[j] = z[j] - mu[j] * c[j + 1]; b[j] = (y[j + 1] - y[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3; d[j] = (c[j + 1] - c[j]) / (3 * h[j]); }
  return (t) => {
    let j = 0, lo = 0, hi = n - 2;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (x[m] <= t) { j = m; lo = m + 1; } else hi = m - 1; }
    const dx = t - x[j];
    return y[j] + b[j] * dx + c[j] * dx * dx + d[j] * dx * dx * dx;
  };
}

// biquad RBJ + filtrado ida y vuelta (fase cero)
function biquad(type, fs, fc, q = Math.SQRT1_2) {
  const w0 = (2 * Math.PI * fc) / fs, al = Math.sin(w0) / (2 * q), cw = Math.cos(w0);
  const [b0, b1, b2] = type === 'lp' ? [(1 - cw) / 2, 1 - cw, (1 - cw) / 2] : [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
  const a0 = 1 + al;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cw) / a0, a2: (1 - al) / a0 };
}
function lfilter(f, x) { let z1 = 0, z2 = 0; return x.map((v) => { const y = f.b0 * v + z1; z1 = f.b1 * v - f.a1 * y + z2; z2 = f.b2 * v - f.a2 * y; return y; }); }
function filtfilt(f, x) { return lfilter(f, lfilter(f, x).reverse()).reverse(); }

const hann = (L) => Array.from({ length: L }, (_, m) => 0.5 * (1 - Math.cos((2 * Math.PI * m) / (L - 1))));

// DFT directa de la señal ventaneada; devuelve |X[k]|² para k = 0..⌊L/2⌋
function powerDFT(xw) {
  const L = xw.length, K = Math.floor(L / 2), out = new Float64Array(K + 1);
  for (let k = 0; k <= K; k++) {
    let re = 0, im = 0;
    const w = (-2 * Math.PI * k) / L;
    for (let m = 0; m < L; m++) { re += xw[m] * Math.cos(w * m); im += xw[m] * Math.sin(w * m); }
    out[k] = re * re + im * im;
  }
  return out;
}

/* ---------------- 6. Dominio de la frecuencia ---------------- */
// beatT: tiempos (s) en que termina cada RR (t_{i+1}); rr: RR (ms) del mismo largo.
export function spectrum(beatT, rr, fInterp = 4) {
  if (rr.length < 8) return null;
  const T = beatT[beatT.length - 1] - beatT[0];
  if (T < 30) return null;
  const spline = cubicSpline(beatT, rr);
  const L = Math.floor(T * fInterp);
  const x = Array.from({ length: L }, (_, m) => spline(beatT[0] + m / fInterp)); // x_RR[m] a 4 Hz
  const rrMean = mean(x);
  const w = hann(L), sw2 = sum(w.map((v) => v * v));
  const P2 = powerDFT(x.map((v, m) => (v - rrMean) * w[m]));  // |X[k]|²
  const df = fInterp / L;                                      // Δf = f_interp / L
  const psd = Array.from(P2, (p, k) => ({ f: k * df, p: (2 * p) / (fInterp * sw2) })); // P(f_k) [ms²/Hz]
  const band = (lo, hi) => sum(psd.filter((e) => e.f >= lo && e.f < hi).map((e) => e.p * df));
  const vlf = band(0.0033, 0.04), lf = band(0.04, 0.15), hf = band(0.15, 0.4);
  return {
    seconds: T, df, psd, vlf, lf, hf,
    lfNu: (lf / (lf + hf)) * 100, hfNu: (hf / (lf + hf)) * 100, lfHf: lf / hf,
    reliable: { vlf: T >= 300, lf: T >= 120, hf: T >= 60 },     // duraciones mínimas recomendadas (Task Force 1996)
  };
}

/* ---------------- 7. Morfología: QT y QTc ---------------- */
// ecg: muestras (fs Hz) indexadas por n (ecgN0 = índice de la primera); rIdx: índices n de los latidos.
export function qtAnalysis(ecg, ecgN0, rIdx, fs = 200) {
  const at = (n) => ecg[n - ecgN0];
  const inside = (n) => n - ecgN0 >= 0 && n - ecgN0 < ecg.length;
  const qts = [], rrs = [];
  for (let i = 1; i < rIdx.length - 1; i++) {
    const rr = (rIdx[i + 1] - rIdx[i]) / fs;
    if (!inside(rIdx[i] - Math.round(0.25 * fs)) || !inside(rIdx[i] + Math.round(0.7 * rr * fs))) continue;
    // pico R real: máximo local ±40 ms alrededor del índice del detector
    let r = rIdx[i];
    for (let k = rIdx[i] - 8; k <= rIdx[i] + 8; k++) if (at(k) > at(r)) r = k;
    const base = median(Array.from({ length: Math.round(0.06 * fs) }, (_, k) => at(r - Math.round(0.2 * fs) + k))); // segmento PR
    // inicio del QRS (Q): primero el valle Q (mínimo en los 50 ms antes de R); desde ahí hacia atrás,
    // el primer punto que vuelve a la línea base (< 5 % de la amplitud de R) con pendiente baja
    let maxSlope = 0;
    for (let k = r - Math.round(0.06 * fs); k < r; k++) maxSlope = Math.max(maxSlope, Math.abs(at(k + 1) - at(k)));
    let qTrough = r;
    for (let k = r - Math.round(0.05 * fs); k < r; k++) if (at(k) < at(qTrough)) qTrough = k;
    const rAmp = Math.abs(at(r) - base);
    let q = qTrough - Math.round(0.04 * fs);
    for (let k = qTrough; k > qTrough - Math.round(0.06 * fs); k--) {
      if (Math.abs(at(k) - base) < 0.05 * rAmp && Math.abs(at(k) - at(k - 1)) < 0.1 * maxSlope) { q = k; break; }
    }
    // onda T: máximo |x − base| entre R+100 ms y R+0.7·RR
    const t0 = r + Math.round(0.1 * fs), t1 = r + Math.round(Math.min(0.6, 0.7 * rr) * fs);
    let tp = t0;
    for (let k = t0; k <= t1; k++) if (Math.abs(at(k) - base) > Math.abs(at(tp) - base)) tp = k;
    const sign = Math.sign(at(tp) - base) || 1;
    // fin de T (método de la tangente): recta en el punto de máxima pendiente de bajada, cortada con la línea base
    let ks = tp, best = 0;
    for (let k = tp; k < t1 + Math.round(0.1 * fs) && inside(k + 1); k++) { const s = -sign * (at(k + 1) - at(k)); if (s > best) { best = s; ks = k; } }
    if (best <= 0) continue;
    const slope = (at(ks + 1) - at(ks)) * fs;                  // unidades/s
    const tEnd = ks / fs + (base - at(ks)) / slope;            // intersección con la línea base
    const qt = tEnd - q / fs;
    if (qt > 0.2 && qt < 0.6) { qts.push(qt); rrs.push(rr); }
  }
  if (qts.length < 3) return null;
  const QT = median(qts), RR = median(rrs);
  return {
    beats: qts.length, QT, RR,
    qtcB: QT / Math.sqrt(RR),                                  // Bazett
    qtcF: QT / Math.cbrt(RR),                                  // Fridericia
    qtcFram: QT + 0.154 * (1 - RR),                            // Framingham
  };
}

/* ---------------- 7. EDR por modulación de amplitud R-S ---------------- */
export function edrAmplitude(ecg, ecgN0, rIdx, fs = 200) {
  const at = (n) => ecg[n - ecgN0], inside = (n) => n - ecgN0 >= 0 && n - ecgN0 < ecg.length;
  const t = [], A = [];
  for (const n0 of rIdx) {
    if (!inside(n0 - 8) || !inside(n0 + Math.round(0.08 * fs))) continue;
    let r = n0; for (let k = n0 - 8; k <= n0 + 8; k++) if (at(k) > at(r)) r = k;
    let s = r; for (let k = r; k <= r + Math.round(0.06 * fs); k++) if (at(k) < at(s)) s = k;
    t.push(r / fs); A.push(at(r) - at(s));                     // A_i = V(pico R) − V(valle S)
  }
  if (A.length < 8 || t[t.length - 1] - t[0] < 20) return null;
  const f = 4, L = Math.floor((t[t.length - 1] - t[0]) * f);
  const sp = cubicSpline(t, A);
  let r = Array.from({ length: L }, (_, m) => sp(t[0] + m / f));
  const mA = mean(r); r = r.map((v) => v - mA);
  r = filtfilt(biquad('hp', f, 0.1), r);                       // banda 0.1–0.5 Hz
  r = filtfilt(biquad('lp', f, 0.5), r);
  const minGap = Math.round(1.2 * f), peaks = [];               // ≤ 50 resp/min
  for (let m = 1; m < L - 1; m++) if (r[m] > 0 && r[m] >= r[m - 1] && r[m] > r[m + 1] && (!peaks.length || m - peaks[peaks.length - 1] >= minGap)) peaks.push(m);
  if (peaks.length < 3) return null;
  const Tresp = mean(peaks.slice(1).map((p, i) => (p - peaks[i]) / f)); // periodo medio [s]
  return { rpm: 60 / Tresp, Tresp, peaks: peaks.length, beats: A.length };
}

/* ---------------- 8. sEMG ---------------- */
export function emgFeatures(x, fs = 200, band = [20, 95]) {
  const N = x.length;
  if (N < 32) return null;
  const mav = sum(x.map(Math.abs)) / N;                        // MAV
  const rms = Math.sqrt(sum(x.map((v) => v * v)) / N);          // RMS
  let wl = 0; for (let k = 1; k < N; k++) wl += Math.abs(x[k] - x[k - 1]); // WL
  const w = hann(N), xm = mean(x);
  const P = powerDFT(x.map((v, m) => (v - xm) * w[m]));
  let num = 0, den = 0;
  for (let k = 0; k < P.length; k++) { const fk = (k * fs) / N; if (fk >= band[0] && fk <= band[1]) { num += fk * P[k]; den += P[k]; } }
  return { mav, rms, wl, mnf: den > 0 ? num / den : NaN };     // MNF = Σ f·P / Σ P
}
