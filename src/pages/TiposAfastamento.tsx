import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import DataTable from '../components/DataTable';
import { Calendar, Edit2, Trash2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TipoAfastamento {
    id: string;
    nome: string;
    descricao: string;
    remunerado: boolean;
    limite_dias: number | null;
    cor: string;
    ativo: boolean;
    created_at: string;
}

const TiposAfastamento = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [tipos, setTipos] = useState<TipoAfastamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        nome: '', descricao: '', remunerado: true, limite_dias: '', cor: '#0066CC'
    });

    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        setLoading(true);
        const { data } = await supabase.from('tipos_afastamentos').select('*').order('nome');
        if (data) setTipos(data);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase.from('tipos_afastamentos').insert([{
            ...formData,
            limite_dias: formData.limite_dias ? parseInt(formData.limite_dias) : null,
            empresa_id: profile?.empresa_id
        }]);

        if (error) alert(error.message);
        else {
            setIsModalOpen(false);
            setFormData({ nome: '', descricao: '', remunerado: true, limite_dias: '', cor: '#0066CC' });
            fetchTipos();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir este tipo?')) return;
        const { error } = await supabase.from('tipos_afastamentos').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchTipos();
    };

    const filteredTipos = tipos.filter(t => (t.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()));

    const inputClass = `w-full border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
        }`;

    const kpis = [
        { label: 'Total', value: tipos.length },
        { label: 'Remunerados', value: tipos.filter(t => t.remunerado).length, color: 'green' as const },
        { label: 'Não Remunerados', value: tipos.filter(t => !t.remunerado).length, color: 'orange' as const },
    ];

    return (
        <>
            <DataTable
                title="Tipos de Afastamento"
                subtitle="Férias, atestados, licenças, etc."
                kpis={kpis}
                searchPlaceholder="Buscar..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                columns={[
                    { key: 'nome', label: 'Tipo' },
                    { key: 'descricao', label: 'Descrição' },
                    { key: 'remunerado', label: 'Remuneração' },
                    { key: 'limite', label: 'Limite' },
                    { key: 'acoes', label: 'Ações', width: '100px' },
                ]}
                data={filteredTipos}
                renderRow={(tipo) => (
                    <tr key={tipo.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tipo.cor}15`, color: tipo.cor }}>
                                    <Calendar size={18} />
                                </div>
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{tipo.nome}</span>
                            </div>
                        </td>
                        <td className={`px-5 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{tipo.descricao || '-'}</td>
                        <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${tipo.remunerado
                                ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                                : isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
                                }`}>
                                {tipo.remunerado ? 'Remunerado' : 'Não Remunerado'}
                            </span>
                        </td>
                        <td className={`px-5 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {tipo.limite_dias ? `${tipo.limite_dias} dias` : 'Sem limite'}
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
                                        <input required className={inputClass} placeholder="Ex: Férias" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Descrição</label>
                                        <textarea rows={2} className={`${inputClass} resize-none`} placeholder="Descrição opcional..." value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Limite de Dias</label>
                                            <input type="number" className={inputClass} placeholder="Sem limite" value={formData.limite_dias} onChange={e => setFormData({ ...formData, limite_dias: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cor</label>
                                            <input type="color" className={`${inputClass} h-10 p-1 cursor-pointer`} value={formData.cor} onChange={e => setFormData({ ...formData, cor: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="remunerado" checked={formData.remunerado} onChange={e => setFormData({ ...formData, remunerado: e.target.checked })} className="rounded" />
                                        <label htmlFor="remunerado" className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Afastamento remunerado</label>
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

export default TiposAfastamento;
