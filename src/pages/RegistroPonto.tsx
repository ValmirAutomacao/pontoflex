import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useGeolocalizacao } from '../hooks/useGeolocalizacao';
import { useBiometria } from '../hooks/useBiometria';
import { registrarPonto, buscarRegistrosDia, buscarRegistrosPeriodo } from '../services/authPonto';
import { gerarComprovantePDF, salvarComprovante } from '../services/comprovantePonto';
import { offlineSyncService } from '../services/offlineSyncService';
import { supabase } from '../services/supabaseClient';
import { TIPO_REGISTRO_LABELS, MESES_EXTENSO, DIAS_SEMANA } from '../types';
import type { TipoRegistroPonto, RegistroPonto as RegistroPontoType } from '../types';
import {
    Clock,
    MapPin,
    CheckCircle2,
    AlertTriangle,
    FileText,
    Calendar,
    Lock,
    ArrowRight,
    Key,
    RefreshCw,
    WifiOff,
    ShieldCheck,
    ShieldCheck as ShieldCheckIcon,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Step = 'select' | 'biometria' | 'senha' | 'success' | 'error';

const RegistroPonto = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const { localizacao, localNome } = useGeolocalizacao(profile?.empresa_id);
    const biometria = useBiometria();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [step, setStep] = useState<Step>('select');
    const [selectedType, setSelectedType] = useState<TipoRegistroPonto | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [registrosDia, setRegistrosDia] = useState<RegistroPontoType[]>([]);
    const [lastPdfDoc, setLastPdfDoc] = useState<any>(null);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [biometryFailCount, setBiometryFailCount] = useState(0);

    useEffect(() => {
        const checkSync = async () => {
            const queue = await offlineSyncService.getQueue();
            setPendingSyncCount(queue.length);
        };
        checkSync();
        const interval = setInterval(checkSync, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (profile?.funcionario_id) {
            buscarRegistrosDia(profile.funcionario_id).then(({ registros }) => {
                setRegistrosDia(registros);
            });
        }
    }, [profile?.funcionario_id]);

    const getRegistroTipo = (tipo: TipoRegistroPonto): RegistroPontoType | undefined => {
        return registrosDia.find(r => r.tipo_registro === tipo);
    };

    const handleStartPonto = async (tipo: TipoRegistroPonto) => {
        if (getRegistroTipo(tipo)) {
            setError('Você já registrou este tipo de ponto hoje.');
            setStep('error');
            return;
        }

        setSelectedType(tipo);
        setError(null);

        if (profile?.biometria_ativa) {
            setStep('biometria');
            await biometria.startCamera();
        } else {
            setStep('senha');
        }
    };

    const handleBiometriaConfirm = async () => {
        if (!profile?.funcionario_id || !selectedType || !profile?.empresa_id) return;

        setLoading(true);
        try {
            const { verified, confidence } = await biometria.verifyFace(profile.funcionario_id);

            if (!verified) {
                const newCount = biometryFailCount + 1;
                setBiometryFailCount(newCount);

                if (newCount >= 4) {
                    biometria.stopCamera();
                    setStep('senha');
                    setError('Biometria falhou 4 vezes. Liberação por SENHA ativada para este registro.');
                } else {
                    setError(`Biometria não reconhecida (${newCount}/4). Tente novamente.`);
                }
                setLoading(false);
                return;
            }

            const result = await registrarPonto({
                funcionarioId: profile.funcionario_id,
                tipoRegistro: selectedType,
                localizacao: localizacao ? { lat: localizacao.lat, lng: localizacao.lng } : undefined,
                metodoAutenticacao: 'facial',
                confiancaFacial: confidence,
                observacoes: localNome || undefined,
                empresaId: profile.empresa_id
            });

            if (!result.success) throw new Error(result.error);

            const pdf = gerarComprovantePDF({
                funcionario: {
                    nome: profile.nome,
                    cpf: profile.cpf || '',
                    funcao: profile.funcao,
                    setor: profile.setor
                },
                empresa: {
                    nome: profile.empresa?.razao_social || 'Empresa',
                    cnpj: profile.empresa?.cnpj || ''
                },
                tipoRegistro: TIPO_REGISTRO_LABELS[selectedType],
                dataHora: new Date(),
                localizacao: localizacao || undefined,
                metodoAutenticacao: 'RF'
            });

            await salvarComprovante({
                funcionarioId: profile.funcionario_id,
                registroPontoId: result.registro.id,
                pdfBase64: pdf.output('datauristring'),
                empresaId: profile.empresa_id
            });

            // Enviar comprovante por e-mail
            try {
                await supabase.functions.invoke('send-notification', {
                    body: {
                        type: 'PONTO_RECEIPT',
                        data: {
                            email: profile.email,
                            nome: profile.nome,
                            tipo: TIPO_REGISTRO_LABELS[selectedType],
                            dataHora: new Date().toLocaleString('pt-BR'),
                            pdfBase64: pdf.output('datauristring')
                        }
                    }
                });
            } catch (notifyErr) {
                console.error('Falha ao enviar comprovante:', notifyErr);
            }

            setLastPdfDoc(pdf);
            const { registros } = await buscarRegistrosDia(profile.funcionario_id);
            setRegistrosDia(registros);

            biometria.stopCamera();
            setStep('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao registrar ponto');
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    const handleSenhaConfirm = async () => {
        if (!profile?.funcionario_id || !selectedType || !profile?.empresa_id) return;

        setLoading(true);
        try {
            const result = await registrarPonto({
                funcionarioId: profile.funcionario_id,
                tipoRegistro: selectedType,
                localizacao: localizacao ? { lat: localizacao.lat, lng: localizacao.lng } : undefined,
                metodoAutenticacao: 'senha',
                observacoes: localNome || undefined,
                empresaId: profile.empresa_id
            });

            if (!result.success) throw new Error(result.error);

            const pdf = gerarComprovantePDF({
                funcionario: {
                    nome: profile.nome,
                    cpf: profile.cpf || '',
                    funcao: profile.funcao,
                    setor: profile.setor
                },
                empresa: {
                    nome: profile.empresa?.razao_social || 'Empresa',
                    cnpj: profile.empresa?.cnpj || ''
                },
                tipoRegistro: TIPO_REGISTRO_LABELS[selectedType],
                dataHora: new Date(),
                localizacao: localizacao || undefined,
                metodoAutenticacao: 'SD'
            });

            await salvarComprovante({
                funcionarioId: profile.funcionario_id,
                registroPontoId: result.registro.id,
                pdfBase64: pdf.output('datauristring'),
                empresaId: profile.empresa_id
            });

            // Enviar comprovante por e-mail
            try {
                await supabase.functions.invoke('send-notification', {
                    body: {
                        type: 'PONTO_RECEIPT',
                        data: {
                            email: profile.email,
                            nome: profile.nome,
                            tipo: TIPO_REGISTRO_LABELS[selectedType],
                            dataHora: new Date().toLocaleString('pt-BR'),
                            pdfBase64: pdf.output('datauristring')
                        }
                    }
                });
            } catch (notifyErr) {
                console.error('Falha ao enviar comprovante:', notifyErr);
            }

            setLastPdfDoc(pdf);
            const { registros } = await buscarRegistrosDia(profile.funcionario_id);
            setRegistrosDia(registros);
            setStep('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao registrar ponto');
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (lastPdfDoc) {
            lastPdfDoc.save(`Comprovante_Ponto_${Date.now()}.pdf`);
        }
    };

    const handleDownloadRelatorio = async () => {
        if (!profile?.funcionario_id) return;
        setLoading(true);
        try {
            const now = new Date();
            const mesAtual = now.getMonth() + 1;
            const anoAtual = now.getFullYear();
            const inicioMes = `${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01`;
            const fimMes = new Date(anoAtual, mesAtual, 0).toISOString().split('T')[0];

            const { registros } = await buscarRegistrosPeriodo({
                funcionarioId: profile.funcionario_id,
                empresaId: profile.empresa_id || '',
                dataInicio: inicioMes,
                dataFim: fimMes
            });
            const { agruparRegistros } = await import('./ControlePonto');
            const registrosAgrupados = (agruparRegistros as any)(registros);

            const { gerarRelatorioPontoPDF } = await import('../services/comprovantePonto');

            let totalMinutos = 0;
            let totalSaldoMinutos = 0;

            const registrosMapeados = registrosAgrupados.map((r: any) => {
                totalMinutos += r.total_horas || 0;
                totalSaldoMinutos += r.saldo_minutos || 0;

                return {
                    data: r.data,
                    e1: r.entrada?.hora_registro.slice(0, 5) || '--:--',
                    s1: r.saida_almoco?.hora_registro.slice(0, 5) || '--:--',
                    e2: r.retorno_almoco?.hora_registro.slice(0, 5) || '--:--',
                    s2: r.saida?.hora_registro.slice(0, 5) || '--:--',
                    total: r.total_horas ? Math.floor(r.total_horas / 60) + 'h ' + (r.total_horas % 60) + 'm' : '--:--',
                    saldo: r.saldo_minutos !== undefined ? (r.saldo_minutos > 0 ? '+' : '') + Math.floor(r.saldo_minutos / 60) + 'h ' + Math.abs(r.total_horas % 60) + 'm' : '--:--'
                };
            });

            const pdf = gerarRelatorioPontoPDF({
                empresa: {
                    nome: profile.empresa?.razao_social || '',
                    cnpj: profile.empresa?.cnpj || '',
                    endereco: profile.empresa?.endereco || ''
                },
                funcionario: {
                    nome: profile.nome,
                    cpf: profile.cpf || '',
                    pis: profile.pis_nis || '',
                    funcao: profile.funcao || '',
                    setor: profile.setor || '',
                    dataAdmissao: '',
                    jornada: ''
                },
                periodo: { inicio: inicioMes, fim: fimMes },
                registros: registrosMapeados,
                totalHoras: Math.floor(totalMinutos / 60) + 'h ' + (totalMinutos % 60) + 'm',
                totalSaldo: (totalSaldoMinutos > 0 ? '+' : '') + Math.floor(totalSaldoMinutos / 60) + 'h ' + Math.abs(totalSaldoMinutos % 60) + 'm'
            });

            pdf.save(`Relatorio_Ponto_${mesAtual}_${anoAtual}.pdf`);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setStep('select');
        setSelectedType(null);
        setError(null);
        setBiometryFailCount(0);
        biometria.stopCamera();
    };

    const dataExtenso = `${DIAS_SEMANA[currentTime.getDay()]}, ${currentTime.getDate()} de ${MESES_EXTENSO[currentTime.getMonth()]} de ${currentTime.getFullYear()}`;

    const pontoButtons: { type: TipoRegistroPonto; icon: any; color: string }[] = [
        { type: 'entrada', icon: ArrowRight, color: 'primary' },
        { type: 'saida_almoco', icon: Clock, color: 'amber' },
        { type: 'retorno_almoco', icon: ArrowRight, color: 'emerald' },
        { type: 'saida', icon: Lock, color: 'rose' },
    ];

    return (
        <div className="min-h-full flex flex-col items-center justify-center py-8">
            <div className="mb-8 text-center">
                <div className="flex items-center justify-center gap-4 mb-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
                        }`}>
                        {profile?.foto_url ? (
                            <img src={profile.foto_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-primary-500 font-bold text-xl uppercase">
                                {profile?.nome?.charAt(0) || 'U'}
                            </span>
                        )}
                    </div>
                    <div className="text-left">
                        <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{profile?.nome || 'Colaborador'}</h2>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{profile?.funcao} • {profile?.setor}</p>
                    </div>
                </div>
                {profile?.biometria_ativa && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-500/10 text-primary-500 text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary-500/20">
                        <ShieldCheck size={12} /> Biometria Ativa
                    </span>
                )}
            </div>

            {/* Sync Status Bar */}
            <AnimatePresence>
                {pendingSyncCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`mb-6 flex items-center gap-3 px-4 py-2 rounded-2xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-700'
                            }`}
                    >
                        <WifiOff size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            {pendingSyncCount} registro(s) aguardando conexão para sincronizar
                        </span>
                        <RefreshCw size={14} className="animate-spin ml-2" />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mb-12 px-12 py-8 rounded-[32px] border text-center ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-xl'
                    }`}
            >
                <h2 className={`text-7xl font-black tracking-tighter tabular-nums flex items-baseline gap-3 justify-center ${isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <span className="text-2xl text-primary-500/60 font-bold">
                        {currentTime.toLocaleTimeString([], { second: '2-digit' })}
                    </span>
                </h2>
                <div className={`mt-4 flex items-center justify-center gap-4 font-semibold text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span className="flex items-center gap-2">
                        <Calendar size={14} /> {dataExtenso}
                    </span>
                </div>
                {localNome && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-primary-500 text-xs font-medium">
                        <MapPin size={14} /> {localNome}
                    </div>
                )}
                <button
                    onClick={handleDownloadRelatorio}
                    className={`mt-4 flex items-center justify-center gap-2 px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-tight transition-all ${isDark ? 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm'
                        }`}
                >
                    <FileText size={14} /> Espelho de Ponto Mensal
                </button>
            </motion.div>

            <AnimatePresence mode="wait">
                {step === 'select' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-3xl"
                    >
                        {pontoButtons.map((btn) => {
                            const registro = getRegistroTipo(btn.type);
                            const isRegistered = !!registro;

                            return (
                                <button
                                    key={btn.type}
                                    onClick={() => !isRegistered && handleStartPonto(btn.type)}
                                    disabled={isRegistered}
                                    className={`p-6 rounded-[24px] border transition-all flex flex-col items-center text-center group relative overflow-hidden ${isRegistered
                                        ? isDark ? 'bg-slate-800/20 border-emerald-500/30 cursor-not-allowed' : 'bg-slate-50 border-emerald-500/30 cursor-not-allowed'
                                        : isDark ? 'bg-slate-800/50 border-slate-700/50 hover:border-primary-500/50 hover:bg-slate-800' : 'bg-white border-slate-200 hover:border-primary-500/50 hover:shadow-lg'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${isRegistered
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : btn.color === 'primary' ? 'bg-primary-500/10 text-primary-500' :
                                            btn.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
                                                btn.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    'bg-rose-500/10 text-rose-500'
                                        }`}>
                                        {isRegistered ? <CheckCircle2 size={20} /> : <btn.icon size={20} />}
                                    </div>
                                    <h3 className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {TIPO_REGISTRO_LABELS[btn.type]}
                                    </h3>
                                    {isRegistered && registro && (
                                        <p className="text-emerald-500 text-xs font-bold font-mono">
                                            {registro.hora_registro.slice(0, 5)}
                                        </p>
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                )}

                {step === 'biometria' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`w-full max-w-lg rounded-[32px] border overflow-hidden shadow-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                    >
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Verificação Facial</h2>
                                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {selectedType && TIPO_REGISTRO_LABELS[selectedType]}
                                    </p>
                                </div>
                                <button onClick={resetFlow} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                    <X size={20} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                                </button>
                            </div>

                            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-8 border border-slate-700">
                                <video ref={biometria.videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                <div className={`absolute inset-0 border-4 rounded-2xl pointer-events-none transition-colors ${biometria.faceCentered ? 'border-primary-500' : 'border-white/20'}`} />
                                <div className="absolute top-4 left-0 right-0 flex justify-center">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-lg ${biometria.faceCentered ? 'bg-primary-500 text-white' : 'bg-black/60 text-white'}`}>
                                        {biometria.message}
                                    </span>
                                </div>
                                {loading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={resetFlow} className={`flex-1 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleBiometriaConfirm}
                                    disabled={!biometria.faceCentered || loading}
                                    className="flex-[2] py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    Confirmar <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'senha' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`w-full max-w-md rounded-[32px] border overflow-hidden shadow-2xl p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
                                    <Key size={20} className="text-primary-500" />
                                </div>
                                <div>
                                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Confirmar Registro</h2>
                                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {selectedType && TIPO_REGISTRO_LABELS[selectedType]}
                                    </p>
                                </div>
                            </div>
                            <button onClick={resetFlow} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                <X size={20} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-medium">
                                {error}
                            </div>
                        )}

                        <div className={`text-center py-8 mb-8 rounded-2xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                            <p className={`text-5xl font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={resetFlow} className={`flex-1 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleSenhaConfirm}
                                disabled={loading}
                                className="flex-[2] py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Confirmar <ArrowRight size={18} /></>}
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`w-full max-w-md rounded-[40px] border p-10 flex flex-col items-center text-center shadow-2xl ${isDark ? 'bg-slate-800 border-emerald-500/20' : 'bg-white border-emerald-500/20'
                            }`}
                    >
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-8 border border-emerald-500/20 shadow-glow shadow-emerald-500/10">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Ponto Registrado!</h2>
                        <p className={`text-sm mb-10 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Sua batida de <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {selectedType && TIPO_REGISTRO_LABELS[selectedType]}
                            </span> foi salva com sucesso.
                        </p>

                        <div className="w-full flex flex-col gap-3">
                            <button onClick={handleDownloadPDF} className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                <FileText size={18} /> Baixar Comprovante
                            </button>
                            <button onClick={resetFlow} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                                Novo Registro
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`w-full max-w-md rounded-[40px] border p-10 flex flex-col items-center text-center shadow-2xl ${isDark ? 'bg-slate-800 border-rose-500/20' : 'bg-white border-rose-500/20'
                            }`}
                    >
                        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-8 border border-rose-500/20">
                            <AlertTriangle size={40} />
                        </div>
                        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Atenção</h2>
                        <p className={`text-sm mb-10 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{error || 'Ocorreu um erro ao registrar o ponto.'}</p>
                        <button onClick={resetFlow} className={`w-full py-3.5 rounded-xl font-bold text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}>
                            Tentar Novamente
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RegistroPonto;
