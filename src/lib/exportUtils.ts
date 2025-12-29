// Export utilities for PDF and Excel

export interface ExportColumn {
  header: string;
  accessor: string;
  format?: (value: any) => string;
}

/**
 * Escapa caracteres HTML para prevenir XSS
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Generate CSV content
function generateCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[]
): string {
  const headers = columns.map(c => c.header).join(';');
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.accessor];
      const formatted = col.format ? col.format(value) : String(value ?? '');
      // Escape quotes and wrap in quotes if contains semicolon
      return formatted.includes(';') ? `"${formatted.replace(/"/g, '""')}"` : formatted;
    }).join(';')
  );
  return [headers, ...rows].join('\n');
}

// Export to Excel (CSV with BOM for proper encoding)
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  const csv = generateCSV(data, columns);
  // Add BOM for UTF-8 encoding in Excel
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Export to PDF (generates HTML and opens print dialog)
export function exportToPDF<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  title: string
): void {
  const tableRows = data.map(item =>
    `<tr>${columns.map(col => {
      const value = item[col.accessor];
      const formatted = col.format ? col.format(value) : String(value ?? '-');
      return `<td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${escapeHtml(formatted)}</td>`;
    }).join('')}</tr>`
  ).join('');

  const safeTitle = escapeHtml(title);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${safeTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; margin-bottom: 10px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background-color: #f5f5f5; border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: bold; }
        td { border: 1px solid #ddd; padding: 8px; }
        tr:nth-child(even) { background-color: #fafafa; }
        @media print {
          body { padding: 0; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${safeTitle}</h1>
      <p class="meta">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      <table>
        <thead>
          <tr>${columns.map(c => `<th style="border: 1px solid #ddd; padding: 10px; background-color: #f5f5f5;">${escapeHtml(c.header)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
