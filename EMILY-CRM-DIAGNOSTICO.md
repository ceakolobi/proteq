# EMILY × CRM — Diagnóstico Completo de Integração
> Data: 2026-06-24 | Projeto: painelharmonyagrocombr

---

## 1. TABELAS — ASSOCIADOS

### `public.associados`
Tabela central do cliente final.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | Login do associado |
| `nome_completo` | text | |
| `cpf` | text UNIQUE | |
| `rg` | text | |
| `data_nascimento` | date | |
| `telefone` | text | |
| `email` | text | |
| `endereco`, `cidade`, `estado`, `cep` | text | |
| `consultor_id` | uuid FK → profiles | Quem vendeu |
| `regiao_id` | uuid FK → regioes | |
| `status` | associate_status | ativo / inadimplente / suspenso / cancelado |
| `termos_aceitos` | boolean | |
| `termos_aceitos_em` | timestamptz | |
| `dia_vencimento` | integer | Dia do mês para cobrança |
| `created_at`, `updated_at` | timestamptz | |

**RLS:**
- `admin_principal`: acesso total
- `admin_regional`: apenas da sua sede
- `consultor_vendas`: apenas seus associados (`consultor_id = auth.uid()`)
- `financeiro`: leitura total
- `cadastro`: acesso total
- `associado`: apenas o próprio registro (`user_id = auth.uid()`)

---

### `public.veiculos`
Veículo vinculado ao associado.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `associado_id` | uuid FK → associados | |
| `tipo` | vehicle_type | carro / moto / pickup / caminhao / utilitario / maquina_agricola / maquina_industrial / carreta / implemento_agricola |
| `marca`, `modelo`, `ano` | text / int | |
| `placa` | text | |
| `cor`, `chassi`, `renavam` | text | |
| `valor_fipe` | numeric | |
| `codigo_fipe`, `mes_referencia_fipe` | text | |
| `cota_id` | uuid FK → cotas | Faixa de mensalidade |
| `mensalidade` | numeric | Valor calculado |
| `carro_reserva_dias` | integer | |
| `protecao_ativa` | boolean | |
| `protecao_ativada_em` | timestamptz | |
| `veiculo_status` | vehicle_status | cadastrado / aguardando_vistoria / aprovado / reprovado / ativo / cancelado |
| `sede_id`, `consultor_id`, `lead_id`, `cotacao_id` | uuid FKs | |
| `foto_url` | text | |

---

## 2. TABELAS — FINANCEIRO

### `public.mensalidades`
Cobranças mensais por veículo.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `associado_id` | uuid FK | |
| `veiculo_id` | uuid FK | |
| `cota_id` | uuid FK | |
| `company_id` | uuid | |
| `valor_base` | numeric | Mensalidade da cota |
| `valor_final` | numeric | Com descontos/acréscimos |
| `desconto`, `acrescimo` | numeric | |
| `mes_referencia` | date | Ex: 2026-06-01 |
| `data_vencimento` | date | |
| `data_pagamento` | date | |
| `status` | text | pendente / paga / atrasada / cancelada / suspensa |
| `forma_pagamento` | text | |
| `comprovante_url` | text | |
| `observacoes` | text | |
| `created_by` | uuid | |

> **Trigger:** status = 'paga' → gera contrato automaticamente via `generate-contract`

---

### `public.cobrancas`
Instrumento de cobrança (boleto, PIX, link).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `mensalidade_id` | uuid FK | |
| `associado_id`, `company_id` | uuid | |
| `valor` | numeric | |
| `tipo` | text | boleto / pix / link / manual |
| `link_pagamento` | text | URL de pagamento |
| `codigo_barras` | text | |
| `codigo_pix` | text | Copia e cola PIX |
| `status` | text | gerada / enviada / paga / cancelada / vencida |
| `data_vencimento`, `data_pagamento` | date | |
| `observacoes` | text | |

---

### `public.configuracoes_financeiras`
Configurações globais de cobrança por empresa.

| Campo | Notas |
|---|---|
| `dia_vencimento_padrao` | Padrão das mensalidades |
| `dias_tolerancia` | Dias antes de multar |
| `percentual_multa` | Ex: 2% |
| `percentual_juros_dia` | Ex: 0.033% |
| `chave_pix`, `tipo_chave_pix` | PIX da empresa |
| `enviar_lembrete_dias_antes` | Alerta automático |
| `enviar_cobranca_apos_dias` | Cobrar após X dias |

---

### `public.pagamentos` (tabela original, mais simples)
| Campo | Tipo |
|---|---|
| `id` | uuid |
| `associado_id`, `veiculo_id` | uuid |
| `valor`, `tipo` | numeric / text |
| `data_vencimento`, `data_pagamento` | date |
| `status` | pendente / pago |
| `referencia` | text |

---

### `public.comissoes`
Comissões de consultores e regionais.

| Campo | Notas |
|---|---|
| `consultor_id`, `regional_id` | Quem recebe |
| `mensalidade_base` | Base de cálculo |
| `percentual_consultor`, `percentual_regional` | % de cada |
| `valor_consultor`, `valor_regional`, `valor_empresa` | Valores calculados |
| `status` | prevista / paga |
| `mes_referencia` | UNIQUE com associado_id |

---

## 3. TABELAS — CONTRATOS E DOCUMENTOS

### `public.generated_contracts`
Contratos gerados em PDF.

| Campo | Notas |
|---|---|
| `id` | uuid |
| `company_id`, `associado_id`, `veiculo_id`, `mensalidade_id` | Vínculo |
| `template_version_id` | Versão do template usada |
| `status` | gerado / enviado / assinado |
| `content_markdown_snapshot` | Markdown original |
| `rendered_text_snapshot` | Texto renderizado |
| `pdf_path` | Path no storage `termos-aceite/contracts/...` |
| `generated_by`, `generated_ip` | Auditoria |

---

### `public.document_templates`
Templates de contrato por empresa.

| Campo | Notas |
|---|---|
| `id`, `company_id` | |
| `nome`, `tipo` | Ex: "Contrato de Adesão" |
| `ativo` | boolean |

### `public.document_template_versions`
Versões de um template com o conteúdo markdown.

| Campo | Notas |
|---|---|
| `template_id` | FK para document_templates |
| `versao` | Ex: "1.0", "2.1" |
| `conteudo_markdown` | Texto com `{{ variáveis }}` |
| `ativa` | boolean |

**Variáveis disponíveis:** `{{ nome }}`, `{{ cpf }}`, `{{ plano }}`, `{{ data }}`, `{{ placa }}`, `{{ modelo }}`, `{{ ano }}`, `{{ mensalidade }}`

---

### `public.termos_aceite`
Termos aceitos digitalmente (assinatura eletrônica).

| Campo | Notas |
|---|---|
| `id`, `associado_id`, `veiculo_id` | |
| `tipo_termo` | Ex: "adesao", "renovacao" |
| `aceito_em`, `ip_aceite` | Auditoria LGPD |
| `pdf_url` | PDF gerado com assinatura |

---

### `public.documentos_associado`
Documentos do associado (CPF, RG, CNH, comprovante).

| Campo | Notas |
|---|---|
| `id`, `associado_id` | |
| `tipo_documento` | cpf / rg / cnh / comprovante_residencia |
| `url` | Storage `associado-documentos/` |
| `status` | pendente / aprovado / reprovado |
| `enviado_em`, `validado_em` | |
| `validado_por` | uuid do admin |

---

### `public.documentos_veiculo`
Documentos do veículo (CRLV, nota fiscal).

| Campo | Notas |
|---|---|
| `id`, `veiculo_id` | |
| `tipo_documento` | crlv / nota_fiscal / laudo |
| `url` | Storage `veiculo-documentos/` |
| `status` | pendente / aprovado / reprovado |

---

## 4. TABELAS — COTAÇÕES

### `public.cotacoes`
Pipeline de vendas — proposta antes da adesão.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `lead_id`, `consultor_id`, `regiao_id` | uuid | |
| `status` | cotacao_status | novo / em_contato / interessado / aguardando_retorno / aprovado / perdido |
| `tipo_bem` | vehicle_type | |
| `placa`, `chassi`, `marca`, `modelo` | text | |
| `ano_fabricacao`, `ano_modelo` | integer | |
| `metodo_valoracao` | metodo_valoracao | fipe / venal / nota_fiscal |
| `valor_bem`, `valor_fipe` | numeric | |
| `codigo_fipe` | text | |
| `cota_id` | uuid FK → cotas | |
| `mensalidade`, `participacao` | numeric | Calculados |
| `carro_reserva_dias`, `carro_reserva_adicional` | numeric | |
| `valor_adesao` | numeric | Campo desativado nas views (ver correções 2026-06-23) |
| `proposta_id`, `associado_id`, `veiculo_id` | uuid | Após conversão |
| `aprovada_em`, `aprovada_por` | timestamptz / uuid | |
| `aceite_token`, `aceite_expires_at` | uuid / timestamptz | Link público de aceite |
| `aceita_em`, `aceita_ip` | timestamptz / text | |
| `observacoes` | text | |

---

### `public.cotacao_contatos`
Histórico de tentativas de contato.

| Campo | Notas |
|---|---|
| `cotacao_id` | FK |
| `usuario_id` | Quem registrou |
| `tipo` | ligacao / whatsapp / retorno / reuniao / email / visita |
| `descricao` | Anotação |
| `data_contato` | timestamp |

---

### `public.cotacao_beneficios`
Benefícios extras selecionados em uma cotação.

| Campo | Notas |
|---|---|
| `cotacao_id`, `beneficio_id` | |
| `nome_snapshot`, `valor_snapshot` | Valor no momento da cotação |
| `selecionado_por` | consultor / publico / associado |
| `is_extra` | boolean |

---

### `public.cotas`
Tabela de faixas de preço por valor FIPE.

| Campo | Notas |
|---|---|
| `cota_nome` | Ex: "COTA 01", "COTA 02" |
| `fipe_min`, `fipe_max` | Faixa de valor |
| `valor_carro`, `valor_moto`, `valor_camionete` | Mensalidade base |
| `mensalidade_caminhao`, `mensalidade_utilitario` | Tipos especiais |
| `mensalidade_maquina_agricola`, `mensalidade_maquina_industrial` | |
| `mensalidade_carreta`, `mensalidade_implemento_agricola` | |
| `ajuste_geral_valor` | Acréscimo fixo em R$ |
| `aplica_carro`, `aplica_moto`, `aplica_caminhonete` | Flags |
| `ativo` | boolean |

---

### `public.leads`
Prospects ainda não convertidos.

| Campo | Notas |
|---|---|
| `id`, `nome`, `telefone`, `email` | |
| `consultor_id`, `regiao_id` | |
| `tipo_veiculo` | |
| `origem` | site / indicacao / campanha |
| `status` | novo / cotado / contatado / convertido / perdido |
| `observacoes` | |

---

## 5. TABELAS — VISTORIA E INSPEÇÃO

### `public.vistorias`
Inspeção física do veículo antes da ativação.

| Campo | Notas |
|---|---|
| `id`, `veiculo_id`, `proposta_id` | |
| `vistoriador_id` | uuid FK → profiles |
| `status` | pendente / agendada / em_andamento / aprovada / reprovada |
| `data_agendada`, `data_realizada` | timestamps |
| `observacoes`, `parecer_tecnico` | text |
| `checklist` | JSONB — itens verificados |
| `fotos` | text[] — URLs no storage |
| `tipo_vistoria` | pre_adesao / renovacao / reinspecao |
| `local_vistoria` | text |
| `token_assinatura` | uuid — token público para o associado |
| `token_assinatura_expires_at` | timestamptz — validade 48h |
| `assinado_em`, `assinado_ip`, `assinado_user_agent` | Auditoria |
| `assinatura_url`, `contrato_url` | PDFs gerados |
| `sede_id`, `consultor_id` | |

---

### `public.ativacoes`
Contrato ativo após vistoria aprovada.

| Campo | Notas |
|---|---|
| `veiculo_id` | UNIQUE — 1 ativação por veículo |
| `associado_id`, `sede_id`, `consultor_id` | |
| `numero_contrato` | Ex: "HAR-2026-001234" |
| `plano`, `categoria` | Ex: "COTA 01", "CARRO" |
| `cobertura_resumida` | text |
| `data_ativacao`, `data_vencimento` | dates |
| `status` | pendente_financeiro / ativo / suspenso / cancelado |
| `ativado_por`, `ativado_em` | Quem ativou |
| `suspenso_por`, `suspenso_em`, `motivo_suspensao` | |
| `cancelado_por`, `cancelado_em`, `motivo_cancelamento` | |

---

### Storage Buckets

| Bucket | Uso |
|---|---|
| `vistoria-fotos` | Fotos da inspeção do veículo |
| `propostas` | PDFs de propostas públicas |
| `termos-aceite` | Contratos assinados |
| `fotos-veiculos` | Fotos do veículo cadastrado |
| `associado-documentos` | RG, CPF, CNH, comprovante |
| `veiculo-documentos` | CRLV, nota fiscal |

---

## 6. COMO FUNCIONA O ENVIO DE BOLETOS HOJE

**Resposta: não há boleto bancário integrado.** O sistema usa:

1. **PIX manual** — financeiro gera o `codigo_pix` na tabela `cobrancas` e repassa ao associado
2. **Link de pagamento** — campo `link_pagamento` na tabela `cobrancas`
3. **Registro manual** — financeiro marca mensalidade como paga após comprovante

**Envio da cobrança:**
- Não há edge function automática de envio de cobrança
- O envio é feito manualmente via WhatsApp pelo consultor/financeiro
- A tabela `configuracoes_financeiras` tem campos `enviar_lembrete_dias_antes` e `enviar_cobranca_apos_dias`, mas a automação de envio não está implementada

**Campo chave PIX:** `configuracoes_financeiras.chave_pix` + `tipo_chave_pix`

---

## 7. COMO FUNCIONA O ENVIO DE CONTRATOS HOJE

**Fluxo completo:**

```
Mensalidade paga
    → Edge function: generate-contract (POST /functions/v1/generate-contract)
    → Busca template ativo da empresa (document_templates + document_template_versions)
    → Substitui variáveis: {{ nome }}, {{ cpf }}, {{ plano }}, {{ data }}, {{ placa }}, {{ modelo }}, {{ ano }}, {{ mensalidade }}
    → Converte markdown → PDF (pdf-lib)
    → Upload: termos-aceite/contracts/{company_id}/{associado_id}/{contract_id}.pdf
    → INSERT em generated_contracts
    → Se configurado: chama send-contract-email
        → Resend API (RESEND_API_KEY)
        → Email HTML com link para download do PDF
        → Remetente: noreply@resend.dev (ou domínio verificado)
```

**Limitação atual:** domínio `harmonyagro.com.br` precisa estar verificado no Resend para enviar a qualquer destinatário. Em modo teste, só envia para `harmonysistema@gmail.com`.

---

## 8. COMO FUNCIONA A SOLICITAÇÃO DE VISTORIA HOJE

**Fluxo:**

```
1. Cotação aprovada → cria vistoria (status: pendente)

2. Consultor/admin aciona envio:
   → Edge function: send-vistoria-link
   → Input: { token, nome, celular, email, placa }
   → Gera link: https://harmonyclube.com.br/vistoria/{token}
   → Envia EMAIL via Resend com:
       - Link para vistoria
       - Lista de 7 fotos necessárias
       - Template HTML com botão "Realizar Vistoria"
   → Envia WHATSAPP via Evolution API com:
       - Mensagem de texto formatada
       - Mesmo link

3. Associado acessa link público (sem login):
   → RPC: get_vistoria_publica_by_token(token)
   → Faz upload das fotos (storage: vistoria-fotos)
   → RPC: salvar_vistoria_publica(token, checklist, fotos[])
   → Status → em_andamento

4. Vistoriador revisa no painel:
   → Aprova → trigger atualiza veiculo_status = 'aprovado'
   → Trigger: update_veiculo_on_vistoria_change()
   → Cria ativação → mensalidades geradas

5. Reprovada → veiculo_status = 'reprovado'
```

**Fotos solicitadas:** frente, traseira, lateral esquerda, lateral direita, painel/hodômetro, chassi, CRLV

---

## 9. PERFIS DE USUÁRIO (ROLES)

**Definidos em:** `supabase/migrations/20251222184028_*.sql` — enum `app_role`

| Role | Nome | Acesso Principal |
|---|---|---|
| `admin_principal` | Administrador Geral | Acesso total sem restrição |
| `admin_regional` | Admin Regional | Acesso à sua sede + regiões |
| `financeiro` | Financeiro | Mensalidades, cobranças, contratos (leitura de associados) |
| `cadastro` | Backoffice/Cadastro | Cadastro de associados e veículos |
| `consultor_vendas` | Consultor | Seus leads, cotações e associados |
| `vistoriador` | Vistoriador | Vistorias atribuídas a ele |
| `associado` | Associado (cliente) | Apenas seus próprios dados |

**Sistema híbrido de permissões:**
- `user_roles` — roles por usuário (many-to-many)
- `user_permissions` — permissões granulares por módulo/ação (CRUD)
- Quando `user_permissions` está preenchido, tem **prioridade absoluta** sobre as roles

**Módulos com permissão granular:** `permission_module` enum inclui associados, veiculos, financeiro, relatorios, configuracoes, cotacoes, vistorias, leads, etc.

**Ações possíveis:** `permission_action` enum — visualizar / criar / editar / excluir / aprovar / exportar

**Funções SQL de controle:**
```sql
public.has_role(user_id, role)         → BOOLEAN
public.is_admin(user_id)               → BOOLEAN  (admin_principal OR admin_regional)
public.is_admin_principal(user_id)     → BOOLEAN
public.get_user_regiao(user_id)        → UUID
public.get_user_sede(user_id)          → UUID
public.can_access_regiao(user_id, regiao_id) → BOOLEAN
public.can_access_veiculo(user_id, veiculo_id) → BOOLEAN
```

**Perfil do usuário logado (`profiles`):**
```
id (= auth.uid()), nome_completo, email, telefone, cpf,
sede_id, regiao_id, ativo, is_admin_principal
```

---

## 10. INTEGRAÇÃO WHATSAPP (EVOLUTION API)

**Status: implementado, mas parcial** — apenas no fluxo de vistoria.

**Arquivo:** `supabase/functions/send-vistoria-link/index.ts`

**Variáveis de ambiente necessárias:**
```
EVOLUTION_API_URL      = https://seu-servidor-evolution.com
EVOLUTION_API_KEY      = sua_chave_de_api
EVOLUTION_INSTANCE     = nome_da_instancia_conectada
```

**Endpoint usado:**
```
POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}
Headers: { "Content-Type": "application/json", "apikey": {EVOLUTION_API_KEY} }
Body: { "number": "5511999999999", "text": "mensagem aqui" }
```

**Formatação do número:** Remove caracteres especiais, adiciona `55` se não começar com `55`.

**Mensagem enviada (vistoria):**
```
Olá {nome}! 👋

Segue o link para realizar a vistoria do seu veículo *{placa}* (válido por 48h):

{link}

Tire as fotos: frente, traseira, laterais, painel, chassi e CRLV.

_Harmony Agro — Proteção Veicular_ 🌾
```

**Outros locais com WhatsApp (via URL manual, sem API):**
- `CotacaoDetail.tsx` — botão que monta URL `wa.me/...` com proposta
- `LayoutCotacaoHarmony.tsx` — envio de PDF via link
- `ResultadoCotacao.tsx` — envio de proposta pública
- `AssociadoDetalhe.tsx` — contato direto com associado

Esses outros casos **não usam Evolution API** — abrem o WhatsApp Web com texto pré-formatado.

---

## MAPA DE EDGE FUNCTIONS

| Function | O que faz | APIs externas | Tabelas |
|---|---|---|---|
| `emily-chat` | Chat IA da Emily | Anthropic Claude | — |
| `send-vistoria-link` | Envia link de vistoria | Resend (email) + Evolution (WhatsApp) | vistorias |
| `generate-contract` | Gera PDF de contrato | Resend (opcional) | mensalidades, associados, veiculos, document_templates, generated_contracts |
| `generate-contract-manual` | Versão manual do anterior | Resend (opcional) | idem |
| `send-contract-email` | Envia contrato por email | Resend | associados |
| `send-proposta-email` | Envia proposta por email | Resend | — |
| `aceitar-cotacao` | Converte cotação em ativação | — | cotacoes, vistorias, associados, veiculos |
| `send-termo-aceite` | Envia termo de aceite | — | termos_aceite, adesao_links |
| `processar-assinatura` | Processa assinatura digital | — | vistorias |
| `embed-assinatura` | Gera embed de assinatura | — | — |
| `harmony-crm` | Interface com CRM externo | Harmony CRM API | cotacoes, veiculos (cache) |
| `api` | API FIPE + outros | FIPE API | fipe_cache, fipe_logs |
| `create-consultor` | Cria usuário consultor | — | auth.users, profiles, user_roles |
| `lookup-email-by-cpf` | Busca email por CPF | — | associados, profiles |
| `upload-proposta-publica` | Upload de PDF público | Supabase Storage | — |

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS (Supabase Secrets)

| Secret | Usado em | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` | emily-chat | ⚠️ Configurar |
| `RESEND_API_KEY` | generate-contract, send-contract-email, send-proposta-email, send-vistoria-link | Verificar |
| `EVOLUTION_API_URL` | send-vistoria-link | Verificar |
| `EVOLUTION_API_KEY` | send-vistoria-link | Verificar |
| `EVOLUTION_INSTANCE` | send-vistoria-link | Verificar |
| `HARMONY_CRM_API_URL` | harmony-crm | Verificar |
| `HARMONY_CRM_API_KEY` | harmony-crm | Verificar |
| `SUPABASE_SERVICE_ROLE_KEY` | funções internas | Automático |
| `SUPABASE_URL` | funções internas | Automático |

---

## FLUXO DE VIDA DO ASSOCIADO (RESUMO)

```
Lead (leads)
    ↓ consultor cria cotação
Cotação (cotacoes) — status: novo → em_contato → aprovado
    ↓ cliente aceita via link ou consultor aprova
Vistoria (vistorias) — status: pendente → em_andamento → aprovada
    ↓ vistoria aprovada (trigger automático)
Ativação (ativacoes) — status: ativo
    ↓ mensalidades geradas (RPC gerar_mensalidades_mes)
Mensalidade (mensalidades) — status: pendente → paga
    ↓ pagamento confirmado
Contrato gerado (generated_contracts) + Comissão calculada (comissoes)
```

---

## OPORTUNIDADES DE INTEGRAÇÃO EMILY × CRM

Com base neste diagnóstico, a Emily pode:

### Ações de LEITURA (para responder ao associado):
- Consultar `mensalidades` — status de pagamento
- Consultar `veiculos` — dados do veículo protegido
- Consultar `ativacoes` — status do contrato
- Consultar `vistorias` — status da vistoria
- Consultar `cotas` — valor da mensalidade

### Ações de ESCRITA (via edge function intermediária):
- Registrar novo `lead` → iniciar cotação
- Acionar `send-vistoria-link` → enviar link de vistoria
- Acionar `send-contract-email` → enviar contrato
- Atualizar `cotacao_contatos` → registrar interação
- Acionar `send-proposta-email` → enviar proposta

### Permissão necessária para Emily no backend:
- `service_role_key` (edge function — nunca no frontend)
- Filtro obrigatório por `user_id = auth.uid()` ou `associado_id` confirmado
