import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    ShieldCheck,
    Save,
    Building2,
    MapPin,
    Phone,
    Mail,
    Hash,
    ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ConfiguracaoEmpresa: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [empresa, setEmpresa] = useState<any>(null);

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchEmpresa();
        }
    }, [profile?.empresa_id]);

    const fetchEmpresa = async () => {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select('*')
                .eq('id', profile?.empresa_id)
                .single();

            if (error) throw error;
            setEmpresa(data);
        } catch (error) {
            console.error('Erro ao buscar dados da empresa:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('empresas')
                .update({
                    razao_social: empresa.razao_social,
                    cnpj: empresa.cnpj,
                    email_contato: empresa.email_contato,
                    telefone: empresa.telefone,
                    endereco: empresa.endereco
                })
                .eq('id', empresa.id);

            if (error) throw error;
            alert('Dados atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar alterações.');
        } finally {
            setSaving(false);
        }
    };

    const cardClass = `rounded-2xl border ${isDark
        ? 'bg-slate-800/50 border-slate-700/50'
        : 'bg-white border-slate-200 shadow-soft'}`;

    const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-primary-500/20 ${isDark
        ? 'bg-slate-800 border-slate-700 text-white'
        : 'bg-slate-50 border-slate-200 text-slate-900'}`;

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="p-8 max-w-4xl mx-auto pb-32">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-primary-500 font-bold text-sm mb-4 hover:opacity-70 transition-all"
                    >
                        <ArrowLeft size={16} />
                        Voltar
                    </button>
                    <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Dados da <span className="text-primary-500">Empresa</span>
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Gerencie as informações institucionais da sua organização
                    </p>
                </div>
                <div className="px-4 py-2 bg-primary-500/10 text-primary-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary-500/20">
                    ID: {empresa?.id?.split('-')[0]}...
                </div>
            </header>

            <form onSubmit={handleSave} className="space-y-6">
                <main className={`${cardClass} p-8 space-y-8`}>
                    {/* Institucional */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center">
                                <Building2 size={20} />
                            </div>
                            <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Informações Institucionais</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Razão Social</label>
                                <input
                                    type="text"
                                    value={empresa?.razao_social || ''}
                                    onChange={e => setEmpresa({ ...empresa, razao_social: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">CNPJ</label>
                                <input
                                    type="text"
                                    value={empresa?.cnpj || ''}
                                    onChange={e => setEmpresa({ ...empresa, cnpj: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    <hr className={isDark ? 'border-slate-700/50' : 'border-slate-100'} />

                    {/* Contato */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                <Mail size={20} />
                            </div>
                            <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Canais de Contato</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">E-mail Administrativo</label>
                                <input
                                    type="email"
                                    value={empresa?.email_contato || ''}
                                    onChange={e => setEmpresa({ ...empresa, email_contato: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    value={empresa?.telefone || ''}
                                    onChange={e => setEmpresa({ ...empresa, telefone: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    <hr className={isDark ? 'border-slate-700/50' : 'border-slate-100'} />

                    {/* Endereço */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <MapPin size={20} />
                            </div>
                            <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Localização</h2>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Endereço Completo</label>
                            <textarea
                                rows={3}
                                value={empresa?.endereco || ''}
                                onChange={e => setEmpresa({ ...empresa, endereco: e.target.value })}
                                className={`${inputClass} resize-none`}
                            />
                        </div>
                    </section>
                </main>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all border ${isDark
                            ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-2xl font-bold text-sm transition-all shadow-glow"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        Salvar Alterações
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ConfiguracaoEmpresa;
