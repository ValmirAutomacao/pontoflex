import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBiometria } from '../../hooks/useBiometria';
import { supabase } from '../../services/supabaseClient';
import { ShieldCheck, Camera, CheckCircle2, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BiometriaRegistro = () => {
    const { id } = useParams<{ id: string }>();
    const biometria = useBiometria();
    const [funcionario, setFuncionario] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState<'intro' | 'capture' | 'success' | 'error'>('intro');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFuncionario();
    }, [id]);

    const fetchFuncionario = async () => {
        if (!id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('funcionarios')
            .select('id, nome, email, empresa_id, empresas(razao_social)')
            .eq('id', id)
            .single();

        if (error || !data) {
            setError('Link de cadastro inválido ou expirado.');
            setStep('error');
        } else {
            setFuncionario(data);
        }
        setLoading(false);
    };

    const handleStartCapture = async () => {
        setStep('capture');
        await biometria.startCamera();
    };

    const handleCapture = async () => {
        setSaving(true);
        try {
            const descriptor = await biometria.captureDescriptor();
            if (!descriptor) throw new Error('Falha ao capturar face. Tente novamente.');

            const biometriaData = {
                funcionario_id: id,
                face_descriptors: {
                    descriptor: Array.from(descriptor),
                    captured_at: new Date().toISOString(),
                    platform: 'Web'
                },
                status: 'Ativo',
                empresa_id: funcionario.empresa_id,
                updated_at: new Date().toISOString()
            };

            // Verificar se já existe registro de biometria
            const { data: existingBiometria } = await supabase
                .from('funcionarios_biometria')
                .select('id')
                .eq('funcionario_id', id)
                .maybeSingle();

            let insertError;
            if (existingBiometria) {
                // Atualizar registro existente
                const { error } = await supabase
                    .from('funcionarios_biometria')
                    .update({
                        face_descriptors: biometriaData.face_descriptors,
                        status: 'Ativo',
                        updated_at: biometriaData.updated_at
                    })
                    .eq('funcionario_id', id);
                insertError = error;
            } else {
                // Inserir novo registro
                const { error } = await supabase
                    .from('funcionarios_biometria')
                    .insert([biometriaData]);
                insertError = error;
            }

            if (insertError) throw insertError;

            biometria.stopCamera();
            setStep('success');
        } catch (err: any) {
            console.error('Erro ao salvar biometria:', err);
            setError(err.message);
            setStep('error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/30">
                        <ShieldCheck className="text-primary-500" size={32} />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">PONTO FLEX</h1>
                    <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">Registro Biométrico</p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 'intro' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
                            <h2 className="text-xl font-bold mb-4">Olá, {funcionario?.nome}!</h2>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                Para sua segurança e autenticidade nos registros de ponto, precisamos cadastrar sua biometria facial.
                                O processo é rápido e seguro.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-left p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                    <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Camera size={18} />
                                    </div>
                                    <p className="text-xs text-slate-300">Procure um local bem iluminado e sem fundos coloridos.</p>
                                </div>
                                <div className="flex items-center gap-3 text-left p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                    <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <p className="text-xs text-slate-300">Seus dados biométricos são criptografados e protegidos.</p>
                                </div>
                            </div>
                            <button onClick={handleStartCapture} className="w-full mt-8 bg-primary-500 hover:bg-primary-600 h-14 rounded-2xl font-bold text-lg shadow-glow transition-all flex items-center justify-center gap-2">
                                Iniciar Agora <ArrowRight size={20} />
                            </button>
                        </motion.div>
                    )}

                    {step === 'capture' && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                            <div className="aspect-video bg-black rounded-2xl border border-slate-700 overflow-hidden mb-6 relative">
                                <video ref={biometria.videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                <div className={`absolute inset-0 border-4 rounded-2xl transition-colors ${biometria.faceCentered ? 'border-primary-500' : 'border-white/20'}`} />
                                <div className="absolute top-4 left-0 right-0 flex justify-center">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-lg ${biometria.faceCentered ? 'bg-primary-500 text-white' : 'bg-black/60 text-white'}`}>
                                        {biometria.message}
                                    </span>
                                </div>
                                {saving && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleCapture}
                                disabled={!biometria.faceCentered || saving}
                                className="w-full bg-primary-500 hover:bg-primary-600 h-14 rounded-2xl font-bold text-lg shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {saving ? 'Processando...' : 'Capturar Foto'}
                            </button>
                            <button onClick={() => { biometria.stopCamera(); setStep('intro'); }} className="w-full mt-4 text-slate-500 font-medium text-sm">
                                Voltar
                            </button>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-2xl">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-glow shadow-emerald-500/10">
                                <CheckCircle2 className="text-emerald-500" size={40} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Sucesso!</h2>
                            <p className="text-slate-400 text-sm mb-8">
                                Sua biometria facial foi cadastrada com sucesso. Agora você já pode registrar seu ponto em qualquer plataforma da <strong>{funcionario?.empresas?.razao_social}</strong>.
                            </p>
                            <p className="text-xs text-slate-500 italic">Você já pode fechar esta aba.</p>
                        </motion.div>
                    )}

                    {step === 'error' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-2xl">
                            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                                <AlertTriangle className="text-rose-500" size={40} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Ops!</h2>
                            <p className="text-slate-400 text-sm mb-8">{error || 'Ocorreu um erro inesperado.'}</p>
                            <button onClick={() => setStep('intro')} className="w-full bg-slate-800 hover:bg-slate-700 h-12 rounded-xl font-bold transition-all">
                                Tentar Novamente
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default BiometriaRegistro;
