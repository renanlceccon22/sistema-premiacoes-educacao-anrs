
import React from 'react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  isCloudConfigured?: boolean;
  onLogout?: () => void;
  userEmail?: string;
  userName?: string;
  isAdmin?: boolean;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  impersonatedEmail?: string;
  isOperatorMode?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  isCloudConfigured,
  onLogout,
  userEmail,
  userName,
  isAdmin,
  onOpenSettings,
  onOpenProfile,
  impersonatedEmail,
  isOperatorMode
}) => {
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
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px]">
                  {impersonatedEmail || userName || userEmail || 'Gestor'}
                </span>
                <div className={`flex items-center gap-1 text-[7px] font-black uppercase tracking-widest ${isCloudConfigured ? 'text-green-500' : 'text-slate-300'}`}>
                  <div className={`w-1 h-1 rounded-full ${isCloudConfigured ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  {isCloudConfigured ? 'ON' : 'OFF'}
                </div>
              </div>

              {isAdmin && (
                <button onClick={onOpenSettings} className="text-slate-400 hover:text-[#003B71] transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}

              <button onClick={onOpenProfile} className="text-slate-400 hover:text-[#003B71] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

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
                onClick={() => onTabChange(tab.id as any)}
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
          <div className="hidden lg:flex items-center gap-4 lg:w-1/4 justify-end">
            <div className="flex flex-col items-end pr-4 border-r border-slate-100">
              <div className="flex items-center gap-2">
                {impersonatedEmail && (
                  <span className={`${isOperatorMode ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} text-[7px] font-black px-1.5 py-0.5 rounded-md animate-pulse`}>
                    MODO {isOperatorMode ? 'OPERADOR' : 'VISUALIZAÇÃO'}
                  </span>
                )}
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[150px]">
                  {impersonatedEmail || userName || userEmail || 'Gestor Logado'}
                </span>
              </div>
              <div className={`flex items-center gap-1 mt-0.5 text-[8px] font-black uppercase tracking-widest ${isCloudConfigured ? 'text-green-500' : 'text-slate-300'}`}>
                <div className={`w-1 h-1 rounded-full ${isCloudConfigured ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                {isCloudConfigured ? 'ON-LINE' : 'OFF-LINE'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={onOpenSettings}
                  className="group flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-blue-50 hover:border-blue-100 hover:text-[#003B71] transition-all duration-300 shadow-sm"
                  title="Gerenciar Usuários"
                >
                  <svg className="w-4 h-4 group-hover:rotate-45 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}

              <button
                onClick={onOpenProfile}
                className="group flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-blue-50 hover:border-blue-100 hover:text-[#003B71] transition-all duration-300 shadow-sm"
                title="Minha Conta"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              <button
                onClick={onLogout}
                className="group flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all duration-300 shadow-sm"
                title="Sair do Sistema"
              >
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
