export interface CreateMatchData {
  club_id: string;
  team_id: string;
  rival: string;
  competition?: string;
  round?: string;
  location?: string;
  date: string;
  scheduled_time?: string;
}

export interface PossessionFormData {
  matchId: string;
  period?: number;
  number?: number;
  side: 'own' | 'rival';
  initTypeId: string;
  attackTypeId: string;
  systemId?: string;
  resultId: string;
  finisherId?: string;
  creatorId?: string;
  timeBucket: '0-8' | '9-16' | '17-24';
  points: number;
  notes?: string;
  tags?: string[];
}

export interface SubstitutionFormData {
  matchId: string;
  playerOut: string;
  playerIn: string;
  period: number;
}

export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
