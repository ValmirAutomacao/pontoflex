import jsPDF from 'jspdf';
import { supabase } from './supabaseClient';
import type { RegistroPonto, Funcionario } from '../types';

/**
 * Gera o comprovante de ponto em PDF
 */
export const gerarComprovantePDF = (params: {
    funcionario: { nome: string; cpf: string; funcao?: string; setor?: string };
    empresa: { nome?: string; cnpj: string };
    tipoRegistro: string;
    dataHora: Date;
    localizacao?: { lat: number; lng: number; address?: string };
    metodoAutenticacao: string;
}): jsPDF => {
    const doc = new jsPDF({
        unit: 'mm',
        format: [50, 50]
    });

    // Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 50, 50, 'F');

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROVANTE DE PONTO', 25, 5, { align: 'center' });

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(params.empresa.nome || 'Sua Empresa', 25, 8, { align: 'center' });
    doc.text(`CNPJ: ${params.empresa.cnpj}`, 25, 11, { align: 'center' });

    doc.line(5, 13, 45, 13);

    doc.setFontSize(7);
    doc.text(`NOME: ${params.funcionario.nome}`, 5, 17);
    doc.text(`CPF: ${params.funcionario.cpf}`, 5, 21);

    doc.setFont('helvetica', 'bold');
    doc.text(`TIPO: ${params.tipoRegistro.toUpperCase()}`, 5, 26);
    doc.text(`DATA: ${params.dataHora.toLocaleDateString('pt-BR')}`, 5, 30);
    doc.text(`HORA: ${params.dataHora.toLocaleTimeString('pt-BR')}`, 5, 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(`AUTENTICAÇÃO: ${params.metodoAutenticacao.toUpperCase()}`, 5, 39);

    if (params.localizacao) {
        doc.text(`COORD: ${params.localizacao.lat.toFixed(4)}, ${params.localizacao.lng.toFixed(4)}`, 5, 42);
    }

    doc.setFontSize(4);
    doc.text('GERADO POR PONTO FLEX', 25, 47, { align: 'center' });

    return doc;
};

/**
 * Gera o Relatório Geral de Ponto (Espelho de Ponto)
 */
export const gerarRelatorioPontoPDF = (params: {
    empresa: { nome?: string; cnpj: string; endereco: string };
    funcionario: {
        nome: string;
        cpf: string;
        pis: string;
        funcao: string;
        setor: string;
        dataAdmissao: string;
        jornada: string;
    };
    periodo: { inicio: string; fim: string };
    registros: any[];
    totalHoras: string;
    totalSaldo: string;
}): jsPDF => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO ESPELHO DE PONTO', 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.text(params.empresa.nome || 'Sua Empresa', 10, 25);
    doc.setFont('helvetica', 'normal');
    doc.text(`CNPJ: ${params.empresa.cnpj}`, 10, 30);
    doc.text(`Endereço: ${params.empresa.endereco}`, 10, 35);

    doc.line(10, 38, 200, 38);

    // Employee Info
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMAÇÕES DO COLABORADOR', 10, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${params.funcionario.nome}`, 10, 50);
    doc.text(`CPF: ${params.funcionario.cpf}`, 100, 50);
    doc.text(`PIS: ${params.funcionario.pis}`, 150, 50);
    doc.text(`Função: ${params.funcionario.funcao}`, 10, 55);
    doc.text(`Setor: ${params.funcionario.setor}`, 100, 55);
    doc.text(`Admissão: ${params.funcionario.dataAdmissao}`, 150, 55);
    doc.text(`Jornada: ${params.funcionario.jornada}`, 10, 60);
    doc.text(`Período: ${params.periodo.inicio} - ${params.periodo.fim}`, 150, 60);

    doc.line(10, 63, 200, 63);

    // Table Header
    const headers = ['Data', 'E1', 'S1', 'E2', 'S2', 'Total', 'Saldo'];
    const startX = 10;
    const startY = 70;
    const colWidth = 27;

    doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => {
        doc.text(h, startX + (i * colWidth), startY);
    });
    doc.line(10, startY + 2, 200, startY + 2);

    // Table Body
    doc.setFont('helvetica', 'normal');
    let currentY = startY + 7;

    params.registros.forEach((reg) => {
        if (currentY > 270) {
            doc.addPage();
            currentY = 20;
        }

        doc.text(reg.data || '', startX, currentY);
        doc.text(reg.e1 || '-', startX + (1 * colWidth), currentY);
        doc.text(reg.s1 || '-', startX + (2 * colWidth), currentY);
        doc.text(reg.e2 || '-', startX + (3 * colWidth), currentY);
        doc.text(reg.s2 || '-', startX + (4 * colWidth), currentY);
        doc.text(reg.total || '-', startX + (5 * colWidth), currentY);
        doc.text(reg.saldo || '-', startX + (6 * colWidth), currentY);

        currentY += 6;
    });

    doc.line(10, currentY, 200, currentY);
    currentY += 8;

    // Totals
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL HORAS TRABALHADAS: ${params.totalHoras}`, 10, currentY);
    doc.text(`SALDO TOTAL DO PERÍODO: ${params.totalSaldo}`, 100, currentY);

    // Signatures
    currentY += 30;
    doc.line(20, currentY, 80, currentY);
    doc.line(130, currentY, 190, currentY);
    doc.setFontSize(8);
    doc.text('Assinatura da Empresa', 50, currentY + 5, { align: 'center' });
    doc.text('Assinatura do Colaborador', 160, currentY + 5, { align: 'center' });

    return doc;
};

/**
 * Salva o comprovante no banco e retorna o PDF
 */
export const salvarComprovante = async (params: {
    funcionarioId: string;
    registroPontoId: string;
    pdfBase64?: string;
    empresaId: string;
}): Promise<{ success: boolean; id?: string; error?: string }> => {
    const { data, error } = await supabase
        .from('comprovantes_ponto')
        .insert([{
            funcionario_id: params.funcionarioId,
            registro_ponto_id: params.registroPontoId,
            pdf_data: params.pdfBase64,
            empresa_id: params.empresaId
        }])
        .select('id')
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
};

/**
 * Busca comprovantes do funcionário
 */
export const buscarComprovantes = async (
    funcionarioId: string,
    limite: number = 5
): Promise<{ comprovantes: any[]; error?: string }> => {
    const { data, error } = await supabase
        .from('comprovantes_ponto')
        .select(`
            id,
            created_at,
            registros_ponto:registro_ponto_id (
                tipo_registro,
                data_registro,
                hora_registro
            )
        `)
        .eq('funcionario_id', funcionarioId)
        .order('created_at', { ascending: false })
        .limit(limite);

    if (error) {
        return { comprovantes: [], error: error.message };
    }

    return { comprovantes: data || [] };
};
