
import React, { useState } from 'react';
import { Category, CriterionOption } from '../types';
import { formatBRL, formatPercentage, formatCurrencyInput, parseCurrencyString } from '../utils/formatting';
import { getMonthIndexFromLabel } from '../utils/calculations';

interface CriteriaEvaluatorProps {
  categories: Category[];
  schoolName: string;
  selections: Record<string, string>;
  realizedValues: Record<string, number>;
  schoolTargets: Record<string, number>;
  inadimplenciaRankingPercentage?: number;
  isReadOnly: boolean;
  onSelect: (categoryId: string, optionId: string) => void;
  onMetricInput: (categoryId: string, value: number) => void;
  onInadimplenciaRankingInput: (value: number) => void;
  onUpdateCategories: (categories: Category[]) => void;
  activePeriodLabel?: string;
}

const CriteriaEvaluator: React.FC<CriteriaEvaluatorProps> = ({
  categories,
  schoolName,
  selections,
  realizedValues,
  schoolTargets,
  inadimplenciaRankingPercentage,
  isReadOnly,
  onSelect,
  onMetricInput,
  onInadimplenciaRankingInput,
  onUpdateCategories,
  activePeriodLabel
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);

  // Sincroniza localCategories quando categories mudar (ex: troca de escola ou carregamento inicial)
  React.useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleToggleEditMode = () => {
    if (isEditMode) {
      // Saindo do modo de edição: grava as alterações
      onUpdateCategories(localCategories);
    }
    setIsEditMode(!isEditMode);
  };

  const handleUpdateOption = (catId: string, optId: string, updates: Partial<CriterionOption>) => {
    const updated = localCategories.map(cat => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        options: cat.options.map(opt => {
          if (opt.id !== optId) return opt;
          return { ...opt, ...updates };
        })
      };
    });
    setLocalCategories(updated);
  };

  const handleUpdateCategoryName = (catId: string, newName: string) => {
    const updated = localCategories.map(cat => {
      if (cat.id !== catId) return cat;
      return { ...cat, name: newName };
    });
    setLocalCategories(updated);
  };

  const handleUpdateThreshold = (catId: string, index: number, value: number) => {
    const updated = localCategories.map(cat => {
      if (cat.id !== catId) return cat;
      const newThresholds = [...(cat.metricThresholds || [0, 0])];
      newThresholds[index] = value;

      const newOptions = [...cat.options];
      if (catId === 'inadimplencia_mes') {
        if (index === 0) {
          newOptions[0].label = `Inadimplência <= ${value}%`;
          newOptions[1].label = `Inadimplência entre ${value + 0.1}% e ${newThresholds[1]}%`;
        } else if (index === 1) {
          newOptions[1].label = `Inadimplência entre ${newThresholds[0] + 0.1}% e ${value}%`;
          newOptions[2].label = `Inadimplência > ${value}%`;
        }
      } else if (catId === 'orcamento_bi') {
        if (index === 1) {
          newOptions[1].label = `Até ${value}% fora da meta`;
          newOptions[2].label = `Mais de ${value}% fora da meta`;
        }
      } else if (catId === 'descontos_concedidos') {
        if (index === 1) {
          newOptions[1].label = `Até ${value}% acima da meta`;
          newOptions[2].label = `Mais de ${value}% acima da meta`;
        }
      }

      return { ...cat, metricThresholds: newThresholds, options: newOptions };
    });
    setLocalCategories(updated);
  };

  const getAutoSelectedOptionId = (category: Category, realized: number, target: number) => {
    const thresholds = category.metricThresholds || [0, 0];

    if (category.id === 'inadimplencia_mes') {
      const limit1 = thresholds[0] ?? 2;
      const limit2 = thresholds[1] ?? 3;
      if (realized <= limit1) return category.options[0].id;
      if (realized > limit1 && realized <= limit2) return category.options[1].id;
      return category.options[2].id;
    } else if (category.id === 'descontos_concedidos') {
      const limit1 = thresholds[0] ?? 0;
      const limit2 = thresholds[1] ?? 0.25;
      if (realized <= target + limit1) return category.options[0].id;
      if (realized > target + limit1 && realized <= target + limit2) return category.options[1].id;
      return category.options[2].id;
    } else if (category.id === 'orcamento_bi') {
      if (!activePeriodLabel) return category.options[category.options.length - 1].id;
      const monthIndex = getMonthIndexFromLabel(activePeriodLabel);
      const accumulatedTarget = (target / 12) * monthIndex;

      const marginPercent = thresholds[1] ?? 10;
      const marginFactor = 1 + (marginPercent / 100);

      if (realized <= accumulatedTarget) return category.options[0].id;
      if (realized <= accumulatedTarget * marginFactor) return category.options[1].id;
      return category.options[2].id;
    }
    return category.options[category.options.length - 1].id;
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 transition-all duration-500 ${isReadOnly ? 'bg-slate-50/50' : 'ring-1 ring-slate-100'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <span className="w-2 h-8 bg-[#FDB813] rounded-full mr-3"></span>
            Critérios e Avaliação Realizada
            {isReadOnly && (
              <span className="ml-3 text-[10px] bg-slate-200 text-slate-600 px-3 py-1 rounded-full flex items-center font-black uppercase tracking-widest">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Finalizado
              </span>
            )}
          </h2>
          <p className="text-[11px] font-black text-[#003B71] uppercase tracking-widest mt-1 ml-5">
            Personalizado para: <span className="bg-[#003B71] text-white px-2 py-0.5 rounded">{schoolName}</span>
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleToggleEditMode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-black text-xs transition-all uppercase tracking-widest shadow-md ${isEditMode
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600'
              }`}
          >
            {isEditMode ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span>Finalizar Edição</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Ajustar Critérios</span>
              </>
            )}
          </button>
        )}
      </div>

      {!isReadOnly && (
        <div className="mb-8 p-4 rounded-xl border border-blue-200 bg-blue-50/20">
          <label className="block text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">
            Inadimplência para Ranking entre Escolas (%)
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={formatCurrencyInput(inadimplenciaRankingPercentage ?? 0)}
              onChange={(e) => onInadimplenciaRankingInput(parseCurrencyString(e.target.value))}
              disabled={isReadOnly}
              className="w-full bg-white border border-blue-100 rounded-lg px-3 py-2 text-lg font-black text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all pr-12"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-blue-400">%</span>
          </div>
          <p className="text-[9px] text-blue-600 mt-2">
            Este valor será usado para classificar as escolas no ranking de inadimplência (1º, 2º, 3º lugar).
          </p>
        </div>
      )}

      <div className="space-y-6">
        {localCategories.map((category) => {
          const isMetric = !!category.isMetric;
          const target = schoolTargets[category.id] || 0;
          const realized = realizedValues[category.id] || 0;

          const effectiveSelectionId = isMetric
            ? getAutoSelectedOptionId(category, realized, target)
            : selections[category.id];

          return (
            <div key={category.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              {isEditMode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) => handleUpdateCategoryName(category.id, e.target.value)}
                      className="text-lg font-black text-[#003B71] uppercase tracking-wide bg-white border-b-2 border-[#003B71] rounded-t px-4 py-2 w-full md:w-1/2 focus:outline-none focus:bg-white transition-all"
                    />
                    <span className="text-[10px] font-black text-slate-300 uppercase italic">Título da Categoria</span>
                  </div>

                  {isMetric && (
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.id === 'inadimplencia_mes' && (
                        <>
                          <div>
                            <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Limite Opção 1 (Pontuação Máxima)</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                value={category.metricThresholds?.[0] ?? 2}
                                onChange={(e) => handleUpdateThreshold(category.id, 0, Number(e.target.value))}
                                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 font-black text-blue-800"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-300">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Limite Opção 2 (Pontuação Média)</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                value={category.metricThresholds?.[1] ?? 3}
                                onChange={(e) => handleUpdateThreshold(category.id, 1, Number(e.target.value))}
                                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 font-black text-blue-800"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-300">%</span>
                            </div>
                          </div>
                        </>
                      )}
                      {(category.id === 'orcamento_bi' || category.id === 'descontos_concedidos') && (
                        <div>
                          <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Margem de Tolerância (%)</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={category.metricThresholds?.[1] ?? (category.id === 'orcamento_bi' ? 10 : 0.25)}
                              onChange={(e) => handleUpdateThreshold(category.id, 1, Number(e.target.value))}
                              className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 font-black text-blue-800"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-300">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-3">
                  <h3 className="text-lg font-black text-[#003B71] uppercase tracking-wide flex items-center">
                    <span className="w-1 h-4 bg-[#003B71] mr-3 rounded-full opacity-30"></span>
                    {category.name}
                  </h3>
                  {isMetric && !isEditMode && (
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm">
                      {(category.id === 'orcamento_bi' || category.id === 'descontos_concedidos') && (
                        <>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                              {category.id === 'orcamento_bi' ? 'Meta Acumulada (Pelo Mês)' : 'Meta Definida'}
                            </span>
                            <span className="text-sm font-black text-[#003B71]">
                              {category.id === 'orcamento_bi'
                                ? formatBRL((target / 12) * (activePeriodLabel ? getMonthIndexFromLabel(activePeriodLabel) : 1))
                                : formatPercentage(target)}
                            </span>
                          </div>
                          <div className="h-6 w-px bg-slate-200"></div>
                        </>
                      )}

                      <div className="flex flex-col min-w-[120px]">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Valor Realizado ({category.id === 'orcamento_bi' ? 'R$' : '%'})
                        </span>
                        <div className="relative mt-0.5">
                          {category.id === 'inadimplencia_mes' ? (
                            <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-lg border border-blue-100 uppercase tracking-tight flex items-center gap-2">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" />
                              </svg>
                              Auto-Sincronizado
                            </div>
                          ) : (
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={isReadOnly}
                              value={formatCurrencyInput(realized)}
                              onChange={(e) => onMetricInput(category.id, parseCurrencyString(e.target.value))}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71]"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {category.options.map((option) => {
                  const isSelected = effectiveSelectionId === option.id;

                  if (isEditMode) {
                    return (
                      <div key={option.id} className="p-3 rounded-xl border-2 border-slate-100 bg-white flex flex-col space-y-2 hover:border-slate-200 transition-all shadow-sm">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição da Opção</label>
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => handleUpdateOption(category.id, option.id, { label: e.target.value })}
                            className="text-xs font-bold p-2 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#003B71] transition-all"
                          />
                        </div>
                        <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pontuação:</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={option.points}
                              onChange={(e) => handleUpdateOption(category.id, option.id, { points: Number(e.target.value) })}
                              className="w-16 text-xs font-black p-1 bg-white border border-slate-200 rounded-md text-[#003B71] text-center focus:outline-none focus:ring-2 focus:ring-[#003B71]"
                            />
                            <span className="text-[9px] font-black text-slate-300 uppercase">Pts</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={option.id}
                      disabled={isReadOnly || isMetric}
                      onClick={() => !isReadOnly && !isMetric && onSelect(category.id, option.id)}
                      className={`flex justify-between items-center p-3.5 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden group ${isSelected
                        ? 'bg-[#003B71] border-[#003B71] text-white shadow-lg scale-[1.01] z-10'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:bg-blue-50/30'
                        } ${isReadOnly && !isSelected ? 'opacity-40 cursor-not-allowed' : ''} ${isMetric ? 'cursor-default' : ''}`}
                    >
                      {isSelected && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#FDB813]"></div>
                      )}
                      <span className="text-xs font-bold pr-3 leading-tight">{option.label}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap tracking-widest uppercase transition-colors shadow-sm border border-transparent ${isSelected ? 'bg-white text-[#003B71] border-white/20' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                        }`}>
                        {option.points} <span className="opacity-25">pts</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CriteriaEvaluator;
