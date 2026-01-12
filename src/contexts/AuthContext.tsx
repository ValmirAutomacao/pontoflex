import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import type { Funcionario } from '../types';

const isValidUUID = (uuid: string | undefined | null): boolean => {
    if (!uuid) return false;
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

type UserRole = 'developer' | 'superadmin' | 'admin' | 'manager' | 'employee';
const ADMIN_DEFAULT_PERMISSIONS = [
    'modulo_dashboard',
    'modulo_setores',
    'modulo_funcoes',
    'modulo_colaboradores',
    'modulo_biometria',
    'modulo_registro_ponto',
    'modulo_controle_ponto',
    'modulo_locais',
    'modulo_justificativas',
    'modulo_tipos_afastamento',
    'modulo_afastamentos'
];

interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    nome: string;
    cpf?: string;
    pis_nis?: string;
    empresa_id?: string;
    funcionario_id?: string;
    escala_id?: string;
    escalas?: any[]; // Todas as escalas ativas do colaborador
    funcao?: string;
    setor?: string;
    foto_url?: string;
    biometria_ativa?: boolean;
    empresa_bloqueada?: boolean;
    permissoes?: string[];
    empresa?: {
        razao_social: string;
        cnpj: string;
        endereco?: string;
    };
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    isDeveloper: boolean;
    isAdmin: boolean;
    isManager: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

const DEVELOPER_EMAIL = 'valmirmoreirajunior@gmail.com';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let refreshInterval: NodeJS.Timeout;

        // Função para recuperar e validar sessão
        const initializeSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.warn('Erro ao obter sessão inicial:', error.message);
                    if (error.message.includes('Refresh Token Not Found') || error.message.includes('invalid_grant')) {
                        console.warn('Token inválido detectado. Limpando dados de sessão...');
                        localStorage.removeItem('sb-otgfbjjfpgpywiyppjtd-auth-token');
                        await supabase.auth.signOut();
                    }
                    setLoading(false);
                    return;
                }

                if (session) {
                    setSession(session);
                    setUser(session.user);
                    await fetchProfile(session.user);

                    // Configurar renovação automática de sessão (a cada 10 minutos)
                    refreshInterval = setInterval(async () => {
                        console.log('[AuthContext] Renovando sessão automaticamente...');
                        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
                        if (refreshError) {
                            console.warn('[AuthContext] Erro ao renovar sessão:', refreshError.message);
                        } else if (newSession) {
                            setSession(newSession);
                            setUser(newSession.user);
                            console.log('[AuthContext] Sessão renovada com sucesso');
                        }
                    }, 10 * 60 * 1000); // 10 minutos
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('[AuthContext] Erro crítico na inicialização:', err);
                setLoading(false);
            }
        };

        initializeSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[AuthContext] Auth event:', event);

                if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                    if (refreshInterval) clearInterval(refreshInterval);
                    return;
                }

                if (event === 'TOKEN_REFRESHED' && session) {
                    console.log('[AuthContext] Token renovado via evento');
                    setSession(session);
                    setUser(session.user);
                    return;
                }

                if (session?.user) {
                    setSession(session);
                    setUser(session.user);
                    await fetchProfile(session.user);
                } else if (event !== 'TOKEN_REFRESHED') {
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, []);

    const fetchProfile = async (user: User) => {
        if (!user?.id || !isValidUUID(user.id)) {
            console.error('[AuthContext] Invalid user ID for fetchProfile:', user?.id);
            setLoading(false);
            return;
        }

        const isDev = user.email === DEVELOPER_EMAIL;
        console.log('[AuthContext] Fetching profile for user:', user.id, user.email);

        try {
            // Buscar dados do funcionário no banco
            const { data: funcionario, error } = await supabase
                .from('funcionarios')
                .select(`
                    id,
                    nome,
                    email,
                    cpf,
                    pis_nis,
                    foto_url,
                    empresa_id,
                    funcoes:funcao_id (nome, nivel, permissoes),
                    setores:setor_id (nome),
                    funcionarios_escalas!funcionarios_escalas_funcionario_id_fkey (
                        escala:escala_id (
                            *,
                            escalas_horarios (*)
                        ),
                        data_inicio,
                        data_fim,
                        ativo
                    ),
                    funcionarios_biometria!funcionarios_biometria_funcionario_id_fkey (status),
                    empresas!funcionarios_empresa_id_fkey (status, bloqueado_por_atraso, razao_social, cnpj, endereco)
                `)
                .eq('user_id', user.id)
                .single();

            console.log('[AuthContext] Funcionario result:', { funcionario, error });
            if (error) {
                console.error('[AuthContext] ERROR DETAILS:', JSON.stringify(error, null, 2));
            }

            if (error || !funcionario) {
                console.warn('[AuthContext] Funcionario not found, using fallback profile');
                // Se não encontrou funcionário, criar perfil básico usando metadados do Auth
                const role = user.user_metadata?.role || (isDev ? 'developer' : 'admin');
                const userProfile: UserProfile = {
                    id: user.id,
                    email: user.email || '',
                    role: role,
                    nome: user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário',
                    empresa_id: user.user_metadata?.empresa_id,
                    permissoes: user.user_metadata?.permissoes || (['developer', 'admin', 'superadmin'].includes(role) ? ADMIN_DEFAULT_PERMISSIONS : []),
                };
                console.log('[AuthContext] Fallback profile:', userProfile);
                setProfile(userProfile);
            } else {
                // Determinar role baseado no nível da função
                let role: UserRole = 'employee';
                const funcao = funcionario.funcoes as any;

                if (isDev) {
                    role = 'developer';
                } else if (funcao?.nivel === 1) {
                    role = 'admin';
                } else if (funcao?.nivel === 2) {
                    role = 'manager';
                }

                // Verificar se tem biometria ativa
                const biometriaData = funcionario.funcionarios_biometria;
                const biometriaAtiva = Array.isArray(biometriaData)
                    ? biometriaData.some((b: any) => b.status === 'Ativo')
                    : (biometriaData as any)?.status === 'Ativo';

                // Determinar a escala ativa para hoje
                const hoje = new Date();
                const diaSemana = hoje.getDay(); // 0=Dom, 1=Seg...
                const dataIso = hoje.toISOString().split('T')[0];

                const todasAsEscalas = (funcionario.funcionarios_escalas as any[]) || [];
                const escalasAtivas = todasAsEscalas.filter(f =>
                    f.ativo &&
                    f.data_inicio <= dataIso &&
                    (!f.data_fim || f.data_fim >= dataIso)
                );

                // Tentar encontrar a escala que tem horário para hoje
                let escalaIdFinal = undefined;
                let escalaEncontrada = escalasAtivas.find(f => {
                    const horarios = f.escala?.escalas_horarios || [];
                    return horarios.some((h: any) => h.dia_semana === diaSemana && !h.is_folga);
                });

                // Se não achou escala com horário hoje, pega a primeira ativa
                if (escalaEncontrada) {
                    escalaIdFinal = escalaEncontrada.escala?.id;
                } else if (escalasAtivas.length > 0) {
                    escalaIdFinal = escalasAtivas[0].escala?.id;
                }

                const userProfile: UserProfile = {
                    id: user.id,
                    email: funcionario.email || user.email || '',
                    role,
                    nome: funcionario.nome,
                    empresa_id: funcionario.empresa_id,
                    funcionario_id: funcionario.id,
                    escala_id: escalaIdFinal,
                    escalas: escalasAtivas.map(f => f.escala),
                    funcao: funcao?.nome,
                    setor: (funcionario.setores as any)?.nome,
                    foto_url: funcionario.foto_url,
                    cpf: funcionario.cpf,
                    pis_nis: funcionario.pis_nis,
                    biometria_ativa: biometriaAtiva,
                    permissoes: (funcao?.permissoes as string[]) || (['developer', 'admin', 'superadmin'].includes(role) ? ADMIN_DEFAULT_PERMISSIONS : []),
                    empresa_bloqueada: funcionario.empresas?.status !== 'ativo' || funcionario.empresas?.bloqueado_por_atraso,
                    empresa: funcionario.empresas
                };
                setProfile(userProfile);
            }
        } catch (err) {
            console.error('Erro crítico ao buscar perfil:', err);
            // Fallback para perfil básico
            const role = user.user_metadata?.role || (isDev ? 'developer' : 'admin');
            const userProfile: UserProfile = {
                id: user.id,
                email: user.email || '',
                role: role,
                nome: user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário',
                empresa_id: user.user_metadata?.empresa_id,
                permissoes: user.user_metadata?.permissoes || (['developer', 'admin', 'superadmin'].includes(role) ? ADMIN_DEFAULT_PERMISSIONS : []),
            };
            setProfile(userProfile);
        }

        setLoading(false);
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user);
        }
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
    };

    const isDeveloper = profile?.role === 'developer';
    const isAdmin = isDeveloper || profile?.role === 'superadmin' || profile?.role === 'admin';
    const isManager = isAdmin || profile?.role === 'manager';

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                session,
                loading,
                signIn,
                signOut,
                isDeveloper,
                isAdmin,
                isManager,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
