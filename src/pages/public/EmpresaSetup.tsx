import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useTheme } from '../../contexts/ThemeContext';
import {
    Building2,
    Search,
    MapPin,
    Mail,
    User,
    Lock,
    CheckCircle2,
    LayoutDashboard,
    ArrowRight,
    Loader2,
    XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { maskCNPJ, maskCEP, unmask } from '../../utils/masks';

const EmpresaSetup: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(true);
    const [valid, setValid] = useState(false);
    const [empresa, setEmpresa] = useState<any>(null);
    const [step, setStep] = useState(1); // 1: Empresa Data, 2: Admin User

    // Form States
    const [empresaForm, setEmpresaForm] = useState({
        cnpj: '',
        nome: '',
        segmento: '',
        cep: '',
        endereco: ''
    });

    const [adminForm, setAdminForm] = useState({
        nome: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [searchingCnpj, setSearchingCnpj] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasVerified = useRef(false);

    useEffect(() => {
        if (hasVerified.current) return;
        hasVerified.current = true;
        verifyToken();
    }, [id, token]);

    const verifyToken = async () => {
        if (!id || !token) {
            setValid(false);
            setVerifying(false);
            return;
        }

        console.log('EmpresaSetup: Iniciando verificação...', { id, token });

        // Timer de segurança (10s)
        const safetyTimeout = setTimeout(() => {
            setVerifying(current => {
                if (current) {
                    console.warn('EmpresaSetup: Verificação expirou (Timeout de 10s)');
                    setValid(false);
                    return false;
                }
                return current;
            });
        }, 10000);

        try {
            console.log('EmpresaSetup: Tentando FETCH DIRETO para ignorar SDK...');
            const baseUrl = import.meta.env.VITE_SUPABASE_URL;
            const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            // Garantir que a URL não tenha barras duplas acidentais
            const cleanBaseUrl = baseUrl?.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const directUrl = `${cleanBaseUrl}/rest/v1/empresas?id=eq.${id}&setup_token=eq.${token}&select=id,nome,email_comprador,nome_comprador,dados_onboarding_completos,cnpj`;

            const rawRes = await fetch(directUrl, {
                headers: {
                    'apikey': apiKey,
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!rawRes.ok) {
                console.error('EmpresaSetup: Resposta HTTP erro:', rawRes.status);
                throw new Error(`HTTP Error: ${rawRes.status}`);
            }

            const rawData = await rawRes.json();
            console.log('EmpresaSetup: Resposta do FETCH DIRETO:', rawData);

            if (rawData && rawData.length > 0) {
                const data = rawData[0];
                if (data.dados_onboarding_completos) {
                    console.log('EmpresaSetup: Já completo. Redirecionando...');
                    navigate('/login');
                } else {
                    console.log('EmpresaSetup: Token válido para:', data.nome);
                    setValid(true);
                    setEmpresa(data);
                    setEmpresaForm(prev => ({
                        ...prev,
                        nome: data.nome,
                        cnpj: data.cnpj || ''
                    }));
                    setAdminForm(prev => ({
                        ...prev,
                        email: data.email_comprador || '',
                        nome: data.nome_comprador || ''
                    }));
                }
            } else {
                console.warn('EmpresaSetup: Empresa não encontrada no DB');
                setValid(false);
            }
        } catch (err: any) {
            console.error('EmpresaSetup: Erro crítico no FETCH DIRETO:', err);
            setValid(false);
        } finally {
            clearTimeout(safetyTimeout);
            console.log('EmpresaSetup: Finalizado (verifying=false)');
            setVerifying(false);
        }
    };

    const handleSearchCnpj = async () => {
        if (empresaForm.cnpj.length < 14) return;

        setSearchingCnpj(true);
        setError(null);
        try {
            const cleanCnpj = empresaForm.cnpj.replace(/\D/g, '');
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);

            if (!response.ok) throw new Error('CNPJ não encontrado');

            const data = await response.json();
            setEmpresaForm(prev => ({
                ...prev,
                nome: data.razao_social || data.nome_fantasia || prev.nome,
                cep: data.cep || '',
                endereco: `${data.logradouro}, ${data.numero}${data.complemento ? ' - ' + data.complemento : ''} - ${data.bairro}, ${data.municipio}/${data.uf}`,
                segmento: data.cnae_fiscal_descricao || ''
            }));
        } catch (err: any) {
            setError('Não foi possível encontrar os dados deste CNPJ automaticamente.');
        } finally {
            setSearchingCnpj(false);
        }
    };

    const handleSaveEmpresa = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    const handleFinishSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (adminForm.password !== adminForm.confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            console.log('EmpresaSetup: Iniciando FINALIZAÇÃO...');

            const cleanEmail = adminForm.email.trim().toLowerCase();

            // 0. Verificar se o e-mail já existe na tabela de funcionários
            console.log('EmpresaSetup: Verificando disponibilidade do e-mail...');
            const { data: existingFunc, error: checkError } = await supabase
                .from('funcionarios')
                .select('id')
                .eq('email', cleanEmail)
                .maybeSingle();

            if (checkError) {
                console.error('EmpresaSetup: Erro ao verificar e-mail:', checkError);
                throw new Error('Erro ao validar e-mail. Tente novamente.');
            }

            if (existingFunc) {
                throw new Error('Este e-mail já está cadastrado no sistema. Por favor, use outro e-mail.');
            }

            // 1. Atualizar dados da empresa PRIMEIRO (ainda deslogado, usando setup_token)
            console.log('EmpresaSetup: [STEP 1/3] Atualizando dados da Empresa via FETCH...');

            const baseUrl = import.meta.env.VITE_SUPABASE_URL;
            const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const cleanBaseUrl = baseUrl?.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const updateUrl = `${cleanBaseUrl}/rest/v1/empresas?id=eq.${id}&setup_token=eq.${token}`;

            const updateRes = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'apikey': apiKey,
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    cnpj: unmask(empresaForm.cnpj),
                    nome: empresaForm.nome,
                    razao_social: empresaForm.nome,
                    segmento_atuacao: empresaForm.segmento,
                    endereco_completo: empresaForm.endereco,
                    cep: unmask(empresaForm.cep),
                    status: 'ativo',
                    dados_onboarding_completos: true
                })
            });

            if (!updateRes.ok) {
                const errorData = await updateRes.json().catch(() => ({}));
                console.error('EmpresaSetup: Erro no Update (Fetch):', updateRes.status, errorData);
                throw new Error(`Erro ao atualizar dados da empresa. Tente novamente.`);
            }

            console.log('EmpresaSetup: Dados da empresa atualizados com sucesso!');

            // 2. Criar usuário no Supabase Auth
            console.log('EmpresaSetup: [STEP 2/3] Criando usuário Auth...');
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: adminForm.password,
                options: {
                    data: {
                        nome: adminForm.nome,
                        empresa_id: id,
                        role: 'admin',
                        permissoes: [
                            'modulo_dashboard',
                            'modulo_setores',
                            'modulo_funcoes',
                            'modulo_jornadas',
                            'modulo_colaboradores',
                            'modulo_biometria',
                            'modulo_registro_ponto',
                            'modulo_controle_ponto',
                            'modulo_locais',
                            'modulo_justificativas',
                            'modulo_tipos_afastamento',
                            'modulo_afastamentos'
                        ]
                    }
                }
            });

            if (authError) {
                console.error('EmpresaSetup: Erro no Auth.signUp:', authError);
                if (authError.message.includes('already registered')) {
                    throw new Error('Este usuário já possui cadastro no sistema (Auth).');
                }
                throw authError;
            }
            console.log('EmpresaSetup: Usuário Auth criado!', authData.user?.id);

            // 2.1 Criar Setor Administrativo (Primeiro registro)
            console.log('EmpresaSetup: [STEP 2.1/3] Criando Setor Padrao...');
            const { data: sectorData, error: sectorError } = await supabase
                .from('setores')
                .insert([{
                    nome: 'Administrativo',
                    descricao: 'Setor administrativo principal',
                    empresa_id: id
                }])
                .select()
                .single();

            if (sectorError) {
                console.warn('EmpresaSetup: Erro ao criar setor (não crítico):', sectorError);
            }

            // 2.2 Criar Função Administrador (Primeiro registro)
            console.log('EmpresaSetup: [STEP 2.2/3] Criando Função Padrao...');
            const { data: roleData, error: roleError } = await supabase
                .from('funcoes')
                .insert([{
                    nome: 'Administrador',
                    descricao: 'Gestor master do sistema',
                    nivel: 1, // Admin
                    empresa_id: id,
                    setor_id: sectorData?.id,
                    permissoes: [
                        'modulo_dashboard',
                        'modulo_setores',
                        'modulo_funcoes',
                        'modulo_jornadas',
                        'modulo_colaboradores',
                        'modulo_biometria',
                        'modulo_registro_ponto',
                        'modulo_controle_ponto',
                        'modulo_locais',
                        'modulo_justificativas',
                        'modulo_tipos_afastamento',
                        'modulo_afastamentos'
                    ]
                }])
                .select()
                .single();

            if (roleError) {
                console.warn('EmpresaSetup: Erro ao criar função (não crítico):', roleError);
            }

            // 3. Criar funcionário inicial (Administrador)
            console.log('EmpresaSetup: [STEP 3/3] Criando vínculo de Funcionário...');
            const { error: funcError } = await supabase
                .from('funcionarios')
                .insert([{
                    nome: adminForm.nome,
                    email: cleanEmail,
                    user_id: authData.user?.id,
                    empresa_id: id,
                    setor_id: sectorData?.id,
                    funcao_id: roleData?.id,
                    status: 'Ativo',
                    role: 'admin',
                    cpf: `000.000.000-${Date.now().toString().slice(-2)}`, // CPF único baseado em timestamp
                    telefone: '00 00000-0000',
                    ctps: '0000000',
                    data_admissao: new Date().toISOString().split('T')[0]
                }]);

            if (funcError) {
                console.error('EmpresaSetup: Erro no Insert Funcionário:', funcError);
                throw new Error('Erro ao criar seu perfil de administrador no sistema: ' + (funcError.message || ''));
            }
            console.log('EmpresaSetup: Funcionário administrador criado!');

            setStep(3); // Success Step
        } catch (err: any) {
            console.error('EmpresaSetup: Catch handleFinishSetup:', err);
            setError(err.message || 'Erro ao finalizar cadastro.');
        } finally {
            setSaving(false);
        }
    };

    if (verifying) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
                <Loader2 className="animate-spin text-primary-500" size={48} />
            </div>
        );
    }

    if (!valid) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <div className={`max-w-md w-full p-10 rounded-3xl border shadow-2xl text-center ${isDark ? 'bg-slate-800 border-rose-500/20' : 'bg-white border-rose-100'}`}>
                    <XCircle className="h-16 w-16 text-rose-500 mx-auto mb-6" />
                    <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Link Inválido</h2>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Este link de configuração expirou ou é inválido. Por favor, solicite um novo convite.
                    </p>
                </div>
            </div>
        );
    }

    const inputClass = `bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`;

    return (
        <div className={`min-h-screen flex flex-col ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex-1 flex items-center justify-center p-6 py-12">
                <div className="max-w-xl w-full">
                    {/* Progress Bar */}
                    <div className="flex items-center justify-center gap-2 mb-12">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === s ? 'bg-primary-500 text-white shadow-glow' :
                                    step > s ? 'bg-emerald-500 text-white' :
                                        (isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400')
                                    }`}>
                                    {step > s ? <CheckCircle2 size={18} /> : s}
                                </div>
                                {s < 3 && <div className={`w-12 h-0.5 mx-2 ${step > s ? 'bg-emerald-500' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`} />}
                            </div>
                        ))}
                    </div>

                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-8 lg:p-12 rounded-[2rem] border shadow-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                    >
                        {step === 1 && (
                            <form onSubmit={handleSaveEmpresa}>
                                <div className="mb-8">
                                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Bem-vindo ao PontoFlex!</h2>
                                    <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Vamos começar configurando os dados da sua empresa.</p>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>CNPJ</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    required
                                                    type="text"
                                                    value={empresaForm.cnpj}
                                                    onChange={e => setEmpresaForm({ ...empresaForm, cnpj: maskCNPJ(e.target.value) })}
                                                    className={`${inputClass} w-full pl-11`}
                                                    placeholder="00.000.000/0000-00"
                                                />
                                                <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleSearchCnpj}
                                                disabled={searchingCnpj || empresaForm.cnpj.length < 14}
                                                className={`px-4 rounded-xl border transition-all flex items-center justify-center ${isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                                    } disabled:opacity-50`}
                                            >
                                                {searchingCnpj ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Razão Social</label>
                                        <input
                                            required
                                            type="text"
                                            value={empresaForm.nome}
                                            onChange={e => setEmpresaForm({ ...empresaForm, nome: e.target.value })}
                                            className={`${inputClass} w-full`}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        <div>
                                            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Segmento</label>
                                            <input
                                                type="text"
                                                value={empresaForm.segmento}
                                                onChange={e => setEmpresaForm({ ...empresaForm, segmento: e.target.value })}
                                                className={`${inputClass} w-full`}
                                                placeholder="Ex: Tecnologia, Varejo..."
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>CEP</label>
                                            <input
                                                type="text"
                                                value={empresaForm.cep}
                                                onChange={e => setEmpresaForm({ ...empresaForm, cep: maskCEP(e.target.value) })}
                                                className={`${inputClass} w-full`}
                                                placeholder="00000-000"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Endereço Completo</label>
                                        <textarea
                                            value={empresaForm.endereco}
                                            onChange={e => setEmpresaForm({ ...empresaForm, endereco: e.target.value })}
                                            className={`${inputClass} w-full h-24 resize-none`}
                                            placeholder="Rua, Número, Bairro, Cidade/UF"
                                        />
                                    </div>
                                </div>

                                {error && <p className="mt-4 text-xs font-medium text-rose-500">{error}</p>}

                                <button
                                    type="submit"
                                    className="w-full bg-primary-500 hover:bg-primary-600 mt-8 py-4 rounded-xl text-white font-bold transition-all shadow-glow flex items-center justify-center gap-3"
                                >
                                    Próximo Passo <ArrowRight size={20} />
                                </button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleFinishSetup}>
                                <div className="mb-8">
                                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Conta Administrativa</h2>
                                    <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Estes serão seus dados de acesso como gestor principal.</p>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Seu Nome</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="text"
                                                value={adminForm.nome}
                                                onChange={e => setAdminForm({ ...adminForm, nome: e.target.value })}
                                                className={`${inputClass} w-full pl-11`}
                                            />
                                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>E-mail de Acesso</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="email"
                                                value={adminForm.email}
                                                onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                                                className={`${inputClass} w-full pl-11`}
                                            />
                                            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        <div>
                                            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Senha</label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type="password"
                                                    value={adminForm.password}
                                                    onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                                                    className={`${inputClass} w-full pl-11`}
                                                />
                                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Confirmar</label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type="password"
                                                    value={adminForm.confirmPassword}
                                                    onChange={e => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                                                    className={`${inputClass} w-full pl-11`}
                                                />
                                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {error && <p className="mt-4 text-xs font-medium text-rose-500">{error}</p>}

                                <div className="flex gap-4 mt-12">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className={`flex-1 py-4 rounded-xl font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-300 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-[2] bg-emerald-500 hover:bg-emerald-600 py-4 rounded-xl text-white font-bold transition-all shadow-glow-success flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={20} /> : <>Concluir Cadastro <CheckCircle2 size={20} /></>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 3 && (
                            <div className="text-center py-8">
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-8">
                                    <Mail size={48} strokeWidth={2.5} />
                                </div>
                                <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Quase lá!</h2>
                                <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-50'}`}>
                                    O cadastro da sua empresa foi iniciado com sucesso. <br />
                                    <strong className="text-emerald-500">Enviamos um e-mail de confirmação para:</strong><br />
                                    <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded mt-1 inline-block">{adminForm.email}</span>
                                </p>

                                <div className={`p-4 rounded-xl mb-10 text-xs text-left ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                    <p className="font-bold mb-2 uppercase tracking-wider text-[10px]">Próximos passos:</p>
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                                            <span>Acesse seu e-mail e clique no link de confirmação do Supabase.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                                            <span>Se não encontrar, verifique sua pasta de <strong>Spam</strong> ou Promoções.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                                            <span>Após confirmar, você poderá fazer login normalmente.</span>
                                        </li>
                                    </ul>
                                </div>

                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full bg-primary-500 hover:bg-primary-600 py-4 rounded-xl text-white font-bold transition-all shadow-glow flex items-center justify-center gap-3"
                                >
                                    Ir para a Tela de Login <LayoutDashboard size={20} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default EmpresaSetup;
