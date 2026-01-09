import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import DataTable from '../components/DataTable';
import { Calendar, Trash2, User, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Afastamento {
    id: string;
    funcionario_id: string;
    tipo_afastamento_id: string;
    data_inicio: string;
    data_fim: string;
    observacoes: string;
    status: string;
    created_at: string;
    funcionarios?: { nome: string };
    tipos_afastamentos?: { nome: string; cor: string };
}

interface Funcionario {
    id: string;
    nome: string;
}

interface TipoAfastamento {
    id: string;
    nome: string;
    cor: string;
}

const Afastamentos = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [tiposAfastamento, setTiposAfastamento] = useState<TipoAfastamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        funcionario_id: '',
        tipo_afastamento_id: '',
        data_inicio: '',
        data_fim: '',
        observacoes: ''
    });

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchData();
        }
    }, [profile?.empresa_id]);

    const fetchData = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        const [afRes, funcRes, tiposRes] = await Promise.all([
            supabase.from('afastamentos')
                .select('*, funcionarios(nome), tipos_afastamentos(nome, cor)')
                .eq('empresa_id', profile.empresa_id)
                .order('data_inicio', { ascending: false }),
            supabase.from('funcionarios')
                .select('id, nome')
                .eq('empresa_id', profile.empresa_id)
                .eq('status', 'Ativo')
                .order('nome'),
            supabase.from('tipos_afastamentos')
                .select('id, nome, cor')
                .eq('empresa_id', profile.empresa_id)
                .order('nome')
        ]);

        if (afRes.data) setAfastamentos(afRes.data);
        if (funcRes.data) setFuncionarios(funcRes.data);
        if (tiposRes.data) setTiposAfastamento(tiposRes.data);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase.from('afastamentos').insert([{
            ...formData,
            empresa_id: profile?.empresa_id,
            status: 'Ativo'
        }]);

        if (error) {
            alert(error.message);
        } else {
            setIsModalOpen(false);
            setFormData({ funcionario_id: '', tipo_afastamento_id: '', data_inicio: '', data_fim: '', observacoes: '' });
            fetchData();
        }
        setSaving(false);
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Deseja realmente cancelar este afastamento?')) return;
        const { error } = await supabase.from('afastamentos').update({ status: 'Cancelado' }).eq('id', id);
        if (error) alert(error.message);
        else fetchData();
    };

    const calculateDays = (inicio: string, fim: string) => {
        const d1 = new Date(inicio);
        const d2 = new Date(fim);
        return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    const filteredAfastamentos = afastamentos.filter(a => {
        const matchSearch = (a.funcionarios?.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'Todos' || a.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const kpis = [
        { label: 'Total', value: afastamentos.length },
        { label: 'Ativos', value: afastamentos.filter(a => a.status === 'Ativo').length, color: 'green' as const },
        { label: 'Cancelados', value: afastamentos.filter(a => a.status === 'Cancelado').length, color: 'red' as const },
    ];

    const inputClass = `w-full border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
        }`;

    return (
        <>
            <DataTable
                title="Afastamentos"
                subtitle="Férias, atestados e licenças"
                kpis={kpis}
                searchPlaceholder="Buscar colaborador..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                filters={[
                    {
                        label: 'Status',
                        value: statusFilter,
                        options: [
                            { label: 'Todos', value: 'Todos' },
                            { label: 'Ativo', value: 'Ativo' },
                            { label: 'Cancelado', value: 'Cancelado' },
                        ],
                        onChange: setStatusFilter
                    }
                ]}
                columns={[
                    { key: 'funcionario', label: 'Colaborador' },
                    { key: 'tipo', label: 'Tipo' },
                    { key: 'periodo', label: 'Período' },
                    { key: 'dias', label: 'Dias' },
                    { key: 'status', label: 'Status' },
                    { key: 'acoes', label: 'Ações', width: '100px' },
                ]}
                data={filteredAfastamentos}
                renderRow={(af) => (
                    <tr key={af.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                    <User size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                </div>
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{af.funcionarios?.nome || 'N/A'}</span>
                            </div>
                        </td>
                        <td className="px-5 py-4">
                            <span
                                className="px-2 py-1 rounded text-[10px] font-semibold"
                                style={{
                                    backgroundColor: `${af.tipos_afastamentos?.cor || '#6B7280'}15`,
                                    color: af.tipos_afastamentos?.cor || '#6B7280'
                                }}
                            >
                                {af.tipos_afastamentos?.nome || 'N/A'}
                            </span>
                        </td>
                        <td className={`px-5 py-4 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {new Date(af.data_inicio).toLocaleDateString('pt-BR')} → {new Date(af.data_fim).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-5 py-4">
                            <span className="text-xs font-bold text-primary-500">{calculateDays(af.data_inicio, af.data_fim)} dias</span>
                        </td>
                        <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${af.status === 'Ativo'
                                ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                                : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                }`}>
                                {af.status}
                            </span>
                        </td>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                                {af.status === 'Ativo' && (
                                    <button
                                        onClick={() => handleCancel(af.id)}
                                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-red-500`}
                                        title="Cancelar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                )}
                onRefresh={fetchData}
                onAdd={() => setIsModalOpen(true)}
                addButtonLabel="Novo Afastamento"
                loading={loading}
            />

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-lg rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="flex justify-between items-start mb-5">
                                    <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Novo Afastamento</h2>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Colaborador</label>
                                        <select required className={inputClass} value={formData.funcionario_id} onChange={e => setFormData({ ...formData, funcionario_id: e.target.value })}>
                                            <option value="">Selecionar...</option>
                                            {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tipo</label>
                                        <select required className={inputClass} value={formData.tipo_afastamento_id} onChange={e => setFormData({ ...formData, tipo_afastamento_id: e.target.value })}>
                                            <option value="">Selecionar...</option>
                                            {tiposAfastamento.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Início</label>
                                            <input required type="date" className={inputClass} value={formData.data_inicio} onChange={e => setFormData({ ...formData, data_inicio: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Fim</label>
                                            <input required type="date" className={inputClass} value={formData.data_fim} onChange={e => setFormData({ ...formData, data_fim: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Observações</label>
                                        <textarea rows={2} className={`${inputClass} resize-none`} placeholder="Informações adicionais..." value={formData.observacoes} onChange={e => setFormData({ ...formData, observacoes: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Cancelar</button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Registrar</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
        </>
    );
};

export default Afastamentos;
