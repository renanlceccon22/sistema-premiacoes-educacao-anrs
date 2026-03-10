
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatBRL, formatCurrency, formatPercentageMask, parseMaskedString, formatCurrencyInput } from './utils/formatting';
import { getMonthIndexFromLabel } from './utils/calculations';
import Header from './components/Header';
import PrizeConfig from './components/PrizeConfig';
import ResultsPanel from './components/ResultsPanel';
import SchoolManager from './components/SchoolManager';
import SummaryTable from './components/SummaryTable';
import PeriodManager from './components/PeriodManager';
import CostAnalysis from './components/CostAnalysis';
import EmptyState from './components/EmptyState';
import Footer from './components/Footer';
import ConfirmModal from './components/ConfirmModal';
import Auth from './components/Auth';
import UserManager from './components/UserManager';
import ProfileSettings from './components/ProfileSettings';
import EntityManager from './components/EntityManager';
import { supabase, isConfigured } from './src/lib/supabase';
import {
  INITIAL_CATEGORIES,
} from './constants';
import {
  CustomAward,
  AwardCriterion,
  SchoolUnit,
  Period,
  Evaluation,
  User,
  Entity
} from './types';
import { calculateAllPrizes } from './utils/calculations';

enum AppTab {
  UNITIES = 'UNITIES',
  MASTER_VALUES = 'MASTER_VALUES',
  EVALUATION = 'EVALUATION',
  REPORT = 'REPORT',
  COST_ANALYSIS = 'COST_ANALYSIS'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.UNITIES);
  const [customAwards, setCustomAwards] = useState<CustomAward[]>([]);
  const [awardCriteria, setAwardCriteria] = useState<AwardCriterion[]>([]);
  const [schools, setSchools] = useState<SchoolUnit[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const lastInitKey = useRef('');
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isOperatorMode, setIsOperatorMode] = useState(false);
  const [showEntities, setShowEntities] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [availableEntities, setAvailableEntities] = useState<Entity[]>([]);

  const isSuperAdmin = useMemo(() => {
    if (!session?.user?.email) return false;
    return session.user.email.toLowerCase().trim() === 'renanlceccon@yahoo.com.br';
  }, [session]);

  const isAdmin = useMemo(() => {
    // Verifica se o usuário atual (provável ou logado) é um admin de sistema
    const emailToCheck = impersonatedUser?.email || session?.user?.email;
    if (!emailToCheck) return false;
    const email = emailToCheck.toLowerCase().trim();

    // Prioridade: Verifica se o perfil tem a role de ADMIN definida no banco
    const currentProfile = impersonatedUser || userProfile;
    const role = currentProfile?.role?.toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return true;
    }

    // Fallback: Lista de e-mails hardcoded
    return email === 'cecconjunior@yahoo.com.br' ||
      email === 'renanlceccon@yahoo.com.br' ||
      email.endsWith('@anrs.com.br');
  }, [session, impersonatedUser, userProfile]);

  const selectedEntity = useMemo(() => {
    return entities.find(e => e.id === selectedEntityId) || null;
  }, [entities, selectedEntityId]);

  const isReadOnlyMode = useMemo(() => {
    return !!impersonatedUser && !isOperatorMode;
  }, [impersonatedUser, isOperatorMode]);

  // Verifica se existe pelo menos um período aberto
  const hasOpenPeriod = useMemo(() => {
    return periods.some(p => p.status === 'open');
  }, [periods]);

  // Modo bloqueado: somente leitura quando não há período aberto (ou modo read-only geral)
  const isPeriodLocked = useMemo(() => {
    return isReadOnlyMode || (periods.length > 0 && !hasOpenPeriod);
  }, [isReadOnlyMode, periods, hasOpenPeriod]);

  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const schoolDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

  const handleStopImpersonation = () => {
    setImpersonatedUser(null);
    setIsOperatorMode(false);
    setSelectedEntityId(null);
  };
  const saveTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Estado para Modal de Confirmação
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, isDanger });
  };

  // Verificação de Autenticação
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(event.target as Node)) {
        setIsSchoolDropdownOpen(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveLocally = (key: string, data: any) => {
    if (!isConfigured) {
      localStorage.setItem(`premacao_${key}`, JSON.stringify(data));
    }
  };

  useEffect(() => {
    const initApp = async () => {
      if (!session) {
        if (!authLoading) setLoading(false);
        return;
      }

      const targetUserId = impersonatedUser?.id || session?.user?.id;
      const currentKey = `${targetUserId}_${selectedEntityId}`;
      const isReinit = lastInitKey.current === currentKey;

      if (!isReinit) {
        setLoading(true);
      }

      try {
        const isImpersonating = !!impersonatedUser;
        let profile = null;
        lastInitKey.current = currentKey;

        if (isConfigured && supabase) {
          // 1. Sincronizar/Buscar Perfil
          if (isImpersonating) {
            const { data } = await supabase.from('profiles').select('*').eq('id', targetUserId).maybeSingle();
            profile = data;
            if (data) setUserProfile(data);
          } else if (session?.user?.id && session?.user?.email) {
            const { data } = await supabase.from('profiles').upsert({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' }).select().single();
            profile = data;
            if (data) setUserProfile(data);
          }

          // 2. Buscar Entidades Permitidas
          let entitiesData: Entity[] = [];
          if (isAdmin && !isImpersonating) {
            const { data } = await supabase.from('entities').select('*').order('name');
            entitiesData = data || [];
          } else {
            const { data } = await supabase.from('user_entities').select('entities(*)').eq('user_id', targetUserId);
            entitiesData = data?.map((ue: any) => ue.entities).filter(Boolean) || [];
          }
          setEntities(entitiesData);
          setAvailableEntities(entitiesData);

          // 3. Determinar a Entidade Ativa
          let activeEntityId = selectedEntityId;
          if (entitiesData.length > 0 && !activeEntityId) {
            const savedId = profile?.selected_entity_id;
            const hasAccessToSaved = entitiesData.some(e => e.id === savedId);
            activeEntityId = hasAccessToSaved ? savedId! : entitiesData[0].id;
            setSelectedEntityId(activeEntityId);
          }

          // 4. Carregar os Dados Principais
          const getFilteredQuery = (table: string) => {
            let q = supabase.from(table).select('*');
            if (activeEntityId) {
              return q.eq('entity_id', activeEntityId);
            }
            return q.eq('user_id', targetUserId);
          };

          const [
            { data: schoolsData },
            { data: periodsData },
            { data: evaluationsData },
            { data: configData }
          ] = await Promise.all([
            getFilteredQuery('schools'),
            getFilteredQuery('periods'),
            getFilteredQuery('evaluations'),
            supabase.from('app_config')
              .select('*')
              .eq(activeEntityId ? 'entity_id' : 'user_id', activeEntityId || targetUserId)
              .maybeSingle()
          ]);

          if (schoolsData) {
            const mappedSchools: SchoolUnit[] = schoolsData.map((s: any) => ({
              id: s.id,
              name: s.name,
              targets: s.targets || {},
              treasurerName: s.treasurer_name,
              treasurerCpf: s.treasurer_cpf,
              viceTreasurerName: s.vice_treasurer_name,
              viceTreasurerCpf: s.vice_treasurer_cpf,
              isLocked: s.is_locked,
            }));
            setSchools(mappedSchools);
          }

          if (periodsData) setPeriods(periodsData as Period[]);

          if (evaluationsData) {
            const mappedEvals: Evaluation[] = evaluationsData.map((e: any) => ({
              schoolId: e.school_id,
              periodId: e.period_id,
              wonAwardIds: e.won_award_ids || [],
              wonAwardValues: e.won_award_values || {},
              criterionResults: e.criterion_results || {},
              isFinalized: e.is_finalized,
              calculatedAt: e.calculated_at
            }));
            setEvaluations(mappedEvals);
          }

          if (configData) {
            setConfigId(configData.id || null);
            if (configData.custom_awards) setCustomAwards(configData.custom_awards);
            if (configData.award_criteria) setAwardCriteria(configData.award_criteria);
          } else {
            setConfigId(null);
            setCustomAwards([]);
            setAwardCriteria([]);
          }
        } else {
          // Fallback LocalStorage
          const localSchools = localStorage.getItem('premacao_schools');
          const localPeriods = localStorage.getItem('premacao_periods');
          const localEvals = localStorage.getItem('premacao_evaluations');
          const localConfig = localStorage.getItem('premacao_config');

          if (localSchools) {
            const parsedSchools = JSON.parse(localSchools);
            setSchools(parsedSchools);
          }
          if (localPeriods) setPeriods(JSON.parse(localPeriods));
          if (localEvals) setEvaluations(JSON.parse(localEvals));
          if (localConfig) {
            const cfg = JSON.parse(localConfig);
            setCustomAwards(cfg.custom_awards || []);
            setAwardCriteria(cfg.award_criteria || []);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      } finally {
        setLoading(false);
      }
    };

    const targetUserId = impersonatedUser?.id || session?.user?.id;
    if (targetUserId) {
      initApp();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [session?.user?.id, authLoading, impersonatedUser?.id, selectedEntityId]);

  const handleEntityChange = async (entityId: string) => {
    setSelectedEntityId(entityId);
    if (session?.user?.id) {
      await supabase.from('profiles').update({ selected_entity_id: entityId }).eq('id', session.user.id);
    }
  };

  const activePeriod = useMemo(() => periods.find(p => p.id === activePeriodId) || null, [periods, activePeriodId]);
  const activeSchool = useMemo(() => schools.find(s => s.id === activeSchoolId) || null, [schools, activeSchoolId]);

  const currentEvaluation = useMemo(() => {
    if (!activeSchoolId || !activePeriodId) return null;
    return evaluations.find(e => e.schoolId === activeSchoolId && e.periodId === activePeriodId) || null;
  }, [evaluations, activeSchoolId, activePeriodId]);

  const schoolsForSummary = useMemo(() => {
    return schools.map(s => {
      const evalData = evaluations.find(e => e.schoolId === s.id && e.periodId === activePeriodId);
      return {
        ...s,
        wonAwardIds: evalData?.wonAwardIds || [],
        wonAwardValues: evalData?.wonAwardValues || {},
        isFinalized: evalData?.isFinalized || false,
      };
    });
  }, [schools, evaluations, activePeriodId]);

  const { totalTreasurerPrize, vicePrize, vicePercentage, awardedPrizes, awardedValues } = useMemo(() => {
    if (!activeSchoolId || !activePeriodId) {
      return {
        totalTreasurerPrize: 0, vicePrize: 0, vicePercentage: 50, awardedPrizes: [],
      };
    }

    const wonAwardIds = currentEvaluation?.wonAwardIds || [];
    const prizes = customAwards.filter(a => wonAwardIds.includes(a.id));
    const total = prizes.reduce((acc, p) => acc + (currentEvaluation?.wonAwardValues?.[p.id] ?? p.value), 0);

    const isPeriodOpen = activePeriod?.status === 'open';
    const vicePercentage = isPeriodOpen ? (activeSchool?.viceTreasurerPercentage ?? 50) : 50;

    return {
      totalTreasurerPrize: total,
      vicePrize: activeSchool?.viceTreasurerName ? (total * vicePercentage / 100) : 0,
      vicePercentage,
      awardedPrizes: prizes,
      awardedValues: currentEvaluation?.wonAwardValues || {}
    };
  }, [activeSchoolId, activePeriodId, customAwards, activeSchool, currentEvaluation]);

  const handleAddPeriod = async (label: string) => {
    setSyncing(true);
    const newId = crypto.randomUUID();
    const newPeriod: Period = { id: newId, label, status: 'open' };

    if (isConfigured && supabase) {
      const insertData: any = { label, status: 'open' };
      if (selectedEntityId) insertData.entity_id = selectedEntityId;
      else insertData.user_id = session.user.id;

      const { data } = await supabase.from('periods').insert(insertData).select().single();
      if (data) setPeriods(prev => [...prev, data as Period]);
    } else {
      const updated = [...periods, newPeriod];
      setPeriods(updated);
      saveLocally('periods', updated);
    }
    setActivePeriodId(newId);
    setSyncing(false);
  };

  const handleRemovePeriod = (id: string) => {
    showConfirm(
      'Remover Período',
      'Deseja realmente excluir este período? Todos os dados vinculados a ele serão removidos permanentemente.',
      async () => {
        setSyncing(true);
        if (isConfigured && supabase) {
          await supabase.from('periods').delete().eq('id', id);
          await supabase.from('evaluations').delete().eq('period_id', id);
        }
        const updatedPeriods = periods.filter(p => p.id !== id);
        setPeriods(updatedPeriods);
        const updatedEvals = evaluations.filter(e => e.periodId !== id);
        setEvaluations(updatedEvals);

        saveLocally('periods', updatedPeriods);
        saveLocally('evaluations', updatedEvals);

        if (activePeriodId === id) setActivePeriodId(null);
        setSyncing(false);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      },
      true
    );
  };

  const handleTogglePeriodStatus = async (id: string, forceBypass?: boolean) => {
    const period = periods.find(p => p.id === id);
    if (!period) return;
    const newStatus = period.status === 'open' ? 'closed' : 'open';

    // Restrição: Não permitir fechar período se houver unidades em aberto
    if (newStatus === 'closed' && !forceBypass) {
      const periodEvaluations = evaluations.filter(e => e.periodId === id);
      const isAllFinalized = schools.length > 0 && schools.every(s =>
        periodEvaluations.find(e => e.schoolId === s.id)?.isFinalized
      );

      if (!isAllFinalized) {
        alert("Não é possível fechar o período enquanto houver unidades com status 'Em Aberto'. Todas as unidades da entidade devem estar Finalizadas.");
        return;
      }
    }

    setSyncing(true);
    if (isConfigured && supabase) {
      await supabase.from('periods').update({ status: newStatus }).eq('id', id);
    }
    const updated = periods.map(p => p.id === id ? { ...p, status: newStatus } : p);
    setPeriods(updated);
    saveLocally('periods', updated);
    setSyncing(false);
  };


  const updateEvaluation = (updates: Partial<Evaluation>) => {
    if (!activeSchoolId || !activePeriodId) return;

    setEvaluations(prevEvaluations => {
      // 1. Preparar mapa de avaliações do período atual
      const periodMap = new Map<string, Evaluation>();
      prevEvaluations.forEach(ev => {
        if (ev.periodId === activePeriodId) {
          periodMap.set(ev.schoolId, { ...ev });
        }
      });

      // 2. Mesclar a atualização da escola ativa
      const currentActiveEval = periodMap.get(activeSchoolId) || {
        schoolId: activeSchoolId,
        periodId: activePeriodId,
        wonAwardIds: [],
        criterionResults: {},
        isFinalized: false
      };

      const updatedActiveEval = {
        ...currentActiveEval,
        ...updates,
        criterionResults: { ...currentActiveEval.criterionResults, ...(updates.criterionResults || {}) }
      };
      periodMap.set(activeSchoolId, updatedActiveEval);

      // 3. Processar critérios de RANKING
      const rankingCriteria = awardCriteria.filter(c => {
        const award = customAwards.find(a => a.id === c.awardId);
        return award?.evaluationType === 'JOINT' && c.operator?.startsWith('RANKING');
      });

      rankingCriteria.forEach(criterion => {
        const dataPoints: { schoolId: string, value: number }[] = [];
        periodMap.forEach((ev) => {
          const res = ev.criterionResults[criterion.id];
          if (res && res.value !== undefined) {
            dataPoints.push({ schoolId: ev.schoolId, value: res.value });
          }
        });

        const isTop = criterion.operator === 'RANKING_TOP';
        dataPoints.sort((a, b) => isTop ? b.value - a.value : a.value - b.value);

        const topCount = criterion.threshold1 || 0;
        dataPoints.forEach((dp, index) => {
          const ev = periodMap.get(dp.schoolId)!;
          ev.criterionResults = {
            ...ev.criterionResults,
            [criterion.id]: {
              ...ev.criterionResults[criterion.id],
              isMet: index < topCount,
              rankIndex: index
            }
          };
        });
      });

      // 4. Recalcular wonAwardIds para TODAS as escolas do período
      const changedEvaluations: Evaluation[] = [];
      periodMap.forEach((ev) => {
        const wonAwardIds: string[] = [];
        const wonAwardValues: Record<string, number> = {};

        customAwards.forEach(award => {
          if (award.schoolIds.length > 0 && !award.schoolIds.includes(ev.schoolId)) return;
          const awardCriteriaList = awardCriteria.filter(c => c.awardId === award.id);
          if (awardCriteriaList.length === 0) return;

          if (award.scoringMode) {
            const awardScore = awardCriteriaList.reduce((acc, c) => acc + (ev.criterionResults[c.id]?.score || 0), 0);
            if (awardScore >= (award.minScore || 0)) wonAwardIds.push(award.id);
          } else {
            const allCriteriaMet = awardCriteriaList.every(criterion => ev.criterionResults[criterion.id]?.isMet);
            if (allCriteriaMet) {
              wonAwardIds.push(award.id);
              // Handle custom ranking prizes and financial ranges
              const hasFinancialRanges = awardCriteriaList.some(c => c.financialRanges && c.financialRanges.length > 0);
              if (hasFinancialRanges) {
                const sumFinancial = awardCriteriaList.reduce((acc, c) => acc + (ev.criterionResults[c.id]?.financialValue || 0), 0);
                wonAwardValues[award.id] = sumFinancial;
              } else {
                const rankingCriterion = awardCriteriaList.find(c => award.evaluationType === 'JOINT' && c.operator?.startsWith('RANKING'));
                if (rankingCriterion && rankingCriterion.rankingPrizes) {
                  const rankIndex = ev.criterionResults[rankingCriterion.id]?.rankIndex;
                  if (rankIndex !== undefined && rankIndex < rankingCriterion.rankingPrizes.length) {
                    wonAwardValues[award.id] = rankingCriterion.rankingPrizes[rankIndex];
                  }
                }
              }
            }
          }
        });

        const prevEval = prevEvaluations.find(old => old.schoolId === ev.schoolId && old.periodId === activePeriodId);
        const prevWonStr = JSON.stringify(prevEval?.wonAwardIds || []);
        const prevValsStr = JSON.stringify(prevEval?.wonAwardValues || {});
        const prevResStr = JSON.stringify(prevEval?.criterionResults || {});

        const newWonStr = JSON.stringify(wonAwardIds);
        const newValsStr = JSON.stringify(wonAwardValues);
        const newResStr = JSON.stringify(ev.criterionResults || {});

        if (prevWonStr !== newWonStr || prevValsStr !== newValsStr || prevResStr !== newResStr || ev.schoolId === activeSchoolId) {
          ev.wonAwardIds = wonAwardIds;
          ev.wonAwardValues = wonAwardValues;
          ev.calculatedAt = new Date().toISOString();
          changedEvaluations.push(ev);
        }
      });

      // 5. Persistir no Banco de Dados (debounce)
      if (changedEvaluations.length > 0) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          if (isConfigured && supabase) {
            const dbPayloads = changedEvaluations.map(ev => ({
              school_id: ev.schoolId,
              period_id: ev.periodId,
              won_award_ids: ev.wonAwardIds,
              won_award_values: ev.wonAwardValues,
              criterion_results: ev.criterionResults,
              is_finalized: ev.isFinalized,
              calculated_at: ev.calculatedAt,
              entity_id: selectedEntityId || undefined,
              user_id: (!selectedEntityId ? (impersonatedUser?.id || session.user.id) : undefined)
            }));
            await supabase.from('evaluations').upsert(dbPayloads, { onConflict: 'school_id,period_id' });
          }
        }, 1000);
      }

      // 6. Retornar Nova Lista de Avaliações
      const updatedList = prevEvaluations.map(e => {
        if (e.periodId === activePeriodId) {
          return periodMap.get(e.schoolId) || e;
        }
        return e;
      });

      // Adiciona o novo se não existia
      if (!prevEvaluations.some(e => e.schoolId === activeSchoolId && e.periodId === activePeriodId)) {
        updatedList.push(periodMap.get(activeSchoolId)!);
      }

      return updatedList;
    });
  };

  const handleUpdateCriterionResult = (criterionId: string, valueUpdates: { value?: number, checked?: boolean, selectedOptionId?: string }) => {
    if (!activeSchoolId || !activePeriodId || activePeriod?.status === 'closed' || currentEvaluation?.isFinalized) return;

    const criterion = awardCriteria.find(c => String(c.id).trim() === String(criterionId).trim());
    if (!criterion) return;

    const periodLabel = activePeriod?.label || '';
    const monthIndex = getMonthIndexFromLabel(periodLabel);
    const award = customAwards.find(a => String(a.id).trim() === String(criterion.awardId).trim());

    const results = currentEvaluation?.criterionResults || {};
    const oldResult = results[criterionId] ? { ...results[criterionId] } : { isMet: false };

    let effectiveUpdates = { ...valueUpdates };

    const sid = (id: any) => id ? String(id).trim() : null;
    const oldOptId = sid(oldResult.selectedOptionId);
    const newOptId = sid(valueUpdates.selectedOptionId);

    // Toggle logic: if clicking already selected, deselect
    if (newOptId && oldOptId === newOptId) {
      effectiveUpdates.selectedOptionId = undefined;
    }

    // Base new result
    const newResult = { ...oldResult, ...effectiveUpdates };

    // Recalculate Logic
    if (criterion.type === 'TOGGLE') {
      if (criterion.options && criterion.options.length > 0) {
        const targetOptId = sid(newResult.selectedOptionId);
        const selectedOption = criterion.options.find(o => sid(o.id) === targetOptId);
        newResult.selectedOptionId = targetOptId || undefined;
        newResult.score = selectedOption?.points || 0;
        newResult.isMet = !!selectedOption;
      } else {
        newResult.isMet = !!newResult.checked;
        newResult.score = newResult.checked ? (award?.minScore || 100) : 0;
      }
    } else {
      const val = newResult.value || 0;

      if (criterion.useAccumulatedBudget) {
        const annualTarget = activeSchool?.annualBudget || activeSchool?.targets[criterion.id] || 0;
        const monthFactor = criterion.budgetEvaluationType === 'MONTHLY' ? 1 / 12 : monthIndex / 12;
        const currentTarget = annualTarget * monthFactor;

        if (award?.scoringMode && criterion.scoringRanges && criterion.scoringRanges.length > 0) {
          let maxPoints = 0;
          criterion.scoringRanges.forEach(range => {
            let rangeMet = false;
            // No modo orçamento, o threshold é interpretado como uma porcentagem do orçamento do período
            const rt1 = (range.threshold1 || 0) * currentTarget / 100;
            const rt2 = (range.threshold2 || 0) * currentTarget / 100;

            switch (range.operator) {
              case 'GREATER_THAN': rangeMet = val > rt1; break;
              case 'LESS_THAN': rangeMet = val < rt1; break;
              case 'GREATER_EQUAL': rangeMet = val >= rt1; break;
              case 'LESS_EQUAL': rangeMet = val <= rt1; break;
              case 'EQUAL': rangeMet = val === rt1; break;
              case 'BETWEEN': rangeMet = val >= rt1 && val <= rt2; break;
              default: rangeMet = false;
            }
            if (rangeMet) maxPoints = Math.max(maxPoints, range.points);
          });
          newResult.score = maxPoints;
          newResult.isMet = maxPoints > 0;
        } else {
          // Fallback simple: menor ou igual ao orçamento corrente = 100 pontos
          newResult.isMet = val <= currentTarget;
          newResult.score = newResult.isMet ? 100 : 0;
        }
      } else if (award?.scoringMode && criterion.scoringRanges && criterion.scoringRanges.length > 0) {
        let maxPoints = 0;
        criterion.scoringRanges.forEach(range => {
          let rangeMet = false;
          const rt1 = range.threshold1 || 0;
          const rt2 = range.threshold2 || 0;
          switch (range.operator) {
            case 'GREATER_THAN': rangeMet = val > rt1; break;
            case 'LESS_THAN': rangeMet = val < rt1; break;
            case 'GREATER_EQUAL': rangeMet = val >= rt1; break;
            case 'LESS_EQUAL': rangeMet = val <= rt1; break;
            case 'EQUAL': rangeMet = val === rt1; break;
            case 'BETWEEN': rangeMet = val >= rt1 && val <= rt2; break;
            default: rangeMet = false;
          }
          if (rangeMet) maxPoints = Math.max(maxPoints, range.points);
        });
        newResult.score = maxPoints;
        newResult.isMet = maxPoints > 0;
      } else if (!award?.scoringMode && criterion.financialRanges && criterion.financialRanges.length > 0) {
        let matchedValue = 0;
        let anyMet = false;
        criterion.financialRanges.forEach(range => {
          let rangeMet = false;
          const rt1 = range.threshold1 || 0;
          const rt2 = range.threshold2 || 0;
          switch (range.operator) {
            case 'GREATER_THAN': rangeMet = val > rt1; break;
            case 'LESS_THAN': rangeMet = val < rt1; break;
            case 'GREATER_EQUAL': rangeMet = val >= rt1; break;
            case 'LESS_EQUAL': rangeMet = val <= rt1; break;
            case 'EQUAL': rangeMet = val === rt1; break;
            case 'BETWEEN': rangeMet = val >= rt1 && val <= rt2; break;
            default: rangeMet = false;
          }
          if (rangeMet) {
            anyMet = true;
            matchedValue = Math.max(matchedValue, range.value);
          }
        });
        newResult.financialValue = matchedValue;
        newResult.isMet = anyMet;
        newResult.score = anyMet ? 100 : 0;
      } else {
        const t1 = criterion.threshold1 || 0;
        const t2 = criterion.threshold2 || 0;
        switch (criterion.operator) {
          case 'GREATER_THAN': newResult.isMet = val > t1; break;
          case 'LESS_THAN': newResult.isMet = val < t1; break;
          case 'GREATER_EQUAL': newResult.isMet = val >= t1; break;
          case 'LESS_EQUAL': newResult.isMet = val <= t1; break;
          case 'EQUAL': newResult.isMet = val === t1; break;
          case 'BETWEEN': newResult.isMet = val >= t1 && val <= t2; break;
          default: newResult.isMet = false;
        }
        newResult.score = newResult.isMet ? 100 : 0;
      }
    }

    updateEvaluation({
      criterionResults: {
        [criterionId]: newResult
      }
    });
  };

  const handleAddSchool = async (payload: Partial<SchoolUnit>) => {
    if (periods.length > 0 && !hasOpenPeriod) {
      alert('Não é possível cadastrar novas unidades pois não há nenhum período aberto. Abra ou crie um novo período primeiro.');
      return;
    }
    setSyncing(true);
    const newId = crypto.randomUUID();

    const newSchool: SchoolUnit = {
      id: newId,
      name: payload.name || 'Nova Unidade',
      targets: {},
      treasurerName: payload.treasurerName,
      treasurerCpf: payload.treasurerCpf,
      viceTreasurerName: payload.viceTreasurerName,
      viceTreasurerCpf: payload.viceTreasurerCpf,
      viceTreasurerPercentage: payload.viceTreasurerPercentage ?? 50,
      isLocked: payload.isLocked || false,
    };

    if (isConfigured && supabase) {
      const insertData: any = {
        name: newSchool.name,
        targets: {},
        treasurer_name: newSchool.treasurerName,
        treasurer_cpf: newSchool.treasurerCpf,
        vice_treasurer_name: newSchool.viceTreasurerName,
        vice_treasurer_cpf: newSchool.viceTreasurerCpf,
        vice_treasurer_percentage: newSchool.viceTreasurerPercentage,
        is_locked: newSchool.isLocked,
      };

      if (selectedEntityId) insertData.entity_id = selectedEntityId;
      else insertData.user_id = session.user.id;

      const { data } = await supabase.from('schools').insert(insertData).select().single();

      if (data) {
        const mapped: SchoolUnit = {
          id: data.id,
          name: data.name,
          targets: data.targets || {},
          treasurerName: data.treasurer_name,
          treasurerCpf: data.treasurer_cpf,
          viceTreasurerName: data.vice_treasurer_name,
          viceTreasurerCpf: data.vice_treasurer_cpf,
          viceTreasurerPercentage: data.vice_treasurer_percentage ?? 50,
          isLocked: data.is_locked,
        };
        setSchools(prev => [...prev, mapped]);
        setActiveSchoolId(mapped.id);
      }
    } else {
      const updated = [...schools, newSchool];
      setSchools(updated);
      saveLocally('schools', updated);
      setActiveSchoolId(newId);
    }
    setSyncing(false);
  };

  const handleFinalize = async () => {
    if (!activeSchoolId || !activePeriodId || !activeSchool) return;

    await updateEvaluation({
      isFinalized: true,
      calculatedAt: new Date().toISOString()
    });

    const finalizedIds = new Set(evaluations.filter(e => e.periodId === activePeriodId && e.isFinalized).map(e => e.schoolId));
    finalizedIds.add(activeSchoolId);

    if (finalizedIds.size === schools.length && activePeriod?.status === 'open') {
      setTimeout(() => {
        showConfirm(
          "Fechar Período?",
          "Todas as unidades deste período foram finalizadas com sucesso. Deseja fechar o período agora para impedir novas edições?",
          () => {
            handleTogglePeriodStatus(activePeriodId!, true);
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          }
        );
      }, 600);
    }
  };

  const handleReopenEvaluation = () => {
    if (!activeSchoolId || !activePeriodId) return;

    if (activePeriod?.status === 'closed') {
      alert("Não é possível reabrir a avaliação pois o período está FECHADO. Reabra o período primeiro para permitir ajustes.");
      return;
    }

    showConfirm(
      'Reabrir Avaliação',
      "Deseja reabrir esta avaliação para ajustes? Isso permitirá editar as premiações recebidas.",
      () => {
        updateEvaluation({ isFinalized: false });
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    );
  };

  const handleUpdateSchool = async (schoolId: string, payload: Partial<SchoolUnit>) => {
    if (periods.length > 0 && !hasOpenPeriod) {
      alert('Não é possível alterar cadastro de unidades pois não há nenhum período aberto. Abra ou crie um novo período primeiro.');
      return;
    }
    setSyncing(true);
    if (isConfigured && supabase) {
      const updatePayload: any = {};
      if (payload.name !== undefined) updatePayload.name = payload.name;
      if (payload.treasurerName !== undefined) updatePayload.treasurer_name = payload.treasurerName;
      if (payload.treasurerCpf !== undefined) updatePayload.treasurer_cpf = payload.treasurerCpf;
      if (payload.viceTreasurerName !== undefined) updatePayload.vice_treasurer_name = payload.viceTreasurerName;
      if (payload.viceTreasurerCpf !== undefined) updatePayload.vice_treasurer_cpf = payload.viceTreasurerCpf;
      if (payload.viceTreasurerPercentage !== undefined) updatePayload.vice_treasurer_percentage = payload.viceTreasurerPercentage;
      if (payload.isLocked !== undefined) updatePayload.is_locked = payload.isLocked;
      if (payload.targets !== undefined) updatePayload.targets = payload.targets;

      await supabase.from('schools').update(updatePayload).eq('id', schoolId);
    }

    const updatedSchools = schools.map(s => s.id === schoolId ? { ...s, ...payload } : s);
    setSchools(updatedSchools);
    saveLocally('schools', updatedSchools);
    setSyncing(false);
  };

  const handleRemoveSchool = (id: string) => {
    if (periods.length > 0 && !hasOpenPeriod) {
      alert('Não é possível remover unidades pois não há nenhum período aberto. Abra ou crie um novo período primeiro.');
      return;
    }

    const school = schools.find(s => s.id === id);

    // Restrição: Não remover unidade com avaliações finalizadas
    const hasFinalized = evaluations.some(e => e.schoolId === id && e.isFinalized);
    if (hasFinalized) {
      alert(`Não é possível remover a unidade "${school?.name}" pois ela possui avaliações finalizadas em algum período. Reabra as avaliações antes de excluir a unidade.`);
      return;
    }

    showConfirm(
      'Remover Unidade',
      `Deseja realmente remover a unidade "${school?.name}"? Isso apagará todas as avaliações e metas associadas.`,
      async () => {
        setSyncing(true);
        if (isConfigured && supabase) {
          await supabase.from('schools').delete().eq('id', id);
          await supabase.from('evaluations').delete().eq('school_id', id);
        }
        const updatedSchools = schools.filter(x => x.id !== id);
        setSchools(updatedSchools);
        const updatedEvals = evaluations.filter(x => x.schoolId !== id);
        setEvaluations(updatedEvals);

        saveLocally('schools', updatedSchools);
        saveLocally('evaluations', updatedEvals);

        if (activeSchoolId === id) setActiveSchoolId(null);
        setSyncing(false);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      },
      true
    );
  };

  const handleSaveConfig = async (updatedAwards: CustomAward[], updatedCriteria: AwardCriterion[]) => {
    if (periods.length > 0 && !hasOpenPeriod) {
      alert('Não é possível alterar configuração de premiações pois não há nenhum período aberto. Abra ou crie um novo período primeiro.');
      return;
    }
    setSyncing(true);
    try {
      if (isConfigured && supabase && session?.user?.id) {
        const targetId = selectedEntityId ? { entity_id: selectedEntityId } : { user_id: impersonatedUser?.id || session.user.id };
        const authorId = impersonatedUser?.id || session.user.id;

        const payload: any = {
          ...targetId,
          custom_awards: updatedAwards,
          award_criteria: updatedCriteria,
          updated_at: new Date().toISOString()
        };

        // Se fomos nós que carregamos esse registro, mantemos o ID para o upsert não errar
        if (configId) payload.id = configId;

        // Só atrelamos user_id se não for configuração de entidade, para não violar o Unique Key de usuários
        if (!payload.user_id && !selectedEntityId) payload.user_id = authorId;

        console.log("DEBUG: Salvando Configuração:", payload);

        const { data, error } = await supabase.from('app_config').upsert(payload,
          { onConflict: configId ? 'id' : (selectedEntityId ? 'entity_id' : 'user_id') }
        ).select().maybeSingle();

        if (error) {
          console.error("DEBUG: Erro no Supabase:", error);
          alert(`Erro ao salvar no banco: ${error.message} (Código: ${error.code})`);
          throw error;
        }

        if (data) {
          console.log("DEBUG: Salvo com sucesso:", data);
          setConfigId(data.id);
        }
      }

      setCustomAwards(updatedAwards);
      setAwardCriteria(updatedCriteria);

      saveLocally('config', {
        custom_awards: updatedAwards,
        award_criteria: updatedCriteria
      });

      // Recalcular avaliações de períodos ABERTOS após mudança de regras
      const openPeriodIds = periods.filter(p => p.status === 'open').map(p => p.id);
      if (openPeriodIds.length > 0) {
        setEvaluations(prevEvaluations => {
          const changedEvaluations: Evaluation[] = [];
          const updatedList = prevEvaluations.map(ev => {
            // Só recalcula se o período estiver aberto E a avaliação NÃO estiver finalizada
            if (!openPeriodIds.includes(ev.periodId) || ev.isFinalized) return ev;

            const wonAwardIds: string[] = [];
            const wonAwardValues: Record<string, number> = {};

            updatedAwards.forEach(award => {
              if (award.schoolIds.length > 0 && !award.schoolIds.includes(ev.schoolId)) return;
              const awardCriteriaList = updatedCriteria.filter(c => c.awardId === award.id);
              if (awardCriteriaList.length === 0) return;

              if (award.scoringMode) {
                const awardScore = awardCriteriaList.reduce((acc, c) => acc + (ev.criterionResults[c.id]?.score || 0), 0);
                if (awardScore >= (award.minScore || 0)) wonAwardIds.push(award.id);
              } else {
                const allCriteriaMet = awardCriteriaList.every(criterion => ev.criterionResults[criterion.id]?.isMet);
                if (allCriteriaMet) {
                  wonAwardIds.push(award.id);
                  const rankingCriterion = awardCriteriaList.find(c => award.evaluationType === 'JOINT' && c.operator?.startsWith('RANKING'));
                  if (rankingCriterion && rankingCriterion.rankingPrizes) {
                    const rankIndex = ev.criterionResults[rankingCriterion.id]?.rankIndex;
                    if (rankIndex !== undefined && rankIndex < rankingCriterion.rankingPrizes.length) {
                      wonAwardValues[award.id] = rankingCriterion.rankingPrizes[rankIndex];
                    }
                  }
                }
              }
            });

            const updated = { ...ev, wonAwardIds, wonAwardValues, calculatedAt: new Date().toISOString() };
            changedEvaluations.push(updated);
            return updated;
          });

          // Persistir mudanças no banco
          if (changedEvaluations.length > 0 && isConfigured && supabase) {
            setTimeout(async () => {
              const dbPayloads = changedEvaluations.map(ev => ({
                school_id: ev.schoolId,
                period_id: ev.periodId,
                won_award_ids: ev.wonAwardIds,
                won_award_values: ev.wonAwardValues,
                criterion_results: ev.criterionResults,
                is_finalized: ev.isFinalized,
                calculated_at: ev.calculatedAt,
                entity_id: selectedEntityId || undefined,
                user_id: (!selectedEntityId ? (impersonatedUser?.id || session.user.id) : undefined)
              }));
              await supabase.from('evaluations').upsert(dbPayloads, { onConflict: 'school_id,period_id' });
            }, 500);
          }

          return updatedList;
        });
      }
    } catch (err) {
      console.error("DEBUG: Falha geral:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateAwards = async (updatedAwards: CustomAward[]) => {
    await handleSaveConfig(updatedAwards, awardCriteria);
  };

  const handleUpdateCriteria = async (updatedCriteria: AwardCriterion[]) => {
    await handleSaveConfig(customAwards, updatedCriteria);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#003B71] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth onLogin={() => { }} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#003B71] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#003B71] font-black uppercase tracking-widest text-xs">Carregando Sistema...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCloudConfigured={isConfigured}
        onLogout={handleLogout}
        userEmail={session?.user?.email}
        userName={userProfile?.full_name}
        isAdmin={isAdmin} // Passa se o contexto atual é admin (para abas)
        isSuperAdmin={isSuperAdmin} // Nova prop para gerenciar acesso aos painéis Master
        onOpenSettings={() => setShowSettings(true)}
        onOpenProfile={() => setShowProfile(true)}
        onOpenEntities={() => setShowEntities(true)}
        impersonatedEmail={impersonatedUser?.email}
        impersonatedName={impersonatedUser?.full_name}
        isOperatorMode={isOperatorMode}
        onStopImpersonation={handleStopImpersonation}
        currentEntity={selectedEntity}
        availableEntities={availableEntities}
        onEntityChange={handleEntityChange}
      />

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative bg-white rounded-[2rem] shadow-xl">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-6 right-6 z-20 p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
              title="Fechar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <UserManager
              currentImpersonatedUser={impersonatedUser}
              onImpersonate={(user, isOperator = false) => {
                setImpersonatedUser(user);
                setIsOperatorMode(isOperator);
                setSelectedEntityId(null);
                setShowSettings(false);
              }}
              entities={entities}
            />
          </div>
        </div>
      )}

      {showEntities && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative bg-white rounded-[2rem] shadow-xl">
            <button
              onClick={() => setShowEntities(false)}
              className="absolute top-6 right-6 z-20 p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
              title="Fechar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <EntityManager onClose={() => setShowEntities(false)} />
          </div>
        </div>
      )}

      {showProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <ProfileSettings
            session={session}
            targetUser={impersonatedUser || userProfile || { id: session.user.id, email: session.user.email }}
            isReadOnly={isReadOnlyMode}
            onClose={() => setShowProfile(false)}
            onProfileUpdate={(updated) => {
              if (impersonatedUser && impersonatedUser.id === updated.id) {
                setImpersonatedUser(prev => prev ? { ...prev, ...updated } : null);
              } else {
                setUserProfile(prev => prev ? { ...prev, ...updated } : null);
              }
            }}
          />
        </div>
      )}


      {/* Syncing indicator removed as per user request */}
      {/* Barra de Filtros (Visível em todas as abas) */}
      <div className="mx-auto px-2 sm:px-4 md:px-6 lg:px-8 pt-6 relative z-20">
        <div className="dashboard-container">
          <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-3.5 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">

              {/* Dropdown Unidade Escolar Customizado - Oculto na aba Relatórios e Cadastro Premiações */}
              {![AppTab.REPORT, AppTab.MASTER_VALUES].includes(activeTab) && (
                <div className="flex flex-col flex-1 min-w-[200px] md:w-64 relative" ref={schoolDropdownRef}>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 flex items-center">
                    <svg className="w-3 h-3 mr-1.5 text-[#003B71]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Unidade Escolar Ativa
                  </label>
                  <button
                    onClick={() => setIsSchoolDropdownOpen(!isSchoolDropdownOpen)}
                    className={`w-full flex justify-between items-center bg-slate-50 border-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all outline-none ${activeSchoolId ? 'border-[#003B71] text-[#003B71] bg-white ring-4 ring-[#003B71]/5 shadow-lg shadow-[#003B71]/10' : 'border-slate-100 text-[#003B71] bg-white ring-4 ring-slate-100/5'
                      }`}
                  >
                    <span className="truncate">{activeSchool ? activeSchool.name : "Todas Unidades Escolares"}</span>
                    <svg className={`w-4 h-4 transition-transform duration-300 ${isSchoolDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isSchoolDropdownOpen && (
                    <ul className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white border border-slate-100 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-64 overflow-y-auto">
                      <li
                        onClick={() => { setActiveSchoolId(null); setIsSchoolDropdownOpen(false); }}
                        className={`px-3.5 py-1.5 text-xs font-black cursor-pointer transition-colors ${!activeSchoolId ? 'bg-blue-50 text-[#003B71]' : 'text-slate-400 hover:bg-slate-50'}`}
                      >
                        Todas Unidades Escolares
                      </li>
                      {schools.map(s => (
                        <li
                          key={s.id}
                          onClick={() => { setActiveSchoolId(s.id); setIsSchoolDropdownOpen(false); }}
                          className={`px-3.5 py-1.5 text-xs font-black cursor-pointer transition-colors flex items-center justify-between ${activeSchoolId === s.id ? 'bg-[#003B71] text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-[#003B71]'
                            }`}
                        >
                          {s.name}
                          {activeSchoolId === s.id && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Dropdown Período Contábil Customizado */}
              <div className="flex flex-col flex-1 min-w-[150px] md:w-48 relative" ref={periodDropdownRef}>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 flex items-center">
                  <svg className="w-3 h-3 mr-1.5 text-[#FDB813]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                  </svg>
                  Período Contábil
                </label>
                <button
                  onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                  className={`w-full flex justify-between items-center bg-slate-50 border-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all outline-none ${activePeriodId ? 'border-[#FDB813] text-[#003B71] bg-white ring-4 ring-[#FDB813]/5 shadow-lg shadow-[#FDB813]/10' : 'border-slate-100 text-slate-400'
                    }`}
                >
                  <span className="truncate">{activePeriod ? `${activePeriod.label} ${activePeriod.status === 'closed' ? '🔒' : ''}` : "Todos os Períodos"}</span>
                  <svg className={`w-4 h-4 transition-transform duration-300 ${isPeriodDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isPeriodDropdownOpen && (
                  <ul className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white border border-slate-100 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-64 overflow-y-auto">
                    <li
                      onClick={() => { setActivePeriodId(null); setIsPeriodDropdownOpen(false); }}
                      className={`px-3.5 py-1.5 text-xs font-black cursor-pointer transition-colors ${!activePeriodId ? 'bg-[#FDB813] text-[#003B71]' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      Todos os Períodos
                    </li>
                    {periods.map(p => (
                      <li
                        key={p.id}
                        onClick={() => { setActivePeriodId(p.id); setIsPeriodDropdownOpen(false); }}
                        className={`px-3.5 py-1.5 text-xs font-black cursor-pointer transition-colors flex items-center justify-between ${activePeriodId === p.id ? 'bg-[#FDB813] text-[#003B71]' : 'text-slate-700 hover:bg-yellow-50 hover:text-[#003B71]'
                          }`}
                      >
                        <span className="flex items-center gap-2">
                          {p.label}
                          {p.status === 'closed' && <span className="opacity-50">🔒</span>}
                        </span>
                        {activePeriodId === p.id && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full relative z-10">
        <div className="dashboard-container mx-auto px-4 pt-6 pb-20">


          {activeTab === AppTab.UNITIES && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SchoolManager
                schools={schools}
                activeSchoolId={activeSchoolId}
                criteria={awardCriteria}
                onAddSchool={handleAddSchool}
                onRemoveSchool={handleRemoveSchool}
                onSelectSchool={setActiveSchoolId}
                onUpdateSchool={handleUpdateSchool}
                isReadOnly={isPeriodLocked}
              />
              <PeriodManager
                periods={periods}
                activePeriodId={activePeriodId}
                schoolsCount={schools.length}
                onAddPeriod={handleAddPeriod}
                onRemovePeriod={handleRemovePeriod}
                onSelectPeriod={setActivePeriodId}
                onToggleStatus={handleTogglePeriodStatus}
                isReadOnly={isReadOnlyMode}
              />
            </div>
          )}

          {activeTab === AppTab.MASTER_VALUES && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PrizeConfig
                schools={schools}
                customAwards={customAwards}
                criteria={awardCriteria}
                onSave={handleSaveConfig}
                isReadOnly={isPeriodLocked}
                isSaving={syncing}
                evaluations={evaluations}
              />
            </div>
          )}

          {activeTab === AppTab.EVALUATION && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeSchoolId && activePeriodId ? (
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="w-full lg:w-2/3">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 transition-all duration-500">
                      <h2 className="text-xl font-bold text-[#003B71] uppercase tracking-tight flex items-center gap-3">
                        <span className="w-1.5 h-8 bg-[#003B71] rounded-full"></span>
                        Avaliação de Premiações
                      </h2>

                      {(isReadOnlyMode || activePeriod?.status === 'closed' || currentEvaluation?.isFinalized) && (
                        <div className="mt-6 mb-2 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none mb-1">Modo Somente Leitura</h4>
                            <p className="text-[9px] text-amber-600 font-bold">
                              {activePeriod?.status === 'closed' ? 'Este período está FECHADO e não permite novas edições.' :
                                currentEvaluation?.isFinalized ? 'Esta avaliação foi FINALIZADA. Reabra-a para fazer novos ajustes.' :
                                  'Você está visualizando em modo de consulta. Edições não são permitidas.'}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-8 mt-8">
                        {customAwards.filter(award => award.schoolIds.includes(activeSchoolId)).map(award => {
                          const awardCriteriaList = awardCriteria.filter(c => c.awardId === award.id);
                          if (awardCriteriaList.length === 0) return null;

                          const isWon = (currentEvaluation?.wonAwardIds || []).includes(award.id);
                          const isDisabled = isReadOnlyMode || activePeriod?.status === 'closed' || currentEvaluation?.isFinalized;

                          return (
                            <div key={award.id} className={`p-6 rounded-2xl border-2 transition-all ${isWon ? 'border-[#003B71] bg-blue-50/30' : 'border-slate-100 bg-white'}`}>
                              <div className="flex justify-between items-center mb-6">
                                <div>
                                  <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-10 bg-[#003B71] rounded-full"></div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold text-[#003B71] tracking-tight">{award.name}</h3>
                                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest leading-none ${award.evaluationType === 'JOINT' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                          {award.evaluationType === 'JOINT' ? 'Conjunta' : 'Individual'}
                                        </span>
                                      </div>
                                      {(() => {
                                        const rankCrit = awardCriteriaList.find(c => award.evaluationType === 'JOINT' && (c.operator || '').startsWith('RANKING') && c.rankingPrizes && c.rankingPrizes.length > 0);
                                        if (award.value === 0 && rankCrit) {
                                          return (
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                              {rankCrit.rankingPrizes!.map((v, i) => (
                                                <span key={i} className="text-[8px] font-black text-[#003B71] bg-[#FDB813]/20 px-1.5 py-0.5 rounded border border-[#FDB813]/30">
                                                  {i + 1}º {v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                              ))}
                                            </div>
                                          );
                                        }
                                        return (
                                          <p className="text-[10px] font-black text-[#FDB813] uppercase tracking-[0.2em] mt-0.5">
                                            Prêmio de {(currentEvaluation?.wonAwardValues?.[award.id] ?? award.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </p>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                {isWon && (
                                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm border border-green-200">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Conquistado
                                  </span>
                                )}
                              </div>

                              {award.scoringMode && (
                                <div className="mb-6 flex items-center gap-4 bg-[#003B71]/5 p-3 rounded-xl border border-[#003B71]/10">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontuação Total</span>
                                    <p className="text-2xl font-black text-[#003B71]">
                                      {awardCriteriaList.reduce((acc, c) => acc + (currentEvaluation?.criterionResults[c.id]?.score || 0), 0)}
                                      <span className="text-xs text-slate-400 ml-1">/ {award.minScore}</span>
                                    </p>
                                  </div>
                                  <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border border-slate-100">
                                    <div
                                      className="h-full bg-[#FDB813] transition-all duration-1000"
                                      style={{ width: `${Math.min(100, (awardCriteriaList.reduce((acc, c) => acc + (currentEvaluation?.criterionResults[c.id]?.score || 0), 0) / (award.minScore || 1)) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-6">
                                {awardCriteriaList.map(criterion => {
                                  const result = (currentEvaluation?.criterionResults || {})[criterion.id] || { isMet: false };

                                  const getRuleDisplay = () => {
                                    if (criterion.type === 'TOGGLE') {
                                      if (award.scoringMode && criterion.options?.length) {
                                        return `Modo Pontuação (${criterion.options.length} Avaliações)`;
                                      }
                                      return 'Seleção Simples (Checkbox)';
                                    }
                                    if (award.scoringMode && criterion.scoringRanges?.length) {
                                      return `Modo Pontuação (${criterion.scoringRanges.length} faixas)`;
                                    }
                                    const suffix = criterion.valueFormat === 'PERCENTAGE' ? '%' : '';
                                    if (criterion.useAccumulatedBudget) {
                                      const annualTarget = activeSchool?.annualBudget || activeSchool?.targets[criterion.id] || 0;
                                      const monthIndex = getMonthIndexFromLabel(activePeriod?.label || '');
                                      const monthFactor = criterion.budgetEvaluationType === 'MONTHLY' ? 1 / 12 : monthIndex / 12;
                                      const currentTarget = annualTarget * monthFactor;
                                      return `Orçamento ${criterion.budgetEvaluationType === 'MONTHLY' ? 'Mensal' : 'Acumulado'}: ≤ ${currentTarget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                                    }
                                    if (!award.scoringMode && criterion.financialRanges && criterion.financialRanges.length > 0) {
                                      return `Múltiplas Faixas de Valor`;
                                    }
                                    switch (criterion.operator) {
                                      case 'GREATER_THAN': return `Meta: > ${criterion.threshold1}${suffix}`;
                                      case 'LESS_THAN': return `Meta: < ${criterion.threshold1}${suffix}`;
                                      case 'GREATER_EQUAL': return `Meta: ≥ ${criterion.threshold1}${suffix}`;
                                      case 'LESS_EQUAL': return `Meta: ≤ ${criterion.threshold1}${suffix}`;
                                      case 'EQUAL': return `Meta: = ${criterion.threshold1}${suffix}`;
                                      case 'BETWEEN': return `Meta: ${criterion.threshold1}${suffix} até ${criterion.threshold2}${suffix}`;
                                      case 'RANKING_TOP': return `Meta: Top ${criterion.threshold1} Maiores`;
                                      case 'RANKING_BOTTOM': return `Meta: Top ${criterion.threshold1} Menores`;
                                      default: return '';
                                    }
                                  };

                                  return (
                                    <div key={criterion.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                          <span className="w-1 h-4 bg-[#003B71] rounded-full opacity-30"></span>
                                          <label className="text-xs font-black uppercase text-[#003B71] tracking-tight">{criterion.name}</label>
                                        </div>
                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{getRuleDisplay()}</span>
                                      </div>

                                      {criterion.type === 'TOGGLE' ? (
                                        award.scoringMode && criterion.options && criterion.options.length > 0 ? (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {criterion.options.map(opt => (
                                              <button
                                                key={opt.id}
                                                onClick={() => {
                                                  if (!isDisabled) {
                                                    handleUpdateCriterionResult(criterion.id, { selectedOptionId: opt.id });
                                                  }
                                                }}
                                                className={`relative flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all group outline-none ${String(result.selectedOptionId).trim() === String(opt.id).trim()
                                                  ? 'bg-white border-[#003B71] ring-4 ring-blue-50 shadow-lg -translate-y-0.5'
                                                  : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'
                                                  } ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale-[0.3]' : 'cursor-pointer hover:scale-[1.01] active:scale-[0.98]'}`}
                                              >
                                                <span className={`text-[11px] font-black uppercase tracking-tight text-left ${String(result.selectedOptionId).trim() === String(opt.id).trim() ? 'text-[#003B71]' : 'text-slate-500'}`}>
                                                  {opt.label}
                                                </span>
                                                <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${String(result.selectedOptionId).trim() === String(opt.id).trim()
                                                  ? 'bg-[#FDB813]/20 text-[#003B71]'
                                                  : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                                                  }`}>
                                                  {opt.points} <span className="opacity-50">pts</span>
                                                </div>
                                                {String(result.selectedOptionId).trim() === String(opt.id).trim() && (
                                                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#003B71] text-white rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                  </div>
                                                )}
                                              </button>
                                            ))}
                                          </div>
                                        ) : (
                                          <button
                                            disabled={isDisabled}
                                            onClick={() => handleUpdateCriterionResult(criterion.id, { checked: !result.checked })}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all font-black text-xs ${result.checked ? 'bg-[#003B71] border-[#003B71] text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-blue-100'} ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale-[0.3]' : 'cursor-pointer hover:border-blue-200'}`}
                                          >
                                            <span className="uppercase tracking-widest">{result.checked ? 'Ativado' : 'Desativado'}</span>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${result.checked ? 'bg-[#FDB813] border-[#FDB813]' : 'bg-transparent border-slate-200'}`}>
                                              {result.checked && <svg className="w-3 h-3 text-[#003B71]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                          </button>
                                        )
                                      ) : (
                                        <div className="relative group/input">
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            disabled={isDisabled}
                                            value={result.value !== undefined
                                              ? (criterion.valueFormat === 'PERCENTAGE' ? formatPercentageMask(result.value) : formatCurrencyInput(result.value))
                                              : ''
                                            }
                                            onChange={(e) => {
                                              const numericValue = parseMaskedString(e.target.value);
                                              handleUpdateCriterionResult(criterion.id, { value: e.target.value === '' ? undefined : numericValue });
                                            }}
                                            className={`w-full bg-white border-2 rounded-lg pl-4 py-2.5 font-black text-xs focus:outline-none transition-all ${criterion.valueFormat === 'PERCENTAGE' ? 'pr-8' : 'pr-4'} ${result.isMet ? 'border-green-500 ring-4 ring-green-100/50 shadow-sm' : 'border-slate-200 focus:border-[#003B71]'} ${isDisabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100' : ''}`}
                                            placeholder={criterion.valueFormat === 'PERCENTAGE' ? '0,00' : 'R$ 0,00'}
                                          />
                                          {criterion.valueFormat === 'PERCENTAGE' && (
                                            <span className="absolute right-4 top-5 text-[10px] font-black text-slate-400 pointer-events-none">
                                              %
                                            </span>
                                          )}

                                          {(result.isMet || (award.scoringMode && result.score !== undefined) || (criterion.operator?.startsWith('RANKING') && result.rankIndex !== undefined)) && (
                                            <div className="mt-2 flex items-center justify-center gap-2">
                                              {result.isMet && !criterion.operator?.startsWith('RANKING') && (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100 animate-in zoom-in-95 duration-300">
                                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                  </svg>
                                                  <span className="text-[8px] font-black uppercase tracking-widest">Meta Batida</span>
                                                </div>
                                              )}
                                              {criterion.operator?.startsWith('RANKING') && result.rankIndex !== undefined && (
                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border auto animate-in zoom-in-95 duration-300 ${result.isMet ? 'bg-[#FDB813]/20 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                  <span className="text-[9px] font-black uppercase tracking-widest">{result.rankIndex + 1}º LUGAR (RANKING)</span>
                                                </div>
                                              )}
                                              {award.scoringMode && result.score !== undefined && (
                                                <span className="text-[10px] font-black text-[#003B71] bg-[#FDB813]/20 px-2 py-1 rounded-lg border border-[#FDB813]/30 animate-in slide-in-from-right-2 duration-300">
                                                  +{result.score} PTS
                                                </span>
                                              )}
                                              {!award.scoringMode && result.financialValue !== undefined && result.financialValue > 0 && (
                                                <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-1 rounded-lg border border-green-200 animate-in slide-in-from-right-2 duration-300">
                                                  + {formatCurrency(result.financialValue)}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {customAwards.filter(award => award.schoolIds.includes(activeSchoolId)).filter(award => awardCriteria.some(c => c.awardId === award.id)).length === 0 && (
                          <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest underline cursor-pointer" onClick={() => setActiveTab(AppTab.MASTER_VALUES)}>
                              Nenhum critério configurado para as premiações desta unidade. Clique aqui para configurar.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end">
                        {currentEvaluation?.isFinalized ? (
                          <button
                            onClick={handleReopenEvaluation}
                            className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-black text-xs hover:bg-slate-200 transition-all uppercase tracking-widest flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                            Reabrir para Ajustes
                          </button>
                        ) : (
                          <button
                            onClick={handleFinalize}
                            disabled={isReadOnlyMode}
                            className="bg-green-600 text-white px-10 py-4 rounded-xl font-black text-sm hover:bg-green-700 shadow-xl active:scale-95 transition-all flex items-center gap-3 uppercase tracking-[0.1em]"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Finalizar Avaliação
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-1/3">
                    <ResultsPanel
                      schoolName={activeSchool?.name || ''}
                      prizes={{
                        totalTreasurerPrize,
                        vicePrize,
                        awardedPrizes,
                        awardedValues
                      }}
                      onFinalize={handleFinalize}
                      onReopen={handleReopenEvaluation}
                      isFinalized={currentEvaluation?.isFinalized || false}
                      isReadOnly={isReadOnlyMode || activePeriod?.status === 'closed'}
                      activePeriodLabel={activePeriod?.label || ''}
                      schoolViceName={activeSchool?.viceTreasurerName}
                      vicePercentage={vicePercentage}
                    />
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  }
                  title="Aguardando Seleção"
                  description="Selecione Unidade e Período Ativo para iniciar"
                />
              )}
            </div>
          )}

          {activeTab === AppTab.REPORT && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activePeriodId ? (
                <SummaryTable
                  schools={schoolsForSummary}
                  customAwards={customAwards}
                  activePeriodLabel={activePeriod?.label || ''}
                  entityInitials={selectedEntity?.initials || 'ANRS'}
                  entityName={selectedEntity?.name || 'ANRS Contabilidade e Gestão Educacional'}
                  awardCriteria={awardCriteria}
                  evaluations={evaluations}
                  activePeriodId={activePeriodId}
                  isPeriodClosed={activePeriod?.status === 'closed'}
                />
              ) : (
                <EmptyState
                  icon={
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                    </svg>
                  }
                  title="Relatório não Carregado"
                  description="Selecione um Período no Filtro Principal acima"
                />
              )}
            </div>
          )}

          {activeTab === AppTab.COST_ANALYSIS && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CostAnalysis
                schools={schools}
                periods={periods}
                evaluations={evaluations}
                customAwards={customAwards}
                activePeriodId={activePeriodId}
                activeSchoolId={activeSchoolId}
              />
            </div>
          )}


        </div>
      </main>
      <Footer entityInitials={selectedEntity?.initials || 'ANRS'} />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        isDanger={confirmConfig.isDanger}
        confirmLabel={confirmConfig.isDanger ? "Excluir" : "Confirmar"}
      />

      {impersonatedUser && (
        <button
          onClick={handleStopImpersonation}
          className="fixed bottom-8 right-8 z-[100] flex items-center gap-2.5 px-6 py-4 bg-white border-2 border-red-100 text-red-600 rounded-2xl hover:bg-red-50 hover:border-red-200 transition-all duration-300 shadow-2xl hover:shadow-red-200/50 group animate-in slide-in-from-right-10"
        >
          <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Encerrar Inspeção</span>
            <span className="text-[9px] font-bold text-slate-400 lowercase leading-none">{impersonatedUser.email}</span>
          </div>
        </button>
      )}
    </div>
  );
};

export default App;
