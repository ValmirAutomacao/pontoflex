export interface GeocodeResult {
    lat: number;
    lon: number;
    display_name: string;
    address: {
        road?: string;
        house_number?: string;
        suburb?: string;
        city?: string;
        city_district?: string;
        town?: string;
        village?: string;
        state?: string;
        postcode?: string;
        country?: string;
    };
}

/**
 * Searches for coordinates and address details using OpenStreetMap Nominatim.
 * Optimized for Brazilian addresses.
 */
export async function searchAddress(query: string): Promise<GeocodeResult[]> {
    if (!query || query.length < 3) return [];

    try {
        // Add "Brasil" to query if not already present for better results
        const enhancedQuery = query.toLowerCase().includes('brasil') || query.toLowerCase().includes('brazil')
            ? query
            : `${query}, Brasil`;

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enhancedQuery)}&addressdetails=1&limit=8&countrycodes=br&accept-language=pt-BR`
        );

        if (!response.ok) {
            throw new Error('Erro ao buscar endereço');
        }

        const data = await response.json();
        return data.map((item: any) => ({
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            display_name: item.display_name,
            address: {
                road: item.address?.road,
                house_number: item.address?.house_number,
                suburb: item.address?.suburb || item.address?.neighbourhood,
                city: item.address?.city || item.address?.town || item.address?.village || item.address?.city_district,
                city_district: item.address?.city_district,
                town: item.address?.town,
                village: item.address?.village,
                state: item.address?.state,
                postcode: item.address?.postcode,
                country: item.address?.country
            }
        }));
    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}

/**
 * Reverse geocoding - get address from coordinates
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=pt-BR`
        );

        if (!response.ok) {
            throw new Error('Erro ao buscar endereço reverso');
        }

        const item = await response.json();
        if (item.error) return null;

        return {
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            display_name: item.display_name,
            address: {
                road: item.address?.road,
                house_number: item.address?.house_number,
                suburb: item.address?.suburb || item.address?.neighbourhood,
                city: item.address?.city || item.address?.town || item.address?.village || item.address?.city_district,
                city_district: item.address?.city_district,
                town: item.address?.town,
                village: item.address?.village,
                state: item.address?.state,
                postcode: item.address?.postcode,
                country: item.address?.country
            }
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}
