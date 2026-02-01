
import { Category, AwardLevel, Thresholds, InadimplenciaRankingConfig, ManagementBonusConfig, AnrsBonusConfig, Evaluation } from '../types';

/**
 * Retorna o índice do mês (1 a 12) baseado no label "Mês/Ano"
 */
export const getMonthIndexFromLabel = (label: string): number => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthPart = label.split('/')[0];
  const index = months.indexOf(monthPart);
  return index !== -1 ? index + 1 : 1;
};

export const calculatePoints = (
  cat: Category, 
  selection: string | undefined, 
  realized: number | undefined, 
  target: number,
  periodLabel?: string
): number => {
  if (cat.isMetric) {
    if (realized === undefined) return 0;
    const val = realized;
    const thresholds = cat.metricThresholds || [0, 0];
    
    if (cat.id === 'inadimplencia_mes') {
      const limit1 = thresholds[0] ?? 2;
      const limit2 = thresholds[1] ?? 3;
      if (val <= limit1) return cat.options[0].points;
      if (val > limit1 && val <= limit2) return cat.options[1].points;
      return cat.options[2].points;
    } else if (cat.id === 'descontos_concedidos') {
      const limit1 = thresholds[0] ?? 0; // 0 significa o próprio target
      const limit2 = thresholds[1] ?? 0.25;
      if (val <= target + limit1) return cat.options[0].points;
      if (val > target + limit1 && val <= target + limit2) return cat.options[1].points;
      return cat.options[2].points;
    } else if (cat.id === 'orcamento_bi') {
      if (!periodLabel) return 0;
      const monthIndex = getMonthIndexFromLabel(periodLabel);
      const accumulatedTarget = (target / 12) * monthIndex;
      
      const marginPercent = thresholds[1] ?? 10;
      const marginFactor = 1 + (marginPercent / 100);

      if (val <= accumulatedTarget) return cat.options[0].points;
      if (val <= accumulatedTarget * marginFactor) return cat.options[1].points;
      return cat.options[2].points;
    }
    return 0; 
  }
  const option = cat.options.find(o => o.id === selection);
  return option?.points || 0;
};

export const getAwardLevel = (totalPoints: number, thresholds: Thresholds): AwardLevel => {
  if (totalPoints >= thresholds[AwardLevel.GOLD]) return AwardLevel.GOLD;
  if (totalPoints >= thresholds[AwardLevel.SILVER]) return AwardLevel.SILVER;
  if (totalPoints >= thresholds[AwardLevel.BRONZE]) return AwardLevel.BRONZE;
  return AwardLevel.NONE;
};

export interface AllPrizesResult {
  inadimplenciaRankingBonus: number; 
  managementBonus: number; 
  anrsBonus: number; 
  totalTreasurerPrize: number;
  vicePrize: number;
  level: AwardLevel;
  inadimplenciaRank?: number; 
}

interface SchoolEvaluationForPrizeCalculation {
  schoolId: string;
  inadimplenciaRankingPercentage?: number;
  categories: Category[];
  selections: Record<string, string>;
  realizedValues: Record<string, number>;
  targets: Record<string, number>;
  periodLabel?: string; 
}

export const calculateAllPrizes = (
  totalPoints: number,
  thresholds: Thresholds,
  inadimplenciaRankingConfig: InadimplenciaRankingConfig,
  managementBonusConfig: ManagementBonusConfig,
  anrsBonusConfig: AnrsBonusConfig,
  allSchoolsEvaluations: SchoolEvaluationForPrizeCalculation[],
  activeSchoolId: string,
  currentPeriodLabel?: string
): AllPrizesResult => {
  const level = getAwardLevel(totalPoints, thresholds);
  
  let currentSchoolInadimplenciaRank: number | undefined = undefined;
  let inadimplenciaRankingBonus = 0;

  // 1. Cálculo do Ranking de Inadimplência
  if (allSchoolsEvaluations.length > 0) {
    const rankedEvaluations = allSchoolsEvaluations
      .filter(e => typeof e.inadimplenciaRankingPercentage === 'number' && e.inadimplenciaRankingPercentage >= 0)
      .sort((a, b) => a.inadimplenciaRankingPercentage! - b.inadimplenciaRankingPercentage!);

    for (let i = 0; i < rankedEvaluations.length && i < 3; i++) {
      const rankedSchool = rankedEvaluations[i];
      if (rankedSchool.schoolId === activeSchoolId) {
        currentSchoolInadimplenciaRank = i + 1;
        if (i === 0) inadimplenciaRankingBonus = inadimplenciaRankingConfig.firstPlace;
        else if (i === 1) inadimplenciaRankingBonus = inadimplenciaRankingConfig.secondPlace;
        else if (i === 2) inadimplenciaRankingBonus = inadimplenciaRankingConfig.thirdPlace;
        break; 
      }
    }
  }

  const activeSchoolEvaluationForBonus = allSchoolsEvaluations.find(e => e.schoolId === activeSchoolId);

  // 2. Cálculo do Bônus de Gestão
  let managementBonus = 0;
  if (activeSchoolEvaluationForBonus) {
    const categories = activeSchoolEvaluationForBonus.categories;
    const adiantamentosCategory = categories.find(c => c.id === 'adiantamentos');
    const cartaoCorporativoCategory = categories.find(c => c.id === 'cartao_corporativo');

    let managementPoints = 0;
    if (adiantamentosCategory) {
        managementPoints += calculatePoints(adiantamentosCategory, activeSchoolEvaluationForBonus.selections['adiantamentos'], undefined, 0, currentPeriodLabel);
    }
    if (cartaoCorporativoCategory) {
        managementPoints += calculatePoints(cartaoCorporativoCategory, activeSchoolEvaluationForBonus.selections['cartao_corporativo'], undefined, 0, currentPeriodLabel);
    }
    
    if (managementPoints >= managementBonusConfig.pointThreshold) {
        managementBonus = managementBonusConfig.bonusValue;
    }
  }

  // 3. Cálculo do Bônus Meta ANRS
  let anrsBonus = 0;
  if (activeSchoolEvaluationForBonus) {
      const categories = activeSchoolEvaluationForBonus.categories;
      const inadimplenciaCategory = categories.find(c => c.id === 'inadimplencia_mes');
      const orcamentoCategory = categories.find(c => c.id === 'orcamento_bi');
      const descontosCategory = categories.find(c => c.id === 'descontos_concedidos');

      let anrsPoints = 0;
      if (inadimplenciaCategory) {
          anrsPoints += calculatePoints(inadimplenciaCategory, activeSchoolEvaluationForBonus.selections['inadimplencia_mes'], activeSchoolEvaluationForBonus.realizedValues['inadimplencia_mes'], activeSchoolEvaluationForBonus.targets['inadimplencia_mes'] || 0, currentPeriodLabel);
      }
      if (orcamentoCategory) {
          anrsPoints += calculatePoints(orcamentoCategory, activeSchoolEvaluationForBonus.selections['orcamento_bi'], activeSchoolEvaluationForBonus.realizedValues['orcamento_bi'], activeSchoolEvaluationForBonus.targets['orcamento_bi'] || 0, currentPeriodLabel);
      }
      if (descontosCategory) {
          anrsPoints += calculatePoints(descontosCategory, activeSchoolEvaluationForBonus.selections['descontos_concedidos'], activeSchoolEvaluationForBonus.realizedValues['descontos_concedidos'], activeSchoolEvaluationForBonus.targets['descontos_concedidos'] || 0, currentPeriodLabel);
      }
      
      if (anrsPoints >= anrsBonusConfig.pointThreshold) {
          anrsBonus = anrsBonusConfig.bonusValue;
      }
  }

  const totalTreasurerPrize = inadimplenciaRankingBonus + managementBonus + anrsBonus;
  const vicePrize = totalTreasurerPrize * 0.5;

  return { 
    inadimplenciaRankingBonus, 
    managementBonus, 
    anrsBonus, 
    totalTreasurerPrize, 
    vicePrize, 
    level, 
    inadimplenciaRank: currentSchoolInadimplenciaRank 
  };
};
