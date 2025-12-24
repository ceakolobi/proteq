import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Usuarios from "./pages/Usuarios";
import Cotas from "./pages/Cotas";
import Cotacao from "./pages/Cotacao";
import Sedes from "./pages/Sedes";
import RegionalDashboard from "./pages/RegionalDashboard";
import ConsultorDashboard from "./pages/ConsultorDashboard";
import Consultores from "./pages/Consultores";
import Associados from "./pages/Associados";
import Veiculos from "./pages/Veiculos";
import Leads from "./pages/Leads";
import Relatorios from "./pages/Relatorios";
import Vistorias from "./pages/Vistorias";
import NotFound from "./pages/NotFound";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas - apenas landing e autenticação */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
            
            {/* Rotas protegidas - requerem autenticação */}
            {/* Dashboard geral - todos os usuários autenticados */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            
            {/* Admin Principal only */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
            <Route path="/cotas" element={<ProtectedRoute><Cotas /></ProtectedRoute>} />
            <Route path="/sedes" element={<ProtectedRoute><Sedes /></ProtectedRoute>} />
            
            {/* Admin Regional or above */}
            <Route path="/regional" element={<ProtectedRoute><RegionalDashboard /></ProtectedRoute>} />
            <Route path="/consultores" element={<ProtectedRoute><Consultores /></ProtectedRoute>} />
            
            {/* Consultor or above */}
            <Route path="/consultor" element={<ProtectedRoute><ConsultorDashboard /></ProtectedRoute>} />
            <Route path="/cotacao" element={<ProtectedRoute><Cotacao /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path="/associados" element={<ProtectedRoute><Associados /></ProtectedRoute>} />
            <Route path="/associados/novo" element={<ProtectedRoute><Associados /></ProtectedRoute>} />
            <Route path="/veiculos" element={<ProtectedRoute><Veiculos /></ProtectedRoute>} />
            <Route path="/vistorias" element={<ProtectedRoute><Vistorias /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            
            {/* 404 - Rota não encontrada - redireciona para home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
