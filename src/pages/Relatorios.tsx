import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    FileText,
    Download,
    Printer,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Clock,
    Percent
} from 'lucide-react';
import { motion } from 'framer-motion';

interface RelatorioData {
    funcionario_id: string;
    funcionario_nome: string;
    funcionario_cpf: string;
    total_minutos_50: number;
    total_minutos_100: number;
    total_minutos_noturnos: number;
    total_minutos_credito: number;
    total_minutos_debito: number;
}

const formatMinutes = (minutes: number): string => {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return `${hours}h ${mins}m`;
};

const Relatorios: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [data, setData] = useState<RelatorioData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchRelatorio();
        }
    }, [profile?.empresa_id]);

    const fetchRelatorio = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        try {
            const { data: reportData, error } = await supabase.rpc('get_relatorio_consolidado', {
                p_empresa_id: profile.empresa_id,
                p_start_date: dateRange.start,
                p_end_date: dateRange.end
            });

            if (error) throw error;
            setData(reportData || []);
        } catch (error) {
            console.error('Erro ao buscar relatório:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(item =>
        item.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.funcionario_cpf?.includes(searchTerm)
    );

    const totals = data.reduce((acc, curr) => ({
        he50: acc.he50 + curr.total_minutos_50,
        he100: acc.he100 + curr.total_minutos_100,
        noturno: acc.noturno + curr.total_minutos_noturnos,
        credito: acc.credito + curr.total_minutos_credito,
        debito: acc.debito + curr.total_minutos_debito
    }), { he50: 0, he100: 0, noturno: 0, credito: 0, debito: 0 });

    const handleExportCSV = () => {
        const headers = ['Funcionario', 'CPF', 'HE 50%', 'HE 100%', 'Noturno', 'Banco (Credito)', 'Banco (Debito)'];
        const rows = data.map(item => [
            item.funcionario_nome,
            item.funcionario_cpf,
            formatMinutes(item.total_minutos_50),
            formatMinutes(item.total_minutos_100),
            formatMinutes(item.total_minutos_noturnos),
            formatMinutes(item.total_minutos_credito),
            formatMinutes(item.total_minutos_debito)
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(',') + "\n"
            + rows.map(r => r.join(',')).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `relatorio_consolidado_${dateRange.start}_${dateRange.end}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                        Relatórios Consolidados
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Totais de horas extras e banco para fechamento de período
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all border ${isDark
                            ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                    >
                        <Printer size={16} />
                        Imprimir
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-5 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold text-sm transition-all shadow-glow"
                    >
                        <Download size={16} />
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={`${cardClass} p-6 mb-8`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Período de Referência</label>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                            </div>
                            <span className="opacity-40"><ChevronRight size={16} /></span>
                            <div className="flex-1 relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                            </div>
                            <button
                                onClick={fetchRelatorio}
                                className="px-6 py-2.5 bg-slate-900 dark:bg-primary-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg"
                            >
                                Gerar
                            </button>
                        </div>
                    </div>

                    <div className="md:col-span-2 relative group">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Buscar Colaborador</label>
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
                            <input
                                type="text"
                                placeholder="Nome ou CPF..."
                                className={`w-full pl-12 pr-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Summary Totals */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {[
                    { label: 'Total HE 50%', value: totals.he50, icon: Percent, color: 'text-primary-500', bg: 'bg-primary-500/10' },
                    { label: 'Total HE 100%', value: totals.he100, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Total Noturno', value: totals.noturno, icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    { label: 'Crédito Banco', value: totals.credito, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Débito Banco', value: totals.debito, icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                ].map((stat, i) => (
                    <div key={i} className={`${cardClass} p-5 flex items-center justify-between`}>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{stat.label}</p>
                            <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatMinutes(stat.value)}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                            <stat.icon size={18} className={stat.color} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className={`${cardClass} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`border-b ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}`}>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Colaborador</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-center">HE 50%</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-center">HE 100%</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Noturno</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Banco (C)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Banco (D)</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-sm font-medium opacity-40">Processando consolidação...</p>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center opacity-40 text-sm font-medium">
                                        Nenhum registro encontrado para este período.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.funcionario_id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                                        <td className="px-6 py-4">
                                            <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.funcionario_nome}</p>
                                            <p className="text-[10px] font-medium opacity-40">{item.funcionario_cpf}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${item.total_minutos_50 > 0 ? (isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600') : 'opacity-20'}`}>
                                                {formatMinutes(item.total_minutos_50)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${item.total_minutos_100 > 0 ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : 'opacity-20'}`}>
                                                {formatMinutes(item.total_minutos_100)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${item.total_minutos_noturnos > 0 ? (isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : 'opacity-20'}`}>
                                                {formatMinutes(item.total_minutos_noturnos)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${item.total_minutos_credito > 0 ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : 'opacity-20'}`}>
                                                {formatMinutes(item.total_minutos_credito)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${item.total_minutos_debito > 0 ? (isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600') : 'opacity-20'}`}>
                                                {formatMinutes(item.total_minutos_debito)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Relatorios;
