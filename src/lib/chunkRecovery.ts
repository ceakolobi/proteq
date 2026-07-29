/**
 * Auto-recuperação de falha de carregamento de módulo (chunk).
 *
 * Cenário: após um deploy, o Service Worker pode servir um index.html antigo
 * (cache-first) que aponta para /assets/*.js já removidos pelo deploy novo, ou
 * uma sessão longa importa dinamicamente um chunk que sumiu. O import falha e,
 * sem tratamento, vira tela branca.
 *
 * Estratégia: ao detectar a falha, desregistra TODOS os service workers, apaga
 * TODOS os caches e recarrega UMA vez. Uma flag em sessionStorage impede loop de
 * reload — se a recuperação não resolver, mostramos uma tela pedindo Ctrl+Shift+R.
 *
 * LIMITE: se o chunk PRINCIPAL (index-*.js) falhar no boot, este código nem chega
 * a rodar (está dentro do chunk que falhou). Esse caso depende do index.html ser
 * servido network-first (ver PROC 2 item b) ou de um guard inline no index.html.
 */

const RECOVERY_FLAG = 'harmony:chunk-recovery';
const LAST_ERROR = 'harmony:last-error';

const PADROES_CHUNK = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
  'ChunkLoadError',
  "Unexpected token '<'", // servidor devolveu index.html (HTML) no lugar do JS
  'Unexpected token <',
];

function pareceErroDeChunk(msg?: string | null, name?: string | null): boolean {
  if (name === 'ChunkLoadError') return true;
  if (!msg) return false;
  return PADROES_CHUNK.some((p) => msg.includes(p));
}

function serializar(detalhe: unknown): string {
  try {
    if (detalhe instanceof Error) return `${detalhe.name}: ${detalhe.message}\n${detalhe.stack ?? ''}`;
    if (typeof detalhe === 'string') return detalhe;
    return JSON.stringify(detalhe);
  } catch {
    return String(detalhe);
  }
}

function registrarErro(origem: string, detalhe: unknown) {
  try {
    const payload = {
      when: new Date().toISOString(),
      tipo: 'chunk-load-failure',
      origem,
      detalhe: serializar(detalhe),
      url: typeof location !== 'undefined' ? location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };
    sessionStorage.setItem(LAST_ERROR, JSON.stringify(payload, null, 2));
  } catch {
    /* ignora quota/modo privado */
  }
}

async function limparSWeCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    console.error('[chunkRecovery] falha ao desregistrar service workers:', e);
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.error('[chunkRecovery] falha ao limpar caches:', e);
  }
}

function mostrarTelaManual() {
  if (document.getElementById('harmony-chunk-manual')) return;
  const div = document.createElement('div');
  div.id = 'harmony-chunk-manual';
  div.setAttribute(
    'style',
    'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
      'background:#f9fafb;font-family:ui-sans-serif,system-ui,sans-serif;color:#1f2937;padding:24px;',
  );
  div.innerHTML =
    '<div style="max-width:420px;text-align:center;background:#fff;border:1px solid #e5e7eb;' +
    'border-radius:12px;padding:28px;box-shadow:0 4px 24px rgba(0,0,0,.06)">' +
    '<div style="font-size:20px;font-weight:700;margin-bottom:8px">Atualização necessária</div>' +
    '<p style="font-size:14px;color:#6b7280;margin:0 0 18px">' +
    'Já tentamos atualizar automaticamente. Por favor force o recarregamento com ' +
    '<strong>Ctrl+Shift+R</strong> (Windows) ou <strong>Cmd+Shift+R</strong> (Mac).</p>' +
    '<button id="harmony-chunk-manual-btn" style="cursor:pointer;border:none;border-radius:8px;' +
    'padding:10px 16px;font-weight:600;font-size:14px;background:#ea580c;color:#fff">' +
    'Limpar cache e recarregar</button></div>';
  document.body.appendChild(div);
  const btn = document.getElementById('harmony-chunk-manual-btn');
  btn?.addEventListener('click', async () => {
    try {
      sessionStorage.removeItem(RECOVERY_FLAG);
    } catch {
      /* ignora */
    }
    await limparSWeCaches();
    location.reload();
  });
}

let recuperando = false;

async function recuperar(origem: string, detalhe: unknown) {
  if (recuperando) return;
  recuperando = true;

  console.error('[chunkRecovery] falha de carregamento de módulo:', origem, detalhe);
  registrarErro(origem, detalhe);

  // Anti-loop: se já tentamos recuperar nesta sessão de aba e ainda estamos
  // falhando, NÃO recarrega de novo — pede refresh manual.
  let jaTentou = false;
  try {
    jaTentou = !!sessionStorage.getItem(RECOVERY_FLAG);
  } catch {
    /* ignora */
  }
  if (jaTentou) {
    mostrarTelaManual();
    return;
  }

  try {
    sessionStorage.setItem(RECOVERY_FLAG, String(Date.now()));
  } catch {
    /* ignora */
  }

  await limparSWeCaches();
  location.reload();
}

/**
 * Registra os listeners o mais cedo possível. Chamar em main.tsx ANTES do render.
 */
export function initChunkRecovery() {
  if (typeof window === 'undefined') return;

  // Vite emite este evento quando o preload de um chunk dinâmico falha.
  window.addEventListener('vite:preloadError', (event: Event) => {
    event.preventDefault?.(); // impede o Vite de relançar como erro não tratado
    recuperar('vite:preloadError', (event as unknown as { payload?: unknown }).payload);
  });

  // Captura (capture=true) para pegar erros de carregamento de recurso
  // (<script>/<link>), que NÃO borbulham.
  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      const target = event.target as (HTMLElement & { src?: string; href?: string }) | null;
      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        const url = target.src || target.href || '';
        if (/\/assets\/.+\.(m?js|css)(\?|$)/.test(url)) {
          recuperar('resource-error', url);
        }
        return;
      }
      if (pareceErroDeChunk(event.message, (event.error as { name?: string } | undefined)?.name)) {
        recuperar('window.error', event.message || event.error);
      }
    },
    true,
  );

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason as { message?: string; name?: string } | string | undefined;
    const msg = typeof reason === 'string' ? reason : reason?.message;
    const name = typeof reason === 'string' ? undefined : reason?.name;
    if (pareceErroDeChunk(msg, name)) {
      recuperar('unhandledrejection', msg ?? reason);
    }
  });
}

/**
 * Boot bem-sucedido: libera a flag (com folga) para permitir UMA nova
 * auto-recuperação numa futura falha (ex.: outro deploy na mesma aba longa).
 * Como um loop nunca chega a bootar com sucesso, isto não reintroduz loop.
 */
export function markAppBooted() {
  setTimeout(() => {
    try {
      sessionStorage.removeItem(RECOVERY_FLAG);
    } catch {
      /* ignora */
    }
  }, 8000);
}
