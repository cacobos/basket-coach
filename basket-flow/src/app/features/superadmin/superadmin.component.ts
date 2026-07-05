import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-superadmin',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="sa-layout">
      <aside class="sa-sidebar">
        <h2 class="sa-brand">Superadmin</h2>
        <nav class="sa-nav">
          <a routerLink="/superadmin/clubs" routerLinkActive="active" class="sa-nav-item">Clubs</a>
          <a routerLink="/superadmin/plans" routerLinkActive="active" class="sa-nav-item">Planes</a>
          <a routerLink="/superadmin/permissions" routerLinkActive="active" class="sa-nav-item">Permisos</a>
          <a routerLink="/superadmin/users" routerLinkActive="active" class="sa-nav-item">Usuarios</a>
          <a routerLink="/dashboard" class="sa-nav-item sa-back">← Volver</a>
        </nav>
      </aside>
      <main class="sa-main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .sa-layout { display: flex; min-height: 100vh; }
    .sa-sidebar {
      width: 240px; background: #0d1240; padding: 24px;
      border-right: 1px solid rgba(69,70,82,0.2);
      flex-shrink: 0;
    }
    .sa-brand { font-size: 20px; font-weight: 800; color: #dfe0ff; margin: 0 0 24px; }
    .sa-nav { display: flex; flex-direction: column; gap: 4px; }
    .sa-nav-item {
      display: block; padding: 10px 14px; border-radius: 8px;
      color: #c6c5d4; text-decoration: none; font-size: 14px;
      transition: all 0.15s;
    }
    .sa-nav-item:hover { background: rgba(255,255,255,0.05); color: #dfe0ff; }
    .sa-nav-item.active { background: rgba(0,104,237,0.15); color: #bdc2ff; }
    .sa-back { margin-top: 24px; color: #908f9d; }
    .sa-main { flex: 1; padding: 32px; }
  `]
})
export class SuperadminComponent {}
