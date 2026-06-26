import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fabric } from 'fabric';

type CourtView = 'full' | 'offensive_half' | 'defensive_half';

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './whiteboard.component.html',
  styleUrls: ['./whiteboard.component.scss']
})
export class WhiteboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('whiteboardCanvas') canvasEl!: ElementRef<HTMLCanvasElement>;

  private canvas!: fabric.Canvas;
  courtView: CourtView = 'full';
  courtImgSrc = '/images/fiba_full_court.png';
  courtFlip = '';
  currentTool: 'draw' | 'erase' = 'draw';
  currentColor = '#000000';
  currentSize = 4;

  private readonly STORAGE_KEY = 'pizarra-whiteboard-paths';

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  ngOnDestroy(): void {
    this.canvas?.dispose();
  }

  private initCanvas(): void {
    this.canvas = new fabric.Canvas(this.canvasEl.nativeElement, {
      width: 800,
      height: 600,
      selection: false,
      preserveObjectStacking: true,
      renderOnAddRemove: true
    });

    this.canvas.on('path:created', (e: any) => {
      if (this.currentTool === 'erase') {
        const path = e.path as fabric.Path;
        path.set({ globalCompositeOperation: 'destination-out', fill: '', objectCaching: false });
        this.canvas.renderAll();
      }
      this.savePaths();
    });

    this.applyCourtBackground();
    this.setupDrawing();
    this.loadPaths();
    this.canvas.renderAll();

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const wrapper = this.canvasEl.nativeElement.closest('.wb-canvas-wrapper')!;
    this.canvas.setWidth(wrapper.clientWidth);
    this.canvas.setHeight(wrapper.clientHeight);
  };

  private fitCanvas(): void {
    const wrapper = this.canvasEl.nativeElement.closest('.wb-canvas-wrapper')!;
    this.canvas.setWidth(wrapper.clientWidth);
    this.canvas.setHeight(wrapper.clientHeight);
  }

  private setupDrawing(): void {
    this.setTool('draw');
  }

  private applyCourtBackground(): void {
    const wrapper = this.canvasEl.nativeElement.closest('.wb-canvas-wrapper') as HTMLElement;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    this.canvas.setWidth(w);
    this.canvas.setHeight(h);

    const isFull = this.courtView === 'full';
    this.courtImgSrc = isFull ? '/images/fiba_full_court.png' : '/images/fiba_half_court.png';
    this.courtFlip = this.courtView === 'defensive_half' ? 'scaleY(-1)' : '';
  }

  setCourtView(view: CourtView): void {
    this.courtView = view;
    const paths = this.getPaths();
    this.canvas.clear();
    this.applyCourtBackground();
    paths.forEach(p => this.canvas.add(p));
  }

  setTool(tool: 'draw' | 'erase'): void {
    this.currentTool = tool;
    this.canvas.isDrawingMode = true;
    const brush = new fabric.PencilBrush(this.canvas);
    brush.color = tool === 'draw' ? this.currentColor : '#ffffff';
    brush.width = tool === 'draw' ? this.currentSize : this.currentSize * 3;
    brush.strokeLineCap = 'round';
    brush.strokeLineJoin = 'round';
    this.canvas.freeDrawingBrush = brush;
    this.canvas.selection = false;
  }

  setColor(color: string): void {
    this.currentColor = color;
    this.setTool('draw');
  }

  setSize(size: number): void {
    this.currentSize = size;
    const brush = new fabric.PencilBrush(this.canvas);
    brush.color = this.currentTool === 'draw' ? this.currentColor : '#ffffff';
    brush.width = this.currentTool === 'draw' ? size : size * 3;
    brush.strokeLineCap = 'round';
    brush.strokeLineJoin = 'round';
    this.canvas.freeDrawingBrush = brush;
  }

  clearAll(): void {
    this.getPaths().forEach(p => this.canvas.remove(p));
    this.canvas.renderAll();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private getPaths(): fabric.Path[] {
    return this.canvas.getObjects().filter(o => o.type === 'path') as fabric.Path[];
  }

  private savePaths(): void {
    const json = JSON.stringify(this.getPaths().map(p => p.toJSON()));
    localStorage.setItem(this.STORAGE_KEY, json);
  }

  private loadPaths(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (!saved) return;
    try {
      const paths: any[] = JSON.parse(saved);
      paths.forEach(data => {
        new Promise<void>((resolve) => {
          const ctor = fabric.util.getKlass('path', '');
          ctor.fromObject(data, (obj: fabric.Path) => {
            const opts: any = { selectable: false, evented: false };
            if (obj.globalCompositeOperation === 'destination-out') {
              opts.objectCaching = false;
            }
            obj.set(opts);
            this.canvas.add(obj);
            resolve();
          });
        });
      });
      this.canvas.renderAll();
    } catch { /* ignore */ }
  }
}
