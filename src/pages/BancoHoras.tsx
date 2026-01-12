import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Clock,
    TrendingUp,
    TrendingDown,
    Plus,
    Search,
    Settings,
    ArrowUpRight,
    ArrowDownRight,
    History,
    X,
    Save,
    Calendar,
    Trash2,
    Edit2,
    Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BancoHorasSaldo {
    funcionario_id: string;
    funcionario_nome: string;
    funcionario_cpf: string;
    total_credito_minutos: number;
    total_debito_minutos: number;
    saldo_minutos: number;
    saldo_formatado: string;
    ultima_movimentacao: string;
    total_movimentacoes: number;
}

interface BancoHorasConfig {
    id: string;
    tipo_ciclo: string;
    dia_inicio_ciclo: number;
    limite_credito_horas: number;
    limite_debito_horas: number;
    permite_saldo_negativo: boolean;
    percentual_hora_extra_50: number;
    percentual_hora_extra_100: number;
}

interface Movimentacao {
    id: string;
    funcionario_id: string;
    data_referencia: string;
    tipo: string;
    minutos: number;
    descricao: string;
    status: string;
    created_at: string;
    funcionario?: { nome: string };
}

interface Funcionario {
    id: string;
    nome: string;
    cpf: string;
}

const formatMinutes = (minutes: number): string => {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const sign = minutes < 0 ? '-' : '';
    return `${sign}${hours}h ${mins}m`;
};

const BancoHoras = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();

    const [saldos, setSaldos] = useState<BancoHorasSaldo[]>([]);
    const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
    const [config, setConfig] = useState<BancoHorasConfig | null>(null);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal de configuração
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [configForm, setConfigForm] = useState({
        tipo_ciclo: 'mensal',
        dia_inicio_ciclo: 1,
        limite_credito_horas: 40,
        limite_debito_horas: 10,
        permite_saldo_negativo: false
    });
    const [savingConfig, setSavingConfig] = useState(false);

    // Modal de movimentação manual
    const [isMovModalOpen, setIsMovModalOpen] = useState(false);
    const [editingMov, setEditingMov] = useState<Movimentacao | null>(null);
    const [movForm, setMovForm] = useState({
        funcionario_id: '',
        tipo: 'credito',
        minutos: '',
        horas: '',
        descricao: '',
        data_referencia: new Date().toISOString().split('T')[0]
    });
    const [savingMov, setSavingMov] = useState(false);

    // Modal de histórico do funcionário
    const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
    const [selectedFuncionario, setSelectedFuncionario] = useState<BancoHorasSaldo | null>(null);
    const [historicoLoading, setHistoricoLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Stats
    const [stats, setStats] = useState({
        totalCredito: 0,
        totalDebito: 0,
        saldoGeral: 0,
        funcionariosComSaldo: 0
    });

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchData();
        }
    }, [profile?.empresa_id]);

    const fetchData = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);

        try {
            // Buscar saldos
            const { data: saldosData, error: saldosError } = await supabase
                .from('banco_horas_saldo')
                .select('*')
                .eq('empresa_id', profile.empresa_id);

            if (saldosError) {
                console.error('Erro ao buscar saldos:', saldosError);
            } else {
                setSaldos(saldosData || []);

                // Calcular stats
                const totCredito = (saldosData || []).reduce((acc, s) => acc + s.total_credito_minutos, 0);
                const totDebito = (saldosData || []).reduce((acc, s) => acc + s.total_debito_minutos, 0);
                setStats({
                    totalCredito: totCredito,
                    totalDebito: totDebito,
                    saldoGeral: totCredito - totDebito,
                    funcionariosComSaldo: (saldosData || []).filter(s => s.saldo_minutos !== 0).length
                });
            }

            // Buscar config
            const { data: configData } = await supabase
                .from('banco_horas_config')
                .select('*')
                .eq('empresa_id', profile.empresa_id)
                .single();

            if (configData) {
                setConfig(configData);
                setConfigForm({
                    tipo_ciclo: configData.tipo_ciclo,
                    dia_inicio_ciclo: configData.dia_inicio_ciclo,
                    limite_credito_horas: configData.limite_credito_horas,
                    limite_debito_horas: configData.limite_debito_horas,
                    permite_saldo_negativo: configData.permite_saldo_negativo
                });
            }

            // Buscar funcionários para o select
            const { data: funcData } = await supabase
                .from('funcionarios')
                .select('id, nome, cpf')
                .eq('empresa_id', profile.empresa_id)
                .eq('status', 'Ativo')
                .order('nome');

            setFuncionarios(funcData || []);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistorico = async (funcionarioId: string) => {
        setHistoricoLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_extrato_banco_horas', {
                p_funcionario_id: funcionarioId,
                p_data_inicio: dateRange.start,
                p_data_fim: dateRange.end
            });

            if (error) throw error;
            setMovimentacoes(data || []);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
        } finally {
            setHistoricoLoading(false);
        }
    };

    const handleOpenHistorico = (saldo: BancoHorasSaldo) => {
        setSelectedFuncionario(saldo);
        setIsHistoricoModalOpen(true);
        // Usar o range atual para o fetch
        fetchHistorico(saldo.funcionario_id);
    };

    const handleSaveConfig = async () => {
        if (!profile?.empresa_id) return;
        setSavingConfig(true);

        try {
            if (config?.id) {
                const { error } = await supabase
                    .from('banco_horas_config')
                    .update(configForm)
                    .eq('id', config.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('banco_horas_config')
                    .insert([{ ...configForm, empresa_id: profile.empresa_id }]);
                if (error) throw error;
            }

            setIsConfigModalOpen(false);
            fetchData();
        } catch (error: any) {
            alert('Erro ao salvar configuração: ' + error.message);
        } finally {
            setSavingConfig(false);
        }
    };

    const handleOpenCreateMov = () => {
        setEditingMov(null);
        setMovForm({
            funcionario_id: '',
            tipo: 'credito',
            minutos: '',
            horas: '',
            descricao: '',
            data_referencia: new Date().toISOString().split('T')[0]
        });
        setIsMovModalOpen(true);
    };

    const handleOpenEditMov = (mov: Movimentacao) => {
        setEditingMov(mov);
        const absMinutos = Math.abs(mov.minutos);
        setMovForm({
            funcionario_id: mov.funcionario_id,
            tipo: mov.tipo,
            horas: String(Math.floor(absMinutos / 60)),
            minutos: String(absMinutos % 60),
            descricao: mov.descricao || '',
            data_referencia: mov.data_referencia
        });
        setIsMovModalOpen(true);
    };

    const handleSaveMovimentacao = async () => {
        if (!profile?.empresa_id || !movForm.funcionario_id) return;
        setSavingMov(true);

        const horasNum = parseInt(movForm.horas) || 0;
        const minutosNum = parseInt(movForm.minutos) || 0;
        const totalMinutos = (horasNum * 60) + minutosNum;

        if (totalMinutos <= 0) {
            alert('O tempo deve ser maior que zero.');
            setSavingMov(false);
            return;
        }

        try {
            const minutosFinais = movForm.tipo === 'debito' || movForm.tipo === 'compensacao'
                ? -totalMinutos
                : totalMinutos;

            if (editingMov) {
                // Update
                console.log('Atualizando movimentação:', editingMov.id);
                const { error } = await supabase
                    .from('banco_horas_movimentacoes')
                    .update({
                        tipo: movForm.tipo,
                        minutos: minutosFinais,
                        descricao: movForm.descricao || `${movForm.tipo === 'credito' ? 'Crédito' : 'Débito'} manual`
                    })
                    .eq('id', editingMov.id);
                if (error) throw error;
            } else {
                // Insert
                console.log('Inserindo nova movimentação para empresa:', profile.empresa_id);
                const { error } = await supabase
                    .from('banco_horas_movimentacoes')
                    .insert([{
                        funcionario_id: movForm.funcionario_id,
                        empresa_id: profile.empresa_id,
                        data_referencia: movForm.data_referencia,
                        tipo: movForm.tipo,
                        minutos: minutosFinais,
                        descricao: movForm.descricao || `${movForm.tipo === 'credito' ? 'Crédito' : 'Débito'} manual`,
                        status: 'aprovado',
                        aprovado_por: profile.funcionario_id
                    }]);
                if (error) throw error;
            }

            setIsMovModalOpen(false);
            setMovForm({
                funcionario_id: '',
                tipo: 'credito',
                minutos: '',
                horas: '',
                descricao: '',
                data_referencia: new Date().toISOString().split('T')[0]
            });
            setEditingMov(null);

            // Recarregar tudo
            await fetchData();
            if (selectedFuncionario) {
                // Se o funcionário selecionado mudou no saldo geral, precisamos atualizar o objeto selectedFuncionario também
                const updatedSaldo = saldos.find(s => s.funcionario_id === selectedFuncionario.funcionario_id);
                if (updatedSaldo) setSelectedFuncionario(updatedSaldo);
                await fetchHistorico(selectedFuncionario.funcionario_id);
            }
        } catch (error: any) {
            alert('Erro ao registrar movimentação: ' + error.message);
        } finally {
            setSavingMov(false);
        }
    };

    const handleDeleteMov = async (mov: Movimentacao) => {
        if (!confirm(`Deseja realmente excluir esta movimentação?\n\nTipo: ${mov.tipo}\nValor: ${formatMinutes(mov.minutos)}`)) {
            return;
        }

        try {
            console.log('Tentando excluir movimentação:', mov.id);
            const { error, count, status } = await supabase
                .from('banco_horas_movimentacoes')
                .delete({ count: 'exact' })
                .eq('id', mov.id);

            if (error) {
                console.error('Erro Supabase ao excluir:', error);
                throw error;
            }

            console.log('Status da exclusão:', status, 'Count:', count);

            if (count === 0) {
                alert('A movimentação não pôde ser excluída (talvez já tenha sido excluída ou você não tenha permissão).');
            }

            // Força atualização dos dados
            await fetchData();
            if (selectedFuncionario) {
                await fetchHistorico(selectedFuncionario.funcionario_id);
                // Atualizar o saldo exibido no cabeçalho do modal de histórico
                const updatedSaldos = await supabase
                    .from('banco_horas_saldo')
                    .select('*')
                    .eq('funcionario_id', selectedFuncionario.funcionario_id)
                    .single();
                if (updatedSaldos.data) {
                    setSelectedFuncionario(updatedSaldos.data);
                }
            }
        } catch (error: any) {
            console.error('Erro completo na exclusão:', error);
            alert('Erro ao excluir movimentação: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const filteredSaldos = saldos.filter(s =>
        s.funcionario_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.funcionario_cpf?.includes(searchTerm)
    );

    const cardClass = `rounded-xl border transition-all ${isDark
        ? 'bg-slate-800/50 border-slate-700/50'
        : 'bg-white border-slate-200 shadow-sm'}`;

    const inputClass = `w-full border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark
        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`;

    return (
        <div className="pb-12">
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Banco de Horas
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Gerencie créditos e débitos de horas dos colaboradores
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/regras-horas"
                        className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${isDark
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                        <Settings size={16} /> Configurar Regras
                    </Link>
                    <button
                        onClick={handleOpenCreateMov}
                        className="bg-primary-500 hover:bg-primary-600 px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition-all shadow-glow flex items-center gap-2"
                    >
                        <Plus size={16} /> Nova Movimentação
                    </button>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cardClass + ' p-5'}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Crédito</p>
                            <p className={`text-xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatMinutes(stats.totalCredito)}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cardClass + ' p-5'}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                            <TrendingDown size={20} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Débito</p>
                            <p className={`text-xl font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{formatMinutes(stats.totalDebito)}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cardClass + ' p-5'}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Saldo Geral</p>
                            <p className={`text-xl font-bold ${stats.saldoGeral >= 0
                                ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                                : (isDark ? 'text-rose-400' : 'text-rose-600')}`}>
                                {formatMinutes(stats.saldoGeral)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={cardClass + ' p-5'}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                            <History size={20} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Com Saldo</p>
                            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stats.funcionariosComSaldo}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Config Info */}
            {config && (
                <div className={`${cardClass} p-4 mb-6 flex items-center justify-between`}>
                    <div className="flex items-center gap-4">
                        <Calendar size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Ciclo: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{config.tipo_ciclo}</strong> |
                            Início dia <strong className={isDark ? 'text-white' : 'text-slate-900'}>{config.dia_inicio_ciclo}</strong> |
                            Limite crédito: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{config.limite_credito_horas}h</strong>
                        </span>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="flex gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                    <input
                        type="text"
                        placeholder="Buscar colaborador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${inputClass} pl-10`}
                    />
                </div>
            </div>

            {/* Tabela */}
            <div className={cardClass}>
                <table className="w-full text-left">
                    <thead>
                        <tr className={`border-b ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}`}>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Colaborador</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Crédito</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Débito</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Saldo</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Última Mov.</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-right ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ações</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center">
                                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : filteredSaldos.length === 0 ? (
                            <tr>
                                <td colSpan={6} className={`px-6 py-10 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {saldos.length === 0
                                        ? 'Nenhuma movimentação registrada ainda.'
                                        : 'Nenhum colaborador encontrado.'}
                                </td>
                            </tr>
                        ) : (
                            filteredSaldos.map((saldo) => (
                                <tr
                                    key={saldo.funcionario_id}
                                    className={`transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                                    onClick={() => handleOpenHistorico(saldo)}
                                >
                                    <td className="px-6 py-4">
                                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{saldo.funcionario_nome}</p>
                                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{saldo.funcionario_cpf}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            <ArrowUpRight size={14} />
                                            {formatMinutes(saldo.total_credito_minutos)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                                            <ArrowDownRight size={14} />
                                            {formatMinutes(saldo.total_debito_minutos)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${saldo.saldo_minutos >= 0
                                            ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                                            : (isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600')}`}>
                                            {saldo.saldo_formatado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {saldo.ultima_movimentacao
                                                ? new Date(saldo.ultima_movimentacao).toLocaleDateString('pt-BR')
                                                : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenHistorico(saldo); }}
                                            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-primary-500`}
                                            title="Ver histórico"
                                        >
                                            <Eye size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Configuração */}
            <AnimatePresence>
                {isConfigModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsConfigModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-md rounded-2xl border shadow-xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Configuração do Banco de Horas</h2>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Defina as regras para sua empresa</p>
                                    </div>
                                    <button onClick={() => setIsConfigModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tipo de Ciclo</label>
                                        <select
                                            className={inputClass}
                                            value={configForm.tipo_ciclo}
                                            onChange={(e) => setConfigForm({ ...configForm, tipo_ciclo: e.target.value })}
                                        >
                                            <option value="mensal">Mensal</option>
                                            <option value="trimestral">Trimestral</option>
                                            <option value="semestral">Semestral</option>
                                            <option value="anual">Anual</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Dia de Início do Ciclo</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={28}
                                            className={inputClass}
                                            value={configForm.dia_inicio_ciclo}
                                            onChange={(e) => setConfigForm({ ...configForm, dia_inicio_ciclo: parseInt(e.target.value) })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Limite Crédito (h)</label>
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={configForm.limite_credito_horas}
                                                onChange={(e) => setConfigForm({ ...configForm, limite_credito_horas: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Limite Débito (h)</label>
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={configForm.limite_debito_horas}
                                                onChange={(e) => setConfigForm({ ...configForm, limite_debito_horas: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="permite_saldo_negativo"
                                            checked={configForm.permite_saldo_negativo}
                                            onChange={(e) => setConfigForm({ ...configForm, permite_saldo_negativo: e.target.checked })}
                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <label htmlFor="permite_saldo_negativo" className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Permitir saldo negativo
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setIsConfigModalOpen(false)}
                                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveConfig}
                                        disabled={savingConfig}
                                        className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {savingConfig ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Salvar</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Nova/Editar Movimentação */}
            <AnimatePresence>
                {isMovModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsMovModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-md rounded-2xl border shadow-xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {editingMov ? 'Editar Movimentação' : 'Nova Movimentação'}
                                        </h2>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {editingMov ? 'Altere os dados da movimentação' : 'Adicione crédito ou débito manualmente'}
                                        </p>
                                    </div>
                                    <button onClick={() => setIsMovModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Data de Referência</label>
                                            <input
                                                type="date"
                                                className={`w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-white border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                                value={movForm.data_referencia}
                                                onChange={(e) => setMovForm({ ...movForm, data_referencia: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Colaborador</label>
                                            <select
                                                className={`w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-white border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                                value={movForm.funcionario_id}
                                                onChange={(e) => setMovForm({ ...movForm, funcionario_id: e.target.value })}
                                                disabled={!!editingMov}
                                            >
                                                <option value="">Selecione...</option>
                                                {funcionarios.map(f => (
                                                    <option key={f.id} value={f.id}>{f.nome}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tipo</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setMovForm({ ...movForm, tipo: 'credito' })}
                                                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${movForm.tipo === 'credito'
                                                    ? 'bg-emerald-500 text-white'
                                                    : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                                            >
                                                <ArrowUpRight size={14} className="inline mr-1" /> Crédito
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMovForm({ ...movForm, tipo: 'debito' })}
                                                className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${movForm.tipo === 'debito'
                                                    ? 'bg-rose-500 text-white'
                                                    : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                                            >
                                                <ArrowDownRight size={14} className="inline mr-1" /> Débito
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Horas</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                className={inputClass}
                                                placeholder="0"
                                                value={movForm.horas}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setMovForm({ ...movForm, horas: val });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Minutos</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                className={inputClass}
                                                placeholder="0"
                                                value={movForm.minutos}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    const num = parseInt(val) || 0;
                                                    if (num <= 59) {
                                                        setMovForm({ ...movForm, minutos: val });
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Descrição</label>
                                        <input
                                            type="text"
                                            className={inputClass}
                                            placeholder="Motivo da movimentação..."
                                            value={movForm.descricao}
                                            onChange={(e) => setMovForm({ ...movForm, descricao: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setIsMovModalOpen(false)}
                                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveMovimentacao}
                                        disabled={savingMov || !movForm.funcionario_id}
                                        className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {savingMov ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> {editingMov ? 'Salvar' : 'Registrar'}</>}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Histórico do Funcionário */}
            <AnimatePresence>
                {isHistoricoModalOpen && selectedFuncionario && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsHistoricoModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-2xl max-h-[80vh] rounded-2xl border shadow-xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            Histórico de {selectedFuncionario.funcionario_nome}
                                        </h2>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Saldo atual: <span className={selectedFuncionario.saldo_minutos >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{selectedFuncionario.saldo_formatado}</span>
                                        </p>
                                    </div>
                                    <button onClick={() => setIsHistoricoModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                {/* Filtros de Extrato */}
                                <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Início</label>
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                            className={`w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-white border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fim</label>
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                            className={`w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-white border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={() => fetchHistorico(selectedFuncionario.funcionario_id)}
                                            className="px-4 py-2 bg-primary-500 text-white rounded-lg font-bold text-sm hover:bg-primary-600 transition-colors h-[38px] flex items-center justify-center gap-2"
                                        >
                                            <Search size={14} /> Filtrar
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-y-auto max-h-[45vh] px-2 custom-scrollbar">
                                    {historicoLoading ? (
                                        <div className="py-20 text-center">
                                            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Carregando extrato...</p>
                                        </div>
                                    ) : movimentacoes.length === 0 ? (
                                        <div className="text-center py-20 px-4">
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-slate-700/50 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
                                                <History size={32} />
                                            </div>
                                            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Nenhuma movimentação encontrada neste período.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pb-4">

                                            {movimentacoes.map((mov) => (
                                                <div
                                                    key={mov.id}
                                                    className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mov.minutos >= 0
                                                            ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                                                            : (isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600')}`}>
                                                            {mov.minutos >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                                    {mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1)}: {formatMinutes(mov.minutos)}
                                                                </p>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                                                    Acumulado: {formatMinutes((mov as any).saldo_acumulado)}
                                                                </span>
                                                            </div>
                                                            <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                {mov.descricao || 'Sem descrição'} • {new Date(mov.data_referencia + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => { setIsHistoricoModalOpen(false); handleOpenEditMov(mov); }}
                                                            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'} hover:text-primary-500`}
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMov(mov)}
                                                            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'} hover:text-rose-500`}
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700/50">
                                    <button
                                        onClick={() => setIsHistoricoModalOpen(false)}
                                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                    >
                                        Fechar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMovForm({ ...movForm, funcionario_id: selectedFuncionario.funcionario_id });
                                            setIsHistoricoModalOpen(false);
                                            handleOpenCreateMov();
                                            setMovForm(prev => ({ ...prev, funcionario_id: selectedFuncionario.funcionario_id }));
                                        }}
                                        className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} /> Nova Movimentação
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

export default BancoHoras;
