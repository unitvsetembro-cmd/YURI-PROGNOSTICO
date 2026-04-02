export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time?: string; // e.g., "15:00"
  odds?: {
    home: number;
    draw: number;
    away: number;
  };
  result?: string; // e.g., "2-1"
  aiRecommendation?: string;
  aiSuggestedOdds?: number;
  status?: 'win' | 'loss' | 'pending';
}

export interface Prediction {
  matchId: string;
  analysis: string;
  recommendation: string;
  confidence: number;
  suggestedOdds: number;
}
