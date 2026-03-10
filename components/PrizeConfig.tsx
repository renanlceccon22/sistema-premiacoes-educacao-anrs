import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CustomAward, SchoolUnit, AwardCriterion, CriterionType, ComparisonOperator, Evaluation } from '../types';
import { formatCurrency, formatPercentageMask, parseMaskedString } from '../utils/formatting';
import ConfirmModal from './ConfirmModal';

interface PrizeConfigProps {
  schools: SchoolUnit[];
  customAwards: CustomAward[];
  criteria: AwardCriterion[];
  onSave: (awards: CustomAward[], criteria: AwardCriterion[]) => void;
  isReadOnly?: boolean;
  isSaving?: boolean;
  evaluations?: Evaluation[];
}

const PrizeConfig: React.FC<PrizeConfigProps> = ({
  schools,
  customAwards,
  criteria,
  onSave,
  isReadOnly = false,
  isSaving = false,
  evaluations = [],
}) => {
  const [localAwards, setLocalAwards] = useState<CustomAward[]>(customAwards);
  const [localCriteria, setLocalCriteria] = useState<AwardCriterion[]>(criteria);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);

  const [awardToDelete, setAwardToDelete] = useState<string | null>(null);
  const [criterionToDelete, setCriterionToDelete] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);


  // O estado local é gerenciado internamente e enviado via onSave. 
  // O reset só ocorre se o componente for remontado.


  const handleAddAward = () => {
    const newAward: CustomAward = {
      id: crypto.randomUUID(),
      name: 'Nova Premiação',
      value: 0,
      schoolIds: [],
      evaluationType: 'INDIVIDUAL'
    };
    const updated = [...localAwards, newAward];
    setLocalAwards(updated);
    setEditingAwardId(newAward.id);
  };

  const isCriterionUsed = (id: string) => {
    return evaluations.some(e => {
      const result = e.criterionResults?.[id];
      return result && (result.value !== undefined || result.checked !== undefined || result.selectedOptionId !== undefined);
    });
  };

  const isAwardUsed = (awardId: string) => {
    if (evaluations.some(e => e.wonAwardIds && e.wonAwardIds.includes(awardId))) return true;
    const criteriaIds = localCriteria.filter(c => c.awardId === awardId).map(c => c.id);
    return criteriaIds.some(cid => isCriterionUsed(cid));
  };

  const handleRemoveAward = (id: string) => {
    if (isAwardUsed(id)) {
      setWarningMessage("Não é possível excluir esta premiação, pois ela já está sendo utilizada ou possui histórico em avaliações.");
      return;
    }
    setAwardToDelete(id);
  };

  const executeRemoveAward = () => {
    if (!awardToDelete) return;
    const updatedAwards = localAwards.filter(a => a.id !== awardToDelete);
    const updatedCriteria = localCriteria.filter(c => c.awardId !== awardToDelete);
    setLocalAwards(updatedAwards);
    setLocalCriteria(updatedCriteria);
    setAwardToDelete(null);
    onSave(updatedAwards, updatedCriteria);
  };

  const handleUpdateAward = (awardId: string, updates: Partial<CustomAward>) => {
    const updated = localAwards.map(a => {
      if (a.id === awardId) {
        const newAward = { ...a, ...updates };

        // Se mudou o tipo de abrangência, resetamos operadores incompatíveis nos critérios
        if (updates.evaluationType && updates.evaluationType !== a.evaluationType) {
          const awardCriteriaItems = localCriteria.filter(c => c.awardId === awardId);
          awardCriteriaItems.forEach(c => {
            const isRanking = c.operator?.startsWith('RANKING');
            const needsReset = (updates.evaluationType === 'JOINT' && !isRanking) ||
              (updates.evaluationType === 'INDIVIDUAL' && isRanking);

            if (needsReset) {
              handleUpdateCriterion(c.id, { operator: undefined, threshold1: undefined, threshold2: undefined });
            }
          });
        }

        return newAward;
      }
      return a;
    });
    setLocalAwards(updated);
  };

  // Criteria Handlers
  const handleAddCriterion = (awardId: string) => {
    const newCriterion: AwardCriterion = {
      id: crypto.randomUUID(),
      name: 'Novo Critério',
      awardId: awardId,
      type: 'TOGGLE',
    };
    setLocalCriteria([...localCriteria, newCriterion]);
  };

  const handleRemoveCriterion = (id: string) => {
    if (isCriterionUsed(id)) {
      setWarningMessage("Não é possível excluir este critério, pois ele já está sendo utilizado ou possui histórico em avaliações.");
      return;
    }
    setCriterionToDelete(id);
  };

  const executeRemoveCriterion = () => {
    if (!criterionToDelete) return;
    const updated = localCriteria.filter(c => c.id !== criterionToDelete);
    setLocalCriteria(updated);
    setCriterionToDelete(null);
    onSave(localAwards, updated);
  };

  const handleUpdateCriterion = (id: string, updates: Partial<AwardCriterion>) => {
    setLocalCriteria(localCriteria.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleAddScoringRange = (criterionId: string) => {
    const criterion = localCriteria.find(c => c.id === criterionId);
    if (!criterion) return;

    const newRange = {
      id: crypto.randomUUID(),
      operator: 'GREATER_EQUAL' as ComparisonOperator,
      threshold1: 0,
      points: 0
    };

    const updated = localCriteria.map(c =>
      c.id === criterionId
        ? { ...c, scoringRanges: [...(c.scoringRanges || []), newRange] }
        : c
    );
    setLocalCriteria(updated);
  };

  const handleUpdateScoringRange = (criterionId: string, rangeId: string, updates: any) => {
    const updated = localCriteria.map(c => {
      if (c.id === criterionId) {
        const updatedRanges = (c.scoringRanges || []).map(r =>
          r.id === rangeId ? { ...r, ...updates } : r
        );
        return { ...c, scoringRanges: updatedRanges };
      }
      return c;
    });
    setLocalCriteria(updated);
  };

  const handleRemoveScoringRange = (criterionId: string, rangeId: string) => {
    const updated = localCriteria.map(c => {
      if (c.id === criterionId) {
        return { ...c, scoringRanges: (c.scoringRanges || []).filter(r => r.id !== rangeId) };
      }
      return c;
    });
    setLocalCriteria(updated);
  };

  const handleAddFinancialRange = (criterionId: string) => {
    const criterion = localCriteria.find(c => c.id === criterionId);
    if (!criterion) return;

    const newRange = {
      id: crypto.randomUUID(),
      operator: 'BETWEEN' as ComparisonOperator,
      threshold1: 0,
      value: 0
    };

    const updated = localCriteria.map(c =>
      c.id === criterionId
        ? { ...c, financialRanges: [...(c.financialRanges || []), newRange] }
        : c
    );
    setLocalCriteria(updated);
  };

  const handleUpdateFinancialRange = (criterionId: string, rangeId: string, updates: any) => {
    const updated = localCriteria.map(c => {
      if (c.id === criterionId) {
        const updatedRanges = (c.financialRanges || []).map(r =>
          r.id === rangeId ? { ...r, ...updates } : r
        );
        return { ...c, financialRanges: updatedRanges };
      }
      return c;
    });
    setLocalCriteria(updated);
  };

  const handleRemoveFinancialRange = (criterionId: string, rangeId: string) => {
    const updated = localCriteria.map(c => {
      if (c.id === criterionId) {
        return { ...c, financialRanges: (c.financialRanges || []).filter(r => r.id !== rangeId) };
      }
      return c;
    });
    setLocalCriteria(updated);
  };

  const handleAddCriterionOption = (criterionId: string) => {
    const criterion = localCriteria.find(c => c.id === criterionId);
    if (!criterion) return;

    const newOption = {
      id: crypto.randomUUID(),
      label: 'Nova Opção',
      points: 0
    };

    const updated = localCriteria.map(c =>
      c.id === criterionId
        ? { ...c, options: [...(c.options || []), newOption] }
        : c
    );
    setLocalCriteria(updated);
  };

  const handleUpdateCriterionOption = (criterionId: string, optionId: string, updates: any) => {
    const updated = localCriteria.map(c => {
      if (c.id === criterionId) {
        const updatedOptions = (c.options || []).map(o =>
          o.id === optionId ? { ...o, ...updates } : o
        );
        return { ...c, options: updatedOptions };
      }
      return c;
    });
    setLocalCriteria(updated);
  };

  const handleRemoveCriterionOption = (criterionId: string, optionId: string) => {
    const updated = localCriteria.map(c => {
      if (c.id === criterionId) {
        return { ...c, options: (c.options || []).filter(o => o.id !== optionId) };
      }
      return c;
    });
    setLocalCriteria(updated);
  };

  const handleSave = () => {
    onSave(localAwards, localCriteria);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleFinishEditing = () => {
    handleSave();
    setEditingAwardId(null);
  };

  const toggleSchool = (awardId: string, schoolId: string) => {
    const award = localAwards.find(a => a.id === awardId);
    if (!award) return;

    let newSchoolIds = [...award.schoolIds];
    if (newSchoolIds.includes(schoolId)) {
      newSchoolIds = newSchoolIds.filter(id => id !== schoolId);
    } else {
      newSchoolIds.push(schoolId);
    }
    handleUpdateAward(awardId, { schoolIds: newSchoolIds });
  };

  const formatNumber = (val: number) => {
    return val.toLocaleString('pt-BR');
  };

  const handleMinScoreChange = (id: string, val: string) => {
    const numericValue = Number(val.replace(/\D/g, '')) || 0;
    handleUpdateAward(id, { minScore: numericValue });
  };

  const handleValueChange = (id: string, rawValue: string) => {
    const numericValue = parseMaskedString(rawValue);
    handleUpdateAward(id, { value: numericValue });
  };

  const operators = [
    { value: 'GREATER_THAN', label: 'Acima de' },
    { value: 'LESS_THAN', label: 'Abaixo de' },
    { value: 'GREATER_EQUAL', label: 'Maior ou igual a' },
    { value: 'LESS_EQUAL', label: 'Menor ou igual a' },
    { value: 'EQUAL', label: 'Igual a' },
    { value: 'BETWEEN', label: 'Entre valores' },
    { value: 'RANKING_TOP', label: 'Melhores Rankings (Maiores Valores)' },
    { value: 'RANKING_BOTTOM', label: 'Melhores Rankings (Menores Valores)' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 relative overflow-hidden transition-all duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center">
          <span className="w-2 h-8 bg-[#003B71] rounded-full mr-3"></span>
          <div>
            <h2 className="text-xl font-bold text-[#003B71] uppercase text-xs lg:text-xl">CONFIGURAÇÃO DE PREMIAÇÕES E CRITÉRIOS</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Defina as premiações e como elas serão avaliadas</p>
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-3">
            {showSuccess && (
              <span className="text-green-600 font-bold text-sm animate-pulse flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Salvo com sucesso!
              </span>
            )}
            <button
              onClick={handleAddAward}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-black text-xs hover:bg-green-700 transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Premiação
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`bg-[#003B71] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#002a51] shadow-lg active:scale-95 transition-all flex items-center gap-2 uppercase text-xs tracking-widest ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gravando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {localAwards.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhuma premiação cadastrada</p>
            <button
              onClick={handleAddAward}
              className="mt-4 text-[#003B71] font-black text-xs uppercase underline"
            >
              Clique para adicionar a primeira
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {localAwards.map((award) => (
              <div key={award.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#003B71] opacity-10 group-hover:opacity-100 transition-opacity"></div>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-[#003B71] leading-tight">{award.name}</h3>
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg tracking-widest shrink-0 ${award.evaluationType === 'JOINT' ? 'bg-[#FDB813]/20 text-amber-700' : 'bg-[#003B71]/10 text-[#003B71]'}`}>
                      {award.evaluationType === 'JOINT' ? 'Conjunta' : 'Individual'}
                    </span>
                  </div>
                  {(() => {
                    const awardRankingCriteria = localCriteria.filter(c => c.awardId === award.id && (c.operator || '').startsWith('RANKING') && c.rankingPrizes && c.rankingPrizes.length > 0);
                    if (award.value === 0 && awardRankingCriteria.length > 0) {
                      const prizes = awardRankingCriteria[0].rankingPrizes!;
                      return (
                        <div className="mb-5">
                          <div className="flex flex-wrap gap-1.5">
                            {prizes.map((v, i) => (
                              <span key={i} className="text-[10px] font-black text-[#003B71] bg-[#FDB813]/20 px-2 py-1 rounded-lg border border-[#FDB813]/30">
                                {i + 1}º {v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            ))}
                          </div>
                          <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Valores por colocação</p>
                        </div>
                      );
                    }
                    return (
                      <p className="text-xl font-black text-[#FDB813] mb-5">
                        {award.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    );
                  })()}
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {award.schoolIds.length > 0 ? (
                      <span className="text-[#003B71] font-black">{award.schoolIds.length} {(award.schoolIds.length === 1) ? 'Unidade' : 'Unidades'}</span>
                    ) : (
                      <span className="text-red-500 font-black animate-pulse">0 Unidades selecionadas!</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-slate-500">{localCriteria.filter(c => c.awardId === award.id).length} Critérios</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end gap-2">
                  {!isReadOnly && (
                    <button
                      onClick={() => handleRemoveAward(award.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Remover Premiação"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setEditingAwardId(award.id)}
                    className="bg-slate-50 text-[#003B71] hover:bg-[#003B71] hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
                  >
                    {isReadOnly ? 'Visualizar' : 'Editar Regras'}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingAwardId && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-[85vw] sm:w-[60vw] max-w-4xl max-h-[75vh] h-[75vh] rounded-[20px] sm:rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col">
            {(() => {
              const award = localAwards.find(a => a.id === editingAwardId);
              if (!award) return null;

              return (
                <div className="flex flex-col h-full overflow-hidden">
                  {/* HEADER DO MODAL */}
                  <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#003B71] rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-[#003B71] uppercase tracking-tight">
                          Configurando Prêmio
                        </h3>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                          Editando regras para: {award.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingAwardId(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-7">
                      {/* LADO ESQUERDO: CONFIGURAÇÃO BÁSICA */}
                      <div className="space-y-6 border-r border-slate-50 pr-0 xl:pr-7">
                        <div className="flex justify-between items-center hide-when-empty">
                          <h3 className="text-base font-black text-[#003B71] uppercase tracking-tighter">Dados Gerais</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[8px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Nome da Premiação</label>
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={award.name}
                              onChange={(e) => handleUpdateAward(award.id, { name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all text-xs"
                              placeholder="Ex: Meta de Gestão"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Valor Financeiro</label>
                            <div className="relative group/val">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold opacity-30">R$</span>
                              <input
                                type="text"
                                disabled={isReadOnly ||
                                  (award.evaluationType === 'JOINT' && localCriteria.some(c => c.awardId === award.id && (c.operator || '').startsWith('RANKING'))) ||
                                  (!award.scoringMode && localCriteria.some(c => c.awardId === award.id && c.financialRanges && c.financialRanges.length > 0))}
                                inputMode="numeric"
                                value={award.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                onChange={(e) => handleValueChange(award.id, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-3 py-2 font-black text-[#003B71] focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all text-xs disabled:opacity-50"
                              />
                              {(award.evaluationType === 'JOINT' && localCriteria.some(c => c.awardId === award.id && (c.operator || '').startsWith('RANKING'))) && (
                                <div className="absolute inset-0 bg-transparent cursor-not-allowed" title="O valor será configurado em prêmios específicos nas regras de Ranking" />
                              )}
                              {(!award.scoringMode && localCriteria.some(c => c.awardId === award.id && c.financialRanges && c.financialRanges.length > 0)) && (
                                <div className="absolute inset-0 bg-transparent cursor-not-allowed" title="O valor será determinado pelas múltiplas faixas de valor financeiro configuradas nos critérios" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tipo de Avaliação: Individual vs Conjunta */}
                        <div>
                          <label className="block text-[8px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Tipo de Abrangência</label>
                          <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                            <button
                              onClick={() => handleUpdateAward(award.id, { evaluationType: 'INDIVIDUAL' })}
                              className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${award.evaluationType !== 'JOINT' ? 'bg-[#003B71] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              Individual (Por Unidade)
                            </button>
                            <button
                              onClick={() => handleUpdateAward(award.id, { evaluationType: 'JOINT' })}
                              className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${award.evaluationType === 'JOINT' ? 'bg-[#FDB813] text-[#003B71] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              Conjunta (Ranking Geral)
                            </button>
                          </div>
                          {award.evaluationType === 'JOINT' && (
                            <p className="mt-1.5 text-[7px] text-amber-600 font-bold uppercase tracking-tight bg-amber-50 p-1.5 rounded border border-amber-100 italic">
                              * Use apenas para prêmios de ranking (Ex: Top 3 melhores ou piores).
                            </p>
                          )}
                        </div>

                        {/* Modo Pontuação */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-center mb-3">
                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Modo Pontuação</label>
                            <button
                              onClick={() => handleUpdateAward(award.id, { scoringMode: !award.scoringMode })}
                              className={`text-[7px] px-2 py-0.5 rounded-full font-black tracking-widest transition-all ${award.scoringMode ? 'bg-green-100 text-green-700 shadow-sm' : 'bg-slate-200 text-slate-500'}`}
                            >
                              {award.scoringMode ? 'ATIVADO' : 'DESATIVADO'}
                            </button>
                          </div>
                          {award.scoringMode && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                              <label className="block text-[7px] font-black uppercase text-slate-400 mb-1 tracking-widest">Pontuação Mínima para Ganhar</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatNumber(award.minScore || 0)}
                                  onChange={(e) => handleMinScoreChange(award.id, e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black text-[#003B71] focus:ring-2 focus:ring-[#FDB813] outline-none"
                                  placeholder="Ex: 500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-300">PTS</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Seleção de Unidades */}
                        <div>
                          <label className="block text-[8px] font-black uppercase text-slate-400 mb-2 tracking-widest flex justify-between">
                            Unidades Avaliadas
                            <span className="text-[#003B71] font-black">{award.schoolIds.length} UNIDADES</span>
                          </label>
                          <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-inner">
                            <label className="block text-[8px] font-black uppercase text-[#003B71] mb-3 tracking-widest flex justify-between items-center">
                              Selecione as Unidades que participam deste prêmio
                              {award.schoolIds.length === 0 && <span className="text-[7px] bg-red-100 text-red-600 px-2 py-0.5 rounded animate-pulse">Obrigatorio selecionar!</span>}
                            </label>
                            <div className="max-h-[180px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-2 custom-scrollbar pr-2">
                              {schools.map(school => (
                                <label key={school.id} className={`flex items-center p-2 rounded-xl cursor-pointer transition-all border-2 ${award.schoolIds.includes(school.id) ? 'bg-blue-50/50 border-[#003B71] shadow-sm' : 'bg-white border-slate-50 hover:border-slate-200'}`}>
                                  <input
                                    type="checkbox"
                                    disabled={isReadOnly}
                                    className="sr-only"
                                    checked={award.schoolIds.includes(school.id)}
                                    onChange={() => toggleSchool(award.id, school.id)}
                                  />
                                  <div className={`w-4 h-4 rounded-lg border-2 flex items-center justify-center mr-2.5 transition-all ${award.schoolIds.includes(school.id) ? 'bg-[#003B71] border-[#003B71] scale-110 shadow-lg shadow-blue-900/20' : 'bg-white border-slate-200'}`}>
                                    {award.schoolIds.includes(school.id) && (
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className={`text-[9px] font-black uppercase tracking-tight ${award.schoolIds.includes(school.id) ? 'text-[#003B71]' : 'text-slate-400'}`}>
                                    {school.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* LADO DIREITO: CONFIGURAÇÃO DE CRITÉRIOS */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-base font-black text-[#FDB813] uppercase tracking-tighter">Critérios de Avaliação</h3>
                          {!isReadOnly && (
                            <button
                              onClick={() => handleAddCriterion(award.id)}
                              className="bg-[#FDB813] text-[#003B71] px-3 py-1.5 rounded-lg font-black text-[8px] hover:bg-[#e5a611] transition-all flex items-center gap-1.5 uppercase tracking-widest shadow-sm"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Critério
                            </button>
                          )}
                        </div>

                        <div className="space-y-3 pr-1">
                          {localCriteria.filter(c => c.awardId === award.id).map((criterion) => {
                            const selectedSchools = schools.filter(s => award.schoolIds.includes(s.id));
                            const allSelectedHaveBudget = selectedSchools.length > 0 && selectedSchools.every(s => (s.annualBudget || 0) > 0);

                            return (
                              <div key={criterion.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 relative group/criterion">
                                {!isReadOnly && (
                                  <button
                                    onClick={() => handleRemoveCriterion(criterion.id)}
                                    className="absolute -top-1.5 -right-1.5 bg-white border border-slate-100 p-1 rounded-full text-slate-300 hover:text-red-500 shadow-sm opacity-0 group-hover/criterion:opacity-100 transition-all"
                                  >
                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}

                                <div className="flex flex-col md:flex-row gap-3 items-start">
                                  <div className="flex-[4] w-full">
                                    <label className="block text-[7px] font-black uppercase text-slate-400 mb-1 tracking-widest">Nome do Critério</label>
                                    <input
                                      type="text"
                                      disabled={isReadOnly}
                                      value={criterion.name}
                                      onChange={(e) => handleUpdateCriterion(criterion.id, { name: e.target.value })}
                                      className="w-full bg-white border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FDB813]"
                                      placeholder="Frequência..."
                                    />
                                  </div>
                                  <div className="flex-[6] w-full">
                                    <label className="block text-[7px] font-black uppercase text-slate-400 mb-1 tracking-widest">Tipo de Entrada</label>
                                    <div className="flex gap-1 p-0.5 bg-white border border-slate-100 rounded-lg">
                                      <button
                                        onClick={() => handleUpdateCriterion(criterion.id, { type: 'TOGGLE' })}
                                        className={`flex-1 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${criterion.type === 'TOGGLE' ? 'bg-[#003B71] text-white' : 'text-slate-400'}`}
                                      >
                                        Checkbox
                                      </button>
                                      <button
                                        onClick={() => handleUpdateCriterion(criterion.id, { type: 'VALUE', valueFormat: 'NUMBER' })}
                                        className={`flex-1 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${criterion.type === 'VALUE' && criterion.valueFormat !== 'PERCENTAGE' ? 'bg-[#003B71] text-white' : 'text-slate-400'}`}
                                      >
                                        Valor
                                      </button>
                                      <button
                                        onClick={() => handleUpdateCriterion(criterion.id, { type: 'VALUE', valueFormat: 'PERCENTAGE' })}
                                        className={`flex-1 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${criterion.type === 'VALUE' && criterion.valueFormat === 'PERCENTAGE' ? 'bg-[#003B71] text-white' : 'text-slate-400'}`}
                                      >
                                        Porcentagem (%)
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Toggle Exibir no Relatório */}
                                <div className="flex items-center gap-2 px-1">
                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative">
                                      <input
                                        type="checkbox"
                                        disabled={isReadOnly}
                                        checked={criterion.showInReport || false}
                                        onChange={(e) => handleUpdateCriterion(criterion.id, { showInReport: e.target.checked })}
                                        className="sr-only"
                                      />
                                      <div className={`w-8 h-4 rounded-full transition-all duration-300 ${criterion.showInReport ? 'bg-[#003B71]' : 'bg-slate-200'}`}></div>
                                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 transform ${criterion.showInReport ? 'translate-x-4 shadow-sm' : ''}`}></div>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${criterion.showInReport ? 'text-[#003B71]' : 'text-slate-400'}`}>
                                      Exibir no Relatório
                                    </span>
                                  </label>
                                </div>

                                {criterion.type === 'VALUE' && (
                                  <div className={`flex flex-col gap-2.5 px-1 p-2.5 rounded-xl border opacity-100 transition-all ${allSelectedHaveBudget ? 'bg-white/50 border-slate-100/50' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}>
                                    <div className="flex items-center justify-between">
                                      <label className={`flex items-center gap-2 group ${allSelectedHaveBudget ? 'cursor-pointer' : 'cursor-not-allowed'}`} title={!allSelectedHaveBudget ? "Todas as unidades selecionadas precisam ter orçamento anual configurado." : ""}>
                                        <div className="relative">
                                          <input
                                            type="checkbox"
                                            disabled={!allSelectedHaveBudget}
                                            checked={(criterion.useAccumulatedBudget && allSelectedHaveBudget) || false}
                                            onChange={(e) => {
                                              if (!allSelectedHaveBudget) return;
                                              handleUpdateCriterion(criterion.id, {
                                                useAccumulatedBudget: e.target.checked,
                                                budgetEvaluationType: e.target.checked ? (criterion.budgetEvaluationType || 'ACCUMULATED') : undefined
                                              });
                                            }}
                                            className="sr-only"
                                          />
                                          <div className={`w-8 h-4 rounded-full transition-all duration-300 ${(criterion.useAccumulatedBudget && allSelectedHaveBudget) ? 'bg-[#003B71]' : 'bg-slate-200'} ${!allSelectedHaveBudget ? 'opacity-50' : ''}`}></div>
                                          <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 transform ${(criterion.useAccumulatedBudget && allSelectedHaveBudget) ? 'translate-x-4 shadow-sm' : ''}`}></div>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${(criterion.useAccumulatedBudget && allSelectedHaveBudget) ? 'text-[#003B71]' : 'text-slate-400'}`}>
                                          Avaliar Orçamento Anual {allSelectedHaveBudget ? '' : '(Indisponível)'}
                                        </span>
                                      </label>

                                      {(criterion.useAccumulatedBudget && allSelectedHaveBudget) && (
                                        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                                          <button
                                            onClick={() => handleUpdateCriterion(criterion.id, { budgetEvaluationType: 'MONTHLY' })}
                                            className={`px-3 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${criterion.budgetEvaluationType === 'MONTHLY' ? 'bg-[#003B71] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                          >
                                            Mensal
                                          </button>
                                          <button
                                            onClick={() => handleUpdateCriterion(criterion.id, { budgetEvaluationType: 'ACCUMULATED' })}
                                            className={`px-3 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all ${criterion.budgetEvaluationType !== 'MONTHLY' ? 'bg-[#003B71] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                          >
                                            Acumulado
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {(criterion.useAccumulatedBudget && allSelectedHaveBudget) && (
                                      <p className="text-[7px] text-slate-400 font-bold uppercase tracking-tight leading-tight bg-blue-50/50 p-2 rounded border border-blue-100/50 italic animate-in slide-in-from-top-1 duration-300">
                                        * {criterion.budgetEvaluationType === 'MONTHLY'
                                          ? "Será considerado o valor fixo (Orçamento / 12) para cada mês avaliado."
                                          : "Será considerado o valor acumulado (Orçamento / 12) × Mês Atual para cada mês avaliado."}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {criterion.type === 'TOGGLE' && award.scoringMode && (
                                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex justify-between items-center">
                                      <label className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Opções de Avaliação</label>
                                      <button
                                        onClick={() => handleAddCriterionOption(criterion.id)}
                                        className="text-[7px] bg-[#003B71] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest hover:bg-[#002a51]"
                                      >
                                        + Avaliação
                                      </button>
                                    </div>

                                    <div className="space-y-1.5">
                                      {(criterion.options || []).map((opt) => (
                                        <div key={opt.id} className="grid grid-cols-12 gap-1.5 bg-white p-1.5 rounded-lg border border-slate-100 relative group/opt items-center shadow-sm">
                                          <div className="col-span-8">
                                            <input
                                              type="text"
                                              value={opt.label}
                                              onChange={(e) => handleUpdateCriterionOption(criterion.id, opt.id, { label: e.target.value })}
                                              className="w-full text-[8px] font-bold border-none bg-slate-50 rounded px-1.5 py-1"
                                              placeholder="Ex: Bateu meta"
                                            />
                                          </div>
                                          <div className="col-span-3 flex items-center">
                                            <input
                                              type="number"
                                              value={opt.points}
                                              onChange={(e) => handleUpdateCriterionOption(criterion.id, opt.id, { points: Number(e.target.value) })}
                                              className="w-full text-[8px] font-black text-[#003B71] border-none bg-blue-50 rounded px-1 py-1 text-center"
                                              placeholder="Pts"
                                            />
                                          </div>
                                          <div className="col-span-1 flex justify-end">
                                            <button
                                              onClick={() => handleRemoveCriterionOption(criterion.id, opt.id)}
                                              className="text-red-400 hover:text-red-700 p-0.5 rounded transition-all opacity-0 group-hover/opt:opacity-100"
                                            >
                                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                      {(criterion.options || []).length === 0 && (
                                        <div className="text-center py-2 px-3 bg-white/50 border border-dotted border-slate-200 rounded-lg">
                                          <p className="text-[7px] text-slate-300 italic">Nenhuma opção definida. Adicione opções para pontuar este critério.</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {criterion.type === 'VALUE' && !award.scoringMode && (
                                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    {criterion.useAccumulatedBudget ? (
                                      <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-center gap-3">
                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                          </svg>
                                        </div>
                                        <p className="text-[9px] font-bold text-blue-700 uppercase leading-relaxed">
                                          Meta Dinâmica Ativada: <span className="font-black underline">(Orçamento / 12) × Mês Atual</span>.
                                          Configure o valor anual nas metas da unidade.
                                        </p>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex justify-between items-center mb-2">
                                          <div className="flex flex-col">
                                            <label className="text-[7px] font-black uppercase text-slate-400 tracking-widest">
                                              {(criterion.financialRanges && criterion.financialRanges.length > 0) ? 'Regras Dinâmicas de Valor' : 'Regra Principal'}
                                            </label>
                                          </div>
                                          {!(criterion.operator || '').startsWith('RANKING') && (
                                            <button
                                              onClick={() => {
                                                if (criterion.financialRanges && criterion.financialRanges.length > 0) {
                                                  handleUpdateCriterion(criterion.id, { financialRanges: [] });
                                                } else {
                                                  handleAddFinancialRange(criterion.id);
                                                }
                                              }}
                                              className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest transition-all ${(criterion.financialRanges && criterion.financialRanges.length > 0) ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                            >
                                              {(criterion.financialRanges && criterion.financialRanges.length > 0) ? 'Remover Valores Dinâmicos' : '+ Valor Financeiro por Regra'}
                                            </button>
                                          )}
                                        </div>

                                        {(criterion.financialRanges && criterion.financialRanges.length > 0) ? (
                                          <div className="space-y-2">
                                            {(criterion.financialRanges || []).map((range) => (
                                              <div key={range.id} className="grid grid-cols-12 gap-1.5 bg-white p-1.5 rounded-lg border border-slate-100 relative group/range items-center">
                                                <div className="col-span-3">
                                                  <select
                                                    value={range.operator}
                                                    onChange={(e) => handleUpdateFinancialRange(criterion.id, range.id, { operator: e.target.value as ComparisonOperator })}
                                                    className="w-full text-[8px] font-bold border-none bg-slate-50 rounded px-1 py-0.5"
                                                  >
                                                    {operators.filter(op => !op.value.startsWith('RANKING')).map(op => (
                                                      <option key={op.value} value={op.value}>{op.label}</option>
                                                    ))}
                                                  </select>
                                                </div>
                                                <div className="col-span-2 relative">
                                                  <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={range.threshold1 !== undefined ? ((criterion.valueFormat === 'PERCENTAGE' || criterion.useAccumulatedBudget) ? formatPercentageMask(range.threshold1) : formatCurrency(range.threshold1)) : ''}
                                                    onChange={(e) => handleUpdateFinancialRange(criterion.id, range.id, { threshold1: parseMaskedString(e.target.value) })}
                                                    className="w-full text-[8px] font-bold border-none bg-slate-50 rounded px-1 py-0.5"
                                                    placeholder="Ref"
                                                  />
                                                </div>
                                                <div className="col-span-2">
                                                  {range.operator === 'BETWEEN' ? (
                                                    <div className="relative">
                                                      <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={range.threshold2 !== undefined ? ((criterion.valueFormat === 'PERCENTAGE' || criterion.useAccumulatedBudget) ? formatPercentageMask(range.threshold2) : formatCurrency(range.threshold2)) : ''}
                                                        onChange={(e) => handleUpdateFinancialRange(criterion.id, range.id, { threshold2: parseMaskedString(e.target.value) })}
                                                        className="w-full text-[8px] font-bold border-none bg-slate-50 rounded px-1 py-0.5"
                                                        placeholder="Max"
                                                      />
                                                    </div>
                                                  ) : (
                                                    <div className="w-full h-full bg-slate-100 rounded opacity-20"></div>
                                                  )}
                                                </div>
                                                <div className="col-span-5 flex items-center gap-1">
                                                  <div className="relative flex-1">
                                                    <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      value={formatCurrency(range.value)}
                                                      onChange={(e) => handleUpdateFinancialRange(criterion.id, range.id, { value: parseMaskedString(e.target.value) })}
                                                      className="w-full text-[8px] font-black text-[#003B71] border-none bg-green-50 rounded px-2 py-0.5 focus:outline-none"
                                                    />
                                                  </div>
                                                  <button
                                                    onClick={() => handleRemoveFinancialRange(criterion.id, range.id)}
                                                    className="text-red-400 hover:text-red-600 opacity-0 group-hover/range:opacity-100 transition-all font-bold p-0.5"
                                                  >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                            <button
                                              onClick={() => handleAddFinancialRange(criterion.id)}
                                              className="w-full mt-1 border border-dashed border-slate-200 text-slate-400 hover:border-[#003B71] hover:text-[#003B71] text-[7px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-all"
                                            >
                                              + Adicionar Faixa de Valor
                                            </button>
                                            <p className="text-[7px] text-slate-400 italic mt-1 leading-tight text-center">
                                              * Quando faixas de valor estão ativas, elas ignoram o valor geral da premiação.
                                            </p>
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-[7px] font-black uppercase text-slate-400 mb-1 tracking-widest">Regra Base</label>
                                              <select
                                                disabled={isReadOnly}
                                                value={criterion.operator}
                                                onChange={(e) => handleUpdateCriterion(criterion.id, { operator: e.target.value as ComparisonOperator })}
                                                className="w-full bg-white border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#003B71]"
                                              >
                                                <option value="">Comparar...</option>
                                                {operators
                                                  .filter(op => {
                                                    if (award.evaluationType === 'JOINT') {
                                                      return op.value.startsWith('RANKING');
                                                    } else {
                                                      return !op.value.startsWith('RANKING');
                                                    }
                                                  })
                                                  .map(op => (
                                                    <option key={op.value} value={op.value}>{op.label}</option>
                                                  ))}
                                              </select>
                                            </div>
                                            <div className="flex gap-2">
                                              <div className="flex-1">
                                                <label className="block text-[7px] font-black uppercase text-slate-400 mb-1 tracking-widest">
                                                  {criterion.operator === 'BETWEEN' ? 'Min' :
                                                    (criterion.operator || '').startsWith('RANKING') ? 'Top X' : 'Ref'}
                                                </label>
                                                <div className="relative">
                                                  <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    disabled={isReadOnly}
                                                    value={criterion.threshold1 !== undefined ? ((criterion.operator || '').startsWith('RANKING') ? criterion.threshold1.toString() : (criterion.valueFormat === 'PERCENTAGE' ? formatPercentageMask(criterion.threshold1) : formatCurrency(criterion.threshold1))) : ''}
                                                    onChange={(e) => handleUpdateCriterion(criterion.id, { threshold1: (criterion.operator || '').startsWith('RANKING') ? (parseInt(e.target.value.replace(/\D/g, '')) || 0) : parseMaskedString(e.target.value) })}
                                                    className={`w-full bg-white border border-slate-100 rounded-lg ${(criterion.valueFormat === 'PERCENTAGE' && !(criterion.operator || '').startsWith('RANKING')) ? 'pl-2 pr-6' : 'px-2'} py-1.5 text-[10px] font-bold text-slate-800`}
                                                    placeholder={(criterion.operator || '').startsWith('RANKING') ? 'Ex: 3' : (criterion.valueFormat === 'PERCENTAGE' ? '0,00' : 'R$ 0,00')}
                                                  />
                                                  {(criterion.valueFormat === 'PERCENTAGE' && !(criterion.operator || '').startsWith('RANKING')) && (
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 pointer-events-none">%</span>
                                                  )}
                                                </div>
                                              </div>
                                              {criterion.operator === 'BETWEEN' && (
                                                <div className="flex-1">
                                                  <label className="block text-[7px] font-black uppercase text-slate-400 mb-1 tracking-widest">Max</label>
                                                  <div className="relative">
                                                    <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      disabled={isReadOnly}
                                                      value={criterion.threshold2 !== undefined ? (criterion.valueFormat === 'PERCENTAGE' ? formatPercentageMask(criterion.threshold2) : formatCurrency(criterion.threshold2)) : ''}
                                                      onChange={(e) => handleUpdateCriterion(criterion.id, { threshold2: parseMaskedString(e.target.value) })}
                                                      className={`w-full bg-white border border-slate-100 rounded-lg ${criterion.valueFormat === 'PERCENTAGE' ? 'pl-2 pr-6' : 'px-2'} py-1.5 text-[10px] font-bold text-slate-800`}
                                                      placeholder={criterion.valueFormat === 'PERCENTAGE' ? '0,00' : 'R$ 0,00'}
                                                    />
                                                    {criterion.valueFormat === 'PERCENTAGE' && (
                                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 pointer-events-none">%</span>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {((criterion.operator || '').startsWith('RANKING')) && criterion.threshold1 && criterion.threshold1 > 0 ? (
                                          <div className="mt-3 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                            <label className="block text-[7px] font-black uppercase text-slate-400 tracking-widest mb-2">Premiação Financeira por Colocação</label>
                                            <div className="space-y-1.5 custom-scrollbar max-h-48 overflow-y-auto pr-1">
                                              {Array.from({ length: criterion.threshold1 }).map((_, rankIdx) => {
                                                const val = criterion.rankingPrizes?.[rankIdx] || 0;
                                                return (
                                                  <div key={rankIdx} className="flex gap-2 items-center bg-white p-1 rounded-lg border border-slate-100 shadow-sm">
                                                    <span className="text-[10px] font-black text-[#003B71] w-12 text-center bg-slate-50 py-1 rounded">{rankIdx + 1}º</span>
                                                    <div className="relative flex-1">
                                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold opacity-40">R$</span>
                                                      <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        disabled={isReadOnly}
                                                        value={formatCurrency(val)}
                                                        onChange={(e) => {
                                                          const newPrizes = [...(criterion.rankingPrizes || [])];
                                                          newPrizes[rankIdx] = parseMaskedString(e.target.value);
                                                          handleUpdateCriterion(criterion.id, { rankingPrizes: newPrizes });
                                                        }}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-md pl-6 pr-2 py-1 text-[9px] font-bold text-slate-800 focus:outline-none focus:border-[#003B71]"
                                                      />
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                )}

                                {criterion.type === 'VALUE' && award.scoringMode && (
                                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex justify-between items-center">
                                      <div className="flex flex-col">
                                        <label className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Regras de Pontuação</label>
                                        {criterion.useAccumulatedBudget && (
                                          <span className="text-[6px] text-[#003B71] font-black uppercase tracking-tighter bg-blue-50 px-1 rounded border border-blue-100/50 mt-0.5 animate-pulse">
                                            * % do Orçamento
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => handleAddScoringRange(criterion.id)}
                                        className="text-[7px] bg-[#003B71] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest hover:bg-[#002a51]"
                                      >
                                        + Pontuação
                                      </button>
                                    </div>

                                    <div className="space-y-2">
                                      {(criterion.scoringRanges || []).map((range) => (
                                        <div key={range.id} className="grid grid-cols-12 gap-1.5 bg-white p-1.5 rounded-lg border border-slate-100 relative group/range items-center">
                                          <div className="col-span-4">
                                            <select
                                              value={range.operator}
                                              onChange={(e) => handleUpdateScoringRange(criterion.id, range.id, { operator: e.target.value })}
                                              className="w-full text-[8px] font-bold border-none bg-slate-50 rounded px-1 py-0.5"
                                            >
                                              {operators.filter(op => !op.value.startsWith('RANKING')).map(op => (
                                                <option key={op.value} value={op.value}>{op.label}</option>
                                              ))}
                                            </select>
                                          </div>
                                          <div className="col-span-2 relative">
                                            <input
                                              type="text"
                                              inputMode="numeric"
                                              value={range.threshold1 !== undefined ? ((criterion.valueFormat === 'PERCENTAGE' || criterion.useAccumulatedBudget) ? formatPercentageMask(range.threshold1) : formatCurrency(range.threshold1)) : ''}
                                              onChange={(e) => handleUpdateScoringRange(criterion.id, range.id, { threshold1: parseMaskedString(e.target.value) })}
                                              className="w-full text-[8px] font-bold border-none bg-slate-50 rounded px-1 py-0.5"
                                              placeholder="Ref"
                                            />
                                          </div>
                                          <div className="col-span-2">
                                            {range.operator === 'BETWEEN' ? (
                                              <div className="relative">
                                                <input
                                                  type="text"
                                                  inputMode="numeric"
                                                  value={range.threshold2 !== undefined ? ((criterion.valueFormat === 'PERCENTAGE' || criterion.useAccumulatedBudget) ? formatPercentageMask(range.threshold2) : formatCurrency(range.threshold2)) : ''}
                                                  onChange={(e) => handleUpdateScoringRange(criterion.id, range.id, { threshold2: parseMaskedString(e.target.value) })}
                                                  className="w-full text-[8px] font-bold border-none bg-slate-50 rounded px-1 py-0.5"
                                                  placeholder="Max"
                                                />
                                              </div>
                                            ) : (
                                              <div className="w-full h-full bg-slate-100 rounded opacity-20"></div>
                                            )}
                                          </div>
                                          <div className="col-span-4 flex items-center gap-1">
                                            <input
                                              type="number"
                                              value={range.points}
                                              onChange={(e) => handleUpdateScoringRange(criterion.id, range.id, { points: Number(e.target.value) })}
                                              className="w-full text-[8px] font-black text-[#003B71] border-none bg-blue-50 rounded px-1 py-0.5 text-right"
                                              placeholder="Pts"
                                            />
                                            <button
                                              onClick={() => handleRemoveScoringRange(criterion.id, range.id)}
                                              className="text-red-400 hover:text-red-600 opacity-0 group-hover/range:opacity-100 transition-all font-bold"
                                            >
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                      {(criterion.scoringRanges || []).length === 0 && (
                                        <p className="text-[8px] text-slate-300 italic text-center py-2">Nenhuma regra de pontos definida.</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {localCriteria.filter(c => c.awardId === award.id).length === 0 && (
                            <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                                Nenhum critério<br />definido para este prêmio.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-50 flex gap-3 bg-slate-50/30 mt-auto">
                    <button
                      onClick={() => setEditingAwardId(null)}
                      className="flex-1 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all border border-slate-200 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleFinishEditing}
                      className="flex-[2] bg-green-600 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-900/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Gravar e Concluir
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )
      }

      {/* Modais de Confirmação */}
      <ConfirmModal
        isOpen={!!awardToDelete}
        title="Excluir Premiação"
        message="Tem certeza que deseja excluir esta premiação? Esta ação removerá também os critérios associados e não poderá ser desfeita."
        onConfirm={executeRemoveAward}
        onCancel={() => setAwardToDelete(null)}
        isDanger={true}
      />

      <ConfirmModal
        isOpen={!!criterionToDelete}
        title="Excluir Critério"
        message="Tem certeza que deseja excluir este critério? Esta ação não poderá ser desfeita."
        onConfirm={executeRemoveCriterion}
        onCancel={() => setCriterionToDelete(null)}
        isDanger={true}
      />

      <ConfirmModal
        isOpen={!!warningMessage}
        title="Não é possível excluir"
        message={warningMessage || ''}
        onConfirm={() => setWarningMessage(null)}
        onCancel={() => setWarningMessage(null)}
        showCancel={false}
        confirmLabel="Entendi"
      />
    </div >
  );
};

export default PrizeConfig;
