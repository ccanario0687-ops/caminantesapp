/**
 * Estilos profesionales compartidos para todos los reportes impresos.
 * Uso: import { printCSS, printHeader, printFooter } from "@/lib/printStyles";
 */

export const printCSS = `
  @page {
    size: A4;
    margin: 12mm 15mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1a1a2e;
    background: #fff;
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }
  .print-container {
    max-width: 100%;
  }
  .print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 14px;
    margin-bottom: 20px;
    border-bottom: 2px solid #1a1a2e;
  }
  .print-header-left h1 {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 2px 0;
    color: #1a1a2e;
    letter-spacing: -0.3px;
  }
  .print-header-left .subtitle {
    font-size: 11px;
    color: #555;
    margin: 0;
  }
  .print-header-right {
    text-align: right;
    font-size: 10px;
    color: #777;
  }
  .print-header-right .date {
    margin: 0 0 4px 0;
  }
  .print-header-right .stats {
    font-size: 11px;
    font-weight: 600;
    color: #444;
    margin: 0;
  }

  /* Tablas profesionales */
  table.print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin-bottom: 16px;
  }
  table.print-table thead th {
    background: #1a1a2e;
    color: #fff;
    padding: 8px 10px;
    text-align: left;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #1a1a2e;
  }
  table.print-table thead th:first-child {
    border-radius: 4px 0 0 0;
  }
  table.print-table thead th:last-child {
    border-radius: 0 4px 0 0;
  }
  table.print-table tbody td {
    padding: 7px 10px;
    border-bottom: 1px solid #e5e7eb;
    color: #333;
  }
  table.print-table tbody tr:nth-child(even) {
    background: #f9fafb;
  }
  table.print-table tbody tr:hover {
    background: #f3f4f6;
  }
  table.print-table .text-right { text-align: right; }
  table.print-table .text-center { text-align: center; }
  table.print-table .font-semibold { font-weight: 600; }
  table.print-table .text-success { color: #059669; font-weight: 600; }
  table.print-table .text-danger { color: #dc2626; font-weight: 600; }
  table.print-table .text-muted { color: #9ca3af; }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 600;
  }
  .badge-success { background: #ecfdf5; color: #059669; }
  .badge-warning { background: #fffbeb; color: #d97706; }
  .badge-danger { background: #fef2f2; color: #dc2626; }
  .badge-info { background: #eff6ff; color: #2563eb; }
  .badge-neutral { background: #f3f4f6; color: #6b7280; }

  /* Section headers */
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #1a1a2e;
    margin: 20px 0 10px 0;
    padding: 6px 0;
    border-bottom: 1px solid #d1d5db;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .section-subtitle {
    font-size: 10px;
    color: #6b7280;
    margin: -6px 0 12px 0;
  }

  /* Summary cards */
  .summary-grid {
    display: flex;
    gap: 12px;
    margin: 16px 0;
    flex-wrap: wrap;
  }
  .summary-card {
    flex: 1;
    min-width: 120px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px 14px;
    text-align: center;
  }
  .summary-card .label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6b7280;
    margin: 0 0 4px 0;
  }
  .summary-card .value {
    font-size: 16px;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0;
  }
  .summary-card .value.success { color: #059669; }
  .summary-card .value.danger { color: #dc2626; }

  /* Footer */
  .print-footer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #d1d5db;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #9ca3af;
  }

  /* Page break utility */
  .page-break { page-break-before: always; }
  .avoid-break { page-break-inside: avoid; }

  /* Print-specific rules */
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

/**
 * Genera el header HTML profesional para reportes impresos.
 * @param {object} opts
 * @param {string} opts.titulo - Título del reporte (ej: "Reporte de Caminantes")
 * @param {string} [opts.subtitulo] - Subtítulo opcional
 * @param {number} [opts.numeroRetiro] - Número de retiro
 * @param {number} [opts.total] - Total de registros
 * @param {string} [opts.extraInfo] - Info extra a mostrar
 */
export function printHeaderHTML(opts = {}) {
  const { titulo = "Reporte", subtitulo, numeroRetiro, total, extraInfo, coordinador, sub_coordinador } = opts;
  const hoy = new Date().toLocaleDateString("es-DO", { year: 'numeric', month: 'long', day: 'numeric' });
  return `
    <div class="print-header">
      <div class="print-header-left">
        <h1>✝️ ${titulo}</h1>
        ${subtitulo ? `<p class="subtitle">${subtitulo}</p>` : ""}
        ${numeroRetiro ? `<p class="subtitle">Retiro #${numeroRetiro}</p>` : ""}
        ${coordinador ? `<p class="subtitle">Coordinador: <strong style="color:#1a1a2e">${coordinador}</strong></p>` : ""}
        ${sub_coordinador ? `<p class="subtitle">Sub-Coordinador: <strong style="color:#1a1a2e">${sub_coordinador}</strong></p>` : ""}
      </div>
      <div class="print-header-right">
        <p class="date">${hoy}</p>
        ${total !== undefined ? `<p class="stats">${total} registro(s)</p>` : ""}
        ${extraInfo ? `<p style="font-size:9px;color:#888;margin:2px 0 0">${extraInfo}</p>` : ""}
      </div>
    </div>`;
}

/**
 * Genera el footer HTML profesional.
 */
export function printFooterHTML() {
  const hoy = new Date().toLocaleDateString("es-DO", { year: 'numeric', month: 'long', day: 'numeric' });
  return `
    <div class="print-footer">
      <span>✝️ Sistema de Gestión — Retiro de Emaús</span>
      <span>Generado el ${hoy}</span>
    </div>`;
}

/**
 * Genera un documento HTML completo listo para imprimir.
 * @param {string} titulo - Título de la ventana
 * @param {string} bodyHTML - Contenido HTML del body
 * @param {string} [extraCSS] - CSS adicional específico del reporte
 */
export function buildPrintDoc(titulo, bodyHTML, extraCSS = "") {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${titulo} — Retiro de Emaús</title>
  <style>${printCSS}${extraCSS}</style>
</head>
<body>
  <div class="print-container">
    ${bodyHTML}
  </div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
</body>
</html>`;
}

/**
 * Abre una ventana de impresión con el HTML generado.
 * @param {string} html - Documento HTML completo
 */
export function openPrintWindow(html) {
  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(html);
  win.document.close();
}