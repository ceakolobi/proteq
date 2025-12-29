-- Função para validar limite de ajuste do Gestor (±15%)
CREATE OR REPLACE FUNCTION public.validar_limite_gestor()
RETURNS trigger AS $$
BEGIN
  IF NEW.perfil_editor = 'GESTOR' THEN
    IF NEW.percentual_individual > 15 OR NEW.percentual_individual < -15 THEN
      RAISE EXCEPTION 'Gestor só pode ajustar até ±15%%. Procure um Administrador.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para validar antes de INSERT ou UPDATE
DROP TRIGGER IF EXISTS trg_validar_limite_gestor ON cotacoes;
CREATE TRIGGER trg_validar_limite_gestor
  BEFORE INSERT OR UPDATE OF percentual_individual, perfil_editor
  ON cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_limite_gestor();