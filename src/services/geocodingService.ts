export interface GeocodeResult {
    lat: number;
    lon: number;
    display_name: string;
    address: {
        road?: string;
        house_number?: string;
        suburb?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
    };
}

/**
 * Searches for coordinates and address details using OpenStreetMap Nominatim.
 */
export async function searchAddress(query: string): Promise<GeocodeResult[]> {
    if (!query || query.length < 3) return [];

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=br`
        );

        if (!response.ok) {
            throw new Error('Erro ao buscar endereço');
        }

        const data = await response.json();
        return data.map((item: any) => ({
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            display_name: item.display_name,
            address: item.address
        }));
    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}
