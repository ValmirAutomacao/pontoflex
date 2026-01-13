import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import { buscarRegistrosPeriodo, ajustarPonto } from '../services/authPonto';
import { TIPO_REGISTRO_LABELS } from '../types';
import type { RegistroPonto, TipoJustificativa } from '../types';
import {
    Filter,
    Search,
    Clock,
    AlertCircle,
    CheckCircle2,
    Edit3,
    X,
    Save,
    Calendar as CalendarIcon,
    Printer,
    Download,
    RefreshCw,
    WifiOff,
    ShieldCheck,
    MapPin,
    ExternalLink,
    Calculator,
    Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LocalTrabalho {
    id: string;
    empresa_id: string;
    nome: string;
    latitude: number;
    longitude: number;
    raio_metros: number;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    ativo: boolean;
    created_at: string;
}

interface RegistroAgrupado {
    data: string;
    funcionario: {
        id: string;
        nome: string;
        funcao?: string;
        setor?: string;
        jornada?: any;
        is_externo?: boolean;
    };
    entrada?: RegistroPonto;
    saida_almoco?: RegistroPonto;
    retorno_almoco?: RegistroPonto;
    saida?: RegistroPonto;
    total_horas?: string;
    saldo_minutos?: number;
    is_auto_filled?: boolean;
    escala?: { id: string, nome: string };
    status: 'Completo' | 'Incompleto' | 'Falta';
}

const formatHora = (reg?: any) => {
    if (!reg?.hora_registro) return '--:--';
    return reg.hora_registro.slice(0, 5);
};

const ControlePonto = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [registrosAgrupados, setRegistrosAgrupados] = useState<RegistroAgrupado[]>([]);
    const [loading, setLoading] = useState(true);
    const [tiposJustificativa, setTiposJustificativa] = useState<TipoJustificativa[]>([]);

    // Filtros
    const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
    const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal de ajuste
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedRegistro, setSelectedRegistro] = useState<RegistroPonto | null>(null);
    const [ajusteForm, setAjusteForm] = useState({
        novaHora: '',
        tipoJustificativaId: '',
        observacoes: ''
    });
    const [savingAjuste, setSavingAjuste] = useState(false);
    const [recalculating, setRecalculating] = useState<string | null>(null);

    // Listagem filtrada
    const filteredRegistros = React.useMemo(() => {
        return registrosAgrupados.filter(reg =>
            (reg.funcionario.nome?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (reg.funcionario.funcao?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (reg.funcionario.setor?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        );
    }, [registrosAgrupados, searchQuery]);

    const [stats, setStats] = useState({
        totalRegistros: 0,
        atrasos: 0,
        ajustesPendentes: 0,
        conformidade: 0
    });

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchData();
            fetchTiposJustificativa();
        }
    }, [profile?.empresa_id, dataInicio, dataFim]);

    const fetchData = async () => {
        if (!profile?.empresa_id) return;

        setLoading(true);
        try {
            // 1. Buscar todos os colaboradores e escalas
            const [funcRes, escRes, regRes] = await Promise.all([
                supabase.from('funcionarios').select('id, nome, is_externo, escala_id, funcoes(nome), setores(nome)').eq('empresa_id', profile.empresa_id).eq('status', 'Ativo'),
                supabase.from('escalas_servico').select('id, nome').eq('empresa_id', profile.empresa_id),
                supabase.from('registros_ponto')
                    .select('*, funcionarios(nome, is_externo, funcoes(nome), setores(nome))')
                    .eq('empresa_id', profile.empresa_id)
                    .gte('data_registro', dataInicio)
                    .lte('data_registro', dataFim)
            ]);

            if (funcRes.error) throw funcRes.error;

            const employees = funcRes.data || [];
            const scales = escRes.data || [];
            const registrations = regRes.data || [];

            // 2. Agrupar registros por funcionário e data
            const agrupados = agruparRegistrosMelhorado(employees, registrations, dataInicio, dataFim, scales);
            setRegistrosAgrupados(agrupados);
            calculateStats(agrupados);
        } catch (err) {
            console.error('Erro ao buscar registros:', err);
        } finally {
            setLoading(false);
        }
    };
    const fetchTiposJustificativa = async () => {
        const { data } = await supabase
            .from('tipos_justificativas_ponto')
            .select('*')
            .eq('status', 'Ativo');
        setTiposJustificativa(data || []);
    };


    const calculateStats = (agrupados: RegistroAgrupado[]) => {
        const total = agrupados.length;
        const completos = agrupados.filter(a => a.status === 'Completo').length;

        setStats({
            totalRegistros: total,
            atrasos: 0,
            ajustesPendentes: 0,
            conformidade: total > 0 ? Math.round((completos / total) * 100) : 100
        });
    };

    const handleOpenAjuste = (registro: any, employee?: any, date?: string, type?: string) => {
        setSelectedRegistro(registro || {
            funcionario_id: employee.id,
            data_registro: date,
            tipo_registro: type,
            hora_registro: '08:00:00'
        });
        setAjusteForm({
            novaHora: registro ? registro.hora_registro.slice(0, 5) : '08:00',
            tipoJustificativaId: '',
            observacoes: ''
        });
        setIsAdjustModalOpen(true);
    };

    const handleAddManualEntry = (employee: any, date: string, type: 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida') => {
        setSelectedRegistro({
            id: `temp-${employee.id}-${date}-${type}`, // Temporary ID for new entries
            funcionario_id: employee.id,
            data_registro: date,
            tipo_registro: type,
            hora_registro: '08:00:00', // Default time, user will adjust
            empresa_id: profile?.empresa_id || '',
            metodo_autenticacao: 'manual',
            observacoes: '',
            localizacao_gps: null,
            justificativa_id: null,
            ajustado_por_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status_ajuste: 'pendente'
        });
        setAjusteForm({
            novaHora: '08:00',
            tipoJustificativaId: '',
            observacoes: ''
        });
        setIsAdjustModalOpen(true);
    };

    const handleSaveAjuste = async () => {
        if (!selectedRegistro || !profile?.funcionario_id || !profile?.empresa_id) return;

        setSavingAjuste(true);
        try {
            let result;
            if (selectedRegistro.id && !selectedRegistro.id.toString().startsWith('temp-')) {
                result = await ajustarPonto({
                    registroPontoId: selectedRegistro.id,
                    horaOriginal: selectedRegistro.hora_registro,
                    horaAjustada: ajusteForm.novaHora + ':00',
                    tipoJustificativaId: ajusteForm.tipoJustificativaId || undefined,
                    observacoes: (ajusteForm.observacoes || '') + ' (Ajuste via Controle)',
                    ajustadoPorId: profile.funcionario_id,
                    empresaId: profile.empresa_id
                });
            } else {
                // Inserção Manual
                const { error: insError } = await supabase
                    .from('registros_ponto')
                    .insert([{
                        funcionario_id: selectedRegistro.funcionario_id,
                        data_registro: selectedRegistro.data_registro,
                        hora_registro: ajusteForm.novaHora + ':00',
                        tipo_registro: selectedRegistro.tipo_registro,
                        empresa_id: profile.empresa_id,
                        metodo_autenticacao: 'manual',
                        observacoes: (ajusteForm.observacoes || '') + ' (Inserção Manual pelo Gestor)'
                    }]);

                if (insError) throw insError;
                result = { success: true };
            }

            if (!result.success) {
                alert(result.error);
                return;
            }

            setIsAdjustModalOpen(false);
            fetchData();
        } catch (err) {
            console.error('Erro ao salvar ajuste:', err);
        } finally {
            setSavingAjuste(false);
        }
    };

    const handleRecalculate = async (funcionarioId: string, data: string) => {
        setRecalculating(`${funcionarioId}-${data}`);
        try {
            const { data: res, error } = await supabase.functions.invoke('process-day-hours', {
                body: { funcionario_id: funcionarioId, data_referencia: data }
            });

            if (error) throw error;

            console.log('Recalculado com sucesso:', res);
            fetchData();
        } catch (err: any) {
            console.error('Erro ao recalcular:', err);
            alert('Erro ao recalcular: ' + err.message);
        } finally {
            setRecalculating(null);
        }
    };

    const handleExportExcel = () => {
        const header = ['Data', 'Nome', 'Externo', 'Função', 'Setor', 'Entrada', 'Lat/Lng Entrada', 'Saída', 'Lat/Lng Saída', 'Total', 'Status'];
        const rows = filteredRegistros.map(reg => [
            new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR'),
            reg.funcionario.nome,
            reg.funcionario.is_externo ? 'Sim' : 'Não',
            reg.funcionario.funcao || '',
            reg.funcionario.setor || '',
            reg.entrada?.localizacao_gps?.lat ? `${reg.entrada.localizacao_gps.lat}, ${reg.entrada.localizacao_gps.lng}` : '',
            formatHora(reg.saida),
            reg.saida?.localizacao_gps?.lat ? `${reg.saida.localizacao_gps.lat}, ${reg.saida.localizacao_gps.lng}` : '',
            reg.total_horas || '',
            reg.status
        ]);

        const csvContent = [
            header.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `controle_ponto_${dataInicio}_${dataFim}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    const inputClass = `bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
        }`;

    return (
        <div className="pb-12">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Controle de Ponto
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Auditagem de registros e ajustes de jornadas</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${inputClass} pl-10 w-48`}
                        />
                    </div>
                    <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className={inputClass}
                    />
                    <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className={inputClass}
                    />
                    <button
                        onClick={fetchData}
                        className="bg-primary-500 hover:bg-primary-600 px-4 py-2 rounded-lg text-white font-semibold text-sm transition-all shadow-glow flex items-center gap-2"
                    >
                        <Filter size={16} /> Filtrar
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className={`p-2 rounded-lg border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                            title="Imprimir"
                        >
                            <Printer size={18} />
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className={`p-2 rounded-lg border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                            title="Exportar Excel"
                        >
                            <Download size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Registros', value: stats.totalRegistros, icon: Clock, color: 'primary' },
                    { label: 'Atrasos', value: stats.atrasos, icon: AlertCircle, color: 'amber' },
                    { label: 'Pendentes', value: stats.ajustesPendentes, icon: Edit3, color: 'indigo' },
                    { label: 'Conformidade', value: `${stats.conformidade}%`, icon: CheckCircle2, color: 'emerald' },
                ].map((stat, i) => (
                    <div key={i} className={`p-5 rounded-xl border transition-all ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color === 'primary' ? 'bg-primary-500/10 text-primary-500' :
                                stat.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
                                    stat.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' :
                                        'bg-emerald-500/10 text-emerald-500'
                                }`}>
                                <stat.icon size={20} />
                            </div>
                            <div>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                                <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabela Agrupada por Escala */}
            <div className="space-y-6">
                {loading ? (
                    <div className={`rounded-xl border p-20 text-center ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm opacity-50">Carregando auditoria...</p>
                    </div>
                ) : Object.keys(groupByScale(filteredRegistros)).length === 0 ? (
                    <div className={`rounded-xl border p-20 text-center ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                        <p className="text-sm opacity-50">Nenhum dado encontrado para o período.</p>
                    </div>
                ) : (
                    Object.entries(groupByScale(filteredRegistros)).map(([scaleName, regs]) => (
                        <div key={scaleName} className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center font-bold text-xs">
                                        {regs.length}
                                    </div>
                                    <h3 className="font-bold text-sm uppercase tracking-wider">{scaleName}</h3>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`border-b ${isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-white/50 border-slate-100'}`}>
                                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Colaborador</th>
                                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Data</th>
                                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Entrada</th>
                                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Almoço</th>
                                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Retorno</th>
                                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Saída</th>
                                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total</th>
                                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Saldo</th>
                                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                                        {regs.map((reg) => (
                                            <tr key={`${reg.funcionario.id}-${reg.data}`} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{reg.funcionario.nome}</p>
                                                            {reg.funcionario.is_externo && (
                                                                <span className="px-1.5 py-0.5 rounded-[4px] bg-indigo-500/10 text-indigo-400 text-[8px] font-bold uppercase tracking-wider border border-indigo-500/20">
                                                                    EXTERNO
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{reg.funcionario.funcao} • {reg.funcionario.setor}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        {new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    </span>
                                                </td>
                                                {[reg.entrada, reg.saida_almoco, reg.retorno_almoco, reg.saida].map((regPonto, idx) => (
                                                    <td key={idx} className="px-6 py-4">
                                                        <div className="flex flex-col gap-0.5 group">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-xs font-mono font-medium ${!regPonto ? (isDark ? 'text-slate-700' : 'text-slate-300') :
                                                                    idx === 0 ? 'text-primary-500' :
                                                                        idx === 1 ? 'text-amber-500' :
                                                                            idx === 2 ? 'text-emerald-500' : 'text-rose-500'
                                                                    }`}>
                                                                    {formatHora(regPonto)}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleOpenAjuste(regPonto, reg.funcionario, reg.data, ['entrada', 'saida_almoco', 'retorno_almoco', 'saida'][idx])}
                                                                    className={`p-1 rounded transition-all ${!regPonto ? 'opacity-20 group-hover:opacity-100 hover:bg-primary-500/10 text-primary-500' : 'opacity-0 group-hover:opacity-100 hover:bg-slate-700 text-slate-500'}`}
                                                                >
                                                                    {!regPonto ? <Plus size={10} /> : <Edit3 size={10} />}
                                                                </button>
                                                            </div>
                                                            {regPonto && (regPonto as any).latitude && (
                                                                <a
                                                                    href={`https://www.google.com/maps?q=${(regPonto as any).latitude},${(regPonto as any).longitude}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`flex items-center gap-0.5 text-[8px] transition-colors ${isDark ? 'text-slate-600 hover:text-primary-400' : 'text-slate-400 hover:text-primary-600'}`}
                                                                >
                                                                    <MapPin size={8} /> Localização
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                ))}
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>{reg.total_horas || '-'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-bold ${reg.saldo_minutos !== undefined && reg.saldo_minutos >= 0
                                                            ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                                                            : (isDark ? 'text-rose-400' : 'text-rose-600')
                                                            }`}>
                                                            {reg.saldo_minutos !== undefined ? (
                                                                <>
                                                                    {reg.saldo_minutos >= 0 ? '+' : ''}
                                                                    {Math.floor(Math.abs(reg.saldo_minutos) / 60)}h {Math.abs(reg.saldo_minutos) % 60}m
                                                                </>
                                                            ) : '-'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRecalculate(reg.funcionario.id, reg.data)}
                                                            disabled={recalculating === `${reg.funcionario.id}-${reg.data}`}
                                                            className={`p-1 rounded-md transition-all ${isDark ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-100 text-slate-400'} hover:text-primary-500`}
                                                            title="Recalcular Banco/HE"
                                                        >
                                                            <Calculator size={12} className={recalculating === `${reg.funcionario.id}-${reg.data}` ? 'animate-spin' : ''} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${reg.status === 'Completo' ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') :
                                                        reg.status === 'Falta' ? (isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600') :
                                                            (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
                                                        }`}>
                                                        {reg.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Ajuste */}
            <AnimatePresence>
                {
                    isAdjustModalOpen && selectedRegistro && (
                        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsAdjustModalOpen(false)} />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className={`relative w-full max-w-lg rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Ajuste de Ponto</h2>
                                            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {TIPO_REGISTRO_LABELS[selectedRegistro.tipo_registro as keyof typeof TIPO_REGISTRO_LABELS]} • {new Date(selectedRegistro.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        <button onClick={() => setIsAdjustModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                            <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Hora Original</label>
                                                <input type="time" value={selectedRegistro.hora_registro.slice(0, 5)} disabled className={`${inputClass} w-full opacity-50 cursor-not-allowed`} />
                                            </div>
                                            <div>
                                                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nova Hora</label>
                                                <input
                                                    type="time"
                                                    value={ajusteForm.novaHora}
                                                    onChange={(e) => setAjusteForm({ ...ajusteForm, novaHora: e.target.value })}
                                                    className={`${inputClass} w-full`}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Justificativa</label>
                                            <select
                                                value={ajusteForm.tipoJustificativaId}
                                                onChange={(e) => setAjusteForm({ ...ajusteForm, tipoJustificativaId: e.target.value })}
                                                className={`${inputClass} w-full`}
                                            >
                                                <option value="">Selecione um motivo...</option>
                                                {tiposJustificativa.map(tipo => (
                                                    <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Observações</label>
                                            <textarea
                                                value={ajusteForm.observacoes}
                                                onChange={(e) => setAjusteForm({ ...ajusteForm, observacoes: e.target.value })}
                                                placeholder="Descreva o motivo do ajuste..."
                                                className={`${inputClass} w-full h-24 resize-none`}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-8">
                                        <button
                                            onClick={() => setIsAdjustModalOpen(false)}
                                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSaveAjuste}
                                            disabled={savingAjuste || !ajusteForm.novaHora}
                                            className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {savingAjuste ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Salvar</>}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >
        </div >
    );
};


export default ControlePonto;

// Helper to group by scale
const groupByScale = (registros: RegistroAgrupado[]) => {
    return registros.reduce((acc: { [key: string]: RegistroAgrupado[] }, reg) => {
        const scaleName = reg.escala?.nome || 'Sem Escala Definida';
        if (!acc[scaleName]) acc[scaleName] = [];
        acc[scaleName].push(reg);
        return acc;
    }, {});
};

export const agruparRegistrosMelhorado = (
    employees: any[],
    registrations: any[],
    startDate: string,
    endDate: string,
    scales: any[]
): RegistroAgrupado[] => {
    const agrupados: RegistroAgrupado[] = [];
    const regMap: { [key: string]: any } = {};

    // 1. Criar um mapa de registros para busca rápida: f_id-data-tipo
    registrations.forEach(reg => {
        const key = `${reg.funcionario_id}-${reg.data_registro}-${reg.tipo_registro}`;
        regMap[key] = reg;
    });

    // 2. Iterar por cada dia do período
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];

        // 3. Para cada dia, iterar por todos os funcionários
        employees.forEach(emp => {
            const row: RegistroAgrupado = {
                data: dateStr,
                funcionario: {
                    id: emp.id,
                    nome: emp.nome,
                    funcao: emp.funcoes?.nome,
                    setor: emp.setores?.nome,
                    is_externo: emp.is_externo
                },
                escala: scales.find(s => s.id === emp.escala_id),
                status: 'Incompleto'
            };

            // Mapear tipos
            row.entrada = regMap[`${emp.id}-${dateStr}-entrada`];
            row.saida_almoco = regMap[`${emp.id}-${dateStr}-saida_almoco`];
            row.retorno_almoco = regMap[`${emp.id}-${dateStr}-retorno_almoco`];
            row.saida = regMap[`${emp.id}-${dateStr}-saida`];

            // Calcular Status e Totais
            const temEntrada = !!row.entrada;
            const temSaida = !!row.saida;

            if (temEntrada && temSaida) {
                row.status = 'Completo';
                const entrada = new Date(`2000-01-01T${row.entrada!.hora_registro}`);
                const saida = new Date(`2000-01-01T${row.saida!.hora_registro}`);
                let diffMs = saida.getTime() - entrada.getTime();
                if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

                const h = Math.floor(diffMs / 3600000);
                const m = Math.floor((diffMs % 3600000) / 60000);
                row.total_horas = `${h}h ${m}m`;
            } else if (!temEntrada && !temSaida) {
                row.status = 'Falta';
            }

            agrupados.push(row);
        });
    }

    return agrupados.sort((a, b) => b.data.localeCompare(a.data) || a.funcionario.nome.localeCompare(b.funcionario.nome));
};
