
import React, { useState, useEffect } from 'react';
import { SchoolUnit, Category } from '../types';
import { formatBRL, formatPercentage, formatCurrencyInput, parseCurrencyString } from '../utils/formatting';

interface SchoolManagerProps {
  schools: SchoolUnit[];
  activeSchoolId: string | null;
  metricCategories: Category[];
  onAddSchool: (name: string) => void;
  onRemoveSchool: (id: string) => void;
  onSelectSchool: (id: string) => void;
  onUpdateTargets: (schoolId: string, targets: Record<string, number>, additionalData?: Partial<SchoolUnit>) => void;
}

const SchoolManager: React.FC<SchoolManagerProps> = ({
  schools,
  activeSchoolId,
  metricCategories,
  onAddSchool,
  onRemoveSchool,
  onSelectSchool,
  onUpdateTargets
}) => {
  const [newSchoolName, setNewSchoolName] = useState('');
  const [localTargets, setLocalTargets] = useState<Record<string, number>>({});
  const [displayTargets, setDisplayTargets] = useState<Record<string, string>>({});
  const [treasurerName, setTreasurerName] = useState('');
  const [treasurerCpf, setTreasurerCpf] = useState('');
  const [viceTreasurerName, setViceTreasurerName] = useState('');
  const [viceTreasurerCpf, setViceTreasurerCpf] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const activeSchool = schools.find(s => s.id === activeSchoolId);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  useEffect(() => {
    if (activeSchool) {
      const targets = activeSchool.targets || {};
      setLocalTargets(targets);

      const initialDisplays: Record<string, string> = {};
      Object.keys(targets).forEach(id => {
        initialDisplays[id] = formatCurrencyInput(targets[id]);
      });
      metricCategories.forEach(cat => {
        if (!initialDisplays[cat.id]) {
          initialDisplays[cat.id] = "0,00";
        }
      });
      setDisplayTargets(initialDisplays);

      setTreasurerName(activeSchool.treasurerName || '');
      setTreasurerCpf(activeSchool.treasurerCpf || '');
      setViceTreasurerName(activeSchool.viceTreasurerName || '');
      setViceTreasurerCpf(activeSchool.viceTreasurerCpf || '');
      setIsLocked(activeSchool.isLocked || false);
      setShowSuccess(false);
    }
  }, [activeSchoolId, activeSchool, metricCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSchoolName.trim()) {
      onAddSchool(newSchoolName.trim());
      setNewSchoolName('');
    }
  };

  const handleTargetChange = (catId: string, val: string) => {
    const numeric = parseCurrencyString(val);
    setLocalTargets(prev => ({ ...prev, [catId]: numeric }));
    setDisplayTargets(prev => ({ ...prev, [catId]: formatCurrencyInput(numeric) }));
    setShowSuccess(false);
  };

  const handleSaveData = () => {
    if (!activeSchoolId) return;
    setIsSaving(true);

    setTimeout(() => {
      onUpdateTargets(activeSchoolId, localTargets, {
        treasurerName,
        treasurerCpf,
        viceTreasurerName,
        viceTreasurerCpf,
        isLocked: true
      });
      setIsSaving(false);
      setIsLocked(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <span className="w-2 h-8 bg-[#003B71] rounded-full mr-3"></span>
          CADASTRO DE UNIDADES ESCOLARES
        </h2>
        <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 tracking-widest">
          {schools.length} Unidades Registradas
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={newSchoolName}
          onChange={(e) => setNewSchoolName(e.target.value)}
          placeholder="Nome da Unidade (Ex: Colégio Adventista de...)"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all"
        />
        <button
          type="submit"
          className="bg-[#003B71] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#002a51] transition-all flex items-center shadow-lg active:scale-95"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar Unidade
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {schools.map((school) => (
          <div
            key={school.id}
            className={`group relative flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${activeSchoolId === school.id
                ? 'bg-blue-50 border-[#003B71] shadow-lg ring-2 ring-blue-100 transform -translate-y-1'
                : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
              }`}
            onClick={() => onSelectSchool(school.id)}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0 py-1 px-1">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 origin-center ${activeSchoolId === school.id
                  ? 'bg-[#FDB813] scale-125 shadow-[0_0_10px_rgba(253,184,19,0.7)]'
                  : 'bg-slate-200'
                }`}></div>
              <span className={`text-sm font-bold truncate ${activeSchoolId === school.id ? 'text-[#003B71]' : 'text-slate-600'
                }`}>
                {school.name}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveSchool(school.id);
              }}
              className="ml-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Excluir Unidade"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {activeSchool && (
        <div className={`bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4 relative space-y-8 transition-opacity duration-500 ${isLocked ? 'opacity-70' : ''}`}>
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-[#003B71] uppercase tracking-widest flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Dados da Unidade - {activeSchool.name}
            </h3>

            <div className="flex items-center gap-4">
              {showSuccess && (
                <span className="text-green-600 font-black text-[10px] uppercase tracking-widest animate-pulse flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Configurações Salvas!
                </span>
              )}
              {isLocked ? (
                <button
                  onClick={() => setIsLocked(false)}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m0 0H15" />
                  </svg>
                  Reabrir para Edição
                </button>
              ) : (
                <button
                  onClick={handleSaveData}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 ${isSaving
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#FDB813] text-[#003B71] hover:bg-[#eab308]'
                    }`}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-3 w-3 text-[#003B71]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Salvar Dados da Unidade
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-2xl border border-slate-100">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-[#003B71] uppercase tracking-[0.2em] border-b pb-2">Dados do Tesoureiro(a)</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={treasurerName}
                    onChange={(e) => setTreasurerName(e.target.value)}
                    disabled={isLocked}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#003B71] outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CPF</label>
                  <input
                    type="text"
                    value={treasurerCpf}
                    maxLength={14}
                    onChange={(e) => setTreasurerCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    disabled={isLocked}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#003B71] outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-[#FDB813] uppercase tracking-[0.2em] border-b pb-2">Dados do Vice-Tesoureiro(a)</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={viceTreasurerName}
                    onChange={(e) => setViceTreasurerName(e.target.value)}
                    disabled={isLocked}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#003B71] outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">CPF</label>
                  <input
                    type="text"
                    value={viceTreasurerCpf}
                    maxLength={14}
                    onChange={(e) => setViceTreasurerCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    disabled={isLocked}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#003B71] outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center mb-6">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13V6a2 2 0 012-2h14a2 2 0 012 2v7M13 17H7a2 2 0 00-2 2v2m7-7h.01M12 11V5.5M12 17a2 2 0 01-2 2H8a2 2 0 01-2-2v-5a2 2 0 012-2h2a2 2 0 012 2v5z" />
              </svg>
              CONFIGURAÇÃO DE METAS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {metricCategories
                .filter(cat => cat.id === 'descontos_concedidos' || cat.id === 'orcamento_bi')
                .map(cat => (
                  <div key={cat.id} className="flex flex-col gap-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {cat.id === 'orcamento_bi' ? 'ORÇAMENTO ANUAL' : `META: ${cat.name.toUpperCase()}`} ({cat.id === 'orcamento_bi' ? 'R$' : '%'})
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={displayTargets[cat.id] || '0,00'}
                        onChange={(e) => handleTargetChange(cat.id, e.target.value)}
                        disabled={isLocked}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all pr-12 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                        {cat.id === 'orcamento_bi' ? 'R$' : '%'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {schools.length === 0 && (
        <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="font-bold text-slate-500">Nenhuma unidade cadastrada.</p>
        </div>
      )}
    </div>
  );
};

export default SchoolManager;
