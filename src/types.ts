export type ProfileId =
  | 'guardian'
  | 'builder'
  | 'navigator'
  | 'trailblazer'
  | 'maverick';

export type AssetKey =
  | 'usStocks'
  | 'intlStocks'
  | 'metals'
  | 'crypto'
  | 'landReit'
  | 'bonds'
  | 'cash';

export type TimelineId = 'lt2' | 'y2_5' | 'y5_10' | 'y10p';
export type TemperamentId = 'sellAll' | 'sellSome' | 'hold' | 'buyMore';
export type CushionId = 'full' | 'partial' | 'none';
export type HandsOnId = 'set' | 'monthly' | 'active';
export type CryptoComfortId = 'none' | 'small' | 'meaningful' | 'believer';
export type TangibilityId = 'strong' | 'somewhat' | 'indifferent';
export type InsuranceId = 'core' | 'slice' | 'later' | 'no';
export type GoalId = 'foundation' | 'purchase' | 'retirement' | 'income' | 'learning';

export interface Answers {
  capital: number;
  monthly: number;
  timeline: TimelineId | null;
  temperament: TemperamentId | null;
  sleep: number; // 0–100
  cushion: CushionId | null;
  assets: string[];
  handsOn: HandsOnId | null;
  cryptoComfort: CryptoComfortId | null;
  tangibility: TangibilityId | null;
  insurance: InsuranceId | null;
  premium: number;
  sblocSplit: number;        // 0 = all stable life insurance, 100 = all aggressive SBLOC
  sblocLtv: number;          // SBLOC advance rate the user would borrow against (% of portfolio)
  goal: GoalId | null;
  savingsGoal: number;   // emergency-fund target in dollars (0 = none set)
  savingsMonths: number; // months to reach it
}

export const initialAnswers: Answers = {
  capital: 30000,
  monthly: 500,
  timeline: null,
  temperament: null,
  sleep: 50,
  cushion: null,
  assets: [],
  handsOn: null,
  cryptoComfort: null,
  tangibility: null,
  insurance: null,
  premium: 150,
  sblocSplit: 40,
  sblocLtv: 70,
  goal: null,
  savingsGoal: 0,
  savingsMonths: 12,
};

export interface AllocationLine {
  key: AssetKey;
  label: string;
  pct: number;
  dollars: number;
  note?: string;
  color: string;
}

export interface BlendDef {
  label: string;
  weights: Partial<Record<AssetKey, number>>;
}

export interface ProfileDef {
  id: ProfileId;
  name: string;
  tagline: string;
  description: string;
  color: string;
  blends: BlendDef[];
}
