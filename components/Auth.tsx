
import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';

interface AuthProps {
    onLogin: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegistering) {
                // 1. Criar Usuário no Auth
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName }
                    }
                });
                if (authError) throw authError;

                if (authData.user) {
                    // 2. Criar Perfil no Banco
                    await supabase.from('profiles').insert({
                        id: authData.user.id,
                        email,
                        full_name: fullName,
                        role: 'USUÁRIO'
                    });

                    if (!authData.session) {
                        setError('Conta criada! Verifique seu e-mail para confirmar o acesso.');
                        setLoading(false);
                        return;
                    }
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }

            onLogin();
        } catch (err: any) {
            console.error(err);
            if (err.message.includes('User already registered')) {
                setError('Este e-mail já está cadastrado.');
            } else if (err.message === 'Invalid login credentials') {
                setError('E-mail ou senha incorretos.');
            } else {
                setError(err.message || 'Erro na autenticação.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden">
            {/* Elementos Decorativos de Fundo */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#003B71]/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FDB813]/5 rounded-full blur-3xl"></div>

            <div className="w-full max-w-[360px] z-10">
                {/* Logo/Branding */}
                <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-lg mb-4 border border-slate-100">
                        <img src="/logo.png" alt="Logo" className="w-11 h-11 object-contain" />
                    </div>
                    <h1 className="text-xl font-black text-[#003B71] uppercase tracking-tighter">
                        Premiação Escolar
                    </h1>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
                        Portal de Gestão ANRS
                    </p>
                </div>

                {/* Card de Login */}
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-slate-100 p-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="mb-6">
                        <h2 className="text-lg font-black text-slate-800">{isRegistering ? 'Criar Conta' : 'Seja bem-vindo'}</h2>
                        <p className="text-slate-400 text-xs font-medium mt-0.5">
                            {isRegistering ? 'Preencha os dados abaixo.' : 'Insira suas credenciais para continuar.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        {isRegistering && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003B71] transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Seu nome"
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#003B71] focus:bg-white rounded-xl pl-11 pr-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300"
                                        required={isRegistering}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">E-mail de Acesso</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003B71] transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                                    </svg>
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Insira seu e-mail"
                                    className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#003B71] focus:bg-white rounded-xl pl-11 pr-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Senha</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003B71] transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#003B71] focus:bg-white rounded-xl pl-11 pr-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-[#003B71] text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-900/20 hover:bg-[#002a51] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    {isRegistering ? 'Criando Conta...' : 'Entrando...'}
                                </>
                            ) : (
                                <>
                                    {isRegistering ? 'Cadastrar Agora' : 'Acessar Sistema'}
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="w-full text-[10px] font-black text-[#003B71] uppercase tracking-widest hover:text-blue-800 transition-colors py-2"
                        >
                            {isRegistering ? 'Já tenho uma conta' : 'Não tenho uma conta'}
                        </button>
                    </form>
                </div>

                {/* Footer do Login */}
                <p className="text-center text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-6">
                    Desenvolvido por <span className="text-[#003B71]">Renan Ceccon</span>
                </p>
            </div>
        </div>
    );
};

export default Auth;
