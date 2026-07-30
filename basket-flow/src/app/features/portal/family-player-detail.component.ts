import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/auth/auth.service';
import { PaymentRepository } from '../finance/repositories/payment.repository';
import { ReceiptService } from '../finance/services/receipt.service';
import type { Player, PlayerLicense, Document, PlayerFee, Payment } from '../../core/models/models';

@Component({
  selector: 'app-family-player-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe],
  template: `
    <div class="page">
      <div class="header">
        <a routerLink="/portal" class="btn-back">&#8592; Portal</a>
      </div>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else if (player(); as p) {
        <div class="player-info">
          <div class="player-avatar">{{ p.first_name[0] }}{{ p.last_name[0] }}</div>
          <div>
            <h1>{{ p.first_name }} {{ p.last_name }}</h1>
            <p class="player-meta">{{ teamName() }} · Dorsal {{ p.jersey_number || '—' }}</p>
          </div>
        </div>

        <section class="section">
          <h2>Licencia</h2>
          @if (license(); as lic) {
            <div class="license-info">
              <span>{{ lic.federation }} · {{ lic.license_number || '—' }}</span>
              <span class="status-badge" [class]="'badge-' + lic.status">{{ statusLabel(lic.status) }}</span>
            </div>
          } @else {
            <p class="text-muted">Sin licencia registrada.</p>
          }
        </section>

        <section class="section">
          <h2>Documentos</h2>
          @if (documents().length === 0) {
            <p class="text-muted">Sin documentos.</p>
          } @else {
            <ul class="doc-list">
              @for (doc of documents(); track doc.id) {
                <li>
                  <span>{{ typeLabel(doc.type) }}</span>
                  <span class="status-badge" [class]="'badge-' + doc.status">{{ statusLabel(doc.status) }}</span>
                  <a [href]="doc.file_url" target="_blank" class="file-link">Ver</a>
                </li>
              }
            </ul>
          }
          @if (canUpload()) {
            <div class="upload-dropzone">
              <div class="upload-label">
                <span class="upload-icon">📄</span>
                <span>Subir un documento para {{ p.first_name }}</span>
              </div>
              <div class="upload-controls">
                <select #docType>
                  <option value="autorizacion">Autorización</option>
                  <option value="medico">Ficha médica</option>
                  <option value="otro">Otro</option>
                </select>
                <label class="btn-upload" [class.uploading]="uploading()">
                  <input type="file" (change)="uploadFile($event, docType.value)" accept=".pdf,.jpg,.jpeg,.png" />
                  {{ uploading() ? 'Subiendo...' : 'Seleccionar archivo' }}
                </label>
              </div>
            </div>
          }
        </section>

        @if (showFinance) {
          <section class="section">
            <h2>Cuotas</h2>
            @if (fees().length === 0) {
              <p class="text-muted">Sin cuotas registradas.</p>
            } @else {
              <table class="table">
                <thead>
                  <tr><th>Vencimiento</th><th>Importe</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  @for (fee of fees(); track fee.id) {
                    <tr>
                      <td>{{ fee.due_date | date:'dd/MM/yyyy' }}</td>
                      <td>{{ fee.amount | currency:'EUR' }}</td>
                      <td><span class="status-badge" [class]="'badge-' + fee.status">{{ statusLabel(fee.status) }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </section>

          <section class="section">
            <h2>Pagos</h2>
            @if (payments().length === 0) {
              <p class="text-muted">Sin pagos registrados.</p>
            } @else {
              <table class="table">
                <thead>
                  <tr><th>Fecha</th><th>Importe</th><th>Método</th><th></th></tr>
                </thead>
                <tbody>
                  @for (p of payments(); track p.id) {
                    <tr>
                      <td>{{ p.paid_at | date:'dd/MM/yyyy' }}</td>
                      <td>{{ p.amount | currency:'EUR' }}</td>
                      <td>{{ methodLabel(p.method) }}</td>
                      <td><button class="btn-small" (click)="downloadReceipt(p)">Recibo</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 800px; margin: 0 auto; }
    .header { margin-bottom: 24px; }
    .btn-back { color: var(--text-secondary); text-decoration: none; font-size: 14px; transition: color 0.15s; }
    .btn-back:hover { color: var(--text-primary); }
    .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
    .player-info { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .player-avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0; }
    .player-info h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .player-meta { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }
    .section { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .section h2 { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: var(--text-primary); }
    .text-muted { color: var(--text-secondary); font-size: 14px; }
    .status-badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.3px; margin-left: 8px; }
    .badge-valid, .badge-paid { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge-pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge-expired, .badge-overdue { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-cancelled { background: rgba(107,114,128,0.15); color: #6b7280; }
    .license-info { font-size: 14px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
    .doc-list { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 8px; }
    .doc-list li { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-primary); }
    .file-link { color: #818cf8; text-decoration: none; font-size: 13px; margin-left: auto; }
    .file-link:hover { text-decoration: underline; }
    .upload-dropzone {
      margin-top: 16px; padding: 20px; border: 2px dashed rgba(129,140,248,0.3);
      border-radius: 12px; background: rgba(129,140,248,0.04); width: 100%; box-sizing: border-box;
    }
    .upload-label { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }
    .upload-icon { font-size: 22px; }
    .upload-controls { display: flex; gap: 12px; align-items: center; }
    .upload-controls select {
      background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff;
      border-radius: 8px; padding: 10px 14px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none; flex: 1; max-width: 200px;
    }
    .btn-upload {
      display: inline-block; background: #bdc2ff; color: #030737; border: none; border-radius: 8px;
      padding: 10px 24px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn-upload:hover { opacity: 0.85; }
    .btn-upload.uploading { opacity: 0.5; pointer-events: none; }
    .btn-upload input[type=file] { display: none; }
    .table { width: 100%; border-collapse: collapse; }
    .table th { text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
    .table td { padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); font-size: 14px; color: var(--text-primary); }
    .btn-small { background: #bdc2ff; color: #030737; padding: 4px 10px; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .btn-small:hover { opacity: 0.9; }
  `]
})
export class FamilyPlayerDetailComponent {
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);
  private paymentRepo = inject(PaymentRepository);
  private receiptService = inject(ReceiptService);

  // Cambiar a true cuando esté listo el módulo de cuotas
  showFinance = false;

  player = signal<Player | null>(null);
  teamName = signal('');
  license = signal<PlayerLicense | null>(null);
  documents = signal<Document[]>([]);
  fees = signal<PlayerFee[]>([]);
  payments = signal<Payment[]>([]);
  loading = signal(true);
  canUpload = signal(false);
  uploading = signal(false);

  private playerId = '';
  private clubId = '';

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
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
        this.supabase.client.from('player_teams').select('teams(name, club_id)').eq('player_id', this.playerId).maybeSingle(),
      ]);
      if (player) {
        this.player.set(player as any);
        this.teamName.set((playerTeam as any)?.teams?.name ?? '');
        this.clubId = (playerTeam as any)?.teams?.club_id ?? '';
      }

      const userId = this.auth.user()?.id;
      if (userId && this.clubId) {
        const [{ data: guardian }, { data: club }] = await Promise.all([
          this.supabase.client.from('player_guardians')
            .select('can_view_documents')
            .eq('player_id', this.playerId)
            .eq('user_id', userId)
            .maybeSingle(),
          this.supabase.client.from('clubs')
            .select('family_can_upload_documents')
            .eq('id', this.clubId)
            .single(),
        ]);
        const guardianCanUpload = (guardian as any)?.can_view_documents === true;
        const clubEnabled = (club as any)?.family_can_upload_documents === true;
        this.canUpload.set(guardianCanUpload && clubEnabled);
      }

      const [license, documents, fees] = await Promise.all([
        this.supabase.client.from('player_licenses').select('*').eq('player_id', this.playerId).maybeSingle(),
        this.supabase.client.from('documents').select('*').eq('player_id', this.playerId).order('created_at', { ascending: false }),
        this.showFinance
          ? this.supabase.client.from('player_fees').select('*').eq('player_id', this.playerId).order('due_date', { ascending: false })
          : Promise.resolve({ data: null }),
      ]);

      this.license.set(license.data as any);
      this.documents.set((documents.data as Document[]) ?? []);

      if (this.showFinance) {
        this.fees.set((fees.data as PlayerFee[]) ?? []);

        if (fees.data && fees.data.length > 0) {
          const allPayments: Payment[] = [];
          for (const fee of fees.data) {
            const p = await this.paymentRepo.findByPlayerFee(fee.id);
            allPayments.push(...p);
          }
          this.payments.set(allPayments);
        }
      }
    } finally {
      this.loading.set(false);
    }
  }

  async uploadFile(event: Event, docType: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.playerId) return;

    this.uploading.set(true);
    try {
      const filePath = `${this.playerId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await this.supabase.client.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = this.supabase.client.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: insertError } = await this.supabase.client
        .from('documents')
        .insert({
          club_id: this.clubId,
          player_id: this.playerId,
          type: docType,
          file_url: publicUrl,
          status: 'pending',
          issued_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      this.notification.show('Documento subido correctamente');
      input.value = '';
      this.loadAll();
    } catch (e) {
      this.notification.show(e instanceof Error ? e.message : String(e));
    } finally {
      this.uploading.set(false);
    }
  }

  typeLabel(t: string): string {
    const map: Record<string, string> = { licencia: 'Licencia', autorizacion: 'Autorización', medico: 'Médico', otro: 'Otro' };
    return map[t] || t;
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = { valid: 'Válido', pending: 'Pendiente', expired: 'Expirado', paid: 'Pagado', overdue: 'Vencido', cancelled: 'Cancelado' };
    return map[s] || s;
  }

  methodLabel(m: string): string {
    const map: Record<string, string> = { transfer: 'Transferencia', cash: 'Efectivo', bizum: 'Bizum', other: 'Otro' };
    return map[m] || m;
  }

  async downloadReceipt(payment: Payment) {
    const fee = this.fees().find(f => f.id === payment.player_fee_id);
    if (!fee) return;
    const player = this.player();
    const club = await this.supabase.client.from('clubs').select('name').eq('id', player?.club_id).single();
    await this.receiptService.generateReceipt(
      payment, fee,
      `${player?.first_name || ''} ${player?.last_name || ''}`,
      (club.data as any)?.name || ''
    );
  }
}
