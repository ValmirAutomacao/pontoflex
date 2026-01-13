import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
    FileText,
    Users,
    Clock,
    Activity,
    AlertCircle,
    Heart,
    ChevronRight,
    Search,
    Filter,
    ArrowUpRight,
    TrendingUp,
    FilePieChart,
    Calendar,
    Download,
    ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface ReportCard {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    path: string;
    category: 'status' | 'gerencial' | 'sentimento';
    isNew?: boolean;
}

const reports: ReportCard[] = [
    // Status dos Funcionários
    {
        id: 'status-dia',
        title: 'Status do Dia',
        description: 'Visão em tempo real de quem está presente, ausente ou em intervalo.',
        icon: Activity,
        path: '/status-live',
        category: 'status'
    },
    {
        id: 'inconsistencias',
        title: 'Inconsistências e Faltas',
        description: 'Lista de registros incompletos, atrasos e faltas não justificadas.',
        icon: AlertCircle,
        path: '/inconsistencias',
        category: 'status',
        isNew: true
    },
    {
        id: 'sentimentos-dia',
        title: 'Sentimentos do Dia',
        description: 'Análise do humor e feedback dos colaboradores no registro.',
        icon: Heart,
        path: '/relatorios/sentimentos',
        category: 'status'
    },
    // Gerenciais
    {
        id: 'consolidado',
        title: 'Relatório Consolidado',
        description: 'Totais de horas extras, banco e adicional noturno por período.',
        icon: FilePieChart,
        path: '/relatorios/consolidado',
        category: 'gerencial'
    },
    {
        id: 'espelho-ponto',
        title: 'Espelho de Ponto',
        description: 'Visualização detalhada da jornada individual de cada colaborador.',
        icon: Calendar,
        path: '/controle-ponto',
        category: 'gerencial'
    },
    {
        id: 'banco-horas',
        title: 'Banco de Horas',
        description: 'Saldo acumulado, compensações e histórico de banco.',
        icon: TrendingUp,
        path: '/banco-horas',
        category: 'gerencial'
    },
    {
        id: 'listagem-colaboradores',
        title: 'Listagem de Colaboradores',
        description: 'Dados cadastrais, funções, setores e escalas ativas.',
        icon: Users,
        path: '/colaboradores',
        category: 'gerencial'
    },
    {
        id: 'exportacao-folha',
        title: 'Exportação Folha',
        description: 'Gere arquivos formatados para importação em sistemas de folha.',
        icon: Download,
        path: '/exportacao-folha',
        category: 'gerencial'
    },
    // Sentimentos
    {
        id: 'clima-organizacional',
        title: 'Clima Organizacional',
        description: 'Métricas de engajamento e satisfação ao longo do tempo.',
        icon: Heart,
        path: '/relatorios/clima',
        category: 'sentimento',
        isNew: true
    }
];

const CentralRelatorios: React.FC = () => {
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'all' | 'status' | 'gerencial' | 'sentimento'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredReports = reports.filter(report => {
        const matchesTab = activeTab === 'all' || report.category === activeTab;
        const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const categories = [
        { id: 'all', label: 'Todos', icon: FileText },
        { id: 'status', label: 'Status dos Funcionários', icon: Activity },
        { id: 'gerencial', label: 'Gerenciais', icon: ShieldCheck },
        { id: 'sentimento', label: 'Sentimentos', icon: Heart },
    ];

    const cardClass = `group relative p-6 rounded-3xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${isDark
        ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-primary-500/50'
        : 'bg-white border-slate-200 hover:border-primary-500/30'
        }`;

    return (
        <div className="p-4 md:p-10 pb-32 min-h-screen">
            {/* Header section with Stats or Welcome */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h1 className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Central de <span className="text-primary-500">Relatórios</span>
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Acompanhamento estratégico e auditoria de dados da empresa
                    </p>
                </div>

                <div className="flex bg-primary-500/10 p-4 rounded-3xl border border-primary-500/20 items-center gap-4">
                    <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-glow">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary-500">Total Disponível</p>
                        <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{reports.length} Módulos</p>
                    </div>
                </div>
            </div>

            {/* Navigation & Search */}
            <div className="flex flex-col lg:flex-row justify-between gap-6 mb-10">
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === cat.id
                                ? 'bg-primary-500 text-white shadow-glow'
                                : isDark ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white' : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border'
                                }`}
                        >
                            <cat.icon size={16} />
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="relative group min-w-[320px]">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-600 group-focus-within:text-primary-500' : 'text-slate-400 group-focus-within:text-primary-500'}`} size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar relatórios..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border text-sm transition-all outline-none focus:ring-4 focus:ring-primary-500/10 ${isDark ? 'bg-slate-800/50 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                    />
                </div>
            </div>

            {/* Reports Grid */}
            <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                <AnimatePresence mode="popLayout">
                    {filteredReports.map((report) => (
                        <motion.div
                            key={report.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={() => navigate(report.path)}
                            className={cardClass}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:rotate-3 ${isDark ? 'bg-slate-900 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                                    <report.icon size={28} />
                                </div>
                                {report.isNew && (
                                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-500/20">
                                        Novo
                                    </span>
                                )}
                            </div>

                            <h3 className={`text-lg font-black mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {report.title}
                                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all text-primary-500" />
                            </h3>
                            <p className={`text-xs leading-relaxed opacity-60 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {report.description}
                            </p>

                            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-glow">
                                    <ChevronRight size={18} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Empty State */}
            {filteredReports.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                        <Search size={32} className="opacity-20" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Nenhum relatório encontrado</h3>
                    <p className="opacity-50 max-w-xs transition-all">Não encontramos nenhum relatório que corresponda à sua pesquisa ou categoria selecionada.</p>
                </div>
            )}
        </div>
    );
};

export default CentralRelatorios;
