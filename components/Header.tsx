
import React from 'react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  isCloudConfigured?: boolean;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, isCloudConfigured }) => {
  const tabs = [
    { id: 'UNITIES', label: 'CADASTRO UNIDADES' },
    { id: 'MASTER_VALUES', label: 'CADASTRO PREMIAÇÕES' },
    { id: 'EVALUATION', label: 'CRITÉRIOS E AVALIAÇÃO' },
    { id: 'REPORT', label: 'RELATÓRIOS' },
    { id: 'COST_ANALYSIS', label: 'CUSTO OPERACIONAL' },
  ];

  return (
    <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row items-center gap-4">

          {/* Logo - Esquerda em telas Grandes */}
          <div className="flex items-center space-x-3 shrink-0 lg:w-1/4 justify-center lg:justify-start">
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100 shadow-inner">
              <img
                src="/logo.png"
                alt="Logo ANRS"
                className="w-8 h-8 object-contain"
                style={{ width: '32px', height: '32px' }}
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-black text-[#003B71] leading-tight uppercase">Premiação Escolar</h1>
            </div>
          </div>

          {/* NAVEGAÇÃO CENTRALIZADA - O FOCO DO USUÁRIO */}
          <nav className="flex items-center justify-center bg-slate-50 p-1 rounded-full border border-slate-100 gap-1 lg:flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-2 rounded-full font-black text-[9px] tracking-wider transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-[#003B71] text-white shadow-md'
                  : 'text-slate-500 hover:text-[#003B71] hover:bg-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Info - Direita em telas Grandes */}
          <div className="hidden lg:flex flex-col items-end lg:w-1/4 space-y-1">
            <span className="text-[9px] font-black text-[#003B71] uppercase tracking-[0.2em]">Portal do Gestor</span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest ${isCloudConfigured
              ? 'bg-green-50 text-green-600 border-green-100'
              : 'bg-slate-50 text-slate-400 border-slate-100'
              }`}>
              <div className={`w-1 h-1 rounded-full ${isCloudConfigured ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
              {isCloudConfigured ? 'Banco de Dados Ativo' : 'Off-line'}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
