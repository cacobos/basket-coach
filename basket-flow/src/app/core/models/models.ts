export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  created_at: string;
  created_by: string;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: 'admin' | 'coach' | 'assistant';
  created_at: string;
}

export interface Team {
  id: string;
  club_id: string;
  name: string;
  category: string;
  season: string;
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  jersey_number: number | null;
  position: string | null;
  height: number | null;
  weight: number | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ExerciseCategory {
  id: string;
  club_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ExerciseDiagram {
  url: string;
  caption?: string;
}

export interface Exercise {
  id: string;
  club_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  objectives: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number | null;
  players_min: number | null;
  players_max: number | null;
  diagram_url: string | null;
  diagrams: ExerciseDiagram[];
  video_url: string | null;
  tags: string[];
  created_at: string;
  created_by: string;
}

export interface ExerciseVariant {
  id: string;
  exercise_id: string;
  name: string;
  description: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  duration_minutes: number | null;
  players_min: number | null;
  players_max: number | null;
  tags: string[];
  diagrams: ExerciseDiagram[];
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface TrainingSession {
  id: string;
  club_id: string;
  team_id: string;
  title: string;
  description: string | null;
  objectives: string | null;
  location: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: 'draft' | 'planned' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  created_by: string;
}

export interface SessionSection {
  id: string;
  session_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  section_id: string | null;
  exercise_id: string;
  order: number;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  session_id: string;
  player_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string | null;
  created_at: string;
}

export interface GameStats {
  id: string;
  club_id: string;
  team_id: string;
  opponent: string;
  date: string;
  location: string | null;
  is_home: boolean;
  our_score: number | null;
  opponent_score: number | null;
  notes: string | null;
  created_at: string;
}

export interface PlayerGameStats {
  id: string;
  game_id: string;
  player_id: string;
  minutes_played: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  field_goals_made: number;
  field_goals_attempted: number;
  three_points_made: number;
  three_points_attempted: number;
  free_throws_made: number;
  free_throws_attempted: number;
  created_at: string;
}

export interface PlaybookDB {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  category: string;
  court_type: 'fiba' | 'nba' | 'highschool';
  view_mode: 'full' | 'attack' | 'defense';
  steps: any;
  tags: string[];
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Evaluation {
  id: string;
  club_id: string;
  player_id: string;
  evaluator_id: string;
  date: string;
  type: 'internal' | 'external';
  shooting: number | null;
  dribbling: number | null;
  passing: number | null;
  defense: number | null;
  rebounding: number | null;
  iq: number | null;
  athleticism: number | null;
  teamwork: number | null;
  attitude: number | null;
  notes: string | null;
  created_at: string;
}
