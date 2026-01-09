import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useTheme } from '../contexts/ThemeContext';
import { Camera, Upload, X, RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FotoUploadProps {
    currentUrl?: string;
    onUpload: (url: string | null) => void;
    empresaId?: string;
    funcionarioId?: string;
}

const BUCKET_NAME = 'funcionarios-fotos';

const FotoUpload: React.FC<FotoUploadProps> = ({
    currentUrl,
    onUpload,
    empresaId,
    funcionarioId
}) => {
    const { isDark } = useTheme();
    const [preview, setPreview] = useState<string | null>(currentUrl || null);
    const [isUploading, setIsUploading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const generateFilePath = () => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        if (empresaId && funcionarioId) {
            return `${empresaId}/${funcionarioId}/${timestamp}_${randomId}.jpg`;
        }
        return `temp/${timestamp}_${randomId}.jpg`;
    };

    const uploadToStorage = async (file: File | Blob): Promise<string | null> => {
        try {
            setIsUploading(true);
            const filePath = generateFilePath();

            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, file, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) {
                console.error('Erro no upload:', uploadError);
                alert('Erro ao fazer upload da foto. Verifique se o bucket existe.');
                return null;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Preview local
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        // Upload
        const url = await uploadToStorage(file);
        if (url) {
            onUpload(url);
        }
    };

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            setStream(mediaStream);
            setShowCamera(true);

            // Aguardar o próximo render para ter o videoRef
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.play();
                }
            }, 100);
        } catch (error) {
            console.error('Erro ao acessar câmera:', error);
            alert('Não foi possível acessar a câmera. Verifique as permissões.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
    }, [stream]);

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Converter para blob
        canvas.toBlob(async (blob) => {
            if (!blob) return;

            // Preview
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setPreview(dataUrl);

            // Parar câmera
            stopCamera();

            // Upload
            const url = await uploadToStorage(blob);
            if (url) {
                onUpload(url);
            }
        }, 'image/jpeg', 0.8);
    };

    const handleRemove = () => {
        setPreview(null);
        onUpload(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const cardClass = `relative rounded-2xl border-2 border-dashed transition-all overflow-hidden ${isDark
            ? 'bg-slate-800/50 border-slate-700 hover:border-primary-500/50'
            : 'bg-white border-slate-200 hover:border-primary-500/50'
        }`;

    return (
        <div className="w-full">
            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Foto do Colaborador
            </label>

            <canvas ref={canvasRef} className="hidden" />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            <AnimatePresence mode="wait">
                {showCamera ? (
                    <motion.div
                        key="camera"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`${cardClass} aspect-video`}
                    >
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 gap-3">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    className={`p-3 rounded-full backdrop-blur-sm transition-all ${isDark ? 'bg-slate-800/80 text-white hover:bg-slate-700' : 'bg-white/80 text-slate-700 hover:bg-white'
                                        }`}
                                >
                                    <X size={20} />
                                </button>
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    className="p-4 rounded-full bg-primary-500 text-white hover:bg-primary-600 shadow-glow transition-all"
                                >
                                    <Camera size={24} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : preview ? (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`${cardClass} p-4`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>
                                    Foto selecionada
                                </p>
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {isUploading ? 'Enviando...' : 'Pronta para salvar'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                                        }`}
                                    title="Trocar foto"
                                >
                                    <RefreshCw size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                                        } hover:text-rose-500`}
                                    title="Remover foto"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`${cardClass} p-6`}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'
                                }`}>
                                <Camera size={28} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                            </div>
                            <p className={`text-sm font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-700'}`}>
                                Adicionar foto
                            </p>
                            <p className={`text-xs mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                JPG, PNG ou WebP (máx. 5MB)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${isDark
                                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                >
                                    <Upload size={14} /> Escolher arquivo
                                </button>
                                <button
                                    type="button"
                                    onClick={startCamera}
                                    className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold flex items-center gap-2 transition-all"
                                >
                                    <Camera size={14} /> Usar câmera
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FotoUpload;
