import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
    Plus,
    Search,
    UserPlus,
    Mail,
    Briefcase,
    Edit2,
    Trash2,
    X,
    Save,
    Send,
    MessageCircle,
    Smartphone,
    History,
    ExternalLink,
    ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { onboardingService } from '../services/onboardingService';
import { maskCPF, maskTelefone, maskCEP, unmask } from '../utils/masks';
import FotoUpload from '../components/FotoUpload';

interface Funcionario {
    id: string;
    nome: string;
    email: string;
    cpf: string;
    status: string;
    created_at: string;
    setores?: { nome: string };
    funcoes?: { nome: string };
    onboarding_completado?: boolean;
    biometria_status?: string;
    setup_token?: string;
    whatsapp?: string;
}

const Funcionarios = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [setores, setSetores] = useState<any[]>([]);
    const [funcoes, setFuncoes] = useState<any[]>([]);
    const [jornadas, setJornadas] = useState<any[]>([]);
    const [locaisTrabalho, setLocaisTrabalho] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
    const [formData, setFormData] = useState({
        nome: '', email: '', cpf: '', ctps: '', telefone: '', whatsapp: '', pis_nis: '',
        data_admissao: '', cep: '', logradouro: '', numero: '', complemento: '',
        bairro: '', cidade: '', estado: '',
        setor_id: '', funcao_id: '', jornada_id: '', local_trabalho_id: '',
        is_externo: false, status: 'Ativo', foto_url: ''
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
    const [selectedFunc, setSelectedFunc] = useState<any>(null);
    const [sendingAction, setSendingAction] = useState<'email' | 'whatsapp' | null>(null);

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchData();
        }
    }, [profile?.empresa_id]);

    const fetchData = async () => {
        setLoading(true);
        const [funcRes, setRes, funRes, jorRes, locRes] = await Promise.all([
            supabase.from('funcionarios')
                .select('*, setores:setor_id(nome), funcoes:funcao_id(nome), funcionarios_biometria!funcionarios_biometria_funcionario_id_fkey(status)')
                .eq('empresa_id', profile!.empresa_id)
                .order('nome'),
            supabase.from('setores').select('id, nome').eq('empresa_id', profile!.empresa_id),
            supabase.from('funcoes').select('id, nome').eq('empresa_id', profile!.empresa_id),
            supabase.from('jornadas_trabalho').select('id, nome').eq('empresa_id', profile!.empresa_id),
            supabase.from('locais_trabalho').select('id, nome').eq('empresa_id', profile!.empresa_id).eq('ativo', true)
        ]);

        if (funcRes.error) {
            console.error('Erro ao buscar funcionários:', funcRes.error);
        }

        if (funcRes.data) {
            const mapped = funcRes.data.map((f: any) => {
                // Buscar o status de biometria (pode ser objeto único ou array dependendo da relação)
                const biometria = f.funcionarios_biometria;
                let biometriaStatus = 'Pendente';

                if (Array.isArray(biometria)) {
                    // É um array - buscar registro com status 'Ativo' primeiro
                    const ativoRecord = biometria.find((b: any) => b.status === 'Ativo');
                    biometriaStatus = ativoRecord?.status || biometria[0]?.status || 'Pendente';
                } else if (biometria && typeof biometria === 'object') {
                    // É um objeto único
                    biometriaStatus = biometria.status || 'Pendente';
                }

                return {
                    ...f,
                    biometria_status: biometriaStatus
                };
            });
            setFuncionarios(mapped);
        }
        if (setRes.data) setSetores(setRes.data);
        if (funRes.data) setFuncoes(funRes.data);
        if (jorRes.data) setJornadas(jorRes.data);
        if (locRes.data) setLocaisTrabalho(locRes.data);
        setLoading(false);
    };

    const handleOpenCreate = () => {
        setEditingFuncionario(null);
        setFormData({
            nome: '', email: '', cpf: '', ctps: '', telefone: '', whatsapp: '', pis_nis: '',
            data_admissao: '', cep: '', logradouro: '', numero: '', complemento: '',
            bairro: '', cidade: '', estado: '',
            setor_id: '', funcao_id: '', jornada_id: '', local_trabalho_id: '',
            is_externo: false, status: 'Ativo', foto_url: ''
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (f: Funcionario | any) => {
        setEditingFuncionario(f);
        setFormData({
            nome: f.nome,
            email: f.email,
            cpf: f.cpf,
            ctps: f.ctps || '',
            telefone: f.telefone || '',
            whatsapp: f.whatsapp || '',
            pis_nis: f.pis_nis || '',
            data_admissao: f.data_admissao,
            cep: f.cep || '',
            logradouro: f.logradouro || '',
            numero: f.numero || '',
            complemento: f.complemento || '',
            bairro: f.bairro || '',
            cidade: f.cidade || '',
            estado: f.estado || '',
            setor_id: f.setor_id,
            funcao_id: f.funcao_id,
            jornada_id: f.jornada_id,
            local_trabalho_id: f.local_trabalho_id || '',
            is_externo: f.is_externo || false,
            status: f.status || 'Ativo',
            foto_url: f.foto_url || ''
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Gerar setup_token para novo funcionário
        const setupToken = crypto.randomUUID();
        const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

        const submissionData = {
            ...formData,
            cpf: unmask(formData.cpf),
            telefone: unmask(formData.telefone),
            whatsapp: unmask(formData.whatsapp),
            cep: unmask(formData.cep),
            empresa_id: profile?.empresa_id,
            // Campos de onboarding para novo funcionário
            ...(editingFuncionario ? {} : {
                setup_token: setupToken,
                setup_token_expires_at: tokenExpiresAt.toISOString(),
                onboarding_completado: false
            })
        };

        try {
            if (editingFuncionario) {
                const { error } = await supabase
                    .from('funcionarios')
                    .update(submissionData)
                    .eq('id', editingFuncionario.id);
                if (error) throw error;
            } else {
                const { data: newFunc, error } = await supabase
                    .from('funcionarios')
                    .insert([submissionData])
                    .select('id, nome, email')
                    .single();
                if (error) throw error;

                // Abrir modal de onboarding para enviar acessos
                setSelectedFunc({
                    ...newFunc,
                    setup_token: setupToken,
                    whatsapp: formData.whatsapp
                });
                setIsOnboardingModalOpen(true);
            }

            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, nome: string) => {
        // Verificar se há registros de ponto
        const { count: pontosCount } = await supabase
            .from('registros_ponto')
            .select('id', { count: 'exact', head: true })
            .eq('funcionario_id', id);

        const temPontos = pontosCount && pontosCount > 0;

        const mensagem = temPontos
            ? `⚠️ ATENÇÃO: O colaborador "${nome}" possui ${pontosCount} registro(s) de ponto.\n\nDeseja realmente excluir? Isso removerá:\n- Todos os registros de ponto\n- Dados de biometria\n- Histórico de onboarding\n\nEsta ação NÃO pode ser desfeita!`
            : `Deseja realmente excluir o colaborador "${nome}"?\n\nIsso removerá todos os dados relacionados (biometria, logs).\n\nEsta ação não pode ser desfeita.`;

        if (!confirm(mensagem)) {
            return;
        }

        try {
            // 1. Deletar biometria relacionada
            await supabase
                .from('funcionarios_biometria')
                .delete()
                .eq('funcionario_id', id);

            // 2. Deletar logs de onboarding
            await supabase
                .from('onboarding_logs')
                .delete()
                .eq('funcionario_id', id);

            // 3. Deletar registros de ponto (se existirem)
            if (temPontos) {
                await supabase
                    .from('registros_ponto')
                    .delete()
                    .eq('funcionario_id', id);
            }

            // 4. Finalmente, deletar o funcionário
            const { error } = await supabase
                .from('funcionarios')
                .delete()
                .eq('id', id);

            if (error) throw error;

            fetchData();
            alert(`Colaborador "${nome}" excluído com sucesso!`);
        } catch (error: any) {
            alert('Erro ao excluir colaborador: ' + error.message);
        }
    };

    const handleOpenOnboarding = (f: any) => {
        setSelectedFunc(f);
        setIsOnboardingModalOpen(true);
    };

    const handleSendEmail = async () => {
        if (!selectedFunc) return;
        const empresaNome = profile?.empresa?.razao_social || 'Sua Empresa';
        console.log('[handleSendEmail] Enviando para:', selectedFunc.email, 'Empresa:', empresaNome);
        setSendingAction('email');
        const res = await onboardingService.sendEmailOnboarding({
            funcionarioId: selectedFunc.id,
            nome: selectedFunc.nome,
            email: selectedFunc.email,
            empresaNome: empresaNome,
            empresaId: profile?.empresa_id || ''
        });
        setSendingAction(null);
        if (res.success) alert('Link de acesso enviado com sucesso para o e-mail!');
        else alert('Erro ao enviar e-mail: ' + res.error);
    };

    const handleSendWhatsApp = async () => {
        if (!selectedFunc) return;
        const empresaNome = profile?.empresa?.razao_social || 'Sua Empresa';
        console.log('[handleSendWhatsApp] Gerando link para:', selectedFunc.nome, 'WhatsApp:', selectedFunc.whatsapp);
        const link = await onboardingService.getWhatsAppLink({
            funcionarioId: selectedFunc.id,
            nome: selectedFunc.nome,
            email: selectedFunc.email,
            whatsapp: selectedFunc.whatsapp,
            empresaNome: empresaNome,
            empresaId: profile?.empresa_id || ''
        });
        console.log('[handleSendWhatsApp] Link gerado:', link);
        window.open(link, '_blank');
        await onboardingService.logAction(selectedFunc.id, profile?.empresa_id || '', 'whatsapp', 'sucesso');
    };

    const filteredFuncionarios = funcionarios.filter(f =>
        f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const cardClass = `rounded-xl border transition-all ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        }`;

    const inputClass = `w-full border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark
        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
        }`;

    return (
        <div className="pb-12">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Colaboradores
                    </h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Gerencie o quadro de funcionários
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`${inputClass} pl-10 w-56`}
                        />
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="bg-primary-500 hover:bg-primary-600 px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition-all shadow-glow flex items-center gap-2"
                    >
                        <UserPlus size={16} /> Novo Colaborador
                    </button>
                </div>
            </header>

            {/* Tabela */}
            <div className={cardClass}>
                <table className="w-full text-left">
                    <thead>
                        <tr className={`border-b ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}`}>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Colaborador</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Função / Setor</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Onboarding</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Biometria</th>
                            <th className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-right ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ações</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center">
                                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : filteredFuncionarios.length === 0 ? (
                            <tr>
                                <td colSpan={4} className={`px-6 py-10 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Nenhum colaborador encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredFuncionarios.map((func) => (
                                <tr key={func.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={(func as any).foto_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${func.nome}`}
                                                alt=""
                                                className={`w-9 h-9 rounded-lg object-cover ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                                            />
                                            <div>
                                                <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{func.nome}</p>
                                                <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    <Mail size={10} /> {func.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Briefcase size={14} className="text-primary-500" />
                                            <div>
                                                <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{func.funcoes?.nome || 'Não definido'}</p>
                                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{func.setores?.nome || 'Sem setor'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleOpenOnboarding(func)}
                                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${func.onboarding_completado
                                                ? isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                : isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${func.onboarding_completado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            {func.onboarding_completado ? 'Concluído' : 'Pendente'}
                                            <Send size={10} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${func.biometria_status === 'Ativo'
                                            ? isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                            : isDark ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' : 'bg-slate-50 text-slate-400 border border-slate-100'
                                            }`}>
                                            {func.biometria_status === 'Ativo' ? <ShieldCheck size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                                            {func.biometria_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleOpenEdit(func)}
                                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-primary-500`}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(func.id, func.nome)}
                                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-red-500`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Onboarding Management Modal */}
            <AnimatePresence>
                {isOnboardingModalOpen && selectedFunc && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOnboardingModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className={`relative w-full max-w-lg rounded-[32px] border shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500">
                                            <Smartphone size={24} />
                                        </div>
                                        <div>
                                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Gestão de Acessos</h2>
                                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedFunc.nome}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsOnboardingModalOpen(false)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}>
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Status Card */}
                                    <div className={`p-6 rounded-2xl border ${selectedFunc.onboarding_completado ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Status do Onboarding</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedFunc.onboarding_completado ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                {selectedFunc.onboarding_completado ? 'Concluído' : 'Pendente'}
                                            </span>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {selectedFunc.onboarding_completado
                                                ? 'O colaborador já realizou o primeiro acesso e configurou sua senha.'
                                                : 'O colaborador ainda não configurou sua senha de acesso ao sistema.'}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Enviar links de acesso</p>

                                        <button
                                            onClick={handleSendWhatsApp}
                                            className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center justify-center gap-3 shadow-glow-success transition-all"
                                        >
                                            <MessageCircle size={20} /> Enviar via WhatsApp
                                        </button>

                                        <button
                                            onClick={handleSendEmail}
                                            disabled={sendingAction === 'email'}
                                            className="w-full h-14 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold flex items-center justify-center gap-3 shadow-glow transition-all disabled:opacity-50"
                                        >
                                            {sendingAction === 'email' ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Mail size={20} /> Enviar via E-mail</>}
                                        </button>
                                    </div>

                                    <div className="pt-4 border-t border-slate-800/50">
                                        <div className="flex items-center gap-2 text-slate-500 mb-2">
                                            <History size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Últimas Atividades</span>
                                        </div>
                                        <div className={`p-4 rounded-xl text-xs flex justify-between items-center ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                            <span className="text-slate-500">Nenhuma tentativa de envio recente</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            const setupLink = `${window.location.origin}/setup-colaborador?token=${selectedFunc.setup_token}`;
                                            console.log('[Modal] Abrindo link de setup:', setupLink);
                                            window.open(setupLink, '_blank');
                                        }}
                                        className={`w-full py-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all ${isDark ? 'border-slate-700 text-slate-500 hover:text-white hover:border-slate-500' : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'}`}
                                    >
                                        <ExternalLink size={14} /> Visualizar Link de Setup
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Existing Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-2xl rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{editingFuncionario ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{editingFuncionario ? 'Atualize os dados do funcionário' : 'Preencha os dados do funcionário'}</p>
                                    </div>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="col-span-2">
                                        <p className={`text-sm font-bold mt-4 mb-2 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>Informações Pessoais</p>
                                    </div>
                                    <div className="col-span-2">
                                        <FotoUpload
                                            currentUrl={formData.foto_url || undefined}
                                            onUpload={(url) => setFormData({ ...formData, foto_url: url || '' })}
                                            empresaId={profile?.empresa_id}
                                            funcionarioId={editingFuncionario?.id}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nome Completo</label>
                                        <input required className={inputClass} value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>E-mail</label>
                                        <input required type="email" className={inputClass} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>CPF</label>
                                        <input required className={inputClass} value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Telefone</label>
                                        <input className={inputClass} value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: maskTelefone(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>WhatsApp</label>
                                        <input className={inputClass} value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: maskTelefone(e.target.value) })} />
                                    </div>
                                    <div className="col-span-2">
                                        <p className={`text-sm font-bold mt-4 mb-2 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>Trabalho e Identidade</p>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>CTPS</label>
                                        <input className={inputClass} value={formData.ctps} onChange={e => setFormData({ ...formData, ctps: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>PIS/NIS</label>
                                        <input className={inputClass} value={formData.pis_nis} onChange={e => setFormData({ ...formData, pis_nis: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Setor</label>
                                        <select required className={inputClass} value={formData.setor_id} onChange={e => setFormData({ ...formData, setor_id: e.target.value })}>
                                            <option value="">Selecionar...</option>
                                            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Função</label>
                                        <select required className={inputClass} value={formData.funcao_id} onChange={e => setFormData({ ...formData, funcao_id: e.target.value })}>
                                            <option value="">Selecionar...</option>
                                            {funcoes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Jornada</label>
                                        <select required className={inputClass} value={formData.jornada_id} onChange={e => setFormData({ ...formData, jornada_id: e.target.value })}>
                                            <option value="">Selecionar...</option>
                                            {jornadas.map(j => <option key={j.id} value={j.id}>{j.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Data Admissão</label>
                                        <input required type="date" className={inputClass} value={formData.data_admissao} onChange={e => setFormData({ ...formData, data_admissao: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Local de Trabalho Principal</label>
                                        <select required={!formData.is_externo} className={inputClass} value={formData.local_trabalho_id} onChange={e => setFormData({ ...formData, local_trabalho_id: e.target.value })}>
                                            <option value="">Selecionar...</option>
                                            {locaisTrabalho.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            id="is_externo"
                                            checked={formData.is_externo}
                                            onChange={e => setFormData({ ...formData, is_externo: e.target.checked })}
                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <label htmlFor="is_externo" className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            COLABORADOR EXTERNO (Ignorar limite de distância)
                                        </label>
                                    </div>
                                    <div className="col-span-2">
                                        <p className={`text-sm font-bold mt-4 mb-2 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>Endereço Residencial</p>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>CEP</label>
                                        <input className={inputClass} value={formData.cep} onChange={e => setFormData({ ...formData, cep: maskCEP(e.target.value) })} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Logradouro</label>
                                        <input className={inputClass} value={formData.logradouro} onChange={e => setFormData({ ...formData, logradouro: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Número</label>
                                        <input className={inputClass} value={formData.numero} onChange={e => setFormData({ ...formData, numero: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Bairro</label>
                                        <input className={inputClass} value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cidade</label>
                                        <input className={inputClass} value={formData.cidade} onChange={e => setFormData({ ...formData, cidade: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Estado</label>
                                        <input className={inputClass} value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> {editingFuncionario ? 'Salvar' : 'Cadastrar'}</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </div >
    );
};

export default Funcionarios;
