import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Plus,
    Clock,
    Edit2,
    Trash2,
    X,
    Save,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Jornada {
    id: string;
    nome: string;
    pe: string;
    ps: string;
    se: string;
    ss: string;
    carga_horaria_diaria: number;
    carga_horaria_semanal: number;
    carga_horaria_mensal: number;
    controle_horas_extras: boolean;
    preencher_saida_automatica: boolean;
    tipo_jornada_esocial: number;
    status?: string;
}

const Jornadas = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [jornadas, setJornadas] = useState<Jornada[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJornada, setEditingJornada] = useState<Jornada | null>(null);
    const [formData, setFormData] = useState({
        nome: '',
        pe: '08:00',
        ps: '12:00',
        se: '13:00',
        ss: '17:00',
        carga_horaria_semanal: 2640,
        carga_horaria_mensal: 13200,
        controle_horas_extras: true,
        preencher_saida_automatica: false,
        tipo_jornada_esocial: 1,
        status: 'Ativo'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchJornadas();
        }
    }, [profile?.empresa_id]);

    useEffect(() => {
        const daily = calculateCargaMinutes(formData.pe, formData.ps, formData.se, formData.ss);
        // Só atualizamos semanal/mensal se estivermos criando ou se o usuário não tiver mexido neles manualmente?
        // Vamos apenas atualizar o diário e sugerir o semanal se for o padrão comercial
        if (daily > 0 && !editingJornada) {
            // Se for jornada comercial padrão (8h ou 8h48min), sugerimos 44h/220h
            if (Math.abs(daily - 480) < 60 || Math.abs(daily - 528) < 60) {
                setFormData(prev => ({
                    ...prev,
                    carga_horaria_semanal: 44 * 60,
                    carga_horaria_mensal: 220 * 60
                }));
            }
        }
    }, [formData.pe, formData.ps, formData.se, formData.ss]);

    const fetchJornadas = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        const { data } = await supabase
            .from('jornadas_trabalho')
            .select('*')
            .eq('empresa_id', profile.empresa_id)
            .order('created_at', { ascending: false });
        if (data) setJornadas(data);
        setLoading(false);
    };

    const calculateCargaMinutes = (pe: string, ps: string, se: string, ss: string) => {
        const toMinutes = (time: string) => {
            if (!time) return 0;
            const [h, m] = time.split(':').map(Number);
            return (h || 0) * 60 + (m || 0);
        };
        const daily = (toMinutes(ps) - toMinutes(pe)) + (toMinutes(ss) - toMinutes(se));
        return daily;
    };

    const updateCalculatedHours = (dailyMinutes: number) => {
        // Padrão CLT: 44h semanais (8h seg-sex + 4h sab)
        // User pediu: 44h por 5 semanas = 220h
        const weekly = 44 * 60; // 2640 min
        const monthly = weekly * 5; // 13200 min

        setFormData(prev => ({
            ...prev,
            carga_horaria_semanal: weekly,
            carga_horaria_mensal: monthly
        }));
    };

    const formatMinutes = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h${m > 0 ? m + 'min' : ''}`;
    };

    const handleOpenCreate = () => {
        setEditingJornada(null);
        setFormData({
            nome: '',
            pe: '08:00',
            ps: '12:00',
            se: '13:00',
            ss: '17:00',
            carga_horaria_semanal: 2640,
            carga_horaria_mensal: 13200,
            controle_horas_extras: true,
            preencher_saida_automatica: false,
            tipo_jornada_esocial: 1,
            status: 'Ativo'
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (j: Jornada) => {
        setEditingJornada(j);
        setFormData({
            nome: j.nome,
            pe: j.pe.slice(0, 5),
            ps: j.ps.slice(0, 5),
            se: j.se.slice(0, 5),
            ss: j.ss.slice(0, 5),
            carga_horaria_semanal: j.carga_horaria_semanal || 2640,
            carga_horaria_mensal: j.carga_horaria_mensal || 13200,
            controle_horas_extras: j.controle_horas_extras ?? true,
            preencher_saida_automatica: j.preencher_saida_automatica ?? false,
            tipo_jornada_esocial: j.tipo_jornada_esocial || 1,
            status: j.status || 'Ativo'
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const cargaMinutes = calculateCargaMinutes(formData.pe, formData.ps, formData.se, formData.ss);

        try {
            const dataToSave = {
                ...formData,
                carga_horaria_diaria: cargaMinutes,
                pe: formData.pe + ':00',
                ps: formData.ps + ':00',
                se: formData.se + ':00',
                ss: formData.ss + ':00'
            };

            if (editingJornada) {
                const { error } = await supabase
                    .from('jornadas_trabalho')
                    .update(dataToSave)
                    .eq('id', editingJornada.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('jornadas_trabalho')
                    .insert([{ ...dataToSave, empresa_id: profile?.empresa_id }]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            fetchJornadas();
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir esta jornada?')) return;
        const { error } = await supabase.from('jornadas_trabalho').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchJornadas();
    };

    const handleExportESocial = () => {
        const header = ['Identificador', 'Descricao', 'TipoJornada', 'Turno', 'Entrada', 'Saida1', 'Entrada2', 'Saida2', 'CargaSemanal', 'CargaMensal'];
        const rows = jornadas.map(j => [
            j.id.slice(0, 8),
            j.nome,
            j.tipo_jornada_esocial || 1,
            'Dia',
            j.pe,
            j.ps,
            j.se,
            j.ss,
            (j.carga_horaria_semanal / 60).toFixed(1),
            (j.carga_horaria_mensal / 60).toFixed(1)
        ]);

        const csvContent = [
            header.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `esocial_jornadas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const cardClass = `rounded-xl border transition-all ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        }`;

    const inputClass = `w-full border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark
        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
        }`;

    return (
        <div className="pb-12">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Jornadas de Trabalho
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Configure horários e escalas
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleExportESocial()}
                        className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'}`}
                        title="Exportar eSocial"
                    >
                        <Clock size={16} /> <span className="text-xs font-semibold">Exportar eSocial</span>
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="bg-primary-500 hover:bg-primary-600 px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition-all shadow-glow flex items-center gap-2"
                    >
                        <Plus size={16} /> Nova Jornada
                    </button>
                </div>
            </header>

            {/* Grid de Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className={`h-36 rounded-xl animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                    ))
                ) : jornadas.length === 0 ? (
                    <div className={`col-span-full py-12 text-center rounded-xl border border-dashed ${isDark ? 'bg-slate-800/30 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-400'
                        }`}>
                        Nenhuma jornada cadastrada.
                    </div>
                ) : (
                    jornadas.map((j) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={j.id}
                            className={`${cardClass} p-5`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                                    <Clock size={18} />
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleOpenEdit(j)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-primary-500`}>
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(j.id)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-red-500`}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <h3 className={`text-base font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{j.nome}</h3>
                            <div className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                <span>{j.pe?.slice(0, 5)} - {j.ps?.slice(0, 5)}</span>
                                <span className="mx-2">|</span>
                                <span>{j.se?.slice(0, 5)} - {j.ss?.slice(0, 5)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${j.status === 'Ativo'
                                    ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                                    : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                    }`}>
                                    {j.status || 'Ativo'}
                                </span>
                                <div className="flex flex-col gap-1 mt-2">
                                    <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Carga: {formatMinutes(j.carga_horaria_diaria || 0)}/dia • {formatMinutes(j.carga_horaria_semanal || 0)}/sem • {formatMinutes(j.carga_horaria_mensal || 0)}/mês
                                    </span>
                                    <span className={`text-[10px] font-medium ${j.controle_horas_extras ? 'text-primary-500' : 'text-slate-500'}`}>
                                        {j.controle_horas_extras ? 'Controle de HE Ativo' : 'Sem Horas Extras'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-2xl rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {editingJornada ? 'Editar Jornada' : 'Nova Jornada'}
                                        </h2>
                                    </div>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nome da Jornada</label>
                                        <input required className={inputClass} placeholder="Ex: Comercial 44h" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Entrada 1º Turno</label>
                                            <input type="time" className={inputClass} value={formData.pe} onChange={e => setFormData({ ...formData, pe: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Saída 1º Turno</label>
                                            <input type="time" className={inputClass} value={formData.ps} onChange={e => setFormData({ ...formData, ps: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Entrada 2º Turno</label>
                                            <input type="time" className={inputClass} value={formData.se} onChange={e => setFormData({ ...formData, se: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Saída 2º Turno</label>
                                            <input type="time" className={inputClass} value={formData.ss} onChange={e => setFormData({ ...formData, ss: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4 border-slate-200 dark:border-slate-700">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Carga Semanal (horas)</label>
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={formData.carga_horaria_semanal / 60}
                                                onChange={e => setFormData({ ...formData, carga_horaria_semanal: Number(e.target.value) * 60 })}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Carga Mensal (horas)</label>
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={formData.carga_horaria_mensal / 60}
                                                onChange={e => setFormData({ ...formData, carga_horaria_mensal: Number(e.target.value) * 60 })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 py-2">
                                            <input
                                                type="checkbox"
                                                id="he"
                                                checked={formData.controle_horas_extras}
                                                onChange={e => setFormData({ ...formData, controle_horas_extras: e.target.checked })}
                                            />
                                            <label htmlFor="he" className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Habilitar Horas Extras</label>
                                        </div>
                                        <div className="flex items-center gap-2 py-2">
                                            <input
                                                type="checkbox"
                                                id="saida_auto"
                                                checked={formData.preencher_saida_automatica}
                                                onChange={e => setFormData({ ...formData, preencher_saida_automatica: e.target.checked })}
                                            />
                                            <label htmlFor="saida_auto" className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Preencher Saída Automática</label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tipo de Jornada (eSocial)</label>
                                        <select className={inputClass} value={formData.tipo_jornada_esocial} onChange={e => setFormData({ ...formData, tipo_jornada_esocial: Number(e.target.value) })}>
                                            <option value={1}>1 - Horário Fixo</option>
                                            <option value={2}>2 - Horário Variável (Fins de Semana)</option>
                                            <option value={3}>3 - Jornada 12x36</option>
                                            <option value={9}>9 - Demais tipos</option>
                                        </select>
                                    </div>

                                    {editingJornada && (
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Status</label>
                                            <select className={inputClass} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                                <option value="Ativo">Ativo</option>
                                                <option value="Inativo">Inativo</option>
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Salvar</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </div >
    );
};

export default Jornadas;
