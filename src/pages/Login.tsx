import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { signIn } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await signIn(email, password);

        if (error) {
            setError(error.message === 'Invalid login credentials'
                ? 'E-mail ou senha incorretos.'
                : error.message);
            setLoading(false);
        } else {
            navigate(from, { replace: true });
        }
    };

    const inputClass = `w-full border rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark
        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
        }`;

    return (
        <div className={`min-h-screen flex items-center justify-center p-6 transition-colors ${isDark
            ? 'bg-slate-900'
            : 'bg-slate-50'
            }`}>
            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className={`fixed top-6 right-6 p-2.5 rounded-lg transition-all ${isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                    : 'bg-white hover:bg-slate-50 text-slate-500 shadow-sm border border-slate-200'
                    }`}
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <img
                        src="/LOGO_FIM_2.png"
                        alt="Logo"
                        className="max-w-[240px] h-auto mb-2"
                    />
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Inteligência Operacional
                    </p>
                </div>

                {/* Login Card */}
                <div className={`rounded-2xl p-8 border shadow-lg ${isDark
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-slate-200'
                    }`}>
                    <div className="mb-6">
                        <h2 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Acesse sua conta
                        </h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Entre com suas credenciais
                        </p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-5 p-3 rounded-lg flex items-center gap-3 ${isDark
                                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                : 'bg-red-50 border border-red-100 text-red-600'
                                }`}
                        >
                            <AlertCircle size={18} />
                            <p className="text-sm">{error}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                E-mail
                            </label>
                            <div className="relative">
                                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className={inputClass}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                Senha
                            </label>
                            <div className="relative">
                                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={`${inputClass} pr-10`}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link
                                to="/recuperar-senha"
                                className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                            >
                                Esqueceu a senha?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm shadow-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    Entrar <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className={`text-center text-xs mt-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    © 2024 Ponto Flex. Todos os direitos reservados.
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
