-- Remove o trigger otimizado anterior
DROP TRIGGER IF EXISTS trigger_atualizar_valor_cotacao ON cotacoes;

-- Cria o trigger conforme solicitado (dispara em todos os INSERT/UPDATE)
DROP TRIGGER IF EXISTS trg_atualiza_cotacao ON cotacoes;
CREATE TRIGGER trg_atualiza_cotacao
  BEFORE INSERT OR UPDATE
  ON cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_cotacao();