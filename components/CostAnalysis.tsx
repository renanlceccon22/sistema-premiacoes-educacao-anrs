
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

interface CostAnalysisProps {
  schools: SchoolUnit[];
  periods: Period[];
  evaluations: Evaluation[];
  thresholds: Thresholds;
  inadimplenciaRankingConfig: InadimplenciaRankingConfig;
  managementBonusConfig: ManagementBonusConfig;
  anrsBonusConfig: AnrsBonusConfig;
}

const CostAnalysis: React.FC<CostAnalysisProps> = ({
  schools,
  periods,
  evaluations,
  thresholds,
  inadimplenciaRankingConfig,
  managementBonusConfig,
  anrsBonusConfig
}) => {
  const years = useMemo(() => {
    const yearsSet = new Set<string>();
    periods.forEach(p => {
      const year = p.label.split('/')[1];
      if (year) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort().reverse();
  }, [periods]);

  const [selectedYear, setSelectedYear] = useState<string>(years[0] || new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' ou o nome do mês

  const monthsInYear = useMemo(() => {
    return periods
      .filter(p => p.label.includes(selectedYear))
      .map(p => p.label.split('/')[0]);
  }, [periods, selectedYear]);

  const consolidatedData = useMemo(() => {
    // 1. Filtrar períodos baseados no ano e mês
    const filteredPeriods = periods.filter(p => {
      const [m, y] = p.label.split('/');
      const yearMatch = y === selectedYear;
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
          categories: INITIAL_CATEGORIES, // Simplificado, mas idealmente seria custom_categories
          selections: ev?.selections || {},
          realizedValues: ev?.realizedValues || {},
          targets: s.targets || {},
          periodLabel: p.label
        };
      });

      schools.forEach(school => {
        const evaluation = evaluations.find(e => e.schoolId === school.id && e.periodId === p.id);
        if (!evaluation || !evaluation.isFinalized) return;

        // Calcular pontos deste mês
        const points = INITIAL_CATEGORIES.reduce((acc, cat) => {
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
  }, [selectedYear, selectedMonth, periods, evaluations, schools, thresholds, inadimplenciaRankingConfig, managementBonusConfig, anrsBonusConfig]);

  const totals = useMemo(() => {
    return consolidatedData.reduce((acc, curr) => ({
      treasurer: acc.treasurer + curr.totalTreasurer,
      vice: acc.vice + curr.totalVice,
      general: acc.general + curr.totalTreasurer + curr.totalVice
    }), { treasurer: 0, vice: 0, general: 0 });
  }, [consolidatedData]);

  return (
    <div className="space-y-8">
      {/* Filtros */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex flex-col">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ano de Referência</label>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 text-sm font-black text-[#003B71] focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mês (Opcional)</label>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 text-sm font-black text-[#003B71] focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          >
            <option value="all">Todos os Meses (Consolidado Anual)</option>
            {monthsInYear.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#003B71] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.33 2.99-3S17.66 5 16 5s-3 1.33-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.33 2.99-3S9.66 5 8 5 5 6.33 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-blue-200">Total Repasse Tesoureiros</p>
          <h3 className="text-3xl font-black">{formatBRL(totals.treasurer)}</h3>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-slate-400">Total Repasse Vices</p>
          <h3 className="text-3xl font-black text-slate-700">{formatBRL(totals.vice)}</h3>
        </div>

        <div className="bg-[#FDB813] p-8 rounded-3xl text-[#003B71] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
             <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4">Custo Geral de Premiação</p>
          <h3 className="text-3xl font-black">{formatBRL(totals.general)}</h3>
        </div>
      </div>

      {/* Ranking dos Melhores */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
         <div className="flex items-center gap-3 mb-8">
            <span className="w-2 h-8 bg-yellow-400 rounded-full"></span>
            <h2 className="text-xl font-black text-[#003B71] uppercase tracking-tight">Ranking de Excelência (Pontuação)</h2>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {consolidatedData.slice(0, 3).map((res, idx) => (
              <div key={res.schoolName} className={`p-6 rounded-2xl flex items-center justify-between border-2 ${idx === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-100'}`}>
                <div>
                   <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full mb-2 inline-block ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-200 text-slate-500'}`}>
                      {idx + 1}º Lugar
                   </span>
                   <h4 className="font-black text-[#003B71] truncate w-40">{res.schoolName}</h4>
                   <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{res.treasurerName}</p>
                </div>
                <div className="text-right">
                   <p className="text-2xl font-black text-[#003B71] leading-none">{res.totalPoints}</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Pontos Acum.</p>
                </div>
              </div>
            ))}
         </div>
      </div>

      {/* Tabela de Custos */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <h2 className="text-xl font-black text-[#003B71] uppercase tracking-tight">Detalhamento de Custos por Unidade</h2>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
             {consolidatedData.length} Unidades Processadas no Período
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                <th className="px-8 py-4 border-b">Escola / Unidade</th>
                <th className="px-8 py-4 border-b">Tesoureiro(a)</th>
                <th className="px-8 py-4 border-b text-right">Tesoureiro (100%)</th>
                <th className="px-8 py-4 border-b text-right">Vice (50%)</th>
                <th className="px-8 py-4 border-b text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {consolidatedData.map((res, idx) => (
                <tr key={res.schoolName} className={`transition-all hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                  <td className="px-8 py-5 border-b font-black text-[#003B71]">{res.schoolName}</td>
                  <td className="px-8 py-5 border-b">
                     <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{res.treasurerName}</span>
                        <span className="text-[9px] text-slate-300 font-black uppercase">Vice: {res.viceName}</span>
                     </div>
                  </td>
                  <td className="px-8 py-5 border-b text-right font-black text-green-600">
                    {formatBRL(res.totalTreasurer)}
                  </td>
                  <td className="px-8 py-5 border-b text-right font-bold text-slate-400">
                    {formatBRL(res.totalVice)}
                  </td>
                  <td className="px-8 py-5 border-b text-right font-black text-slate-800 bg-slate-50/50">
                    {formatBRL(res.totalTreasurer + res.totalVice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-[#003B71] text-white">
                  <td colSpan={2} className="px-8 py-6 font-black uppercase text-[10px] tracking-widest text-blue-200">Consolidado Total Final</td>
                  <td className="px-8 py-6 text-right font-black text-xl border-l border-white/5">{formatBRL(totals.treasurer)}</td>
                  <td className="px-8 py-6 text-right font-black text-xl border-l border-white/5">{formatBRL(totals.vice)}</td>
                  <td className="px-8 py-6 text-right font-black text-xl bg-[#FDB813] text-[#003B71] border-l border-[#003B71]/10">
                    {formatBRL(totals.general)}
                  </td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostAnalysis;
