
import React, { useState, useEffect } from 'react';
import { AwardLevel, Thresholds, InadimplenciaRankingConfig, ManagementBonusConfig, AnrsBonusConfig, SchoolUnit } from '../types';
import ConfirmModal from './ConfirmModal';

interface PrizeConfigProps {
  // Removido: prizeValues: PrizeValues;
  schools: SchoolUnit[];
  thresholds: Thresholds;
  inadimplenciaRankingConfig: InadimplenciaRankingConfig;
  managementBonusConfig: ManagementBonusConfig;
  anrsBonusConfig: AnrsBonusConfig;
  onUpdateAllBonusConfig: (
    // Removido: values: PrizeValues,
    thresholds: Thresholds,
    inadimplenciaRanking: InadimplenciaRankingConfig,
    managementBonus: ManagementBonusConfig,
    anrsBonus: AnrsBonusConfig
  ) => void;
  isReadOnly?: boolean;
  entityInitials: string;
}

const PrizeConfig: React.FC<PrizeConfigProps> = ({
  // Removido: prizeValues, 
  schools,
  thresholds,
  inadimplenciaRankingConfig,
  managementBonusConfig,
  anrsBonusConfig,
  onUpdateAllBonusConfig,
  isReadOnly = false,
  entityInitials
}) => {
  const [isLocked, setIsLocked] = useState(true);
  // Removido: const [localValues, setLocalValues] = useState<PrizeValues>(prizeValues);
  const [localThresholds, setLocalThresholds] = useState<Thresholds>(thresholds);
  const [localInadimplenciaRankingConfig, setLocalInadimplenciaRankingConfig] = useState<InadimplenciaRankingConfig>(inadimplenciaRankingConfig);
  const [localManagementBonusConfig, setLocalManagementBonusConfig] = useState<ManagementBonusConfig>(managementBonusConfig);
  const [localAnrsBonusConfig, setLocalAnrsBonusConfig] = useState<AnrsBonusConfig>(anrsBonusConfig);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationModal, setValidationModal] = useState<{ show: boolean, title: string, message: string }>({ show: false, title: '', message: '' });

  const [displayValues, setDisplayValues] = useState<Record<string, string>>({
    // Removido: [AwardLevel.GOLD]: (prizeValues[AwardLevel.GOLD] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    // Removido: [AwardLevel.SILVER]: (prizeValues[AwardLevel.SILVER] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    // Removido: [AwardLevel.BRONZE]: (prizeValues[AwardLevel.BRONZE] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    'inad_rank_1': (inadimplenciaRankingConfig.firstPlace || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    'inad_rank_2': (inadimplenciaRankingConfig.secondPlace || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    'inad_rank_3': (inadimplenciaRankingConfig.thirdPlace || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    'management_bonus': (managementBonusConfig.bonusValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    'anrs_bonus': (anrsBonusConfig.bonusValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
  });

  useEffect(() => {
    // Removido: setLocalValues(prizeValues);
    setLocalThresholds(thresholds);
    setLocalInadimplenciaRankingConfig(inadimplenciaRankingConfig);
    setLocalManagementBonusConfig(managementBonusConfig);
    setLocalAnrsBonusConfig(anrsBonusConfig);

    setDisplayValues({
      // Removido: [AwardLevel.GOLD]: (prizeValues[AwardLevel.GOLD] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      // Removido: [AwardLevel.SILVER]: (prizeValues[AwardLevel.SILVER] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      // Removido: [AwardLevel.BRONZE]: (prizeValues[AwardLevel.BRONZE] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      'inad_rank_1': (inadimplenciaRankingConfig.firstPlace || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      'inad_rank_2': (inadimplenciaRankingConfig.secondPlace || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      'inad_rank_3': (inadimplenciaRankingConfig.thirdPlace || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      'management_bonus': (managementBonusConfig.bonusValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      'anrs_bonus': (anrsBonusConfig.bonusValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    });
  }, [/* Removido: prizeValues, */ thresholds, inadimplenciaRankingConfig, managementBonusConfig, anrsBonusConfig]);

  const handleSave = () => {
    onUpdateAllBonusConfig(
      // Removido: localValues,
      localThresholds,
      localInadimplenciaRankingConfig,
      localManagementBonusConfig,
      localAnrsBonusConfig
    );
    setShowSuccess(true);
    setIsLocked(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleCurrencyChange = (key: string, value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    const numericValue = Number(cleanValue) / 100;

    if (key.startsWith('inad_rank')) {
      if (key === 'inad_rank_1') setLocalInadimplenciaRankingConfig(prev => ({ ...prev, firstPlace: numericValue }));
      if (key === 'inad_rank_2') setLocalInadimplenciaRankingConfig(prev => ({ ...prev, secondPlace: numericValue }));
      if (key === 'inad_rank_3') setLocalInadimplenciaRankingConfig(prev => ({ ...prev, thirdPlace: numericValue }));
    } else if (key === 'management_bonus') {
      setLocalManagementBonusConfig(prev => ({ ...prev, bonusValue: numericValue }));
    } else if (key === 'anrs_bonus') {
      setLocalAnrsBonusConfig(prev => ({ ...prev, bonusValue: numericValue }));
    } else {
      // Removido: setLocalValues(prev => ({ ...prev, [key]: numericValue }));
    }

    const formatted = numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setDisplayValues(prev => ({ ...prev, [key]: formatted }));
  };

  // Removido: rankingLevels, pois a seção de ranking principal foi removida.

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 relative overflow-hidden transition-all duration-500 ${isLocked ? 'opacity-95' : 'ring-2 ring-blue-500/20 shadow-xl'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center">
          <span className="w-2 h-8 bg-[#003B71] rounded-full mr-3"></span>
          <div>
            <h2 className="text-xl font-bold text-slate-800 uppercase">CADASTRO DE PREMIAÇÕES</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuração de Premiação e Ranking</p>
          </div>
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-3">
            {showSuccess && (
              <span className="text-green-600 font-bold text-sm animate-pulse flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Atualizado!
              </span>
            )}

            {isLocked ? (
              <button
                onClick={() => setIsLocked(false)}
                className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-lg font-black text-xs hover:bg-slate-200 transition-all flex items-center gap-2 uppercase tracking-widest"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Editar Valores
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsLocked(true)}
                  className="text-slate-400 px-4 py-2.5 rounded-lg font-bold text-xs hover:text-slate-600 transition-all uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="bg-[#003B71] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#002a51] shadow-lg active:scale-95 transition-all flex items-center gap-2 uppercase text-xs tracking-widest"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Gravar Configuração
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Removido: Bloco Ranking de Desempenho (Pontuação Total) */}
      {/*
      <div className="mb-8">
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center">
           <span className="w-4 h-[1px] bg-slate-200 mr-2"></span>
           Ranking de Desempenho (Pontuação Total)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rankingLevels.map((level) => (
            <div key={level.key} className={`p-5 rounded-2xl border-2 transition-all ${level.color} ${isLocked ? 'border-dashed' : ''}`}>
              <h3 className="font-black text-[11px] uppercase tracking-[0.2em] mb-6 border-b border-current/20 pb-3 flex justify-between items-center">
                Nível {level.label}
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Valor Repasse (R$)</label>
                  {isLocked ? (
                    <div className="text-xl font-black text-slate-800 py-2 border-b-2 border-slate-100">
                      <span className="text-xs text-slate-300 mr-1">R$</span> {displayValues[level.key]}
                    </div>
                  ) : (
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold opacity-30 group-focus-within:opacity-100 transition-opacity">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={displayValues[level.key]}
                        onChange={(e) => handleCurrencyChange(level.key, e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all shadow-sm"
                      />
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Mínimo para Pontuação</label>
                  {isLocked ? (
                    <div className="text-xl font-black text-slate-800 py-2 border-b-2 border-slate-100">
                      {localThresholds[level.key]} <span className="text-[10px] text-slate-300 uppercase">pts</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={localThresholds[level.key]}
                      onChange={(e) => setLocalThresholds({ ...localThresholds, [level.key]: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all shadow-sm"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      */}

      {/* Novo Bloco: Premiação Inadimpl. Ranking */}
      <div className={`mb-4 p-3.5 rounded-2xl border border-blue-100/50 transition-all ${localInadimplenciaRankingConfig.enabled ? 'bg-blue-50/50' : 'bg-slate-50 opacity-60'}`}>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-[10px] font-black text-[#003B71]/60 uppercase tracking-[0.2em] flex items-center">
            <span className="w-6 h-[1px] bg-blue-200 mr-3"></span>
            Ranking de Inadimplência
          </h3>
          {!isReadOnly && !isLocked && (
            <label className="flex items-center cursor-pointer gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{localInadimplenciaRankingConfig.enabled ? 'Ativo' : 'Inativo'}</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={localInadimplenciaRankingConfig.enabled}
                  onChange={(e) => setLocalInadimplenciaRankingConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                <div className={`block w-8 h-4 rounded-full transition-colors ${localInadimplenciaRankingConfig.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${localInadimplenciaRankingConfig.enabled ? 'translate-x-4' : ''}`}></div>
              </div>
            </label>
          )}
          {isLocked && (
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${localInadimplenciaRankingConfig.enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
              {localInadimplenciaRankingConfig.enabled ? 'Ativo' : 'Inativo'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { key: 'inad_rank_1', label: '1º Lugar', value: localInadimplenciaRankingConfig.firstPlace },
            { key: 'inad_rank_2', label: '2º Lugar', value: localInadimplenciaRankingConfig.secondPlace },
            { key: 'inad_rank_3', label: '3º Lugar', value: localInadimplenciaRankingConfig.thirdPlace },
          ].map((item) => (
            <div key={item.key} className="p-3.5 rounded-xl bg-white shadow-sm border border-white flex flex-col justify-between transition-all hover:shadow-md">
              <label className="block text-[10px] font-bold uppercase text-blue-400/70 mb-1.5 tracking-[0.15em]">{item.label}</label>
              {isLocked ? (
                <div className="text-base font-black text-slate-800 leading-none flex items-baseline">
                  <span className="text-xs text-blue-300 font-bold mr-1">R$</span> {displayValues[item.key]}
                </div>
              ) : (
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold opacity-30 group-focus-within:opacity-100 transition-opacity">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={!localInadimplenciaRankingConfig.enabled}
                    value={displayValues[item.key]}
                    onChange={(e) => handleCurrencyChange(item.key, e.target.value)}
                    className={`w-full bg-blue-50/30 border border-blue-100 rounded-lg pl-9 pr-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all shadow-inner ${!localInadimplenciaRankingConfig.enabled ? 'opacity-50 grayscale' : ''}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Novo Bloco: Premiação de Gestão */}
      <div className={`mb-4 p-3.5 rounded-2xl border border-blue-100/50 transition-all ${localManagementBonusConfig.enabled ? 'bg-blue-50/50' : 'bg-slate-50 opacity-60'}`}>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-[10px] font-black text-[#003B71]/60 uppercase tracking-[0.2em] flex items-center">
            <span className="w-6 h-[1px] bg-blue-200 mr-3"></span>
            Premiação de Gestão
          </h3>
          {!isReadOnly && !isLocked && (
            <label className="flex items-center cursor-pointer gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{localManagementBonusConfig.enabled ? 'Ativo' : 'Inativo'}</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={localManagementBonusConfig.enabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const missingSchools = schools.filter(s => (s.targets?.['orcamento_bi'] || 0) <= 0);
                      if (missingSchools.length > 0) {
                        setValidationModal({
                          show: true,
                          title: 'Configuração Incompleta',
                          message: 'Para ativar a Premiação de Gestão, é necessário preencher o ORÇAMENTO ANUAL no cadastro das seguintes unidades: ' + missingSchools.map(s => s.name).join(', ') + '.'
                        });
                        return;
                      }
                    }
                    setLocalManagementBonusConfig(prev => ({ ...prev, enabled: e.target.checked }));
                  }}
                />
                <div className={`block w-8 h-4 rounded-full transition-colors ${localManagementBonusConfig.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${localManagementBonusConfig.enabled ? 'translate-x-4' : ''}`}></div>
              </div>
            </label>
          )}
          {isLocked && (
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${localManagementBonusConfig.enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
              {localManagementBonusConfig.enabled ? 'Ativo' : 'Inativo'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white shadow-sm border border-white transition-all hover:shadow-md">
            <label className="block text-[10px] font-bold uppercase text-blue-400/70 mb-1.5 tracking-[0.15em]">Mínimo para Bônus</label>
            {isLocked ? (
              <div className="text-base font-black text-slate-800 leading-none flex items-baseline">
                {localManagementBonusConfig.pointThreshold} <span className="text-xs text-blue-300 font-bold ml-1 uppercase">pts</span>
              </div>
            ) : (
              <input
                type="number"
                disabled={!localManagementBonusConfig.enabled}
                value={localManagementBonusConfig.pointThreshold}
                onChange={(e) => setLocalManagementBonusConfig(prev => ({ ...prev, pointThreshold: Number(e.target.value) }))}
                className={`w-full bg-blue-50/30 border border-blue-100 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all shadow-inner ${!localManagementBonusConfig.enabled ? 'opacity-50 grayscale' : ''}`}
              />
            )}
          </div>
          <div className="p-3.5 rounded-xl bg-white shadow-sm border border-white transition-all hover:shadow-md">
            <label className="block text-[10px] font-bold uppercase text-blue-400/70 mb-1.5 tracking-[0.15em]">Valor do Bônus</label>
            {isLocked ? (
              <div className="text-base font-black text-slate-800 leading-none flex items-baseline">
                <span className="text-xs text-blue-300 font-bold mr-1">R$</span> {displayValues['management_bonus']}
              </div>
            ) : (
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold opacity-30 group-focus-within:opacity-100 transition-opacity">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={!localManagementBonusConfig.enabled}
                  value={displayValues['management_bonus']}
                  onChange={(e) => handleCurrencyChange('management_bonus', e.target.value)}
                  className={`w-full bg-blue-50/30 border border-blue-100 rounded-lg pl-9 pr-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all shadow-inner ${!localManagementBonusConfig.enabled ? 'opacity-50 grayscale' : ''}`}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Novo Bloco: Premiação Meta ANRS */}
      <div className={`p-3.5 rounded-2xl border border-blue-100/50 transition-all ${localAnrsBonusConfig.enabled ? 'bg-blue-50/50' : 'bg-slate-50 opacity-60'}`}>
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-[10px] font-black text-[#003B71]/60 uppercase tracking-[0.2em] flex items-center">
            <span className="w-6 h-[1px] bg-blue-200 mr-3"></span>
            Premiação Meta {entityInitials}
          </h3>
          {!isReadOnly && !isLocked && (
            <label className="flex items-center cursor-pointer gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{localAnrsBonusConfig.enabled ? 'Ativo' : 'Inativo'}</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={localAnrsBonusConfig.enabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const missingSchools = schools.filter(s => (s.targets?.['descontos_concedidos'] || 0) <= 0);
                      if (missingSchools.length > 0) {
                        setValidationModal({
                          show: true,
                          title: 'Configuração Incompleta',
                          message: `Para ativar a Premiação Meta ${entityInitials}, é necessário preencher a META DE DESCONTO no cadastro das seguintes unidades: ` + missingSchools.map(s => s.name).join(', ') + '.'
                        });
                        return;
                      }
                    }
                    setLocalAnrsBonusConfig(prev => ({ ...prev, enabled: e.target.checked }));
                  }}
                />
                <div className={`block w-8 h-4 rounded-full transition-colors ${localAnrsBonusConfig.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${localAnrsBonusConfig.enabled ? 'translate-x-4' : ''}`}></div>
              </div>
            </label>
          )}
          {isLocked && (
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${localAnrsBonusConfig.enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
              {localAnrsBonusConfig.enabled ? 'Ativo' : 'Inativo'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white shadow-sm border border-white transition-all hover:shadow-md">
            <label className="block text-[10px] font-bold uppercase text-blue-400/70 mb-1.5 tracking-[0.15em]">Mínimo para Bônus</label>
            {isLocked ? (
              <div className="text-base font-black text-slate-800 leading-none flex items-baseline">
                {localAnrsBonusConfig.pointThreshold} <span className="text-xs text-blue-300 font-bold ml-1 uppercase">pts</span>
              </div>
            ) : (
              <input
                type="number"
                disabled={!localAnrsBonusConfig.enabled}
                value={localAnrsBonusConfig.pointThreshold}
                onChange={(e) => setLocalAnrsBonusConfig(prev => ({ ...prev, pointThreshold: Number(e.target.value) }))}
                className={`w-full bg-blue-50/30 border border-blue-100 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all shadow-inner ${!localAnrsBonusConfig.enabled ? 'opacity-50 grayscale' : ''}`}
              />
            )}
          </div>
          <div className="p-3.5 rounded-xl bg-white shadow-sm border border-white transition-all hover:shadow-md">
            <label className="block text-[10px] font-bold uppercase text-blue-400/70 mb-1.5 tracking-[0.15em]">Valor do Bônus</label>
            {isLocked ? (
              <div className="text-base font-black text-slate-800 leading-none flex items-baseline">
                <span className="text-xs text-blue-300 font-bold mr-1">R$</span> {displayValues['anrs_bonus']}
              </div>
            ) : (
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold opacity-30 group-focus-within:opacity-100 transition-opacity">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={!localAnrsBonusConfig.enabled}
                  value={displayValues['anrs_bonus']}
                  onChange={(e) => handleCurrencyChange('anrs_bonus', e.target.value)}
                  className={`w-full bg-blue-50/30 border border-blue-100 rounded-lg pl-9 pr-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all shadow-inner ${!localAnrsBonusConfig.enabled ? 'opacity-50 grayscale' : ''}`}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={validationModal.show}
        onCancel={() => setValidationModal({ ...validationModal, show: false })}
        onConfirm={() => setValidationModal({ ...validationModal, show: false })}
        title={validationModal.title}
        message={validationModal.message}
        confirmLabel="Entendi"
        showCancel={false}
      />
    </div>
  );
};

export default PrizeConfig;
