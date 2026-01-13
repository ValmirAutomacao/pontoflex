import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Calendar as CalendarIcon,
    Plus,
    Search,
    Filter,
    FileText,
    Download,
    Printer,
    ChevronLeft,
    ChevronRight,
    User,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Eye,
    Info,
    CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    addDays,
    differenceInDays,
    parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface FeriasPeriodo {
    id: string;
    funcionario_id: string;
    data_inicio: string;
    data_fim: string;
    data_aviso?: string;
    status: string;
    funcionarios?: { nome: string };
}

interface PeriodoAquisitivo {
    id: string;
    funcionario_id: string;
    data_inicio: string;
    data_fim: string;
    limite_concessao: string;
    saldo_dias: number;
    status: 'aberto' | 'concluido' | 'vencido';
    funcionarios?: { nome: string };
}

const Ferias: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [periodos, setPeriodos] = useState<FeriasPeriodo[]>([]);
    const [aquisitivos, setAquisitivos] = useState<PeriodoAquisitivo[]>([]);
    const [funcionarios, setFuncionarios] = useState<{ id: string, nome: string, data_admissao?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'solicitacoes' | 'periodos' | 'saldos'>('solicitacoes');
    const [isCalendarVisible, setIsCalendarVisible] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        funcionario_id: '',
        data_inicio: '',
        data_fim: '',
        data_aviso: '',
        motivo: 'Férias regulamentares'
    });

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchData();
            fetchAquisitivos();
            fetchFuncionarios();
        }
    }, [profile?.empresa_id, currentDate]);

    const fetchData = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('afastamentos')
            .select(`
                *,
                funcionarios(nome),
                tipos_afastamentos!inner(nome)
            `)
            .eq('empresa_id', profile.empresa_id)
            .eq('tipos_afastamentos.nome', 'Férias');

        if (data) setPeriodos(data);
        setLoading(false);
    };

    const fetchAquisitivos = async () => {
        const { data } = await supabase
            .from('periodos_ferias_aquisitivos')
            .select('*, funcionarios(nome)')
            .eq('empresa_id', profile?.empresa_id);
        if (data) setAquisitivos(data);
    };

    const fetchFuncionarios = async () => {
        const { data } = await supabase
            .from('funcionarios')
            .select('id, nome, data_admissao')
            .eq('empresa_id', profile?.empresa_id)
            .eq('status', 'Ativo');
        if (data) setFuncionarios(data);
    };

    const handleAddPeriodo = async (e: React.FormEvent) => {
        e.preventDefault();

        const today = new Date();
        const start = parseISO(formData.data_inicio);
        const diffNotice = differenceInDays(start, today);

        if (diffNotice < 30) {
            if (!confirm('Atenção: A data de início é inferior a 30 dias de hoje. De acordo com a CLT, o colaborador deve ser avisado com 30 dias de antecedência. Deseja continuar mesmo assim?')) {
                return;
            }
        }

        const { data: tipoFerias } = await supabase
            .from('tipos_afastamentos')
            .select('id')
            .eq('nome', 'Férias')
            .eq('empresa_id', profile?.empresa_id)
            .single();

        if (!tipoFerias) {
            toast.error('Tipo de afastamento "Férias" não encontrado.');
            return;
        }

        const { error } = await supabase.from('afastamentos').insert({
            ...formData,
            tipo_afastamento_id: tipoFerias.id,
            status: 'aprovado',
            empresa_id: profile?.empresa_id
        });

        if (error) {
            toast.error('Erro ao salvar período de férias.');
        } else {
            toast.success('Período de férias agendado com sucesso!');
            setShowModal(false);
            fetchData();
        }
    };

    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
    });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const cardClass = `rounded-2xl border ${isDark
        ? 'bg-slate-800/50 border-slate-700/50'
        : 'bg-white border-slate-200 shadow-soft'}`;

    return (
        <div className="p-8 pb-20 min-h-screen">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 text-slate-900 dark:text-white">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">
                        Módulo de Férias
                    </h1>
                    <p className="text-sm mt-2 font-medium opacity-60">
                        Gestão administrativa e planejamento de períodos de descanso
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all border ${isDark
                            ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                    >
                        <Printer size={16} />
                        Exportar Relatório
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold text-sm transition-all shadow-glow"
                    >
                        <Plus size={18} />
                        Adicionar Período
                    </button>
                </div>
            </div>

            <div className={`${cardClass} p-4 mb-6 flex flex-col md:flex-row gap-4 items-center`}>
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar colaborador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20 outline-none ${isDark
                            ? 'bg-slate-900/50 border-slate-700 text-white focus:border-primary-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary-500'}`}
                    />
                </div>
            </div>

            <div className={`${cardClass} overflow-hidden mb-8`}>
                <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1">
                            <button onClick={prevMonth} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} dark:text-white`}>
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={nextMonth} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} dark:text-white`}>
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <h2 className={`text-xl font-bold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </h2>
                    </div>
                    <button
                        onClick={() => setIsCalendarVisible(!isCalendarVisible)}
                        className={`text-xs font-bold flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                        <Eye size={14} />
                        {isCalendarVisible ? 'Esconder calendário' : 'Mostrar calendário'}
                    </button>
                </div>

                <AnimatePresence>
                    {isCalendarVisible && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="p-1"
                        >
                            <div className="grid grid-cols-7 border-b transition-colors border-slate-100 dark:border-slate-700/50 dark:text-white/40">
                                {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map(d => (
                                    <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest opacity-40">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                                    <div key={`empty-${i}`} className={`h-24 border-b border-r p-2 opacity-20 ${isDark ? 'border-slate-700/30' : 'border-slate-100'}`} />
                                ))}
                                {days.map((day: Date) => {
                                    const projectsOnThisDay = periodos.filter(p => {
                                        const start = parseISO(p.data_inicio);
                                        const end = parseISO(p.data_fim);
                                        return day >= start && day <= end;
                                    });

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`h-24 border-b border-r p-2 transition-colors relative group ${isDark ? 'border-slate-700/30 hover:bg-slate-800/30 text-white' : 'border-slate-100 hover:bg-slate-50 text-slate-900'} ${isToday(day) ? (isDark ? 'bg-primary-500/5' : 'bg-primary-50/30') : ''}`}
                                        >
                                            <span className={`text-xs font-bold ${isToday(day) ? 'text-primary-500' : 'opacity-40'}`}>
                                                {format(day, 'dd')}
                                            </span>

                                            <div className="mt-1 space-y-1">
                                                {projectsOnThisDay.slice(0, 3).map((p, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="px-2 py-1 rounded text-[9px] font-bold bg-primary-500 text-white truncate shadow-sm flex items-center gap-1"
                                                        title={p.funcionarios?.nome}
                                                    >
                                                        <User size={8} />
                                                        {p.funcionarios?.nome}
                                                    </div>
                                                ))}
                                                {projectsOnThisDay.length > 3 && (
                                                    <div className="text-[9px] font-bold text-center opacity-40">
                                                        + {projectsOnThisDay.length - 3} mais
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className={`${cardClass} overflow-hidden`}>
                <div className={`px-6 pt-6 border-b flex items-center justify-between ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                    <div className="flex gap-8">
                        {[
                            { id: 'solicitacoes', label: 'Escalados' },
                            { id: 'periodos', label: 'Períodos Aquisitivos' },
                            { id: 'saldos', label: 'Saldos' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-4 text-sm font-bold transition-all relative ${activeTab === tab.id
                                    ? 'text-primary-500'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTabFerias"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-0">
                    {activeTab === 'solicitacoes' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${isDark ? 'bg-slate-900/30' : 'bg-slate-50'} dark:text-white/40`}>
                                    <tr>
                                        <th className="px-6 py-4">Colaborador</th>
                                        <th className="px-6 py-4">Início</th>
                                        <th className="px-6 py-4">Fim</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y divide-slate-100 dark:divide-slate-700/50 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {periodos.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center opacity-40 text-sm font-medium">Nenhum período agendado</td>
                                        </tr>
                                    ) : periodos.map(p => (
                                        <tr key={p.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} transition-colors`}>
                                            <td className="px-6 py-4 font-bold text-sm">{p.funcionarios?.nome}</td>
                                            <td className="px-6 py-4 text-sm font-medium">{format(parseISO(p.data_inicio), 'dd/MM/yyyy')}</td>
                                            <td className="px-6 py-4 text-sm font-medium">{format(parseISO(p.data_fim), 'dd/MM/yyyy')}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest">Confirmado</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                                    <FileText size={16} className="opacity-40" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'periodos' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${isDark ? 'bg-slate-900/30' : 'bg-slate-50'} dark:text-white/40`}>
                                    <tr>
                                        <th className="px-6 py-4">Colaborador</th>
                                        <th className="px-6 py-4">Período</th>
                                        <th className="px-6 py-4">Limite Concessão</th>
                                        <th className="px-6 py-4">Saldo</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y divide-slate-100 dark:divide-slate-700/50 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {aquisitivos.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center opacity-40 text-sm font-medium">Nenhum período aquisitivo registrado</td>
                                        </tr>
                                    ) : aquisitivos.map(a => (
                                        <tr key={a.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} transition-colors`}>
                                            <td className="px-6 py-4 font-bold text-sm">{a.funcionarios?.nome}</td>
                                            <td className="px-6 py-4 text-sm">{format(parseISO(a.data_inicio), 'dd/MM/yy')} - {format(parseISO(a.data_fim), 'dd/MM/yy')}</td>
                                            <td className="px-6 py-4 text-sm">{format(parseISO(a.limite_concessao), 'dd/MM/yyyy')}</td>
                                            <td className="px-6 py-4 font-black text-sm">{a.saldo_dias} dias</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${a.status === 'aberto' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'
                                                    }`}>{a.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'saldos' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${isDark ? 'bg-slate-900/30' : 'bg-slate-50'} dark:text-white/40`}>
                                    <tr>
                                        <th className="px-6 py-4">Colaborador</th>
                                        <th className="px-6 py-4">Dias Acumulados</th>
                                        <th className="px-6 py-4">Dias Gozados</th>
                                        <th className="px-6 py-4">Saldo Atual</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y divide-slate-100 dark:divide-slate-700/50 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {funcionarios.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center opacity-40 text-sm font-medium">Nenhum colaborador encontrado</td>
                                        </tr>
                                    ) : funcionarios.map(f => {
                                        const usedDays = periodos.filter(p => p.funcionario_id === f.id && p.status === 'aprovado').reduce((acc, p) => {
                                            return acc + differenceInDays(parseISO(p.data_fim), parseISO(p.data_inicio)) + 1;
                                        }, 0);
                                        const balance = Math.max(0, 30 - usedDays);

                                        return (
                                            <tr key={f.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'} transition-colors`}>
                                                <td className="px-6 py-4 font-bold text-sm">{f.nome}</td>
                                                <td className="px-6 py-4 text-sm font-medium">30 dias</td>
                                                <td className="px-6 py-4 text-sm font-medium">{usedDays} dias</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[100px]">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${balance > 10 ? 'bg-primary-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${(balance / 30) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-black text-sm">{balance} d</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => setShowModal(true)} className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-glow">
                                                        Agendar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} w-full max-w-lg rounded-3xl border shadow-2xl relative overflow-hidden`}
                        >
                            <div className="p-8">
                                <h2 className={`text-2xl font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Agendar Férias</h2>
                                <p className="text-sm opacity-60 font-medium mb-8">Lance um novo período de gozo para o colaborador</p>

                                <form onSubmit={handleAddPeriodo} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Colaborador</label>
                                        <select
                                            required
                                            value={formData.funcionario_id}
                                            onChange={e => setFormData({ ...formData, funcionario_id: e.target.value })}
                                            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        >
                                            <option value="">Selecione o funcionário</option>
                                            {funcionarios.map(f => (
                                                <option key={f.id} value={f.id}>{f.nome}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Início</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.data_inicio}
                                                onChange={e => setFormData({ ...formData, data_inicio: e.target.value })}
                                                className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Fim</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.data_fim}
                                                onChange={e => setFormData({ ...formData, data_fim: e.target.value })}
                                                className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex gap-4">
                                        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Aviso Prévio CLT</h4>
                                            <p className="text-[10px] font-medium opacity-80 leading-relaxed text-amber-600 dark:text-amber-400">
                                                O colaborador deve ser comunicado oficialmente com no mínimo 30 dias de antecedência ao início do gozo.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className={`flex-1 px-6 py-4 rounded-2xl font-black text-sm transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-3 px-10 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-black text-sm transition-all shadow-glow flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={18} />
                                            Confirmar Agendamento
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Ferias;
