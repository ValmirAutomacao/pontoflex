import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import DataTable from '../components/DataTable';
import { FileText, Edit2, Trash2, CheckCircle, XCircle, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TipoJustificativa {
    id: string;
    nome: string;
    descricao: string;
    requer_aprovacao: boolean;
    ativo: boolean;
    created_at: string;
}

const TiposJustificativa = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [tipos, setTipos] = useState<TipoJustificativa[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        nome: '', descricao: '', requer_aprovacao: true
    });

    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        setLoading(true);
        const { data } = await supabase.from('tipos_justificativas_ponto').select('*').order('nome');
        if (data) setTipos(data);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase.from('tipos_justificativas_ponto').insert([{
            ...formData,
            empresa_id: profile?.empresa_id
        }]);

        if (error) alert(error.message);
        else {
            setIsModalOpen(false);
            setFormData({ nome: '', descricao: '', requer_aprovacao: true });
            fetchTipos();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este tipo?')) return;
        const { error } = await supabase.from('tipos_justificativas_ponto').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchTipos();
    };

    const filteredTipos = tipos.filter(t => t.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    const inputClass = `w-full border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
        }`;

    const kpis = [
        { label: 'Total', value: tipos.length },
        { label: 'Com Aprovação', value: tipos.filter(t => t.requer_aprovacao).length, color: 'orange' as const },
        { label: 'Automáticas', value: tipos.filter(t => !t.requer_aprovacao).length, color: 'green' as const },
    ];

    return (
        <>
            <DataTable
                title="Tipos de Justificativa"
                subtitle="Configure motivos para ajustes de ponto"
                kpis={kpis}
                searchPlaceholder="Buscar..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                columns={[
                    { key: 'nome', label: 'Tipo' },
                    { key: 'descricao', label: 'Descrição' },
                    { key: 'aprovacao', label: 'Aprovação' },
                    { key: 'status', label: 'Status' },
                    { key: 'acoes', label: 'Ações', width: '100px' },
                ]}
                data={filteredTipos}
                renderRow={(tipo) => (
                    <tr key={tipo.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                                    <FileText size={18} />
                                </div>
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{tipo.nome}</span>
                            </div>
                        </td>
                        <td className={`px-5 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{tipo.descricao || '-'}</td>
                        <td className="px-5 py-4">
                            {tipo.requer_aprovacao ? (
                                <span className={`flex items-center gap-1 text-xs font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                    <XCircle size={12} /> Requer Aprovação
                                </span>
                            ) : (
                                <span className={`flex items-center gap-1 text-xs font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                    <CheckCircle size={12} /> Automática
                                </span>
                            )}
                        </td>
                        <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${tipo.ativo !== false
                                ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                                : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                }`}>
                                {tipo.ativo !== false ? 'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                                <button className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-primary-500`}>
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(tipo.id)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-red-500`}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </td>
                    </tr>
                )}
                onRefresh={fetchTipos}
                onAdd={() => setIsModalOpen(true)}
                addButtonLabel="Novo Tipo"
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
                                    <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Novo Tipo</h2>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nome</label>
                                        <input required className={inputClass} placeholder="Ex: Esquecimento" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Descrição</label>
                                        <textarea rows={2} className={`${inputClass} resize-none`} placeholder="Descrição opcional..." value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="requer" checked={formData.requer_aprovacao} onChange={e => setFormData({ ...formData, requer_aprovacao: e.target.checked })} className="rounded" />
                                        <label htmlFor="requer" className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Requer aprovação do gestor</label>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Cancelar</button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Salvar</>}
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

export default TiposJustificativa;
