import { Component, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { NgFor } from '@angular/common';
import Konva from 'konva';

type CourtView = 'full' | 'offensive_half' | 'defensive_half';

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="whiteboard-app" #whiteboardEl>
      <div class="wb-header">
        <div class="wb-header-left">
          <span class="wb-title">Pizarra libre</span>
        </div>
        <div class="wb-header-actions">
          <button class="wb-btn-outline" (click)="undo()">↩ Deshacer</button>
          <button class="wb-btn-outline" (click)="redo()">↪ Rehacer</button>
          <button class="wb-btn-outline" (click)="clearAll()">🗑 Borrar todo</button>
          <button class="wb-btn-outline" (click)="downloadPng()">⬇ Exportar PNG</button>
        </div>
      </div>

      <div class="wb-toolbar">
        <div class="wb-group">
          <span class="wb-label">Pista</span>
          <button class="wb-btn" [class.active]="courtView === 'full'" (click)="setCourtView('full')">Completa</button>
          <button class="wb-btn" [class.active]="courtView === 'offensive_half'" (click)="setCourtView('offensive_half')">Media Of</button>
          <button class="wb-btn" [class.active]="courtView === 'defensive_half'" (click)="setCourtView('defensive_half')">Media Def</button>
        </div>

        <div class="wb-group">
          <span class="wb-label">Herramienta</span>
          <button class="wb-btn" [class.active]="currentTool === 'draw'" (click)="setTool('draw')">
            <span class="material-symbols-outlined">draw</span>
          </button>
          <button class="wb-btn" [class.active]="currentTool === 'erase'" (click)="setTool('erase')">
            <span class="material-symbols-outlined">auto_fix_off</span>
          </button>
        </div>

        <div class="wb-group">
          <span class="wb-label">Grosor</span>
          <button *ngFor="let s of sizes" class="wb-btn size-btn" [class.active]="currentSize === s" (click)="setSize(s)">
            <span class="size-dot" [style.width.px]="s" [style.height.px]="s"></span>
          </button>
        </div>

        <div class="wb-group">
          <span class="wb-label">Color</span>
          <button *ngFor="let c of colors" class="wb-color-btn" [style.background]="c" [class.active]="currentColor === c" (click)="setColor(c)"></button>
        </div>

        <div class="wb-group">
          <button class="wb-btn" (click)="toggleFullscreen()">
            <span class="material-symbols-outlined">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
          </button>
        </div>
      </div>

      <div class="wb-canvas-wrapper" #container></div>
    </div>
  `,
  styles: [`
    .whiteboard-app {
      display: flex; flex-direction: column; height: 100vh;
      background: #0d0f23; overflow: hidden;
    }
    .whiteboard-app:fullscreen {
      width: 100vw; height: 100vh;
    }
    .wb-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 16px; background: #151a3a;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .wb-header-left { display: flex; align-items: center; gap: 16px; }
    .wb-title { font-size: 16px; font-weight: 700; color: #dfe0ff; }
    .wb-header-actions { display: flex; gap: 6px; }
    .wb-btn-outline {
      padding: 6px 12px; font-size: 12px; background: #212653;
      color: #c6c5d4; border: 1px solid rgba(69,70,82,0.3);
      border-radius: 8px; cursor: pointer;
    }
    .wb-btn-outline:hover { background: #2c315f; color: #dfe0ff; }

    .wb-toolbar {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 12px; background: #151a3a;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-wrap: wrap;
    }
    .wb-group {
      display: flex; align-items: center; gap: 4px;
      padding: 0 8px; border-right: 1px solid rgba(255,255,255,0.08);
    }
    .wb-group:last-child { border-right: none; }
    .wb-label { font-size: 10px; text-transform: uppercase; color: #5c5c73; font-weight: 600; white-space: nowrap; }
    .wb-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 5px 10px; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04); color: #b0b0c5;
      border-radius: 6px; cursor: pointer; font-size: 11px; white-space: nowrap;
    }
    .wb-btn:hover { background: rgba(255,255,255,0.08); color: #dfe0ff; }
    .wb-btn.active { background: #0068ed; color: white; border-color: #0068ed; }
    .wb-btn .material-symbols-outlined { font-size: 14px; }

    .size-btn { display: flex; align-items: center; justify-content: center; min-width: 28px; min-height: 28px; }
    .size-dot { display: block; border-radius: 50%; background: white; }

    .wb-color-btn {
      width: 22px; height: 22px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.2); cursor: pointer;
    }
    .wb-color-btn:hover { transform: scale(1.2); }
    .wb-color-btn.active { border-color: white; box-shadow: 0 0 0 2px #0068ed; }

    .wb-canvas-wrapper {
      flex: 1; display: flex; align-items: center; justify-content: center;
      overflow: hidden; position: relative; touch-action: none;
      background: #fff;
    }
  `]
})
export class WhiteboardComponent {
  private containerRef = viewChild<ElementRef<HTMLDivElement>>('container');
  private whiteboardRef = viewChild<ElementRef<HTMLDivElement>>('whiteboardEl');

  private stage!: Konva.Stage;
  private bgLayer!: Konva.Layer;
  private drawLayer!: Konva.Layer;
  private bgImage: Konva.Image | null = null;
  private isDrawing = false;
  private currentLine: Konva.Line | null = null;
  private drawnLines: Konva.Line[] = [];
  private removedLines: Konva.Line[] = [];

  courtView: CourtView = 'full';
  isFullscreen = false;
  currentTool: 'draw' | 'erase' = 'draw';
  currentColor = '#000000';
  currentSize = 4;
  sizes = [2, 4, 8, 14];
  colors = ['#000000', '#DD0000', '#3366FF', '#00AA00', '#FF6600', '#9900CC'];

  constructor() {
    afterNextRender(() => {
      this.initStage();
    });
  }

  private getCourtImageUrl(view: CourtView): { url: string; flipY: boolean } {
    switch (view) {
      case 'full':
        return { url: '/images/fiba_full_court.png', flipY: false };
      case 'offensive_half':
        return { url: '/images/fiba_half_court.png', flipY: false };
      case 'defensive_half':
        return { url: '/images/fiba_half_court.png', flipY: true };
    }
  }

  private initStage(): void {
    const container = this.containerRef()?.nativeElement;
    if (!container) return;

    this.stage = new Konva.Stage({
      container,
      width: container.clientWidth,
      height: container.clientHeight,
      draggable: false,
    });

    this.bgLayer = new Konva.Layer();
    this.drawLayer = new Konva.Layer();

    this.stage.add(this.bgLayer);
    this.stage.add(this.drawLayer);

    this.loadBgImage();

    this.stage.on('mousedown', (e) => this.onMouseDown(e));
    this.stage.on('mousemove', (e) => this.onMouseMove(e));
    this.stage.on('mouseup', () => this.onMouseUp());

    window.addEventListener('resize', this.onResize);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  private loadBgImage(): void {
    const { url, flipY } = this.getCourtImageUrl(this.courtView);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (this.bgImage) {
        this.bgImage.destroy();
      }

      this.bgImage = new Konva.Image({
        image: img,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: flipY ? -1 : 1,
        listening: false,
      });

      this.bgLayer.add(this.bgImage);
      this.fitBgImage();
      this.bgLayer.batchDraw();
    };
    img.onerror = () => {
      console.error('Failed to load court image:', url);
    };
    img.src = url;
  }

  private fitBgImage(): void {
    if (!this.bgImage) return;
    const container = this.containerRef()?.nativeElement;
    if (!container) return;

    const margin = 16;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const img = this.bgImage.image() as HTMLImageElement;
    if (!img) return;

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    const maxW = cw - margin * 2;
    const maxH = ch - margin * 2;
    const scale = Math.min(maxW / iw, maxH / ih);

    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = this.bgImage.scaleY() < 0 ? (ch - dh) / 2 + dh : (ch - dh) / 2;

    this.bgImage.setAttr('x', dx);
    this.bgImage.setAttr('y', dy);
    this.bgImage.setAttr('scaleX', scale);
    this.bgImage.setAttr('scaleY', this.bgImage.scaleY() < 0 ? -scale : scale);
    this.bgImage.setAttr('width', iw);
    this.bgImage.setAttr('height', ih);

    this.stage.width(cw);
    this.stage.height(ch);
  }

  setCourtView(view: CourtView): void {
    this.courtView = view;
    this.loadBgImage();
  }

  setTool(tool: 'draw' | 'erase'): void {
    this.currentTool = tool;
  }

  setColor(color: string): void {
    this.currentColor = color;
    this.currentTool = 'draw';
  }

  setSize(size: number): void {
    this.currentSize = size;
  }

  private onMouseDown(e: Konva.KonvaEventObject<MouseEvent>): void {
    if (e.target !== this.stage) return;
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    if (this.currentTool === 'erase') {
      const clicked = this.stage.getIntersection(pos);
      if (clicked && clicked.name() === 'drawing') {
        const idx = this.drawnLines.indexOf(clicked as Konva.Line);
        if (idx >= 0) {
          this.drawnLines.splice(idx, 1);
          this.removedLines.push(clicked as Konva.Line);
        }
        clicked.destroy();
        this.drawLayer.batchDraw();
      }
      return;
    }

    this.isDrawing = true;
    this.currentLine = new Konva.Line({
      points: [pos.x, pos.y],
      stroke: this.currentColor,
      strokeWidth: this.currentSize,
      lineCap: 'round',
      lineJoin: 'round',
      name: 'drawing',
      draggable: false,
    });
    this.drawLayer.add(this.currentLine);
    this.drawLayer.batchDraw();
  }

  private onMouseMove(_e: Konva.KonvaEventObject<MouseEvent>): void {
    if (!this.isDrawing || !this.currentLine || this.currentTool === 'erase') return;
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const points = this.currentLine.points();
    points.push(pos.x, pos.y);
    this.currentLine.points(points);
    this.drawLayer.batchDraw();
  }

  private onMouseUp(): void {
    if (this.isDrawing && this.currentLine) {
      this.drawnLines.push(this.currentLine);
      this.removedLines = [];
    }
    this.isDrawing = false;
    this.currentLine = null;
  }

  clearAll(): void {
    for (const line of this.drawnLines) {
      line.destroy();
    }
    this.drawnLines = [];
    this.removedLines = [];
    this.drawLayer.batchDraw();
  }

  undo(): void {
    const last = this.drawnLines.pop();
    if (!last) return;
    last.remove();
    this.removedLines.push(last);
    this.drawLayer.batchDraw();
  }

  redo(): void {
    const last = this.removedLines.pop();
    if (!last) return;
    this.drawLayer.add(last);
    this.drawnLines.push(last);
    this.drawLayer.batchDraw();
  }

  downloadPng(): void {
    const uri = this.stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = 'pizarra-libre.png';
    link.href = uri;
    link.click();
  }

  toggleFullscreen(): void {
    const el = this.whiteboardRef()?.nativeElement;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private onFullscreenChange = (): void => {
    this.isFullscreen = !!document.fullscreenElement;
    if (!this.stage) return;
    requestAnimationFrame(() => {
      const container = this.containerRef()?.nativeElement;
      if (!container) return;
      this.stage.width(container.clientWidth);
      this.stage.height(container.clientHeight);
      this.fitBgImage();
    });
  };

  private onResize = (): void => {
    if (!this.stage) return;
    const container = this.containerRef()?.nativeElement;
    if (!container) return;
    this.stage.width(container.clientWidth);
    this.stage.height(container.clientHeight);
    this.fitBgImage();
  };
}
