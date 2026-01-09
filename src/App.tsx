import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthGuard from './components/AuthGuard';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Setores from './pages/Setores';
import Funcoes from './pages/Funcoes';
import Jornadas from './pages/Jornadas';
import Funcionarios from './pages/Funcionarios';
import BiometriaCentral from './pages/BiometriaCentral';
import BiometriaRemota from './pages/BiometriaRemota';
import RegistroPonto from './pages/RegistroPonto';
import ControlePonto from './pages/ControlePonto';
import LocaisTrabalho from './pages/LocaisTrabalho';
import TiposJustificativa from './pages/TiposJustificativa';
import TiposAfastamento from './pages/TiposAfastamento';
import Afastamentos from './pages/Afastamentos';
import Login from './pages/Login';
import GestaoEmpresas from './pages/superadmin/GestaoEmpresas';
import EmpresaSetup from './pages/public/EmpresaSetup';
import BiometriaRegistro from './pages/public/BiometriaRegistro';
import ColaboradorSetup from './pages/public/ColaboradorSetup';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
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
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/setores" element={<Setores />} />
                    <Route path="/funcoes" element={<Funcoes />} />
                    <Route path="/jornadas" element={<Jornadas />} />
                    <Route path="/colaboradores" element={<Funcionarios />} />
                    <Route path="/biometria" element={<BiometriaCentral />} />
                    <Route path="/registro-ponto" element={<RegistroPonto />} />
                    <Route path="/controle-ponto" element={<ControlePonto />} />
                    <Route path="/locais-trabalho" element={<LocaisTrabalho />} />
                    <Route path="/tipos-justificativa" element={<TiposJustificativa />} />
                    <Route path="/tipos-afastamento" element={<TiposAfastamento />} />
                    <Route path="/afastamentos" element={<Afastamentos />} />
                    <Route path="/admin/empresas" element={<GestaoEmpresas />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </MainLayout>
              </AuthGuard>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

