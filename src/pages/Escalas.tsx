import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Calendar,
    Plus,
    Edit2,
    Trash2,
    CheckCircle2,
    X,
    Save,
    Clock,
    Layout,
    ArrowRight,
    Search,
    Users,
    Moon,
    ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EscalaServico {
    id: string;
    empresa_id: string;
    nome: string;
    tipo: 'NORMAL' | 'HORISTA' | 'FLEXIVEL' | '12X36' | 'PLANTAO';
    cor: string;
    carga_horaria_diaria: number;
    carga_horaria_semanal: number;
    ativo: boolean;
    possui_adicional_noturno?: boolean;
    possui_hora_noturna_reduzida?: boolean;
    gerar_folga_automatica?: boolean;
    horario_virada?: string;
}

const formatMinutos = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const parseMinutos = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + (m || 0);
};

interface EscalaHorario {
    id: string;
    escala_id: string;
    dia_semana: number;
    entrada: string;
    saida_almoco: string;
    retorno_almoco: string;
    saida: string;
    is_folga: boolean;
}

const Escalas = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();

    const [escalas, setEscalas] = useState<EscalaServico[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingEscala, setEditingEscala] = useState<EscalaServico | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEmployeesModalOpen, setIsEmployeesModalOpen] = useState(false);
    const [employeesInScale, setEmployeesInScale] = useState<any[]>([]);
    const [selectedEscalaName, setSelectedEscalaName] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [allEmployees, setAllEmployees] = useState<any[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [selectedEscalaId, setSelectedEscalaId] = useState<string | null>(null);
    const [isExceptionsModalOpen, setIsExceptionsModalOpen] = useState(false);
    const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
    const [exceptions, setExceptions] = useState<any[]>([]);
    const [exceptionForm, setExceptionForm] = useState({
        funcionario_id: '',
        data: new Date().toISOString().split('T')[0],
        tipo: 'FOLGA' as 'FOLGA' | 'TROCA' | 'EXTRA' | 'PLANTAO',
        observacoes: ''
    });

    const [form, setForm] = useState<Partial<EscalaServico>>({
        nome: '',
        tipo: 'NORMAL',
        cor: '#3B82F6',
        carga_horaria_diaria: 480,
        carga_horaria_semanal: 2640,
        ativo: true,
        possui_adicional_noturno: false,
        possui_hora_noturna_reduzida: false,
        gerar_folga_automatica: false,
        horario_virada: '12:00'
    });

    const [horarios, setHorarios] = useState<Partial<EscalaHorario>[]>(
        Array.from({ length: 7 }, (_, i) => ({
            dia_semana: i,
            entrada: '08:00',
            saida_almoco: '12:00',
            retorno_almoco: '13:00',
            saida: '17:00',
            is_folga: i === 0 || i === 6 // Sab e Dom folga por padrão
        }))
    );

    useEffect(() => {
        if (form.tipo === '12X36') {
            setForm(prev => ({ ...prev, carga_horaria_diaria: 720 })); // 12h = 720 min
        }
    }, [form.tipo]);

    useEffect(() => {
        if (profile?.empresa_id) {
            fetchEscalas();
        }
    }, [profile?.empresa_id]);

    const fetchEscalas = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('escalas_servico')
                .select(`
                    *,
                    funcionarios_escalas(count)
                `)
                .eq('empresa_id', profile?.empresa_id)
                .order('nome');

            if (error) throw error;
            setEscalas(data || []);
        } catch (error) {
            console.error('Erro ao buscar escalas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!profile?.empresa_id) return;
        setSaving(true);
        try {
            let escalaId = editingEscala?.id;

            // Payload Cleaning: Manter APENAS colunas reais da tabela escalas_servico
            const escalaData = {
                nome: form.nome,
                tipo: form.tipo,
                cor: form.cor,
                carga_horaria_diaria: form.carga_horaria_diaria,
                carga_horaria_semanal: form.carga_horaria_semanal,
                ativo: form.ativo,
                possui_adicional_noturno: form.possui_adicional_noturno,
                possui_hora_noturna_reduzida: form.possui_hora_noturna_reduzida,
                gerar_folga_automatica: form.gerar_folga_automatica,
                horario_virada: form.horario_virada,
                updated_at: new Date()
            };

            if (editingEscala) {
                const { error } = await supabase
                    .from('escalas_servico')
                    .update(escalaData)
                    .eq('id', editingEscala.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('escalas_servico')
                    .insert([{ ...escalaData, empresa_id: profile.empresa_id }])
                    .select()
                    .single();
                if (error) throw error;
                escalaId = data.id;
            }

            // Salvar horários
            if (form.tipo === 'NORMAL' || form.tipo === '12X36') {
                await supabase.from('escalas_horarios').delete().eq('escala_id', escalaId);
                const horariosToInsert = horarios.map(h => ({
                    ...h,
                    escala_id: escalaId
                }));
                const { error: hError } = await supabase.from('escalas_horarios').insert(horariosToInsert);
                if (hError) throw hError;
            }

            // Salvar Vínculos de Colaboradores (Many-to-Many)
            // 1. Buscar vínculos atuais para esta escala
            const { data: currentLinks } = await supabase
                .from('funcionarios_escalas')
                .select('funcionario_id')
                .eq('escala_id', escalaId)
                .eq('empresa_id', profile.empresa_id);

            const currentLinkedIds = currentLinks?.map(l => l.funcionario_id) || [];

            // 2. Identificar novos e removidos
            const toAdd = selectedEmployees.filter(id => !currentLinkedIds.includes(id));
            const toRemove = currentLinkedIds.filter(id => !selectedEmployees.includes(id));

            // 3. Remover vínculos (Marcar como inativo ou deletar - aqui deletaremos para simplicidade no MVP)
            if (toRemove.length > 0) {
                await supabase
                    .from('funcionarios_escalas')
                    .delete()
                    .eq('escala_id', escalaId)
                    .eq('empresa_id', profile.empresa_id)
                    .in('funcionario_id', toRemove);
            }

            // 4. Adicionar novos vínculos
            if (toAdd.length > 0) {
                const dataInicio = (document.getElementById('data_inicio_vinculo') as HTMLInputElement)?.value || new Date().toISOString().split('T')[0];
                const linksToInsert = toAdd.map(empId => ({
                    funcionario_id: empId,
                    escala_id: escalaId,
                    empresa_id: profile.empresa_id,
                    data_inicio: dataInicio,
                    ativo: true
                }));
                const { error: linkError } = await supabase.from('funcionarios_escalas').insert(linksToInsert);
                if (linkError) throw linkError;
            }

            setIsModalOpen(false);
            fetchEscalas();
        } catch (error: any) {
            alert('Erro ao salvar escala: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta escala? Isso removerá todos os vínculos de colaboradores e horários associados.')) return;
        try {
            // 1. Limpar referências na tabela de funcionários (coluna legada escala_id)
            await supabase
                .from('funcionarios')
                .update({ escala_id: null })
                .eq('escala_id', id);

            // 2. Remover exceções associadas (se houver)
            // Fazemos deletes individuais para garantir que funcionará mesmo se o .or falhar
            await supabase.from('escalas_excecoes').delete().eq('escala_original_id', id);
            await supabase.from('escalas_excecoes').delete().eq('escala_nova_id', id);

            // 3. Remover horários e vínculos explicitamente (garantia extra ao CASCADE)
            await supabase.from('escalas_horarios').delete().eq('escala_id', id);
            await supabase.from('funcionarios_escalas').delete().eq('escala_id', id);

            // 4. Excluir a escala propriamente dita
            const { error } = await supabase
                .from('escalas_servico')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchEscalas();
        } catch (error: any) {
            console.error('Erro ao excluir escala:', error);
            alert('Erro ao excluir escala: ' + error.message);
        }
    };

    const handleOpenModal = async (escala: EscalaServico | null = null) => {
        setCurrentStep(1);
        setSelectedEmployees([]); // Limpar seleção anterior

        // Buscar todos os funcionários da empresa para o passo 4
        if (profile?.empresa_id) {
            const { data: emps } = await supabase
                .from('funcionarios')
                .select('id, nome, email, setores(nome)')
                .eq('empresa_id', profile.empresa_id)
                .order('nome');
            setAllEmployees(emps || []);
        }

        if (escala) {
            setEditingEscala(escala);
            setForm(escala);

            // Buscar horários da escala
            const { data: hData } = await supabase
                .from('escalas_horarios')
                .select('*')
                .eq('escala_id', escala.id)
                .order('dia_semana');

            if (hData && hData.length > 0) {
                setHorarios(hData);
            }

            // Buscar funcionários vinculados a esta escala
            const { data: linkedEmps } = await supabase
                .from('funcionarios_escalas')
                .select('funcionario_id')
                .eq('escala_id', escala.id)
                .eq('ativo', true);

            if (linkedEmps) {
                setSelectedEmployees(linkedEmps.map(l => l.funcionario_id));
            }
        } else {
            setForm({
                nome: '',
                tipo: 'NORMAL',
                cor: '#3B82F6',
                carga_horaria_diaria: 480,
                carga_horaria_semanal: 2640,
                ativo: true,
                possui_adicional_noturno: false,
                possui_hora_noturna_reduzida: false,
                gerar_folga_automatica: false,
                horario_virada: '12:00'
            });
            setHorarios(Array.from({ length: 7 }, (_, i) => ({
                dia_semana: i,
                entrada: '08:00',
                saida_almoco: '12:00',
                retorno_almoco: '13:00',
                saida: '17:00',
                is_folga: i === 0 || i === 6
            })));
            setSelectedEmployees([]);
            setSearchTerm('');
        }
        setIsModalOpen(true);
    };

    const filteredEscalas = escalas.filter(e =>
        e.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenEmployees = async (escala: EscalaServico) => {
        setSelectedEscalaName(escala.nome);
        setSelectedEscalaId(escala.id);
        setIsEmployeesModalOpen(true);
        try {
            const { data, error } = await supabase
                .from('funcionarios_escalas')
                .select(`
                    funcionario_id,
                    funcionarios (
                        id,
                        nome,
                        email,
                        setores (nome)
                    )
                `)
                .eq('escala_id', escala.id)
                .eq('ativo', true);

            if (error) throw error;

            // Mapear para o formato esperado pelo componente
            const mappedEmployees = data?.map(item => ({
                ...(item.funcionarios as any)
            })) || [];

            setEmployeesInScale(mappedEmployees);
        } catch (error) {
            console.error('Erro ao buscar funcionários da escala:', error);
        }
    };

    const handleOpenAssignModal = async () => {
        setIsAssignModalOpen(true);
        // O restante da lógica agora é gerenciado pelo Wizard Step 4
    };

    const handleOpenExceptions = async (escala: EscalaServico) => {
        setSelectedEscalaName(escala.nome);
        setSelectedEscalaId(escala.id);
        setIsExceptionsModalOpen(true);
        try {
            // Buscar funcionários desta escala para o dropdown de exceção
            const { data: emps } = await supabase
                .from('funcionarios')
                .select('id, nome')
                .eq('escala_id', escala.id);
            setEmployeesInScale(emps || []);

            // Buscar exceções recentes relacionadas a esta escala
            const { data: excps } = await supabase
                .from('escalas_excecoes')
                .select('*, funcionarios(nome)')
                .eq('escala_original_id', escala.id)
                .order('data', { ascending: false })
                .limit(20);
            setExceptions(excps || []);
        } catch (error) {
            console.error('Erro ao buscar exceções:', error);
        }
    };

    const handleSaveException = async () => {
        if (!exceptionForm.funcionario_id || !exceptionForm.data) {
            alert('Selecione o funcionário e a data.');
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase
                .from('escalas_excecoes')
                .insert([{
                    ...exceptionForm,
                    escala_original_id: selectedEscalaId
                }]);

            if (error) throw error;
            setIsExceptionsModalOpen(false);
            alert('Exceção registrada com sucesso!');
        } catch (error: any) {
            alert('Erro ao salvar exceção: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const DIAS_NOMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Escalas de Serviço</h1>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gerencie jornadas, plantões e escalas 12x36</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar escala..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 rounded-xl border outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-white border-slate-200 focus:border-primary-500'
                                }`}
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-all shadow-glow whitespace-nowrap"
                    >
                        <Plus size={20} /> Nova Escala
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEscalas.map((escala) => (
                        <motion.div
                            key={escala.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`group relative p-6 rounded-[32px] border transition-all duration-300 ${isDark
                                ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-primary-500/50'
                                : 'bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-primary-500/50'
                                }`}
                        >
                            {/* Decorative Background Icon */}
                            <div className="absolute top-6 right-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                                <Layout size={80} />
                            </div>

                            <div className="flex justify-between items-start mb-6">
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current/20 transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: escala.cor }}
                                >
                                    <Clock size={28} />
                                </div>
                                <div className="flex gap-1">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mr-2">
                                        <Users size={14} className="text-primary-500" />
                                        <span className={`text-[10px] font-black ${(escala as any).funcionarios_escalas?.[0]?.count > 0 ? 'text-primary-500' : 'text-slate-400'}`}>
                                            {(escala as any).funcionarios_escalas?.[0]?.count || 0}
                                        </span>
                                    </div>
                                    <button onClick={() => handleOpenEmployees(escala)} className={`p-2.5 rounded-xl transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-primary-600'}`} title="Ver Colaboradores">
                                        <Users size={18} />
                                    </button>
                                    <button onClick={() => handleOpenExceptions(escala)} className={`p-2.5 rounded-xl transition-all ${isDark ? 'hover:bg-rose-500/10 text-rose-400 hover:text-rose-500' : 'hover:bg-rose-50 text-rose-500'}`} title="Registrar Exceção (Folga/Troca)">
                                        <Calendar size={18} />
                                    </button>
                                    <button onClick={() => handleOpenModal(escala)} className={`p-2.5 rounded-xl transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-primary-600'}`}>
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(escala.id)} className={`p-2.5 rounded-xl transition-all ${isDark ? 'hover:bg-rose-500/10 text-rose-400 hover:text-rose-500' : 'hover:bg-rose-50 text-rose-500'}`}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{escala.nome}</h3>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    <span className={`text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-widest ${isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {escala.tipo}
                                    </span>
                                    {escala.possui_adicional_noturno && (
                                        <span className="text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-widest bg-indigo-500/10 text-indigo-500">Noturno</span>
                                    )}
                                    {!escala.ativo && (
                                        <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2.5 py-1 rounded-lg uppercase font-bold tracking-widest">Inativo</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-slate-700/10 pt-5">
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Carga Diária</span>
                                        <span className={`text-lg font-black ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                            {formatMinutos(escala.carga_horaria_diaria)}h
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Semanal</span>
                                        <span className={`text-lg font-black ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                            {formatMinutos(escala.carga_horaria_semanal)}h
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline Preview (Static for now to illustrate) */}
                            <div className="mt-6 h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden flex">
                                <div className="h-full bg-primary-500/20" style={{ width: '30%' }} />
                                <div className="h-full" style={{ width: '10%', backgroundColor: escala.cor }} />
                                <div className="h-full bg-primary-500/20" style={{ width: '40%' }} />
                                <div className="h-full" style={{ width: '10%', backgroundColor: escala.cor }} />
                                <div className="h-full bg-primary-500/20" style={{ width: '10%' }} />
                            </div>
                        </motion.div>
                    ))}

                    {filteredEscalas.length === 0 && (
                        <div className="col-span-full py-12 text-center">
                            <Layout size={48} className="mx-auto text-slate-400 mb-4 opacity-20" />
                            <p className={isDark ? 'text-slate-500' : 'text-slate-400'}>Nenhuma escala encontrada</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Cadastro/Edição com Wizard */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={`w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden transition-all duration-500 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'
                                }`}
                        >
                            {/* Header do Wizard */}
                            <div className={`p-8 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20`}>
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4].map(step => (
                                            <div
                                                key={step}
                                                className={`h-2 rounded-full transition-all duration-500 ${currentStep === step ? 'w-8 bg-primary-500' : 'w-2 bg-slate-300 dark:bg-slate-700 opacity-50'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div>
                                        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                            {editingEscala ? `Editando: ${form.nome}` : 'Criar Nova Escala'}
                                        </h2>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-primary-500">
                                            Passo {currentStep} de 4: {
                                                currentStep === 1 ? 'Tipo de Jornada' :
                                                    currentStep === 2 ? 'Horários e Carga' :
                                                        currentStep === 3 ? 'Configurações Avançadas' :
                                                            'Vincular Colaboradores'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className={`p-2 rounded-2xl transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-10 flex-1 overflow-y-auto">
                                <AnimatePresence mode="wait">
                                    {currentStep === 1 && (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-8"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="col-span-full">
                                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nome Identificador</label>
                                                    <input
                                                        type="text"
                                                        value={form.nome}
                                                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                                        placeholder="Ex: Comercial 44h Flex"
                                                        className={`w-full px-6 py-4 rounded-2xl border text-lg font-medium outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                                    />
                                                </div>

                                                <div className="col-span-full">
                                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Selecione o Modelo de Escala</label>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                        {[
                                                            { id: 'NORMAL', label: 'Normal (CLT)', desc: 'Entrada/Saída fixas todos os dias.', icon: Clock },
                                                            { id: '12X36', label: '12h x 36h', desc: 'Trabalha 12h e folga as próximas 36h.', icon: Calendar },
                                                            { id: 'FLEXIVEL', label: 'Flexível', desc: 'Sem horários fixos, apenas carga semanal.', icon: Layout },
                                                            { id: 'HORISTA', label: 'Horista', desc: 'Pagamento proporcional às horas efetuadas.', icon: Users },
                                                            { id: 'PLANTAO', label: 'Plantão', desc: 'Escalas eventuais com horários diversos.', icon: Plus }
                                                        ].map(tipo => (
                                                            <button
                                                                key={tipo.id}
                                                                onClick={() => setForm({ ...form, tipo: tipo.id as any })}
                                                                className={`p-6 rounded-3xl border text-left transition-all duration-300 ${form.tipo === tipo.id
                                                                    ? 'bg-primary-500 border-primary-500 text-white shadow-xl shadow-primary-500/20 scale-[1.02]'
                                                                    : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:border-primary-200')
                                                                    }`}
                                                            >
                                                                <tipo.icon size={28} className={form.tipo === tipo.id ? 'text-white' : 'text-primary-500'} />
                                                                <p className="font-bold mt-4 text-sm">{tipo.label}</p>
                                                                <p className={`text-[10px] mt-1 leading-relaxed ${form.tipo === tipo.id ? 'text-white/70' : 'text-slate-500'}`}>{tipo.desc}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Identificação Visual</label>
                                                    <div className="flex gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                                                        {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map(c => (
                                                            <button
                                                                key={c}
                                                                onClick={() => setForm({ ...form, cor: c })}
                                                                className={`w-8 h-8 rounded-xl transition-all ${form.cor === c ? 'scale-110 ring-2 ring-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                                                style={{ backgroundColor: c }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {currentStep === 2 && (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-8"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-6">
                                                    <div className="p-6 bg-primary-500/5 rounded-[32px] border border-primary-500/10">
                                                        <h4 className="text-sm font-bold text-primary-500 mb-4 flex items-center gap-2">
                                                            <Clock size={16} /> Carga Horária Estimada
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div>
                                                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Média Diária</label>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="24"
                                                                            value={Math.floor((form.carga_horaria_diaria || 0) / 60)}
                                                                            onChange={(e) => {
                                                                                const h = parseInt(e.target.value) || 0;
                                                                                const m = (form.carga_horaria_diaria || 0) % 60;
                                                                                setForm({ ...form, carga_horaria_diaria: (h * 60) + m });
                                                                            }}
                                                                            className={`w-full text-2xl font-black bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border-none outline-none ${isDark ? 'text-white' : 'text-slate-800'}`}
                                                                        />
                                                                        <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">Horas</span>
                                                                    </div>
                                                                    <span className="text-xl font-bold text-slate-300">:</span>
                                                                    <div className="flex-1">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="59"
                                                                            value={(form.carga_horaria_diaria || 0) % 60}
                                                                            onChange={(e) => {
                                                                                const m = parseInt(e.target.value) || 0;
                                                                                const h = Math.floor((form.carga_horaria_diaria || 0) / 60);
                                                                                setForm({ ...form, carga_horaria_diaria: (h * 60) + m });
                                                                            }}
                                                                            className={`w-full text-2xl font-black bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border-none outline-none ${isDark ? 'text-white' : 'text-slate-800'}`}
                                                                        />
                                                                        <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">Minutos</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Total Semanal</label>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            value={Math.floor((form.carga_horaria_semanal || 0) / 60)}
                                                                            onChange={(e) => {
                                                                                const h = parseInt(e.target.value) || 0;
                                                                                const m = (form.carga_horaria_semanal || 0) % 60;
                                                                                setForm({ ...form, carga_horaria_semanal: (h * 60) + m });
                                                                            }}
                                                                            className={`w-full text-2xl font-black bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border-none outline-none ${isDark ? 'text-white' : 'text-slate-800'}`}
                                                                        />
                                                                        <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">Horas</span>
                                                                    </div>
                                                                    <span className="text-xl font-bold text-slate-300">:</span>
                                                                    <div className="flex-1">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="59"
                                                                            value={(form.carga_horaria_semanal || 0) % 60}
                                                                            onChange={(e) => {
                                                                                const m = parseInt(e.target.value) || 0;
                                                                                const h = Math.floor((form.carga_horaria_semanal || 0) / 60);
                                                                                setForm({ ...form, carga_horaria_semanal: (h * 60) + m });
                                                                            }}
                                                                            className={`w-full text-2xl font-black bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border-none outline-none ${isDark ? 'text-white' : 'text-slate-800'}`}
                                                                        />
                                                                        <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">Minutos</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={`p-6 rounded-[32px] border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                                        <p className="text-xs leading-relaxed text-slate-500 italic">
                                                            Configure os horários padrão desta escala. Para escalas do tipo <strong>NORMAL</strong>, estes serão os horários fixos exigidos.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-primary-500/20">
                                                    {form.tipo === 'NORMAL' && (
                                                        <div className="flex justify-end mb-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const firstDay = horarios[1] || horarios[0]; // Segunda ou Domingo
                                                                    setHorarios(horarios.map(h => ({
                                                                        ...h,
                                                                        entrada: firstDay.entrada,
                                                                        saida_almoco: firstDay.saida_almoco,
                                                                        retorno_almoco: firstDay.retorno_almoco,
                                                                        saida: firstDay.saida,
                                                                        is_folga: h.dia_semana === 0 || h.dia_semana === 6 // Mantém folga fds
                                                                    })));
                                                                }}
                                                                className="text-[10px] uppercase font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1"
                                                            >
                                                                <Layout size={12} /> Replicar Segunda para todos
                                                            </button>
                                                        </div>
                                                    )}

                                                    {form.tipo === '12X36' ? (
                                                        <div className={`p-8 rounded-[32px] border ${isDark ? 'bg-slate-800/80 border-slate-700 shadow-lg' : 'bg-white border-slate-100 shadow-md'}`}>
                                                            <div className="flex items-center gap-4 mb-6">
                                                                <div className="w-10 h-10 bg-primary-500/10 text-primary-500 rounded-2xl flex items-center justify-center">
                                                                    <Clock size={20} />
                                                                </div>
                                                                <div>
                                                                    <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Horário do Turno 12h</h4>
                                                                    <p className="text-[10px] text-slate-500">Este horário será repetido ciclicamente a cada 48h.</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-4 gap-3">
                                                                {[
                                                                    { label: 'Entrada', key: 'entrada' },
                                                                    { label: 'Intervalo', key: 'saida_almoco' },
                                                                    { label: 'Retorno', key: 'retorno_almoco' },
                                                                    { label: 'Saída', key: 'saida' }
                                                                ].map((col) => (
                                                                    <div key={col.key}>
                                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">{col.label}</span>
                                                                        <input
                                                                            type="time"
                                                                            value={(horarios[1] as any)[col.key]}
                                                                            onChange={(e) => {
                                                                                const newH = [...horarios];
                                                                                // Para 12x36, aplicamos o mesmo horário para todos os dias internos da lógica
                                                                                // mas o que importa é o padrão. Para simplificar, atualizamos todos.
                                                                                newH.forEach(h => (h as any)[col.key] = e.target.value);
                                                                                setHorarios(newH);
                                                                            }}
                                                                            className={`w-full text-sm font-bold p-1 rounded bg-transparent border-b ${isDark ? 'text-white border-slate-700' : 'text-slate-900 border-slate-200'} focus:border-primary-500 outline-none`}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        horarios.map((h, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`p-5 rounded-[24px] border transition-all ${h.is_folga
                                                                    ? (isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-100 opacity-60')
                                                                    : (isDark ? 'bg-slate-800/80 border-slate-700 shadow-lg' : 'bg-white border-slate-100 shadow-md')
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{DIAS_NOMES[h.dia_semana!]}</span>
                                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${h.is_folga ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                                            <div
                                                                                onClick={() => {
                                                                                    const newH = [...horarios];
                                                                                    newH[idx].is_folga = !h.is_folga;
                                                                                    setHorarios(newH);
                                                                                }}
                                                                                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${h.is_folga ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-[10px] uppercase font-bold text-slate-500">Folga</span>
                                                                    </label>
                                                                </div>

                                                                {!h.is_folga && (
                                                                    <div className="grid grid-cols-4 gap-3">
                                                                        {[
                                                                            { label: 'Entrada', key: 'entrada' },
                                                                            { label: 'Intervalo', key: 'saida_almoco' },
                                                                            { label: 'Retorno', key: 'retorno_almoco' },
                                                                            { label: 'Saída', key: 'saida' }
                                                                        ].map((col) => (
                                                                            <div key={col.key}>
                                                                                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">{col.label}</span>
                                                                                <input
                                                                                    type="time"
                                                                                    value={(h as any)[col.key]}
                                                                                    onChange={(e) => {
                                                                                        const newH = [...horarios];
                                                                                        (newH[idx] as any)[col.key] = e.target.value;
                                                                                        setHorarios(newH);
                                                                                    }}
                                                                                    className={`w-full text-sm font-bold p-1 rounded bg-transparent border-b ${isDark ? 'text-white border-slate-700' : 'text-slate-900 border-slate-200'} focus:border-primary-500 outline-none`}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {currentStep === 3 && (
                                        <motion.div
                                            key="step3"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-8"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-6">
                                                    <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Parâmetros Legais e Extras</h3>

                                                    <div className="space-y-4">
                                                        {[
                                                            { id: 'possui_adicional_noturno', label: 'Cálculo de Adicional Noturno', desc: 'Aplica percentual sobre horas entre 22:00 e 05:00.', icon: Moon },
                                                            { id: 'possui_hora_noturna_reduzida', label: 'Hora Noturna Reduzida', desc: 'Considera hora de 52m30s para cálculos legais.', icon: Clock },
                                                            { id: 'gerar_folga_automatica', label: 'Folgas Automáticas (12x36)', desc: 'Sistema gera os dias de folga no calendário automaticamente.', icon: Calendar }
                                                        ].map(config => (
                                                            <label
                                                                key={config.id}
                                                                className={`flex items-start gap-4 p-6 rounded-3xl border cursor-pointer transition-all ${form[config.id as keyof EscalaServico]
                                                                    ? 'bg-primary-500/5 border-primary-500/30'
                                                                    : (isDark ? 'bg-slate-800/30 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                                                                    }`}
                                                            >
                                                                <div className={`p-2.5 rounded-xl ${form[config.id as keyof EscalaServico] ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                                                    <config.icon size={20} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{config.label}</p>
                                                                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{config.desc}</p>
                                                                </div>
                                                                <div className={`w-12 h-6 rounded-full relative transition-colors border-2 ${form[config.id as keyof EscalaServico] ? 'bg-primary-500 border-primary-500' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="hidden"
                                                                        checked={!!form[config.id as keyof EscalaServico]}
                                                                        onChange={(e) => setForm({ ...form, [config.id]: e.target.checked })}
                                                                    />
                                                                    <motion.div
                                                                        animate={{ x: form[config.id as keyof EscalaServico] ? 24 : 2 }}
                                                                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                                                                    ></motion.div>
                                                                </div>
                                                            </label>
                                                        ))}

                                                        <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Horário de Virada do Dia</label>
                                                            <div className="flex items-center gap-3">
                                                                <Clock size={16} className="text-primary-500" />
                                                                <input
                                                                    type="time"
                                                                    value={form.horario_virada || '12:00'}
                                                                    onChange={(e) => setForm({ ...form, horario_virada: e.target.value })}
                                                                    className={`bg-transparent font-bold outline-none ${isDark ? 'text-white' : 'text-slate-900'}`}
                                                                />
                                                            </div>
                                                            <p className="text-[9px] text-slate-500 mt-2">Define quando termina a jornada de um dia e começa a do próximo (útil para plantões noturnos).</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {currentStep === 4 && (
                                        <motion.div
                                            key="step4"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-6">
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Selecionar Colaborador</label>
                                                        <div className="relative">
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border outline-none text-sm font-bold transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <Users size={16} className="text-slate-400" />
                                                                    <span>{searchTerm || 'Selecione um colaborador...'}</span>
                                                                </div>
                                                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isEmployeeDropdownOpen ? 'rotate-180' : ''}`} />
                                                            </button>

                                                            {isEmployeeDropdownOpen && (
                                                                <div className={`absolute z-[100] w-full mt-2 rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                                                    <div className={`p-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                                                                        <div className="relative">
                                                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                            <input
                                                                                type="text"
                                                                                autoFocus
                                                                                placeholder="Filtrar por nome..."
                                                                                className={`w-full pl-9 pr-4 py-2 rounded-xl border outline-none text-[12px] font-bold ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                                                                value={searchTerm}
                                                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="max-h-[250px] overflow-y-auto scrollbar-thin">
                                                                        {allEmployees
                                                                            .filter(emp => !selectedEmployees.includes(emp.id) && (emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) || emp.email.toLowerCase().includes(searchTerm.toLowerCase())))
                                                                            .length > 0 ? (
                                                                            allEmployees
                                                                                .filter(emp => !selectedEmployees.includes(emp.id) && (emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) || emp.email.toLowerCase().includes(searchTerm.toLowerCase())))
                                                                                .map(emp => (
                                                                                    <button
                                                                                        key={emp.id}
                                                                                        type="button"
                                                                                        className={`w-full p-3 flex items-center justify-between text-left hover:bg-primary-500/10 transition-colors border-b last:border-0 ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'}`}
                                                                                        onClick={() => {
                                                                                            setSelectedEmployees([...selectedEmployees, emp.id]);
                                                                                            setSearchTerm('');
                                                                                            setIsEmployeeDropdownOpen(false);
                                                                                        }}
                                                                                    >
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-500">
                                                                                                {emp.nome.charAt(0)}
                                                                                            </div>
                                                                                            <div>
                                                                                                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{emp.nome}</p>
                                                                                                <p className="text-[9px] text-slate-500">{(emp.setores as any)?.nome || 'Sem Setor'}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <Plus size={14} className="text-primary-500" />
                                                                                    </button>
                                                                                ))
                                                                        ) : (
                                                                            <div className="p-8 text-center text-xs text-slate-500">
                                                                                Nenhum colaborador disponível
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Dica de Vínculo</label>
                                                        <div className={`p-6 rounded-[32px] border ${isDark ? 'bg-primary-500/5 border-primary-500/20' : 'bg-primary-50/50 border-primary-100'}`}>
                                                            <div className="flex items-center gap-4">
                                                                <Users size={24} className="text-primary-500" />
                                                                <p className="text-[10px] text-slate-500 leading-normal uppercase font-bold tracking-wider">
                                                                    Vincule colaboradores à escala para que seus pontos sejam calculados corretamente.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Início do Vínculo</label>
                                                        <input
                                                            type="date"
                                                            id="data_inicio_vinculo"
                                                            defaultValue={new Date().toISOString().split('T')[0]}
                                                            className={`w-full px-4 py-3 rounded-2xl border outline-none text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`rounded-[32px] border overflow-hidden ${isDark ? 'bg-slate-800/20 border-slate-700' : 'bg-white border-slate-200'}`}>
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className={`border-b ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-slate-100 bg-slate-50/50'}`}>
                                                            <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest pl-6">Colaborador</th>
                                                            <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">Setor</th>
                                                            <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest text-center">Ação</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                        {allEmployees
                                                            .filter(emp => selectedEmployees.includes(emp.id))
                                                            .map(emp => (
                                                                <tr key={emp.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                                    <td className="p-4 pl-6">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-500">
                                                                                {emp.nome.charAt(0)}
                                                                            </div>
                                                                            <div>
                                                                                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{emp.nome}</p>
                                                                                <p className="text-[10px] text-slate-500">{emp.email}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <span className={`text-[10px] px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                                            {(emp.setores as any)?.nome || 'Sem Setor'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-4 text-center">
                                                                        <button
                                                                            onClick={() => setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id))}
                                                                            className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-40 group-hover:opacity-100"
                                                                            title="Remover"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        {selectedEmployees.length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="p-12 text-center">
                                                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                                                        <Users size={40} className="text-slate-400" />
                                                                        <p className="text-sm font-bold text-slate-500">Nenhum colaborador selecionado</p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className={`p-6 rounded-[32px] border ${isDark ? 'bg-primary-500/5 border-primary-500/20' : 'bg-primary-50/50 border-primary-100'}`}>
                                                <div className="flex items-center gap-4">
                                                    <Users size={24} className="text-primary-500" />
                                                    <p className="text-xs text-slate-500 leading-relaxed">
                                                        <strong>{selectedEmployees.length}</strong> colaboradores vinculados. Use o campo de busca acima para adicionar novos.
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className={`p-10 flex gap-4 bg-slate-50/80 dark:bg-slate-800/40 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                {currentStep > 1 ? (
                                    <button
                                        onClick={() => setCurrentStep(currentStep - 1)}
                                        className={`flex-1 px-8 py-5 rounded-[24px] font-bold transition-all border-2 ${isDark ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                                    >
                                        Volar ao Passo Anterior
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className={`flex-1 px-8 py-5 rounded-[24px] font-bold transition-all border-2 ${isDark ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                                    >
                                        Cancelar
                                    </button>
                                )}

                                {currentStep < 4 ? (
                                    <button
                                        onClick={() => setCurrentStep(currentStep + 1)}
                                        className="flex-1 px-8 py-5 bg-primary-500 hover:bg-primary-600 text-white rounded-[24px] font-bold transition-all shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 group"
                                    >
                                        Próximo Passo <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-1 px-8 py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-[24px] font-bold transition-all shadow-xl shadow-primary-600/30 flex items-center justify-center gap-3"
                                    >
                                        {saving ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={20} /> Finalizar e Salvar</>}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Lista de Funcionários */}
            <AnimatePresence>
                {isEmployeesModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Colaboradores</h2>
                                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Escala: {selectedEscalaName}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleOpenAssignModal}
                                            className="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-glow transition-all"
                                            title="Vincular Novos"
                                        >
                                            <Plus size={20} />
                                        </button>
                                        <button onClick={() => setIsEmployeesModalOpen(false)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                    {employeesInScale.length > 0 ? (
                                        employeesInScale.map((emp, i) => (
                                            <div key={i} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                                <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{emp.nome}</p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{emp.email}</span>
                                                    <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{(emp.setores as any)?.nome || 'Sem Setor'}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center text-slate-500 text-sm italic">
                                            Nenhum colaborador vinculado a esta escala.
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8">
                                    <button
                                        onClick={() => setIsEmployeesModalOpen(false)}
                                        className={`w-full py-4 rounded-2xl font-bold ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} transition-all`}
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Vinculação em Massa */}
            <AnimatePresence>
                {isAssignModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className={`w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div>
                                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Vincular Colaboradores</h2>
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Selecione os funcionários para a escala: <span className="font-bold text-primary-500">{selectedEscalaName}</span></p>
                                </div>
                                <div className="flex flex-col items-end gap-2 pr-4">
                                    <label className="text-[10px] uppercase font-bold text-slate-500">Início da Escala (Âncora)</label>
                                    <input
                                        type="date"
                                        id="data_inicio_bulk"
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className={`px-4 py-2 rounded-xl border outline-none text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                    />
                                </div>
                                <button onClick={() => setIsAssignModalOpen(false)} className={`p-2 rounded-2xl transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-8 flex-1 overflow-y-auto space-y-3">
                                {allEmployees.map((emp) => (
                                    <div
                                        key={emp.id}
                                        onClick={() => {
                                            if (selectedEmployees.includes(emp.id)) {
                                                setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                            } else {
                                                setSelectedEmployees([...selectedEmployees, emp.id]);
                                            }
                                        }}
                                        className={`p-5 rounded-3xl border cursor-pointer transition-all flex items-center justify-between ${selectedEmployees.includes(emp.id)
                                            ? 'bg-primary-500/10 border-primary-500'
                                            : (isDark ? 'bg-slate-800/40 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${selectedEmployees.includes(emp.id) ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                                }`}>
                                                {emp.nome.charAt(0)}
                                            </div>
                                            <div>
                                                <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{emp.nome}</p>
                                                <p className="text-xs text-slate-500">{emp.email}</p>
                                                {emp.escala_id && emp.escala_id !== selectedEscalaId && (
                                                    <span className="text-[9px] uppercase font-black text-rose-500 mt-1 block">Já possui outra escala</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedEmployees.includes(emp.id) ? 'bg-primary-500 border-primary-500 text-white' : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                            {selectedEmployees.includes(emp.id) && <CheckCircle2 size={14} />}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-8 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                <button
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className={`flex-1 py-4 font-bold rounded-2xl ${isDark ? 'text-white' : 'text-slate-600 hover:bg-white transition-all'}`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleBulkAssign}
                                    disabled={saving || selectedEmployees.length === 0}
                                    className="flex-[2] py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-primary-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : `Vincular ${selectedEmployees.length} Selecionados`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Modal de Exceções e Ajustes Diários */}
            <AnimatePresence>
                {isExceptionsModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
                        >
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Ajustes e Exceções Diárias</h2>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-primary-500">Escala: {selectedEscalaName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsExceptionsModalOpen(false)} className={`p-2 rounded-2xl transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-10 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Formulário */}
                                <div className="space-y-6">
                                    <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Registrar Novo Ajuste</h3>

                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Colaborador</label>
                                        <select
                                            value={exceptionForm.funcionario_id}
                                            onChange={(e) => setExceptionForm({ ...exceptionForm, funcionario_id: e.target.value })}
                                            className={`w-full px-6 py-4 rounded-3xl border outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                        >
                                            <option value="">Selecione o Colaborador...</option>
                                            {employeesInScale.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.nome}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Data do Ajuste</label>
                                            <input
                                                type="date"
                                                value={exceptionForm.data}
                                                onChange={(e) => setExceptionForm({ ...exceptionForm, data: e.target.value })}
                                                className={`w-full px-6 py-4 rounded-3xl border outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Tipo de Ajuste</label>
                                            <select
                                                value={exceptionForm.tipo}
                                                onChange={(e) => setExceptionForm({ ...exceptionForm, tipo: e.target.value as any })}
                                                className={`w-full px-6 py-4 rounded-3xl border outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                            >
                                                <option value="FOLGA">Folga Pontual</option>
                                                <option value="TROCA">Troca de Horário</option>
                                                <option value="EXTRA">Hora Extra Agendada</option>
                                                <option value="PLANTAO">Plantão Extra</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Observações (Motivo)</label>
                                        <textarea
                                            value={exceptionForm.observacoes}
                                            onChange={(e) => setExceptionForm({ ...exceptionForm, observacoes: e.target.value })}
                                            placeholder="Descreva o motivo deste ajuste..."
                                            className={`w-full px-6 py-4 rounded-3xl border min-h-[120px] outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary-500'}`}
                                        ></textarea>
                                    </div>

                                    <button
                                        onClick={handleSaveException}
                                        disabled={saving}
                                        className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-[24px] font-bold transition-all shadow-xl shadow-rose-600/20 flex items-center justify-center gap-3"
                                    >
                                        {saving ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={20} /> Salvar Ajuste</>}
                                    </button>
                                </div>

                                {/* Histórico Recente */}
                                <div className="space-y-6">
                                    <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Últimos Ajustes Registrados</h3>
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                        {exceptions.length > 0 ? (
                                            exceptions.map((exc, i) => (
                                                <div key={i} className={`p-5 rounded-3xl border transition-all ${isDark ? 'bg-slate-800/40 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider ${exc.tipo === 'FOLGA' ? 'bg-green-500/10 text-green-500' :
                                                            exc.tipo === 'PLANTAO' ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'
                                                            }`}>
                                                            {exc.tipo}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {new Date(exc.data).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{exc.funcionarios?.nome}</p>
                                                    {exc.observacoes && (
                                                        <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 italic">"{exc.observacoes}"</p>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-12 opacity-30">
                                                <Calendar size={40} className="mx-auto mb-2" />
                                                <p className="text-xs italic">Nenhum ajuste registrado recentemente.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Escalas;
