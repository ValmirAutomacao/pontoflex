import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRole?: 'developer' | 'superadmin' | 'admin' | 'manager' | 'employee';
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRole }) => {
    const { user, profile, loading } = useAuth();
    const { isDark } = useAuth() as any; // Fallback if not in theme context
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-deep-void flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Verificando autenticação...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        // Redirect to login page with return url
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Bloqueio por faturamento (apenas para não-developers)
    if (profile?.empresa_bloqueada && profile.role !== 'developer') {
        return (
            <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <div className={`max-w-md w-full p-10 rounded-3xl border shadow-2xl text-center ${isDark ? 'bg-slate-800 border-rose-500/20' : 'bg-white border-rose-100'}`}>
                    <div className="w-20 h-20 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-8 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Acesso Suspenso</h2>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        O acesso para esta empresa foi temporariamente suspenso devido a pendências administrativas ou de faturamento.
                    </p>
                    <div className={`mt-8 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Por favor, entre em contato com o administrador do sistema pelo e-mail:<br />
                            <span className="font-semibold text-primary-500">suporte@pontoflex.com.br</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Check granular permissions for non-developers
    if (profile && profile.role !== 'developer') {
        const pathPermissionMap: Record<string, string> = {
            '/': 'modulo_dashboard',
            '/setores': 'modulo_setores',
            '/funcoes': 'modulo_funcoes',
            '/jornadas': 'modulo_jornadas',
            '/colaboradores': 'modulo_colaboradores',
            '/importar-colaboradores': 'modulo_colaboradores',
            '/biometria': 'modulo_biometria',
            '/registro-ponto': 'modulo_registro_ponto',
            '/minhas-solicitacoes': 'modulo_registro_ponto',
            '/controle-ponto': 'modulo_ponto',
            '/calendario-visual': 'modulo_ponto',
            '/escalas': 'modulo_ponto',
            '/fechamento': 'modulo_ponto',
            '/assinatura-ponto': 'modulo_ponto',
            '/exportacao-folha': 'modulo_ponto',
            '/aprovacao-justificativas': 'modulo_ponto',
            '/locais-trabalho': 'modulo_locais',
            '/dados-empresa': 'modulo_setores',
            '/tipos-justificativa': 'modulo_justificativas',
            '/tipos-afastamento': 'modulo_tipos_afastamento',
            '/afastamentos': 'modulo_afastamentos',
            '/ferias': 'modulo_afastamentos',
            '/banco-horas': 'modulo_banco_horas',
            '/regras-horas': 'modulo_banco_horas',
            '/status-live': 'modulo_status_live',
            '/relatorios': 'modulo_relatorios',
            '/relatorios/consolidado': 'modulo_relatorios',
            '/relatorios/sentimentos': 'modulo_relatorios',
            '/relatorios/funcionarios': 'modulo_colaboradores',
        };

        const currentPath = location.pathname;
        const requiredPermission = pathPermissionMap[currentPath];

        if (requiredPermission && !profile.permissoes?.includes(requiredPermission)) {
            // User doesn't have the specific permission for this module
            return (
                <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                    <div className={`max-w-md w-full p-10 rounded-3xl border shadow-2xl text-center ${isDark ? 'bg-slate-800 border-amber-500/20' : 'bg-white border-amber-100'}`}>
                        <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Acesso Restrito</h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Você não tem permissão para acessar o módulo: <span className="font-semibold">{currentPath}</span></p>
                    </div>
                </div>
            );
        }

        // Keep legacy role hierarchy check if needed
        if (requiredRole) {
            const roleHierarchy = ['employee', 'manager', 'admin', 'superadmin', 'developer'];
            const userRoleIndex = roleHierarchy.indexOf(profile.role);
            const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

            if (userRoleIndex < requiredRoleIndex) {
                // User doesn't have sufficient permissions
                return (
                    <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                        <div className={`max-w-md w-full p-10 rounded-3xl border shadow-2xl text-center ${isDark ? 'bg-slate-800 border-amber-500/20' : 'bg-white border-amber-100'}`}>
                            <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Nível de Acesso Insuficiente</h2>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Seu cargo não permite o acesso a esta área restrita.</p>
                        </div>
                    </div>
                );
            }
        }
    }

    return <>{children}</>;
};

export default AuthGuard;
