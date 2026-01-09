/**
 * Brazilian CEP (postal code) lookup service
 * Uses ViaCEP free API
 */

export interface CepResult {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string; // cidade
    uf: string; // estado
    erro?: boolean;
}

/**
 * Search address by Brazilian CEP (postal code)
 */
export async function searchByCep(cep: string): Promise<CepResult | null> {
    // Remove non-numeric characters
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
        return null;
    }

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

        if (!response.ok) {
            throw new Error('Erro ao buscar CEP');
        }

        const data: CepResult = await response.json();

        if (data.erro) {
            return null;
        }

        return data;
    } catch (error) {
        console.error('CEP search error:', error);
        return null;
    }
}
