
import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { User } from '../types';
import EmptyState from './EmptyState';
import ConfirmModal from './ConfirmModal';

interface UserManagerProps {
    onImpersonate: (user: User | null, isOperator?: boolean) => void;
    currentImpersonatedUser: User | null;
    entities: any[];
}

const UserManager: React.FC<UserManagerProps> = ({ onImpersonate, currentImpersonatedUser, entities }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        type: 'reset' | 'delete';
        userId: string;
        userEmail: string;
    }>({ show: false, type: 'reset', userId: '', userEmail: '' });

    const [notification, setNotification] = useState<{
        show: boolean;
        title: string;
        message: string;
        isDanger?: boolean;
    }>({ show: false, title: '', message: '' });

    const [userEntitiesMap, setUserEntitiesMap] = useState<Record<string, string[]>>({});

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createEmail, setCreateEmail] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [creatingUser, setCreatingUser] = useState(false);
    const [createError, setCreateError] = useState('');

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

    const fetchUserEntities = async () => {
        try {
            const { data, error } = await supabase.from('user_entities').select('user_id, entity_id');
            if (!error && data) {
                const map: Record<string, string[]> = {};
                data.forEach((ue: any) => {
                    if (!map[ue.user_id]) map[ue.user_id] = [];
                    map[ue.user_id].push(ue.entity_id);
                });
                setUserEntitiesMap(map);
            }
        } catch (err) {
            console.error("Erro ao carregar vínculos de entidades:", err);
        }
    };

    const toggleUserEntity = async (userId: string, entityId: string) => {
        const currentEntities = userEntitiesMap[userId] || [];
        const isLinked = currentEntities.includes(entityId);

        try {
            if (isLinked) {
                await supabase.from('user_entities').delete().eq('user_id', userId).eq('entity_id', entityId);
                setUserEntitiesMap({
                    ...userEntitiesMap,
                    [userId]: currentEntities.filter(id => id !== entityId)
                });
            } else {
                await supabase.from('user_entities').insert({ user_id: userId, entity_id: entityId });
                setUserEntitiesMap({
                    ...userEntitiesMap,
                    [userId]: [...currentEntities, entityId]
                });
            }
        } catch (err) {
            console.error("Erro ao alternar vínculo de entidade:", err);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchUserEntities();
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

            setNotification({
                show: true,
                title: 'Usuário Excluído',
                message: 'Dados do usuário excluídos do banco de dados com sucesso. Nota: Para remover o acesso definitivo (login), é necessário excluir o usuário no painel do Supabase Auth.',
                isDanger: false
            });
            fetchUsers();
        } catch (err) {
            console.error("Erro ao excluir usuário:", err);
            setNotification({
                show: true,
                title: 'Erro',
                message: 'Erro ao excluir usuário.',
                isDanger: true
            });
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
            setNotification({
                show: true,
                title: 'Sucesso',
                message: `E-mail de redefinição enviado para ${email}. O usuário poderá escolher uma nova senha ao clicar no link.`,
                isDanger: false
            });
        } catch (err) {
            console.error("Erro ao resetar senha:", err);
            setNotification({
                show: true,
                title: 'Erro',
                message: 'Erro ao enviar e-mail de redefinição.',
                isDanger: true
            });
        } finally {
            setConfirmModal({ ...confirmModal, show: false });
        }
    };

    const adminCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingUser(true);
        setCreateError('');

        try {
            const tempClient = createClient(
                (import.meta as any).env.VITE_SUPABASE_URL,
                (import.meta as any).env.VITE_SUPABASE_ANON_KEY,
                { auth: { autoRefreshToken: false, persistSession: false } }
            );

            const { data, error } = await tempClient.auth.signUp({
                email: createEmail,
                password: createPassword,
                options: { data: { full_name: createName } }
            });

            if (error) throw error;

            if (data.user) {
                // Pode ser que a RLS do profiles impeça a inserção pelo tempClient, mas não sabemos sem olhar as políticas.
                // Como precaução usamos supabase padrão para tentar primeiro caso tempClient falhe.
                let insertError = null;
                const resultTemp = await tempClient.from('profiles').insert({
                    id: data.user.id, email: createEmail, full_name: createName, role: 'USUÁRIO'
                });
                if (resultTemp.error) {
                    const resultAdmin = await supabase.from('profiles').insert({
                        id: data.user.id, email: createEmail, full_name: createName, role: 'USUÁRIO'
                    });
                    insertError = resultAdmin.error;
                }

                if (insertError) throw insertError;
            }

            setShowCreateModal(false);
            setCreateName('');
            setCreateEmail('');
            setCreatePassword('');
            setNotification({
                show: true,
                title: 'Usuário Criado',
                message: `O usuário ${createEmail} foi criado com sucesso.`,
                isDanger: false
            });
            fetchUsers();
        } catch (err: any) {
            console.error(err);
            setCreateError(err.message || 'Erro ao criar usuário');
        } finally {
            setCreatingUser(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center pr-12">
                <div className="flex-1">
                    <h2 className="text-lg font-black text-slate-800">Gestão de Usuários</h2>
                    <p className="text-slate-400 text-[10px] font-medium mt-0.5">Visualize e acesse o sistema como outros usuários.</p>
                </div>
                {/* Botão para Criar Novo Usuário */}
                <div className="mr-6">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-[#003B71] text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#002a51] transition-colors whitespace-nowrap shadow-md shadow-blue-900/20"
                    >
                        Criar Conta
                    </button>
                </div>
                {currentImpersonatedUser && (
                    <div className="mr-12">
                        <button
                            onClick={() => onImpersonate(null)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors whitespace-nowrap"
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
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between group gap-4 ${currentImpersonatedUser?.id === user.id
                                ? 'border-[#003B71] bg-blue-50/20'
                                : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'
                                }`}
                            onClick={() => onImpersonate(user, false)}
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0 shadow-sm ${currentImpersonatedUser?.id === user.id ? 'bg-[#003B71] text-white' : 'bg-white text-slate-400'
                                    }`}>
                                    {user.email[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-slate-700 break-words">
                                        {user.full_name || user.email}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest break-all mt-0.5">
                                        {user.full_name ? user.email : (user.role || 'Usuário')}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {entities.map(entity => {
                                            const isLinked = (userEntitiesMap[user.id] || []).includes(entity.id);
                                            return (
                                                <button
                                                    key={entity.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleUserEntity(user.id, entity.id);
                                                    }}
                                                    className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter transition-all border ${isLinked
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'bg-white border-slate-100 text-slate-300 hover:border-blue-200 hover:text-blue-400'
                                                        }`}
                                                >
                                                    {entity.initials}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onImpersonate(user, false);
                                    }}
                                    className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                                >
                                    Visualizar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onImpersonate(user, true);
                                    }}
                                    className="px-2 py-1 bg-red-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
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

            {notification.show && (
                <ConfirmModal
                    isOpen={notification.show}
                    onCancel={() => setNotification({ ...notification, show: false })}
                    onConfirm={() => setNotification({ ...notification, show: false })}
                    title={notification.title}
                    message={notification.message}
                    confirmLabel="OK"
                    showCancel={false}
                    isDanger={notification.isDanger}
                />
            )}

            {/* Modal de Criar Usuário */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[24px] shadow-xl w-full max-w-sm overflow-hidden p-5 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase">Novo Usuário</h3>
                                <p className="text-slate-500 text-[10px] mt-0.5">Preencha os dados abaixo.</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100/50 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={adminCreateUser} className="space-y-3">
                            <div>
                                <label className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={createName}
                                    onChange={(e) => setCreateName(e.target.value)}
                                    placeholder="Ex: João Silva"
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#003B71] rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-700 outline-none transition-all placeholder:font-normal"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">E-mail</label>
                                <input
                                    type="email"
                                    value={createEmail}
                                    onChange={(e) => setCreateEmail(e.target.value)}
                                    placeholder="exemplo@adventistas.org"
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#003B71] rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-700 outline-none transition-all placeholder:font-normal"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Senha Provisória</label>
                                <input
                                    type="password"
                                    value={createPassword}
                                    onChange={(e) => setCreatePassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#003B71] rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-700 outline-none transition-all placeholder:font-normal"
                                    minLength={6}
                                    required
                                />
                            </div>

                            {createError && (
                                <div className="text-red-500 bg-red-50 p-3 rounded-lg text-xs font-bold border border-red-100">
                                    {createError}
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={creatingUser}
                                    className={`w-full bg-[#003B71] text-white py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-[#002a51] transition-all flex items-center justify-center gap-2 ${creatingUser ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {creatingUser ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Criando...
                                        </>
                                    ) : (
                                        'Cadastrar Conta'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManager;
