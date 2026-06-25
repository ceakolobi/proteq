# FIPE & PLACA — Diagnóstico Completo
> Data: 2026-06-25 | Projeto: painelharmonyagrocombr

---

## CONCLUSÃO EXECUTIVA

O sistema de consulta de placa e FIPE **está completamente implementado** no código.
O problema de "valor genérico" ao digitar placa é causado por **uma única razão**:

> **`API_PLACAS_KEY` não está configurada no novo projeto Supabase (`sfobrbxzdbgjoxgjerus`)**

Sem essa chave, a edge function `api` retorna erro 503 e o formulário cai no modo manual.

---

## 1. ARQUITETURA DO SISTEMA

```
Usuário digita placa
        │
        ▼
PlacaLookup.tsx
  → supabase.functions.invoke('api', { route: 'placa', placa })
  → header: x-origem: 'cotacao' + Authorization: Bearer {token}
        │
        ▼
Edge Function: supabase/functions/api/index.ts
  → verifica API_PLACAS_KEY
  → GET https://wdapi2.com.br/consulta/{placa}/{API_PLACAS_KEY}
  → parseia: MARCA, MODELO, ANO, FIPE aninhado
  → loga em fipe_logs
  → retorna: { success, data: { marca, modelo, valor_fipe, fipeEncontrado, ... } }
        │
        ▼
CotacaoForm.tsx → handleVehicleFound()
  → preenche: marca, modelo, ano, valor_bem
  → se fipeEncontrado: fipeBloqueado = true (bloqueia edição)
  → se !fipeEncontrado: permite valor manual
```

---

## 2. EDGE FUNCTION `api` — O que faz

**Arquivo:** `supabase/functions/api/index.ts`

### Rotas expostas:

| Método | Rota | Descrição |
|---|---|---|
| POST | body: `{route:'placa', placa:'ABC1234'}` | Consulta veículo por placa |
| GET | `/api/placa/{placa}` | Consulta por placa (alternativo) |
| GET | `/api/fipe/marcas?tipo={tipo}` | Lista marcas |
| GET | `/api/fipe/modelos?tipo={tipo}&marcaId={id}` | Lista modelos |
| GET | `/api/fipe/anos?tipo={tipo}&marcaId={id}&modeloId={id}` | Lista anos |
| GET | `/api/fipe/valor?tipo={tipo}&marcaId={id}&modeloId={id}&anoId={id}` | Valor FIPE |

### APIs externas:
- **FIPE:** `https://parallelum.com.br/fipe/api/v1` — pública, sem autenticação
- **Placa:** `https://wdapi2.com.br/consulta/{placa}/{API_PLACAS_KEY}` — **requer chave**

### Controle de acesso (header `x-origem`):
```
x-origem: 'landing'  → acesso público (FIPE e Placa sem autenticação)
x-origem: 'cotacao'  → requer Bearer token (usuário autenticado)
x-origem: 'web'      → requer Bearer token
```

### O que acontece sem `API_PLACAS_KEY`:
```typescript
// supabase/functions/api/index.ts linha 278-292
const apiPlacasKey = Deno.env.get('API_PLACAS_KEY');
if (!apiPlacasKey) {
  return Response(503, { error: 'Consulta por placa não disponível. Configure a API key.' })
}
```
→ PlacaLookup recebe `status='error'` → formulário libera preenchimento manual → usuário digita valores genéricos.

---

## 3. `PlacaLookup.tsx` — Componente de Busca

**Arquivo:** `src/components/cotacao/PlacaLookup.tsx`

### Validação de placa:
```typescript
const padraoAntigo   = /^[A-Z]{3}[0-9]{4}$/;        // ABC-1234
const padraoMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/; // ABC1D23
```

### Fluxo:
1. Usuário digita placa → auto-formata (`ABC-1234`)
2. Ao sair do campo (blur) ou clicar na lupa → `consultarPlaca()`
3. Chama `supabase.functions.invoke('api', { body: {route:'placa', placa}, headers: {'x-origem':'cotacao'} })`
4. Retorna `VehicleData` completo

### Interface `VehicleData` retornada:
```typescript
{
  placa?:           string
  marca:            string      // Ex: "VOLKSWAGEN"
  modelo:           string      // Ex: "GOL"
  versao?:          string
  ano_fabricacao:   string      // Ex: "2020"
  ano_modelo:       string      // Ex: "2021"
  renavam?:         string
  chassi?:          string      // Com '*' removidos
  chassi_mascarado?: boolean
  cor?:             string
  combustivel?:     string
  municipio?:       string
  uf?:              string
  situacao?:        string
  valor_fipe?:      number      // Ex: 42500 (já em número)
  codigo_fipe?:     string
  fipeEncontrado:   boolean     // true se FIPE veio junto com a placa
}
```

### Status possíveis:
| Status | Significado |
|---|---|
| `idle` | Aguardando input |
| `loading` | Consultando |
| `found_fipe` | ✅ Encontrado com FIPE — campo valor bloqueado |
| `found_no_fipe` | ⚠️ Encontrado sem FIPE — permite valor manual |
| `not_found` | Placa não encontrada |
| `invalid` | Formato inválido |
| `error` | Erro na API (inclui sem `API_PLACAS_KEY`) |

---

## 4. `CotacaoForm.tsx` — Integração no Formulário

**Arquivo:** `src/components/cotacao/CotacaoForm.tsx`

### Handler `handleVehicleFound` (linhas 181-199):
```typescript
const handleVehicleFound = useCallback((data: VehicleData) => {
  setFormData(prev => ({
    ...prev,
    marca:          data.marca,
    modelo:         data.modelo,
    ano_fabricacao: data.ano_fabricacao,
    ano_modelo:     data.ano_modelo,
    renavam:        data.renavam || '',
    chassi:         data.chassi || '',
    cor:            data.cor || '',
    codigo_fipe:    data.codigo_fipe || '',
    valor_bem:      data.valor_fipe ? String(data.valor_fipe) : '',   // ← valor FIPE real
    metodo_valoracao: data.fipeEncontrado ? 'fipe' : 'venal',
  }));
  
  if (data.fipeEncontrado && data.valor_fipe) {
    setFipeBloqueado(true);  // ← bloqueia edição manual do valor
  }
}, []);
```

### O que `fipeBloqueado = true` faz:
- Campo `valor_bem` fica readonly (cadeado visual)
- Método de valoração mostra badge "FIPE Automática"
- Ao salvar: `valor_fipe = valorBem` (registra como FIPE oficial)

### Fallback sem FIPE:
- `FipeSelector` aparece para busca manual cascata (Marca → Modelo → Ano → Valor)
- Ou usuário digita valor manualmente com `metodo_valoracao = 'venal'`

---

## 5. `FipeSelector.tsx` — Dropdown Cascata (backup)

**Arquivo:** `src/components/cotacao/FipeSelector.tsx`

Aparece quando placa não encontra FIPE. Permite busca manual:
```
Select Marca → Select Modelo → Select Ano → [Buscar Valor FIPE]
```

Usa hook `usePublicFipe.ts` que chama `/api/fipe/{marcas|modelos|anos|valor}`.

---

## 6. Tabelas de Banco

### `fipe_cache` — Cache 24h
```sql
tipo_veiculo TEXT, marca_id TEXT, marca_nome TEXT,
modelo_id TEXT, modelo_nome TEXT, ano_id TEXT, ano_nome TEXT,
codigo_fipe TEXT, valor NUMERIC, mes_referencia TEXT, combustivel TEXT,
created_at, expires_at (now + 24h)
UNIQUE(tipo_veiculo, marca_id, modelo_id, ano_id)
```

### `fipe_logs` — Auditoria LGPD
```sql
user_id UUID, user_email TEXT, endpoint TEXT,
parametros JSONB, ip_address TEXT, user_agent TEXT,
origem TEXT, sucesso BOOLEAN, erro TEXT, cache_hit BOOLEAN, created_at
```

---

## 7. Landing Page vs Painel — Diferenças

| Aspecto | Landing (`DadosVeiculoForm`) | Painel (`CotacaoForm`) |
|---|---|---|
| Header enviado | `x-origem: landing` | `x-origem: cotacao` |
| Autenticação | Pública | Requer login |
| Fluxo placa | Placa → auto-popula dropdown FIPE | Placa → preenche form direto |
| Fallback | Dropdown FIPE cascata | FipeSelector + valor manual |

---

## 8. Status de Cada Componente

| Componente | Status | Arquivo |
|---|---|---|
| Edge function `api` | ✅ Completo | `supabase/functions/api/index.ts` |
| `PlacaLookup` | ✅ Completo | `src/components/cotacao/PlacaLookup.tsx` |
| `CotacaoForm` integração | ✅ Completo | `src/components/cotacao/CotacaoForm.tsx` |
| `FipeSelector` | ✅ Completo | `src/components/cotacao/FipeSelector.tsx` |
| `usePublicFipe` | ✅ Completo | `src/hooks/usePublicFipe.ts` |
| `DadosVeiculoForm` (landing) | ✅ Completo | `src/components/landing/DadosVeiculoForm.tsx` |
| `fipe_cache` (banco) | ✅ Completo | Migration `20251227033255_*.sql` |
| `fipe_logs` (banco) | ✅ Completo | Migration `20251227033255_*.sql` |
| **`API_PLACAS_KEY` (secret)** | ❌ **NÃO CONFIGURADA** | Supabase → Settings → Secrets |

---

## 9. CAUSA RAIZ DO PROBLEMA

**O código está 100% correto e conectado.**

O problema é operacional: a chave `API_PLACAS_KEY` existe no projeto antigo (Lovable, `sbtfhtllzpurjprivqoi`) mas **não foi migrada** para o novo projeto (`sfobrbxzdbgjoxgjerus`).

### Fluxo atual (com erro):
```
Usuário digita placa
  → PlacaLookup chama api
  → api: API_PLACAS_KEY não existe → retorna 503
  → PlacaLookup: status = 'error'
  → CotacaoForm: fipeBloqueado = false
  → Usuário preenche manualmente → valor "genérico"
```

### Fluxo correto (com a chave):
```
Usuário digita placa
  → PlacaLookup chama api
  → api: chama wdapi2.com.br → retorna marca, modelo, FIPE
  → PlacaLookup: status = 'found_fipe'
  → CotacaoForm: fipeBloqueado = true, valor_bem = FIPE real
  → Cálculo automático com valor real
```

---

## 10. SOLUÇÃO (UMA LINHA DE AÇÃO)

Configurar o secret no novo projeto:

```
supabase.com/dashboard/project/sfobrbxzdbgjoxgjerus/settings/functions
→ Add new secret
Nome:   API_PLACAS_KEY
Valor:  [chave da wdapi2.com.br do projeto antigo]
```

Para obter a chave do projeto antigo:
```
supabase.com/dashboard/project/sbtfhtllzpurjprivqoi/settings/functions
→ Ver secrets existentes → copiar API_PLACAS_KEY
```

Nenhuma alteração de código necessária.

---

## 11. VERIFICAÇÃO PÓS-CONFIGURAÇÃO

Após adicionar o secret, testar:
1. Abrir o formulário de cotação (autenticado)
2. Digitar placa `ABC1234` no campo
3. Aguardar ou clicar na lupa
4. Verificar se aparece badge "FIPE encontrada" (verde)
5. Verificar se marca, modelo e valor FIPE foram preenchidos automaticamente
