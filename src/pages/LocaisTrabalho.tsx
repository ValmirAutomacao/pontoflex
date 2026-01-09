import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import DataTable from '../components/DataTable';
import { MapPin, Edit2, Trash2, Navigation, X, Save, Search as SearchIcon, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchAddress, GeocodeResult } from '../services/geocodingService';
import type { Funcionario } from '../types';
import { maskCEP, unmask } from '../utils/masks';

interface LocalTrabalho {
    id: string;
    nome: string;
    endereco: string;
    latitude: number;
    longitude: number;
    raio_metros: number;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    ativo: boolean;
    created_at: string;
}

const LocaisTrabalho = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const [locais, setLocais] = useState<LocalTrabalho[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLocal, setEditingLocal] = useState<LocalTrabalho | null>(null);
    const [formData, setFormData] = useState({
        nome: '', cep: '', logradouro: '', numero: '', complemento: '',
        bairro: '', cidade: '', estado: '',
        latitude: '', longitude: '', raio_metros: 50, ativo: true
    });
    const [saving, setSaving] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);

    // Geocoding
    const [addressQuery, setAddressQuery] = useState('');
    const [addressResults, setAddressResults] = useState<GeocodeResult[]>([]);
    const [searchingAddress, setSearchingAddress] = useState(false);

    // Employees
    const [allFuncionarios, setAllFuncionarios] = useState<Funcionario[]>([]);
    const [selectedFuncIds, setSelectedFuncIds] = useState<string[]>([]);
    const [funcSearch, setFuncSearch] = useState('');

    useEffect(() => {
        fetchLocais();
        fetchFuncionarios();
    }, []);

    const fetchFuncionarios = async () => {
        if (!profile?.empresa_id) return;
        const { data } = await supabase
            .from('funcionarios')
            .select('id, nome, email')
            .eq('empresa_id', profile.empresa_id)
            .eq('status', 'Ativo')
            .order('nome');
        if (data) setAllFuncionarios(data as any);
    };

    const fetchLocais = async () => {
        if (!profile?.empresa_id) return;
        setLoading(true);
        const { data } = await supabase
            .from('locais_trabalho')
            .select('*')
            .eq('empresa_id', profile.empresa_id)
            .order('nome');
        if (data) setLocais(data);
        setLoading(false);
    };

    const fetchAssignments = async (localId: string) => {
        const { data } = await supabase
            .from('funcionario_locais')
            .select('funcionario_id')
            .eq('local_id', localId);
        if (data) {
            setSelectedFuncIds(data.map(d => d.funcionario_id));
        } else {
            setSelectedFuncIds([]);
        }
    };

    const handleOpenCreate = () => {
        setEditingLocal(null);
        setFormData({
            nome: '', cep: '', logradouro: '', numero: '', complemento: '',
            bairro: '', cidade: '', estado: '',
            latitude: '', longitude: '', raio_metros: 50, ativo: true
        });
        setSelectedFuncIds([]);
        setAddressQuery('');
        setAddressResults([]);
        setIsModalOpen(true);
    };

    const handleOpenEdit = async (local: LocalTrabalho | any) => {
        setEditingLocal(local);
        setFormData({
            nome: local.nome,
            cep: local.cep || '',
            logradouro: local.logradouro || '',
            numero: local.numero || '',
            complemento: local.complemento || '',
            bairro: local.bairro || '',
            cidade: local.cidade || '',
            estado: local.state || local.estado || '',
            latitude: local.latitude.toString(),
            longitude: local.longitude.toString(),
            raio_metros: local.raio_metros,
            ativo: local.ativo
        });
        setAddressQuery('');
        setAddressResults([]);
        await fetchAssignments(local.id);
        setIsModalOpen(true);
    };

    const handleAddressSearch = async () => {
        if (!addressQuery || addressQuery.length < 3) return;
        setSearchingAddress(true);
        const results = await searchAddress(addressQuery);
        setAddressResults(results);
        setSearchingAddress(false);
    };

    const handleSelectAddress = (res: GeocodeResult) => {
        setFormData({
            ...formData,
            latitude: res.lat.toString(),
            longitude: res.lon.toString(),
            cep: res.address.postcode || formData.cep,
            logradouro: res.address.road || formData.logradouro,
            numero: res.address.house_number || formData.numero,
            bairro: res.address.suburb || formData.bairro,
            cidade: res.address.city || formData.cidade,
            estado: res.address.state || formData.estado
        });
        setAddressResults([]);
        setAddressQuery(res.display_name);
    };

    const handleGetCurrentLocation = () => {
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData({
                    ...formData,
                    latitude: position.coords.latitude.toString(),
                    longitude: position.coords.longitude.toString()
                });
                setGettingLocation(false);
            },
            (error) => {
                alert('Erro ao obter localização: ' + error.message);
                setGettingLocation(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.empresa_id) return;
        setSaving(true);

        try {
            const payload = {
                nome: formData.nome,
                cep: unmask(formData.cep),
                logradouro: formData.logradouro,
                numero: formData.numero,
                complemento: formData.complemento,
                bairro: formData.bairro,
                cidade: formData.cidade,
                estado: formData.estado,
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                raio_metros: formData.raio_metros,
                ativo: formData.ativo,
                empresa_id: profile.empresa_id
            };

            let localId = editingLocal?.id;

            if (editingLocal) {
                const { error } = await supabase.from('locais_trabalho').update(payload).eq('id', editingLocal.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('locais_trabalho').insert([payload]).select().single();
                if (error) throw error;
                localId = data.id;
            }

            // Sync assignments
            if (localId) {
                // Remove old
                await supabase.from('funcionario_locais').delete().eq('local_id', localId);
                // Add new
                if (selectedFuncIds.length > 0) {
                    const assignments = selectedFuncIds.map(fId => ({
                        funcionario_id: fId,
                        local_id: localId,
                        empresa_id: profile.empresa_id
                    }));
                    const { error: assignError } = await supabase.from('funcionario_locais').insert(assignments);
                    if (assignError) throw assignError;
                }
            }

            setIsModalOpen(false);
            fetchLocais();
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir este local?')) return;
        const { error } = await supabase.from('locais_trabalho').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchLocais();
    };

    const filteredLocais = locais.filter(l =>
        (l.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const inputClass = `w-full border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark
        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
        }`;

    return (
        <>
            <DataTable
                title="Locais de Trabalho"
                subtitle="Gerencie os pontos de trabalho permitidos"
                searchPlaceholder="Buscar locais..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                onAdd={handleOpenCreate}
                addButtonLabel="Novo Local"
                onRefresh={fetchLocais}
                loading={loading}
                columns={[
                    { key: 'local', label: 'Local' },
                    { key: 'coordenadas', label: 'Coordenadas' },
                    { key: 'raio', label: 'Raio' },
                    { key: 'status', label: 'Status' },
                    { key: 'acoes', label: 'Ações', width: '100px' }
                ]}
                data={filteredLocais}
                renderRow={(local) => (
                    <tr key={local.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-600'}`}>
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{local.nome}</p>
                                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {local.logradouro ? `${local.logradouro}, ${local.numero || 'S/N'} - ${local.bairro || ''}` : 'Sem endereço'}
                                    </p>
                                </div>
                            </div>
                        </td>
                        <td className={`px-5 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {local.latitude?.toFixed(4)}, {local.longitude?.toFixed(4)}
                        </td>
                        <td className={`px-5 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {local.raio_metros}m
                        </td>
                        <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${local.ativo
                                ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                                : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                                }`}>
                                {local.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleOpenEdit(local)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-primary-500`}>
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(local.id)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} hover:text-red-500`}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </td>
                    </tr>
                )}
            />

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-6 overflow-y-auto">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-lg rounded-2xl border shadow-xl my-4 md:my-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                        >
                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {editingLocal ? 'Editar Local' : 'Novo Local'}
                                        </h2>
                                    </div>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                                        <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                    </button>
                                </div>

                                <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Busca Automática</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    className={inputClass}
                                                    placeholder="Digite o endereço para buscar..."
                                                    value={addressQuery}
                                                    onChange={e => setAddressQuery(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddressSearch())}
                                                />
                                                {searchingAddress && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddressSearch}
                                                className={`p-2.5 rounded-lg border transition-all ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                                            >
                                                <SearchIcon size={18} />
                                            </button>
                                        </div>

                                        {addressResults.length > 0 && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`mt-2 rounded-lg border shadow-lg overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                                {addressResults.map((res, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => handleSelectAddress(res)}
                                                        className={`w-full p-3 text-left text-xs transition-colors border-b last:border-0 ${isDark ? 'hover:bg-slate-700 border-slate-700 text-slate-300' : 'hover:bg-slate-50 border-slate-100 text-slate-600'}`}
                                                    >
                                                        {res.display_name}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nome do Local</label>
                                        <input required className={inputClass} placeholder="Ex: Escritório Central" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Localização e Raio</p>
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Latitude</label>
                                            <input required type="number" step="any" className={inputClass} value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Longitude</label>
                                            <input required type="number" step="any" className={inputClass} value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGetCurrentLocation}
                                        disabled={gettingLocation}
                                        className={`w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                            } disabled:opacity-50`}
                                    >
                                        <Navigation size={14} /> {gettingLocation ? 'Obtendo...' : 'Usar localização atual'}
                                    </button>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Raio de Tolerância (metros)</label>
                                        <input required type="number" className={inputClass} value={formData.raio_metros} onChange={e => setFormData({ ...formData, raio_metros: parseInt(e.target.value) })} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Endereço Completo</p>
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>CEP</label>
                                            <input className={inputClass} value={formData.cep} onChange={e => setFormData({ ...formData, cep: maskCEP(e.target.value) })} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Logradouro</label>
                                            <input className={inputClass} value={formData.logradouro} onChange={e => setFormData({ ...formData, logradouro: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Número</label>
                                            <input className={inputClass} value={formData.numero} onChange={e => setFormData({ ...formData, numero: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Complemento</label>
                                            <input className={inputClass} value={formData.complemento} onChange={e => setFormData({ ...formData, complemento: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Bairro</label>
                                            <input className={inputClass} value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cidade</label>
                                            <input className={inputClass} value={formData.cidade} onChange={e => setFormData({ ...formData, cidade: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Estado</label>
                                            <input className={inputClass} value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <Users size={14} /> Atribuir Colaboradores
                                            </label>
                                            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{selectedFuncIds.length} selecionados</span>
                                        </div>

                                        <div className="relative mb-3">
                                            <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={14} />
                                            <input
                                                className={`${inputClass} !py-2 !pl-9`}
                                                placeholder="Buscar colaborador..."
                                                value={funcSearch}
                                                onChange={e => setFuncSearch(e.target.value)}
                                            />
                                        </div>

                                        <div className={`space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar`}>
                                            {allFuncionarios.filter(f => (f.nome?.toLowerCase() || '').includes(funcSearch.toLowerCase())).map(func => {
                                                const isSelected = selectedFuncIds.includes(func.id);
                                                return (
                                                    <button
                                                        key={func.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) setSelectedFuncIds(selectedFuncIds.filter(id => id !== func.id));
                                                            else setSelectedFuncIds([...selectedFuncIds, func.id]);
                                                        }}
                                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all border ${isSelected
                                                            ? isDark ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-primary-50 border-primary-200 text-primary-700'
                                                            : isDark ? 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                                            }`}
                                                    >
                                                        <div className="text-left">
                                                            <p className="text-xs font-semibold">{func.nome}</p>
                                                            <p className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{func.email}</p>
                                                        </div>
                                                        {isSelected && <Check size={14} />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {editingLocal && (
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" id="ativo" checked={formData.ativo} onChange={e => setFormData({ ...formData, ativo: e.target.checked })} className="rounded" />
                                            <label htmlFor="ativo" className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Local ativo</label>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-2.5 rounded-lg font-medium text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={saving} className="flex-1 bg-primary-500 hover:bg-primary-600 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={14} /> Salvar</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
        </>
    );
};

export default LocaisTrabalho;
