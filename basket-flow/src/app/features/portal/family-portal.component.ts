import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { AuthService } from '../../core/auth/auth.service';


@Component({
  selector: 'app-family-portal',
  standalone: true,
  imports: [RouterLink, DatePipe, NgIf],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Portal de Familias</h1>
          <p class="page-sub" *ngIf="auth.profile() as profile">Bienvenido, {{ profile.full_name }}</p>
        </div>
      </header>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else {
        @if (players().length === 0) {
          <div class="empty">
            <h3>Sin jugadores vinculados</h3>
            <p>No tienes jugadores asociados. Contacta con el club si crees que es un error.</p>
          </div>
        }

        @if (players().length > 0) {
          <div class="summary-cards">
            <div class="summary-card total">
              <span class="summary-num">{{ players().length }}</span>
              <span class="summary-label">Jugadores</span>
            </div>
            @if (showFinance()) {
              <div class="summary-card warning">
                <span class="summary-num">{{ pendingFeesCount() }}</span>
                <span class="summary-label">Cuotas pendientes</span>
              </div>
            }
            <div class="summary-card danger" *ngIf="expiringDocsCount() > 0">
              <span class="summary-num">{{ expiringDocsCount() }}</span>
              <span class="summary-label">Documentos por renovar</span>
            </div>
          </div>

          <div class="players-grid">
            @for (p of players(); track p.id) {
              <a [routerLink]="['/portal/players', p.id]" class="player-card">
                <div class="player-avatar">{{ p.first_name[0] }}{{ p.last_name[0] }}</div>
                <div class="player-info">
                  <h3>{{ p.first_name }} {{ p.last_name }}</h3>
                  @if (p.teams) {
                    <p class="player-team">{{ p.teams.name }}</p>
                  }
                   <p class="player-meta">Dorsal {{ p.jersey_number || '—' }}</p>
                </div>
                <span class="material-symbols-outlined arrow">chevron_right</span>
              </a>
            }
          </div>

          <div class="grid-2">
            <section class="section">
              <div class="section-header">
                <h2>Próximos eventos</h2>
                <a routerLink="/calendar" class="section-link">Ver calendario</a>
              </div>
              @if (upcomingSessions().length === 0) {
                <p class="text-muted">No hay eventos próximos.</p>
              } @else {
                <div class="event-list">
                  @for (s of upcomingSessions(); track s.id) {
                    <div class="event-item">
                      <div class="event-date">
                        <span class="event-day">{{ s.date | date:'dd' }}</span>
                        <span class="event-month">{{ s.date | date:'MMM' }}</span>
                      </div>
                      <div class="event-info">
                        <span class="event-title">{{ s.title }}</span>
                        <span class="event-team">{{ s.team_name }}</span>
                        <span class="event-time" *ngIf="s.start_time">{{ s.start_time }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>

            @if (showFinance()) {
              <section class="section">
                <div class="section-header">
                  <h2>Cuotas</h2>
                  <a routerLink="/portal" class="section-link">Ver todo</a>
                </div>
                @if (recentFees().length === 0) {
                  <p class="text-muted">Sin cuotas registradas.</p>
                } @else {
                  <div class="fee-list">
                    @for (fee of recentFees(); track fee.id) {
                      <div class="fee-item">
                        <div class="fee-info">
                          <span class="fee-player">{{ fee.player_name }}</span>
                          <span class="fee-due">{{ fee.due_date | date:'dd/MM/yyyy' }}</span>
                        </div>
                        <span class="fee-amount">{{ fee.amount }}€</span>
                        <span class="fee-badge" [class]="'badge-' + fee.status">{{ statusLabel(fee.status) }}</span>
                      </div>
                    }
                  </div>
                }
              </section>
            }
          </div>

          <section class="section announcements-section" *ngIf="announcements().length > 0">
            <div class="section-header">
              <h2>Comunicaciones</h2>
            </div>
            <div class="announcement-list">
              @for (a of announcements(); track a.id) {
                <div class="announcement-item">
                  <span class="material-symbols-outlined announcement-icon">campaign</span>
                  <div class="announcement-body">
                    <strong>{{ a.title }}</strong>
                    <p>{{ a.body }}</p>
                  </div>
                  <span class="announcement-date">{{ a.sent_at | date:'dd/MM/yyyy' }}</span>
                </div>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 32px; }
    .page-title { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; color: var(--text-primary); margin: 0; }
    .page-sub { font-size: 16px; color: var(--text-secondary); margin: 4px 0 0; }
    .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
    .empty { text-align: center; padding: 80px 24px; }
    .empty h3 { margin: 0 0 8px; color: var(--text-primary); }
    .empty p { color: var(--text-secondary); margin: 0; }

    .summary-cards { display: flex; gap: 16px; margin-bottom: 32px; }
    .summary-card {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 20px 32px; border-radius: 12px; min-width: 140px;
      background: var(--bg-card); border: 1px solid var(--border-subtle);
    }
    .summary-num { font-size: 36px; font-weight: 800; line-height: 1; color: var(--text-primary); }
    .summary-label { font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.3px; }
    .summary-card.warning .summary-num { color: #f59e0b; }
    .summary-card.danger .summary-num { color: #ef4444; }

    .players-grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
    .player-card {
      display: flex; align-items: center; gap: 16px;
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      border-radius: 12px; padding: 16px 18px; text-decoration: none;
      transition: border-color 0.15s;
    }
    .player-card:hover { border-color: rgba(189,194,255,0.3); }
    .player-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .player-info { flex: 1; }
    .player-info h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); }
    .player-team { margin: 2px 0 0; font-size: 13px; color: #818cf8; }
    .player-meta { margin: 2px 0 0; font-size: 13px; color: var(--text-secondary); }
    .arrow { color: var(--text-secondary); font-size: 20px; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .section { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 20px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-header h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); }
    .section-link { font-size: 13px; color: #818cf8; text-decoration: none; }
    .section-link:hover { text-decoration: underline; }
    .text-muted { color: var(--text-secondary); font-size: 14px; margin: 0; }

    .event-list { display: flex; flex-direction: column; gap: 10px; }
    .event-item { display: flex; gap: 14px; align-items: center; }
    .event-date {
      display: flex; flex-direction: column; align-items: center;
      background: rgba(99,102,241,0.1); border-radius: 8px;
      padding: 6px 12px; min-width: 48px;
    }
    .event-day { font-size: 18px; font-weight: 700; color: #818cf8; line-height: 1.2; }
    .event-month { font-size: 10px; text-transform: uppercase; color: #818cf8; letter-spacing: 0.3px; }
    .event-info { display: flex; flex-direction: column; gap: 2px; }
    .event-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .event-team { font-size: 12px; color: var(--text-secondary); }
    .event-time { font-size: 12px; color: var(--text-secondary); }

    .fee-list { display: flex; flex-direction: column; gap: 10px; }
    .fee-item { display: flex; align-items: center; gap: 10px; font-size: 14px; }
    .fee-info { flex: 1; display: flex; flex-direction: column; }
    .fee-player { color: var(--text-primary); font-weight: 500; }
    .fee-due { font-size: 12px; color: var(--text-secondary); }
    .fee-amount { font-weight: 600; color: var(--text-primary); }
    .fee-badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge-paid { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge-pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge-overdue { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-cancelled { background: rgba(107,114,128,0.15); color: #6b7280; }

    .announcements-section { margin-bottom: 24px; }
    .announcement-list { display: flex; flex-direction: column; gap: 12px; }
    .announcement-item { display: flex; gap: 12px; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); }
    .announcement-item:last-child { border: none; }
    .announcement-icon { color: #818cf8; font-size: 20px; margin-top: 2px; }
    .announcement-body { flex: 1; }
    .announcement-body strong { display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 2px; }
    .announcement-body p { margin: 0; font-size: 13px; color: var(--text-secondary); }
    .announcement-date { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }

    @media (max-width: 768px) {
      .page { padding: 16px; }
      .grid-2 { grid-template-columns: 1fr; }
      .summary-cards { flex-wrap: wrap; }
    }
  `]
})
export class FamilyPortalComponent {
  private supabase = inject(SupabaseService);
  auth = inject(AuthService);

  // Cambiar a true cuando esté listo el módulo de cuotas
  showFinance = signal(false);

  players = signal<any[]>([]);
  upcomingSessions = signal<any[]>([]);
  recentFees = signal<any[]>([]);
  announcements = signal<any[]>([]);
  loading = signal(true);

  pendingFeesCount = computed(() => this.showFinance() ? this.recentFees().filter(f => f.status === 'pending' || f.status === 'overdue').length : 0);
  expiringDocsCount = computed(() => {
    let count = 0;
    for (const p of this.players()) {
      if ((p as any)._expiringDocs) count += (p as any)._expiringDocs;
    }
    return count;
  });

  constructor() {
    this.load();
  }

  private async load() {
    const userId = this.auth.user()?.id;
    if (!userId) { this.loading.set(false); return; }

    try {
      const { data: guardians } = await this.supabase.client
        .from('player_guardians')
        .select('player_id')
        .eq('user_id', userId);

      if (!guardians || guardians.length === 0) return;

      const playerIds = guardians.map(g => g.player_id);
      const { data: players } = await this.supabase.client
        .from('players')
        .select('*, teams!inner(name, club_id)')
        .in('id', playerIds)
        .is('deleted_at', null);

      if (!players) return;
      this.players.set(players);

      const clubIds = new Set(players.map((p: any) => p.teams?.club_id).filter(Boolean));
      const teamIds = new Set(players.map((p: any) => p.team_id).filter(Boolean));

      const today = new Date().toISOString().split('T')[0];

      const [sessionRes, feeRes, docRes, announcementRes] = await Promise.all([
        teamIds.size > 0
          ? this.supabase.client
              .from('training_sessions')
              .select('id, title, date, start_time, team_id')
              .in('team_id', Array.from(teamIds))
              .gte('date', today)
              .is('deleted_at', null)
              .order('date', { ascending: true })
              .limit(5)
          : Promise.resolve({ data: [] }),

        this.showFinance()
          ? this.supabase.client
              .from('player_fees')
              .select('*, fee_plans!inner(name), players!inner(first_name, last_name)')
              .in('player_id', playerIds)
              .order('due_date', { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] }),

        this.supabase.client
          .from('documents')
          .select('id, player_id, status, expires_at')
          .in('player_id', playerIds),

        clubIds.size > 0
          ? this.supabase.client
              .from('announcements')
              .select('id, title, body, sent_at')
              .in('club_id', Array.from(clubIds))
              .order('sent_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      this.upcomingSessions.set(
        (sessionRes.data || []).map((s: any) => ({
          ...s,
          team_name: (players as any[]).find(p => p.team_id === s.team_id)?.teams?.name || ''
        }))
      );

      if (this.showFinance()) {
        this.recentFees.set(
          (feeRes.data || []).map((f: any) => ({
            ...f,
            player_name: `${f.players?.first_name || ''} ${f.players?.last_name || ''}`.trim()
          }))
        );
      }

      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringByPlayer: Record<string, number> = {};
      for (const doc of docRes.data || []) {
        if (doc.expires_at) {
          const exp = new Date(doc.expires_at);
          if (exp > now && exp < thirtyDays) {
            expiringByPlayer[doc.player_id] = (expiringByPlayer[doc.player_id] || 0) + 1;
          }
        }
      }
      this.players.update(list =>
        list.map(p => ({ ...p, _expiringDocs: expiringByPlayer[p.id] || 0 }))
      );

      this.announcements.set(announcementRes.data || []);
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      paid: 'Pagado', pending: 'Pendiente', overdue: 'Vencido', cancelled: 'Cancelado'
    };
    return map[s] || s;
  }
}
