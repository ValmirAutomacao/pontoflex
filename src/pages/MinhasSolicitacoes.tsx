import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import DataTable from '../components/DataTable';
import {
    MessageSquare,
    Plus,
    Clock,
    CheckCircle,
    XCircle,
    FileText,
    Camera,
    Upload,
    X,
    Send,
    AlertTriangle,
    Calendar,
    Save,
    Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SolicitacaoJustificativa } from '../types/ponto';

const MinhasSolicitacoes: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [solicitacoes, setSolicitacoes] = useState<SolicitacaoJustificativa[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'justificativa' | 'atestado'>('justificativa');
    const [tiposJustificativa, setTiposJustificativa] = useState<{ id: string; nome: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        tipo_justificativa_id: '',
        motivo: '',
        data_ocorrencia: new Date().toISOString().split('T')[0],
        hora_afetada: '',
        dia_inteiro: false,
        // Atestado specific
        cid: '',
        quantidade_dias: 1
    });

    useEffect(() => {
        if (profile?.id) {
            fetchData();
        }
    }, [profile?.id]);

    const fetchData = async () => {
        if (!profile?.id || !profile?.empresa_id) return;
        setLoading(true);

        const [solRes, tiposRes] = await Promise.all([
            supabase
                .from('solicitacoes_justificativa')
                .select('*')
                .eq('funcionario_id', profile.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('tipos_justificativas_ponto')
                .select('id, nome')
                .eq('empresa_id', profile.empresa_id)
                .order('nome')
        ]);

        if (solRes.data) setSolicitacoes(solRes.data);
        if (tiposRes.data) setTiposJustificativa(tiposRes.data);
        setLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCapturedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id || !profile?.empresa_id) return;

        // Validações
        if (activeTab === 'atestado' && !capturedImage) {
            alert('Para atestados médicos, é obrigatório anexar a imagem do documento.');
            return;
        }

        setSaving(true);

        try {
            let documento_url = null;

            // Upload da imagem se houver
            if (capturedImage) {
                const fileName = `${profile.empresa_id}/${profile.id}/${Date.now()}.jpg`;
                const base64Data = capturedImage.split(',')[1];
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('documentos')
                    .upload(fileName, decode(base64Data), {
                        contentType: 'image/jpeg'
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrl } = supabase.storage
                    .from('documentos')
                    .getPublicUrl(fileName);

                documento_url = publicUrl.publicUrl;
            }

            const { error } = await supabase.from('solicitacoes_justificativa').insert([{
                funcionario_id: profile.id,
                tipo: activeTab,
                motivo: formData.motivo,
                data_ocorrencia: formData.data_ocorrencia,
                hora_afetada: formData.dia_inteiro ? null : formData.hora_afetada || null,
                dia_inteiro: formData.dia_inteiro,
                cid: activeTab === 'atestado' ? formData.cid || null : null,
                quantidade_dias: activeTab === 'atestado' ? formData.quantidade_dias : null,
                documento_url,
                empresa_id: profile.empresa_id
            }]);

            if (error) throw error;

            setIsModalOpen(false);
            resetForm();
            fetchData();
        } catch (err: any) {
            console.error('Erro ao criar solicitação:', err);
            alert('Erro ao criar solicitação: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            tipo_justificativa_id: '',
            motivo: '',
            data_ocorrencia: new Date().toISOString().split('T')[0],
            hora_afetada: '',
            dia_inteiro: false,
            cid: '',
            quantidade_dias: 1
        });
        setCapturedImage(null);
        setActiveTab('justificativa');
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
        statusFilter === 'Todos' || s.status === statusFilter.toLowerCase()
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
                title="Minhas Solicitações"
                subtitle="Justificativas e atestados médicos"
                kpis={kpis}
                searchPlaceholder=""
                searchValue=""
                onSearchChange={() => { }}
                filters={[
                    {
                        label: 'Status',
                        value: statusFilter,
                        options: [
                            { label: 'Todos', value: 'Todos' },
                            { label: 'Pendente', value: 'pendente' },
                            { label: 'Aprovado', value: 'aprovado' },
                            { label: 'Rejeitado', value: 'rejeitado' },
                        ],
                        onChange: setStatusFilter
                    }
                ]}
                columns={[
                    { key: 'tipo', label: 'Tipo' },
                    { key: 'data', label: 'Data Ocorrência' },
                    { key: 'motivo', label: 'Motivo' },
                    { key: 'status', label: 'Status' },
                    { key: 'criado', label: 'Solicitado em' },
                ]}
                data={filteredData}
                renderRow={(sol) => (
                    <tr key={sol.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${sol.tipo === 'atestado'
                                    ? isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
                                    : isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'
                                    }`}>
                                    {sol.tipo === 'atestado' ? <FileText size={18} /> : <MessageSquare size={18} />}
                                </div>
                                <div>
                                    <p className={`font-semibold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {sol.tipo === 'atestado' ? 'Atestado Médico' : 'Justificativa'}
                                    </p>
                                    {sol.tipo === 'atestado' && sol.quantidade_dias && (
                                        <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {sol.quantidade_dias} dia(s)
                                        </p>
                                    )}
                                </div>
                            </div>
                        </td>
                        <td className={`px-5 py-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar size={14} className="opacity-40" />
                                {new Date(sol.data_ocorrencia).toLocaleDateString('pt-BR')}
                                {!sol.dia_inteiro && sol.hora_afetada && (
                                    <span className="opacity-60">às {sol.hora_afetada.slice(0, 5)}</span>
                                )}
                            </div>
                        </td>
                        <td className={`px-5 py-4 text-sm max-w-[300px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {sol.motivo}
                        </td>
                        <td className="px-5 py-4">
                            {getStatusBadge(sol.status)}
                        </td>
                        <td className={`px-5 py-4 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {new Date(sol.created_at).toLocaleDateString('pt-BR')}
                        </td>
                    </tr>
                )}
                onRefresh={fetchData}
                onAdd={() => setIsModalOpen(true)}
                addButtonLabel="Nova Solicitação"
                loading={loading}
            />

            {/* Modal Nova Solicitação */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-lg rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="flex justify-between items-start mb-5">
                                    <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Nova Solicitação</h2>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-2 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('justificativa')}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'justificativa'
                                            ? 'bg-primary-500 text-white shadow-glow'
                                            : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                                            }`}
                                    >
                                        <MessageSquare size={16} /> Justificativa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('atestado')}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'atestado'
                                            ? 'bg-rose-500 text-white shadow-glow'
                                            : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                                            }`}
                                    >
                                        <FileText size={16} /> Atestado Médico
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Data e Hora */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Data*</label>
                                            <input
                                                required
                                                type="date"
                                                className={inputClass}
                                                value={formData.data_ocorrencia}
                                                onChange={e => setFormData({ ...formData, data_ocorrencia: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {activeTab === 'atestado' ? 'Dias de Afastamento*' : 'Hora Afetada'}
                                            </label>
                                            {activeTab === 'atestado' ? (
                                                <input
                                                    required
                                                    type="number"
                                                    min={1}
                                                    className={inputClass}
                                                    value={formData.quantidade_dias}
                                                    onChange={e => setFormData({ ...formData, quantidade_dias: parseInt(e.target.value) || 1 })}
                                                />
                                            ) : (
                                                <input
                                                    type="time"
                                                    className={inputClass}
                                                    disabled={formData.dia_inteiro}
                                                    value={formData.hora_afetada}
                                                    onChange={e => setFormData({ ...formData, hora_afetada: e.target.value })}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {activeTab === 'justificativa' && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="dia_inteiro"
                                                checked={formData.dia_inteiro}
                                                onChange={e => setFormData({ ...formData, dia_inteiro: e.target.checked })}
                                                className="rounded"
                                            />
                                            <label htmlFor="dia_inteiro" className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Dia inteiro (falta)
                                            </label>
                                        </div>
                                    )}

                                    {activeTab === 'atestado' && (
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>CID (opcional)</label>
                                            <input
                                                type="text"
                                                className={inputClass}
                                                placeholder="Ex: J11"
                                                value={formData.cid}
                                                onChange={e => setFormData({ ...formData, cid: e.target.value.toUpperCase() })}
                                                maxLength={10}
                                            />
                                        </div>
                                    )}

                                    {/* Motivo */}
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {activeTab === 'atestado' ? 'Motivo do Atestado*' : 'Motivo da Justificativa*'}
                                        </label>
                                        <textarea
                                            required
                                            rows={3}
                                            className={`${inputClass} resize-none`}
                                            placeholder={activeTab === 'atestado' ? 'Descreva o motivo médico...' : 'Explique o motivo do atraso ou falta...'}
                                            value={formData.motivo}
                                            onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                                        />
                                    </div>

                                    {/* Upload de Documento (Atestado) */}
                                    {activeTab === 'atestado' && (
                                        <>
                                            <div>
                                                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    Imagem do Atestado* <span className="text-rose-500">(obrigatório)</span>
                                                </label>

                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />

                                                {capturedImage ? (
                                                    <div className="relative">
                                                        <img
                                                            src={capturedImage}
                                                            alt="Preview"
                                                            className="w-full h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setCapturedImage(null)}
                                                            className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className={`w-full py-8 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${isDark
                                                            ? 'border-slate-600 hover:border-primary-500 text-slate-400'
                                                            : 'border-slate-300 hover:border-primary-500 text-slate-500'
                                                            }`}
                                                    >
                                                        <Image size={32} className="opacity-40" />
                                                        <span className="font-medium text-sm">Clique para tirar foto ou enviar imagem</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Alerta para atestado */}
                                            <div className={`p-4 rounded-xl flex gap-3 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-100'}`}>
                                                <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                                                        Importante!
                                                    </p>
                                                    <p className={`text-xs mt-1 ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>
                                                        Após enviar o atestado, entre em contato imediato com a empresa (via telefone ou WhatsApp) informando que você enviou o documento para aprovação.
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={`flex-1 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${activeTab === 'atestado' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-primary-500 hover:bg-primary-600'
                                            }`}
                                    >
                                        {saving ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <><Send size={14} /> Enviar Solicitação</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

// Helper function to decode base64
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export default MinhasSolicitacoes;
