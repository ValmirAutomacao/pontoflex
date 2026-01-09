import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
    Plus,
    Search,
    Trash2,
    Edit2,
    Briefcase,
    ChevronRight,
    ChevronDown,
    CheckCircle2,
    Shield,
    X,
    Save,
    MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Funcao {
    id: string;
    nome: string;
    descricao: string;
    setor_id: string;
    nivel: number;
    permissoes: string[];
    setores?: { nome: string };
}

interface Setor {
    id: string;
    nome: string;
}

const PERMISSOES_MODULOS = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        items: [
            { id: 'modulo_dashboard', label: 'Painel Geral', desc: 'Visualizar indicadores e estatísticas' },
        ]
    },
    {
        id: 'organizacional',
        label: 'Gestão Organizacional',
        items: [
            { id: 'modulo_setores', label: 'Setores', desc: 'Gerenciar departamentos' },
            { id: 'modulo_funcoes', label: 'Funções', desc: 'Configurar cargos e permissões' },
            { id: 'modulo_jornadas', label: 'Jornadas', desc: 'Controlar horários de trabalho' },
            { id: 'modulo_locais', label: 'Locais de Trabalho', desc: 'Gerenciar unidades e obras' },
        ]
    },
    {
        id: 'pessoal',
        label: 'Gestão de Pessoal',
        items: [
            { id: 'modulo_colaboradores', label: 'Colaboradores', desc: 'Gestão completa de funcionários' },
            { id: 'modulo_biometria', label: 'Biometria', desc: 'Gerenciar cadastros biométricos' },
        ]
    },
    {
        id: 'ponto',
        label: 'Módulo Ponto',
        items: [
            { id: 'modulo_registro_ponto', label: 'Registro de Ponto', desc: 'Acesso à tela de marcação' },
            { id: 'modulo_controle_ponto', label: 'Controle de Ponto', desc: 'Visualizar e validar batidas' },
            { id: 'modulo_afastamentos', label: 'Afastamentos', desc: 'Gerenciar faltas, férias e atestados' },
        ]
    },
    {
        id: 'configuracoes',
        label: 'Configurações',
        items: [
            { id: 'modulo_justificativas', label: 'Tipos de Justificativa', desc: 'Configurar motivos de ajuste' },
            { id: 'modulo_tipos_afastamento', label: 'Tipos de Afastamento', desc: 'Categorias de ausência' },
        ]
    }
];

const Funcoes = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [funcoes, setFuncoes] = useState<Funcao[]>([]);
    const [setores, setSetores] = useState<Setor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFuncao, setEditingFuncao] = useState<Funcao | null>(null);
    const [expandedModule, setExpandedModule] = useState<string | null>('ponto');
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        setor_id: '',
        nivel: 3,
        permissoes: [] as string[]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [funData, setOrData] = await Promise.all([
            supabase.from('funcoes').select('*, setores(nome)').order('created_at', { ascending: false }),
            supabase.from('setores').select('id, nome').eq('status', 'Ativo')
        ]);

        if (funData.data) setFuncoes(funData.data);
        if (setOrData.data) setSetores(setOrData.data);
        setLoading(false);
    };

    const handleOpenCreate = () => {
        setEditingFuncao(null);
        setFormData({ nome: '', descricao: '', setor_id: '', nivel: 3, permissoes: [] });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (funcao: Funcao) => {
        setEditingFuncao(funcao);
        setFormData({
            nome: funcao.nome,
            descricao: funcao.descricao || '',
            setor_id: funcao.setor_id,
            nivel: funcao.nivel,
            permissoes: funcao.permissoes || []
        });
        setIsModalOpen(true);
    };

    const handleTogglePermission = (id: string) => {
        setFormData(prev => ({
            ...prev,
            permissoes: prev.permissoes.includes(id)
                ? prev.permissoes.filter(p => p !== id)
                : [...prev.permissoes, id]
        }));
    };

    const handleToggleAllModule = (moduleId: string) => {
        const module = PERMISSOES_MODULOS.find(m => m.id === moduleId);
        if (!module) return;

        const allModuleIds = module.items.map(item => item.id);
        const hasAll = allModuleIds.every(id => formData.permissoes.includes(id));

        if (hasAll) {
            // Remove all from module
            setFormData(prev => ({
                ...prev,
                permissoes: prev.permissoes.filter(id => !allModuleIds.includes(id))
            }));
        } else {
            // Add all from module (avoiding duplicates)
            setFormData(prev => {
                const newPerms = [...prev.permissoes];
                allModuleIds.forEach(id => {
                    if (!newPerms.includes(id)) newPerms.push(id);
                });
                return { ...prev, permissoes: newPerms };
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingFuncao) {
                const { error } = await supabase
                    .from('funcoes')
                    .update(formData)
                    .eq('id', editingFuncao.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('funcoes').insert([{
                    ...formData,
                    empresa_id: profile?.empresa_id
                }]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir esta função?')) return;
        const { error } = await supabase.from('funcoes').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchData();
    };

    const filteredFuncoes = funcoes.filter(f =>
        (f.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

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
                        Funções
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Configure cargos, níveis e permissões
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                        <input
                            type="text"
                            placeholder="Buscar funções..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${inputClass} pl-10 w-56`}
                        />
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="bg-primary-500 hover:bg-primary-600 px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition-all shadow-glow flex items-center gap-2"
                    >
                        <Plus size={16} /> Nova Função
                    </button>
                </div>
            </header>

            {/* Tabela de Funções */}
            <div className={cardClass}>
                <table className="w-full text-left">
                    <thead>
                        <tr className={`border-b ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}`}>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Função / Setor</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nível</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Permissões</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-right ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ações</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center">
                                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : filteredFuncoes.length === 0 ? (
                            <tr>
                                <td colSpan={4} className={`px-6 py-10 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Nenhuma função cadastrada.
                                </td>
                            </tr>
                        ) : (
                            filteredFuncoes.map((fun) => (
                                <tr key={fun.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                                                <Briefcase size={18} />
                                            </div>
                                            <div>
                                                <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{fun.nome}</p>
                                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{fun.setores?.nome || 'Sem setor'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${fun.nivel === 1
                                            ? isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'
                                            : fun.nivel === 2
                                                ? isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'
                                                : isDark ? 'bg-slate-500/10 text-slate-400' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {fun.nivel === 1 ? 'GESTÃO' : fun.nivel === 2 ? 'TÉCNICO' : 'OPERACIONAL'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-primary-500" />
                                            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{fun.permissoes?.length || 0} ativas</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleOpenEdit(fun)}
                                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-primary-500`}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(fun.id)}
                                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-red-500`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
                                            {editingFuncao ? 'Editar Função' : 'Nova Função'}
                                        </h2>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Configure o cargo e suas permissões
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div className="col-span-2">
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nome da Função</label>
                                        <input
                                            required
                                            className={inputClass}
                                            placeholder="Ex: Supervisor de Obra"
                                            value={formData.nome}
                                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Setor</label>
                                        <select
                                            required
                                            className={inputClass}
                                            value={formData.setor_id}
                                            onChange={e => setFormData({ ...formData, setor_id: e.target.value })}
                                        >
                                            <option value="">Selecionar...</option>
                                            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nível Hierárquico</label>
                                        <select
                                            className={inputClass}
                                            value={formData.nivel}
                                            onChange={e => setFormData({ ...formData, nivel: Number(e.target.value) })}
                                        >
                                            <option value={1}>1 - Gestão</option>
                                            <option value={2}>2 - Técnico</option>
                                            <option value={3}>3 - Operacional</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Permissões */}
                                <div className="mb-5">
                                    <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Permissões de Acesso</label>
                                    <div className="space-y-2">
                                        {PERMISSOES_MODULOS.map((mod) => (
                                            <div key={mod.id} className={`border rounded-lg overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                                                    className={`w-full flex items-center justify-between px-4 py-3 ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'}`}
                                                >
                                                    <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{mod.label}</span>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleAllModule(mod.id);
                                                            }}
                                                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${mod.items.every(item => formData.permissoes.includes(item.id))
                                                                ? 'bg-primary-500 text-white'
                                                                : isDark ? 'bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                                                }`}
                                                        >
                                                            Marcar Todos
                                                        </button>
                                                        {expandedModule === mod.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </div>
                                                </button>
                                                <AnimatePresence>
                                                    {expandedModule === mod.id && (
                                                        <motion.div
                                                            initial={{ height: 0 }}
                                                            animate={{ height: 'auto' }}
                                                            exit={{ height: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className={`p-3 space-y-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                                                {mod.items.map(item => (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => handleTogglePermission(item.id)}
                                                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${formData.permissoes.includes(item.id)
                                                                            ? 'border-primary-500 bg-primary-500/5'
                                                                            : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                                                                            }`}
                                                                    >
                                                                        <div>
                                                                            <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.label}</p>
                                                                            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</p>
                                                                        </div>
                                                                        {formData.permissoes.includes(item.id) ? (
                                                                            <CheckCircle2 size={18} className="text-primary-500" />
                                                                        ) : (
                                                                            <div className={`w-4 h-4 rounded-full border-2 ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3">
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
                                            <><Save size={14} /> {editingFuncao ? 'Atualizar' : 'Cadastrar'}</>
                                        )}
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

export default Funcoes;
