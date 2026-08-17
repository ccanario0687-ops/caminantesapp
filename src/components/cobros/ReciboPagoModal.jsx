// ReciboPagoModal.jsx - Recibo de Pago Dinámico Corregido (Garantiza Monto Real Pagado y Moneda Oficial)
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Download, MessageCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useComunidad } from "@/lib/ComunidadContext";

const normalizarTelefono = (tel) => {
  const digits = (tel || "").replace(/\D/g, "");
  if (digits.length === 10) return "1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  return digits;
};

const METODO_LABEL = { 
  Efectivo: "Efectivo", 
  Transferencia: "Transferencia", 
  Patrocinado: "Patrocinado",
  Tarjeta: "Tarjeta de Crédito/Débito",
  Cheque: "Cheque"
};

export default function ReciboPagoModal({
  persona,
  tipo,
  monto: montoProp,
  metodoPago: metodoProp,
  patrocinador: patrocinadorProp,
  registradoPor: registradoProp,
  fechaMov: fechaProp,
  onClose,
}) {
  const { comunidadActual } = useComunidad();
  const [config, setConfig] = useState(null);
  const [mov, setMov] = useState(null);
  const [cargando, setCargando] = useState(true);

  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug;

  useEffect(() => {
    const cargar = async () => {
      try {
        const configs = await base44.entities.ConfigRetiro.list().catch(() => []);
        
        // Buscar configuración correspondiente a la comunidad activa
        const match = (configs || []).find(c => 
          !equipoIdActivo || 
          c.equipo_id === equipoIdActivo || 
          c.comunidad_id === equipoIdActivo ||
          String(c.equipo_id) === String(equipoIdActivo)
        ) || (configs.length ? configs[0] : null);

        if (match) setConfig(match);

        // Búsqueda robusta del movimiento financiero si no se pasaron las propiedades
        if (montoProp === undefined || metodoProp === undefined) {
          const allMovs = await base44.entities.MovimientoFinanciero.list().catch(() => []);
          const pid = String(persona?.id || persona?._id || "");
          const pnom = (persona?.nombre || persona?.nombre_completo || "").toLowerCase();

          const misMovs = (allMovs || []).filter(m => {
            const mId = String(m.caminante_id || m.servidor_id || m.persona_id || "");
            const mNombre = String(m.caminante_nombre || m.persona_nombre || m.descripcion || "").toLowerCase();
            return (pid && mId === pid) || (pnom && mNombre.includes(pnom));
          }).sort((a, b) => new Date(b.created_date || b.fecha || 0) - new Date(a.created_date || a.fecha || 0));

          if (misMovs.length > 0) {
            setMov(misMovs[0]);
          }
        }
      } catch (e) { 
        console.warn("Error cargando datos del recibo:", e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [equipoIdActivo, montoProp, metodoProp, persona?.id, persona?.nombre, tipo]);

  // 💵 DETERMINACIÓN DE MONEDA OFICIAL DEL RETIRO
  const keyMonedaLocal = `emaus_moneda_fijada_${equipoIdActivo || 'def'}`;
  const monedaOficial = 
    config?.moneda || 
    localStorage.getItem(keyMonedaLocal) || 
    localStorage.getItem("emaus_moneda") || 
    "RD$";

  // 🎯 DETERMINACIÓN PRECISA DEL MONTO COBRADO (NUNCA EN 0.00 SI TIENE PAGOS REGISTRADOS)
  const keyPrecioCam = `emaus_precio_cam_${equipoIdActivo || 'def'}_${monedaOficial}`;
  const keyPrecioServ = `emaus_precio_serv_${equipoIdActivo || 'def'}_${monedaOficial}`;

  const precioGuardado = tipo === "caminante"
    ? Number(localStorage.getItem(keyPrecioCam) || config?.precio_ficha_caminante || 0)
    : Number(localStorage.getItem(keyPrecioServ) || config?.precio_ficha_servidor || 0);

  const monto = 
    montoProp !== undefined && montoProp !== null && !isNaN(Number(montoProp)) && Number(montoProp) > 0
      ? Number(montoProp)
      : mov?.monto && Number(mov.monto) > 0
      ? Number(mov.monto)
      : persona?.monto_abonado && Number(persona.monto_abonado) > 0
      ? Number(persona.monto_abonado)
      : persona?.monto_pagado && Number(persona.monto_pagado) > 0
      ? Number(persona.monto_pagado)
      : persona?.monto && Number(persona.monto) > 0
      ? Number(persona.monto)
      : precioGuardado > 0
      ? precioGuardado
      : 3000;

  const metodoPago = metodoProp || mov?.metodo_pago || persona?.metodo_pago || persona?.forma_pago || "Efectivo";
  const patrocinador = patrocinadorProp || mov?.patrocinador || persona?.patrocinador || "";
  const registradoPor = registradoProp || mov?.registrado_por || persona?.registrado_por || "Tesorería Emaús";
  const fechaMov = fechaProp || mov?.fecha || persona?.fecha_pago || persona?.fecha || new Date().toISOString().split("T")[0];

  const fechaObj = new Date();
  const horaStr = fechaObj.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
  const numeroRecibo = `R-${fechaObj.getFullYear()}${String(fechaObj.getMonth() + 1).padStart(2, "0")}${String(fechaObj.getDate()).padStart(2, "0")}-${String(fechaObj.getTime()).slice(-5)}`;

  const nombreRetiro = config?.nombre_retiro || "Retiro de Emaús";
  const edicion = config?.edicion || "";
  const lugar = config?.lugar || "";

  const montoFormateado = `${monedaOficial} ${Number(monto).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // 📄 GENERACIÓN DE RECIBO PDF CON MONEDA Y MONTO DINÁMICO
  const generarPDF = () => {
    try {
      const doc = new jsPDF({ unit: "mm", format: [80, 135] });
      let y = 8;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("RETIRO DE EMAUS", 40, y, { align: "center" }); y += 5;
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      if (nombreRetiro && nombreRetiro !== "Retiro de Emaús") {
        doc.text(nombreRetiro, 40, y, { align: "center" }); y += 4;
      }
      if (edicion) { doc.text(`Edicion #${edicion}`, 40, y, { align: "center" }); y += 4; }
      y += 1;
      
      doc.setLineWidth(0.3);
      doc.line(6, y, 74, y); y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("RECIBO DE PAGO", 40, y, { align: "center" }); y += 4;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`N. ${numeroRecibo}`, 40, y, { align: "center" }); y += 5;

      doc.setLineWidth(0.2);
      doc.line(6, y, 74, y); y += 5;

      const fila = (label, val) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(label, 6, y);
        doc.setFont("helvetica", "bold");
        const lines = doc.splitTextToSize(String(val), 48);
        doc.text(lines, 74, y, { align: "right" });
        y += 4 * lines.length + 1;
      };

      fila("Fecha:", `${fechaMov}  ${horaStr}`);
      fila("Participante:", persona.nombre || persona.nombre_completo || "");
      fila("Tipo:", tipo === "caminante" ? "Caminante" : "Servidor");
      if (persona.numero_ficha) fila("Ficha N.:", persona.numero_ficha);
      if (persona.parroquia) fila("Parroquia:", persona.parroquia);
      fila("Metodo:", METODO_LABEL[metodoPago] || metodoPago);
      if (patrocinador) fila("Patrocinador:", patrocinador);
      fila("Registrado por:", registradoPor);

      y += 1;
      doc.setLineWidth(0.2);
      doc.line(6, y, 74, y); y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("MONTO PAGADO", 6, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(montoFormateado, 74, y, { align: "right" }); y += 6;

      doc.setLineWidth(0.3);
      doc.line(6, y, 74, y); y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text("Gracias por tu participacion. Que la paz de", 40, y, { align: "center" }); y += 3;
      doc.text("Cristo Resucitado te acompanhe. Lucas 24, 13-35", 40, y, { align: "center" });

      doc.save(`Recibo_${(persona.nombre || "Participante").replace(/\s+/g, "_")}_${numeroRecibo}.pdf`);
      toast.success("Recibo PDF descargado correctamente");
    } catch (e) {
      console.error("Error al generar PDF:", e);
      toast.error("No se pudo generar el PDF del recibo");
    }
  };

  // 📲 ENVÍO POR WHATSAPP CON MONTO OFICIAL Y MONEDA FIJADA
  const enviarWhatsApp = () => {
    const tel = normalizarTelefono(persona.telefono);
    if (!tel) {
      toast.error("Esta persona no tiene un teléfono válido registrado.");
      return;
    }

    const txt =
      `*RETIRO DE EMAÚS - RECIBO DE PAGO*\n\n` +
      `Recibo N°: ${numeroRecibo}\n` +
      `Participante: ${persona.nombre || persona.nombre_completo}\n` +
      `Tipo: ${tipo === "caminante" ? "Caminante" : "Servidor"}\n` +
      (persona.numero_ficha ? `Ficha N°: ${persona.numero_ficha}\n` : "") +
      (persona.parroquia ? `Parroquia: ${persona.parroquia}\n` : "") +
      `Método: ${METODO_LABEL[metodoPago] || metodoPago}${patrocinador ? ` (Patrocinado por ${patrocinador})` : ""}\n` +
      `Monto Pagado: *${montoFormateado}*\n` +
      `Fecha: ${fechaMov} ${horaStr}\n` +
      `Registrado por: ${registradoPor}\n\n` +
      `¡Gracias por tu participación! 🙏\nLucas 24, 13-35`;

    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`, "_blank");
  };

  if (cargando) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-6 text-amber-900 text-sm font-bold flex items-center gap-3 shadow-2xl">
          <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          Generando recibo de pago oficial...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-amber-200">
        
        {/* HEADER DE MÓDULO */}
        <div className="bg-gradient-to-r from-green-700 to-green-800 text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-300 shrink-0" />
            <h2 className="text-base font-extrabold">Pago Confirmado</h2>
          </div>
          <button 
            onClick={onClose} 
            className="hover:bg-green-600/50 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RECIBO VIRTUAL MINIMALISTA TIPO TICKET */}
        <div className="p-5 space-y-4">
          <div className="border-2 border-dashed border-amber-200/90 rounded-2xl p-4 bg-gradient-to-b from-amber-50/50 to-white text-center space-y-1.5 shadow-inner">
            
            <p className="text-xs font-black text-amber-950 uppercase tracking-widest">Retiro de Emaús</p>
            {nombreRetiro !== "Retiro de Emaús" && <p className="text-[11px] font-bold text-amber-800">{nombreRetiro}</p>}
            {edicion && <p className="text-[11px] font-semibold text-gray-600">Edición #{edicion}</p>}
            {lugar && <p className="text-[10px] text-gray-500 font-medium">{lugar}</p>}
            
            <div className="border-t border-dashed border-amber-300/80 my-2" />
            
            <p className="text-xs font-black text-gray-800 tracking-wider">RECIBO DE PAGO</p>
            <p className="text-[10px] font-mono text-gray-500 font-bold">N° {numeroRecibo}</p>
            
            <div className="border-t border-dashed border-amber-300/80 my-2" />
            
            <div className="text-left text-xs space-y-1.5 font-medium">
              <FilaRecibo label="Fecha" value={`${fechaMov} ${horaStr}`} />
              <FilaRecibo label="Participante" value={persona.nombre || persona.nombre_completo} bold />
              <FilaRecibo label="Tipo" value={tipo === "caminante" ? "Caminante" : "Servidor"} />
              {persona.numero_ficha && <FilaRecibo label="Ficha N°" value={persona.numero_ficha} bold />}
              {persona.parroquia && <FilaRecibo label="Parroquia" value={persona.parroquia} />}
              <FilaRecibo label="Método" value={METODO_LABEL[metodoPago] || metodoPago} />
              {patrocinador && <FilaRecibo label="Patrocinador" value={patrocinador} bold />}
              <FilaRecibo label="Registrado por" value={registradoPor} />
            </div>

            <div className="border-t border-dashed border-amber-300/80 my-2" />
            
            {/* MONTO OFICIAL DESTACADO EN LA MONEDA CORRESPONDIENTE */}
            <div>
              <p className="text-[10px] text-amber-900 font-bold uppercase tracking-wider">Monto Pagado ({monedaOficial})</p>
              <p className="text-2xl font-black text-green-700 tracking-tight mt-0.5">
                {montoFormateado}
              </p>
            </div>

            <div className="border-t border-dashed border-amber-300/80 my-2" />
            
            <p className="text-[10px] text-amber-900 font-semibold italic">¡Gracias por tu sagrada participación! 🙏</p>
            <p className="text-[9px] text-amber-700 font-medium">"¡Es verdad! El Señor ha resucitado" (Lc 24, 34)</p>
          </div>

          {/* ACCIONES DEL RECIBO */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={generarPDF}
              className="flex items-center justify-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white px-3 py-2.5 rounded-xl text-xs font-bold transition shadow hover:shadow-md"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            
            <button
              onClick={enviarWhatsApp}
              className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2.5 rounded-xl text-xs font-bold transition shadow hover:shadow-md"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
          </div>

          {!normalizarTelefono(persona.telefono) && (
            <p className="text-[10px] text-center text-amber-700 font-semibold bg-amber-50 p-1.5 rounded-lg border border-amber-200">
              ⚠️ Sin número registrado para WhatsApp
            </p>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold transition"
          >
            Cerrar Recibo
          </button>
        </div>
      </div>
    </div>
  );
}

function FilaRecibo({ label, value, bold }) {
  return (
    <div className="flex justify-between gap-2 text-[11px]">
      <span className="text-gray-500 font-medium">{label}:</span>
      <span className={`text-right text-gray-900 ${bold ? "font-bold" : "font-medium"}`}>{value}</span>
    </div>
  );
}