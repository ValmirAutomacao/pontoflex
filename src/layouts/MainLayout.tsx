import React from 'react';
import Sidebar from '../components/Sidebar';
import BottomTabs from '../components/BottomTabs';
import { useTheme } from '../contexts/ThemeContext';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { isDark } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className={`min-h-screen flex font-sans transition-colors duration-300 ${isDark
            ? 'bg-slate-900 text-white'
            : 'bg-slate-50 text-slate-900'
            }`}>
            {/* Sidebar with Mobile Support */}
            <div className={`fixed inset-0 z-50 lg:relative lg:z-0 transition-all duration-300 ${isMobile && !isSidebarOpen ? 'pointer-events-none' : ''
                }`}>
                {/* Backdrop for mobile */}
                <AnimatePresence>
                    {isMobile && isSidebarOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden pointer-events-auto"
                        />
                    )}
                </AnimatePresence>

                <div className={`transition-transform duration-300 lg:translate-x-0 ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'
                    }`}>
                    <Sidebar />
                </div>
            </div>

            <div className={`flex-1 flex flex-col transition-all duration-300 ${!isMobile ? 'ml-[280px]' : 'ml-0'
                }`}>
                {/* Top Bar */}
                <header className={`h-[64px] flex items-center justify-between px-4 lg:px-8 border-b sticky top-0 z-40 backdrop-blur-xl transition-colors ${isDark
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white/80 border-slate-200'
                    }`}>
                    <div className="flex items-center gap-4 flex-1">
                        {isMobile && (
                            <button
                                onClick={toggleSidebar}
                                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                    }`}
                            >
                                <Menu size={20} />
                            </button>
                        )}
                        <h2 className={`text-xs lg:text-sm font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {isMobile ? 'Ponto Flex' : 'Sistema de Gestão de Ponto Inteligente'}
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

                <main className={`flex-1 relative overflow-x-hidden ${isMobile ? 'p-4 pb-24' : 'p-8'}`}>
                    {/* Decorative gradient blobs */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-accent-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-violet-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />

                    <div className="relative w-full max-w-screen-2xl mx-auto">
                        {children}
                    </div>
                </main>
                <BottomTabs />
            </div >
        </div >
    );
};

export default MainLayout;
