import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createVariableTubeGeometry } from './anatomy3DBuilder.js';

const BRAIN_VENTRICLE_IDS = new Set([
  'FJ1730', // Third ventricle
  'FJ1731', // Fourth ventricle
  'FJ1752', // Interventricular foramen
  'FJ1767', // Left lateral ventricle
  'FJ1814'  // Right lateral ventricle
]);

export const BP_SYSTEM_TO_VIEWER = {
  skeletal: 'skeletal',
  nervous: 'nervous',
  cardiac: 'circulatory',
  arterial: 'circulatory',
  venous: 'circulatory',
  digestive: 'digestive',
  respiratory: 'respiratory',
  urinary: 'urinary',
  integumentary: 'integumentary'
};

export const REALISTIC_MEDICAL_COLORS = {
  skeletal: '#ede5d2',
  cardiac: '#b83232',
  arterial: '#c92a2a',
  venous: '#2b64a8',
  nervous: '#d9b55c',
  respiratory: '#cf828c',
  respiratory_lung: '#d9919b',
  digestive: '#bf825e',
  urinary: '#c46c45',
  integumentary: '#d9b594'
};

export const SYSTEM_CODED_COLORS = {
  skeletal: '#f4f5f7',
  cardiac: '#d62828',
  arterial: '#d62828',
  venous: '#2563eb',
  nervous: '#7c4dff',
  respiratory: '#56a8dc',
  respiratory_lung: '#56a8dc',
  digestive: '#57b869',
  urinary: '#e08b2c',
  integumentary: '#ebcfb2'
};

export const MATERIAL_PROFILES = {
  skeletal: { roughness: 0.46, metalness: 0.04, clearcoat: 0.08 },
  cardiac: { roughness: 0.30, metalness: 0.06, clearcoat: 0.45 },
  arterial: { roughness: 0.28, metalness: 0.07, clearcoat: 0.45 },
  venous: { roughness: 0.30, metalness: 0.07, clearcoat: 0.40 },
  nervous: { roughness: 0.38, metalness: 0.05, clearcoat: 0.25 },
  respiratory: { roughness: 0.44, metalness: 0.03, clearcoat: 0.16 },
  respiratory_lung: { roughness: 0.46, metalness: 0.02, clearcoat: 0.20 },
  digestive: { roughness: 0.40, metalness: 0.04, clearcoat: 0.28 },
  urinary: { roughness: 0.38, metalness: 0.04, clearcoat: 0.28 },
  integumentary: { roughness: 0.34, metalness: 0.02, clearcoat: 0.24 }
};

export const ANATOMICAL_EXPLANATIONS_ES = {
  heart: 'Bomba muscular de cuatro cámaras situada en el mediastino que impulsa la sangre por la circulación pulmonar y sistémica.',
  brain: 'Centro integrador del sistema nervioso central; coordina funciones cognitivas, motoras, sensoriales y autónomas.',
  'spinal cord': 'Conducto neural central que transmite señales motoras y sensoriales entre el encéfalo y todo el cuerpo.',
  'left lung': 'Pulmón izquierdo bilobulado con escotadura cardíaca para alojar el ápex del corazón.',
  'right lung': 'Pulmón derecho trilobulado encargado del intercambio gaseoso alveolar.',
  stomach: 'Cámara muscular entre el esófago y el duodeno donde ocurre la digestión ácida y enzimática.',
  'urinary bladder': 'Reservorio muscular pélvico que almacena la orina procedente de ambos uréteres.',
  trachea: 'Conducto aéreo cartilaginoso que conecta la laringe con los bronquios principales.',
  'left kidney': 'Órgano retroperitoneal encargado de la filtración glomerular y homeostasis hidroelectrolítica.',
  'right kidney': 'Riñón derecho, situado levemente más abajo que el izquierdo por la anatomía abdominal.',
  esophagus: 'Conducto fibromuscular que transporta el bolo alimenticio desde la faringe hasta el estómago.'
};

// Curated filters to keep strictly essential organs for the 6 systems & remove clutter/gender-specific parts
const ARTERIAL_KEEP_RX =
  /aorta|brachiocephalic|carotid|subclavian|axillary|brachial|radial|ulnar|iliac|femoral|popliteal|tibial|fibular|peroneal|renal artery|pulmonary trunk|pulmonary artery|^left coronary artery$|^right coronary artery$|trunk of .* coronary/i;
const ARTERIAL_EXCLUDE_RX =
  /hepatic|portal|segmental|lobar|arcuate|interlobar|cerebral|cerebellar|choroidal|communicating|pontine|basilar|sulcus|gyrus|precuneal|callosomarginal|splenial|thalamo|hypophyseal|ophthalmic|ciliary|conjunctival|lacrimal|ethmoidal|supra-orbital|supratrochlear|infratrochlear|nasal|labial|dental|alveolar|gingival|tonsillar|pharyngeal|tympanic|testicular|penis|penile|scrot|prostat|deferent|pudendal|vesical|rectal|appendicular|epigastric|plantar|palmar|digital|metacarpal|metatarsal|circumflex|perforating|collateral|recurrent|nutrient|muscular branch/i;

const VENOUS_KEEP_RX =
  /vena cava|brachiocephalic|jugular|subclavian|axillary|cephalic|basilic|brachial|median cubital|iliac|femoral|saphenous|popliteal|tibial|fibular|renal vein|pulmonary vein/i;
const VENOUS_EXCLUDE_RX =
  /hepatic|portal|segmental|cerebral|ophthalmic|vorticose|ciliary|conjunctival|palpebral|labial|dental|alveolar|pharyngeal|tympanic|pampiniform|testicular|prostatic|penis|penile|pudendal|plantar|palmar|digital|intercostal|subcostal|musculophrenic|epigastric|perforating|genicular|hemiazygos|azygos/i;

const DIGESTIVE_KEEP_RX =
  /esophagus|stomach|duodenum|jejunum|ileum|ileocecal|colon|rectum|appendix/i;
const DIGESTIVE_EXCLUDE_RX =
  /mesentery|mesoappendix|mesocolon|taenia|artery|vein|duct|biliary|tributary/i;

const SKELETAL_EXCLUDE_RX =
  /gingiva|cricoid|alar cartilage|arytenoid|corniculate|cuneiform|thyroid cartilage|iliotibial|tibialis/i;

const NERVOUS_EXCLUDE_RX =
  /ciliary|lacrimal|ethmoidal|supra-orbital|supratrochlear|infratrochlear|nasociliary|ophthalmic|trochlear|oculomotor/i;

/**
 * Curates the 2,234-part BodyParts3D manifest down to strictly the essential structures
 * of the 6 core anatomical systems plus the unisex body surface envelope.
 */
export function isEssentialPart(part) {
  const fixedBp = BRAIN_VENTRICLE_IDS.has(part.id) ? 'nervous' : part.system;
  const name = part.name || '';

  if (fixedBp === 'integumentary') {
    // Only the clean body skin surface (excludes eyebrows, head hair, pubic hair, lips)
    return part.id === 'FJ2810';
  }
  if (fixedBp === 'urinary') {
    // Exclude male-extended urethra (replaced by clean unisex pelvic urethra below)
    return part.id !== 'FJ3148';
  }
  if (fixedBp === 'cardiac') {
    return true;
  }
  if (fixedBp === 'arterial') {
    return ARTERIAL_KEEP_RX.test(name) && !ARTERIAL_EXCLUDE_RX.test(name);
  }
  if (fixedBp === 'venous') {
    return VENOUS_KEEP_RX.test(name) && !VENOUS_EXCLUDE_RX.test(name);
  }
  if (fixedBp === 'digestive') {
    return DIGESTIVE_KEEP_RX.test(name) && !DIGESTIVE_EXCLUDE_RX.test(name);
  }
  if (fixedBp === 'respiratory') {
    return /trachea|bronch/i.test(name);
  }
  if (fixedBp === 'skeletal') {
    return !SKELETAL_EXCLUDE_RX.test(name);
  }
  if (fixedBp === 'nervous') {
    return !NERVOUS_EXCLUDE_RX.test(name);
  }
  // Exclude muscular, reproductive, connective, lymphatic, endocrine, sensory clutter
  return false;
}

/**
 * Applies a smooth unisex anatomical morph to FJ2810 (Skin) so the pelvic/groin region
 * and upper torso proportions form a clean, balanced unisex silhouette with smooth normals.
 */
function applyUnisexSkinMorph(geometry) {
  const posAttr = geometry.getAttribute('position');
  const pos = posAttr.array;

  for (let i = 0; i < posAttr.count; i++) {
    let x = pos[i * 3];
    let y = pos[i * 3 + 1];
    let z = pos[i * 3 + 2];

    // 1. Neutralize anterior groin/pelvic prominence smoothly (y in 0.72..0.90, |x| < 0.062)
    if (y >= 0.71 && y <= 0.91 && Math.abs(x) < 0.065 && z > 0.015) {
      const wx = Math.max(0, Math.cos(((Math.abs(x) / 0.065) * Math.PI) * 0.5));
      const wy = Math.sin(Math.min(1, Math.max(0, (y - 0.71) / 0.20)) * Math.PI);
      const w = wx * wy;
      const targetZ = 0.048 + ((y - 0.71) / 0.20) * 0.022;
      if (z > targetZ) {
        z = THREE.MathUtils.lerp(z, targetZ, w * 0.94);
      }
      if (y < 0.79 && z > 0.015) {
        const lift = (0.79 - y) * 0.35 * w;
        y += lift;
      }
    }

    // 2. Gentle unisex shoulder/waist harmonization
    if (y >= 1.15 && y <= 1.50 && Math.abs(x) > 0.10) {
      const shoulderW = Math.sin(((y - 1.15) / 0.35) * Math.PI);
      x *= 1 - 0.035 * shoulderW;
    }
    if (y >= 0.86 && y <= 1.12) {
      const hipW = Math.sin(((y - 0.86) / 0.26) * Math.PI);
      x *= 1 + 0.018 * hipW;
    }

    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
  }

  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();

  // Re-quantize Float32 normals back to normalized Int16Array to match merged batch attributes
  const normAttr = geometry.getAttribute('normal');
  const normArr = normAttr.array;
  const intNormals = new Int16Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count * 3; i++) {
    intNormals[i] = Math.round(THREE.MathUtils.clamp(normArr[i], -1, 1) * 32767);
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(intNormals, 3, true));
}

/**
 * Converts a standard Float32 geometry (from procedural supplemental organs)
 * into quantized Int16 normals matching BodyParts3D merged batch geometry format.
 */
function quantizeGeometryNormals(geo) {
  geo.computeVertexNormals();
  const posAttr = geo.getAttribute('position');
  const normAttr = geo.getAttribute('normal');
  const uvAttr = geo.getAttribute('uv');
  if (uvAttr) geo.deleteAttribute('uv');

  const intNormals = new Int16Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count * 3; i++) {
    intNormals[i] = Math.round(THREE.MathUtils.clamp(normAttr.array[i], -1, 1) * 32767);
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(intNormals, 3, true));

  // Ensure index is Uint32Array for consistent mergeGeometries
  if (geo.index && !(geo.index.array instanceof Uint32Array)) {
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(geo.index.array), 1));
  }
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Generates essential supplemental 3D organs aligned to exact BodyParts3D coordinates:
 * - Translucent Right & Left Lung lobes wrapping the real BodyParts3D bronchial trees
 * - Spinal Cord + Brachial/Intercostal/Sciatic peripheral nerve trunks
 * - Clean unisex pelvic urethra under Urinary Bladder
 */
function createSupplementalEssentialParts(startIndex) {
  const specs = [];

  // 1. Right Lung (3-lobe shape, -X side, enveloping BodyParts3D bronchial tree)
  const rightLungGeo = new THREE.SphereGeometry(0.088, 28, 22);
  rightLungGeo.scale(0.68, 1.48, 0.85);
  {
    const p = rightLungGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i);
      let y = p.getY(i);
      let z = p.getZ(i);
      if (y < -0.068) y = -0.068 + (y + 0.068) * 0.22;
      if (x > 0.024) x = 0.024 + (x - 0.024) * 0.35;
      if (y > 0.045) {
        const k = Math.max(0.45, 1 - (y - 0.045) * 3.1);
        x *= k;
        z *= Math.max(0.55, k);
      }
      p.setXYZ(i, x, y, z);
    }
  }
  rightLungGeo.translate(-0.072, 1.315, 0.0);
  quantizeGeometryNormals(rightLungGeo);
  specs.push({
    id: 'SUP_RIGHT_LUNG',
    name: 'Right lung',
    conceptId: 'FMA7309',
    bpSystem: 'respiratory_lung',
    viewerSystem: 'respiratory',
    geometry: rightLungGeo
  });

  // 2. Left Lung (+X side, with medial cardiac notch around the heart)
  const leftLungGeo = new THREE.SphereGeometry(0.086, 28, 22);
  leftLungGeo.scale(0.65, 1.50, 0.85);
  {
    const p = leftLungGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i);
      let y = p.getY(i);
      let z = p.getZ(i);
      if (y < -0.070) y = -0.070 + (y + 0.070) * 0.22;
      if (x < -0.022) x = -0.022 + (x + 0.022) * 0.35;
      if (x < 0 && y < 0.015 && y > -0.085) {
        x += 0.024 * Math.cos(((y + 0.035) / 0.05) * (Math.PI * 0.38));
      }
      if (y > 0.045) {
        const k = Math.max(0.45, 1 - (y - 0.045) * 3.1);
        x *= k;
        z *= Math.max(0.55, k);
      }
      p.setXYZ(i, x, y, z);
    }
  }
  leftLungGeo.translate(0.076, 1.315, 0.0);
  quantizeGeometryNormals(leftLungGeo);
  specs.push({
    id: 'SUP_LEFT_LUNG',
    name: 'Left lung',
    conceptId: 'FMA7310',
    bpSystem: 'respiratory_lung',
    viewerSystem: 'respiratory',
    geometry: leftLungGeo
  });

  // 3. Spinal Cord (following BodyParts3D vertebral canal from brainstem down to L1/L2)
  const spinalGeo = createVariableTubeGeometry(
    [
      [0, 1.55, -0.042],
      [0, 1.44, -0.048],
      [0, 1.30, -0.058],
      [0, 1.14, -0.052],
      [0, 0.97, -0.046]
    ],
    (t) => THREE.MathUtils.lerp(0.0082, 0.0052, t),
    32,
    10
  );
  quantizeGeometryNormals(spinalGeo);
  specs.push({
    id: 'SUP_SPINAL_CORD',
    name: 'Spinal cord',
    conceptId: 'FMA7647',
    bpSystem: 'nervous',
    viewerSystem: 'nervous',
    geometry: spinalGeo
  });

  // 4. Brachial Plexus & Arm Nerves + Thoracic Intercostal Nerves + Lumbosacral/Sciatic Leg Nerves
  const nerveGeos = [];
  [-1, 1].forEach((side) => {
    // Arm major nerve trunk (matches humerus/ulna bounds)
    nerveGeos.push(
      createVariableTubeGeometry(
        [
          [0, 1.44, -0.045],
          [side * 0.09, 1.42, -0.025],
          [side * 0.185, 1.38, -0.015],
          [side * 0.205, 1.24, -0.012],
          [side * 0.215, 1.11, -0.014],
          [side * 0.232, 0.96, 0.004],
          [side * 0.252, 0.80, 0.014]
        ],
        (t) => THREE.MathUtils.lerp(0.0046, 0.0018, t),
        28,
        8
      )
    );

    // Sciatic & Femoral leg nerves (matches femur/tibia bounds)
    nerveGeos.push(
      createVariableTubeGeometry(
        [
          [0, 0.99, -0.045],
          [side * 0.068, 0.91, -0.032],
          [side * 0.096, 0.72, -0.018],
          [side * 0.092, 0.45, -0.014],
          [side * 0.088, 0.24, -0.016],
          [side * 0.085, 0.06, -0.005],
          [side * 0.092, 0.02, 0.075]
        ],
        (t) => THREE.MathUtils.lerp(0.0052, 0.0020, t),
        28,
        8
      )
    );

    // Intercostal thoracic nerves
    for (let r = 0; r < 9; r++) {
      const y = 1.40 - r * 0.032;
      const w = 0.125 - Math.abs(r - 4) * 0.006;
      nerveGeos.push(
        createVariableTubeGeometry(
          [
            [0, y, -0.052],
            [side * (w * 0.6), y - 0.006, -0.025],
            [side * w, y - 0.016, 0.015],
            [side * (w * 0.75), y - 0.026, 0.062]
          ],
          (t) => THREE.MathUtils.lerp(0.0028, 0.0014, t),
          12,
          6
        )
      );
    }
  });

  nerveGeos.forEach((g) => quantizeGeometryNormals(g));
  const mergedPeripheral = mergeGeometries(nerveGeos, false);
  nerveGeos.forEach((g) => g.dispose());
  if (mergedPeripheral) {
    mergedPeripheral.computeBoundingBox();
    mergedPeripheral.computeBoundingSphere();
    specs.push({
      id: 'SUP_PERIPHERAL_NERVES',
      name: 'Peripheral nerves (Brachial, Intercostal & Sciatic)',
      conceptId: 'FMA9905',
      bpSystem: 'nervous',
      viewerSystem: 'nervous',
      geometry: mergedPeripheral
    });
  }

  // 5. Unisex Pelvic Urethra (clean short urinary outlet beneath Urinary Bladder)
  const urethraGeo = createVariableTubeGeometry(
    [
      [0, 0.870, -0.008],
      [0, 0.822, -0.010]
    ],
    () => 0.0042,
    8,
    8
  );
  quantizeGeometryNormals(urethraGeo);
  specs.push({
    id: 'SUP_UNISEX_URETHRA',
    name: 'Urethra (Unisex pelvic segment)',
    conceptId: 'FMA19667',
    bpSystem: 'urinary',
    viewerSystem: 'urinary',
    geometry: urethraGeo
  });

  return specs.map((s, idx) => {
    const pos = s.geometry.getAttribute('position');
    const ind = s.geometry.getIndex();
    const box = s.geometry.boundingBox.clone();
    const center = box.getCenter(new THREE.Vector3());
    return {
      id: s.id,
      name: s.name,
      conceptId: s.conceptId,
      system: s.bpSystem,
      bpSystem: s.bpSystem,
      viewerSystem: s.viewerSystem,
      index: startIndex + idx,
      vertexCount: pos.count,
      indexCount: ind ? ind.count : 0,
      bounds: [box.min.toArray(), box.max.toArray()],
      box,
      center,
      geometry: s.geometry
    };
  });
}

async function decodeModelResponse(response, expectedBytes, compressed) {
  if (!response.ok) {
    throw new Error(`Could not load the anatomy file (${response.status})`);
  }
  // Modo artifact: los .gz se publican como texto base64 (los artifacts no sirven .gz)
  let payload;
  if (response.url.endsWith('.b64.txt')) {
    const bin = atob((await response.text()).trim());
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    payload = u8.buffer;
  } else {
    payload = await response.arrayBuffer();
  }
  const signature = new Uint8Array(payload, 0, Math.min(2, payload.byteLength));
  const isGzip = compressed && signature[0] === 0x1f && signature[1] === 0x8b;
  const buffer = isGzip
    ? await new Response(
        new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))
      ).arrayBuffer()
    : payload;

  if (buffer.byteLength !== expectedBytes) {
    throw new Error(`Incomplete anatomy file (${buffer.byteLength} vs ${expectedBytes} bytes)`);
  }
  return buffer;
}

let cachedAtlasPromise = null;

/**
 * Loads, filters (essential structures only), unisex-morphs, and caches the BodyParts3D v4.0 atlas.
 */
// rutas relativas a la base de Vite, para que funcione también fuera de la raíz del dominio
const withBase = (u) => (u.startsWith('/') ? import.meta.env.BASE_URL + u.slice(1) : u);

export function loadMedicalAtlas(onProgress, basePath = withBase('/models/atlas.json')) {
  if (cachedAtlasPromise) {
    onProgress?.(100);
    return cachedAtlasPromise;
  }

  cachedAtlasPromise = (async () => {
    const res = await fetch(basePath);
    if (!res.ok) {
      throw new Error(`Could not download the anatomy manifest (${res.status})`);
    }
    const rawAtlas = await res.json();

    // Filter down to essential organs of the 6 core systems + unisex skin envelope
    const filteredRawParts = rawAtlas.parts.filter(isEssentialPart);

    const parts = filteredRawParts.map((p, idx) => {
      const fixedBpSystem = BRAIN_VENTRICLE_IDS.has(p.id) ? 'nervous' : p.system;
      const viewerSystem = BP_SYSTEM_TO_VIEWER[fixedBpSystem] || 'skeletal';
      const min = new THREE.Vector3().fromArray(p.bounds[0]);
      const max = new THREE.Vector3().fromArray(p.bounds[1]);
      const center = min.clone().add(max).multiplyScalar(0.5);
      const box = new THREE.Box3(min, max);
      return {
        ...p,
        index: idx,
        bpSystem: fixedBpSystem,
        viewerSystem,
        box,
        center
      };
    });

    // Append supplemental 3D Lungs, Spinal Cord & Peripheral Nerves, and Unisex Urethra
    const supplementalParts = createSupplementalEssentialParts(parts.length);
    const allParts = [...parts, ...supplementalParts];

    const conceptMap = new Map(rawAtlas.concepts.map((c) => [c.id, c]));
    const chunkGroups = new Array(rawAtlas.chunks.length + 1);
    const pickGeometries = new Array(allParts.length);

    let loadedChunks = 0;
    const supportsDecompression = typeof DecompressionStream !== 'undefined';

    let cursor = 0;
    const workers = Array.from({ length: 4 }, async () => {
      while (cursor < rawAtlas.chunks.length) {
        const ci = cursor++;
        if (!parts.some((p) => p.chunk === ci)) {
          chunkGroups[ci] = new Map();
          loadedChunks++;
          onProgress?.(Math.round((loadedChunks / rawAtlas.chunks.length) * 100));
          continue;
        }
        const chunk = rawAtlas.chunks[ci];
        const useGzip = Boolean(chunk.gzip && supportsDecompression);
        const b64 = typeof window !== 'undefined' && window.AURORA_MODEL_B64;
        const url = withBase(b64 && chunk.gzip ? chunk.gzip.replace(/\.bin\.gz$/, '.b64.txt') : useGzip ? chunk.gzip : chunk.url);
        const response = await fetch(url);
        const buffer = await decodeModelResponse(response, chunk.bytes, useGzip || Boolean(b64));

        const byBpSystem = new Map();
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (p.chunk !== ci) continue;

          const g = new THREE.BufferGeometry();
          const posCopy = new Float32Array(buffer, p.positions, p.vertexCount * 3).slice();
          const normCopy = new Int16Array(buffer, p.normals, p.vertexCount * 3).slice();
          const idxCopy = new Uint32Array(buffer, p.indices, p.indexCount).slice();

          g.setAttribute('position', new THREE.BufferAttribute(posCopy, 3));
          g.setAttribute('normal', new THREE.BufferAttribute(normCopy, 3, true));
          g.setIndex(new THREE.BufferAttribute(idxCopy, 1));

          if (p.id === 'FJ2810') {
            applyUnisexSkinMorph(g);
            g.computeBoundingBox();
            p.box = g.boundingBox.clone();
            p.center = p.box.getCenter(new THREE.Vector3());
            p.bounds = [p.box.min.toArray(), p.box.max.toArray()];
          } else {
            g.boundingBox = p.box.clone();
          }

          g.computeBoundingSphere();
          pickGeometries[i] = g;

          const batchedGeo = g.clone();
          batchedGeo.setAttribute(
            'partIndex',
            new THREE.BufferAttribute(new Float32Array(p.vertexCount).fill(i), 1)
          );
          const list = byBpSystem.get(p.bpSystem) || [];
          list.push(batchedGeo);
          byBpSystem.set(p.bpSystem, list);
        }

        const mergedBySystem = new Map();
        byBpSystem.forEach((geos, bpSys) => {
          const merged = mergeGeometries(geos, false);
          geos.forEach((g) => g.dispose());
          if (merged) mergedBySystem.set(bpSys, merged);
        });
        chunkGroups[ci] = mergedBySystem;

        loadedChunks++;
        onProgress?.(Math.round((loadedChunks / rawAtlas.chunks.length) * 100));
      }
    });

    await Promise.all(workers);

    // Mount supplemental organs into the extra batch chunk
    const supBySys = new Map();
    supplementalParts.forEach((sp) => {
      pickGeometries[sp.index] = sp.geometry;
      const batchedGeo = sp.geometry.clone();
      batchedGeo.setAttribute(
        'partIndex',
        new THREE.BufferAttribute(new Float32Array(sp.vertexCount).fill(sp.index), 1)
      );
      const list = supBySys.get(sp.bpSystem) || [];
      list.push(batchedGeo);
      supBySys.set(sp.bpSystem, list);
    });
    const mergedSup = new Map();
    supBySys.forEach((geos, bpSys) => {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (merged) mergedSup.set(bpSys, merged);
    });
    chunkGroups[rawAtlas.chunks.length] = mergedSup;

    return {
      version: rawAtlas.version,
      parts: allParts,
      concepts: rawAtlas.concepts,
      conceptMap,
      chunkGroups,
      pickGeometries
    };
  })().catch((err) => {
    cachedAtlasPromise = null;
    throw err;
  });

  return cachedAtlasPromise;
}

export function computeExplosionLayout(parts, visibleSet, explodeAmount) {
  if (explodeAmount <= 0.001) return null;

  const systemOrder = [
    'skeletal',
    'cardiac',
    'arterial',
    'venous',
    'nervous',
    'respiratory',
    'respiratory_lung',
    'digestive',
    'urinary',
    'integumentary'
  ];

  const offsets = new Float32Array(parts.length * 3);
  const t1 = Math.min(1, explodeAmount / 0.55);
  const t2 = Math.max(0, (explodeAmount - 0.55) / 0.45);

  parts.forEach((p, i) => {
    if (!visibleSet.has(i)) return;
    const sysIdx = Math.max(0, systemOrder.indexOf(p.bpSystem));
    const angle = (sysIdx / systemOrder.length) * Math.PI * 2;
    const radialDist = p.bpSystem === 'integumentary' ? 0.85 : 0.45;

    const dx1 = Math.sin(angle) * t1 * radialDist;
    const dy1 = (p.center.y - 0.86) * t1 * 0.25;
    const dz1 = Math.cos(angle) * t1 * radialDist;

    if (t2 <= 0) {
      offsets[i * 3] = dx1;
      offsets[i * 3 + 1] = dy1;
      offsets[i * 3 + 2] = dz1;
    } else {
      const layerSpreadX = ((sysIdx % 4) - 1.5) * 0.58;
      const layerSpreadZ = (Math.floor(sysIdx / 4) - 1) * 0.42;
      offsets[i * 3] = THREE.MathUtils.lerp(dx1, layerSpreadX, t2);
      offsets[i * 3 + 1] = THREE.MathUtils.lerp(dy1, (p.center.y - 0.86) * 0.32, t2);
      offsets[i * 3 + 2] = THREE.MathUtils.lerp(dz1, layerSpreadZ, t2);
    }
  });

  return offsets;
}

export function buildExportableGroup(atlasData, visibleIndices, stateData, colorMode = 'realistic') {
  const group = new THREE.Group();
  group.name = 'Unisex_Human_Anatomy_3D';
  const palette = colorMode === 'coded' ? SYSTEM_CODED_COLORS : REALISTIC_MEDICAL_COLORS;
  const matCache = new Map();

  visibleIndices.forEach((i) => {
    const p = atlasData.parts[i];
    const srcGeo = atlasData.pickGeometries[i];
    if (!p || !srcGeo) return;

    const geo = new THREE.BufferGeometry();
    const posAttr = srcGeo.getAttribute('position');
    const normAttr = srcGeo.getAttribute('normal');
    geo.setAttribute('position', posAttr.clone());

    const fNormals = new Float32Array(normAttr.count * 3);
    for (let k = 0; k < normAttr.count; k++) {
      const nx = normAttr.getX(k) / 32767;
      const ny = normAttr.getY(k) / 32767;
      const nz = normAttr.getZ(k) / 32767;
      const len = Math.hypot(nx, ny, nz) || 1;
      fNormals[k * 3] = nx / len;
      fNormals[k * 3 + 1] = ny / len;
      fNormals[k * 3 + 2] = nz / len;
    }
    geo.setAttribute('normal', new THREE.BufferAttribute(fNormals, 3));
    if (srcGeo.index) geo.setIndex(srcGeo.index.clone());

    let mat = matCache.get(p.bpSystem);
    if (!mat) {
      const isTranslucent = p.bpSystem === 'integumentary' || p.bpSystem === 'respiratory_lung';
      mat = new THREE.MeshStandardMaterial({
        name: p.bpSystem,
        color: palette[p.bpSystem] || '#cccccc',
        roughness: 0.45,
        metalness: 0.05,
        transparent: isTranslucent,
        opacity: p.bpSystem === 'integumentary' ? 0.28 : p.bpSystem === 'respiratory_lung' ? 0.48 : 1
      });
      matCache.set(p.bpSystem, mat);
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = p.name.replace(/\s+/g, '_');
    if (stateData) {
      mesh.position.set(stateData[i * 4], stateData[i * 4 + 1], stateData[i * 4 + 2]);
    }
    group.add(mesh);
  });

  return group;
}
