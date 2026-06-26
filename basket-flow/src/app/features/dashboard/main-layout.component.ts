import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  template: `
    <div class="app-shell">
      <aside class="sidebar" [class.collapsed]="collapsed">
        <div class="sidebar-header">
          <svg class="logo-icon" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="12" r="8" stroke="#bdc2ff" stroke-width="1.5" fill="none"/>
            <line x1="14" y1="6" x2="14" y2="3" stroke="#bdc2ff" stroke-width="1.5"/>
            <line x1="10" y1="3" x2="18" y2="3" stroke="#bdc2ff" stroke-width="1.5"/>
            <rect x="12.5" y="12" width="3" height="11" fill="#bdc2ff" rx="0.5"/>
            <rect x="15.5" y="20" width="7" height="2.5" fill="#bdc2ff" rx="0.5"/>
            <rect x="5.5" y="20" width="7" height="2.5" fill="#bdc2ff" rx="0.5"/>
          </svg>
          <span *ngIf="!collapsed" class="brand">BasketFlow</span>
          <button class="toggle-btn" (click)="collapsed = !collapsed">
            <span class="material-symbols-outlined">{{ collapsed ? 'menu' : 'close' }}</span>
          </button>
        </div>

        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="active-nav-item" [routerLinkActiveOptions]="{exact:true}" class="nav-item">
            <span class="material-symbols-outlined nav-icon">dashboard</span>
            <span *ngIf="!collapsed">Dashboard</span>
          </a>
          <a routerLink="/teams" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">groups</span>
            <span *ngIf="!collapsed">Equipos</span>
          </a>
          <a routerLink="/players" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">face</span>
            <span *ngIf="!collapsed">Jugadores</span>
          </a>
          <a routerLink="/exercises" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">fitness_center</span>
            <span *ngIf="!collapsed">Ejercicios</span>
          </a>
          <a routerLink="/sessions" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">calendar_month</span>
            <span *ngIf="!collapsed">Sesiones</span>
          </a>
          <a routerLink="/session-builder" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">playlist_add</span>
            <span *ngIf="!collapsed">Crear Sesión</span>
          </a>
          <a routerLink="/calendar" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">calendar_view_month</span>
            <span *ngIf="!collapsed">Calendario</span>
          </a>
          <a routerLink="/tactics" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">draw</span>
            <span *ngIf="!collapsed">Pizarra</span>
          </a>
          <a routerLink="/whiteboard" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">edit</span>
            <span *ngIf="!collapsed">Pizarra Libre</span>
          </a>
          <a routerLink="/stats" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">bar_chart</span>
            <span *ngIf="!collapsed">Estadísticas</span>
          </a>
          <a routerLink="/evaluations" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">star</span>
            <span *ngIf="!collapsed">Evaluaciones</span>
          </a>
          <a routerLink="/attendance" routerLinkActive="active-nav-item" class="nav-item">
            <span class="material-symbols-outlined nav-icon">fact_check</span>
            <span *ngIf="!collapsed">Asistencia</span>
          </a>
        </nav>

        <div class="sidebar-footer" *ngIf="auth.profile() as profile">
          <div class="user-info">
            <div class="avatar">{{ profile.full_name.charAt(0) || '?' }}</div>
            <div *ngIf="!collapsed" class="user-details">
              <span class="user-name">{{ profile.full_name }}</span>
              <span class="user-email">{{ profile.email }}</span>
            </div>
          </div>
          <button class="logout-btn" (click)="auth.signOut()" title="Cerrar sesión">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </aside>

      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: #080d3c;
      font-family: 'Hanken Grotesk', sans-serif;
    }
    .sidebar {
      width: 240px;
      background: #030737;
      display: flex;
      flex-direction: column;
      transition: width 0.3s;
      flex-shrink: 0;
      border-right: 1px solid rgba(255,255,255,0.05);
    }
    .sidebar.collapsed { width: 64px; }
    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .logo-icon { width: 28px; height: 28px; flex-shrink: 0; }
    .brand {
      font-weight: 800;
      font-size: 20px;
      letter-spacing: -0.02em;
      color: #dfe0ff;
      white-space: nowrap;
    }
    .toggle-btn {
      margin-left: auto;
      background: none;
      border: none;
      color: #908f9d;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
    }
    .toggle-btn .material-symbols-outlined { font-size: 20px; }
    .nav {
      flex: 1;
      padding: 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      color: #908f9d;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .nav-item:hover { background: rgba(255,255,255,0.05); color: #dfe0ff; }
    .nav-item.active-nav-item { background: rgba(189,194,255,0.1); color: #bdc2ff; }
    .nav-icon { font-size: 20px; width: 24px; text-align: center; }
    .sidebar-footer {
      padding: 12px;
      border-top: 1px solid rgba(255,255,255,0.05);
      display: flex;
      align-items: center;
    }
    .user-info { display: flex; align-items: center; gap: 10px; flex: 1; overflow: hidden; }
    .avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: rgba(189,194,255,0.15);
      border: 2px solid rgba(189,194,255,0.3);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
      color: #bdc2ff; flex-shrink: 0;
    }
    .user-details { display: flex; flex-direction: column; overflow: hidden; }
    .user-name { font-size: 13px; font-weight: 600; color: #dfe0ff; }
    .user-email { font-size: 11px; color: #908f9d; }
    .logout-btn {
      background: none; border: none; color: #908f9d; cursor: pointer;
      padding: 4px; display: flex;
    }
    .logout-btn:hover { color: #ffb4ab; }
    .logout-btn .material-symbols-outlined { font-size: 20px; }
    .main-content {
      flex: 1;
      overflow-y: auto;
      background: #080d3c;
    }
  `]
})
export class MainLayoutComponent {
  auth = inject(AuthService);
  collapsed = false;
}
