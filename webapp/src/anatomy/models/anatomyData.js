/**
 * Anatomical metadata, palette, and physiological definitions for the 6 human body systems
 * matching the 3x2 reference layout (Nervous, Circulatory, Digestive, Respiratory, Skeletal, Urinary).
 */

export const BODY_PALETTE = {
  backdrop: '#3a3a3c',
  backdropDark: '#262628',
  backdropCard: '#323234',
  skinBase: '#ebcfb2',
  skinShadow: '#d4b292',
  skinHighlight: '#f5dfc7',
  skinEdge: '#c5a07d',
  castShadow: 'rgba(18, 18, 20, 0.58)'
};

export const ANATOMICAL_SYSTEMS = [
  {
    id: 'nervous',
    order: 0,
    nameEs: 'Sistema Nervioso',
    nameEn: 'Nervous System',
    shortName: 'Nervioso',
    primaryColor: '#7c4dff',
    secondaryColor: '#b388ff',
    referenceColor: '#6f4e9c',
    glowColor: 'rgba(124, 77, 255, 0.45)',
    summaryEs:
      'Red de control electroquímico compuesta por el encéfalo, la médula espinal y los nervios periféricos que coordinan funciones motoras, sensoriales y autónomas.',
    metrics: [
      { label: 'Neuronas', value: '~86 mil millones' },
      { label: 'Velocidad impulso', value: 'hasta 120 m/s' },
      { label: 'Longitud nervios', value: '~72 km' }
    ],
    organs: [
      { id: 'brain', nameEs: 'Encéfalo (Cerebro)', descriptionEs: 'Corteza cerebral con circunvoluciones en hemisferios izquierdo y derecho.' },
      { id: 'cerebellum', nameEs: 'Cerebelo y Tronco Encefálico', descriptionEs: 'Coordina el equilibrio, la postura y las funciones vitales autónomas.' },
      { id: 'spinal_cord', nameEs: 'Médula Espinal', descriptionEs: 'Conducto neural principal protegido dentro del canal vertebral.' },
      { id: 'brachial_plexus', nameEs: 'Plexo Braquial y Nervios del Brazo', descriptionEs: 'Nervios mediano, radial y cubital hacia extremidades superiores.' },
      { id: 'intercostal_nerves', nameEs: 'Nervios Torácicos e Intercostales', descriptionEs: 'Ramificaciones segmentarias a lo largo del tronco.' },
      { id: 'sciatic_nerves', nameEs: 'Plexo Lumbosacro y Nervio Ciático', descriptionEs: 'Nervios femoral, ciático y tibiales hacia extremidades inferiores.' }
    ]
  },
  {
    id: 'circulatory',
    order: 1,
    nameEs: 'Sistema Circulatorio',
    nameEn: 'Circulatory System',
    shortName: 'Circulatorio',
    primaryColor: '#d62828',
    secondaryColor: '#2563eb',
    referenceColor: '#d62828',
    glowColor: 'rgba(214, 40, 40, 0.45)',
    summaryEs:
      'Circuito cerrado de alta precisión formado por el corazón bicameral izquierdo/derecho, arterias oxigenadas (rojo) y venas de retorno (azul).',
    metrics: [
      { label: 'Frecuencia', value: '60–80 lpm' },
      { label: 'Gasto cardíaco', value: '~5.2 L/min' },
      { label: 'Red vascular', value: '~96,000 km' }
    ],
    organs: [
      { id: 'heart', nameEs: 'Corazón', descriptionEs: 'Bomba muscular de cuatro cámaras situada en el mediastino, levemente hacia la izquierda.' },
      { id: 'aorta', nameEs: 'Arco Aórtico y Aorta Descendente', descriptionEs: 'Arteria principal que distribuye sangre oxigenada a todo el organismo.' },
      { id: 'vena_cava', nameEs: 'Vena Cava Superior e Inferior', descriptionEs: 'Retorno venoso de sangre desoxigenada hacia la aurícula derecha.' },
      { id: 'carotid_jugular', nameEs: 'Arterias Carótidas y Venas Yugulares', descriptionEs: 'Irrigación y drenaje craneofacial y cerebral.' },
      { id: 'limb_vessels', nameEs: 'Vasos Subclavios, Braquiales y Femorales', descriptionEs: 'Ramas arteriales y venosas profundas de brazos y piernas.' }
    ]
  },
  {
    id: 'digestive',
    order: 2,
    nameEs: 'Sistema Digestivo',
    nameEn: 'Digestive System',
    shortName: 'Digestivo',
    primaryColor: '#57b869',
    secondaryColor: '#81c784',
    referenceColor: '#57b869',
    glowColor: 'rgba(87, 184, 105, 0.45)',
    summaryEs:
      'Tracto gastrointestinal continuo encargado de la ingestión, digestión mecánica y enzimática, absorción de nutrientes y eliminación.',
    metrics: [
      { label: 'Longitud total', value: '~7.5–9 m' },
      { label: 'Superficie absortiva', value: '~32 m²' },
      { label: 'Tránsito completo', value: '24–48 h' }
    ],
    organs: [
      { id: 'esophagus', nameEs: 'Faringe y Esófago', descriptionEs: 'Conducto muscular que transporta el bolo alimenticio hacia el estómago.' },
      { id: 'stomach', nameEs: 'Estómago', descriptionEs: 'Órgano en forma de J bajo el diafragma izquierdo donde ocurre la digestión ácida.' },
      { id: 'small_intestine', nameEs: 'Intestino Delgado', descriptionEs: 'Asas enrolladas de duodeno, yeyuno e íleon encargadas de la absorción.' },
      { id: 'large_intestine', nameEs: 'Intestino Grueso (Colon)', descriptionEs: 'Marco cólico ascendente, transverso, descendente, sigmoide y recto.' }
    ]
  },
  {
    id: 'respiratory',
    order: 3,
    nameEs: 'Sistema Respiratorio',
    nameEn: 'Respiratory System',
    shortName: 'Respiratorio',
    primaryColor: '#56a8dc',
    secondaryColor: '#81d4fa',
    referenceColor: '#56a8dc',
    glowColor: 'rgba(86, 168, 220, 0.45)',
    summaryEs:
      'Sistema de intercambio gaseoso formado por laringe, tráquea cartilaginosa, árbol bronquial y pulmones lobulados asimétricos.',
    metrics: [
      { label: 'Frecuencia resp.', value: '12–18 rpm' },
      { label: 'Capacidad total', value: '~5.8 L' },
      { label: 'Alvéolos', value: '~480 millones' }
    ],
    organs: [
      { id: 'larynx_trachea', nameEs: 'Laringe y Tráquea', descriptionEs: 'Vía aérea superior reforzada con anillos cartilaginosos en forma de C.' },
      { id: 'bronchi', nameEs: 'Bronquios Principales y Bronquiolos', descriptionEs: 'Bifurcación en la carina hacia ambos pulmones.' },
      { id: 'right_lung', nameEs: 'Pulmón Derecho (3 lóbulos)', descriptionEs: 'Ligeramente más ancho y corto debido a la posición hepática.' },
      { id: 'left_lung', nameEs: 'Pulmón Izquierdo (2 lóbulos)', descriptionEs: 'Presenta escotadura cardíaca para alojar el ápex del corazón.' }
    ]
  },
  {
    id: 'skeletal',
    order: 4,
    nameEs: 'Sistema Óseo',
    nameEn: 'Skeletal System',
    shortName: 'Óseo',
    primaryColor: '#f8f9fa',
    secondaryColor: '#d9dde3',
    referenceColor: '#f8f9fa',
    glowColor: 'rgba(248, 249, 250, 0.4)',
    summaryEs:
      'Armazón estructural articulado de 206 huesos que protege órganos vitales, permite la locomoción y alberga la médula ósea.',
    metrics: [
      { label: 'Huesos adultos', value: '206 huesos' },
      { label: 'Pares de costillas', value: '12 pares' },
      { label: 'Vértebras', value: '33 piezas' }
    ],
    organs: [
      { id: 'skull', nameEs: 'Cráneo y Mandíbula', descriptionEs: 'Bóveda craneal, órbitas oculares, abertura nasal y maxilar inferior.' },
      { id: 'ribcage', nameEs: 'Caja Torácica y Esternón', descriptionEs: 'Clavículas, esternón y arcos costales protectores del tórax.' },
      { id: 'spine', nameEs: 'Columna Vertebral', descriptionEs: 'Eje axial segmentado desde las vértebras cervicales hasta el sacro.' },
      { id: 'pelvis', nameEs: 'Cintura Pélvica', descriptionEs: 'Ilion, isquion, pubis y sacro que transmiten cargas hacia los fémures.' },
      { id: 'upper_limbs', nameEs: 'Esqueleto Apendicular Superior', descriptionEs: 'Húmero, radio, cúbito y huesos de la mano.' },
      { id: 'lower_limbs', nameEs: 'Esqueleto Apendicular Inferior', descriptionEs: 'Fémur, rótula, tibia, peroné y huesos del pie.' }
    ]
  },
  {
    id: 'urinary',
    order: 5,
    nameEs: 'Sistema Urinario',
    nameEn: 'Urinary System',
    shortName: 'Urinario',
    primaryColor: '#e08b2c',
    secondaryColor: '#f6ad55',
    referenceColor: '#e08b2c',
    glowColor: 'rgba(224, 139, 44, 0.45)',
    summaryEs:
      'Sistema de filtración renal y regulación hidroelectrolítica compuesto por ambos riñones retroperitoneales, uréteres, vejiga y uretra.',
    metrics: [
      { label: 'Filtrado diario', value: '~180 L/día' },
      { label: 'Nefronas', value: '~2 millones' },
      { label: 'Capacidad vesical', value: '350–500 mL' }
    ],
    organs: [
      { id: 'kidneys', nameEs: 'Riñones (Izquierdo y Derecho)', descriptionEs: 'Órganos en forma de frijol; el derecho se sitúa levemente más bajo por el hígado.' },
      { id: 'ureters', nameEs: 'Uréteres', descriptionEs: 'Conductos musculares retroperitoneales que descienden hacia la pelvis.' },
      { id: 'bladder', nameEs: 'Vejiga Urinaria y Uretra', descriptionEs: 'Reservorio pélvico muscular y conducto de salida inferior.' }
    ]
  }
];

export const SYSTEMS_BY_ID = Object.fromEntries(
  ANATOMICAL_SYSTEMS.map((sys) => [sys.id, sys])
);

export const DEFAULT_SYSTEM_IDS = ANATOMICAL_SYSTEMS.map((s) => s.id);
