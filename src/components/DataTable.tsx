import React, { ReactNode } from 'react';
import { Search, RefreshCcw, Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface KPI {
    label: string;
    value: number | string;
    color?: 'default' | 'green' | 'orange' | 'red' | 'blue';
}

interface Filter {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (value: string) => void;
}

interface Column {
    key: string;
    label: string;
    width?: string;
}

interface DataTableProps<T> {
    title: string;
    subtitle?: string;
    kpis?: KPI[];
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    filters?: Filter[];
    columns: Column[];
    data: T[];
    renderRow: (item: T, index: number) => ReactNode;
    onRefresh?: () => void;
    onAdd?: () => void;
    addButtonLabel?: string;
    loading?: boolean;
    emptyMessage?: string;
    actions?: ReactNode;
}

const getKPIColor = (color: KPI['color'], isDark: boolean) => {
    switch (color) {
        case 'green': return isDark
            ? 'text-green-400 bg-green-500/10 border-green-500/20'
            : 'text-green-600 bg-green-50 border-green-200';
        case 'orange': return isDark
            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            : 'text-amber-600 bg-amber-50 border-amber-200';
        case 'red': return isDark
            ? 'text-red-400 bg-red-500/10 border-red-500/20'
            : 'text-red-600 bg-red-50 border-red-200';
        case 'blue': return isDark
            ? 'text-primary-400 bg-primary-500/10 border-primary-500/20'
            : 'text-primary-600 bg-primary-50 border-primary-200';
        default: return isDark
            ? 'text-slate-300 bg-slate-800/50 border-slate-700'
            : 'text-slate-700 bg-white border-slate-200';
    }
};

function DataTable<T>({
    title,
    subtitle,
    kpis,
    searchPlaceholder = 'Buscar...',
    searchValue = '',
    onSearchChange,
    filters,
    columns,
    data,
    renderRow,
    onRefresh,
    onAdd,
    addButtonLabel = 'Novo',
    loading = false,
    emptyMessage = 'Nenhum registro encontrado.',
    actions
}: DataTableProps<T>) {
    const { isDark } = useTheme();

    const cardClass = `rounded-xl border transition-all ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        }`;

    const inputClass = `w-full border rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark
            ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
        }`;

    return (
        <div className="pb-12">
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {title}
                    </h1>
                    {subtitle && <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>}
                </div>
                <div className="flex items-center gap-3">
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            className={`p-2 rounded-lg transition-all ${isDark
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700'
                                }`}
                            title="Atualizar"
                        >
                            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    )}
                    {onAdd && (
                        <button
                            onClick={onAdd}
                            className="bg-primary-500 hover:bg-primary-600 px-4 py-2 rounded-lg text-white font-semibold text-sm transition-all shadow-glow flex items-center gap-2"
                        >
                            <Plus size={16} /> {addButtonLabel}
                        </button>
                    )}
                </div>
            </header>

            {/* KPIs */}
            {kpis && kpis.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                    {kpis.map((kpi, index) => (
                        <div
                            key={index}
                            className={`rounded-lg p-4 border ${getKPIColor(kpi.color, isDark)}`}
                        >
                            <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                {kpi.label}
                            </p>
                            <p className="text-xl font-bold">
                                {kpi.value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters & Search */}
            <div className={`${cardClass} p-3 mb-5 flex flex-wrap items-center gap-3`}>
                {onSearchChange && (
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className={`${inputClass} pl-10`}
                        />
                    </div>
                )}

                {filters && filters.map((filter, index) => (
                    <div key={index} className="min-w-[140px]">
                        <select
                            value={filter.value}
                            onChange={(e) => filter.onChange(e.target.value)}
                            className={inputClass}
                        >
                            {filter.options.map((opt, i) => (
                                <option key={i} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                ))}

                {actions}
            </div>

            {/* Table */}
            <div className={`${cardClass} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`border-b ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}`}>
                                {columns.map((col, index) => (
                                    <th
                                        key={index}
                                        className={`px-5 py-3 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                                        style={col.width ? { width: col.width } : {}}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-5 py-10 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Carregando...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-5 py-10 text-center">
                                        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{emptyMessage}</p>
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, index) => renderRow(item, index))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default DataTable;
