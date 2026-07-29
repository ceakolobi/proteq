import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Nome do contexto que este boundary protege (ex.: "app", "aba: Associados"). Vai no log. */
  label?: string;
  /** Versão enxuta, para uso dentro de uma aba do TabShell (não ocupa a tela toda). */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

/**
 * Desregistra TODOS os service workers, apaga TODOS os caches e recarrega.
 * É a saída para o bug de "tela branca pós-deploy": SW servindo index.html
 * antigo que aponta para chunks /assets/*.js que o deploy novo já removeu.
 */
export async function limparCacheERecarregar(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    console.error('[ErrorBoundary] falha ao desregistrar service workers:', e);
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.error('[ErrorBoundary] falha ao limpar caches:', e);
  }
  window.location.reload();
}

/** Primeira linha útil do componentStack — o componente onde a exceção estourou. */
function extrairComponente(componentStack: string | null): string | null {
  if (!componentStack) return null;
  const linha = componentStack
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('at ') || l.startsWith('in '));
  if (!linha) return null;
  return linha.replace(/^(at|in)\s+/, '').split(' ')[0] || null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const componentStack = info?.componentStack ?? null;
    this.setState({ componentStack });

    const componente = extrairComponente(componentStack);
    const payload = {
      when: new Date().toISOString(),
      label: this.props.label ?? null,
      componente,
      name: error?.name ?? null,
      message: error?.message ?? String(error),
      stack: error?.stack ?? null,
      componentStack,
      url: typeof location !== 'undefined' ? location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    console.error('[ErrorBoundary]', this.props.label ?? '', error, componentStack);
    try {
      sessionStorage.setItem('harmony:last-error', JSON.stringify(payload, null, 2));
    } catch {
      /* ignora quota/modo privado */
    }
  }

  private handleCopiar = () => {
    const txt = sessionStorage.getItem('harmony:last-error') ?? '';
    if (txt && navigator.clipboard) {
      navigator.clipboard.writeText(txt).catch(() => { /* ignora */ });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, componentStack } = this.state;
    const componente = extrairComponente(componentStack);
    const compact = this.props.compact;

    const box: React.CSSProperties = {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      color: '#1f2937',
      background: '#fff',
      border: '1px solid #fecaca',
      borderRadius: 12,
      padding: compact ? 20 : 28,
      margin: compact ? 0 : '10vh auto',
      maxWidth: 760,
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    };
    const pre: React.CSSProperties = {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 12,
      background: '#f8fafc',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: 12,
      maxHeight: 220,
      overflow: 'auto',
      color: '#334155',
    };
    const btn: React.CSSProperties = {
      cursor: 'pointer',
      border: 'none',
      borderRadius: 8,
      padding: '10px 16px',
      fontWeight: 600,
      fontSize: 14,
    };

    return (
      <div style={compact ? { padding: 8 } : { minHeight: '100vh', background: '#f9fafb' }}>
        <div style={box} role="alert">
          <div style={{ fontSize: compact ? 16 : 20, fontWeight: 700, marginBottom: 6 }}>
            Algo quebrou {this.props.label ? `em "${this.props.label}"` : 'nesta tela'}
          </div>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 0 }}>
            Se isso apareceu logo após uma atualização, o mais provável é cache antigo.
            Use o botão abaixo para limpar o cache e recarregar.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
            <button style={{ ...btn, background: '#ea580c', color: '#fff' }} onClick={limparCacheERecarregar}>
              Recarregar limpando cache
            </button>
            <button
              style={{ ...btn, background: '#f1f5f9', color: '#334155' }}
              onClick={this.handleCopiar}
            >
              Copiar detalhes do erro
            </button>
          </div>

          <div style={{ fontSize: 13, marginBottom: 8 }}>
            {componente && (
              <div>
                <strong>Componente:</strong> {componente}
              </div>
            )}
            <div>
              <strong>Erro:</strong> {error?.name ? `${error.name}: ` : ''}
              {error?.message ?? String(error)}
            </div>
          </div>

          {(error?.stack || componentStack) && (
            <pre style={pre}>{[error?.stack, componentStack].filter(Boolean).join('\n\n')}</pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
