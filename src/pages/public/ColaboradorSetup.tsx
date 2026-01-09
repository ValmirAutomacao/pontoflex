import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useTheme } from '../../contexts/ThemeContext';
import {
    ShieldCheck,
    Lock,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    Eye,
    EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ColaboradorSetup = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(true);
    const [employee, setEmployee] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState<'form' | 'success'>('form');

    useEffect(() => {
        validateToken();
    }, [token]);

    const validateToken = async () => {
        if (!token) {
            setError('Token de acesso não fornecido.');
            setValidating(false);
            return;
        }

        try {
            // Buscar funcionário pelo setup_token
            const { data, error: queryError } = await supabase
                .from('funcionarios')
                .select('id, nome, email, empresa_id, setup_token_expires_at, onboarding_completado')
                .eq('setup_token', token)
                .maybeSingle();

            if (queryError) throw queryError;

            if (!data) {
                setError('Este link de acesso é inválido.');
                setValidating(false);
                setLoading(false);
                return;
            }

            // Verificar se token expirou
            if (data.setup_token_expires_at) {
                const expiresAt = new Date(data.setup_token_expires_at);
                if (expiresAt < new Date()) {
                    setError('Este link de acesso expirou. Solicite um novo ao RH.');
                    setValidating(false);
                    setLoading(false);
                    return;
                }
            }

            // Verificar se já completou o onboarding
            if (data.onboarding_completado) {
                setError('Você já configurou seu acesso. Faça login normalmente.');
                setValidating(false);
                setLoading(false);
                return;
            }

            setEmployee(data);
        } catch (err: any) {
            console.error('Erro ao validar token:', err);
            setError('Erro ao validar seu acesso. Por favor, solicite um novo link ao RH.');
        } finally {
            setValidating(false);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('As senhas não conferem.');
            return;
        }

        setLoading(true);
        try {
            // 1. Criar o usuário no Auth
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: employee.email,
                password: password,
                options: {
                    data: {
                        nome: employee.nome,
                        empresa_id: employee.empresa_id,
                        role: 'funcionario'
                    }
                }
            });

            if (signUpError) {
                console.error('Erro no signUp:', signUpError);
                throw signUpError;
            }

            // 2. Atualizar o funcionário com o user_id e marcar onboarding completo
            const { error: updateError } = await supabase
                .from('funcionarios')
                .update({
                    user_id: authData.user?.id,
                    onboarding_completado: true,
                    setup_token: null, // Limpar token usado
                    setup_token_expires_at: null
                })
                .eq('id', employee.id);

            if (updateError) {
                console.error('Erro ao atualizar funcionário:', updateError);
                throw updateError;
            }

            console.log('[ColaboradorSetup] Setup completo para:', employee.nome);
            setStep('success');
        } catch (err: any) {
            console.error('Erro no handleSubmit:', err);
            setError('Erro ao finalizar seu cadastro: ' + (err.message || 'Tente novamente'));
        } finally {
            setLoading(false);
        }
    };

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error && step !== 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[32px] p-10 border border-rose-500/20 shadow-2xl text-center"
                >
                    <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-8">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-4 dark:text-white">Acesso Inválido</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold dark:text-white"
                    >
                        Tentar Novamente
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 font-sans">
            <AnimatePresence mode="wait">
                {step === 'form' ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                        <div className="p-10 md:p-12">
                            <div className="flex justify-center mb-8">
                                <div className="w-16 h-16 bg-primary-500 rounded-[22px] flex items-center justify-center text-white shadow-glow">
                                    <ShieldCheck size={32} />
                                </div>
                            </div>

                            <div className="text-center mb-10">
                                <h1 className="text-3xl font-black tracking-tight dark:text-white mb-2">Seja bem-vindo!</h1>
                                <p className="text-slate-500 dark:text-slate-400">Olá <span className="font-bold text-primary-500">{employee?.nome}</span>, vamos configurar seu acesso ao Ponto Flex.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Crie sua Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            required
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-12 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Confirme sua Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            required
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
                                            placeholder="Repita a senha"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-medium flex gap-3">
                                        <AlertTriangle size={16} className="shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-glow transition-all disabled:opacity-50"
                                >
                                    {loading ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" /> : <>Finalizar e Continuar <ArrowRight size={20} /></>}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[40px] p-12 text-center shadow-2xl border border-emerald-500/20"
                    >
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-8 border border-emerald-500/20 shadow-glow-success">
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight dark:text-white mb-4">Senha Definida!</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">Sua senha foi configurada com sucesso. Agora, vamos realizar o seu cadastro biométrico para que você possa registrar seu ponto.</p>

                        <button
                            onClick={() => navigate(`/biometria-remota/${employee.id}?token=${token}`)}
                            className="w-full h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:opacity-90 transition-all"
                        >
                            Cadastrar Biometria <ShieldCheck size={20} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ColaboradorSetup;
