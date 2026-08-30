import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { forkJoin, from, of } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { DataService } from '../../core/services/data.service';
import { PlayerRepository } from '../../core/repositories/player.repository';
import { TeamRepository } from '../../core/repositories/team.repository';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PermissionService } from '../../core/services/permission.service';
import type { Role } from '../../core/services/permission.service';
import type { Team } from '../../core/models/models';

const STAFF_ROLES = ['head_coach', 'assistant_coach'] as const;

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, FormsModule],
  template: `
    <div class="page" *ngIf="vm$ | async">
      <header class="page-header">
        <div>
          <h2 class="page-title">Mis Equipos</h2>
          <p class="page-sub">Gestión de plantillas y rendimiento competitivo.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <span class="material-symbols-outlined fill">add</span>
          Nuevo Equipo
        </button>
      </header>

      <div class="filters">
        <div class="search-wrap">
          <span class="material-symbols-outlined search-icon">search</span>
          <input class="search-input" placeholder="Buscar equipo por nombre..." type="text" [(ngModel)]="search"/>
        </div>
        <div class="filter-chips">
          <button class="chip" [class.chip-active]="!categoryFilter" (click)="categoryFilter = ''">Todos</button>
          <button class="chip" [class.chip-active]="categoryFilter === c" *ngFor="let c of categories" (click)="categoryFilter = c">{{ c }}</button>
        </div>
      </div>

      <div class="team-grid">
        <div class="team-card" *ngFor="let team of filtered" (click)="openPlayers(team)">
          <div class="card-accent" [style.background]="teamColors[team.category] || '#454652'"></div>
          <div class="card-body">
            <div class="card-top">
              <span class="card-badge">{{ team.category }}</span>
              <button class="more-btn" (click)="$event.stopPropagation(); deleteTeam(team)">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
            <h3 class="card-name">{{ team.name }}</h3>
            <div class="card-players">
              <span class="material-symbols-outlined">groups</span>
              <span>{{ team._playerCount ?? '—' }} Jugadores</span>
            </div>
            <div class="card-staff">
              <span class="material-symbols-outlined">badge</span>
              <span>{{ team._staffCount ?? 0 }} Staff</span>
              <button class="staff-btn" *ngIf="userCanManage" (click)="$event.stopPropagation(); openStaff(team)">Gestionar</button>
            </div>
            <div class="card-actions">
              <button class="link-btn" (click)="$event.stopPropagation(); openLinks(team)">
                <span class="material-symbols-outlined">group_add</span>
                Jugadores vinculados
              </button>
            </div>
            <div class="card-footer">
              <span class="card-action">ABRIR ROSTER</span>
              <span class="material-symbols-outlined card-arrow">arrow_forward</span>
            </div>
          </div>
        </div>
        <div class="empty-state" *ngIf="filtered.length === 0">
          <span class="material-symbols-outlined empty-icon">groups</span>
          <p>No hay equipos aún. Crea el primero.</p>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showForm" (click)="showForm = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">{{ editing ? 'Editar Equipo' : 'Nuevo Equipo' }}</h3>
          <div class="modal-body">
            <label class="field">
              <span>Nombre del equipo</span>
              <input class="field-input" [(ngModel)]="formName" placeholder="Varsity Elite"/>
            </label>
            <label class="field">
              <span>Categoría</span>
              <select class="field-input" [(ngModel)]="formCategory">
                <option value="U10">U10</option>
                <option value="U12">U12</option>
                <option value="U14">U14</option>
                <option value="U16">U16</option>
                <option value="U18">U18</option>
                <option value="Varsity">Varsity</option>
              </select>
            </label>
            <label class="field">
              <span>Temporada</span>
              <input class="field-input" [(ngModel)]="formSeason" placeholder="2025-2026"/>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="showForm = false">Cancelar</button>
            <button class="btn-save" (click)="save()">{{ editing ? 'Guardar' : 'Crear' }}</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showStaffModal && staffTeam" (click)="closeStaff()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Staff — {{ staffTeam.name }}</h3>
          <div class="staff-list">
            <div class="staff-item" *ngFor="let s of staffMembers">
              <span>{{ s.profiles?.full_name || s.user_id?.slice(0,8) }}</span>
              <span class="staff-role-label">{{ s.role }}</span>
              <button class="btn-remove" *ngIf="userCanManage" (click)="removeStaff(s)">✕</button>
            </div>
            <p class="empty-msg" *ngIf="staffMembers.length === 0">Sin staff asignado.</p>
          </div>
          <div class="add-section" *ngIf="userCanManage && availableUsers.length > 0">
            <h4>Añadir staff</h4>
            <div class="add-row">
              <select class="field-input" [(ngModel)]="newStaffUserId">
                <option value="" disabled>Seleccionar usuario…</option>
                <option *ngFor="let u of availableUsers" [value]="u.id">{{ u.email }} {{ u.full_name ? '— ' + u.full_name : '' }}</option>
              </select>
              <select class="field-input role-select-sm" [(ngModel)]="newStaffRole">
                <option *ngFor="let r of staffRoles" [value]="r">{{ r }}</option>
              </select>
              <button class="btn-add" (click)="addStaff()">Añadir</button>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="closeStaff()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 48px; }
    .page-title { font-size: 48px; line-height: 56px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .page-sub { font-size: 18px; line-height: 28px; color: #c6c5d4; margin: 4px 0 0; }
    .btn-primary {
      display: flex; align-items: center; gap: 8px;
      background: #0068ed; color: #f2f3ff;
      padding: 16px 24px; border-radius: 12px;
      border: none; font-weight: 700; font-size: 18px;
      cursor: pointer; transition: all 0.2s;
      box-shadow: 0 8px 24px rgba(0,104,237,0.2);
      white-space: nowrap;
    }
    .btn-primary:hover { transform: scale(1.05); }
    .btn-primary .fill { font-variation-settings: 'FILL' 1; }
    .filters { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
    .search-wrap { position: relative; width: 100%; max-width: 384px; }
    .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #c6c5d4; font-size: 20px; }
    .search-input {
      width: 100%; background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 12px; padding: 12px 16px 12px 48px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none;
    }
    .search-input:focus { border-color: #bdc2ff; box-shadow: 0 0 0 1px #bdc2ff; }
    .filter-chips { display: flex; gap: 8px; overflow-x: auto; }
    .chip {
      padding: 10px 24px; border-radius: 9999px; border: none;
      background: #212653; color: #c6c5d4;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; font-weight: 600; letter-spacing: 0.05em;
      cursor: pointer; white-space: nowrap;
      transition: all 0.2s;
    }
    .chip:hover { color: #dfe0ff; }
    .chip-active { background: #1a237e; color: #8690ee; border: 1px solid rgba(189,194,255,0.2); }
    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
    .team-card {
      background: #111644; border-radius: 12px; overflow: hidden;
      cursor: pointer; transition: all 0.2s;
      border: 1px solid rgba(69,70,82,0.2);
    }
    .team-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.5); }
    .card-accent { height: 8px; width: 100%; }
    .card-body { padding: 24px; display: flex; flex-direction: column; }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .card-badge {
      padding: 4px 12px; background: rgba(189,194,255,0.1); color: #bdc2ff;
      border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    }
    .more-btn { background: none; border: none; color: #c6c5d4; cursor: pointer; padding: 4px; opacity: 0; transition: opacity 0.2s; }
    .team-card:hover .more-btn { opacity: 1; }
    .more-btn .material-symbols-outlined { font-size: 18px; }
    .card-name { font-size: 24px; line-height: 32px; font-weight: 700; color: #dfe0ff; margin: 0 0 8px; }
    .card-players { display: flex; align-items: center; gap: 8px; color: #c6c5d4; font-size: 14px; margin-bottom: 8px; }
    .card-players .material-symbols-outlined { font-size: 16px; }
    .card-staff { display: flex; align-items: center; gap: 8px; color: #908f9d; font-size: 13px; margin-bottom: 24px; }
    .card-staff .material-symbols-outlined { font-size: 16px; }
    .staff-btn { background: none; border: 1px solid rgba(69,70,82,0.3); color: #bdc2ff; border-radius: 6px; padding: 2px 10px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: 'Hanken Grotesk', sans-serif; }
    .staff-btn:hover { border-color: #bdc2ff; }
    .card-actions { margin-bottom: 16px; }
    .link-btn {
      display: flex; align-items: center; gap: 6px;
      background: none; border: 1px solid rgba(99,102,241,0.3); color: #bdc2ff;
      border-radius: 8px; padding: 6px 12px;
      font-size: 12px; font-weight: 700; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; transition: all 0.15s;
    }
    .link-btn:hover { background: rgba(99,102,241,0.12); border-color: #818cf8; }
    .link-btn .material-symbols-outlined { font-size: 16px; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
    .card-action { color: #b0c6ff; font-weight: 700; font-size: 12px; letter-spacing: 0.02em; }
    .team-card:hover .card-action { text-decoration: underline; }
    .card-arrow { color: #b0c6ff; font-size: 20px; transition: transform 0.2s; }
    .team-card:hover .card-arrow { transform: translateX(4px); }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; grid-column: 1 / -1; }
    .empty-icon, .loading-icon { font-size: 48px; }
    .loading-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p, .loading-state p { margin: 0; font-size: 16px; }
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 20px;
    }
    .modal-card {
      background: #161b48; border-radius: 16px; padding: 32px;
      width: 100%; max-width: 440px; border: 1px solid rgba(69,70,82,0.3);
    }
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 24px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-input {
      background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff;
      border-radius: 8px; padding: 10px 12px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none;
    }
    .field-input:focus { border-color: #bdc2ff; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-save {
      padding: 10px 20px; border-radius: 8px; border: none;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-cancel { background: #212653; color: #c6c5d4; }
    .btn-save { background: #0068ed; color: white; }
    .btn-save:hover { opacity: 0.9; }
    @media (max-width: 768px) {
      .page { padding: 20px !important; }
      .page-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .page-sub { font-size: 14px !important; }
      .search-wrap { max-width: 100% !important; }
      .team-grid { grid-template-columns: 1fr !important; }
      .filter-chips { overflow-x: auto !important; padding-bottom: 4px !important; }
      .modal-card { margin: 10px !important; padding: 20px !important; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
      .btn-primary { width: 100% !important; justify-content: center !important; }
    }
    .staff-list { margin-bottom: 16px; }
    .staff-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(69,70,82,0.1); font-size: 14px; color: #c6c5d4; }
    .staff-item span:first-child { flex: 1; }
    .staff-role-label { text-transform: uppercase; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.05); }
    .btn-remove { background: none; border: none; color: #f44336; cursor: pointer; font-size: 14px; padding: 4px; opacity: 0.5; }
    .btn-remove:hover { opacity: 1; }
    .add-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(69,70,82,0.2); }
    .add-section h4 { font-size: 13px; font-weight: 700; color: #908f9d; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }
    .add-row { display: flex; gap: 8px; align-items: center; }
    .add-row .field-input { flex: 1; }
    .role-select-sm { width: 140px; }
    .btn-add { background: #0068ed; color: white; border: none; border-radius: 8px; padding: 10px 16px; font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
    .btn-add:hover { opacity: 0.9; }
    .empty-msg { font-size: 13px; color: #908f9d; margin: 12px 0 0; }
  `]
})
export class TeamsComponent {
  private data = inject(DataService);
  private playerRepo = inject(PlayerRepository);
  private teamRepo = inject(TeamRepository);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);
  private permissions = inject(PermissionService);
  private router = inject(Router);

  teams: (Team & { _playerCount?: number; _staffCount?: number })[] = [];
  search = '';
  categoryFilter = '';
  categories = ['U10', 'U12', 'U14', 'U16', 'U18', 'Varsity'];
  showForm = false;
  editing = false;
  formName = '';
  formCategory = '';
  formSeason = '';

  teamColors: Record<string, string> = {
    'U10': '#4CAF50', 'U12': '#2196F3', 'U14': '#FF9800',
    'U16': '#9C27B0', 'U18': '#F44336', 'Varsity': '#0068ed'
  };

  readonly staffRoles = STAFF_ROLES;
  showStaffModal = false;
  staffTeam: (Team & { _staffCount?: number }) | null = null;
  staffMembers: any[] = [];
  availableUsers: any[] = [];
  newStaffUserId = '';
  newStaffRole: string = 'assistant_coach';
  userCanManage = false;

  get filtered() {
    let list = this.teams;
    if (this.search) {
      const q = this.search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q));
    }
    if (this.categoryFilter) {
      list = list.filter(t => t.category === this.categoryFilter);
    }
    return list;
  }

  private club$ = toObservable(this.data.currentClub).pipe(filter(Boolean));

  vm$ = this.club$.pipe(
    switchMap(club => from(this._loadUserRole(club.id)).pipe(
      switchMap(() => from(this.loadTeams())),
    )),
    map(() => ({})),
  );

  private async _loadUserRole(clubId: string) {
    const profile = this.auth.profile();
    if (profile?.is_superadmin) {
      this.userCanManage = true;
      return;
    }
    const userId = this.auth.user()?.id;
    if (!userId) { this.userCanManage = false; return; }
    const { data } = await this.supabase.client
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .single();
    if (data) {
      this.userCanManage = this.permissions.hasPermission(data.role as Role, 'team.staff.manage');
    } else {
      this.userCanManage = false;
    }
  }

  openCreate() {
    this.editing = false;
    this.formName = '';
    this.formCategory = 'U16';
    this.formSeason = '2025-2026';
    this.showForm = true;
  }

  async save() {
    if (!this.formName.trim()) return;
    await this.data.createTeam(this.formName.trim(), this.formCategory, this.formSeason.trim());
    this.showForm = false;
    await this.loadTeams();
  }

  async deleteTeam(team: Team) {
    const players = await this.playerRepo.findAll(team.id);
    if (players.length > 0) {
      if (!confirm(`¿Eliminar "${team.name}"? También se eliminarán sus ${players.length} jugadores.`)) return;
    } else {
      if (!confirm(`¿Eliminar "${team.name}"?`)) return;
    }
    await this.teamRepo.remove(team.id);
    await this.loadTeams();
  }

  openPlayers(team: Team) {
    this.router.navigate(['/players'], { queryParams: { teamId: team.id } });
  }

  openLinks(team: Team) {
    this.router.navigate(['/teams', team.id, 'links']);
  }

  async openStaff(team: Team & { _staffCount?: number }) {
    this.staffTeam = team;
    this.showStaffModal = true;
    const clubId = this.data.currentClub()?.id;
    if (!clubId) return;
    const [{ data: staff }, { data: profiles }] = await Promise.all([
      this.supabase.client.from('team_staff').select('*, profiles(*)').eq('team_id', team.id),
      this.supabase.client.from('profiles').select('id, email, full_name').order('email'),
    ]);
    this.staffMembers = (staff as any[]) || [];
    const allProfiles = (profiles as any[]) || [];
    const staffUserIds = new Set(this.staffMembers.map(s => s.user_id));
    this.availableUsers = allProfiles.filter(p => !staffUserIds.has(p.id));
    this.newStaffUserId = '';
    this.newStaffRole = 'assistant_coach';
  }

  closeStaff() {
    this.showStaffModal = false;
    this.staffTeam = null;
    this.staffMembers = [];
    this.availableUsers = [];
  }

  async addStaff() {
    if (!this.newStaffUserId || !this.staffTeam) return;
    await this.supabase.client
      .from('team_staff')
      .insert({ team_id: this.staffTeam.id, user_id: this.newStaffUserId, role: this.newStaffRole });
    await this.openStaff(this.staffTeam);
    await this.loadTeams();
  }

  async removeStaff(member: any) {
    if (!this.staffTeam) return;
    if (member.role === 'head_coach') {
      const coachCount = this.staffMembers.filter((s: any) => s.role === 'head_coach').length;
      if (coachCount <= 1) {
        this.notification.show('Debe haber al menos un head_coach en el equipo');
        return;
      }
    }
    await this.supabase.client
      .from('team_staff')
      .delete()
      .eq('id', member.id);
    await this.openStaff(this.staffTeam);
    await this.loadTeams();
  }

  private async loadTeams() {
    const teams = await this.data.getTeams();
    const withCounts = await Promise.all(
      teams.map(async (t) => {
        const [players, staff] = await Promise.all([
          this.playerRepo.findAll(t.id),
          this.supabase.client.from('team_staff').select('id', { count: 'exact', head: true }).eq('team_id', t.id),
        ]);
        return { ...t, _playerCount: players.length, _staffCount: staff.count ?? 0 };
      })
    );
    this.teams = withCounts;
  }
}
