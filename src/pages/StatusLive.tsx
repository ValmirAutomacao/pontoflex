import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Users,
    Clock,
    Search,
    Filter,
    MapPin,
    Briefcase,
    Activity,
    LogOut,
    LogIn,
    UserMinus,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ColaboradorStatus {
    funcionario_id: string;
    funcionario_nome: string;
    foto_url: string;
    empresa_id: string;
    setor_nome: string;
    local_trabalho_nome: string;
    tipo_ultimo_ponto: string;
    ultima_hora: string;
    ultima_data: string;
    local_valido: boolean;
    status_atual: 'TRABALHANDO' | 'FINALIZADO' | 'NAO_INICIADO';
}

const StatusLive: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [colaboradores, setColaboradores] = useState<ColaboradorStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [setorFilter, setSetorFilter] = useState('todos');
    const [localFilter, setLocalFilter] = useState('todos');
    const [setores, setSetores] = useState<string[]>([]);
    const [locais, setLocais] = useState<string[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchData();
        }
    }, [profile?.empresa_id]);

    const fetchData = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('view_status_colaboradores')
                .select('*')
                .eq('empresa_id', profile.empresa_id);

            if (error) throw error;

            setColaboradores(data || []);

            // Extract unique sectors and locations for filters
            const uniqueSetores = Array.from(new Set((data || []).map((c: any) => c.setor_nome).filter(Boolean))) as string[];
            const uniqueLocais = Array.from(new Set((data || []).map((c: any) => c.local_trabalho_nome).filter(Boolean))) as string[];

            setSetores(uniqueSetores);
            setLocais(uniqueLocais);
        } catch (error) {
            console.error('Erro ao buscar status live:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const filteredColaboradores = colaboradores.filter(c => {
        const matchesSearch = c.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSetor = setorFilter === 'todos' || c.setor_nome === setorFilter;
        const matchesLocal = localFilter === 'todos' || c.local_trabalho_nome === localFilter;
        return matchesSearch && matchesSetor && matchesLocal;
    });

    const stats = {
        total: colaboradores.length,
        trabalhando: colaboradores.filter(c => c.status_atual === 'TRABALHANDO').length,
        finalizado: colaboradores.filter(c => c.status_atual === 'FINALIZADO').length,
        naoIniciado: colaboradores.filter(c => c.status_atual === 'NAO_INICIADO').length
    };

    const cardClass = `rounded-2xl border transition-all duration-300 ${isDark
        ? 'bg-slate-800/50 border-slate-700/50 hover:border-primary-500/50'
        : 'bg-white border-slate-200 shadow-soft hover:shadow-lg'}`;

    const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark
        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'TRABALHANDO': return <LogIn size={14} className="text-emerald-500" />;
            case 'FINALIZADO': return <LogOut size={14} className="text-amber-500" />;
            default: return <UserMinus size={14} className="text-slate-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'TRABALHANDO': return isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600';
            case 'FINALIZADO': return isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600';
            default: return isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'TRABALHANDO': return 'Trabalhando';
            case 'FINALIZADO': return 'Finalizou';
            default: return 'Não Iniciou';
        }
    };

    return (
        <div className="p-8 pb-20 min-h-screen">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Monitoramento Live
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Acompanhe em tempo real a presença dos seus colaboradores
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all border ${isDark
                            ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
                    </button>

                    <div className="flex bg-primary-500/10 p-1.5 rounded-2xl gap-1">
                        <div className="px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-500/20">
                            Tempo Real
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total', value: stats.total, icon: Users, color: 'text-primary-500', bg: 'bg-primary-500/10' },
                    { label: 'Trabalhando', value: stats.trabalhando, icon: LogIn, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Finalizado', value: stats.finalizado, icon: LogOut, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Ausente', value: stats.naoIniciado, icon: UserMinus, color: 'text-slate-500', bg: 'bg-slate-500/10' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`${cardClass} p-6 flex items-center justify-between`}
                    >
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                            <stat.icon size={24} className={stat.color} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <div className={`${cardClass} p-6 mb-8`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative group col-span-2">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-all">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nome do colaborador..."
                            className={`${inputClass} pl-11`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-40">
                            <Briefcase size={16} />
                        </div>
                        <select
                            className={`${inputClass} pl-11 appearance-none`}
                            value={setorFilter}
                            onChange={(e) => setSetorFilter(e.target.value)}
                        >
                            <option value="todos">Todos os Setores</option>
                            {setores.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-40">
                            <MapPin size={16} />
                        </div>
                        <select
                            className={`${inputClass} pl-11 appearance-none`}
                            value={localFilter}
                            onChange={(e) => setLocalFilter(e.target.value)}
                        >
                            <option value="todos">Todos os Locais</option>
                            {locais.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Grid */}
            {loading && !refreshing ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-medium opacity-50">Sincronizando dados live...</p>
                </div>
            ) : filteredColaboradores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Activity size={64} strokeWidth={1} className="mb-4" />
                    <p className="font-bold">Nenhum registro encontrado para os filtros selecionados.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredColaboradores.map((colab) => (
                            <motion.div
                                key={colab.funcionario_id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`${cardClass} p-5 relative overflow-hidden group`}
                            >
                                {/* Status Indicator Light */}
                                <div className={`absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 transition-all duration-500 opacity-20 blur-3xl ${colab.status_atual === 'TRABALHANDO' ? 'bg-emerald-500' :
                                        colab.status_atual === 'FINALIZADO' ? 'bg-amber-500' : 'bg-slate-500'
                                    } group-hover:opacity-40`} />

                                <div className="flex items-start gap-4">
                                    <div className="relative">
                                        <img
                                            src={colab.foto_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${colab.funcionario_nome}`}
                                            alt=""
                                            className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-700 shadow-sm"
                                        />
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 ${isDark ? 'border-slate-800' : 'border-white'} ${colab.status_atual === 'TRABALHANDO' ? 'bg-emerald-500' :
                                                colab.status_atual === 'FINALIZADO' ? 'bg-amber-500' : 'bg-slate-400'
                                            }`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {colab.funcionario_nome}
                                        </h3>
                                        <p className="text-[10px] font-black uppercase tracking-tighter opacity-40 truncate">
                                            {colab.setor_nome || 'Sem Setor'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <div className={`flex items-center justify-between p-3 rounded-xl ${getStatusColor(colab.status_atual)}`}>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(colab.status_atual)}
                                            <span className="text-xs font-bold">{getStatusText(colab.status_atual)}</span>
                                        </div>
                                        {colab.ultima_hora && (
                                            <span className="text-[10px] font-black opacity-60">às {colab.ultima_hora.substring(0, 5)}</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 px-1 text-xs opacity-50">
                                        <MapPin size={12} strokeWidth={2.5} />
                                        <span className="font-semibold truncate">{colab.local_trabalho_nome || 'Local Externo'}</span>
                                    </div>

                                    {colab.local_valido === false && (
                                        <div className="mt-2 text-[10px] bg-rose-500/10 text-rose-500 p-2 rounded-lg font-bold flex items-center gap-2 border border-rose-500/20">
                                            <RefreshCw size={10} className="animate-spin-slow" />
                                            FORA DA CERCA GEOGRÁFICA
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default StatusLive;
