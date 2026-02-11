
import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { User } from '../types';
import EmptyState from './EmptyState';
import ConfirmModal from './ConfirmModal';

interface UserManagerProps {
    onImpersonate: (user: User | null, isOperator?: boolean) => void;
    currentImpersonatedUser: User | null;
}

const UserManager: React.FC<UserManagerProps> = ({ onImpersonate, currentImpersonatedUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        type: 'reset' | 'delete';
        userId: string;
        userEmail: string;
    }>({ show: false, type: 'reset', userId: '', userEmail: '' });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, email, role, full_name');

            let allUsers: User[] = [];

            if (!profileError && profiles && profiles.length > 0) {
                allUsers = profiles;
            } else {
                // Fallback: Capturar todos os user_ids únicos de múltiplas tabelas
                const [schoolsRes, configRes, evalsRes] = await Promise.all([
                    supabase.from('schools').select('user_id'),
                    supabase.from('app_config').select('user_id'),
                    supabase.from('evaluations').select('user_id')
                ]);

                const allIds = new Set<string>();
                [schoolsRes.data, configRes.data, evalsRes.data].forEach(list => {
                    list?.forEach((item: any) => {
                        if (item.user_id) allIds.add(item.user_id);
                    });
                });

                allUsers = Array.from(allIds).map(id => ({
                    id,
                    email: `ID: ${id.substring(0, 8)}... (Falta Sincro)`,
                    role: 'USUÁRIO'
                }));
            }

            setUsers(allUsers);
        } catch (err) {
            console.error("Erro ao carregar usuários:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeleteUser = async (userId: string) => {
        try {
            // 1. Limpar dados nas tabelas relacionadas
            await Promise.all([
                supabase.from('schools').delete().eq('user_id', userId),
                supabase.from('app_config').delete().eq('user_id', userId),
                supabase.from('evaluations').delete().eq('user_id', userId),
                supabase.from('profiles').delete().eq('id', userId)
            ]);

            alert('Dados do usuário excluídos do banco de dados com sucesso. Nota: Para remover o acesso definitivo (login), é necessário excluir o usuário no painel do Supabase Auth.');
            fetchUsers();
        } catch (err) {
            console.error("Erro ao excluir usuário:", err);
            alert('Erro ao excluir usuário.');
        } finally {
            setConfirmModal({ ...confirmModal, show: false });
        }
    };

    const handleResetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            alert(`E-mail de redefinição enviado para ${email}. O usuário poderá escolher uma nova senha ao clicar no link.`);
        } catch (err) {
            console.error("Erro ao resetar senha:", err);
            alert('Erro ao enviar e-mail de redefinição.');
        } finally {
            setConfirmModal({ ...confirmModal, show: false });
        }
    };

    return (
        <div className="p-8">
            <div className="mb-8 flex justify-between items-center">
                <div className="flex-1">
                    <h2 className="text-xl font-black text-slate-800">Gestão de Usuários</h2>
                    <p className="text-slate-400 text-xs font-medium mt-1">Visualize e acesse o sistema como outros usuários.</p>
                </div>
                {currentImpersonatedUser && (
                    <div className="mr-12">
                        <button
                            onClick={() => onImpersonate(null)}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors whitespace-nowrap"
                        >
                            Parar Impersonação
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-[#003B71] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Carregando usuários...</p>
                </div>
            ) : users.length === 0 ? (
                <EmptyState
                    icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    title="Nenhum usuário encontrado"
                    description="Não foi possível listar os usuários do sistema."
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {users.map(user => (
                        <div
                            key={user.id}
                            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between group gap-4 ${currentImpersonatedUser?.id === user.id
                                ? 'border-[#003B71] bg-blue-50/20'
                                : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'
                                }`}
                            onClick={() => onImpersonate(user, false)}
                        >
                            <div className="flex items-center gap-5 flex-1 min-w-0">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 shadow-sm ${currentImpersonatedUser?.id === user.id ? 'bg-[#003B71] text-white' : 'bg-white text-slate-400'
                                    }`}>
                                    {user.email[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-slate-700 break-words">
                                        {user.full_name || user.email}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest break-all mt-0.5">
                                        {user.full_name ? user.email : (user.role || 'Usuário')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onImpersonate(user, false);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                                >
                                    Visualizar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onImpersonate(user, true);
                                    }}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
                                >
                                    Operar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmModal({ show: true, type: 'reset', userId: user.id, userEmail: user.email });
                                    }}
                                    className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                                    title="Resetar Senha"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmModal({ show: true, type: 'delete', userId: user.id, userEmail: user.email });
                                    }}
                                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                    title="Excluir Acesso"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {confirmModal.show && (
                <ConfirmModal
                    isOpen={confirmModal.show}
                    onCancel={() => setConfirmModal({ ...confirmModal, show: false })}
                    onConfirm={() => {
                        if (confirmModal.type === 'delete') handleDeleteUser(confirmModal.userId);
                        else handleResetPassword(confirmModal.userEmail);
                    }}
                    title={confirmModal.type === 'delete' ? 'Confirmar Exclusão' : 'Resetar Senha'}
                    message={confirmModal.type === 'delete'
                        ? `Tem certeza que deseja excluir todos os dados de ${confirmModal.userEmail}? Esta ação não pode ser desfeita.`
                        : `Deseja enviar um e-mail de redefinição de senha para ${confirmModal.userEmail}?`}
                    confirmLabel={confirmModal.type === 'delete' ? 'Excluir Dados' : 'Enviar E-mail'}
                    isDanger={confirmModal.type === 'delete'}
                />
            )}
        </div>
    );
};

export default UserManager;
