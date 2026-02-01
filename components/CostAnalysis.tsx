
import React, { useState, useMemo } from 'react';
import {
  SchoolUnit,
  Period,
  Evaluation,
  Thresholds,
  InadimplenciaRankingConfig,
  ManagementBonusConfig,
  AnrsBonusConfig,
  Category
} from '../types';
import { calculatePoints, calculateAllPrizes } from '../utils/calculations';
import { formatBRL } from '../utils/formatting';
import { INITIAL_CATEGORIES } from '../constants';
import EmptyState from './EmptyState';

interface CostAnalysisProps {
  schools: SchoolUnit[];
  periods: Period[];
  evaluations: Evaluation[];
  thresholds: Thresholds;
  inadimplenciaRankingConfig: InadimplenciaRankingConfig;
  managementBonusConfig: ManagementBonusConfig;
  anrsBonusConfig: AnrsBonusConfig;
  activePeriodId: string | null;
}

const CostAnalysis: React.FC<CostAnalysisProps> = ({
  schools,
  periods,
  evaluations,
  thresholds,
  inadimplenciaRankingConfig,
  managementBonusConfig,
  anrsBonusConfig,
  activePeriodId
}) => {
  // Deriva o Ano e o Mês do período selecionado ou do período mais recente
  const { currentYear, selectedMonth } = useMemo(() => {
    if (activePeriodId) {
      const period = periods.find(p => p.id === activePeriodId);
      if (period) {
        const [m, y] = period.label.split('/');
        return { currentYear: y, selectedMonth: m };
      }
    }

    // Se não houver período selecionado (Finalizado), pega o ano do último período cadastrado
    const lastPeriod = [...periods].sort((a, b) => b.label.localeCompare(a.label))[0];
    const defaultYear = lastPeriod ? lastPeriod.label.split('/')[1] : new Date().getFullYear().toString();

    return { currentYear: defaultYear, selectedMonth: 'all' };
  }, [activePeriodId, periods]);

  const consolidatedData = useMemo(() => {
    // 1. Filtrar períodos baseados no ano e mês derivados
    const filteredPeriods = periods.filter(p => {
      const [m, y] = p.label.split('/');
      const yearMatch = y === currentYear;
      const monthMatch = selectedMonth === 'all' || m === selectedMonth;
      return yearMatch && monthMatch;
    });

    const resultsBySchool: Record<string, {
      schoolName: string;
      treasurerName: string;
      viceName: string;
      totalTreasurer: number;
      totalVice: number;
      totalPoints: number;
      evaluationsCount: number;
    }> = {};

    filteredPeriods.forEach(p => {
      // Para cada período, precisamos de todas as avaliações daquele período para calcular rankings
      const periodEvalsForPrizes = schools.map(s => {
        const ev = evaluations.find(e => e.schoolId === s.id && e.periodId === p.id);
        return {
          schoolId: s.id,
          inadimplenciaRankingPercentage: ev?.inadimplenciaRankingPercentage,
          categories: s.custom_categories || INITIAL_CATEGORIES, // Usa as categorias reais da escola
          selections: ev?.selections || {},
          realizedValues: ev?.realizedValues || {},
          targets: s.targets || {},
          periodLabel: p.label
        };
      });

      schools.forEach(school => {
        const evaluation = evaluations.find(e => e.schoolId === school.id && e.periodId === p.id);
        if (!evaluation || !evaluation.isFinalized) return;

        // Calcular pontos deste mês usando as categorias corretas da escola
        const currentCategories = school.custom_categories || INITIAL_CATEGORIES;
        const points = currentCategories.reduce((acc, cat) => {
          const pnt = calculatePoints(
            cat,
            evaluation.selections[cat.id],
            evaluation.realizedValues[cat.id],
            school.targets[cat.id] || 0,
            p.label
          );
          return acc + pnt;
        }, 0);

        // Calcular Prêmios deste mês
        const prizes = calculateAllPrizes(
          points,
          thresholds,
          inadimplenciaRankingConfig,
          managementBonusConfig,
          anrsBonusConfig,
          periodEvalsForPrizes,
          school.id,
          p.label
        );

        if (!resultsBySchool[school.id]) {
          resultsBySchool[school.id] = {
            schoolName: school.name,
            treasurerName: school.treasurerName || 'N/A',
            viceName: school.viceTreasurerName || 'N/A',
            totalTreasurer: 0,
            totalVice: 0,
            totalPoints: 0,
            evaluationsCount: 0
          };
        }

        resultsBySchool[school.id].totalTreasurer += prizes.totalTreasurerPrize;
        resultsBySchool[school.id].totalVice += prizes.vicePrize;
        resultsBySchool[school.id].totalPoints += points;
        resultsBySchool[school.id].evaluationsCount += 1;
      });
    });

    return Object.values(resultsBySchool).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [currentYear, selectedMonth, periods, evaluations, schools, thresholds, inadimplenciaRankingConfig, managementBonusConfig, anrsBonusConfig]);

  const totals = useMemo(() => {
    return consolidatedData.reduce((acc, curr) => ({
      treasurer: acc.treasurer + curr.totalTreasurer,
      vice: acc.vice + curr.totalVice,
      general: acc.general + curr.totalTreasurer + curr.totalVice
    }), { treasurer: 0, vice: 0, general: 0 });
  }, [consolidatedData]);

  return (
    <div className="space-y-8">
      {/* Filtros removidos por estarem unificados no topo */}

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#003B71] p-4 rounded-2xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.33 2.99-3S17.66 5 16 5s-3 1.33-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.33 2.99-3S9.66 5 8 5 5 6.33 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 text-blue-200">Total Repasse Tesoureiros</p>
          <h3 className="text-xl font-black">{formatBRL(totals.treasurer)}</h3>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 text-slate-400">Total Repasse Vices</p>
          <h3 className="text-xl font-black text-slate-700">{formatBRL(totals.vice)}</h3>
        </div>

        <div className="bg-[#FDB813] p-4 rounded-2xl text-[#003B71] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] mb-1.5">Custo Geral de Premiação</p>
          <h3 className="text-xl font-black">{formatBRL(totals.general)}</h3>
        </div>
      </div>

      {/* Ranking de Excelência - Design Limpo e Profissional */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-1.5 h-6 bg-[#003B71] rounded-full"></span>
          <h2 className="text-xl font-black text-[#003B71] uppercase tracking-tight">Ranking de Excelência</h2>
          <div className="ml-auto flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Atualizado</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {consolidatedData.slice(0, 3).map((res, idx) => {
            const isGold = idx === 0;
            const isSilver = idx === 1;
            const isBronze = idx === 2;

            const styles = isGold
              ? {
                bg: 'bg-gradient-to-br from-yellow-50 to-white',
                border: 'border-yellow-200',
                medalGrad: 'from-[#BF953F] via-[#FBF5B7] to-[#B38728]',
                text: 'text-yellow-800',
                shadow: 'shadow-yellow-200/50'
              }
              : isSilver
                ? {
                  bg: 'bg-gradient-to-br from-slate-50 to-white',
                  border: 'border-slate-200',
                  medalGrad: 'from-[#E2E8F0] via-white to-[#94A3B8]',
                  text: 'text-slate-700',
                  shadow: 'shadow-slate-200/50'
                }
                : {
                  bg: 'bg-gradient-to-br from-orange-50 to-white',
                  border: 'border-orange-200',
                  medalGrad: 'from-[#CD7F32] via-[#FFD39B] to-[#8B4513]',
                  text: 'text-orange-900',
                  shadow: 'shadow-orange-200/50'
                };

            return (
              <div
                key={res.schoolName}
                className={`relative p-5 rounded-[1.5rem] border-2 transition-all hover:scale-[1.02] hover:shadow-2xl ${styles.bg} ${styles.border} ${styles.shadow} flex flex-col items-center text-center`}
              >
                {/* Medalha / Troféu com Posição */}
                <div className="relative mb-4">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${styles.medalGrad} p-1 shadow-lg flex items-center justify-center`}>
                    <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/30">
                      {isGold ? (
                        <svg className="w-7 h-7 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 2H6v2h12V2zM19 5H5c-1.1 0-2 .9-2 2v3c0 2.5 1.8 4.6 4.2 5.2.8 1.4 2.2 2.4 3.8 2.7V20H8v2h8v-2h-3v-2.1c1.6-.3 3-1.3 3.8-2.7 2.4-.6 4.2-2.7 4.2-5.2V7c0-1.1-.9-2-2-2zM5 10V7h2v5.1C5.8 11.6 5 10.9 5 10zm14 0c0 .9-.8 1.6-2 2.1V7h2v3z" />
                        </svg>
                      ) : (
                        <svg className="w-7 h-7 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                          <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {/* Número da Posição */}
                  <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border-2 ${styles.border} flex items-center justify-center shadow-md`}>
                    <span className={`text-xs font-black ${styles.text}`}>{idx + 1}º</span>
                  </div>
                </div>

                {/* Pontuação */}
                <div className="mb-2">
                  <p className={`text-3xl font-black text-[#003B71] leading-none mb-1`}>{res.totalPoints}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[8px]">Pontos Acumulados</p>
                </div>

                {/* Informações da Unidade */}
                <div className="w-full pt-3 border-t border-slate-100">
                  <h4 className="text-sm font-black text-[#003B71] uppercase tracking-tight truncate mb-1">{res.schoolName}</h4>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Responsável</span>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide truncate">{res.treasurerName}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfico de Custos por Unidade */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 bg-[#003B71] rounded-full"></span>
            <h2 className="text-xl font-black text-[#003B71] uppercase tracking-tight">Custos por Unidade</h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {consolidatedData.length} Unidades
          </span>
        </div>

        <div className="space-y-4">
          {consolidatedData.map((res, idx) => {
            const total = res.totalTreasurer + res.totalVice;
            const maxVal = Math.max(...consolidatedData.map(d => d.totalTreasurer + d.totalVice), 1); // Evita divisão por zero
            const percent = (total / maxVal) * 100;

            return (
              <div key={res.schoolName} className="group">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-sm font-black text-slate-700">{res.schoolName}</span>
                  <span className="text-sm font-black text-[#003B71]">{formatBRL(total)}</span>
                </div>

                <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#003B71] to-[#005099] rounded-full relative transition-all duration-1000 ease-out group-hover:shadow-lg group-hover:shadow-blue-900/20"
                    style={{ width: `${percent}%` }}
                  >
                    {/* Brilho sutil na barra */}
                    <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/20"></div>
                  </div>
                </div>
              </div>
            );
          })}

          {consolidatedData.length === 0 && (
            <EmptyState
              icon={
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2 2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="Sem Dados de Análise"
              description="Nenhuma avaliação finalizada encontrada para este período"
              className="p-10 border-none bg-transparent"
            />
          )}
        </div>

        {/* Totalizador no Gráfico */}
        {consolidatedData.length > 0 && (
          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-100 flex justify-between items-center">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Geral do Período</span>
            <span className="text-2xl font-black text-[#FDB813] drop-shadow-sm">{formatBRL(totals.general)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostAnalysis;
