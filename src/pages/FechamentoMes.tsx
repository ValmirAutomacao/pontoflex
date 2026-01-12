import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Lock,
    Unlock,
    Calendar,
    Users,
    FileText,
    CheckCircle2,
    AlertCircle,
    Plus,
    ChevronRight,
    Search,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Periodo {
    id: string;
    data_inicio: string;
    data_fim: string;
    status: 'aberto' | 'fechado';
    fechado_por: string;
    created_at: string;
}

interface PeriodoStats {
    total_funcionarios: number;
    assinaturas_concluidas: number;
}

const FechamentoMes: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [periodos, setPeriodos] = useState<Periodo[]>([]);
    const [stats, setStats] = useState<Record<string, PeriodoStats>>({});
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newPeriod, setNewPeriod] = useState({
        inicio: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
        fim: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
    });

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchPeriodos();
        }
    }, [profile?.empresa_id]);

    const fetchPeriodos = async () => {
        setLoading(true);
        try {
            const { data: periodosData, error } = await supabase
                .from('periodos_fechamento')
                .select('*')
                .eq('empresa_id', profile?.empresa_id)
                .order('data_inicio', { ascending: false });

            if (error) throw error;
            setPeriodos(periodosData || []);

            // Fetch signature stats for each period
            const newStats: Record<string, PeriodoStats> = {};
            for (const p of (periodosData || [])) {
                const { count: total, error: err1 } = await supabase
                    .from('funcionarios')
                    .select('*', { count: 'exact', head: true })
                    .eq('empresa_id', profile?.empresa_id)
                    .eq('status', 'Ativo');

                const { count: assinadas, error: err2 } = await supabase
                    .from('assinaturas_espelho')
                    .select('*', { count: 'exact', head: true })
                    .eq('periodo_id', p.id);

                newStats[p.id] = {
                    total_funcionarios: total || 0,
                    assinaturas_concluidas: assinadas || 0
                };
            }
            setStats(newStats);
        } catch (error) {
            console.error('Erro ao buscar períodos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePeriodo = async () => {
        if (!profile?.empresa_id) return;
        try {
            const { error } = await supabase
                .from('periodos_fechamento')
                .insert([{
                    empresa_id: profile.empresa_id,
                    data_inicio: newPeriod.inicio,
                    data_fim: newPeriod.fim,
                    status: 'fechado', // Já cria como fechado para liberar assinatura
                    fechado_por: profile.funcionario_id
                }]);

            if (error) throw error;
            setShowNewModal(false);
            fetchPeriodos();
        } catch (error) {
            console.error('Erro ao criar período:', error);
            alert('Erro ao criar período. Verifique as datas.');
        }
    };

    const cardClass = `rounded-2xl border ${isDark
        ? 'bg-slate-800/50 border-slate-700/50'
        : 'bg-white border-slate-200 shadow-soft'}`;

    return (
        <div className="p-8 pb-20 min-h-screen">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Fechamento de Ponto
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Encerrar períodos e gerenciar assinaturas digitais
                    </p>
                </div>

                <button
                    onClick={() => setShowNewModal(true)}
                    className="flex items-center gap-2 px-6 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold text-sm transition-all shadow-glow"
                >
                    <Plus size={20} />
                    Novo Fechamento
                </button>
            </div>

            {/* Content List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm font-bold opacity-40">Carregando períodos...</p>
                    </div>
                ) : periodos.length === 0 ? (
                    <div className={`${cardClass} col-span-full p-20 text-center`}>
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock size={32} />
                        </div>
                        <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Nenhum período encerrado</h3>
                        <p className="text-sm font-medium opacity-40 max-w-xs mx-auto mb-8">
                            Para coletar as assinaturas dos funcionários, você precisa primeiro encerrar um mês de trabalho.
                        </p>
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold text-sm"
                        >
                            Criar Primeiro Fechamento
                        </button>
                    </div>
                ) : (
                    periodos.map((periodo) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={periodo.id}
                            className={`${cardClass} p-6 hover:border-primary-500/30 transition-all cursor-pointer group`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-700 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                                    <Calendar size={24} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${periodo.status === 'fechado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                    }`}>
                                    {periodo.status === 'fechado' ? 'Encerrado' : 'Aberto'}
                                </span>
                            </div>

                            <h3 className={`text-lg font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {new Date(periodo.data_inicio).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                            </h3>
                            <p className="text-xs font-bold opacity-40 mb-6">
                                {new Date(periodo.data_inicio).toLocaleDateString('pt-BR')} até {new Date(periodo.data_fim).toLocaleDateString('pt-BR')}
                            </p>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                                        <span>Assinaturas Coletadas</span>
                                        <span>{stats[periodo.id]?.assinaturas_concluidas || 0} / {stats[periodo.id]?.total_funcionarios || 0}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(stats[periodo.id]?.assinaturas_concluidas / stats[periodo.id]?.total_funcionarios) * 100 || 0}%` }}
                                            className="h-full bg-primary-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center group-hover:border-primary-500/20 transition-all">
                                <div className="flex items-center gap-2">
                                    <Users size={14} className="opacity-40" />
                                    <span className="text-[10px] font-bold opacity-40 uppercase">Ver Funcionários</span>
                                </div>
                                <ChevronRight size={16} className="text-primary-500 transform group-hover:translate-x-1 transition-all" />
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Modal Novo Fechamento */}
            <AnimatePresence>
                {showNewModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowNewModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className={`relative w-full max-w-md ${cardClass} p-8 shadow-2xl overflow-hidden`}
                        >
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary-500"></div>

                            <h2 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Novo Fechamento</h2>
                            <p className="text-sm font-medium opacity-50 mb-8 leading-relaxed">
                                Ao encerrar um período, o espelho de ponto será congelado e ficará disponível para assinatura dos funcionários.
                            </p>

                            <div className="space-y-6 mb-8">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Data de Início</label>
                                    <input
                                        type="date"
                                        value={newPeriod.inicio}
                                        onChange={(e) => setNewPeriod({ ...newPeriod, inicio: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Data de Término</label>
                                    <input
                                        type="date"
                                        value={newPeriod.fim}
                                        onChange={(e) => setNewPeriod({ ...newPeriod, fim: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNewModal(false)}
                                    className={`flex-1 py-4 font-bold rounded-2xl transition-all ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreatePeriodo}
                                    className="flex-1 py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl transition-all shadow-glow"
                                >
                                    Confirmar Fechamento
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FechamentoMes;
