import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import type { Funcionario } from '../types';

type UserRole = 'developer' | 'superadmin' | 'admin' | 'manager' | 'employee';
const ADMIN_DEFAULT_PERMISSIONS = [
    'modulo_dashboard',
    'modulo_setores',
    'modulo_funcoes',
    'modulo_jornadas',
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
        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.warn('Erro ao obter sessão inicial:', error.message);
                if (error.message.includes('Refresh Token Not Found') || error.message.includes('invalid_grant')) {
                    // Limpar completamente o localStorage para forçar novo login
                    console.warn('Token inválido detectado. Limpando dados de sessão...');
                    localStorage.removeItem('sb-otgfbjjfpgpywiyppjtd-auth-token');
                    supabase.auth.signOut();
                }
                setLoading(false);
                return;
            }
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user);
            } else {
                setLoading(false);
            }
        }).catch(() => setLoading(false));

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                    return;
                }

                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user);
                } else {
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (user: User) => {
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
                    funcionarios_biometria (status),
                    empresas:empresa_id (status, bloqueado_por_atraso, razao_social, cnpj, endereco)
                `)
                .eq('user_id', user.id)
                .single();

            console.log('[AuthContext] Funcionario result:', { funcionario, error });

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
                const biometriaData = funcionario.funcionarios_biometria as any[];
                const biometriaAtiva = biometriaData?.some(b => b.status === 'Ativo');

                const userProfile: UserProfile = {
                    id: user.id,
                    email: funcionario.email || user.email || '',
                    role,
                    nome: funcionario.nome,
                    empresa_id: funcionario.empresa_id,
                    funcionario_id: funcionario.id,
                    funcao: funcao?.nome,
                    setor: (funcionario.setores as any)?.nome,
                    foto_url: funcionario.foto_url,
                    cpf: funcionario.cpf,
                    pis_nis: funcionario.pis_nis,
                    biometria_ativa: biometriaAtiva,
                    empresa_bloqueada: (funcionario.empresas as any)?.bloqueado_por_atraso || (funcionario.empresas as any)?.status === 'bloqueado',
                    permissoes: (funcionario.funcoes as any)?.permissoes || (['developer', 'admin', 'superadmin'].includes(role) ? ADMIN_DEFAULT_PERMISSIONS : []),
                    empresa: {
                        razao_social: (funcionario.empresas as any)?.razao_social,
                        cnpj: (funcionario.empresas as any)?.cnpj,
                        endereco: (funcionario.empresas as any)?.endereco?.raw || (funcionario.empresas as any)?.endereco
                    }
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
