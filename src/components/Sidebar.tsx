import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    ShieldCheck,
    LayoutDashboard,
    Users,
    ChevronDown,
    Plus,
    Settings,
    HelpCircle,
    Clock,
    LogOut,
    Sun,
    Moon,
    MapPin,
    AlertCircle,
    FileCheck,
    Calendar,
    Wallet,
    FileText,
    Upload,
    MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface MenuItem {
    title: string;
    icon: React.ElementType;
    path?: string;
    permission?: string;
    subItems?: { title: string; path: string; isNew?: boolean; permission?: string }[];
}

const menuData: MenuItem[] = [
    {
        title: 'Dashboard',
        icon: LayoutDashboard,
        path: '/',
        permission: 'modulo_dashboard'
    },
    {
        title: 'Gestão Organizacional',
        icon: ShieldCheck,
        subItems: [
            { title: 'Dados da Empresa', path: '/dados-empresa', permission: 'modulo_setores' },
            { title: 'Setores', path: '/setores', permission: 'modulo_setores' },
            { title: 'Funções', path: '/funcoes', permission: 'modulo_funcoes' },
            { title: 'Locais de Trabalho', path: '/locais-trabalho', isNew: true, permission: 'modulo_locais' },
        ],
    },
    {
        title: 'Pessoal',
        icon: Users,
        subItems: [
            { title: 'Colaboradores', path: '/colaboradores', permission: 'modulo_colaboradores' },
            { title: 'Importar Funcionários', path: '/importar-colaboradores', isNew: true, permission: 'modulo_colaboradores' },
            { title: 'Biometria', path: '/biometria', permission: 'modulo_biometria' },
        ],
    },
    {
        title: 'Ponto',
        icon: Clock,
        subItems: [
            { title: 'Registro de Ponto', path: '/registro-ponto', permission: 'modulo_registro_ponto' },
            { title: 'Controle de Ponto', path: '/controle-ponto', permission: 'modulo_ponto' },
            { title: 'Calendário Operacional', path: '/calendario-visual', isNew: true, permission: 'modulo_ponto' },
            { title: 'Escalas de Serviço', path: '/escalas', permission: 'modulo_ponto' },
            { title: 'Banco de Horas', path: '/banco-horas', isNew: true, permission: 'modulo_ponto' },
            { title: 'Fechamento de Mês', path: '/fechamento', isNew: true, permission: 'modulo_ponto' },
            { title: 'Minhas Assinaturas', path: '/assinatura-ponto', isNew: true, permission: 'modulo_ponto' },
            { title: 'Afastamentos', path: '/afastamentos', permission: 'modulo_afastamentos' },
            { title: 'Gestão de Férias', path: '/ferias', isNew: true, permission: 'modulo_afastamentos' },
        ],
    },
    {
        title: 'Relatórios',
        icon: FileText,
        subItems: [
            { title: 'Monitoramento Live', path: '/status-live', isNew: true, permission: 'modulo_status_live' },
            { title: 'Central de Relatórios', path: '/relatorios', isNew: true, permission: 'modulo_relatorios' },
            { title: 'Relatório de Funcionários', path: '/relatorios/funcionarios', isNew: true, permission: 'modulo_colaboradores' },
            { title: 'Inconsistências e Faltas', path: '/inconsistencias', isNew: true, permission: 'modulo_ponto' },
            { title: 'Exportação Folha', path: '/exportacao-folha', isNew: true, permission: 'modulo_ponto' },
        ],
    },
    {
        title: 'Justificativas',
        icon: MessageSquare,
        subItems: [
            { title: 'Minhas Solicitações', path: '/minhas-solicitacoes', isNew: true, permission: 'modulo_registro_ponto' },
            { title: 'Aprovação', path: '/aprovacao-justificativas', isNew: true, permission: 'modulo_ponto' },
        ],
    },
    {
        title: 'Configurações',
        icon: Settings,
        subItems: [
            { title: 'Tipos de Justificativa', path: '/tipos-justificativa', isNew: true, permission: 'modulo_justificativas' },
            { title: 'Tipos de Afastamento', path: '/tipos-afastamento', isNew: true, permission: 'modulo_tipos_afastamento' },
            { title: 'Regras de Horários', path: '/regras-horas', isNew: true, permission: 'modulo_banco_horas' },
        ],
    },
];

const SidebarItem = ({ item }: { item: MenuItem }) => {
    const location = useLocation();
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isParentActive = item.path === location.pathname ||
        (hasSubItems && item.subItems?.some(sub => sub.path === location.pathname));

    const [isOpen, setIsOpen] = useState(isParentActive);

    return (
        <div className="mb-1">
            {item.path ? (
                <Link
                    to={item.path}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${location.pathname === item.path
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span className="text-sm">{item.title}</span>
                    </div>
                </Link>
            ) : (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isParentActive ? 'text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span className="text-sm">{item.title}</span>
                    </div>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                        <ChevronDown size={14} className="opacity-60" />
                    </motion.div>
                </button>
            )}

            <AnimatePresence>
                {hasSubItems && isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-11 mt-1 space-y-1"
                    >
                        {item.subItems?.map((sub, idx) => (
                            <Link
                                key={idx}
                                to={sub.path}
                                className={`w-full text-left py-2 text-xs transition-colors flex items-center gap-2 ${location.pathname === sub.path
                                    ? 'text-white font-semibold'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                {sub.isNew && <Plus size={10} />}
                                {sub.title}
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Sidebar = () => {
    const { profile, signOut, isDeveloper, isAdmin } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();

    const handleLogout = async () => {
        await signOut();
    };

    const getRoleBadge = () => {
        if (isDeveloper) return { label: 'DEVELOPER', color: 'bg-purple-500/20 text-purple-300' };
        switch (profile?.role) {
            case 'superadmin': return { label: 'SUPER ADMIN', color: 'bg-red-500/20 text-red-300' };
            case 'admin': return { label: 'ADMIN', color: 'bg-blue-400/20 text-blue-300' };
            case 'manager': return { label: 'GESTOR', color: 'bg-green-500/20 text-green-300' };
            default: return { label: 'COLABORADOR', color: 'bg-white/10 text-white/70' };
        }
    };

    const roleBadge = getRoleBadge();

    return (
        <aside className="w-[280px] h-screen fixed left-0 top-0 flex flex-col z-50 bg-sidebar-gradient dark:bg-sidebar-gradient-dark shadow-xl">
            {/* Logo */}
            <div className="p-6 flex flex-col items-center gap-2">
                <img
                    src="/LOGO_TRANSP.png"
                    alt="Logo"
                    className="max-w-[200px] h-auto"
                />
            </div>

            {/* Menu */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4">
                {menuData.filter(item => {
                    if (item.permission === 'developer_only') return isDeveloper;
                    if (isDeveloper || isAdmin) return true;
                    if (item.permission && profile?.permissoes?.includes(item.permission)) return true;
                    if (item.subItems) {
                        return item.subItems.some(sub => profile?.permissoes?.includes(sub.permission || ''));
                    }
                    return false;
                }).map((item, index) => {
                    const filteredItem = {
                        ...item,
                        subItems: (isDeveloper || isAdmin) ? item.subItems : item.subItems?.filter(sub => profile?.permissoes?.includes(sub.permission || ''))
                    };
                    return <SidebarItem key={index} item={filteredItem} />;
                })}
            </nav>

            {/* Theme Toggle */}
            <div className="px-4 mb-2">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all text-white/80 hover:text-white"
                >
                    <div className="flex items-center gap-3">
                        {isDark ? <Moon size={18} /> : <Sun size={18} />}
                        <span className="text-sm">{isDark ? 'Tema Escuro' : 'Tema Claro'}</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${isDark ? 'bg-primary-600' : 'bg-amber-400'}`}>
                        <motion.div
                            animate={{ x: isDark ? 20 : 2 }}
                            className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                        />
                    </div>
                </button>
            </div>

            {/* Help */}
            <div className="px-4 mb-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all">
                    <HelpCircle size={18} />
                    <span className="text-sm">Central de Ajuda</span>
                </button>
            </div>

            {/* Developer Only Section */}
            {isDeveloper && (
                <div className="px-4 mb-4 pt-4 border-t border-white/5">
                    <p className="px-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Gestão SaaS
                    </p>
                    <Link
                        to="/admin/empresas"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${location.pathname === '/admin/empresas'
                            ? 'bg-primary-500 text-white shadow-glow font-semibold'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        <ShieldCheck size={18} />
                        <span className="text-sm">Gestão de Empresas</span>
                    </Link>
                </div>
            )}



            {/* Profile */}
            <div className="p-4 mx-4 mb-4 bg-white/10 backdrop-blur-sm rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">
                        {profile?.nome?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{profile?.nome || 'Usuário'}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${roleBadge.color}`}>
                            {roleBadge.label}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                        title="Sair"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
