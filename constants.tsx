
import { Category, AwardLevel, Thresholds, InadimplenciaRankingConfig, ManagementBonusConfig, AnrsBonusConfig, EvaluationModel, EvaluationDirection } from './types';

export const INITIAL_THRESHOLDS: Thresholds = {
  [AwardLevel.GOLD]: 700,
  [AwardLevel.SILVER]: 600,
  [AwardLevel.BRONZE]: 500,
};

export const INITIAL_INADIMPLENCIA_RANKING_CONFIG: InadimplenciaRankingConfig = {
  firstPlace: 200,
  secondPlace: 150,
  thirdPlace: 100,
  enabled: true,
};

export const INITIAL_MANAGEMENT_BONUS_CONFIG: ManagementBonusConfig = {
  pointThreshold: 170,
  bonusValue: 100,
  enabled: true,
};

export const INITIAL_ANRS_BONUS_CONFIG: AnrsBonusConfig = {
  pointThreshold: 140,
  bonusValue: 150,
  enabled: true,
};

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'adiantamentos',
    name: 'Adiantamentos',
    evaluationModel: EvaluationModel.MANUAL,
    options: [
      { id: 'ad_1', label: 'Nenhuma pendência', points: 100 },
      { id: 'ad_2', label: 'Pendência até 30 dias', points: 70 },
      { id: 'ad_3', label: 'Mais de 30 dias ou outras pendências', points: 0 },
    ]
  },
  {
    id: 'cartao_corporativo',
    name: 'Cartão Corporativo',
    evaluationModel: EvaluationModel.MANUAL,
    options: [
      { id: 'cc_1', label: 'Nenhuma pendência', points: 100 },
      { id: 'cc_2', label: 'Pendência até 30 dias', points: 70 },
      { id: 'cc_3', label: 'Outras pendências', points: 0 },
    ]
  },
  {
    id: 'inadimplencia_mes',
    name: 'Inadimplência/Mês',
    evaluationModel: EvaluationModel.METRIC_DIRECT,
    evaluationDirection: EvaluationDirection.LOWER_IS_BETTER,
    isMetric: true,
    metricThresholds: [4, 6], // <= 4% e <= 6%
    options: [
      { id: 'im_1', label: 'Inadimplência <= 4%', points: 0 },
      { id: 'im_2', label: 'Inadimplência entre 4,1% e 6%', points: 0 },
      { id: 'im_3', label: 'Inadimplência > 6,01%', points: 0 },
    ]
  },
  {
    id: 'orcamento_bi',
    name: 'Orçamento BI',
    evaluationModel: EvaluationModel.METRIC_ACCUMULATED,
    evaluationDirection: EvaluationDirection.LOWER_IS_BETTER,
    isMetric: true,
    metricThresholds: [0, 10], // Meta e Meta + 10%
    options: [
      { id: 'bi_1', label: 'Dentro da meta', points: 100 },
      { id: 'bi_2', label: 'Até 10% fora da meta', points: 70 },
      { id: 'bi_3', label: 'Mais de 10% fora da meta', points: 0 },
    ]
  },
  {
    id: 'descontos_concedidos',
    name: 'Descontos Concedidos',
    evaluationModel: EvaluationModel.METRIC_RELATIVE,
    evaluationDirection: EvaluationDirection.LOWER_IS_BETTER,
    isMetric: true,
    metricThresholds: [0, 0.25], // Meta e Meta + 0.25%
    options: [
      { id: 'dc_1', label: 'Dentro da meta', points: 100 },
      { id: 'dc_2', label: 'Até 0,25% acima da meta', points: 70 },
      { id: 'dc_3', label: 'Mais de 0,25% acima da meta', points: 0 },
    ]
  }
];
