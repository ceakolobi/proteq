# Harmony Agro — Contexto do Projeto

## Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- Backend: Supabase (Postgres + Auth + Storage + Edge Functions)
- Mobile: Capacitor (Android/iOS)
- Deploy: Claude Code → GitHub Desktop → EasyPanel

## Paths importantes
- Painel prod: C:\Users\Cliente\Documents\GitHub\painelharmonyagrocombr-6e9e5f71
- App mobile: C:\Users\Cliente\harmony-home-screen
- Vault Obsidian: C:\Amk\amarok
- Supabase prod: sbtfhtllzpurjprivqoi
- Supabase dev: vzztqnihkwuhqgavtgae

## Convenções obrigatórias
- Migrations SQL: sempre ADD COLUMN IF NOT EXISTS
- RLS: sempre auth.uid() em produção, nunca USING (true)
- Editar arquivos existentes, não criar novos desnecessariamente
- Sem comentários óbvios no código
- Respostas sempre em português do Brasil

## Pendências em aberto
- [ ] PWA não abre no iPhone — pendente investigar
- [ ] Migration fotos/contratos aplicar em produção (sbtfhtllzpurjprivqoi)
- [ ] Auth real Supabase no app mobile (ainda usa sessionStorage)
- [ ] Meta Ads — primeira campanha ainda não lançada
- [ ] SDR manual — 50 prospects ainda não iniciado
- [ ] Meta Pixel instalar em harmonyclube.com.br

## Log de sessões
### 2026-07-06 (cont. 2)
- Fix: company_id faltando em 14 inserts — varredura completa + todos os pontos corrigidos
- Padrão: profile?.company_id ?? null em todos os payloads de insert nas tabelas multi-tenant
- Cotas.tsx: adicionado import useAuth (único arquivo que não tinha)
- Ativacoes, Vistorias, CotacaoDetail: profile adicionado ao destructuring de useAuth()
- Veículos manteve sede_id + ganhou company_id (campos distintos: tenant vs unidade)
- ALERTA DE SEGURANÇA: api_tokens sem endpoint de validação por company_id identificado (reportado)
- Build: ✓ sem erros

### 2026-07-06 (cont.)
- Bug: dois cards "Guincho km Extra" visíveis em benefícios/adicionais
- Causa: seed migration + insert manual via admin sem UNIQUE constraint → 2 linhas no banco com mesmo nome/valor
- Fix DB: migration `20260706000002_fix_beneficios_extras_duplicates.sql` — DELETE dos duplicados + UNIQUE (company_id, nome)
- Fix front (defensivo): deduplica por id em `useBeneficiosExtras.ts` e `AssociadoDetalhe.tsx:fetchBeneficiosExtras`
- Nota: tabela é `beneficios_extras`, não `beneficios` (tabela separada de acionamentos)
- Migration NÃO aplicada em produção — aguardando confirmação de Eduardo

### 2026-07-06
- Bug: cotações salvas sem `company_id` (sede) — campo estava ausente no `insertData` de `CotacaoForm.tsx`
- Causa raiz: form faz insert inline sem usar `useCotacoes.createCotacao()`, que já tinha o campo correto
- Fix: adicionado `company_id: profile?.company_id || null` ao `insertData` em `CotacaoForm.tsx:354`
- Migration `20260706000001_fix_cotacoes_company_id.sql` (backfill histórico) já existia — só faltava o fix no front
- Confirmado: `cotacoes` não tem coluna `sede_id`; a "sede" no contexto da cotação é `company_id`
- `consultor_id` e `regiao_id` já estavam sendo enviados corretamente

### 2026-07-01
- Fix: Edge Function `generate-contract-manual` retornava 400 sem template configurado
- Causa raiz: função exigia template em `document_templates` mas nenhum estava cadastrado
- Fix 1 (edge function): fallback automático — cria template padrão no banco se não existir
- Fix 2 (edge function): PDF agora é salvo no storage ANTES do insert no banco (path incluído no insert diretamente)
- Fix 3 (edge function): logging detalhado com `console.log`/`console.error` em cada etapa
- Fix 4 (frontend): `handleGerarContrato` em AssociadoDetalhe.tsx e AssociadoEditModal.tsx agora extrai `error.context.error` para mostrar mensagem real ao usuário
- Deploy: `sfobrbxzdbgjoxgjerus` — função reimplantada com sucesso
- Projeto Supabase corrigido: `sfobrbxzdbgjoxgjerus` (diferente do prod no CLAUDE.md)

### 2026-06-05
- Criada tabela associado_beneficios_extras no Supabase
- Benefícios extras funcionando: adicionar/remover com upsert
- Resumo financeiro completo na área do associado:
  Valor FIPE, Mensalidade base, Benefícios extras, Total mensal
- Cota de participação visível na área do associado
- Benefícios extras aparecem no contrato gerado
- Conflitos de merge resolvidos em ContractCard.tsx e AssociadoDetalhe.tsx
- Seção "Trocar de Plano" recolhida em accordion
- Fix: mensalidade base agora busca em cascata (cotacoes → veiculos.mensalidade)
- [ ] PWA não abre no iPhone — pendente investigar

### 2026-06-03 (continuação)
- Enriquecimento completo Vault Obsidian (12 arquivos _INICIO.md + CLAUDE.md)
- Criados 5 arquivos em 09-Protecao-Veicular/
- Criado AssociadoDetalhe.tsx — página /associados/:id com auto-save
- Modificados App.tsx e Associados.tsx para nova rota
- Reescrita ContractCard.tsx v2 — modelo oficial, PDF 2 páginas + regulamento
- Seção "Plano & Benefícios" em /associados/:id — benefícios do plano atual + trocar de plano
- Fluxo completo: Vistoria Remota + Assinatura Digital
  - Migration: add colunas assinatura em vistorias
  - Edge function: send-vistoria-link (Resend + Evolution API)
  - Edge function: embed-assinatura (pdf-lib embeds assinatura no PDF)
  - Página pública: /vistoria/:token (VistoriaRemota.tsx)
  - Página pública: /assinar/:token (AssinarContrato.tsx)
  - AssociadoDetalhe.tsx: botão "Enviar link de vistoria" + badge de status na seção Contratos

## Instrução para o Claude Code
Ao final de cada sessão, atualize automaticamente a seção "Log de sessões" 
deste arquivo com um resumo do que foi feito, com a data atual.
