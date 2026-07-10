import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { fabric } from 'fabric';
import { BehaviorSubject } from 'rxjs';
import { PlaybookService } from './playbook.service';
import { ActionType, CourtType, CanvasPlayer, PlayerType, ActionCurve, DrawingShape, CanvasBall, CanvasCone, FreePathData } from './canvas.models';

export interface EditorState {
  selectedTool: 'select' | 'move' | 'dribble' | 'block' | 'pass' | 'hand_pass' | 'shoot' | 'draw' | 'draw_circle' | 'draw_rect' | 'eraser' | null;
  selectedColor: string;
  selectedPlayerId: string | null;
  selectedCurveId: string | null;
  selectedShapeId: string | null;
}

const PLAYER_COLORS: Record<PlayerType, string> = {
  ATTACKER: '#3366FF',
  DEFENDER: '#DD0000',
  COACH: '#666666'
};

const ACTION_COLORS: Record<ActionType, string> = {
  MOVE: '#666666',
  DRIBBLE: '#666666',
  BLOCK: '#666666',
  PASS: '#DD0000',
  HAND_PASS: '#DD0000',
  SHOOT: '#DD0000'
};

const ACTION_DASHED: Record<ActionType, number[] | null> = {
  MOVE: null,
  DRIBBLE: null,
  BLOCK: null,
  PASS: [6, 4],
  HAND_PASS: [3, 4],
  SHOOT: null
};

const marginTop = 40;

@Injectable({ providedIn: 'root' })
export class CanvasService implements OnDestroy {
  private canvas!: fabric.Canvas;
  private playerObjects: Map<string, fabric.Group> = new Map();
  private ballObjects: Map<string, fabric.Object> = new Map();
  private coneObjects: Map<string, fabric.Object> = new Map();
  private curveObjects: Map<string, fabric.Group> = new Map();
  private shapeObjects: Map<string, fabric.Object> = new Map();
  private pathObjects: Map<string, fabric.Path> = new Map();

  editorState = new BehaviorSubject<EditorState>({
    selectedTool: 'select',
    selectedColor: '#666666',
    selectedPlayerId: null,
    selectedCurveId: null,
    selectedShapeId: null
  });

  passDestinationRequest = new BehaviorSubject<{ playerId: string; callback: (targetId: string) => void } | null>(null);

  private drawStartPoint: { x: number; y: number } | null = null;
  private isDrawing = false;
  private canvasWidth = 600;
  private canvasHeight = 420;
  private drawCurveStart: { x: number; y: number } | null = null;
  private pendingActionType: ActionType | null = null;
  private previewCurveLine: fabric.Line | null = null;
  private previewShape: fabric.Object | null = null;

  constructor(
    private playbookService: PlaybookService,
    private ngZone: NgZone
  ) {
    this.playbookService.playbook$.subscribe(() => {
      this.ngZone.run(() => this.renderCurrentStep());
    });
  }

  ngOnDestroy(): void {
    this.canvas?.dispose();
  }

  initCanvas(canvasEl: HTMLCanvasElement): void {
    this.canvas = new fabric.Canvas(canvasEl, {
      width: this.canvasWidth,
      height: this.canvasHeight,
      selection: true,
      preserveObjectStacking: true
    });

    this.setupCanvasEvents();
    this.renderCurrentStep();
    this.canvas.renderAll();
  }

  private setupCanvasEvents(): void {
    this.canvas.on('mouse:down', (opt) => this.handleMouseDown(opt));
    this.canvas.on('mouse:move', (opt) => this.handleMouseMove(opt));
    this.canvas.on('mouse:up', (opt) => this.handleMouseUp(opt));
    this.canvas.on('selection:created', (opt) => this.handleSelection(opt));
    this.canvas.on('selection:cleared', () => this.handleDeselection());
    this.canvas.on('object:modified', () => this.savePlayerPositions());
    this.canvas.on('path:created', (opt) => this.handlePathCreated(opt));
  }

  private drawCourt(): void {
    const pb = this.playbookService.getPlaybook();
    const isFull = pb.courtOrientation === 'full';
    const imgUrl = isFull ? '/images/fiba_full_court.png' : '/images/fiba_half_court.png';

    fabric.Image.fromURL(imgUrl, (img) => {
      this.canvasWidth = img.width!;
      this.canvasHeight = img.height!;
      this.canvas.setWidth(this.canvasWidth);
      this.canvas.setHeight(this.canvasHeight);

      if (pb.courtOrientation === 'defensive_half') {
        img.set({ flipY: true });
      }

      this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas), {
        originX: 'left',
        originY: 'top'
      });
      this.renderDynamicObjects();
    }, { crossOrigin: 'anonymous' });
  }

  private renderCurrentStep(): void {
    if (!this.canvas) return;
    this.canvas.discardActiveObject();
    this.clearDynamicObjects();
    this.drawCourt();
  }

  private renderDynamicObjects(): void {
    const step = this.playbookService.getCurrentStep();
    if (!step) return;

    step.players.forEach(p => this.drawPlayer(p));
    step.balls.forEach(b => this.drawBall(b));
    step.cones.forEach(c => this.drawCone(c));
    step.shapes.forEach(s => this.drawShape(s));
    step.curves.forEach(c => this.drawCurve(c));
    (step.paths || []).forEach(p => this.drawPath(p));

    this.canvas.renderAll();
  }

  private clearDynamicObjects(): void {
    this.playerObjects.forEach(obj => this.canvas.remove(obj));
    this.playerObjects.clear();
    this.ballObjects.forEach(obj => this.canvas.remove(obj));
    this.ballObjects.clear();
    this.coneObjects.forEach(obj => this.canvas.remove(obj));
    this.coneObjects.clear();
    this.curveObjects.forEach(obj => this.canvas.remove(obj));
    this.curveObjects.clear();
    this.shapeObjects.forEach(obj => this.canvas.remove(obj));
    this.shapeObjects.clear();
    this.pathObjects.forEach(obj => this.canvas.remove(obj));
    this.pathObjects.clear();
  }

  private drawPlayer(player: CanvasPlayer): void {
    if (player.type === 'DEFENDER') {
      this.drawDefenderX(player);
      return;
    }

    const r = 16;
    const color = PLAYER_COLORS[player.type];
    const label = `${player.number}`;

    const circle = new fabric.Circle({
      radius: r,
      fill: player.type === 'COACH' ? '#555' : color,
      stroke: '#fff',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      opacity: player.type === 'COACH' ? 0.8 : 1
    });

    const text = new fabric.Text(label, {
      fontSize: 12,
      fill: '#fff',
      fontWeight: 'bold',
      originX: 'center',
      originY: 'center'
    });

    const group = new fabric.Group([circle, text], {
      left: player.x,
      top: player.y,
      originX: 'center',
      originY: 'center',
      hasControls: true,
      hasBorders: true,
      cornerSize: 8,
      transparentCorners: false,
      cornerColor: '#3366FF'
    });

    group.data = { type: 'player', playerId: player.id, playerNumber: player.number, playerType: player.type };
    this.canvas.add(group);
    this.playerObjects.set(player.id, group);
  }

  private drawDefenderX(player: CanvasPlayer): void {
    const size = 16;
    const half = size / 2;
    const line1 = new fabric.Line(
      [-half, -half, half, half],
      { stroke: '#DD0000', strokeWidth: 3, originX: 'center', originY: 'center' }
    );
    const line2 = new fabric.Line(
      [half, -half, -half, half],
      { stroke: '#DD0000', strokeWidth: 3, originX: 'center', originY: 'center' }
    );
    const label = new fabric.Text(`${player.number}`, {
      fontSize: 11, fill: '#DD0000', fontWeight: 'bold',
      originX: 'center', originY: 'center',
      top: half + 10
    });

    const group = new fabric.Group([line1, line2, label], {
      left: player.x, top: player.y,
      originX: 'center', originY: 'center',
      hasControls: true, hasBorders: true,
      cornerSize: 8, transparentCorners: false, cornerColor: '#DD0000'
    });
    group.data = { type: 'player', playerId: player.id, playerNumber: player.number, playerType: player.type };
    this.canvas.add(group);
    this.playerObjects.set(player.id, group);
  }

  private drawBall(ball: CanvasBall): void {
    const obj = new fabric.Circle({
      radius: 9,
      fill: '#FF8C00',
      stroke: '#CC7000',
      strokeWidth: 2,
      left: ball.x,
      top: ball.y,
      originX: 'center',
      originY: 'center',
      hasControls: true,
      hasBorders: true,
      cornerSize: 8,
      transparentCorners: false,
      cornerColor: '#FF8C00'
    });
    obj.data = { type: 'ball', ballId: ball.id };
    this.canvas.add(obj);
    this.ballObjects.set(ball.id, obj);
  }

  private drawCone(cone: CanvasCone): void {
    const triangle = new fabric.Triangle({
      width: 18,
      height: 18,
      fill: '#FF6600',
      stroke: '#CC5500',
      strokeWidth: 1.5,
      left: cone.x,
      top: cone.y,
      originX: 'center',
      originY: 'center',
      hasControls: true,
      hasBorders: true,
      cornerSize: 8,
      transparentCorners: false,
      cornerColor: '#FF6600'
    });
    triangle.data = { type: 'cone', coneId: cone.id };
    this.canvas.add(triangle);
    this.coneObjects.set(cone.id, triangle);
  }

  private drawCurve(curve: ActionCurve): void {
    if (curve.points.length < 2) return;
    const pts = curve.points.map(p => ({ x: p.x, y: p.y }));
    const last = pts[pts.length - 1];
    const prev = pts.length > 1 ? pts[pts.length - 2] : pts[0];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x) * 180 / Math.PI;
    const rad = angle * Math.PI / 180;
    const strokeColor = curve.color || ACTION_COLORS[curve.type] || '#666666';

    let children: fabric.Object[] = [];

    if (curve.type === 'HAND_PASS') {
      const offset = 4;
      const perpX = offset * Math.cos(rad + Math.PI / 2);
      const perpY = offset * Math.sin(rad + Math.PI / 2);
      const off = (p: { x: number; y: number }) => ({
        x: p.x + perpX, y: p.y + perpY
      });
      const path1 = this.createCurvePath(pts.map(off), false);
      const path2 = this.createCurvePath(pts.map(p => ({
        x: p.x - perpX, y: p.y - perpY
      })), false);
      const line1 = new fabric.Path(path1, {
        stroke: strokeColor, strokeWidth: 2, fill: 'transparent',
        strokeDashArray: [3, 4], selectable: true, hasControls: false, evented: true
      });
      const line2 = new fabric.Path(path2, {
        stroke: strokeColor, strokeWidth: 2, fill: 'transparent',
        strokeDashArray: [3, 4], selectable: true, hasControls: false, evented: true
      });
      children = [line1, line2];
    } else {
      const dashPattern = curve.type === 'SHOOT' ? null : ACTION_DASHED[curve.type];
      const strokeWidth = 2.5;
      const isZigzag = curve.type === 'DRIBBLE';
      const path = this.createCurvePath(pts, isZigzag);
      const line = new fabric.Path(path, {
        stroke: strokeColor, strokeWidth, fill: 'transparent',
        strokeDashArray: dashPattern || undefined,
        selectable: true, hasControls: false, evented: true
      });
      children = [line];

      if (curve.type === 'SHOOT') {
        const barLen = 8;
        const gap = 3;
        const perpX = barLen * Math.cos(rad + Math.PI / 2);
        const perpY = barLen * Math.sin(rad + Math.PI / 2);
        const alongX = gap * Math.cos(rad);
        const alongY = gap * Math.sin(rad);

        const bar1 = new fabric.Line(
          [last.x - perpX - alongX, last.y - perpY - alongY, last.x + perpX - alongX, last.y + perpY - alongY],
          { stroke: strokeColor, strokeWidth: 2.5, originX: 'center', originY: 'center', selectable: false, evented: false, strokeLineCap: 'round' }
        );
        const bar2 = new fabric.Line(
          [last.x - perpX + alongX, last.y - perpY + alongY, last.x + perpX + alongX, last.y + perpY + alongY],
          { stroke: strokeColor, strokeWidth: 2.5, originX: 'center', originY: 'center', selectable: false, evented: false, strokeLineCap: 'round' }
        );
        children.push(bar1, bar2);
      } else if (curve.type === 'BLOCK') {
        const barLen = 10;
        const perpX = barLen * Math.cos(rad + Math.PI / 2);
        const perpY = barLen * Math.sin(rad + Math.PI / 2);
        const bar = new fabric.Line(
          [last.x - perpX, last.y - perpY, last.x + perpX, last.y + perpY],
          { stroke: strokeColor, strokeWidth: 3, originX: 'center', originY: 'center', selectable: false, evented: false, strokeLineCap: 'round' }
        );
        children.push(bar);
      } else {
        const arrowSize = 10;
        const arrowHead = new fabric.Triangle({
          width: arrowSize * 1.4, height: arrowSize,
          fill: strokeColor, originX: 'center', originY: 'center',
          left: last.x, top: last.y, angle: angle + 90,
          selectable: false, evented: false
        });
        children.push(arrowHead);
      }
    }

    const group = new fabric.Group(children, {
      selectable: true,
      evented: true,
      hasControls: false
    });
    group.data = { type: 'curve', curveId: curve.id, actionType: curve.type, playerId: curve.playerId };

    this.canvas.add(group);
    this.curveObjects.set(curve.id, group);
  }

  private createCurvePath(points: { x: number; y: number }[], zigzag: boolean = false): string {
    if (zigzag && points.length >= 2) {
      return this.createZigzagPath(points[0], points[points.length - 1]);
    }
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const cx = (points[i].x + points[i + 1].x) / 2;
      const cy = (points[i].y + points[i + 1].y) / 2;
      path += ` Q ${points[i].x} ${points[i].y} ${cx} ${cy}`;
    }
    if (points.length > 1) {
      const last = points[points.length - 1];
      path += ` L ${last.x} ${last.y}`;
    }
    return path;
  }

  private createZigzagPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const zigWidth = 8;
    const zigCount = Math.max(3, Math.floor(dist / 25));
    let path = `M ${from.x} ${from.y}`;
    for (let i = 1; i < zigCount; i++) {
      const t = i / zigCount;
      const mx = from.x + dx * t;
      const my = from.y + dy * t;
      const side = i % 2 === 1 ? 1 : -1;
      const zx = mx + perpX * zigWidth * side;
      const zy = my + perpY * zigWidth * side;
      path += ` L ${zx} ${zy}`;
    }
    path += ` L ${to.x} ${to.y}`;
    return path;
  }

  private drawShape(shape: DrawingShape): void {
    let obj: fabric.Object;
    if (shape.type === 'circle') {
      obj = new fabric.Circle({
        left: shape.left, top: shape.top,
        width: shape.width, height: shape.height,
        radius: Math.min(shape.width, shape.height) / 2,
        fill: 'transparent',
        stroke: shape.color || '#000000',
        strokeWidth: 2,
        selectable: true,
        hasControls: true
      });
    } else {
      obj = new fabric.Rect({
        left: shape.left, top: shape.top,
        width: shape.width || 60,
        height: shape.height || 60,
        fill: 'transparent',
        stroke: shape.color || '#000000',
        strokeWidth: 2,
        selectable: true,
        hasControls: true
      });
    }
    obj.data = { type: 'shape', shapeId: shape.id };
    this.canvas.add(obj);
    this.shapeObjects.set(shape.id, obj);
  }

  private handlePathCreated(opt: any): void {
    const path = opt.path as fabric.Path;
    if (!path) return;

    const pathId = `fp_${Date.now()}`;
    const pathData: FreePathData = {
      id: pathId,
      path: JSON.parse(JSON.stringify(path.path)),
      color: (path.stroke as string) || '#666666',
      width: (path.strokeWidth as number) || 3,
    };

    path.data = { type: 'free_path', pathId };
    this.pathObjects.set(pathId, path);

    const step = this.playbookService.getCurrentStep();
    step.paths = step.paths || [];
    step.paths.push(pathData);
    this.playbookService.save();
  }

  private drawPath(pd: FreePathData): void {
    const path = new fabric.Path(pd.path as any, {
      stroke: pd.color,
      strokeWidth: pd.width,
      fill: 'transparent',
      selectable: false,
      evented: false,
    });
    path.data = { type: 'free_path', pathId: pd.id };
    this.canvas.add(path);
    this.pathObjects.set(pd.id, path);
  }

  setTool(tool: EditorState['selectedTool']): void {
    this.editorState.next({ ...this.editorState.value, selectedTool: tool, selectedPlayerId: null, selectedCurveId: null, selectedShapeId: null });
    this.canvas.selection = tool === 'select' || tool === 'move';
    this.canvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair';

    if (tool === 'draw') {
      this.canvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(this.canvas);
      brush.color = this.editorState.value.selectedColor;
      brush.width = 3;
      this.canvas.freeDrawingBrush = brush;
    } else {
      this.canvas.isDrawingMode = false;
    }

    if (tool !== 'select' && tool !== 'move') {
      this.canvas.discardActiveObject().renderAll();
    }
  }

  clearDrawings(): void {
    const step = this.playbookService.getCurrentStep();
    this.canvas.getObjects().forEach(o => {
      const d = o.data;
      if (d?.type === 'free_path' || d?.type === 'shape') {
        this.canvas.remove(o);
      }
    });
    step.paths = [];
    step.shapes = [];
    this.pathObjects.clear();
    this.shapeObjects.clear();
    this.playbookService.save();
    this.canvas.requestRenderAll();
  }

  setColor(color: string): void {
    this.editorState.next({ ...this.editorState.value, selectedColor: color });
  }

  addPlayer(type: PlayerType, number: number): void {
    const pb = this.playbookService.getPlaybook();
    const step = this.playbookService.getCurrentStep();

    const positions = this.getDefaultPositions(type, number, step.players.length, pb.courtType);
    const player: CanvasPlayer = {
      id: `p_${type}_${number}_${Date.now()}`,
      number,
      type,
      x: positions.x,
      y: positions.y
    };
    step.players.push(player);
    this.playbookService.save();
    this.renderCurrentStep();
  }

  addBall(): void {
    const step = this.playbookService.getCurrentStep();
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    const existing = step.balls.length;
    const ball: CanvasBall = {
      id: `ball_${Date.now()}`,
      x: cx + 120 + existing * 5,
      y: cy - 100 + existing * 5
    };
    step.balls.push(ball);
    this.playbookService.save();
    this.renderCurrentStep();
  }

  addCone(): void {
    const step = this.playbookService.getCurrentStep();
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    const existing = step.cones.length;
    const cone: CanvasCone = {
      id: `cone_${Date.now()}`,
      x: cx - 150 + existing * 5,
      y: cy - 150 + existing * 5
    };
    step.cones.push(cone);
    this.playbookService.save();
    this.renderCurrentStep();
  }

  clearAll(): void {
    const step = this.playbookService.getCurrentStep();
    step.players = [];
    step.balls = [];
    step.cones = [];
    step.curves = [];
    step.shapes = [];
    this.playbookService.save();
    this.renderCurrentStep();
  }

  private getDefaultPositions(type: PlayerType, number: number, count: number, courtType: CourtType): { x: number; y: number } {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    if (type === 'ATTACKER') {
      const positions = [
        { x: cx, y: cy + 60 },
        { x: cx - 80, y: cy + 40 },
        { x: cx + 80, y: cy + 40 },
        { x: cx - 50, y: cy - 40 },
        { x: cx + 50, y: cy - 40 }
      ];
      return positions[number - 1] || { x: cx, y: cy + 60 };
    }
    if (type === 'DEFENDER') {
      const positions = [
        { x: cx - 40, y: cy - 80 },
        { x: cx + 40, y: cy - 80 },
        { x: cx - 90, y: cy - 120 },
        { x: cx, y: cy - 130 },
        { x: cx + 90, y: cy - 120 }
      ];
      return positions[number - 1] || { x: cx - 40, y: cy - 80 };
    }
    return { x: cx - 150 + count * 40, y: marginTop };
  }

  private handleMouseDown(opt: fabric.IEvent): void {
    const tool = this.editorState.value.selectedTool;
    if (tool === 'select' || tool === 'draw') return;
    if (tool === 'eraser' && opt.target) {
      this.canvas.remove(opt.target);
      this.canvas.renderAll();
      return;
    }
    if (tool === 'draw_circle' || tool === 'draw_rect') {
      this.isDrawing = true;
      this.drawStartPoint = { x: opt.pointer!.x, y: opt.pointer!.y };
      return;
    }
    if (tool) {
      const actionMap: Record<string, ActionType> = {
        move: 'MOVE', dribble: 'DRIBBLE', block: 'BLOCK',
        pass: 'PASS', hand_pass: 'HAND_PASS', shoot: 'SHOOT'
      };
      const actionType = actionMap[tool];
      if (actionType) {
        const target = opt.target;
        const playerObj = target?.data?.type === 'player' ? target
          : target?.group?.data?.type === 'player' ? target.group
          : null;
        if (playerObj) {
          this.startCurveDrawing(playerObj.data.playerId, actionType);
        } else {
          this.startFreeCurveDrawing(actionType, opt.pointer!);
        }
      }
    }
  }

  private startFreeCurveDrawing(actionType: ActionType, point: fabric.Point): void {
    this.isDrawing = true;
    this.drawCurveStart = { x: point.x, y: point.y };
    this.pendingActionType = actionType;
  }

  private startCurveDrawing(playerId: string, actionType: ActionType): void {
    const player = this.playerObjects.get(playerId);
    if (!player) return;

    if (actionType === 'PASS' || actionType === 'HAND_PASS') {
      this.passDestinationRequest.next({
        playerId,
        callback: (targetPlayerId: string) => {
          this.finishPassCurve(playerId, targetPlayerId, actionType);
        }
      });
      return;
    }

    const step = this.playbookService.getCurrentStep();
    const curve: ActionCurve = {
      id: `c_${Date.now()}`,
      playerId,
      type: actionType,
      color: this.editorState.value.selectedColor,
      points: [{ x: player.left!, y: player.top! }, { x: player.left! + 60, y: player.top! - 40 }]
    };
    step.curves.push(curve);
    this.playbookService.save();
    this.renderCurrentStep();
  }

  private finishPassCurve(fromPlayerId: string, toPlayerId: string, actionType: ActionType): void {
    const fromPlayer = this.playerObjects.get(fromPlayerId);
    const toPlayer = this.playerObjects.get(toPlayerId);
    if (!fromPlayer || !toPlayer) return;

    const step = this.playbookService.getCurrentStep();
    const curve: ActionCurve = {
      id: `c_${Date.now()}`,
      playerId: fromPlayerId,
      type: actionType,
      color: this.editorState.value.selectedColor,
      points: [
        { x: fromPlayer.left!, y: fromPlayer.top! },
        { x: toPlayer.left!, y: toPlayer.top! }
      ],
      destinationPlayerId: toPlayerId
    };
    step.curves.push(curve);
    this.playbookService.save();
    this.renderCurrentStep();
  }

  private handleMouseMove(opt: fabric.IEvent): void {
    if (!this.isDrawing) return;
    const tool = this.editorState.value.selectedTool;

    if (tool === 'draw_circle' || tool === 'draw_rect') {
      if (!this.drawStartPoint) return;

      if (this.previewShape) {
        this.canvas.remove(this.previewShape);
      }

      const pointer = opt.pointer!;
      const left = Math.min(this.drawStartPoint.x, pointer.x);
      const top = Math.min(this.drawStartPoint.y, pointer.y);
      const w = Math.abs(pointer.x - this.drawStartPoint.x);
      const h = Math.abs(pointer.y - this.drawStartPoint.y);

      if (tool === 'draw_circle') {
        this.previewShape = new fabric.Circle({
          left, top, radius: Math.max(w, h) / 2,
          fill: 'transparent', stroke: this.editorState.value.selectedColor, strokeWidth: 2
        });
      } else {
        this.previewShape = new fabric.Rect({
          left, top, width: w, height: h,
          fill: 'transparent', stroke: this.editorState.value.selectedColor, strokeWidth: 2
        });
      }
      this.canvas.add(this.previewShape);
      this.canvas.renderAll();
      return;
    }

    if (this.drawCurveStart && this.pendingActionType) {
      if (this.previewCurveLine) {
        this.canvas.remove(this.previewCurveLine);
      }
      this.previewCurveLine = new fabric.Line(
        [this.drawCurveStart.x, this.drawCurveStart.y, opt.pointer!.x, opt.pointer!.y],
        {
          stroke: this.editorState.value.selectedColor,
          strokeWidth: 2.5,
          strokeDashArray: [6, 4],
          selectable: false,
          evented: false
        }
      );
      this.canvas.add(this.previewCurveLine);
      this.canvas.renderAll();
    }
  }

  private handleMouseUp(opt?: fabric.IEvent): void {
    this.isDrawing = false;

    if (this.drawCurveStart && this.pendingActionType) {
      if (this.previewCurveLine) {
        this.canvas.remove(this.previewCurveLine);
        this.previewCurveLine = null;
      }
      const endPoint = opt?.pointer || {
        x: this.drawCurveStart.x + 60,
        y: this.drawCurveStart.y - 40
      };
      const step = this.playbookService.getCurrentStep();
      const curve: ActionCurve = {
        id: `c_${Date.now()}`,
        playerId: '',
        type: this.pendingActionType,
        color: this.editorState.value.selectedColor,
        points: [
          { x: this.drawCurveStart.x, y: this.drawCurveStart.y },
          { x: endPoint.x, y: endPoint.y }
        ]
      };
      step.curves.push(curve);
      this.playbookService.save();
      this.drawCurveStart = null;
      this.pendingActionType = null;
      this.renderCurrentStep();
      return;
    }

    if (!this.drawStartPoint) return;
    this.isDrawing = false;

    const tool = this.editorState.value.selectedTool;
    if (this.previewShape) {
      const shape: DrawingShape = {
        id: `s_${Date.now()}`,
        type: tool === 'draw_circle' ? 'circle' : 'rectangle',
        color: this.editorState.value.selectedColor,
        left: this.previewShape.left!,
        top: this.previewShape.top!,
        width: this.previewShape.width!,
        height: this.previewShape.height! || this.previewShape.width!
      };

      const step = this.playbookService.getCurrentStep();
      step.shapes.push(shape);
      this.playbookService.save();
      this.canvas.remove(this.previewShape);
      this.previewShape = null;
      this.drawStartPoint = null;
      this.renderCurrentStep();
    }

    this.drawStartPoint = null;
  }

  private handleSelection(opt: fabric.IEvent): void {
    const target = opt.selected?.[0];
    if (!target) return;
    const data = target.data;
    if (data?.type === 'player') {
      this.editorState.next({
        ...this.editorState.value,
        selectedPlayerId: data.playerId,
        selectedCurveId: null,
        selectedShapeId: null
      });
    } else if (data?.type === 'ball') {
      this.editorState.next({
        ...this.editorState.value,
        selectedPlayerId: data.ballId,
        selectedCurveId: null,
        selectedShapeId: null
      });
    } else if (data?.type === 'cone') {
      this.editorState.next({
        ...this.editorState.value,
        selectedPlayerId: data.coneId,
        selectedCurveId: null,
        selectedShapeId: null
      });
    } else if (data?.type === 'curve') {
      this.editorState.next({
        ...this.editorState.value,
        selectedCurveId: data.curveId,
        selectedPlayerId: null,
        selectedShapeId: null
      });
    } else if (data?.type === 'shape') {
      this.editorState.next({
        ...this.editorState.value,
        selectedShapeId: data.shapeId,
        selectedPlayerId: null,
        selectedCurveId: null
      });
    }
  }

  private handleDeselection(): void {
    this.editorState.next({ ...this.editorState.value, selectedPlayerId: null, selectedCurveId: null, selectedShapeId: null });
  }

  private savePlayerPositions(): void {
    const step = this.playbookService.getCurrentStep();
    this.playerObjects.forEach((obj, id) => {
      const player = step.players.find(p => p.id === id);
      if (player) {
        player.x = obj.left!;
        player.y = obj.top!;
      }
    });
    this.ballObjects.forEach((obj, id) => {
      const ball = step.balls.find(b => b.id === id);
      if (ball) {
        ball.x = obj.left!;
        ball.y = obj.top!;
      }
    });
    this.coneObjects.forEach((obj, id) => {
      const cone = step.cones.find(c => c.id === id);
      if (cone) {
        cone.x = obj.left!;
        cone.y = obj.top!;
      }
    });
    this.playbookService.save();
  }

  deleteSelected(): void {
    const state = this.editorState.value;
    if (state.selectedCurveId) {
      const step = this.playbookService.getCurrentStep();
      step.curves = step.curves.filter(c => c.id !== state.selectedCurveId);
      this.playbookService.save();
      this.renderCurrentStep();
      return;
    }
    if (state.selectedShapeId) {
      const step = this.playbookService.getCurrentStep();
      step.shapes = step.shapes.filter(s => s.id !== state.selectedShapeId);
      this.playbookService.save();
      this.renderCurrentStep();
      return;
    }
    if (state.selectedPlayerId) {
      const id = state.selectedPlayerId;
      const step = this.playbookService.getCurrentStep();
      step.players = step.players.filter(p => p.id !== id);
      step.balls = step.balls.filter(b => b.id !== id);
      step.cones = step.cones.filter(c => c.id !== id);
      step.curves = step.curves.filter(c => c.playerId !== id);
      this.playbookService.save();
      this.renderCurrentStep();
    }
  }

  getCanvasDataUrl(): string {
    return this.canvas.toDataURL({ format: 'png', multiplier: 2 });
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.canvas.setWidth(width);
    this.canvas.setHeight(height);
    this.renderCurrentStep();
  }

  async exportStepsAsImages(): Promise<{ data: string; orientation: string; description: string }[]> {
    const pb = this.playbookService.getPlaybook();
    const originalIndex = pb.currentStepIndex;
    const images: { data: string; orientation: string; description: string }[] = [];

    for (let i = 0; i < pb.steps.length; i++) {
      this.playbookService.goToStep(i);
      await new Promise(resolve => setTimeout(resolve, 200));
      images.push({
        data: this.canvas.toDataURL({ format: 'png', multiplier: 2 }),
        orientation: pb.courtOrientation,
        description: pb.steps[i]?.description || ''
      });
    }

    this.playbookService.goToStep(originalIndex);
    return images;
  }
}
