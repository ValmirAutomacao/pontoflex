import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    UserCog,
    AlertCircle,
    X,
    Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Setor {
    id: string;
    nome: string;
    descricao: string;
    status: string;
    created_at: string;
    empresa_id?: string;
}

const Setores = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [setores, setSetores] = useState<Setor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
    const [formData, setFormData] = useState({ nome: '', descricao: '', status: 'Ativo' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSetores();
    }, [profile]);

    const fetchSetores = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('setores')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Erro ao buscar setores:', error);
        else setSetores(data || []);
        setLoading(false);
    };

    const handleOpenCreate = () => {
        setEditingSetor(null);
        setFormData({ nome: '', descricao: '', status: 'Ativo' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (setor: Setor) => {
        setEditingSetor(setor);
        setFormData({ nome: setor.nome, descricao: setor.descricao, status: setor.status });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingSetor) {
                const { error } = await supabase
                    .from('setores')
                    .update({
                        nome: formData.nome,
                        descricao: formData.descricao,
                        status: formData.status
                    })
                    .eq('id', editingSetor.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('setores')
                    .insert([{
                        nome: formData.nome,
                        descricao: formData.descricao,
                        status: formData.status,
                        empresa_id: profile?.empresa_id
                    }]);

                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchSetores();
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir este setor?')) return;

        const { error } = await supabase
            .from('setores')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro ao excluir: ' + error.message);
            return;
        }

        fetchSetores();
    };

    const filteredSetores = setores.filter(s =>
        s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cardClass = `rounded-xl p-5 border transition-all hover:shadow-md ${isDark
        ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
        : 'bg-white border-slate-200 hover:border-primary-300 shadow-sm'
        }`;

    const inputClass = `w-full border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark
        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
        }`;

    return (
        <div className="pb-12">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Setores
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Gerencie os departamentos da organização
                    </p>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                        <input
                            type="text"
                            placeholder="Buscar setores..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${inputClass} pl-10 w-56`}
                        />
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="bg-primary-500 hover:bg-primary-600 px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition-all shadow-glow flex items-center gap-2"
                    >
                        <Plus size={16} /> Novo Setor
                    </button>
                </div>
            </header>

            {/* Grid de Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className={`h-36 rounded-xl animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                    ))
                ) : filteredSetores.length > 0 ? (
                    filteredSetores.map((setor) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={setor.id}
                            className={cardClass}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'
                                    }`}>
                                    <UserCog size={18} />
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleOpenEdit(setor)}
                                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-primary-500`}
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(setor.id)}
                                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-red-500`}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <h3 className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{setor.nome}</h3>
                            <p className={`text-sm line-clamp-2 mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{setor.descricao}</p>

                            <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${setor.status === 'Ativo'
                                    ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                                    : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                    }`}>
                                    {setor.status}
                                </span>
                                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {new Date(setor.created_at).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className={`col-span-full py-12 flex flex-col items-center justify-center rounded-xl border border-dashed ${isDark ? 'bg-slate-800/30 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-400'
                        }`}>
                        <AlertCircle size={40} className="mb-3 opacity-30" />
                        <p className="text-sm">Nenhum setor encontrado.</p>
                    </div>
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
                            className={`relative w-full max-w-lg rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {editingSetor ? 'Editar Setor' : 'Novo Setor'}
                                        </h2>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {editingSetor ? 'Atualize as informações.' : 'Preencha os dados do setor.'}
                                        </p>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Nome do Setor
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Ex: Recursos Humanos"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Descrição
                                        </label>
                                        <textarea
                                            required
                                            placeholder="Descreva as responsabilidades..."
                                            value={formData.descricao}
                                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                            className={`${inputClass} h-20 resize-none`}
                                        />
                                    </div>
                                    {editingSetor && (
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Status
                                            </label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className={inputClass}
                                            >
                                                <option value="Ativo">Ativo</option>
                                                <option value="Inativo">Inativo</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                }`}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {saving ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <><Save size={14} /> {editingSetor ? 'Atualizar' : 'Cadastrar'}</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </div >
    );
};

export default Setores;
