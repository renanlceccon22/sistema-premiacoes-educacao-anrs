
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

export interface Category {
  id: string;
  name: string;
  options: CriterionOption[];
  isMetric?: boolean; // Se verdadeiro, usa lógica de comparação %
  metricThresholds?: number[]; // Limites para categorias métricas (ex: [2, 3] para inadimplência)
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
