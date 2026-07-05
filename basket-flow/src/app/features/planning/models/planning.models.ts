export interface Macrocycle {
  id: string;
  club_id: string;
  team_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  goals: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Mesocycle {
  id: string;
  macrocycle_id: string;
  name: string;
  description: string | null;
  phase: 'preseason' | 'competition' | 'peak' | 'transition' | 'rest' | 'special';
  start_date: string;
  end_date: string;
  tactical_goals: string | null;
  technical_goals: string | null;
  physical_goals: string | null;
  intensity: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Microcycle {
  id: string;
  mesocycle_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  focus: string | null;
  load_distribution: Record<string, number>;
  planned_sessions: number;
  has_match: boolean;
  match_day: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TacticalObjective {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  area: 'offense' | 'defense' | 'transition' | 'special_situations' | 'physical' | 'mental';
  category: string;
}

export interface ObjectiveAchievement {
  id: string;
  objective_id: string;
  mesocycle_id: string | null;
  microcycle_id: string | null;
  session_id: string | null;
  achievement_level: number;
  notes: string | null;
}

export interface MacrocycleSummary {
  macrocycle_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  mesocycle_count: number;
  microcycle_count: number;
  completed_sessions: number;
  total_sessions: number;
}

export interface MacrocycleCreateDto {
  club_id: string;
  team_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  goals?: string;
}
