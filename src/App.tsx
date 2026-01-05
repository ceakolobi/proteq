import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { usePWA } from "@/hooks/usePWA";
import { PWASplash } from "@/components/pwa/PWASplash";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Usuarios from "./pages/Usuarios";
import Cotas from "./pages/Cotas";
import Cotacao from "./pages/Cotacao";
import Cotacoes from "./pages/Cotacoes";
import Sedes from "./pages/Sedes";
import RegionalDashboard from "./pages/RegionalDashboard";
import ConsultorDashboard from "./pages/ConsultorDashboard";
import Consultores from "./pages/Consultores";
import Associados from "./pages/Associados";
import Veiculos from "./pages/Veiculos";
import Leads from "./pages/Leads";
import Relatorios from "./pages/Relatorios";
import Vistorias from "./pages/Vistorias";
import Ativacoes from "./pages/Ativacoes";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import LayoutCotacaoHarmony from "./pages/LayoutCotacaoHarmony";
import ValidarProposta from "./pages/ValidarProposta";
import Configuracoes from "./pages/Configuracoes";
import FinanceiroDashboard from "./pages/financeiro/FinanceiroDashboard";
import Mensalidades from "./pages/financeiro/Mensalidades";
import Pagamentos from "./pages/financeiro/Pagamentos";
import Inadimplencia from "./pages/financeiro/Inadimplencia";
import RelatoriosFinanceiros from "./pages/financeiro/RelatoriosFinanceiros";
import ConfiguracoesFinanceiras from "./pages/financeiro/ConfiguracoesFinanceiras";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Rota que redireciona baseado no estado de autenticação
function HomeRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  
  // Usuário logado vai para dashboard, não logado vê a landing
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Index />;
}

function PWAWrapper({ children }: { children: React.ReactNode }) {
  const { isStandalone } = usePWA();
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Mostrar splash apenas em modo standalone (app instalado)
    if (isStandalone) {
      const hasSeenSplash = sessionStorage.getItem('pwa-splash-shown');
      if (!hasSeenSplash) {
        setShowSplash(true);
      }
    }
  }, [isStandalone]);

  const handleSplashComplete = () => {
    sessionStorage.setItem('pwa-splash-shown', 'true');
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <PWASplash onComplete={handleSplashComplete} />}
      {children}
      <PWAInstallPrompt />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" themes={["light", "dark", "penumbra"]}>
      <AuthProvider>
        <TooltipProvider>
          <PWAWrapper>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Rotas públicas - apenas landing e autenticação */}
                <Route path="/" element={<HomeRoute />} />
                <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                <Route path="/validar-proposta" element={<ValidarProposta />} />
                
                {/* Rotas protegidas - requerem autenticação */}
                {/* Dashboard geral - todos os usuários autenticados */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                
                {/* Perfil do usuário - todos os usuários autenticados */}
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                
                {/* Admin Principal only */}
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
                <Route path="/cotas" element={<ProtectedRoute><Cotas /></ProtectedRoute>} />
                <Route path="/sedes" element={<ProtectedRoute><Sedes /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                
                {/* Admin Regional or above */}
                <Route path="/regional" element={<ProtectedRoute><RegionalDashboard /></ProtectedRoute>} />
                <Route path="/consultores" element={<ProtectedRoute><Consultores /></ProtectedRoute>} />
                
                {/* Consultor or above */}
                <Route path="/consultor" element={<ProtectedRoute><ConsultorDashboard /></ProtectedRoute>} />
                <Route path="/cotacao" element={<ProtectedRoute><Cotacao /></ProtectedRoute>} />
                <Route path="/cotacoes" element={<ProtectedRoute><Cotacoes /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
                <Route path="/associados" element={<ProtectedRoute><Associados /></ProtectedRoute>} />
                <Route path="/associados/novo" element={<ProtectedRoute><Associados /></ProtectedRoute>} />
                <Route path="/veiculos" element={<ProtectedRoute><Veiculos /></ProtectedRoute>} />
                <Route path="/vistorias" element={<ProtectedRoute><Vistorias /></ProtectedRoute>} />
                <Route path="/ativacoes" element={<ProtectedRoute><Ativacoes /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
                <Route path="/layout-cotacao-harmony" element={<ProtectedRoute><LayoutCotacaoHarmony /></ProtectedRoute>} />
                
                {/* Financeiro */}
                <Route path="/financeiro" element={<ProtectedRoute><FinanceiroDashboard /></ProtectedRoute>} />
                <Route path="/financeiro/mensalidades" element={<ProtectedRoute><Mensalidades /></ProtectedRoute>} />
                <Route path="/financeiro/pagamentos" element={<ProtectedRoute><Pagamentos /></ProtectedRoute>} />
                <Route path="/financeiro/inadimplencia" element={<ProtectedRoute><Inadimplencia /></ProtectedRoute>} />
                <Route path="/financeiro/relatorios" element={<ProtectedRoute><RelatoriosFinanceiros /></ProtectedRoute>} />
                <Route path="/financeiro/configuracoes" element={<ProtectedRoute><ConfiguracoesFinanceiras /></ProtectedRoute>} />
                
                {/* 404 - Rota não encontrada */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </PWAWrapper>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
