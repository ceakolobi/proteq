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
- Supabase prod (self-managed, migrado 27/06/2026): sfobrbxzdbgjoxgjerus
- Supabase dev: vzztqnihkwuhqgavtgae

## Convenções obrigatórias
- Migrations SQL: sempre ADD COLUMN IF NOT EXISTS
- RLS: sempre auth.uid() em produção, nunca USING (true)
- Editar arquivos existentes, não criar novos desnecessariamente
- Sem comentários óbvios no código
- Respostas sempre em português do Brasil

## Pendências em aberto
- [ ] PWA não abre no iPhone — pendente investigar
- [ ] Migration fotos/contratos aplicar em produção (sfobrbxzdbgjoxgjerus)
- [ ] Auth real Supabase no app mobile (ainda usa sessionStorage)
- [ ] Meta Ads — primeira campanha ainda não lançada
- [ ] SDR manual — 50 prospects ainda não iniciado
- [ ] Meta Pixel instalar em harmonyclube.com.br

## ⚠️ Migrations SQL pendentes (rodar no SQL Editor de sfobrbxzdbgjoxgjerus)
Rodar ANTES de testar as features correspondentes. Sem elas, o código quebra ou a feature não funciona.

- [ ] **cotacoes.origem** (cotações do site) — código já em prod:
  `ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'painel';`
- [ ] **profiles.senha_provisoria** (fluxo primeiro acesso) — verificar se já aplicada:
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS senha_provisoria BOOLEAN DEFAULT false;`
- [ ] **companies redes sociais** (Item 4 Configurações) — BLOQUEADOR: sem isso, salvar QUALQUER config falha:
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS instagram TEXT, ADD COLUMN IF NOT EXISTS facebook TEXT, ADD COLUMN IF NOT EXISTS whatsapp_comercial TEXT;`
- [ ] **RLS system_info** (versionamento automático) — INSERT bloqueado por falta de policy; criar policy INSERT/UPDATE para admin_principal (flag is_admin_principal OU role admin). SELECT liberado para authenticated.
- [ ] **função upsert_associado_por_cpf** — RPC SECURITY DEFINER usada no wizard de associado (dedup por CPF). Ver corpo completo no log 2026-07-09.

## Log de sessões

### 2026-07-09
- Feature: preenchimento automático de cadastro via upload de documento (Anthropic API)
  - Edge Function `extract-document-data` deployada (CNH/CRLV/comprovante → JSON via claude-haiku-4-5, fetch direto na API)
  - Salva doc original no bucket `documentos-associados` (privado, criado auto) para auditoria
  - Componente `DocumentScanner.tsx` nos 3 steps do wizard; telefone/email NUNCA autopreenchidos
  - Wizard usa RPC `upsert_associado_por_cpf` (dedup por CPF entre canais)
- Feature: wizard de associado — só nome/CPF/telefone/email obrigatórios; veículo mantém placa/tipo/marca/modelo/ano/valor_fipe; Dialog mais largo (w-[95vw] sm:max-w-4xl)
- UI: sidebar cinza claro no modo light (index.css :root --sidebar-*); logo colorida no light, branca no dark/penumbra
- Configurações — 6 itens auditados e corrigidos:
  - Item 1 Identidade Visual: cores injetadas como CSS var (--primary via useBrand useEffect); toggle PF/PJ com máscara; preview contraste WCAG
  - Item 2 Contra-capa: PDF do site (ResultadoCotacao) adiciona contra-capa como última página; rodapé do PDF usa contato real
  - Item 3 Capas PDF: 3 modos já existiam em LayoutCotacaoHarmony; faltava auto-save de cover_mode/cover_fixed_index no PdfCoversManager
  - Item 4 Contatos: campos instagram/facebook/whatsapp_comercial; rodapé do painel (SystemFooter) mostra contatos reais
  - Item 5 Versão: auto-versionamento (10 updates=patch, 30=minor) via useSystemInfo.registerUpdate; botão 1-clique sem dialog
  - Item 6 Contratos gerados: realtime subscribe em generated_contracts; link direto pro /associados/:id
- Fix: permissões de acesso não salvavam — savePermissions trocado de DELETE+INSERT para upsert onConflict user_id,module,action; retorno {ok,error} com toast
- Fix: "Enviar link de acesso" — Edge Function admin-criar-acesso busca email real via getUserById (profiles.email podia estar dessincronizado de auth.users)
- LEMBRETE: dist/ pré-buildado precisa `npm run build` antes de commitar — recorrente do usuário esquecer

### 2026-07-08
- Fix: perfis órfãos (gestores com regiao_id/sede_id/company_id NULL bloqueados por RLS)
  - Varredura SQL: queries para identificar perfis órfãos por role
  - Fix Usuarios.tsx: `update` de sede_id/regiao_id agora sempre executa (removido `if` que deixava NULL)
  - Fix Usuarios.tsx: `user_roles` insert agora inclui `company_id`
  - Fix Usuarios.tsx: validação obrigatória de sede+região para roles gestor/admin_regional/gerente/consultor_vendas
- Feature: cotações do site salvas no banco
  - `usePublicQuotation.ts`: salva cotação em `cotacoes` com `origem='site'` ao calcular resultado
  - Migration necessária: `ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'painel'`
  - `Cotacoes.tsx`: aba "Do Site" com tabela, busca, botão migrar (modal consultor+regional) e excluir
  - `useCotacoes.ts`: adicionado `deleteCotacao`, `migrarCotacao`, `consultor_nome`
- Feature: fluxo primeiro acesso (modo link + senha provisória)
  - Migration: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS senha_provisoria BOOLEAN DEFAULT false`
  - Edge Function `admin-criar-acesso` deployada em sfobrbxzdbgjoxgjerus
  - Secret `APP_URL=https://harmonyclube.com.br` configurada no Supabase
  - Redirect URL `https://harmonyclube.com.br/**` adicionada em Auth → URL Configuration
  - `DefinirSenha.tsx`: nova página /definir-senha (handles modo link via PASSWORD_RECOVERY e modo provisório)
  - `useForcarTrocaSenha.ts`: redireciona para /definir-senha se senha_provisoria=true
  - `AuthContext.tsx`: expõe `senhaProvisoria` e `clearSenhaProvisoria`
  - `Usuarios.tsx`: seção "Primeiro Acesso" com botões "Enviar link" e "Gerar senha provisória" + modal de exibição única
  - Edge Function: sempre retorna HTTP 200 com `{ success, error }` — nunca FunctionsHttpError
  - Confirmado funcionando end-to-end ✅
- Feature: label "Gerente Regional" no dropdown de perfis
  - `src/config/permissions.ts`: `gerente: 'Gerente Regional'`
- Fix: acesso total ao Eduardo (kolobi2013cf@gmail.com) via SQL no banco
  - Garantir `is_admin_principal=true`, role `admin_principal` e `company_id` correto
### 2026-07-07
- Feature: campo "Comissão do Consultor (%)" no modal de Novo/Editar Consultor (Consultores.tsx)
- Grava em `configuracao_comissoes` (tabela já existia — sem migration)
- Create: INSERT com `consultor_id`, `regional_id` (sede da região), `percentual_consultor`, `percentual_regional` (herdado da config regional ou default 25)
- Edit: UPSERT — atualiza `percentual_consultor` se registro já existe, insere se não
- Link usuário existente: mesmo upsert
- Ao abrir modal de edição: busca `percentual_consultor` atual em `configuracao_comissoes`; default 15 se não encontrado
- Validação Zod: obrigatório, 0-100
- Build: ✓ sem erros


### 2026-07-06 (cont. 3)
- Feature: ajuste_geral_valor e ajuste_individual_valor editáveis em CotacaoDetail.tsx
- Gate: perfilEditor === 'ADMIN' (admin_principal / admin_regional / isAdminPrincipal)
- Sem migration — colunas já existiam em cotacoes
- Recalcula mensalidade em tempo real; salva ajuste_geral_valor, ajuste_individual_valor, mensalidade, valor_final
- Proteção: client-side only (RLS de cotacoes não checa role)
- Build: ✓ sem erros

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
