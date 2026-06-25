# EMILY — Diagnóstico Completo do Sistema de Chat/IA
> Data: 2026-06-24 | Projeto: painelharmonyagrocombr

---

## 1. Localização dos Arquivos

| Arquivo | Caminho completo |
|---|---|
| Componente do chat (frontend) | `src/components/landing/EmilyFloat.tsx` |
| Edge Function (backend IA) | `supabase/functions/emily-chat/index.ts` |
| Onde é montado | `src/pages/Index.tsx` → `<EmilyFloat onStartCotacao={...} />` |
| Config Supabase | `supabase/config.toml` → `[functions.emily-chat] verify_jwt = false` |

---

## 2. Modelo de IA

```
Provider:    Google Gemini (via gateway Lovable.dev)
Modelo:      google/gemini-2.5-flash
Endpoint:    https://ai.gateway.lovable.dev/v1/chat/completions
Auth:        Bearer LOVABLE_API_KEY (Supabase Secret)
```

> **Atenção:** A chamada passa pelo **gateway da Lovable.dev**, não direto para a API do Google. Dependência de terceiro — se a Lovable mudar política ou o serviço cair, a Emily para de funcionar.

---

## 3. System Prompt Atual (íntegro)

```
Você é a Emily, consultora virtual da Harmony Agro (proteção veicular mutualista).

REGRAS RÍGIDAS:
- Máximo 2-3 linhas por resposta.
- Use no máximo 1 emoji por resposta.
- Tom: cordial, direto, brasileiro.
- Regra DIRECT-TO-PLATE: se o usuário falar em cotação, preço, valor, mensalidade,
  plano, ou simular, peça IMEDIATAMENTE a placa do veículo (formato ABC1D23 ou
  ABC1234). Não peça mais nada antes da placa.
- Quando receber uma placa válida, responda: "Perfeito! Estou gerando sua cotação
  agora. ✨" e oriente o usuário a usar o botão "Fazer Cotação" da página.
- Políticas: SEM taxa de adesão, 1ª mensalidade grátis, SEM análise de condutor,
  SEM consulta SPC/Serasa, carência geral 72h (furto/roubo é imediato).
- Natureza: somos associação de proteção mutualista, NÃO seguradora.
- Nunca invente preços. Nunca prometa cobertura. Nunca peça dados sensíveis
  (CPF, senha, cartão).
- Se perguntarem algo fora do escopo, redirecione gentilmente para proteção veicular.
```

> **Status:** Hardcoded em `supabase/functions/emily-chat/index.ts`. Qualquer mudança exige novo deploy da edge function.

---

## 4. Arquitetura do Fluxo Completo

```
Usuário (browser)
    ↓ abre chat flutuante (botão azul, canto inferior esquerdo)
EmilyFloat.tsx
    ↓ detecta placa via regex local → pede FIPE
    ↓ se não houver placa → envia histórico para edge function
Supabase Edge Function (emily-chat)
    ↓ POST com [system_prompt + histórico]
Lovable AI Gateway
    ↓ proxifica para Google
Google Gemini 2.5 Flash
    ↓ { reply: string }
EmilyFloat.tsx
    ↓ exibe resposta ou card de cotação
```

---

## 5. Integração com Cotações e Planos

A IA **não tem acesso direto** aos valores de plano. O cálculo é feito localmente no browser:

```
1. Componente carrega cotas do Supabase 1x ao montar:
   supabase.from('cotas').select('*').eq('ativo', true)

2. Usuário informa placa → regex detecta → Emily pede FIPE

3. Usuário informa FIPE → calcularCotacaoCompleta(fipe, tipo, cotas)
   (função de cotacaoUtils.ts — mesma usada no formulário de cotação)

4. Resultado exibido como card inline:
   - Mensalidade
   - Participação (7%)
   - Cota (ex: COTA 01)
   - Placa + FIPE

5. Botão "Quero aderir agora" → dispara onStartCotacao()
   → inicia o funil completo (dados pessoais → veículo → resultado)
```

---

## 6. O Que Funciona

- Chat flutuante visual com avatar da Emily
- Conversa genérica via Gemini (dúvidas, objeções, perguntas sobre o produto)
- Detecção de placa por regex: `/\b([A-Z]{3})-?(\d)([A-Z0-9])(\d{2})\b/i`
- Solicitação de FIPE e cálculo de cotação inline
- Card de resultado com mensalidade + participação
- Botão "Quero aderir" → inicia funil de cotação completo
- CORS configurado, JWT desabilitado (público — correto para landing)
- Tratamento de erros: 429 (rate limit), 402 (créditos esgotados), 5xx

---

## 7. Problemas e Lacunas Identificadas

### 7.1 Bug Crítico — Tipo de Veículo Sempre 'carro'

```typescript
// EmilyFloat.tsx linha 66-68
const detectarTipo = (placa: string): VehicleType => {
  return 'carro'; // heurística simples: deixa o usuário confirmar depois
};
```

**Impacto:** Moto, caminhão, pickup, máquina agrícola → cálculo feito na faixa errada.
**Correção necessária:** Perguntar o tipo ao usuário após detectar a placa.

---

### 7.2 IA Não Conhece Valores das Cotas

O Gemini recebe apenas o system prompt genérico. Se o usuário perguntar "quanto custa para um carro de R$ 60.000?", a Emily não pode responder com precisão.

**Alternativa atual:** Emily pede a placa e o sistema calcula localmente.
**Melhoria possível:** Injetar tabela de cotas resumida no system prompt.

---

### 7.3 System Prompt Desatualizado

O prompt menciona **"SEM taxa de adesão"** — que continua correto — mas foi escrito antes das correções de 2026-06-23 que removeram o campo `valor_adesao` das views de cotação. O prompt em si está OK neste ponto, mas deve ser revisado antes de qualquer mudança de produto.

---

### 7.4 Gateway Lovable Como Dependência Externa

Se a Lovable.dev alterar sua política de API, encerrar o gateway ou os créditos acabarem (HTTP 402), a Emily para de funcionar sem qualquer aviso ao usuário.

**Mitigação recomendada:** Migrar para Claude API (Anthropic) diretamente, usando a chave já disponível no projeto via `CLAUDE.md`.

---

### 7.5 LOVABLE_API_KEY Pode Não Estar Configurada

Se o secret não estiver definido no Supabase, a edge function retorna HTTP 500 com `{ error: "LOVABLE_API_KEY missing" }` — sem log visível ao usuário além de "Estou com instabilidade".

**Como verificar:**
```
Supabase Dashboard → Project → Settings → Edge Functions → Secrets
→ Confirmar que LOVABLE_API_KEY existe
```

---

### 7.6 Sem Persistência de Histórico

Cada sessão é stateless. Ao fechar o chat ou recarregar a página, toda a conversa é perdida.

**Tabela sugerida para implementação futura:**
```sql
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);
```

---

### 7.7 Sem Log de Conversas

Não há registro das perguntas feitas pelos usuários. Impossível saber:
- O que os prospects mais perguntam
- Taxa de conversão do chat → cotação
- Perguntas sem resposta satisfatória

---

### 7.8 Sem Fallback de Modelo

Se o Gemini falhar (timeout, quota), não há rota alternativa. A resposta é simplesmente o fallback local: `'Pode me mandar a placa do seu veículo? 🚗'`

---

## 8. Variáveis de Ambiente e Secrets

| Variável | Onde | Necessário para |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` | Conexão frontend → Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` | Autenticação frontend |
| `LOVABLE_API_KEY` | Supabase Secrets | Chamadas à IA (emily-chat) |

---

## 9. Melhorias Prioritárias (por ordem de impacto)

| Prioridade | Melhoria | Esforço |
|---|---|---|
| 🔴 Alta | Corrigir tipo de veículo (perguntar moto/carro/pickup) | Baixo (EmilyFloat.tsx) |
| 🔴 Alta | Migrar de Lovable Gateway para Claude/Anthropic direto | Médio (edge function) |
| 🟡 Média | Injetar tabela de cotas resumida no system prompt | Médio (edge function) |
| 🟡 Média | Log de conversas em tabela Supabase | Médio (edge function + DB) |
| 🟢 Baixa | Persistência de histórico por sessão | Alto |
| 🟢 Baixa | Analytics de conversão chat → cotação | Alto |

---

## 10. Referências Cruzadas no Projeto

| Recurso | Arquivo | Relação |
|---|---|---|
| Cálculo de cotação | `src/lib/cotacaoUtils.ts` | Usado diretamente por EmilyFloat |
| Tabela de cotas | `supabase/migrations/20251227...sql` | Dados que alimentam o cálculo |
| Funil de cotação | `src/hooks/usePublicQuotation.ts` | Disparado pelo botão "Quero aderir" |
| Resultado da cotação | `src/components/landing/ResultadoCotacao.tsx` | Próxima tela após Emily |
| Avatar Emily | `src/assets/emily-avatar.png` | Imagem do chat |
