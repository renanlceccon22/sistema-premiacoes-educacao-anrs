import React from 'react';

interface FooterProps {
    entityInitials?: string;
}

const Footer: React.FC<FooterProps> = ({ entityInitials = 'ANRS' }) => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full py-12 mt-16 bg-[#003B71] text-white border-t-4 border-[#FDB813]">
            <div className="container mx-auto px-4 flex flex-col items-center text-center space-y-8">

                {/* Footer Info - Estilo Discreto */}
                <div className="flex flex-col items-center space-y-3">
                    <div className="space-y-1 opacity-20">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em]">
                            &copy; {currentYear} SISTEMA DE PREMIAÇÃO ESCOLAR
                        </p>
                    </div>

                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">
                        Versão 2.1.4
                    </p>
                </div>

            </div>
        </footer>
    );
};

export default Footer;
