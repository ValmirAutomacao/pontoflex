import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthGuard from './components/AuthGuard';
import MainLayout from './layouts/MainLayout';
import { useNative } from './hooks/useNative';

// Lazy loaded components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Setores = lazy(() => import('./pages/Setores'));
const Funcoes = lazy(() => import('./pages/Funcoes'));
const Funcionarios = lazy(() => import('./pages/Funcionarios'));
const BiometriaCentral = lazy(() => import('./pages/BiometriaCentral'));
const BiometriaRemota = lazy(() => import('./pages/BiometriaRemota'));
const RegistroPonto = lazy(() => import('./pages/RegistroPonto'));
const ControlePonto = lazy(() => import('./pages/ControlePonto'));
const LocaisTrabalho = lazy(() => import('./pages/LocaisTrabalho'));
const ConfiguracaoEmpresa = lazy(() => import('./pages/ConfiguracaoEmpresa'));
const TiposJustificativa = lazy(() => import('./pages/TiposJustificativa'));
const TiposAfastamento = lazy(() => import('./pages/TiposAfastamento'));
const Afastamentos = lazy(() => import('./pages/Afastamentos'));
const BancoHoras = lazy(() => import('./pages/BancoHoras'));
const RegrasHoras = lazy(() => import('./pages/RegrasHoras'));
const Escalas = lazy(() => import('./pages/Escalas'));
const StatusLive = lazy(() => import('./pages/StatusLive'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const RelatorioConsolidado = lazy(() => import('./pages/RelatorioConsolidado'));
const RelatorioSentimentos = lazy(() => import('./pages/RelatorioSentimentos'));
const Inconsistencias = lazy(() => import('./pages/Inconsistencias'));
const CalendarioVisual = lazy(() => import('./pages/CalendarioVisual'));
const FechamentoMes = lazy(() => import('./pages/FechamentoMes'));
const AssinaturaEspelho = lazy(() => import('./pages/AssinaturaEspelho'));
const ExportacaoFolha = lazy(() => import('./pages/ExportacaoFolha'));
const Login = lazy(() => import('./pages/Login'));
const GestaoEmpresas = lazy(() => import('./pages/superadmin/GestaoEmpresas'));
const EmpresaSetup = lazy(() => import('./pages/public/EmpresaSetup'));
const BiometriaRegistro = lazy(() => import('./pages/public/BiometriaRegistro'));
const ColaboradorSetup = lazy(() => import('./pages/public/ColaboradorSetup'));
const RelatorioFuncionarios = lazy(() => import('./pages/RelatorioFuncionarios'));
const ImportarColaboradores = lazy(() => import('./pages/ImportarColaboradores'));
const MinhasSolicitacoes = lazy(() => import('./pages/MinhasSolicitacoes'));
const AprovacaoJustificativas = lazy(() => import('./pages/AprovacaoJustificativas'));
const Ferias = lazy(() => import('./pages/Ferias'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const AppContent = () => {
  useNative();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/biometria-remota/:id" element={<BiometriaRemota />} />
        <Route path="/onboarding" element={<EmpresaSetup />} />
        <Route path="/auto-cadastro-biometrico/:id" element={<BiometriaRegistro />} />
        <Route path="/setup-colaborador" element={<ColaboradorSetup />} />

        {/* Protected Routes */}
        <Route path="/*" element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/setores" element={<Setores />} />
                  <Route path="/funcoes" element={<Funcoes />} />
                  <Route path="/colaboradores" element={<Funcionarios />} />
                  <Route path="/biometria" element={<BiometriaCentral />} />
                  <Route path="/registro-ponto" element={<RegistroPonto />} />
                  <Route path="/controle-ponto" element={<ControlePonto />} />
                  <Route path="/locais-trabalho" element={<LocaisTrabalho />} />
                  <Route path="/dados-empresa" element={<ConfiguracaoEmpresa />} />
                  <Route path="/tipos-justificativa" element={<TiposJustificativa />} />
                  <Route path="/tipos-afastamento" element={<TiposAfastamento />} />
                  <Route path="/afastamentos" element={<Afastamentos />} />
                  <Route path="/banco-horas" element={<BancoHoras />} />
                  <Route path="/status-live" element={<StatusLive />} />
                  <Route path="/relatorios" element={<Relatorios />} />
                  <Route path="/relatorios/consolidado" element={<RelatorioConsolidado />} />
                  <Route path="/relatorios/sentimentos" element={<RelatorioSentimentos />} />
                  <Route path="/inconsistencias" element={<Inconsistencias />} />
                  <Route path="/calendario-visual" element={<CalendarioVisual />} />
                  <Route path="/fechamento" element={<FechamentoMes />} />
                  <Route path="/assinatura-ponto" element={<AssinaturaEspelho />} />
                  <Route path="/exportacao-folha" element={<ExportacaoFolha />} />
                  <Route path="/regras-horas" element={<RegrasHoras />} />
                  <Route path="/escalas" element={<Escalas />} />
                  <Route path="/relatorios/funcionarios" element={<RelatorioFuncionarios />} />
                  <Route path="/importar-colaboradores" element={<ImportarColaboradores />} />
                  <Route path="/minhas-solicitacoes" element={<MinhasSolicitacoes />} />
                  <Route path="/aprovacao-justificativas" element={<AprovacaoJustificativas />} />
                  <Route path="/ferias" element={<Ferias />} />
                  <Route path="/admin/empresas" element={<GestaoEmpresas />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </MainLayout>
          </AuthGuard>
        } />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
