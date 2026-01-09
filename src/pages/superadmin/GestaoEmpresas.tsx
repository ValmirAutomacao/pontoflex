import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useTheme } from '../../contexts/ThemeContext';
import DataTable from '../../components/DataTable';
import {
    Plus,
    ShieldAlert,
    ShieldCheck,
    Mail,
    Building2,
    MoreHorizontal,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    Edit2,
    Trash2,
    Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Empresa } from '../../types';

const GestaoEmpresas: React.FC = () => {
    const { isDark } = useTheme();
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sendingEmail, setSendingEmail] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nome: '',
        nome_comprador: '',
        email_comprador: '',
        funcao_comprador: ''
    });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
    const [successData, setSuccessData] = useState<{ name: string, link: string } | null>(null);

    useEffect(() => {
        fetchEmpresas();
    }, []);

    const fetchEmpresas = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEmpresas(data || []);
        } catch (error) {
            console.error('Erro ao buscar empresas:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendOnboardingEmail = async (empresa: any, setupToken: string) => {
        const setupUrl = `${window.location.origin}/setup/${empresa.id}?token=${setupToken}`;
        setSendingEmail(empresa.id || 'new');

        try {
            const { data, error } = await supabase.functions.invoke('send-onboarding-email', {
                body: {
                    companyName: empresa.nome,
                    buyerEmail: empresa.email_comprador,
                    setupLink: setupUrl
                }
            });

            if (error) throw error;
            return true;
        } catch (error: any) {
            console.error('Erro ao enviar e-mail:', error);
            // Não bloqueia o fluxo principal, apenas avisa
            return false;
        } finally {
            setSendingEmail(null);
        }
    };

    const handleCreateEmpresa = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('empresas')
                .insert([{
                    nome: formData.nome,
                    nome_comprador: formData.nome_comprador,
                    email_comprador: formData.email_comprador,
                    funcao_comprador: formData.funcao_comprador,
                    status: 'pendente',
                    bloqueado_por_atraso: false,
                    dados_onboarding_completos: false
                }])
                .select('id, setup_token, nome')
                .single();

            if (error) throw error;

            const setupUrl = `${window.location.origin}/setup/${data.id}?token=${data.setup_token}`;
            setSuccessData({ name: data.nome || formData.nome, link: setupUrl });

            // Envio automático
            await sendOnboardingEmail({
                id: data.id,
                nome: formData.nome,
                email_comprador: formData.email_comprador
            }, data.setup_token);

            setFormData({ nome: '', nome_comprador: '', email_comprador: '', funcao_comprador: '' });
            fetchEmpresas();
        } catch (error: any) {
            console.error('Erro ao criar empresa:', error);
            alert(`Erro ao cadastrar empresa: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setSaving(false);
        }
    };

    const toggleLock = async (empresa: Empresa) => {
        try {
            const { error } = await supabase
                .from('empresas')
                .update({ bloqueado_por_atraso: !empresa.bloqueado_por_atraso })
                .eq('id', empresa.id);

            if (error) throw error;
            fetchEmpresas();
        } catch (error) {
            console.error('Erro ao alternar bloqueio:', error);
        }
    };

    const handleDeleteEmpresa = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta empresa? Todos os dados vinculados serão perdidos.')) return;

        setLoading(true);
        try {
            // 1. Buscar todos os user_id vinculados aos funcionários desta empresa
            const { data: users, error: fetchError } = await supabase
                .from('funcionarios')
                .select('user_id')
                .eq('empresa_id', id);

            if (fetchError) throw fetchError;

            const userIds = users?.map(u => u.user_id).filter(Boolean) || [];

            // 2. Chamar a Edge Function para excluir usuários do Auth
            if (userIds.length > 0) {
                const { error: funcError } = await supabase.functions.invoke('delete-company-users', {
                    body: { userIds }
                });
                if (funcError) {
                    console.warn('Erro ao excluir usuários do Auth:', funcError);
                    if (!confirm('Não foi possível excluir os usuários do sistema do login. Deseja continuar com a exclusão da empresa mesmo assim?')) {
                        setLoading(false);
                        return;
                    }
                }
            }

            // 3. Excluir a empresa (o banco deve estar com CASCADE nas outras tabelas)
            const { error: deleteError } = await supabase.from('empresas').delete().eq('id', id);
            if (deleteError) throw deleteError;

            fetchEmpresas();
        } catch (error: any) {
            alert('Erro ao excluir empresa: ' + error.message);
            setLoading(false);
        }
    };

    const handleOpenEdit = (empresa: Empresa) => {
        setEditingEmpresa(empresa);
        setFormData({
            nome: empresa.nome,
            nome_comprador: empresa.nome_comprador || '',
            email_comprador: empresa.email_comprador || '',
            funcao_comprador: empresa.funcao_comprador || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateEmpresa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmpresa) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('empresas')
                .update({
                    nome: formData.nome,
                    nome_comprador: formData.nome_comprador,
                    email_comprador: formData.email_comprador,
                    funcao_comprador: formData.funcao_comprador
                })
                .eq('id', editingEmpresa.id);

            if (error) throw error;
            setIsEditModalOpen(false);
            setEditingEmpresa(null);
            fetchEmpresas();
        } catch (error: any) {
            alert('Erro ao atualizar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const filteredEmpresas = empresas.filter(emp =>
        (emp.nome?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (emp.email_comprador?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const columns = [
        { key: 'empresa', label: 'Empresa' },
        { key: 'comprador', label: 'Comprador' },
        { key: 'status', label: 'Status' },
        { key: 'acoes', label: 'Ações', width: '120px' }
    ];

    const inputClass = `bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`;

    return (
        <div className="pb-12">

            <DataTable
                title="Gestão de Empresas (SaaS)"
                subtitle="Controle de clientes, faturamento e onboarding"
                columns={columns}
                data={filteredEmpresas}
                loading={loading}
                emptyMessage="Nenhuma empresa cadastrada."
                onSearchChange={setSearchQuery}
                searchValue={searchQuery}
                onAdd={() => setIsModalOpen(true)}
                addButtonLabel="Nova Empresa"
                onRefresh={fetchEmpresas}
                renderRow={(emp) => (
                    <tr key={emp.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                    <Building2 size={16} />
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{emp.nome}</p>
                                    <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{emp.cnpj || 'Onboarding pendente'}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-5 py-4">
                            <div>
                                <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{emp.nome_comprador || '-'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Mail size={10} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                                    <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{emp.email_comprador}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-5 py-4">
                            <div className="flex flex-col gap-1.5">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${emp.status === 'ativo' ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') :
                                    emp.status === 'pendente' ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600') :
                                        (isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600')
                                    }`}>
                                    {emp.status === 'ativo' ? <CheckCircle2 size={10} /> : emp.status === 'pendente' ? <Clock size={10} /> : <XCircle size={10} />}
                                    {emp.status.toUpperCase()}
                                </span>
                                {emp.bloqueado_por_atraso && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold w-fit ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-700'}`}>
                                        BLOQUEIO FINANCEIRO
                                    </span>
                                )}
                            </div>
                        </td>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleLock(emp)}
                                    title={emp.bloqueado_por_atraso ? 'Desbloquear Acesso' : 'Bloquear por Atraso'}
                                    className={`p-1.5 rounded-lg transition-all ${emp.bloqueado_por_atraso
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                        : 'bg-rose-500 text-white hover:bg-rose-600'
                                        }`}
                                >
                                    {emp.bloqueado_por_atraso ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                                </button>
                                {emp.status === 'pendente' && (
                                    <>
                                        <button
                                            onClick={async () => {
                                                const sent = await sendOnboardingEmail(emp, emp.setup_token!);
                                                if (sent) alert('E-mail enviado com sucesso!');
                                                else alert('Erro ao enviar e-mail. Verifique o console.');
                                            }}
                                            disabled={sendingEmail === emp.id}
                                            title="Enviar/Reenviar E-mail de Convite"
                                            className={`p-1.5 rounded-lg border transition-all ${isDark ? 'border-primary-500/30 text-primary-400 hover:bg-primary-500/10' : 'border-primary-200 text-primary-600 hover:bg-primary-50'} disabled:opacity-50`}
                                        >
                                            {sendingEmail === emp.id ? <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /> : <Mail size={14} />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}/setup/${emp.id}?token=${emp.setup_token}`;
                                                navigator.clipboard.writeText(url);
                                                alert('Link de setup copiado!');
                                            }}
                                            title="Copiar link de setup"
                                            className={`p-1.5 rounded-lg border ${isDark ? 'border-slate-700 text-amber-400 hover:bg-slate-700' : 'border-slate-200 text-amber-600 hover:bg-slate-50'}`}
                                        >
                                            <LinkIcon size={14} />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => handleOpenEdit(emp)}
                                    title="Editar Empresa"
                                    className={`p-1.5 rounded-lg border ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDeleteEmpresa(emp.id)}
                                    title="Excluir Empresa"
                                    className={`p-1.5 rounded-lg border ${isDark ? 'border-slate-700 text-rose-400 hover:bg-rose-500/10' : 'border-slate-200 text-rose-500 hover:bg-rose-50'}`}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </td>
                    </tr>
                )}
            />

            {/* Modal Cadastro */}
            <AnimatePresence>
                {isModalOpen && !successData && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-md rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <form onSubmit={handleCreateEmpresa} className="p-6">
                                <h2 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Cadastrar Nova Empresa</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nome da Empresa</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                            className={`${inputClass} w-full`}
                                            placeholder="Ex: PontoFlex Ltda"
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nome do Comprador</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.nome_comprador}
                                            onChange={(e) => setFormData({ ...formData, nome_comprador: e.target.value })}
                                            className={`${inputClass} w-full`}
                                            placeholder="Nome completo do responsável"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Email</label>
                                            <input
                                                required
                                                type="email"
                                                value={formData.email_comprador}
                                                onChange={(e) => setFormData({ ...formData, email_comprador: e.target.value })}
                                                className={`${inputClass} w-full`}
                                                placeholder="email@empresa.com"
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Função/Cargo</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.funcao_comprador}
                                                onChange={(e) => setFormData({ ...formData, funcao_comprador: e.target.value })}
                                                className={`${inputClass} w-full`}
                                                placeholder="Ex: Diretor RH"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Criar e Gerar Setup'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >

            {/* Modal Sucesso */}
            <AnimatePresence>
                {
                    successData && (
                        <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSuccessData(null)} />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className={`relative w-full max-w-md rounded-2xl my-4 md:my-8 p-8 text-center border shadow-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                            >
                                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Empresa Cadastrada!</h2>
                                <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    A empresa <strong>{successData.name}</strong> foi pré-cadastrada. Copie o link abaixo e envie para o cliente finalizar o setup.
                                </p>

                                <div className={`p-3 rounded-lg mb-8 flex items-center justify-between gap-3 text-left border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <code className={`text-[10px] break-all flex-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                        {successData.link}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(successData.link);
                                            alert('Copiado!');
                                        }}
                                        className="p-2 hover:bg-primary-500/10 text-primary-500 rounded-md transition-colors"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setSuccessData(null);
                                        setIsModalOpen(false);
                                    }}
                                    className="w-full bg-primary-500 hover:bg-primary-600 py-3 rounded-lg text-white font-bold transition-all shadow-glow"
                                >
                                    Entendido
                                </button>
                            </motion.div>
                        </div >
                    )
                }
            </AnimatePresence >

            {/* Modal Edição */}
            <AnimatePresence>
                {
                    isEditModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsEditModalOpen(false)} />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className={`relative w-full max-w-md rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                            >
                                <form onSubmit={handleUpdateEmpresa} className="p-6">
                                    <h2 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Editar Empresa</h2>

                                    <div className="space-y-4">
                                        <div>
                                            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nome da Empresa</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.nome}
                                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                                className={`${inputClass} w-full`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nome do Comprador</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.nome_comprador}
                                                onChange={(e) => setFormData({ ...formData, nome_comprador: e.target.value })}
                                                className={`${inputClass} w-full`}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Email</label>
                                                <input
                                                    required
                                                    type="email"
                                                    value={formData.email_comprador}
                                                    onChange={(e) => setFormData({ ...formData, email_comprador: e.target.value })}
                                                    className={`${inputClass} w-full`}
                                                />
                                            </div>
                                            <div>
                                                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Função/Cargo</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.funcao_comprador}
                                                    onChange={(e) => setFormData({ ...formData, funcao_comprador: e.target.value })}
                                                    className={`${inputClass} w-full`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-8">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditModalOpen(false)}
                                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Salvar Alterações'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div >
                    )
                }
            </AnimatePresence >
        </div >
    );
};

export default GestaoEmpresas;
