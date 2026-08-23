# Auditoría UX — login + dashboard + sidebar — 2026-08-22

```
═══════════════════════════════════════════════════════════
VERDICT: FAIL  (gates rojos → hallazgos accionables; la app funciona pero tiene fallos reales)

Persona: Entrenador de club amateur (rol coach/admin), poco tiempo entre entrenamientos,
         tecnología básica, usa la app en portátil y móvil.
Surfaces audited: 21 rutas recorridas de 40 (alcance de esta sesión: entrada + navegación)
Interaction Manifest: complete (login erróneo→correcto, crawl completo del sidebar,
  lectura de consola y red por ruta, ~25 capturas en baseline/evidencia/)

Hard Gates: console errors [3 genuinos], warnings [3 NG0956], network 5xx [0],
  403/404 auth [1: v_overdue_fees 404], layout-collapse [n/d esta sesión],
  axe Critical [1: select-name] — gates rojos
Performance (/dashboard): TTFB 3ms · DCL 41ms · load 63ms — verde (local)

Findings: Critical 1 · High 4 · Medium 3 · Low 2
Self-critique: Drafted 12 · Kept 10 · Generic 1 · Duplicate 1

TOP 5 (impacto × facilidad):
  1. AUD-006 Sidebar con 18 items sin agrupar — es EL problema de sencillez de uso
  2. AUD-001 Contraseña errónea sin ningún feedback — bloquea el primer contacto, fix trivial
  3. AUD-003 /matches: query 400 — la feature estrella nunca cargará datos
  4. AUD-004 /finance: vista v_overdue_fees no existe en BD (404 silencioso)
  5. AUD-002 401 en role_permissions justo tras login (race condition de permisos)
═══════════════════════════════════════════════════════════
```

## Hallazgos

| ID | Sev | Superficie | Problema | Evidencia |
|---|---|---|---|---|
| AUD-001 | **Crit** | /login | Contraseña errónea: NO aparece ningún mensaje de error (body sin cambio, solo consola 400 de Supabase). El usuario no sabe qué falló | dom-probe.json `wrongPass.bodyText`; captura 02-login-error.png |
| AUD-002 | High | post-login | GET `role_permissions` responde 401 inmediatamente tras autenticar: la carga de permisos corre antes de que la sesión esté propagada (race condition). El caché de permisos puede quedar vacío | walkthrough-detail.json `03-login-success` NET |
| AUD-003 | High | /matches | Query de partidos devuelve **400** (`or=(home_team_id.eq…)` — columnas que no existen en el schema actual). La página muestra estado vacío como si no hubiera datos: fallo enmascarado | NET 400 en `15-_matches`; captura 15-route-matches.png |
| AUD-004 | High | /finance | Vista `v_overdue_fees` no existe en este proyecto Supabase (**404**) → widget de impagos muestra 0 € silenciosamente. Migración pendiente de aplicar | NET 404 en `25-_finance` |
| AUD-005 | Med | /dashboard | axe: `select-name` **critical** (un select sin nombre accesible), `link-in-text-block` serious, falta h1 en página | axe-dashboard en walkthrough-detail.json |
| AUD-006 | Med | sidebar | **18 items planos** para un admin: Club, Dashboard, Equipos, Jugadores, Partidos, Ejercicios, Sesiones, Crear Sesión, Planificación, Calendario, Pizarra, Evaluar, Documentos, Comunicación, Finanzas, Configuración, Admin, Mejorar plan. Sin agrupación; mezcla acciones con secciones ("Crear Sesión"); nombres inconsistentes ("Evaluar" vs sustantivos); "Calendario" y "Sesiones" separados siendo lo mismo conceptualmente | dump `sidebarLinks` (18 hrefs) |
| AUD-007 | Med | raíz `/` | La ruta raíz redirige a `/portal` (familyGuard) y rebota a `/dashboard`: doble redirect innecesario y flash visual en cada entrada | `rootRedirectsTo` tras pasar por portal |
| AUD-008 | Low | sidebar/dashboard | Identidad: email mostrado DOS veces en el footer del sidebar y usado como nombre ("Bienvenido de nuevo, carlos.cobos.ex@gmail.com") en vez de nombre personal (`profile.full_name`) | `userChipText`; texto dashboard |
| AUD-009 | Low | /tactics | 3× warning NG0956 (track by identity recrea colección completa) — deuda de rendimiento Angular | WARN en `21-_tactics` |

### Observación de datos (verificar, no confirmado)
El dashboard dice "CB Plasencia Ambroz — **0 Jugadores**" y resumen "Jugadores: 0", pero existen 9 sesiones del equipo. O no hay jugadores dados de alta, o el contador consulta por una vía distinta a la real (`team_id` directo vs `player_teams`). Revisar en Fase 3.

## Lo que está BIEN (proteger)
- Estados vacíos excelentes y con CTA claro (Partidos: "Crea tu primer partido"; Dashboard: "Planifica una").
- Login limpio con dos opciones claras (Google / email).
- Rendimiento local excelente; cero errores en 16 de las 20 rutas recorridas.
- Navegación profunda directa (deep-links) funciona en todas las rutas probadas.

## Roadmap hacia la simplicidad

**Quick Wins (24-48h)**
- AUD-001: mostrar toast/mensaje inline con el error de Supabase en el login.
- AUD-004: aplicar migración de `v_overdue_fees` al proyecto (SQL ya existe en repo).
- AUD-007: cambiar redirect de raíz a `/dashboard`.
- AUD-008: usar `profile.full_name` y mostrarlo una sola vez.
- AUD-005: añadir aria-label al select del dashboard.

**Structural (Fases 3-4 del pipeline)**
- AUD-006: reagrupar sidebar en ≤6 grupos por rol, eliminar "Crear Sesión" como item (acción dentro de Sesiones), unificar Calendario↔Sesiones, renombrar "Evaluar"→"Evaluaciones".
- AUD-003: corregir query de matches al schema real (`rival`, `is_home`) o migrar columnas home_team_id/away_team_id.
- AUD-002: esperar sesión activa antes de cargar permisos (retry o await auth.ready).
- AUD-009: trackBy por id único en tactics.

---

**Hold this in your hands**: la app se siente sólida por debajo (cero errores en la mayoría de rutas, estados vacíos cuidados, respuesta instantánea), pero por encima pesa como un armario desordenado: dieciocho puertas iguales sin carteles, un pomo que no avisa de que está cerrado con llave (login mudo), y tres estantes que parecen llenos pero están rotos por dentro (matches, finanzas, permisos). El potencial de "entrenamiento inteligente para tu equipo" está ahí; lo que falta es que abrir cada puerta revele exactamente lo que el entrenador espera, en el momento que lo espera.

## Registro de fixes aplicados (Quick Wins) — 2026-08-22

| ID | Fix | Archivo / Migración | Verificado |
|---|---|---|---|
| AUD-001 | `message` convertido a `signal` (la app corre en modo **zoneless** de Angular 21 — sin zone.js — por lo que mutar campos planos tras un `await` no re-renderiza la vista; causa raíz sistémica). Mensajes de error mapeados a texto amigable en español vía `ERROR_MESSAGES` (invalid_credentials, email_not_confirmed, over_request_rate_limit…) + `role="alert"` | `features/auth/login.component.ts` | ✅ Sonda E2E: contraseña errónea muestra "Email o contraseña incorrectos. Compruébalos e inténtalo de nuevo." (`evidencia/fix-login-error-visible.png`) |
| AUD-002 | `PermissionService.load()` reintenta una vez tras 400 ms si falla (mitiga el 401 por race condition al propagarse la sesión) | `core/services/permission.service.ts` | ⚠️ Mitigado (no reproducible de forma determinista; sin 401 en re-test) |
| AUD-003 | `.order('date')` → `.order('match_date')` (columna real del schema live; era el 400 real — las columnas home_team_id/away_team_id sí existen) | `features/matches/repositories/match.repository.ts` | ✅ Re-test /matches: 0 respuestas ≥400 |
| AUD-004 | Vista `v_overdue_fees` creada en Supabase con `security_invoker = true` + grant a authenticated (migración `create_v_overdue_fees_view`; SQL original de `021_finance_fee_tracking.sql`) | DB (supabase MCP) | ✅ Re-test /finance: 0 respuestas ≥400 |
| AUD-005 | `aria-label="Seleccionar temporada"` y `aria-label="Seleccionar club"` en los dos selects del layout (eran los culpables del axe select-name critical) | `features/dashboard/main-layout.component.ts` | ✅ Ambos selects nombrados |
| AUD-007 | Raíz `/` redirige a `/dashboard` directamente (antes `/portal` → rebote) | `app.routes.ts` | ✅ Sonda: root → `http://localhost:4200/dashboard` |

Validación tras fixes: `ng build` PASS · Vitest 41/41 PASS · sonda E2E `e2e/tools/verify-quickwins.mjs` con login erróneo→correcto, raíz, /matches y /finance limpios.

Pendientes deliberadamente (Fase 3): AUD-006 (reagrupación del sidebar — decisión de diseño), AUD-008 (es problema de datos: `profiles.full_name` contiene el email para este usuario; corregir dato o pedir nombre real), AUD-009 (trackBy tactics), observación "0 Jugadores".
