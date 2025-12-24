import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import markaLogo from '@/assets/marka-logo.png';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Não logar caminhos que possam conter dados sensíveis
    console.error("404 Error: Route not found");
  }, [location.pathname]);

  const handleNavigate = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="p-4 bg-muted rounded-full w-fit mx-auto">
          <img src={markaLogo} alt="MARKA CRM" className="h-12 w-12 object-contain" />
        </div>
        <div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">Página não encontrada</p>
        </div>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          A página que você está procurando não existe ou você não tem permissão para acessá-la.
        </p>
        <Button onClick={handleNavigate} className="mt-4">
          {user ? 'Voltar ao Dashboard' : 'Fazer Login'}
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
