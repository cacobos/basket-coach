import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DocumentRepository } from '../repositories/document.repository';
import { DataService } from '../../../core/services/data.service';
import { AlertBannerComponent } from '../../../shared/components/alert-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import type { PlayerDocumentsStatus, Document } from '../../../core/models/models';

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [RouterLink, DatePipe, AlertBannerComponent, EmptyStateComponent],
  template: `
    <div class="page">
      <h1>Documentos</h1>

      @if (expiring().length > 0) {
        <app-alert-banner severity="warn">
          <strong>{{ expiring().length }} documento(s) próximos a vencer</strong>
          <ul>
            @for (doc of expiring(); track doc.id) {
              <li>
                {{ docTypeLabel(doc.type) }} —
                vence {{ doc.expires_at | date:'dd/MM/yyyy' }}
                @if (docPlayerName(doc); as name) {
                  de {{ name }}
                }
              </li>
            }
          </ul>
        </app-alert-banner>
      }

      @if (loading()) {
        <div class="loading">Cargando documentos...</div>
      } @else if (statuses().length === 0) {
        <app-empty-state
          icon="description"
          title="No hay jugadores con documentos"
          hint="Los documentos de los jugadores aparecerán aquí una vez que se registren."
        />
      } @else {
        <table class="players-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Licencia</th>
              <th>Válidos</th>
              <th>Pendientes</th>
              <th>Expirados</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            @for (s of statuses(); track s.player_id) {
              <tr class="player-row" [routerLink]="['/documents', s.player_id]">
                <td class="player-name">{{ s.first_name }} {{ s.last_name }}</td>
                <td>
                  <span class="status-badge" [class]="'badge-' + (s.license_status || 'pending')">
                    {{ licenseLabel(s.license_status) }}
                  </span>
                </td>
                <td>
                  <span class="status-badge badge-valid">{{ s.valid_docs }}</span>
                </td>
                <td>
                  <span class="status-badge badge-pending">{{ s.pending_docs }}</span>
                </td>
                <td>
                  <span class="status-badge badge-expired">{{ s.expired_docs }}</span>
                </td>
                <td>{{ s.total_docs }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 24px; color: var(--text-primary); }
    .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
    .players-table {
      width: 100%; border-collapse: collapse;
      background: var(--bg-card); border-radius: 12px; overflow: hidden;
    }
    .players-table th {
      text-align: left; padding: 12px 16px;
      font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--text-secondary); background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-subtle);
    }
    .players-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); font-size: 14px; color: var(--text-primary); }
    .player-row { cursor: pointer; transition: background 0.15s; }
    .player-row:hover { background: rgba(189,194,255,0.05); }
    .player-name { font-weight: 600; }
    .status-badge {
      display: inline-block; font-size: 12px; font-weight: 600;
      padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.4px;
    }
    .badge-valid { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge-pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge-expired { background: rgba(239,68,68,0.15); color: #ef4444; }
  `]
})
export class DocumentsListPage {
  private repository = inject(DocumentRepository);
  private dataService = inject(DataService);
  statuses = signal<PlayerDocumentsStatus[]>([]);
  expiring = signal<any[]>([]);
  loading = signal(true);

  constructor() {
    this.tryLoad();
  }

  private tryLoad() {
    if (this.dataService.currentClub()) {
      this.load();
    } else {
      setTimeout(() => this.tryLoad(), 100);
    }
  }

  private async load() {
    const club = this.dataService.currentClub();
    if (!club) return this.tryLoad();
    try {
      const [statuses, expiring] = await Promise.all([
        this.repository.getPlayerDocumentsStatus(club.id),
        this.repository.getExpiringSoon(club.id),
      ]);
      this.statuses.set(statuses);
      this.expiring.set(expiring);
    } catch { /* ignore */ } finally {
      this.loading.set(false);
    }
  }

  licenseLabel(status: string | null): string {
    const map: Record<string, string> = { valid: 'Válida', pending: 'Pendiente', expired: 'Expirada' };
    return map[status ?? ''] || 'Pendiente';
  }

  docTypeLabel(type: string): string {
    const map: Record<string, string> = {
      licencia: 'Licencia', autorizacion: 'Autorización', medico: 'Médico', otro: 'Otro',
    };
    return map[type] || type;
  }

  docPlayerName(doc: any): string | null {
    if (doc.players) return `${doc.players.first_name} ${doc.players.last_name}`;
    return null;
  }
}
