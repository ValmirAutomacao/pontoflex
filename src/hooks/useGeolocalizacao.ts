import { useState, useEffect, useCallback } from 'react';
import { getGeolocalizacao, verificarDentroDoRaio } from '../services/geolocalizacao';
import type { Geolocalizacao } from '../types';

interface UseGeolocalizacaoReturn {
    localizacao: Geolocalizacao | null;
    loading: boolean;
    error: string | null;
    dentroRaio: boolean;
    localNome: string | null;
    refresh: () => void;
}

export const useGeolocalizacao = (empresaId?: string): UseGeolocalizacaoReturn => {
    const [localizacao, setLocalizacao] = useState<Geolocalizacao | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dentroRaio, setDentroRaio] = useState(true);
    const [localNome, setLocalNome] = useState<string | null>(null);

    const obterLocalizacao = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const loc = await getGeolocalizacao();
            setLocalizacao(loc);

            // Verificar se está dentro de algum local de trabalho
            if (empresaId) {
                const resultado = await verificarDentroDoRaio(loc.lat, loc.lng, empresaId);
                setDentroRaio(resultado.dentroRaio);
                setLocalNome(resultado.localNome || null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao obter localização');
        } finally {
            setLoading(false);
        }
    }, [empresaId]);

    useEffect(() => {
        obterLocalizacao();
    }, [obterLocalizacao]);

    return {
        localizacao,
        loading,
        error,
        dentroRaio,
        localNome,
        refresh: obterLocalizacao
    };
};
