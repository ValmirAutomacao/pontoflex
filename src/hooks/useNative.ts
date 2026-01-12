import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Capacitor } from '@capacitor/core';

export const useNative = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark } = useTheme();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // Handle Status Bar
        const updateStatusBar = async () => {
            try {
                await StatusBar.setStyle({
                    style: isDark ? Style.Dark : Style.Light
                });
                await StatusBar.setBackgroundColor({
                    color: isDark ? '#0F172A' : '#F8FAFC'
                });
            } catch (e) {
                console.warn('StatusBar not available', e);
            }
        };

        updateStatusBar();

        // Handle Back Button
        const backListener = App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
            if (location.pathname === '/' || !canGoBack) {
                App.exitApp();
            } else {
                navigate(-1);
            }
        });

        return () => {
            backListener.then((l: any) => l.remove());
        };
    }, [isDark, location, navigate]);
};
