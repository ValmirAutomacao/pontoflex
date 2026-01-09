import { Network } from '@capacitor/network';
import { storageService } from './storageService';
import { supabase } from './supabaseClient';

const PENDING_SYNC_KEY = 'pending_ponto_registrations';

export interface PendingRegistration {
    offline_id: string;
    funcionario_id: string;
    empresa_id: string;
    data_registro: string;
    hora_registro: string;
    latitude?: number;
    longitude?: number;
    foto_url?: string;
    tipo: 'biometria' | 'senha';
    is_offline: boolean;
}

class OfflineSyncService {
    private isSyncing = false;

    constructor() {
        this.initNetworkListener();
    }

    private initNetworkListener() {
        Network.addListener('networkStatusChange', status => {
            if (status.connected) {
                console.log('Rede restaurada. Iniciando sincronização...');
                this.syncPending();
            }
        });
    }

    async addPending(registration: Omit<PendingRegistration, 'offline_id' | 'is_offline' | 'data_registro' | 'hora_registro'>) {
        const now = new Date();
        const pending: PendingRegistration = {
            ...registration,
            offline_id: crypto.randomUUID(),
            is_offline: true,
            data_registro: now.toISOString().split('T')[0],
            hora_registro: now.toTimeString().split(' ')[0],
        };

        const currentQueue = await this.getQueue();
        await storageService.set(PENDING_SYNC_KEY, [...currentQueue, pending]);

        // Tenta sincronizar imediatamente se estiver online
        const status = await Network.getStatus();
        if (status.connected) {
            this.syncPending();
        }

        return pending;
    }

    async getQueue(): Promise<PendingRegistration[]> {
        return (await storageService.get(PENDING_SYNC_KEY)) || [];
    }

    async syncPending() {
        if (this.isSyncing) return;

        const queue = await this.getQueue();
        if (queue.length === 0) return;

        this.isSyncing = true;
        console.log(`Sincronizando ${queue.length} registros pendentes...`);

        const failed: PendingRegistration[] = [];

        for (const reg of queue) {
            try {
                const { error } = await supabase
                    .from('registros_ponto')
                    .insert([{
                        funcionario_id: reg.funcionario_id,
                        empresa_id: reg.empresa_id,
                        data_registro: reg.data_registro,
                        hora_registro: reg.hora_registro,
                        latitude: reg.latitude,
                        longitude: reg.longitude,
                        foto_url: reg.foto_url,
                        tipo_registro: reg.tipo === 'biometria' ? 'Facial' : 'Senha',
                        is_offline: true,
                        server_sync_at: new Date().toISOString()
                    }]);

                if (error) throw error;
            } catch (err) {
                console.error(`Erro ao sincronizar registro ${reg.offline_id}:`, err);
                failed.push(reg);
            }
        }

        await storageService.set(PENDING_SYNC_KEY, failed);
        this.isSyncing = false;

        if (failed.length === 0) {
            console.log('Sincronização concluída com sucesso!');
        } else {
            console.warn(`${failed.length} registros falharam na sincronização.`);
        }
    }
}

export const offlineSyncService = new OfflineSyncService();
