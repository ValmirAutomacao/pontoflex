import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    User,
    Clock,
    Info,
    Search,
    Download,
    ArrowLeft,
    Plus,
    Edit3,
    Trash2,
    CheckCircle2,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Funcionario {
    id: string;
    nome: string;
    cargo?: string;
    setor?: string;
    escala_nome?: string;
}

interface EscalaAssignment {
    funcionario_id: string;
    escala_id: string;
    data_inicio: string;
    tipo_escala: string;
}

interface Afastamento {
    id: string;
    funcionario_id: string;
    data_inicio: string;
    data_fim: string;
    tipo_nome: string;
}

interface EscalaExcecao {
    id: string;
    funcionario_id: string;
    data: string;
    tipo: 'FOLGA' | 'TROCA' | 'PLANTAO_EXTRA' | 'FERIADO_TRABALHADO';
    observacoes: string;
}

interface DiaInfo {
    date: Date;
    dateStr: string;
    isWorking: boolean;
    hasAbsence: boolean;
    absenceName?: string;
    isException: boolean;
    exceptionType?: string;
    shiftHours?: string;
}

const CalendarioVisual: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [viewDate, setViewDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'LIST' | 'INDIVIDUAL'>('LIST');
    const [selectedEmployee, setSelectedEmployee] = useState<Funcionario | null>(null);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [assignments, setAssignments] = useState<EscalaAssignment[]>([]);
    const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
    const [excecoes, setExcecoes] = useState<EscalaExcecao[]>([]);
    const [horarios, setHorarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
    const [selectedDateForException, setSelectedDateForException] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchData();
        }
    }, [profile?.empresa_id, viewDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).toISOString().split('T')[0];

            // 1. Funcionários
            const { data: employees } = await supabase
                .from('funcionarios')
                .select('id, nome, setor:setores(nome), cargo:funcoes(nome), escalas:funcionarios_escalas(escala:escalas_servico(nome))')
                .eq('empresa_id', profile?.empresa_id)
                .eq('status', 'Ativo')
                .order('nome');

            setFuncionarios((employees as any)?.map((e: any) => ({
                id: e.id,
                nome: e.nome,
                setor: e.setor?.nome,
                cargo: e.cargo?.nome,
                escala_nome: e.escalas?.[0]?.escala?.nome
            })) || []);

            // 2. Escalas Ativas
            const { data: scales } = await supabase
                .from('funcionarios_escalas')
                .select(`
                    funcionario_id,
                    escala_id,
                    data_inicio,
                    escala:escalas_servico(tipo)
                `)
                .eq('empresa_id', profile?.empresa_id)
                .eq('ativo', true);

            setAssignments((scales as any)?.map((s: any) => ({
                funcionario_id: s.funcionario_id,
                escala_id: s.escala_id,
                data_inicio: s.data_inicio,
                tipo_escala: s.escala?.tipo
            })) || []);

            // 3. Afastamentos
            const { data: absences } = await supabase
                .from('afastamentos')
                .select('id, funcionario_id, data_inicio, data_fim, tipo:afastamentos_tipos(nome)')
                .eq('empresa_id', profile?.empresa_id)
                .gte('data_fim', firstDay)
                .lte('data_inicio', lastDay);

            setAfastamentos((absences as any)?.map((a: any) => ({
                id: a.id,
                funcionario_id: a.funcionario_id,
                data_inicio: a.data_inicio,
                data_fim: a.data_fim,
                tipo_nome: a.tipo?.nome
            })) || []);

            // 4. Exceções (Folgas/Plantões)
            const { data: exceptions } = await supabase
                .from('escalas_excecoes')
                .select('*')
                .eq('empresa_id', profile?.empresa_id)
                .gte('data', firstDay)
                .lte('data', lastDay);

            setExcecoes(exceptions || []);

            // 5. Horários das Escalas
            const { data: scheduleHours } = await supabase
                .from('escalas_horarios')
                .select('escala_id, dia_semana, entrada, saida, is_folga');

            setHorarios(scheduleHours || []);

        } catch (error) {
            console.error('Erro ao buscar dados do calendário:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDiaInfo = (funcionarioId: string, date: Date): DiaInfo => {
        const dateStr = date.toISOString().split('T')[0];

        // 1. Check Absence (Laranja)
        const absence = afastamentos.find(a =>
            a.funcionario_id === funcionarioId &&
            dateStr >= a.data_inicio &&
            dateStr <= a.data_fim
        );
        if (absence) return { date, dateStr, isWorking: false, hasAbsence: true, absenceName: absence.tipo_nome, isException: false };

        // 2. Check Exceptions (Folga/Plantão Extra)
        const exception = excecoes.find(e => e.funcionario_id === funcionarioId && e.data === dateStr);
        if (exception) {
            return {
                date,
                dateStr,
                isWorking: exception.tipo === 'PLANTAO_EXTRA' || exception.tipo === 'FERIADO_TRABALHADO',
                hasAbsence: false,
                isException: true,
                exceptionType: exception.tipo
            };
        }

        // 3. Check Base Scale
        const assignment = assignments.find(a => a.funcionario_id === funcionarioId);
        if (!assignment) return { date, dateStr, isWorking: false, hasAbsence: false, isException: false };

        if (assignment.tipo_escala === '12X36') {
            const startDate = new Date(assignment.data_inicio);
            startDate.setHours(12, 0, 0, 0); // Avoid TZ issues
            const currentDate = new Date(date);
            currentDate.setHours(12, 0, 0, 0);

            const diffDays = Math.round((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const isWorkingCycle = diffDays % 2 === 0;
            return { date, dateStr, isWorking: isWorkingCycle, hasAbsence: false, isException: false };
        } else {
            const dayOfWeek = date.getDay();
            const horario = horarios.find(h => h.escala_id === assignment.escala_id && h.dia_semana === dayOfWeek);
            return {
                date,
                dateStr,
                isWorking: horario ? !horario.is_folga : false,
                hasAbsence: false,
                isException: false,
                shiftHours: horario && !horario.is_folga ? `${horario.entrada.substring(0, 5)}-${horario.saida.substring(0, 5)}` : undefined
            };
        }
    };

    const handleSaveException = async (tipo: 'FOLGA' | 'PLANTAO_EXTRA') => {
        if (!selectedEmployee || !selectedDateForException) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('escalas_excecoes')
                .insert([{
                    funcionario_id: selectedEmployee.id,
                    empresa_id: profile?.empresa_id,
                    data: selectedDateForException,
                    tipo,
                    observacoes: 'Ajuste via Calendário Operacional'
                }]);

            if (error) throw error;
            await fetchData();
            setIsExceptionModalOpen(false);
        } catch (error) {
            console.error('Erro ao salvar exceção:', error);
        } finally {
            setSaving(false);
        }
    };

    const removeException = async (id: string) => {
        try {
            const { error } = await supabase
                .from('escalas_excecoes')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Erro ao remover exceção:', error);
        }
    };

    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const calendarDays = Array.from({ length: 42 }, (_, i) => {
        const day = i - firstDayOfMonth + 1;
        if (day <= 0 || day > daysInMonth) return null;
        return day;
    });

    const cardClass = `rounded-2xl border ${isDark
        ? 'bg-slate-800/50 border-slate-700/50 text-white shadow-lg shadow-black/20'
        : 'bg-white border-slate-200 text-slate-900 shadow-soft'}`;

    const filteredEmployees = funcionarios.filter(f =>
        f.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 pb-20 min-h-screen">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <header>
                    {viewMode === 'INDIVIDUAL' && (
                        <button
                            onClick={() => setViewMode('LIST')}
                            className="flex items-center gap-2 text-primary-500 font-bold text-sm mb-4 hover:opacity-70 transition-all"
                        >
                            <ArrowLeft size={16} />
                            Voltar para Lista
                        </button>
                    )}
                    <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {viewMode === 'LIST' ? 'Escala de Folgas' : `Folgas: ${selectedEmployee?.nome}`}
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {viewMode === 'LIST' ? 'Gerencie a grade mensal de trabalho e folgas' : `Cronograma individual de ${viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
                    </p>
                </header>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 shadow-inner">
                        <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"><ChevronLeft size={20} /></button>
                        <div className="px-6 font-bold text-sm min-w-[170px] text-center uppercase tracking-widest text-primary-500">
                            {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </div>
                        <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {viewMode === 'LIST' ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {/* Search */}
                        <div className="relative w-full md:w-96 mb-8 group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Pesquise aqui por algum funcionário"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-4 py-4 rounded-3xl border outline-none focus:ring-4 focus:ring-primary-500/10 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 shadow-sm'}`}
                            />
                        </div>

                        {/* Employee Table/List */}
                        <div className={`${cardClass} overflow-hidden`}>
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`border-b ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}`}>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest opacity-40">Funcionário</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest opacity-40">Cargo / Unidade</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest opacity-40">Escala Atual</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                                    {loading ? (
                                        <tr><td colSpan={4} className="p-20 text-center"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                                    ) : filteredEmployees.map(emp => (
                                        <tr
                                            key={emp.id}
                                            className={`${isDark ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50'} transition-colors cursor-pointer group`}
                                            onClick={() => {
                                                setSelectedEmployee(emp);
                                                setViewMode('INDIVIDUAL');
                                            }}
                                        >
                                            <td className="p-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-all">
                                                        {emp.nome.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm tracking-tight">{emp.nome}</p>
                                                        <p className="text-[10px] uppercase font-black opacity-30 tracking-widest mt-0.5">{emp.setor || 'Geral'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-xs font-bold opacity-60">{emp.cargo || '-'}</p>
                                            </td>
                                            <td className="p-5">
                                                <span className="px-3 py-1 bg-primary-500/10 text-primary-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary-500/20">
                                                    {emp.escala_nome || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-5 text-center">
                                                <button className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl opacity-0 group-hover:opacity-100 transition-all text-primary-500">
                                                    <Edit3 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="individual"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
                        {/* Info Column */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className={`${cardClass} p-8`}>
                                <div className="text-center mb-8">
                                    <div className="w-24 h-24 rounded-[32px] bg-primary-500 text-white flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-2xl shadow-primary-500/30">
                                        {selectedEmployee?.nome.charAt(0)}
                                    </div>
                                    <h2 className="text-xl font-black tracking-tight">{selectedEmployee?.nome}</h2>
                                    <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-2">
                                        {selectedEmployee?.cargo} • {selectedEmployee?.setor}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className={`p-4 rounded-3xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} border ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase opacity-40 mb-1 tracking-widest">Escala Base</p>
                                        <p className="text-sm font-bold text-primary-500">{selectedEmployee?.escala_nome}</p>
                                    </div>
                                    <div className={`p-4 rounded-3xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} border ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                        <p className="text-[10px] font-black uppercase opacity-40 mb-1 tracking-widest">Resumo do Mês</p>
                                        <div className="flex gap-4 mt-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                <span className="text-xs font-bold">22 Trabalhados</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                                <span className="text-xs font-bold">9 Folgas</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex gap-3 italic text-xs font-medium text-amber-600 dark:text-amber-400">
                                <Info size={20} className="shrink-0" />
                                <p>Clique em um dia no calendário para alternar entre folga e dia trabalhado se necessário (ajuste manual).</p>
                            </div>
                        </div>

                        {/* Calendar Column */}
                        <div className="lg:col-span-2">
                            <div className={`${cardClass} p-8`}>
                                <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-700 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700">
                                    {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'].map(day => (
                                        <div key={day} className={`p-4 text-center text-[10px] font-black opacity-30 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                            {day}
                                        </div>
                                    ))}
                                    {calendarDays.map((day, i) => {
                                        if (!day) return <div key={i} className={isDark ? 'bg-header-dark/50' : 'bg-slate-50/50'}></div>;
                                        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                                        const info = getDiaInfo(selectedEmployee!.id, date);

                                        let bg = isDark ? 'bg-slate-800' : 'bg-white';
                                        let statusColor = "";
                                        let textColor = isDark ? 'text-white' : 'text-slate-900';
                                        let label = "";

                                        if (info.hasAbsence) {
                                            statusColor = "bg-orange-500";
                                            label = info.absenceName || "AFAST";
                                        } else if (info.isWorking) {
                                            statusColor = "bg-emerald-500";
                                            label = info.shiftHours || "TRABALHO";
                                        } else {
                                            statusColor = "bg-rose-500";
                                            label = "FOLGA";
                                        }

                                        const isToday = new Date().toDateString() === date.toDateString();

                                        return (
                                            <div
                                                key={i}
                                                className={`relative h-32 p-3 ${bg} hover:z-10 transition-all cursor-pointer group`}
                                                onClick={() => {
                                                    setSelectedDateForException(info.dateStr);
                                                    setIsExceptionModalOpen(true);
                                                }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-sm font-black ${isToday ? 'bg-primary-500 text-white w-7 h-7 flex items-center justify-center rounded-xl shadow-lg' : 'opacity-40'}`}>
                                                        {day}
                                                    </span>
                                                    {info.isException && (
                                                        <div className="w-2 h-2 rounded-full bg-primary-400 shadow-glow animate-pulse"></div>
                                                    )}
                                                </div>

                                                <div className={`mt-4 w-full h-8 rounded-xl ${statusColor} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105`}>
                                                    <span className="text-[8px] font-black text-white uppercase tracking-widest">{label}</span>
                                                </div>

                                                <div className="absolute bottom-2 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex justify-center">
                                                    <div className="px-2 py-1 bg-slate-900 text-white text-[8px] font-bold rounded-lg uppercase tracking-tighter">Alterar</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button className="flex items-center gap-3 px-8 py-4 bg-primary-500 text-white rounded-[24px] font-bold text-sm shadow-2xl shadow-primary-500/30 hover:-translate-y-1 transition-all">
                                        <Download size={20} />
                                        Gerar PDF de Escalas
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Exception Modal (Quick Adjustment) */}
            <AnimatePresence>
                {isExceptionModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-black/40">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`${cardClass} p-8 max-w-md w-full`}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black tracking-tight">Ajuste de Dia</h3>
                                <button onClick={() => setIsExceptionModalOpen(false)} className="p-2 opacity-40 hover:opacity-100"><X /></button>
                            </div>

                            <p className="text-sm opacity-60 mb-8">
                                O que deseja definir para o dia <span className="font-bold text-primary-500">{new Date(selectedDateForException!).toLocaleDateString('pt-BR')}</span>?
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleSaveException('FOLGA')}
                                    disabled={saving}
                                    className="p-6 rounded-3xl border-2 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white transition-all text-center group"
                                >
                                    <X size={32} className="mx-auto mb-3 opacity-40 group-hover:opacity-100" />
                                    <span className="text-xs font-black uppercase tracking-widest">Definir como Folga</span>
                                </button>
                                <button
                                    onClick={() => handleSaveException('PLANTAO_EXTRA')}
                                    disabled={saving}
                                    className="p-6 rounded-3xl border-2 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all text-center group"
                                >
                                    <CheckCircle2 size={32} className="mx-auto mb-3 opacity-40 group-hover:opacity-100" />
                                    <span className="text-xs font-black uppercase tracking-widest">Definir como Trabalho</span>
                                </button>
                            </div>

                            <p className="mt-8 text-[10px] text-center opacity-40 uppercase font-bold tracking-widest leading-relaxed">
                                Estas alterações criam exceções na escala vinculada e impactam diretamente o cálculo de horas extras e banco de horas.
                            </p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CalendarioVisual;
