import React, { useMemo } from 'react';
import {
  SchoolUnit,
  Period,
  Evaluation,
  CustomAward
} from '../types';
import { formatBRL } from '../utils/formatting';
import EmptyState from './EmptyState';

interface CostAnalysisProps {
  schools: SchoolUnit[];
  periods: Period[];
  evaluations: Evaluation[];
  customAwards: CustomAward[];
  activePeriodId: string | null;
  activeSchoolId: string | null;
}

const CostAnalysis: React.FC<CostAnalysisProps> = ({
  schools,
  periods,
  evaluations,
  customAwards,
  activePeriodId,
  activeSchoolId
}) => {
  const consolidatedData = useMemo(() => {
    const resultsBySchool: Record<string, {
      schoolName: string;
      treasurerName: string;
      totalTreasurer: number;
      totalVice: number;
      evaluationsCount: number;
    }> = {};

    const filteredEvaluations = evaluations.filter(e => {
      if (!e.isFinalized) return false;
      if (activePeriodId && e.periodId !== activePeriodId) return false;
      if (activeSchoolId && e.schoolId !== activeSchoolId) return false;
      return true;
    });

    filteredEvaluations.forEach(ev => {
      const school = schools.find(s => s.id === ev.schoolId);
      if (!school) return;

      const prizes = customAwards.filter(a => ev.wonAwardIds && ev.wonAwardIds.includes(a.id));
      const totalT = prizes.reduce((acc, p) => acc + (ev.wonAwardValues?.[p.id] ?? p.value), 0);
      const totalV = school.viceTreasurerName ? totalT * 0.5 : 0;

      if (!resultsBySchool[school.id]) {
        resultsBySchool[school.id] = {
          schoolName: school.name,
          treasurerName: school.treasurerName || '---',
          totalTreasurer: 0,
          totalVice: 0,
          evaluationsCount: 0
        };
      }
      resultsBySchool[school.id].totalTreasurer += totalT;
      resultsBySchool[school.id].totalVice += totalV;
      resultsBySchool[school.id].evaluationsCount += 1;
    });

    return Object.values(resultsBySchool).sort((a, b) => (b.totalTreasurer + b.totalVice) - (a.totalTreasurer + a.totalVice));
  }, [evaluations, schools, customAwards, activePeriodId, activeSchoolId]);

  const totals = useMemo(() => {
    return consolidatedData.reduce((acc, curr) => ({
      treasurer: acc.treasurer + curr.totalTreasurer,
      vice: acc.vice + curr.totalVice,
      general: acc.general + curr.totalTreasurer + curr.totalVice
    }), { treasurer: 0, vice: 0, general: 0 });
  }, [consolidatedData]);

  return (
    <div className="space-y-8">
      {consolidatedData.length === 0 && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Análise de Custos</h4>
            <p className="text-xs font-medium text-blue-700 mt-1">
              Certifique-se de que a unidade possui o status de <strong>Avaliação Finalizada</strong> no período selecionado para ver os custos.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#003B71] p-6 rounded-3xl text-white relative overflow-hidden shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-blue-200">Repasse Tesoureiros</p>
          <h3 className="text-2xl font-black">{formatBRL(totals.treasurer)}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-400">Repasse Vices</p>
          <h3 className="text-2xl font-black text-slate-700">{formatBRL(totals.vice)}</h3>
        </div>

        <div className="bg-[#FDB813] p-6 rounded-3xl text-[#003B71] relative overflow-hidden shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2">Custo Geral de Premiação</p>
          <h3 className="text-2xl font-black">{formatBRL(totals.general)}</h3>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-1.5 h-6 bg-[#003B71] rounded-full"></span>
          <h2 className="text-lg font-black text-[#003B71] uppercase tracking-tight">Detalhamento por Unidade</h2>
        </div>

        <div className="space-y-6">
          {consolidatedData.map((res, index) => {
            const total = res.totalTreasurer + res.totalVice;
            const maxVal = Math.max(...consolidatedData.map(d => d.totalTreasurer + d.totalVice), 1);
            const percent = (total / maxVal) * 100;

            return (
              <div key={res.schoolName} className="group">
                <div className="flex items-end justify-between mb-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-black text-[#003B71] uppercase tracking-tight flex items-center">
                      {res.schoolName}
                      {index === 0 && total > 0 && <span className="ml-2 bg-[#FDB813] text-[#003B71] text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-widest">1º LUGAR</span>}
                      {index === 1 && total > 0 && <span className="ml-2 bg-slate-300 text-slate-800 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-widest">2º LUGAR</span>}
                      {index === 2 && total > 0 && <span className="ml-2 bg-amber-700/20 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-widest">3º LUGAR</span>}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{res.evaluationsCount} Avaliaç{res.evaluationsCount === 1 ? 'ão' : 'ões'}</span>
                  </div>
                  <span className="text-lg font-black text-[#003B71]">{formatBRL(total)}</span>
                </div>

                <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#003B71] to-[#005099] rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percent}%` }}
                  />
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
              title="Sem Dados"
              description="Nenhuma premiação registrada para este filtro"
              className="p-10 border-none bg-transparent"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CostAnalysis;
