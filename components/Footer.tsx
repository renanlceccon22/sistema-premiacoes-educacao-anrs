import React from 'react';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full py-12 mt-16 bg-[#003B71] text-white border-t-4 border-[#FDB813]">
            <div className="container mx-auto px-4 flex flex-col items-center text-center space-y-8">

                {/* Developer Info - Agora em destaque principal */}
                <div className="flex flex-col items-center space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest">
                        Desenvolvedor: <span className="text-[#FDB813]">Renan Ceccon</span>
                    </p>
                    <p className="text-[10px] font-bold text-white/60 tracking-wider">
                        Contato: <a href="mailto:renanlceccon@yahoo.com.br" className="text-[#FDB813] hover:underline transition-all">renanlceccon@yahoo.com.br</a>
                    </p>
                </div>

                {/* Linha Divisória Sutil */}
                <div className="w-full max-w-xs h-px bg-white/5"></div>

                {/* Footer Info - Estilo Discreto (Igual à Versão) */}
                <div className="flex flex-col items-center space-y-3">
                    <div className="space-y-1 opacity-20">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em]">
                            &copy; {currentYear} SISTEMA DE PREMIAÇÃO ESCOLAR
                        </p>
                        <p className="text-[8px] font-bold uppercase tracking-[0.2em]">
                            Todos os direitos reservados.
                        </p>
                    </div>

                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">
                        Versão 1.0.0
                    </p>
                </div>

            </div>
        </footer>
    );
};

export default Footer;
