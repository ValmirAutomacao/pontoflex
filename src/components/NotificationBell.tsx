import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import { Bell, Check, CheckCheck, MessageSquare, FileText, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Notificacao } from '../types/ponto';

const NotificationBell: React.FC = () => {
    const { profile } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notificacao[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.lida).length;

    useEffect(() => {
        if (profile?.id) {
            fetchNotifications();

            // Subscribe to realtime notifications
            const channel = supabase
                .channel('notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notificacoes',
                        filter: `usuario_id=eq.${profile.id}`
                    },
                    (payload) => {
                        setNotifications(prev => [payload.new as Notificacao, ...prev]);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [profile?.id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        if (!profile?.id) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('notificacoes')
            .select('*')
            .eq('usuario_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) setNotifications(data);
        setLoading(false);
    };

    const markAsRead = async (id: string) => {
        await supabase
            .from('notificacoes')
            .update({ lida: true })
            .eq('id', id);

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, lida: true } : n)
        );
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.lida).map(n => n.id);
        if (unreadIds.length === 0) return;

        await supabase
            .from('notificacoes')
            .update({ lida: true })
            .in('id', unreadIds);

        setNotifications(prev =>
            prev.map(n => ({ ...n, lida: true }))
        );
    };

    const handleNotificationClick = (notification: Notificacao) => {
        markAsRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
        }
        setIsOpen(false);
    };

    const getIcon = (tipo: string) => {
        switch (tipo) {
            case 'JUSTIFICATION_REQUEST':
            case 'JUSTIFICATION_APPROVED':
            case 'JUSTIFICATION_REJECTED':
                return <MessageSquare size={16} />;
            case 'ATESTADO_REQUEST':
            case 'ATESTADO_APPROVED':
            case 'ATESTADO_REJECTED':
                return <FileText size={16} />;
            default:
                return <Bell size={16} />;
        }
    };

    const getIconColor = (tipo: string) => {
        if (tipo.includes('APPROVED')) return 'text-emerald-500';
        if (tipo.includes('REJECTED')) return 'text-rose-500';
        if (tipo.includes('REQUEST')) return 'text-amber-500';
        return 'text-primary-500';
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition-all ${isDark
                    ? 'hover:bg-slate-700/50 text-slate-400'
                    : 'hover:bg-slate-100 text-slate-500'
                    } ${isOpen ? isDark ? 'bg-slate-700/50' : 'bg-slate-100' : ''}`}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute right-0 top-full mt-2 w-80 max-h-[400px] rounded-2xl border shadow-xl overflow-hidden z-50 ${isDark
                            ? 'bg-slate-800 border-slate-700'
                            : 'bg-white border-slate-200'
                            }`}
                    >
                        {/* Header */}
                        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Notificações
                            </h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className={`text-xs font-medium flex items-center gap-1 ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
                                >
                                    <CheckCheck size={14} /> Marcar todas
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto max-h-[320px]">
                            {loading ? (
                                <div className="py-8 text-center">
                                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="py-8 text-center">
                                    <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Nenhuma notificação
                                    </p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full px-4 py-3 text-left flex gap-3 transition-colors ${!notification.lida
                                            ? isDark ? 'bg-primary-500/5' : 'bg-primary-50/50'
                                            : ''
                                            } ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                            <span className={getIconColor(notification.tipo)}>
                                                {getIcon(notification.tipo)}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {notification.titulo}
                                            </p>
                                            {notification.mensagem && (
                                                <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {notification.mensagem}
                                                </p>
                                            )}
                                            <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {formatTime(notification.created_at)}
                                            </p>
                                        </div>
                                        {!notification.lida && (
                                            <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-2" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
