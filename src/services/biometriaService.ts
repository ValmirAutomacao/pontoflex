import { supabase } from './supabaseClient';
import * as faceapi from 'face-api.js';

let modelsLoaded = false;

/**
 * Carrega os modelos de reconhecimento facial
 */
export const loadFaceModels = async (): Promise<boolean> => {
    if (modelsLoaded) return true;

    try {
        const MODEL_URL = '/models';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoaded = true;
        return true;
    } catch (error) {
        console.error('Erro ao carregar modelos de face:', error);
        return false;
    }
};

/**
 * Detecta rosto em um elemento de vídeo
 */
export const detectFace = async (
    videoElement: HTMLVideoElement
): Promise<{ detected: boolean; centered: boolean; descriptor?: Float32Array }> => {
    if (!modelsLoaded) {
        return { detected: false, centered: false };
    }

    const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) {
        return { detected: false, centered: false };
    }

    const box = detection.detection.box;
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;

    // Verificar se o rosto está centralizado (margem de 20%)
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const isCentered =
        centerX > videoWidth * 0.3 && centerX < videoWidth * 0.7 &&
        centerY > videoHeight * 0.2 && centerY < videoHeight * 0.8;

    return {
        detected: true,
        centered: isCentered,
        descriptor: detection.descriptor
    };
};

/**
 * Extrai o face descriptor de uma imagem/vídeo
 */
export const extractFaceDescriptor = async (
    videoElement: HTMLVideoElement
): Promise<Float32Array | null> => {
    const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    return detection?.descriptor || null;
};

/**
 * Salva a biometria do funcionário
 */
export const saveBiometry = async (
    funcionarioId: string,
    descriptor: Float32Array,
    empresaId?: string,
    token?: string
): Promise<{ success: boolean; error?: string }> => {
    console.log('[saveBiometry] Iniciando salvamento para funcionario:', funcionarioId);
    console.log('[saveBiometry] empresa_id:', empresaId);

    // Converter Float32Array para array normal para armazenamento JSON
    const descriptorArray = Array.from(descriptor);
    const faceDescriptors = {
        descriptor: descriptorArray,
        captured_at: new Date().toISOString(),
        platform: 'Web'
    };

    try {
        // Verificar se já existe registro de biometria
        const { data: existingBiometria, error: selectError } = await supabase
            .from('funcionarios_biometria')
            .select('id, status')
            .eq('funcionario_id', funcionarioId)
            .maybeSingle();

        console.log('[saveBiometry] Registro existente:', existingBiometria);
        if (selectError) {
            console.error('[saveBiometry] Erro ao buscar existente:', selectError);
        }

        let error;
        if (existingBiometria) {
            console.log('[saveBiometry] Atualizando registro existente ID:', existingBiometria.id);
            // Atualizar registro existente
            const { error: updateError, data: updateData } = await supabase
                .from('funcionarios_biometria')
                .update({
                    face_descriptors: faceDescriptors,
                    status: 'Ativo'
                })
                .eq('id', existingBiometria.id)
                .select();

            console.log('[saveBiometry] Resultado UPDATE:', { error: updateError, data: updateData });
            error = updateError;
        } else {
            console.log('[saveBiometry] Inserindo novo registro');
            // Inserir novo registro
            const { error: insertError, data: insertData } = await supabase
                .from('funcionarios_biometria')
                .insert([{
                    funcionario_id: funcionarioId,
                    status: 'Ativo',
                    face_descriptors: faceDescriptors,
                    empresa_id: empresaId
                }])
                .select();

            console.log('[saveBiometry] Resultado INSERT:', { error: insertError, data: insertData });
            error = insertError;
        }

        if (error) {
            console.error('[saveBiometry] Erro ao salvar biometria:', error);
            return { success: false, error: error.message };
        }

        console.log('[saveBiometry] Biometria salva com sucesso!');
        return { success: true };
    } catch (err: any) {
        console.error('[saveBiometry] Exceção ao salvar biometria:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Verifica a biometria do funcionário
 */
export const verifyBiometry = async (
    funcionarioId: string,
    descriptor: Float32Array
): Promise<{ verified: boolean; confidence: number; error?: string }> => {
    const { data, error } = await supabase
        .from('funcionarios_biometria')
        .select('face_descriptors')
        .eq('funcionario_id', funcionarioId)
        .eq('status', 'Ativo')
        .single();

    if (error || !data?.face_descriptors?.descriptor) {
        return { verified: false, confidence: 0, error: 'Biometria não encontrada' };
    }

    // Converter array armazenado de volta para Float32Array
    const storedDescriptor = new Float32Array(data.face_descriptors.descriptor);

    // Calcular distância euclidiana
    const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);

    // Threshold típico: < 0.6 é considerado match
    const THRESHOLD = 0.6;
    const verified = distance < THRESHOLD;
    const confidence = Math.max(0, Math.min(100, (1 - distance) * 100));

    return { verified, confidence: Math.round(confidence) };
};

/**
 * Gera link de cadastro biométrico remoto
 */
export const generateBiometryLink = async (
    funcionarioId: string,
    empresaId: string
): Promise<{ success: boolean; link?: string; error?: string }> => {
    // Gerar token único
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await supabase
        .from('funcionarios_biometria')
        .upsert([{
            funcionario_id: funcionarioId,
            status: 'link_enviado',
            token,
            token_expires_at: expiresAt.toISOString(),
            empresa_id: empresaId
        }], { onConflict: 'funcionario_id' });

    if (error) {
        return { success: false, error: error.message };
    }

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/biometria-remota/${funcionarioId}?token=${token}`;

    return { success: true, link };
};

/**
 * Valida token de cadastro biométrico
 */
export const validateBiometryToken = async (
    funcionarioId: string,
    token: string
): Promise<{
    valid: boolean;
    expired: boolean;
    used: boolean;
    funcionario?: { nome: string };
    empresa_id?: string;
}> => {
    try {
        // Buscar registro de biometria com o token
        const { data: biometriaData, error: biometriaError } = await supabase
            .from('funcionarios_biometria')
            .select('id, token, token_expires_at, status, funcionario_id, empresa_id')
            .eq('funcionario_id', funcionarioId)
            .eq('token', token)
            .maybeSingle();

        // Se não encontrou registro com esse token, valida diretamente pelo funcionário
        if (biometriaError || !biometriaData) {
            // Buscar dados do funcionário para permitir cadastro
            const { data: funcData } = await supabase
                .from('funcionarios')
                .select('id, nome, empresa_id')
                .eq('id', funcionarioId)
                .single();

            if (!funcData) {
                return { valid: false, expired: false, used: false };
            }

            // Verificar se já tem biometria ativa
            const { data: existingBiometria } = await supabase
                .from('funcionarios_biometria')
                .select('status')
                .eq('funcionario_id', funcionarioId)
                .eq('status', 'Ativo')
                .maybeSingle();

            if (existingBiometria) {
                return { valid: false, expired: false, used: true, funcionario: { nome: funcData.nome } };
            }

            // Permitir cadastro
            return {
                valid: true,
                expired: false,
                used: false,
                funcionario: { nome: funcData.nome },
                empresa_id: funcData.empresa_id
            };
        }

        // Verificar se token expirou
        if (biometriaData.token_expires_at) {
            const expiresAt = new Date(biometriaData.token_expires_at);
            if (expiresAt < new Date()) {
                const { data: funcData } = await supabase
                    .from('funcionarios')
                    .select('nome')
                    .eq('id', funcionarioId)
                    .single();
                return { valid: false, expired: true, used: false, funcionario: funcData ? { nome: funcData.nome } : undefined };
            }
        }

        // Verificar se já foi usado (status Ativo)
        if (biometriaData.status === 'Ativo') {
            const { data: funcData } = await supabase
                .from('funcionarios')
                .select('nome')
                .eq('id', funcionarioId)
                .single();
            return { valid: false, expired: false, used: true, funcionario: funcData ? { nome: funcData.nome } : undefined };
        }

        // Buscar nome do funcionário
        const { data: funcData } = await supabase
            .from('funcionarios')
            .select('nome')
            .eq('id', funcionarioId)
            .single();

        return {
            valid: true,
            expired: false,
            used: false,
            funcionario: funcData ? { nome: funcData.nome } : undefined,
            empresa_id: biometriaData.empresa_id
        };
    } catch (err) {
        console.error('Erro ao validar token de biometria:', err);
        return { valid: false, expired: false, used: false };
    }
};
