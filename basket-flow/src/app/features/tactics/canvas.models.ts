export type PlayerType = 'ATTACKER' | 'DEFENDER' | 'COACH';
export type ActionType = 'MOVE' | 'DRIBBLE' | 'BLOCK' | 'PASS' | 'HAND_PASS' | 'SHOOT';
export type CourtType = 'nba' | 'fiba' | 'high_school';
export type CourtOrientation = 'full' | 'offensive_half' | 'defensive_half';

export interface CanvasPlayer {
  id: string;
  number: number;
  type: PlayerType;
  x: number;
  y: number;
}

export interface CanvasBall {
  id: string;
  x: number;
  y: number;
}

export interface CanvasCone {
  id: string;
  x: number;
  y: number;
}

export interface ActionCurve {
  id: string;
  playerId: string;
  type: ActionType;
  color: string;
  points: { x: number; y: number }[];
  destinationPlayerId?: string;
}

export interface DrawingShape {
  id: string;
  type: 'circle' | 'rectangle';
  color: string;
  left: number;
  top: number;
  width: number;
  height: number;
  description?: string;
}

export interface Step {
  id: number;
  name: string;
  players: CanvasPlayer[];
  balls: CanvasBall[];
  cones: CanvasCone[];
  curves: ActionCurve[];
  shapes: DrawingShape[];
  description: string;
  screenshotUrl?: string;
}

export interface Playbook {
  id: number;
  name: string;
  courtType: CourtType;
  courtOrientation: CourtOrientation;
  fullCourt: boolean;
  numberAttackers: number;
  numberDefenders: number;
  numberCoaches: number;
  numberBalls: number;
  numberCones: number;
  steps: Step[];
  currentStepIndex: number;
}
