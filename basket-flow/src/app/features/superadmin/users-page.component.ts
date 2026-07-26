import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { NotificationService } from '../../core/services/notification.service';

interface UserVM {
  id: string;
  email: string;
  full_name: string;
  is_superadmin: boolean;
  created_at: string;
  clubRoles: { clubId: string; clubName: string; role: string }[];
  teamStaff: { teamId: string; teamName: string; clubName: string; role: string; staffId: string }[];
  isFamily: boolean;
  familyPlayers: string[];
}

const STAFF_ROLES = ['head_coach', 'assistant_coach'] as const;
const CLUB_ROLES = ['club_admin', 'team_admin', 'coach'] as const;

@Component({
  selector: 'app-sa-users',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="sa-page">
      <h1 class="sa-page-title">Usuarios</h1>

      <div class="search-bar">
        <input class="search-input" [(ngModel)]="search" placeholder="Buscar por email o nombre…" />
      </div>

      <table class="sa-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Email</th>
            <th>Club</th>
            <th>Equipos</th>
            <th>Familia</th>
            <th>Superadmin</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (u of filteredUsers(); track u.id) {
            <tr [class.row-unassigned]="u.teamStaff.length === 0 && !u.isFamily">
              <td class="cell-name">{{ u.full_name || '—' }}</td>
              <td>{{ u.email }}</td>
              <td>
                @if (u.clubRoles.length > 0) {
                  @for (cr of u.clubRoles; track cr.clubId) {
                    <span class="badge badge-club" [title]="cr.clubName + ' — ' + cr.role">{{ cr.clubName }} ({{ cr.role }})</span>
                  }
                } @else {
                  <span class="text-dim">—</span>
                }
              </td>
              <td>
                @if (u.teamStaff.length > 0) {
                  @for (ts of u.teamStaff; track ts.staffId) {
                    <span class="badge badge-team">{{ ts.teamName }} ({{ ts.role }}) <button class="btn-xs" (click)="removeStaff(ts, u)" title="Quitar">✕</button></span>
                  }
                } @else if (!u.isFamily) {
                  <span class="badge badge-warning">Sin equipo</span>
                } @else {
                  <span class="text-dim">—</span>
                }
              </td>
              <td>{{ u.isFamily ? '✓' : '—' }}</td>
              <td>
                <button class="btn-toggle" [class.active]="u.is_superadmin" (click)="toggleSuperadmin(u)" [disabled]="userLoading.has(u.id)">
                  {{ u.is_superadmin ? 'Revocar' : 'Promover' }}
                </button>
              </td>
              <td>
                <button class="btn-assign" (click)="startAssign(u)">Asignar</button>
              </td>
            </tr>
          }
        </tbody>
      </table>

      @if (loading()) {
        <p class="load-msg">Cargando…</p>
      }

      <!-- Modal asignación -->
      @if (assigningUser(); as au) {
        <div class="modal-backdrop" (click)="cancelAssign()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ au.full_name || au.email }}</h3>

            <!-- Club -->
            <div class="form-group">
              <label>Club</label>
              <select class="field-input" [(ngModel)]="assignClubId" (ngModelChange)="assignTeamId.set('')">
                <option value="" disabled>Seleccionar club…</option>
                @for (c of allClubs; track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>

            <!-- Estado membresía club -->
            @if (assignClubId(); as cid) {
              @if (au.clubRoles.find(r => r.clubId === cid); as existing) {
                <div class="info-row info-ok">
                  <span class="material-symbols-outlined info-icon">check_circle</span>
                  Ya es miembro como <strong>{{ existing.role }}</strong>
                </div>
              } @else {
                <div class="info-row info-warn">
                  <span class="material-symbols-outlined info-icon">add_circle</span>
                  <label class="inline-label">
                    Añadir como:
                    <select class="field-input-sm" [(ngModel)]="assignClubRole">
                      @for (r of CLUB_ROLES; track r) {
                        <option [value]="r">{{ r }}</option>
                      }
                    </select>
                  </label>
                </div>
              }
            }

            <!-- Equipo -->
            <div class="form-group">
              <label>Equipo (opcional)</label>
              <select class="field-input" [(ngModel)]="assignTeamId">
                <option value="" disabled>Seleccionar equipo…</option>
                @for (t of filteredTeams(); track t.id) {
                  <option [value]="t.id">{{ t.name }}</option>
                }
              </select>
            </div>

            <!-- Rol en el equipo -->
            @if (assignTeamId()) {
              <div class="form-group">
                <label>Rol en el equipo</label>
                <select class="field-input" [(ngModel)]="assignRole">
                  <option value="" disabled>Seleccionar rol…</option>
                  @for (r of STAFF_ROLES; track r) {
                    <option [value]="r">{{ r }}</option>
                  }
                </select>
              </div>
            }

            <div class="modal-actions">
              <button class="btn-cancel" (click)="cancelAssign()">Cancelar</button>
              <button class="btn-save" (click)="confirmAssign()" [disabled]="!assignClubId() || (assignTeamId() !== '' && !assignRole())">Guardar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .sa-page-title { font-size: 32px; font-weight: 800; color: #dfe0ff; margin: 0 0 24px; }
    .search-bar { margin-bottom: 16px; }
    .search-input {
      width: 100%; max-width: 400px; padding: 10px 14px; border-radius: 8px;
      background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none;
      box-sizing: border-box;
    }
    .search-input:focus { border-color: rgba(189,194,255,0.4); }
    .sa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .sa-table th { text-align: left; padding: 10px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #908f9d; border-bottom: 1px solid rgba(69,70,82,0.3); }
    .sa-table td { padding: 10px 8px; color: #c6c5d4; border-bottom: 1px solid rgba(69,70,82,0.1); vertical-align: middle; }
    .row-unassigned { background: rgba(255, 180, 99, 0.06); }
    .cell-name { color: #dfe0ff; font-weight: 600; }
    .text-dim { color: #585870; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; margin: 1px 2px; white-space: nowrap; }
    .badge-club { background: rgba(0,104,237,0.15); color: #8ab8ff; }
    .badge-team { background: rgba(99, 220, 131, 0.12); color: #6cdb8a; }
    .badge-warning { background: rgba(255, 180, 99, 0.15); color: #ffb463; font-weight: 700; }
    .btn-toggle { background: rgba(69,70,82,0.2); border: none; color: #c6c5d4; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
    .btn-toggle.active { background: rgba(0,104,237,0.15); color: #bdc2ff; }
    .btn-toggle:hover { background: rgba(0,104,237,0.25); }
    .btn-toggle:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-xs { background: none; border: none; color: #ff9090; cursor: pointer; padding: 0 0 0 4px; font-size: 12px; line-height: 1; }
    .btn-xs:hover { color: #ff6b6b; }
    .btn-assign { background: rgba(0,104,237,0.12); border: none; color: #bdc2ff; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; }
    .btn-assign:hover { background: rgba(0,104,237,0.22); }
    .load-msg { text-align: center; color: #585870; padding: 40px; }
    .modal-backdrop { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }
    .modal { background: #161b48; border-radius: 16px; padding: 28px; width: 440px; max-width: 90vw; border: 1px solid rgba(69,70,82,0.3); }
    .modal h3 { font-size: 18px; font-weight: 700; color: #dfe0ff; margin: 0 0 20px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 12px; font-weight: 600; color: #908f9d; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    .field-input { width: 100%; background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff; border-radius: 8px; padding: 10px 12px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none; box-sizing: border-box; }
    .field-input:focus { border-color: rgba(189,194,255,0.4); }
    .field-input-sm { background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff; border-radius: 6px; padding: 4px 8px; font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; outline: none; }
    .info-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #c6c5d4; }
    .info-ok { background: rgba(99, 220, 131, 0.08); }
    .info-warn { background: rgba(255, 180, 99, 0.08); }
    .info-icon { font-size: 18px; }
    .inline-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #c6c5d4; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; }
    .btn-cancel { background: rgba(69,70,82,0.3); border: none; color: #c6c5d4; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .btn-save { background: rgba(0,104,237,0.2); border: none; color: #bdc2ff; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-save:hover { background: rgba(0,104,237,0.3); }
    .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class SuperadminUsersPage {
  private supabase = inject(SupabaseService);
  private notification = inject(NotificationService);

  STAFF_ROLES = STAFF_ROLES;
  CLUB_ROLES = CLUB_ROLES;
  search = signal('');
  loading = signal(true);
  userLoading = new Set<string>();

  private rawUsers = signal<UserVM[]>([]);
  allClubs: { id: string; name: string }[] = [];
  private teamsByClub = new Map<string, { id: string; name: string }[]>();

  filteredUsers = computed(() => {
    const q = this.search().toLowerCase();
    return this.rawUsers().filter(u =>
      !q || u.email.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q)
    );
  });

  filteredTeams = computed(() => {
    const cid = this.assignClubId();
    return this.teamsByClub.get(cid) || [];
  });

  assigningUser = signal<UserVM | null>(null);
  assignClubId = signal('');
  assignClubRole = signal('coach');
  assignTeamId = signal('');
  assignRole = signal('');

  constructor() {
    this.loadData();
  }

  private async loadData() {
    this.loading.set(true);
    try {
      const [profiles, clubs, teams, members, staff, guardians] = await Promise.all([
        this.supabase.client.from('profiles').select('*').order('created_at', { ascending: false }),
        this.supabase.client.from('clubs').select('id, name'),
        this.supabase.client.from('teams').select('id, name, club_id').is('archived_at', null),
        this.supabase.client.from('club_members').select('user_id, club_id, role'),
        this.supabase.client.from('team_staff').select('id, user_id, team_id, role'),
        this.supabase.client.from('player_guardians').select('user_id, player_id'),
      ]);

      const clubData = (clubs.data || []) as { id: string; name: string }[];
      const teamData = (teams.data || []) as { id: string; name: string; club_id: string }[];

      this.allClubs = clubData;
      for (const t of teamData) {
        if (!this.teamsByClub.has(t.club_id)) this.teamsByClub.set(t.club_id, []);
        this.teamsByClub.get(t.club_id)!.push({ id: t.id, name: t.name });
      }

      const clubMap = new Map(clubData.map(c => [c.id, c.name]));
      const teamClubMap = new Map(teamData.map(t => [t.id, clubMap.get(t.club_id) || '']));

      const userMap = new Map<string, UserVM>();

      for (const p of (profiles.data || []) as any[]) {
        userMap.set(p.id, {
          id: p.id,
          email: p.email || '',
          full_name: p.full_name || '',
          is_superadmin: p.is_superadmin || false,
          created_at: p.created_at || '',
          clubRoles: [],
          teamStaff: [],
          isFamily: false,
          familyPlayers: [],
        });
      }

      for (const m of (members.data || []) as any[]) {
        const u = userMap.get(m.user_id);
        if (u) u.clubRoles.push({ clubId: m.club_id, clubName: clubMap.get(m.club_id) || '?', role: m.role });
      }

      for (const s of (staff.data || []) as any[]) {
        const u = userMap.get(s.user_id);
        if (u) {
          u.teamStaff.push({
            staffId: s.id,
            teamId: s.team_id,
            teamName: teamData.find(t => t.id === s.team_id)?.name || '?',
            clubName: teamClubMap.get(s.team_id) || '?',
            role: s.role,
          });
        }
      }

      for (const g of (guardians.data || []) as any[]) {
        const u = userMap.get(g.user_id);
        if (u) {
          u.isFamily = true;
          u.familyPlayers.push(g.player_id);
        }
      }

      this.rawUsers.set(Array.from(userMap.values()));
    } catch (err) {
      console.error(err);
      this.notification.show('Error al cargar usuarios', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleSuperadmin(u: UserVM) {
    this.userLoading.add(u.id);
    try {
      await this.supabase.client.from('profiles').update({ is_superadmin: !u.is_superadmin }).eq('id', u.id);
      u.is_superadmin = !u.is_superadmin;
      this.rawUsers.update(prev => [...prev]);
    } catch {
      this.notification.show('Error al cambiar rol', 'error');
    } finally {
      this.userLoading.delete(u.id);
    }
  }

  startAssign(u: UserVM) {
    this.assigningUser.set(u);
    this.assignClubId.set('');
    this.assignClubRole.set('coach');
    this.assignTeamId.set('');
    this.assignRole.set('');
  }

  cancelAssign() {
    this.assigningUser.set(null);
  }

  async confirmAssign() {
    const u = this.assigningUser();
    const clubId = this.assignClubId();
    const teamId = this.assignTeamId();
    const role = this.assignRole();
    if (!u || !clubId) return;

    try {
      const isMember = u.clubRoles.some(r => r.clubId === clubId);

      if (!isMember) {
        const clubRole = this.assignClubRole() || 'coach';
        await this.supabase.client.from('club_members').insert({
          club_id: clubId,
          user_id: u.id,
          role: clubRole,
        });
        u.clubRoles.push({
          clubId,
          clubName: this.allClubs.find(c => c.id === clubId)?.name || '?',
          role: clubRole,
        });
      }

      if (teamId && role) {
        const teamName = (this.teamsByClub.get(clubId) || []).find(t => t.id === teamId)?.name || '?';
        const { data, error } = await this.supabase.client
          .from('team_staff')
          .insert({ user_id: u.id, team_id: teamId, role })
          .select()
          .single();
        if (error) throw error;

        u.teamStaff.push({
          staffId: (data as any).id,
          teamId,
          teamName,
          clubName: this.allClubs.find(c => c.id === clubId)?.name || '?',
          role,
        });
      }

      this.rawUsers.update(prev => [...prev]);
      this.notification.show('Asignado correctamente', 'success');
      this.cancelAssign();
    } catch {
      this.notification.show('Error al asignar', 'error');
    }
  }

  async removeStaff(ts: UserVM['teamStaff'][0], u: UserVM) {
    try {
      await this.supabase.client.from('team_staff').delete().eq('id', ts.staffId);
      u.teamStaff = u.teamStaff.filter(s => s.staffId !== ts.staffId);
      this.rawUsers.update(prev => [...prev]);
      this.notification.show('Eliminado del equipo', 'success');
    } catch {
      this.notification.show('Error al eliminar', 'error');
    }
  }
}
