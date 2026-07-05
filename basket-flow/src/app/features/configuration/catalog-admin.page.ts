import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogEditorComponent } from './catalog-editor.component';
import { DataService } from '../../core/services/data.service';
import { ConfigurationService } from '../matches/services/configuration.service';
import { ConfigurationRepository } from '../matches/repositories/configuration.repository';
import type { Team, CatalogAttackType, CatalogSystem, CatalogResult, CatalogInitType } from '../../core/models/models';

type CatalogType = 'attack_types' | 'systems' | 'init_types' | 'results';

@Component({
  selector: 'app-catalog-admin',
  standalone: true,
  imports: [FormsModule, CatalogEditorComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Configuración</h1>
        <p class="page-desc">Gestiona los catálogos. Los sistemas son por equipo; el resto son globales del club.</p>
      </div>

      <div class="catalog-tabs">
        <button class="tab-btn" [class.active]="activeTab() === 'attack_types'" (click)="switchTab('attack_types')">Tipos de ataque</button>
        <button class="tab-btn" [class.active]="activeTab() === 'systems'" (click)="switchTab('systems')">Sistemas</button>
        <button class="tab-btn" [class.active]="activeTab() === 'init_types'" (click)="switchTab('init_types')">Inicios</button>
        <button class="tab-btn" [class.active]="activeTab() === 'results'" (click)="switchTab('results')">Resultados</button>
      </div>

      @if (activeTab() === 'systems') {
        <div class="team-selector">
          <label>Equipo</label>
          <select [ngModel]="selectedTeamId()" (ngModelChange)="selectTeam($event)">
            <option value="">Seleccionar equipo...</option>
            @for (t of teams(); track t.id) {
              <option [value]="t.id">{{ t.name }}</option>
            }
          </select>
        </div>
      }

      @if (activeTab() === 'attack_types') {
        <catalog-editor [items]="attackTypes()" [columns]="['name','short_name','color']" title="Tipos de ataque"
          (add)="addItem('attack_types', $event)" (update)="updateItem('attack_types', $event)" (remove)="removeItem('attack_types', $event)" />
      }
      @if (activeTab() === 'systems' && selectedTeamId()) {
        <catalog-editor [items]="systems()" [columns]="['name','short_name','color']" title="Sistemas"
          (add)="addItem('systems', $event)" (update)="updateItem('systems', $event)" (remove)="removeItem('systems', $event)" />
      }
      @if (activeTab() === 'systems' && !selectedTeamId()) {
        <div class="no-team">Selecciona un equipo para gestionar sus sistemas.</div>
      }
      @if (activeTab() === 'init_types') {
        <catalog-editor [items]="initTypes()" [columns]="['name','short_name','color']" title="Tipos de inicio"
          (add)="addItem('init_types', $event)" (update)="updateItem('init_types', $event)" (remove)="removeItem('init_types', $event)" />
      }
      @if (activeTab() === 'results') {
        <catalog-editor [items]="results()" [columns]="['name','short_name','points','color']" title="Resultados"
          (add)="addItem('results', $event)" (update)="updateItem('results', $event)" (remove)="removeItem('results', $event)" />
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 800px; margin: 0 auto; }
    .page-header { margin-bottom: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
    .page-desc { color: var(--text-secondary); font-size: 14px; margin: 0; }
    .catalog-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--bg-secondary); border-radius: 10px; padding: 4px; }
    .tab-btn {
      flex: 1; padding: 10px 16px; border-radius: 8px; border: none;
      background: transparent; color: var(--text-secondary); font-weight: 600; font-size: 13px;
    }
    .tab-btn:hover { color: var(--text-primary); }
    .tab-btn.active { background: rgba(189,194,255,0.12); color: #bdc2ff; }
    .team-selector { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .team-selector label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); }
    .team-selector select { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; color: var(--text-primary); flex: 1; }
    .team-selector select:focus { border-color: #bdc2ff; }
    .no-team { text-align: center; color: var(--text-secondary); padding: 40px; font-size: 14px; }
  `]
})
export class CatalogAdminPage {
  private dataService = inject(DataService);
  private configService = inject(ConfigurationService);
  private repo = inject(ConfigurationRepository);

  activeTab = signal<CatalogType>('attack_types');
  selectedTeamId = signal('');

  teams = signal<Team[]>([]);

  attackTypes = signal<CatalogAttackType[]>([]);
  systems = signal<CatalogSystem[]>([]);
  initTypes = signal<CatalogInitType[]>([]);
  results = signal<CatalogResult[]>([]);

  constructor() {
    const club = this.dataService.currentClub();
    if (club) {
      this.dataService.getTeams(club.id).then(t => this.teams.set(t));
    }
    this.loadClubCatalogs();
  }

  switchTab(tab: CatalogType) {
    this.activeTab.set(tab);
    if (tab === 'systems' && this.selectedTeamId()) {
      this.loadSystems(this.selectedTeamId());
    }
  }

  selectTeam(teamId: string) {
    this.selectedTeamId.set(teamId);
    if (teamId) this.loadSystems(teamId);
  }

  private async loadClubCatalogs() {
    const club = this.dataService.currentClub();
    if (!club) return;
    try {
      const [at, it, r] = await Promise.all([
        this.repo.findAttackTypes(club.id),
        this.repo.findInitTypes(club.id),
        this.repo.findResults(club.id),
      ]);
      this.attackTypes.set(at);
      this.initTypes.set(it);
      this.results.set(r);
    } catch (e) {
      console.error('Error loading catalogs', e);
    }
  }

  private async loadSystems(teamId: string) {
    try {
      const s = await this.repo.findSystems(teamId);
      this.systems.set(s);
    } catch (e) {
      console.error('Error loading systems', e);
    }
  }

  async addItem(type: CatalogType, data: any) {
    const club = this.dataService.currentClub();
    if (!club) return;
    try {
      if (type === 'systems') {
        const teamId = this.selectedTeamId();
        if (!teamId) return;
        const created = await this.repo.createSystem(teamId, data);
        this.systems.update(prev => [...prev, created]);
      } else {
        const payload = { club_id: club.id, name: data.name, short_name: data.short_name, color: data.color || '#6b7280', points: data.points ?? 0 };
        if (type === 'attack_types') {
          const created = await this.repo.createAttackType(club.id, payload);
          this.attackTypes.update(prev => [...prev, created]);
        } else if (type === 'init_types') {
          const created = await this.repo.createInitType(club.id, payload);
          this.initTypes.update(prev => [...prev, created]);
        } else if (type === 'results') {
          const created = await this.repo.createResult(club.id, { ...payload, points: data.points ?? 0 });
          this.results.update(prev => [...prev, created]);
        }
      }
    } catch (e) {
      console.error('Error adding item', e);
    }
  }

  async updateItem(type: CatalogType, data: any) {
    try {
      const payload = { name: data.name, short_name: data.short_name, color: data.color };
      if (type === 'systems') {
        await this.repo.updateSystem(data.id, payload);
        this.systems.update(prev => prev.map(i => i.id === data.id ? { ...i, ...payload } : i));
      } else if (type === 'attack_types') {
        await this.repo.updateAttackType(data.id, payload);
        this.attackTypes.update(prev => prev.map(i => i.id === data.id ? { ...i, ...payload } : i));
      } else if (type === 'init_types') {
        await this.repo.updateInitType(data.id, payload);
        this.initTypes.update(prev => prev.map(i => i.id === data.id ? { ...i, ...payload } : i));
      } else if (type === 'results') {
        await this.repo.updateResult(data.id, { ...payload, points: data.points });
        this.results.update(prev => prev.map(i => i.id === data.id ? { ...i, ...payload, points: data.points } : i));
      }
    } catch (e) {
      console.error('Error updating item', e);
    }
  }

  async removeItem(type: CatalogType, id: string) {
    try {
      if (type === 'systems') {
        await this.repo.deleteSystem(id);
        this.systems.update(prev => prev.filter(i => i.id !== id));
      } else if (type === 'attack_types') {
        await this.repo.deleteAttackType(id);
        this.attackTypes.update(prev => prev.filter(i => i.id !== id));
      } else if (type === 'init_types') {
        await this.repo.deleteInitType(id);
        this.initTypes.update(prev => prev.filter(i => i.id !== id));
      } else if (type === 'results') {
        await this.repo.deleteResult(id);
        this.results.update(prev => prev.filter(i => i.id !== id));
      }
    } catch (e) {
      console.error('Error deleting item', e);
    }
  }
}