import { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, Search, Filter, Calendar, User, Eye, Download, 
  FileSpreadsheet, RefreshCw, Activity, CheckCircle2, AlertTriangle, 
  Clock, ArrowRight, X, Sparkles, Layers, Lock, ShieldAlert, FileText, Printer
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { obtenerLogsAuditoriaLocal } from "@/utils/auditLogger";
import { formatFecha } from "@/utils/formatters";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

const MODULOS = [
  "Todos",
  "Inscripciones",
  "Caminantes",
  "Servidores",
  "Finanzas",
  "Distribución",
  "Usuarios",
  "Configuración"
];

const ACCIONES = [
  "Todas",
  "APROBACION",
  "CREACION",
  "MODIFICACION",
  "PAGO",
  "ELIMINACION"
];

export default function BitacoraAuditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("Todos");
  const [filtroAccion, setFiltroAccion] = useState("Todas");
  const [logSeleccionado, setLogSeleccionado] = useState(null);

  useEffect(() => {
    cargarLogs();

    const handleLogAdded = (e) => {
      if (e.detail) {
        setLogs(prev => [e.detail, ...prev]);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        cargarLogs();
      }
    };

    window.addEventListener("emaus_audit_log_added", handleLogAdded);
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        cargarLogs();
      }
    }, 10000);

    return () => {
      window.removeEventListener("emaus_audit_log_added", handleLogAdded);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  const cargarLogs = async () => {
    setLoading(true);
    try {
      // 1. Cargar desde API Base44 (BitacoraAuditoria y AuditLog centralizados)
      const [dbLogs1, dbLogs2] = await Promise.all([
        base44.entities.BitacoraAuditoria?.list("-fecha_hora").catch(() => []) || [],
        base44.entities.AuditLog?.list("-created_date").catch(() => []) || [],
      ]);

      // Normalizar registros de AuditLog a formato BitacoraAuditoria
      const dbLogs2Normalizados = (dbLogs2 || []).map(l => ({
        id: l.id || `audit-${l.created_date || Date.now()}`,
        fecha_hora: l.fecha_hora || l.created_date || l.created_at || new Date().toISOString(),
        usuario_email: l.usuario_email || "Sistema",
        usuario_nombre: l.usuario_nombre || l.usuario_email || "Usuario",
        accion: (l.accion || "MODIFICACION").toUpperCase(),
        modulo: l.entidad || l.modulo || "General",
        detalle: l.detalles || l.detalle || "",
        entidad: l.entidad || "General",
        entidad_id: l.equipo_id || l.entidad_id || ""
      }));
      
      // 2. Cargar desde LocalStorage
      const localLogs = obtenerLogsAuditoriaLocal();

      // Fusionar y deduplicar por id o fecha + usuario + detalle
      const unificadosMap = new Map();

      [...dbLogs1, ...dbLogs2Normalizados, ...localLogs].forEach(l => {
        if (l) {
          const key = l.id || `${l.usuario_email}_${l.fecha_hora}_${l.detalle}`;
          if (!unificadosMap.has(key)) {
            unificadosMap.set(key, l);
          }
        }
      });

      const unificados = Array.from(unificadosMap.values()).sort((a, b) => 
        new Date(b.fecha_hora || 0) - new Date(a.fecha_hora || 0)
      );

      setLogs(unificados);
    } catch (e) {
      console.error("Error al cargar la bitácora de auditoría:", e);
      setLogs(obtenerLogsAuditoriaLocal());
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de logs
  const logsFiltrados = useMemo(() => {
    return logs.filter(l => {
      const coincideMod = filtroModulo === "Todos" || l.modulo === filtroModulo;
      const coincideAcc = filtroAccion === "Todas" || l.accion === filtroAccion;

      const q = busqueda.toLowerCase().trim();
      const coincideBusqueda = !q || 
        String(l.usuario_nombre || "").toLowerCase().includes(q) ||
        String(l.usuario_email || "").toLowerCase().includes(q) ||
        String(l.detalle || "").toLowerCase().includes(q) ||
        String(l.entidad || "").toLowerCase().includes(q);

      return coincideMod && coincideAcc && coincideBusqueda;
    });
  }, [logs, filtroModulo, filtroAccion, busqueda]);

  // Cálculos estadísticos KPI
  const kpis = useMemo(() => {
    const total = logs.length;
    const hoyStr = new Date().toISOString().split("T")[0];
    const hoyCount = logs.filter(l => String(l.fecha_hora).startsWith(hoyStr)).length;
    const aprobacionesCount = logs.filter(l => l.accion === "APROBACION" || l.accion === "PAGO").length;
    const usuariosActivos = new Set(logs.map(l => l.usuario_email || l.usuario_nombre)).size;

    return { total, hoyCount, aprobacionesCount, usuariosActivos };
  }, [logs]);

  // Exportar a Excel
  const handleExportarExcel = () => {
    try {
      const dataExcel = logsFiltrados.map(l => ({
        "Fecha y Hora": l.fecha_hora ? new Date(l.fecha_hora).toLocaleString("es-DO") : "",
        "Usuario": l.usuario_nombre || l.usuario_email || "Sistema",
        "Email": l.usuario_email || "",
        "Acción": l.accion,
        "Módulo": l.modulo,
        "Detalle": l.detalle,
        "Entidad Afectada": l.entidad || ""
      }));

      const ws = XLSX.utils.json_to_sheet(dataExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Auditoría");
      XLSX.writeFile(wb, `Bitacora_Auditoria_Emaus_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Bitácora exportada a Excel correctamente.");
    } catch (e) {
      console.error("Error al exportar Excel:", e);
      toast.error("No se pudo exportar el archivo Excel.");
    }
  };

  const getBadgeColor = (accion) => {
    switch (accion) {
      case "APROBACION":
      case "PAGO":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "CREACION":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "MODIFICACION":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "ELIMINACION":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-3 sm:p-6 flex flex-col gap-5">
      
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-amber-500/30 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white shadow-lg shrink-0 border border-amber-400/30">
            <ShieldCheck className="w-6 h-6 text-amber-200" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Bitácora de Auditoría y Control <Sparkles className="w-4 h-4 text-amber-400" />
            </h1>
            <p className="text-xs text-amber-200/80 font-medium">
              Registro histórico y trazabilidad en tiempo real de todas las acciones del sistema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={cargarLogs}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 transition cursor-pointer"
            title="Recargar Bitácora"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportarExcel}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar a Excel
          </button>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Total Eventos Auditar</span>
          <h2 className="text-2xl font-black text-white font-mono mt-0.5">{kpis.total}</h2>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Acciones Hoy</span>
          <h2 className="text-2xl font-black text-amber-300 font-mono mt-0.5">{kpis.hoyCount}</h2>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Aprobaciones y Pagos</span>
          <h2 className="text-2xl font-black text-emerald-400 font-mono mt-0.5">{kpis.aprobacionesCount}</h2>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Usuarios Activos</span>
          <h2 className="text-2xl font-black text-blue-400 font-mono mt-0.5">{kpis.usuariosActivos}</h2>
        </div>
      </div>

      {/* BARRA DE FILTROS AVANZADOS */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-3">
        
        {/* BUSCADOR */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por usuario, cédula o detalle..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* FILTRO MÓDULO */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold shrink-0">Módulo:</span>
          <select
            value={filtroModulo}
            onChange={(e) => setFiltroModulo(e.target.value)}
            className="w-full md:w-auto bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none"
          >
            {MODULOS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* FILTRO ACCIÓN */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold shrink-0">Acción:</span>
          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="w-full md:w-auto bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold focus:outline-none"
          >
            {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

      </div>

      {/* TABLA PRINCIPAL DE AUDITORÍA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                <th className="p-3.5">Fecha y Hora</th>
                <th className="p-3.5">Usuario</th>
                <th className="p-3.5">Acción</th>
                <th className="p-3.5">Módulo</th>
                <th className="p-3.5">Detalle del Cambio</th>
                <th className="p-3.5 text-center">Cambios / Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {logsFiltrados.length > 0 ? (
                logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500/80" />
                        {log.fecha_hora ? new Date(log.fecha_hora).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "medium" }) : "N/A"}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-white leading-tight">
                        {log.usuario_nombre || "Usuario"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.usuario_email || "Sistema"}
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black border uppercase ${getBadgeColor(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>

                    <td className="p-3.5 font-semibold text-slate-300 whitespace-nowrap">
                      {log.modulo || "General"}
                    </td>

                    <td className="p-3.5 text-slate-200 max-w-md truncate">
                      {log.detalle}
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      {(log.datos_previos || log.datos_nuevos) ? (
                        <button
                          onClick={() => setLogSeleccionado(log)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 text-[11px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-amber-400" /> Ver Diff
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">Sin datos</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    No se encontraron registros de auditoría que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE COMPARACIÓN DE CAMBIOS (DIFF VIEWER) */}
      {logSeleccionado && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden font-sans text-slate-100 animate-in fade-in zoom-in-95">
            
            <div className="bg-gradient-to-r from-amber-950 to-slate-900 p-4 flex items-center justify-between border-b border-amber-500/30">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Detalle y Comparación de Cambios (Audit Diff)
              </h3>
              <button onClick={() => setLogSeleccionado(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                <p><strong className="text-amber-300">Usuario:</strong> {logSeleccionado.usuario_nombre} ({logSeleccionado.usuario_email})</p>
                <p><strong className="text-amber-300">Acción:</strong> {logSeleccionado.accion} en {logSeleccionado.modulo}</p>
                <p><strong className="text-amber-300">Detalle:</strong> {logSeleccionado.detalle}</p>
                <p><strong className="text-amber-300">Fecha:</strong> {new Date(logSeleccionado.fecha_hora).toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Datos Previos */}
                <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/30">
                  <h4 className="text-xs font-bold text-rose-300 mb-2 uppercase tracking-wider flex items-center gap-1">
                    🔴 Estado Anterior
                  </h4>
                  <pre className="text-[10px] font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg overflow-x-auto leading-relaxed max-h-56">
                    {logSeleccionado.datos_previos 
                      ? JSON.stringify(JSON.parse(logSeleccionado.datos_previos), null, 2) 
                      : "Sin datos previos"}
                  </pre>
                </div>

                {/* Datos Nuevos */}
                <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
                  <h4 className="text-xs font-bold text-emerald-300 mb-2 uppercase tracking-wider flex items-center gap-1">
                    🟢 Estado Nuevo
                  </h4>
                  <pre className="text-[10px] font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg overflow-x-auto leading-relaxed max-h-56">
                    {logSeleccionado.datos_nuevos 
                      ? JSON.stringify(JSON.parse(logSeleccionado.datos_nuevos), null, 2) 
                      : "Sin datos nuevos"}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setLogSeleccionado(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
