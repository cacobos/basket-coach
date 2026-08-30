import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { DataService } from '../../core/services/data.service';
import { SeasonService } from '../../core/services/season.service';
import { ConfigurationRepository } from '../matches/repositories/configuration.repository';
import { FeePlanRepository } from '../finance/repositories/fee-plan.repository';

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  template: `
    <div class="page">
      <div class="steps-bar">
        <div class="step-dot" *ngFor="let s of steps; let i = index"
          [class.active]="i + 1 === currentStep()"
          [class.done]="i + 1 < currentStep()">
          <span class="dot-num">{{ i + 1 < currentStep() ? '✓' : i + 1 }}</span>
          <span class="dot-label">{{ s }}</span>
        </div>
      </div>

      <div class="step-body" *ngIf="currentStep() === 1">
        <h2>Crear equipos</h2>
        <p class="hint">Añade los equipos de tu club. Puedes añadir más tarde desde Equipos.</p>
        <div class="team-form" *ngFor="let t of teamForms(); let i = index">
          <input [(ngModel)]="t.name" placeholder="Nombre (ej. Cadete Masc.)" class="input" />
          <select [(ngModel)]="t.category" class="input select">
            <option value="">Categoría...</option>
            <option value="Pre-benjamín">Pre-benjamín</option>
            <option value="Benjamín">Benjamín</option>
            <option value="Alevín">Alevín</option>
            <option value="Infantil">Infantil</option>
            <option value="Cadete">Cadete</option>
            <option value="Junior">Junior</option>
            <option value="Senior">Senior</option>
          </select>
          <button class="btn-icon" (click)="removeTeamForm(i)" *ngIf="teamForms().length > 1">✕</button>
        </div>
        <button class="btn-link" (click)="addTeamForm()">+ Añadir otro equipo</button>
        <div class="actions">
          <button class="btn-primary" [disabled]="!teamFormsValid()" (click)="saveTeams()">
            {{ savingTeams() ? 'Guardando...' : 'Guardar equipos' }}
          </button>
        </div>
      </div>

      <div class="step-body" *ngIf="currentStep() === 2">
        <h2>Importar jugadores</h2>
        <p class="hint">Selecciona un equipo e introduce los jugadores (Nombre Apellido, Dorsal, Posición)</p>
        <div class="import-form">
          <select [(ngModel)]="importTeamId" class="input select">
            <option value="">Seleccionar equipo...</option>
            <option *ngFor="let t of savedTeams()" [value]="t.id">{{ t.name }}</option>
          </select>
          <textarea [(ngModel)]="rawData" rows="8" class="input" placeholder="Juan Pérez, 7, Base&#10;Ana García, 10, Alero"></textarea>
        </div>
        <div class="actions">
          <button class="btn-secondary" (click)="prevStep()">Atrás</button>
          <button class="btn-primary" [disabled]="!importTeamId || !rawData.trim()" (click)="importPlayers()">
            {{ importing() ? 'Importando...' : 'Importar jugadores' }}
          </button>
        </div>
        <div class="result" *ngIf="importResult()">
          <span [class.success]="importResult()!.success > 0" [class.error]="importResult()!.failed > 0">
            {{ importResult()!.success }} importados, {{ importResult()!.failed }} errores
          </span>
        </div>
      </div>

      <div class="step-body" *ngIf="currentStep() === 3">
        <h2>Invitar staff</h2>
        <p class="hint">Añade entrenadores a los equipos (opcional — puedes hacerlo después desde Miembros)</p>
        <div class="staff-form" *ngFor="let s of staffInvites(); let i = index">
          <select [(ngModel)]="s.teamId" class="input select">
            <option value="">Equipo...</option>
            <option *ngFor="let t of savedTeams()" [value]="t.id">{{ t.name }}</option>
          </select>
          <select [(ngModel)]="s.role" class="input select">
            <option value="coach">Entrenador</option>
            <option value="team_admin">Team Admin</option>
          </select>
          <input [(ngModel)]="s.email" placeholder="email@ejemplo.com" class="input" />
          <button class="btn-icon" (click)="removeStaffInvite(i)" *ngIf="staffInvites().length > 1">✕</button>
        </div>
        <button class="btn-link" (click)="addStaffInvite()">+ Añadir invitación</button>
        <div class="actions">
          <button class="btn-secondary" (click)="prevStep()">Atrás</button>
          <button class="btn-primary" (click)="nextStep()">Saltar / Siguiente</button>
        </div>
      </div>

      <div class="step-body" *ngIf="currentStep() === 4">
        <h2>Configurar cuotas</h2>
        <p class="hint">Define planes de cuota para los equipos (opcional — puedes configurarlos después en Finanzas)</p>
        <div class="fee-form" *ngFor="let f of feePlans(); let i = index">
          <input [(ngModel)]="f.name" placeholder="Nombre (ej. Cuota mensual)" class="input" />
          <input [(ngModel)]="f.amount" type="number" step="0.01" placeholder="Importe (€)" class="input" />
          <select [(ngModel)]="f.teamId" class="input select">
            <option value="">Todos los equipos</option>
            <option *ngFor="let t of savedTeams()" [value]="t.id">{{ t.name }}</option>
          </select>
          <select [(ngModel)]="f.frequency" class="input select">
            <option value="monthly">Mensual</option>
            <option value="seasonal">Temporada</option>
            <option value="one_time">Pago único</option>
          </select>
          <button class="btn-icon" (click)="removeFeePlan(i)" *ngIf="feePlans().length > 1">✕</button>
        </div>
        <button class="btn-link" (click)="addFeePlan()">+ Añadir plan de cuota</button>
        <div class="actions">
          <button class="btn-secondary" (click)="prevStep()">Atrás</button>
          <button class="btn-primary" (click)="saveFeePlans()">
            {{ savingFees() ? 'Guardando...' : 'Guardar y continuar' }}
          </button>
        </div>
      </div>

      <div class="step-body" *ngIf="currentStep() === 5">
        <h2>Finalizar configuración</h2>
        <div class="summary">
          <div class="sum-item"><span class="sum-label">Equipos creados</span><span class="sum-val">{{ savedTeams().length }}</span></div>
          <div class="sum-item" *ngIf="importResult() as ir"><span class="sum-label">Jugadores importados</span><span class="sum-val">{{ ir.success }}</span></div>
        </div>
        <p class="hint">Vamos a inicializar los catálogos de partido (tipos de ataque, sistemas, etc.) para tu club.</p>
        <div class="actions">
          <button class="btn-primary" (click)="finish()" [disabled]="finishing()">
            {{ finishing() ? 'Finalizando...' : 'Inicializar catálogos y finalizar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 32px; max-width: 720px; margin: 0 auto; }
    .steps-bar { display: flex; gap: 0; margin-bottom: 32px; background: var(--bg-secondary); border-radius: 12px; padding: 8px; }
    .step-dot { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative; }
    .dot-num { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.05); color: var(--text-secondary); transition: all 0.2s; }
    .step-dot.active .dot-num { background: #bdc2ff; color: #030737; }
    .step-dot.done .dot-num { background: rgba(16,185,129,0.2); color: #10b981; }
    .dot-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-secondary); }
    .step-dot.active .dot-label { color: var(--text-primary); }
    .step-body { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 28px; }
    .step-body h2 { font-size: 18px; font-weight: 700; margin: 0 0 6px; color: var(--text-primary); }
    .hint { font-size: 13px; color: var(--text-secondary); margin: 0 0 20px; }
    .team-form, .staff-form, .fee-form { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; }
    .input { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 14px; color: var(--text-primary); font-size: 14px; font-family: inherit; outline: none; flex: 1; }
    .input:focus { border-color: #818cf8; }
    .select { cursor: pointer; }
    textarea.input { resize: vertical; min-height: 140px; width: 100%; }
    .btn-primary { background: #bdc2ff; color: #030737; padding: 10px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-secondary { background: transparent; color: var(--text-primary); padding: 10px 24px; border: 1px solid var(--border-subtle); border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; }
    .btn-link { background: none; border: none; color: #818cf8; font-size: 13px; font-weight: 600; cursor: pointer; padding: 6px 0; }
    .btn-icon { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px; padding: 4px; }
    .actions { display: flex; gap: 12px; margin-top: 24px; }
    .result { margin-top: 16px; font-size: 14px; font-weight: 600; }
    .success { color: #10b981; }
    .error { color: #ef4444; }
    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .sum-item { background: var(--bg-secondary); border-radius: 10px; padding: 16px; text-align: center; }
    .sum-label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 4px; }
    .sum-val { font-size: 24px; font-weight: 800; color: var(--text-primary); }
    .import-form { display: flex; flex-direction: column; gap: 12px; }
  `]
})
export class OnboardingWizardComponent {
  private supabase = inject(SupabaseService);
  private dataService = inject(DataService);
  private configRepo = inject(ConfigurationRepository);
  private feePlanRepo = inject(FeePlanRepository);
  private router = inject(Router);

  readonly steps = ['Equipos', 'Jugadores', 'Staff', 'Cuotas', 'Finalizar'];
  currentStep = signal(1);

  teamForms = signal<{ name: string; category: string }[]>([{ name: '', category: '' }]);
  savedTeams = signal<any[]>([]);
  savingTeams = signal(false);

  importTeamId = '';
  rawData = '';
  importing = signal(false);
  importResult = signal<{ success: number; failed: number } | null>(null);

  staffInvites = signal<{ teamId: string; role: string; email: string }[]>([]);

  feePlans = signal<{ name: string; amount: number; teamId: string; frequency: string }[]>([]);
  savingFees = signal(false);

  finishing = signal(false);

  teamFormsValid = () => this.teamForms().some(t => t.name.trim() && t.category);

  addTeamForm() { this.teamForms.update(f => [...f, { name: '', category: '' }]); }
  removeTeamForm(i: number) { this.teamForms.update(f => f.filter((_, idx) => idx !== i)); }

  async saveTeams() {
    const club = this.dataService.currentClub();
    if (!club) return;
    this.savingTeams.set(true);
    try {
      const forms = this.teamForms().filter(t => t.name.trim() && t.category);
      const teams: any[] = [];
      for (const t of forms) {
        const { data } = await this.supabase.client
          .from('teams').insert({ club_id: club.id, name: t.name.trim(), category: t.category, season: SeasonService.getCurrentSeason() })
          .select('id, name, category').single();
        if (data) teams.push(data);
      }
      this.savedTeams.set(teams);
      this.nextStep();
    } finally {
      this.savingTeams.set(false);
    }
  }

  nextStep() { this.currentStep.update(s => Math.min(s + 1, 5)); }
  prevStep() { this.currentStep.update(s => Math.max(s - 1, 1)); }

  async importPlayers() {
    if (!this.importTeamId || !this.rawData.trim()) return;
    this.importing.set(true);
    this.importResult.set(null);
    const club = this.dataService.currentClub();
    let success = 0;
    let failed = 0;
    for (const line of this.rawData.trim().split('\n').map(l => l.trim()).filter(Boolean)) {
      try {
        const parts = line.split(',').map(p => p.trim());
        const nameParts = parts[0].split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';
        if (!firstName || !lastName) { failed++; continue; }
        await this.supabase.client.from('players').insert({
          team_id: this.importTeamId, club_id: club?.id,
          first_name: firstName, last_name: lastName,
          jersey_number: parts[1] ? parseInt(parts[1], 10) || null : null,
          position: parts[2] || null, is_active: true,
        });
        success++;
      } catch { failed++; }
    }
    this.importResult.set({ success, failed });
    this.importing.set(false);
  }

  addStaffInvite() { this.staffInvites.update(s => [...s, { teamId: '', role: 'coach', email: '' }]); }
  removeStaffInvite(i: number) { this.staffInvites.update(s => s.filter((_, idx) => idx !== i)); }

  addFeePlan() { this.feePlans.update(f => [...f, { name: '', amount: 0, teamId: '', frequency: 'monthly' }]); }
  removeFeePlan(i: number) { this.feePlans.update(f => f.filter((_, idx) => idx !== i)); }

  async saveFeePlans() {
    const club = this.dataService.currentClub();
    if (!club) return;
    this.savingFees.set(true);
    try {
      for (const fp of this.feePlans().filter(f => f.name.trim() && f.amount > 0)) {
        await this.feePlanRepo.create({
          club_id: club.id, team_id: fp.teamId || null,
          name: fp.name.trim(), amount: fp.amount,
          frequency: fp.frequency as any,
        });
      }
      this.nextStep();
    } finally {
      this.savingFees.set(false);
    }
  }

  async finish() {
    const club = this.dataService.currentClub();
    if (!club) return;
    this.finishing.set(true);
    try {
      await this.configRepo.seedMatchCatalogs(club.id);
      this.router.navigate(['/dashboard']);
    } finally {
      this.finishing.set(false);
    }
  }
}
