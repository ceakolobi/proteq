-- ============================================================
-- DIAGNÓSTICO E CORREÇÃO DE GAPS NAS FAIXAS DE PROTEÇÃO
-- Execute no SQL Editor do Supabase: sbtfhtllzpurjprivqoi
-- ============================================================

-- 1. Ver todas as faixas atuais ordenadas
SELECT
  cota_nome,
  fipe_min,
  fipe_max,
  valor_carro,
  valor_moto,
  valor_camionete,
  ativo,
  aplica_carro,
  aplica_moto,
  aplica_caminhonete
FROM cotas
ORDER BY fipe_min ASC;

-- 2. Detectar gaps entre faixas consecutivas
-- (mostra onde há buracos na cobertura)
WITH faixas_ordenadas AS (
  SELECT
    cota_nome,
    fipe_min,
    fipe_max,
    LEAD(fipe_min) OVER (ORDER BY fipe_min) AS proxima_fipe_min
  FROM cotas
  WHERE ativo = true
)
SELECT
  cota_nome AS faixa_atual,
  fipe_max AS termina_em,
  proxima_fipe_min AS proxima_comeca_em,
  (proxima_fipe_min - fipe_max) AS gap_valor
FROM faixas_ordenadas
WHERE proxima_fipe_min IS NOT NULL
  AND proxima_fipe_min > fipe_max + 0.01
ORDER BY fipe_min;

-- 3. Verificar se R$ 50.571,00 (Ford Ka) está coberto
SELECT
  cota_nome,
  fipe_min,
  fipe_max,
  valor_carro
FROM cotas
WHERE ativo = true
  AND 50571.00 BETWEEN fipe_min AND fipe_max;

-- ============================================================
-- CORREÇÃO: Fechar gaps estendendo fipe_max de cada faixa
-- até o início da próxima faixa (menos R$ 0,01)
--
-- ATENÇÃO: revise o SELECT de diagnóstico acima antes de
-- executar este UPDATE. Ajuste os valores se necessário.
-- ============================================================

-- Fecha automaticamente todos os gaps entre faixas consecutivas
WITH faixas_com_proxima AS (
  SELECT
    id,
    fipe_max,
    LEAD(fipe_min) OVER (ORDER BY fipe_min) AS proxima_fipe_min
  FROM cotas
  WHERE ativo = true
)
UPDATE cotas
SET
  fipe_max = faixas_com_proxima.proxima_fipe_min - 0.01,
  updated_at = now()
FROM faixas_com_proxima
WHERE cotas.id = faixas_com_proxima.id
  AND faixas_com_proxima.proxima_fipe_min IS NOT NULL
  AND faixas_com_proxima.proxima_fipe_min > cotas.fipe_max + 0.01;

-- Confirmar resultado após correção
SELECT
  cota_nome,
  fipe_min,
  fipe_max,
  ativo
FROM cotas
ORDER BY fipe_min ASC;
