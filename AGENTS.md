# Basket Coach — Guía para Agentes de IA

## Visión General

Monorepo de una plataforma de entrenamiento de baloncesto compuesta por **dos aplicaciones Angular**:

- **basket-flow** (`/basket-flow`): Aplicación principal full-stack con Supabase. Planificador de entrenamientos, gestión de equipos/jugadores, Biblioteca de ejercicios, análisis de partidos basado en posesiones, pizarra táctica, evaluaciones, planificación deportiva, gestión administrativa (documentos/licencias/comunicación), seguimiento financiero de cuotas y portal de familias.
- **pizarra-tactica** (`/pizarra-tactica`): Aplicación standalone (solo cliente) para crear playbooks con canvas interactivo. Persiste en localStorage.

Desplegada en **Netlify** (`planbasket.netlify.app`) y **Vercel**.

---

## Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| Angular | 21.x | Framework SPA (standalone components, sin NgModules) |
| TypeScript | ~5.9 | Strict mode, ES2022 |
| RxJS | ~7.8 | Observable streams (uso legacy) |
| Angular Signals | nativo | Estado reactivo moderno (match.store, data.service, auth.service) |
| SCSS | — | Todos los estilos |
| Supabase | js v2.108 | Backend: PostgreSQL, Auth, Storage, Realtime, Edge Functions |
| Angular CDK/Material | 21.x | Componentes de UI (dialog, menus, etc.) |
| Fabric.js | 5.5 | Canvas para pizarra táctica |
| jsPDF | 4.2 | Exportación a PDF (playbooks y recibos de cuotas) |
| Konva | 10.3 | Canvas alternativo (sin uso actual destacado) |
| Puppeteer | 25.1 | Renderizado server-side / PDF (no implementado aún) |
| Vitest | 4.0 | Tests unitarios |
| Playwright | 1.61 | Tests E2E |
| Prettier | — | printWidth 100, singleQuote |

---

## Arquitectura de basket-flow

### Frontend Angular

- **Standalone Components**: Sin NgModules. `main.ts` bootstraps el `App` component directamente con `bootstrapApplication`.
- **Lazy Loading**: Todas las rutas feature se cargan con `loadComponent`.
- **Rutas protegidas**: `AuthGuard` espera a que `auth.ready` se resuelva, luego verifica `isAuthenticated()` (computed signal).
- **Estado con Signals**: `signal()`, `computed()`, `linkedSignal()`, y `effect()` para reactividad. No se usan NgRx o servicios con BehaviorSubject.
- **Patrón Store**: Cada feature compleja tiene su propio store signal-based (`MatchStore`, `PlanningStore`, `FinanceStore`).
- **Repository Pattern**: Cada entidad tiene su propio repositorio (`ClubRepository`, `PlayerRepository`, etc.) que implementa `BaseRepository<T>`. `DataService` queda como facade temporal para `currentClub()` state.
- **Feature Flags**: `PermissionService` controla el acceso a módulos via `hasFeatureAccess(feature, clubId)` (devuelve `Observable<boolean>`). `featureGuard()` protege rutas, `FeatureFlagDirective` oculta UI. Sin suscripciones — el acceso lo define el rol del usuario en el club + los permisos configurados por superadmin en `role_permissions`. Mapa `FEATURE_PERMISSION_MAP` en permission.service.ts conecta nombres lógicos (`tactics`) a permisos (`tactics.manage`).
- **Route Guards**: Todos con RxJS (`Observable<boolean | UrlTree>`), nunca `async`/`Promise`. Guards: `authGuard`, `featureGuard(feature)`, `adminGuard`, `superadminGuard`, `clubAdminGuard`, `familyGuard`.
- **Permission System**: `PermissionService` con cache signal de `role_permissions` (DB). `hasPermission(role, permission)` reemplaza checks hardcodeados de rol. `getRoleInClub(clubId)` devuelve `Observable<Role | null>`. Los permisos se cargan desde `AuthService._initSession()` y son configurables por superadmin en `/superadmin/permissions`. `SubscriptionService` queda solo para info de facturación del club (plan name), no para control de acceso.

### Routing (`app.routes.ts`)

```
/login                              → LoginComponent
'' (protegidas por AuthGuard)
  /dashboard                        → DashboardComponent
  /clubs                            → ClubsComponent
  /clubs/:id/members                → ClubMembersComponent (clubAdminGuard)
  /teams                            → TeamsComponent
  /players                          → PlayersComponent
  /players/:id                      → PlayerDashboardComponent
  /tactics                          → TacticsComponent (featureGuard:tactics)
  /whiteboard                       → WhiteboardComponent (dibujo libre)
  /stats                            → redirectTo: /matches
  /exercises                        → ExercisesComponent
  /exercises/new                    → ExerciseFormComponent
  /exercises/:id/edit               → ExerciseFormComponent
  /exercises/tags                   → TagsComponent
  /sessions                         → SessionsComponent
  /sessions/new                     → SessionNewComponent
  /sessions/:id                     → SessionDetailComponent
  /sessions/:id/builder             → SessionBuilderComponent
  /sessions/:id/analysis            → SessionAnalysisComponent
  /session-builder                  → redirectTo: /sessions/new
  /calendar                         → CalendarComponent
  /evaluations                      → EvaluationsComponent (featureGuard:evaluations)
  /matches                          → MatchListPage (featureGuard:match_analysis)
  /matches/new                      → MatchFormPage (featureGuard:match_analysis)
  /matches/:id                      → MatchDetailPage (featureGuard:match_analysis)
  /matches/:id/live                 → MatchLivePage (featureGuard:match_analysis)
  /configuration                    → CatalogAdminPage (adminGuard)
  /planning                         → PlanningOverviewComponent (featureGuard:planning)
  /planning/new                     → MacrocycleFormComponent (featureGuard:planning)
  /planning/:macrocycleId           → MacrocycleDetailComponent (featureGuard:planning)
  /planning/:macrocycleId/mesocycles/new           → MesocycleFormComponent (featureGuard:planning)
  /planning/:macrocycleId/mesocycles/:mesocycleId  → MesocycleDetailComponent (featureGuard:planning)
  /planning/:macrocycleId/mesocycles/:mesocycleId/microcycles/:microcycleId → MicrocycleDetailComponent (featureGuard:planning)
  /documents                        → DocumentsComponent (adminGuard, featureGuard:documents)
  /documents/:playerId              → PlayerDocumentsComponent
  /announcements                    → AnnouncementsComponent (featureGuard:announcements)
  /announcements/new                → AnnouncementFormComponent (adminGuard)
  /finance                          → FinanceOverviewComponent (clubAdminGuard, featureGuard:finance)
  /finance/fee-plans                → FeePlansComponent (clubAdminGuard)
  /finance/fee-plans/new            → FeePlanFormComponent (clubAdminGuard)
  /finance/payments                 → PaymentsListComponent (clubAdminGuard)
  /finance/players/:id              → PlayerFinanceDetailComponent (clubAdminGuard o family propietario)
  /onboarding                       → OnboardingWizard (adminGuard, 5 pasos: equipos → jugadores → staff → cuotas → catálogos)
  /portal                           → FamilyPortalComponent (familyGuard) — resumen del/los jugador/es vinculados
  /portal/players/:id               → FamilyPlayerDetailComponent (familyGuard)
  /upgrade                          → UpgradeComponent (sin authGuard)
  /superadmin                       → SuperadminComponent (superadminGuard)
  /superadmin/clubs                 → SuperadminClubsPage (superadminGuard)
  /superadmin/clubs/:id             → SuperadminClubDetailPage (superadminGuard)
  /superadmin/plans                 → SuperadminPlansPage (superadminGuard)
  /superadmin/permissions           → SuperadminPermissionsPage (superadminGuard)
  /superadmin/users                 → SuperadminUsersPage (superadminGuard)
```

### Estructura del proyecto (basket-flow/src/app/)

```
core/
  auth/auth.service.ts                  # Auth con Signals (Google OAuth + Email)
  guards/auth.guard.ts                  # CanActivate funcional
  guards/feature.guard.ts               # Feature flag guard factory
  guards/admin.guard.ts                 # Admin role guard
  guards/superadmin.guard.ts            # Superadmin role guard
  guards/family.guard.ts                # Restringe rutas de /portal al rol family
  models/models.ts                      # Interfaces: Profile, Club, Team, Player, Exercise,
                                        #   TrainingSession, Match, Possession, Catalog*, Document,
                                        #   FeePlan, PlayerFee, Payment, etc.
  services/data.service.ts              # CRUD genérico sobre Supabase (facade temporal, mantiene currentClub())
  services/notification.service.ts      # Toast notifications
  services/subscription.service.ts      # Feature flags signals
  supabase/supabase.service.ts          # Wrapper de createClient()
shared/
  components/
    notification.component.ts
    rich-text-editor.component.ts
  directives/
    feature-flag.directive.ts           # *appFeatureFlag estructural
features/
  auth/                                 # LoginComponent
  calendar/                             # Calendario de sesiones
  clubs/                                # CRUD de clubes
    clubs.component.ts                  #   Lista de clubs + selector
    club-members.component.ts           #   Gestión de miembros (clubAdminGuard)
  configuration/                        # Catálogos: tipos ataque, sistemas, resultados, etc.
  dashboard/                            # Main layout (sidebar) + dashboard
  evaluations/                          # Evaluación de jugadores (1-10 en 9 categorías)
  exercises/                            # Biblioteca de ejercicios con variantes y tags
  matches/                              # Sistema de análisis por posesiones
    pages/                              #   match-list, match-form, match-detail, match-live
    components/                         #   Componentes específicos de partido
    models/                             #   match.models.ts (CreateMatchData, PossessionFormData, etc.)
    repositories/                       #   match.repository.ts, configuration.repository.ts
    services/                           #   match.service.ts, configuration.service.ts, match-seed.service.ts
    store/                              #   match.store.ts (Signal store)
  players/                              # CRUD de jugadores + PlayerDashboard (consolidación evaluaciones + reviews)
  planning/                             # Planificación deportiva (macrociclos/mesociclos/microciclos)
    pages/                              #   6 páginas (overview, forms, details)
    components/                         #   cycle-timeline, weekly-load-grid
    models/                             #   planning.models.ts
    repositories/                       #   planning.repository.ts
    services/                           #   planning.service.ts
    store/                              #   planning.store.ts (Signal store)
  documents/                            # Gestión documental y licencias
    pages/                              #   documents-list, player-documents
    models/                             #   document.models.ts
    repositories/                       #   document.repository.ts, license.repository.ts
    services/                           #   document.service.ts (alertas de vencimiento)
  announcements/                        # Comunicación centralizada (sustituto de WhatsApp)
    pages/                              #   announcements-list, announcement-form
    repositories/                       #   announcement.repository.ts
    services/                           #   announcement.service.ts
  finance/                              # Cuotas y pagos (sin pasarela automatizada)
    pages/                              #   finance-overview, fee-plans, fee-plan-form, payments-list, player-finance-detail
    components/                         #   overdue-badge, payment-register-dialog
    models/                             #   finance.models.ts
    repositories/                       #   fee-plan.repository.ts, player-fee.repository.ts, payment.repository.ts
    services/                           #   finance.service.ts (generación periódica de cuotas)
    store/                              #   finance.store.ts (Signal store)
  onboarding/                           # Wizard de alta de club (equipos → jugadores → staff → cuotas)
    import-players-wizard.component.ts  #   Import CSV/Excel masivo de jugadores
  portal/                               # Portal de familias (solo lectura de su propio jugador)
    family-portal.component.ts
    family-player-detail.component.ts
  sessions/                             # Planificación de entrenamientos
  superadmin/                           # Panel superadmin + clubs, plans, users, permissions
  tactics/                              # Pizarra táctica (fabric.js)
    playbook.service.ts                 #   Estado del playbook (pasos, jugadores)
    canvas.service.ts                   #   Renderizado del canvas (fabric.js)
    canvas.models.ts                    #   Modelos: CanvasPlayer, CanvasBall, CanvasCone, etc.
  teams/                                # CRUD de equipos
  upgrade/                              # Página de upgrades/planes
  whiteboard/                           # Pizarra de dibujo libre
```

---

## Features y Funcionalidades

### 1. Autenticación (`AuthService`)
- Google OAuth + Email/password
- Sesión persistente con Supabase Auth
- Profile auto-creado vía trigger `on_auth_user_created`
- `ready: Promise<void>` se resuelve tras restaurar sesión
- Signals: `user`, `profile`, `loading`, `isAuthenticated` (computed)

### 2. Gestión de Clubes y Equipos
- Multi-club: cada usuario puede pertenecer a varios clubes
- Roles: club_admin, team_admin, coach, family (portal restringido)
- Equipos dentro de clubes (categoría, temporada)
- CRUD completo vía `DataService`

### 3. Gestión de Jugadores
- Nombre, dorsal, posición, altura, peso, foto
- Filtro por equipo/club
- Activo/inactivo (bloqueado hasta que existan los consentimientos obligatorios, ver Documento 05)
- CRUD vía `DataService`
- Vinculación a familias/tutores vía `player_guardians`

### 4. Biblioteca de Ejercicios
- Nombre, descripción, objetivos, dificultad, duración
- Categorías (configurables por club)
- Variantes por ejercicio
- Tags con gestión independiente
- Diagramas (URLs) y vídeo
- CRUD completo, incluyendo `remove_tag_from_exercises` RPC

### 5. Planificación de Entrenamientos (Sessions)
- Título, descripción, objetivos, ubicación, fecha/hora
- Estado: draft → planned → completed → cancelled
- Secciones dentro de cada sesión (ordenadas)
- Ejercicios asignados a secciones (con orden y duración)
- Asistencia por jugador (presente, ausente, tarde, justificado, lesionado)
- Análisis post-sesión: valoraciones por jugador (esfuerzo, rendimiento, actitud)
- Session Builder UI para armar sesiones visualmente
- Ruta `/sessions/new` → crea draft → redirige a `/sessions/:id/builder`

### 6. Pizarra Táctica (`/tactics`)
- Basada en Fabric.js 5.5
- Tipos de cancha: NBA, FIBA, high school
- Modos de vista: full, half offensive, half defensive
- Gestión de pasos: cada paso copia el estado del anterior
- Jugadores: atacantes (azul), defensores (rojo X), coach (gris)
- Objetos: balón, cono
- Herramientas de acción: driblar, bloquear, pasar, pase de mano, tiro
- Herramientas de dibujo: línea libre, círculo, rectángulo
- Modal de selección de destinatario al hacer pass
- Descripción textual por paso
- Export: PNG por paso, PDF multi-página con leyenda

### 7. Pizarra Libre (`/whiteboard`)
- Canvas de dibujo libre con fondos de cancha
- Pincel, goma, grosores variables
- Pantalla completa

### 8. Evaluaciones de Jugadores
- 9 categorías (tiro, dribling, pase, defensa, rebote, IQ, atletismo, trabajo en equipo, actitud)
- Escala 1-10
- Tipo: interna/externa
- Por club

### 9. Sistema de Análisis por Posesiones (Match Analysis) — Feature estrella
**Arquitectura en capas**: Page → Service → Repository → Store

**MatchStore** (Signal store):
```typescript
readonly match, possessions, substitutions, squad, lineup, loading, error
readonly score        → computed: own points, rival points
readonly ppp          → computed: points per possession (own)
readonly ownPossessions, rivalPossessions
```

**Páginas**:
- `MatchListPage`: listado con resumen (v_match_summary)
- `MatchFormPage`: creación de partido (rival, fecha, convocatoria)
- `MatchDetailPage`: detalle con pestañas (posesiones, estadísticas, lineup)
- `MatchLivePage**: tracking en vivo de posesiones

**Live tracking**:
- Marcador vivo con selectores:
  - Init type: saque inicial, fondo, rebote defensivo/ofensivo, robo, TL
  - Attack type: contraataque, transición, estático, saque, rebote ofensivo
  - System: Horns, Flex, Spain, Delay, Motion, Dribble Drive, Pick & Roll, Aclarado
  - Result: T2/T3 anotado/fallado, TL anotado/fallado, pérdida, falta, final periodo
  - Side: own/rival
  - Finisher y Creator (selectores de jugador)
  - Time bucket: 0-8, 9-16, 17-24
  - Notas y tags
- Undo última posesión
- Finalizar partido (persiste score)

### 10. Gestión Documental y Licencias (`/documents`)
- Documentos por jugador: licencia federativa, autorización de imagen, ficha médica, otros
- Estado calculado: pending / valid / expired según `expires_at`
- Banner de alertas en dashboard y en `/documents` para documentos próximos a vencer (mismo patrón que el banner de catálogos vacíos de `MatchFormPage`)
- Subida de ficheros a Supabase Storage, URL guardada en `documents.file_url`
- `player_licenses` como caso particular con número de licencia y temporada

### 11. Comunicación Centralizada (`/announcements`)
- Avisos por club o por equipo, sustituyendo grupos de WhatsApp dispersos
- Registro de lectura por usuario (`announcement_reads`) para saber quién no ha visto un aviso
- Visible también en el portal de familias (`/portal`)

### 12. Gestión Financiera de Cuotas (`/finance`)
- **Sin pasarela de pago automatizada en esta fase** — el objetivo es sustituir el control manual en Excel por un registro estructurado dentro de la app, no cobrar automáticamente.
- `fee_plans`: cuotas configurables por club/equipo (importe, frecuencia: mensual/temporada/pago único)
- `player_fees`: cuota generada para cada jugador según su plan, con estado (pending/paid/overdue/cancelled)
- `payments`: registro manual de un pago (fecha, método: transferencia/efectivo/bizum/otro, quién lo registró), sin integración con ningún proveedor externo
- Generación periódica de `player_fees` desde `fee_plans` mediante función programada (Supabase Edge Function o cron), sin cobro real asociado
- Vista `v_overdue_fees` para listar impagos por equipo/club
- Recibo simple exportable a PDF con jsPDF (ya en el stack) a partir de un `payment` registrado
- Visible para `club_admin`/`team_admin` en `/finance` y, en modo solo lectura de su propio jugador, para `family` en `/portal`

### 13. Portal de Familias (`/portal`)
- Rol `family`, vinculado a uno o varios jugadores vía `player_guardians`
- Acceso de solo lectura a: ficha básica del jugador, calendario del equipo, estado de sus propias cuotas (`player_fees`/`payments`), documentos propios y su estado, avisos (`announcements`)
- Sin acceso a datos de otros jugadores, evaluaciones internas, ejercicios ni pizarra táctica

### 14. Onboarding de Club (`/onboarding`)
- Wizard tras crear un club por primera vez: crear equipos → importar jugadores (CSV/Excel) → invitar staff → configurar `fee_plans` (opcional) → seed de catálogos de partido (reutiliza `seed_match_catalogs()`)
- Import masivo de jugadores reutilizando `PlayerRepository.create()` en batch

---

## Base de Datos (Supabase PostgreSQL)

### Migraciones (consolidadas)

La base de datos se define desde un único archivo de migración inicial (`basket-flow/supabase/migrations/001_initial_schema.sql`) que consolida todas las migraciones 001-023. Este archivo contiene la creación completa del esquema (tablas, RLS, funciones, vistas, índices, triggers).

### Tablas principales

```
profiles              → id (UUID PK, FK auth.users), email, full_name, avatar_url
clubs                 → id, name, slug (unique), logo_url, description, created_by
club_members          → club_id, user_id, role (club_admin/team_admin/coach), UNIQUE(club_id, user_id)
role_permissions      → role, permission, granted, PK(role, permission)   -- roles incluye ahora 'family'
teams                 → club_id, name, category, season
players               → team_id, first_name, last_name, jersey_number, position, is_active, club_id, deleted_at
player_guardians      → player_id, user_id (nullable si se invita por email), email, relationship, can_view_payments, can_view_documents, UNIQUE(player_id, user_id)
exercise_categories   → club_id, name, color
exercises             → club_id, category_id, name, difficulty, tags[], diagrams (JSONB[]), deleted_at
exercise_variants     → exercise_id, name, difficulty, tags[], diagrams (JSONB[])
training_sessions     → club_id, team_id, title, date, start/end_time, status, deleted_at, microcycle_id (FK)
session_sections      → session_id, name, sort_order
session_exercises     → session_id, section_id, exercise_id, order, duration, UNIQUE(session_id, section_id, order)
attendance            → session_id, player_id, status (present/absent/late/excused/injured), UNIQUE(session_id, player_id)
session_player_reviews→ session_id, player_id, effort, performance, attitude, notes
game_stats            → club_id, team_id, opponent, score own/rival, is_home (DEPRECATED — vista compatibilidad v_game_stats_legacy)
player_game_stats     → game_id, player_id, puntos, rebotes, asistencias, etc. (DEPRECATED)
evaluations           → club_id, player_id, evaluator_id, 9 categorías (1-10), notes
playbooks             → club_id, name, court_type, view_mode, steps (JSONB), tags[], config (JSONB)
matches               → club_id, team_id, rival, status, current_period, score_own, score_rival, is_home
match_squads          → match_id, player_id, starter, UNIQUE(match_id, player_id)
match_substitutions   → match_id, player_out, player_in, period, order_in_period
possessions           → match_id, period, number, side, init/attack/result, finisher/creator, points, rebounds, assists, turnovers, fouls
catalog_*             → Tablas de configuración por club (attack_types, systems, results, init_types, tags)
player_teams          → player_id, team_id (many-to-many), UNIQUE(player_id, team_id)
team_staff            → team_id, user_id, role (head_coach/assistant_coach), UNIQUE(team_id, user_id)
exercise_shares       → exercise_id, shared_with_user_id, status (pending/accepted/rejected)
subscription_plans    → name, price, features JSONB (Free/Starter/Pro/Elite)   -- facturación de Hoops360/basket-flow AL club
club_subscriptions    → club_id, plan_id, active, start/end_date
macrocycles           → club_id, team_id, name, start/end_date, objectives JSONB
mesocycles            → macrocycle_id, name, phase, start/end_date, objectives JSONB, intensity
microcycles           → mesocycle_id, week_number, start/end_date, focus, load_distribution JSONB, has_match
tactical_objective_catalog → club_id, area (tactical/technical/physical), name, description
objective_achievements→ objective_id, microcycle_id, achieved, notes
documents              → club_id, player_id (nullable), type (licencia/autorizacion/medico/otro), file_url, issued_at, expires_at, status (pending/valid/expired)
player_licenses        → player_id, federation, license_number, season, status, expires_at
announcements          → club_id, team_id (nullable), title, body, created_by, sent_at
announcement_reads     → announcement_id, user_id, read_at, UNIQUE(announcement_id, user_id)
consents               → player_id, guardian_id, consent_type (imagen/datos_medicos/tratamiento_datos), granted_at, revoked_at
fee_plans              → club_id, team_id (nullable), name, amount, frequency (monthly/seasonal/one_time)
player_fees            → player_id, fee_plan_id, due_date, amount, status (pending/paid/overdue/cancelled)
payments               → player_fee_id, amount, method (transfer/cash/bizum/other), registered_by, paid_at, receipt_url   -- registro manual, sin proveedor externo
```

### Funciones RPC importantes

- `seed_match_catalogs(p_club_id UUID)` — Poblar catálogos por defecto
- `get_match_lineup(p_match_id, p_period, p_possession_number)` — Reconstruye quinteto en cualquier momento
- `get_match_stats(p_match_id, p_side)` — Estadísticas agregadas
- `remove_tag_from_exercises(tag_name TEXT)` — Eliminar tag de todos los ejercicios
- `is_guardian_of_player(p_player_id UUID)` — SECURITY DEFINER, usado en RLS para que `family` solo vea sus jugadores vinculados
- `generate_recurring_fees()` — Genera `player_fees` pendientes a partir de `fee_plans` activos (pensada para ejecutarse periódicamente vía Edge Function/cron; no realiza ningún cobro, solo crea el registro pendiente)

### Vistas

- `v_match_summary` — Resumen por partido: posesiones, puntos calculados, PPP own/rival
- `v_overdue_fees` — Cuotas (`player_fees`) en estado overdue, agrupadas por equipo/club
- `v_player_documents_status` — Estado agregado de documentos/licencias por jugador (para el banner de alertas)

### Seguridad

- RLS habilitado en todas las tablas
- Acceso basado en pertenencia al club vía `club_members`
- Función helper `is_club_member_match()` SECURITY DEFINER para evitar recursión
- Acceso de `family` restringido vía `is_guardian_of_player()`: solo lectura de `players`, `documents`, `player_fees`, `payments`, `announcements` correspondientes a sus jugadores vinculados
- `players.is_active` no puede pasar a `true` si no existen los `consents` obligatorios del jugador (trigger de validación)
- Datos sensibles (`player_licenses.license_number`, cualquier campo médico en `documents`) cifrados a nivel de columna (Supabase Vault / `pgsodium`)

---

## Estilo y Diseño (basket-flow)

- **Tema oscuro**: `--bg-primary: #080d3c`, `--text-primary: #dfe0ff`, etc.
- **CSS custom properties** para theming consistente
- **Google Fonts**: Inter + Hanken Grotesk
- **Material Symbols**: iconos tipográficos
- Sidebar responsive con menú hamburguesa en mobile
- SCSS en todos los componentes (inline styles + archivos .scss)
- El portal de familias (`/portal`) reutiliza el mismo tema pero con sidebar simplificado (sin secciones de staff)

---

## Testing

- **Unit tests**: Vitest (`ng test`)
- **E2E tests**: Playwright (configurado en `.agents/opencode.json`)
- Schematics configurados con `skipTests: true` por defecto
- Test types en `tsconfig.spec.json` con `vitest/globals`

---

## Despliegue

| Plataforma | Config | URL |
|---|---|---|
| Netlify | `public/_redirects` (SPA: `/* /index.html 200`) | `planbasket.netlify.app` |
| Vercel | `vercel.json` (build: `ng build`, output: `dist/basket-flow/browser`) | — |

Variables de entorno en `.env.example`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PROJECT_REF`.

---

## Diseño Existente (`design-posesiones/`)

20 documentos de diseño detallados que cubren: especificación funcional, modelo de datos, arquitectura Angular, motor de configuración, UI/UX, flujo de captura, estadísticas, servicios API, roadmap, prompts de IA, motor de vídeo, scouting, dashboard, informes, motor de IA, testing, seguridad, deployment, ADRs, y mejoras futuras.

---

## Convenios de Código

- **Componentes standalone**: Sin NgModules, `imports` en el decorador
- **Inputs/Outputs**: Preferir `input()` y `output()` de Angular Signals sobre `@Input()`/`@Output()`
- **Estado**: Signals (`signal()`, `computed()`, `linkedSignal()`) en lugar de BehaviorSubject
- **HTTP/Supabase**: Llamadas directas con `async/await` desde servicios, no Observable wrappers
- **Lazy loading**: `loadComponent` en todas las rutas
- **Tests**: No se generan automáticamente (`skipTests: true`)
- **Formato**: Prettier con printWidth 100, singleQuote
- **Idioma**: UI en español, código en inglés (tipos, variables, funciones)
- **Estilos**: SCSS, tema oscuro con custom properties

---

## Hoja de Ruta de Implementación (docs 01-05)

Se definieron 5 documentos de especificación técnica en la raíz del proyecto (`01-incongruencias-y-mejoras.md`, `02-solapamientos-e-integracion.md`, `03-planificacion-deportiva.md`, `04-saas-roles-suscripciones.md`, `05-administrativo-financiero-familias.md`). Su contenido ya está integrado aquí y los `.md` originales pueden eliminarse.

### Orden de implementación

| Orden | Documento | Prioridad | Descripción |
|---|---|---|---|
| 1 | 01 — Incongruencias y Mejoras | Alta | Limpieza de datos, refactor, mejoras de flujo |
| 2 | 02 — Solapamientos e Integración | Media | Unificar features duplicadas |
| 3 | 04 — SaaS: Roles y Suscripciones | Alta | Base para monetizar (afecta toda la arquitectura) |
| 4 | 03 — Planificación Deportiva | Feature nueva | Macrociclos/mesociclos/microciclos |
| 5 | 05 — Administrativo, Financiero y Familias | Feature nueva | Documentos/licencias, comunicación, cuotas (registro manual) y portal de familias |

---

## Documento 01: Incongruencias, Mejoras de Flujo y Estructura de Datos

### 1.1 `game_stats` vs `matches` — duplicación de entidades de partido

`game_stats` (migración 001) y `matches` (migración 011) representan lo mismo. Se depreca `game_stats` y `player_game_stats` a favor de `matches` y `possessions`. Se añade `is_home` a `matches` y se crea vista de compatibilidad `v_game_stats_legacy`.

### 1.2 `StatsComponent` (`/stats`) — funcionalidad vacía o duplicada

Se evalúa si tiene contenido único. Si no: redirigir `/stats` → `/matches?tab=stats` y eliminar la ruta y componente.

### 1.3 Inconsistencia en el modelo `Player` de la pizarra táctica

Renombrar `features/tactics/player.model.ts` → `canvas.models.ts` con interfaces `CanvasPlayer`, `CanvasBall`, `CanvasCone`. Actualizar imports en `canvas.service.ts` y `playbook.service.ts`.

### 1.4 `session_exercises` — constraint único en `(session_id, section_id, order)`

Añadir índice y constraint UNIQUE para garantizar orden consistente.

### 1.5 `playbooks` en Supabase vs `localStorage` de `pizarra-tactica`

Documentar decisión arquitectónica y asegurar compatibilidad de schemas JSONB.

### 1.6 FK faltantes en `attendance` y `session_player_reviews`

Añadir `REFERENCES players(id) ON DELETE CASCADE` a ambas tablas.

### 2.1 `DataService` monolítico — migración a Repository pattern

Migración progresiva de `DataService` (50+ métodos) a repositories por feature (`club.repository.ts`, `team.repository.ts`, `player.repository.ts`, etc.). `DataService` queda como facade temporal.

```typescript
interface BaseRepository<T, CreateDto, UpdateDto> {
  findAll(filters?: Record<string, unknown>): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(dto: CreateDto): Promise<T>;
  update(id: string, dto: UpdateDto): Promise<T>;
  remove(id: string): Promise<void>;
}
```

### 2.2 Flujo de creación de sesión

Nueva ruta `/sessions/new` → crea draft → redirige a `/sessions/:id/builder`. Separar `SessionBuilder` de `SessionDetail`.

### 2.3 Gestión de catálogos de partido

En `MatchFormPage`, detectar catálogos vacíos y mostrar banner para inicializar con `seed_match_catalogs()`. O llamar automáticamente al crear club.

### 2.4 AuthGuard — race condition

Leer `isAuthenticated()` en el mismo tick tras `await auth.ready`. Usar `UrlTree` para redirect.

### 3.1 Soft delete

Añadir `deleted_at TIMESTAMPTZ` a `players`, `exercises`, `training_sessions`.

### 3.2 Índices faltantes

```sql
idx_training_sessions_club_date ON training_sessions(club_id, date DESC)
idx_possessions_match_period ON possessions(match_id, period, number)
idx_exercises_club_category ON exercises(club_id, category_id)
idx_evaluations_player_club ON evaluations(player_id, club_id, created_at DESC)
```

### 3.3 Tags como tabla many-to-many

Migración futura: `tags` + `exercise_tag_relations` para reemplazar `exercises.tags TEXT[]`.

### Migraciones asociadas

| Migración | Contenido |
|---|---|
| `012_deprecate_game_stats` | Deprecar `game_stats`/`player_game_stats`, vista compatibilidad, `is_home` en `matches` |
| `013_indexes_and_constraints` | Índices, FK, soft delete, constraint `session_exercises` |
| `014_playbooks_mode` | Columna `mode` en `playbooks` |
| `015_possessions_stats` | Columnas `rebounds`, `assists`, `turnovers`, `fouls` en `possessions` |
| `003_role_permissions` | Tabla `role_permissions`, RLS, seed de permisos por defecto (superadmin configurable) |

---

## Documento 02: Funcionalidades Solapadas e Integración

### Solapamiento 1: Pizarra Táctica + Pizarra Libre

Unificar en `/tactics` con toggle `modeSignal: 'structured' | 'freehand'`. En modo freehand se deshabilitan herramientas estructuradas y se habilitan pincel/goma. Ambos modos comparten fondos, export y persistencia en `playbooks`.

```typescript
modeSignal = signal<TacticsMode>('structured');
// Ruta: { path: 'whiteboard', redirectTo: 'tactics?mode=freehand', pathMatch: 'full' },
```

### Solapamiento 2: `game_stats` / `player_game_stats` vs Sistema de Posesiones

Eliminar `StatsComponent`, redirigir a `/matches`. Añadir métricas opcionales (`rebounds`, `assists`, `turnovers`, `fouls`) a `possessions`.

### Solapamiento 3: Evaluaciones + Análisis post-sesión

Crear vista unificada `/players/:id` con `PlayerDashboardComponent` que consolide evaluaciones formales y reviews de sesión. Nueva RPC `get_player_summary()`.

### Solapamiento 4: `SessionBuilder` + `CalendarComponent`

Añadir clic en día vacío del calendario → `QuickSessionDialogComponent` → crear sesión draft → redirigir a builder.

### Solapamiento 5: Sidebar con `/configuration`

Mover configuración contextual inline: categorías de ejercicios desde `/exercises`, catálogos de partido desde `/matches`. `/configuration` solo para admin.

---

## Documento 03: Planificación Deportiva — Macrociclos, Mesociclos, Microciclos

### Jerarquía de planificación

```
MACROCICLO (temporada, 6-12 meses)
  └── MESOCICLO (bloque, 4-8 semanas, con fase: preseason/competition/peak/etc.)
        └── MICROCICLO (semana, con distribución de carga y foco)
              └── SESIÓN (ya existe) → EJERCICIO (ya existe)
```

### Nuevas tablas

| Tabla | Descripción |
|---|---|
| `macrocycles` | Temporada: nombre, fechas, objetivos globales, equipo |
| `mesocycles` | Bloque: fase (preseason/competition/peak/etc), objetivos tácticos/técnicos/físicos, intensidad |
| `microcycles` | Semana: número, fechas, foco, distribución de carga, partido |
| `tactical_objective_catalog` | Catálogo reutilizable de objetivos por área táctica |
| `objective_achievements` | Seguimiento de cumplimiento de objetivos |

### Conexión con entidades existentes

- `training_sessions.microcycle_id` (FK nueva, nullable)
- `v_microcycle_sessions`: sesiones vinculadas a cada microciclo
- `v_macrocycle_summary`: resumen de macrociclo con conteos

### Auto-generación de microciclos

`PlanningService.generateMicrocycles()` crea microciclos semanales desde fechas del mesociclo con distribución de carga por defecto según `plannedSessionsPerWeek`.

### Routing

```
/planning → PlanningOverviewComponent (lista de macrociclos)
/planning/new → MacrocycleFormComponent
/planning/:macrocycleId → MacrocycleDetailComponent (mesociclos)
/planning/:macrocycleId/mesocycles/new → MesocycleFormComponent
/planning/:macrocycleId/mesocycles/:mesocycleId → MesocycleDetailComponent (microciclos)
/planning/:macrocycleId/mesocycles/:mesocycleId/microcycles/:microcycleId → MicrocycleDetailComponent
```

### Estructura Angular (`features/planning/`)

```
pages/         → 6 páginas (overview, forms, details)
components/    → objective-editor, cycle-timeline, weekly-load-grid, achievement-card, sessions-panel
models/        → planning.models.ts
repositories/  → planning.repository.ts
services/      → planning.service.ts (auto-generate, load distribution)
store/         → planning.store.ts (Signal store)
```

---

## Documento 04: SaaS — Superadmin, Roles y Suscripciones

### Jerarquía de roles

```
SUPERADMIN → CLUB_ADMIN (1/club) → TEAM_ADMIN (N) → COACH (N)
                                                        └── FAMILY (N, ver Documento 05 — solo lectura, vinculado a jugador/es)
```

### Permisos por rol

| Recurso | Superadmin | Club Admin | Team Admin | Coach | Family |
|---|---|---|---|---|---|
| Superadmin panel | ✅ | ❌ | ❌ | ❌ | ❌ |
| Suscripciones | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar club | ✅ | ✅ | ❌ | ❌ | ❌ |
| Miembros del club | ✅ | ✅ | ❌ | ❌ | ❌ |
| Staff de equipos | ✅ | ✅ | ✅ | ❌ | ❌ |
| Equipos/jugadores | ✅ | ✅ | ✅ | ✅ | 👁 (solo su jugador) |
| Sesiones/planning | ✅ | ✅ | ✅ | ✅ | ❌ |
| Match analysis | ✅ | ✅ | ✅ | ✅ | ❌ |
| Evaluaciones | ✅ | ✅ | ✅ | ✅ | ❌ |
| Configuración | ✅ | ✅ | ❌ | ❌ | ❌ |
| Documentos/licencias | ✅ | ✅ | ✅ | ❌ | 👁 (propios) |
| Comunicación (avisos) | ✅ | ✅ | ✅ | ✅ | 👁 |
| Finanzas/cuotas | ✅ | ✅ | ❌ | ❌ | 👁 (propias) |

> Los permisos son **configurables** por superadmin en `/superadmin/permissions`. La tabla de arriba refleja la configuración por defecto.

### Modelo de datos

- `profiles.is_superadmin BOOLEAN`
- `subscription_plans`: Free, Starter, Pro, Elite (con límites y feature flags)
- `club_subscriptions`: 1 suscripción activa por club (FK a club + plan)
- `v_club_features`: vista que expone features activas de cada club
- Trigger `enforce_single_club_admin`: solo 1 admin por club

### Route Guards

- `superadminGuard` — protege rutas `/superadmin/*`
- `clubAdminGuard` — protege `/clubs/:id/members` y `/finance/*` (superadmin, club_admin del club)
- `familyGuard` — protege `/portal/*` (solo usuarios con rol `family` vinculados a algún jugador)
- `featureGuard('match_analysis')` — feature gate function (misma factory usada para `documents`, `announcements`, `finance`)
- `FeatureFlagDirective` — directiva `*appFeatureFlag` para ocultar UI
- `SubscriptionService` — signals: `hasMatchAnalysis`, `hasPlanning`, `hasTactics`, `hasEvaluations`, `hasDocuments`, `hasAnnouncements`, `hasFinance`
- Sidebar dinámico con `visibleItems` computed según rol + suscripción

### Permission System

- `role_permissions` tabla DB: `(role, permission, granted)` con PK compuesta — el enum `role` incluye ahora `family`
- `PermissionService` (`core/services/permission.service.ts`): cache signal cargada desde `AuthService._initSession()`
- `hasPermission(role, permission)` usado por `clubAdminGuard`, `familyGuard` y componentes (teams, club-members, finance, documents)
- `updatePermission(role, permission, granted)` para toggles en tiempo real
- Permisos actuales: `club.members.manage`, `team.staff.manage`, `team.manage`, `player.manage`, `session.manage`, `exercise.manage`, `evaluation.manage`, `match.manage`, `planning.manage`, `configuration.manage`, `tactics.manage`, `attendance.manage`, `documents.manage`, `announcements.manage`, `finance.manage`, `advanced_stats.manage`
- Seed por defecto: club_admin tiene todos los permisos. team_admin tiene todos excepto `club.members.manage`, `configuration.manage`, `documents.manage`, `announcements.manage`, `finance.manage`, `advanced_stats.manage`. coach tiene `player.manage`, `session.manage`, `exercise.manage`, `evaluation.manage`, `match.manage`, `tactics.manage`, `attendance.manage`.

### Panel de Superadmin (`/superadmin`)

Rutas anidadas: `clubs`, `clubs/:id`, `plans`, `permissions`, `users`. Funcionalidad: asignar planes, gestionar suscripciones, CRUD de planes, permisos por rol, promover/revocar superadmins.

### Página `/upgrade`

Muestra planes disponibles con sus features. Botón "Contactar" → mailto al administrador del producto.

### Migraciones asociadas

| Migración | Contenido |
|---|---|
| `016_saas_subscriptions` | Tablas `subscription_plans`, `club_subscriptions`, vistas, funciones helper RLS, triggers |
| `003_role_permissions` | Tabla `role_permissions`, RLS, seed de permisos por defecto |

---

## Documento 05: Módulo Administrativo, Financiero y Familias

### Contexto

Este módulo incorpora al producto lo planteado en el análisis de transformación digital para un club de baloncesto (documentación de referencia "Hoops360"): la parte administrativa (documentos, licencias, comunicación) y financiera (cuotas) que antes se gestionaba fuera de la aplicación (Excel, WhatsApp, control manual de pagos), además de un nuevo actor, la **familia**, que hasta ahora no tenía ningún acceso a la plataforma.

**Importante**: en esta fase no se integra ninguna pasarela de pago externa. El módulo financiero es un **registro estructurado** de cuotas e ingresos (quién debe qué, quién ha pagado, cuándo y por qué medio), introducido manualmente por administración del club. No hay cobro automatizado ni conexión con proveedores de pago.

### Nuevo rol: `family` (tutor/familiar)

Se añade un cuarto rol operativo a la jerarquía existente, con acceso muy restringido y de solo lectura:

- No es miembro de `club_members` (que es para staff), sino de una tabla nueva `player_guardians` (player_id, user_id o email, relationship, can_view_payments, can_view_documents).
- Permisos vía `role_permissions` ya existente, extendiendo el enum de roles con `family`.
- Acceso limitado a: ficha básica del hijo/a, calendario del equipo, estado de pagos propios, documentos propios y avisos del equipo/club.
- Se invita por email; si el email coincide con un usuario ya registrado se vincula automáticamente, si no, queda pendiente hasta que ese usuario se registre.

### Módulo Administrativo — nuevas tablas

| Tabla | Descripción |
|---|---|
| `documents` | club_id, player_id (nullable), type (licencia/autorización/médico/otro), file_url, issued_at, expires_at, status (pending/valid/expired) |
| `player_licenses` | player_id, federation, license_number, season, status, expires_at |
| `announcements` | club_id, team_id (nullable), title, body, created_by, sent_at — comunicación centralizada como sustituto de WhatsApp |
| `announcement_reads` | announcement_id, user_id, read_at |

**Funcionalidades:**
- Alertas de documentos/licencias próximos a vencer (dashboard + banner, mismo patrón que el banner de catálogos vacíos ya implementado en `MatchFormPage`).
- Import masivo de jugadores vía CSV/Excel (onboarding) — reutiliza `PlayerRepository.create()` en batch.

**Rutas**: ver bloque de Routing (`/documents`, `/documents/:playerId`, `/announcements`, `/announcements/new`, `/onboarding/import-players`).

### Módulo Financiero — nuevas tablas

Distinto de `subscription_plans`/`club_subscriptions` (que ya existen y son la facturación de **basket-flow al club**). Aquí se trata del control de cuotas **del club a sus jugadores/familias**, sin automatizar el cobro.

| Tabla | Descripción |
|---|---|
| `fee_plans` | club_id, team_id (nullable), name, amount, frequency (monthly/seasonal/one_time) |
| `player_fees` | player_id, fee_plan_id, due_date, amount, status (pending/paid/overdue/cancelled) |
| `payments` | player_fee_id, amount, method (transfer/cash/bizum/other), registered_by, paid_at, receipt_url — **registro manual introducido por administración**, sin proveedor de pago externo |

**Funcionalidades:**
- Generación automática (programada) de `player_fees` pendientes a partir de `fee_plans`, sin ningún cobro real asociado — solo crea el registro de deuda.
- Marcado manual de un `player_fee` como pagado, creando el `payment` correspondiente (fecha, importe, método, quién lo registró).
- Vista de impagos por equipo/club (`v_overdue_fees`).
- Generación de recibo simple en PDF (reutilizando jsPDF, ya en el stack) a partir de un `payment`.
- Sin checkout, sin webhooks, sin conciliación automática: toda la parte de "recibir el dinero" sigue ocurriendo fuera de la app (transferencia, efectivo, bizum...) y solo se refleja aquí a posteriori.

**Rutas**: ver bloque de Routing (`/finance`, `/finance/fee-plans`, `/finance/fee-plans/new`, `/finance/payments`, `/finance/players/:id`).

**Permisos nuevos** en `role_permissions`: `finance.manage` (club_admin), `finance.view_own` (family, sobre sus propios jugadores).

### RGPD y datos de menores (transversal, no es un módulo sino requisitos)

- Tabla `consents` (player_id, guardian_id, consent_type: imagen/datos_médicos/tratamiento_datos, granted_at, revoked_at) — obligatorio antes de poder marcar a un jugador como `is_active`.
- Cifrado a nivel de columna para `player_licenses.license_number` y cualquier dato médico en `documents` (Supabase Vault o `pgsodium`).
- Los `family` solo pueden ver el/los jugador/es vinculados vía RLS (`is_guardian_of_player()` SECURITY DEFINER, mismo patrón que `is_club_member_match()`).

### Onboarding (mejora de UX, no tablas nuevas)

Wizard tras crear club por primera vez: 1) crear equipos → 2) importar jugadores (CSV) → 3) invitar staff → 4) configurar `fee_plans` (opcional, se puede saltar) → 5) seed de catálogos de partido (reutiliza `seed_match_catalogs()`, ya existente).

### Analítica interna de producto (superadmin, no de negocio del club)

Reutilizar logs de Supabase o una tabla `usage_events` ligera para medir: clubes activos, módulos más usados, tiempo hasta primera sesión creada. Alimenta `/superadmin` con indicadores tipo clubes en trial, adopción por módulo — no sustituye ni compite con el módulo financiero del club, que es de uso interno del club, no de basket-flow.

### Migraciones asociadas

| Migración | Contenido |
|---|---|
| `017_family_role_and_guardians` | Rol `family` en `role_permissions`, tabla `player_guardians`, función `is_guardian_of_player()`, RLS asociada |
| `018_documents_and_licenses` | Tablas `documents`, `player_licenses`, vista `v_player_documents_status` |
| `019_announcements` | Tablas `announcements`, `announcement_reads` |
| `020_consents` | Tabla `consents`, trigger de validación sobre `players.is_active` |
| `021_finance_fee_tracking` | Tablas `fee_plans`, `player_fees`, `payments` (sin integración de pago externo), función `generate_recurring_fees()`, vista `v_overdue_fees` |

### Lo que deliberadamente NO se incorpora ahora

Pasarela de pago real (Stripe/Redsys u otra), wearables, vídeo-análisis, IA predictiva de lesiones y CRM/marketing externo — quedan fuera de esta fase. Si en el futuro se decide automatizar el cobro, `payments.external_payment_id` y `payments.provider` podrán añadirse en una migración posterior sin romper el modelo actual (los pagos manuales seguirían siendo válidos con esos campos en `NULL`).

---

## Notas para Agentes

- **No modificar** archivos en `design-posesiones/` (son documentación de diseño)
- **No modificar** `.agents/` (skills de IA)
- **No generar tests** a menos que se solicite explícitamente
- **No añadir emojis** a menos que el usuario lo pida
- **No crear archivos MD** de documentación a menos que se solicite
- **Los ficheros 01-05.md en la raíz pueden eliminarse** — su contenido ya está integrado en este AGENTS.md
- La app **pizarra-tactica** es independiente (sin backend) — no usar Supabase allí
- El archivo `fabric` tiene un postinstall patch (`scripts/patch-fabric.js`) para eliminar dependencia de jsdom
- **Schema consolidado**: Un único archivo `basket-flow/supabase/migrations/001_initial_schema.sql` contiene el esquema completo (resultado de consolidar 001-023). Para cambios futuros, crear `002_xxx.sql` (ya existe `002_add_archived_at_to_players.sql`); las migraciones del Documento 05 continúan la numeración a partir de `017_`.
- **Soft delete**: `players`, `exercises`, `training_sessions` tienen `deleted_at TIMESTAMPTZ`. Todos los `find*` en repositories filtran `.is('deleted_at', null)`.
- **Attendance status**: `'present' | 'absent' | 'late' | 'excused' | 'injured'`
- **Financiero sin pasarela de pago**: no implementar checkout, webhooks ni SDKs de proveedores de pago en `finance/` a menos que se solicite explícitamente en el futuro. El módulo actual es de registro y seguimiento manual.
- **Rol `family`**: siempre de solo lectura salvo, opcionalmente, la subida de sus propios documentos si `can_view_documents`/upload se habilita explícitamente; nunca debe poder ver datos de jugadores a los que no está vinculado en `player_guardians`.

---

## Historial de Sesiones

### 2026-07-04 — Implementación 3 features pendientes

Se implementaron las 3 funcionalidades documentadas en AGENTS.md que aún no estaban desarrolladas:

1. **Banner catálogos vacíos en MatchFormPage**: Detecta cuando `attack_types`/`results`/`init_types` están vacíos y muestra un warning con botón "Inicializar catálogos". Llama a `configuration.repository.seedMatchCatalogs()`.

2. **QuickSession en calendario**: `CalendarComponent.selectDay()` ahora abre el formulario inline de creación rápida al hacer clic en un día sin sesiones (antes requería el botón "Nueva sesión").

3. **Sidebar dinámico con role + feature flags**: `MainLayoutComponent` ahora usa un `computed` que filtra los items del menú según:
   - **Feature flags** (`SubscriptionService`): match_analysis, planning, tactics, evaluations
   - **Role** (club_members): assistant no ve "Crear Sesión"/"Configuración" (cuando exista), solo superadmin ve "Admin"
   - El role se carga asíncronamente desde `club_members` al iniciar

Build verificado: `ng build` exitoso sin errores.

### 2026-07-05 — Validación mínimos club_admin/head_coach + PermissionService configurable

1. **Validación de mínimos**: En club-detail page y club-members component, no permite eliminar o degradar al último `club_admin`. En teams staff modal, no permite eliminar al último `head_coach`.

2. **Restricción de acceso**: Solo club_admin/superadmin pueden gestionar staff de equipos (antes cualquiera podía).

3. **Nueva ruta `/clubs/:id/members`**: Accesible por superadmin o club_admin del club (vía `clubAdminGuard`). Gestión de miembros: añadir/eliminar/cambiar rol.

4. **PermissionService** (`core/services/permission.service.ts`): Sistema de permisos configurable. Cargado desde `AuthService._initSession()`.

5. **Página `/superadmin/permissions`**: Tabla con toggles para 10 permisos × 3 roles. Los cambios persisten en `role_permissions` DB.

6. **Migración** `003_role_permissions.sql`: tabla + RLS + seed.

Build verificado: `ng build` exitoso.

### 2026-07-05 — Especificación Documento 05: Administrativo, Financiero y Familias

Se documenta (sin implementar aún) el nuevo módulo derivado del análisis de transformación digital para clubes de baloncesto:

1. **Nuevo rol `family`** y tabla `player_guardians` para vincular tutores a jugadores, con acceso de solo lectura vía portal propio (`/portal`).
2. **Módulo documental**: `documents`, `player_licenses`, alertas de vencimiento, `announcements`/`announcement_reads` como sustituto de la comunicación por WhatsApp.
3. **Módulo financiero sin pasarela de pago**: `fee_plans`, `player_fees`, `payments` como registro manual de cuotas e ingresos, generación periódica de cuotas pendientes vía `generate_recurring_fees()`, vista `v_overdue_fees`, recibos en PDF con jsPDF. Explícitamente fuera de alcance: integración con Stripe/Redsys u otro proveedor.
4. **RGPD/menores**: tabla `consents` como requisito para activar un jugador, cifrado de campos sensibles, RLS basada en `is_guardian_of_player()`.
5. **Onboarding**: wizard de alta de club (equipos → import de jugadores → staff → cuotas opcional → catálogos).
6. Roles y permisos (`role_permissions`, tablas de Documento 04) actualizados para incluir `family` y los nuevos permisos `document.manage`, `document.view_own`, `announcement.manage`, `finance.manage`, `finance.view_own`.

Implementado en 2026-07-05 (ver sesión siguiente).

### 2026-07-05 — Implementación completa Documento 05 y mejoras

Se implementaron todas las features del Documento 05 en una sesión continua:

1. **Rutas Documento 05**: `/documents`, `/documents/:playerId`, `/announcements`, `/announcements/new`, `/finance/*`, `/portal/*`, `/onboarding`
2. **Sidebar dinámico familiar**: Modo simplificado para rol `family` (solo Portal, Calendario, Comunicación)
3. **Announcements**: `announcement.repository.ts`, `announcement.service.ts`, listado y formulario, tracking de lectura
4. **Finance**: `fee-plan.repository.ts`, `player-fee.repository.ts`, `payment.repository.ts`, `finance.store.ts`, 5 páginas (overview, fee-plans, fee-plan-form, payments-list, player-finance-detail), `finance.service.ts` (generateRecurringFees)
5. **PDF Recibos**: `receipt.service.ts` con jsPDF, botones de descarga en player-finance-detail y family-player-detail
6. **Family Portal**: `family-portal.component.ts`, `family-player-detail.component.ts`, guard `family.guard.ts`
7. **Consents UI**: `consent.repository.ts`, integración en player-documents.page.ts (grant/revoke)
8. **DocumentService**: `services/document.service.ts` con alertas de vencimiento y status agregado
9. **Onboarding Wizard**: `OnboardingWizardComponent` 5 pasos (equipos → jugadores → staff → cuotas → catálogos)
10. **Planning components**: 3 componentes nuevos (`objective-editor`, `achievement-card`, `sessions-panel`)
11. **Whiteboard redirect**: `/whiteboard` → `/tactics?mode=freehand`
12. **SQL**: Migración `022_microcycle_sessions_view.sql`, vista `v_microcycle_sessions` aplicada

Build verificado: `ng build` exitoso sin errores (warnings pre-existentes de html2canvas/canvg/fabric).