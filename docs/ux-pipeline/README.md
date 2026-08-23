# Pipeline de Simplificación UX/UI — planbasket

Proceso completo, repetible y seguro para **probar** la aplicación y **rediseñar su UX/UI** haciéndola más sencilla de usar, sin perder funcionalidad.

## Cómo funciona (visión general)

```
Fase 1          Fase 2           Fase 3            Fase 4              Fase 5
LÍNEA BASE  →   AUDITORÍA    →   PLAN         →    IMPLEMENTACIÓN  →   VALIDACIÓN
/ux-baseline    /ux-audit        /ux-plan          /ux-implement       /ux-validate
(QA-runner)     (UX-Auditor)     (UX-Architect)    (UX-Implementer)    (QA-runner)
   │                │                │                  │                  │
qa-<fecha>.md   audit-*.md       backlog.md        código + build      qa-<fecha>.md
inventario      evidencia/       IA + P0/P1/P2     UN ítem por vez     comparativa
```

**Regla de oro**: entre Fase 3 y Fase 4 hay un *gate humano* — tú revisas el backlog y apruebas. Los agentes nunca deciden solos qué cambiar.

---

## Requisitos previos (una sola vez)

1. **Reinicia opencode** tras crear estos ficheros de agentes/comandos (se cargan al arrancar).
2. Levanta el servidor dev antes de auditar o validar:
   ```
   cd basket-flow && npm start
   ```
3. La skill [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) que mencionas **ya está instalada** localmente (`~/.agents/skills/ui-ux-pro-max`) — no hay que descargar nada.
4. MCPs ya configurados en `opencode.json`: playwright, ui-analyzer, a11y, ux-best-practices.

---

## Las 4 fases en detalle

### Fase 1 — Línea base (`/ux-baseline`)
Qué hace: compila (`ng build`), corre tests unitarios (Vitest), E2E (Playwright), genera inventario de pantallas desde `app.routes.ts` y capturas "antes".
Por qué: es tu red de seguridad. Si algo se rompe durante el rediseño, lo sabrás aquí.
Salida: `docs/ux-pipeline/reports/qa-*.md` + `inventario-pantallas.md`.

### Fase 2 — Auditoría (`/ux-audit [alcance]`)
Qué hace: el agente `ux-auditor` navega la app **como un usuario real** (clics, formularios, estados vacíos/error), aplica las skills de auditoría (ux-audit, review-design/WCAG, ux-interaction-taste, web-design-guidelines, ui-ux-pro-max) y produce hallazgos priorizados con IDs `AUD-xxx` y capturas como evidencia.
Ejemplos: `/ux-audit dashboard`, `/ux-audit sesiones`, `/ux-audit todo`.
Salida: `docs/ux-pipeline/reports/audit-<alcance>-<fecha>.md`.

### Fase 3 — Plan (`/ux-plan`)
Qué hace: el agente `ux-architect` lee TODAS las auditorías y produce:
- Diagnóstico transversal (top 5 problemas).
- Arquitectura de información simplificada por rol (sidebar ≤7 grupos).
- Patrones unificados (listado/detalle/formulario/estados vacíos).
- Flujos objetivo (pasos actuales vs objetivo por tarea crítica).
- Backlog priorizado P0/P1/P2, cada ítem = una sesión de trabajo.

**TU DECISIÓN AQUÍ**: lee el backlog, reordena/borra lo que no te convence, aprueba.
Salida: `docs/ux-pipeline/backlog.md`.

### Fase 4 — Implementación (`/ux-implement UX-001`)
Qué hace: el agente `ux-implementer` ejecuta UN ítem del backlog por sesión: audita el código afectado, implementa siguiendo AGENTS.md + skills de diseño, verifica `npm run build` y cierra con informe. Orden recomendado: primero ítems globales (tokens CSS, layout base, sidebar) y luego por pantalla.
Después de cada ítem: revisa el diff → commit → `/ux-validate <alcance>` → siguiente ítem.

### Fase 5 — Validación (`/ux-validate [audit]`)
Qué hace: re-ejecuta build + unit + E2E, compara contra el QA anterior y da veredicto SEGURO/PARAR. Opcionalmente relanza `/ux-audit` para comparar puntuaciones antes/después.

---

## Los agentes

| Agente | Rol | Puede editar |
|---|---|---|
| `qa-runner` | Ejecuta build/vitest/e2e, amplía specs E2E | Solo `e2e/` e informes |
| `ux-auditor` | Recorre la app real y documenta fricción | Solo informes y capturas |
| `ux-architect` | Sintetiza plan y backlog priorizado | Solo `docs/ux-pipeline/` |
| `ux-implementer` | Implementa ítems UX-xxx sin romper nada | Código de la app |

Puedes invocarlos directamente con `@ux-auditor`, etc., pero lo normal será usar los comandos `/ux-*`.

## Estructura de artefactos

```
docs/ux-pipeline/
├── README.md                  ← este documento
├── inventario-pantallas.md    ← Fase 1
├── baseline/                  ← capturas "antes" + evidencia de auditoría
├── reports/
│   ├── qa-*.md                ← Fases 1 y 5
│   └── audit-*.md             ← Fase 2
└── backlog.md                 ← Fase 3 (tu hoja de ruta aprobada)
```

## Consejos si no eres experto en IA

1. **Una fase por sesión de trabajo.** No pidas "audita y rediseña todo" en un solo prompt: el contexto se satura y baja la calidad.
2. **Confía en los gates.** El sistema está diseñado para que ningún agente cambie tu app sin que antes exista evidencia (AUD-xxx) y un plan aprobado (backlog).
3. **Commitea tras cada ítem validado.** Así siempre puedes volver atrás (`git revert`).
4. **Si un agente se equivoca**, corrige el rumbo en el mismo chat ("eso no, mejor X") — los agentes leen el contexto de la conversación.
5. **Itera**: el pipeline es repetible. Tras el primer pase completo, vuelve a `/ux-audit todo` y verás cómo mejora la puntuación frente a la primera auditoría.
