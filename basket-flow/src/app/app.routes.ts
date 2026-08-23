import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { featureGuard } from './core/guards/feature.guard';
import { superadminGuard } from './core/guards/superadmin.guard';
import { adminGuard } from './core/guards/admin.guard';
import { clubAdminGuard } from './core/guards/club-admin.guard';
import { familyGuard } from './core/guards/family.guard';
import { calendarRedirectGuard } from './core/guards/calendar-redirect.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./features/dashboard/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'clubs', loadComponent: () => import('./features/clubs/clubs.component').then(m => m.ClubsComponent) },
      { path: 'clubs/:id/members', canActivate: [clubAdminGuard], loadComponent: () => import('./features/clubs/club-members.component').then(m => m.ClubMembersComponent) },
      { path: 'clubs/:id/settings', canActivate: [clubAdminGuard], loadComponent: () => import('./features/clubs/club-settings.component').then(m => m.ClubSettingsComponent) },
      { path: 'teams', loadComponent: () => import('./features/teams/teams.component').then(m => m.TeamsComponent) },
      { path: 'players', loadComponent: () => import('./features/players/players.component').then(m => m.PlayersComponent) },
      { path: 'players/:id', loadComponent: () => import('./features/players/player-dashboard.component').then(m => m.PlayerDashboardComponent) },
      { path: 'attendance', redirectTo: 'evaluations', pathMatch: 'full' },
      { path: 'tactics', canActivate: [featureGuard('tactics')], loadComponent: () => import('./features/tactics/tactics.component').then(m => m.TacticsComponent) },
      { path: 'whiteboard', redirectTo: 'tactics?mode=freehand', pathMatch: 'full' },
      { path: 'stats', redirectTo: 'matches', pathMatch: 'full' },
      { path: 'exercises', loadComponent: () => import('./features/exercises/exercises.component').then(m => m.ExercisesComponent) },
      { path: 'exercises/new', loadComponent: () => import('./features/exercises/exercise-form.component').then(m => m.ExerciseFormComponent) },
      { path: 'exercises/:id/edit', loadComponent: () => import('./features/exercises/exercise-form.component').then(m => m.ExerciseFormComponent) },
      { path: 'exercises/tags', loadComponent: () => import('./features/exercises/tags.component').then(m => m.TagsRedirectComponent) },
      { path: 'sessions', loadComponent: () => import('./features/sessions/sessions.component').then(m => m.SessionsComponent) },
      { path: 'sessions/new', loadComponent: () => import('./features/sessions/session-new.component').then(m => m.SessionNewComponent) },
      { path: 'sessions/:id', loadComponent: () => import('./features/sessions/session-detail.component').then(m => m.SessionDetailComponent) },
      { path: 'sessions/:id/builder', loadComponent: () => import('./features/sessions/session-builder.component').then(m => m.SessionBuilderComponent) },
      { path: 'sessions/:id/analysis', loadComponent: () => import('./features/sessions/session-analysis.component').then(m => m.SessionAnalysisComponent) },
      { path: 'session-builder', redirectTo: 'sessions/new', pathMatch: 'full' },
      { path: 'calendar', canActivate: [calendarRedirectGuard], loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarComponent) },
      { path: 'evaluations', canActivate: [featureGuard('evaluations')], loadComponent: () => import('./features/evaluations/evaluations.component').then(m => m.EvaluationsComponent) },
      { path: 'matches', canActivate: [featureGuard('match_analysis')], loadComponent: () => import('./features/matches/pages/match-list.page').then(m => m.MatchListPage) },
      { path: 'matches/new', canActivate: [featureGuard('match_analysis')], loadComponent: () => import('./features/matches/pages/match-form.page').then(m => m.MatchFormPage) },
      { path: 'matches/:id', canActivate: [featureGuard('match_analysis')], loadComponent: () => import('./features/matches/pages/match-detail.page').then(m => m.MatchDetailPage) },
      { path: 'matches/:id/live', canActivate: [featureGuard('match_analysis')], loadComponent: () => import('./features/matches/pages/match-live.page').then(m => m.MatchLivePage) },
      { path: 'configuration', canActivate: [adminGuard], loadComponent: () => import('./features/configuration/catalog-admin.page').then(m => m.CatalogAdminPage) },
      { path: 'planning', canActivate: [featureGuard('planning')], loadComponent: () => import('./features/planning/pages/planning-overview.component').then(m => m.PlanningOverviewComponent) },
      { path: 'planning/new', canActivate: [featureGuard('planning')], loadComponent: () => import('./features/planning/pages/macrocycle-form.component').then(m => m.MacrocycleFormComponent) },
      { path: 'planning/:macrocycleId', canActivate: [featureGuard('planning')], loadComponent: () => import('./features/planning/pages/macrocycle-detail.component').then(m => m.MacrocycleDetailComponent) },
      { path: 'planning/:macrocycleId/mesocycles/new', canActivate: [featureGuard('planning')], loadComponent: () => import('./features/planning/pages/mesocycle-form.component').then(m => m.MesocycleFormComponent) },
      { path: 'planning/:macrocycleId/mesocycles/:mesocycleId', canActivate: [featureGuard('planning')], loadComponent: () => import('./features/planning/pages/mesocycle-detail.component').then(m => m.MesocycleDetailComponent) },
      { path: 'planning/:macrocycleId/mesocycles/:mesocycleId/microcycles/:microcycleId', canActivate: [featureGuard('planning')], loadComponent: () => import('./features/planning/pages/microcycle-detail.component').then(m => m.MicrocycleDetailComponent) },
      { path: 'documents', canActivate: [featureGuard('documents')], loadComponent: () => import('./features/documents/pages/documents-list.page').then(m => m.DocumentsListPage) },
      { path: 'documents/:playerId', canActivate: [featureGuard('documents')], loadComponent: () => import('./features/documents/pages/player-documents.page').then(m => m.PlayerDocumentsPage) },
      { path: 'announcements', loadComponent: () => import('./features/announcements/pages/announcements-list.page').then(m => m.AnnouncementsListPage) },
      { path: 'announcements/new', canActivate: [adminGuard, featureGuard('announcements')], loadComponent: () => import('./features/announcements/pages/announcement-form.component').then(m => m.AnnouncementFormComponent) },
      { path: 'finance', canActivate: [clubAdminGuard, featureGuard('finance')], loadComponent: () => import('./features/finance/pages/finance-overview.page').then(m => m.FinanceOverviewComponent) },
      { path: 'finance/fee-plans', canActivate: [clubAdminGuard, featureGuard('finance')], loadComponent: () => import('./features/finance/pages/fee-plans.page').then(m => m.FeePlansComponent) },
      { path: 'finance/fee-plans/new', canActivate: [clubAdminGuard, featureGuard('finance')], loadComponent: () => import('./features/finance/pages/fee-plan-form.component').then(m => m.FeePlanFormComponent) },
      { path: 'finance/payments', canActivate: [clubAdminGuard, featureGuard('finance')], loadComponent: () => import('./features/finance/pages/payments-list.page').then(m => m.PaymentsListComponent) },
      { path: 'finance/players/:id', canActivate: [clubAdminGuard, featureGuard('finance')], loadComponent: () => import('./features/finance/pages/player-finance-detail.page').then(m => m.PlayerFinanceDetailComponent) },
      { path: 'portal', canActivate: [familyGuard], loadComponent: () => import('./features/portal/family-portal.component').then(m => m.FamilyPortalComponent) },
      { path: 'portal/players/:id', canActivate: [familyGuard], loadComponent: () => import('./features/portal/family-player-detail.component').then(m => m.FamilyPlayerDetailComponent) },
      { path: 'onboarding', canActivate: [adminGuard], loadComponent: () => import('./features/onboarding/onboarding-wizard.component').then(m => m.OnboardingWizardComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  {
    path: 'upgrade',
    loadComponent: () => import('./features/upgrade/upgrade.component').then(m => m.UpgradeComponent),
  },
  {
    path: 'superadmin',
    canActivate: [authGuard, superadminGuard],
    loadComponent: () => import('./features/superadmin/superadmin.component').then(m => m.SuperadminComponent),
    children: [
      { path: 'clubs', loadComponent: () => import('./features/superadmin/clubs-page.component').then(m => m.SuperadminClubsPage) },
      { path: 'clubs/:id', loadComponent: () => import('./features/superadmin/club-detail-page.component').then(m => m.SuperadminClubDetailPage) },
      { path: 'plans', loadComponent: () => import('./features/superadmin/plans-page.component').then(m => m.SuperadminPlansPage) },
      { path: 'permissions', loadComponent: () => import('./features/superadmin/permissions-page.component').then(m => m.SuperadminPermissionsPage) },
      { path: 'users', loadComponent: () => import('./features/superadmin/users-page.component').then(m => m.SuperadminUsersPage) },
      { path: '', redirectTo: 'clubs', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
