import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SchoolUnit, AwardCriterion } from '../types';
import { formatCurrency, parseMaskedString } from '../utils/formatting';
import EmptyState from './EmptyState';

interface SchoolManagerProps {
  schools: SchoolUnit[];
  criteria: AwardCriterion[];
  activeSchoolId: string | null;
  onAddSchool: (data: Partial<SchoolUnit>) => void;
  onRemoveSchool: (id: string) => void;
  onSelectSchool: (id: string) => void;
  onUpdateSchool: (schoolId: string, data: Partial<SchoolUnit>) => void;
  isReadOnly?: boolean;
}

const SchoolManager: React.FC<SchoolManagerProps> = ({
  schools,
  criteria,
  activeSchoolId,
  onAddSchool,
  onRemoveSchool,
  onSelectSchool,
  onUpdateSchool,
  isReadOnly
}) => {
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newTreasurerName, setNewTreasurerName] = useState('');
  const [newTreasurerCpf, setNewTreasurerCpf] = useState('');
  const [newViceTreasurerName, setNewViceTreasurerName] = useState('');
  const [newViceTreasurerCpf, setNewViceTreasurerCpf] = useState('');
  const [newAnnualBudget, setNewAnnualBudget] = useState<number>(0);

  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  useEffect(() => {
    if (isModalOpen) {
      if (editingSchoolId) {
        const school = schools.find(s => s.id === editingSchoolId);
        if (school) {
          setNewSchoolName(school.name);
          setNewTreasurerName(school.treasurerName || '');
          setNewTreasurerCpf(school.treasurerCpf || '');
          setNewViceTreasurerName(school.viceTreasurerName || '');
          setNewViceTreasurerCpf(school.viceTreasurerCpf || '');
          setNewAnnualBudget(school.annualBudget || 0);
        }
      } else {
        setNewSchoolName('');
        setNewTreasurerName('');
        setNewTreasurerCpf('');
        setNewViceTreasurerName('');
        setNewViceTreasurerCpf('');
        setNewAnnualBudget(0);
      }
    }
  }, [isModalOpen, editingSchoolId, schools]);

  const handleOpenCreateModal = () => {
    setEditingSchoolId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (schoolId: string) => {
    setEditingSchoolId(schoolId);
    setIsModalOpen(true);
  };


  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (newSchoolName.trim() && newTreasurerName.trim() && newTreasurerCpf.length === 14) {
      const payload: Partial<SchoolUnit> = {
        name: newSchoolName.trim(),
        treasurerName: newTreasurerName,
        treasurerCpf: newTreasurerCpf,
        viceTreasurerName: newViceTreasurerName,
        viceTreasurerCpf: newViceTreasurerCpf,
        annualBudget: newAnnualBudget,
        isLocked: true
      };

      if (editingSchoolId) {
        onUpdateSchool(editingSchoolId, payload);
      } else {
        onAddSchool(payload);
      }
      setIsModalOpen(false);
      setEditingSchoolId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 relative">
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#003B71] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#003B71] uppercase tracking-tight">
                    {editingSchoolId ? 'Editar Unidade Escolar' : 'Nova Unidade Escolar'}
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    {editingSchoolId ? 'Atualize as informações da unidade' : 'Preencha as informações para o cadastro'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setEditingSchoolId(null); }}
                className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center">
                  <span className="w-6 h-[1px] bg-slate-200 mr-3"></span>
                  01. Identificação da Unidade
                </h4>
                <div>
                  <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                    Nome da Unidade
                    <span className="text-red-500 animate-pulse">*</span>
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    placeholder="Ex: Escola Municipal Joaquim Nabuco"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#003B71]/10 focus:border-[#003B71] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                    Orçamento Anual da Unidade (Global)
                    <span className="text-slate-300 font-bold ml-1">(Opcional para cálculos automáticos)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatCurrency(newAnnualBudget)}
                      onChange={(e) => setNewAnnualBudget(parseMaskedString(e.target.value))}
                      placeholder="R$ 0.000,00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-[#003B71] focus:outline-none focus:ring-4 focus:ring-[#003B71]/10 focus:border-[#003B71] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[8px] font-black text-[#003B71] uppercase tracking-[0.3em] flex items-center">
                    <span className="w-6 h-[1px] bg-blue-100 mr-3"></span>
                    02. Tesoureiro(a)
                  </h4>
                  <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                        Nome Completo
                        <span className="text-red-500 animate-pulse">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTreasurerName}
                        onChange={(e) => setNewTreasurerName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#003B71] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                        CPF
                        <span className="text-red-500 animate-pulse">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTreasurerCpf}
                        maxLength={14}
                        onChange={(e) => setNewTreasurerCpf(formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#003B71] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[8px] font-black text-[#FDB813] uppercase tracking-[0.3em] flex items-center">
                    <span className="w-6 h-[1px] bg-yellow-100 mr-3"></span>
                    03. Vice-Tesoureiro(a)
                  </h4>
                  <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center justify-between">
                        Nome Completo
                        <span className="text-[7px] text-slate-300 font-bold ml-2">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={newViceTreasurerName}
                        onChange={(e) => setNewViceTreasurerName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#003B71] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center justify-between">
                        CPF
                        <span className="text-[7px] text-slate-300 font-bold ml-2">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={newViceTreasurerCpf}
                        maxLength={14}
                        onChange={(e) => setNewViceTreasurerCpf(formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#003B71] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-50 flex gap-4 bg-slate-50/30">
              <button
                onClick={() => { setIsModalOpen(false); setEditingSchoolId(null); }}
                className="flex-1 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all border border-slate-200 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={!newSchoolName.trim() || !newTreasurerName.trim() || newTreasurerCpf.length !== 14}
                className="flex-[2] bg-[#003B71] text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#002a51] transition-all shadow-xl shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                {editingSchoolId ? 'Atualizar Dados' : 'Cadastrar Unidade'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h2 className="text-sm font-bold text-gray-900 flex items-center">
          <span className="w-2 h-8 bg-[#003B71] rounded-full mr-3"></span>
          GERENCIAMENTO DE UNIDADES
        </h2>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {!isReadOnly && (
            <button
              onClick={handleOpenCreateModal}
              className="flex-1 md:flex-none bg-[#003B71] text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-[#002a51] transition-all flex items-center justify-center shadow-xl shadow-blue-900/10 active:scale-95"
            >
              <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Nova Unidade
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {schools.map((school) => (
          <div
            key={school.id}
            className={`group relative flex flex-col justify-center p-4 min-h-[70px] rounded-3xl border-2 transition-all duration-300 cursor-pointer ${activeSchoolId === school.id
              ? 'bg-[#003B71] border-[#003B71] shadow-2xl shadow-blue-900/20 transform -translate-y-1'
              : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-xl'
              }`}
            onClick={() => onSelectSchool(school.id)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-500 ${activeSchoolId === school.id
                  ? 'bg-[#FDB813] shadow-[0_0_15px_rgba(253,184,19,0.8)] scale-110'
                  : 'bg-slate-200'
                  }`}></div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-black uppercase tracking-tight truncate ${activeSchoolId === school.id ? 'text-white' : 'text-[#003B71]'}`}>
                    {school.name}
                  </span>
                  <span className={`text-[8px] font-bold uppercase tracking-widest truncate ${activeSchoolId === school.id ? 'text-blue-200' : 'text-slate-400'}`}>
                    {school.treasurerName}
                  </span>
                </div>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(school.id);
                    }}
                    title="Editar Unidade"
                    className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-110 ${activeSchoolId === school.id
                      ? 'text-white/40 hover:text-white hover:bg-white/10'
                      : 'text-slate-300 hover:text-[#003B71] hover:bg-blue-50'}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSchool(school.id);
                    }}
                    className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-110 ${activeSchoolId === school.id
                      ? 'text-white/40 hover:text-red-300 hover:bg-white/10'
                      : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {schools.length === 0 && (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          title="Nenhuma Escola"
          description="Cadastre sua primeira unidade escolar para começar"
          className="p-12"
        />
      )}
    </div>
  );
};

export default SchoolManager;
