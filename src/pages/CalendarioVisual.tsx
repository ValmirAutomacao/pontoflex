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
    Download
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Funcionario {
    id: string;
    nome: string;
    cargo?: string;
    setor?: string;
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

interface DiaInfo {
    dia: number;
    isWorking: boolean;
    hasAbsence: boolean;
    absenceName?: string;
    isManualFolga?: boolean;
    shiftHours?: string;
}

const CalendarioVisual: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [viewDate, setViewDate] = useState(new Date());
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [assignments, setAssignments] = useState<EscalaAssignment[]>([]);
    const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
    const [horarios, setHorarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchData();
        }
    }, [profile?.empresa_id, viewDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString();
            const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).toISOString();

            // 1. Funcionários
            const { data: employees } = await supabase
                .from('funcionarios')
                .select('id, nome, setor:setores(nome), cargo:funcoes(nome)')
                .eq('empresa_id', profile?.empresa_id)
                .eq('status', 'Ativo')
                .order('nome');

            setFuncionarios((employees as any) || []);

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

            // 4. Horários das Escalas (para 5x2, 6x1 etc)
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

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getDiaInfo = (funcionarioId: string, dia: number): DiaInfo => {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), dia);
        const dateStr = date.toISOString().split('T')[0];

        // 1. Check Absence
        const absence = afastamentos.find(a =>
            a.funcionario_id === funcionarioId &&
            dateStr >= a.data_inicio &&
            dateStr <= a.data_fim
        );
        if (absence) return { dia, isWorking: false, hasAbsence: true, absenceName: absence.tipo_nome };

        // 2. Check Scale
        const assignment = assignments.find(a => a.funcionario_id === funcionarioId);
        if (!assignment) return { dia, isWorking: false, hasAbsence: false };

        if (assignment.tipo_escala === '12X36') {
            const startDate = new Date(assignment.data_inicio);
            startDate.setHours(0, 0, 0, 0);
            const currentDate = new Date(date);
            currentDate.setHours(0, 0, 0, 0);

            const diffDays = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const isWorkingCycle = diffDays % 2 === 0;
            return { dia, isWorking: isWorkingCycle, hasAbsence: false };
        } else {
            // Outros tipos (FIXA, etc) - Usa dia da semana
            const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday...
            const horario = horarios.find(h => h.escala_id === assignment.escala_id && h.dia_semana === dayOfWeek);
            return {
                dia,
                isWorking: horario ? !horario.is_folga : false,
                hasAbsence: false,
                shiftHours: horario && !horario.is_folga ? `${horario.entrada.substring(0, 5)}-${horario.saida.substring(0, 5)}` : undefined
            };
        }
    };

    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

    const cardClass = `rounded-2xl border ${isDark
        ? 'bg-slate-800/50 border-slate-700/50 text-white'
        : 'bg-white border-slate-200 text-slate-900 shadow-soft'}`;

    const filteredEmployees = funcionarios.filter(f =>
        f.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 pb-20 min-h-screen">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Calendário Operacional
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Visão mensal de escalas, folgas e afastamentos
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"><ChevronLeft size={20} /></button>
                        <div className="px-6 font-bold text-sm min-w-[150px] text-center uppercase tracking-widest">
                            {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </div>
                        <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className={`mb-8 flex flex-col md:flex-row gap-4 items-center justify-between`}>
                <div className="relative w-full md:w-96">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
                    <input
                        type="text"
                        placeholder="Buscar colaborador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 rounded-2xl border outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 shadow-sm'}`}
                    />
                </div>

                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-bold opacity-60 uppercase tracking-tighter">Trabalho</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                        <span className="text-xs font-bold opacity-60 uppercase tracking-tighter">Folga</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                        <span className="text-xs font-bold opacity-60 uppercase tracking-tighter">Afastamento</span>
                    </div>
                </div>
            </div>

            {/* Calendar Grid Container */}
            <div className={`${cardClass} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className={`border-b ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}`}>
                                <th className="sticky left-0 z-10 p-4 min-w-[200px] border-r dark:border-slate-700/50 bg-inherit text-left text-[10px] font-black uppercase tracking-widest opacity-40">Colaborador</th>
                                {daysArray.map(day => {
                                    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    return (
                                        <th key={day} className={`p-2 min-w-[40px] text-center text-[10px] font-black uppercase border-r dark:border-slate-700/50 ${isWeekend ? 'opacity-30' : 'opacity-60'}`}>
                                            <div>{day}</div>
                                            <div className="text-[8px]">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3)}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                            {loading ? (
                                <tr><td colSpan={daysInMonth + 1} className="p-20 text-center"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr><td colSpan={daysInMonth + 1} className="p-20 text-center opacity-40 font-bold">Nenhum colaborador encontrado.</td></tr>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className={`${isDark ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50'} transition-colors`}>
                                        <td className="sticky left-0 z-10 p-4 border-r dark:border-slate-700/50 bg-inherit shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold text-xs uppercase">
                                                    {emp.nome.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold truncate max-w-[140px]">{emp.nome}</p>
                                                    <p className="text-[8px] font-black opacity-30 uppercase tracking-widest leading-none mt-1">{(emp as any).setor?.nome || 'Operacional'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {daysArray.map(day => {
                                            const info = getDiaInfo(emp.id, day);
                                            let cellClass = "";
                                            let title = "";

                                            if (info.hasAbsence) {
                                                cellClass = "bg-orange-400";
                                                title = info.absenceName || "Afastamento";
                                            } else if (info.isWorking) {
                                                cellClass = "bg-emerald-500";
                                                title = info.shiftHours || "Trabalho";
                                            } else {
                                                cellClass = isDark ? "bg-slate-700/50" : "bg-slate-100";
                                                title = "Folga";
                                            }

                                            return (
                                                <td key={day} className="p-1 border-r dark:border-slate-700/50 text-center relative group" title={title}>
                                                    <div className={`w-full h-8 rounded-lg ${cellClass} flex items-center justify-center transition-all group-hover:scale-95 cursor-default`}>
                                                        {info.hasAbsence && <Info size={12} className="text-white opacity-60" />}
                                                        {info.isWorking && !info.hasAbsence && <div className="w-1 h-3 bg-white/30 rounded-full animate-pulse"></div>}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend Mobile / Info */}
            <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-3 p-4 bg-primary-500/5 rounded-2xl border border-primary-500/20">
                    <Info size={16} className="text-primary-500" />
                    <p className="text-xs font-medium opacity-60 italic">
                        As escalas 12x36 são calculadas a partir da "Data de Início" configurada no contrato do colaborador.
                    </p>
                </div>

                <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-bold text-sm shadow-lg hover:opacity-90 transition-all">
                    <Download size={16} />
                    Exportar Grade Mensal
                </button>
            </div>
        </div>
    );
};

export default CalendarioVisual;
