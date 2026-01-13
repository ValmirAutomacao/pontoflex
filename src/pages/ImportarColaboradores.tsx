import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import {
    Upload,
    FileSpreadsheet,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Download,
    Trash2,
    ChevronLeft,
    Send,
    RefreshCw,
    User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface ImportRow {
    nome: string;
    email: string;
    cpf: string;
    telefone?: string;
    whatsapp?: string;
    data_admissao?: string;
    ctps?: string;
    pis_nis?: string;
    isValid: boolean;
    errors: string[];
}

const ImportarColaboradores: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
    const [parsedData, setParsedData] = useState<ImportRow[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState({ success: 0, failed: 0 });

    const validateCPF = (cpf: string): boolean => {
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length !== 11) return false;
        if (/^(\d)\1+$/.test(cleaned)) return false;

        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleaned[9])) return false;

        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        return remainder === parseInt(cleaned[10]);
    };

    const validateEmail = (email: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                // Skip header row
                const rows = jsonData.slice(1).filter(row => row.length > 0);

                const parsed: ImportRow[] = rows.map(row => {
                    const nome = String(row[0] || '').trim();
                    const email = String(row[1] || '').trim().toLowerCase();
                    const cpf = String(row[2] || '').replace(/\D/g, '');
                    const telefone = String(row[3] || '').trim();
                    const whatsapp = String(row[4] || '').trim();
                    const data_admissao = row[5] ? parseExcelDate(row[5]) : undefined;
                    const ctps = String(row[6] || '').trim();
                    const pis_nis = String(row[7] || '').trim();

                    const errors: string[] = [];
                    if (!nome) errors.push('Nome obrigatório');
                    if (!email) errors.push('E-mail obrigatório');
                    else if (!validateEmail(email)) errors.push('E-mail inválido');
                    if (!cpf) errors.push('CPF obrigatório');
                    else if (!validateCPF(cpf)) errors.push('CPF inválido');

                    return {
                        nome,
                        email,
                        cpf,
                        telefone: telefone || undefined,
                        whatsapp: whatsapp || undefined,
                        data_admissao,
                        ctps: ctps || undefined,
                        pis_nis: pis_nis || undefined,
                        isValid: errors.length === 0,
                        errors
                    };
                });

                setParsedData(parsed);
                setStep('preview');
            } catch (err) {
                console.error('Erro ao parsear arquivo:', err);
                alert('Erro ao ler o arquivo. Verifique se o formato está correto.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const parseExcelDate = (value: any): string | undefined => {
        if (!value) return undefined;
        if (typeof value === 'number') {
            const date = new Date((value - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }
        if (typeof value === 'string') {
            const parts = value.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        return undefined;
    };

    const handleImport = async () => {
        if (!profile?.empresa_id) return;

        const validRows = parsedData.filter(r => r.isValid);
        if (validRows.length === 0) {
            alert('Não há registros válidos para importar.');
            return;
        }

        setImporting(true);
        let success = 0;
        let failed = 0;

        for (const row of validRows) {
            try {
                const { error } = await supabase.from('funcionarios').insert({
                    nome: row.nome,
                    email: row.email,
                    cpf: row.cpf,
                    telefone: row.telefone,
                    whatsapp: row.whatsapp,
                    data_admissao: row.data_admissao,
                    ctps: row.ctps,
                    pis_nis: row.pis_nis,
                    status: 'Ativo',
                    empresa_id: profile.empresa_id
                });

                if (error) {
                    console.error('Erro ao inserir:', row.nome, error);
                    failed++;
                } else {
                    success++;
                }
            } catch (err) {
                console.error('Erro ao inserir:', row.nome, err);
                failed++;
            }
        }

        setImportResult({ success, failed });
        setStep('result');
        setImporting(false);
    };

    const handleDownloadTemplate = () => {
        const headers = ['Nome Completo*', 'E-mail*', 'CPF*', 'Telefone', 'WhatsApp', 'Data Admissão', 'CTPS', 'PIS/NIS'];
        const example = ['João da Silva', 'joao@empresa.com', '123.456.789-00', '(11) 99999-0000', '(11) 99999-0000', '01/01/2024', '123456', '123.45678.90-1'];

        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Funcionarios');
        XLSX.writeFile(wb, 'modelo_importacao_funcionarios.xlsx');
    };

    const removeRow = (index: number) => {
        setParsedData(prev => prev.filter((_, i) => i !== index));
    };

    const validCount = parsedData.filter(r => r.isValid).length;
    const invalidCount = parsedData.filter(r => !r.isValid).length;

    const cardClass = `rounded-2xl border ${isDark
        ? 'bg-slate-800/50 border-slate-700/50'
        : 'bg-white border-slate-200 shadow-soft'}`;

    return (
        <div className="p-8 pb-20 min-h-screen">
            <button
                onClick={() => navigate('/colaboradores')}
                className="flex items-center gap-2 text-slate-500 hover:text-primary-500 transition-all mb-8 font-bold text-sm"
            >
                <ChevronLeft size={16} />
                Voltar para Colaboradores
            </button>

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Importar Funcionários
                    </h1>
                    <p className={`text-sm mt-2 font-medium opacity-60 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Migre dados de outros sistemas via planilha Excel
                    </p>
                </div>

                <button
                    onClick={handleDownloadTemplate}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all border ${isDark
                        ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                >
                    <Download size={16} />
                    Baixar Modelo Excel
                </button>
            </div>

            {/* Step: Upload */}
            {step === 'upload' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${cardClass} p-12 text-center`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <div className={`w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center ${isDark ? 'bg-primary-500/10' : 'bg-primary-50'}`}>
                        <FileSpreadsheet size={40} className="text-primary-500" />
                    </div>

                    <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Envie sua planilha
                    </h2>
                    <p className={`text-sm mb-8 max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Faça upload de um arquivo Excel (.xlsx) com os dados dos funcionários. Use nosso modelo para garantir a compatibilidade.
                    </p>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold text-sm transition-all shadow-glow flex items-center gap-2 mx-auto"
                    >
                        <Upload size={18} />
                        Selecionar Arquivo
                    </button>

                    <div className={`mt-8 pt-8 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <h3 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4">Colunas Esperadas</h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {['Nome*', 'E-mail*', 'CPF*', 'Telefone', 'WhatsApp', 'Admissão', 'CTPS', 'PIS/NIS'].map((col, i) => (
                                <span key={i} className={`px-3 py-1 rounded-lg text-xs font-medium ${col.includes('*')
                                    ? isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'
                                    : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {col}
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Step: Preview */}
            {step === 'preview' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className={`${cardClass} p-5 flex items-center justify-between`}>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Total</p>
                                <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{parsedData.length}</p>
                            </div>
                            <User size={24} className="opacity-20" />
                        </div>
                        <div className={`${cardClass} p-5 flex items-center justify-between`}>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Válidos</p>
                                <p className="text-2xl font-black text-emerald-500">{validCount}</p>
                            </div>
                            <CheckCircle size={24} className="text-emerald-500 opacity-40" />
                        </div>
                        <div className={`${cardClass} p-5 flex items-center justify-between`}>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Com Erros</p>
                                <p className="text-2xl font-black text-rose-500">{invalidCount}</p>
                            </div>
                            <XCircle size={24} className="text-rose-500 opacity-40" />
                        </div>
                    </div>

                    {/* Table */}
                    <div className={`${cardClass} overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`border-b ${isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-100 bg-slate-50'}`}>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Status</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Nome</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">E-mail</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">CPF</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Erros</th>
                                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest opacity-40 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                                    {parsedData.map((row, index) => (
                                        <tr key={index} className={`transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                                            <td className="px-5 py-4">
                                                {row.isValid ? (
                                                    <CheckCircle size={18} className="text-emerald-500" />
                                                ) : (
                                                    <XCircle size={18} className="text-rose-500" />
                                                )}
                                            </td>
                                            <td className={`px-5 py-4 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {row.nome || <span className="opacity-40">-</span>}
                                            </td>
                                            <td className={`px-5 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {row.email || <span className="opacity-40">-</span>}
                                            </td>
                                            <td className={`px-5 py-4 text-sm font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {row.cpf ? row.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : <span className="opacity-40">-</span>}
                                            </td>
                                            <td className="px-5 py-4">
                                                {row.errors.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {row.errors.map((err, i) => (
                                                            <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                                                                {err}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <button
                                                    onClick={() => removeRow(index)}
                                                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-rose-500`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center mt-6">
                        <button
                            onClick={() => { setStep('upload'); setParsedData([]); }}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                        >
                            <RefreshCw size={16} />
                            Enviar Outro Arquivo
                        </button>

                        <button
                            onClick={handleImport}
                            disabled={importing || validCount === 0}
                            className="flex items-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-all shadow-glow disabled:opacity-50"
                        >
                            {importing ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <><Send size={16} /> Importar {validCount} Funcionário(s)</>
                            )}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Step: Result */}
            {step === 'result' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${cardClass} p-12 text-center`}
                >
                    <div className={`w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center ${importResult.failed === 0
                        ? isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
                        : isDark ? 'bg-amber-500/10' : 'bg-amber-50'
                        }`}>
                        {importResult.failed === 0 ? (
                            <CheckCircle size={40} className="text-emerald-500" />
                        ) : (
                            <AlertTriangle size={40} className="text-amber-500" />
                        )}
                    </div>

                    <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Importação Concluída
                    </h2>
                    <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {importResult.success} funcionário(s) importado(s) com sucesso.
                        {importResult.failed > 0 && ` ${importResult.failed} falha(s).`}
                    </p>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => { setStep('upload'); setParsedData([]); }}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                        >
                            <Upload size={16} />
                            Nova Importação
                        </button>
                        <button
                            onClick={() => navigate('/colaboradores')}
                            className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-all shadow-glow"
                        >
                            Ver Colaboradores
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default ImportarColaboradores;
