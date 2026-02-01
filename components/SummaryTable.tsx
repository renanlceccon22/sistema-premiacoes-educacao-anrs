
import React, { useMemo } from 'react';
import { 
  SchoolUnit, 
  Thresholds, 
  AwardLevel, 
  Category, 
  InadimplenciaRankingConfig, 
  ManagementBonusConfig, 
  AnrsBonusConfig 
} from '../types';
import { calculatePoints, getAwardLevel, calculateAllPrizes, getMonthIndexFromLabel } from '../utils/calculations';
import { formatBRL, formatPercentage } from '../utils/formatting';

interface SchoolWithEvaluationStatus extends SchoolUnit {
  selections: Record<string, string>;
  realizedValues: Record<string, number>;
  inadimplenciaRankingPercentage?: number;
  isFinalized: boolean;
  categories: Category[];
}

interface SummaryTableProps {
  schools: SchoolWithEvaluationStatus[];
  thresholds: Thresholds;
  inadimplenciaRankingConfig: InadimplenciaRankingConfig;
  managementBonusConfig: ManagementBonusConfig;
  anrsBonusConfig: AnrsBonusConfig;
  activePeriodLabel: string;
  allPeriodEvaluations: {
    schoolId: string;
    inadimplenciaRankingPercentage?: number;
    categories: Category[];
    selections: Record<string, string>;
    realizedValues: Record<string, number>;
    targets: Record<string, number>;
    periodLabel?: string;
  }[];
}

const SummaryTable: React.FC<SummaryTableProps> = ({
  schools,
  thresholds,
  inadimplenciaRankingConfig,
  managementBonusConfig,
  anrsBonusConfig,
  activePeriodLabel,
  allPeriodEvaluations
}) => {
  
  const getSchoolResult = (school: SchoolWithEvaluationStatus) => {
    // Cálculo rigoroso de pontos garantindo que orcamento_bi e descontos usem o contexto correto
    const points = school.categories.reduce((acc, cat) => {
      const target = school.targets[cat.id] || 0;
      const realized = school.realizedValues[cat.id];
      const selection = school.selections[cat.id];
      const p = calculatePoints(cat, selection, realized, target, activePeriodLabel);
      return acc + p;
    }, 0);

    const level = getAwardLevel(points, thresholds);

    const prizes = calculateAllPrizes(
      points,
      thresholds,
      inadimplenciaRankingConfig,
      managementBonusConfig,
      anrsBonusConfig,
      allPeriodEvaluations,
      school.id,
      activePeriodLabel
    );
    
    let statusText = "Pendente";
    let statusColor = "bg-slate-100 text-slate-400";
    
    if (school.isFinalized) {
      statusText = "Consolidado";
      statusColor = "bg-green-100 text-green-600";
    } else if (Object.keys(school.selections).length > 0 || Object.keys(school.realizedValues).length > 0) {
      statusText = "Em Aberto";
      statusColor = "bg-blue-100 text-blue-600";
    }

    return { 
      ...prizes,
      points, 
      level, 
      statusText, 
      statusColor,
      school
    };
  };

  const sortedResults = useMemo(() => {
    const results = schools.map(s => getSchoolResult(s));
    return results.sort((a, b) => b.points - a.points);
  }, [schools, thresholds, inadimplenciaRankingConfig, managementBonusConfig, anrsBonusConfig, allPeriodEvaluations, activePeriodLabel]);

  const downloadExcel = async () => {
    try {
      const XLSX = await import('https://esm.sh/xlsx');
      const data = sortedResults.map(res => ({
        'Unidade': res.school.name,
        'Inad. Mês (%)': formatPercentage(res.school.realizedValues['inadimplencia_mes'] || 0),
        'Pontuação': res.points,
        'Bônus Ranking': res.inadimplenciaRankingBonus,
        'Bônus Gestão': res.managementBonus,
        'Bônus ANRS': res.anrsBonus,
        'Repasse Tesoureiro': res.totalTreasurerPrize,
        'Repasse Vice': res.vicePrize,
        'Status': res.statusText
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo');
      XLSX.writeFile(workbook, `Resumo_Tesouraria_${activePeriodLabel.replace('/', '_')}.xlsx`);
    } catch (e) { alert("Erro ao gerar Excel"); }
  };

  const totalTreasurer = sortedResults.reduce((acc, r) => acc + r.totalTreasurerPrize, 0);
  const totalVice = sortedResults.reduce((acc, r) => acc + r.vicePrize, 0);

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-[#003B71] uppercase tracking-tight">Resumo Consolidado</h2>
          <p className="text-sm text-slate-500 font-medium">Período Ativo: <span className="text-[#FDB813] font-bold">{activePeriodLabel}</span></p>
        </div>
        <button onClick={downloadExcel} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" /></svg>
          Exportar Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-6 py-4 border-b border-slate-100">Unidade</th>
              <th className="px-6 py-4 border-b border-slate-100">Inad. Mês (%)</th>
              <th className="px-6 py-4 border-b border-slate-100">Pontuação</th>
              <th className="px-6 py-4 border-b border-slate-100">Bônus Ranking</th>
              <th className="px-6 py-4 border-b border-slate-100">Bônus Gestão</th>
              <th className="px-6 py-4 border-b border-slate-100">Bônus ANRS</th>
              <th className="px-6 py-4 border-b border-slate-100 text-right">Tesoureiro</th>
              <th className="px-6 py-4 border-b border-slate-100 text-right">Vice</th>
              <th className="px-6 py-4 border-b border-slate-100 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold text-slate-700">
            {sortedResults.map((res, idx) => (
              <tr key={res.school.id} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                <td className="px-6 py-4 border-b border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[#003B71]">{res.school.name}</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{res.school.treasurerName || 'Sem Nome'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                   <span className="text-slate-600">{formatPercentage(res.school.realizedValues['inadimplencia_mes'] || 0)}</span>
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  <span className={`px-2 py-1 rounded text-xs font-black border ${res.points >= 700 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                    {res.points} PTS
                  </span>
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  {res.inadimplenciaRankingBonus > 0 ? (
                    <div className="flex flex-col">
                      <span className="text-blue-600 text-xs">+{formatBRL(res.inadimplenciaRankingBonus)}</span>
                      <span className="text-[9px] text-blue-300 uppercase">{res.inadimplenciaRank}º Lugar</span>
                    </div>
                  ) : <span className="text-slate-200">---</span>}
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  {res.managementBonus > 0 ? <span className="text-green-600 text-xs">+{formatBRL(res.managementBonus)}</span> : <span className="text-slate-200">---</span>}
                </td>
                <td className="px-6 py-4 border-b border-slate-100">
                  {res.anrsBonus > 0 ? <span className="text-purple-600 text-xs">+{formatBRL(res.anrsBonus)}</span> : <span className="text-slate-200">---</span>}
                </td>
                <td className="px-6 py-4 border-b border-slate-100 text-right font-black text-[#003B71]">
                  {formatBRL(res.totalTreasurerPrize)}
                </td>
                <td className="px-6 py-4 border-b border-slate-100 text-right font-black text-slate-400">
                  {formatBRL(res.vicePrize)}
                </td>
                <td className="px-6 py-4 border-b border-slate-100 text-center">
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${res.statusColor}`}>
                    {res.statusText}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-black">
              <td colSpan={6} className="px-6 py-6 text-right uppercase tracking-[0.2em] text-[10px]">Total de Repasses no Período</td>
              <td className="px-6 py-6 text-right text-lg border-l border-white/10">{formatBRL(totalTreasurer)}</td>
              <td className="px-6 py-6 text-right text-lg border-l border-white/10">{formatBRL(totalVice)}</td>
              <td className="bg-[#FDB813] text-[#003B71] text-center text-xs uppercase tracking-widest p-0">
                <div className="flex flex-col items-center justify-center h-full">
                  <span>Geral</span>
                  <span className="text-base">{formatBRL(totalTreasurer + totalVice)}</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default SummaryTable;
