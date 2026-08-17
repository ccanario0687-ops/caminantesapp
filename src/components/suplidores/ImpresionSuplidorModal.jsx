import { X, Printer } from "lucide-react";

export default function ImpresionSuplidorModal({ suplidor, onClose }) {
  const handlePrint = () => {
    const win = window.open("", "_blank", "width=800,height=600");
    const content = `
      <!DOCTYPE html>
      <html><head>
        <meta charset="UTF-8"/>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          body { margin: 0; font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #78350f; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: white; padding: 20px; border: 1px solid #fde68a; border-radius: 8px; }
          .row { margin-bottom: 15px; }
          .label { font-weight: bold; color: #78350f; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
          .value { color: #1c1917; font-size: 14px; }
          .divider { border-top: 1px dashed #fde68a; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✝️ Retiro de Emaús</h1>
            <p style="margin: 5px 0; font-size: 12px;">Directorio de Suplidores</p>
          </div>
          <div class="content">
            <div class="row">
              <div class="label">Empresa</div>
              <div class="value">${suplidor.nombre}</div>
            </div>
            <div class="row">
              <div class="label">Contacto</div>
              <div class="value">${suplidor.contacto || "-"}</div>
            </div>
            <div class="row">
              <div class="label">Teléfono</div>
              <div class="value">${suplidor.telefono || "-"}</div>
            </div>
            <div class="row">
              <div class="label">Email</div>
              <div class="value">${suplidor.email || "-"}</div>
            </div>
            <div class="row">
              <div class="label">Provincia</div>
              <div class="value">${suplidor.provincia || "-"}</div>
            </div>
            <div class="row">
              <div class="label">Dirección</div>
              <div class="value">${suplidor.direccion || "-"}</div>
            </div>
            <div class="divider"></div>
            <div class="row">
              <div class="label">Producto/Servicio</div>
              <div class="value">${suplidor.producto_servicio || "-"}</div>
            </div>
            ${suplidor.notas ? `
              <div class="row">
                <div class="label">Notas</div>
                <div class="value">${suplidor.notas}</div>
              </div>
            ` : ""}
            <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #92400e;">
              <p>Impreso: ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
          </div>
        </div>
      </body></html>
    `;
    win.document.write(content);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-bold">Imprimir Suplidor</h2>
              <p className="text-amber-200 text-xs">{suplidor.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4">¿Deseas imprimir la ficha de este suplidor?</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
              Cancelar
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}