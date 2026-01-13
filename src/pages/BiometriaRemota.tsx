import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBiometria } from '../hooks/useBiometria';
import { validateBiometryToken, saveBiometry } from '../services/biometriaService';
import { supabase } from '../services/supabaseClient';
import {
    ShieldCheck,
    Camera,
    CheckCircle2,
    AlertCircle,
    RefreshCcw,
    Clock,
    User,
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type PageState = 'loading' | 'invalid' | 'expired' | 'used' | 'ready' | 'capture' | 'confirm' | 'saving' | 'success';

const BiometriaRemota = () => {
    const { id: funcionarioId } = useParams();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [pageState, setPageState] = useState<PageState>('loading');
    const [funcionarioNome, setFuncionarioNome] = useState('');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);
    const [empresaId, setEmpresaId] = useState<string | null>(null);

    const biometria = useBiometria();

    useEffect(() => {
        validateToken();
    }, [funcionarioId, token]);

    const validateToken = async () => {
        if (!funcionarioId || !token) {
            setPageState('invalid');
            return;
        }

        const result = await validateBiometryToken(funcionarioId, token);

        if (!result.valid) {
            if (result.expired) {
                setPageState('expired');
            } else if (result.used) {
                setPageState('used');
            } else {
                setPageState('invalid');
            }
            return;
        }

        setFuncionarioNome(result.funcionario?.nome || 'Colaborador');

        if (result.empresa_id) {
            setEmpresaId(result.empresa_id);
        }

        setPageState('ready');
    };

    const handleStartCapture = async () => {
        setPageState('capture');
        await biometria.startCamera();
    };

    const handleCapture = async () => {
        if (!biometria.videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx && biometria.videoRef.current) {
            ctx.drawImage(biometria.videoRef.current, 0, 0, 640, 480);
            const imageData = canvas.toDataURL('image/jpeg');
            setCapturedImage(imageData);
        }

        const descriptor = await biometria.captureDescriptor();
        setCapturedDescriptor(descriptor);

        setPageState('confirm');
    };

    const handleRetry = () => {
        setCapturedImage(null);
        setPageState('capture');
    };

    const handleConfirm = async () => {
        if (!funcionarioId) return;

        setPageState('saving');

        if (!capturedDescriptor) {
            alert('Não foi possível processar a biometria. Tente novamente.');
            handleRetry();
            return;
        }

        const result = await saveBiometry(funcionarioId, capturedDescriptor, empresaId || undefined, token || undefined);

        if (!result.success) {
            alert(result.error || 'Erro ao salvar biometria');
            handleRetry();
            return;
        }

        biometria.stopCamera();
        setPageState('success');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="flex flex-col items-center mb-12 text-center">
                    <img
                        src="/LOGO_FIM_2.png"
                        alt="Logo"
                        className="max-w-[200px] h-auto mb-6"
                    />
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Cadastro Biométrico</p>
                </div>

                <AnimatePresence mode="wait">
                    {pageState === 'loading' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-10">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-slate-500 text-sm font-medium">Validando sua sessão...</p>
                        </motion.div>
                    )}

                    {pageState === 'invalid' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 rounded-[32px] p-10 border border-rose-500/20 text-center shadow-xl">
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-8 border border-rose-500/20">
                                <AlertCircle size={32} />
                            </div>
                            <h2 className="text-xl font-bold mb-3">Link Inválido</h2>
                            <p className="text-slate-400 text-sm leading-relaxed">Este link não é mais válido ou está incorreto. Por favor, solicite um novo link ao seu gestor ou RH.</p>
                        </motion.div>
                    )}

                    {pageState === 'expired' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 rounded-[32px] p-10 border border-amber-500/20 text-center shadow-xl">
                            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-8 border border-amber-500/20">
                                <Clock size={32} />
                            </div>
                            <h2 className="text-xl font-bold mb-3">Link Expirado</h2>
                            <p className="text-slate-400 text-sm leading-relaxed">Por segurança, os links de cadastro expiram em 24 horas. Solicite um novo link para continuar.</p>
                        </motion.div>
                    )}

                    {pageState === 'used' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 rounded-[32px] p-10 border border-emerald-500/20 text-center shadow-xl">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-8 border border-emerald-500/20 shadow-glow shadow-emerald-500/10">
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold mb-3">Já Cadastrado</h2>
                            <p className="text-slate-400 text-sm leading-relaxed">Sua biometria já foi registrada anteriormente. Em caso de dúvidas, entre em contato com o suporte.</p>
                        </motion.div>
                    )}

                    {pageState === 'ready' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 rounded-[32px] p-10 border border-slate-800 shadow-xl">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                                    <User size={24} />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-xl font-bold">Olá, {funcionarioNome}!</h2>
                                    <p className="text-slate-500 text-xs font-medium uppercase">Pronto para o cadastro</p>
                                </div>
                            </div>

                            <p className="text-slate-400 text-sm leading-relaxed mb-10">
                                Vamos configurar seu reconhecimento facial. É importante estar em um local iluminado e sem acessórios que cubram o rosto.
                            </p>

                            <div className="space-y-4 mb-10">
                                {[
                                    'Posicione-se de frente para a câmera',
                                    'Evite usar bonés ou óculos escuros',
                                    'Mantenha o rosto dentro do círculo'
                                ].map((tip, i) => (
                                    <div key={i} className="flex items-center gap-4 text-sm text-slate-400">
                                        <div className="w-6 h-6 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold text-[10px]">{i + 1}</div>
                                        {tip}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleStartCapture}
                                disabled={!biometria.modelsLoaded}
                                className="w-full py-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm flex items-center justify-center gap-3 shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {biometria.modelsLoaded ? (
                                    <>Começar Registro <Camera size={18} /></>
                                ) : (
                                    <>Preparando IA <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /></>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {pageState === 'capture' && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative aspect-[3/4] bg-black rounded-[40px] overflow-hidden border-2 border-primary-500/30 shadow-2xl">
                            <video ref={biometria.videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className={`w-[75%] aspect-square border-2 border-dashed rounded-full transition-all duration-500 ${biometria.faceCentered ? 'border-primary-500 scale-105' : 'border-white/20'}`} />
                                <div className="absolute top-10 px-5 py-2.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                                    <p className={`text-xs font-bold uppercase tracking-widest ${biometria.faceCentered ? 'text-primary-500' : 'text-white'}`}>{biometria.message}</p>
                                </div>
                            </div>
                            <div className="absolute bottom-10 left-0 right-0 px-10">
                                <button
                                    onClick={handleCapture}
                                    disabled={!biometria.faceCentered}
                                    className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${biometria.faceCentered ? 'bg-white text-slate-950 shadow-xl' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                                >
                                    <Camera size={20} /> {biometria.faceCentered ? 'Capturar Face' : 'Centralize seu rosto'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {pageState === 'confirm' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 rounded-[32px] p-10 border border-slate-800 flex flex-col items-center shadow-xl">
                            <div className="w-56 aspect-square rounded-full overflow-hidden border-4 border-primary-500/30 shadow-glow shadow-primary-500/10 mb-8 bg-black">
                                {capturedImage && <img src={capturedImage} className="w-full h-full object-cover" alt="Preview" />}
                            </div>
                            <h2 className="text-xl font-bold mb-2">Tudo certo?</h2>
                            <p className="text-slate-500 text-sm text-center mb-10 leading-relaxed">Confirme se a imagem está nítida e seu rosto está bem visível para evitar falhas no acesso.</p>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button onClick={handleRetry} className="py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"><RefreshCcw size={16} /> Repetir</button>
                                <button onClick={handleConfirm} className="py-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-glow flex items-center justify-center gap-2 transition-all">Confirmar <ArrowRight size={16} /></button>
                            </div>
                        </motion.div>
                    )}

                    {pageState === 'saving' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-10">
                            <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-6" />
                            <h3 className="text-lg font-bold mb-2">Salvando perfil...</h3>
                            <p className="text-slate-500 text-sm font-medium">Isso levará apenas alguns segundos.</p>
                        </motion.div>
                    )}

                    {pageState === 'success' && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 rounded-[40px] p-12 border border-emerald-500/20 text-center shadow-2xl">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-10 border border-emerald-500/20 shadow-glow shadow-emerald-500/10">
                                <CheckCircle2 size={48} />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">Sucesso!</h2>
                            <p className="text-slate-400 text-sm leading-relaxed">Sua biometria facial foi cadastrada com sucesso. Agora você já pode registrar seu ponto usando o reconhecimento facial.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default BiometriaRemota;
