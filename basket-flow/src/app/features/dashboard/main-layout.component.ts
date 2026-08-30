import { Component, inject, computed, signal, effect, HostListener, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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
}

interface NavGroup {
  label: string;
  items: NavItem[];
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
          <select aria-label="Seleccionar temporada" [ngModel]="seasonService.selectedSeason()" (ngModelChange)="onSeasonChange($event)" class="season-select">
            @for (opt of seasonService.allSeasons; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>

        <div class="club-selector">
          @if (data.clubs().length > 1) {
            <span class="material-symbols-outlined season-icon">business</span>
            <select aria-label="Seleccionar club" [ngModel]="data.currentClub()?.id" (ngModelChange)="onClubChange($event)" class="season-select">
              @for (club of data.clubs(); track club.id) {
                <option [value]="club.id">{{ club.name }}</option>
              }
            </select>
          } @else if (data.currentClub(); as club) {
            @if (club.logo_url) {
              <img [src]="club.logo_url" alt="" class="club-logo" />
            } @else {
              <span class="material-symbols-outlined season-icon">business</span>
            }
            <span class="club-label">{{ club.name }}</span>
          } @else {
            <span class="material-symbols-outlined season-icon">business</span>
            <span class="club-label">Cargando…</span>
          }
        </div>

        <nav class="nav">
          @if (isFamily()) {
            @for (item of familyNavItems; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active-nav-item"
                 [routerLinkActiveOptions]="item.exact ? {exact:true} : {}"
                 class="nav-item" (click)="mobileMenuOpen = false">
                <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </a>
            }
          } @else {
            @for (group of visibleGroups(); track group.label) {
              <div class="nav-group-label">{{ group.label }}</div>
              @for (item of group.items; track item.path) {
                <a [routerLink]="item.path" routerLinkActive="active-nav-item"
                   [routerLinkActiveOptions]="item.exact ? {exact:true} : {}"
                   class="nav-item" (click)="mobileMenuOpen = false">
                  <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
                  <span>{{ item.label }}</span>
                </a>
              }
            }
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-info" *ngIf="auth.profile() as profile">
            <div class="avatar">{{ displayName().charAt(0).toUpperCase() }}</div>
            <div class="user-details">
              <span class="user-name">{{ displayName() }}</span>
              @if (profile.email !== displayName()) {
                <span class="user-email">{{ profile.email }}</span>
              }
              <a routerLink="/upgrade" class="upgrade-link">Mejorar plan</a>
              <label class="reminder-toggle" title="Recibir un email 15 minutos antes de cada sesión para pasar lista">
                <span class="material-symbols-outlined">notifications</span>
                <span class="reminder-label">Avísame para pasar lista</span>
                <input type="checkbox" [checked]="reminderEmail()" (change)="toggleReminder($event)" />
              </label>
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
    .club-selector { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .club-logo { width: 20px; height: 20px; border-radius: 4px; object-fit: contain; flex-shrink: 0; }
    .club-label { flex: 1; font-size: 13px; color: #dfe0ff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nav {
      flex: 1;
      padding: 8px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .nav-group-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #6a6a80;
      padding: 14px 12px 4px;
      user-select: none;
    }
    .nav-group-label:first-child { padding-top: 6px; }
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
      display: inline-block; align-self: flex-start;
      margin-top: 2px;
      color: #8f96e8; text-decoration: none;
      font-size: 11px; font-weight: 600;
      transition: color 0.15s;
    }
    .upgrade-link:hover { color: #bdc2ff; text-decoration: underline; }
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
    .reminder-toggle {
      display: flex; align-items: center; gap: 6px; cursor: pointer;
      margin-top: 6px; font-size: 11px; color: #908f9d;
    }
    .reminder-toggle .material-symbols-outlined { font-size: 14px; color: #bdc2ff; }
    .reminder-toggle input { accent-color: #7c6cff; cursor: pointer; }
    .reminder-toggle:hover { color: #bdc2ff; }
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
  protected data = inject(DataService);
  private supabase = inject(SupabaseService);
  mobileMenuOpen = false;

  private staffNavGroups: NavGroup[] = [
    {
      label: 'Inicio',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', exact: true },
      ],
    },
    {
      label: 'Entrenamiento',
      items: [
        { path: '/sessions', label: 'Sesiones', icon: 'calendar_month', permission: 'session.manage' },
        { path: '/planning', label: 'Planificación', icon: 'timeline', permission: 'planning.manage' },
        { path: '/exercises', label: 'Ejercicios', icon: 'fitness_center', permission: 'exercise.manage' },
        { path: '/tactics', label: 'Pizarra táctica', icon: 'draw', permission: 'tactics.manage' },
      ],
    },
    {
      label: 'Partidos',
      items: [
        { path: '/matches', label: 'Partidos', icon: 'sports_basketball', permission: 'match.manage' },
      ],
    },
    {
      label: 'Equipo',
      items: [
        { path: '/players', label: 'Jugadores', icon: 'face', permission: 'player.manage' },
        { path: '/teams', label: 'Equipos', icon: 'groups', permission: 'team.manage' },
        { path: '/evaluations', label: 'Evaluaciones', icon: 'fact_check', permission: 'evaluation.manage' },
      ],
    },
    {
      label: 'Club',
      items: [
        { path: '/finance', label: 'Cuotas', icon: 'payments', permission: 'finance.manage' },
        { path: '/documents', label: 'Documentos', icon: 'description', permission: 'documents.manage' },
        { path: '/announcements', label: 'Avisos', icon: 'campaign' },
        { path: '/configuration', label: 'Configuración', icon: 'settings', permission: 'configuration.manage' },
      ],
    },
    {
      label: 'Sistema',
      items: [
        { path: '/superadmin', label: 'Panel admin', icon: 'admin_panel_settings', adminOnly: true },
      ],
    },
  ];

  readonly familyNavItems: NavItem[] = [
    { path: '/portal', label: 'Mi Portal', icon: 'home', exact: true },
    { path: '/calendar', label: 'Calendario', icon: 'calendar_view_month' },
    { path: '/announcements', label: 'Avisos', icon: 'campaign' },
  ];

  private clubRole = signal<string | null>(null);
  readonly isFamily = signal(false);
  private lastNavKey: string | null = null;

  readonly reminderEmail = signal<boolean>(!!this.auth.profile()?.reminder_email);

  async toggleReminder(event: Event): Promise<void> {
    const checked = (event.target as HTMLInputElement).checked;
    this.reminderEmail.set(checked);
    const profile = this.auth.profile();
    if (!profile) return;
    await this.supabase.client
      .from('profiles')
      .update({ reminder_email: checked })
      .eq('id', profile.id);
  }

  readonly displayName = computed(() => {
    const profile = this.auth.profile();
    if (!profile) return '';
    const name = (profile.full_name || '').trim();
    return name && !name.includes('@') ? name : profile.email;
  });

  clubNavItem = computed(() => {
    const clubId = this.data.currentClub()?.id;
    if (!clubId) return null;
    const role = this.clubRole();
    const isSuperadmin = this.auth.profile()?.is_superadmin;
    if (isSuperadmin) return { path: `/clubs/${clubId}/settings`, label: 'Club', icon: 'settings', exact: true } as NavItem;
    if (!role || !this.perms.hasPermission(role as any, 'club.members.manage')) return null;
    return { path: `/clubs/${clubId}/settings`, label: 'Club', icon: 'settings', exact: true } as NavItem;
  });

  visibleGroups = computed<NavGroup[]>(() => {
    if (this.isFamily()) return [];
    const role = this.clubRole();
    const isSuperadmin = this.auth.profile()?.is_superadmin;
    const clubItem = this.clubNavItem();
    return this.staffNavGroups
      .map(group => ({
        label: group.label,
        items: group.items.filter(item => {
          if (item.adminOnly && !isSuperadmin) return false;
          if (item.permission) {
            if (isSuperadmin) return true;
            return this.perms.hasPermission(role as any, item.permission);
          }
          return true;
        }),
      }))
      .map(group =>
        group.label === 'Club' && clubItem ? { ...group, items: [clubItem, ...group.items] } : group
      )
      .filter(group => group.items.length > 0);
  });

  constructor() {
    effect(() => {
      const profile = this.auth.profile();
      if (profile && this.reminderEmail() !== !!profile.reminder_email) {
        this.reminderEmail.set(!!profile.reminder_email);
      }
    });
    effect(() => {
      const user = this.auth.user();
      const club = this.data.currentClub();
      if (!user) return;

      const key = `${user.id}:${club?.id ?? 'noclub'}`;
      if (this.lastNavKey === key) return;
      void this.resolveAndLoad(club?.id ?? null, user.id, key);
    });
  }

  private async resolveAndLoad(clubId: string | null, userId: string, key: string): Promise<void> {
    this.lastNavKey = key;
    const isGuardian = await this.isGuardian(userId);
    if (isGuardian && !clubId) {
      this.isFamily.set(true);
      return;
    }
    if (!clubId) return;
    if (isGuardian) {
      const role = await firstValueFrom(this.perms.getRoleInClub(clubId)).catch(() => null);
      if (!role) {
        this.isFamily.set(true);
        return;
      }
    }
    this.isFamily.set(false);
    await this.loadRoleFor(clubId);
  }

  private async isGuardian(userId: string): Promise<boolean> {
    try {
      const { count } = await this.supabase.client
        .from('player_guardians')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      return !!count && count > 0;
    } catch {
      return false;
    }
  }

  private async loadRoleFor(clubId: string): Promise<void> {
    this.seasonService.loadFromDb(clubId);
    await this.perms.ensureLoaded();
    const role = await firstValueFrom(this.perms.getRoleInClub(clubId)).catch(() => null);
    this.clubRole.set(role ?? null);
  }

  ngOnDestroy() {
    /* reactive effects are disposed automatically */
  }

  onSeasonChange(season: string) {
    this.seasonService.selectSeason(season);
  }

  onClubChange(clubId: string) {
    const club = this.data.clubs().find(c => c.id === clubId);
    if (club) this.data.setCurrentClub(club);
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768) this.mobileMenuOpen = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
}
