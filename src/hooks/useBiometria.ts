import { useState, useEffect, useCallback, useRef } from 'react';
import { loadFaceModels, detectFace, extractFaceDescriptor, verifyBiometry } from '../services/biometriaService';

interface UseBiometriaReturn {
    modelsLoaded: boolean;
    faceDetected: boolean;
    faceCentered: boolean;
    message: string;
    loading: boolean;
    videoRef: React.RefObject<HTMLVideoElement>;
    startCamera: () => Promise<boolean>;
    stopCamera: () => void;
    captureDescriptor: () => Promise<Float32Array | null>;
    verifyFace: (funcionarioId: string) => Promise<{ verified: boolean; confidence: number }>;
}

export const useBiometria = (): UseBiometriaReturn => {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [faceCentered, setFaceCentered] = useState(false);
    const [message, setMessage] = useState('Carregando detector...');
    const [loading, setLoading] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Carregar modelos
    useEffect(() => {
        const load = async () => {
            const loaded = await loadFaceModels();
            setModelsLoaded(loaded);
            if (loaded) {
                setMessage('Posicione seu rosto');
            } else {
                setMessage('Erro ao carregar modelos');
            }
        };
        load();

        return () => {
            if (detectIntervalRef.current) {
                clearInterval(detectIntervalRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const startCamera = useCallback(async (): Promise<boolean> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            // Iniciar detecção contínua
            detectIntervalRef.current = setInterval(async () => {
                if (videoRef.current && modelsLoaded) {
                    const result = await detectFace(videoRef.current);
                    setFaceDetected(result.detected);
                    setFaceCentered(result.centered);

                    if (!result.detected) {
                        setMessage('Rosto não detectado');
                    } else if (!result.centered) {
                        setMessage('Centralize seu rosto');
                    } else {
                        setMessage('Ótimo! Mantenha assim.');
                    }
                }
            }, 500);

            return true;
        } catch (err) {
            setMessage('Erro ao acessar câmera');
            return false;
        }
    }, [modelsLoaded]);

    const stopCamera = useCallback(() => {
        if (detectIntervalRef.current) {
            clearInterval(detectIntervalRef.current);
            detectIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    const captureDescriptor = useCallback(async (): Promise<Float32Array | null> => {
        if (!videoRef.current || !modelsLoaded) return null;

        setLoading(true);
        const descriptor = await extractFaceDescriptor(videoRef.current);
        setLoading(false);

        return descriptor;
    }, [modelsLoaded]);

    const verifyFace = useCallback(async (funcionarioId: string): Promise<{ verified: boolean; confidence: number }> => {
        if (!videoRef.current || !modelsLoaded) {
            return { verified: false, confidence: 0 };
        }

        setLoading(true);
        const descriptor = await extractFaceDescriptor(videoRef.current);

        if (!descriptor) {
            setLoading(false);
            return { verified: false, confidence: 0 };
        }

        const result = await verifyBiometry(funcionarioId, descriptor);
        setLoading(false);

        return { verified: result.verified, confidence: result.confidence };
    }, [modelsLoaded]);

    return {
        modelsLoaded,
        faceDetected,
        faceCentered,
        message,
        loading,
        videoRef,
        startCamera,
        stopCamera,
        captureDescriptor,
        verifyFace
    };
};
