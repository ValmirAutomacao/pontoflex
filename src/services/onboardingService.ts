import { supabase } from './supabaseClient';

const isValidUUID = (uuid: string | undefined | null): boolean => {
    if (!uuid) return false;
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export interface OnboardingConfig {
    funcionarioId: string;
    nome: string;
    email: string;
    whatsapp?: string;
    empresaNome: string;
    empresaId: string;
}

export const onboardingService = {
    /**
     * Gera o link de setup para o colaborador
     */
    generateSetupLink: async (funcionarioId: string) => {
        if (!isValidUUID(funcionarioId)) return null;

        const { data, error } = await supabase
            .from('funcionarios')
            .select('setup_token')
            .eq('id', funcionarioId)
            .single();

        if (error || !data?.setup_token) {
            // Se o token não existir (ex: expirou ou já foi usado), gerar um novo
            const newToken = crypto.randomUUID();
            await supabase
                .from('funcionarios')
                .update({
                    setup_token: newToken,
                    setup_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    onboarding_completado: false
                })
                .eq('id', funcionarioId);

            return `${window.location.origin}/setup-colaborador?token=${newToken}`;
        }

        return `${window.location.origin}/setup-colaborador?token=${data.setup_token}`;
    },

    /**
     * Envia os acessos via E-mail
     */
    sendEmailOnboarding: async (config: OnboardingConfig) => {
        const link = await onboardingService.generateSetupLink(config.funcionarioId);

        try {
            const { error } = await supabase.functions.invoke('send-notification', {
                body: {
                    type: 'EMPLOYEE_ONBOARDING',
                    data: {
                        email: config.email,
                        nome: config.nome,
                        empresaNome: config.empresaNome,
                        setupLink: link
                    }
                }
            });

            await onboardingService.logAction(config.funcionarioId, config.empresaId, 'email', error ? 'erro' : 'sucesso', error?.message);

            if (error) throw error;
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    /**
     * Gera o link para WhatsApp
     */
    getWhatsAppLink: async (config: OnboardingConfig) => {
        const link = await onboardingService.generateSetupLink(config.funcionarioId);
        const mensagem = `Olá ${config.nome}! Bem-vindo à ${config.empresaNome}. Estamos muito felizes em ter você conosco! 🚀\n\nPara começar, você precisa configurar sua senha de acesso ao Pontoflex por este link:\n\n${link}\n\nApós definir sua senha, você também poderá cadastrar sua biometria facial para registrar seu ponto com facilidade.`;

        const telefone = config.whatsapp?.replace(/\D/g, '');
        return `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    },

    /**
     * Registra log de auditoria
     */
    logAction: async (funcionarioId: string, empresaId: string, tipo: 'email' | 'whatsapp', status: string, detalhes?: string) => {
        await supabase.from('onboarding_logs').insert([{
            funcionario_id: funcionarioId,
            empresa_id: empresaId,
            tipo_envio: tipo,
            status,
            detalhes
        }]);
    }
};
