
import React from 'react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  isCloudConfigured?: boolean;
  onLogout?: () => void;
  userEmail?: string;
  userName?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onOpenEntities?: () => void;
  impersonatedEmail?: string;
  impersonatedName?: string;
  isOperatorMode?: boolean;
  onStopImpersonation?: () => void;
  currentEntity?: any;
  availableEntities?: any[];
  onEntityChange?: (entityId: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  isCloudConfigured,
  onLogout,
  userEmail,
  userName,
  isAdmin,
  isSuperAdmin,
  onOpenSettings,
  onOpenProfile,
  onOpenEntities,
  impersonatedEmail,
  impersonatedName,
  isOperatorMode,
  onStopImpersonation,
  currentEntity,
  availableEntities = [],
  onEntityChange
}) => {
  const [isEntityDropdownOpen, setIsEntityDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEntityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabs = [
    { id: 'UNITIES', label: 'CADASTRO UNIDADES' },
    { id: 'MASTER_VALUES', label: 'CADASTRO PREMIAÇÕES' },
    { id: 'EVALUATION', label: 'CRITÉRIOS E AVALIAÇÃO' },
    { id: 'REPORT', label: 'RELATÓRIOS' },
    { id: 'COST_ANALYSIS', label: 'CUSTO OPERACIONAL' },
  ];

  // Todas as abas são visíveis para qualquer usuário logado
  const visibleTabs = tabs;

  return (
    <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
      <div className="mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">

          {/* Logo - Esquerda em telas Grandes */}
          <div className="flex items-center space-x-3 shrink-0 lg:min-w-[20%] justify-between lg:justify-start">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100 shadow-inner">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-7 h-7 lg:w-8 lg:h-8 object-contain"
                />
              </div>
              <div className="block lg:hidden xl:block">
                <h1 className="text-xs lg:text-sm font-black text-[#003B71] leading-tight uppercase">Premiação Escolar</h1>
              </div>
            </div>

            {/* Seletor de Entidade - Design Premium & Responsivo */}
            {currentEntity && (
              <div className="flex items-center lg:ml-6 mr-2 relative" ref={dropdownRef}>
                <button
                  onClick={() => availableEntities.length > 1 && setIsEntityDropdownOpen(!isEntityDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm transition-all ${availableEntities.length > 1 ? 'hover:border-[#003B71]/30 hover:shadow-md cursor-pointer group' : 'cursor-default'}`}
                >
                  <div className="w-5 h-5 rounded-lg bg-[#003B71] flex items-center justify-center text-white shrink-0">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Entidade</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-black text-[#003B71] uppercase leading-none truncate max-w-[80px] lg:max-w-none">
                        {currentEntity.initials || currentEntity.name}
                      </span>
                      {availableEntities.length > 1 && (
                        <svg className={`w-2.5 h-2.5 text-[#003B71] transition-transform duration-300 ${isEntityDropdownOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>

                {/* Dropdown Personalizado */}
                {isEntityDropdownOpen && availableEntities.length > 1 && (
                  <div className="absolute top-[calc(100%+8px)] left-0 min-w-[200px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-slate-50 mb-1">
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Trocar Entidade</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {availableEntities.map(e => (
                        <button
                          key={e.id}
                          onClick={() => {
                            onEntityChange?.(e.id);
                            setIsEntityDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-50 group/item ${currentEntity.id === e.id ? 'bg-blue-50/50' : ''}`}
                        >
                          <div className={`w-2 h-2 rounded-full transition-all ${currentEntity.id === e.id ? 'bg-[#003B71] scale-125' : 'bg-slate-200 group-hover/item:bg-[#003B71]/30'}`}></div>
                          <div className="flex flex-col">
                            <span className={`text-[10px] font-black uppercase tracking-tight ${currentEntity.id === e.id ? 'text-[#003B71]' : 'text-slate-600'}`}>
                              {e.name}
                            </span>
                            {e.initials && (
                              <span className="text-[8px] font-bold text-slate-400 capitalize">Sigla: {e.initials}</span>
                            )}
                          </div>
                          {currentEntity.id === e.id && (
                            <div className="ml-auto">
                              <svg className="w-4 h-4 text-[#003B71]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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

              {!impersonatedEmail && isAdmin && (
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
          <nav className="flex items-center lg:justify-center bg-slate-50 p-1 rounded-full border border-slate-100 gap-1 lg:flex-1 lg:mx-4 overflow-x-auto no-scrollbar scroll-smooth">
            {visibleTabs.map((tab) => (
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
          <div className="hidden lg:flex items-center gap-3 lg:min-w-[20%] justify-end">
            <div className="flex flex-col items-end pr-4 border-r border-slate-100">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[140px]">
                {impersonatedName || impersonatedEmail || userName || userEmail || 'Gestor Logado'}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {impersonatedEmail && (
                  <span className={`${isOperatorMode ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} text-[7px] font-black px-1.5 py-0.5 rounded-md animate-pulse`}>
                    MODO {isOperatorMode ? 'OPERADOR' : 'VISUALIZAÇÃO'}
                  </span>
                )}
                <div className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest ${isCloudConfigured ? 'text-green-500' : 'text-slate-300'}`}>
                  <div className={`w-1 h-1 rounded-full ${isCloudConfigured ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  {isCloudConfigured ? 'ON-LINE' : 'OFF-LINE'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={onOpenEntities}
                className="group flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-green-50 hover:border-green-100 hover:text-green-600 transition-all duration-300 shadow-sm"
                title="Gerenciar Entidades"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </button>

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
