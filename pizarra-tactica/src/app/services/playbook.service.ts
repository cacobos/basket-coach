import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Playbook, Step, CourtType, CourtOrientation } from '../models/player.model';

@Injectable({ providedIn: 'root' })
export class PlaybookService {
  private readonly STORAGE_KEY = 'pizarra-playbook';

  private playbookSubject = new BehaviorSubject<Playbook>(this.loadDefault());
  playbook$: Observable<Playbook> = this.playbookSubject.asObservable();

  private loadDefault(): Playbook {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return this.createDefaultPlaybook();
  }

  private createDefaultPlaybook(): Playbook {
    const step: Step = {
      id: 1,
      name: 'Paso 1',
      players: [],
      balls: [],
      cones: [],
      curves: [],
      shapes: [],
      description: ''
    };
    return {
      id: Date.now(),
      name: 'Mi Pizarra',
      courtType: 'nba',
      courtOrientation: 'full',
      fullCourt: false,
      numberAttackers: 5,
      numberDefenders: 5,
      numberCoaches: 0,
      numberBalls: 1,
      numberCones: 0,
      steps: [step],
      currentStepIndex: 0
    };
  }

  private save(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.playbookSubject.value));
  }

  getPlaybook(): Playbook {
    return this.playbookSubject.value;
  }

  getCurrentStep(): Step {
    const pb = this.playbookSubject.value;
    return pb.steps[pb.currentStepIndex];
  }

  get currentStepIndex(): number {
    return this.playbookSubject.value.currentStepIndex;
  }

  updateName(name: string): void {
    const pb = { ...this.playbookSubject.value, name };
    this.playbookSubject.next(pb);
    this.save();
  }

  setCourtType(type: CourtType): void {
    const pb = { ...this.playbookSubject.value, courtType: type };
    this.playbookSubject.next(pb);
    this.save();
  }

  setFullCourt(full: boolean): void {
    const pb = { ...this.playbookSubject.value, fullCourt: full };
    this.playbookSubject.next(pb);
    this.save();
  }

  setCourtOrientation(orientation: CourtOrientation): void {
    const pb = { ...this.playbookSubject.value, courtOrientation: orientation };
    this.playbookSubject.next(pb);
    this.save();
  }

  addStep(): void {
    const pb = this.playbookSubject.value;
    const lastStep = pb.steps[pb.steps.length - 1];
    const newStep: Step = {
      id: lastStep.id + 1,
      name: `Paso ${lastStep.id + 1}`,
      players: lastStep.players.map(p => ({ ...p })),
      balls: lastStep.balls.map(b => ({ ...b })),
      cones: lastStep.cones.map(c => ({ ...c })),
      curves: [],
      shapes: [],
      description: ''
    };
    pb.steps.push(newStep);
    pb.currentStepIndex = pb.steps.length - 1;
    this.playbookSubject.next({ ...pb });
    this.save();
  }

  removeStep(): void {
    const pb = this.playbookSubject.value;
    if (pb.steps.length <= 1) return;
    pb.steps.splice(pb.currentStepIndex, 1);
    if (pb.currentStepIndex >= pb.steps.length) {
      pb.currentStepIndex = pb.steps.length - 1;
    }
    this.playbookSubject.next({ ...pb });
    this.save();
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.playbookSubject.value.steps.length) return;
    const pb = { ...this.playbookSubject.value, currentStepIndex: index };
    this.playbookSubject.next(pb);
  }

  nextStep(): void {
    this.goToStep(this.playbookSubject.value.currentStepIndex + 1);
  }

  prevStep(): void {
    this.goToStep(this.playbookSubject.value.currentStepIndex - 1);
  }

  updateStepDescription(stepId: number, description: string): void {
    const pb = this.playbookSubject.value;
    const step = pb.steps.find(s => s.id === stepId);
    if (step) {
      step.description = description;
      this.playbookSubject.next({ ...pb });
      this.save();
    }
  }
}
