import { Component, inject, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  template: `
    <div class="app-shell">
      <div class="mobile-header">
        <button class="hamburger-btn" (click)="toggleMobileMenu()">
          <span class="material-symbols-outlined">{{ mobileMenuOpen ? 'close' : 'menu' }}</span>
        </button>
        <span class="mobile-brand">BasketFlow</span>
      </div>

      <div class="mobile-backdrop" *ngIf="mobileMenuOpen" (click)="mobileMenuOpen = false"></div>

      <aside class="sidebar" [class.mobile-open]="mobileMenuOpen">
        <div class="sidebar-header">
          <svg class="logo-icon" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="12" r="8" stroke="#bdc2ff" stroke-width="1.5" fill="none"/>
            <line x1="14" y1="6" x2="14" y2="3" stroke="#bdc2ff" stroke-width="1.5"/>
            <line x1="10" y1="3" x2="18" y2="3" stroke="#bdc2ff" stroke-width="1.5"/>
            <rect x="12.5" y="12" width="3" height="11" fill="#bdc2ff" rx="0.5"/>
            <rect x="15.5" y="20" width="7" height="2.5" fill="#bdc2ff" rx="0.5"/>
            <rect x="5.5" y="20" width="7" height="2.5" fill="#bdc2ff" rx="0.5"/>
          </svg>
          <span class="brand">BasketFlow</span>
          <button class="toggle-btn" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="active-nav-item" [routerLinkActiveOptions]="{exact:true}" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">dashboard</span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/teams" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">groups</span>
            <span>Equipos</span>
          </a>
          <a routerLink="/players" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">face</span>
            <span>Jugadores</span>
          </a>
          <a routerLink="/exercises" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">fitness_center</span>
            <span>Ejercicios</span>
          </a>
          <a routerLink="/sessions" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">calendar_month</span>
            <span>Sesiones</span>
          </a>
          <a routerLink="/session-builder" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">playlist_add</span>
            <span>Crear Sesión</span>
          </a>
          <a routerLink="/calendar" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">calendar_view_month</span>
            <span>Calendario</span>
          </a>
          <a routerLink="/tactics" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">draw</span>
            <span>Pizarra</span>
          </a>
          <a routerLink="/whiteboard" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">edit</span>
            <span>Pizarra Libre</span>
          </a>
          <a routerLink="/stats" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">bar_chart</span>
            <span>Estadísticas</span>
          </a>
          <a routerLink="/evaluations" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">star</span>
            <span>Evaluaciones</span>
          </a>
          <a routerLink="/attendance" routerLinkActive="active-nav-item" class="nav-item" (click)="mobileMenuOpen = false">
            <span class="material-symbols-outlined nav-icon">fact_check</span>
            <span>Asistencia</span>
          </a>
        </nav>

        <div class="sidebar-footer" *ngIf="auth.profile() as profile">
          <div class="user-info">
            <div class="avatar">{{ profile.full_name.charAt(0) || '?' }}</div>
            <div class="user-details">
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
    .mobile-header {
      display: none;
      position: fixed; top: 0; left: 0; right: 0; z-index: 200;
      height: 56px; background: #030737;
      align-items: center; gap: 12px; padding: 0 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .hamburger-btn {
      background: none; border: none; color: #dfe0ff;
      cursor: pointer; padding: 4px; display: flex;
    }
    .hamburger-btn .material-symbols-outlined { font-size: 24px; }
    .mobile-brand { font-weight: 800; font-size: 18px; color: #dfe0ff; }
    .mobile-backdrop {
      display: none;
      position: fixed; inset: 0; z-index: 150;
      background: rgba(0,0,0,0.6);
    }
    .sidebar {
      width: 240px;
      background: #030737;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      border-right: 1px solid rgba(255,255,255,0.05);
    }
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
      display: none;
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

    @media (max-width: 768px) {
      .app-shell { padding-top: 56px; }
      .mobile-header { display: flex; }
      .mobile-backdrop { display: block; }
      .sidebar {
        position: fixed; top: 56px; left: 0; bottom: 0; z-index: 180;
        transform: translateX(-100%); transition: transform 0.25s;
        width: 280px;
      }
      .sidebar.mobile-open { transform: translateX(0); }
      .toggle-btn { display: flex; }
      .main-content { min-height: calc(100vh - 56px); }
    }

    @media (min-width: 769px) {
      .toggle-btn { display: none; }
    }
  `]
})
export class MainLayoutComponent {
  auth = inject(AuthService);
  mobileMenuOpen = false;

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768) this.mobileMenuOpen = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
}
