import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { ANATOMICAL_SYSTEMS, BODY_PALETTE, SYSTEMS_BY_ID } from '../models/anatomyData';
import {
  ANATOMICAL_EXPLANATIONS_ES,
  BP_SYSTEM_TO_VIEWER,
  MATERIAL_PROFILES,
  REALISTIC_MEDICAL_COLORS,
  SYSTEM_CODED_COLORS,
  buildExportableGroup,
  computeExplosionLayout,
  loadMedicalAtlas
} from '../models/medicalAtlasLoader';

const CAMERA_PRESETS = {
  threeQuarter: { pos: [1.35, 1.05, 2.38], target: [0, 0.86, 0] },
  front: { pos: [0, 0.92, 2.55], target: [0, 0.86, 0] },
  back: { pos: [0, 0.92, -2.55], target: [0, 0.86, 0] },
  left: { pos: [2.45, 0.92, 0.05], target: [0, 0.86, 0] },
  right: { pos: [-2.45, 0.92, 0.05], target: [0, 0.86, 0] },
  head: { pos: [0.18, 1.58, 0.62], target: [0, 1.56, 0] },
  thorax: { pos: [0.24, 1.24, 0.92], target: [0, 1.22, 0] },
  abdomen: { pos: [0.20, 0.98, 0.88], target: [0, 0.96, 0] },
  pelvis: { pos: [0.18, 0.78, 0.85], target: [0, 0.78, 0] },
  // Aurora: zonas extra
  hand: { pos: [0.43, 0.82, 0.52], target: [0.262, 0.78, 0.06] },
  legs: { pos: [0.75, 0.55, 1.75], target: [0, 0.45, 0] },
  grid: { pos: [0, 0.0, 4.55], target: [0, 0.0, 0] }
};

function disposeLocalObjects(root, sharedGeoSet) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry && (!sharedGeoSet || !sharedGeoSet.has(obj.geometry))) {
      obj.geometry.dispose();
    }
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Creates a GPU-accelerated PBR material whose visibility, explode offset, hover, and selection
 * are updated instantaneously via two 1D RGBA DataTextures without rebuilding geometry.
 */
function createAtlasShaderMaterial(bpSystem, colorHex, skinOpacity, partTex, selTex, texWidth) {
  const profile = MATERIAL_PROFILES[bpSystem] || { roughness: 0.45, metalness: 0.05, clearcoat: 0.15 };
  const isSkin = bpSystem === 'integumentary';
  const isLung = bpSystem === 'respiratory_lung';
  const isTranslucent = (isSkin && skinOpacity < 0.95) || isLung;

  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: profile.roughness,
    metalness: profile.metalness,
    clearcoat: profile.clearcoat,
    clearcoatRoughness: 0.35,
    side: THREE.DoubleSide,
    transparent: isTranslucent,
    opacity: isSkin ? skinOpacity : isLung ? 0.44 : 1.0,
    depthWrite: !isTranslucent
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.partState = { value: partTex };
    shader.uniforms.selectionState = { value: selTex };
    shader.uniforms.stateWidth = { value: texWidth };

    shader.vertexShader =
      `attribute float partIndex;
uniform sampler2D partState;
uniform sampler2D selectionState;
uniform float stateWidth;
varying float vPartVisible;
varying float vPartSelected;
varying float vPartHovered;\n` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5);
vec4 pState = texture2D(partState, stateUv);
vec4 sState = texture2D(selectionState, stateUv);
transformed += pState.xyz;
vPartVisible = pState.w;
vPartSelected = sState.r;
vPartHovered = sState.g;`
    );

    shader.fragmentShader =
      `varying float vPartVisible;
varying float vPartSelected;
varying float vPartHovered;\n` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
if (vPartVisible < 0.5) discard;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.28, 0.88, 0.85), vPartSelected * 0.72);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.85, 0.45), vPartHovered * 0.35);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(0.08, 0.36, 0.36) * vPartSelected + vec3(0.18, 0.14, 0.03) * vPartHovered;`
    );
  };

  mat.customProgramCacheKey = () => `bodyparts3d-v1-${bpSystem}`;
  return mat;
}

/**
 * HumanBody3D Component
 * Medical-grade Three.js viewer rendering BodyParts3D v4.0 (2,234 real MRI-derived structures)
 * with Anatomy.app-inspired inspection, explode view, peel/isolate, axial cut, and GLB/OBJ export.
 */
export const HumanBody3D = forwardRef(function HumanBody3D(
  {
    layoutMode = 'layered',
    activeSystems = ['nervous', 'circulatory', 'digestive', 'respiratory', 'skeletal', 'urinary'],
    selectedSystem = null,
    selectedPartId = null,
    isolatedPartId = null,
    hiddenPartIds = [],
    colorMode = 'realistic',
    explodeAmount = 0,
    onSelectSystem,
    onSelectOrgan,
    onAtlasLoaded,
    skinOpacity = 0.24,
    animate = true,
    clipLevel = 1.0,
    showLabels = true,
    cameraPreset = null,
    showCameraBar = true,
    markers = null
  },
  forwardedRef
) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rootGroupRef = useRef(null);
  const studioGroupRef = useRef(null);

  const [atlasData, setAtlasData] = useState(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [hoveredPart, setHoveredPart] = useState(null);

  const sharedGeoSetRef = useRef(new Set());
  const layeredStateRef = useRef(null);
  const layeredMatsRef = useRef(new Map());
  const gridMatsRef = useRef(new Map());
  const gridGroupsRef = useRef([]);
  const clipPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, -1, 0), 2.0));
  const cameraGoalRef = useRef(null);
  // Aurora: mover la cámara cuando la app cambia de zona
  const cameraPresetRef = useRef(cameraPreset);
  // Aurora: puntos de medida anclados al modelo (coordenadas del atlas, en metros)
  const markersRef = useRef(markers);
  const markerElsRef = useRef([]);
  markersRef.current = markers;
  useEffect(() => {
    cameraPresetRef.current = cameraPreset;
    const preset = cameraPreset && CAMERA_PRESETS[cameraPreset];
    if (!preset) return;
    cameraGoalRef.current = { pos: new THREE.Vector3(...preset.pos), target: new THREE.Vector3(...preset.target) };
    dirtyRef.current = true;
  }, [cameraPreset]);
  const currentExplodeRef = useRef(explodeAmount);
  const targetExplodeRef = useRef(explodeAmount);
  const dirtyRef = useRef(true);

  const animateFlagRef = useRef(animate);
  const layoutModeRef = useRef(layoutMode);
  const activeSystemsRef = useRef(activeSystems);
  const selectedPartIdRef = useRef(selectedPartId);
  const isolatedPartIdRef = useRef(isolatedPartId);
  const hiddenPartIdsRef = useRef(hiddenPartIds);
  const colorModeRef = useRef(colorMode);
  const skinOpacityRef = useRef(skinOpacity);
  const onSelectSystemRef = useRef(onSelectSystem);
  const onSelectOrganRef = useRef(onSelectOrgan);

  animateFlagRef.current = animate;
  layoutModeRef.current = layoutMode;
  activeSystemsRef.current = activeSystems;
  selectedPartIdRef.current = selectedPartId;
  isolatedPartIdRef.current = isolatedPartId;
  hiddenPartIdsRef.current = hiddenPartIds;
  colorModeRef.current = colorMode;
  skinOpacityRef.current = skinOpacity;
  targetExplodeRef.current = explodeAmount;
  onSelectSystemRef.current = onSelectSystem;
  onSelectOrganRef.current = onSelectOrgan;

  // 0. Fetch & cache BodyParts3D v4.0 binary atlas
  useEffect(() => {
    let cancelled = false;
    loadMedicalAtlas((pct) => {
      if (!cancelled) setLoadProgress(pct);
    })
      .then((data) => {
        if (cancelled) return;
        const geoSet = new Set();
        data.chunkGroups.forEach((m) => m?.forEach((g) => geoSet.add(g)));
        data.pickGeometries.forEach((g) => g && geoSet.add(g));
        sharedGeoSetRef.current = geoSet;
        setAtlasData(data);
        onAtlasLoaded?.(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || 'Could not load the 3D atlas');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Imperative API for camera presets, fly-to-part, and GLB/OBJ export
  useImperativeHandle(
    forwardedRef,
    () => ({
      setCameraPreset(presetName) {
        const preset = CAMERA_PRESETS[presetName];
        if (!preset) return;
        cameraGoalRef.current = {
          pos: new THREE.Vector3(...preset.pos),
          target: new THREE.Vector3(...preset.target)
        };
        dirtyRef.current = true;
      },
      resetCamera() {
        const preset =
          layoutModeRef.current === 'grid' ? CAMERA_PRESETS.grid : CAMERA_PRESETS.threeQuarter;
        cameraGoalRef.current = {
          pos: new THREE.Vector3(...preset.pos),
          target: new THREE.Vector3(...preset.target)
        };
        dirtyRef.current = true;
      },
      flyToPart(partId) {
        if (!atlasData) return;
        const p = atlasData.parts.find((item) => item.id === partId);
        if (!p) return;
        const box = p.box.clone();
        const st = layeredStateRef.current;
        if (st?.partData) {
          const idx = p.index;
          box.translate(
            new THREE.Vector3(
              st.partData[idx * 4],
              st.partData[idx * 4 + 1],
              st.partData[idx * 4 + 2]
            )
          );
        }
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(0.12, size.length());
        const dist = Math.min(2.6, Math.max(0.28, maxDim * 2.3));
        cameraGoalRef.current = {
          pos: center.clone().add(new THREE.Vector3(0.28, 0.14, 1.0).normalize().multiplyScalar(dist)),
          target: center
        };
        dirtyRef.current = true;
      },
      exportGLB(filename = 'cuerpo-humano-medico-3d.glb') {
        if (!atlasData) return;
        const visibleIndices = collectVisibleExportIndices(
          atlasData,
          layoutModeRef.current,
          activeSystemsRef.current,
          isolatedPartIdRef.current,
          hiddenPartIdsRef.current,
          skinOpacityRef.current
        );
        const exportGroup = buildExportableGroup(
          atlasData,
          visibleIndices,
          layeredStateRef.current?.partData,
          colorModeRef.current
        );
        const exporter = new GLTFExporter();
        exporter.parse(
          exportGroup,
          (result) => {
            disposeLocalObjects(exportGroup);
            const blob = new Blob([result], { type: 'model/gltf-binary' });
            triggerDownload(blob, filename);
          },
          (err) => {
            disposeLocalObjects(exportGroup);
            console.error('GLTF export error:', err);
          },
          { binary: true }
        );
      },
      exportOBJ(filename = 'cuerpo-humano-medico-3d.obj') {
        if (!atlasData) return;
        const visibleIndices = collectVisibleExportIndices(
          atlasData,
          layoutModeRef.current,
          activeSystemsRef.current,
          isolatedPartIdRef.current,
          hiddenPartIdsRef.current,
          skinOpacityRef.current
        );
        const exportGroup = buildExportableGroup(
          atlasData,
          visibleIndices,
          layeredStateRef.current?.partData,
          colorModeRef.current
        );
        const exporter = new OBJExporter();
        const objString = exporter.parse(exportGroup);
        disposeLocalObjects(exportGroup);
        const blob = new Blob([objString], { type: 'text/plain;charset=utf-8' });
        triggerDownload(blob, filename);
      }
    }),
    [atlasData]
  );

  // 1. Initialize WebGLRenderer, RoomEnvironment PBR Studio Lighting & OrbitControls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BODY_PALETTE.backdrop);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.02, 45);
    const initialPreset =
      layoutModeRef.current === 'grid' ? CAMERA_PRESETS.grid : (CAMERA_PRESETS[cameraPresetRef.current] || CAMERA_PRESETS.threeQuarter);
    camera.position.set(...initialPreset.pos);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Realistic PBR Image-Based Studio Lighting (Anatomy.app style)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envRT = pmrem.fromScene(room, 0.04);
    scene.environment = envRT.texture;
    room.dispose();
    pmrem.dispose();

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#4a4d57', 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fffaf2', 1.85);
    keyLight.position.set(2.8, 4.2, 4.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.camera.left = -3.2;
    keyLight.shadow.camera.right = 3.2;
    keyLight.shadow.camera.top = 3.0;
    keyLight.shadow.camera.bottom = -3.0;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#dbeafe', 1.25);
    rimLight.position.set(-2.6, 2.2, -3.2);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.14;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.96;
    controls.target.set(...initialPreset.target);
    controls.addEventListener('change', () => {
      dirtyRef.current = true;
    });
    controlsRef.current = controls;

    const rootGroup = new THREE.Group();
    rootGroup.name = 'atlas-root';
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;

    const studioGroup = new THREE.Group();
    studioGroup.name = 'studio-stage';
    scene.add(studioGroup);
    studioGroupRef.current = studioGroup;

    const resizeObserver = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
        dirtyRef.current = true;
      }
    });
    resizeObserver.observe(container);

    // Raycasting for 2,234 anatomical parts (or 6 grid cards)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const worldBox = new THREE.Box3();
    const hitPoint = new THREE.Vector3();
    const offsetVec = new THREE.Vector3();
    let downPos = { x: 0, y: 0 };

    const updatePointer = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pickLayeredPart = () => {
      const st = layeredStateRef.current;
      if (!st) return null;
      raycaster.setFromCamera(pointer, camera);

      let nearest = Infinity;
      let foundIdx = -1;
      const hasSolidVisible = st.parts.some(
        (p, i) => p.bpSystem !== 'integumentary' && st.partData[i * 4 + 3] > 0.5
      );

      for (let i = 0; i < st.parts.length; i++) {
        if (st.partData[i * 4 + 3] < 0.5) continue;
        const part = st.parts[i];
        if (hasSolidVisible && part.bpSystem === 'integumentary') continue;
        const mesh = st.pickers[i];
        if (!mesh) continue;

        offsetVec.set(st.partData[i * 4], st.partData[i * 4 + 1], st.partData[i * 4 + 2]);
        worldBox.copy(part.box).translate(offsetVec);
        if (!raycaster.ray.intersectBox(worldBox, hitPoint)) continue;

        const hits = raycaster.intersectObject(mesh, false);
        if (hits[0] && hits[0].distance < nearest) {
          nearest = hits[0].distance;
          foundIdx = i;
        }
      }

      if (foundIdx < 0) return null;
      const p = st.parts[foundIdx];
      return {
        index: foundIdx,
        part: p,
        systemId: p.viewerSystem,
        organId: p.id,
        nameEs: p.name,
        conceptId: p.conceptId,
        bpSystem: p.bpSystem,
        descriptionEs: ANATOMICAL_EXPLANATIONS_ES[p.name.toLowerCase()] || ''
      };
    };

    const pickGridCard = () => {
      if (!gridGroupsRef.current.length) return null;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(gridGroupsRef.current, true);
      for (const hit of hits) {
        let curr = hit.object;
        while (curr) {
          if (curr.userData?.gridSystemId) {
            return curr.userData.gridSystemId;
          }
          curr = curr.parent;
        }
      }
      return null;
    };

    const onPointerMove = (e) => {
      updatePointer(e);
      if (e.buttons) return;
      if (layoutModeRef.current === 'grid') {
        const sysId = pickGridCard();
        renderer.domElement.style.cursor = sysId ? 'pointer' : 'grab';
        setHoveredPart(
          sysId
            ? {
                systemId: sysId,
                nameEs: SYSTEMS_BY_ID[sysId]?.nameEs || sysId
              }
            : null
        );
        return;
      }

      const hit = pickLayeredPart();
      const st = layeredStateRef.current;
      if (st) {
        st.selData.fill(0);
        if (selectedPartIdRef.current) {
          const selIdx = st.idToIndex.get(selectedPartIdRef.current);
          if (selIdx !== undefined) st.selData[selIdx * 4] = 255;
        }
        if (hit) {
          st.selData[hit.index * 4 + 1] = 255;
        }
        st.selectionTexture.needsUpdate = true;
        dirtyRef.current = true;
      }

      renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      setHoveredPart(
        hit
          ? {
              systemId: hit.systemId,
              bpSystem: hit.bpSystem,
              nameEs: hit.nameEs,
              organId: hit.organId
            }
          : null
      );
    };

    const onPointerDown = (e) => {
      downPos = { x: e.clientX, y: e.clientY };
      cameraGoalRef.current = null;
    };

    const onPointerUp = (e) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist > 6) return;
      updatePointer(e);
      if (layoutModeRef.current === 'grid') {
        const sysId = pickGridCard();
        if (sysId) onSelectSystemRef.current?.(sysId);
      } else {
        const hit = pickLayeredPart();
        if (hit) onSelectOrganRef.current?.(hit);
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    let animId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      animId = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);

      if (cameraGoalRef.current) {
        camera.position.lerp(cameraGoalRef.current.pos, 0.12);
        controls.target.lerp(cameraGoalRef.current.target, 0.12);
        dirtyRef.current = true;
        if (camera.position.distanceTo(cameraGoalRef.current.pos) < 0.008) {
          cameraGoalRef.current = null;
        }
      }

      // Smoothly animate Exploded View transitions
      const st = layeredStateRef.current;
      if (st && layoutModeRef.current === 'layered') {
        if (Math.abs(currentExplodeRef.current - targetExplodeRef.current) > 0.0008) {
          currentExplodeRef.current = THREE.MathUtils.damp(
            currentExplodeRef.current,
            targetExplodeRef.current,
            8,
            dt
          );
          const offsets = computeExplosionLayout(
            st.parts,
            st.visibleIndexSet,
            currentExplodeRef.current
          );
          for (let i = 0; i < st.parts.length; i++) {
            const dx = offsets ? offsets[i * 3] : 0;
            const dy = offsets ? offsets[i * 3 + 1] : 0;
            const dz = offsets ? offsets[i * 3 + 2] : 0;
            st.partData[i * 4] = dx;
            st.partData[i * 4 + 1] = dy;
            st.partData[i * 4 + 2] = dz;
            if (st.pickers[i]) {
              st.pickers[i].position.set(dx, dy, dz);
              st.pickers[i].updateMatrix();
              st.pickers[i].updateMatrixWorld(true);
            }
          }
          st.partTexture.needsUpdate = true;
          dirtyRef.current = true;
        }
      }

      // Subtle physiological animation: gentle arterial/cardiac living pulse + breathing chest shimmer
      if (animateFlagRef.current && layoutModeRef.current === 'layered') {
        const t = clock.elapsedTime;
        const cardiacMat = layeredMatsRef.current.get('cardiac');
        if (cardiacMat) {
          const phase = (t * 1.2) % 1;
          const pulse = Math.exp(-Math.pow((phase - 0.16) * 12, 2)) * 0.18;
          cardiacMat.emissive.setRGB(pulse, pulse * 0.15, pulse * 0.15);
          dirtyRef.current = true;
        }
      }

      if (controls.update()) {
        dirtyRef.current = true;
      }

      if (dirtyRef.current) {
        renderer.render(scene, camera);
        dirtyRef.current = false;
      }

      // Aurora: proyectar los puntos de medida sobre la pantalla en cada cuadro
      const mk = markersRef.current;
      if (mk && mk.length) {
        const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
        const v = new THREE.Vector3();
        mk.forEach((p, i) => {
          const el = markerElsRef.current[i];
          if (!el) return;
          v.set(p[0], p[1], p[2]).project(camera);
          const visible = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
          el.style.display = visible ? 'grid' : 'none';
          el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
        });
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      envRT.dispose();
      disposeLocalObjects(scene, sharedGeoSetRef.current);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Build either Layered (2,234 GPU-batched parts) or Grid (6 BodyParts3D figures) scene when atlas or layout changes
  useEffect(() => {
    const rootGroup = rootGroupRef.current;
    const studioGroup = studioGroupRef.current;
    if (!atlasData || !rootGroup || !studioGroup) return;

    if (layeredStateRef.current) {
      layeredStateRef.current.partTexture.dispose();
      layeredStateRef.current.selectionTexture.dispose();
      layeredStateRef.current = null;
    }

    disposeLocalObjects(rootGroup, sharedGeoSetRef.current);
    rootGroup.clear();
    disposeLocalObjects(studioGroup, sharedGeoSetRef.current);
    studioGroup.clear();
    layeredMatsRef.current.clear();
    gridMatsRef.current.clear();
    gridGroupsRef.current = [];

    const palette =
      colorModeRef.current === 'coded' ? SYSTEM_CODED_COLORS : REALISTIC_MEDICAL_COLORS;

    if (layoutMode === 'grid') {
      // Studio charcoal shadow backdrop behind the 3x2 medical figures
      const wallGeo = new THREE.PlaneGeometry(11, 7.5);
      const wallMat = new THREE.MeshStandardMaterial({
        color: BODY_PALETTE.backdrop,
        roughness: 0.92,
        metalness: 0.02
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(0, 0, -0.25);
      wall.receiveShadow = true;
      studioGroup.add(wall);

      // Shared materials per bpSystem for Grid mode
      Object.keys(palette).forEach((bpSys) => {
        const isSkin = bpSys === 'integumentary';
        const isLung = bpSys === 'respiratory_lung';
        const isTranslucent = isSkin || isLung;
        const profile = MATERIAL_PROFILES[bpSys] || { roughness: 0.45, metalness: 0.05, clearcoat: 0.1 };
        gridMatsRef.current.set(
          bpSys,
          new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(palette[bpSys]),
            roughness: profile.roughness,
            metalness: profile.metalness,
            clearcoat: profile.clearcoat,
            transparent: isTranslucent,
            opacity: isSkin ? 0.24 : isLung ? 0.44 : 1.0,
            depthWrite: !isTranslucent,
            side: THREE.DoubleSide
          })
        );
      });

      const cols = [-1.15, 0, 1.15];
      const rows = [0.98, -0.98];

      ANATOMICAL_SYSTEMS.forEach((sys, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const figure = new THREE.Group();
        figure.position.set(cols[col], rows[row] - 0.865, 0);
        figure.scale.setScalar(0.95);
        figure.userData.gridSystemId = sys.id;

        atlasData.chunkGroups.forEach((byBpSys) => {
          byBpSys.forEach((geo, bpSys) => {
            const mapped = BP_SYSTEM_TO_VIEWER[bpSys];
            if (mapped !== sys.id && bpSys !== 'integumentary') return;
            const mat = gridMatsRef.current.get(bpSys);
            if (!mat) return;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = bpSys !== 'integumentary';
            mesh.receiveShadow = true;
            figure.add(mesh);
          });
        });

        rootGroup.add(figure);
        gridGroupsRef.current.push(figure);
      });

      cameraGoalRef.current = {
        pos: new THREE.Vector3(...CAMERA_PRESETS.grid.pos),
        target: new THREE.Vector3(...CAMERA_PRESETS.grid.target)
      };
    } else {
      // Anatomy.app-inspired Pedestal & Architectural Studio Floor
      const floorGeo = new THREE.CircleGeometry(14, 72);
      floorGeo.rotateX(-Math.PI / 2);
      const floorMat = new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.95 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.position.y = -0.022;
      floor.receiveShadow = true;
      studioGroup.add(floor);

      const pedGeo = new THREE.CylinderGeometry(0.62, 0.64, 0.024, 96);
      const pedMat = new THREE.MeshStandardMaterial({
        color: '#323236',
        metalness: 0.14,
        roughness: 0.58
      });
      const pedestal = new THREE.Mesh(pedGeo, pedMat);
      pedestal.position.y = -0.013;
      pedestal.receiveShadow = true;
      studioGroup.add(pedestal);

      const ringGeo = new THREE.RingGeometry(0.57, 0.574, 128);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: '#8c969f',
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.001;
      studioGroup.add(ring);

      // Build GPU DataTextures for 2,234 real medical parts
      const width = THREE.MathUtils.ceilPowerOfTwo(atlasData.parts.length);
      const partData = new Float32Array(width * 4);
      const partTexture = new THREE.DataTexture(partData, width, 1, THREE.RGBAFormat, THREE.FloatType);
      partTexture.needsUpdate = true;

      const selData = new Uint8Array(width * 4);
      const selectionTexture = new THREE.DataTexture(selData, width, 1);
      selectionTexture.needsUpdate = true;

      const idToIndex = new Map();
      const pickers = new Array(atlasData.parts.length);
      atlasData.parts.forEach((p, i) => {
        idToIndex.set(p.id, i);
        const pickMesh = new THREE.Mesh(atlasData.pickGeometries[i]);
        pickMesh.matrixAutoUpdate = false;
        pickers[i] = pickMesh;
      });

      // Create custom shader PBR materials per bpSystem
      Object.keys(palette).forEach((bpSys) => {
        const mat = createAtlasShaderMaterial(
          bpSys,
          palette[bpSys],
          skinOpacityRef.current,
          partTexture,
          selectionTexture,
          width
        );
        layeredMatsRef.current.set(bpSys, mat);
      });

      // Mount merged meshes per (chunk, bpSystem)
      atlasData.chunkGroups.forEach((byBpSys) => {
        byBpSys.forEach((geo, bpSys) => {
          const mat = layeredMatsRef.current.get(bpSys);
          if (!mat) return;
          const mesh = new THREE.Mesh(geo, mat);
          mesh.frustumCulled = false;
          mesh.castShadow = bpSys !== 'integumentary';
          mesh.receiveShadow = true;
          rootGroup.add(mesh);
        });
      });

      layeredStateRef.current = {
        parts: atlasData.parts,
        idToIndex,
        pickers,
        partData,
        partTexture,
        selData,
        selectionTexture,
        visibleIndexSet: new Set()
      };

      const startPreset = CAMERA_PRESETS[cameraPresetRef.current] || CAMERA_PRESETS.threeQuarter;
      cameraGoalRef.current = {
        pos: new THREE.Vector3(...startPreset.pos),
        target: new THREE.Vector3(...startPreset.target)
      };
    }

    dirtyRef.current = true;
  }, [atlasData, layoutMode]);

  // 3. Synchronize visible systems, isolated part, hidden (peeled) parts, and selected highlight
  useEffect(() => {
    const st = layeredStateRef.current;
    if (!st || layoutMode !== 'layered') return;

    const activeSet = new Set(activeSystems);
    const hiddenSet = new Set(hiddenPartIds);
    const showSkin = skinOpacity > 0.02;
    const visIndices = new Set();

    const offsets = computeExplosionLayout(
      st.parts,
      new Set(
        st.parts
          .map((_, i) => i)
          .filter((i) => {
            const p = st.parts[i];
            if (isolatedPartId) return p.id === isolatedPartId;
            if (hiddenSet.has(p.id)) return false;
            if (p.bpSystem === 'integumentary') return showSkin;
            return activeSet.has(p.viewerSystem);
          })
      ),
      currentExplodeRef.current
    );

    st.selData.fill(0);
    st.parts.forEach((p, i) => {
      let visible = false;
      if (isolatedPartId) {
        visible = p.id === isolatedPartId;
      } else if (!hiddenSet.has(p.id)) {
        if (p.bpSystem === 'integumentary') {
          visible = showSkin;
        } else {
          visible = activeSet.has(p.viewerSystem) || p.id === selectedPartId;
        }
      }

      if (visible) visIndices.add(i);
      const dx = offsets ? offsets[i * 3] : 0;
      const dy = offsets ? offsets[i * 3 + 1] : 0;
      const dz = offsets ? offsets[i * 3 + 2] : 0;

      st.partData[i * 4] = dx;
      st.partData[i * 4 + 1] = dy;
      st.partData[i * 4 + 2] = dz;
      st.partData[i * 4 + 3] = visible ? 1 : 0;

      if (p.id === selectedPartId) {
        st.selData[i * 4] = 255;
      }
      if (st.pickers[i]) {
        st.pickers[i].position.set(dx, dy, dz);
        st.pickers[i].updateMatrix();
        st.pickers[i].updateMatrixWorld(true);
      }
    });

    st.visibleIndexSet = visIndices;
    st.partTexture.needsUpdate = true;
    st.selectionTexture.needsUpdate = true;
    dirtyRef.current = true;
  }, [atlasData, layoutMode, activeSystems, selectedPartId, isolatedPartId, hiddenPartIds, skinOpacity]);

  // 4. Update skin opacity dynamically without rebuilding geometries
  useEffect(() => {
    if (layoutMode === 'layered') {
      const skinMat = layeredMatsRef.current.get('integumentary');
      if (skinMat) {
        const isTranslucent = skinOpacity < 0.95;
        skinMat.transparent = isTranslucent;
        skinMat.opacity = skinOpacity;
        skinMat.depthWrite = !isTranslucent;
        skinMat.visible = skinOpacity > 0.02;
        skinMat.needsUpdate = true;
        dirtyRef.current = true;
      }
    }
  }, [skinOpacity, layoutMode, atlasData]);

  // 5. Switch dynamically between Realistic Medical Colors (Anatomy.app) & Reference System Colors
  useEffect(() => {
    const palette = colorMode === 'coded' ? SYSTEM_CODED_COLORS : REALISTIC_MEDICAL_COLORS;
    const matMap = layoutMode === 'grid' ? gridMatsRef.current : layeredMatsRef.current;
    matMap.forEach((mat, bpSys) => {
      if (palette[bpSys]) {
        mat.color.set(palette[bpSys]);
        mat.needsUpdate = true;
      }
    });
    dirtyRef.current = true;
  }, [colorMode, layoutMode, atlasData]);

  // 6. Axial Cross-Section Clipping Plane (y from 0.00 to 1.78m)
  useEffect(() => {
    const yCut = THREE.MathUtils.lerp(-0.02, 1.78, clipLevel);
    clipPlaneRef.current.constant = yCut;
    const applyClip = clipLevel < 0.99 && layoutMode === 'layered';

    layeredMatsRef.current.forEach((mat) => {
      mat.clippingPlanes = applyClip ? [clipPlaneRef.current] : null;
      mat.clipShadows = applyClip;
      mat.needsUpdate = true;
    });
    dirtyRef.current = true;
  }, [clipLevel, layoutMode, atlasData]);

  return (
    <div className="anatomy-3d-wrapper">
      <div ref={containerRef} className="anatomy-3d-canvas-container" />
      {atlasData && markers && markers.map((p, i) => (
        <span key={i} className="anchor3d" data-i={i} aria-hidden="true"
          ref={(el) => { markerElsRef.current[i] = el; }}>{i + 1}</span>
      ))}

      {/* Loading Progress Overlay */}
      {!atlasData && !loadError && (
        <div className="anatomy-3d-loading">
          <div className="anatomy-loading-card">
            <div className="anatomy-loading-title">Loading 3D anatomical atlas</div>
            <div className="anatomy-loading-sub">6 core systems · curated internal organs</div>
            <div className="anatomy-loading-bar">
              <div className="anatomy-loading-fill" style={{ width: `${loadProgress}%` }} />
            </div>
            <div className="anatomy-loading-pct">{loadProgress}%</div>
          </div>
        </div>
      )}

      {loadError && (
        <div className="anatomy-3d-loading">
          <div className="anatomy-loading-card">
            <div className="anatomy-loading-title">Error loading the 3D model</div>
            <div className="anatomy-loading-sub">{loadError}</div>
          </div>
        </div>
      )}

      {/* Camera preset bar in layered 3D mode */}
      {showCameraBar && layoutMode === 'layered' && atlasData && (
        <div className="anatomy-3d-camera-bar">
          {[
            ['threeQuarter', '3/4'],
            ['front', 'Frontal'],
            ['back', 'Posterior'],
            ['left', 'Lateral Izq.'],
            ['right', 'Lateral Der.'],
            ['head', 'Cráneo'],
            ['thorax', 'Tórax'],
            ['abdomen', 'Abdomen'],
            ['pelvis', 'Pelvis']
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="anatomy-cam-btn"
              onClick={() => {
                const preset = CAMERA_PRESETS[key];
                cameraGoalRef.current = {
                  pos: new THREE.Vector3(...preset.pos),
                  target: new THREE.Vector3(...preset.target)
                };
                dirtyRef.current = true;
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Grid mode overlay legend */}
      {layoutMode === 'grid' && showLabels && atlasData && (
        <div className="anatomy-3d-grid-legend">
          {ANATOMICAL_SYSTEMS.map((sys) => (
            <button
              key={sys.id}
              type="button"
              className={`anatomy-legend-chip ${selectedSystem === sys.id ? 'is-selected' : ''}`}
              onClick={() => onSelectSystem?.(sys.id)}
            >
              <span className="anatomy-dot" style={{ backgroundColor: sys.primaryColor }} />
              <span>{sys.shortName}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hover inspection tooltip */}
      {hoveredPart && (
        <div className="anatomy-hover-pill">
          <span
            className="anatomy-dot"
            style={{
              backgroundColor:
                SYSTEMS_BY_ID[hoveredPart.systemId]?.primaryColor ||
                REALISTIC_MEDICAL_COLORS[hoveredPart.bpSystem] ||
                '#38bdf8'
            }}
          />
          <span>{hoveredPart.nameEs}</span>
        </div>
      )}
    </div>
  );
});

function collectVisibleExportIndices(
  atlasData,
  layoutMode,
  activeSystems,
  isolatedPartId,
  hiddenPartIds,
  skinOpacity
) {
  const activeSet = new Set(activeSystems);
  const hiddenSet = new Set(hiddenPartIds);
  const showSkin = skinOpacity > 0.02;
  const result = [];

  atlasData.parts.forEach((p, i) => {
    if (layoutMode === 'grid') {
      if (activeSet.has(p.viewerSystem)) result.push(i);
      return;
    }
    if (isolatedPartId) {
      if (p.id === isolatedPartId) result.push(i);
      return;
    }
    if (hiddenSet.has(p.id)) return;
    if (p.bpSystem === 'integumentary') {
      if (showSkin) result.push(i);
    } else if (activeSet.has(p.viewerSystem)) {
      result.push(i);
    }
  });
  return result;
}

export default HumanBody3D;
