# Mancuernas — entrena en casa

PWA en español para entrenar con mancuernas desde el celular o la tablet: ejercicios por zona del cuerpo,
músculos que trabajan, animación de la técnica y modo entrenamiento con descansos automáticos.
Funciona sin internet y guarda todo en el dispositivo (IndexedDB), sin cuenta.

Hecha con React + Vite + TypeScript + Tailwind. Todo el diseño, las ilustraciones y las animaciones son originales.

## Comandos

```bash
npm install      # dependencias
npm run dev      # desarrollo: http://localhost:5173/app-mancuernas/
npm run build    # compilación de producción en dist/
npm run preview  # sirve dist/ para probar la PWA y el modo sin conexión
```

Para publicarla en GitHub Pages, sigue [SUBIR-A-GITHUB.md](SUBIR-A-GITHUB.md).

## Estructura

```
src/
├─ animation/      Motor de animación: esqueleto 3D simple → SVG (vista lateral o frontal)
│  ├─ rig.ts         cinemática directa, proyección, resaltado muscular
│  ├─ interpolate.ts keyframes → pose en cualquier instante
│  └─ Figure.tsx     componente SVG animado con requestAnimationFrame
├─ body-map/       Mapa corporal interactivo (frente y espalda)
├─ data/           exercises.json (catálogo) y nombres de músculos/zonas
├─ db/             IndexedDB: perfil, rutinas y sesiones
├─ features/       Pantallas: onboarding, body, exercises, routines, workout, settings
├─ lib/            Series/reps por objetivo, peso sugerido, descansos, sonido
└─ types/          Modelo de datos
```

## Agregar un ejercicio

Un ejercicio nuevo es **solo datos** en `src/data/exercises.json`; no hay que dibujar nada.
La animación se define con keyframes de ángulos articulares (en grados):

| Campo | Significado |
|---|---|
| `cuerpo` | `[inclinación adelante, lateral, giro]` de la pelvis (−90 = acostado boca arriba) |
| `torso` | `[flexión, inclinación lateral, rotación]` respecto a la pelvis |
| `brazos` / `brazoD` / `brazoI` | `[flexión hombro, abducción, rotación externa, flexión codo, pronación]` |
| `piernas` / `piernaD` / `piernaI` | `[flexión cadera, abducción, flexión rodilla, flexión plantar]` |
| `cabeza` | flexión del cuello |

Otras opciones de `animacion`:

- `apoyo`: `pies`, `gluteos` (sentado en piso o banco), `espalda` (acostado) u `hombros` (espalda alta en banco o piso).
- `ancla` / `anclaAlto`: deja fijo un solo pie, opcionalmente sobre un banco (step-up, búlgara).
- `agarre`: `ambas`, `derecha`, `izquierda`, `central` (una mancuerna con las dos manos) o `ninguno`.
- `resaltarLado`: ilumina solo los músculos de un lado.
- `hombrosY` en la pose eleva los hombros; un sexto valor en los brazos flexiona la muñeca.
- `props`: elementos como un banco.
- `activacion`: curva `[t, intensidad]` que ilumina los músculos principales.

## Etapas

- **Etapa 1 (lista):** perfil inicial, mapa corporal, 10 ejercicios animados, lista y detalle,
  rutinas simples y modo entrenamiento continuo.
- **Etapa 2 (lista):** 41 ejercicios de fuerza, 6 de calentamiento y 7 estiramientos animados; calentamiento y
  estiramientos automáticos en cada rutina (se pueden omitir); limitaciones aplicadas (avisar u ocultar) y
  botón "Cambiar ejercicio" con sustitutos seguros (`src/lib/safety.ts`).
- **Etapa 3:** generador de rutinas, arrastre táctil, plan semanal, pantalla "Hoy", voz.
- **Etapa 4:** registro real de series, progresión automática, gráficas, exportar e importar en JSON.

El modelo de datos ya incluye los campos de las etapas siguientes (`articulaciones`, `sustitutos`,
`tipo`, sesiones guardadas con cada serie), para no tener que rehacer nada.
