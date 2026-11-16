# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite

## Users

Astronauts on long-duration space missions (lunar flyby/station era now, Mars-class missions in the stated future). They carry most of the responsibility for spotting health changes in themselves during a mission, with no doctor physically present and, on deep-space missions, a meaningful communication delay to flight surgeons on the ground. They are not medically trained — the tool cannot assume they know how to interpret a raw measurement.

## Product Purpose

A visual health-monitoring tool, built for the NASA Space Apps Challenge 2026 "Health Monitoring Software" challenge, that gathers health indicators and lets an astronaut evaluate and act on their own health status during a mission: see what is normal vs. concerning at a glance, understand why, and know what to do next.

## Positioning

Most hackathon entries for this challenge will be a manual-entry form backed by static thresholds. This team built real sensor hardware (ESP32 + ECG, GSR, accelerometer, barometric, strain-gauge sensors — already implemented and verified on real hardware) feeding the same interface, so the product's claim is a tool that is designed from the start to run on live biometric data, not just typed-in numbers.

## Operating Context

Used during a mission routine, potentially aboard a spacecraft, a space station, a rover, or a planetary/lunar base (the challenge explicitly asks the tool to make sense across these). The astronaut checks in periodically (self-initiated or prompted by the tool), not as a continuous clinical monitor.

Two build phases:
1. **Current phase:** the interface runs on a simulated data generator (realistic time-varying values per indicator) so the UI/UX can be iterated on independently of hardware timing.
2. **Next phase (not in this surface's scope yet):** the same interface consumes live readings streamed over WiFi from the team's ESP32 firmware (already built and verified: ADXL345 accelerometer, BMP180 temperature/cabin pressure, GSR sensor, AD8232 ECG, HX711 strain gauge).

The interface must be designed so swapping the simulated data source for the real one later does not require a redesign (same indicator shapes, same update model).

## Capabilities and Constraints

**Indicators and their source:**
- Frecuencia cardíaca — AD8232 (ECG)
- GSR / estrés — sensor GSR
- Temperatura corporal — BMP180 (temperatura)
- Presión de cabina/ambiente — BMP180 (presión) — this is environmental, not blood pressure
- Movimiento / actividad — ADXL345 (acelerómetro)
- Fuerza / respiración — galga + HX711
- Presión arterial — entrada manual (sin sensor dedicado)
- Glucosa en sangre — entrada manual
- Horas de sueño — entrada manual
- Estado de ánimo — entrada manual (escala simple)

**Thresholds already defined (verde/amarillo/rojo), to preserve exactly — see Evidence on Hand.**

**Required by the challenge brief:**
- Color coding for at-a-glance status per indicator.
- Dynamic/time-series charts showing how each indicator changes over time.
- Plain-language education per indicator (what it measures, why it matters, what a bad reading means) — cannot assume medical knowledge.
- Optional: gamification to encourage engagement with health tasks.
- Optional (explicitly suggested by the challenge, not mandatory): a clickable human-body figure where each region shows function/status.

**Constraints:**
- No real backend yet — data is simulated client-side for this phase.
- Must support the "who gets the alert" principle: the astronaut decides locally first; the tool should not assume an always-available ground connection (relevant given the challenge's emphasis on distance-from-Earth as a hazard).
- Deploy target not yet decided (hackathon demo runs locally for now).

## Evidence on Hand

Health threshold table already derived from standard medical ranges plus spaceflight-specific notes (confirmed with the user earlier in this project, must be preserved exactly in the data model):

| Indicador | 🟢 Normal | 🟡 Atención | 🔴 Crítico | Nota |
|---|---|---|---|---|
| Frecuencia cardíaca (reposo) | 60–100 bpm | 50–59 o 101–120 | <50 o >120 | Mejor usar % de desviación del baseline personal |
| GSR / estrés | ±20% del baseline | +20–50% sostenido | +50% sostenido o picos repetidos | Calibrar baseline al inicio, no usar valor absoluto |
| Temperatura corporal | 36.1–37.2 °C | 37.3–38.0 °C o 35.0–36.0 °C | >38.0 °C o <35.0 °C | Posible "fiebre espacial" (+1°C sostenido) |
| Actividad/movimiento | Cumple meta diaria | <50% de meta o inactividad en horario activo | Sin movimiento prolongado fuera de horario de sueño | También detecta impactos/caídas |
| Respiración (galga) | 12–20 resp/min | 21–24 u 8–11 | >25 o <8 | — |
| Presión de cabina (BMP180) | ±5% de 101.3 kPa | Desviación 5–10% | Desviación >10% | Alerta de ambiente, no de salud personal |
| Presión arterial | <120/80 mmHg | 120–139/80–89 mmHg | ≥140/90 o <90/60 mmHg | Hipotensión relevante por intolerancia ortostática en vuelo |
| Glucosa en sangre | 70–99 mg/dL (ayuno) | 100–125 mg/dL o <70 | ≥126 (ayuno)/≥200 o <54 (hipoglucemia severa) | — |
| Horas de sueño | 7–9 h | 5–6 h o 9–10 h | <5 h sostenido varios días | — |
| Estado de ánimo | Estable, neutral/positivo | Tendencia a la baja 2–3 días | Negativo persistente >3 días o desesperanza | — |

No real user testimonials, case studies, or production deployment exist — this is a hackathon prototype. Do not fabricate any.

## Product Principles

1. **Claridad para no-médicos primero:** cualquier estado debe entenderse en segundos, con lenguaje simple y color, sin asumir formación clínica.
2. **Autonomía local:** dado el retraso de comunicación con la Tierra en misiones lejanas, la interfaz debe apoyar decisiones a bordo, no depender de confirmación remota.
3. **Evidencia sobre intuición:** los umbrales vienen de rangos médicos estándar ajustados por contexto espacial, no de números arbitrarios — y no se reinventan en el diseño.
4. **Honesto con el hardware:** la arquitectura de datos debe anticipar una fuente de datos en vivo (el ESP32 real), aunque hoy corra con datos simulados.
5. **Calma bajo alarma:** un estado crítico debe ser inconfundible sin generar pánico — el reto mismo señala la salud conductual como un riesgo a cuidar.

## Accessibility & Inclusion

Not yet established beyond standard color-contrast care for the red/yellow/green coding (must not rely on color alone, given real-world color-vision deficiency — pair color with icon/shape/text).
