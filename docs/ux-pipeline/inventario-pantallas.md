# Inventario de pantallas — basket-flow (planbasket)

Generado desde `basket-flow/src/app/app.routes.ts` — 2026-08-22.
Total: **40 rutas efectivas** (excluye redirects) en 3 zonas de acceso.

## Zona pública (sin autenticación)

| Ruta | Componente | Propósito |
|---|---|---|
| `/login` | LoginComponent | Inicio de sesión (Google OAuth + email) |
| `/upgrade` | UpgradeComponent | Planes disponibles / contacto |

## Zona principal (authGuard + MainLayout con sidebar)

### Núcleo diario
| Ruta | Guard extra | Componente | Propósito |
|---|---|---|---|
| `/dashboard` | — | DashboardComponent | Panel principal + alertas de documentos |
| `/calendar` | — | CalendarComponent | Calendario de sesiones (clic en día = quick session) |
| `/sessions` | — | SessionsComponent | Listado de entrenamientos |
| `/sessions/new` | — | SessionNewComponent | Crea draft → redirige al builder |
| `/sessions/:id` | — | SessionDetailComponent | Detalle + secciones + asistencia |
| `/sessions/:id/builder` | — | SessionBuilderComponent | Constructor visual de sesión |
| `/sessions/:id/analysis` | — | SessionAnalysisComponent | Análisis post-sesión |

### Partidos y estadísticas
| Ruta | Guard extra | Componente | Propósito |
|---|---|---|---|
| `/matches` | featureGuard(match_analysis) | MatchListPage | Listado de partidos |
| `/matches/new` | featureGuard(match_analysis) | MatchFormPage | Crear partido (+ banner catálogos vacíos) |
| `/matches/:id` | featureGuard(match_analysis) | MatchDetailPage | Detalle, stats, lineup |
| `/matches/:id/live` | featureGuard(match_analysis) | MatchLivePage | Tracking en vivo por posesiones |

### Plantilla
| Ruta | Guard extra | Componente | Propósito |
|---|---|---|---|
| `/players` | — | PlayersComponent | CRUD jugadores |
| `/players/:id` | — | PlayerDashboardComponent | Ficha consolidada (evaluaciones + reviews) |
| `/teams` | — | TeamsComponent | CRUD equipos + staff |
| `/evaluations` | featureGuard(evaluations) | EvaluationsComponent | Evaluaciones 1-10 (9 categorías) |
| `/exercises` | — | ExercisesComponent | Biblioteca de ejercicios |
| `/exercises/new` · `/:id/edit` | — | ExerciseFormComponent | Formulario ejercicio/variantes |
| `/exercises/tags` | — | TagsComponent | Gestión de tags |
| `/tactics` | featureGuard(tactics) | TacticsComponent | Pizarra táctica (structured/freehand) |

### Planificación deportiva
| Ruta | Guard extra | Componente |
|---|---|---|
| `/planning` | featureGuard(planning) | PlanningOverviewComponent |
| `/planning/new` | featureGuard(planning) | MacrocycleFormComponent |
| `/planning/:m` | featureGuard(planning) | MacrocycleDetailComponent |
| `/planning/:m/mesocycles/new` | featureGuard(planning) | MesocycleFormComponent |
| `/planning/:m/mesocycles/:me` | featureGuard(planning) | MesocycleDetailComponent |
| `/planning/:m/mesocycles/:me/microcycles/:mi` | featureGuard(planning) | MicrocycleDetailComponent |

### Administración del club
| Ruta | Guard extra | Componente | Propósito |
|---|---|---|---|
| `/clubs` | — | ClubsComponent | Lista/selector clubes + crear |
| `/clubs/:id/members` | clubAdminGuard | ClubMembersComponent | Miembros y roles |
| `/clubs/:id/settings` | clubAdminGuard | ClubSettingsComponent | Ajustes del club |
| `/configuration` | adminGuard | CatalogAdminPage | Catálogos (ejercicios y partido) |
| `/onboarding` | adminGuard | OnboardingWizardComponent | Wizard alta club (5 pasos) |

### Documentos y comunicación
| Ruta | Guard extra | Componente | Propósito |
|---|---|---|---|
| `/documents` | featureGuard(documents) | DocumentsListPage | Documentos/licencias por jugador |
| `/documents/:playerId` | featureGuard(documents) | PlayerDocumentsPage | Documentos + consentimientos |
| `/announcements` | — | AnnouncementsListPage | Avisos del club/equipo |
| `/announcements/new` | adminGuard + featureGuard(announcements) | AnnouncementFormComponent | Crear aviso |

### Finanzas (cuotas del club a familias)
| Ruta | Guard extra | Componente |
|---|---|---|
| `/finance` | clubAdminGuard + featureGuard(finance) | FinanceOverviewComponent |
| `/finance/fee-plans` | clubAdminGuard + featureGuard(finance) | FeePlansComponent |
| `/finance/fee-plans/new` | clubAdminGuard + featureGuard(finance) | FeePlanFormComponent |
| `/finance/payments` | clubAdminGuard + featureGuard(finance) | PaymentsListComponent |
| `/finance/players/:id` | clubAdminGuard + featureGuard(finance) | PlayerFinanceDetailComponent |

## Portal familias (familyGuard)

| Ruta | Componente | Propósito |
|---|---|---|
| `/portal` | FamilyPortalComponent | Resumen del/de los jugadores vinculados |
| `/portal/players/:id` | FamilyPlayerDetailComponent | Detalle: cuotas, docs, avisos |

## Superadmin (superadminGuard)

| Ruta | Componente |
|---|---|
| `/superadmin/clubs` · `/clubs/:id` | SuperadminClubsPage / ClubDetailPage |
| `/superadmin/plans` | SuperadminPlansPage |
| `/superadmin/permissions` | SuperadminPermissionsPage |
| `/superadmin/users` | SuperadminUsersPage |

## Redirects existentes

`/attendance`→evaluations · `/whiteboard`→tactics?mode=freehand · `/stats`→matches · `/session-builder`→sessions/new · `''`(raíz)→**portal** ⚠

> ⚠ Observación para auditoría: la raíz redirige a `/portal` (ruta familyGuard), no a `/dashboard`. Un coach/superadmin sin rol family que entra a la app depende del comportamiento del familyGuard para acabar en un sitio sensato. Verificar en Fase 2.
