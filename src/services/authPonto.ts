import { supabase } from './supabaseClient';
import { Network } from '@capacitor/network';
import { offlineSyncService, PendingRegistration } from './offlineSyncService';

/**
 * Verifica a senha de ponto do funcionário
 */
export const verificarSenhaPonto = async (
    funcionarioId: string,
    senha: string
): Promise<{ valid: boolean; error?: string }> => {
    // Buscar o user_id do funcionário
    const { data: funcionario, error: funcError } = await supabase
        .from('funcionarios')
        .select('user_id')
        .eq('id', funcionarioId)
        .single();

    if (funcError || !funcionario?.user_id) {
        return { valid: false, error: 'Funcionário não encontrado' };
    }

    // Buscar email do usuário
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
        return { valid: false, error: 'Usuário não autenticado' };
    }

    // Tentar autenticar com a senha fornecida
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senha
    });

    if (authError) {
        return { valid: false, error: 'Senha incorreta' };
    }

    return { valid: true };
};

/**
 * Calcula distância entre dois pontos em metros (Haversine)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

/**
 * Registra o ponto do funcionário
 */
export const registrarPonto = async (params: {
    funcionarioId: string;
    tipoRegistro: 'entrada' | 'saida_almoco' | 'retorno_almoco' | 'saida';
    localizacao?: { lat: number; lng: number };
    metodoAutenticacao: 'senha' | 'facial' | 'fallback_senha';
    confiancaFacial?: number;
    observacoes?: string;
    empresaId: string;
}): Promise<{ success: boolean; registro?: any; error?: string }> => {
    const now = new Date();
    const dataRegistro = now.toISOString().split('T')[0];
    const horaRegistro = now.toTimeString().split(' ')[0];

    // Verificar se já existe registro desse tipo hoje
    const { data: existente } = await supabase
        .from('registros_ponto')
        .select('id')
        .eq('funcionario_id', params.funcionarioId)
        .eq('data_registro', dataRegistro)
        .eq('tipo_registro', params.tipoRegistro)
        .single();

    if (existente) {
        return { success: false, error: 'Registro já existe para este tipo hoje' };
    }

    // Obter IP e user agent
    let ipAddress = '';
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
    } catch (e) {
        console.warn('Não foi possível obter IP');
    }

    const userAgent = navigator.userAgent;

    const status = await Network.getStatus();

    if (!status.connected) {
        const pending = await offlineSyncService.addPending({
            funcionario_id: params.funcionarioId,
            empresa_id: params.empresaId,
            tipo: params.metodoAutenticacao === 'facial' ? 'biometria' : 'senha',
            latitude: params.localizacao?.lat,
            longitude: params.localizacao?.lng,
            foto_url: undefined // Foto local seria muito grande para o Preferences, salva link depois
        });

        return {
            success: true,
            registro: {
                id: pending.offline_id,
                data_registro: pending.data_registro,
                hora_registro: pending.hora_registro,
                is_offline: true
            }
        };
    }

    // Verificar localização vs Local de Trabalho
    let distanciaMetros = null;
    let localValido = true;

    if (params.localizacao) {
        const { data: funcDetails } = await supabase
            .from('funcionarios')
            .select('is_externo, local_trabalho:local_trabalho_id(latitude, longitude, raio_metros)')
            .eq('id', params.funcionarioId)
            .single();

        const funcionario = funcDetails as any;
        const local = funcionario?.local_trabalho;

        if (funcionario?.is_externo) {
            localValido = true;
            // Mesmo sendo externo, calculamos a distância se houver um local atrelado
            if (local && local.latitude && local.longitude) {
                distanciaMetros = calculateDistance(
                    params.localizacao.lat,
                    params.localizacao.lng,
                    local.latitude,
                    local.longitude
                );
            }
        } else if (local && local.latitude && local.longitude) {
            distanciaMetros = calculateDistance(
                params.localizacao.lat,
                params.localizacao.lng,
                local.latitude,
                local.longitude
            );
            localValido = distanciaMetros <= (local.raio_metros || 50);
        }
    }

    // Inserir registro
    const { data: registro, error } = await supabase
        .from('registros_ponto')
        .insert([{
            funcionario_id: params.funcionarioId,
            data_registro: dataRegistro,
            hora_registro: horaRegistro,
            timestamp_registro: now.toISOString(),
            tipo_registro: params.tipoRegistro,
            ip_address: ipAddress,
            user_agent: userAgent,
            localizacao_gps: params.localizacao ? `POINT(${params.localizacao.lng} ${params.localizacao.lat})` : null,
            latitude: params.localizacao?.lat,
            longitude: params.localizacao?.lng,
            distancia_metros: distanciaMetros,
            local_valido: localValido,
            metodo_autenticacao: params.metodoAutenticacao,
            confianca_facial: params.confiancaFacial,
            observacoes: params.observacoes,
            empresa_id: params.empresaId
        }])
        .select()
        .single();

    if (error) {
        // Se falhou por rede mas o status dizia conectado, tenta salvar offline
        if (error.message.includes('fetch') || error.message.includes('Network')) {
            const pending = await offlineSyncService.addPending({
                funcionario_id: params.funcionarioId,
                empresa_id: params.empresaId,
                tipo: params.metodoAutenticacao === 'facial' ? 'biometria' : 'senha',
                latitude: params.localizacao?.lat,
                longitude: params.localizacao?.lng,
            });
            return {
                success: true,
                registro: {
                    id: pending.offline_id,
                    data_registro: pending.data_registro,
                    hora_registro: pending.hora_registro,
                    is_offline: true
                }
            };
        }
        return { success: false, error: error.message };
    }

    return { success: true, registro };
};

/**
 * Busca registros de ponto do dia de um funcionário
 */
export const buscarRegistrosDia = async (
    funcionarioId: string,
    data?: string
): Promise<{ registros: any[]; error?: string }> => {
    const dataConsulta = data || new Date().toISOString().split('T')[0];

    const { data: registros, error } = await supabase
        .from('registros_ponto')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('data_registro', dataConsulta)
        .order('hora_registro', { ascending: true });

    if (error) {
        // Se estiver offline, ignora erro e busca apenas na fila local abaixo
        if (!error.message.includes('fetch') && !error.message.includes('Network')) {
            console.error('Erro ao buscar registros:', error);
        }
    }

    // Buscar registros pendentes na fila local
    const pendingQueue = await offlineSyncService.getQueue();
    const pendingHoje = pendingQueue.filter(p => p.funcionario_id === funcionarioId && p.data_registro === dataConsulta);

    // Mapear pendentes para o formato de RegistroPonto
    const registrosOffline = pendingHoje.map(p => ({
        id: p.offline_id,
        funcionario_id: p.funcionario_id,
        data_registro: p.data_registro,
        hora_registro: p.hora_registro,
        tipo_registro: p.tipo === 'biometria' ? 'Facial' : 'Senha', // Mapear para o formato do banco
        is_offline: true
    }));

    // Combinar e ordenar
    const combinados = [...(registros || []), ...registrosOffline].sort((a, b) =>
        a.hora_registro.localeCompare(b.hora_registro)
    );

    return { registros: combinados };
};

/**
 * Busca registros de ponto de uma empresa em um período
 */
export const buscarRegistrosPeriodo = async (params: {
    empresaId: string;
    dataInicio: string;
    dataFim: string;
    funcionarioId?: string;
    setorId?: string;
}): Promise<{ registros: any[]; error?: string }> => {
    let query = supabase
        .from('registros_ponto')
        .select(`
            *,
            funcionarios:funcionario_id (
                id,
                nome,
                email,
                funcoes:funcao_id (nome),
                setores:setor_id (nome),
                jornada:jornada_id (*)
            )
        `)
        .eq('empresa_id', params.empresaId)
        .gte('data_registro', params.dataInicio)
        .lte('data_registro', params.dataFim)
        .order('data_registro', { ascending: false })
        .order('hora_registro', { ascending: true });

    if (params.funcionarioId) {
        query = query.eq('funcionario_id', params.funcionarioId);
    }

    const { data: registros, error } = await query;

    if (error) {
        return { registros: [], error: error.message };
    }

    return { registros: registros || [] };
};

/**
 * Realiza ajuste de ponto
 */
export const ajustarPonto = async (params: {
    registroPontoId: string;
    horaOriginal: string;
    horaAjustada: string;
    tipoJustificativaId?: string;
    observacoes?: string;
    ajustadoPorId: string;
    empresaId: string;
}): Promise<{ success: boolean; error?: string }> => {
    // Criar registro de ajuste
    const { error: ajusteError } = await supabase
        .from('ajustes_ponto')
        .insert([{
            registro_ponto_id: params.registroPontoId,
            hora_original: params.horaOriginal,
            hora_ajustada: params.horaAjustada,
            tipo_justificativa_id: params.tipoJustificativaId,
            observacoes: params.observacoes,
            ajustado_por_id: params.ajustadoPorId,
            empresa_id: params.empresaId
        }]);

    if (ajusteError) {
        return { success: false, error: ajusteError.message };
    }

    // Atualizar o registro original
    const { error: updateError } = await supabase
        .from('registros_ponto')
        .update({ hora_registro: params.horaAjustada })
        .eq('id', params.registroPontoId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    return { success: true };
};
