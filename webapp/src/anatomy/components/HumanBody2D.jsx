import React, { forwardRef, useMemo, useState } from 'react';
import { ANATOMICAL_SYSTEMS, BODY_PALETTE, SYSTEMS_BY_ID } from '../models/anatomyData';
import {
  HUMAN_ANATOMY_CONTOURS,
  HUMAN_SILHOUETTE_PATH,
  SVG_VIEWBOX,
  getCirculatorySystem2DData,
  getDigestiveSystem2DData,
  getNervousSystem2DData,
  getRespiratorySystem2DData,
  getSkeletalSystem2DData,
  getUrinarySystem2DData
} from '../models/anatomy2DPaths';

/**
 * Renders the 2D Nervous System layer inside the canonical 240x500 anatomical frame.
 */
function NervousLayer2D({ animate, onOrganClick }) {
  const data = useMemo(() => getNervousSystem2DData(), []);
  return (
    <g
      className={animate ? 'anatomy-pulse-nervous' : undefined}
      style={{ cursor: onOrganClick ? 'pointer' : 'default' }}
    >
      {/* Brain hemispheres */}
      <g onClick={() => onOrganClick?.({ systemId: 'nervous', organId: 'brain', nameEs: 'Encéfalo (Cerebro)' })}>
        <path d={data.brainLeft} fill="#6f4e9c" stroke="#4a316d" strokeWidth="0.7" />
        <path d={data.brainRight} fill="#7c56b0" stroke="#4a316d" strokeWidth="0.7" />
        {data.brainSulci.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#b388ff" strokeWidth="0.75" strokeLinecap="round" opacity="0.75" />
        ))}
      </g>

      {/* Cerebellum */}
      <path
        d={data.cerebellum}
        fill="#5b3d85"
        stroke="#422a63"
        strokeWidth="0.6"
        onClick={() => onOrganClick?.({ systemId: 'nervous', organId: 'cerebellum', nameEs: 'Cerebelo y Tronco' })}
      />

      {/* Spinal cord */}
      <path
        d={data.spinalCord}
        fill="none"
        stroke="#6f4e9c"
        strokeWidth="2.4"
        strokeLinecap="round"
        onClick={() => onOrganClick?.({ systemId: 'nervous', organId: 'spinal_cord', nameEs: 'Médula Espinal' })}
      />

      {/* Cranial & brachial/arm peripheral nerves */}
      <g
        fill="none"
        stroke="#7350a6"
        strokeWidth="1.25"
        strokeLinecap="round"
        onClick={() => onOrganClick?.({ systemId: 'nervous', organId: 'brachial_plexus', nameEs: 'Plexo Braquial y Brazos' })}
      >
        {data.cranialNerves.map((d, i) => (
          <path key={`cn-${i}`} d={d} strokeWidth="0.9" />
        ))}
        {data.armNerves.map((d, i) => (
          <path key={`an-${i}`} d={d} strokeWidth={i > 2 && i < 7 || i > 9 ? '0.8' : '1.25'} />
        ))}
      </g>

      {/* Thoracic intercostal nerves */}
      <g
        fill="none"
        stroke="#7c56b0"
        strokeWidth="1.05"
        strokeLinecap="round"
        onClick={() => onOrganClick?.({ systemId: 'nervous', organId: 'intercostal_nerves', nameEs: 'Nervios Intercostales' })}
      >
        {data.torsoNerves.map((d, i) => (
          <path key={`tn-${i}`} d={d} />
        ))}
      </g>

      {/* Lumbosacral / sciatic leg nerves */}
      <g
        fill="none"
        stroke="#6f4e9c"
        strokeWidth="1.25"
        strokeLinecap="round"
        onClick={() => onOrganClick?.({ systemId: 'nervous', organId: 'sciatic_nerves', nameEs: 'Nervio Ciático y Piernas' })}
      >
        {data.legNerves.map((d, i) => (
          <path key={`ln-${i}`} d={d} strokeWidth={i % 4 >= 2 ? '0.95' : '1.3'} />
        ))}
      </g>
    </g>
  );
}

/**
 * Renders the 2D Circulatory System layer (Heart, Red Arteries, Blue Veins).
 */
function CirculatoryLayer2D({ animate, onOrganClick }) {
  const data = useMemo(() => getCirculatorySystem2DData(), []);
  return (
    <g style={{ cursor: onOrganClick ? 'pointer' : 'default' }}>
      {/* Blue venous return network */}
      <g
        fill="none"
        stroke="#225ca8"
        strokeLinecap="round"
        strokeLinejoin="round"
        onClick={() => onOrganClick?.({ systemId: 'circulatory', organId: 'vena_cava', nameEs: 'Sistema Venoso (Vena Cava)' })}
      >
        {data.veinsMajor.map((d, i) => (
          <path key={`vmaj-${i}`} d={d} strokeWidth={i < 2 ? '2.5' : '1.45'} />
        ))}
        {data.veinsMinor.map((d, i) => (
          <path key={`vmin-${i}`} d={d} strokeWidth="0.9" opacity="0.9" />
        ))}
      </g>

      {/* Red arterial network */}
      <g
        fill="none"
        stroke="#c9242b"
        strokeLinecap="round"
        strokeLinejoin="round"
        onClick={() => onOrganClick?.({ systemId: 'circulatory', organId: 'aorta', nameEs: 'Sistema Arterial (Aorta)' })}
      >
        {data.arteriesMajor.map((d, i) => (
          <path key={`amaj-${i}`} d={d} strokeWidth={i === 0 ? '2.6' : '1.45'} />
        ))}
        {data.arteriesMinor.map((d, i) => (
          <path key={`amin-${i}`} d={d} strokeWidth="0.95" opacity="0.92" />
        ))}
      </g>

      {/* Heart with subtle beat animation */}
      <g
        className={animate ? 'anatomy-heartbeat' : undefined}
        style={{ transformOrigin: '122px 146px' }}
        onClick={() => onOrganClick?.({ systemId: 'circulatory', organId: 'heart', nameEs: 'Corazón' })}
      >
        <path d={data.heartRightBlue} fill="#1f5ca8" stroke="#174178" strokeWidth="0.6" />
        <path d={data.heartLeftRed} fill="#d62828" stroke="#8f181c" strokeWidth="0.6" />
        {/* Coronary vessel accent */}
        <path d="M 122 140 Q 126 146 123 153" fill="none" stroke="#ff8a8a" strokeWidth="0.6" opacity="0.8" />
      </g>
    </g>
  );
}

/**
 * Renders the 2D Digestive System layer (Esophagus, Stomach, Large & Small Intestine).
 */
function DigestiveLayer2D({ onOrganClick }) {
  const data = useMemo(() => getDigestiveSystem2DData(), []);
  return (
    <g style={{ cursor: onOrganClick ? 'pointer' : 'default' }}>
      {/* Subtle anatomical liver shadow */}
      <path
        d={data.liverOutline}
        fill="#449954"
        opacity="0.32"
        stroke="#367a42"
        strokeWidth="0.5"
      />

      {/* Esophagus */}
      <path
        d={data.esophagus}
        fill="none"
        stroke="#57b869"
        strokeWidth="3.8"
        strokeLinecap="round"
        onClick={() => onOrganClick?.({ systemId: 'digestive', organId: 'esophagus', nameEs: 'Faringe y Esófago' })}
      />

      {/* Large intestine outer frame */}
      <path
        d={data.largeIntestine}
        fill="none"
        stroke="#4ba65c"
        strokeWidth="6.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        onClick={() => onOrganClick?.({ systemId: 'digestive', organId: 'large_intestine', nameEs: 'Intestino Grueso (Colon)' })}
      />
      <path
        d={data.largeIntestine}
        fill="none"
        stroke="#6bd07d"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="3.5 2.5"
        opacity="0.55"
        pointerEvents="none"
      />

      {/* Coiled small intestine */}
      <g onClick={() => onOrganClick?.({ systemId: 'digestive', organId: 'small_intestine', nameEs: 'Intestino Delgado' })}>
        {data.smallIntestineLoops.map((d, i) => (
          <React.Fragment key={i}>
            <path d={d} fill="none" stroke="#3c8a4b" strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke="#68cc7a" strokeWidth="3.9" strokeLinecap="round" strokeLinejoin="round" />
          </React.Fragment>
        ))}
      </g>

      {/* J-shaped Stomach */}
      <path
        d={data.stomach}
        fill="#5ec270"
        stroke="#398547"
        strokeWidth="0.9"
        onClick={() => onOrganClick?.({ systemId: 'digestive', organId: 'stomach', nameEs: 'Estómago' })}
      />
    </g>
  );
}

/**
 * Renders the 2D Respiratory System layer (Larynx, Trachea, Bronchi, Lungs).
 */
function RespiratoryLayer2D({ animate, onOrganClick }) {
  const data = useMemo(() => getRespiratorySystem2DData(), []);
  return (
    <g style={{ cursor: onOrganClick ? 'pointer' : 'default' }}>
      {/* Lungs with breathing expansion */}
      <g
        className={animate ? 'anatomy-breathe' : undefined}
        style={{ transformOrigin: '120px 148px' }}
      >
        <path
          d={data.rightLung}
          fill="#56a8dc"
          stroke="#367ca8"
          strokeWidth="0.8"
          opacity="0.94"
          onClick={() => onOrganClick?.({ systemId: 'respiratory', organId: 'right_lung', nameEs: 'Pulmón Derecho (3 lóbulos)' })}
        />
        <path
          d={data.leftLung}
          fill="#56a8dc"
          stroke="#367ca8"
          strokeWidth="0.8"
          opacity="0.94"
          onClick={() => onOrganClick?.({ systemId: 'respiratory', organId: 'left_lung', nameEs: 'Pulmón Izquierdo (2 lóbulos)' })}
        />
        {data.lungFissures.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#2c678c" strokeWidth="0.65" opacity="0.55" pointerEvents="none" />
        ))}
      </g>

      {/* Bronchi tree */}
      <g
        fill="none"
        stroke="#3b8cc2"
        strokeWidth="2.1"
        strokeLinecap="round"
        onClick={() => onOrganClick?.({ systemId: 'respiratory', organId: 'bronchi', nameEs: 'Árbol Bronquial' })}
      >
        {data.bronchi.map((d, i) => (
          <path key={i} d={d} strokeWidth={i < 2 ? '2.5' : '1.3'} />
        ))}
      </g>

      {/* Larynx & ringed trachea */}
      <g onClick={() => onOrganClick?.({ systemId: 'respiratory', organId: 'larynx_trachea', nameEs: 'Laringe y Tráquea' })}>
        <path d={data.larynx} fill="#62b5ea" stroke="#367ca8" strokeWidth="0.6" />
        <path d={data.trachea} fill="none" stroke="#56a8dc" strokeWidth="4.2" strokeLinecap="round" />
        {data.tracheaRings.map((y) => (
          <line key={y} x1="117.8" y1={y} x2="122.2" y2={y} stroke="#bfe5ff" strokeWidth="0.9" strokeLinecap="round" />
        ))}
      </g>
    </g>
  );
}

/**
 * Renders the 2D Skeletal System layer (Skull, Spine, Ribcage, Pelvis, Limbs).
 */
function SkeletalLayer2D({ onOrganClick }) {
  const data = useMemo(() => getSkeletalSystem2DData(), []);
  return (
    <g style={{ cursor: onOrganClick ? 'pointer' : 'default' }}>
      {/* Spine */}
      <g onClick={() => onOrganClick?.({ systemId: 'skeletal', organId: 'spine', nameEs: 'Columna Vertebral' })}>
        {data.spineVertebrae.map((v, i) => (
          <rect
            key={i}
            x={v.x}
            y={v.y}
            width={v.w}
            height={v.h}
            rx="1.5"
            fill="#f4f6f8"
            stroke="#c5ccd4"
            strokeWidth="0.5"
          />
        ))}
      </g>

      {/* Clavicles, sternum, ribs */}
      <g onClick={() => onOrganClick?.({ systemId: 'skeletal', organId: 'ribcage', nameEs: 'Caja Torácica y Esternón' })}>
        {data.ribs.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#f8f9fa"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        ))}
        {data.clavicles.map((d, i) => (
          <path key={`cl-${i}`} d={d} fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
        ))}
        <path d={data.sternum} fill="#ffffff" stroke="#ced4da" strokeWidth="0.6" />
      </g>

      {/* Pelvis */}
      <g onClick={() => onOrganClick?.({ systemId: 'skeletal', organId: 'pelvis', nameEs: 'Cintura Pélvica' })}>
        <path d={data.pelvis} fill="#f8f9fa" stroke="#ced4da" strokeWidth="0.7" />
        {data.pelvisHoles.map((d, i) => (
          <path key={`ph-${i}`} d={d} fill="#d6b595" opacity="0.65" />
        ))}
      </g>

      {/* Upper & lower limb bones */}
      <g
        fill="none"
        stroke="#f8f9fa"
        strokeLinecap="round"
        onClick={() => onOrganClick?.({ systemId: 'skeletal', organId: 'upper_limbs', nameEs: 'Huesos de Extremidades' })}
      >
        {data.upperLimbBones.map((d, i) => (
          <path key={`ul-${i}`} d={d} strokeWidth={i < 2 ? '4.4' : i < 6 ? '2.4' : '1.45'} />
        ))}
      </g>
      <g
        fill="none"
        stroke="#f8f9fa"
        strokeLinecap="round"
        onClick={() => onOrganClick?.({ systemId: 'skeletal', organId: 'lower_limbs', nameEs: 'Fémur, Tibia y Peroné' })}
      >
        {data.lowerLimbBones.map((d, i) => (
          <path key={`ll-${i}`} d={d} strokeWidth={i < 2 ? '5.4' : i < 6 ? (i % 2 === 0 ? '4.0' : '2.1') : '1.8'} />
        ))}
      </g>

      {/* Articulation / joint heads */}
      {data.joints.map((j, i) => (
        <circle key={`jt-${i}`} cx={j.cx} cy={j.cy} r={j.r} fill="#ffffff" stroke="#d5dce3" strokeWidth="0.5" />
      ))}

      {/* Skull */}
      <g onClick={() => onOrganClick?.({ systemId: 'skeletal', organId: 'skull', nameEs: 'Cráneo y Mandíbula' })}>
        <path d={data.skullCranium} fill="#ffffff" stroke="#ced4da" strokeWidth="0.7" />
        {data.eyeOrbits.map((eye, i) => (
          <ellipse key={i} cx={eye.cx} cy={eye.cy} rx={eye.rx} ry={eye.ry} fill="#3a3a3c" opacity="0.75" />
        ))}
        <path d={data.nasalCavity} fill="#3a3a3c" opacity="0.75" />
        <path d={data.jawTeethLine} fill="none" stroke="#8a94a0" strokeWidth="0.9" strokeLinecap="round" />
      </g>
    </g>
  );
}

/**
 * Renders the 2D Urinary System layer (Kidneys, Ureters, Bladder, Urethra).
 */
function UrinaryLayer2D({ onOrganClick }) {
  const data = useMemo(() => getUrinarySystem2DData(), []);
  return (
    <g style={{ cursor: onOrganClick ? 'pointer' : 'default' }}>
      {/* Ureters */}
      <g
        fill="none"
        stroke="#d97f21"
        strokeWidth="2.1"
        strokeLinecap="round"
        onClick={() => onOrganClick?.({ systemId: 'urinary', organId: 'ureters', nameEs: 'Uréteres' })}
      >
        {data.ureters.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Kidneys */}
      <g onClick={() => onOrganClick?.({ systemId: 'urinary', organId: 'kidneys', nameEs: 'Riñones' })}>
        <path d={data.rightKidney} fill="#e08b2c" stroke="#9e5b11" strokeWidth="0.7" />
        <path d={data.leftKidney} fill="#e59335" stroke="#9e5b11" strokeWidth="0.7" />
      </g>

      {/* Bladder & Urethra */}
      <g onClick={() => onOrganClick?.({ systemId: 'urinary', organId: 'bladder', nameEs: 'Vejiga Urinaria y Uretra' })}>
        <path d={data.bladder} fill="#e89435" stroke="#9e5b11" strokeWidth="0.7" />
        <path d={data.urethra} fill="none" stroke="#d97f21" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </g>
  );
}

/**
 * Renders one complete 2D Human Body SVG with optional cast shadow, skin shading, and selected anatomical layers.
 */
export function SingleBodySVG({
  idPrefix,
  viewBox,
  ariaLabel,
  systems = [],
  skinOpacity = 1,
  showShadow = true,
  showContours = true,
  animate = true,
  onOrganClick,
  svgRef
}) {
  // Ordered back-to-front so layered overlap looks anatomically coherent
  const renderOrder = ['skeletal', 'urinary', 'nervous', 'digestive', 'circulatory', 'respiratory'];
  const activeSet = new Set(systems);

  const shadowOffsets = useMemo(
    () => [2, 4, 7, 10, 14, 18, 22],
    []
  );

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox || SVG_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      className="human-body-2d-svg"
      role="img"
      aria-label={ariaLabel || "2D anatomical model of the human body"}
    >
      <defs>
        <linearGradient id={`${idPrefix}-skinGrad`} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={BODY_PALETTE.skinHighlight} />
          <stop offset="50%" stopColor={BODY_PALETTE.skinBase} />
          <stop offset="100%" stopColor={BODY_PALETTE.skinShadow} />
        </linearGradient>
        <radialGradient id={`${idPrefix}-torsoShade`} cx="45%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#755234" stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {/* 45-degree down-left directional drop shadow matching reference image */}
      {showShadow && (
        <g opacity={Math.max(0.25, skinOpacity)}>
          {shadowOffsets.map((offset, idx) => (
            <path
              key={offset}
              d={HUMAN_SILHOUETTE_PATH}
              transform={`translate(${-offset}, ${offset * 0.92})`}
              fill="#151517"
              opacity={0.14 - idx * 0.015}
            />
          ))}
        </g>
      )}

      {/* Human skin silhouette */}
      <g opacity={skinOpacity}>
        <path
          d={HUMAN_SILHOUETTE_PATH}
          fill={`url(#${idPrefix}-skinGrad)`}
          stroke={BODY_PALETTE.skinEdge}
          strokeWidth="0.9"
        />
        <path d={HUMAN_SILHOUETTE_PATH} fill={`url(#${idPrefix}-torsoShade)`} pointerEvents="none" />

        {/* Subtle realistic surface muscle/bone landmarks */}
        {showContours && (
          <g fill="none" stroke="#b9906c" strokeWidth="0.7" strokeLinecap="round" opacity="0.45" pointerEvents="none">
            {HUMAN_ANATOMY_CONTOURS.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        )}
      </g>

      {/* Internal anatomical systems */}
      <g>
        {renderOrder.map((sysId) => {
          if (!activeSet.has(sysId)) return null;
          if (sysId === 'skeletal') return <SkeletalLayer2D key={sysId} onOrganClick={onOrganClick} />;
          if (sysId === 'urinary') return <UrinaryLayer2D key={sysId} onOrganClick={onOrganClick} />;
          if (sysId === 'nervous') return <NervousLayer2D key={sysId} animate={animate} onOrganClick={onOrganClick} />;
          if (sysId === 'digestive') return <DigestiveLayer2D key={sysId} onOrganClick={onOrganClick} />;
          if (sysId === 'circulatory') return <CirculatoryLayer2D key={sysId} animate={animate} onOrganClick={onOrganClick} />;
          if (sysId === 'respiratory') return <RespiratoryLayer2D key={sysId} animate={animate} onOrganClick={onOrganClick} />;
          return null;
        })}
      </g>
    </svg>
  );
}

/**
 * HumanBody2D Component
 * Supports both 'grid' (3x2 layout matching reference image) and 'layered' (single interactive zoomable body).
 */
export const HumanBody2D = forwardRef(function HumanBody2D(
  {
    layoutMode = 'grid',
    activeSystems = ['nervous', 'circulatory', 'digestive', 'respiratory', 'skeletal', 'urinary'],
    selectedSystem = null,
    onSelectSystem,
    onSelectOrgan,
    skinOpacity = 0.92,
    animate = true,
    showLabels = true
  },
  forwardedRef
) {
  const [zoom, setZoom] = useState(1);

  if (layoutMode === 'grid') {
    return (
      <div className="anatomy-2d-grid-wrapper">
        <div className="anatomy-2d-grid" ref={forwardedRef}>
          {ANATOMICAL_SYSTEMS.map((sys) => {
            const isSelected = selectedSystem === sys.id;
            const isEnabled = activeSystems.includes(sys.id);
            return (
              <button
                key={sys.id}
                type="button"
                className={`anatomy-2d-card ${isSelected ? 'is-selected' : ''} ${!isEnabled ? 'is-dimmed' : ''}`}
                onClick={() => onSelectSystem?.(sys.id)}
                title={`${sys.nameEs} — Haz clic para inspeccionar`}
              >
                <div className="anatomy-2d-card-figure">
                  <SingleBodySVG
                    idPrefix={`grid-${sys.id}`}
                    systems={[sys.id]}
                    skinOpacity={1}
                    showShadow={true}
                    showContours={true}
                    animate={animate}
                    onOrganClick={onSelectOrgan}
                  />
                </div>
                {showLabels && (
                  <div className="anatomy-2d-card-label">
                    <span
                      className="anatomy-dot"
                      style={{ backgroundColor: sys.primaryColor }}
                    />
                    <span>{sys.shortName}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const activeNames = activeSystems
    .map((id) => SYSTEMS_BY_ID[id]?.shortName)
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="anatomy-2d-layered">
      <div className="anatomy-2d-zoom-controls">
        <button type="button" onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}>
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.15).toFixed(2)))}>
          +
        </button>
        {zoom !== 1 && (
          <button type="button" onClick={() => setZoom(1)}>
            Reset
          </button>
        )}
      </div>

      <div
        className="anatomy-2d-stage"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        <SingleBodySVG
          svgRef={forwardedRef}
          idPrefix="layered-2d"
          systems={activeSystems}
          skinOpacity={skinOpacity}
          showShadow={true}
          showContours={true}
          animate={animate}
          onOrganClick={onSelectOrgan}
        />
      </div>

      {showLabels && (
        <div className="anatomy-2d-footer-caption">
          {activeNames || 'Silueta anatómica base (sin sistemas internos activos)'}
        </div>
      )}
    </div>
  );
});

export default HumanBody2D;
