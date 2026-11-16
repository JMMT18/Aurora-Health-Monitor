# Aurora · demo

Photos and screenshots of Aurora running. All the screenshots below use the simulated data scenarios built into the app, so they can be reproduced without the hardware.

- [Demo video](#demo-video)
- [The prototype](#the-prototype)
- [Main screen](#main-screen)
- [Body zones, 2D](#body-zones-2d)
- [Body zones, 3D](#body-zones-3d)
- [Cardiac analysis and reaction test](#cardiac-analysis-and-reaction-test)
- [Demo scenarios](#demo-scenarios)

## Demo video

See the [`video/`](video) folder.

## The prototype

ESP32 with the AD8232 (ECG/sEMG), GSR V1.2, NTC thermistor, BMP180 and ADXL345, connected to the laptop by USB.

<img src="prototype.jpg" width="640" alt="Physical prototype: ESP32 with the biometric sensors on a breadboard">

## Main screen

The body on the left, the selected zone in the centre with its readings and normal ranges, the live ECG and the "What to do now" list at the bottom, and the overall status with an animated guide on the right.

<img src="screenshots/01_dashboard.jpg" alt="Aurora main screen with every reading normal">

## Body zones, 2D

Each zone lists what is measured there, with the sensor, a trend line and a plain-language normal range.

| Head | Chest |
|---|---|
| <img src="screenshots/02_head_2D.jpg" alt="Head zone: temperature, reaction time, mood, stress"> | <img src="screenshots/03_chest_2D.jpg" alt="Chest zone: heart rate, HRV, breathing, blood pressure"> |
| **Hand and wrist** | **Abdomen** |
| <img src="screenshots/04_hand_2D.jpg" alt="Hand zone: skin conductance and stress responses"> | <img src="screenshots/05_abdomen_2D.jpg" alt="Abdomen zone: glucose and blood sodium"> |
| **Legs** | **Full body** |
| <img src="screenshots/06_legs_2D.jpg" alt="Legs zone: steps, activity, active minutes, time sitting"> | <img src="screenshots/07_full_body_2D.jpg" alt="Full body: sleep, posture, falls and tremor"> |

## Body zones, 3D

The same zones on the BodyParts3D anatomical model (CC BY 4.0). These six were captured on an earlier build whose interface was still in Spanish; the 3D view is the same.

| Head | Chest | Hand and wrist |
|---|---|---|
| <img src="3d/01_head_3D.jpg" alt="3D head"> | <img src="3d/02_chest_3D.jpg" alt="3D chest"> | <img src="3d/03_hand_3D.jpg" alt="3D hand"> |
| **Abdomen** | **Legs** | **Full body** |
| <img src="3d/04_abdomen_3D.jpg" alt="3D abdomen"> | <img src="3d/05_legs_3D.jpg" alt="3D legs"> | <img src="3d/06_full_body_3D.jpg" alt="3D full body"> |

## Cardiac analysis and reaction test

| Cardiac analysis (HRV, Poincaré, Baevsky, spectrum, QTc, EDR) | Reaction-time test |
|---|---|
| <img src="screenshots/08_cardiac_analysis.jpg" alt="Cardiac analysis panel"> | <img src="screenshots/09_reaction_test.jpg" alt="Reaction-time test"> |

## Demo scenarios

| Acute stress | Cabin leak |
|---|---|
| <img src="screenshots/10_scenario_stress.jpg" alt="Acute stress scenario"> | <img src="screenshots/11_scenario_cabin_leak.jpg" alt="Cabin leak scenario"> |
| **Fall or impact** (15 s "Are you OK?" countdown) | **Fever** |
| <img src="screenshots/12_scenario_fall.jpg" alt="Fall scenario with countdown"> | <img src="screenshots/13_scenario_fever.jpg" alt="Fever scenario"> |
