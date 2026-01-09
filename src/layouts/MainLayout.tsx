import React from 'react';
import Sidebar from '../components/Sidebar';
import { useTheme } from '../contexts/ThemeContext';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { isDark } = useTheme();

    return (
        <div className={`min-h-screen flex font-sans transition-colors duration-300 ${isDark
            ? 'bg-slate-900 text-white'
            : 'bg-slate-50 text-slate-900'
            }`}>
            <Sidebar />
            <div className="flex-1 ml-[280px] flex flex-col">
                {/* Top Bar */}
                <header className={`h-[64px] flex items-center justify-between px-8 border-b sticky top-0 z-40 backdrop-blur-xl transition-colors ${isDark
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white/80 border-slate-200'
                    }`}>
                    <div className="flex-1">
                        <h2 className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Sistema de Gestão de Ponto Inteligente
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Sistema Online
                        </div>
                    </div>
                </header>

                <main className="flex-1 relative overflow-x-hidden p-8">
                    {/* Decorative gradient blobs */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-accent-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-violet-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />

                    <div className="relative w-full max-w-screen-2xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
