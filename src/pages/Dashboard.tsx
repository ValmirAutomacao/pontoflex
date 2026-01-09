import {
    Users,
    TrendingUp,
    Clock,
    Search,
    Bell,
    ArrowUpRight,
    Calendar,
    CheckCircle2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

const ActivityItem = ({ image, title, author, status, time, statusColor }: any) => {
    const { isDark } = useTheme();

    const getStatusStyle = () => {
        switch (statusColor) {
            case 'green': return isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600';
            case 'orange': return isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600';
            default: return isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600';
        }
    };

    return (
        <div className="flex gap-4 group cursor-pointer">
            <div className="relative shrink-0">
                <img src={image} className={`w-10 h-10 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`} alt="" />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusStyle()}`}>
                        {status}
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{time}</span>
                </div>
            </div>
        </div>
    )
}

const Dashboard = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [stats, setStats] = useState({
        funcionarios: 0,
        registrosHoje: 0,
        ajustesPendentes: 0,
        conformidade: 98
    });
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchStats();
            fetchRecentActivities();
        }
    }, [profile]);

    const fetchStats = async () => {
        try {
            // Contagem de funcionários
            const { count: funcCount } = await supabase
                .from('funcionarios')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', profile?.empresa_id)
                .eq('status', 'Ativo');

            // Registros hoje
            const today = new Date().toISOString().split('T')[0];
            const { count: pontoCount } = await supabase
                .from('registros_ponto')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', profile?.empresa_id)
                .gte('data_registro', today);

            // Ajustes pendentes
            const { count: ajustesCount } = await supabase
                .from('ajustes_ponto')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', profile?.empresa_id)
                .eq('status', 'pendente');

            setStats({
                funcionarios: funcCount || 0,
                registrosHoje: pontoCount || 0,
                ajustesPendentes: ajustesCount || 0,
                conformidade: 98 // Cálculo futuro baseado em inconsistências
            });
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentActivities = async () => {
        const { data } = await supabase
            .from('registros_ponto')
            .select(`
                id,
                tipo,
                data_registro,
                hora_registro,
                funcionarios (nome, foto_url)
            `)
            .eq('empresa_id', profile?.empresa_id)
            .order('created_at', { ascending: false })
            .limit(3);

        if (data) {
            setRecentActivities(data.map(reg => ({
                id: reg.id,
                image: (reg.funcionarios as any)?.foto_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(reg.funcionarios as any)?.nome}`,
                title: `Registro de ${reg.tipo === 'E' ? 'Entrada' : reg.tipo === 'S' ? 'Saída' : reg.tipo}`,
                author: (reg.funcionarios as any)?.nome,
                status: 'Sincronizado',
                time: new Date(reg.data_registro + 'T' + reg.hora_registro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                statusColor: 'green'
            })));
        }
    };

    const cardClass = `rounded-2xl p-6 border transition-all ${isDark
        ? 'bg-slate-800/50 border-slate-700/50'
        : 'bg-white border-slate-200 shadow-soft'
        }`;

    return (
        <div className="pb-12">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Painel de Controle
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Visão geral do sistema de ponto
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cardClass}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                            <Users size={20} />
                        </div>
                    </div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Funcionários Ativos</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.funcionarios}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={cardClass}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Registros Hoje</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.registrosHoje}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={cardClass}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                            <Clock size={20} />
                        </div>
                        {stats.ajustesPendentes > 0 && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                                Pendente
                            </span>
                        )}
                    </div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ajustes Pendentes</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.ajustesPendentes}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={cardClass}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Taxa Conformidade</p>
                    <div className="flex items-end gap-2">
                        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.conformidade}%</p>
                    </div>
                    <div className={`w-full h-1.5 rounded-full mt-2 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${stats.conformidade}%` }} />
                    </div>
                </motion.div>
            </div>

            {/* Charts & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={`lg:col-span-2 ${cardClass}`}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Registros da Semana</h2>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                            }`}>
                            <Calendar size={14} />
                            Últimos 7 dias
                        </div>
                    </div>
                    <div className="h-48 flex items-end justify-between gap-3 px-2">
                        {[65, 80, 55, 95, 70, 85, 60].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div className={`w-full rounded-lg relative flex-1 ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${h}%` }}
                                        transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                                        className="bg-primary-500 w-full rounded-lg absolute bottom-0"
                                    />
                                </div>
                                <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className={cardClass}
                >
                    <h2 className={`text-lg font-semibold mb-5 ${isDark ? 'text-white' : 'text-slate-900'}`}>Atividades Recentes</h2>
                    <div className="space-y-5">
                        {recentActivities.length > 0 ? (
                            recentActivities.map((activity) => (
                                <ActivityItem
                                    key={activity.id}
                                    image={activity.image}
                                    title={activity.title}
                                    status={activity.status}
                                    time={activity.time}
                                    statusColor={activity.statusColor}
                                />
                            ))
                        ) : (
                            <p className={`text-xs text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Nenhuma atividade recente
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default Dashboard;
