/**
 * Realistic 2D Anatomical SVG Paths & Generators
 * Canonical coordinate system: viewBox="0 0 240 500"
 * Center X = 120 | Crown Y = 24 | Chin Y = 84 | Shoulders Y = 108 | Pelvis Y = 242 | Crotch Y = 266 | Feet Y = 476
 */

export const SVG_VIEWBOX = '0 0 240 500';

/**
 * Full anterior unisex anatomical human body silhouette with balanced shoulder-waist-hip
 * proportions, neck, arms, 5-fingered hands, legs, and feet.
 */
export const HUMAN_SILHOUETTE_PATH = `
  M 120 24
  C 130 24, 138 32, 138 45
  C 140 46, 142 50, 141 56
  C 140 61, 138 63, 136 63
  C 135 70, 132 77, 127 82
  L 130 94
  C 133 99, 143 103, 153 107
  C 163 110, 170 118, 172 130
  C 174 144, 176 159, 179 174
  C 182 186, 185 195, 187 205
  C 190 220, 193 236, 193 251
  C 196 256, 199 264, 200 271
  C 200 274, 197 275, 196 271
  C 195 268, 194 266, 193 267
  C 194 274, 195 282, 194 286
  C 193 288, 191 287, 190 283
  C 190 287, 188 289, 187 286
  C 186 283, 186 279, 185 276
  C 184 281, 183 285, 182 283
  C 181 281, 181 275, 181 269
  C 180 273, 178 275, 177 273
  C 176 270, 177 261, 180 253
  C 178 239, 174 224, 170 210
  C 166 197, 164 186, 161 174
  C 159 163, 156 153, 154 146
  C 152 162, 150 182, 148 200
  C 148 212, 154 226, 158 242
  C 160 256, 160 272, 158 290
  C 156 312, 152 336, 149 356
  C 152 372, 155 392, 153 410
  C 151 426, 147 440, 146 452
  C 148 460, 155 468, 160 473
  C 162 475, 159 478, 152 478
  C 145 478, 137 476, 133 474
  C 131 469, 132 460, 134 452
  C 134 438, 131 420, 130 403
  C 129 388, 131 372, 132 356
  C 129 332, 125 294, 122 266
  C 121 264, 119 264, 118 266
  C 115 294, 111 332, 108 356
  C 109 372, 111 388, 110 403
  C 109 420, 106 438, 106 452
  C 108 460, 109 469, 107 474
  C 103 476, 95 478, 88 478
  C 81 478, 78 475, 80 473
  C 85 468, 92 460, 94 452
  C 93 440, 89 426, 87 410
  C 85 392, 88 372, 91 356
  C 88 336, 84 312, 82 290
  C 80 272, 80 256, 82 242
  C 86 226, 92 212, 92 200
  C 90 182, 88 162, 86 146
  C 84 153, 81 163, 79 174
  C 76 186, 74 197, 70 210
  C 66 224, 62 239, 60 253
  C 63 261, 64 270, 63 273
  C 62 275, 60 273, 59 269
  C 59 275, 59 281, 58 283
  C 57 285, 56 281, 55 276
  C 54 279, 54 283, 53 286
  C 52 289, 50 287, 50 283
  C 49 287, 47 288, 46 286
  C 45 282, 46 274, 47 267
  C 46 266, 45 268, 44 271
  C 43 275, 40 274, 40 271
  C 41 264, 44 256, 47 251
  C 47 236, 50 220, 53 205
  C 55 195, 58 186, 61 174
  C 64 159, 66 144, 68 130
  C 70 118, 77 110, 87 107
  C 97 103, 107 99, 110 94
  L 113 82
  C 108 77, 105 70, 104 63
  C 102 63, 100 61, 99 56
  C 98 50, 100 46, 102 45
  C 102 32, 110 24, 120 24
  Z
`;

/**
 * Subtle unisex anatomical surface landmarks (clavicles, jaw, midline, knees)
 * rendered at low opacity without gender-specific musculature.
 */
export const HUMAN_ANATOMY_CONTOURS = [
  // Jaw & chin line
  'M 110 74 Q 120 82 130 74',
  // Subtle collarbones
  'M 96 112 Q 108 115 117 110',
  'M 144 112 Q 132 115 123 110',
  // Subtle sagittal midline
  'M 120 120 L 120 212',
  // Kneecap contours
  'M 94 352 Q 100 348 105 352 Q 100 361 94 352',
  'M 135 352 Q 140 348 146 352 Q 140 361 135 352'
];

/**
 * Returns SVG data structures for the Nervous System (Brain, Spinal Cord, Peripheral Nerves).
 */
export function getNervousSystem2DData() {
  return {
    brainLeft:
      'M 119 30 C 110 30, 104 37, 104 45 C 104 51, 109 55, 115 55 C 118 55, 119 52, 119 48 Z',
    brainRight:
      'M 121 30 C 130 30, 136 37, 136 45 C 136 51, 131 55, 125 55 C 122 55, 121 52, 121 48 Z',
    brainSulci: [
      'M 108 38 Q 113 35 117 39',
      'M 106 45 Q 112 43 116 47',
      'M 109 51 Q 114 49 117 52',
      'M 132 38 Q 127 35 123 39',
      'M 134 45 Q 128 43 124 47',
      'M 131 51 Q 126 49 123 52'
    ],
    cerebellum: 'M 111 54 Q 120 58 129 54 Q 126 61 120 60 Q 114 61 111 54 Z',
    spinalCord: 'M 120 58 L 120 228',
    cranialNerves: [
      'M 119 59 Q 111 63 107 69',
      'M 121 59 Q 129 63 133 69'
    ],
    // Brachial plexus + upper limb median/ulnar/radial branches
    armNerves: [
      // Anatomical right arm (viewer left)
      'M 120 100 C 106 105, 86 112, 74 124 C 68 134, 65 162, 59 194 C 55 215, 51 240, 49 266',
      'M 120 105 C 104 111, 88 120, 77 132 C 72 146, 69 170, 64 196 C 60 218, 55 244, 54 274',
      'M 59 194 C 53 214, 48 238, 45 268',
      // Finger digital branches
      'M 49 266 L 42 272',
      'M 49 266 L 47 282',
      'M 54 274 L 51 283',
      'M 54 274 L 56 279',
      // Anatomical left arm (viewer right)
      'M 120 100 C 134 105, 154 112, 166 124 C 172 134, 175 162, 181 194 C 185 215, 189 240, 191 266',
      'M 120 105 C 136 111, 152 120, 163 132 C 168 146, 171 170, 176 196 C 180 218, 185 244, 186 274',
      'M 181 194 C 187 214, 192 238, 195 268',
      'M 191 266 L 198 272',
      'M 191 266 L 193 282',
      'M 186 274 L 189 283',
      'M 186 274 L 184 279'
    ],
    // Thoracic & lumbar intercostal spinal nerve roots
    torsoNerves: [
      ...[116, 126, 136, 146, 156, 166, 176, 186, 196, 206, 216].flatMap((y, idx) => {
        const span = 30 - Math.abs(idx - 4) * 1.6;
        const drop = 10 + idx * 0.6;
        return [
          `M 120 ${y} Q ${120 - span * 0.55} ${y + 2} ${120 - span} ${y + drop}`,
          `M 120 ${y} Q ${120 + span * 0.55} ${y + 2} ${120 + span} ${y + drop}`
        ];
      })
    ],
    // Lumbosacral plexus, femoral, sciatic, tibial & peroneal nerves
    legNerves: [
      // Left viewer leg
      'M 120 218 C 110 230, 99 246, 97 270 C 95 304, 96 336, 97 362 C 98 394, 98 426, 98 456 L 91 472',
      'M 120 226 C 114 240, 108 262, 105 292 C 102 324, 102 346, 102 368 C 103 398, 102 426, 101 456 L 98 473',
      'M 97 270 C 92 288, 90 314, 93 340',
      'M 97 362 C 92 385, 91 412, 93 442',
      // Right viewer leg
      'M 120 218 C 130 230, 141 246, 143 270 C 145 304, 144 336, 143 362 C 142 394, 142 426, 142 456 L 149 472',
      'M 120 226 C 126 240, 132 262, 135 292 C 138 324, 138 346, 138 368 C 137 398, 138 426, 139 456 L 142 473',
      'M 143 270 C 148 288, 150 314, 147 340',
      'M 143 362 C 148 385, 149 412, 147 442'
    ]
  };
}

/**
 * Returns SVG data structures for the Circulatory System (Heart, Arteries in Red, Veins in Blue).
 */
export function getCirculatorySystem2DData() {
  return {
    // Heart chambers: anatomical right (blue) & anatomical left (red) matching reference image
    heartRightBlue:
      'M 120 133 C 114 133, 111 139, 112 146 C 113 151, 117 154, 121 155 L 122 135 Z',
    heartLeftRed:
      'M 121 134 C 127 134, 133 141, 132 149 C 131 156, 126 160, 122 158 C 120 156, 119 144, 121 134 Z',
    // Major arterial paths (oxygenated red)
    arteriesMajor: [
      // Aortic arch & descending thoracic/abdominal aorta
      'M 122 136 C 122 125, 127 123, 126 132 L 123 148 L 122 228',
      // Right & left common carotid arteries into head
      'M 123 128 C 117 118, 115 98, 115 80 C 114 64, 112 50, 115 38',
      'M 125 128 C 127 116, 127 98, 126 80 C 126 64, 128 50, 125 38',
      // Subclavian -> axillary -> brachial -> radial/ulnar arteries
      'M 122 127 C 104 123, 84 124, 73 135 C 67 152, 62 178, 58 202 C 55 224, 51 246, 48 264',
      'M 126 127 C 140 123, 158 125, 169 135 C 175 152, 180 178, 184 202 C 187 224, 191 246, 194 264',
      // Iliac -> femoral -> popliteal -> tibial arteries
      'M 122 228 C 114 238, 105 256, 101 286 C 98 318, 97 346, 98 370 C 99 400, 97 430, 95 458 L 90 471',
      'M 122 228 C 130 238, 139 256, 143 286 C 146 318, 147 346, 146 370 C 145 400, 147 430, 149 458 L 154 471'
    ],
    arteriesMinor: [
      // Ulnar / palmar branches
      'M 58 202 C 59 224, 57 244, 55 268',
      'M 184 202 C 183 224, 185 244, 187 268',
      // Renal arteries
      'M 122 198 L 106 196',
      'M 122 198 L 138 193',
      // Deep femoral & fibular branches
      'M 101 286 C 94 304, 92 328, 94 348',
      'M 143 286 C 150 304, 152 328, 150 348',
      'M 98 370 C 93 394, 92 418, 94 446',
      'M 146 370 C 151 394, 152 418, 150 446'
    ],
    // Major venous paths (deoxygenated blue)
    veinsMajor: [
      // Superior & inferior vena cava
      'M 117 110 L 117 136',
      'M 117 154 L 117 228',
      // Jugular veins
      'M 117 112 C 112 96, 111 76, 111 56 C 110 46, 112 39, 114 35',
      'M 119 112 C 122 96, 123 76, 124 56 C 124 46, 123 39, 121 35',
      // Subclavian / cephalic / basilic veins
      'M 117 120 C 98 118, 81 121, 70 132 C 63 150, 58 176, 54 202 C 51 224, 48 246, 46 262',
      'M 119 120 C 136 118, 156 122, 166 132 C 173 150, 178 176, 182 202 C 185 224, 188 246, 190 262',
      // Iliac / femoral / great saphenous veins
      'M 117 228 C 110 240, 105 262, 103 292 C 102 322, 102 348, 102 374 C 102 404, 101 432, 100 458 L 96 472',
      'M 117 228 C 126 240, 135 262, 137 292 C 138 322, 138 348, 138 374 C 138 404, 139 432, 140 458 L 144 472'
    ],
    veinsMinor: [
      'M 54 202 C 57 222, 56 242, 53 265',
      'M 182 202 C 179 222, 180 242, 183 265',
      'M 103 292 C 98 314, 96 336, 98 354',
      'M 137 292 C 142 314, 144 336, 142 354'
    ]
  };
}

/**
 * Returns SVG data structures for the Digestive System (Esophagus, Stomach, Small & Large Intestines).
 */
export function getDigestiveSystem2DData() {
  return {
    // Pharynx & Esophagus
    esophagus: 'M 118 78 L 118 148 C 118 156, 121 162, 124 166',
    // J-shaped Stomach (anatomical left = viewer right)
    stomach:
      'M 122 162 C 128 158, 139 162, 142 172 C 144 182, 138 191, 128 192 C 119 193, 114 186, 117 177 C 119 171, 120 166, 122 162 Z',
    // Liver silhouette outline (subtle, translucent or secondary accent)
    liverOutline:
      'M 95 164 C 105 158, 121 160, 124 166 C 121 174, 108 182, 95 184 C 92 178, 92 168, 95 164 Z',
    // Haustrated Large Intestine frame (cecum -> ascending -> transverse -> descending -> sigmoid -> rectum)
    largeIntestine:
      'M 97 229 C 95 214, 95 198, 98 192 C 106 189, 134 189, 142 193 C 146 200, 145 216, 142 230 C 140 238, 128 238, 122 241 C 120 243, 120 250, 120 257',
    // Coiled Small Intestine loops inside the colon frame
    smallIntestineLoops: [
      'M 124 191 C 114 194, 104 197, 105 203 C 106 209, 134 202, 135 209 C 136 215, 104 211, 104 218 C 104 224, 135 218, 134 225 C 133 231, 107 227, 108 233 C 109 238, 125 235, 131 232'
    ]
  };
}

/**
 * Returns SVG data structures for the Respiratory System (Larynx, Trachea, Bronchi, Lungs).
 */
export function getRespiratorySystem2DData() {
  return {
    larynx: 'M 116 88 L 124 88 L 123 98 L 117 98 Z',
    trachea: 'M 120 96 L 120 132',
    tracheaRings: [101, 106, 111, 116, 121, 126, 130],
    bronchi: [
      'M 120 130 C 112 135, 103 141, 96 149',
      'M 120 130 C 128 135, 137 141, 144 149',
      'M 103 141 L 94 160',
      'M 103 141 L 106 164',
      'M 137 141 L 146 160',
      'M 137 141 L 134 164'
    ],
    // Right lung (viewer left, 3 lobes, slightly wider/shorter)
    rightLung:
      'M 113 125 C 104 123, 94 132, 90 146 C 87 158, 86 170, 89 176 C 95 178, 107 175, 113 171 C 115 162, 115 138, 113 125 Z',
    // Left lung (viewer right, 2 lobes with cardiac notch)
    leftLung:
      'M 127 125 C 136 123, 146 132, 150 146 C 153 158, 154 170, 151 176 C 144 178, 135 176, 130 171 C 126 165, 130 156, 126 146 C 125 138, 125 130, 127 125 Z',
    lungFissures: [
      'M 89 156 Q 102 153 114 150',
      'M 93 141 Q 104 145 113 149',
      'M 151 153 Q 139 149 127 143'
    ]
  };
}

/**
 * Returns SVG data structures for the Skeletal System (Skull, Spine, Ribcage, Pelvis, Limbs).
 */
export function getSkeletalSystem2DData() {
  return {
    skullCranium:
      'M 120 27 C 130 27, 136 35, 136 46 C 136 53, 133 59, 130 62 L 130 72 C 130 77, 125 81, 120 81 C 115 81, 110 77, 110 72 L 110 62 C 107 59, 104 53, 104 46 C 104 35, 110 27, 120 27 Z',
    eyeOrbits: [
      { cx: 113, cy: 49, rx: 3.8, ry: 3.4 },
      { cx: 127, cy: 49, rx: 3.8, ry: 3.4 }
    ],
    nasalCavity: 'M 120 52 L 117.5 60 L 122.5 60 Z',
    jawTeethLine: 'M 113 68 Q 120 71 127 68',
    spineVertebrae: [
      84, 90, 96, 102, 108, 115, 122, 129, 136, 143, 150, 157, 164, 171, 178, 186, 194, 202, 210, 218
    ].map((y, i) => ({
      x: 116.5 - (i > 12 ? 0.6 : 0),
      y,
      w: i > 12 ? 8.2 : 7,
      h: 4.5
    })),
    clavicles: [
      'M 117 110 C 106 106, 92 108, 79 113',
      'M 123 110 C 134 106, 148 108, 161 113'
    ],
    sternum:
      'M 116 112 L 124 112 L 123 152 L 120 158 L 117 152 Z',
    // 10 visible anterior rib pairs wrapping cleanly
    ribs: [
      { yStart: 116, yEnd: 120, width: 22 },
      { yStart: 123, yEnd: 128, width: 28 },
      { yStart: 130, yEnd: 136, width: 31 },
      { yStart: 137, yEnd: 144, width: 32 },
      { yStart: 144, yEnd: 152, width: 32 },
      { yStart: 151, yEnd: 160, width: 30 },
      { yStart: 158, yEnd: 168, width: 27 },
      { yStart: 166, yEnd: 175, width: 23 }
    ].flatMap((r) => [
      `M 117 ${r.yStart} C ${117 - r.width * 0.65} ${r.yStart - 2}, ${117 - r.width} ${r.yStart + 4}, ${117 - r.width + 6} ${r.yEnd}`,
      `M 123 ${r.yStart} C ${123 + r.width * 0.65} ${r.yStart - 2}, ${123 + r.width} ${r.yStart + 4}, ${123 + r.width - 6} ${r.yEnd}`
    ]),
    pelvis: `
      M 120 218
      C 113 218, 102 213, 94 218
      C 88 223, 89 236, 94 246
      C 97 254, 106 258, 114 256
      C 117 255, 118 250, 120 250
      C 122 250, 123 255, 126 256
      C 134 258, 143 254, 146 246
      C 151 236, 152 223, 146 218
      C 138 213, 127 218, 120 218 Z
    `,
    pelvisHoles: [
      'M 103 238 C 107 236, 112 239, 111 245 C 110 249, 104 249, 102 245 C 100 242, 101 239, 103 238 Z',
      'M 137 238 C 133 236, 128 239, 129 245 C 130 249, 136 249, 138 245 C 140 242, 139 239, 137 238 Z'
    ],
    // Upper limbs: Humerus, Radius, Ulna, Hand bones
    upperLimbBones: [
      // Humerus
      'M 75 117 L 62 190',
      'M 165 117 L 178 190',
      // Radius & Ulna (parallel forearm bones)
      'M 60 194 L 50 249',
      'M 64 195 L 56 250',
      'M 180 194 L 190 249',
      'M 176 195 L 184 250',
      // Hand metacarpals / phalanges
      'M 50 253 L 43 268',
      'M 52 254 L 47 281',
      'M 54 254 L 52 283',
      'M 56 254 L 56 278',
      'M 190 253 L 197 268',
      'M 188 254 L 193 281',
      'M 186 254 L 188 283',
      'M 184 254 L 184 278'
    ],
    // Lower limbs: Femur, Patella, Tibia, Fibula, Foot bones
    lowerLimbBones: [
      // Femoral neck & shaft
      'M 94 245 L 98 349',
      'M 146 245 L 142 349',
      // Tibia (medial thick shin) & Fibula (lateral thin bone)
      'M 100 359 L 101 452',
      'M 95 362 L 95 451',
      'M 140 359 L 139 452',
      'M 145 362 L 145 451',
      // Foot metatarsals
      'M 98 455 L 86 472',
      'M 100 456 L 94 474',
      'M 102 456 L 102 474',
      'M 142 455 L 154 472',
      'M 140 456 L 146 474',
      'M 138 456 L 138 474'
    ],
    joints: [
      { cx: 75, cy: 117, r: 4.2 },
      { cx: 165, cy: 117, r: 4.2 },
      { cx: 62, cy: 192, r: 3.5 },
      { cx: 178, cy: 192, r: 3.5 },
      { cx: 94, cy: 245, r: 4.5 },
      { cx: 146, cy: 245, r: 4.5 },
      { cx: 99, cy: 353, r: 4.2 },
      { cx: 141, cy: 353, r: 4.2 },
      { cx: 99, cy: 454, r: 3.2 },
      { cx: 141, cy: 454, r: 3.2 }
    ]
  };
}

/**
 * Returns SVG data structures for the Urinary System (Kidneys, Ureters, Bladder, Urethra).
 */
export function getUrinarySystem2DData() {
  return {
    // Right kidney (viewer left, slightly lower due to liver)
    rightKidney:
      'M 105 190 C 97 188, 92 195, 93 205 C 94 214, 100 218, 106 215 C 110 213, 109 208, 107 203 C 109 197, 110 191, 105 190 Z',
    // Left kidney (viewer right, slightly higher)
    leftKidney:
      'M 135 186 C 143 184, 148 191, 147 201 C 146 210, 140 214, 134 211 C 130 209, 131 204, 133 199 C 131 193, 130 187, 135 186 Z',
    // Renal vessels / hilum accent
    ureters: [
      'M 106 204 C 111 215, 112 228, 115 243',
      'M 134 200 C 129 212, 128 228, 125 243'
    ],
    bladder:
      'M 120 238 C 112 238, 109 245, 112 252 C 114 256, 118 259, 120 259 C 122 259, 126 256, 128 252 C 131 245, 128 238, 120 238 Z',
    urethra: 'M 120 258 L 120 268'
  };
}
