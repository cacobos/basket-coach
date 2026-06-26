import { Component, inject, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlaybookService } from './playbook.service';
import { CanvasService, EditorState } from './canvas.service';
import { Playbook, Player, PlayerType } from './player.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tactics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tactics.component.html',
  styleUrls: ['./tactics.component.scss']
})
export class TacticsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('basketballCanvas') canvasEl!: ElementRef<HTMLCanvasElement>;

  pbService = inject(PlaybookService);
  canvasService = inject(CanvasService);

  playbook: Playbook = this.pbService.getPlaybook();
  editorState: EditorState = this.canvasService.editorState.value;
  stepDescription = '';
  showPassModal = false;
  showPlayerEditor = false;
  showCurveEditor = false;
  showShapeEditor = false;
  passSourcePlayerId = '';

  private subs: Subscription[] = [];

  ngAfterViewInit(): void {
    this.subs.push(
      this.pbService.playbook$.subscribe(pb => {
        this.playbook = pb;
        const step = this.pbService.getCurrentStep();
        this.stepDescription = step?.description || '';
      })
    );

    this.subs.push(
      this.canvasService.editorState.subscribe(state => {
        this.editorState = state;
        this.showPlayerEditor = !!state.selectedPlayerId && !state.selectedCurveId && !state.selectedShapeId;
        this.showCurveEditor = !!state.selectedCurveId;
        this.showShapeEditor = !!state.selectedShapeId;
      })
    );

    this.subs.push(
      this.canvasService.passDestinationRequest.subscribe(req => {
        if (req) {
          this.passSourcePlayerId = req.playerId;
          this.showPassModal = true;
        }
      })
    );

    setTimeout(() => {
      if (this.canvasEl?.nativeElement) {
        this.canvasService.initCanvas(this.canvasEl.nativeElement);
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get totalSteps(): number {
    return this.playbook?.steps?.length || 1;
  }

  get currentStepNum(): number {
    return (this.playbook?.currentStepIndex ?? 0) + 1;
  }

  get canRemoveStep(): boolean {
    return (this.playbook?.steps?.length ?? 0) > 1;
  }

  setTool(tool: EditorState['selectedTool']): void {
    this.canvasService.setTool(tool);
  }

  setColor(color: string): void {
    this.canvasService.setColor(color);
  }

  clearDrawings(): void {
    this.canvasService.clearDrawings();
  }

  addPlayer(type: PlayerType, number: number): void {
    this.canvasService.addPlayer(type, number);
  }

  passDestinationSelected(targetId: string): void {
    this.showPassModal = false;
    const callback = this.canvasService.passDestinationRequest.value?.callback;
    if (callback) {
      callback(targetId);
    }
    this.canvasService.passDestinationRequest.next(null);
  }

  addBall(): void {
    this.canvasService.addBall();
  }

  addCone(): void {
    this.canvasService.addCone();
  }

  clearAll(): void {
    this.canvasService.clearAll();
  }

  removeSelected(): void {
    this.canvasService.removeSelectedItem();
  }

  removeCurve(): void {
    this.canvasService.removeSelectedCurve();
  }

  removeShape(): void {
    this.canvasService.removeSelectedShape();
  }

  saveDescription(): void {
    const step = this.pbService.getCurrentStep();
    if (step) {
      this.pbService.updateStepDescription(step.id, this.stepDescription);
    }
  }

  exportCurrentStep(): void {
    const dataUrl = this.canvasService.getCanvasDataUrl();
    const link = document.createElement('a');
    link.download = `${this.playbook.name || 'pizarra'}_paso${this.currentStepNum}.png`;
    link.href = dataUrl;
    link.click();
  }

  async exportAllPDF(): Promise<void> {
    const steps = await this.canvasService.exportStepsAsImages();
    if (!steps.length) return;

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const isFull = steps[0].orientation === 'full';
    const imgW = isFull ? pageW / 3 : pageW / 2;
    const imgRatio = isFull ? 384 / 670 : 335 / 384;
    const imgH = imgW * imgRatio;

    for (let i = 0; i < steps.length; i++) {
      if (i > 0) pdf.addPage();

      const step = steps[i];
      const num = i + 1;
      let y = margin;

      pdf.setFontSize(16);
      pdf.text(`${this.playbook.name || 'Pizarra'}`, margin, y);
      y += 10;

      pdf.setFontSize(11);
      pdf.text(`Paso ${num} / ${steps.length}`, margin, y);
      y += 8;

      if (step.description) {
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(step.description, pageW - margin * 2 - (isFull ? 0 : imgW) - 10);
        pdf.text(lines, margin, y);
        y += lines.length * 5 + 4;
      }

      const legendX = margin + imgW + 8;
      const legendW = pageW - margin - legendX;
      pdf.addImage(step.data, 'PNG', margin, y, imgW, imgH);

      pdf.setFontSize(12);
      pdf.text('Leyenda', legendX, y + 4);

      const legendItems = [
        { label: 'Atacante', color: '#3366FF', marker: '●' },
        { label: 'Defensor', color: '#DD0000', marker: '✕' },
        { label: 'Entrenador', color: '#888888', marker: '●' },
        { label: 'Balón', color: '#FF8C00', marker: '●' },
        { label: 'Cono', color: '#FF6600', marker: '▲' },
        { label: 'Movimiento', color: '#666666', marker: '→' },
        { label: 'Dribbling', color: '#666666', marker: '↯' },
        { label: 'Bloqueo', color: '#666666', marker: '⊞' },
        { label: 'Pase', color: '#DD0000', marker: '⇢' },
        { label: 'Pase de mano', color: '#DD0000', marker: '⇝' },
        { label: 'Tiro', color: '#DD0000', marker: '◎' },
      ];

      pdf.setFontSize(9);
      legendItems.forEach((item, idx) => {
        const ly = y + 14 + idx * 6;
        const hex = item.color === '#888888' ? '#666666' : item.color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        pdf.setTextColor(r, g, b);
        pdf.text(`${item.marker} ${item.label}`, legendX, ly);
      });
      pdf.setTextColor(0, 0, 0);

      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(`Generado con Pizarra Táctica — ${new Date().toLocaleDateString()}`, margin, pageH - 8);
      pdf.setTextColor(0, 0, 0);
    }
    pdf.save(`${this.playbook.name || 'pizarra'}.pdf`);
  }

  get passTargetPlayers(): Player[] {
    return this.pbService.getCurrentStep()?.players || [];
  }

  getPlayerNumbers(type: PlayerType): number[] {
    const count = type === 'ATTACKER' ? this.playbook.numberAttackers
      : type === 'DEFENDER' ? this.playbook.numberDefenders
      : this.playbook.numberCoaches;
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  trackById(index: number, item: any): any {
    return item.id || index;
  }
}
