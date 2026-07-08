import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function useForcarTrocaSenha() {
  const { senhaProvisoria, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (senhaProvisoria && location.pathname !== '/definir-senha') {
      navigate('/definir-senha', { replace: true });
    }
  }, [senhaProvisoria, isLoading, location.pathname, navigate]);
}
