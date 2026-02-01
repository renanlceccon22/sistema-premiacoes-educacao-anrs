
import React from 'react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  isCloudConfigured?: boolean;
  onLogout?: () => void;
  userEmail?: string;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, isCloudConfigured, onLogout, userEmail }) => {
  const tabs = [
    { id: 'UNITIES', label: 'CADASTRO UNIDADES' },
    { id: 'MASTER_VALUES', label: 'CADASTRO PREMIAÇÕES' },
    { id: 'EVALUATION', label: 'CRITÉRIOS E AVALIAÇÃO' },
    { id: 'REPORT', label: 'RELATÓRIOS' },
    { id: 'COST_ANALYSIS', label: 'CUSTO OPERACIONAL' },
  ];

  return (
    <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
      <div className="mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">

          {/* Logo - Esquerda em telas Grandes */}
          <div className="flex items-center space-x-3 shrink-0 lg:w-1/4 justify-between lg:justify-start">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100 shadow-inner">
                <img
                  src="/logo.png"
                  alt="Logo ANRS"
                  className="w-7 h-7 lg:w-8 lg:h-8 object-contain"
                />
              </div>
              <div className="block lg:hidden xl:block">
                <h1 className="text-xs lg:text-sm font-black text-[#003B71] leading-tight uppercase">Premiação Escolar</h1>
              </div>
            </div>

            {/* Ícone de Usuário Compacto para Mobile */}
            <div className="flex lg:hidden items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px]">{userEmail || 'Gestor'}</span>
                <div className={`flex items-center gap-1 text-[7px] font-black uppercase tracking-widest ${isCloudConfigured ? 'text-green-500' : 'text-slate-300'}`}>
                  <div className={`w-1 h-1 rounded-full ${isCloudConfigured ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  {isCloudConfigured ? 'ON' : 'OFF'}
                </div>
              </div>
              <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* NAVEGAÇÃO CENTRALIZADA - O FOCO DO USUÁRIO */}
          <nav className="flex items-center lg:justify-center bg-slate-50 p-1 rounded-full border border-slate-100 gap-1 lg:flex-1 overflow-x-auto no-scrollbar scroll-smooth">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 lg:px-4 py-2 rounded-full font-black text-[8px] lg:text-[9px] tracking-wider transition-all duration-300 whitespace-nowrap shrink-0 ${activeTab === tab.id
                  ? 'bg-[#003B71] text-white shadow-md'
                  : 'text-slate-500 hover:text-[#003B71] hover:bg-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Info & Logout - Direita */}
          <div className="hidden lg:flex items-center gap-6 lg:w-1/4 justify-end">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{userEmail || 'Gestor Logado'}</span>
              <div className={`flex items-center gap-1 mt-0.5 text-[8px] font-black uppercase tracking-widest ${isCloudConfigured ? 'text-green-500' : 'text-slate-300'}`}>
                <div className={`w-1 h-1 rounded-full ${isCloudConfigured ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                {isCloudConfigured ? 'ON-LINE' : 'OFF-LINE'}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="group flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all duration-300 shadow-sm"
              title="Sair do Sistema"
            >
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
