import React, { useMemo, useRef, useState } from 'react';
import {
  ANATOMICAL_SYSTEMS,
  DEFAULT_SYSTEM_IDS,
  SYSTEMS_BY_ID
} from '../models/anatomyData';
import {
  ANATOMICAL_EXPLANATIONS_ES
} from '../models/medicalAtlasLoader';
import HumanBody2D from './HumanBody2D';
import HumanBody3D from './HumanBody3D';
import './HumanBodyViewer.css';

function serializeSVGDownload(node, layoutMode, filename) {
  if (!node) return;
  let svgText = '';

  if (node.tagName?.toLowerCase() === 'svg') {
    const clone = node.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgText = new XMLSerializer().serializeToString(clone);
  } else if (layoutMode === 'grid') {
    const svgs = Array.from(node.querySelectorAll('svg'));
    if (!svgs.length) return;
    const cellW = 240;
    const cellH = 500;
    const padX = 40;
    const padY = 40;
    const totalW = cellW * 3 + padX * 4;
    const totalH = cellH * 2 + padY * 3;
    const inner = svgs
      .map((svg, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = padX + col * (cellW + padX);
        const y = padY + row * (cellH + padY);
        return `<g transform="translate(${x}, ${y})">${svg.innerHTML}</g>`;
      })
      .join('\n');
    svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">
      <rect width="100%" height="100%" fill="#3a3a3c"/>
      ${inner}
    </svg>`;
  }

  if (!svgText) return;
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
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
 * Drop-in React Anatomical Viewer Component combining synchronized 2D (SVG) and
 * real medical-grade 3D (BodyParts3D v4.0 + Three.js) human body exploration.
 */
export function HumanBodyViewer({
  defaultDimension = 'split',
  defaultLayout = 'layered',
  defaultSystems = DEFAULT_SYSTEM_IDS,
  defaultSkinOpacity = 0.22,
  defaultColorMode = 'realistic',
  enableExport = true,
  showSidebar = true,
  className = '',
  style,
  onSystemChange,
  onOrganSelect
}) {
  const [dimension, setDimension] = useState(defaultDimension);
  const [layoutMode, setLayoutMode] = useState(defaultLayout);
  const [activeSystems, setActiveSystems] = useState(defaultSystems);
  const [selectedSystemId, setSelectedSystemId] = useState('circulatory');
  const [selectedOrgan, setSelectedOrgan] = useState(null);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [isolatedPartId, setIsolatedPartId] = useState(null);
  const [hiddenPartIds, setHiddenPartIds] = useState([]);
  const [skinOpacity, setSkinOpacity] = useState(defaultSkinOpacity);
  const [colorMode, setColorMode] = useState(defaultColorMode);
  const [explodeAmount, setExplodeAmount] = useState(0);
  const [clipLevel, setClipLevel] = useState(1.0);
  const [animate, setAnimate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [atlasIndex, setAtlasIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const svg2DRef = useRef(null);
  const body3DRef = useRef(null);

  const activeSet = useMemo(() => new Set(activeSystems), [activeSystems]);
  const currentSystem = SYSTEMS_BY_ID[selectedSystemId] || ANATOMICAL_SYSTEMS[0];

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !atlasIndex?.parts) return [];
    const matches = [];
    for (let i = 0; i < atlasIndex.parts.length; i++) {
      const p = atlasIndex.parts[i];
      if (p.name.toLowerCase().includes(q)) {
        matches.push(p);
        if (matches.length >= 12) break;
      }
    }
    return matches;
  }, [searchQuery, atlasIndex]);

  const updateSystems = (nextSystems) => {
    setActiveSystems(nextSystems);
    onSystemChange?.(nextSystems);
  };

  const toggleSystem = (sysId) => {
    const exists = activeSet.has(sysId);
    const next = exists
      ? activeSystems.filter((id) => id !== sysId)
      : [...activeSystems, sysId];
    updateSystems(next);
    setSelectedSystemId(sysId);
  };

  const isolateSystem = (sysId) => {
    setSelectedSystemId(sysId);
    setIsolatedPartId(null);
    setSelectedPartId(null);
    updateSystems([sysId]);
    setLayoutMode('layered');
  };

  const handleSelectSystemFromCanvas = (sysId) => {
    setSelectedSystemId(sysId);
    setSelectedOrgan(null);
    setSelectedPartId(null);
  };

  const handleOrganSelect = (organPayload) => {
    if (!organPayload) return;
    setSelectedSystemId(organPayload.systemId);
    setSelectedOrgan(organPayload);
    if (organPayload.organId) {
      setSelectedPartId(organPayload.organId);
    }
    onOrganSelect?.(organPayload);
  };

  const selectAndFlyToAtlasPart = (part) => {
    if (!part) return;
    setLayoutMode('layered');
    setIsolatedPartId(null);
    if (!activeSet.has(part.viewerSystem) && part.viewerSystem !== 'integumentary') {
      updateSystems([...activeSystems, part.viewerSystem]);
    }
    setSelectedSystemId(part.viewerSystem);
    setSelectedPartId(part.id);
    setSelectedOrgan({
      systemId: part.viewerSystem,
      organId: part.id,
      conceptId: part.conceptId,
      bpSystem: part.bpSystem,
      nameEs: part.name,
      descriptionEs: ANATOMICAL_EXPLANATIONS_ES[part.name.toLowerCase()] || ''
    });
    setTimeout(() => body3DRef.current?.flyToPart(part.id), 50);
  };

  const toggleIsolateSelectedPart = () => {
    if (!selectedPartId) return;
    setIsolatedPartId((prev) => (prev === selectedPartId ? null : selectedPartId));
  };

  const hideSelectedPart = () => {
    if (!selectedPartId) return;
    setHiddenPartIds((prev) => (prev.includes(selectedPartId) ? prev : [...prev, selectedPartId]));
    if (isolatedPartId === selectedPartId) setIsolatedPartId(null);
    setSelectedPartId(null);
    setSelectedOrgan(null);
  };

  return (
    <div className={`hbv-root ${className}`} style={style}>
      {/* Top Control Toolbar */}
      <header className="hbv-toolbar">
        <div className="hbv-brand">
          <span className="hbv-brand-badge">2D + 3D</span>
          <div>
            <h1 className="hbv-title">Atlas Anatómico Humano Unisex</h1>
            <p className="hbv-subtitle">
              BodyParts3D Médico Unisex (6 Sistemas Esenciales) + SVG 2D · Inspirado en Anatomy.app
            </p>
          </div>
        </div>

        <div className="hbv-toolbar-groups">
          {/* Dimension Switcher */}
          <div className="hbv-segmented" role="group" aria-label="Dimensión de vista">
            {[
              ['split', '2D + 3D'],
              ['3d', 'Solo 3D'],
              ['2d', 'Solo 2D']
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`hbv-seg-btn ${dimension === val ? 'is-active' : ''}`}
                onClick={() => setDimension(val)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Layout Switcher */}
          <div className="hbv-segmented" role="group" aria-label="Modo de distribución">
            {[
              ['layered', 'Capas Interactivas'],
              ['grid', 'Cuadrícula 3×2']
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`hbv-seg-btn ${layoutMode === val ? 'is-active' : ''}`}
                onClick={() => setLayoutMode(val)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Color Mode Switcher */}
          {dimension !== '2d' && (
            <div className="hbv-segmented" role="group" aria-label="Paleta 3D">
              {[
                ['realistic', 'Médico Real'],
                ['coded', 'Colores Ref.']
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`hbv-seg-btn ${colorMode === val ? 'is-active' : ''}`}
                  onClick={() => setColorMode(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className={`hbv-pill-btn ${animate ? 'is-active' : ''}`}
            onClick={() => setAnimate((v) => !v)}
          >
            {animate ? '● Pulso' : '○ Estático'}
          </button>

          <button
            type="button"
            className={`hbv-pill-btn ${showLabels ? 'is-active' : ''}`}
            onClick={() => setShowLabels((v) => !v)}
          >
            Etiquetas
          </button>

          {enableExport && (
            <div className="hbv-export-group">
              {dimension !== '3d' && (
                <button
                  type="button"
                  className="hbv-export-btn"
                  onClick={() =>
                    serializeSVGDownload(
                      svg2DRef.current,
                      layoutMode,
                      `cuerpo-humano-2d-${layoutMode}.svg`
                    )
                  }
                >
                  ↓ SVG
                </button>
              )}
              {dimension !== '2d' && (
                <>
                  <button
                    type="button"
                    className="hbv-export-btn"
                    onClick={() => body3DRef.current?.exportGLB(`cuerpo-humano-3d-${layoutMode}.glb`)}
                  >
                    ↓ GLB
                  </button>
                  <button
                    type="button"
                    className="hbv-export-btn"
                    onClick={() => body3DRef.current?.exportOBJ(`cuerpo-humano-3d-${layoutMode}.obj`)}
                  >
                    ↓ OBJ
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="hbv-workspace">
        {showSidebar && (
          <aside className="hbv-sidebar">
            {/* Search across essential 3D anatomical structures */}
            {dimension !== '2d' && atlasIndex && (
              <section className="hbv-panel">
                <h2>Buscar Estructura 3D</h2>
                <div className="hbv-search-box">
                  <input
                    type="text"
                    placeholder="Ej: Heart, Femur, Stomach, Brain, Aorta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')}>
                      ✕
                    </button>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <ul className="hbv-search-results">
                    {searchResults.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => selectAndFlyToAtlasPart(p)}>
                          <span>{p.name}</span>
                          <span className="hbv-search-tag">{p.bpSystem}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* 6 Core Systems Matrix */}
            <section className="hbv-panel">
              <div className="hbv-panel-header">
                <h2>6 Sistemas Esenciales</h2>
                <div className="hbv-quick-actions">
                  <button type="button" onClick={() => updateSystems(DEFAULT_SYSTEM_IDS)}>
                    Todos
                  </button>
                  <button type="button" onClick={() => updateSystems([])}>
                    Ninguno
                  </button>
                </div>
              </div>

              <div className="hbv-system-list">
                {ANATOMICAL_SYSTEMS.map((sys) => {
                  const isActive = activeSet.has(sys.id);
                  const isSelected = selectedSystemId === sys.id;
                  return (
                    <div
                      key={sys.id}
                      className={`hbv-system-item ${isSelected ? 'is-selected' : ''} ${
                        !isActive ? 'is-off' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="hbv-system-toggle"
                        onClick={() => {
                          if (layoutMode === 'grid') {
                            setSelectedSystemId(sys.id);
                            setSelectedOrgan(null);
                          } else {
                            toggleSystem(sys.id);
                          }
                        }}
                      >
                        <span
                          className="hbv-color-swatch"
                          style={{
                            backgroundColor: isActive ? sys.primaryColor : 'transparent',
                            borderColor: sys.primaryColor
                          }}
                        />
                        <span className="hbv-system-name">{sys.nameEs}</span>
                        {layoutMode === 'layered' && (
                          <span className="hbv-state-tag">{isActive ? 'ON' : 'OFF'}</span>
                        )}
                      </button>

                      <button
                        type="button"
                        className="hbv-isolate-btn"
                        onClick={() => isolateSystem(sys.id)}
                      >
                        Aislar
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Layered Mode Dissection Controls */}
            {layoutMode === 'layered' && (
              <section className="hbv-panel">
                <h2>Disección y Vista 3D</h2>

                <label className="hbv-slider-field">
                  <div className="hbv-slider-label">
                    <span>Opacidad de la piel</span>
                    <span>{Math.round(skinOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={skinOpacity}
                    onChange={(e) => setSkinOpacity(parseFloat(e.target.value))}
                  />
                </label>

                {dimension !== '2d' && (
                  <>
                    <label className="hbv-slider-field">
                      <div className="hbv-slider-label">
                        <span>Vista Explotada (Separar capas)</span>
                        <span>{Math.round(explodeAmount * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={explodeAmount}
                        onChange={(e) => setExplodeAmount(parseFloat(e.target.value))}
                      />
                    </label>

                    <label className="hbv-slider-field">
                      <div className="hbv-slider-label">
                        <span>Corte transversal (Axial)</span>
                        <span>{Math.round(clipLevel * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.08"
                        max="1"
                        step="0.01"
                        value={clipLevel}
                        onChange={(e) => setClipLevel(parseFloat(e.target.value))}
                      />
                    </label>
                  </>
                )}

                {hiddenPartIds.length > 0 && (
                  <button
                    type="button"
                    className="hbv-restore-btn"
                    onClick={() => setHiddenPartIds([])}
                  >
                    Restaurar {hiddenPartIds.length} pieza(s) oculta(s)
                  </button>
                )}
              </section>
            )}

            {/* Selected Organ / System Inspector Card */}
            <section className="hbv-panel hbv-inspector">
              <div className="hbv-inspector-head">
                <span
                  className="hbv-color-swatch"
                  style={{ backgroundColor: currentSystem.primaryColor || '#a84a42' }}
                />
                <div>
                  <h3>{currentSystem.nameEs}</h3>
                  <span className="hbv-en-name">{currentSystem.nameEn}</span>
                </div>
              </div>

              {selectedOrgan && (
                <div className="hbv-organ-highlight">
                  <div className="hbv-organ-title">{selectedOrgan.nameEs}</div>
                  {selectedOrgan.conceptId && (
                    <div className="hbv-organ-meta">
                      ID Anatómico: {selectedOrgan.organId} · {selectedOrgan.conceptId}
                    </div>
                  )}
                  {selectedOrgan.descriptionEs && (
                    <p className="hbv-organ-desc">{selectedOrgan.descriptionEs}</p>
                  )}

                  {selectedPartId && dimension !== '2d' && (
                    <div className="hbv-organ-actions">
                      <button
                        type="button"
                        onClick={() => body3DRef.current?.flyToPart(selectedPartId)}
                      >
                        Enfocar
                      </button>
                      <button type="button" onClick={toggleIsolateSelectedPart}>
                        {isolatedPartId === selectedPartId ? 'Salir aislamiento' : 'Aislar pieza'}
                      </button>
                      <button type="button" onClick={hideSelectedPart}>
                        Ocultar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {currentSystem.summaryEs && <p className="hbv-summary">{currentSystem.summaryEs}</p>}

              {currentSystem.metrics && (
                <div className="hbv-metrics-grid">
                  {currentSystem.metrics.map((m) => (
                    <div key={m.label} className="hbv-metric-box">
                      <span className="hbv-metric-val">{m.value}</span>
                      <span className="hbv-metric-lbl">{m.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {currentSystem.organs && (
                <div className="hbv-organs-list">
                  <h4>Estructuras incluidas</h4>
                  <ul>
                    {currentSystem.organs.map((org) => (
                      <li
                        key={org.id}
                        className={selectedOrgan?.organId === org.id ? 'is-active' : ''}
                      >
                        <strong>{org.nameEs}</strong>
                        <span>{org.descriptionEs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </aside>
        )}

        {/* Viewport Stage(s) */}
        <main className={`hbv-stage hbv-dim-${dimension}`}>
          {(dimension === '2d' || dimension === 'split') && (
            <div className="hbv-viewport-pane">
              <div className="hbv-pane-badge">
                <span>Modelo 2D (SVG Vectorial)</span>
                <span className="hbv-pane-hint">
                  {layoutMode === 'grid' ? 'Vista cuadrícula 3×2' : 'Zoom y clic en órganos'}
                </span>
              </div>
              <HumanBody2D
                ref={svg2DRef}
                layoutMode={layoutMode}
                activeSystems={activeSystems}
                selectedSystem={selectedSystemId}
                onSelectSystem={handleSelectSystemFromCanvas}
                onSelectOrgan={handleOrganSelect}
                skinOpacity={layoutMode === 'grid' ? 1 : Math.max(0.14, skinOpacity)}
                animate={animate}
                showLabels={showLabels}
              />
            </div>
          )}

          {(dimension === '3d' || dimension === 'split') && (
            <div className="hbv-viewport-pane">
              <div className="hbv-pane-badge">
                <span>Modelo 3D Médico (BodyParts3D · WebGL)</span>
                <span className="hbv-pane-hint">Arrastra para rotar · Clic en cualquier estructura</span>
              </div>
              <HumanBody3D
                ref={body3DRef}
                layoutMode={layoutMode}
                activeSystems={activeSystems}
                selectedSystem={selectedSystemId}
                selectedPartId={selectedPartId}
                isolatedPartId={isolatedPartId}
                hiddenPartIds={hiddenPartIds}
                colorMode={colorMode}
                explodeAmount={explodeAmount}
                onSelectSystem={handleSelectSystemFromCanvas}
                onSelectOrgan={handleOrganSelect}
                onAtlasLoaded={setAtlasIndex}
                skinOpacity={skinOpacity}
                animate={animate}
                clipLevel={clipLevel}
                showLabels={showLabels}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default HumanBodyViewer;
