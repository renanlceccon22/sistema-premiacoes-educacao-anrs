
export enum AwardLevel {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
  NONE = 'NONE'
}

export interface CriterionOption {
  id: string;
  label: string;
  points: number;
}

export enum EvaluationModel {
  MANUAL = 'MANUAL',          // Seleção manual de opções
  METRIC_DIRECT = 'METRIC_DIRECT',    // Comparação direta (ex: inadimplência < 2%)
  METRIC_RELATIVE = 'METRIC_RELATIVE',  // Comparação relativa ao target (ex: target + 0.25%)
  METRIC_ACCUMULATED = 'METRIC_ACCUMULATED' // Meta acumulada pelo mês (ex: Orçamento BI)
}

export enum EvaluationDirection {
  LOWER_IS_BETTER = 'LOWER_IS_BETTER', // Quanto menor o valor, mais pontos
  HIGHER_IS_BETTER = 'HIGHER_IS_BETTER' // Quanto maior o valor, mais pontos
}

export interface Category {
  id: string;
  name: string;
  options: CriterionOption[];
  evaluationModel: EvaluationModel;
  evaluationDirection?: EvaluationDirection;
  metricThresholds?: number[]; // Limites para as faixas (ex: [2, 3])
  isMetric?: boolean; // Mantido por compatibilidade temporária se necessário, mas usaremos evaluationModel
}

export interface Thresholds {
  [AwardLevel.GOLD]: number;
  [AwardLevel.SILVER]: number;
  [AwardLevel.BRONZE]: number;
}

export interface InadimplenciaRankingConfig {
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
}

export interface ManagementBonusConfig {
  pointThreshold: number;
  bonusValue: number;
}

export interface AnrsBonusConfig {
  pointThreshold: number;
  bonusValue: number;
}

export interface Period {
  id: string;
  label: string; // Ex: "Março 2024"
  status: 'open' | 'closed';
}

export interface Evaluation {
  schoolId: string;
  periodId: string;
  selections: Record<string, string>; // categoryId -> optionId
  realizedValues: Record<string, number>; // categoryId -> valor em % (para categorias isMetric)
  inadimplenciaRankingPercentage?: number; // Percentual para o ranking de inadimplência entre escolas
  isFinalized: boolean;
  calculatedAt?: string;
  snapshot?: {
    treasurerName?: string;
    treasurerCpf?: string;
    viceTreasurerName?: string;
    viceTreasurerCpf?: string;
    managementBonusValue: number;
    anrsBonusValue: number;
    inadimplenciaRankingBonusValue: number;
    totalTreasurerPrize: number;
    vicePrize: number;
    totalPoints: number;
    inadimplenciaRank?: number;
    awardLevel: AwardLevel;
    // Também armazenamos as configs de bonus caso queira ser extremamente preciso
    bonusConfigs?: {
      managementBonusConfig: ManagementBonusConfig;
      anrsBonusConfig: AnrsBonusConfig;
      inadimplenciaRankingConfig: InadimplenciaRankingConfig;
      thresholds: Thresholds;
    };
  };
}

export interface SchoolUnit {
  id: string;
  name: string;
  targets: Record<string, number>; // categoryId -> valor meta em %
  treasurerName?: string;
  treasurerCpf?: string;
  viceTreasurerName?: string;
  viceTreasurerCpf?: string;
  isLocked?: boolean;
  custom_categories?: Category[]; // Categorias customizadas da unidade
}

export interface AppState {
  thresholds: Thresholds;
  inadimplenciaRankingConfig: InadimplenciaRankingConfig;
  managementBonusConfig: ManagementBonusConfig;
  anrsBonusConfig: AnrsBonusConfig;
  categories: Category[];
  schools: SchoolUnit[];
  periods: Period[];
  evaluations: Evaluation[];
  activeSchoolId: string | null;
  activePeriodId: string | null;
}

export interface User {
  id: string;
  email: string;
  role?: string;
  full_name?: string;
}
