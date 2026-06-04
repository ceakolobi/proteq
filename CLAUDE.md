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
- [ ] Aplicar `20260604000001_beneficios_extras_via_cotacao.sql` no Supabase Dashboard prod
- [ ] Migration fotos/contratos aplicar em produção (sbtfhtllzpurjprivqoi)
- [ ] Auth real Supabase no app mobile (ainda usa sessionStorage)
- [ ] Meta Ads — primeira campanha ainda não lançada
- [ ] SDR manual — 50 prospects ainda não iniciado
- [ ] Meta Pixel instalar em harmonyclube.com.br

## Log de sessões
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
