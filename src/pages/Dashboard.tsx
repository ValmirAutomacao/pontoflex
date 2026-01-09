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
    const { isDark } = useTheme();

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

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className={`border rounded-lg py-2 pl-10 pr-4 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${isDark
                                    ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                                }`}
                        />
                    </div>
                    <button className={`relative p-2.5 border rounded-lg transition-all hover:border-primary-500 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                        <Bell size={18} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
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
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                            <ArrowUpRight size={10} /> +4%
                        </div>
                    </div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Funcionários Ativos</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>124</p>
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
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>312</p>
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                            Pendente
                        </span>
                    </div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ajustes Pendentes</p>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>8</p>
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
                        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>98%</p>
                    </div>
                    <div className={`w-full h-1.5 rounded-full mt-2 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div className="h-full w-[98%] bg-primary-500 rounded-full" />
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
                        <ActivityItem
                            image="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
                            title="Registro validado"
                            status="Aprovado"
                            time="12 min"
                            statusColor="green"
                        />
                        <ActivityItem
                            image="https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos"
                            title="Ajuste solicitado"
                            status="Pendente"
                            time="45 min"
                            statusColor="orange"
                        />
                        <ActivityItem
                            image="https://api.dicebear.com/7.x/avataaars/svg?seed=Ana"
                            title="Biometria cadastrada"
                            status="Concluído"
                            time="2h"
                            statusColor="blue"
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default Dashboard;
