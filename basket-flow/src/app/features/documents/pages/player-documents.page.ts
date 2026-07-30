import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DocumentRepository } from '../repositories/document.repository';
import { ConsentRepository } from '../repositories/consent.repository';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { Document, PlayerLicense, Player, Consent } from '../../../core/models/models';

@Component({
  selector: 'app-player-documents',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page">
      <div class="header">
        <a [routerLink]="'/documents'" class="btn-back">
          &#8592; Documentos
        </a>
      </div>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else if (player(); as p) {
        <div class="player-info">
          <div class="player-avatar">{{ p.first_name[0] }}{{ p.last_name[0] }}</div>
          <div>
            <h1>{{ p.first_name }} {{ p.last_name }}</h1>
            <p class="player-meta">{{ teamName() }} · Dorsal {{ p.jersey_number || '—' }} · {{ p.position || 'Sin posición' }}</p>
          </div>
        </div>

        <section class="section">
          <h2>Licencia Federativa</h2>
          @if (license(); as lic) {
            <div class="license-card">
              <div class="license-field">
                <span class="field-label">Federación</span>
                <span class="field-value">{{ lic.federation }}</span>
              </div>
              <div class="license-field">
                <span class="field-label">Número</span>
                <span class="field-value">{{ lic.license_number || '—' }}</span>
              </div>
              <div class="license-field">
                <span class="field-label">Temporada</span>
                <span class="field-value">{{ lic.season }}</span>
              </div>
              <div class="license-field">
                <span class="field-label">Estado</span>
                <span class="status-badge" [class]="'badge-' + lic.status">{{ statusLabel(lic.status) }}</span>
              </div>
              <div class="license-field">
                <span class="field-label">Vence</span>
                <span class="field-value">{{ (lic.expires_at | date:'dd/MM/yyyy') || '—' }}</span>
              </div>
            </div>
          } @else {
            <p class="text-muted">Sin licencia registrada.</p>
          }
          <button class="btn-secondary" (click)="editLicense()">
            {{ license() ? 'Editar Licencia' : 'Añadir Licencia' }}
          </button>
        </section>

        <section class="section">
          <h2>Consentimientos</h2>
          <div class="consent-list">
            @for (type of consentTypes; track type) {
              <div class="consent-row">
                <span class="consent-label">{{ consentLabel(type) }}</span>
                @if (hasConsent(type)) {
                  <span class="consent-status granted">Concedido</span>
                  <button class="btn-link danger" (click)="revokeConsent(type)">Revocar</button>
                } @else {
                  <span class="consent-status missing">Pendiente</span>
                  <button class="btn-link" (click)="grantConsent(type)">Conceder</button>
                }
              </div>
            }
          </div>
          @if (consents().length < 3) {
            <p class="consent-hint">Se requieren los 3 consentimientos para activar al jugador.</p>
          }
        </section>

        <section class="section">
          <h2>Documentos</h2>
          <button class="btn-primary" (click)="fileInput.click()">+ Subir Documento</button>
          <input #fileInput type="file" hidden (change)="uploadFile($event)" accept=".pdf,.jpg,.jpeg,.png">

          @if (documents().length === 0) {
            <p class="text-muted" style="margin-top: 16px;">No hay documentos subidos.</p>
          } @else {
            <table class="docs-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Emisión</th>
                  <th>Vencimiento</th>
                  <th>Archivo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (doc of documents(); track doc.id) {
                  <tr>
                    <td>{{ typeLabel(doc.type) }}</td>
                    <td>
                      <span class="status-badge" [class]="'badge-' + doc.status">{{ statusLabel(doc.status) }}</span>
                    </td>
                    <td>{{ (doc.issued_at | date:'dd/MM/yyyy') || '—' }}</td>
                    <td>{{ (doc.expires_at | date:'dd/MM/yyyy') || '—' }}</td>
                    <td>
                      <a [href]="doc.file_url" target="_blank" class="file-link">Ver archivo</a>
                    </td>
                    <td>
                      <button class="btn-icon" (click)="deleteDoc(doc.id)" title="Eliminar">&#10005;</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; margin: 0 auto; }
    .header { margin-bottom: 24px; }
    .btn-back {
      color: var(--text-secondary); text-decoration: none; font-size: 14px;
      display: inline-flex; align-items: center; gap: 6px; transition: color 0.15s;
    }
    .btn-back:hover { color: var(--text-primary); }
    .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
    .player-info {
      display: flex; align-items: center; gap: 16px; margin-bottom: 32px;
    }
    .player-avatar {
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .player-info h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .player-meta { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }

    .section {
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      border-radius: 12px; padding: 20px; margin-bottom: 20px;
    }
    .section h2 { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: var(--text-primary); }

    .license-card { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 16px; }
    .license-field { display: flex; flex-direction: column; gap: 2px; }
    .field-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary); }
    .field-value { font-size: 14px; color: var(--text-primary); font-weight: 500; }

    .status-badge {
      display: inline-block; font-size: 12px; font-weight: 600;
      padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.4px;
    }
    .badge-valid { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge-pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge-expired { background: rgba(239,68,68,0.15); color: #ef4444; }

    .btn-primary {
      background: #bdc2ff; color: #030737; padding: 8px 18px; border: none;
      border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: opacity 0.2s;
    }
    .btn-primary:hover { opacity: 0.9; }
    .btn-secondary {
      background: transparent; color: var(--text-primary); padding: 8px 18px;
      border: 1px solid var(--border-subtle); border-radius: 8px; font-weight: 600;
      font-size: 14px; cursor: pointer; transition: all 0.15s;
    }
    .btn-secondary:hover { border-color: rgba(189,194,255,0.3); }
    .btn-icon {
      background: transparent; border: none; color: var(--text-secondary);
      cursor: pointer; font-size: 14px; padding: 4px 8px; border-radius: 4px;
      transition: all 0.15s;
    }
    .btn-icon:hover { background: rgba(239,68,68,0.15); color: #ef4444; }
    .text-muted { color: var(--text-secondary); font-size: 14px; }
    .file-link { color: #818cf8; text-decoration: none; font-size: 13px; }
    .file-link:hover { text-decoration: underline; }

    .docs-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .docs-table th {
      text-align: left; padding: 10px 12px;
      font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px;
      color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle);
    }
    .docs-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); font-size: 14px; color: var(--text-primary); }

    .consent-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .consent-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); }
    .consent-label { flex: 1; font-size: 14px; color: var(--text-primary); font-weight: 500; }
    .consent-status { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.3px; }
    .granted { background: rgba(16,185,129,0.15); color: #10b981; }
    .missing { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .btn-link { background: none; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: color 0.15s; padding: 4px 8px; border-radius: 4px; }
    .btn-link { color: #818cf8; }
    .btn-link:hover { background: rgba(99,102,241,0.1); }
    .btn-link.danger { color: #ef4444; }
    .btn-link.danger:hover { background: rgba(239,68,68,0.1); }
    .consent-hint { font-size: 12px; color: var(--text-secondary); margin: 0; font-style: italic; }
  `]
})
export class PlayerDocumentsPage {
  private route = inject(ActivatedRoute);
  private repository = inject(DocumentRepository);
  private consentRepo = inject(ConsentRepository);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  player = signal<Player | null>(null);
  teamName = signal('');
  license = signal<PlayerLicense | null>(null);
  documents = signal<Document[]>([]);
  consents = signal<Consent[]>([]);
  loading = signal(true);

  readonly consentTypes: Consent['consent_type'][] = ['imagen', 'datos_medicos', 'tratamiento_datos'];

  private playerId = '';

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('playerId');
      if (id) {
        this.playerId = id;
        this.loadAll();
      }
    });
  }

  private async loadAll() {
    this.loading.set(true);
    try {
      const [{ data: player }, { data: playerTeam }] = await Promise.all([
        this.supabase.client.from('players').select('*').eq('id', this.playerId).single(),
        this.supabase.client.from('player_teams').select('teams(name)').eq('player_id', this.playerId).maybeSingle(),
      ]);
      if (player) {
        this.player.set(player as any);
        this.teamName.set((playerTeam as any)?.teams?.name ?? '');
      }

      const [license, documents, consents] = await Promise.all([
        this.repository.getLicense(this.playerId),
        this.repository.findByPlayer(this.playerId),
        this.consentRepo.findByPlayer(this.playerId),
      ]);
      this.license.set(license);
      this.documents.set(documents);
      this.consents.set(consents);
    } catch { /* ignore */ } finally {
      this.loading.set(false);
    }
  }

  hasConsent(type: Consent['consent_type']): boolean {
    return this.consents().some(c => c.consent_type === type && !c.revoked_at);
  }

  async grantConsent(type: Consent['consent_type']) {
    if (!confirm(`¿Conceder consentimiento de "${this.consentLabel(type)}" para este jugador?`)) return;
    await this.consentRepo.grant(this.playerId, null, type);
    await this.loadAll();
  }

  async revokeConsent(type: Consent['consent_type']) {
    const consent = this.consents().find(c => c.consent_type === type && !c.revoked_at);
    if (!consent) return;
    if (!confirm(`¿Revocar consentimiento de "${this.consentLabel(type)}"?`)) return;
    await this.consentRepo.revoke(consent.id);
    await this.loadAll();
  }

  consentLabel(type: string): string {
    const map: Record<string, string> = {
      imagen: 'Uso de imagen',
      datos_medicos: 'Datos médicos',
      tratamiento_datos: 'Tratamiento de datos',
    };
    return map[type] || type;
  }

  async uploadFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.playerId) return;

    const ext = file.name.split('.').pop();
    const filePath = `${this.playerId}/${Date.now()}.${ext}`;

    const { data, error } = await this.supabase.client.storage
      .from('documents')
      .upload(filePath, file);

    if (error || !data) {
      alert('Error al subir el archivo');
      return;
    }

    const { data: urlData } = await this.supabase.client.storage
      .from('documents')
      .getPublicUrl(data.path);

    const club = await this.supabase.client
      .from('club_members')
      .select('club_id')
      .eq('user_id', this.auth.user()?.id)
      .limit(1)
      .maybeSingle();

    const clubId = (club.data as any)?.club_id;
    if (!clubId) return;

    await this.repository.create({
      club_id: clubId,
      player_id: this.playerId,
      type: 'otro',
      file_url: urlData.publicUrl,
      status: 'pending',
    });

    await this.loadAll();
    input.value = '';
  }

  async deleteDoc(id: string) {
    if (!confirm('¿Eliminar este documento?')) return;
    await this.repository.remove(id);
    await this.loadAll();
  }

  async editLicense() {
    const current = this.license();
    const federation = prompt('Federación:', current?.federation || 'FEB');
    if (!federation) return;
    const licenseNumber = prompt('Número de licencia:', current?.license_number || '');
    if (licenseNumber === null) return;
    const season = prompt('Temporada:', current?.season || new Date().getFullYear().toString());
    if (!season) return;
    const status = prompt('Estado (valid/pending/expired):', current?.status || 'pending') as 'valid' | 'pending' | 'expired';
    if (!['valid', 'pending', 'expired'].includes(status)) return;
    const expiresAt = prompt('Fecha de vencimiento (YYYY-MM-DD):', current?.expires_at?.slice(0, 10) || '');

    await this.repository.upsertLicense({
      id: current?.id,
      player_id: this.playerId,
      federation,
      license_number: licenseNumber,
      season,
      status,
      expires_at: expiresAt || null,
    });

    await this.loadAll();
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      licencia: 'Licencia', autorizacion: 'Autorización', medico: 'Médico', otro: 'Otro',
    };
    return map[type] || type;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = { valid: 'Válido', pending: 'Pendiente', expired: 'Expirado' };
    return map[status] || status;
  }
}
