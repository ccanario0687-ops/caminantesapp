// Finanzas.jsx - Versión Completa Multimoneda con Fijación Única de Moneda Activa y Visión Global
import { useEffect, useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { printHeaderHTML, printFooterHTML, buildPrintDoc, openPrintWindow } from "@/lib/printStyles";
import SelectorComunidad from "@/components/SelectorComunidad";
import { useComunidad } from "@/lib/ComunidadContext";
import {
  DollarSign, Settings, CreditCard, PlusCircle, TrendingUp, TrendingDown,
  UserCheck, Users, Printer, Search, Filter,
  AlertTriangle, CheckCircle2, XCircle, MessageCircle, FileText,
  BarChart3, PieChart as PieChartIcon, Trash2, Edit3, Lock,
  Wallet, Building2, ArrowUpDown, RefreshCw, Shield, X, Info, Archive, RotateCcw
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import useOffline from "@/hooks/useOffline";

const APP_CREATOR_EMAIL = "ccanario0687@gmail.com";

const fmt = (n) => (Number(n) || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parsearNumeroRetiro = (val, fallback = 1) => {
  if (typeof val === "number" && !isNaN(val) && val > 0) return val;
  if (!val) return fallback;
  const num = parseInt(String(val).replace(/\D/g, ""), 10);
  return isNaN(num) || num <= 0 ? fallback : num;
};

const CATEGORIAS_GASTO = [
  { value: "alimentacion", label: "🍽️ Alimentación", color: "orange", emoji: "🍽️" },
  { value: "transporte", label: "🚌 Transporte", color: "blue", emoji: "🚌" },
  { value: "hospedaje", label: "🏨 Hospedaje", color: "purple", emoji: "🏨" },
  { value: "materiales", label: "📄 Materiales", color: "gray", emoji: "📄" },
  { value: "liturgia", label: "⛪ Liturgia", color: "amber", emoji: "⛪" },
  { value: "medicamentos", label: "⚕️ Primeros Auxilios", color: "red", emoji: "⚕️" },
  { value: "varios", label: "🔧 Varios", color: "slate", emoji: "🔧" },
];

const METODOS_PAGO = [
  { value: "Efectivo", label: "💵 Efectivo", color: "green" },
  { value: "Transferencia", label: "🏦 Transferencia", color: "blue" },
  { value: "Tarjeta", label: "💳 Tarjeta", color: "purple" },
  { value: "Patrocinado", label: "🤝 Patrocinado", color: "amber" },
];

const TIPOS_MOVIMIENTO = [
  { value: "cuota_caminante", label: "Aporte Caminante", tipo: "ingreso" },
  { value: "cuota_servidor", label: "Aporte Servidor", tipo: "ingreso" },
  { value: "donacion", label: "Donación", tipo: "ingreso" },
  { value: "ingreso", label: "Ingreso Varios", tipo: "ingreso" },
  { value: "abono", label: "Abono Parcial", tipo: "ingreso" },
  { value: "gasto", label: "Gasto", tipo: "gasto" },
];

function useAuditLog(currentUser, equipoIdActivo) {
  const registrar = useCallback(async (accion, detalles) => {
    try {
      const registro = {
        accion,
        detalles: typeof detalles === "string" ? detalles : JSON.stringify(detalles),
        usuario: currentUser?.nombre || currentUser?.email || "Sistema",
        usuario_id: currentUser?.id || "",
        equipo_id: equipoIdActivo || "",
        comunidad_id: equipoIdActivo || "",
        fecha: new Date().toISOString(),
      };

      // 1. Guardado inmediato en localStorage como respaldo local redundante
      try {
        const local = JSON.parse(localStorage.getItem("emaus_auditoria_finanzas") || "[]");
        localStorage.setItem("emaus_auditoria_finanzas", JSON.stringify([registro, ...local]));
      } catch (e) {}

      // 2. Guardado oficial en Base44
      if (base44.entities.AuditoriaFinanza?.create) {
        await base44.entities.AuditoriaFinanza.create(registro).catch(() => null);
      }
    } catch (e) {
      console.warn("No se pudo registrar auditoría:", e);
    }
  }, [currentUser, equipoIdActivo]);

  return { registrar };
}

function Toast({ mensaje, tipo = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const estilos = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    warning: "bg-amber-500 text-white",
    info: "bg-blue-600 text-white",
  };
  const Icon = tipo === "success" ? CheckCircle2 : tipo === "error" ? XCircle : tipo === "warning" ? AlertTriangle : Info;

  return (
    <div className={`fixed top-4 right-4 z-[9999] ${estilos[tipo]} shadow-2xl rounded-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-right min-w-[280px]`}>
      <Icon className="w-5 h-5 shrink-0" />
      <p className="text-sm font-medium flex-1">{mensaje}</p>
      <button onClick={onClose} className="hover:bg-white/20 rounded p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ConfirmModal({ abierto, titulo, mensaje, onConfirm, onCancel, confirmText = "Confirmar", danger = false }) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${danger ? "bg-red-100" : "bg-amber-100"}`}>
            {danger ? <AlertTriangle className="w-6 h-6 text-red-600" /> : <Info className="w-6 h-6 text-amber-600" />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{titulo}</h3>
            <p className="text-sm text-gray-600 mt-2">{mensaje}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-6 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancelar</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${danger ? "bg-red-600 hover:bg-red-700" : "bg-amber-700 hover:bg-amber-800"}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputMoneda({ value, onChange, placeholder = "0.00", error, label, moneda = "RD$" }) {
  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    onChange(raw);
  };
  return (
    <div>
      {label && <label className="text-xs font-medium text-gray-700 mb-1 block">{label}</label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">{moneda}</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full pl-12 pr-3 py-2 border rounded-lg text-sm font-semibold ${
            error ? "border-red-500 bg-red-50" : "border-gray-300 focus:border-amber-500"
          } focus:outline-none focus:ring-2 focus:ring-amber-200`}
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function Badge({ children, color = "gray", size = "sm" }) {
  const colors = {
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
  };
  const sizes = { xs: "text-[9px] px-1 py-0", sm: "text-[10px] px-1.5 py-0.5", md: "text-xs px-2 py-1" };
  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${colors[color]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

function TarjetaKPI({ titulo, valor, icono: Icon, color, subtitulo, onClick }) {
  const colors = {
    green: "from-green-500 to-green-600",
    red: "from-red-500 to-red-600",
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    purple: "from-purple-500 to-purple-600",
  };
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${colors[color]} rounded-xl p-3 text-white shadow-lg ${onClick ? "cursor-pointer hover:scale-105 transition-transform" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium opacity-90">{titulo}</p>
          <p className="text-xl font-bold mt-0.5 truncate">{valor}</p>
          {subtitulo && <p className="text-[10px] opacity-80 mt-0.5">{subtitulo}</p>}
        </div>
        <Icon className="w-6 h-6 opacity-80 shrink-0 ml-2" />
      </div>
    </div>
  );
}

function ModalTransaccionesEliminadas({ abierto, onClose, coincideComunidad, monedaActiva = "RD$" }) {
  const [eliminadas, setEliminadas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (abierto) {
      setLoading(true);
      
      const cargarEliminadas = async () => {
        let baseLogs = [];
        try {
          if (base44.entities.AuditoriaFinanza?.list) {
            baseLogs = (await base44.entities.AuditoriaFinanza.list()) || [];
          }
        } catch (e) {}

        let localLogs = [];
        try {
          localLogs = JSON.parse(localStorage.getItem("emaus_auditoria_finanzas") || "[]");
        } catch (e) {}

        const combinados = [...(baseLogs || []), ...(localLogs || [])];
        const unicosMap = new Map();
        combinados.forEach(item => {
          if (item && item.accion) {
            const strDet = typeof item.detalles === "object" ? JSON.stringify(item.detalles) : String(item.detalles || "");
            const key = `${item.fecha || ""}_${item.accion}_${strDet}`;
            if (!unicosMap.has(key)) unicosMap.set(key, item);
          }
        });

        const bdEliminadas = Array.from(unicosMap.values()).filter(r => {
          const isEliminar = r.accion === "eliminar_movimiento";
          const matchEquipo = coincideComunidad(r);
          return isEliminar && matchEquipo;
        }).map(r => {
          try {
            let detalles = typeof r.detalles === "string" ? JSON.parse(r.detalles) : r.detalles || {};
            return {
              ...detalles,
              id: r.id || detalles.movimiento_original_id || detalles.id,
              eliminado_por: r.usuario || detalles.eliminado_por || detalles.registrado_por || "Sistema",
              fecha_eliminacion: r.fecha || detalles.fecha_eliminacion || r.created_date,
            };
          } catch (err) {
            return null;
          }
        }).filter(Boolean);

        setEliminadas(bdEliminadas);
        setLoading(false);
      };

      cargarEliminadas();
    }
  }, [abierto, coincideComunidad]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            <h3 className="text-base font-bold">Transacciones Eliminadas</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-red-50">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <p className="font-medium">Registro permanente de transacciones eliminadas (Solo Lectura / Auditoría).</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-3"></div>
              <p className="text-gray-600">Cargando transacciones eliminadas...</p>
            </div>
          ) : eliminadas.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg font-medium">No hay transacciones eliminadas registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eliminadas.map((mov, i) => (
                <div key={mov.id || i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge color={mov.tipo === "gasto" ? "red" : "green"} size="sm">
                          {mov.tipo?.replace("_", " ").toUpperCase() || "ELIMINADO"}
                        </Badge>
                        {mov.caminante_nombre && (
                          <span className="text-xs text-gray-600">• {mov.caminante_nombre}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mt-1">
                        {mov.descripcion || "Sin descripción"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${mov.tipo === "gasto" ? "text-red-600" : "text-green-600"}`}>
                        {mov.moneda || monedaActiva} {fmt(mov.monto)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                    <div><span className="text-gray-500">Categoría:</span><p className="font-medium text-gray-700">{mov.categoria || "—"}</p></div>
                    <div><span className="text-gray-500">Método:</span><p className="font-medium text-gray-700">{mov.metodo_pago || "—"}</p></div>
                    <div><span className="text-gray-500">Caja:</span><p className="font-medium text-gray-700">{mov.caja_nombre || "Sin asignar"}</p></div>
                    <div><span className="text-gray-500">Fecha Original:</span><p className="font-medium text-gray-700">{mov.fecha_original ? new Date(mov.fecha_original).toLocaleDateString("es-DO") : "—"}</p></div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </div>
                      <div>
                        <p className="text-gray-500">Eliminado por:</p>
                        <p className="font-semibold text-gray-800">{mov.eliminado_por || "Sistema"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500">Fecha de eliminación:</p>
                      <p className="font-semibold text-red-600">{mov.fecha_eliminacion ? new Date(mov.fecha_eliminacion).toLocaleString("es-DO") : "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-500">Total: <span className="font-bold text-gray-700">{eliminadas.length}</span> transacción(es) archivada(s)</p>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export function imprimirReciboPago({
  personaNombre,
  tipoPersona,
  montoCobrado,
  nuevoAbono,
  montoTotal,
  saldoRestante,
  metodoPago,
  patrocinador,
  cajaNombre,
  configRetiro,
  moneda = "RD$",
  registradoPor = "Tesorería Emaús"
}) {
  const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const body = `
    ${printHeaderHTML({
      titulo: `RECIBO DE PAGO — ${tipoPersona.toUpperCase()}`,
      subtitulo: `${configRetiro?.nombre_retiro || "Retiro de Emaús"} · Edición #${configRetiro?.edicion || 1}`,
      extraInfo: `Fecha: ${new Date().toLocaleDateString("es-ES")}`
    })}
    
    <div style="border:2px solid #b45309; background:#fffbeb; padding:16px; border-radius:12px; margin-top:12px;">
      <h2 style="margin:0 0 12px 0; color:#78350f; font-size:16px; border-bottom:2px solid #fde68a; padding-bottom:6px; font-weight:bold;">
        📄 COMPROBANTE DE PAGO EN MONEDA OFICIAL (${moneda})
      </h2>
      <table style="width:100%; font-size:12px; border-collapse:collapse; line-height:1.6;">
        <tr>
          <td style="padding:4px 0; color:#92400e; font-weight:bold; width:40%;">Participante / Recibido de:</td>
          <td style="padding:4px 0; font-weight:extrabold; color:#1e293b; font-size:13px;">${escHtml(personaNombre)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#92400e; font-weight:bold;">Tipo de Ficha:</td>
          <td style="padding:4px 0; color:#334155; font-weight:bold;">${tipoPersona}</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#92400e; font-weight:bold;">Monto Cobrado Hoy:</td>
          <td style="padding:4px 0; font-size:18px; font-weight:900; color:#15803d;">${moneda} ${fmt(montoCobrado)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#92400e; font-weight:bold;">Total Acumulado Abonado:</td>
          <td style="padding:4px 0; font-weight:bold; color:#0369a1;">${moneda} ${fmt(nuevoAbono)} de ${moneda} ${fmt(montoTotal)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#92400e; font-weight:bold;">Estado / Saldo Pendiente:</td>
          <td style="padding:4px 0; font-weight:extrabold; color:${saldoRestante > 0 ? '#b91c1c' : '#15803d'};">
            ${saldoRestante > 0 ? `${moneda} ${fmt(saldoRestante)} (PENDIENTE)` : '✅ PAGO COMPLETO (PAGADO Y CONFIRMADO)'}
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0; color:#92400e; font-weight:bold;">Método de Pago:</td>
          <td style="padding:4px 0; color:#334155;">${escHtml(metodoPago)}${patrocinador ? ` (Patrocinador: ${escHtml(patrocinador)})` : ''}</td>
        </tr>
        ${cajaNombre ? `<tr>
          <td style="padding:4px 0; color:#92400e; font-weight:bold;">Caja Destino:</td>
          <td style="padding:4px 0; color:#334155;">${escHtml(cajaNombre)}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:4px 0; color:#92400e; font-weight:bold;">Registrado por:</td>
          <td style="padding:4px 0; color:#334155;">${escHtml(registradoPor)}</td>
        </tr>
      </table>
    </div>

    <div style="margin-top:40px; display:flex; justify-content:space-between; text-align:center; font-size:11px; color:#475569;">
      <div style="width:40%; border-top:1.5px solid #94a3b8; padding-top:6px; font-weight:bold;">Firma del Participante</div>
      <div style="width:40%; border-top:1.5px solid #94a3b8; padding-top:6px; font-weight:bold;">Sello / Tesorería Emaús</div>
    </div>
    
    ${printFooterHTML()}
  `;

  openPrintWindow(buildPrintDoc(`Recibo de Pago (${moneda})`, body));
}

function imprimirEstadoCuenta(movimientos, configRetiro, numeroRetiro, cuentaPorCobrar, nombreComunidad, monedaActiva = "RD$") {
  const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const tipoLabel = {
    cuota_caminante: "Aporte Caminante",
    cuota_servidor: "Aporte Servidor",
    donacion: "Donación",
    ingreso: "Ingreso",
    abono: "Abono Parcial",
    gasto: "Gasto",
  };

  let totalCobrado = 0, totalPatrocinado = 0, totalIngresos = 0, totalGastos = 0;
  movimientos.forEach(m => {
    const monto = Number(m.monto) || 0;
    if (m.tipo === "gasto") totalGastos += monto;
    else if ((m.tipo === "cuota_caminante" || m.tipo === "cuota_servidor" || m.tipo === "abono") && m.metodo_pago === "Patrocinado") {
      totalPatrocinado += monto;
      totalIngresos += monto;
    } else {
      if (m.tipo === "cuota_caminante" || m.tipo === "cuota_servidor" || m.tipo === "abono") totalCobrado += monto;
      totalIngresos += monto;
    }
  });
  const balance = totalIngresos - totalGastos;

  const movOrdenados = [...movimientos].sort((a, b) => {
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return new Date(a.fecha) - new Date(b.fecha);
  });

  let saldo = 0;
  const filas = movOrdenados.map(m => {
    const esGasto = m.tipo === "gasto";
    const monto = Number(m.monto) || 0;
    const mon = m.moneda || monedaActiva;
    saldo += esGasto ? -monto : monto;
    const tipoBadgeClass = esGasto ? "badge-danger" : m.tipo === "cuota_caminante" ? "badge-success" : m.tipo === "cuota_servidor" ? "badge-info" : "badge-warning";
    let descripcion = m.descripcion || tipoLabel[m.tipo] || m.tipo;
    if (m.caminante_nombre) {
      if (m.tipo === "cuota_caminante" || m.tipo === "abono") descripcion = `CC ${m.caminante_nombre}`;
      if (m.tipo === "cuota_servidor") descripcion = `CS ${m.caminante_nombre}`;
    }
    const metodoBadge = m.metodo_pago
      ? ` <span class="badge ${m.metodo_pago === "Patrocinado" ? "badge-info" : "badge-warning"}" style="font-size:7px">${m.metodo_pago}${m.patrocinador ? `: ${escHtml(m.patrocinador)}` : ""}</span>`
      : "";
    return `<tr>
      <td class="text-muted" style="white-space:nowrap;padding:2px 4px">${m.fecha || "—"}</td>
      <td style="padding:2px 4px">${descripcion}${metodoBadge}</td>
      <td class="text-center" style="padding:2px 4px"><span class="badge ${tipoBadgeClass}">${tipoLabel[m.tipo] || m.tipo}</span></td>
      <td class="text-muted" style="font-size:8px;white-space:nowrap;padding:2px 4px">${m.registrado_por || "—"}</td>
      <td class="text-right ${esGasto ? 'text-danger' : 'text-muted'}" style="padding:2px 4px">${esGasto ? `${mon} ${fmt(monto)}` : "—"}</td>
      <td class="text-right ${!esGasto ? 'text-success' : 'text-muted'}" style="padding:2px 4px">${!esGasto ? `${mon} ${fmt(monto)}` : "—"}</td>
      <td class="text-right font-semibold" style="padding:2px 4px">${mon} ${fmt(saldo)}</td>
    </tr>`;
  }).join("");

  const cxcHTML = cuentaPorCobrar ? `
    <div class="summary-card" style="border:1px solid #fca5a5;background:#fef2f2;padding:6px 10px">
      <p class="label" style="margin:0;font-size:9px">Cuenta por Cobrar</p>
      <p class="value danger" style="margin:2px 0 0 0;font-size:14px">${monedaActiva} ${fmt(cuentaPorCobrar.total)}</p>
      <p class="text-muted" style="font-size:8px;margin-top:2px">Caminantes: ${cuentaPorCobrar.camsPendientes} (${monedaActiva} ${fmt(cuentaPorCobrar.montoCams)}) · Servidores: ${cuentaPorCobrar.servsPendientes} (${monedaActiva} ${fmt(cuentaPorCobrar.montoServs)})</p>
    </div>` : "";

  const summaryHTML = `
    <div class="summary-grid" style="gap:6px">
      <div class="summary-card" style="padding:6px 10px"><p class="label" style="margin:0;font-size:9px">Total Cobrado</p><p class="value success" style="margin:2px 0 0 0;font-size:14px">${monedaActiva} ${fmt(totalCobrado)}</p></div>
      <div class="summary-card" style="border:1px solid #c4b5fd;background:#f5f3ff;padding:6px 10px"><p class="label" style="margin:0;font-size:9px">Total Patrocinado</p><p class="value" style="margin:2px 0 0 0;color:#6d28d9;font-size:14px">${monedaActiva} ${fmt(totalPatrocinado)}</p></div>
      <div class="summary-card" style="border:1px solid #fca5a5;background:#fef2f2;padding:6px 10px"><p class="label" style="margin:0;font-size:9px">Total Gastos</p><p class="value danger" style="margin:2px 0 0 0;font-size:14px">${monedaActiva} ${fmt(totalGastos)}</p></div>
      <div class="summary-card" style="border:1px solid #fcd34d;background:#fffbeb;padding:6px 10px"><p class="label" style="margin:0;font-size:9px">Balance</p><p class="value" style="margin:2px 0 0 0;font-size:14px">${monedaActiva} ${fmt(balance)}</p></div>
      ${cxcHTML}
    </div>`;

  const body = `
    ${printHeaderHTML({
      titulo: `Estado de Cuenta (${monedaActiva})`,
      subtitulo: `${configRetiro?.nombre_retiro || ""} · Comunidad: ${nombreComunidad || "General"}`,
      total: movimientos.length,
      extraInfo: numeroRetiro ? `Retiro #${numeroRetiro}` : undefined
    })}
    ${summaryHTML}
    <p class="section-title" style="margin:6px 0 3px 0">Transacciones</p>
    ${movOrdenados.length === 0 ? `<p style="text-align:center;color:#9ca3af;padding:10px">No hay movimientos en ${monedaActiva}</p>` : `
    <table class="print-table" style="font-size:8px;line-height:1.1">
      <thead><tr>
        <th style="padding:3px 4px">Fecha</th><th style="padding:3px 4px">Descripción</th><th class="text-center" style="padding:3px 4px">Tipo</th>
        <th style="padding:3px 4px">Registrado por</th><th class="text-right" style="padding:3px 4px">Débito</th><th class="text-right" style="padding:3px 4px">Crédito</th><th class="text-right" style="padding:3px 4px">Balance</th>
      </tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr class="font-semibold" style="border-top:2px solid #1a1a2e;background:#f9fafb">
        <td colspan="4" style="padding:3px 4px">BALANCE FINAL (${monedaActiva})</td>
        <td class="text-right text-danger" style="padding:3px 4px">${monedaActiva} ${fmt(totalGastos)}</td>
        <td class="text-right text-success" style="padding:3px 4px">${monedaActiva} ${fmt(totalIngresos)}</td>
        <td class="text-right font-semibold" style="padding:3px 4px">${monedaActiva} ${fmt(balance)}</td>
      </tr></tfoot>
    </table>`}
    ${printFooterHTML()}`;

  openPrintWindow(buildPrintDoc("Estado de Cuenta", body, `
    .section-title { font-size:10px; font-weight:700; color:#374151; margin:6px 0 3px 0; }
    .print-table td, .print-table th { padding: 2px 4px !important; line-height: 1.1 !important; }
  `));
}

function imprimirEstadoCuentaCobrar({ lista, filtro, configRetiro, precioCaminante, precioServidor, nombreComunidad, monedaActiva = "RD$" }) {
  const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const total = lista.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

  const filas = lista.map((p, i) => `
    <tr>
      <td class="text-muted" style="white-space:nowrap;padding:2px 4px">${i + 1}</td>
      <td style="font-weight:600;padding:2px 4px">${escHtml(p.nombre || "—")}</td>
      <td class="text-center" style="padding:2px 4px"><span class="badge ${p.tipo === "caminante" ? "badge-success" : "badge-info"}">${p.tipo === "caminante" ? "Caminante" : "Servidor"}</span></td>
      <td class="text-muted" style="padding:2px 4px">${escHtml(p.telefono || "—")}</td>
      <td class="text-right font-semibold text-danger" style="padding:2px 4px">${monedaActiva} ${fmt(p.monto)}</td>
    </tr>`).join("");

  const body = `
    ${printHeaderHTML({ titulo: `Cuentas por Cobrar (${monedaActiva})`, subtitulo: `${configRetiro?.nombre_retiro || ""} · Comunidad: ${nombreComunidad || "General"}`, total: lista.length })}
    <p class="section-title" style="margin:6px 0 3px 0">Total: ${monedaActiva} ${fmt(total)}</p>
    ${lista.length === 0 ? `<p style="text-align:center;color:#9ca3af;padding:10px">No hay cuentas pendientes</p>` : `
    <table class="print-table" style="font-size:8px;line-height:1.1">
      <thead><tr>
        <th style="width:25px;padding:3px 4px">#</th>
        <th style="padding:3px 4px">Nombre</th>
        <th class="text-center" style="padding:3px 4px">Tipo</th>
        <th style="padding:3px 4px">Teléfono</th>
        <th class="text-right" style="padding:3px 4px">Monto</th>
      </tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr class="font-semibold" style="border-top:2px solid #1a1a2e;background:#f9fafb">
        <td colspan="4" style="padding:3px 4px">TOTAL POR COBRAR</td>
        <td class="text-right text-danger" style="padding:3px 4px">${monedaActiva} ${fmt(total)}</td>
      </tr></tfoot>
    </table>`}
    ${printFooterHTML()}`;

  openPrintWindow(buildPrintDoc("Cuentas por Cobrar", body, `
    .section-title { font-size:10px; font-weight:700; color:#374151; margin:6px 0 3px 0; }
    .print-table td, .print-table th { padding: 2px 4px !important; }
  `));
}

export default function Finanzas() {
  const { user: currentUser } = useAuth();
  const { comunidadActual } = useComunidad();
  
  // 👑 Verificación exclusiva de Creador Global
  const esCreadorReal = Boolean(
    currentUser?.email === APP_CREATOR_EMAIL || 
    currentUser?.es_creador === true
  );

  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    (!esCreadorReal ? currentUser?.equipo_id : null);

  const { registrar: registrarAuditoria } = useAuditLog(currentUser, equipoIdActivo);

  const [moneda, setMoneda] = useState(() => localStorage.getItem("emaus_moneda") || "RD$");

  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [configRetiro, setConfigRetiro] = useState(null);
  const [caminantes, setCaminantes] = useState([]);
  const [servidores, setServidores] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const [filtroRetiro, setFiltroRetiro] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [filtroTipoMov, setFiltroTipoMov] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroCxC, setFiltroCxC] = useState("todos");

  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarCobroCaminante, setMostrarCobroCaminante] = useState(false);
  const [mostrarCobroServidor, setMostrarCobroServidor] = useState(false);
  const [mostrarMovimiento, setMostrarMovimiento] = useState(false);
  const [movimientoEditar, setMovimientoEditar] = useState(null);
  const [movimientoReversar, setMovimientoReversar] = useState(null);
  const [mostrarCaja, setMostrarCaja] = useState(false);
  const [mostrarEliminadas, setMostrarEliminadas] = useState(false);

  const { records: todosMovimientos, loading: loadingMovs, reload } = useOffline("MovimientoFinanciero");

  // 🔒 CORRECCIÓN CLAVE: Función de coincidencia multi-tenant con soporte completo para "GLOBAL"
  const coincideComunidad = useCallback((item) => {
    if (!item) return false;
    if (esCreadorReal && (!comunidadActual || comunidadActual.id === "GLOBAL" || comunidadActual.id === "global" || comunidadActual.slug === "global")) {
      return true;
    }

    const idActivo = comunidadActual?.equipo_id || comunidadActual?.id || (!esCreadorReal ? currentUser?.equipo_id : null);
    const slugActivo = comunidadActual?.slug;
    const nombreActivo = comunidadActual?.nombre || comunidadActual?.nombre_equipo;

    if (!idActivo && !slugActivo && esCreadorReal) return true;

    const idReg = String(item.equipo_id || item.comunidad_id || item.id_equipo || "");
    const slugReg = String(item.slug || item.retiro_id || "");
    const nombreReg = String(item.nombre_equipo || item.comunidad || "");

    const strIdActivo = String(idActivo || "");
    const strSlugActivo = String(slugActivo || "");
    const strNombreActivo = String(nombreActivo || "");

    if (strIdActivo && idReg && idReg === strIdActivo) return true;
    if (strSlugActivo && slugReg && slugReg === strSlugActivo) return true;
    if (strNombreActivo && nombreReg && nombreReg.toLowerCase() === strNombreActivo.toLowerCase()) return true;

    // 🔒 IMPORTANTE: Si el registro no tiene comunidad especificada (registros locales o compartidos), incluirlo
    const sinComunidad = !idReg && !slugReg && !nombreReg;
    if (sinComunidad) return true;

    return false;
  }, [comunidadActual, currentUser, esCreadorReal]);

  useEffect(() => {
    if (configRetiro?.moneda) {
      setMoneda(configRetiro.moneda);
      localStorage.setItem("emaus_moneda", configRetiro.moneda);
    }
  }, [configRetiro]);

  const movimientos = useMemo(() => {
    return (todosMovimientos || []).filter(coincideComunidad);
  }, [todosMovimientos, coincideComunidad]);

  const recargarConfig = useCallback(async () => {
    try {
      const cfgs = await (base44.entities.ConfigFinanza?.list?.() || Promise.resolve([]));
      const miConfig = (cfgs || []).find(coincideComunidad) || cfgs[0] || null;
      if (miConfig) {
        setConfig(miConfig);
        setConfigId(miConfig.id);
      }
    } catch (e) {
      console.warn("Error recargando configuración:", e);
    }
  }, [coincideComunidad]);

  // 🛠️ CARGA COMPLETA MULTI-TABLA Y LOCAL DE CAMINANTES
  const obtenerTodosCaminantes = useCallback(async () => {
    try {
      const [c1, rRemotas] = await Promise.all([
        base44.entities.Caminante?.list?.().catch(() => []) || Promise.resolve([]),
        base44.entities.InscripcionRemota?.list?.().catch(() => []) || Promise.resolve([]),
      ]);

      let localCams = [];
      try {
        localCams = JSON.parse(localStorage.getItem("emaus_caminantes") || "[]");
      } catch {}

      let acumulados = [];
      if (Array.isArray(c1)) acumulados.push(...c1);

      if (Array.isArray(rRemotas)) {
        const soloCaminantesRemotos = rRemotas.filter(c => {
          const est = String(c.estado || "").toLowerCase();
          const esAprobado = est === "aprobado" || est === "confirmado" || est === "pendiente";
          const tipoStr = String(c.tipo || c.tipo_inscripcion || c.tipo_registro || "").toLowerCase();
          const esCam = !tipoStr.includes("servid") && c.es_servidor !== true;
          return esAprobado && esCam;
        });
        acumulados.push(...soloCaminantesRemotos);
      }

      if (Array.isArray(localCams)) acumulados.push(...localCams);

      const mapaUnicos = new Map();
      acumulados.forEach(c => {
        if (!c) return;
        const cleanCed = c.cedula ? String(c.cedula).replace(/\D/g, "") : "";
        const cleanTel = c.telefono || c.celular ? String(c.telefono || c.celular).replace(/\D/g, "") : "";
        const cleanNom = c.nombre || c.nombre_completo ? String(c.nombre || c.nombre_completo).trim().toLowerCase() : "";
        
        let key = c.id ? String(c.id) : (cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(Math.random())));
        
        const previo = mapaUnicos.get(key) || {};
        mapaUnicos.set(key, { ...previo, ...c });
      });

      return Array.from(mapaUnicos.values()).filter(coincideComunidad);
    } catch (e) {
      console.warn("Error obteniendo caminantes:", e);
      return [];
    }
  }, [coincideComunidad]);

  // 🛠️ CARGA COMPLETA MULTI-TABLA Y LOCAL DE SERVIDORES
  const obtenerTodosServidores = useCallback(async () => {
    try {
      const [s1, s2, rCaminantes, rRemotas] = await Promise.all([
        base44.entities.Servidor?.list?.().catch(() => []) || Promise.resolve([]),
        base44.entities.Servidores?.list?.().catch(() => []) || Promise.resolve([]),
        base44.entities.Caminante?.list?.().catch(() => []) || Promise.resolve([]),
        base44.entities.InscripcionRemota?.list?.().catch(() => []) || Promise.resolve([]),
      ]);

      let localServs = [];
      try {
        localServs = JSON.parse(localStorage.getItem("emaus_servidores") || "[]");
      } catch {}

      let acumulados = [];
      if (Array.isArray(s1)) acumulados.push(...s1);
      if (Array.isArray(s2)) acumulados.push(...s2);

      if (Array.isArray(rCaminantes)) {
        const soloServidores = rCaminantes.filter(c => 
          String(c.tipo || "").toLowerCase() === "servidor" || 
          String(c.tipo_registro || "").toLowerCase() === "servidor" ||
          c.es_servidor === true ||
          Boolean(c.lugares_servido || c.rol_servidor)
        );
        acumulados.push(...soloServidores);
      }

      if (Array.isArray(rRemotas)) {
        const soloServidoresRemotosAprobados = rRemotas.filter(c => {
          const est = String(c.estado || "").toLowerCase();
          const esAprobado = est === "aprobado" || est === "confirmado" || est === "pendiente";
          const tipoStr = String(c.tipo || c.tipo_inscripcion || c.tipo_registro || c.rol_servidor || "").toLowerCase();
          const esServ = tipoStr.includes("servid") || c.es_servidor === true || Boolean(c.lugares_servido || c.rol_servidor || c.equipo_trabajo);
          return esAprobado && esServ;
        });
        acumulados.push(...soloServidoresRemotosAprobados);
      }

      if (Array.isArray(localServs)) acumulados.push(...localServs);

      const mapaUnicos = new Map();
      acumulados.forEach(s => {
        if (!s) return;
        const cleanCed = s.cedula ? String(s.cedula).replace(/\D/g, "") : "";
        const cleanTel = s.telefono || s.celular ? String(s.telefono || s.celular).replace(/\D/g, "") : "";
        const cleanNom = s.nombre || s.nombre_completo ? String(s.nombre || s.nombre_completo).trim().toLowerCase() : "";
        
        let key = s.id ? String(s.id) : (cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(Math.random())));
        
        const previo = mapaUnicos.get(key) || {};
        mapaUnicos.set(key, { ...previo, ...s });
      });

      return Array.from(mapaUnicos.values()).filter(coincideComunidad);
    } catch (e) {
      console.warn("Error obteniendo servidores:", e);
      return [];
    }
  }, [coincideComunidad]);

  const recargarPersonas = useCallback(async () => {
    const [camsFiltrados, servsFiltrados] = await Promise.all([
      obtenerTodosCaminantes(),
      obtenerTodosServidores(),
    ]);
    setCaminantes(camsFiltrados);
    setServidores(servsFiltrados);
  }, [obtenerTodosCaminantes, obtenerTodosServidores]);

  useEffect(() => {
    Promise.all([
      base44.entities.ConfigFinanza?.list?.() || Promise.resolve([]),
      base44.entities.ConfigRetiro?.list?.() || Promise.resolve([]),
      obtenerTodosCaminantes(),
      obtenerTodosServidores(),
      base44.entities.Caja?.list?.().catch(() => []),
    ]).then(([cfgs, cfgRet, camsFiltrados, servsFiltrados, cajasData]) => {
      const miConfig = (cfgs || []).find(coincideComunidad) || cfgs[0] || null;
      if (miConfig) { 
        setConfig(miConfig); 
        setConfigId(miConfig.id); 
      }
      if (cfgRet.length > 0) {
        const activeCfg = cfgRet.find(coincideComunidad) || cfgRet[0];
        setConfigRetiro(activeCfg);
        setFiltroRetiro(activeCfg.edicion ? String(activeCfg.edicion) : "");
        if (activeCfg.moneda) {
          setMoneda(activeCfg.moneda);
          localStorage.setItem("emaus_moneda", activeCfg.moneda);
        }
      }
      const cajasFiltradas = (cajasData || []).filter(coincideComunidad);
      
      setCaminantes(camsFiltrados);
      setServidores(servsFiltrados);
      setCajas(cajasFiltradas);
    }).catch((e) => {
      setToast({ tipo: "error", mensaje: "Error al cargar datos: " + e.message });
    }).finally(() => setLoading(false));
  }, [coincideComunidad, obtenerTodosCaminantes, obtenerTodosServidores]);

  useEffect(() => {
    if (!loadingMovs && loading) setLoading(false);
  }, [loadingMovs, loading]);

  const numRetiro = parsearNumeroRetiro(filtroRetiro || configRetiro?.edicion || 1);

  const movFiltrados = useMemo(() => {
    return movimientos.filter(m => {
      if (numRetiro !== null && m.numero_retiro && parsearNumeroRetiro(m.numero_retiro) !== numRetiro) return false;
      if (m.moneda && m.moneda !== moneda) return false;
      if (filtroFechaDesde && m.fecha && m.fecha < filtroFechaDesde) return false;
      if (filtroFechaHasta && m.fecha && m.fecha > filtroFechaHasta) return false;
      if (filtroTipoMov !== "todos") {
        if (filtroTipoMov === "ingresos" && m.tipo === "gasto") return false;
        if (filtroTipoMov === "gastos" && m.tipo !== "gasto") return false;
        if (filtroTipoMov !== "todos" && filtroTipoMov !== "ingresos" && filtroTipoMov !== "gastos" && m.tipo !== filtroTipoMov) return false;
      }
      if (filtroCategoria !== "todas" && m.categoria !== filtroCategoria) return false;
      if (filtroBusqueda) {
        const q = filtroBusqueda.toLowerCase();
        const desc = (m.descripcion || "").toLowerCase();
        const nom = (m.caminante_nombre || "").toLowerCase();
        const pat = (m.patrocinador || "").toLowerCase();
        if (!desc.includes(q) && !nom.includes(q) && !pat.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      return new Date(b.fecha) - new Date(a.fecha);
    });
  }, [movimientos, numRetiro, moneda, filtroFechaDesde, filtroFechaHasta, filtroTipoMov, filtroCategoria, filtroBusqueda]);

  const totales = useMemo(() => {
    let totalIngresos = 0, aportesCaminantes = 0, aportesServidores = 0, donaciones = 0, totalGastos = 0, abonos = 0;
    const gastosPorCategoria = {};

    movFiltrados.forEach(m => {
      const monto = Number(m.monto) || 0;
      if (m.tipo === "gasto") {
        totalGastos += monto;
        const cat = m.categoria || "sin_categorizar";
        gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + monto;
      } else if (m.tipo === "cuota_caminante") { aportesCaminantes += monto; totalIngresos += monto; }
      else if (m.tipo === "cuota_servidor") { aportesServidores += monto; totalIngresos += monto; }
      else if (m.tipo === "donacion") { donaciones += monto; totalIngresos += monto; }
      else if (m.tipo === "abono") { abonos += monto; totalIngresos += monto; }
      else if (m.tipo === "ingreso") totalIngresos += monto;
    });

    return {
      totalIngresos, aportesCaminantes, aportesServidores, donaciones, abonos, totalGastos,
      gastosPorCategoria,
      balance: totalIngresos - totalGastos,
      cantidadMovimientos: movFiltrados.length,
      ticketPromedio: totalGastos > 0 ? totalGastos / movFiltrados.filter(m => m.tipo === "gasto").length : 0,
    };
  }, [movFiltrados]);

  const precioCaminante = useMemo(() => {
    const key = `emaus_precio_cam_${equipoIdActivo || 'def'}_${moneda}`;
    const localVal = localStorage.getItem(key);
    if (localVal && !isNaN(Number(localVal)) && Number(localVal) > 0) return Number(localVal);
    if (moneda === "USD$") return Number(config?.precio_ficha_caminante_usd ?? config?.precio_ficha_caminante ?? 0);
    if (moneda === "EUR$") return Number(config?.precio_ficha_caminante_eur ?? config?.precio_ficha_caminante ?? 0);
    return Number(config?.precio_ficha_caminante ?? 0);
  }, [config, moneda, equipoIdActivo]);

  const precioServidor = useMemo(() => {
    const key = `emaus_precio_serv_${equipoIdActivo || 'def'}_${moneda}`;
    const localVal = localStorage.getItem(key);
    if (localVal && !isNaN(Number(localVal)) && Number(localVal) > 0) return Number(localVal);
    if (moneda === "USD$") return Number(config?.precio_ficha_servidor_usd ?? config?.precio_ficha_servidor ?? 0);
    if (moneda === "EUR$") return Number(config?.precio_ficha_servidor_eur ?? config?.precio_ficha_servidor ?? 0);
    return Number(config?.precio_ficha_servidor ?? 0);
  }, [config, moneda, equipoIdActivo]);
  
  const esPagadoValido = (p) => 
    p.pago_ficha === "Pagado" || 
    p.estado_pago === "Pagado" || 
    p.pago === "Pagado" || 
    p.status_pago === "Pagado" ||
    (p.monto_pendiente !== undefined && Number(p.monto_pendiente) <= 0);

  const camsPendientes = caminantes.filter(c => !esPagadoValido(c));
  const servsPendientes = servidores.filter(s => !esPagadoValido(s));
  const camsPagados = caminantes.filter(c => esPagadoValido(c));
  const servsPagados = servidores.filter(s => esPagadoValido(s));

  const cuentaPorCobrar = {
    camsPendientes: camsPendientes.length,
    servsPendientes: servsPendientes.length,
    montoCams: camsPendientes.reduce((acc, c) => acc + (Number(c.monto_pendiente) || precioCaminante), 0),
    montoServs: servsPendientes.reduce((acc, s) => acc + (Number(s.monto_pendiente) || precioServidor), 0),
    total: 0,
  };
  cuentaPorCobrar.total = cuentaPorCobrar.montoCams + cuentaPorCobrar.montoServs;

  const tasaCobro = caminantes.length + servidores.length > 0
    ? ((camsPagados.length + servsPagados.length) / (caminantes.length + servidores.length) * 100).toFixed(1)
    : 0;

  const listaCxC = useMemo(() => {
    const lista = [];
    if (filtroCxC === "todos" || filtroCxC === "caminantes") {
      camsPendientes.forEach(c => {
        lista.push({
          id: c.id, tipo: "caminante",
          nombre: c.nombre || c.nombre_completo || "—",
          telefono: c.telefono || c.celular || "",
          fecha_inscripcion: c.fecha_inscripcion || c.fecha || c.created_at || "",
          monto: Number(c.monto_pendiente ?? precioCaminante) || precioCaminante,
          abonado: Number(c.monto_abonado) || 0,
          total: precioCaminante,
        });
      });
    }
    if (filtroCxC === "todos" || filtroCxC === "servidores") {
      servsPendientes.forEach(s => {
        lista.push({
          id: s.id, tipo: "servidor",
          nombre: s.nombre || s.nombre_completo || "—",
          telefono: s.telefono || s.celular || "",
          fecha_inscripcion: s.fecha_inscripcion || s.fecha || s.created_at || "",
          monto: Number(s.monto_pendiente ?? precioServidor) || precioServidor,
          abonado: Number(s.monto_abonado) || 0,
          total: precioServidor,
        });
      });
    }
    return lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [filtroCxC, camsPendientes, servsPendientes, precioCaminante, precioServidor]);

  const saldosPorCaja = useMemo(() => {
    const saldos = {};
    movFiltrados.forEach(m => {
      const caja = m.caja_nombre || "Sin asignar";
      if (!saldos[caja]) saldos[caja] = 0;
      saldos[caja] += m.tipo === "gasto" ? -Number(m.monto) : Number(m.monto);
    });
    return saldos;
  }, [movFiltrados]);

  const handleEliminarMovimiento = async (mov) => {
    setConfirmModal({
      titulo: "Eliminar movimiento",
      mensaje: `¿Seguro que quieres eliminar este movimiento de ${mov.moneda || moneda} ${fmt(mov.monto)}? Quedará archivado en "Transacciones Eliminadas".`,
      danger: true,
      confirmText: "Eliminar",
      onConfirm: async () => {
        try {
          setLoadingAction(true);

          const objetoEliminado = {
            id: mov.id,
            movimiento_original_id: mov.id,
            tipo: mov.tipo,
            monto: Number(mov.monto) || 0,
            moneda: mov.moneda || moneda,
            descripcion: mov.descripcion || "",
            categoria: mov.categoria || "",
            metodo_pago: mov.metodo_pago || "",
            caja_nombre: mov.caja_nombre || "",
            caminante_nombre: mov.caminante_nombre || "",
            patrocinador: mov.patrocinador || "",
            numero_retiro: parsearNumeroRetiro(mov.numero_retiro || numRetiro),
            fecha_original: mov.fecha || "",
            eliminado_por: currentUser?.nombre || currentUser?.email || "Sistema",
            fecha_eliminacion: new Date().toISOString(),
          };

          await registrarAuditoria("eliminar_movimiento", objetoEliminado);
          await base44.entities.MovimientoFinanciero.delete(mov.id);
          setToast({ tipo: "success", mensaje: "Movimiento eliminado y archivado correctamente." });
          reload();
        } catch (e) {
          setToast({ tipo: "error", mensaje: "Error al eliminar: " + e.message });
        } finally {
          setLoadingAction(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleEnviarRecordatorio = (p) => {
    const msg = encodeURIComponent(
      `Hola ${p.nombre}, te recordamos que tu ficha para el Retiro de Emaús ` +
      `tiene un saldo pendiente de ${moneda} ${fmt(p.monto)}. ` +
      `${p.abonado > 0 ? `Ya has abonado ${moneda} ${fmt(p.abonado)}. ` : ""}` +
      `¿Podrías confirmar cuándo podrás completar el pago? 🙏`
    );
    const telefono = (p.telefono || "").replace(/\D/g, "");
    if (!telefono) {
      setToast({ tipo: "warning", mensaje: "Esta persona no tiene teléfono registrado" });
      return;
    }
    window.open(`https://wa.me/1${telefono}?text=${msg}`, "_blank");
    registrarAuditoria("recordatorio_whatsapp", { persona: p.nombre, monto: p.monto, moneda });
  };

  const limpiarFiltros = () => {
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
    setFiltroTipoMov("todos");
    setFiltroCategoria("todas");
    setFiltroBusqueda("");
    setFiltroRetiro(configRetiro?.edicion ? String(configRetiro.edicion) : "");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-amber-200 border-t-amber-700 rounded-full animate-spin mb-3"></div>
          <p className="text-amber-700 font-medium">Cargando módulo de finanzas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print:bg-white space-y-6 min-h-screen bg-amber-50/30 pb-12">
      <div className="max-w-7xl mx-auto pt-4 px-4 no-print">
        <SelectorComunidad />
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <ConfirmModal
        abierto={!!confirmModal}
        {...confirmModal}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />

      <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 no-print max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-amber-900">Módulo de Finanzas</h1>
                <p className="text-amber-600 text-xs mt-0.5 font-medium">
                  Gestión Financiera Oficial en <strong className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-extrabold">{moneda}</strong> — {(!comunidadActual || comunidadActual.id === "GLOBAL" || comunidadActual.id === "global") ? "Vista Global (Todas las Comunidades)" : (comunidadActual?.nombre || "Comunidad Activa")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setMostrarEliminadas(true)}
              className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 px-3.5 py-2 rounded-lg text-sm font-bold transition shadow-sm"
            >
              <Archive className="w-4 h-4" /> Eliminadas
            </button>

            <button
              onClick={() => setMostrarConfig(true)}
              className="flex items-center gap-2 bg-amber-700 text-white hover:bg-amber-800 px-3.5 py-2 rounded-lg text-sm font-bold transition shadow-sm"
            >
              <Settings className="w-4 h-4" /> Precios
            </button>

            {currentUser?.rol === "rector" && (
              <button
                onClick={() => setMostrarCaja(true)}
                className="flex items-center gap-2 bg-slate-700 text-white hover:bg-slate-800 px-3.5 py-2 rounded-lg text-sm font-bold transition shadow-sm"
              >
                <Wallet className="w-4 h-4" /> Cajas
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-amber-200 no-print max-w-7xl mx-auto">
        <div className="flex gap-1 p-2 border-b border-amber-100 overflow-x-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "resumen", label: "Estado de Cuenta", icon: FileText },
            { id: "cxc", label: "Cuentas por Cobrar", icon: UserCheck, badge: cuentaPorCobrar.camsPendientes + cuentaPorCobrar.servsPendientes },
            { id: "cobros", label: "Cobrar Fichas", icon: CreditCard },
            { id: "movimientos", label: "Movimientos", icon: ArrowUpDown },
            { id: "auditoria", label: "Auditoría", icon: Shield, soloAdmin: true },
          ].filter(t => !t.soloAdmin || currentUser?.rol === "rector" || esCreadorReal).map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg transition whitespace-nowrap ${
                  tab === t.id
                    ? "bg-amber-700 text-white shadow"
                    : "text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="no-print max-w-7xl mx-auto">
        {tab === "dashboard" && (
          <TabDashboard
            totales={totales}
            cuentaPorCobrar={cuentaPorCobrar}
            tasaCobro={tasaCobro}
            caminantes={caminantes}
            servidores={servidores}
            movFiltrados={movFiltrados}
            saldosPorCaja={saldosPorCaja}
            moneda={moneda}
          />
        )}

        {tab === "resumen" && (
          <TabResumen
            movFiltrados={movFiltrados}
            configRetiro={configRetiro}
            numRetiro={numRetiro}
            cuentaPorCobrar={cuentaPorCobrar}
            totales={totales}
            filtroFechaDesde={filtroFechaDesde}
            setFiltroFechaDesde={setFiltroFechaDesde}
            filtroFechaHasta={filtroFechaHasta}
            setFiltroFechaHasta={setFiltroFechaHasta}
            filtroTipoMov={filtroTipoMov}
            setFiltroTipoMov={setFiltroTipoMov}
            filtroCategoria={filtroCategoria}
            setFiltroCategoria={setFiltroCategoria}
            filtroBusqueda={filtroBusqueda}
            setFiltroBusqueda={setFiltroBusqueda}
            filtroRetiro={filtroRetiro}
            setFiltroRetiro={setFiltroRetiro}
            limpiarFiltros={limpiarFiltros}
            nombreComunidad={(!comunidadActual || comunidadActual.id === "GLOBAL" || comunidadActual.id === "global") ? "Vista Global (Todas las Comunidades)" : comunidadActual?.nombre}
            moneda={moneda}
          />
        )}

        {tab === "cxc" && (
          <TabCxC
            filtro={filtroCxC}
            setFiltro={setFiltroCxC}
            lista={listaCxC}
            configRetiro={configRetiro}
            precioCaminante={precioCaminante}
            precioServidor={precioServidor}
            handleEnviarRecordatorio={handleEnviarRecordatorio}
            nombreComunidad={(!comunidadActual || comunidadActual.id === "GLOBAL" || comunidadActual.id === "global") ? "Vista Global (Todas las Comunidades)" : comunidadActual?.nombre}
            moneda={moneda}
          />
        )}

        {tab === "cobros" && (
          <TabCobros
            onCobrarCaminante={() => setMostrarCobroCaminante(true)}
            onCobrarServidor={() => setMostrarCobroServidor(true)}
            camsPagados={camsPagados.length}
            servsPagados={servsPagados.length}
            camsPendientes={camsPendientes.length}
            servsPendientes={servsPendientes.length}
            precioCaminante={precioCaminante}
            precioServidor={precioServidor}
            moneda={moneda}
          />
        )}

        {tab === "movimientos" && (
          <TabMovimientos
            movFiltrados={movFiltrados}
            onNuevo={() => { setMovimientoEditar(null); setMostrarMovimiento(true); }}
            onEditar={(m) => { setMovimientoEditar(m); setMostrarMovimiento(true); }}
            onReversar={(m) => setMovimientoReversar(m)}
            onEliminar={handleEliminarMovimiento}
            moneda={moneda}
          />
        )}

        {tab === "auditoria" && <TabAuditoria coincideComunidad={coincideComunidad} />}
      </div>

      {mostrarConfig && (
        <ModalConfig
          config={config}
          configId={configId}
          monedaActiva={moneda}
          equipoIdActivo={equipoIdActivo}
          onClose={() => setMostrarConfig(false)}
          onGuardado={(newPayload) => {
            if (newPayload) {
              setConfig(prev => ({ ...(prev || {}), ...newPayload }));
            }
            setMostrarConfig(false);
            recargarConfig();
            reload();
          }}
          registrarAuditoria={registrarAuditoria}
          setToast={setToast}
        />
      )}

      {mostrarMovimiento && (
        <ModalMovimiento
          movimiento={movimientoEditar}
          monedaActiva={moneda}
          onClose={() => { setMostrarMovimiento(false); setMovimientoEditar(null); }}
          onGuardado={() => { setMostrarMovimiento(false); setMovimientoEditar(null); reload(); }}
          cajas={cajas}
          numeroRetiro={numRetiro}
          currentUser={currentUser}
          equipoIdActivo={equipoIdActivo}
          registrarAuditoria={registrarAuditoria}
          setToast={setToast}
          configRetiro={configRetiro}
        />
      )}

      {movimientoReversar && (
        <ModalReversarTransaccion
          movimiento={movimientoReversar}
          monedaActiva={moneda}
          onClose={() => setMovimientoReversar(null)}
          onGuardado={() => { setMovimientoReversar(null); reload(); recargarPersonas(); }}
          currentUser={currentUser}
          config={config}
          registrarAuditoria={registrarAuditoria}
          setToast={setToast}
          caminantes={caminantes}
          servidores={servidores}
        />
      )}

      {mostrarCobroCaminante && (
        <ModalCobro
          tipo="caminante"
          precioFicha={precioCaminante}
          monedaActiva={moneda}
          numeroRetiro={numRetiro}
          currentUser={currentUser}
          equipoIdActivo={equipoIdActivo}
          onClose={() => setMostrarCobroCaminante(false)}
          onGuardado={() => { setMostrarCobroCaminante(false); reload(); recargarPersonas(); }}
          registrarAuditoria={registrarAuditoria}
          setToast={setToast}
          caminantes={caminantes}
          cajas={cajas}
          configRetiro={configRetiro}
        />
      )}

      {mostrarCobroServidor && (
        <ModalCobro
          tipo="servidor"
          precioFicha={precioServidor}
          monedaActiva={moneda}
          numeroRetiro={numRetiro}
          currentUser={currentUser}
          equipoIdActivo={equipoIdActivo}
          onClose={() => setMostrarCobroServidor(false)}
          onGuardado={() => { setMostrarCobroServidor(false); reload(); recargarPersonas(); }}
          registrarAuditoria={registrarAuditoria}
          setToast={setToast}
          servidores={servidores}
          cajas={cajas}
          configRetiro={configRetiro}
        />
      )}

      {mostrarCaja && (
        <ModalCajas
          cajas={cajas}
          moneda={moneda}
          equipoIdActivo={equipoIdActivo}
          onClose={() => setMostrarCaja(false)}
          onGuardado={() => { base44.entities.Caja?.list?.().then(c => setCajas((c || []).filter(coincideComunidad))); }}
          registrarAuditoria={registrarAuditoria}
          setToast={setToast}
        />
      )}

      {mostrarEliminadas && (
        <ModalTransaccionesEliminadas 
          abierto={mostrarEliminadas} 
          onClose={() => setMostrarEliminadas(false)} 
          coincideComunidad={coincideComunidad}
          monedaActiva={moneda}
        />
      )}
    </div>
  );
}

function TabDashboard({ totales, cuentaPorCobrar, tasaCobro, caminantes, servidores, movFiltrados, saldosPorCaja, moneda }) {
  const totalPersonas = caminantes.length + servidores.length;
  const topCategorias = Object.entries(totales.gastosPorCategoria)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const maxGasto = topCategorias.length > 0 ? topCategorias[0][1] : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TarjetaKPI titulo={`Balance (${moneda})`} valor={`${moneda} ${fmt(totales.balance)}`} icono={DollarSign} color={totales.balance >= 0 ? "green" : "red"} subtitulo={totales.balance >= 0 ? "Saludable" : "Déficit"} />
        <TarjetaKPI titulo={`Ingresos (${moneda})`} valor={`${moneda} ${fmt(totales.totalIngresos)}`} icono={TrendingUp} color="blue" subtitulo={`${totales.cantidadMovimientos} movimientos`} />
        <TarjetaKPI titulo={`Gastos (${moneda})`} valor={`${moneda} ${fmt(totales.totalGastos)}`} icono={TrendingDown} color="red" subtitulo={`Prom: ${moneda} ${fmt(totales.ticketPromedio)}`} />
        <TarjetaKPI titulo="Tasa de Cobro" valor={`${tasaCobro}%`} icono={UserCheck} color="purple" subtitulo={`${totalPersonas} personas`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <PieChartIcon className="w-4 h-4 text-amber-700" /> Desglose de Ingresos ({moneda})
          </h3>
          <div className="space-y-2.5">
            {[
              { label: "Aportes Caminantes", valor: totales.aportesCaminantes, color: "bg-green-500" },
              { label: "Aportes Servidores", valor: totales.aportesServidores, color: "bg-blue-500" },
              { label: "Donaciones", valor: totales.donaciones, color: "bg-purple-500" },
              { label: "Abonos Parciales", valor: totales.abonos, color: "bg-amber-500" },
            ].map((item, i) => {
              const porcentaje = totales.totalIngresos > 0 ? (item.valor / totales.totalIngresos * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-700 font-medium">{item.label}</span>
                    <span className="text-gray-900 font-bold">{moneda} {fmt(item.valor)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`${item.color} h-1.5 rounded-full transition-all`} style={{ width: `${porcentaje}%` }}></div>
                  </div>
                  <p className="text-[9px] text-gray-500 text-right mt-0.5">{porcentaje.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4 text-red-600" /> Top Gastos ({moneda})
          </h3>
          {topCategorias.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">Sin gastos registrados en {moneda}</p>
          ) : (
            <div className="space-y-2.5">
              {topCategorias.map(([cat, valor], i) => {
                const categoria = CATEGORIAS_GASTO.find(c => c.value === cat);
                const porcentaje = (valor / maxGasto * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-700 font-medium">{categoria?.emoji || "📦"} {categoria?.label || cat}</span>
                      <span className="text-gray-900 font-bold">{moneda} {fmt(valor)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${porcentaje}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
            <Wallet className="w-4 h-4 text-green-600" /> Saldos por Caja ({moneda})
          </h3>
          {Object.keys(saldosPorCaja).length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">Sin movimientos en {moneda}</p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(saldosPorCaja).map(([caja, saldo]) => (
                <div key={caja} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-700 font-medium">{caja}</span>
                  <span className={`text-xs font-bold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {moneda} {fmt(saldo)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {cuentaPorCobrar.total > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                <span className="text-xs text-red-700 font-medium">⚠️ Por Cobrar</span>
                <span className="text-xs font-bold text-red-600">{moneda} {fmt(cuentaPorCobrar.total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabResumen({ movFiltrados, configRetiro, numRetiro, cuentaPorCobrar, totales, nombreComunidad, moneda, ...filtros }) {
  const { filtroFechaDesde, setFiltroFechaDesde, filtroFechaHasta, setFiltroFechaHasta,
    filtroTipoMov, setFiltroTipoMov, filtroCategoria, setFiltroCategoria,
    filtroBusqueda, setFiltroBusqueda, filtroRetiro, setFiltroRetiro, limpiarFiltros } = filtros;

  const tieneFiltros = filtroFechaDesde || filtroFechaHasta || filtroTipoMov !== "todos" || filtroCategoria !== "todas" || filtroBusqueda;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-amber-700" /> Filtros
          </h3>
          {tieneFiltros && (
            <button onClick={limpiarFiltros} className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div>
            <label className="text-[10px] font-medium text-gray-700 mb-1 block">Retiro #</label>
            <input
              type="text"
              value={filtroRetiro}
              onChange={(e) => setFiltroRetiro(e.target.value)}
              placeholder="Todos"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-700 mb-1 block">Desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-700 mb-1 block">Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-700 mb-1 block">Tipo</label>
            <select
              value={filtroTipoMov}
              onChange={(e) => setFiltroTipoMov(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="todos">Todos</option>
              <option value="ingresos">Solo Ingresos</option>
              <option value="gastos">Solo Gastos</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-700 mb-1 block">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="todas">Todas</option>
              {CATEGORIAS_GASTO.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label.replace(c.emoji + " ", "")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-700 mb-1 block">Buscar</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                placeholder="Descripción..."
                className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => imprimirEstadoCuenta(movFiltrados, configRetiro, numRetiro, cuentaPorCobrar, nombreComunidad, moneda)}
          className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" /> Imprimir Estado de Cuenta ({moneda})
        </button>
      </div>

      <EstadoCuentaCompacto movimientos={movFiltrados} configRetiro={configRetiro} numeroRetiro={numRetiro} cuentaPorCobrar={cuentaPorCobrar} totales={totales} moneda={moneda} />
    </div>
  );
}

function EstadoCuentaCompacto({ movimientos, configRetiro, numeroRetiro, cuentaPorCobrar, totales, moneda }) {
  const movOrdenados = [...movimientos].sort((a, b) => {
    if (!a.fecha) return 1; if (!b.fecha) return -1;
    return new Date(b.fecha) - new Date(a.fecha);
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white">
        <p className="text-base font-bold">✝️ Retiro de Emaús ({moneda})</p>
        <p className="text-[11px] opacity-90">{configRetiro?.nombre_retiro || ""} {numeroRetiro ? `· Edición #${numeroRetiro}` : ""}</p>
      </div>

      <div className="p-3 grid grid-cols-2 md:grid-cols-5 gap-2 border-b border-gray-200">
        {[
          { label: "Ingresos", valor: totales.totalIngresos, color: "green" },
          { label: "Gastos", valor: totales.totalGastos, color: "red" },
          { label: "Balance", valor: totales.balance, color: "amber" },
          { label: "Cobrado", valor: totales.aportesCaminantes + totales.aportesServidores, color: "blue" },
          { label: "Por Cobrar", valor: cuentaPorCobrar.total, color: "red" },
        ].map((r, i) => (
          <div key={i} className="text-center p-2 rounded-lg bg-gray-50">
            <p className="text-[9px] text-gray-500">{r.label}</p>
            <p className={`text-xs font-bold text-${r.color}-700`}>{moneda} {fmt(r.valor)}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Fecha</th>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Descripción</th>
              <th className="text-center py-1.5 px-2 font-semibold text-gray-700">Tipo</th>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700 hidden md:table-cell">Categoría</th>
              <th className="text-right py-1.5 px-2 font-semibold text-gray-700">Débito</th>
              <th className="text-right py-1.5 px-2 font-semibold text-gray-700">Crédito</th>
            </tr>
          </thead>
          <tbody>
            {movOrdenados.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-6 text-gray-400 text-xs">No hay movimientos registrados en {moneda}</td></tr>
            ) : movOrdenados.slice(0, 50).map((m, i) => {
              const esGasto = m.tipo === "gasto";
              const mon = m.moneda || moneda;
              return (
                <tr key={m.id || i} className="border-b border-gray-100 hover:bg-amber-50/30">
                  <td className="py-1.5 px-2 text-gray-500 whitespace-nowrap">{m.fecha || "—"}</td>
                  <td className="py-1.5 px-2">
                    <div className="font-medium text-gray-800">
                      {m.caminante_nombre || m.descripcion || m.tipo}
                    </div>
                    {m.metodo_pago && <span className="text-[9px] text-gray-500">{m.metodo_pago}</span>}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <Badge color={esGasto ? "red" : m.tipo.includes("caminante") ? "green" : m.tipo.includes("servidor") ? "blue" : "purple"} size="xs">
                      {m.tipo.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-1.5 px-2 text-gray-500 hidden md:table-cell">
                    {m.categoria ? CATEGORIAS_GASTO.find(c => c.value === m.categoria)?.emoji : "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right text-red-600 font-semibold">{esGasto ? `${mon} ${fmt(m.monto)}` : "—"}</td>
                  <td className="py-1.5 px-2 text-right text-green-600 font-semibold">{!esGasto ? `${mon} ${fmt(m.monto)}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabCxC({ filtro, setFiltro, lista, configRetiro, precioCaminante, precioServidor, handleEnviarRecordatorio, nombreComunidad, moneda }) {
  const total = lista.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-3 border-b border-gray-200 flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-600" /> Cuentas por Cobrar ({moneda})
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">{configRetiro?.nombre_retiro || "Retiro de Emaús"} · {nombreComunidad || "General"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => imprimirEstadoCuentaCobrar({ lista, filtro, configRetiro, precioCaminante, precioServidor, nombreComunidad, monedaActiva: moneda })}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
        </div>
      </div>

      <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-gray-200">
        <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
          <p className="text-[9px] text-gray-500">Total por Cobrar</p>
          <p className="text-base font-bold text-red-700">{moneda} {fmt(total)}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-[9px] text-gray-500">Caminantes</p>
          <p className="text-base font-bold text-green-700">{lista.filter(p => p.tipo === "caminante").length}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-[9px] text-gray-500">Servidores</p>
          <p className="text-base font-bold text-blue-700">{lista.filter(p => p.tipo === "servidor").length}</p>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-[9px] text-gray-500">Total Personas</p>
          <p className="text-base font-bold text-amber-800">{lista.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700 w-8">#</th>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Nombre</th>
              <th className="text-center py-1.5 px-2 font-semibold text-gray-700">Tipo</th>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Teléfono</th>
              <th className="text-right py-1.5 px-2 font-semibold text-gray-700">Abonado</th>
              <th className="text-right py-1.5 px-2 font-semibold text-gray-700">Pendiente</th>
              <th className="text-center py-1.5 px-2 font-semibold text-gray-700">Acción</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-400">
                <UserCheck className="w-12 h-12 text-green-400 mx-auto mb-2" />
                ¡No hay cuentas pendientes en {moneda}!
              </td></tr>
            ) : lista.map((p, i) => (
              <tr key={`${p.tipo}-${p.id}`} className="border-b border-gray-100 hover:bg-amber-50/30">
                <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                <td className="py-1.5 px-2 font-medium text-gray-800">{p.nombre}</td>
                <td className="py-1.5 px-2 text-center">
                  <Badge color={p.tipo === "caminante" ? "green" : "blue"} size="xs">
                    {p.tipo === "caminante" ? "Caminante" : "Servidor"}
                  </Badge>
                </td>
                <td className="py-1.5 px-2 text-gray-500">{p.telefono || "—"}</td>
                <td className="py-1.5 px-2 text-right text-green-600 font-semibold">{p.abonado > 0 ? `${moneda} ${fmt(p.abonado)}` : "—"}</td>
                <td className="py-1.5 px-2 text-right text-red-600 font-bold">{moneda} {fmt(p.monto)}</td>
                <td className="py-1.5 px-2 text-center">
                  <button
                    onClick={() => handleEnviarRecordatorio(p)}
                    className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    title="Enviar recordatorio por WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabCobros({ onCobrarCaminante, onCobrarServidor, camsPagados, servsPagados, camsPendientes, servsPendientes, precioCaminante, precioServidor, moneda }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm border-2 border-green-200 overflow-hidden">
          <div className="bg-gradient-to-br from-green-600 to-green-700 p-4 text-white">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5" /> Caminantes
            </h3>
            <p className="text-xs opacity-90 mt-1">{moneda} {fmt(precioCaminante)} por ficha</p>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Pagados y Confirmados</span>
              <span className="font-bold text-green-700">{camsPagados}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Pendientes</span>
              <span className="font-bold text-red-600">{camsPendientes}</span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <button
                onClick={onCobrarCaminante}
                className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow transition"
              >
                <CreditCard className="w-4 h-4" /> Cobrar Fichas ({moneda})
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5" /> Servidores
            </h3>
            <p className="text-xs opacity-90 mt-1">{moneda} {fmt(precioServidor)} por ficha</p>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Pagados y Confirmados</span>
              <span className="font-bold text-green-700">{servsPagados}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Pendientes</span>
              <span className="font-bold text-red-600">{servsPendientes}</span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <button
                onClick={onCobrarServidor}
                className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow transition"
              >
                <CreditCard className="w-4 h-4" /> Cobrar Fichas ({moneda})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabMovimientos({ movFiltrados, onNuevo, onEditar, onReversar, onEliminar, moneda }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
          <ArrowUpDown className="w-4 h-4 text-amber-700" /> Movimientos en {moneda}
          <Badge color="gray" size="sm">{movFiltrados.length}</Badge>
        </h3>
        <button
          onClick={onNuevo}
          className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Nuevo Movimiento
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Fecha</th>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Descripción</th>
              <th className="text-center py-1.5 px-2 font-semibold text-gray-700">Tipo</th>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Caja</th>
              <th className="text-right py-1.5 px-2 font-semibold text-gray-700">Monto ({moneda})</th>
              <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Usuario</th>
              <th className="text-center py-1.5 px-2 font-semibold text-gray-700 w-24">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {movFiltrados.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-400 text-xs">No hay movimientos registrados en {moneda}</td></tr>
            ) : movFiltrados.map((m, i) => (
              <tr key={m.id || i} className={`border-b border-gray-100 hover:bg-amber-50/30 ${m.es_reversado ? "bg-red-50/40 opacity-70" : ""}`}>
                <td className="py-1.5 px-2 text-gray-500 whitespace-nowrap">{m.fecha || "—"}</td>
                <td className="py-1.5 px-2 font-medium text-gray-800">
                  {m.caminante_nombre || m.descripcion || m.tipo}
                  {m.es_reversado && <span className="ml-2 text-[9px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">REVERSADO</span>}
                </td>
                <td className="py-1.5 px-2 text-center">
                  <Badge color={m.tipo === "gasto" ? "red" : m.tipo === "reversal" ? "orange" : "green"} size="xs">{m.tipo}</Badge>
                </td>
                <td className="py-1.5 px-2 text-gray-500">{m.caja_nombre || "—"}</td>
                <td className={`py-1.5 px-2 text-right font-bold ${m.tipo === "gasto" || m.tipo === "reversal" ? "text-red-600" : "text-green-600"}`}>
                  {m.moneda || moneda} {fmt(m.monto)}
                </td>
                <td className="py-1.5 px-2 text-gray-500">{m.registrado_por || "—"}</td>
                <td className="py-1.5 px-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => onEditar(m)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {!m.es_reversado && m.tipo !== "reversal" ? (
                      <button onClick={() => onReversar(m)} className="p-1 text-amber-700 hover:bg-amber-100 rounded transition" title="Reversar Transacción (Requiere Código)">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="p-1 text-gray-400 cursor-not-allowed" title="Transacción ya reversada">
                        <RotateCcw className="w-3.5 h-3.5 opacity-30" />
                      </span>
                    )}
                    <button onClick={() => onEliminar(m)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabAuditoria({ coincideComunidad }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarAuditoria = async () => {
      let baseLogs = [];
      try {
        if (base44.entities.AuditoriaFinanza?.list) {
          baseLogs = (await base44.entities.AuditoriaFinanza.list()) || [];
        }
      } catch (e) {}

      let localLogs = [];
      try {
        localLogs = JSON.parse(localStorage.getItem("emaus_auditoria_finanzas") || "[]");
      } catch (e) {}

      const combinados = [...(baseLogs || []), ...(localLogs || [])];
      const unicosMap = new Map();
      combinados.forEach(item => {
        if (item && item.accion) {
          const strDet = typeof item.detalles === "object" ? JSON.stringify(item.detalles) : String(item.detalles || "");
          const key = `${item.fecha || ""}_${item.accion}_${strDet}`;
          if (!unicosMap.has(key)) unicosMap.set(key, item);
        }
      });

      const filtrados = Array.from(unicosMap.values())
        .filter(coincideComunidad)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      setRegistros(filtrados);
      setLoading(false);
    };

    cargarAuditoria();
  }, [coincideComunidad]);

  const getAccionBadge = (accion) => {
    const map = {
      "cobrar_ficha": { color: "green", label: "Cobro" },
      "crear_movimiento": { color: "blue", label: "Crear" },
      "eliminar_movimiento": { color: "red", label: "Eliminar" },
      "editar_precio": { color: "amber", label: "Editar Precio" },
      "recordatorio_whatsapp": { color: "purple", label: "WhatsApp" },
    };
    return map[accion] || { color: "gray", label: accion };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-amber-700" /> Registro de Auditoría
        </h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Historial completo de acciones financieras</p>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <p className="text-center py-8 text-gray-400 text-xs">Cargando registros...</p>
        ) : registros.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-xs">No hay registros de auditoría para esta comunidad</p>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Fecha/Hora</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Acción</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Usuario</th>
                <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => {
                const badge = getAccionBadge(r.accion);
                const detalles = (() => {
                  try {
                    return typeof r.detalles === "string" ? JSON.parse(r.detalles || "{}") : r.detalles || {};
                  } catch {
                    return {};
                  }
                })();
                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 px-2 text-gray-500 whitespace-nowrap">{new Date(r.fecha).toLocaleString("es-DO")}</td>
                    <td className="py-1.5 px-2">
                      <Badge color={badge.color} size="xs">{badge.label}</Badge>
                    </td>
                    <td className="py-1.5 px-2 text-gray-700">{r.usuario || "—"}</td>
                    <td className="py-1.5 px-2 text-gray-500 font-mono text-[10px] max-w-md truncate">
                      {JSON.stringify(detalles).slice(0, 100)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ModalConfig({ config, configId, monedaActiva, equipoIdActivo, onClose, onGuardado, registrarAuditoria, setToast }) {
  const [precioCaminante, setPrecioCaminante] = useState("");
  const [precioServidor, setPrecioServidor] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const keyCam = `emaus_precio_cam_${equipoIdActivo || 'def'}_${monedaActiva}`;
    const keyServ = `emaus_precio_serv_${equipoIdActivo || 'def'}_${monedaActiva}`;
    const localCam = localStorage.getItem(keyCam);
    const localServ = localStorage.getItem(keyServ);

    if (localCam) {
      setPrecioCaminante(localCam);
    } else if (monedaActiva === "USD$") {
      setPrecioCaminante(config?.precio_ficha_caminante_usd ?? config?.precio_ficha_caminante ?? "");
    } else if (monedaActiva === "EUR$") {
      setPrecioCaminante(config?.precio_ficha_caminante_eur ?? config?.precio_ficha_caminante ?? "");
    } else {
      setPrecioCaminante(config?.precio_ficha_caminante ?? "");
    }

    if (localServ) {
      setPrecioServidor(localServ);
    } else if (monedaActiva === "USD$") {
      setPrecioServidor(config?.precio_ficha_servidor_usd ?? config?.precio_ficha_servidor ?? "");
    } else if (monedaActiva === "EUR$") {
      setPrecioServidor(config?.precio_ficha_servidor_eur ?? config?.precio_ficha_servidor ?? "");
    } else {
      setPrecioServidor(config?.precio_ficha_servidor ?? "");
    }
  }, [config, monedaActiva, equipoIdActivo]);

  const handleGuardar = async () => {
    if (!precioCaminante || !precioServidor || Number(precioCaminante) <= 0 || Number(precioServidor) <= 0) {
      setToast({ tipo: "warning", mensaje: "Ingresa montos válidos para los precios de las fichas" });
      return;
    }

    setLoading(true);
    try {
      const valCam = Number(precioCaminante);
      const valServ = Number(precioServidor);

      const keyCam = `emaus_precio_cam_${equipoIdActivo || 'def'}_${monedaActiva}`;
      const keyServ = `emaus_precio_serv_${equipoIdActivo || 'def'}_${monedaActiva}`;
      localStorage.setItem(keyCam, String(valCam));
      localStorage.setItem(keyServ, String(valServ));

      const fieldCam = monedaActiva === "USD$" ? "precio_ficha_caminante_usd" : monedaActiva === "EUR$" ? "precio_ficha_caminante_eur" : "precio_ficha_caminante";
      const fieldServ = monedaActiva === "USD$" ? "precio_ficha_servidor_usd" : monedaActiva === "EUR$" ? "precio_ficha_servidor_eur" : "precio_ficha_servidor";

      const payload = {
        [fieldCam]: valCam,
        [fieldServ]: valServ,
        precio_ficha_caminante: valCam,
        precio_ficha_servidor: valServ,
        equipo_id: equipoIdActivo || null,
      };

      if (configId) {
        await base44.entities.ConfigFinanza.update(configId, payload).catch(e => console.warn("Update config warning:", e));
      } else {
        await base44.entities.ConfigFinanza.create(payload).catch(e => console.warn("Create config warning:", e));
      }

      await registrarAuditoria("editar_precio", { caminante: valCam, servidor: valServ, moneda: monedaActiva });
      setToast({ tipo: "success", mensaje: `✅ Precios fijados correctamente para ${monedaActiva}` });
      onGuardado(payload);
    } catch (e) {
      setToast({ tipo: "error", mensaje: "Error al guardar precios: " + e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-700" /> Configuración de Precios ({monedaActiva})
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Establece el costo oficial de las fichas para esta comunidad.</p>
        </div>
        <div className="p-4 space-y-3">
          <InputMoneda label={`Precio Ficha Caminante (${monedaActiva})`} value={precioCaminante} onChange={setPrecioCaminante} moneda={monedaActiva} />
          <InputMoneda label={`Precio Ficha Servidor (${monedaActiva})`} value={precioServidor} onChange={setPrecioServidor} moneda={monedaActiva} />
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
          <button onClick={handleGuardar} disabled={loading} className="px-3 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg disabled:opacity-50 font-bold">
            {loading ? "Guardando..." : "Guardar Precios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalMovimiento({ movimiento, monedaActiva, onClose, onGuardado, cajas, numeroRetiro, currentUser, equipoIdActivo, registrarAuditoria, setToast, configRetiro }) {
  const esEdicion = !!movimiento;
  const [tipo, setTipo] = useState(movimiento?.tipo || "gasto");
  const [monto, setMonto] = useState(movimiento?.monto?.toString() || "");
  const [descripcion, setDescripcion] = useState(movimiento?.descripcion || "");
  const [categoria, setCategoria] = useState(movimiento?.categoria || "");
  const [metodoPago, setMetodoPago] = useState(movimiento?.metodo_pago || "Efectivo");
  const [cajaId, setCajaId] = useState(movimiento?.caja_id || "");
  const [fecha, setFecha] = useState(movimiento?.fecha || new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const handleGuardar = async () => {
    if (!monto || Number(monto) <= 0) { setToast({ tipo: "warning", mensaje: "Monto inválido" }); return; }
    if (tipo === "gasto" && !categoria) { setToast({ tipo: "warning", mensaje: "Selecciona una categoría" }); return; }
    if (!descripcion) { setToast({ tipo: "warning", mensaje: "Agrega una descripción" }); return; }

    setLoading(true);
    try {
      const caja = cajas.find(c => c.id === cajaId);
      const targetRetiroNum = parsearNumeroRetiro(numeroRetiro || configRetiro?.edicion || 1);

      const data = {
        tipo, 
        monto: Number(monto), 
        moneda: monedaActiva,
        descripcion, 
        categoria,
        metodo_pago: metodoPago, 
        caja_id: cajaId || null, 
        caja_nombre: caja?.nombre || null,
        fecha, 
        numero_retiro: targetRetiroNum,
        equipo_id: equipoIdActivo,
        comunidad_id: equipoIdActivo,
        retiro_id: equipoIdActivo,
        registrado_por: currentUser?.nombre || currentUser?.email,
      };
      if (esEdicion) {
        await base44.entities.MovimientoFinanciero.update(movimiento.id, data);
        await registrarAuditoria("editar_movimiento", { id: movimiento.id, ...data });
      } else {
        await base44.entities.MovimientoFinanciero.create(data);
        await registrarAuditoria("crear_movimiento", data);
      }
      setToast({ tipo: "success", mensaje: esEdicion ? "Movimiento actualizado" : "Movimiento registrado" });
      onGuardado();
    } catch (e) {
      setToast({ tipo: "error", mensaje: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            {esEdicion ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            {esEdicion ? "Editar Movimiento" : "Nuevo Movimiento"} ({monedaActiva})
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium text-gray-700 mb-2 block">Tipo de Movimiento</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_MOVIMIENTO.filter(t => t.tipo === "gasto" || !esEdicion).map(t => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={`p-2 rounded-lg border text-[11px] font-medium transition ${
                    tipo === t.value
                      ? t.tipo === "gasto" ? "bg-red-100 border-red-500 text-red-700" : "bg-green-100 border-green-500 text-green-700"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <InputMoneda label={`Monto (${monedaActiva})`} value={monto} onChange={setMonto} moneda={monedaActiva} />
          </div>

          <div>
            <label className="text-[11px] font-medium text-gray-700 mb-1 block">Descripción *</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Compra de alimentos o donación"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          {tipo === "gasto" && (
            <div>
              <label className="text-[11px] font-medium text-gray-700 mb-2 block">Categoría *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CATEGORIAS_GASTO.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCategoria(c.value)}
                    className={`p-2 rounded-lg border text-[11px] font-medium transition ${
                      categoria === c.value ? `bg-${c.color}-100 border-${c.color}-500 text-${c.color}-700` : "bg-white border-gray-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-gray-700 mb-1 block">Método de Pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs">
                {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-700 mb-1 block">Caja</label>
              <select value={cajaId} onChange={(e) => setCajaId(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs">
                <option value="">Sin asignar</option>
                {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-gray-700 mb-1 block">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-2 justify-end sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
          <button onClick={handleGuardar} disabled={loading} className="px-3 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg disabled:opacity-50">
            {loading ? "Guardando..." : esEdicion ? "Actualizar" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalCobro({ tipo, precioFicha, monedaActiva, numeroRetiro, currentUser, equipoIdActivo, onClose, onGuardado, registrarAuditoria, setToast, caminantes, servidores, cajas, configRetiro }) {
  const lista = tipo === "caminante" ? caminantes : servidores;
  const tipoLabel = tipo === "caminante" ? "Caminante" : "Servidor";
  
  const [idsCobrados, setIdsCobrados] = useState(new Set());
  const [seleccionados, setSeleccionados] = useState({});
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [patrocinador, setPatrocinador] = useState("");
  const [cajaId, setCajaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [montoPersonalizado, setMontoPersonalizado] = useState({});
  const [busquedaModal, setBusquedaModal] = useState("");

  const esPagadoValido = (p) => 
    p.pago_ficha === "Pagado" || 
    p.estado_pago === "Pagado" || 
    p.pago === "Pagado" || 
    p.status_pago === "Pagado" ||
    (p.monto_pendiente !== undefined && Number(p.monto_pendiente) <= 0);

  const pendientes = (lista || []).filter(p => 
    !esPagadoValido(p) && 
    !idsCobrados.has(p.id)
  );

  const pendientesFiltrados = pendientes.filter(p => {
    if (!busquedaModal.trim()) return true;
    const q = busquedaModal.toLowerCase().trim();
    const nom = (p.nombre || p.nombre_completo || "").toLowerCase();
    const tel = (p.telefono || "").toLowerCase();
    const par = (p.parroquia || "").toLowerCase();
    const ap = (p.apodo || "").toLowerCase();
    return nom.includes(q) || tel.includes(q) || par.includes(q) || ap.includes(q);
  });

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalSeleccionados = Object.keys(seleccionados).filter(id => seleccionados[id]).length;
  const totalMonto = Object.entries(seleccionados).reduce((acc, [id, sel]) => {
    if (!sel) return acc;
    const persona = lista.find(p => p.id === id);
    const personalizado = montoPersonalizado[id];
    const monto = personalizado ? Number(personalizado) : Number(persona?.monto_pendiente || precioFicha);
    return acc + monto;
  }, 0);

  const handleCobrar = async () => {
    if (totalSeleccionados === 0) { 
      setToast({ tipo: "warning", mensaje: "Selecciona al menos una persona" }); 
      return; 
    }

    setLoading(true);
    try {
      const ids = Object.keys(seleccionados).filter(id => seleccionados[id]);
      const caja = cajas.find(c => c.id === cajaId);

      setIdsCobrados(prev => new Set([...prev, ...ids]));
      
      setSeleccionados(prev => {
        const nuevo = { ...prev };
        ids.forEach(id => delete nuevo[id]);
        return nuevo;
      });

      let ultimacobrada = null;

      for (const id of ids) {
        // 🛡️ Búsqueda segura por ID, ID interno o coincidencia de cédula/nombre
        const persona = lista.find(p => 
          p.id === id || 
          String(p.id) === String(id) || 
          p._id === id || 
          (p.cedula && String(id).includes(String(p.cedula)))
        );

        if (!persona) continue;

        const realId = persona.id || persona._id || id;
        const personalizado = montoPersonalizado[id] || montoPersonalizado[realId];
        const montoCobrar = (personalizado && !isNaN(Number(personalizado)) && Number(personalizado) > 0)
          ? Number(personalizado)
          : Number(persona.monto_pendiente !== undefined ? persona.monto_pendiente : precioFicha) || Number(precioFicha) || 0;

        const abonadoAnterior = Number(persona.monto_abonado) || 0;
        const nuevoAbono = abonadoAnterior + montoCobrar;
        const totalFicha = Number(precioFicha) || Number(persona.monto_total) || nuevoAbono;
        const saldoRestante = Math.max(0, totalFicha - nuevoAbono);
        const pagoCompleto = saldoRestante <= 0;

        const targetRetiroNum = parsearNumeroRetiro(
          persona.numero_retiro || numeroRetiro || configRetiro?.edicion || 1
        );

        const nombrePersona = persona.nombre || persona.nombre_completo || "Participante";

        // 1. REGISTRAR MOVIMIENTO FINANCIERO EN FINANZAS (SAFE)
        try {
          await base44.entities.MovimientoFinanciero.create({
            tipo: tipo === "caminante" ? "cuota_caminante" : "cuota_servidor",
            monto: montoCobrar,
            moneda: monedaActiva,
            descripcion: pagoCompleto 
              ? `Pago completo de ficha (${tipoLabel})` 
              : `Abono parcial de ficha (${tipoLabel}): ${monedaActiva} ${fmt(montoCobrar)} de ${monedaActiva} ${fmt(totalFicha)}`,
            metodo_pago: metodoPago, 
            patrocinador: metodoPago === "Patrocinado" ? patrocinador : "",
            caja_id: cajaId || null, 
            caja_nombre: caja?.nombre || null,
            caminante_id: String(realId), 
            caminante_nombre: nombrePersona,
            numero_retiro: targetRetiroNum, 
            equipo_id: equipoIdActivo,
            comunidad_id: equipoIdActivo,
            retiro_id: equipoIdActivo,
            fecha: new Date().toISOString().split("T")[0],
            registrado_por: currentUser?.nombre || currentUser?.email || "Tesorería Emaús",
          });
        } catch (errMov) {
          console.warn("Error creando MovimientoFinanciero:", errMov);
        }

        // 2. ACTUALIZACIÓN MULTI-TABLA RESILIENTE (Caminante, Servidor o InscripcionRemota)
        const updatePayload = {
          monto_abonado: nuevoAbono,
          monto_pendiente: saldoRestante,
          pago_ficha: pagoCompleto ? "Pagado" : "Parcial",
          estado_pago: pagoCompleto ? "Pagado" : "Parcial",
          pago: pagoCompleto ? "Pagado" : "Parcial",
          status_pago: pagoCompleto ? "Pagado" : "Parcial",
          estado: pagoCompleto ? "Confirmado" : (nuevoAbono > 0 ? "Parcial" : "Pendiente"),
          confirmado: true,
          estatus: pagoCompleto ? "Confirmado" : "Pendiente",
        };

        const targetEntity = tipo === "caminante" ? base44.entities.Caminante : base44.entities.Servidor;
        let exitoUpdate = false;

        if (realId && !String(realId).startsWith("ced_") && !String(realId).startsWith("nom_")) {
          try {
            await targetEntity.update(realId, updatePayload);
            exitoUpdate = true;
          } catch (e) {
            console.warn(`Fallback update ${tipo}:`, e);
          }
        }

        // Si es un registro que provenía de InscripcionRemota o falló el update principal
        if (persona.inscripcion_remota_id || persona.inscripcion_id || persona._tipo === "InscripcionRemota" || !exitoUpdate) {
          const remId = persona.inscripcion_remota_id || persona.inscripcion_id || realId;
          if (remId && base44.entities.InscripcionRemota?.update) {
            await base44.entities.InscripcionRemota.update(remId, updatePayload).catch(() => null);
          }
        }

        ultimacobrada = {
          personaNombre: nombrePersona,
          tipoPersona: tipoLabel,
          montoCobrado: montoCobrar,
          nuevoAbono,
          montoTotal: totalFicha,
          saldoRestante,
          metodoPago,
          patrocinador: metodoPago === "Patrocinado" ? patrocinador : "",
          cajaNombre: caja?.nombre || "",
          configRetiro,
          moneda: monedaActiva,
          registradoPor: currentUser?.nombre || currentUser?.email || "Tesorería Emaús"
        };
      }

      await registrarAuditoria("cobrar_ficha", { tipo, cantidad: ids.length, monto: totalMonto, moneda: monedaActiva, metodo: metodoPago });
      setToast({ tipo: "success", mensaje: `✅ Cobrado y confirmado a ${ids.length} persona${ids.length > 1 ? "s" : ""} en ${monedaActiva}.` });

      if (ultimacobrada && ids.length === 1) {
        try {
          imprimirReciboPago(ultimacobrada);
        } catch (errRecibo) {
          console.warn("Impresión de recibo omitida:", errRecibo);
        }
      }

      if (onGuardado) onGuardado();
    } catch (e) {
      setToast({ tipo: "error", mensaje: e.message || "Error al procesar el cobro" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-amber-700 to-amber-800 text-white flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Cobrar Fichas - {tipoLabel}s ({monedaActiva})
            </h3>
            <p className="text-[11px] opacity-90 mt-0.5">Moneda oficial asignada desde configuración: <strong>{monedaActiva}</strong></p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-gray-700 mb-1 block">Método de Pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs">
                {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-700 mb-1 block">Caja destino</label>
              <select value={cajaId} onChange={(e) => setCajaId(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs">
                <option value="">Sin asignar</option>
                {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-gray-700">
                  Pendientes de Pago ({pendientesFiltrados.length} de {pendientes.length})
                </span>
                {totalSeleccionados > 0 && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    {totalSeleccionados} seleccionado{totalSeleccionados > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* 🔍 BUSCADOR EN TIEMPO REAL */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busquedaModal}
                  onChange={(e) => setBusquedaModal(e.target.value)}
                  placeholder={`🔍 Buscar ${tipoLabel} por nombre, apodo, teléfono o parroquia...`}
                  className="w-full pl-8 pr-7 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
                {busquedaModal && (
                  <button
                    onClick={() => setBusquedaModal("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {pendientesFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  {pendientes.length === 0 ? (
                    <>
                      <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-xs font-medium">¡No hay cuentas pendientes!</p>
                    </>
                  ) : (
                    <>
                      <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-xs font-medium">No se encontraron {tipoLabel}s para "{busquedaModal}"</p>
                    </>
                  )}
                </div>
              ) : pendientesFiltrados.map(p => (
                <div key={p.id} className={`px-3 py-2 border-b border-gray-100 flex items-center gap-3 ${seleccionados[p.id] ? "bg-amber-50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={!!seleccionados[p.id]}
                    onChange={() => toggleSeleccion(p.id)}
                    className="w-4 h-4 accent-amber-700"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-800">{p.nombre || p.nombre_completo}</p>
                    <p className="text-[10px] text-gray-500">
                      Pendiente: <strong className="text-red-600 font-bold">{monedaActiva} {fmt(p.monto_pendiente || precioFicha)}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-600 font-medium">{totalSeleccionados} seleccionado{totalSeleccionados !== 1 ? "s" : ""}</span>
            <span className="text-lg font-bold text-amber-900">{monedaActiva} {fmt(totalMonto)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg">Cancelar</button>
            <button onClick={handleCobrar} disabled={loading || totalSeleccionados === 0} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg disabled:opacity-50 shadow">
              <Printer className="w-3.5 h-3.5" />
              {loading ? "Procesando..." : "Cobrar e Imprimir Recibo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalCajas({ cajas, moneda, equipoIdActivo, onClose, onGuardado, registrarAuditoria, setToast }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("efectivo");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCrear = async () => {
    if (!nombre) { setToast({ tipo: "warning", mensaje: "Nombre requerido" }); return; }
    setLoading(true);
    try {
      await base44.entities.Caja.create({
        nombre, tipo, saldo_inicial: Number(saldoInicial) || 0,
        saldo_actual: Number(saldoInicial) || 0, activa: true,
        moneda: moneda || "RD$",
        equipo_id: equipoIdActivo,
      });
      await registrarAuditoria("crear_caja", { nombre, tipo, moneda });
      setToast({ tipo: "success", mensaje: "Caja creada" });
      setNombre(""); setSaldoInicial("");
      onGuardado();
    } catch (e) {
      setToast({ tipo: "error", mensaje: "Error: " + e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-700" /> Gestión de Cajas ({moneda})
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-medium text-gray-700 mb-1 block">Cajas existentes en esta comunidad</label>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {cajas.length === 0 ? <p className="text-[11px] text-gray-500">No hay cajas</p> :
                cajas.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-[11px]">
                    <span className="font-medium">{c.nombre} ({c.tipo})</span>
                    <span className="text-green-700 font-bold">{c.moneda || moneda} {fmt(c.saldo_actual || 0)}</span>
                  </div>
                ))
              }
            </div>
          </div>
          <div className="border-t border-gray-200 pt-3">
            <p className="text-[11px] font-bold text-gray-700 mb-2">Crear nueva caja</p>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la caja"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs mb-2"
            />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-xs">
                <option value="efectivo">💵 Efectivo</option>
                <option value="banco">🏦 Banco</option>
              </select>
              <InputMoneda value={saldoInicial} onChange={setSaldoInicial} placeholder="Saldo inicial" moneda={moneda} />
            </div>
            <button onClick={handleCrear} disabled={loading} className="w-full px-3 py-2 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg disabled:opacity-50">
              {loading ? "Creando..." : "Crear Caja"}
            </button>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button onClick={onClose} className="w-full px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function ModalReversarTransaccion({ movimiento, monedaActiva, onClose, onGuardado, currentUser, config, registrarAuditoria, setToast, caminantes, servidores }) {
  const [codigoIngresado, setCodigoIngresado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  if (!movimiento) return null;

  const handleConfirmarReversal = async (e) => {
    e.preventDefault();
    if (!codigoIngresado.trim()) {
      setToast({ tipo: "warning", mensaje: "Por favor ingresa tu código de autorización o clave de acceso." });
      return;
    }

    // 🔐 VALIDACIÓN DEL CÓDIGO DE AUTORIZACIÓN / CLAVE DE ACCESO AL SISTEMA
    const ing = String(codigoIngresado).trim().toLowerCase();
    
    // Obtener claves asociadas al usuario actual
    const clavesUsuario = [
      currentUser?.codigo_autorizacion,
      currentUser?.codigo_acceso,
      currentUser?.pin,
      currentUser?.pin_acceso,
      currentUser?.clave,
      currentUser?.password,
      currentUser?.codigo,
      currentUser?.cedula,
    ].filter(Boolean).map(x => String(x).trim().toLowerCase());

    // Obtener claves globales de respaldo
    const clavesSistema = [
      localStorage.getItem("emaus_codigo_autorizacion"),
      localStorage.getItem("emaus_codigo_acceso"),
      localStorage.getItem("emaus_pin_acceso"),
      localStorage.getItem("emaus_clave"),
      config?.codigo_autorizacion,
      "emaus2026",
      "1234"
    ].filter(Boolean).map(x => String(x).trim().toLowerCase());

    const esValido = (clavesUsuario.length > 0 && clavesUsuario.includes(ing)) || clavesSistema.includes(ing);

    if (!esValido) {
      setToast({ tipo: "error", mensaje: "🔒 Código de autorización o clave de acceso incorrecta." });
      return;
    }

    setLoading(true);
    try {
      const montoOriginal = Number(movimiento.monto) || 0;
      const personaId = movimiento.caminante_id;

      // 1. SI ES PAGO DE FICHA (CAMINANTE O SERVIDOR), REVERSAR EL PAGO DEL PARTICIPANTE
      if (personaId && (movimiento.tipo === "cuota_caminante" || movimiento.tipo === "cuota_servidor" || movimiento.tipo === "abono")) {
        const esCam = movimiento.tipo === "cuota_caminante";
        const listaPersonas = esCam ? caminantes : servidores;
        const persona = (listaPersonas || []).find(p => String(p.id) === String(personaId));

        if (persona) {
          const abonadoPrev = Number(persona.monto_abonado) || 0;
          const pendientePrev = Number(persona.monto_pendiente) || 0;

          const nuevoAbonado = Math.max(0, abonadoPrev - montoOriginal);
          const nuevoPendiente = pendientePrev + montoOriginal;

          const nuevoEstado = nuevoAbonado <= 0 ? "Pendiente" : "Parcial";

          const updatePayload = {
            monto_abonado: nuevoAbonado,
            monto_pendiente: nuevoPendiente,
            pago_ficha: nuevoEstado,
            estado_pago: nuevoEstado,
            pago: nuevoEstado,
            status_pago: nuevoEstado,
            estado: nuevoEstado,
          };

          const entity = esCam ? base44.entities.Caminante : base44.entities.Servidor;
          if (entity?.update) {
            await entity.update(personaId, updatePayload).catch(() => {});
          }

          // Actualizar localStorage
          try {
            const storeKey = esCam ? "emaus_caminantes" : "emaus_servidores";
            const loc = JSON.parse(localStorage.getItem(storeKey) || "[]");
            const idx = loc.findIndex(x => String(x.id) === String(personaId));
            if (idx !== -1) {
              loc[idx] = { ...loc[idx], ...updatePayload };
              localStorage.setItem(storeKey, JSON.stringify(loc));
            }
          } catch {}
        }
      }

      // 2. MARCAR MOVIMIENTO ORIGINAL COMO REVERSADO
      if (base44.entities.MovimientoFinanciero?.update) {
        await base44.entities.MovimientoFinanciero.update(movimiento.id, {
          es_reversado: true,
          reversado_por: currentUser?.nombre || currentUser?.email || "Usuario",
          motivo_reversal: motivo.trim() || "Reversal autorizado",
          fecha_reversal: new Date().toISOString(),
        }).catch(() => {});
      }

      // 3. CREAR ENTRADA DE MOVIMIENTO REVERSAL PARA CONTRARRESTAR BALANCE
      if (base44.entities.MovimientoFinanciero?.create) {
        await base44.entities.MovimientoFinanciero.create({
          tipo: "reversal",
          monto: -montoOriginal,
          moneda: movimiento.moneda || monedaActiva,
          descripcion: `🔄 REVERSAL DE TRANSACCIÓN: ${movimiento.descripcion || movimiento.caminante_nombre || 'Movimiento'} ${motivo ? `(${motivo})` : ''}`,
          categoria: movimiento.categoria || "reversal",
          metodo_pago: movimiento.metodo_pago || "Efectivo",
          caja_id: movimiento.caja_id || null,
          caja_nombre: movimiento.caja_nombre || null,
          caminante_id: movimiento.caminante_id || null,
          caminante_nombre: movimiento.caminante_nombre || null,
          numero_retiro: movimiento.numero_retiro || 1,
          equipo_id: movimiento.equipo_id || null,
          comunidad_id: movimiento.comunidad_id || null,
          fecha: new Date().toISOString().split("T")[0],
          registrado_por: currentUser?.nombre || currentUser?.email || "Usuario",
          es_reversado: true,
          reversal_de_id: movimiento.id,
        }).catch(() => {});
      }

      // 4. REGISTRAR EN AUDITORÍA
      await registrarAuditoria("reversar_transaccion", {
        movimiento_id: movimiento.id,
        monto: montoOriginal,
        moneda: movimiento.moneda || monedaActiva,
        motivo: motivo.trim() || "Autorizado con código",
        usuario: currentUser?.nombre || currentUser?.email,
        fecha: new Date().toISOString(),
      });

      setToast({ tipo: "success", mensaje: `🔄 Transacción de ${movimiento.moneda || monedaActiva} ${fmt(montoOriginal)} reversada exitosamente.` });
      onGuardado();
    } catch (err) {
      setToast({ tipo: "error", mensaje: "Error al reversar la transacción: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
        <div className="bg-gradient-to-r from-red-700 to-amber-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Reversar Transacción</h3>
              <p className="text-[10px] text-amber-200">Requiere Código de Autorización / Clave de Acceso</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmarReversal} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Descripción:</span>
              <strong className="text-gray-900">{movimiento.descripcion || movimiento.caminante_nombre || movimiento.tipo}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Monto:</span>
              <span className="font-extrabold text-red-700 text-sm">{movimiento.moneda || monedaActiva} {fmt(movimiento.monto)}</span>
            </div>
            {movimiento.caminante_nombre && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Participante:</span>
                <span className="font-bold text-gray-800">{movimiento.caminante_nombre}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Fecha:</span>
              <span className="text-gray-700">{movimiento.fecha || "—"}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-gray-800 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-red-600" /> Código de Autorización / Clave de Acceso *
            </label>
            <input
              type="password"
              required
              value={codigoIngresado}
              onChange={e => setCodigoIngresado(e.target.value)}
              placeholder="Ingresa tu clave de acceso o código PIN..."
              className="w-full border-2 border-red-200 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50/20"
            />
            <p className="text-[10px] text-gray-500 mt-1">Usa la misma clave o código con el que inicias sesión en el sistema.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Motivo del Reversal (Opcional)</label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Cobro duplicado, error de digitación..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !codigoIngresado.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {loading ? "Reversando..." : "Confirmar Reversal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}