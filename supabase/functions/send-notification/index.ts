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

// Template de email para Onboarding de Colaborador
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

// Template de email para Onboarding de Empresa
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

// Template de email para Notificação de Ponto
function getPontoNotificationTemplate(nome: string, tipo: string, dataHora: string, local: string): string {
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
                <h1>⏰ Registro de Ponto</h1>
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

        // Notificação de Ponto
        if (type === "PONTO_NOTIFICATION") {
            const { email, nome, tipo: tipoRegistro, dataHora, local } = data;
            const html = getPontoNotificationTemplate(nome, tipoRegistro, dataHora, local);
            const result = await sendEmail({
                to: email,
                subject: `Registro de Ponto: ${tipoRegistro}`,
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
