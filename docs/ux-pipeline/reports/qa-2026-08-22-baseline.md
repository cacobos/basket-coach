# QA Línea base — 2026-08-22

Primera medición del pipeline. No existe informe previo: todo resultado es baseline.

## Suites

| Suite | Resultado | Detalle |
|-------|-----------|---------|
| build (`ng build`) | **PASS** | 23.2 s. Initial 604 kB / 150 kB transfer. Warnings pre-existentes conocidos (html2canvas, canvg/core-js, fabric no ESM) — documentados en AGENTS.md |
| vitest (`npm test`) | **PASS** | 41/41 tests en 3 ficheros (2.8 s) |
| e2e (`npm run e2e`) | **PASS** | 3/3 smoke specs chromium (12.3 s): login visible, `/upgrade` accesible, redirect a login sin auth |

## Cobertura actual y ampliación

La cobertura E2E se limita a `e2e/smoke.spec.ts` (públicas). Pendiente de añadir en próximas iteraciones:
- Navegación principal autenticada (cada item del sidebar carga sin errores de consola)
- Flujos críticos: crear sesión → builder, tracking posesiones, registro pago
- Requiere credenciales de prueba (no hay usuario de test configurado aún)

## Entorno

- Servidor dev arrancado en segundo plano sobre http://localhost:4200 (log: `%TEMP%\opencode\dev-server.log`)
- Capturas baseline sin auth: `docs/ux-pipeline/baseline/login.png`, `upgrade.png`

## Veredicto

**SEGURO PARA CONTINUAR** — las tres suites están verdes. Siguiente paso: `/ux-audit dashboard` (o el alcance que prefieras).
