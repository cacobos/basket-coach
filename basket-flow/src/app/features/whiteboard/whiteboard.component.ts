import { Component, ElementRef, inject, viewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import Konva from 'konva';
import { NotificationService } from '../../core/services/notification.service';

type CourtView = 'full' | 'offensive_half' | 'defensive_half';

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whiteboard.component.html',
  styleUrls: ['./whiteboard.component.scss']
})
export class WhiteboardComponent {
  private containerRef = viewChild<ElementRef<HTMLDivElement>>('container');
  private whiteboardRef = viewChild<ElementRef<HTMLDivElement>>('whiteboardEl');
  private notification = inject(NotificationService);

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

    this.stage.on('mousedown touchstart pointerdown', (e) => this.onMouseDown(e));
    this.stage.on('mousemove touchmove pointermove', (e) => this.onMouseMove(e));
    this.stage.on('mouseup touchend pointerup', () => this.onMouseUp());

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
      this.notification.show(`Failed to load court image: ${url}`);
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

  private onMouseDown(e: Konva.KonvaEventObject<Event>): void {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    if (this.currentTool === 'erase') {
      const hit = e.target !== this.stage && e.target.name() === 'drawing'
        ? e.target as Konva.Line
        : this.hitTestLine(pos);
      if (hit) {
        const idx = this.drawnLines.indexOf(hit);
        if (idx >= 0) {
          this.drawnLines.splice(idx, 1);
          this.removedLines.push(hit);
        }
        hit.destroy();
        this.drawLayer.batchDraw();
      }
      return;
    }

    if (e.target !== this.stage) return;
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

  private onMouseMove(_e: Konva.KonvaEventObject<Event>): void {
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

  private hitTestLine(pos: { x: number; y: number }): Konva.Line | null {
    const threshold = Math.max(20, this.currentSize * 3);
    let best: Konva.Line | null = null;
    let bestDist = threshold;
    for (const line of this.drawnLines) {
      const pts = line.points();
      for (let i = 0; i < pts.length - 1; i += 2) {
        const dx = pos.x - pts[i];
        const dy = pos.y - pts[i + 1];
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) {
          bestDist = d;
          best = line;
        }
      }
    }
    return best;
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
