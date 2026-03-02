
import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { User } from '../types';

interface ProfileSettingsProps {
    session: any;
    targetUser?: { id: string, email: string, full_name?: string } | null;
    isReadOnly?: boolean;
    onClose: () => void;
    onProfileUpdate?: (data: any) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ session, targetUser, isReadOnly, onClose, onProfileUpdate }) => {
    const isImpersonating = !!targetUser && targetUser.id !== session?.user?.id;
    const [fullName, setFullName] = useState(targetUser?.full_name || '');
    const [email, setEmail] = useState(targetUser?.email || session?.user?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const userId = targetUser?.id || session?.user?.id;
            if (userId) {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', userId)
                        .maybeSingle();

                    if (data) {
                        setFullName(data.full_name || '');
                    }
                } catch (err: any) {
                    console.error("Erro ao buscar perfil:", err);
                }
            }
        };
        fetchProfile();
    }, [session, targetUser]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const userId = targetUser?.id || session.user.id;
            const updates = {
                id: userId,
                full_name: fullName,
                email: email,
                updated_at: new Date().toISOString(),
            };

            // 1. Atualizar Profile
            const { error: profileError } = await supabase.from('profiles').upsert(updates);
            if (profileError) throw profileError;

            if (onProfileUpdate) onProfileUpdate(updates);

            // 2. Atualizar Email se mudou
            if (email !== session.user.email) {
                const { error: emailError } = await supabase.auth.updateUser({ email });
                if (emailError) throw emailError;
                setMessage({ type: 'success', text: 'E-mail atualizado! Verifique sua nova caixa de entrada para confirmar.' });
            }

            // 3. Atualizar Senha se preenchida
            if (newPassword) {
                const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
                if (passwordError) throw passwordError;
                setNewPassword('');
                setMessage({ type: 'success', text: 'Perfil e senha atualizados com sucesso!' });
            } else if (!message) {
                setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            }

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[1.5rem] shadow-xl border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-500 max-w-sm w-full relative">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="mb-5">
                <h2 className="text-base font-black text-slate-800">Sua Conta</h2>
                <p className="text-slate-400 text-[10px] font-medium mt-0.5">Gerencie suas informações de acesso.</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                    <label className="block text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#003B71] focus:bg-white rounded-lg px-3 py-2 text-[10px] font-bold text-slate-700 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">E-mail</label>
                    <input
                        type="email"
                        value={email}
                        readOnly={isImpersonating || isReadOnly}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className={`w-full bg-slate-50 border-2 border-slate-50 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-700 outline-none transition-all ${isImpersonating ? 'opacity-60 cursor-not-allowed' : 'focus:border-[#003B71] focus:bg-white'}`}
                    />
                </div>

                {!isImpersonating && (
                    <div>
                        <label className="block text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Nova Senha (vazio para manter)</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#003B71] focus:bg-white rounded-lg px-3 py-2 text-[10px] font-bold text-slate-700 outline-none transition-all"
                        />
                    </div>
                )}

                {message && (
                    <div className={`p-4 rounded-xl text-xs font-bold flex flex-col gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={message.type === 'success' ? "M5 13l4 4L19 7" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                            </svg>
                            {message.text}
                        </div>
                        {message.text.includes('profiles') && (
                            <div className="mt-2 p-3 bg-red-100/50 rounded-lg text-[10px] leading-relaxed font-medium">
                                <p className="mb-2 font-black">SOLUÇÃO PARA O ADMIN:</p>
                                <p>Acesse o SQL Editor do Supabase e rode o comando que te passei anteriormente para criar a tabela "profiles". Só assim o salvamento de nomes funcionará.</p>
                            </div>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#003B71] text-white py-3 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-[#002a51] hover:scale-[1.02] transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </form>
        </div>
    );
};

export default ProfileSettings;
