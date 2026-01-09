import { supabase } from './supabaseClient';
import type { Geolocalizacao } from '../types';

/**
 * Service para obter geolocalização do usuário
 */

export const getGeolocalizacao = (): Promise<Geolocalizacao> => {
    return new Promise((resolve, reject) => {
        if (!("geolocation" in navigator)) {
            reject(new Error('Geolocalização não suportada'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;

                // Tentar obter endereço via geocoding reverso
                let address: string | undefined;
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                        { headers: { 'Accept-Language': 'pt-BR' } }
                    );
                    const data = await response.json();
                    if (data.display_name) {
                        address = data.display_name;
                    }
                } catch (e) {
                    console.warn('Erro ao obter endereço:', e);
                }

                resolve({
                    lat: latitude,
                    lng: longitude,
                    accuracy,
                    address,
                    timestamp: new Date().toISOString()
                });
            },
            (error) => {
                reject(new Error(`Erro de geolocalização: ${error.message}`));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
};

/**
 * Verifica se a localização está dentro de um local de trabalho permitido
 */
export const verificarDentroDoRaio = async (
    lat: number,
    lng: number,
    empresaId: string
): Promise<{ dentroRaio: boolean; localNome?: string; distancia?: number }> => {
    const { data: locais } = await supabase
        .from('locais_trabalho')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true);

    if (!locais || locais.length === 0) {
        // Se não há locais cadastrados, permite registro em qualquer lugar
        return { dentroRaio: true, localNome: 'Sem restrição de local' };
    }

    for (const local of locais) {
        const distancia = calcularDistancia(lat, lng, local.latitude, local.longitude);
        if (distancia <= local.raio_metros) {
            return {
                dentroRaio: true,
                localNome: local.nome,
                distancia: Math.round(distancia)
            };
        }
    }

    return { dentroRaio: false };
};

/**
 * Calcula distância entre dois pontos em metros (fórmula de Haversine)
 */
const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Raio da Terra em metros
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const toRad = (deg: number): number => deg * (Math.PI / 180);
