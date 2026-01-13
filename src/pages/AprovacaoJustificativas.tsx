import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import DataTable from '../components/DataTable';
import {
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    MessageSquare,
    User,
    Calendar,
    Eye,
    X,
    ThumbsUp,
    ThumbsDown,
    Image,
    ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SolicitacaoJustificativa } from '../types/ponto';

const AprovacaoJustificativas: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [solicitacoes, setSolicitacoes] = useState<SolicitacaoJustificativa[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pendente');
    const [selectedSol, setSelectedSol] = useState<SolicitacaoJustificativa | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [observacao, setObservacao] = useState('');

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchData();
        }
    }, [profile?.empresa_id]);

    const fetchData = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('solicitacoes_justificativa')
            .select(`
                *,
                funcionarios!solicitacoes_justificativa_funcionario_id_fkey(nome, email)
            `)
            .eq('empresa_id', profile.empresa_id)
            .order('created_at', { ascending: false });

        if (data) setSolicitacoes(data);
        setLoading(false);
    };

    const handleAction = async (status: 'aprovado' | 'rejeitado') => {
        if (!selectedSol || !profile?.id) return;
        setActionLoading(true);

        try {
            const { error } = await supabase
                .from('solicitacoes_justificativa')
                .update({
                    status,
                    aprovado_por: profile.id,
                    data_aprovacao: new Date().toISOString(),
                    observacao_aprovador: observacao || null
                })
                .eq('id', selectedSol.id);

            if (error) throw error;

            // Se aprovado e for atestado, criar registro de afastamento
            if (status === 'aprovado' && selectedSol.tipo === 'atestado' && selectedSol.quantidade_dias) {
                const dataInicio = new Date(selectedSol.data_ocorrencia);
                const dataFim = new Date(dataInicio);
                dataFim.setDate(dataFim.getDate() + selectedSol.quantidade_dias - 1);

                // Buscar tipo de afastamento "Atestado Médico"
                const { data: tipoAtestado } = await supabase
                    .from('tipos_afastamentos')
                    .select('id')
                    .eq('empresa_id', profile.empresa_id)
                    .ilike('nome', '%atestado%')
                    .maybeSingle();

                if (tipoAtestado) {
                    await supabase.from('afastamentos').insert([{
                        funcionario_id: selectedSol.funcionario_id,
                        tipo_afastamento_id: tipoAtestado.id,
                        data_inicio: selectedSol.data_ocorrencia,
                        data_fim: dataFim.toISOString().split('T')[0],
                        observacoes: `Atestado médico aprovado. CID: ${selectedSol.cid || 'N/A'}. ${selectedSol.motivo}`,
                        status: 'Ativo',
                        empresa_id: profile.empresa_id
                    }]);
                }
            }

            setDetailOpen(false);
            setSelectedSol(null);
            setObservacao('');
            fetchData();
        } catch (err: any) {
            console.error('Erro ao processar solicitação:', err);
            alert('Erro ao processar: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const openDetail = (sol: SolicitacaoJustificativa) => {
        setSelectedSol(sol);
        setObservacao('');
        setDetailOpen(true);
    };

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { label: string; color: string; icon: any }> = {
            'pendente': { label: 'Pendente', color: 'amber', icon: Clock },
            'aprovado': { label: 'Aprovado', color: 'emerald', icon: CheckCircle },
            'rejeitado': { label: 'Rejeitado', color: 'rose', icon: XCircle }
        };
        const config = configs[status] || configs['pendente'];
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${config.color === 'emerald' ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') :
                config.color === 'amber' ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600') :
                    (isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600')
                }`}>
                <Icon size={12} /> {config.label}
            </span>
        );
    };

    const filteredData = solicitacoes.filter(s =>
        statusFilter === 'Todos' || s.status === statusFilter
    );

    const stats = {
        total: solicitacoes.length,
        pendentes: solicitacoes.filter(s => s.status === 'pendente').length,
        aprovados: solicitacoes.filter(s => s.status === 'aprovado').length,
        rejeitados: solicitacoes.filter(s => s.status === 'rejeitado').length
    };

    const kpis = [
        { label: 'Total', value: stats.total },
        { label: 'Pendentes', value: stats.pendentes, color: 'orange' as const },
        { label: 'Aprovados', value: stats.aprovados, color: 'green' as const },
        { label: 'Rejeitados', value: stats.rejeitados, color: 'red' as const }
    ];

    const inputClass = `w-full border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`;

    return (
        <>
            <DataTable
                title="Aprovação de Justificativas"
                subtitle="Gerencie solicitações da equipe"
                kpis={kpis}
                searchPlaceholder=""
                searchValue=""
                onSearchChange={() => { }}
                filters={[
                    {
                        label: 'Status',
                        value: statusFilter,
                        options: [
                            { label: 'Pendentes', value: 'pendente' },
                            { label: 'Todos', value: 'Todos' },
                            { label: 'Aprovados', value: 'aprovado' },
                            { label: 'Rejeitados', value: 'rejeitado' },
                        ],
                        onChange: setStatusFilter
                    }
                ]}
                columns={[
                    { key: 'colaborador', label: 'Colaborador' },
                    { key: 'tipo', label: 'Tipo' },
                    { key: 'data', label: 'Data' },
                    { key: 'status', label: 'Status' },
                    { key: 'acoes', label: 'Ações', width: '100px' },
                ]}
                data={filteredData}
                renderRow={(sol: any) => (
                    <tr key={sol.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                    <User size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                </div>
                                <div>
                                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {sol.funcionarios?.nome || 'N/A'}
                                    </p>
                                    <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {sol.funcionarios?.email || ''}
                                    </p>
                                </div>
                            </div>
                        </td>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${sol.tipo === 'atestado'
                                    ? isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
                                    : isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'
                                    }`}>
                                    {sol.tipo === 'atestado' ? <FileText size={14} /> : <MessageSquare size={14} />}
                                </div>
                                <span className={`text-sm capitalize ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {sol.tipo === 'atestado' ? 'Atestado' : 'Justificativa'}
                                </span>
                            </div>
                        </td>
                        <td className={`px-5 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {new Date(sol.data_ocorrencia).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-5 py-4">
                            {getStatusBadge(sol.status)}
                        </td>
                        <td className="px-5 py-4">
                            <button
                                onClick={() => openDetail(sol)}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-primary-500`}
                                title="Ver Detalhes"
                            >
                                <Eye size={16} />
                            </button>
                        </td>
                    </tr>
                )}
                onRefresh={fetchData}
                loading={loading}
            />

            {/* Modal Detalhes */}
            <AnimatePresence>
                {detailOpen && selectedSol && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setDetailOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-xl rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(selectedSol as any).tipo === 'atestado'
                                            ? isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
                                            : isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'
                                            }`}>
                                            {(selectedSol as any).tipo === 'atestado' ? <FileText size={24} /> : <MessageSquare size={24} />}
                                        </div>
                                        <div>
                                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {(selectedSol as any).tipo === 'atestado' ? 'Atestado Médico' : 'Justificativa'}
                                            </h2>
                                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {(selectedSol as any).funcionarios?.nome}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setDetailOpen(false)}
                                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                    >
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                {/* Info Grid */}
                                <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="opacity-50 text-xs font-medium mb-1">Data da Ocorrência</p>
                                            <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {new Date(selectedSol.data_ocorrencia).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        {(selectedSol as any).tipo === 'atestado' && (
                                            <>
                                                <div>
                                                    <p className="opacity-50 text-xs font-medium mb-1">Dias de Afastamento</p>
                                                    <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                        {selectedSol.quantidade_dias} dia(s)
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="opacity-50 text-xs font-medium mb-1">CID</p>
                                                    <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                        {selectedSol.cid || 'Não informado'}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <p className="opacity-50 text-xs font-medium mb-1">Solicitado em</p>
                                            <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {new Date(selectedSol.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Motivo */}
                                <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                    <p className="opacity-50 text-xs font-medium mb-2">Motivo</p>
                                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {selectedSol.motivo}
                                    </p>
                                </div>

                                {/* Documento */}
                                {selectedSol.documento_url && (
                                    <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                        <p className="opacity-50 text-xs font-medium mb-2">Documento Anexado</p>
                                        <a
                                            href={selectedSol.documento_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                        >
                                            <img
                                                src={selectedSol.documento_url}
                                                alt="Atestado"
                                                className="w-full max-h-64 object-contain rounded-lg border border-slate-200 dark:border-slate-700"
                                            />
                                            <p className="flex items-center gap-1 mt-2 text-xs text-primary-500 font-medium hover:underline">
                                                <ExternalLink size={12} /> Abrir em nova aba
                                            </p>
                                        </a>
                                    </div>
                                )}

                                {/* Status atual mostrado se já processado */}
                                {selectedSol.status !== 'pendente' && (
                                    <div className={`p-4 rounded-xl mb-4 ${selectedSol.status === 'aprovado'
                                        ? isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'
                                        : isDark ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-rose-50 border border-rose-100'
                                        }`}>
                                        <p className={`text-sm font-medium ${selectedSol.status === 'aprovado'
                                            ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                                            : isDark ? 'text-rose-400' : 'text-rose-700'
                                            }`}>
                                            {selectedSol.status === 'aprovado' ? '✓ Aprovado' : '✗ Rejeitado'}
                                            {selectedSol.data_aprovacao && ` em ${new Date(selectedSol.data_aprovacao).toLocaleDateString('pt-BR')}`}
                                        </p>
                                        {selectedSol.observacao_aprovador && (
                                            <p className={`text-xs mt-1 ${isDark ? 'opacity-70' : 'opacity-80'}`}>
                                                "{selectedSol.observacao_aprovador}"
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Ações se pendente */}
                                {selectedSol.status === 'pendente' && (
                                    <>
                                        <div className="mb-4">
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Observação (opcional)
                                            </label>
                                            <textarea
                                                rows={2}
                                                className={`${inputClass} resize-none`}
                                                placeholder="Adicione uma observação se necessário..."
                                                value={observacao}
                                                onChange={e => setObservacao(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleAction('rejeitado')}
                                                disabled={actionLoading}
                                                className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {actionLoading ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <><ThumbsDown size={16} /> Rejeitar</>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleAction('aprovado')}
                                                disabled={actionLoading}
                                                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {actionLoading ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <><ThumbsUp size={16} /> Aprovar</>
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AprovacaoJustificativas;
