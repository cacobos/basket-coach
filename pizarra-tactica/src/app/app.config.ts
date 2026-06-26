import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/editor', pathMatch: 'full' },
  { path: 'editor', loadComponent: () => import('./app').then(m => m.App) },
  { path: 'whiteboard', loadComponent: () => import('./whiteboard/whiteboard.component').then(m => m.WhiteboardComponent) },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ]
};
