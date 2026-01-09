import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import { generateBiometryLink } from '../services/biometriaService';
import DataTable from '../components/DataTable';
import {
    ShieldCheck,
    Link as LinkIcon,
    CheckCircle2,
    Clock,
    AlertCircle,
    Copy,
    Mail,
    Search,
    RefreshCcw,
    XCircle,
    X,
    User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FuncionarioBiometria {
    id: string;
    nome: string;
    email: string;
    funcao?: string;
    setor?: string;
    biometria_status: 'sem_cadastro' | 'link_enviado' | 'pendente_validacao' | 'Ativo' | 'Inativo';
}

const BiometriaCentral = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [funcionarios, setFuncionarios] = useState<FuncionarioBiometria[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('todos');

    // Modal de link
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [selectedFunc, setSelectedFunc] = useState<FuncionarioBiometria | null>(null);
    const [generatedLink, setGeneratedLink] = useState('');
    const [generatingLink, setGeneratingLink] = useState(false);
    const [copied, setCopied] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        cadastrados: 0,
        pendentes: 0,
        linkEnviado: 0,
        semCadastro: 0
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
            const { data, error } = await supabase
                .from('funcionarios')
                .select(`
                    id,
                    nome,
                    email,
                    funcoes:funcao_id (nome),
                    setores:setor_id (nome),
                    funcionarios_biometria!funcionarios_biometria_funcionario_id_fkey (status)
                `)
                .eq('empresa_id', profile.empresa_id)
                .eq('status', 'Ativo');

            if (error) {
                console.error(error);
                return;
            }

            const mapped: FuncionarioBiometria[] = (data || []).map((f: any) => {
                // Buscar o status de biometria (pode ser objeto único ou array)
                const biometria = f.funcionarios_biometria;
                let biometriaStatus: FuncionarioBiometria['biometria_status'] = 'sem_cadastro';

                if (Array.isArray(biometria)) {
                    const ativoRecord = biometria.find((b: any) => b.status === 'Ativo');
                    biometriaStatus = ativoRecord?.status || biometria[0]?.status || 'sem_cadastro';
                } else if (biometria && typeof biometria === 'object') {
                    biometriaStatus = biometria.status || 'sem_cadastro';
                }

                return {
                    id: f.id,
                    nome: f.nome,
                    email: f.email,
                    funcao: f.funcoes?.nome,
                    setor: f.setores?.nome,
                    biometria_status: biometriaStatus
                };
            });

            setFuncionarios(mapped);

            setStats({
                total: mapped.length,
                cadastrados: mapped.filter(f => f.biometria_status === 'Ativo').length,
                pendentes: mapped.filter(f => f.biometria_status === 'pendente_validacao').length,
                linkEnviado: mapped.filter(f => f.biometria_status === 'link_enviado').length,
                semCadastro: mapped.filter(f => f.biometria_status === 'sem_cadastro').length
            });
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateLink = async (func: FuncionarioBiometria) => {
        if (!profile?.empresa_id) return;

        setSelectedFunc(func);
        setGeneratedLink('');
        setCopied(false);
        setLinkModalOpen(true);
        setGeneratingLink(true);

        const result = await generateBiometryLink(func.id, profile.empresa_id);

        if (result.success && result.link) {
            setGeneratedLink(result.link);
        } else {
            alert(result.error || 'Erro ao gerar link');
            setLinkModalOpen(false);
        }

        setGeneratingLink(false);
        fetchData();
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEmailLink = () => {
        if (!selectedFunc) return;
        const subject = encodeURIComponent('Cadastro de Biometria - Ponto Flex');
        const body = encodeURIComponent(`Olá ${selectedFunc.nome},\n\nAcesse o link abaixo para cadastrar sua biometria facial:\n\n${generatedLink}\n\nEste link é válido por 24 horas.\n\nAtenciosamente,\nEquipe RH`);
        window.open(`mailto:${selectedFunc.email}?subject=${subject}&body=${body}`);
    };

    const handleDisableBiometria = async (funcId: string) => {
        if (!confirm('Deseja realmente desativar a biometria deste funcionário?')) return;

        const { error } = await supabase
            .from('funcionarios_biometria')
            .update({ status: 'Inativo' })
            .eq('funcionario_id', funcId);

        if (error) {
            alert(error.message);
            return;
        }

        fetchData();
    };

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { label: string; color: string; icon: any }> = {
            'Ativo': { label: 'Ativa', color: 'emerald', icon: CheckCircle2 },
            'pendente_validacao': { label: 'Pendente', color: 'amber', icon: Clock },
            'link_enviado': { label: 'Link Enviado', color: 'primary', icon: LinkIcon },
            'sem_cadastro': { label: 'Sem Registro', color: 'slate', icon: AlertCircle },
            'Inativo': { label: 'Inativa', color: 'rose', icon: XCircle }
        };
        const config = configs[status] || configs['sem_cadastro'];
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${config.color === 'emerald' ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') :
                config.color === 'amber' ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600') :
                    config.color === 'primary' ? (isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600') :
                        config.color === 'rose' ? (isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600') :
                            (isDark ? 'bg-slate-500/10 text-slate-400' : 'bg-slate-100 text-slate-600')
                }`}>
                <Icon size={12} /> {config.label}
            </span>
        );
    };

    const filteredFuncionarios = funcionarios.filter(f => {
        const matchSearch = !searchQuery ||
            (f.nome?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (f.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === 'todos' || f.biometria_status === statusFilter;
        return matchSearch && matchStatus;
    });

    const kpis = [
        { label: 'Total', value: stats.total },
        { label: 'Ativas', value: stats.cadastrados, color: 'green' as const },
        { label: 'Pendentes', value: stats.pendentes, color: 'orange' as const },
        { label: 'Link Enviado', value: stats.linkEnviado, color: 'blue' as const },
        { label: 'S/ Registro', value: stats.semCadastro, color: 'default' as const }
    ];

    const inputClass = `bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
        }`;

    return (
        <div className="pb-12">
            <DataTable
                title="Gestão de Biometrias"
                subtitle="Cadastro e validação facial"
                kpis={kpis}
                searchPlaceholder="Buscar por nome ou email..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                filters={[
                    {
                        label: 'Status',
                        value: statusFilter,
                        options: [
                            { label: 'Todos', value: 'todos' },
                            { label: 'Ativo', value: 'Ativo' },
                            { label: 'Pendente', value: 'pendente_validacao' },
                            { label: 'Link Enviado', value: 'link_enviado' },
                            { label: 'Sem Registro', value: 'sem_cadastro' },
                        ],
                        onChange: setStatusFilter
                    }
                ]}
                columns={[
                    { key: 'funcionario', label: 'Colaborador' },
                    { key: 'setor', label: 'Função / Setor' },
                    { key: 'status', label: 'Status' },
                    { key: 'acoes', label: 'Ações', width: '150px' },
                ]}
                data={filteredFuncionarios}
                renderRow={(func) => (
                    <tr key={func.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                    <User size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                </div>
                                <div>
                                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{func.nome}</p>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{func.email}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                {func.funcao} • {func.setor}
                            </p>
                        </td>
                        <td className="px-6 py-4">
                            {getStatusBadge(func.biometria_status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                                {(func.biometria_status === 'sem_cadastro' || func.biometria_status === 'link_enviado') && (
                                    <button
                                        onClick={() => handleGenerateLink(func)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isDark ? 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                            }`}
                                    >
                                        <LinkIcon size={12} /> {func.biometria_status === 'link_enviado' ? 'Reenviar' : 'Link'}
                                    </button>
                                )}
                                {func.biometria_status === 'Ativo' && (
                                    <button
                                        onClick={() => handleDisableBiometria(func.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isDark ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                            }`}
                                    >
                                        Desativar
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                )}
                onRefresh={fetchData}
                loading={loading}
            />

            <AnimatePresence>
                {linkModalOpen && selectedFunc && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setLinkModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-lg rounded-2xl border shadow-xl my-4 md:my-8 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
                                            <LinkIcon size={20} className="text-primary-500" />
                                        </div>
                                        <div>
                                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Link de Cadastro</h2>
                                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedFunc.nome}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setLinkModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={20} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                                    </button>
                                </div>

                                {generatingLink ? (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <>
                                        <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Envie este link para que o colaborador possa cadastrar sua face. O link é individual e expira em 24h.
                                        </p>

                                        <div className={`p-4 rounded-xl mb-8 break-all border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                            <p className={`text-[11px] font-mono leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{generatedLink}</p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleCopyLink}
                                                className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${copied
                                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                    : isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                    }`}
                                            >
                                                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                                {copied ? 'Copiado!' : 'Copiar'}
                                            </button>
                                            <button
                                                onClick={handleEmailLink}
                                                className="flex-1 py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-glow"
                                            >
                                                <Mail size={16} /> E-mail
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </div >
    );
};

export default BiometriaCentral;
