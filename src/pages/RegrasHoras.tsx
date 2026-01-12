import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Settings,
    Plus,
    Edit2,
    Trash2,
    CheckCircle2,
    X,
    Save,
    Clock,
    Layout,
    AlertCircle,
    Percent,
    Calendar,
    Moon,
    Wallet,
    Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RegraHoras {
    id: string;
    empresa_id: string;
    apelido: string;
    tipo_modelo: 'BANCO' | 'PAGAMENTO';
    tipo_ciclo: string;
    dia_inicio_ciclo: number;
    validade_meses: number;
    limite_credito_horas: number;
    limite_debito_horas: number;
    permite_saldo_negativo: boolean;
    percentual_he_50: number;
    percentual_he_100: number;
    adicional_noturno_percentual: number;
    inicio_horario_noturno: string;
    fim_horario_noturno: string;
    is_default: boolean;
    ativo: boolean;
}

const RegrasHoras: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [regras, setRegras] = useState<RegraHoras[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingRegra, setEditingRegra] = useState<RegraHoras | null>(null);

    const [form, setForm] = useState<Partial<RegraHoras>>({
        apelido: '',
        tipo_modelo: 'BANCO',
        tipo_ciclo: 'mensal',
        dia_inicio_ciclo: 1,
        validade_meses: 3,
        limite_credito_horas: 40,
        limite_debito_horas: 10,
        permite_saldo_negativo: false,
        percentual_he_50: 50.00,
        percentual_he_100: 100.00,
        adicional_noturno_percentual: 20.00,
        inicio_horario_noturno: '22:00',
        fim_horario_noturno: '05:00',
        is_default: false,
        ativo: true
    });

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchRegras();
        }
    }, [profile?.empresa_id]);

    const fetchRegras = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('regra_horas_config')
                .select('*')
                .eq('empresa_id', profile?.empresa_id)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRegras(data || []);
        } catch (error) {
            console.error('Erro ao buscar regras:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (regra: RegraHoras | null = null) => {
        if (regra) {
            setEditingRegra(regra);
            setForm(regra);
        } else {
            setEditingRegra(null);
            setForm({
                apelido: '',
                tipo_modelo: 'BANCO',
                tipo_ciclo: 'mensal',
                dia_inicio_ciclo: 1,
                validade_meses: 3,
                limite_credito_horas: 40,
                limite_debito_horas: 10,
                permite_saldo_negativo: false,
                percentual_he_50: 50.00,
                percentual_he_100: 100.00,
                adicional_noturno_percentual: 20.00,
                inicio_horario_noturno: '22:00',
                fim_horario_noturno: '05:00',
                is_default: false,
                ativo: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!profile?.empresa_id) return;
        if (!form.apelido) {
            alert('Por favor, dê um nome para esta regra.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                empresa_id: profile.empresa_id,
            };

            // Se for default, remover default das outras
            if (form.is_default) {
                await supabase
                    .from('regra_horas_config')
                    .update({ is_default: false })
                    .eq('empresa_id', profile.empresa_id);
            }

            if (editingRegra) {
                const { error } = await supabase
                    .from('regra_horas_config')
                    .update(payload)
                    .eq('id', editingRegra.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('regra_horas_config')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchRegras();
        } catch (error: any) {
            alert('Erro ao salvar regra: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta regra? Isso pode afetar os cálculos de quem a utiliza.')) return;
        try {
            const { error } = await supabase
                .from('regra_horas_config')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchRegras();
        } catch (error: any) {
            alert('Erro ao excluir regra: ' + error.message);
        }
    };

    return (
        <div className={`p-8 min-h-screen transition-colors duration-500 ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
            <header className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                        <Settings size={26} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Regras de Cálculo</h1>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Defina como o sistema deve processar Horas Extras e Banco de Horas</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-primary-500/25"
                >
                    <Plus size={20} /> Nova Regra
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : regras.length === 0 ? (
                <div className="text-center py-20 bg-white shadow-sm dark:bg-slate-900/50 rounded-[40px] border border-dashed border-slate-300 dark:border-slate-700">
                    <Layout size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Nenhuma regra cadastrada</h3>
                    <p className="text-slate-500 mb-6 font-medium">Crie sua primeira regra de banco de horas ou pagamento de extras.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regras.map((regra) => (
                        <motion.div
                            key={regra.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`group relative p-6 rounded-[32px] border transition-all duration-300 ${isDark
                                ? 'bg-slate-900/40 border-slate-800 shadow-xl hover:bg-slate-900/60 hover:border-primary-500/50'
                                : 'bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-primary-500/50'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${regra.tipo_modelo === 'BANCO' ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                                    {regra.tipo_modelo === 'BANCO' ? <Wallet size={28} /> : <CheckCircle2 size={28} />}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(regra)} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-primary-600'}`}>
                                        <Edit2 size={18} />
                                    </button>
                                    {!regra.is_default && (
                                        <button onClick={() => handleDelete(regra.id)} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-rose-500/10 text-rose-400 hover:text-rose-50' : 'hover:bg-rose-50 text-rose-500'}`}>
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold truncate pr-3">{regra.apelido}</h3>
                                    {regra.is_default && (
                                        <span className="shrink-0 bg-primary-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-primary-500/20">Padrão</span>
                                    )}
                                </div>
                                <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md ${regra.tipo_modelo === 'BANCO' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                    {regra.tipo_modelo === 'BANCO' ? 'Banco de Horas' : 'Pagamento de Extras'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-700/10 pt-5">
                                <div className="flex flex-col">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Extra (50%)</span>
                                    <span className="text-lg font-black">{regra.percentual_he_50}%</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Extra (100%)</span>
                                    <span className="text-lg font-black">{regra.percentual_he_100}%</span>
                                </div>
                            </div>

                            {regra.tipo_modelo === 'BANCO' && (
                                <div className="mt-4 pt-4 border-t border-slate-700/10 flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Ciclo {regra.tipo_ciclo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Limite: {regra.limite_credito_horas}h</span>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-700/10 flex items-center gap-2">
                                <Moon size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                    Adicional Noturno: <span className="text-primary-500">{regra.adicional_noturno_percentual}%</span>
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 ml-auto">{regra.inicio_horario_noturno} - {regra.fim_horario_noturno}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal de Cadastro/Edição */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={`w-full max-w-2xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden transition-all duration-500 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500">
                                        <Settings size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight">{editingRegra ? 'Editar Regra' : 'Nova Regra de Cálculo'}</h2>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Configuração de parâmetros de ponto</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                <div className="space-y-8">
                                    {/* Infos Básicas */}
                                    <section>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500 mb-4 block">Identificação</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold opacity-60 ml-1">Nome da Regra</label>
                                                <input
                                                    type="text"
                                                    value={form.apelido}
                                                    onChange={(e) => setForm({ ...form, apelido: e.target.value })}
                                                    placeholder="Ex: Banco de Horas Geral"
                                                    className={`w-full px-5 py-4 rounded-2xl border transition-all outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700 focus:border-primary-500 text-white' : 'bg-slate-50 border-slate-100 focus:border-primary-500 focus:bg-white'}`}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold opacity-60 ml-1">Modelo de Cálculo</label>
                                                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                                    <button
                                                        onClick={() => setForm({ ...form, tipo_modelo: 'BANCO' })}
                                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${form.tipo_modelo === 'BANCO' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-500' : 'text-slate-500'}`}
                                                    >
                                                        Banco de Horas
                                                    </button>
                                                    <button
                                                        onClick={() => setForm({ ...form, tipo_modelo: 'PAGAMENTO' })}
                                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${form.tipo_modelo === 'PAGAMENTO' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-500' : 'text-slate-500'}`}
                                                    >
                                                        Pagamento Extras
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Configuração de Extras */}
                                    <section>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-4 block flex items-center gap-2">
                                            <Percent size={14} /> Percentuais de Horas Extras
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold opacity-60 ml-1">Adicional 50%</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={form.percentual_he_50}
                                                        onChange={(e) => setForm({ ...form, percentual_he_50: parseFloat(e.target.value) })}
                                                        className={`w-full px-5 py-4 rounded-2xl border transition-all outline-none font-bold pr-12 ${isDark ? 'bg-slate-800/50 border-slate-700 focus:border-primary-500' : 'bg-slate-50 border-slate-100 focus:border-primary-500'}`}
                                                    />
                                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold opacity-60 ml-1">Adicional 100%</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={form.percentual_he_100}
                                                        onChange={(e) => setForm({ ...form, percentual_he_100: parseFloat(e.target.value) })}
                                                        className={`w-full px-5 py-4 rounded-2xl border transition-all outline-none font-bold pr-12 ${isDark ? 'bg-slate-800/50 border-slate-700 focus:border-primary-500' : 'bg-slate-50 border-slate-100 focus:border-primary-500'}`}
                                                    />
                                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Configuração de Banco de Horas */}
                                    {form.tipo_modelo === 'BANCO' && (
                                        <section className="p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500 mb-6 block flex items-center gap-2">
                                                <Wallet size={14} /> Detalhes do Banco
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold opacity-60 ml-1">Ciclo</label>
                                                    <select
                                                        value={form.tipo_ciclo}
                                                        onChange={(e) => setForm({ ...form, tipo_ciclo: e.target.value })}
                                                        className={`w-full px-4 py-3 rounded-xl border appearance-none outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}
                                                    >
                                                        <option value="mensal">Mensal</option>
                                                        <option value="trimestral">Trimestral</option>
                                                        <option value="semestral">Semestral</option>
                                                        <option value="anual">Anual</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold opacity-60 ml-1">Dia Início</label>
                                                    <input
                                                        type="number"
                                                        value={form.dia_inicio_ciclo}
                                                        min="1" max="31"
                                                        onChange={(e) => setForm({ ...form, dia_inicio_ciclo: parseInt(e.target.value) })}
                                                        className={`w-full px-4 py-3 rounded-xl border outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold opacity-60 ml-1">Validade (Meses)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={form.validade_meses}
                                                            onChange={(e) => setForm({ ...form, validade_meses: parseInt(e.target.value) })}
                                                            className={`w-full px-4 py-3 rounded-xl border outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold opacity-60 ml-1">Limite Crédito (Horas)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={form.limite_credito_horas}
                                                            onChange={(e) => setForm({ ...form, limite_credito_horas: parseInt(e.target.value) })}
                                                            className={`w-full px-4 py-3 rounded-xl border outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700 focus:border-amber-500' : 'bg-white border-slate-100'}`}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-bold opacity-60 ml-1">Limite Débito (Horas)</label>
                                                    <input
                                                        type="number"
                                                        value={form.limite_debito_horas}
                                                        onChange={(e) => setForm({ ...form, limite_debito_horas: parseInt(e.target.value) })}
                                                        className={`w-full px-4 py-3 rounded-xl border outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}
                                                    />
                                                </div>
                                                <div className="flex items-end pb-1">
                                                    <button
                                                        onClick={() => setForm({ ...form, permite_saldo_negativo: !form.permite_saldo_negativo })}
                                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all w-full font-bold text-xs ${form.permite_saldo_negativo ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                                    >
                                                        {form.permite_saldo_negativo ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                                        Saldo Negativo?
                                                    </button>
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {/* Adicional Noturno */}
                                    <section>
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-4 block flex items-center gap-2">
                                            <Moon size={14} /> Adicional Noturno
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold opacity-60 ml-1">Início</label>
                                                <input
                                                    type="time"
                                                    value={form.inicio_horario_noturno}
                                                    onChange={(e) => setForm({ ...form, inicio_horario_noturno: e.target.value })}
                                                    className={`w-full px-5 py-4 rounded-2xl border transition-all outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold opacity-60 ml-1">Fim</label>
                                                <input
                                                    type="time"
                                                    value={form.fim_horario_noturno}
                                                    onChange={(e) => setForm({ ...form, fim_horario_noturno: e.target.value })}
                                                    className={`w-full px-5 py-4 rounded-2xl border transition-all outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold opacity-60 ml-1">Adicional (%)</label>
                                                <input
                                                    type="number"
                                                    value={form.adicional_noturno_percentual}
                                                    onChange={(e) => setForm({ ...form, adicional_noturno_percentual: parseFloat(e.target.value) })}
                                                    className={`w-full px-5 py-4 rounded-2xl border transition-all outline-none font-bold ${isDark ? 'bg-slate-800/50 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-100 focus:border-indigo-500'}`}
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Opções Avançadas */}
                                    <section className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setForm({ ...form, is_default: !form.is_default })}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${form.is_default ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                                    <CheckCircle2 size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">Definir como Padrão da Empresa</h4>
                                                    <p className="text-[10px] opacity-60 font-medium font-bold uppercase tracking-wide">Novos funcionários herdam esta regra</p>
                                                </div>
                                            </div>
                                            <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${form.is_default ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${form.is_default ? 'right-1' : 'left-1'}`} />
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between gap-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className={`flex-1 py-4 rounded-2xl font-bold transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white border border-slate-200 hover:bg-slate-100'}`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 py-4 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={20} />
                                            {editingRegra ? 'Salvar Alterações' : 'Criar Regra'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RegrasHoras;
