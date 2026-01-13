import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import DataTable from '../components/DataTable';
import {
    Users,
    Download,
    Printer,
    User,
    Building,
    Briefcase,
    Calendar,
    Mail,
    Phone,
    CheckCircle,
    XCircle,
    Eye,
    ChevronLeft,
    FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Funcionario {
    id: string;
    nome: string;
    email: string;
    cpf: string;
    telefone?: string;
    whatsapp?: string;
    data_admissao?: string;
    status: string;
    created_at: string;
    setores?: { nome: string };
    funcoes?: { nome: string };
    escalas_servico?: { nome: string };
    onboarding_completado?: boolean;
    biometria_status?: string;
}

const RelatorioFuncionarios: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [setorFilter, setSetorFilter] = useState('Todos');
    const [setores, setSetores] = useState<{ id: string; nome: string }[]>([]);
    const [selectedFunc, setSelectedFunc] = useState<Funcionario | null>(null);
    const [fichaOpen, setFichaOpen] = useState(false);

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchData();
        }
    }, [profile?.empresa_id]);

    const fetchData = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);

        const [funcRes, setorRes] = await Promise.all([
            supabase
                .from('funcionarios')
                .select(`
                    *,
                    setores(nome),
                    funcoes(nome),
                    escalas_servico(nome),
                    funcionarios_biometria!funcionarios_biometria_funcionario_id_fkey(status)
                `)
                .eq('empresa_id', profile.empresa_id)
                .order('nome'),
            supabase
                .from('setores')
                .select('id, nome')
                .eq('empresa_id', profile.empresa_id)
                .order('nome')
        ]);

        if (funcRes.data) {
            const mapped = funcRes.data.map((f: any) => ({
                ...f,
                biometria_status: Array.isArray(f.funcionarios_biometria)
                    ? f.funcionarios_biometria[0]?.status
                    : f.funcionarios_biometria?.status
            }));
            setFuncionarios(mapped);
        }
        if (setorRes.data) setSetores(setorRes.data);
        setLoading(false);
    };

    const filteredData = funcionarios.filter(f => {
        const matchSearch = f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.cpf?.includes(searchTerm);
        const matchStatus = statusFilter === 'Todos' || f.status === statusFilter;
        const matchSetor = setorFilter === 'Todos' || f.setores?.nome === setorFilter;
        return matchSearch && matchStatus && matchSetor;
    });

    const stats = {
        total: funcionarios.length,
        ativos: funcionarios.filter(f => f.status === 'Ativo').length,
        inativos: funcionarios.filter(f => f.status === 'Inativo').length,
        comBiometria: funcionarios.filter(f => f.biometria_status === 'Ativo').length
    };

    const kpis = [
        { label: 'Total', value: stats.total },
        { label: 'Ativos', value: stats.ativos, color: 'green' as const },
        { label: 'Inativos', value: stats.inativos, color: 'red' as const },
        { label: 'C/ Biometria', value: stats.comBiometria, color: 'blue' as const }
    ];

    const handleExportCSV = () => {
        const headers = ['Nome', 'E-mail', 'CPF', 'Telefone', 'Setor', 'Função', 'Escala', 'Admissão', 'Status'];
        const rows = filteredData.map(f => [
            f.nome,
            f.email,
            f.cpf,
            f.telefone || f.whatsapp || '',
            f.setores?.nome || '',
            f.funcoes?.nome || '',
            f.escalas_servico?.nome || '',
            f.data_admissao ? new Date(f.data_admissao).toLocaleDateString('pt-BR') : '',
            f.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(';') + "\n"
            + rows.map(r => r.join(';')).join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `relatorio_funcionarios_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openFicha = (func: Funcionario) => {
        setSelectedFunc(func);
        setFichaOpen(true);
    };

    const cardClass = `rounded-2xl border ${isDark
        ? 'bg-slate-800/50 border-slate-700/50'
        : 'bg-white border-slate-200 shadow-soft'}`;

    return (
        <>
            <div className="pb-12">
                <button
                    onClick={() => navigate('/relatorios')}
                    className="flex items-center gap-2 text-slate-500 hover:text-primary-500 transition-all mb-6 font-bold text-sm"
                >
                    <ChevronLeft size={16} />
                    Voltar para Central
                </button>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 mb-4">
                    <button
                        onClick={() => window.print()}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isDark
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                        <Printer size={14} /> Imprimir
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold transition-all shadow-glow"
                    >
                        <Download size={14} /> Exportar CSV
                    </button>
                </div>

                <DataTable
                    title="Relatório de Funcionários"
                    subtitle="Listagem completa de colaboradores"
                    kpis={kpis}
                    searchPlaceholder="Buscar por nome, email ou CPF..."
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    filters={[
                        {
                            label: 'Status',
                            value: statusFilter,
                            options: [
                                { label: 'Todos', value: 'Todos' },
                                { label: 'Ativo', value: 'Ativo' },
                                { label: 'Inativo', value: 'Inativo' },
                                { label: 'Férias', value: 'Férias' },
                            ],
                            onChange: setStatusFilter
                        },
                        {
                            label: 'Setor',
                            value: setorFilter,
                            options: [
                                { label: 'Todos', value: 'Todos' },
                                ...setores.map(s => ({ label: s.nome, value: s.nome }))
                            ],
                            onChange: setSetorFilter
                        }
                    ]}
                    columns={[
                        { key: 'funcionario', label: 'Colaborador' },
                        { key: 'contato', label: 'Contato' },
                        { key: 'setor', label: 'Setor / Função' },
                        { key: 'admissao', label: 'Admissão' },
                        { key: 'status', label: 'Status' },
                        { key: 'acoes', label: 'Ações', width: '100px' },
                    ]}
                    data={filteredData}
                    renderRow={(func) => (
                        <tr key={func.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                            <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                                        {func.nome?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{func.nome}</p>
                                        <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{func.cpf}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-5 py-4">
                                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <p className="flex items-center gap-1"><Mail size={10} /> {func.email}</p>
                                    {(func.telefone || func.whatsapp) && (
                                        <p className="flex items-center gap-1 mt-0.5"><Phone size={10} /> {func.telefone || func.whatsapp}</p>
                                    )}
                                </div>
                            </td>
                            <td className="px-5 py-4">
                                <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{func.setores?.nome || '-'}</p>
                                <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{func.funcoes?.nome || '-'}</p>
                            </td>
                            <td className={`px-5 py-4 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {func.data_admissao ? new Date(func.data_admissao).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="px-5 py-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${func.status === 'Ativo'
                                    ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                                    : func.status === 'Férias'
                                        ? isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
                                        : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                    }`}>
                                    {func.status === 'Ativo' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                    {func.status}
                                </span>
                            </td>
                            <td className="px-5 py-4">
                                <button
                                    onClick={() => openFicha(func)}
                                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-primary-500`}
                                    title="Ver Ficha Completa"
                                >
                                    <Eye size={16} />
                                </button>
                            </td>
                        </tr>
                    )}
                    onRefresh={fetchData}
                    loading={loading}
                />
            </div>

            {/* Modal Ficha do Colaborador */}
            <AnimatePresence>
                {fichaOpen && selectedFunc && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setFichaOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-2xl rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <div className="p-6 md:p-8">
                                {/* Header */}
                                <div className="flex items-start gap-4 mb-8">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                                        {selectedFunc.nome?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {selectedFunc.nome}
                                        </h2>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {selectedFunc.funcoes?.nome || 'Sem função'} • {selectedFunc.setores?.nome || 'Sem setor'}
                                        </p>
                                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold ${selectedFunc.status === 'Ativo'
                                            ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                                            : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                            }`}>
                                            {selectedFunc.status}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setFichaOpen(false)}
                                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                    >
                                        <XCircle size={20} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Dados Pessoais</h3>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex items-center gap-2">
                                                <User size={14} className="opacity-40" />
                                                <span className="opacity-60">CPF:</span>
                                                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedFunc.cpf}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Mail size={14} className="opacity-40" />
                                                <span className="opacity-60">E-mail:</span>
                                                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedFunc.email}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Phone size={14} className="opacity-40" />
                                                <span className="opacity-60">Telefone:</span>
                                                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedFunc.telefone || selectedFunc.whatsapp || '-'}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Dados Profissionais</h3>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex items-center gap-2">
                                                <Building size={14} className="opacity-40" />
                                                <span className="opacity-60">Setor:</span>
                                                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedFunc.setores?.nome || '-'}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Briefcase size={14} className="opacity-40" />
                                                <span className="opacity-60">Função:</span>
                                                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedFunc.funcoes?.nome || '-'}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Calendar size={14} className="opacity-40" />
                                                <span className="opacity-60">Admissão:</span>
                                                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {selectedFunc.data_admissao ? new Date(selectedFunc.data_admissao).toLocaleDateString('pt-BR') : '-'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Escala e Biometria</h3>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex items-center gap-2">
                                                <FileText size={14} className="opacity-40" />
                                                <span className="opacity-60">Escala:</span>
                                                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedFunc.escalas_servico?.nome || '-'}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <User size={14} className="opacity-40" />
                                                <span className="opacity-60">Biometria:</span>
                                                <span className={`font-medium ${selectedFunc.biometria_status === 'Ativo'
                                                    ? 'text-emerald-500'
                                                    : isDark ? 'text-slate-400' : 'text-slate-600'
                                                    }`}>
                                                    {selectedFunc.biometria_status === 'Ativo' ? 'Cadastrada' : 'Não cadastrada'}
                                                </span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <CheckCircle size={14} className="opacity-40" />
                                                <span className="opacity-60">Onboarding:</span>
                                                <span className={`font-medium ${selectedFunc.onboarding_completado
                                                    ? 'text-emerald-500'
                                                    : isDark ? 'text-slate-400' : 'text-slate-600'
                                                    }`}>
                                                    {selectedFunc.onboarding_completado ? 'Completo' : 'Pendente'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Registro</h3>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex items-center gap-2">
                                                <Calendar size={14} className="opacity-40" />
                                                <span className="opacity-60">Cadastrado em:</span>
                                                <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                    {new Date(selectedFunc.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={() => window.print()}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${isDark
                                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                    >
                                        <Printer size={16} /> Imprimir Ficha
                                    </button>
                                    <button
                                        onClick={() => setFichaOpen(false)}
                                        className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default RelatorioFuncionarios;
