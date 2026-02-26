
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import PrizeConfig from './components/PrizeConfig';
import CriteriaEvaluator from './components/CriteriaEvaluator';
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
  INITIAL_THRESHOLDS,
  INITIAL_CATEGORIES,
  INITIAL_INADIMPLENCIA_RANKING_CONFIG,
  INITIAL_MANAGEMENT_BONUS_CONFIG,
  INITIAL_ANRS_BONUS_CONFIG
} from './constants';
import {
  AwardLevel,
  Thresholds,
  Category,
  SchoolUnit,
  Period,
  Evaluation,
  InadimplenciaRankingConfig,
  ManagementBonusConfig,
  AnrsBonusConfig,
  EvaluationModel,
  User,
  Entity
} from './types';
import { calculatePoints, getAwardLevel, calculateAllPrizes } from './utils/calculations';

enum AppTab {
  UNITIES = 'UNITIES',
  MASTER_VALUES = 'MASTER_VALUES',
  EVALUATION = 'EVALUATION',
  REPORT = 'REPORT',
  COST_ANALYSIS = 'COST_ANALYSIS'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.UNITIES);
  const [thresholds, setThresholds] = useState<Thresholds>(INITIAL_THRESHOLDS);
  const [inadimplenciaRankingConfig, setInadimplenciaRankingConfig] = useState<InadimplenciaRankingConfig>(INITIAL_INADIMPLENCIA_RANKING_CONFIG);
  const [managementBonusConfig, setManagementBonusConfig] = useState<ManagementBonusConfig>(INITIAL_MANAGEMENT_BONUS_CONFIG);
  const [anrsBonusConfig, setAnrsBonusConfig] = useState<AnrsBonusConfig>(INITIAL_ANRS_BONUS_CONFIG);
  const [schoolCustomCategories, setSchoolCustomCategories] = useState<Record<string, Category[]>>({});
  const [schools, setSchools] = useState<SchoolUnit[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isOperatorMode, setIsOperatorMode] = useState(false);
  const [showEntities, setShowEntities] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
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
    return email === 'cecconjunior@yahoo.com.br' ||
      email === 'renanlceccon@yahoo.com.br' ||
      email.endsWith('@anrs.com.br');
  }, [session, impersonatedUser]);

  const selectedEntity = useMemo(() => {
    return entities.find(e => e.id === selectedEntityId) || null;
  }, [entities, selectedEntityId]);

  const isReadOnlyMode = useMemo(() => {
    return !!impersonatedUser && !isOperatorMode;
  }, [impersonatedUser, isOperatorMode]);

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
      localStorage.setItem(`premacao_${key} `, JSON.stringify(data));
    }
  };

  useEffect(() => {
    const initApp = async () => {
      if (!session) {
        if (!authLoading) setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const isImpersonating = !!impersonatedUser;
        const targetUserId = impersonatedUser?.id || session.user.id;
        let profile = null;

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
            const mappedSchools: SchoolUnit[] = schoolsData.map((s: any) => {
              let cats = s.custom_categories || INITIAL_CATEGORIES;

              const latestInadimplencia = INITIAL_CATEGORIES.find(c => c.id === 'inadimplencia_mes');
              if (latestInadimplencia && cats) {
                const idx = cats.findIndex((c: Category) => c.id === 'inadimplencia_mes');
                if (idx !== -1) {
                  // FORCE points to 0 on old evaluations for this specific category
                  cats[idx].options = cats[idx].options.map(opt => ({ ...opt, points: 0 }));

                  const currentThresholds = cats[idx].metricThresholds || [];
                  const latestThresholds = latestInadimplencia.metricThresholds || [];
                  if (JSON.stringify(currentThresholds) !== JSON.stringify(latestThresholds)) {
                    const newCats = [...cats];
                    newCats[idx] = latestInadimplencia;
                    cats = newCats;
                  }
                }
              }

              return {
                id: s.id,
                name: s.name,
                targets: s.targets || {},
                treasurerName: s.treasurer_name,
                treasurerCpf: s.treasurer_cpf,
                viceTreasurerName: s.vice_treasurer_name,
                viceTreasurerCpf: s.vice_treasurer_cpf,
                isLocked: s.is_locked,
                custom_categories: cats
              };
            });
            setSchools(mappedSchools);

            const customCats: Record<string, Category[]> = {};
            mappedSchools.forEach((s) => {
              if (s.custom_categories) customCats[s.id] = s.custom_categories;
            });
            setSchoolCustomCategories(customCats);
          }

          if (periodsData) setPeriods(periodsData as Period[]);

          if (evaluationsData) {
            const mappedEvals: Evaluation[] = evaluationsData.map((e: any) => ({
              schoolId: e.school_id,
              periodId: e.period_id,
              selections: e.selections || {},
              realizedValues: e.realized_values || {},
              inadimplenciaRankingPercentage: e.inadimplencia_ranking_percentage,
              isFinalized: e.is_finalized,
              calculatedAt: e.calculated_at,
              snapshot: e.snapshot
            }));
            setEvaluations(mappedEvals);
          }

          if (configData) {
            if (configData.thresholds) setThresholds(configData.thresholds);
            if (configData.inadimplencia_ranking_config) setInadimplenciaRankingConfig(configData.inadimplencia_ranking_config);
            if (configData.management_bonus_config) setManagementBonusConfig(configData.management_bonus_config);
            if (configData.anrs_bonus_config) setAnrsBonusConfig(configData.anrs_bonus_config);
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
            const customCats: Record<string, Category[]> = {};
            parsedSchools.forEach((s: any) => {
              if (s.custom_categories) customCats[s.id] = s.custom_categories;
            });
            setSchoolCustomCategories(customCats);
          }
          if (localPeriods) setPeriods(JSON.parse(localPeriods));
          if (localEvals) setEvaluations(JSON.parse(localEvals));
          if (localConfig) {
            const cfg = JSON.parse(localConfig);
            setThresholds(cfg.thresholds || INITIAL_THRESHOLDS);
            setInadimplenciaRankingConfig(cfg.inadimplencia_ranking_config || INITIAL_INADIMPLENCIA_RANKING_CONFIG);
            setManagementBonusConfig(cfg.management_bonus_config || INITIAL_MANAGEMENT_BONUS_CONFIG);
            setAnrsBonusConfig(cfg.anrs_bonus_config || INITIAL_ANRS_BONUS_CONFIG);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, [session, authLoading, impersonatedUser, selectedEntityId]);

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

  // Configurações efetivas: Se o periodo está fechado, usamos o que foi congelado no snapshot. 
  // Se está aberto, as mudanças globais no master impactam os resultados (conforme regra do usuário).
  const effectiveBonusConfig = useMemo(() => {
    if (activePeriod?.status === 'closed' && currentEvaluation?.snapshot?.bonusConfigs) {
      return currentEvaluation.snapshot.bonusConfigs;
    }
    return {
      managementBonusConfig,
      anrsBonusConfig,
      inadimplenciaRankingConfig,
      thresholds
    };
  }, [activePeriod?.status, currentEvaluation, managementBonusConfig, anrsBonusConfig, inadimplenciaRankingConfig, thresholds]);

  const activeCategories = useMemo(() => {
    const base = activeSchoolId
      ? (schoolCustomCategories[activeSchoolId] || INITIAL_CATEGORIES)
      : INITIAL_CATEGORIES;

    const { managementBonusConfig: mgmt, anrsBonusConfig: anrs, inadimplenciaRankingConfig: inad } = effectiveBonusConfig;

    return base.filter(cat => {
      if (cat.id === 'adiantamentos' || cat.id === 'cartao_corporativo') {
        return mgmt.enabled;
      }
      if (cat.id === 'orcamento_bi' || cat.id === 'descontos_concedidos') {
        return anrs.enabled;
      }
      if (cat.id === 'inadimplencia_mes') {
        return inad.enabled || anrs.enabled;
      }
      return true;
    });
  }, [activeSchoolId, schoolCustomCategories, effectiveBonusConfig]);

  const metricCategories = useMemo(() => activeCategories.filter(c => c.evaluationModel !== EvaluationModel.MANUAL), [activeCategories]);


  const selections = useMemo(() => currentEvaluation?.selections || {}, [currentEvaluation]);
  const realizedValues = useMemo(() => currentEvaluation?.realizedValues || {}, [currentEvaluation]);
  const inadimplenciaRankingPercentage = useMemo(() => currentEvaluation?.inadimplenciaRankingPercentage, [currentEvaluation]);

  const totalPoints = useMemo(() => {
    // Se o periodo estiver FECHADO, usamos o valor congelado do snapshot.
    // Se o periodo estiver ABERTO, recalculamos para refletir mudanças dinâmicas na ativação/inativação.
    if (activePeriod?.status === 'closed' && currentEvaluation?.snapshot) {
      return currentEvaluation.snapshot.totalPoints;
    }

    const targets = activeSchool?.targets || {};
    return activeCategories.reduce((acc, cat) => {
      const p = calculatePoints(cat, selections[cat.id], realizedValues[cat.id], targets[cat.id] || 0, activePeriod?.label);
      return acc + p;
    }, 0);
  }, [selections, realizedValues, activeCategories, activeSchool, activePeriod, currentEvaluation]);

  const schoolsForSummary = useMemo(() => {
    return schools.map(s => {
      const evalData = evaluations.find(e => e.schoolId === s.id && e.periodId === activePeriodId);
      return {
        ...s,
        selections: evalData?.selections || {},
        realizedValues: evalData?.realizedValues || {},
        inadimplenciaRankingPercentage: evalData?.inadimplenciaRankingPercentage,
        isFinalized: evalData?.isFinalized || false,
        categories: schoolCustomCategories[s.id] || INITIAL_CATEGORIES,
        snapshot: evalData?.snapshot
      };
    });
  }, [schools, evaluations, activePeriodId, schoolCustomCategories]);

  const allPeriodEvaluationsForPrizes = useMemo(() => {
    if (!activePeriodId) return [];
    return schoolsForSummary.map(s => ({
      schoolId: s.id,
      inadimplenciaRankingPercentage: s.inadimplenciaRankingPercentage,
      categories: s.categories,
      selections: s.selections,
      realizedValues: s.realizedValues,
      targets: s.targets,
      periodLabel: activePeriod?.label,
      isFinalized: s.isFinalized
    }));
  }, [schoolsForSummary, activePeriodId, activePeriod]);

  const { inadimplenciaRankingBonus, managementBonus, anrsBonus, totalTreasurerPrize, vicePrize, level, inadimplenciaRank } = useMemo(() => {
    if (!activeSchoolId || !activePeriodId) {
      return {
        inadimplenciaRankingBonus: 0, managementBonus: 0, anrsBonus: 0,
        totalTreasurerPrize: 0, vicePrize: 0, level: AwardLevel.NONE,
        inadimplenciaRank: undefined,
      };
    }

    // Calculamos os prêmios live
    const livePrizes = calculateAllPrizes(
      totalPoints, thresholds, inadimplenciaRankingConfig, managementBonusConfig, anrsBonusConfig,
      allPeriodEvaluationsForPrizes, activeSchoolId, activePeriod?.label,
      !!activeSchool?.viceTreasurerName
    );

    // Se estiver finalizado, usamos o bônus de Ranking live (pois depende de terceiros), 
    // mas mantemos os outros congelados no snapshot (Gestão e Meta ANRS),
    // respeitando TAMBÉM o status de ativação que estava no momento da finalização.
    if (currentEvaluation?.isFinalized && currentEvaluation.snapshot) {
      const snap = currentEvaluation.snapshot;
      const { managementBonusConfig: snapMgmt, anrsBonusConfig: snapAnrs, inadimplenciaRankingConfig: snapInad } = effectiveBonusConfig;

      const finalInadBonus = snapInad.enabled ? livePrizes.inadimplenciaRankingBonus : 0;
      const finalMgmtBonus = snapMgmt.enabled ? (snap.managementBonusValue || 0) : 0;
      const finalAnrsBonus = snapAnrs.enabled ? (snap.anrsBonusValue || 0) : 0;

      const total = finalInadBonus + finalMgmtBonus + finalAnrsBonus;
      const hasVice = !!(snap.viceTreasurerName || activeSchool?.viceTreasurerName);

      return {
        inadimplenciaRankingBonus: finalInadBonus,
        managementBonus: finalMgmtBonus,
        anrsBonus: finalAnrsBonus,
        totalTreasurerPrize: total,
        vicePrize: hasVice ? total * 0.5 : 0,
        level: snap.awardLevel,
        inadimplenciaRank: livePrizes.inadimplenciaRank,
      };
    }

    return livePrizes;
  }, [totalPoints, thresholds, inadimplenciaRankingConfig, managementBonusConfig, anrsBonusConfig, allPeriodEvaluationsForPrizes, activeSchoolId, activePeriodId, activePeriod, currentEvaluation, effectiveBonusConfig]);

  const awardLevel = level;

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

  const handleTogglePeriodStatus = async (id: string) => {
    const period = periods.find(p => p.id === id);
    if (!period) return;
    const newStatus = period.status === 'open' ? 'closed' : 'open';

    // Restrição: Não permitir fechar período se houver unidades em aberto
    if (newStatus === 'closed') {
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

    // 1. Atualiza Localmente INSTANTANEAMENTE (Sem lag)
    const current = evaluations.find(e => e.schoolId === activeSchoolId && e.periodId === activePeriodId) || {
      schoolId: activeSchoolId,
      periodId: activePeriodId,
      selections: {},
      realizedValues: {},
      isFinalized: false
    };

    const updatedEval = { ...current, ...updates };
    const newEvaluations = evaluations.some(e => e.schoolId === activeSchoolId && e.periodId === activePeriodId)
      ? evaluations.map(e => (e.schoolId === activeSchoolId && e.periodId === activePeriodId) ? updatedEval : e)
      : [...evaluations, updatedEval];

    setEvaluations(newEvaluations);
    saveLocally('evaluations', newEvaluations);

    // 2. Grava no Supabase com DEBOUNCE (Silencioso e sem travar a UI)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (isConfigured && supabase) {
        const dbPayload: any = {
          school_id: updatedEval.schoolId,
          period_id: updatedEval.periodId,
          selections: updatedEval.selections,
          realized_values: updatedEval.realizedValues,
          inadimplencia_ranking_percentage: updatedEval.inadimplenciaRankingPercentage,
          is_finalized: updatedEval.isFinalized,
          calculated_at: updatedEval.calculatedAt,
          snapshot: updatedEval.snapshot
        };

        if (selectedEntityId) dbPayload.entity_id = selectedEntityId;
        else dbPayload.user_id = session.user.id;

        await supabase.from('evaluations').upsert(dbPayload, { onConflict: 'school_id,period_id' });
      }
    }, 1000); // Aguarda 1 segundo após o último toque antes de subir pra nuvem
  };

  const handleSelection = (categoryId: string, optionId: string) => {
    if (!activeSchoolId || !activePeriodId || activePeriod?.status === 'closed' || currentEvaluation?.isFinalized) return;
    const newSelections = { ...selections };
    if (newSelections[categoryId] === optionId) delete newSelections[categoryId];
    else newSelections[categoryId] = optionId;
    updateEvaluation({ selections: newSelections });
  };

  const handleMetricInput = (categoryId: string, value: number) => {
    if (!activeSchoolId || !activePeriodId || activePeriod?.status === 'closed' || currentEvaluation?.isFinalized) return;
    updateEvaluation({ realizedValues: { ...realizedValues, [categoryId]: value } });
  };

  const handleInadimplenciaRankingInput = (value: number) => {
    if (!activeSchoolId || !activePeriodId || activePeriod?.status === 'closed' || currentEvaluation?.isFinalized) return;

    // Atualiza tanto o ranking quanto o realizado da categoria inadimplencia_mes
    const updatedRealizedValues = { ...realizedValues, inadimplencia_mes: value };

    const evaluationUpdates: Partial<Evaluation> = {
      inadimplenciaRankingPercentage: value,
      realizedValues: updatedRealizedValues
    };

    updateEvaluation(evaluationUpdates);
  };

  const handleFinalize = async () => {
    if (!activeSchoolId || !activePeriodId || !activeSchool) return;

    // Validação: Verificar se todos os campos estão preenchidos
    const missingFields: string[] = [];

    // 1. Verificar Ranking de Inadimplência
    if (inadimplenciaRankingPercentage === undefined || inadimplenciaRankingPercentage === null) {
      missingFields.push("Inadimplência para Ranking");
    }

    // 2. Verificar Categorias Ativas
    activeCategories.forEach(cat => {
      // Pula validação se o alvo for obrigatório e estiver faltando (o critério estaria desabilitado/não avaliado)
      // Mas se o usuário deve ignorar, ele não preenche. Se a regra é "toda a avaliação", assumimos que
      // critérios habilitados devem ter valor.

      const isTargetRequired = cat.id === 'orcamento_bi' || cat.id === 'descontos_concedidos';
      const target = activeSchool.targets?.[cat.id] || 0;

      // Se falta meta obrigatória, tecnicamente não dá pra avaliar. Vamos considerar que se não tem meta,
      // ele não bloqueia o salvamento (pois o critério conta como 0 pts).
      if (isTargetRequired && target <= 0) return;

      const model = cat.evaluationModel;

      if (model === EvaluationModel.MANUAL || !model) {
        if (!selections[cat.id]) {
          missingFields.push(cat.name);
        }
      } else {
        // Modelos métricos
        if (realizedValues[cat.id] === undefined || realizedValues[cat.id] === null) {
          missingFields.push(cat.name);
        }
      }
    });

    if (missingFields.length > 0) {
      alert(`Não é possível finalizar a avaliação. Os seguintes itens não foram preenchidos:\n\n- ${missingFields.join('\n- ')}\n\nPor favor, complete todas as avaliações.`);
      return;
    }

    const snapshot = {
      treasurerName: activeSchool.treasurerName,
      treasurerCpf: activeSchool.treasurerCpf,
      viceTreasurerName: activeSchool.viceTreasurerName,
      viceTreasurerCpf: activeSchool.viceTreasurerCpf,
      managementBonusValue: managementBonus,
      anrsBonusValue: anrsBonus,
      inadimplenciaRankingBonusValue: inadimplenciaRankingBonus,
      totalTreasurerPrize: totalTreasurerPrize,
      vicePrize: vicePrize,
      totalPoints: totalPoints,
      inadimplenciaRank: inadimplenciaRank,
      awardLevel: awardLevel,
      // CONGELA as configurações de ativação e valores no momento da finalização
      bonusConfigs: {
        managementBonusConfig: { ...managementBonusConfig },
        anrsBonusConfig: { ...anrsBonusConfig },
        inadimplenciaRankingConfig: { ...inadimplenciaRankingConfig },
        thresholds: { ...thresholds }
      }
    };

    await updateEvaluation({
      isFinalized: true,
      calculatedAt: new Date().toISOString(),
      snapshot
    });

    // 3. Verificar se todas as escolas do período já foram finalizadas
    const finalizedIds = new Set(evaluations.filter(e => e.periodId === activePeriodId && e.isFinalized).map(e => e.schoolId));
    finalizedIds.add(activeSchoolId);

    if (finalizedIds.size === schools.length && activePeriod?.status === 'open') {
      setTimeout(() => {
        showConfirm(
          "Fechar Período?",
          "Todas as unidades deste período foram finalizadas com sucesso. Deseja fechar o período agora para impedir novas edições?",
          () => {
            handleTogglePeriodStatus(activePeriodId!);
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          }
        );
      }, 600);
    }
  };

  const handleReopenEvaluation = () => {
    if (!activeSchoolId || !activePeriodId) return;

    // Restrição: Para reabrir avaliação é preciso reabrir o período
    if (activePeriod?.status === 'closed') {
      alert("Não é possível reabrir a avaliação pois o período está FECHADO. Reabra o período primeiro para permitir ajustes.");
      return;
    }

    showConfirm(
      'Reabrir Avaliação',
      "Deseja reabrir esta avaliação para ajustes? Isso permitirá editar critérios e os valores realizados.",
      () => {
        updateEvaluation({ isFinalized: false, snapshot: undefined });
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    );
  };

  const handleUpdateCategories = async (updated: Category[]) => {
    // 1. Atualiza Localmente para TODAS as escolas (Sincronização Global)
    setSchoolCustomCategories(prev => {
      const newState: Record<string, Category[]> = {};
      schools.forEach(s => {
        newState[s.id] = updated;
      });

      setSchools(currentSchools => {
        const updatedSchools = currentSchools.map(s => ({ ...s, custom_categories: updated }));
        saveLocally('schools', updatedSchools);
        return updatedSchools;
      });

      return newState;
    });

    // 2. Grava no Supabase para TODAS as escolas (Update em massa)
    if (isConfigured && supabase) {
      // Usamos .neq('id', '00000000-0000-0000-0000-000000000000') ou simplesmente um filtro que pegue todos
      // O Supabase não permite update sem filtro, então pegamos as ids atuais
      const schoolIds = schools.map(s => s.id);
      if (schoolIds.length > 0) {
        await supabase.from('schools').update({ custom_categories: updated }).in('id', schoolIds);
      }
    }
  };

  const handleAddSchool = async (payload: Partial<SchoolUnit>) => {
    setSyncing(true);
    const newId = crypto.randomUUID();

    const currentCategories = schools.length > 0
      ? (schools[0].custom_categories || INITIAL_CATEGORIES)
      : INITIAL_CATEGORIES;

    const newSchool: SchoolUnit = {
      id: newId,
      name: payload.name || 'Nova Unidade',
      targets: payload.targets || {},
      treasurerName: payload.treasurerName,
      treasurerCpf: payload.treasurerCpf,
      viceTreasurerName: payload.viceTreasurerName,
      viceTreasurerCpf: payload.viceTreasurerCpf,
      isLocked: payload.isLocked || false,
      custom_categories: currentCategories
    };

    if (isConfigured && supabase) {
      const insertData: any = {
        name: newSchool.name,
        targets: newSchool.targets,
        treasurer_name: newSchool.treasurerName,
        treasurer_cpf: newSchool.treasurerCpf,
        vice_treasurer_name: newSchool.viceTreasurerName,
        vice_treasurer_cpf: newSchool.viceTreasurerCpf,
        is_locked: newSchool.isLocked,
        custom_categories: currentCategories
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
          isLocked: data.is_locked,
          custom_categories: data.custom_categories
        };
        setSchools(prev => [...prev, mapped]);
        setActiveSchoolId(mapped.id);
        setSchoolCustomCategories(prev => ({ ...prev, [mapped.id]: currentCategories }));
      }
    } else {
      const updated = [...schools, newSchool];
      setSchools(updated);
      saveLocally('schools', updated);
      setSchoolCustomCategories(prev => ({ ...prev, [newId]: currentCategories }));
      setActiveSchoolId(newId);
    }
    setSyncing(false);
  };

  const handleUpdateTargets = async (schoolId: string, targets: Record<string, number>, additionalData?: Partial<SchoolUnit>) => {
    setSyncing(true);
    if (isConfigured && supabase) {
      const updatePayload: any = { targets };
      if (additionalData) {
        if (additionalData.treasurerName !== undefined) updatePayload.treasurer_name = additionalData.treasurerName;
        if (additionalData.treasurerCpf !== undefined) updatePayload.treasurer_cpf = additionalData.treasurerCpf;
        if (additionalData.viceTreasurerName !== undefined) updatePayload.vice_treasurer_name = additionalData.viceTreasurerName;
        if (additionalData.viceTreasurerCpf !== undefined) updatePayload.vice_treasurer_cpf = additionalData.viceTreasurerCpf;
        if (additionalData.isLocked !== undefined) updatePayload.is_locked = additionalData.isLocked;
      }
      await supabase.from('schools').update(updatePayload).eq('id', schoolId);
    }

    const updatedSchools = schools.map(s => s.id === schoolId ? { ...s, ...additionalData, targets } : s);
    setSchools(updatedSchools);
    saveLocally('schools', updatedSchools);
    setSyncing(false);
  };

  const handleRemoveSchool = (id: string) => {
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

  const handleUpdateAllBonusConfig = async (
    newThresholds: Thresholds,
    newInadRanking: InadimplenciaRankingConfig,
    newMgmtBonus: ManagementBonusConfig,
    newAnrsBonus: AnrsBonusConfig
  ) => {
    setSyncing(true);
    if (isConfigured && supabase && session?.user?.id) {
      const targetId = selectedEntityId ? { entity_id: selectedEntityId } : { user_id: impersonatedUser?.id || session.user.id };

      await supabase.from('app_config').upsert({
        ...targetId,
        thresholds: newThresholds,
        inadimplencia_ranking_config: newInadRanking,
        management_bonus_config: newMgmtBonus,
        anrs_bonus_config: newAnrsBonus,
        updated_at: new Date().toISOString()
      }, { onConflict: selectedEntityId ? 'entity_id' : 'user_id' });
    }
    setThresholds(newThresholds);
    setInadimplenciaRankingConfig(newInadRanking);
    setManagementBonusConfig(newMgmtBonus);
    setAnrsBonusConfig(newAnrsBonus);

    saveLocally('config', {
      thresholds: newThresholds,
      inadimplencia_ranking_config: newInadRanking,
      management_bonus_config: newMgmtBonus,
      anrs_bonus_config: newAnrsBonus
    });
    setSyncing(false);
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
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
      {/* Barra de Filtros (Oculta na aba de Cadastro de Premiações) */}
      {activeTab !== AppTab.MASTER_VALUES && (
        <main className="mx-auto px-2 sm:px-4 md:px-6 lg:px-8 pt-6 dashboard-container relative z-20">
          <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-3.5 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">

              {/* Dropdown Unidade Escolar Customizado - Oculto na aba Relatórios */}
              {activeTab !== AppTab.REPORT && (
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
                  className={`w-full flex justify-between items-center bg-slate-50 border-2 rounded-xl px-3.5 py-2 text-xs font-black transition-all outline-none ${activePeriodId ? 'border-[#FDB813] text-slate-800 bg-white ring-4 ring-[#FDB813]/5 shadow-lg shadow-[#FDB813]/10' : 'border-slate-100 text-slate-400'
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
        </main>
      )}

      <main className="mx-auto px-4 pt-6 pb-20 dashboard-container relative z-10">


        {activeTab === AppTab.UNITIES && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SchoolManager
              schools={schools}
              activeSchoolId={activeSchoolId}
              metricCategories={metricCategories}
              onAddSchool={handleAddSchool}
              onRemoveSchool={handleRemoveSchool}
              onSelectSchool={setActiveSchoolId}
              onUpdateTargets={handleUpdateTargets}
              isReadOnly={isReadOnlyMode}
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
              thresholds={thresholds}
              inadimplenciaRankingConfig={inadimplenciaRankingConfig}
              managementBonusConfig={managementBonusConfig}
              anrsBonusConfig={anrsBonusConfig}
              onUpdateAllBonusConfig={handleUpdateAllBonusConfig}
              isReadOnly={isReadOnlyMode}
              entityInitials={selectedEntity?.initials || 'ANRS'}
            />
          </div>
        )}

        {activeTab === AppTab.EVALUATION && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeSchoolId && activePeriodId ? (
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-2/3">
                  <CriteriaEvaluator
                    categories={activeCategories}
                    schoolName={activeSchool?.name || ''}
                    selections={selections}
                    realizedValues={realizedValues}
                    schoolTargets={activeSchool?.targets || {}}
                    inadimplenciaRankingPercentage={inadimplenciaRankingPercentage}
                    isReadOnly={isReadOnlyMode || activePeriod?.status === 'closed' || currentEvaluation?.isFinalized || false}
                    onSelect={handleSelection}
                    onMetricInput={handleMetricInput}
                    onInadimplenciaRankingInput={handleInadimplenciaRankingInput}
                    onUpdateCategories={handleUpdateCategories}
                    activePeriodLabel={activePeriod?.label}
                    managementBonusConfig={effectiveBonusConfig.managementBonusConfig}
                    anrsBonusConfig={effectiveBonusConfig.anrsBonusConfig}
                    inadimplenciaRankingConfig={effectiveBonusConfig.inadimplenciaRankingConfig}
                  />
                </div>
                <div className="w-full lg:w-1/3">
                  <ResultsPanel
                    totalPoints={totalPoints}
                    awardLevel={awardLevel}
                    inadimplenciaRankingBonus={inadimplenciaRankingBonus}
                    managementBonus={managementBonus}
                    anrsBonus={anrsBonus}
                    totalTreasurerPrize={totalTreasurerPrize}
                    vicePrize={vicePrize}
                    isFinalized={currentEvaluation?.isFinalized || false}
                    isReadOnly={isReadOnlyMode}
                    inadimplenciaRank={inadimplenciaRank}
                    onFinalize={handleFinalize}
                    onReopen={handleReopenEvaluation}
                    schoolName={activeSchool?.name}
                    periodLabel={activePeriod?.label}
                    managementBonusConfig={effectiveBonusConfig.managementBonusConfig}
                    anrsBonusConfig={effectiveBonusConfig.anrsBonusConfig}
                    inadimplenciaRankingConfig={effectiveBonusConfig.inadimplenciaRankingConfig}
                    entityInitials={selectedEntity?.initials || 'ANRS'}
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
                schools={schoolsForSummary as any[]}
                thresholds={thresholds}
                inadimplenciaRankingConfig={inadimplenciaRankingConfig}
                managementBonusConfig={managementBonusConfig}
                anrsBonusConfig={anrsBonusConfig}
                activePeriodLabel={activePeriod?.label || ''}
                allPeriodEvaluations={allPeriodEvaluationsForPrizes}
                entityInitials={selectedEntity?.initials || 'ANRS'}
                entityName={selectedEntity?.name || 'ANRS Contabilidade e Gestão Educacional'}
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
              thresholds={thresholds}
              inadimplenciaRankingConfig={inadimplenciaRankingConfig}
              managementBonusConfig={managementBonusConfig}
              anrsBonusConfig={anrsBonusConfig}
              activePeriodId={activePeriodId}
              activeSchoolId={activeSchoolId}
            />
          </div>
        )}
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

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/5551982981329"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-[90] flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#128C7E] hover:scale-110 hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#25D366]/30"
        title="Fale com nosso Suporte"
      >
        <svg fill="currentColor" viewBox="0 0 308 308" className="w-7 h-7">
          <path d="M227.904 176.981c-.6-.288-23.054-11.345-26.693-12.637-1.629-.576-3.656-1.248-6.168-.384-2.52.864-10.408 6.768-12.768 8.196-2.352 1.416-4.008 1.62-7.44.324-3.432-1.296-14.472-5.328-27.576-16.98-10.2-9.072-17.088-20.28-19.104-23.712-2.016-3.432-.216-5.28 1.512-6.996 1.56-1.536 3.432-4.008 5.16-6.012 1.728-2.004 2.304-3.432 3.456-5.724 1.152-2.304.576-4.308-.288-6.012-.864-1.716-7.836-18.96-10.8-25.92-2.784-6.504-5.76-5.724-7.836-5.724-2.088-.048-4.392-.048-6.72-.048-2.328 0-6.096.864-9.312 4.308-3.216 3.432-12.264 11.952-12.264 29.16s12.552 33.816 14.304 36.132c1.728 2.304 24.408 38.808 60.096 52.848 8.388 3.312 14.928 5.292 20.04 6.768 8.424 2.688 16.092 2.304 22.152 1.392 6.756-1.008 23.054-9.408 26.304-18.48 3.252-9.084 3.252-16.86 2.28-18.48-.972-1.62-3.576-2.58-7.512-4.56zM156.734 0C73.318 0 5.454 67.354 5.454 150.143c0 26.777 7.166 52.988 20.741 75.928L.045 308l84.129-25.286c21.678 11.924 46.261 18.226 71.609 18.226h.06C239.271 300.94 308 233.59 308 150.143 308 67.354 240.143 0 156.734 0zm0 275.9c-22.74 0-45.06-6.132-64.428-17.7l-4.608-2.736-47.868 12.564 12.816-46.656-3.012-4.776C37.122 197.926 30.5 174.546 30.5 150.143 30.5 81.349 87.477 25.05 156.854 25.05c33.588 0 65.172 13.116 88.932 36.924 23.748 23.832 36.828 55.476 36.828 89.16-.06 69.444-57.036 124.766-125.88 124.766z" />
        </svg>
      </a>
    </div>
  );
};

export default App;
