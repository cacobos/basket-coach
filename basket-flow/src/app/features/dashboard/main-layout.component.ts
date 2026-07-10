import { Component, inject, computed, signal, HostListener, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, from, of, timer, switchMap, takeWhile, filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionService, type Permission } from '../../core/services/permission.service';
import { DataService } from '../../core/services/data.service';
import { SeasonService } from '../../core/services/season.service';
import { SupabaseService } from '../../core/supabase/supabase.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  permission?: Permission;
  adminOnly?: boolean;
  familyOnly?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, FormsModule],
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

        <div class="season-selector">
          <span class="material-symbols-outlined season-icon">calendar_month</span>
          <select [ngModel]="seasonService.selectedSeason()" (ngModelChange)="onSeasonChange($event)" class="season-select">
            @for (opt of seasonService.allSeasons; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>

        <nav class="nav">
          @for (item of visibleItems(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active-nav-item"
               [routerLinkActiveOptions]="item.exact ? {exact:true} : {}"
               class="nav-item" (click)="mobileMenuOpen = false">
              <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/upgrade" class="upgrade-link">Mejorar plan</a>
          <div class="user-info" *ngIf="auth.profile() as profile">
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
    .season-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .season-icon { font-size: 16px; color: #908f9d; }
    .season-select {
      flex: 1;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #dfe0ff;
      padding: 4px 8px;
      font-size: 13px;
      font-family: 'Hanken Grotesk', sans-serif;
      cursor: pointer;
      outline: none;
    }
    .season-select:hover { border-color: rgba(255,255,255,0.2); }
    .season-select option { background: #030737; color: #dfe0ff; }
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
      flex-direction: column;
      gap: 8px;
    }
    .upgrade-link {
      display: block; text-align: center;
      padding: 8px; border-radius: 8px;
      background: rgba(0,104,237,0.12);
      color: #bdc2ff; text-decoration: none;
      font-size: 12px; font-weight: 700;
      letter-spacing: 0.03em;
      transition: all 0.15s;
    }
    .upgrade-link:hover { background: rgba(0,104,237,0.2); }
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
export class MainLayoutComponent implements OnDestroy {
  auth = inject(AuthService);
  perms = inject(PermissionService);
  seasonService = inject(SeasonService);
  private data = inject(DataService);
  private supabase = inject(SupabaseService);
  mobileMenuOpen = false;
  private pollSub?: Subscription;

  private staffNavItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/teams', label: 'Equipos', icon: 'groups', permission: 'team.manage' },
    { path: '/players', label: 'Jugadores', icon: 'face', permission: 'player.manage' },
    { path: '/matches', label: 'Partidos', icon: 'sports_basketball', permission: 'match.manage' },
    { path: '/exercises', label: 'Ejercicios', icon: 'fitness_center', permission: 'exercise.manage' },
    { path: '/sessions', label: 'Sesiones', icon: 'calendar_month', permission: 'session.manage' },
    { path: '/sessions/new', label: 'Crear Sesión', icon: 'playlist_add', permission: 'session.manage' },
    { path: '/planning', label: 'Planificación', icon: 'timeline', permission: 'planning.manage' },
    { path: '/calendar', label: 'Calendario', icon: 'calendar_view_month' },
    { path: '/tactics', label: 'Pizarra', icon: 'draw', permission: 'tactics.manage' },
    { path: '/evaluations', label: 'Evaluar', icon: 'fact_check', permission: 'evaluation.manage' },
    { path: '/documents', label: 'Documentos', icon: 'description', permission: 'documents.manage' },
    { path: '/announcements', label: 'Comunicación', icon: 'campaign', permission: 'announcements.manage' },
    { path: '/finance', label: 'Finanzas', icon: 'payments', permission: 'finance.manage' },
    { path: '/configuration', label: 'Configuración', icon: 'settings', permission: 'configuration.manage' },
    { path: '/superadmin', label: 'Admin', icon: 'admin_panel_settings', adminOnly: true },
  ];

  private familyNavItems: NavItem[] = [
    { path: '/portal', label: 'Mi Portal', icon: 'home', exact: true, familyOnly: true },
    { path: '/calendar', label: 'Calendario', icon: 'calendar_view_month', familyOnly: true },
    { path: '/announcements', label: 'Comunicación', icon: 'campaign', familyOnly: true },
  ];

  private clubRole = signal<string | null>(null);
  private isFamily = signal(false);

  visibleItems = computed(() => {
    if (this.isFamily()) return this.familyNavItems;
    const role = this.clubRole();
    const isSuperadmin = this.auth.profile()?.is_superadmin;
    return this.staffNavItems.filter(item => {
      if (item.adminOnly && !isSuperadmin) return false;
      if (item.permission) return this.perms.hasPermission(role as any, item.permission);
      return true;
    });
  });

  constructor() {
    this.pollSub = from(this.auth.ready).pipe(
      switchMap(() => {
        const profile = this.auth.profile();
        if (!profile) return of(null);
        const userId = this.auth.user()?.id;
        if (!userId) return of(null);
        return from(
          this.supabase.client
            .from('player_guardians')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
        ).pipe(
          switchMap(({ count }) => {
            if (count && count > 0) {
              this.isFamily.set(true);
              return of(null);
            }
            return timer(0, 50).pipe(
              map(() => this.data.currentClub()?.id),
              takeWhile(id => !id, true),
              filter(Boolean),
              switchMap(clubId => this.perms.getRoleInClub(clubId!))
            );
          })
        );
      })
    ).subscribe(role => {
      if (role) this.clubRole.set(role);
    });
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  onSeasonChange(season: string) {
    this.seasonService.selectSeason(season);
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768) this.mobileMenuOpen = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
}
