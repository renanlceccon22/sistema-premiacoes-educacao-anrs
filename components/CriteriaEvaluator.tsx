
import React, { useState } from 'react';
import { Category, CriterionOption, EvaluationModel, EvaluationDirection } from '../types';
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
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Sincroniza localCategories quando categories mudar (ex: troca de escola ou carregamento inicial)
  React.useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  // Close when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleEditMode = () => {
    if (isEditMode) {
      // Saindo do modo de edição: grava as alterações
      onUpdateCategories(localCategories);
    }
    setIsEditMode(!isEditMode);
  };

  const handleCancelEdit = () => {
    setLocalCategories(categories);
    setIsEditMode(false);
  };

  const handleUpdateCategory = (catId: string, updates: Partial<Category>) => {
    const updated = localCategories.map(cat => {
      if (cat.id !== catId) return cat;
      return { ...cat, ...updates };
    });
    setLocalCategories(updated);
  };

  const handleUpdateThreshold = (catId: string, index: number, value: number) => {
    const updated = localCategories.map(cat => {
      if (cat.id !== catId) return cat;
      const newThresholds = [...(cat.metricThresholds || [0, 0])];
      newThresholds[index] = value;

      const newOptions = [...cat.options];
      // Atualização automática de labels se for um dos modelos padrão
      if (cat.evaluationModel === EvaluationModel.METRIC_DIRECT) {
        const dir = cat.evaluationDirection === EvaluationDirection.HIGHER_IS_BETTER ? '>' : '<=';
        const invDir = cat.evaluationDirection === EvaluationDirection.HIGHER_IS_BETTER ? '<' : '>';
        if (index === 0) {
          newOptions[0].label = `${cat.name} ${dir} ${value}%`;
          newOptions[1].label = `${cat.name} entre ${value + (cat.evaluationDirection === EvaluationDirection.HIGHER_IS_BETTER ? -0.1 : 0.1)}% e ${newThresholds[1]}%`;
        } else if (index === 1) {
          newOptions[1].label = `${cat.name} entre ${newThresholds[0] + (cat.evaluationDirection === EvaluationDirection.HIGHER_IS_BETTER ? -0.1 : 0.1)}% e ${value}%`;
          newOptions[2].label = `${cat.name} ${invDir} ${value}%`;
        }
      }

      return { ...cat, metricThresholds: newThresholds, options: newOptions };
    });
    setLocalCategories(updated);
  };

  const getAutoSelectedOptionId = (category: Category, realized: number, target: number) => {
    const model = category.evaluationModel;
    if (model === EvaluationModel.MANUAL || !model) {
      return selections[category.id] || category.options[category.options.length - 1].id;
    }

    const thresholds = category.metricThresholds || [0, 0];
    const isHigherBetter = category.evaluationDirection === EvaluationDirection.HIGHER_IS_BETTER;

    let limit1 = thresholds[0] ?? 0;
    let limit2 = thresholds[1] ?? 0;

    if (model === EvaluationModel.METRIC_RELATIVE) {
      limit1 = target + (thresholds[0] ?? 0);
      limit2 = target + (thresholds[1] ?? 0);
    } else if (model === EvaluationModel.METRIC_ACCUMULATED || category.id === 'orcamento_bi') {
      if (!activePeriodLabel) return category.options[category.options.length - 1].id;
      const monthIndex = getMonthIndexFromLabel(activePeriodLabel);
      const accumulatedTarget = (target / 12) * monthIndex;
      limit1 = accumulatedTarget;
      const marginPercent = thresholds[1] ?? 0;
      limit2 = accumulatedTarget * (1 + marginPercent / 100);
    }

    if (isHigherBetter) {
      if (realized >= limit1) return category.options[0].id;
      if (realized >= limit2) return category.options[1].id;
      return category.options[2].id;
    } else {
      if (realized <= limit1) return category.options[0].id;
      if (realized <= limit2) return category.options[1].id;
      return category.options[2].id;
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 transition-all duration-500 ${isReadOnly ? 'bg-slate-50/50' : 'ring-1 ring-slate-100'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center">
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
          <div className="flex items-center gap-3">
            {isEditMode && (
              <button
                onClick={handleCancelEdit}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl font-black text-xs transition-all uppercase tracking-widest bg-white border-2 border-slate-100 text-slate-400 hover:border-red-200 hover:text-red-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancelar</span>
              </button>
            )}
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
          </div>
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

      <div className="space-y-6" ref={dropdownRef}>
        {localCategories.map((category) => {
          const isMetricMode = category.evaluationModel !== EvaluationModel.MANUAL;
          const target = schoolTargets[category.id] || 0;
          const realized = realizedValues[category.id] || 0;

          const effectiveSelectionId = isMetricMode
            ? getAutoSelectedOptionId(category, realized, target)
            : selections[category.id];

          const isTargetRequired = category.id === 'orcamento_bi' || category.id === 'descontos_concedidos';
          const hasMissingTarget = isTargetRequired && target <= 0;

          return (
            <div key={category.id} className={`bg-slate-50/30 p-5 rounded-2xl border border-slate-100 last:mb-0 mb-6 transition-all ${hasMissingTarget && !isEditMode ? 'opacity-80 grayscale-[0.5]' : ''}`}>
              {hasMissingTarget && !isEditMode && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 flex-shrink-0 animate-pulse">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none mb-1">Meta Não Configurada</h4>
                    <p className="text-[9px] text-amber-600 font-bold">
                      Este critério depende de uma meta vinculada à unidade. Como não há meta definida, você pode <button onClick={handleToggleEditMode} className="underline hover:text-amber-800">ajustar o modelo</button> ou desconsiderá-lo.
                    </p>
                  </div>
                </div>
              )}
              {isEditMode ? (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1 w-full">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 block">Nome da Categoria</label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => handleUpdateCategory(category.id, { name: e.target.value })}
                        className="text-lg font-black text-[#003B71] uppercase tracking-wide bg-white border border-slate-200 rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all"
                      />
                    </div>
                    <div className="w-full md:w-64 relative">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 block">Modelo de Avaliação</label>
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === `${category.id}_model` ? null : `${category.id}_model`)}
                        className="app-select w-full flex justify-between items-center px-4 py-2.5 text-xs text-left"
                      >
                        <span className="truncate">
                          {category.evaluationModel === EvaluationModel.MANUAL ? 'Seleção Manual de Opções' :
                            category.evaluationModel === EvaluationModel.METRIC_DIRECT ? 'Valor Realizado vs Limite Fixo' :
                              category.evaluationModel === EvaluationModel.METRIC_RELATIVE ? 'Valor Realizado vs Meta (% Delta)' :
                                'Valor Realizado vs Meta Acumulada'}
                        </span>
                      </button>
                      {openDropdownId === `${category.id}_model` && (
                        <ul className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white border border-slate-100 rounded-xl shadow-2xl z-50 py-1">
                          {[
                            { value: EvaluationModel.MANUAL, label: 'Seleção Manual de Opções' },
                            { value: EvaluationModel.METRIC_DIRECT, label: 'Valor Realizado vs Limite Fixo' },
                            { value: EvaluationModel.METRIC_RELATIVE, label: 'Valor Realizado vs Meta (% Delta)' },
                            { value: EvaluationModel.METRIC_ACCUMULATED, label: 'Valor Realizado vs Meta Acumulada' }
                          ].map(item => (
                            <li
                              key={item.value}
                              onClick={() => { handleUpdateCategory(category.id, { evaluationModel: item.value }); setOpenDropdownId(null); }}
                              className={`px-4 py-2 text-xs font-bold cursor-pointer transition-colors ${category.evaluationModel === item.value ? 'bg-blue-50 text-[#003B71]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#003B71]'}`}
                            >
                              {item.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {isMetricMode && (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1.5 block">Direção da Avaliação</label>
                          <button
                            onClick={() => setOpenDropdownId(openDropdownId === `${category.id}_dir` ? null : `${category.id}_dir`)}
                            className="app-select w-full flex justify-between items-center px-4 py-2.5 text-xs text-left"
                          >
                            <span className="truncate">
                              {category.evaluationDirection === EvaluationDirection.LOWER_IS_BETTER ? 'Menor valor é melhor' : 'Maior valor é melhor'}
                            </span>
                          </button>
                          {openDropdownId === `${category.id}_dir` && (
                            <ul className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white border border-slate-100 rounded-xl shadow-2xl z-50 py-1">
                              {[
                                { value: EvaluationDirection.LOWER_IS_BETTER, label: 'Menor valor é melhor (ex: Inadimplência/Gastos)' },
                                { value: EvaluationDirection.HIGHER_IS_BETTER, label: 'Maior valor é melhor (ex: Faturamento/Performance)' }
                              ].map(item => (
                                <li
                                  key={item.value}
                                  onClick={() => { handleUpdateCategory(category.id, { evaluationDirection: item.value }); setOpenDropdownId(null); }}
                                  className={`px-4 py-2 text-xs font-bold cursor-pointer transition-colors ${category.evaluationDirection === item.value ? 'bg-blue-50 text-[#003B71]' : 'text-slate-600 hover:bg-slate-50 hover:text-[#003B71]'}`}
                                >
                                  {item.label}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="flex-1">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1.5 block">
                            {category.evaluationModel === EvaluationModel.METRIC_DIRECT ? 'Meta de Excelência (100 pts)' : 'Variação Permitida p/ 100 pts'}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={category.metricThresholds?.[0] ?? 0}
                              onChange={(e) => handleUpdateThreshold(category.id, 0, Number(e.target.value))}
                              className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2.5 font-black text-blue-800"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-blue-300">%</span>
                          </div>
                        </div>

                        <div className="flex-1">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1.5 block">
                            {category.evaluationModel === EvaluationModel.METRIC_DIRECT ? 'Margem de Tolerância (70 pts)' : 'Margem de Erro Aceitável (70 pts)'}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={category.metricThresholds?.[1] ?? 0}
                              onChange={(e) => handleUpdateThreshold(category.id, 1, Number(e.target.value))}
                              className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2.5 font-black text-blue-800"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-blue-300">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-3">
                  <h3 className="text-lg font-black text-[#003B71] uppercase tracking-wide flex items-center">
                    <span className="w-1.5 h-6 bg-[#003B71] mr-3 rounded-full opacity-20"></span>
                    {category.name}
                  </h3>
                  {isMetricMode && (
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm ml-auto">
                      {/* VALOR ORÇADO (REFERÊNCIA) - Só aparece para modelos que dependem da Meta variável */}
                      {((category.evaluationModel === EvaluationModel.METRIC_ACCUMULATED ||
                        category.evaluationModel === EvaluationModel.METRIC_RELATIVE ||
                        category.id === 'orcamento_bi' ||
                        category.id === 'descontos_concedidos') && target > 0) && (
                          <>
                            <div className="flex flex-col px-3 text-right">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">
                                Valor Orçado
                              </span>
                              <span className="text-[11px] font-black text-blue-600">
                                {(category.evaluationModel === EvaluationModel.METRIC_ACCUMULATED || category.id === 'orcamento_bi')
                                  ? formatBRL((target / 12) * (activePeriodLabel ? getMonthIndexFromLabel(activePeriodLabel) : 1))
                                  : (category.id === 'descontos_concedidos' ? formatPercentage(target) : formatBRL(target))}
                              </span>
                            </div>
                            <div className="h-8 w-px bg-slate-100 mr-2"></div>
                          </>
                        )}

                      {/* VALOR REALIZADO (INPUT) */}
                      <div className="flex flex-col min-w-[140px] px-2">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">
                          Valor Realizado
                        </span>
                        <div className="relative">
                          {category.id === 'inadimplencia_mes' ? (
                            <div className="px-2 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg border border-blue-100 uppercase tracking-tight flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                              Auto-Sincronizado
                            </div>
                          ) : (
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={isReadOnly}
                              value={formatCurrencyInput(realized)}
                              onChange={(e) => onMetricInput(category.id, parseCurrencyString(e.target.value))}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
                {category.options.map((option) => {
                  const isSelected = effectiveSelectionId === option.id;

                  if (isEditMode) {
                    return (
                      <div key={option.id} className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col space-y-3 hover:border-[#003B71]/30 transition-all shadow-sm">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição da Opção (Faixa)</label>
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => handleUpdateCategory(category.id, {
                              options: category.options.map(opt => opt.id === option.id ? { ...opt, label: e.target.value } : opt)
                            })}
                            className="text-[11px] font-bold p-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#003B71] transition-all"
                          />
                        </div>
                        <div className="flex items-center justify-between bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pontuação Fixa:</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={option.points}
                              onChange={(e) => handleUpdateCategory(category.id, {
                                options: category.options.map(opt => opt.id === option.id ? { ...opt, points: Number(e.target.value) } : opt)
                              })}
                              className="w-20 text-xs font-black p-1.5 bg-white border border-slate-200 rounded-lg text-[#003B71] text-center focus:outline-none focus:ring-2 focus:ring-[#003B71]"
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
                      disabled={isReadOnly || isMetricMode || hasMissingTarget}
                      onClick={() => !isReadOnly && !isMetricMode && !hasMissingTarget && onSelect(category.id, option.id)}
                      className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group ${isSelected
                        ? 'bg-[#003B71] border-[#003B71] text-white shadow-lg scale-[1.01] z-10'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:bg-blue-50/30'
                        } ${isReadOnly && !isSelected ? 'opacity-40 cursor-not-allowed' : ''} ${(isMetricMode || hasMissingTarget) && !isSelected ? 'opacity-50 cursor-default' : ''}`}
                    >
                      {isSelected && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#FDB813]"></div>
                      )}
                      <span className="text-xs font-bold pr-3 leading-tight font-black uppercase tracking-tight">{option.label}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap tracking-widest uppercase transition-colors shadow-sm border border-transparent ${isSelected ? 'bg-white text-[#003B71] border-white/20' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                        }`}>
                        {option.points} <span className="opacity-25 font-black uppercase">pts</span>
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
