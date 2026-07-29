/**
 * Formata uma data como 'YYYY-MM-DD' usando os componentes LOCAIS.
 *
 * Substitui o padrao `new Date().toISOString().split('T')[0]`, que usa UTC e, em
 * fuso negativo (Brasil, UTC-3), retorna o dia SEGUINTE no fim da noite — gerando
 * "hoje" errado (ex.: consultar propostas de 29/07 quando ainda e 28/07).
 */
export function toLocalYMD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
