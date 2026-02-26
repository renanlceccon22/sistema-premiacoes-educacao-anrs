
import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Entity } from '../types';
import EmptyState from './EmptyState';
import ConfirmModal from './ConfirmModal';

interface EntityManagerProps {
    onClose: () => void;
}

const EntityManager: React.FC<EntityManagerProps> = ({ onClose }) => {
    const [entities, setEntities] = useState<Entity[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [userEntitiesMap, setUserEntitiesMap] = useState<Record<string, string[]>>({});
    const [pendingUsersMap, setPendingUsersMap] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        initials: '',
        cnpj: ''
    });

    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        entityId: string;
        entityName: string;
    }>({ show: false, entityId: '', entityName: '' });

    const [notification, setNotification] = useState<{
        show: boolean;
        title: string;
        message: string;
        isDanger?: boolean;
    }>({ show: false, title: '', message: '' });

    const fetchEntities = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('entities').select('*').order('name');
            if (error) throw error;
            setEntities(data || []);
        } catch (err) {
            console.error("Erro ao carregar entidades:", err);
        } finally {
            setLoading(false);
        }
    };

    const maskCNPJ = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18);
    };

    const fetchUsers = async () => {
        try {
            const { data } = await supabase.from('profiles').select('id, email, full_name').order('email');
            setUsers(data || []);
        } catch (err) {
            console.error("Erro ao carregar usuários:", err);
        }
    };

    const fetchUserEntities = async () => {
        try {
            const { data } = await supabase.from('user_entities').select('user_id, entity_id');
            if (data) {
                const map: Record<string, string[]> = {};
                data.forEach((ue: any) => {
                    if (!map[ue.entity_id]) map[ue.entity_id] = [];
                    map[ue.entity_id].push(ue.user_id);
                });
                setUserEntitiesMap(map);
                setPendingUsersMap(map); // Inicializa os pendentes com o que está no banco
            }
        } catch (err) {
            console.error("Erro ao carregar vínculos:", err);
        }
    };

    const toggleUserEntity = (userId: string, entityId: string) => {
        const currentUsers = pendingUsersMap[entityId] || [];
        const isLinked = currentUsers.includes(userId);

        setPendingUsersMap({
            ...pendingUsersMap,
            [entityId]: isLinked
                ? currentUsers.filter(id => id !== userId)
                : [...currentUsers, userId]
        });
    };

    const handleSaveConfig = async (entityId: string) => {
        setSavingId(entityId);
        try {
            const finalUsers = pendingUsersMap[entityId] || [];

            // 1. Remover todos os vínculos atuais da entidade no banco
            await supabase.from('user_entities').delete().eq('entity_id', entityId);

            // 2. Inserir os novos vínculos
            if (finalUsers.length > 0) {
                const inserts = finalUsers.map(userId => ({ user_id: userId, entity_id: entityId }));
                await supabase.from('user_entities').insert(inserts);
            }

            // 3. Atualizar o mapa oficial
            setUserEntitiesMap(prev => ({ ...prev, [entityId]: finalUsers }));
            setNotification({
                show: true,
                title: 'Sucesso',
                message: 'Configurações da entidade salvas com sucesso!',
                isDanger: false
            });
        } catch (err) {
            console.error("Erro ao salvar configurações:", err);
            setNotification({
                show: true,
                title: 'Erro',
                message: 'Erro ao salvar as configurações de usuários.',
                isDanger: true
            });
        } finally {
            setSavingId(null);
        }
    };

    useEffect(() => {
        fetchEntities();
        fetchUsers();
        fetchUserEntities();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingEntity) {
                const { error } = await supabase
                    .from('entities')
                    .update({
                        name: formData.name,
                        initials: formData.initials,
                        cnpj: formData.cnpj
                    })
                    .eq('id', editingEntity.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('entities')
                    .insert([{
                        name: formData.name,
                        initials: formData.initials,
                        cnpj: formData.cnpj
                    }]);
                if (error) throw error;
            }
            setIsAdding(false);
            setEditingEntity(null);
            setFormData({ name: '', initials: '', cnpj: '' });
            fetchEntities();
        } catch (err) {
            console.error("Erro ao salvar entidade:", err);
            setNotification({
                show: true,
                title: 'Erro',
                message: 'Erro ao salvar entidade.',
                isDanger: true
            });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            // 1. Verificar se existem Unidades Escolares vinculadas a esta entidade
            const { data: schoolCheck, error: schoolError } = await supabase
                .from('schools')
                .select('id', { count: 'exact' })
                .eq('entity_id', id)
                .limit(1);

            if (schoolError) throw schoolError;
            if (schoolCheck && schoolCheck.length > 0) {
                setNotification({
                    show: true,
                    title: 'Restrição de Exclusão',
                    message: "Não é possível excluir esta entidade pois ela possui Unidades Escolares cadastradas.",
                    isDanger: true
                });
                return;
            }

            // 2. Verificar se existem Períodos vinculados a esta entidade
            const { data: periodCheck, error: periodError } = await supabase
                .from('periods')
                .select('id', { count: 'exact' })
                .eq('entity_id', id)
                .limit(1);

            if (periodError) throw periodError;
            if (periodCheck && periodCheck.length > 0) {
                setNotification({
                    show: true,
                    title: 'Restrição de Exclusão',
                    message: "Não é possível excluir esta entidade pois ela possui Períodos cadastrados.",
                    isDanger: true
                });
                return;
            }

            // Se não houver nada vinculado, permite a exclusão
            const { error } = await supabase.from('entities').delete().eq('id', id);
            if (error) throw error;
            fetchEntities();
        } catch (err) {
            console.error("Erro ao excluir entidade:", err);
            setNotification({
                show: true,
                title: 'Erro de Exclusão',
                message: 'Erro ao excluir entidade.',
                isDanger: true
            });
        } finally {
            setConfirmModal({ ...confirmModal, show: false });
        }
    };

    const startEdit = (entity: Entity) => {
        setEditingEntity(entity);
        setFormData({
            name: entity.name,
            initials: entity.initials,
            cnpj: entity.cnpj
        });
        setIsAdding(true);
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center pr-12">
                <div className="flex-1">
                    <h2 className="text-lg font-black text-slate-800">Gestão de Entidades</h2>
                    <p className="text-slate-400 text-[10px] font-medium mt-0.5">Cadastre e gerencie as entidades do sistema.</p>
                </div>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        setEditingEntity(null);
                        setFormData({ name: '', initials: '', cnpj: '' });
                    }}
                    className="px-3 py-1.5 bg-[#003B71] text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-[#002B51] transition-colors"
                >
                    Nova Entidade
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 animate-in slide-in-from-top duration-300">
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Entidade</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#003B71] outline-none text-xs transition-all"
                                placeholder="Ex: Sede Administrativa Educação"
                            />
                        </div>
                        <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sigla</label>
                            <input
                                required
                                type="text"
                                value={formData.initials}
                                onChange={e => setFormData({ ...formData, initials: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#003B71] outline-none text-xs transition-all text-center font-black"
                                placeholder="Ex: INST"
                                maxLength={10}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">CNPJ</label>
                            <input
                                required
                                type="text"
                                value={formData.cnpj}
                                onChange={e => setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })}
                                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#003B71] outline-none text-xs transition-all"
                                placeholder="00.000.000/0000-00"
                                maxLength={18}
                            />
                        </div>
                        <div className="md:col-span-2 flex items-end gap-2">
                            <button
                                type="submit"
                                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-700 transition-colors shadow-sm"
                            >
                                {editingEntity ? 'Atualizar Entidade' : 'Cadastrar Entidade'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-5 py-2 bg-white text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-200"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-[#003B71] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Carregando entidades...</p>
                </div>
            ) : entities.length === 0 ? (
                <EmptyState
                    icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                    title="Nenhuma entidade cadastrada"
                    description="Comece cadastrando uma nova entidade para gerenciar."
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {entities.map(entity => (
                        <div
                            key={entity.id}
                            className="p-4 rounded-2xl border-2 border-slate-50 bg-slate-50/30 hover:border-slate-200 transition-all group"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-white text-[#003B71] flex items-center justify-center text-xs font-black shrink-0 shadow-sm border border-slate-100">
                                        {entity.initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-black text-slate-700 break-words">
                                            {entity.name}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest break-all mt-0.5">
                                            CNPJ: {entity.cnpj}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                        onClick={() => startEdit(entity)}
                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        title="Editar"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setConfirmModal({ show: true, entityId: entity.id, entityName: entity.name })}
                                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                        title="Excluir"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Gestão de Usuários da Entidade */}
                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Usuários com Acesso:</p>

                                    {JSON.stringify(userEntitiesMap[entity.id] || []) !== JSON.stringify(pendingUsersMap[entity.id] || []) && (
                                        <button
                                            onClick={() => handleSaveConfig(entity.id)}
                                            disabled={savingId === entity.id}
                                            className="px-2 py-0.5 bg-green-50 text-green-600 rounded-md text-[7px] font-black uppercase tracking-tighter hover:bg-green-100 transition-all flex items-center gap-1 border border-green-200"
                                        >
                                            {savingId === entity.id ? (
                                                <div className="w-2 h-2 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                            Salvar Alterações
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {users.map(user => {
                                        const isLinked = (pendingUsersMap[entity.id] || []).includes(user.id);
                                        const hasChanged = ((userEntitiesMap[entity.id] || []).includes(user.id)) !== isLinked;

                                        return (
                                            <button
                                                key={user.id}
                                                onClick={() => toggleUserEntity(user.id, entity.id)}
                                                className={`px-2 py-1 rounded-lg text-[8px] font-bold transition-all border ${isLinked
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500'
                                                    } ${hasChanged ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
                                                title={user.email}
                                            >
                                                {user.full_name || user.email.split('@')[0]}
                                            </button>
                                        );
                                    })}
                                    {users.length === 0 && (
                                        <p className="text-[9px] text-slate-300 italic px-1">Nenhum usuário disponível.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {confirmModal.show && (
                <ConfirmModal
                    isOpen={confirmModal.show}
                    onCancel={() => setConfirmModal({ ...confirmModal, show: false })}
                    onConfirm={() => handleDelete(confirmModal.entityId)}
                    title="Confirmar Exclusão"
                    message={`Tem certeza que deseja excluir a entidade "${confirmModal.entityName}"? Todos os usuários vinculados perderão o acesso a esta entidade.`}
                    confirmLabel="Excluir Entidade"
                    isDanger={true}
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
        </div>
    );
};

export default EntityManager;
