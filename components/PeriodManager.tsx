import React, { useState } from 'react';
import { Period } from '../types';
import EmptyState from './EmptyState';

interface PeriodManagerProps {
  periods: Period[];
  activePeriodId: string | null;
  schoolsCount: number;
  onAddPeriod: (label: string) => void;
  onRemovePeriod: (id: string) => void;
  onSelectPeriod: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

const PeriodManager: React.FC<PeriodManagerProps> = ({
  periods,
  activePeriodId,
  schoolsCount,
  onAddPeriod,
  onRemovePeriod,
  onSelectPeriod,
  onToggleStatus
}) => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const handleAdd = () => {
    if (schoolsCount === 0) {
      alert('Atenção: Você precisa cadastrar pelo menos uma UNIDADE ESCOLAR antes de abrir um período de avaliação.');
      return;
    }

    const label = `${selectedMonth}/${selectedYear}`;
    if (periods.some(p => p.label === label)) {
      alert('Este período já existe.');
      return;
    }
    onAddPeriod(label);
  };

  const activePeriod = periods.find(p => p.id === activePeriodId);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-800 flex items-center mb-3">
            <span className="w-1.5 h-5 bg-[#FDB813] rounded-full mr-2.5"></span>
            Gestão de Períodos Contábeis
          </h2>

          <div className="flex flex-col space-y-4">
            {/* Seletor de Novo Período */}
            <div className={`flex flex-wrap items-end gap-2.5 p-3 rounded-xl border transition-all ${schoolsCount === 0
              ? 'bg-orange-50 border-orange-200 opacity-80'
              : 'bg-slate-50 border-slate-100'
              }`}>
              {schoolsCount === 0 && (
                <div className="w-full mb-2 flex items-center gap-2 text-orange-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[8px] font-black uppercase tracking-widest">Atenção: Cadastre unidades primeiro</span>
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mês</label>
                <select
                  disabled={schoolsCount === 0}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all min-w-[110px] disabled:opacity-50"
                >
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ano</label>
                <select
                  disabled={schoolsCount === 0}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003B71] transition-all min-w-[80px] disabled:opacity-50"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <button
                onClick={handleAdd}
                className={`px-3 py-1.5 text-xs border border-transparent rounded-lg font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 ${schoolsCount === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#003B71] text-white hover:bg-[#002a51]'
                  }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Abrir Novo Período
              </button>
            </div>

            {/* Listagem de Períodos Existentes */}
            <div className="flex flex-wrap gap-2 pt-2">
              {periods.length === 0 && (
                <div className="w-full">
                  <EmptyState
                    icon={
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                      </svg>
                    }
                    title="Sem Períodos"
                    description="Nenhum período contábil aberto"
                    className="p-8 rounded-2xl"
                  />
                </div>
              )}
              {periods.map((p) => (
                <div
                  key={p.id}
                  className={`group relative flex items-center transition-all ${activePeriodId === p.id ? 'scale-105 z-10' : ''
                    }`}
                >
                  <button
                    onClick={() => onSelectPeriod(p.id)}
                    className={`pl-2.5 pr-10 py-1.5 rounded-lg border-2 transition-all flex items-center space-x-2 text-left ${activePeriodId === p.id
                      ? 'bg-[#003B71] border-[#003B71] text-white shadow-lg'
                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                      }`}
                  >
                    <span className="font-bold text-xs">{p.label}</span>
                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${p.status === 'open' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-400'
                      }`}>
                      {p.status === 'open' ? 'Aberto' : 'Encerrado'}
                    </span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemovePeriod(p.id);
                    }}
                    className={`absolute right-2 p-1.5 rounded-lg transition-all z-20 hover:scale-110 active:scale-90 ${activePeriodId === p.id
                      ? 'text-white/60 hover:text-white hover:bg-white/20'
                      : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                      }`}
                    title="Excluir Período"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {activePeriod && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 lg:w-48">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Status do Período</p>
            <p className="text-xs font-bold text-slate-700 mb-3 flex items-center">
              <span className={`w-1.5 h-1.5 rounded-full mr-2 ${activePeriod.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {activePeriod.label}
            </p>
            <button
              onClick={() => onToggleStatus(activePeriod.id)}
              className={`w-full px-3 py-2 rounded-lg font-black text-[9px] transition-all border-2 shadow-sm uppercase tracking-widest ${activePeriod.status === 'open'
                ? 'bg-white border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200'
                : 'bg-white border-green-100 text-green-600 hover:bg-green-50 hover:border-green-200'
                }`}
            >
              {activePeriod.status === 'open' ? 'Encerrar Período' : 'Reativar Período'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PeriodManager;
