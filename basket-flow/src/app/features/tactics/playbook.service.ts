import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Playbook, Step, CourtType, CourtOrientation } from './player.model';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class PlaybookService {
  private dbIdKey = 'basket-flow-playbook-db-id';
  private backupKey = 'basket-flow-playbook-backup';

  private dataService = inject(DataService);
  private auth = inject(AuthService);

  private playbookSubject = new BehaviorSubject<Playbook>(this.createDefaultPlaybook());
  playbook$: Observable<Playbook> = this.playbookSubject.asObservable();

  private dbId: string | null = localStorage.getItem(this.dbIdKey);

  constructor() {
    this.auth.ready.then(() => this.loadFromServer());
  }

  private async loadFromServer() {
    if (!this.auth.user()?.id) return;

    if (this.dbId) {
      const row = await this.dataService.getPlaybook(this.dbId);
      if (row) {
        this.playbookSubject.next(this.dbRowToPlaybook(row));
        return;
      }
    }

    const rows = await this.dataService.getPlaybooks();
    if (rows.length > 0) {
      this.dbId = rows[0].id;
      localStorage.setItem(this.dbIdKey, this.dbId);
      this.playbookSubject.next(this.dbRowToPlaybook(rows[0]));
    }
  }

  private async saveToServer() {
    if (!this.auth.user()?.id) return;
    const pb = this.playbookSubject.value;

    if (this.dbId) {
      await this.dataService.updatePlaybook(this.dbId, this.playbookToDbRow(pb));
    } else {
      const clubId = this.dataService.currentClub()?.id;
      if (!clubId) return;
      const row = await this.dataService.createPlaybook({
        club_id: clubId,
        name: pb.name,
        description: null,
        category: '',
        court_type: this.courtTypeToDb(pb.courtType),
        view_mode: 'full',
        steps: pb.steps,
        tags: [],
        config: {
          courtOrientation: pb.courtOrientation,
          fullCourt: pb.fullCourt,
          numberAttackers: pb.numberAttackers,
          numberDefenders: pb.numberDefenders,
          numberCoaches: pb.numberCoaches,
          numberBalls: pb.numberBalls,
          numberCones: pb.numberCones,
          currentStepIndex: pb.currentStepIndex,
        },
      });
      if (row) {
        this.dbId = row.id;
        localStorage.setItem(this.dbIdKey, this.dbId);
      }
    }
  }

  private courtTypeFromDb(val: string): CourtType {
    if (val === 'highschool') return 'high_school';
    if (val === 'nba' || val === 'fiba') return val;
    return 'fiba';
  }

  private dbRowToPlaybook(row: any): Playbook {
    const steps: Step[] = (row.steps || []).map((s: any, i: number) => ({
      id: s.id || i + 1,
      name: s.name || `Paso ${i + 1}`,
      players: s.players || [],
      balls: s.balls || [],
      cones: s.cones || [],
      curves: s.curves || [],
      shapes: s.shapes || [],
      description: s.description || '',
      screenshotUrl: s.screenshotUrl,
    }));

    const cfg = row.config || {};
    return {
      id: Date.now(),
      name: row.name,
      courtType: this.courtTypeFromDb(cfg.courtType || row.court_type || 'fiba'),
      courtOrientation: (cfg.courtOrientation || 'full') as CourtOrientation,
      fullCourt: cfg.fullCourt ?? true,
      numberAttackers: cfg.numberAttackers ?? 5,
      numberDefenders: cfg.numberDefenders ?? 5,
      numberCoaches: cfg.numberCoaches ?? 0,
      numberBalls: cfg.numberBalls ?? 1,
      numberCones: cfg.numberCones ?? 0,
      steps,
      currentStepIndex: cfg.currentStepIndex ?? 0,
    };
  }

  private courtTypeToDb(type: CourtType): 'fiba' | 'nba' | 'highschool' {
    if (type === 'high_school') return 'highschool';
    return type;
  }

  private playbookToDbRow(pb: Playbook) {
    return {
      name: pb.name,
      court_type: this.courtTypeToDb(pb.courtType),
      steps: pb.steps,
      config: {
        courtOrientation: pb.courtOrientation,
        fullCourt: pb.fullCourt,
        numberAttackers: pb.numberAttackers,
        numberDefenders: pb.numberDefenders,
        numberCoaches: pb.numberCoaches,
        numberBalls: pb.numberBalls,
        numberCones: pb.numberCones,
        currentStepIndex: pb.currentStepIndex,
      },
    };
  }

  private createDefaultPlaybook(): Playbook {
    const step: Step = {
      id: 1, name: 'Paso 1',
      players: [], balls: [], cones: [], curves: [], shapes: [], description: ''
    };
    return {
      id: Date.now(), name: 'Mi Pizarra',
      courtType: 'fiba', courtOrientation: 'full', fullCourt: true,
      numberAttackers: 5, numberDefenders: 5, numberCoaches: 0,
      numberBalls: 1, numberCones: 0,
      steps: [step], currentStepIndex: 0
    };
  }

  private backupToLocal() {
    localStorage.setItem(this.backupKey, JSON.stringify(this.playbookSubject.value));
  }

  save(): void {
    this.backupToLocal();
    this.saveToServer();
  }

  getPlaybook(): Playbook { return this.playbookSubject.value; }
  getCurrentStep(): Step {
    const pb = this.playbookSubject.value;
    return pb.steps[pb.currentStepIndex];
  }
  get currentStepIndex(): number { return this.playbookSubject.value.currentStepIndex; }

  updateName(name: string): void {
    const pb = { ...this.playbookSubject.value, name };
    this.playbookSubject.next(pb);
    this.backupToLocal();
    this.saveToServer();
  }

  setCourtType(type: CourtType): void {
    const pb = { ...this.playbookSubject.value, courtType: type };
    this.playbookSubject.next(pb);
    this.saveToServer();
  }

  setFullCourt(full: boolean): void {
    const pb = { ...this.playbookSubject.value, fullCourt: full };
    this.playbookSubject.next(pb);
    this.saveToServer();
  }

  setCourtOrientation(orientation: CourtOrientation): void {
    const pb = { ...this.playbookSubject.value, courtOrientation: orientation };
    this.playbookSubject.next(pb);
    this.saveToServer();
  }

  addStep(): void {
    const pb = this.playbookSubject.value;
    const lastStep = pb.steps[pb.steps.length - 1];
    const newStep: Step = {
      id: lastStep.id + 1, name: `Paso ${lastStep.id + 1}`,
      players: lastStep.players.map(p => ({ ...p })),
      balls: lastStep.balls.map(b => ({ ...b })),
      cones: lastStep.cones.map(c => ({ ...c })),
      curves: [], shapes: [], description: ''
    };
    pb.steps.push(newStep);
    pb.currentStepIndex = pb.steps.length - 1;
    this.playbookSubject.next({ ...pb });
    this.saveToServer();
  }

  removeStep(): void {
    const pb = this.playbookSubject.value;
    if (pb.steps.length <= 1) return;
    pb.steps.splice(pb.currentStepIndex, 1);
    if (pb.currentStepIndex >= pb.steps.length) {
      pb.currentStepIndex = pb.steps.length - 1;
    }
    this.playbookSubject.next({ ...pb });
    this.saveToServer();
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.playbookSubject.value.steps.length) return;
    const pb = { ...this.playbookSubject.value, currentStepIndex: index };
    this.playbookSubject.next(pb);
  }

  nextStep(): void { this.goToStep(this.playbookSubject.value.currentStepIndex + 1); }
  prevStep(): void { this.goToStep(this.playbookSubject.value.currentStepIndex - 1); }

  updateStepDescription(stepId: number, description: string): void {
    const pb = this.playbookSubject.value;
    const step = pb.steps.find(s => s.id === stepId);
    if (step) {
      step.description = description;
      this.playbookSubject.next({ ...pb });
      this.saveToServer();
    }
  }

  async saveNewPlaybook(name: string): Promise<void> {
    if (!this.auth.user()?.id) return;
    const pb = this.createDefaultPlaybook();
    pb.name = name;
    const row = await this.dataService.createPlaybook({
      club_id: this.dataService.currentClub()?.id || '',
      name,
      description: null,
      category: '',
      court_type: 'fiba',
      view_mode: 'full',
      steps: pb.steps,
      tags: [],
      config: {
        courtOrientation: 'full',
        fullCourt: true,
        numberAttackers: 5,
        numberDefenders: 5,
        numberCoaches: 0,
        numberBalls: 1,
        numberCones: 0,
        currentStepIndex: 0,
      },
    });
    if (row) {
      this.dbId = row.id;
      localStorage.setItem(this.dbIdKey, this.dbId);
      this.playbookSubject.next(pb);
    }
  }
}
