import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    AlertTriangle,
    Calendar,
    Search,
    ChevronRight,
    MapPin,
    Clock,
    User,
    ArrowRightCircle,
    Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface Inconsistencia {
    data_referencia: string;
    funcionario_id: string;
    funcionario_nome: string;
    funcionario_cpf: string;
    tipo_inconsistencia: 'INCOMPLETO' | 'FORA_LOCAL';
    descricao: string;
    registros_no_dia: number;
}

const Inconsistencias: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [data, setData] = useState<Inconsistencia[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchInconsistencias();
        }
    }, [profile?.empresa_id]);

    const fetchInconsistencias = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const { data: inconsistencies, error } = await supabase.rpc('get_inconsistencias_ponto', {
                p_empresa_id: profile.empresa_id,
                p_start_date: dateRange.start,
                p_end_date: dateRange.end
            });

            if (error) throw error;
            setData(inconsistencies || []);
        } catch (error) {
            console.error('Erro ao buscar inconsistências:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(item =>
        item.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.funcionario_cpf?.includes(searchTerm)
    );

    const stats = {
        total: data.length,
        incompletos: data.filter(i => i.tipo_inconsistencia === 'INCOMPLETO').length,
        foraLocal: data.filter(i => i.tipo_inconsistencia === 'FORA_LOCAL').length
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
                        Inconsistências & Faltas
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Identifique registros incompletos ou realizados fora do local permitido
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchInconsistencias}
                        className="flex items-center gap-2 px-5 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold text-sm transition-all shadow-glow"
                    >
                        Atualizar Relatório
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className={`${cardClass} p-6 flex items-center gap-5`}>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total de Ocorrências</p>
                        <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.total}</p>
                    </div>
                </div>
                <div className={`${cardClass} p-6 flex items-center gap-5`}>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Registros Ímpares</p>
                        <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.incompletos}</p>
                    </div>
                </div>
                <div className={`${cardClass} p-6 flex items-center gap-5`}>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Fora do Local</p>
                        <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.foraLocal}</p>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Filters Sidebar */}
                <div className="space-y-6">
                    <div className={`${cardClass} p-6`}>
                        <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Filtros</h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold mb-2 opacity-60">Período</label>
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-2 opacity-60">Buscar</label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                                    <input
                                        type="text"
                                        placeholder="Nome ou CPF..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={fetchInconsistencias}
                                className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all mt-4"
                            >
                                Aplicar Filtros
                            </button>
                        </div>
                    </div>

                    <div className={`${cardClass} p-6 bg-primary-500/5 border-primary-500/20`}>
                        <h4 className="text-xs font-black uppercase tracking-widest text-primary-500 mb-2">Dica de Gestão</h4>
                        <p className="text-xs font-medium opacity-60 leading-relaxed">
                            Dias com números ímpares de registros geralmente indicam que o colaborador esqueceu de bater a saída ou a volta do almoço. Ajuste esses pontos no **Espelho de Ponto**.
                        </p>
                    </div>
                </div>

                {/* List Content */}
                <div className="lg:col-span-3 space-y-4">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-sm font-bold opacity-40 italic">Analisando registros...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className={`${cardClass} p-20 text-center`}>
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search size={32} />
                            </div>
                            <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Tudo em ordem!</h3>
                            <p className="text-sm font-medium opacity-40 max-w-xs mx-auto">
                                Não foram encontradas inconsistências nos registros para o período selecionado.
                            </p>
                        </div>
                    ) : (
                        filteredData.map((item, idx) => (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={`${item.funcionario_id}-${item.data_referencia}-${item.tipo_inconsistencia}`}
                                className={`${cardClass} p-5 group hover:border-primary-500/30 transition-all`}
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${item.tipo_inconsistencia === 'INCOMPLETO'
                                                ? 'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'
                                                : 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'
                                            }`}>
                                            {item.tipo_inconsistencia === 'INCOMPLETO' ? <Clock size={20} /> : <MapPin size={20} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.funcionario_nome}</h4>
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.tipo_inconsistencia === 'INCOMPLETO'
                                                        ? 'bg-indigo-500/10 text-indigo-500'
                                                        : 'bg-rose-500/10 text-rose-500'
                                                    }`}>
                                                    {item.tipo_inconsistencia === 'INCOMPLETO' ? 'Incompleto' : 'Fora do Local'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] font-medium opacity-40">
                                                <span className="flex items-center gap-1.5 uppercase">
                                                    <Calendar size={12} /> {new Date(item.data_referencia).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span className="flex items-center gap-1.5 uppercase">
                                                    <User size={12} /> {item.funcionario_cpf}
                                                </span>
                                                <span className="flex items-center gap-1.5 uppercase">
                                                    {item.registros_no_dia} Batida(s)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="hidden md:block text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5">Diagnóstico</p>
                                            <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.descricao}</p>
                                        </div>
                                        <Link
                                            to={`/controle-ponto?funcionario_id=${item.funcionario_id}&data=${item.data_referencia}`}
                                            className={`p-3 rounded-xl transition-all ${isDark ? 'bg-slate-700 hover:bg-primary-500 hover:text-white text-slate-400' : 'bg-slate-100 hover:bg-primary-500 hover:text-white text-slate-600'}`}
                                            title="Ir para Espelho de Ponto"
                                        >
                                            <ArrowRightCircle size={20} />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Inconsistencias;
