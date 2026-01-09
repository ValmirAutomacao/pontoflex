/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Azul corporativo - profissional e confiável
                'primary': {
                    50: '#E6F0FA',
                    100: '#CCE0F5',
                    200: '#99C2EB',
                    300: '#66A3E0',
                    400: '#3385D6',
                    500: '#0066CC',
                    600: '#0052A3',
                    700: '#003D7A',
                    800: '#002952',
                    900: '#001429',
                },
                // Verde corporativo - sucesso
                'success': {
                    400: '#34D399',
                    500: '#10B981',
                    600: '#059669',
                },
                // Âmbar - alertas
                'warning': {
                    400: '#FBBF24',
                    500: '#F59E0B',
                    600: '#D97706',
                },
                // Vermelho - perigo
                'danger': {
                    400: '#F87171',
                    500: '#EF4444',
                    600: '#DC2626',
                },
                // Cores de tema (legado para compatibilidade)
                'deep-void': '#0F172A',
                'sidebar-dark': '#1E293B',
                'neon-orange': '#0066CC',
                'card-dark': '#1E293B',
                'accent': {
                    50: '#E6F0FA',
                    100: '#CCE0F5',
                    200: '#99C2EB',
                    300: '#66A3E0',
                    400: '#3385D6',
                    500: '#0066CC',
                    600: '#0052A3',
                    700: '#003D7A',
                },
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 4px 14px 0 rgba(0, 102, 204, 0.25)',
                'glow-lg': '0 4px 20px 0 rgba(0, 102, 204, 0.35)',
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
                'neon-glow': '0 4px 14px 0 rgba(0, 102, 204, 0.25)',
            },
            borderRadius: {
                '2xl': '16px',
                '3xl': '20px',
                '4xl': '24px',
            },
            backgroundImage: {
                'sidebar-gradient': 'linear-gradient(180deg, #1E3A5F 0%, #0F2744 100%)',
                'sidebar-gradient-dark': 'linear-gradient(180deg, #0F172A 0%, #020617 100%)',
                'accent-gradient': 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)',
            },
        },
    },
    plugins: [],
}
