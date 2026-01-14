import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = "PontoFlex <noreply@optusagenteiasaas.com.br>";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailPayload {
    to: string;
    subject: string;
    html: string;
}

async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: payload.to,
                subject: payload.subject,
                html: payload.html,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("Resend API error:", error);
            return { success: false, error };
        }

        const result = await response.json();
        console.log("Email sent successfully:", result.id);
        return { success: true };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: error.message };
    }
}

// ============= TEMPLATES =============

function getEmployeeOnboardingTemplate(nome: string, empresaNome: string, setupLink: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; }
            .content { padding: 40px; }
            .content h2 { color: #1e293b; margin-top: 0; }
            .content p { color: #64748b; line-height: 1.6; }
            .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Bem-vindo ao PontoFlex!</h1>
            </div>
            <div class="content">
                <h2>Olá, ${nome}!</h2>
                <p>Você foi cadastrado como colaborador na empresa <strong>${empresaNome}</strong>.</p>
                <p>Para completar seu cadastro e começar a registrar seus pontos, clique no botão abaixo:</p>
                <a href="${setupLink}" class="button">Completar Cadastro</a>
                <p style="font-size: 12px; color: #94a3b8;">Este link é válido por 7 dias.</p>
            </div>
            <div class="footer">
                <p>PontoFlex - Sistema de Controle de Ponto</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function getCompanyOnboardingTemplate(adminNome: string, empresaNome: string, setupLink: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; }
            .content { padding: 40px; }
            .content h2 { color: #1e293b; margin-top: 0; }
            .content p { color: #64748b; line-height: 1.6; }
            .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏢 Sua empresa foi cadastrada!</h1>
            </div>
            <div class="content">
                <h2>Olá, ${adminNome}!</h2>
                <p>A empresa <strong>${empresaNome}</strong> foi cadastrada no PontoFlex.</p>
                <p>Para configurar sua conta de administrador e começar a usar o sistema, clique no botão abaixo:</p>
                <a href="${setupLink}" class="button">Configurar Empresa</a>
                <p style="font-size: 12px; color: #94a3b8;">Este link é válido por 7 dias.</p>
            </div>
            <div class="footer">
                <p>PontoFlex - Sistema de Controle de Ponto</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function getPontoReceiptTemplate(nome: string, tipo: string, dataHora: string, local: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 20px; }
            .content { padding: 30px; text-align: center; }
            .time { font-size: 48px; font-weight: 700; color: #1e293b; margin: 10px 0; }
            .info { color: #64748b; font-size: 14px; }
            .badge { display: inline-block; background: #dbeafe; color: #2563eb; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 12px; margin-top: 10px; }
            .footer { background: #f8fafc; padding: 15px; text-align: center; color: #94a3b8; font-size: 11px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⏰ Comprovante de Ponto</h1>
            </div>
            <div class="content">
                <p class="info">Olá, ${nome}</p>
                <p class="time">${dataHora}</p>
                <span class="badge">${tipo}</span>
                <p class="info" style="margin-top: 20px;">📍 ${local || 'Local não identificado'}</p>
            </div>
            <div class="footer">
                <p>PontoFlex - Comprovante gerado automaticamente</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function getVacationScheduledTemplate(nome: string, dataInicio: string, dataFim: string, diasTotal: number): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; }
            .content { padding: 40px; }
            .content h2 { color: #1e293b; margin-top: 0; }
            .content p { color: #64748b; line-height: 1.6; }
            .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .info-box strong { color: #92400e; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏖️ Férias Agendadas!</h1>
            </div>
            <div class="content">
                <h2>Olá, ${nome}!</h2>
                <p>Suas férias foram agendadas com sucesso. Confira os detalhes abaixo:</p>
                <div class="info-box">
                    <p><strong>Início:</strong> ${dataInicio}</p>
                    <p><strong>Retorno:</strong> ${dataFim}</p>
                    <p><strong>Total:</strong> ${diasTotal} dias</p>
                </div>
                <p>Lembre-se de deixar suas pendências organizadas antes do início do seu período de descanso.</p>
            </div>
            <div class="footer">
                <p>PontoFlex - Sistema de Controle de Ponto</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function getJustificationTemplate(nome: string, tipo: string, status: 'aprovada' | 'rejeitada', motivo?: string): string {
    const isApproved = status === 'aprovada';
    const bgColor = isApproved ? '#10b981' : '#ef4444';
    const icon = isApproved ? '✅' : '❌';
    const title = isApproved ? 'Justificativa Aprovada' : 'Justificativa Rejeitada';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: ${bgColor}; padding: 40px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; }
            .content { padding: 40px; }
            .content h2 { color: #1e293b; margin-top: 0; }
            .content p { color: #64748b; line-height: 1.6; }
            .info-box { background: ${isApproved ? '#d1fae5' : '#fee2e2'}; border-left: 4px solid ${bgColor}; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${icon} ${title}</h1>
            </div>
            <div class="content">
                <h2>Olá, ${nome}!</h2>
                <p>Sua solicitação de justificativa do tipo <strong>${tipo}</strong> foi <strong>${status}</strong>.</p>
                ${motivo ? `<div class="info-box"><p><strong>Observação:</strong> ${motivo}</p></div>` : ''}
            </div>
            <div class="footer">
                <p>PontoFlex - Sistema de Controle de Ponto</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function getMonthlyClosingTemplate(nome: string, mes: string, horasTrabalhadas: string, saldoBancoHoras: string, diasTrabalhados: number): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 40px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; }
            .content { padding: 40px; }
            .content h2 { color: #1e293b; margin-top: 0; }
            .stats { display: flex; justify-content: space-around; margin: 30px 0; }
            .stat { text-align: center; }
            .stat-value { font-size: 28px; font-weight: 700; color: #6366f1; }
            .stat-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Resumo do Mês - ${mes}</h1>
            </div>
            <div class="content">
                <h2>Olá, ${nome}!</h2>
                <p>Confira o resumo das suas atividades no mês:</p>
                <div class="stats">
                    <div class="stat">
                        <div class="stat-value">${diasTrabalhados}</div>
                        <div class="stat-label">Dias Trabalhados</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${horasTrabalhadas}</div>
                        <div class="stat-label">Horas Trabalhadas</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${saldoBancoHoras}</div>
                        <div class="stat-label">Saldo Banco</div>
                    </div>
                </div>
            </div>
            <div class="footer">
                <p>PontoFlex - Fechamento gerado automaticamente</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function getBankHoursAlertTemplate(nome: string, saldoAtual: string, limite: string, tipo: 'positivo' | 'negativo'): string {
    const isPositive = tipo === 'positivo';
    const bgColor = isPositive ? '#10b981' : '#ef4444';
    const icon = isPositive ? '⬆️' : '⬇️';
    const message = isPositive
        ? 'Você possui um saldo elevado de horas extras. Considere compensar algumas horas em breve.'
        : 'Seu saldo de banco de horas está negativo. Atenção para regularizar sua situação.';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: ${bgColor}; padding: 40px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; }
            .content { padding: 40px; text-align: center; }
            .saldo { font-size: 48px; font-weight: 700; color: ${bgColor}; margin: 20px 0; }
            .content p { color: #64748b; line-height: 1.6; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${icon} Alerta de Banco de Horas</h1>
            </div>
            <div class="content">
                <h2>Olá, ${nome}!</h2>
                <p class="saldo">${saldoAtual}</p>
                <p>${message}</p>
                <p style="font-size: 12px; color: #94a3b8;">Limite configurado: ${limite}</p>
            </div>
            <div class="footer">
                <p>PontoFlex - Alerta automático</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

// ============= HANDLERS =============

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders, status: 200 });
    }

    try {
        const { type, data } = await req.json();

        if (!RESEND_API_KEY) {
            console.error("RESEND_API_KEY not configured");
            return new Response(JSON.stringify({ error: "Email service not configured" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            });
        }

        // Onboarding de Colaborador
        if (type === "EMPLOYEE_ONBOARDING") {
            const { email, nome, empresaNome, setupLink } = data;
            const html = getEmployeeOnboardingTemplate(nome, empresaNome, setupLink);
            const result = await sendEmail({
                to: email,
                subject: `${nome}, complete seu cadastro no PontoFlex`,
                html,
            });
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: result.success ? 200 : 500,
            });
        }

        // Onboarding de Empresa
        if (type === "COMPANY_ONBOARDING") {
            const { email, adminNome, empresaNome, setupLink } = data;
            const html = getCompanyOnboardingTemplate(adminNome, empresaNome, setupLink);
            const result = await sendEmail({
                to: email,
                subject: `Configure sua empresa ${empresaNome} no PontoFlex`,
                html,
            });
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: result.success ? 200 : 500,
            });
        }

        // Comprovante de Ponto (CORRIGIDO)
        if (type === "PONTO_RECEIPT" || type === "PONTO_NOTIFICATION") {
            const { email, nome, tipo: tipoRegistro, dataHora, local } = data;
            const html = getPontoReceiptTemplate(nome, tipoRegistro, dataHora, local || '');
            const result = await sendEmail({
                to: email,
                subject: `Comprovante de Ponto: ${tipoRegistro}`,
                html,
            });
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: result.success ? 200 : 500,
            });
        }

        // Link de Biometria
        if (type === "BIOMETRIA_LINK") {
            const { email, nome, link } = data;
            const html = getEmployeeOnboardingTemplate(nome, "sua empresa", link);
            const result = await sendEmail({
                to: email,
                subject: `${nome}, configure sua biometria no PontoFlex`,
                html,
            });
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: result.success ? 200 : 500,
            });
        }

        // Férias Agendadas (NOVO)
        if (type === "VACATION_SCHEDULED") {
            const { email, nome, dataInicio, dataFim, diasTotal } = data;
            const html = getVacationScheduledTemplate(nome, dataInicio, dataFim, diasTotal);
            const result = await sendEmail({
                to: email,
                subject: `🏖️ Férias agendadas: ${dataInicio} a ${dataFim}`,
                html,
            });
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: result.success ? 200 : 500,
            });
        }

        // Justificativa Aprovada (NOVO)
        if (type === "JUSTIFICATION_APPROVED") {
            const { email, nome, tipoJustificativa, observacao } = data;
            const html = getJustificationTemplate(nome, tipoJustificativa, 'aprovada', observacao);
            const result = await sendEmail({
                to: email,
                subject: `✅ Justificativa aprovada`,
                html,
            });
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: result.success ? 200 : 500,
            });
        }

        // Justificativa Rejeitada (NOVO)
        if (type === "JUSTIFICATION_REJECTED") {
            const { email, nome, tipoJustificativa, observacao } = data;
            const html = getJustificationTemplate(nome, tipoJustificativa, 'rejeitada', observacao);
            const result = await sendEmail({
                to: email,
                subject: `❌ Justificativa rejeitada`,
                html,
            });
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: result.success ? 200 : 500,
            });
        }

        // Fechamento Mensal (NOVO)
        if (type === "MONTHLY_CLOSING") {
            const { email, nome, mes, horasTrabalhadas, saldoBancoHoras, diasTrabalhados } = data;
            const html = getMonthlyClosingTemplate(nome, mes, horasTrabalhadas, saldoBancoHoras, diasTrabalhados);
            const result = await sendEmail({
                to: email,
                subject: `📊 Resumo do mês: ${mes}`,
                html,
            });
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: result.success ? 200 : 500,
            });
        }

        // Alerta de Banco de Horas (NOVO)
        if (type === "BANK_HOURS_ALERT") {
            const { email, nome, saldoAtual, limite, tipo: tipoSaldo } = data;
            const html = getBankHoursAlertTemplate(nome, saldoAtual, limite, tipoSaldo);
            const result = await sendEmail({
                to: email,
                subject: `⚠️ Alerta de Banco de Horas`,
                html,
            });
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: result.success ? 200 : 500,
            });
        }

        return new Response(JSON.stringify({ error: "Tipo de notificação inválido" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
