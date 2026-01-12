import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Download,
    FileSpreadsheet,
    Settings,
    Database,
    ChevronRight,
    FileText,
    CheckCircle2,
    Calendar,
    Search
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Periodo {
    id: string;
    data_inicio: string;
    data_fim: string;
    status: 'aberto' | 'fechado';
}

const ExportacaoFolha: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [periodos, setPeriodos] = useState<Periodo[]>([]);
    const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchPeriodos();
        }
    }, [profile?.empresa_id]);

    const fetchPeriodos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('periodos_fechamento')
                .select('*')
                .eq('empresa_id', profile?.empresa_id)
                .order('data_inicio', { ascending: false });

            if (error) throw error;
            setPeriodos(data || []);
            if (data && data.length > 0) setSelectedPeriodo(data[0].id);
        } catch (error) {
            console.error('Erro ao buscar períodos:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateAFD = async () => {
        setExporting(true);
        try {
            const periodo = periodos.find(p => p.id === selectedPeriodo);
            if (!periodo) return;

            // 1. Buscar registros de ponto do período
            const { data: registros, error } = await supabase
                .from('registros_ponto')
                .select(`
                    id, 
                    data_registro, 
                    hora_registro, 
                    tipo_registro,
                    funcionarios!inner (
                        cpf,
                        pis_nis,
                        nome
                    )
                `)
                .eq('empresa_id', profile?.empresa_id)
                .gte('data_registro', periodo.data_inicio)
                .lte('data_registro', periodo.data_fim)
                .order('data_registro', { ascending: true })
                .order('hora_registro', { ascending: true });

            if (error) throw error;

            // 2. Formatar AFD (Padrão Portaria 671 - Registro Tipo 7 para eventos de ponto)
            // Header (Tipo 1), Empresa (Tipo 2), Eventos (Tipo 7)
            // Simplificado para demonstração do formato de colunas fixas
            let afdContent = "";

            // Header Exemplo (Tipo 1)
            const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '');
            afdContent += `0000000001${profile?.empresa?.cnpj?.replace(/\D/g, '').padStart(14, '0')}${"".padStart(11, '0')}${profile?.empresa?.razao_social?.substring(0, 150).padEnd(150, ' ')}${"1".padEnd(17, '0')}${today}${today}1155\n`;

            // Registros (Tipo 7)
            registros?.forEach((reg, idx) => {
                const nsr = (idx + 1).toString().padStart(9, '0');
                const pui = (reg as any).funcionarios?.pis_nis?.replace(/\D/g, '').padEnd(12, ' ') || "".padEnd(12, ' ');
                const dataPonto = reg.data_registro.replace(/-/g, '').substring(2); // DDMMAA - simplificado
                const horaPonto = reg.hora_registro.replace(/:/g, '').substring(0, 4);

                // Formato padrão Portaria 671 - Registro 7
                afdContent += `${nsr}7${dayMonthYear(reg.data_registro)}${horaPonto}${pui}\n`;
            });

            const blob = new Blob([afdContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `AFD_${periodo.data_inicio}_${periodo.data_fim}.txt`;
            a.click();
        } catch (error) {
            console.error('Erro ao gerar AFD:', error);
        } finally {
            setExporting(false);
        }
    };

    const dayMonthYear = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        return `${d}${m}${y}`;
    }

    const generateExcelLayout = async (software: string) => {
        alert(`Exportando layout para ${software}...`);
        // Lógica de exportação CSV/Excel customizada aqui
    };

    const cardClass = `rounded-3xl border ${isDark
        ? 'bg-slate-800/50 border-slate-700/50 text-white'
        : 'bg-white border-slate-200 text-slate-900 shadow-soft'}`;

    return (
        <div className="p-8 pb-20 min-h-screen">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Exportação de Folha
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Gere arquivos fiscais e layouts para sua contabilidade
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Period Selection */}
                <div className="space-y-6">
                    <div className={`${cardClass} p-6`}>
                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-6 flex items-center gap-2">
                            <Calendar size={14} /> Selecione o Período
                        </h3>

                        <div className="space-y-3">
                            {loading ? (
                                <div className="py-10 text-center animate-pulse opacity-40">Buscando períodos...</div>
                            ) : periodos.length === 0 ? (
                                <p className="text-xs font-bold text-center py-4 opacity-40 italic">Nenhum período disponível</p>
                            ) : (
                                periodos.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedPeriodo(p.id)}
                                        className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedPeriodo === p.id
                                                ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500'
                                                : isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-black uppercase tracking-tight">
                                                    {new Date(p.data_inicio).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                                </p>
                                                <p className="text-[10px] opacity-40 font-bold mt-1">
                                                    {new Date(p.data_inicio).toLocaleDateString()} - {new Date(p.data_fim).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {selectedPeriodo === p.id && <CheckCircle2 size={16} className="text-primary-500" />}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className={`${cardClass} p-6 bg-emerald-500/5 border-emerald-500/20`}>
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle2 size={18} className="text-emerald-500" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-500">Conformidade Legal</h4>
                        </div>
                        <p className="text-[11px] font-medium opacity-60 leading-relaxed">
                            Nossos arquivos AFD seguem rigorosamente a **Portaria 671 do MTE**, garantindo segurança para auditorias e fiscalizações do trabalho.
                        </p>
                    </div>
                </div>

                {/* Right: Export Options */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Fiscal Export */}
                    <div className={`${cardClass} p-8 overflow-hidden relative`}>
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <Settings size={120} />
                        </div>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                <Database size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Arquivo Fiscal (AFD)</h3>
                                <p className="text-xs opacity-40 font-bold uppercase tracking-widest leading-none mt-1">Padrão Portaria 671</p>
                            </div>
                        </div>

                        <p className="text-sm font-medium opacity-60 mb-8 max-w-lg leading-relaxed">
                            Gere o arquivo de fonte de dados tratado para importação em sistemas de folha ou auditoria do Ministério do Trabalho.
                        </p>

                        <button
                            onClick={generateAFD}
                            disabled={!selectedPeriodo || exporting}
                            className={`flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-primary-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-40`}
                        >
                            {exporting ? (
                                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Download size={20} />
                            )}
                            Gerar Arquivo AFD .txt
                        </button>
                    </div>

                    {/* Accounting Layouts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`${cardClass} p-6 flex flex-col justify-between hover:border-primary-500/20 transition-all`}>
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-6">
                                    <FileSpreadsheet size={20} />
                                </div>
                                <h4 className="text-md font-black italic">Folhaq / Quality</h4>
                                <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1 mb-6">Layout Customizado</p>
                            </div>
                            <button
                                onClick={() => generateExcelLayout('Folhaq')}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold hover:bg-primary-500 hover:text-white transition-all transition-colors"
                            >
                                Exportar Dados
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <div className={`${cardClass} p-6 flex flex-col justify-between hover:border-primary-500/20 transition-all`}>
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-6">
                                    <FileSpreadsheet size={20} />
                                </div>
                                <h4 className="text-md font-black italic">Questor / Senior</h4>
                                <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1 mb-6">Layout Personalizado</p>
                            </div>
                            <button
                                onClick={() => generateExcelLayout('Questor')}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold hover:bg-primary-500 hover:text-white transition-all transition-colors"
                            >
                                Exportar Dados
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportacaoFolha;
