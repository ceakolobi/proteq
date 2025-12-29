-- Remove trigger anterior se existir
DROP TRIGGER IF EXISTS trg_limite_gestor ON cotacoes;

-- Criar trigger simplificado apenas para UPDATE
CREATE TRIGGER trg_limite_gestor
  BEFORE UPDATE
  ON cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_limite_gestor();