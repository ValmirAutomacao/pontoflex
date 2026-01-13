import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
    Heart,
    ChevronLeft,
    TrendingUp,
    Smile,
    Meh,
    Frown,
    MessageCircle,
    Calendar,
    Search,
    Filter,
    Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const RelatorioSentimentos: React.FC = () => {
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const stats = [
        { label: 'Média de Humor', value: '4.8/5', icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Engajamento', value: '92%', icon: TrendingUp, color: 'text-primary-500', bg: 'bg-primary-500/10' },
        { label: ' feedbacks hoje', value: '24', icon: MessageCircle, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    ];

    const feedbacks = [
        { id: 1, nome: 'João Silva', sentimento: 'Excelente', humor: 5, comentario: 'O dia foi muito produtivo, as ferramentas estão ajudando muito.', data: 'Hoje, 09:15' },
        { id: 2, nome: 'Maria Souza', sentimento: 'Bom', humor: 4, comentario: 'Um pouco cansada, mas feliz com as entregas.', data: 'Hoje, 08:30' },
        { id: 3, nome: 'Pedro Santos', sentimento: 'Neutro', humor: 3, comentario: 'Muitas reuniões hoje, pouco tempo para foco.', data: 'Hoje, 10:00' },
    ];

    const cardClass = `rounded-2xl border ${isDark
        ? 'bg-slate-800/50 border-slate-700/50'
        : 'bg-white border-slate-200 shadow-soft'}`;

    return (
        <div className="p-8 pb-32 min-h-screen">
            <button
                onClick={() => navigate('/relatorios')}
                className="flex items-center gap-2 text-slate-500 hover:text-primary-500 transition-all mb-8 font-bold text-sm"
            >
                <ChevronLeft size={16} />
                Voltar para a Central
            </button>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Sentimentos do <span className="text-primary-500">Dia</span>
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Acompanhe o clima organizacional com base nos feedbacks do registro de ponto
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, i) => (
                    <div key={i} className={`${cardClass} p-6 flex items-center gap-5`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            <stat.icon size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Placeholder Content */}
            <div className={`${cardClass} p-12 text-center`}>
                <div className="w-20 h-20 bg-primary-500/10 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart size={40} className="animate-pulse" />
                </div>
                <h3 className={`text-2xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Módulo em Implementação</h3>
                <p className="text-sm font-medium opacity-50 max-w-lg mx-auto leading-relaxed">
                    Estamos processando os dados de sentimento coletados durante as batidas de ponto.
                    Em breve você terá acesso a dashboards completos de clima organizacional,
                    identificação de burnout e tendências de satisfação por setor.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
                    {feedbacks.map(f => (
                        <div key={f.id} className={`${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} p-4 rounded-xl text-left border border-transparent hover:border-primary-500/30 transition-all`}>
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-sm">{f.nome}</span>
                                <span className="text-[10px] opacity-40">{f.data}</span>
                            </div>
                            <p className="text-xs opacity-60 italic mb-3">"{f.comentario}"</p>
                            <div className="flex items-center gap-2">
                                <Smile size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase">{f.sentimento}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RelatorioSentimentos;
