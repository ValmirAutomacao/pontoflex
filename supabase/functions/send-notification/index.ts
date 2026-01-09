import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders,
            status: 200
        });
    }

    try {
        const { type, data } = await req.json();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        if (type === "BIOMETRIA_LINK") {
            const { email, whatsapp, nome, link } = data;
            console.log(`Enviando link de biometria para ${nome}: ${link}`);

            // Aqui entraria a integração com Resend / SendGrid
            // E integração com API de WhatsApp

            return new Response(JSON.stringify({ message: "Link enviado com sucesso" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        if (type === "EMPLOYEE_ONBOARDING") {
            const { email, nome, empresaNome, setupLink } = data;
            console.log(`Enviando onboarding para ${nome} (${empresaNome}): ${setupLink}`);

            // Integração Resend/WhatsApp aqui no futuro

            return new Response(JSON.stringify({ message: "Onboarding enviado com sucesso" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        if (type === "PONTO_RECEIPT") {
            const { email, nome, tipo, dataHora, pdfBase64 } = data;
            console.log(`Enviando comprovante de ponto para ${nome}: ${tipo}`);

            // Aqui entraria o envio do e-mail com o PDF em anexo

            return new Response(JSON.stringify({ message: "Comprovante enviado com sucesso" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        return new Response(JSON.stringify({ error: "Tipo de notificação inválido" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
