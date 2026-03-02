
export interface Period {
  id: string;
  label: string; // Ex: "03/2024"
  status: 'open' | 'closed';
}

export type CriterionType = 'TOGGLE' | 'VALUE';

export type ComparisonOperator = 'GREATER_THAN' | 'LESS_THAN' | 'BETWEEN' | 'EQUAL' | 'GREATER_EQUAL' | 'LESS_EQUAL' | 'RANKING_TOP' | 'RANKING_BOTTOM';

export interface ScoringRange {
  id: string;
  operator: ComparisonOperator;
  threshold1: number;
  threshold2?: number;
  points: number;
}

export interface CriterionOption {
  id: string;
  label: string;
  points: number;
}

export enum AwardLevel {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
  NONE = 'NONE'
}

export type Thresholds = {
  [AwardLevel.GOLD]: number;
  [AwardLevel.SILVER]: number;
  [AwardLevel.BRONZE]: number;
};

export enum EvaluationModel {
  MANUAL = 'MANUAL',
  METRIC_DIRECT = 'METRIC_DIRECT',
  METRIC_RELATIVE = 'METRIC_RELATIVE',
  METRIC_ACCUMULATED = 'METRIC_ACCUMULATED'
}

export enum EvaluationDirection {
  HIGHER_IS_BETTER = 'HIGHER_IS_BETTER',
  LOWER_IS_BETTER = 'LOWER_IS_BETTER'
}

export interface Category {
  id: string;
  name: string;
  evaluationModel: EvaluationModel;
  evaluationDirection: EvaluationDirection;
  options: CriterionOption[];
  metricThresholds?: number[];
}

export interface InadimplenciaRankingConfig {
  enabled: boolean;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
}

export interface ManagementBonusConfig {
  enabled: boolean;
  pointThreshold: number;
  bonusValue: number;
}

export interface AnrsBonusConfig {
  enabled: boolean;
  pointThreshold: number;
  bonusValue: number;
}

export interface AwardCriterion {
  id: string;
  name: string;
  awardId: string; // Linked award
  type: CriterionType;
  valueFormat?: 'NUMBER' | 'PERCENTAGE';
  operator?: ComparisonOperator;
  threshold1?: number;
  threshold2?: number;
  scoringRanges?: ScoringRange[];
  options?: CriterionOption[];
  rankingPrizes?: number[];
  useAccumulatedBudget?: boolean;
  budgetEvaluationType?: 'MONTHLY' | 'ACCUMULATED';
  showInReport?: boolean;
}

export interface CustomAward {
  id: string;
  name: string;
  value: number;
  schoolIds: string[];
  evaluationType?: 'INDIVIDUAL' | 'JOINT';
  scoringMode?: boolean;
  minScore?: number;
}

export interface Evaluation {
  schoolId: string;
  periodId: string;
  wonAwardIds: string[];
  wonAwardValues?: Record<string, number>;
  criterionResults: Record<string, {
    value?: number;
    checked?: boolean;
    isMet: boolean;
    score?: number;
    selectedOptionId?: string;
    rankIndex?: number;
  }>;
  isFinalized: boolean;
  calculatedAt?: string;
  totalScore?: number;
}

export interface SchoolUnit {
  id: string;
  name: string;
  targets: Record<string, number>;
  annualBudget?: number;
  treasurerName?: string;
  treasurerCpf?: string;
  viceTreasurerName?: string;
  viceTreasurerCpf?: string;
  viceTreasurerPercentage?: number;
  isLocked?: boolean;
}

export interface User {
  id: string;
  email: string;
  role?: string;
  full_name?: string;
  selected_entity_id?: string | null;
}

export interface Entity {
  id: string;
  name: string;
  initials: string;
  cnpj: string;
  created_at?: string;
}

export interface UserEntity {
  user_id: string;
  entity_id: string;
}

export interface AppConfig {
  custom_awards: CustomAward[];
  award_criteria: AwardCriterion[];
}
