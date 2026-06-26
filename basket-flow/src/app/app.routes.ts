import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./features/dashboard/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'clubs', loadComponent: () => import('./features/clubs/clubs.component').then(m => m.ClubsComponent) },
      { path: 'teams', loadComponent: () => import('./features/teams/teams.component').then(m => m.TeamsComponent) },
      { path: 'players', loadComponent: () => import('./features/players/players.component').then(m => m.PlayersComponent) },
      { path: 'attendance', loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent) },
      { path: 'tactics', loadComponent: () => import('./features/tactics/tactics.component').then(m => m.TacticsComponent) },
      { path: 'whiteboard', loadComponent: () => import('./features/whiteboard/whiteboard.component').then(m => m.WhiteboardComponent) },
      { path: 'stats', loadComponent: () => import('./features/stats/stats.component').then(m => m.StatsComponent) },
      { path: 'exercises', loadComponent: () => import('./features/exercises/exercises.component').then(m => m.ExercisesComponent) },
      { path: 'exercises/new', loadComponent: () => import('./features/exercises/exercise-form.component').then(m => m.ExerciseFormComponent) },
      { path: 'exercises/:id/edit', loadComponent: () => import('./features/exercises/exercise-form.component').then(m => m.ExerciseFormComponent) },
      { path: 'exercises/tags', loadComponent: () => import('./features/exercises/tags.component').then(m => m.TagsComponent) },
      { path: 'sessions', loadComponent: () => import('./features/sessions/sessions.component').then(m => m.SessionsComponent) },
      { path: 'sessions/:id', loadComponent: () => import('./features/sessions/session-detail.component').then(m => m.SessionDetailComponent) },
      { path: 'session-builder', loadComponent: () => import('./features/sessions/session-builder.component').then(m => m.SessionBuilderComponent) },
      { path: 'calendar', loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarComponent) },
      { path: 'evaluations', loadComponent: () => import('./features/evaluations/evaluations.component').then(m => m.EvaluationsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
