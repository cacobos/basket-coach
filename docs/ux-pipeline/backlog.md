# Backlog de simplificación UX — basket-flow — 2026-08-22

**Fuentes:** `reports/audit-dashboard-2026-08-22.md` (hallazgos AUD-001..AUD-009) · `inventario-pantallas.md` (40 rutas) · `AGENTS.md` (routing, roles, permisos).
**Estado de entrada:** Quick Wins AUD-001, AUD-003, AUD-004, AUD-005 y AUD-007 aplicados y verificados; AUD-002 mitigado con retry en `PermissionService`. Quedan abiertos: AUD-006, AUD-008, AUD-009 y la observación "0 Jugadores".
**Regla del rediseño:** la funcionalidad no cambia; cambia CUÁNTO CUESTA usarla.

---

## 1. Diagnóstico resumido

1. **Sidebar plano (AUD-006): 18 items sin agrupar** que mezclan secciones con acciones ("Crear Sesión"), duplican conceptos ("Calendario" vs "Sesiones") y usan nombres inconsistentes ("Evaluar"). Es EL bloqueador de la sencillez: el entrenador escanea 18 puertas para encontrar su tarea diaria.
2. **Identidad sucia (AUD-008):** `profiles.full_name` contiene el email; el saludo y el footer del sidebar muestran un correo dos veces. La app "no conoce" al usuario.
3. **Métricas que generan desconfianza (observación auditoría):** el dashboard dice "0 Jugadores" habiendo datos → cualquier cifra de la app queda bajo sospecha.
4. **Deuda técnica visible (AUD-009):** 3 warnings NG0956 en /tactics por falta de trackBy estable.
5. **Redundancia estructural (inventario de rutas):** `/configuration` centraliza catálogos que deben editarse en contexto (`/exercises`, `/matches`); `/calendar` duplica `/sessions`; `/exercises/tags` es una página entera para una acción secundaria; "Mejorar plan" ocupa hueco premium del menú diario.
6. **Lo que ya funciona (proteger):** estados vacíos con CTA, banner de catálogos vacíos, deep-links sanos en las 40 rutas, rendimiento local excelente, portal de familias ya simplificado.

---

## 2. Arquitectura de información propuesta

### 2.1 Sidebar staff (club_admin / team_admin / coach): 18 items → 6 grupos

| Grupo | Items | Qué pasa con los items actuales |
|---|---|---|
| **Inicio** | Dashboard | Igual |
| **Entrenamiento** | Sesiones · Planificación · Ejercicios · Pizarra táctica | "Sesiones" pasa a ser hub (lista + calendario integrado + botón "Nueva sesión"). Se ELIMINAN como item: "Crear Sesión" (→ botón primario en la página) y "Calendario" (→ vista dentro de Sesiones). Entran Planificación, Ejercicios y Pizarra |
| **Partidos** | Partidos | Igual; feature estrella con grupo propio (flag match_analysis) |
| **Equipo** | Jugadores · Equipos · Evaluaciones | "Evaluar" se renombra a **"Evaluaciones"**; entra Equipos |
| **Club** | Cuotas · Documentos · Avisos · Miembros/Mi club · Configuración | "Finanzas" → **"Cuotas"**, "Comunicación" → **"Avisos"**; entra el actual item "Club" (settings/miembros); Configuración queda aquí, solo admin |
| **Sistema** | Panel admin *(solo superadmin)* · Mejorar plan* | "Admin" solo superadmin. \* "Mejorar plan" baja al chip de usuario del footer (UX-013) |

Cambios explícitos:

- **"Crear Sesión" deja de ser item** → botón primario "Nueva sesión" en la cabecera de Sesiones y en su estado vacío. La ruta `/sessions/new` se conserva intacta (crea draft → builder).
- **Calendario se fusiona con Sesiones** mediante toggle Lista/Calendario dentro de `/sessions`; se conserva el quick-create por clic en día. La ruta `/calendar` pasa a redirigir a `/sessions?view=calendar` → ningún deep-link roto.
- **Nombres consistentes, todos sustantivos:** Evaluar→Evaluaciones, Comunicación→Avisos, Finanzas→Cuotas.
- Máximo **6 grupos visibles por defecto** para admin/coach; los grupos se renderizan como acordeones con el primero abierto o como etiquetas de sección según implementación (decisión visual de Fase 4).

### 2.2 Visibilidad por rol (rol × grupos)

| Grupo | club_admin | team_admin | coach | family |
|---|---|---|---|---|
| Inicio | sí | sí | sí | — (portal propio) |
| Entrenamiento | sí | sí | sí, sin Planificación¹ | — |
| Partidos | sí (flag match_analysis) | sí | sí | — |
| Equipo | sí | sí | Jugadores + Evaluaciones (sin Equipos)¹ | — |
| Club | completo (Cuotas, Documentos, Avisos, Miembros, Configuración) | Avisos (lectura)² | Avisos (lectura)² | — |
| Sistema | Panel admin solo superadmin · Mejorar plan todos | ídem | ídem | — |

¹ Según seed por defecto de `role_permissions`: coach tiene player/session/exercise/evaluation/match/tactics/attendance.manage, NO planning.manage ni team.manage. La visibilidad SIEMPRE deriva del permiso configurado (si un superadmin lo concede, el item aparece) — nunca hardcodeada.
² Propuesta UX-011: lectura de avisos para todo el staff; crear/editar sigue gated por `announcements.manage`.
**Feature flags** (se respetan tal cual): Partidos→match_analysis · Planificación→planning · Pizarra→tactics · Evaluaciones→evaluations · Cuotas→finance · Documentos→documents · Avisos→announcements. Flag off ⇒ item oculto; grupo vacío ⇒ grupo oculto.
**family** conserva su sidebar simplificado actual (Portal · Calendario · Avisos): fuera del alcance de este rediseño.

### 2.3 Mapa ruta → propósito → qué cambia

| Ruta | Propósito hoy | Cambio propuesto |
|---|---|---|
| `/sessions` | Listado de entrenamientos | HUB: tabs Lista/Calendario + botón primario "Nueva sesión" + estados vacíos guiados |
| `/calendar` | Calendario de sesiones | Redirect a `/sessions?view=calendar` (compatibilidad deep-links) |
| `/sessions/new` | Crea draft → builder | Ruta intacta; la entrada pasa a ser botón/CTA |
| `/configuration` | Catálogos centralizados | Reducir: categorías de ejercicios editables inline en `/exercises`; catálogos de partido vía banner ya existente en `/matches/new`; la página queda como administración avanzada (adminGuard) |
| `/exercises/tags` | Gestión de tags | P2: pestaña dentro de `/exercises`, manteniendo redirect de compatibilidad |
| `/upgrade` | Planes disponibles | Sale del menú principal → chip de usuario |
| Resto (34 rutas) | — | Sin cambios funcionales; heredan los patrones de la sección 3 |

---

## 3. Patrones unificados (definir UNA vez, reutilizar en TODOS los módulos)

- **Listado:** título + contador + acción primaria arriba a la derecha + filtros secundarios + tabla/tarjetas. Referencia buena a clonar: `MatchListPage` y `SessionsComponent`.
- **Detalle:** cabecera con identidad + badge de estado + contenido en pestañas + acciones contextuales. Referencia: `MatchDetailPage`.
- **Formulario:** validación inline, errores mapeados a texto amigable en español vía `ERROR_MESSAGES` (patrón del fix AUD-001), botón deshabilitado mientras hay request pendiente, "Cancelar" vuelve al listado. Estado async SIEMPRE en signals (app zoneless — lección sistémica de AUD-001).
- **Estados vacíos:** icono + una frase de contexto + UN botón con verbo. Referencias a proteger: "Crea tu primer partido" (matches) y "Planifica una" (dashboard). Prohibido el vacío silencioso: lección de AUD-003/AUD-004 (un fallo mostrado como "vacío" engaña).
- **Banners de alerta:** severidad info/warn/danger + acción directa + dismissible. Referencia: banner de catálogos vacíos de `MatchFormPage` (ya reutilizado por alertas de vencimiento de documentos).
- **Feedback de acciones:** toasts vía `NotificationService` para éxito/error; nada de alerts nativos; toda mutación refleja estado pending en <100 ms.

---

## 4. Flujos objetivo

### Flujo A — Primera sesión de entrenamiento
- **Actual (4 pasos + fricción):** Dashboard → buscar "Sesiones" entre 18 items → pulsar item "Crear Sesión" (parece página, crea un draft sorpresa) → builder.
- **Objetivo (2 pasos):** Sesiones → estado vacío "No tienes sesiones esta semana" + botón [Nueva sesión] → builder. Camino alternativo equivalente: clic en día vacío del calendario integrado (quick-create ya existente).

### Flujo B — Registrar resultado de partido
- **Actual (5+):** Partidos → Nuevo partido → formulario (posible bloqueo si catálogos vacíos, requiere pulsar banner manualmente) → detalle → Live → finalizar.
- **Objetivo (3):** Partidos → [Nuevo partido]; si los catálogos están vacíos, seed automático con confirmación (el mecanismo ya existe: hacerlo proactivo) → Live → "Finalizar" persiste marcador y aterriza en el resumen PPP con CTA "Ver análisis".

### Flujo C — Revisar cuotas impagas
- **Actual (4):** Finanzas → widget de impagos (mostraba 0 € silencioso hasta el fix AUD-004) → localizar jugador → ficha financiera → dialog de pago.
- **Objetivo (3):** Finanzas con bloque "Impagos" destacado (vista `v_overdue_fees` ya operativa): total + top deudores → clic en fila abre la ficha financiera → [Registrar pago] (dialog ya existente) + recibo PDF. Estado vacío positivo: "Sin cuotas pendientes".

---

## 5. Backlog priorizado

### P0 — fricción crítica, alta frecuencia (cada ítem = 1 sesión de trabajo independiente)

| ID | Cambio | Archivos afectados | Esfuerzo | Riesgo | Criterio de aceptación (validable con Playwright) |
|----|--------|--------------------|----------|--------|---------------------------------------------------|
| UX-001 | Reagrupar el sidebar en máximo 6 grupos con etiquetas claras (justifica AUD-006) | `features/dashboard/main-layout.component.ts` (NavItem, grupos, computed de visibilidad) | M | Medio (regresión de navegación) | Un admin ve exactamente 6 grupos; cada grupo muestra sus items correctos; los deep-links de las 40 rutas siguen resolviendo; visibilidad respeta role_permissions y flags |
| UX-002 | Fusionar Calendario en Sesiones (toggle Lista/Calendario) y convertir "Crear Sesión" en botón primario de la página (AUD-006) | `features/sessions/sessions.component.ts` (+ reutilización del calendario), `app.routes.ts` (redirect `/calendar`) | M | Medio | `/calendar` redirige conservando intención; el botón "Nueva sesión" crea draft y aterriza en builder; el item "Crear Sesión" no existe en el DOM del menú |
| UX-003 | Corregir identidad: actualizar dato `profiles.full_name` (UPDATE trivial) + fallback de visualización si está vacío o es email-like; mostrarlo UNA sola vez (AUD-008) | DB (UPDATE de fila), `core/auth/auth.service.ts`, display en dashboard/sidebar | S | Bajo | El saludo y el chip muestran el nombre real una sola vez; con full_name inválido se muestra email una vez como fallback |
| UX-004 | Investigar y corregir el contador "0 Jugadores" del dashboard (consulta por vía equivocada: team_id directo vs player_teams) (observación auditoría) | `features/dashboard/dashboard.component.ts`, repository de players/equipos | S-M (investigación + fix) | Medio | Con jugadores activos en BD, el dashboard muestra número > 0 coincidente con el conteo real; test con fixture de 9 jugadores |
| UX-005 | Eliminar warnings NG0956 con trackById estable en colecciones de tactics (AUD-009) | componentes de `features/tactics/` (canvas/playbook rendering) | S | Bajo | Consola limpia: 0 warnings NG0956 al navegar e interactuar en `/tactics`; canvas funcional tras cambios |

#### Estado P0 — IMPLEMENTADO Y VALIDADO (2026-08-22)

Verificado con `e2e/tools/verify-p0.mjs` (Playwright): 6 grupos visibles, 15 items, sin "Crear Sesión"/"Calendario", chip "Carlos Cobos" + email separado, saludo correcto, `/calendar` → `/sessions?view=calendar`, calendario embebido funcional, **NG0956 = 0**. Build producción OK · Vitest 41/41.

- **UX-001** ✅ `staffNavGroups` (INICIO/ENTRENAMIENTO/PARTIDOS/EQUIPO/CLUB/SISTEMA) + `visibleGroups` computed por `role_permissions` × flags; renombrados Evaluaciones/Avisos/Cuotas incluidos (cubre también UX-006).
- **UX-002** ✅ `CalendarComponent` con `input.embedded()`; toggle Lista/Calendario en `/sessions` vía `?view=` (queryParam); `calendar-redirect.guard.ts`: staff → `/sessions?view=calendar`, family permanece en `/calendar`.
- **UX-003** ✅ UPDATE `profiles.full_name` = 'Carlos Cobos'; fallback anti-email-like en `displayName` (sidebar) y saludo (dashboard).
- **UX-004** ✅ Cerrado como *verificado-no-bug*: la tabla `players` está vacía en BD; el contador refleja la realidad.
- **UX-005** ✅ `track $index` en los 3 bucles de números de jugador; caché de arrays por firma de dorsales usados; paletas como campos estables.

Fixes sistémicos descubiertos durante la validación:

- Race 401 post-login también en `profiles` → retry en `AuthService._loadProfile`; `PermissionService.withAuthRetry()` unificado para `role_permissions` y `getRoleInClub` (misma causa raíz que AUD-002).
- `tsconfig.spec.json` ampliada a `src/**/*.ts` (el target `ng test` de angular.json usa builder de aplicación; la suite real es `npm test` → `vitest run`).
- Tipos reparados en `finance.store.spec.ts` (`InstanceType<typeof FinanceStore>`) y `match.store.spec.ts` (`id` en fixture `MatchSquad`).

### P1 — importante

| ID | Cambio | Archivos afectados | Esfuerzo | Riesgo | Criterio de aceptación |
|----|--------|--------------------|----------|--------|------------------------|
| UX-006 | Renombrados consistentes: "Evaluar"→"Evaluaciones", "Comunicación"→"Avisos", "Finanzas"→"Cuotas" (AUD-006) | `main-layout.component.ts` (labels) | S | Bajo | Los tres labels nuevos visibles y apuntando a sus rutas originales |
| UX-007 | Catálogos en contexto: gestión inline de categorías en `/exercises` y de catálogos de partido desde `/matches` (banner existente); `/configuration` reducida a administración avanzada (nuevo — redundancia detectada en inventario; coincide con doc 02 de AGENTS.md) | `features/exercises/exercises.component.ts`, `features/matches/pages/match-form-page.*`, `features/configuration/*` | M | Medio | CRUD de categoría posible sin salir de `/exercises`; seed de catálogos lanzable desde `/matches/new`; `/configuration` sigue accesible para admin |
| UX-008 | Componente compartido `EmptyStateComponent` (icono + frase + 1 CTA) adoptado por listados principales (nuevo — patrón ya bueno en matches/dashboard) | `shared/components/empty-state.*`, adopción en sessions/players/evaluations/documents | M | Bajo | Todos los listados usan el componente; cada vacío ofrece exactamente 1 CTA accionable |
| UX-009 | Componente compartido `AlertBannerComponent` (info/warn/danger + acción + dismiss) unificando banners de catálogos y documentos (nuevo — patrón ya bueno en MatchFormPage) | `shared/components/alert-banner.*`, MatchFormPage, dashboard, documents | S | Bajo | Banner de documentos y de catálogos renderizan con el mismo componente y severidades consistentes |
| UX-010 | Finance overview con bloque "Impagos" destacado: total + top deudores + acceso directo a ficha y registro de pago (nuevo — flujo C) | `features/finance/pages/finance-overview.*` | M | Bajo | El overview lista filas de `v_overdue_fees`; clic lleva a la ficha; registrar pago actualiza el bloque |
| UX-011 | Avisos en modo lectura para todo el staff (team_admin/coach); creación/edición sigue gated por `announcements.manage` (nuevo — coherente con announcement_reads) | `main-layout.component.ts`, `features/announcements/pages/announcements-list.*` | S | Bajo | Coach ve el listado de avisos; no ve botones de crear/editar; club_admin sí |

#### Estado P1 — IMPLEMENTADO Y VALIDADO (2026-08-22)

Verificado con `e2e/tools/verify-p1.mjs` + `diag-avisos.mjs` (Playwright), build producción OK, Vitest 41/41:

- **UX-006** ✅ Cubierto en P0 (labels Evaluaciones/Avisos/Cuotas).
- **UX-007** ✅ Gestión inline de categorías en `/exercises`: barra de chips-filtro, chip de categoría en tarjetas y diálogo CRUD (crear/editar nombre+color/borrar) sin salir del listado. `ExerciseRepository.updateCategory/removeCategory`. Seed de catálogos desde `/matches/new` ya existente, banner unificado vía UX-009.
- **UX-008** ✅ `EmptyStateComponent` compartido (`shared/components/`) adoptado en sessions, players (2 estados), evaluations y documents-list.
- **UX-009** ✅ `AlertBannerComponent` (severity info/warn/danger, acción opcional, dismissible) adoptado en documents-list y match-form.
- **UX-010** ✅ Bloque "Impagos" destacado en finance overview: total en rojo, filas clicables → `/finance/players/:id`, top 10 por importe; estado positivo "Sin cuotas vencidas" cuando no hay deuda.
- **UX-011** ✅ Item Avisos visible para todo el staff; botón "+ Nuevo Aviso" gated por `canManage()` (`getRoleInClub` × `announcements.manage`).

Fix sistémico descubierto durante la validación (race de cold-start):

- Navegación directa a `/announcements` tras login: el constructor corría antes de que `DataService.currentClub()` se restableciera → caía en la rama family y `canManage` quedaba `false` para siempre. Refactor a `effect()` reactivo sobre `currentClub()` + `auth.user()` con ramas separadas `loadForClub`/`loadForFamily` (idempotente por club). Además `PermissionService.ensureLoaded()` garantiza la caché de `role_permissions` antes de evaluar `hasPermission` (mitiga el 401 inicial de esa tabla).

### P2 — pulido

| ID | Cambio | Archivos afectados | Esfuerzo | Riesgo | Criterio de aceptación |
|----|--------|--------------------|----------|--------|------------------------|
| UX-012 | Fusionar `/exercises/tags` como pestaña de Ejercicios, con redirect de compatibilidad (nuevo — inventario) | `features/exercises/*`, `app.routes.ts` | S | Bajo | `/exercises/tags` redirige; gestión de tags usable dentro de Ejercicios |
| UX-013 | "Mejorar plan" sale del menú → enlace secundario en chip de usuario/footer (nuevo — AUD-006 derivado) | `main-layout.component.ts` | S | Bajo | `/upgrade` accesible desde el chip; item ausente del menú principal |
| UX-014 | Resolver residuos axe: link-in-text-block y h1 faltante en dashboard (residual AUD-005) | `features/dashboard/*` | S | Bajo | axe: 0 serious/critical en dashboard |
| UX-015 | Suite Playwright de navegación post-rediseño: mapa rol × grupos × rutas + redirects de compatibilidad (nuevo — salvaguarda de UX-001/002) | `e2e/` (nueva spec) | M | Bajo | Spec verde para club_admin, team_admin, coach y family tras el rediseño |

#### Estado P2 - IMPLEMENTADO Y VALIDADO (2026-08-23)

Verificado con 2e/specs/navigation-roles.mjs (Playwright, 4 roles), erify-p0.mjs, erify-p1.mjs, build produccion OK, Vitest 41/41:

- **UX-012** ? Tags como pestana de Ejercicios: toggle Lista|Tags en /exercises (?tab=tags, queryParam), <app-tags [embedded]="true" /> reutiliza el componente sin back-link; /exercises/tags redirige con TagsRedirectComponent.
- **UX-013** ? "Mejorar plan" movido al chip de usuario (tercera linea del .user-details, enlace discreto); fuera del menu principal.
- **UX-014** ? Dashboard: h1 real ("Coach Insights", era h2) y CTAs de estados vacios como enlaces independientes ("Crear equipo" / "Planificar sesion") - resueltos link-in-text-block y jerarquia de headings de axe.
- **UX-015** ? Suite multi-rol 2e/specs/navigation-roles.mjs: matriz rol x sidebar exacto x guards x redirects. Resultado ALL GREEN: club_admin 15 items/6 grupos, team_admin 10/5, coach 8/5, family modo portal (3 items); /configuration y /finance expulsan a no-autorizados; family permanece en /calendar; redirect tags OK.

Fix sistematico #2 descubierto durante la validacion (race de cold-start en MainLayout):

- El constructor basado en polling (	imer(0,50) + 	akeWhile) corria sus queries antes de que sesion/club estuvieran restaurados: el staff NO-superadmin perdia todos los items con permiso (solo veia Dashboard+Avisos) y family quedaba en modo staff vacio. Refactor a ffect() reactivo sobre [auth.user(), currentClub()] + esolveAndLoad() idempotente por clave user:club (misma solucion que announcements). Ademas clubAdminGuard baja su espera de club inexistente de 10s a 4s.

Fixtures de prueba creados para la suite (password Test1234!, proyecto ttythziuthbrfopzxtvh):

- coach.p1@baskettest.dev (rol coach en CB Plasencia Ambroz), 	eamadmin.p1@baskettest.dev (team_admin), amily.p1@baskettest.dev (tutela de "Familia Prueba"). Nota tecnica: usuarios insertados por SQL requieren mail_change='' y tokens vacios (NULL rompe GoTrue con "Database error querying schema"); dominio .local rechazado por validacion.

---

## Lo que NO se va a cambiar (proteger)

- Estados vacíos con CTA ya excelentes (matches, dashboard) — se convierten en patrón, no se reescriben.
- Login limpio con Google/email y el manejo de errores AUD-001 ya corregido.
- Deep-links de las 40 rutas: ninguna ruta se elimina sin redirect.
- Tema oscuro, tokens CSS custom properties, tipografías Inter/Hanken Grotesk.
- Portal de familias simplificado (sidebar propio) y su modelo de solo lectura.
- Session Builder y el live tracking por posesiones (solo se mejora cómo se llega y se sale de ellos).
- Registro manual de pagos SIN pasarela externa (decisión de producto vigente).
- Sistema `role_permissions` + feature flags tal cual: el rediseño los consume, no los modifica.

## Restricciones respetadas

- Sin migración de BD salvo el UPDATE trivial de datos de UX-003.
- Ninguna URL existente rompe: fusiones con redirect de compatibilidad.
- Cada ítem P0 es validable con una spec Playwright autónoma.
- UI en español, código en inglés; standalone + signals; SCSS.

> **Revisa y aprueba este backlog antes de ejecutar /ux-implement.**
