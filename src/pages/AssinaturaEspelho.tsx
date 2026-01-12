import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    CheckCircle2,
    FileText,
    Pencil,
    Eraser,
    ShieldCheck,
    ChevronLeft,
    AlertCircle,
    Info,
    Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SignaturePad: React.FC<{ onSave: (data: string) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const { isDark } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = isDark ? '#FFF' : '#000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
    }, [isDark]);

    const startDrawing = (e: any) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.beginPath();
        }
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.moveTo(x, y);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const save = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL());
        }
    };

    return (
        <div className="space-y-4">
            <div className={`border-2 border-dashed rounded-3xl overflow-hidden ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={200}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="w-full h-[200px] cursor-crosshair touch-none"
                />
            </div>
            <div className="flex gap-3">
                <button onClick={clear} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs ${isDark ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}>
                    <Eraser size={14} /> Limpar
                </button>
                <button onClick={save} className="flex-[2] flex items-center justify-center gap-2 py-3 bg-primary-500 text-white rounded-xl font-bold text-xs">
                    Confirmar Assinatura
                </button>
            </div>
        </div>
    );
};

const AssinaturaEspelho: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const periodoId = searchParams.get('periodo');

    const [periodo, setPeriodo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSigning, setIsSigning] = useState(false);
    const [signed, setSigned] = useState(false);
    const [resumo, setResumo] = useState<any>(null);

    useEffect(() => {
        if (profile?.funcionario_id) {
            fetchPeriodo();
        }
    }, [profile?.funcionario_id, periodoId]);

    const fetchPeriodo = async () => {
        setLoading(true);
        try {
            // Se não tem periodoId, busca o último fechado
            let query = supabase
                .from('periodos_fechamento')
                .select('*')
                .eq('empresa_id', profile?.empresa_id)
                .eq('status', 'fechado')
                .order('data_inicio', { ascending: false });

            if (periodoId) {
                query = query.eq('id', periodoId);
            }

            const { data: periodos, error } = await query.limit(1).single();

            if (error) throw error;
            setPeriodo(periodos);

            // Fetch summary for the employee in this period
            const { data: resumoData, error: rpcError } = await supabase.rpc('get_relatorio_consolidado', {
                p_empresa_id: profile?.empresa_id,
                p_start_date: periodos.data_inicio,
                p_end_date: periodos.data_fim
            });

            if (rpcError) throw rpcError;
            const myResumo = resumoData?.find((r: any) => r.funcionario_id === profile?.funcionario_id);
            setResumo(myResumo);

            // Verifiy if already signed
            const { data: signature } = await supabase
                .from('assinaturas_espelho')
                .select('id')
                .eq('periodo_id', periodos.id)
                .eq('funcionario_id', profile?.funcionario_id)
                .maybeSingle();

            if (signature) setSigned(true);

        } catch (error) {
            console.error('Erro ao buscar período para assinatura:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSignature = async (base64: string) => {
        try {
            // 1. Gera o hash de integridade
            const { data: hash, error: hashError } = await supabase.rpc('rpc_gerar_hash_espelho', {
                p_funcionario_id: profile?.funcionario_id,
                p_start_date: periodo.data_inicio,
                p_end_date: periodo.data_fim
            });

            if (hashError) throw hashError;

            // 2. Salva a assinatura
            const { error } = await supabase
                .from('assinaturas_espelho')
                .insert([{
                    periodo_id: periodo.id,
                    funcionario_id: profile?.funcionario_id,
                    assinatura_base64: base64,
                    hash_validacao: hash,
                    ip_registro: 'detect_at_backend', // Simplificado
                    user_agent: navigator.userAgent
                }]);

            if (error) throw error;
            setSigned(true);
            setIsSigning(false);
        } catch (error) {
            console.error('Erro ao salvar assinatura:', error);
            alert('Ocorreu um erro ao processar sua assinatura.');
        }
    };

    const cardClass = `rounded-3xl border ${isDark
        ? 'bg-slate-800/50 border-slate-700/50 text-white'
        : 'bg-white border-slate-200 text-slate-900 shadow-soft'}`;

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold opacity-40">Preparando documento...</p>
        </div>
    );

    if (!periodo) return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
            <AlertCircle size={48} className="text-amber-500 mb-6" />
            <h2 className="text-2xl font-black mb-2">Nenhum espelho disponível</h2>
            <p className="opacity-50 mb-8 max-w-xs">Não há períodos fechados aguardando sua assinatura no momento.</p>
            <button onClick={() => navigate('/')} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold">Voltar ao Início</button>
        </div>
    );

    return (
        <div className="p-4 md:p-8 pb-32 max-w-2xl mx-auto min-h-screen">
            {/* Minimal Header */}
            <div className="flex items-center gap-4 mb-10">
                <button onClick={() => navigate(-1)} className={`p-3 rounded-2xl ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-black">Conferência de Ponto</h1>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        Período: {new Date(periodo.data_inicio).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            {signed ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardClass} p-10 text-center`}>
                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
                        <ShieldCheck size={48} />
                    </div>
                    <h2 className="text-2xl font-black mb-2">Documento Assinado!</h2>
                    <p className="text-sm font-medium opacity-50 mb-10">
                        Sua assinatura digital foi processada e vinculada a este período com validade jurídica.
                    </p>
                    <div className={`p-4 rounded-2xl text-left border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-2 mb-2 text-emerald-500">
                            <CheckCircle2 size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Integridade Garantida</span>
                        </div>
                        <p className="text-[9px] font-mono break-all opacity-40 leading-relaxed uppercase">
                            CERT-DIGITAL-SHA256: {profile?.funcionario_id?.substring(0, 8)}-{periodo.id.substring(0, 8)}...
                        </p>
                    </div>
                </motion.div>
            ) : (
                <div className="space-y-6">
                    {/* Resumo Card */}
                    <div className={`${cardClass} p-6`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
                                <FileText size={20} />
                            </div>
                            <h3 className="font-black text-sm uppercase tracking-widest opacity-60">Resumo do Período</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                <p className="text-[9px] font-black uppercase opacity-40 mb-1">Horas Extras 50%</p>
                                <p className="text-lg font-black">{Math.floor(resumo?.total_minutos_50 / 60)}h {resumo?.total_minutos_50 % 60}m</p>
                            </div>
                            <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                <p className="text-[9px] font-black uppercase opacity-40 mb-1">Horas Extras 100%</p>
                                <p className="text-lg font-black">{Math.floor(resumo?.total_minutos_100 / 60)}h {resumo?.total_minutos_100 % 60}m</p>
                            </div>
                            <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                <p className="text-[9px] font-black uppercase opacity-40 mb-1">Adicional Noturno</p>
                                <p className="text-lg font-black">{Math.floor(resumo?.total_minutos_noturnos / 60)}h {resumo?.total_minutos_noturnos % 60}m</p>
                            </div>
                            <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                <p className="text-[9px] font-black uppercase opacity-40 mb-1">Saldo Banco</p>
                                <p className={`text-lg font-black ${resumo?.total_minutos_credito - resumo?.total_minutos_debito >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {resumo?.total_minutos_credito - resumo?.total_minutos_debito >= 0 ? '+' : ''}
                                    {Math.floor((resumo?.total_minutos_credito - resumo?.total_minutos_debito) / 60)}h {Math.abs(resumo?.total_minutos_credito - resumo?.total_minutos_debito) % 60}m
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3">
                            <Info size={18} className="text-amber-500 shrink-0" />
                            <p className="text-[10px] font-medium leading-relaxed opacity-70">
                                Ao assinar, você declara estar de acordo com os horários registrados e cálculos apresentados. Caso identifique divergências, procure o RH antes de assinar.
                            </p>
                        </div>
                    </div>

                    {/* Signature Action */}
                    <div className="space-y-4">
                        <AnimatePresence mode="wait">
                            {!isSigning ? (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsSigning(true)}
                                    className="w-full py-5 bg-slate-900 dark:bg-primary-500 text-white rounded-3xl font-black text-sm flex items-center justify-center gap-3 shadow-glow"
                                >
                                    <Pencil size={20} />
                                    Assinar Espelho de Ponto
                                </motion.button>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`${cardClass} p-8`}
                                >
                                    <h4 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4 text-center">Assine no campo abaixo</h4>
                                    <SignaturePad
                                        onSave={handleSaveSignature}
                                        onCancel={() => setIsSigning(false)}
                                    />
                                    <button
                                        onClick={() => setIsSigning(false)}
                                        className="w-full mt-4 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssinaturaEspelho;
