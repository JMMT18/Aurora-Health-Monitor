import * as THREE from 'three';
import { BODY_PALETTE } from './anatomyData.js';

/**
 * Creates a smooth variable-radius tube geometry along a 3D curve using a parallel-transport
 * (Bishop) frame so there is zero Frenet twist and zero NaN normals.
 */
export function createVariableTubeGeometry(
  points,
  radiusFn,
  tubularSegments = 64,
  radialSegments = 14,
  capEnds = true
) {
  const vectors = points.map((p) => (p instanceof THREE.Vector3 ? p.clone() : new THREE.Vector3(...p)));
  const curve = new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.5);

  const frames = computeParallelTransportFrames(curve, tubularSegments);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const center = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const r = Math.max(0.0008, typeof radiusFn === 'function' ? radiusFn(t, i) : radiusFn);

    for (let j = 0; j <= radialSegments; j++) {
      const v = j / radialSegments;
      const theta = v * Math.PI * 2;
      const sin = Math.sin(theta);
      const cos = -Math.cos(theta);

      const nx = cos * N.x + sin * B.x;
      const ny = cos * N.y + sin * B.y;
      const nz = cos * N.z + sin * B.z;

      positions.push(center.x + r * nx, center.y + r * ny, center.z + r * nz);
      normals.push(nx, ny, nz);
      uvs.push(t, v);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  if (capEnds) {
    // Start cap
    const startCenter = curve.getPointAt(0);
    const startTan = frames.tangents[0].clone().negate();
    const startCenterIdx = positions.length / 3;
    positions.push(startCenter.x, startCenter.y, startCenter.z);
    normals.push(startTan.x, startTan.y, startTan.z);
    uvs.push(0, 0.5);

    for (let j = 0; j < radialSegments; j++) {
      indices.push(startCenterIdx, j + 1, j);
    }

    // End cap
    const endCenter = curve.getPointAt(1);
    const endTan = frames.tangents[tubularSegments];
    const endCenterIdx = positions.length / 3;
    positions.push(endCenter.x, endCenter.y, endCenter.z);
    normals.push(endTan.x, endTan.y, endTan.z);
    uvs.push(1, 0.5);

    const lastRingStart = tubularSegments * stride;
    for (let j = 0; j < radialSegments; j++) {
      indices.push(endCenterIdx, lastRingStart + j, lastRingStart + j + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function computeParallelTransportFrames(curve, segments) {
  const tangents = [];
  const normals = [];
  const binormals = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const tan = curve.getTangentAt(t).normalize();
    tangents.push(tan);
  }

  const t0 = tangents[0];
  const ref = Math.abs(t0.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  const n0 = new THREE.Vector3().crossVectors(t0, ref).normalize();
  const b0 = new THREE.Vector3().crossVectors(t0, n0).normalize();
  normals.push(n0);
  binormals.push(b0);

  const axis = new THREE.Vector3();
  const mat = new THREE.Matrix4();

  for (let i = 1; i <= segments; i++) {
    const prevT = tangents[i - 1];
    const currT = tangents[i];
    const prevN = normals[i - 1].clone();

    axis.crossVectors(prevT, currT);
    const len = axis.length();
    if (len > 1e-6) {
      axis.divideScalar(len);
      const dot = THREE.MathUtils.clamp(prevT.dot(currT), -1, 1);
      const theta = Math.acos(dot);
      mat.makeRotationAxis(axis, theta);
      prevN.applyMatrix4(mat).normalize();
    }

    // Re-orthogonalize against currT to prevent drift
    prevN.sub(currT.clone().multiplyScalar(prevN.dot(currT))).normalize();
    const currB = new THREE.Vector3().crossVectors(currT, prevN).normalize();
    normals.push(prevN);
    binormals.push(currB);
  }

  return { tangents, normals, binormals };
}

/**
 * Lofts a closed organic mesh from vertical anatomical cross-section slices
 * supporting asymmetric front/back depths and surface muscle contours.
 */
function createAnatomicalLoftGeometry(slices, radialSegments = 40) {
  const positions = [];
  const uvs = [];
  const indices = [];

  const numSlices = slices.length;
  for (let i = 0; i < numSlices; i++) {
    const s = slices[i];
    const v = i / (numSlices - 1);
    for (let j = 0; j <= radialSegments; j++) {
      const u = j / radialSegments;
      const theta = u * Math.PI * 2; // 0 = +X, PI/2 = +Z (front), PI = -X, 3PI/2 = -Z (back)
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      let rx = s.rx;
      let rz = sinT >= 0 ? s.rzFront : s.rzBack;

      if (s.shapeMod) {
        const mod = s.shapeMod(theta, cosT, sinT);
        rx *= mod.sx ?? 1;
        rz *= mod.sz ?? 1;
      }

      const x = (s.xOffset || 0) + rx * cosT;
      const z = (s.zOffset || 0) + rz * sinT;
      const y = s.y;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < numSlices - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      // Counter-clockwise outside winding
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Helper to tag all child meshes with anatomical system/organ metadata for raycasting.
 */
function tagGroupMetadata(group, systemId, organId, organName) {
  group.userData = { ...group.userData, systemId, organId, organName };
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.userData = {
        systemId,
        organId: obj.userData.organId || organId,
        organName: obj.userData.organName || organName
      };
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

/**
 * Creates the realistic 3D Human Skin Shell (Head, Ears, Neck, Torso, Arms, Hands, Legs, Feet).
 * Supports opaque reference skin tone or translucent X-ray physical glass mode.
 */
export function createHumanSkinGroup({ opacity = 0.28, color = BODY_PALETTE.skinBase } = {}) {
  const group = new THREE.Group();
  group.name = 'human-skin';

  const isTranslucent = opacity < 0.95;
  const skinMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: isTranslucent ? 0.25 : 0.62,
    metalness: 0.02,
    clearcoat: isTranslucent ? 0.35 : 0.08,
    clearcoatRoughness: 0.35,
    transparent: isTranslucent,
    opacity,
    depthWrite: !isTranslucent,
    side: isTranslucent ? THREE.FrontSide : THREE.FrontSide
  });

  // 1. Torso + Neck + Head continuous sculpted loft (y from -0.055 perineum to +0.90 crown)
  const chestMod = (_t, cosT, sinT) => {
    // Subtle pectoral fullness + sternal groove + spinal furrow
    const pec = sinT > 0.2 ? 1 + 0.08 * Math.pow(Math.sin(Math.abs(cosT) * Math.PI), 1.3) : 1;
    const spineGroove = sinT < -0.6 ? 1 - 0.1 * Math.pow(1 - Math.abs(cosT), 2) : 1;
    return { sx: 1, sz: pec * spineGroove };
  };
  const gluteMod = (_t, cosT, sinT) => {
    const glute = sinT < -0.2 ? 1 + 0.14 * Math.pow(Math.sin(Math.abs(cosT) * Math.PI), 1.4) : 1;
    return { sx: 1, sz: glute };
  };
  const faceMod = (_t, cosT, sinT) => {
    // Nose & brow prominence on anterior centerline
    const nose = sinT > 0.88 && Math.abs(cosT) < 0.28 ? 1.12 : 1;
    return { sx: 1, sz: nose };
  };

  const torsoHeadSlices = [
    { y: -0.06, rx: 0.015, rzFront: 0.015, rzBack: 0.015, zOffset: -0.005 },
    { y: -0.04, rx: 0.125, rzFront: 0.085, rzBack: 0.105, zOffset: -0.005, shapeMod: gluteMod },
    { y: 0.01, rx: 0.165, rzFront: 0.098, rzBack: 0.125, zOffset: -0.008, shapeMod: gluteMod },
    { y: 0.08, rx: 0.158, rzFront: 0.096, rzBack: 0.105, zOffset: -0.004 },
    { y: 0.15, rx: 0.144, rzFront: 0.094, rzBack: 0.085, zOffset: 0.002 }, // Waist
    { y: 0.23, rx: 0.155, rzFront: 0.105, rzBack: 0.096, zOffset: 0.004 }, // Lower ribs
    { y: 0.34, rx: 0.175, rzFront: 0.122, rzBack: 0.115, zOffset: 0.002, shapeMod: chestMod }, // Pectorals
    { y: 0.44, rx: 0.186, rzFront: 0.112, rzBack: 0.116, zOffset: -0.004, shapeMod: chestMod }, // Upper chest
    { y: 0.51, rx: 0.162, rzFront: 0.082, rzBack: 0.095, zOffset: -0.008 }, // Clavicles/traps
    { y: 0.555, rx: 0.085, rzFront: 0.062, rzBack: 0.068, zOffset: -0.008 }, // Base of neck
    { y: 0.60, rx: 0.056, rzFront: 0.056, rzBack: 0.058, zOffset: -0.006 }, // Mid neck
    { y: 0.645, rx: 0.058, rzFront: 0.064, rzBack: 0.060, zOffset: 0.004 }, // Sub-jaw
    { y: 0.668, rx: 0.066, rzFront: 0.088, rzBack: 0.068, zOffset: 0.010 }, // Chin
    { y: 0.715, rx: 0.076, rzFront: 0.096, rzBack: 0.082, zOffset: 0.008 }, // Cheeks/mouth
    { y: 0.76, rx: 0.079, rzFront: 0.098, rzBack: 0.094, zOffset: 0.004, shapeMod: faceMod }, // Eyes/nose bridge
    { y: 0.815, rx: 0.080, rzFront: 0.095, rzBack: 0.100, zOffset: -0.002 }, // Forehead
    { y: 0.865, rx: 0.065, rzFront: 0.078, rzBack: 0.084, zOffset: -0.004 }, // Upper cranium
    { y: 0.895, rx: 0.032, rzFront: 0.040, rzBack: 0.044, zOffset: -0.004 },
    { y: 0.905, rx: 0.002, rzFront: 0.002, rzBack: 0.002, zOffset: -0.004 } // Crown apex
  ];

  const torsoMesh = new THREE.Mesh(createAnatomicalLoftGeometry(torsoHeadSlices, 42), skinMat);
  torsoMesh.name = 'skin-torso-head';
  group.add(torsoMesh);

  // Subtle nose bridge + ears for realistic facial silhouette
  const noseGeo = new THREE.ConeGeometry(0.015, 0.042, 12);
  const noseMesh = new THREE.Mesh(noseGeo, skinMat);
  noseMesh.position.set(0, 0.745, 0.105);
  noseMesh.rotation.x = Math.PI * 0.38;
  group.add(noseMesh);

  [-1, 1].forEach((side) => {
    const earGeo = new THREE.SphereGeometry(0.022, 14, 12);
    earGeo.scale(0.45, 1.35, 0.75);
    const earMesh = new THREE.Mesh(earGeo, skinMat);
    earMesh.position.set(side * 0.081, 0.755, -0.005);
    group.add(earMesh);
  });

  // 2. Sculpted Arms & 5-fingered Hands
  [-1, 1].forEach((side) => {
    const armPoints = [
      [side * 0.155, 0.475, -0.005],
      [side * 0.215, 0.445, -0.002],
      [side * 0.242, 0.34, 0.004],
      [side * 0.264, 0.20, -0.005], // Elbow
      [side * 0.282, 0.10, 0.012],  // Upper forearm
      [side * 0.302, -0.055, 0.024] // Wrist
    ];

    const armRadii = (t) => {
      if (t < 0.22) return THREE.MathUtils.lerp(0.062, 0.056, t / 0.22); // Deltoid
      if (t < 0.5) return THREE.MathUtils.lerp(0.056, 0.043, (t - 0.22) / 0.28); // Bicep to elbow
      if (t < 0.68) return THREE.MathUtils.lerp(0.043, 0.046, (t - 0.5) / 0.18); // Forearm swell
      return THREE.MathUtils.lerp(0.046, 0.028, (t - 0.68) / 0.32); // Taper to wrist
    };

    const armGeo = createVariableTubeGeometry(armPoints, armRadii, 36, 18, true);
    const armMesh = new THREE.Mesh(armGeo, skinMat);
    group.add(armMesh);

    // Palm
    const palmGeo = new THREE.SphereGeometry(0.036, 16, 14);
    palmGeo.scale(0.55, 1.45, 0.9);
    const palmMesh = new THREE.Mesh(palmGeo, skinMat);
    palmMesh.position.set(side * 0.312, -0.105, 0.028);
    palmMesh.rotation.z = side * 0.14;
    group.add(palmMesh);

    // Thumb + 4 Fingers
    const fingerSpecs = [
      { dx: -0.016, dy: -0.028, dz: 0.024, len: 0.046, r: 0.0085, rz: -side * 0.42 }, // Thumb (medial/front)
      { dx: -0.004, dy: -0.072, dz: 0.018, len: 0.062, r: 0.0072, rz: side * 0.12 },  // Index
      { dx: 0.004, dy: -0.078, dz: 0.006, len: 0.068, r: 0.0075, rz: side * 0.13 },   // Middle
      { dx: 0.010, dy: -0.073, dz: -0.006, len: 0.063, r: 0.0070, rz: side * 0.15 },  // Ring
      { dx: 0.015, dy: -0.062, dz: -0.017, len: 0.050, r: 0.0062, rz: side * 0.18 }   // Pinky
    ];

    fingerSpecs.forEach((f) => {
      const fGeo = new THREE.CapsuleGeometry(f.r, f.len, 6, 10);
      const fMesh = new THREE.Mesh(fGeo, skinMat);
      fMesh.position.set(
        side * (0.312 + f.dx),
        -0.105 + f.dy,
        0.028 + f.dz
      );
      fMesh.rotation.z = f.rz;
      group.add(fMesh);
    });
  });

  // 3. Sculpted Legs & Feet
  [-1, 1].forEach((side) => {
    const legPoints = [
      [side * 0.095, 0.02, -0.004],  // Hip joint blend
      [side * 0.106, -0.16, 0.010], // Mid thigh
      [side * 0.100, -0.39, 0.008], // Knee
      [side * 0.101, -0.55, -0.012], // Calf muscle
      [side * 0.098, -0.78, -0.006], // Ankle
      [side * 0.098, -0.86, -0.005]  // Heel top
    ];

    const legRadii = (t) => {
      if (t < 0.12) return THREE.MathUtils.lerp(0.092, 0.086, t / 0.12); // Upper hip/thigh
      if (t < 0.44) return THREE.MathUtils.lerp(0.086, 0.056, (t - 0.12) / 0.32); // Quad taper to knee
      if (t < 0.62) return THREE.MathUtils.lerp(0.056, 0.061, (t - 0.44) / 0.18); // Calf swell
      if (t < 0.88) return THREE.MathUtils.lerp(0.061, 0.036, (t - 0.62) / 0.26); // Taper to ankle
      return THREE.MathUtils.lerp(0.036, 0.038, (t - 0.88) / 0.12);
    };

    const legGeo = createVariableTubeGeometry(legPoints, legRadii, 42, 22, true);
    const legMesh = new THREE.Mesh(legGeo, skinMat);
    group.add(legMesh);

    // Sculpted Foot extending forward to +Z, planted cleanly at y = -0.90
    const footPoints = [
      [side * 0.098, -0.865, -0.028], // Heel
      [side * 0.102, -0.875, 0.035],  // Arch
      [side * 0.110, -0.882, 0.105],  // Ball of foot
      [side * 0.115, -0.887, 0.155]   // Toes
    ];
    const footRadii = (t) => {
      if (t < 0.35) return THREE.MathUtils.lerp(0.035, 0.038, t / 0.35);
      if (t < 0.78) return THREE.MathUtils.lerp(0.038, 0.042, (t - 0.35) / 0.43);
      return THREE.MathUtils.lerp(0.042, 0.020, (t - 0.78) / 0.22);
    };
    const footGeo = createVariableTubeGeometry(footPoints, footRadii, 18, 14, true);
    footGeo.scale(1, 0.65, 1);
    // Re-offset Y slightly after Y scale so sole sits at -0.90
    footGeo.translate(0, -0.307, 0);
    const footMesh = new THREE.Mesh(footGeo, skinMat);
    group.add(footMesh);
  });

  group.userData = { isSkin: true, skinMaterial: skinMat };
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.userData = { isSkin: true };
    }
  });

  return group;
}

/**
 * 1. NERVOUS SYSTEM 3D
 * Convoluted Brain, Cerebellum, Brainstem, Spinal Cord, Brachial Plexus, Intercostal & Sciatic Nerves.
 */
export function createNervousSystem3D() {
  const group = new THREE.Group();
  group.name = 'system-nervous';

  const brainMat = new THREE.MeshStandardMaterial({
    color: '#7c52b8',
    emissive: '#2c1654',
    emissiveIntensity: 0.28,
    roughness: 0.45,
    metalness: 0.05
  });
  const nerveMat = new THREE.MeshStandardMaterial({
    color: '#8e63cc',
    emissive: '#3b1d6e',
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.08
  });

  // Cerebral Hemispheres with procedural cortical gyri folds
  const brainGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const hemiGeo = new THREE.SphereGeometry(0.062, 28, 22);
    hemiGeo.scale(0.62, 0.88, 1.18);
    const pos = hemiGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Flatten medial fissure side
      if ((side < 0 && v.x > 0) || (side > 0 && v.x < 0)) {
        v.x *= 0.25;
      }
      // Subtle sulci/gyri ridges
      const ridge =
        Math.sin(v.x * 95 + v.z * 75) *
        Math.cos(v.y * 85 - v.z * 60) *
        0.0028;
      v.addScaledVector(v.clone().normalize(), ridge);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    hemiGeo.computeVertexNormals();

    const hemi = new THREE.Mesh(hemiGeo, brainMat);
    hemi.position.set(side * 0.025, 0.805, 0.004);
    brainGroup.add(hemi);
  });
  tagGroupMetadata(brainGroup, 'nervous', 'brain', 'Encéfalo (Cerebro)');
  group.add(brainGroup);

  // Cerebellum & Brainstem
  const cerebellumGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const cbGeo = new THREE.SphereGeometry(0.026, 16, 14);
    cbGeo.scale(0.95, 0.72, 0.9);
    const cb = new THREE.Mesh(cbGeo, brainMat);
    cb.position.set(side * 0.02, 0.742, -0.042);
    cerebellumGroup.add(cb);
  });
  const stemGeo = createVariableTubeGeometry(
    [
      [0, 0.77, -0.008],
      [0, 0.735, -0.022],
      [0, 0.69, -0.036]
    ],
    (t) => THREE.MathUtils.lerp(0.015, 0.009, t),
    12,
    12
  );
  cerebellumGroup.add(new THREE.Mesh(stemGeo, brainMat));
  tagGroupMetadata(cerebellumGroup, 'nervous', 'cerebellum', 'Cerebelo y Tronco Encefálico');
  group.add(cerebellumGroup);

  // Spinal Cord
  const spinalGroup = new THREE.Group();
  const cordGeo = createVariableTubeGeometry(
    [
      [0, 0.69, -0.036],
      [0, 0.56, -0.045],
      [0, 0.36, -0.062],
      [0, 0.16, -0.045],
      [0, 0.03, -0.050]
    ],
    (t) => THREE.MathUtils.lerp(0.0085, 0.0055, t),
    32,
    10
  );
  spinalGroup.add(new THREE.Mesh(cordGeo, nerveMat));
  tagGroupMetadata(spinalGroup, 'nervous', 'spinal_cord', 'Médula Espinal');
  group.add(spinalGroup);

  // Brachial Plexus & Arm Peripheral Nerves
  const armNervesGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const mainArmGeo = createVariableTubeGeometry(
      [
        [0, 0.52, -0.042],
        [side * 0.10, 0.49, -0.018],
        [side * 0.20, 0.45, -0.002],
        [side * 0.24, 0.33, 0.004],
        [side * 0.265, 0.20, -0.004],
        [side * 0.285, 0.08, 0.012],
        [side * 0.304, -0.06, 0.025],
        [side * 0.312, -0.15, 0.028]
      ],
      (t) => THREE.MathUtils.lerp(0.0052, 0.0018, t),
      32,
      8
    );
    armNervesGroup.add(new THREE.Mesh(mainArmGeo, nerveMat));

    // Ulnar secondary branch
    const ulnarGeo = createVariableTubeGeometry(
      [
        [side * 0.16, 0.46, -0.006],
        [side * 0.228, 0.33, -0.008],
        [side * 0.258, 0.19, -0.014],
        [side * 0.285, 0.06, 0.002],
        [side * 0.315, -0.13, 0.015]
      ],
      (t) => THREE.MathUtils.lerp(0.0034, 0.0014, t),
      22,
      8
    );
    armNervesGroup.add(new THREE.Mesh(ulnarGeo, nerveMat));
  });
  tagGroupMetadata(armNervesGroup, 'nervous', 'brachial_plexus', 'Plexo Braquial y Nervios del Brazo');
  group.add(armNervesGroup);

  // Thoracic Intercostal Nerves
  const intercostalGroup = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const y = 0.46 - i * 0.036;
    const zBack = -0.056 + Math.abs(i - 4) * 0.003;
    const width = 0.145 - Math.abs(i - 4) * 0.006;
    [-1, 1].forEach((side) => {
      const nerveGeo = createVariableTubeGeometry(
        [
          [0, y, zBack],
          [side * (width * 0.55), y - 0.006, zBack + 0.025],
          [side * width, y - 0.018, 0.02],
          [side * (width * 0.78), y - 0.032, 0.075]
        ],
        (t) => THREE.MathUtils.lerp(0.003, 0.0015, t),
        14,
        6
      );
      intercostalGroup.add(new THREE.Mesh(nerveGeo, nerveMat));
    });
  }
  tagGroupMetadata(intercostalGroup, 'nervous', 'intercostal_nerves', 'Nervios Torácicos e Intercostales');
  group.add(intercostalGroup);

  // Lumbosacral Plexus & Sciatic/Femoral Nerves
  const legNervesGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const sciaticGeo = createVariableTubeGeometry(
      [
        [0, 0.08, -0.048],
        [side * 0.075, 0.02, -0.035],
        [side * 0.102, -0.15, -0.012],
        [side * 0.100, -0.39, -0.012],
        [side * 0.100, -0.60, -0.018],
        [side * 0.098, -0.82, -0.010],
        [side * 0.110, -0.885, 0.11]
      ],
      (t) => THREE.MathUtils.lerp(0.0055, 0.002, t),
      32,
      8
    );
    legNervesGroup.add(new THREE.Mesh(sciaticGeo, nerveMat));

    const femoralGeo = createVariableTubeGeometry(
      [
        [0, 0.12, -0.045],
        [side * 0.07, 0.03, 0.012],
        [side * 0.098, -0.16, 0.032],
        [side * 0.098, -0.37, 0.022],
        [side * 0.095, -0.58, 0.012]
      ],
      (t) => THREE.MathUtils.lerp(0.004, 0.0015, t),
      22,
      8
    );
    legNervesGroup.add(new THREE.Mesh(femoralGeo, nerveMat));
  });
  tagGroupMetadata(legNervesGroup, 'nervous', 'sciatic_nerves', 'Plexo Lumbosacro y Nervio Ciático');
  group.add(legNervesGroup);

  return group;
}

/**
 * 2. CIRCULATORY SYSTEM 3D
 * Asymmetric 3D Heart, Arterial Tree (Red), Venous Tree (Blue).
 */
export function createCirculatorySystem3D() {
  const group = new THREE.Group();
  group.name = 'system-circulatory';

  const arteryMat = new THREE.MeshStandardMaterial({
    color: '#d62828',
    emissive: '#4d0808',
    emissiveIntensity: 0.25,
    roughness: 0.35,
    metalness: 0.08
  });
  const veinMat = new THREE.MeshStandardMaterial({
    color: '#225ec7',
    emissive: '#0a214d',
    emissiveIntensity: 0.25,
    roughness: 0.38,
    metalness: 0.08
  });

  // 3D Heart (anatomical right atrium/ventricle in blue, left ventricle + apex in red)
  const heartGroup = new THREE.Group();
  heartGroup.name = 'heart-assembly';
  heartGroup.position.set(0.014, 0.345, 0.026);

  const leftHeartGeo = new THREE.SphereGeometry(0.044, 24, 20);
  leftHeartGeo.scale(0.85, 1.28, 0.9);
  const leftHeartMesh = new THREE.Mesh(leftHeartGeo, arteryMat);
  leftHeartMesh.position.set(0.016, -0.008, 0.005);
  leftHeartMesh.rotation.z = -0.35;
  heartGroup.add(leftHeartMesh);

  const rightHeartGeo = new THREE.SphereGeometry(0.036, 22, 18);
  rightHeartGeo.scale(0.82, 1.15, 0.85);
  const rightHeartMesh = new THREE.Mesh(rightHeartGeo, veinMat);
  rightHeartMesh.position.set(-0.014, 0.006, 0.004);
  rightHeartMesh.rotation.z = 0.2;
  heartGroup.add(rightHeartMesh);

  tagGroupMetadata(heartGroup, 'circulatory', 'heart', 'Corazón');
  group.add(heartGroup);

  // Arterial Tree (Aorta, Carotids, Subclavians/Arms, Iliacs/Legs)
  const arteryGroup = new THREE.Group();
  const aortaGeo = createVariableTubeGeometry(
    [
      [0.012, 0.365, 0.024],
      [0.015, 0.425, 0.018],
      [-0.004, 0.435, -0.006],
      [-0.006, 0.32, -0.020],
      [-0.004, 0.14, -0.016],
      [-0.002, 0.05, -0.010]
    ],
    (t) => THREE.MathUtils.lerp(0.013, 0.0085, t),
    32,
    12
  );
  arteryGroup.add(new THREE.Mesh(aortaGeo, arteryMat));

  [-1, 1].forEach((side) => {
    // Carotids into head
    const carotidGeo = createVariableTubeGeometry(
      [
        [side * 0.008, 0.43, 0.008],
        [side * 0.022, 0.56, 0.006],
        [side * 0.024, 0.68, 0.004],
        [side * 0.030, 0.81, 0.005]
      ],
      (t) => THREE.MathUtils.lerp(0.0062, 0.0025, t),
      20,
      8
    );
    arteryGroup.add(new THREE.Mesh(carotidGeo, arteryMat));

    // Subclavian -> Brachial -> Radial artery
    const armArtGeo = createVariableTubeGeometry(
      [
        [side * 0.010, 0.428, 0.008],
        [side * 0.11, 0.46, 0.004],
        [side * 0.20, 0.44, 0.004],
        [side * 0.236, 0.32, 0.010],
        [side * 0.260, 0.19, 0.004],
        [side * 0.285, 0.06, 0.018],
        [side * 0.305, -0.07, 0.028],
        [side * 0.312, -0.145, 0.028]
      ],
      (t) => THREE.MathUtils.lerp(0.0065, 0.0022, t),
      32,
      8
    );
    arteryGroup.add(new THREE.Mesh(armArtGeo, arteryMat));

    // Iliac -> Femoral -> Tibial artery
    const legArtGeo = createVariableTubeGeometry(
      [
        [-0.002, 0.05, -0.010],
        [side * 0.065, -0.01, 0.012],
        [side * 0.092, -0.18, 0.024],
        [side * 0.095, -0.39, 0.002],
        [side * 0.098, -0.60, 0.004],
        [side * 0.098, -0.82, 0.008],
        [side * 0.110, -0.885, 0.115]
      ],
      (t) => THREE.MathUtils.lerp(0.0072, 0.0025, t),
      32,
      8
    );
    arteryGroup.add(new THREE.Mesh(legArtGeo, arteryMat));
  });
  tagGroupMetadata(arteryGroup, 'circulatory', 'aorta', 'Aorta y Sistema Arterial');
  group.add(arteryGroup);

  // Venous Tree (Vena Cava, Jugulars, Cephalic/Subclavian, Femoral/Saphenous)
  const veinGroup = new THREE.Group();
  const venaCavaGeo = createVariableTubeGeometry(
    [
      [-0.016, 0.46, 0.012],
      [-0.014, 0.37, 0.018],
      [-0.014, 0.22, -0.006],
      [-0.012, 0.05, -0.012]
    ],
    () => 0.010,
    24,
    12
  );
  veinGroup.add(new THREE.Mesh(venaCavaGeo, veinMat));

  [-1, 1].forEach((side) => {
    const jugularGeo = createVariableTubeGeometry(
      [
        [-0.014, 0.46, 0.012],
        [side * 0.034, 0.56, 0.010],
        [side * 0.036, 0.69, 0.008],
        [side * 0.022, 0.82, 0.006]
      ],
      (t) => THREE.MathUtils.lerp(0.006, 0.0025, t),
      20,
      8
    );
    veinGroup.add(new THREE.Mesh(jugularGeo, veinMat));

    const armVeinGeo = createVariableTubeGeometry(
      [
        [-0.012, 0.455, 0.014],
        [side * 0.11, 0.475, 0.010],
        [side * 0.215, 0.445, 0.012],
        [side * 0.252, 0.32, 0.016],
        [side * 0.275, 0.19, 0.010],
        [side * 0.298, 0.06, 0.022],
        [side * 0.312, -0.07, 0.032],
        [side * 0.318, -0.14, 0.030]
      ],
      (t) => THREE.MathUtils.lerp(0.0062, 0.002, t),
      32,
      8
    );
    veinGroup.add(new THREE.Mesh(armVeinGeo, veinMat));

    const legVeinGeo = createVariableTubeGeometry(
      [
        [-0.012, 0.05, -0.012],
        [side * 0.054, -0.01, 0.018],
        [side * 0.076, -0.19, 0.026],
        [side * 0.082, -0.40, 0.010],
        [side * 0.086, -0.62, 0.008],
        [side * 0.090, -0.82, 0.012],
        [side * 0.102, -0.885, 0.105]
      ],
      (t) => THREE.MathUtils.lerp(0.0068, 0.0022, t),
      32,
      8
    );
    veinGroup.add(new THREE.Mesh(legVeinGeo, veinMat));
  });
  tagGroupMetadata(veinGroup, 'circulatory', 'vena_cava', 'Vena Cava y Sistema Venoso');
  group.add(veinGroup);

  return group;
}

/**
 * 3. DIGESTIVE SYSTEM 3D
 * Esophagus, J-Shaped Stomach, Coiled Small Intestine, Haustrated Large Intestine.
 */
export function createDigestiveSystem3D() {
  const group = new THREE.Group();
  group.name = 'system-digestive';

  const esophagusMat = new THREE.MeshStandardMaterial({
    color: '#57b869',
    roughness: 0.45,
    metalness: 0.04
  });
  const stomachMat = new THREE.MeshStandardMaterial({
    color: '#63c976',
    roughness: 0.42,
    metalness: 0.04
  });
  const colonMat = new THREE.MeshStandardMaterial({
    color: '#469e56',
    roughness: 0.50,
    metalness: 0.03
  });
  const smallIntestineMat = new THREE.MeshStandardMaterial({
    color: '#72d683',
    roughness: 0.42,
    metalness: 0.03
  });

  // Esophagus
  const esoGroup = new THREE.Group();
  const esoGeo = createVariableTubeGeometry(
    [
      [0, 0.64, 0.006],
      [0, 0.52, -0.008],
      [-0.002, 0.38, -0.014],
      [0.006, 0.27, -0.004],
      [0.022, 0.225, 0.014]
    ],
    () => 0.011,
    24,
    12
  );
  esoGroup.add(new THREE.Mesh(esoGeo, esophagusMat));
  tagGroupMetadata(esoGroup, 'digestive', 'esophagus', 'Faringe y Esófago');
  group.add(esoGroup);

  // J-shaped Stomach (anatomical left = +X)
  const stomachGroup = new THREE.Group();
  const stomachGeo = createVariableTubeGeometry(
    [
      [0.022, 0.225, 0.014],
      [0.058, 0.235, 0.018],
      [0.072, 0.195, 0.028],
      [0.052, 0.155, 0.034],
      [0.015, 0.152, 0.030],
      [-0.012, 0.165, 0.020]
    ],
    (t) => {
      // Swell into stomach fundus & body, taper at pylorus
      return 0.013 + 0.026 * Math.sin(Math.pow(t, 0.75) * Math.PI);
    },
    28,
    16
  );
  stomachGroup.add(new THREE.Mesh(stomachGeo, stomachMat));
  tagGroupMetadata(stomachGroup, 'digestive', 'stomach', 'Estómago');
  group.add(stomachGroup);

  // Haustrated Large Intestine (Colon frame)
  const colonGroup = new THREE.Group();
  const colonGeo = createVariableTubeGeometry(
    [
      [-0.082, 0.02, 0.025],  // Cecum (right lower quadrant)
      [-0.088, 0.08, 0.020],  // Ascending colon
      [-0.084, 0.145, 0.022], // Hepatic flexure
      [-0.03, 0.148, 0.042],  // Transverse colon
      [0.04, 0.145, 0.042],
      [0.084, 0.152, 0.022],  // Splenic flexure
      [0.086, 0.08, 0.018],   // Descending colon
      [0.078, 0.02, 0.022],
      [0.035, -0.005, 0.012], // Sigmoid colon
      [0.0, -0.02, -0.012],   // Rectum
      [0.0, -0.055, -0.018]
    ],
    (t) => {
      const base = THREE.MathUtils.lerp(0.022, 0.016, t);
      const haustra = 1 + 0.16 * Math.sin(t * Math.PI * 36);
      return base * haustra;
    },
    96,
    14
  );
  colonGroup.add(new THREE.Mesh(colonGeo, colonMat));
  tagGroupMetadata(colonGroup, 'digestive', 'large_intestine', 'Intestino Grueso (Colon)');
  group.add(colonGroup);

  // Coiled 3D Small Intestine inside the colon frame
  const smallIntGroup = new THREE.Group();
  const coilPoints = [];
  const coilTurns = 7;
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = Math.sin(u * Math.PI * coilTurns) * 0.054 * (0.85 + 0.15 * Math.sin(u * Math.PI));
    const y = THREE.MathUtils.lerp(0.125, 0.015, u) + Math.cos(u * Math.PI * coilTurns * 2) * 0.006;
    const z = 0.024 + Math.cos(u * Math.PI * coilTurns) * 0.022;
    coilPoints.push([x, y, z]);
  }
  const smallGeo = createVariableTubeGeometry(coilPoints, () => 0.0115, 110, 10);
  smallIntGroup.add(new THREE.Mesh(smallGeo, smallIntestineMat));
  tagGroupMetadata(smallIntGroup, 'digestive', 'small_intestine', 'Intestino Delgado');
  group.add(smallIntGroup);

  return group;
}

/**
 * 4. RESPIRATORY SYSTEM 3D
 * Larynx, Ringed Trachea, Bronchial Tree, Right (3-lobe) & Left (2-lobe) Lungs.
 */
export function createRespiratorySystem3D() {
  const group = new THREE.Group();
  group.name = 'system-respiratory';

  const tracheaMat = new THREE.MeshStandardMaterial({
    color: '#73c2f5',
    roughness: 0.38,
    metalness: 0.05
  });
  const lungMat = new THREE.MeshPhysicalMaterial({
    color: '#56a8dc',
    emissive: '#143c59',
    emissiveIntensity: 0.18,
    roughness: 0.32,
    metalness: 0.02,
    transmission: 0.12,
    transparent: true,
    opacity: 0.88
  });

  // Larynx & Cartilaginous Ringed Trachea
  const tracheaGroup = new THREE.Group();
  const tracheaGeo = createVariableTubeGeometry(
    [
      [0, 0.60, 0.014],
      [0, 0.52, 0.010],
      [0, 0.43, 0.004]
    ],
    (t) => (t < 0.2 ? 0.015 : 0.0115),
    16,
    14
  );
  tracheaGroup.add(new THREE.Mesh(tracheaGeo, tracheaMat));

  // Cartilage rings
  for (let i = 0; i < 10; i++) {
    const ringGeo = new THREE.TorusGeometry(0.0125, 0.0022, 8, 18);
    const ring = new THREE.Mesh(ringGeo, tracheaMat);
    ring.position.set(0, 0.56 - i * 0.013, 0.009 - i * 0.0005);
    ring.rotation.x = Math.PI / 2;
    tracheaGroup.add(ring);
  }
  tagGroupMetadata(tracheaGroup, 'respiratory', 'larynx_trachea', 'Laringe y Tráquea');
  group.add(tracheaGroup);

  // Bronchi Tree
  const bronchiGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const mainBronchus = createVariableTubeGeometry(
      [
        [0, 0.43, 0.004],
        [side * 0.045, 0.395, 0.002],
        [side * 0.085, 0.355, 0.0]
      ],
      (t) => THREE.MathUtils.lerp(0.009, 0.0055, t),
      14,
      10
    );
    bronchiGroup.add(new THREE.Mesh(mainBronchus, tracheaMat));

    const upperB = createVariableTubeGeometry(
      [
        [side * 0.055, 0.388, 0.002],
        [side * 0.088, 0.415, 0.004],
        [side * 0.112, 0.435, 0.002]
      ],
      (t) => THREE.MathUtils.lerp(0.005, 0.0022, t),
      10,
      8
    );
    const lowerB = createVariableTubeGeometry(
      [
        [side * 0.075, 0.365, 0.001],
        [side * 0.098, 0.325, 0.002],
        [side * 0.115, 0.285, 0.002]
      ],
      (t) => THREE.MathUtils.lerp(0.005, 0.0022, t),
      10,
      8
    );
    bronchiGroup.add(new THREE.Mesh(upperB, tracheaMat));
    bronchiGroup.add(new THREE.Mesh(lowerB, tracheaMat));
  });
  tagGroupMetadata(bronchiGroup, 'respiratory', 'bronchi', 'Árbol Bronquial');
  group.add(bronchiGroup);

  // Lungs Assembly (animated together for breathing)
  const lungsContainer = new THREE.Group();
  lungsContainer.name = 'lungs-assembly';
  lungsContainer.position.set(0, 0.36, 0.006);

  // Right lung (-X, slightly wider & shorter)
  const rightLungGeo = new THREE.SphereGeometry(0.092, 24, 20);
  rightLungGeo.scale(0.68, 1.32, 0.78);
  const posR = rightLungGeo.attributes.position;
  for (let i = 0; i < posR.count; i++) {
    let x = posR.getX(i);
    let y = posR.getY(i);
    let z = posR.getZ(i);
    // Flatten inferior diaphragmatic surface & medial mediastinal side
    if (y < -0.055) y = -0.055 + (y + 0.055) * 0.25;
    if (x > 0.025) x = 0.025 + (x - 0.025) * 0.35;
    // Taper apex at top
    if (y > 0.04) {
      const k = 1 - (y - 0.04) * 3.5;
      x *= Math.max(0.45, k);
      z *= Math.max(0.55, k);
    }
    posR.setXYZ(i, x, y, z);
  }
  rightLungGeo.computeVertexNormals();
  const rightLungMesh = new THREE.Mesh(rightLungGeo, lungMat);
  rightLungMesh.position.set(-0.082, 0.0, 0.0);
  tagGroupMetadata(rightLungMesh, 'respiratory', 'right_lung', 'Pulmón Derecho (3 lóbulos)');
  lungsContainer.add(rightLungMesh);

  // Left lung (+X, slightly narrower with cardiac notch)
  const leftLungGeo = new THREE.SphereGeometry(0.090, 24, 20);
  leftLungGeo.scale(0.64, 1.34, 0.78);
  const posL = leftLungGeo.attributes.position;
  for (let i = 0; i < posL.count; i++) {
    let x = posL.getX(i);
    let y = posL.getY(i);
    let z = posL.getZ(i);
    if (y < -0.058) y = -0.058 + (y + 0.058) * 0.25;
    if (x < -0.022) x = -0.022 + (x + 0.022) * 0.35;
    // Cardiac notch carving on medial inferior border
    if (x < 0 && y < 0.01 && y > -0.07) {
      x += 0.022 * Math.cos(((y + 0.03) / 0.04) * (Math.PI * 0.4));
    }
    if (y > 0.04) {
      const k = 1 - (y - 0.04) * 3.5;
      x *= Math.max(0.45, k);
      z *= Math.max(0.55, k);
    }
    posL.setXYZ(i, x, y, z);
  }
  leftLungGeo.computeVertexNormals();
  const leftLungMesh = new THREE.Mesh(leftLungGeo, lungMat);
  leftLungMesh.position.set(0.084, 0.0, 0.0);
  tagGroupMetadata(leftLungMesh, 'respiratory', 'left_lung', 'Pulmón Izquierdo (2 lóbulos)');
  lungsContainer.add(leftLungMesh);

  group.add(lungsContainer);
  return group;
}

/**
 * 5. SKELETAL SYSTEM 3D
 * Skull with Orbits & Mandible, Spine, Clavicles, Sternum, 12 Rib Pairs, Pelvis, Upper & Lower Limb Bones.
 */
export function createSkeletalSystem3D() {
  const group = new THREE.Group();
  group.name = 'system-skeletal';

  const boneMat = new THREE.MeshStandardMaterial({
    color: '#f5f6f7',
    roughness: 0.55,
    metalness: 0.04
  });
  const orbitMat = new THREE.MeshStandardMaterial({
    color: '#2d2d30',
    roughness: 0.85
  });

  // Skull (Cranium + Zygomatic + Mandible + Orbits + Nasal cavity)
  const skullGroup = new THREE.Group();
  const craniumGeo = new THREE.SphereGeometry(0.068, 22, 18);
  craniumGeo.scale(0.88, 1.05, 1.12);
  const cranium = new THREE.Mesh(craniumGeo, boneMat);
  cranium.position.set(0, 0.80, -0.002);
  skullGroup.add(cranium);

  const maxillaGeo = new THREE.CylinderGeometry(0.042, 0.036, 0.048, 16);
  maxillaGeo.scale(1.0, 1.0, 0.95);
  const maxilla = new THREE.Mesh(maxillaGeo, boneMat);
  maxilla.position.set(0, 0.725, 0.036);
  skullGroup.add(maxilla);

  const mandibleGeo = new THREE.CylinderGeometry(0.038, 0.028, 0.042, 14);
  const mandible = new THREE.Mesh(mandibleGeo, boneMat);
  mandible.position.set(0, 0.688, 0.034);
  skullGroup.add(mandible);

  [-1, 1].forEach((side) => {
    const orbitGeo = new THREE.SphereGeometry(0.015, 12, 10);
    orbitGeo.scale(1.0, 0.85, 0.5);
    const orbit = new THREE.Mesh(orbitGeo, orbitMat);
    orbit.position.set(side * 0.026, 0.762, 0.068);
    skullGroup.add(orbit);
  });
  const nasalGeo = new THREE.ConeGeometry(0.009, 0.024, 3);
  const nasal = new THREE.Mesh(nasalGeo, orbitMat);
  nasal.position.set(0, 0.740, 0.072);
  skullGroup.add(nasal);

  tagGroupMetadata(skullGroup, 'skeletal', 'skull', 'Cráneo y Mandíbula');
  group.add(skullGroup);

  // Articulated Vertebral Column (22 vertebrae + sacrum)
  const spineGroup = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const y = THREE.MathUtils.lerp(0.64, 0.08, t);
    const zCurve = -0.042 - Math.sin(t * Math.PI * 1.45) * 0.022;
    const radius = THREE.MathUtils.lerp(0.013, 0.022, t);
    const vertGeo = new THREE.CylinderGeometry(radius, radius * 1.05, 0.018, 12);
    const vert = new THREE.Mesh(vertGeo, boneMat);
    vert.position.set(0, y, zCurve);
    spineGroup.add(vert);

    // Spinous process posterior ridge
    const spinousGeo = new THREE.BoxGeometry(0.008, 0.012, 0.024);
    const spinous = new THREE.Mesh(spinousGeo, boneMat);
    spinous.position.set(0, y - 0.003, zCurve - radius - 0.008);
    spineGroup.add(spinous);
  }
  tagGroupMetadata(spineGroup, 'skeletal', 'spine', 'Columna Vertebral');
  group.add(spineGroup);

  // Ribcage, Clavicles & Sternum
  const ribGroup = new THREE.Group();
  const sternumGeo = createVariableTubeGeometry(
    [
      [0, 0.49, 0.078],
      [0, 0.41, 0.095],
      [0, 0.31, 0.092]
    ],
    (t) => (t < 0.25 ? 0.018 : THREE.MathUtils.lerp(0.014, 0.008, t)),
    12,
    10
  );
  sternumGeo.scale(1.2, 1, 0.45);
  ribGroup.add(new THREE.Mesh(sternumGeo, boneMat));

  [-1, 1].forEach((side) => {
    // Clavicle S-curve
    const clavGeo = createVariableTubeGeometry(
      [
        [side * 0.015, 0.505, 0.068],
        [side * 0.075, 0.515, 0.055],
        [side * 0.135, 0.510, 0.015],
        [side * 0.180, 0.495, -0.005]
      ],
      () => 0.0075,
      14,
      8
    );
    ribGroup.add(new THREE.Mesh(clavGeo, boneMat));

    // 10 pairs of ribs curving from spine around thorax toward sternum
    for (let r = 0; r < 10; r++) {
      const yBack = 0.48 - r * 0.026;
      const yFront = yBack - 0.024 - r * 0.003;
      const w = 0.095 + Math.sin((r / 9) * Math.PI * 0.85) * 0.055;
      const dFront = r < 7 ? 0.088 : 0.075 - (r - 6) * 0.015;
      const frontEndX = r < 7 ? side * 0.016 : side * (0.045 + (r - 6) * 0.025);

      const ribGeo = createVariableTubeGeometry(
        [
          [side * 0.015, yBack, -0.055],
          [side * (w * 0.65), yBack - 0.006, -0.045],
          [side * w, (yBack + yFront) * 0.5, 0.015],
          [side * (w * 0.68), yFront + 0.004, dFront * 0.85],
          [frontEndX, yFront, dFront]
        ],
        () => 0.0052,
        18,
        8
      );
      ribGroup.add(new THREE.Mesh(ribGeo, boneMat));
    }
  });
  tagGroupMetadata(ribGroup, 'skeletal', 'ribcage', 'Caja Torácica, Clavículas y Esternón');
  group.add(ribGroup);

  // Pelvis (Sacrum + Bilateral Iliac Wings + Pubic Ring)
  const pelvisGroup = new THREE.Group();
  const sacrumGeo = new THREE.ConeGeometry(0.038, 0.085, 8);
  sacrumGeo.rotateX(Math.PI);
  sacrumGeo.scale(1.0, 1.0, 0.55);
  const sacrum = new THREE.Mesh(sacrumGeo, boneMat);
  sacrum.position.set(0, 0.04, -0.045);
  pelvisGroup.add(sacrum);

  [-1, 1].forEach((side) => {
    const iliumGeo = new THREE.SphereGeometry(0.068, 16, 14);
    iliumGeo.scale(0.88, 0.85, 0.38);
    const ilium = new THREE.Mesh(iliumGeo, boneMat);
    ilium.position.set(side * 0.088, 0.052, -0.008);
    ilium.rotation.y = side * 0.45;
    ilium.rotation.z = side * -0.25;
    pelvisGroup.add(ilium);

    const pubisGeo = createVariableTubeGeometry(
      [
        [side * 0.085, 0.01, 0.01],
        [side * 0.045, -0.032, 0.042],
        [0, -0.036, 0.045]
      ],
      () => 0.012,
      12,
      8
    );
    pelvisGroup.add(new THREE.Mesh(pubisGeo, boneMat));
  });
  tagGroupMetadata(pelvisGroup, 'skeletal', 'pelvis', 'Cintura Pélvica');
  group.add(pelvisGroup);

  // Helper for long bone with enlarged epiphyses (joints)
  const makeLongBone = (p1, p2, shaftR, endR) =>
    createVariableTubeGeometry(
      [p1, p2],
      (t) => {
        const endFactor = Math.pow(Math.abs(t - 0.5) * 2, 3);
        return THREE.MathUtils.lerp(shaftR, endR, endFactor);
      },
      18,
      10
    );

  // Upper Limb Bones (Humerus, Radius, Ulna, Hand Metacarpals)
  const upperBoneGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    // Humerus
    upperBoneGroup.add(
      new THREE.Mesh(
        makeLongBone([side * 0.195, 0.465, -0.004], [side * 0.264, 0.205, -0.004], 0.012, 0.021),
        boneMat
      )
    );
    // Radius (lateral) & Ulna (medial)
    upperBoneGroup.add(
      new THREE.Mesh(
        makeLongBone([side * 0.270, 0.195, 0.0], [side * 0.308, -0.06, 0.025], 0.0075, 0.012),
        boneMat
      )
    );
    upperBoneGroup.add(
      new THREE.Mesh(
        makeLongBone([side * 0.256, 0.195, -0.008], [side * 0.296, -0.06, 0.016], 0.0075, 0.012),
        boneMat
      )
    );
    // Metacarpal/Phalanx rays
    for (let f = 0; f < 4; f++) {
      const zOff = 0.035 - f * 0.012;
      upperBoneGroup.add(
        new THREE.Mesh(
          makeLongBone(
            [side * 0.306, -0.075, 0.024 + zOff * 0.2],
            [side * (0.316 + f * 0.003), -0.165 + f * 0.005, 0.02 + zOff * 0.5],
            0.0032,
            0.0045
          ),
          boneMat
        )
      );
    }
  });
  tagGroupMetadata(upperBoneGroup, 'skeletal', 'upper_limbs', 'Húmero, Radio, Cúbito y Mano');
  group.add(upperBoneGroup);

  // Lower Limb Bones (Femur, Patella, Tibia, Fibula, Foot)
  const lowerBoneGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    // Femoral neck from acetabulum to greater trochanter
    lowerBoneGroup.add(
      new THREE.Mesh(
        makeLongBone([side * 0.088, 0.005, 0.004], [side * 0.122, -0.025, 0.006], 0.014, 0.022),
        boneMat
      )
    );
    // Femur shaft
    lowerBoneGroup.add(
      new THREE.Mesh(
        makeLongBone([side * 0.120, -0.025, 0.006], [side * 0.100, -0.39, 0.008], 0.017, 0.028),
        boneMat
      )
    );
    // Patella
    const patellaGeo = new THREE.SphereGeometry(0.017, 12, 10);
    patellaGeo.scale(1.0, 1.05, 0.55);
    const patella = new THREE.Mesh(patellaGeo, boneMat);
    patella.position.set(side * 0.100, -0.39, 0.038);
    lowerBoneGroup.add(patella);

    // Tibia (medial thick shin) & Fibula (lateral thin bone)
    lowerBoneGroup.add(
      new THREE.Mesh(
        makeLongBone([side * 0.095, -0.41, 0.008], [side * 0.092, -0.825, -0.002], 0.014, 0.023),
        boneMat
      )
    );
    lowerBoneGroup.add(
      new THREE.Mesh(
        makeLongBone([side * 0.116, -0.42, -0.004], [side * 0.112, -0.825, -0.008], 0.0065, 0.010),
        boneMat
      )
    );
    // Foot tarsals/metatarsals
    lowerBoneGroup.add(
      new THREE.Mesh(
        makeLongBone([side * 0.098, -0.855, -0.015], [side * 0.112, -0.885, 0.13], 0.015, 0.019),
        boneMat
      )
    );
  });
  tagGroupMetadata(lowerBoneGroup, 'skeletal', 'lower_limbs', 'Fémur, Rótula, Tibia y Peroné');
  group.add(lowerBoneGroup);

  return group;
}

/**
 * 6. URINARY SYSTEM 3D
 * Left & Right Bean-Shaped Kidneys, Ureters, Bladder & Urethra.
 */
export function createUrinarySystem3D() {
  const group = new THREE.Group();
  group.name = 'system-urinary';

  const kidneyMat = new THREE.MeshStandardMaterial({
    color: '#e08b2c',
    emissive: '#592e04',
    emissiveIntensity: 0.18,
    roughness: 0.42,
    metalness: 0.04
  });
  const tubeMat = new THREE.MeshStandardMaterial({
    color: '#ea9c40',
    roughness: 0.45,
    metalness: 0.03
  });

  // Kidneys (Right = -X slightly lower at y=0.145; Left = +X slightly higher at y=0.165)
  const kidneyGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const kY = side < 0 ? 0.145 : 0.165;
    const kidneyGeo = new THREE.SphereGeometry(0.034, 20, 16);
    kidneyGeo.scale(0.68, 1.32, 0.58);
    // Indent medial hilum to create realistic bean shape
    const pos = kidneyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      const y = pos.getY(i);
      if ((side < 0 && x > 0) || (side > 0 && x < 0)) {
        const midFactor = Math.exp(-(y * y) / 0.0008);
        x -= side * -0.010 * midFactor;
        pos.setX(i, x);
      }
    }
    kidneyGeo.computeVertexNormals();

    const kidney = new THREE.Mesh(kidneyGeo, kidneyMat);
    kidney.position.set(side * 0.068, kY, -0.022);
    kidney.rotation.z = side * 0.16;
    kidneyGroup.add(kidney);
  });
  tagGroupMetadata(kidneyGroup, 'urinary', 'kidneys', 'Riñones (Izquierdo y Derecho)');
  group.add(kidneyGroup);

  // Ureters
  const ureterGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const kY = side < 0 ? 0.140 : 0.160;
    const uGeo = createVariableTubeGeometry(
      [
        [side * 0.052, kY, -0.020],
        [side * 0.042, 0.075, -0.012],
        [side * 0.032, 0.015, 0.008],
        [side * 0.018, -0.022, 0.028]
      ],
      () => 0.0042,
      20,
      8
    );
    ureterGroup.add(new THREE.Mesh(uGeo, tubeMat));
  });
  tagGroupMetadata(ureterGroup, 'urinary', 'ureters', 'Uréteres');
  group.add(ureterGroup);

  // Urinary Bladder & Urethra
  const bladderGroup = new THREE.Group();
  const bladderGeo = new THREE.SphereGeometry(0.032, 18, 16);
  bladderGeo.scale(0.95, 1.05, 0.85);
  const bladder = new THREE.Mesh(bladderGeo, kidneyMat);
  bladder.position.set(0, -0.026, 0.032);
  bladderGroup.add(bladder);

  const urethraGeo = createVariableTubeGeometry(
    [
      [0, -0.052, 0.030],
      [0, -0.088, 0.022]
    ],
    () => 0.0048,
    8,
    8
  );
  bladderGroup.add(new THREE.Mesh(urethraGeo, tubeMat));
  tagGroupMetadata(bladderGroup, 'urinary', 'bladder', 'Vejiga Urinaria y Uretra');
  group.add(bladderGroup);

  return group;
}

/**
 * Assembles one complete 3D human figure with the requested systems and skin opacity.
 */
export function createCompleteHumanFigure3D(
  systemsToInclude = ['nervous', 'circulatory', 'digestive', 'respiratory', 'skeletal', 'urinary'],
  { skinOpacity = 0.28, skinColor = BODY_PALETTE.skinBase } = {}
) {
  const figure = new THREE.Group();
  figure.name = 'human-body-figure';

  const systemBuilders = {
    skeletal: createSkeletalSystem3D,
    urinary: createUrinarySystem3D,
    nervous: createNervousSystem3D,
    digestive: createDigestiveSystem3D,
    circulatory: createCirculatorySystem3D,
    respiratory: createRespiratorySystem3D
  };

  const systemsMap = {};
  systemsToInclude.forEach((sysId) => {
    const builder = systemBuilders[sysId];
    if (builder) {
      const sysGroup = builder();
      figure.add(sysGroup);
      systemsMap[sysId] = sysGroup;
    }
  });

  // Skin shell added last so transparency sorts properly around internal systems
  const skinGroup = createHumanSkinGroup({ opacity: skinOpacity, color: skinColor });
  figure.add(skinGroup);

  figure.userData = { skinGroup, systemsMap };
  return figure;
}
