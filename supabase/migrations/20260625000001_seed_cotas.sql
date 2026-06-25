-- ============================================================
-- SEED: Faixas de proteção (tabela cotas)
-- Projeto: sbtfhtllzpurjprivqoi (painelharmony)
--
-- ATENÇÃO: Revise os valores de mensalidade antes de aplicar
-- em produção. Estes são valores de referência — ajuste conforme
-- a tabela comercial real da Harmony Agro.
--
-- Execute no SQL Editor do Supabase.
-- ============================================================

-- Inserir apenas se a tabela estiver vazia
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.cotas) = 0 THEN

    INSERT INTO public.cotas (
      cota_nome,
      fipe_min,
      fipe_max,
      valor_carro,
      valor_moto,
      valor_camionete,
      mensalidade_caminhao,
      mensalidade_utilitario,
      mensalidade_maquina_agricola,
      mensalidade_maquina_industrial,
      mensalidade_carreta,
      mensalidade_implemento_agricola,
      ajuste_geral_valor,
      aplica_carro,
      aplica_moto,
      aplica_caminhonete,
      ativo
    ) VALUES

    -- COTA 01: até R$ 30.000 (veículos populares / motos de entrada)
    (
      'COTA 01', 0.00, 30000.00,
      109.90, 79.90, 149.90,
      194.87, 164.89, 224.85, 224.85, 179.88, 194.87,
      0, true, true, true, true
    ),

    -- COTA 02: R$ 30.000,01 – R$ 50.000 (hatch/sedan compacto)
    (
      'COTA 02', 30000.01, 50000.00,
      149.90, 99.90, 199.90,
      259.87, 219.89, 299.85, 299.85, 239.88, 259.87,
      0, true, true, true, true
    ),

    -- COTA 03: R$ 50.000,01 – R$ 80.000 (sedan / hatch médio — cobre Ford Ka R$ 50.571)
    (
      'COTA 03', 50000.01, 80000.00,
      189.90, 129.90, 249.90,
      324.87, 274.89, 374.85, 374.85, 299.88, 324.87,
      0, true, true, true, true
    ),

    -- COTA 04: R$ 80.000,01 – R$ 100.000 (sedan alto / SUV entrada)
    (
      'COTA 04', 80000.01, 100000.00,
      229.90, 159.90, 299.90,
      389.87, 329.89, 449.85, 449.85, 359.88, 389.87,
      0, true, true, true, true
    ),

    -- COTA 05: R$ 100.000,01 – R$ 130.000 (SUV médio / pickup)
    (
      'COTA 05', 100000.01, 130000.00,
      279.90, 199.90, 359.90,
      467.87, 395.89, 539.85, 539.85, 431.88, 467.87,
      0, true, true, true, true
    ),

    -- COTA 06: R$ 130.000,01 – R$ 170.000 (SUV grande / pickup topo)
    (
      'COTA 06', 130000.01, 170000.00,
      329.90, 229.90, 419.90,
      545.87, 461.89, 629.85, 629.85, 503.88, 545.87,
      0, true, true, true, true
    ),

    -- COTA 07: R$ 170.000,01 – R$ 200.000 (premium / importado entrada)
    (
      'COTA 07', 170000.01, 200000.00,
      389.90, 269.90, 489.90,
      636.87, 538.89, 734.85, 734.85, 587.88, 636.87,
      0, true, true, true, true
    ),

    -- COTA 08: R$ 200.000,01 – R$ 500.000 (máquinas agrícolas / premium)
    (
      'COTA 08', 200000.01, 500000.00,
      469.90, 319.90, 589.90,
      766.87, 648.89, 884.85, 884.85, 707.88, 766.87,
      0, true, true, true, true
    );

    RAISE NOTICE 'Seed de cotas inserido com sucesso: 8 faixas criadas.';

  ELSE
    RAISE NOTICE 'Tabela cotas já possui dados (% registros). Seed ignorado.',
      (SELECT COUNT(*) FROM public.cotas);
  END IF;
END $$;


-- ============================================================
-- VERIFICAÇÃO — rode após o INSERT para confirmar
-- ============================================================

-- Contagem total
SELECT COUNT(*) AS total_cotas FROM public.cotas;

-- Primeiras 5 faixas
SELECT
  cota_nome,
  fipe_min,
  fipe_max,
  valor_carro,
  valor_moto,
  valor_camionete,
  ativo
FROM public.cotas
ORDER BY fipe_min
LIMIT 5;

-- Teste: Ford Ka SE 1.0 SD C (R$ 50.571,00) deve retornar COTA 03
SELECT
  cota_nome,
  fipe_min,
  fipe_max,
  valor_carro
FROM public.cotas
WHERE ativo = true
  AND 50571.00 BETWEEN fipe_min AND fipe_max;

-- Gaps entre faixas (deve retornar 0 linhas após o seed)
WITH faixas AS (
  SELECT fipe_max, LEAD(fipe_min) OVER (ORDER BY fipe_min) AS proxima_min
  FROM public.cotas WHERE ativo = true
)
SELECT
  fipe_max AS termina_em,
  proxima_min AS proxima_comeca_em,
  ROUND(proxima_min - fipe_max, 2) AS gap
FROM faixas
WHERE proxima_min IS NOT NULL AND proxima_min > fipe_max + 0.01;
