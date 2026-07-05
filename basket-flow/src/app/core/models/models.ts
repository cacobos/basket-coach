export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  is_superadmin: boolean;
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
  club_id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  jersey_number: number | null;
  position: string | null;
  height: number | null;
  weight: number | null;
  photo_url: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface PlayerTeam {
  id: string;
  player_id: string;
  team_id: string;
  created_at: string;
}

export interface ExerciseCategory {
  id: string;
  club_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TagInfo {
  id: string;
  name: string;
  color: string;
}

export interface Tag {
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
  tags: TagInfo[];
  deleted_at: string | null;
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
  intensity?: string | null;
  focus?: string | null;
  collective_notes?: string | null;
  what_worked?: string | null;
  what_to_improve?: string | null;
  deleted_at: string | null;
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
  status: 'present' | 'absent' | 'late' | 'injured';
  notes: string | null;
  late_minutes: number | null;
  created_at: string;
}

export interface SessionPlayerReview {
  id: string;
  session_id: string;
  player_id: string;
  comments: string;
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

// ── Match Analysis (Possession-based) ──
export interface Match {
  id: string;
  club_id: string;
  team_id: string;
  rival: string;
  competition: string | null;
  round: string | null;
  location: string | null;
  date: string;
  status: 'created' | 'in_progress' | 'finished' | 'closed';
  current_period: number;
  score_own: number;
  score_rival: number;
  is_home: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchSquad {
  id: string;
  match_id: string;
  player_id: string;
  starter: boolean;
  created_at: string;
}

export interface MatchSubstitution {
  id: string;
  match_id: string;
  player_out: string;
  player_in: string;
  period: number;
  order_in_period: number;
  created_at: string;
}

export interface Possession {
  id: string;
  match_id: string;
  period: number;
  number: number;
  side: 'own' | 'rival';
  init_type_id: string;
  attack_type_id: string;
  system_id: string | null;
  result_id: string;
  finisher_id: string | null;
  creator_id: string | null;
  time_bucket: '0-8' | '9-16' | '17-24';
  points: number;
  notes: string | null;
  tags: string[] | null;
  video_timestamp: number | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogItem {
  id: string;
  club_id: string;
  name: string;
  short_name: string | null;
  color: string;
  sort_order: number;
  active: boolean;
}

export interface CatalogAttackType extends CatalogItem {}
export interface CatalogSystem {
  id: string;
  team_id: string;
  name: string;
  short_name: string | null;
  color: string;
  sort_order: number;
  active: boolean;
}
export interface CatalogResult extends CatalogItem {
  points: number;
  is_miss: boolean;
  is_turnover: boolean;
  is_foul_drawn: boolean;
}
export interface CatalogInitType extends CatalogItem {}
export interface CatalogTag {
  id: string;
  club_id: string;
  name: string;
  color: string;
  active: boolean;
}

export interface MatchSummary {
  match_id: string;
  club_id: string;
  team_id: string;
  rival: string;
  date: string;
  status: string;
  score_own: number;
  score_rival: number;
  current_period: number;
  own_possessions: number;
  rival_possessions: number;
  calculated_score_own: number;
  calculated_score_rival: number;
  own_ppp: number;
  rival_ppp: number;
}

// ── Lineup (from get_match_lineup RPC) ──
export interface LineupPlayer {
  player_id: string;
  player_name: string;
  jersey_number: number;
  position: string;
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
