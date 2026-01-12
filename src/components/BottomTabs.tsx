import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Clock,
    FileCheck,
    Wallet,
    User
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const BottomTabs: React.FC = () => {
    const location = useLocation();
    const { isDark } = useTheme();

    const tabs = [
        { label: 'Início', icon: LayoutDashboard, path: '/' },
        { label: 'Ponto', icon: Clock, path: '/registro-ponto' },
        { label: 'Assinar', icon: FileCheck, path: '/assinatura-ponto' },
        { label: 'Banco', icon: Wallet, path: '/banco-horas' },
    ];

    return (
        <nav className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t safe-area-bottom backdrop-blur-xl transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'
            }`}>
            <div className="flex items-center justify-around h-16">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    return (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${isActive
                                    ? 'text-primary-500'
                                    : isDark ? 'text-slate-500' : 'text-slate-400'
                                }`}
                        >
                            <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">
                                {tab.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
            {/* Safe area padding for iPhones with Home Bar */}
            <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
    );
};

export default BottomTabs;
