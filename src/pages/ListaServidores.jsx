import { useState, useEffect, useCallback } from "react";
import { parseFechaSegura } from "@/utils/formatters";
import { 
  PlusCircle, Search, Pencil, Trash2, Printer, X, Wifi, WifiOff, 
  ArrowUpDown, Receipt, FileSpreadsheet, Download, Upload, CheckCircle2, Table, FileText,
  RefreshCw, Activity
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import ImpresionIndividualModal from "@/components/ImpresionIndividualModal";
import EditarServidorModal from "@/components/servidores/EditarServidorModal";
import ConfirmacionPagoEditModal from "@/components/cobros/ConfirmacionPagoEditModal";
import ReciboPagoModal from "@/components/cobros/ReciboPagoModal";
import PullToRefresh from "@/components/PullToRefresh";
import MobileSelect from "@/components/MobileSelect";
import SelectorComunidad from "@/components/SelectorComunidad";
import { AnimatePresence } from "framer-motion";
import useOffline from "@/hooks/useOffline";
import { usePermiso } from "@/hooks/usePermiso";
import { registrarAccionAuditoria } from "@/utils/auditLogger";
import { useAuth } from "@/lib/AuthContext";
import { useComunidad } from "@/lib/ComunidadContext";
import { toast } from "sonner";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const APP_CREATOR_EMAIL = "ccanario0687@gmail.com";
const POLLING_INTERVAL = 5000;

const COLUMNAS_SERVIDORES_EXCEL = [
  "nombre", "cedula", "apodo", "fecha_nacimiento", "edad", "genero", "estado_civil", 
  "telefono", "email", "lugares_servido", "pais", "provincia", "diocesis", 
  "parroquia", "municipio", "sector", "calle", "contacto_emergencia", 
  "relacion_emergencia", "telefono_emergencia", "necesidades_medicas"
];

const ROLES_ORDEN = [
  "Rector", "Sub-Rector", "Jefe de Servidores", "Servidor de Mesa",
  "Músico", "Cocina", "Logística", "Coordinador", "Otro"
];

function EncabezadoRetiro({ configRetiro, modoReporte, comunidadNombre }) {
  const nombreRetiro = comunidadNombre || configRetiro?.nombre || configRetiro?.nombre_retiro || "RETIRO DE EMAÚS";
  const numeroRetiro = configRetiro?.numero_retiro || configRetiro?.numero || "";
  const temaRetiro = configRetiro?.tema || configRetiro?.lema || "";
  const lugarRetiro = configRetiro?.lugar || configRetiro?.ubicacion || "";
  const fechaInicio = configRetiro?.fecha_inicio || configRetiro?.inicio;
  const fechaFin = configRetiro?.fecha_fin || configRetiro?.fin;

  const formatoFecha = (fecha) => {
    if (!fecha) return null;
    try {
      const d = parseFechaSegura(fecha);
      return d ? d.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : fecha;
    } catch { return fecha; }
  };

  return (
    <div className="hidden print:block mb-4 text-center leading-tight">
      <h1 className="text-xl font-semibold text-gray-900 uppercase tracking-wide mb-1">
        {nombreRetiro}
      </h1>
      
      <div className="flex flex-col items-center gap-0.5 mb-3">
        {numeroRetiro && (
          <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            {numeroRetiro}ª Edición
          </span>
        )}
        {temaRetiro && (
          <span className="text-sm font-normal italic text-gray-600">
            "{temaRetiro}"
          </span>
        )}
      </div>

      <div className="border-t border-gray-400 pt-2 mb-3">
        <div className="flex justify-center gap-6 text-xs text-gray-700">
          {lugarRetiro && (
            <span className="flex items-center gap-1">
              <strong>Lugar:</strong> {lugarRetiro}
            </span>
          )}
          {(fechaInicio || fechaFin) && (
            <span className="flex items-center gap-1">
              <strong>Fechas:</strong>{" "}
              {formatoFecha(fechaInicio)}
              {fechaInicio && fechaFin && " al "}
              {formatoFecha(fechaFin)}
            </span>
          )}
        </div>
      </div>

      <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide border-b border-gray-300 pb-1 mb-2">
        {modoReporte === "simple" ? "Listado General de Servidores" : "Listado de Servidores por Equipo"}
      </h2>
      
      <div className="text-right text-[10px] text-gray-500 italic">
        Generado: {new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

function ReporteListaSimple({ caminantes, onImprimir }) {
  return (
    <div className="print:mt-0">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <p className="text-sm text-amber-700 font-medium">{caminantes.length} servidor(es) en total</p>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow">
          <Printer className="w-4 h-4" /> Imprimir Listado
        </button>
      </div>

      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        <table className="w-full text-sm text-left table-fixed">
          <thead>
            <tr>
              <th className="px-3 py-2 w-10 text-center">#</th>
              <th className="px-3 py-2 w-[60%]">Nombre</th>
              <th className="px-3 py-2 w-[40%]">Parroquia / Equipo</th>
              <th className="px-3 py-2 text-center w-12 print:hidden">Imp.</th>
            </tr>
          </thead>
          <tbody>
            {caminantes.map((s, i) => (
              <tr key={s.id} className="print:break-inside-avoid">
                <td className="px-3 py-1.5 text-center text-gray-500 align-middle">{i + 1}</td>
                <td className="px-3 py-1.5 font-medium text-gray-800 align-middle">{s.nombre}</td>
                <td className="px-3 py-1.5 text-gray-600 align-middle">{s.rol || s.parroquia || "-"}</td>
                <td className="px-3 py-1.5 text-center align-middle print:hidden">
                  <button onClick={() => onImprimir(s)} className="text-amber-600 hover:text-amber-800"><Printer className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportePorEquipo({ caminantes, onImprimir }) {
  const grupos = ROLES_ORDEN.reduce((acc, rol) => {
    const miembros = caminantes.filter((s) => s.rol === rol);
    if (miembros.length > 0) acc[rol] = miembros;
    return acc;
  }, {});

  const rolesExtra = [...new Set(caminantes.map((s) => s.rol).filter((r) => r && !ROLES_ORDEN.includes(r)))];
  rolesExtra.forEach((rol) => {
    grupos[rol] = caminantes.filter((s) => s.rol === rol);
  });

  const sinRol = caminantes.filter((s) => !s.rol);
  if (sinRol.length > 0) grupos["Sin equipo asignado"] = sinRol;

  return (
    <div className="print:mt-0">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <p className="text-sm text-amber-700 font-medium">{caminantes.length} servidor(es)</p>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow">
          <Printer className="w-4 h-4" /> Imprimir Reporte
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(grupos).map(([rol, miembros]) => (
          <div key={rol} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none print:break-inside-avoid print:mb-4">
            <div className="grupo-rol-header flex justify-between items-center px-4 py-2">
              <span className="font-bold text-xs uppercase tracking-wide">{rol}</span>
              <span className="text-gray-600 text-xs font-medium">{miembros.length} persona(s)</span>
            </div>
            <table className="w-full text-sm text-left table-fixed">
              <thead>
                <tr>
                  <th className="px-3 py-1.5 w-10 text-center">#</th>
                  <th className="px-3 py-1.5 w-[55%]">Nombre</th>
                  <th className="px-3 py-1.5 w-[45%]">Parroquia</th>
                  <th className="px-3 py-1.5 text-center w-12 print:hidden">Imp.</th>
                </tr>
              </thead>
              <tbody>
                {miembros.map((s, i) => (
                  <tr key={s.id}>
                    <td className="px-3 py-1.5 text-center text-gray-400 align-middle">{i + 1}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-800 align-middle">{s.nombre}</td>
                    <td className="px-3 py-1.5 text-gray-600 align-middle">{s.parroquia || "-"}</td>
                    <td className="px-3 py-1.5 text-center align-middle print:hidden">
                      <button onClick={() => onImprimir(s)} className="text-amber-600 hover:text-amber-800"><Printer className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ListaServidores() {
  const { records: todosServidoresOffline, loading: loadingOffline, online, remove, reload: reloadOffline } = useOffline("Servidor");
  
  const [servidoresDirectos, setServidoresDirectos] = useState([]);
  const [loadingDirecto, setLoadingDirecto] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [orden, setOrden] = useState("nombre");
  const [vistaReporte, setVistaReporte] = useState(false);
  const [modoReporte, setModoReporte] = useState("simple");
  const [modalImportExportOpen, setModalImportExportOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [reciboPago, setReciboPago] = useState(null);
  const [configFin, setConfigFin] = useState(null);
  const [configRetiro, setConfigRetiro] = useState(null);
  
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState(null);
  const [versionDatos, setVersionDatos] = useState(0);
  
  const { user } = useAuth();
  const { puedeEditar } = usePermiso("servidores");
  const { comunidadActual, coincideComunidad, esVistaGlobal } = useComunidad();

  const esCreadorReal = Boolean(
    user?.email === APP_CREATOR_EMAIL || user?.es_creador === true
  );

  const cargarServidoresUnificados = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoadingDirecto(true);
    try {
      // 🚀 EJECUCIÓN EN PARALELO (Promise.all) PARA VELOCIDAD ULTRA RÁPIDA (reducción de 2.5s a ~300ms)
      const [r1, r2, rCaminantes, rRemotas] = await Promise.all([
        base44.entities.Servidor.list("-created_date").catch(() => []),
        base44.entities.Servidores?.list("-created_date").catch(() => []) || Promise.resolve([]),
        base44.entities.Caminante?.list().catch(() => []) || Promise.resolve([]),
        base44.entities.InscripcionRemota?.list().catch(() => []) || Promise.resolve([]),
      ]);

      let acumulados = [];

      if (Array.isArray(r1)) acumulados.push(...r1);
      if (Array.isArray(r2)) acumulados.push(...r2);

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
          const esAprobado = est === "aprobado" || est === "confirmado";
          const tipoStr = String(c.tipo || c.tipo_inscripcion || c.tipo_registro || c.rol_servidor || "").toLowerCase();
          const esServ = tipoStr.includes("servid") || c.es_servidor === true || Boolean(c.lugares_servido || c.rol_servidor || c.equipo_trabajo);
          return esAprobado && esServ;
        });
        acumulados.push(...soloServidoresRemotosAprobados);
      }

      if (Array.isArray(todosServidoresOffline) && todosServidoresOffline.length > 0) {
        acumulados.push(...todosServidoresOffline);
      }

      const mapaUnicos = new Map();
      acumulados.forEach(s => {
        if (!s) return;
        
        const cleanCed = s.cedula ? String(s.cedula).replace(/\D/g, "") : "";
        const cleanTel = s.telefono ? String(s.telefono).replace(/\D/g, "") : "";
        const cleanNom = s.nombre ? String(s.nombre).trim().toLowerCase() : "";
        const keyInscrip = s.inscripcion_id || s.inscripcion_remota_id ? String(s.inscripcion_id || s.inscripcion_remota_id) : null;

        let key = null;
        if (keyInscrip && mapaUnicos.has(keyInscrip)) {
          key = keyInscrip;
        } else if (cleanCed && mapaUnicos.has(`ced_${cleanCed}`)) {
          key = `ced_${cleanCed}`;
        } else if (cleanNom && cleanTel && mapaUnicos.has(`nom_${cleanNom}_${cleanTel}`)) {
          key = `nom_${cleanNom}_${cleanTel}`;
        } else {
          key = keyInscrip ? keyInscrip : (cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(s.id || s._id)));
        }

        const previo = mapaUnicos.get(key) || {};
        
        // 🎯 En la Lista de Servidores solo existen 2 estados oficiales: Pendiente (aprobado sin pagar) o Confirmado (pagado)
        const esPagado = (previo.pago_ficha === "Pagado" || s.pago_ficha === "Pagado" || previo.estado === "Confirmado" || s.estado === "Confirmado");
        const estadoUnico = esPagado ? "Confirmado" : "Pendiente";

        mapaUnicos.set(key, {
          ...previo,
          ...s,
          estado: estadoUnico,
          pago_ficha: esPagado ? "Pagado" : "Pendiente",
          tipo: "Servidor"
        });
      });

      const listaFinal = Array.from(mapaUnicos.values());
      setServidoresDirectos(listaFinal);
    } catch (err) {
      console.error("Error cargando servidores unificados:", err);
    } finally {
      if (!silencioso) setLoadingDirecto(false);
    }
  }, [todosServidoresOffline]);

  useEffect(() => {
    base44.entities.ConfigFinanza.list().then((c) => { if (c.length) setConfigFin(c[0]); }).catch(() => {});
    base44.entities.ConfigRetiro.list().then((c) => {
      if (c.length) setConfigRetiro(c[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    cargarServidoresUnificados(false);
  }, [cargarServidoresUnificados, versionDatos]);

  const recargarTodo = useCallback(() => {
    reloadOffline();
    cargarServidoresUnificados(true);
  }, [reloadOffline, cargarServidoresUnificados]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      recargarTodo();
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [recargarTodo]);

  useEffect(() => {
    const handleSync = (e) => {
      const entidad = e?.detail?.entidad;
      if (entidad === "Servidor" || entidad === "Servidores" || entidad === "Inscripciones" || entidad === "Reparacion") {
        setVersionDatos(v => v + 1);
        setUltimaSync(new Date());
        recargarTodo();
      }
    };

    const handleStorage = (e) => {
      if (e.key === "emaus_last_sync_time") recargarTodo();
    };

    window.addEventListener("emaus_data_changed", handleSync);
    window.addEventListener("emaus_data_sync", handleSync);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("emaus_data_changed", handleSync);
      window.removeEventListener("emaus_data_sync", handleSync);
      window.removeEventListener("storage", handleStorage);
    };
  }, [recargarTodo]);

  const todosServidores = servidoresDirectos.length > 0 ? servidoresDirectos : todosServidoresOffline;

  const servidoresComunidad = todosServidores.filter((s) => {
    if (!s) return false;

    // 🔒 Excluir solo registros que estén en Lista de Espera, Rechazados o No Asistirá
    const estadoNorm = String(s.estado || "").toLowerCase();
    if (estadoNorm === "lista de espera" || estadoNorm === "rechazado" || estadoNorm === "no asistirá") {
      return false;
    }

    if (esCreadorReal && (!comunidadActual || comunidadActual.id === "GLOBAL" || comunidadActual.id === "global" || comunidadActual.slug === "global")) {
      return true;
    }

    if (coincideComunidad && coincideComunidad(s)) {
      return true;
    }

    const idActivo = String(comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id || "");
    const codigoActivo = String(comunidadActual?.codigo_comunidad || comunidadActual?.codigo || user?.codigo_comunidad || "").toLowerCase();
    const slugActivo = String(comunidadActual?.slug || user?.slug || "").toLowerCase();
    const nombreActivo = String(comunidadActual?.nombre || comunidadActual?.nombre_equipo || user?.nombre_equipo || "").toLowerCase();

    const idReg = String(s.equipo_id || s.comunidad_id || s.retiro_id || s.id_equipo || "");
    const codigoReg = String(s.codigo_comunidad || s.comunidad_codigo || s.codigo || "").toLowerCase();
    const slugReg = String(s.slug || s.comunidad_slug || "").toLowerCase();
    const nombreReg = String(s.comunidad_nombre || s.nombre_equipo || s.comunidad || "").toLowerCase();

    if (idActivo && idReg && idReg === idActivo) return true;
    if (codigoActivo && codigoReg && codigoReg === codigoActivo) return true;
    if (slugActivo && slugReg && slugReg === slugActivo) return true;
    if (nombreActivo && nombreReg && nombreReg === nombreActivo) return true;

    return false;
  });

  const listaProcesada = servidoresComunidad
    .filter((s) => {
      const coincideBusqueda = s.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.parroquia?.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.rol?.toLowerCase().includes(busqueda.toLowerCase());
      const coincideEstado = filtroEstado === "" || s.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    })
    .sort((a, b) => {
      if (orden === "nombre") return (a.nombre || "").localeCompare(b.nombre || "", "es");
      if (orden === "edad") return (Number(a.edad) || 0) - (Number(b.edad) || 0);
      if (orden === "rol") {
        const indexA = ROLES_ORDEN.indexOf(a.rol);
        const indexB = ROLES_ORDEN.indexOf(b.rol);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      }
      return 0;
    });

  const eliminar = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este registro?")) return;
    const elim = servidoresComunidad.find(s => s.id === id || s._id === id);
    await remove(id);

    // 🛡️ Registrar en la Bitácora de Auditoría
    registrarAccionAuditoria({
      usuario: user,
      accion: "ELIMINACION",
      modulo: "Servidores",
      detalle: `Eliminado servidor ${elim?.nombre || id}`,
      entidad: "Servidor",
      entidad_id: id,
      datos_previos: elim
    });

    const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
    window.dispatchEvent(new CustomEvent("emaus_data_changed", {
      detail: { entidad: "Servidor", equipoId, timestamp: Date.now() }
    }));
    toast.success("Registro eliminado correctamente.");
    recargarTodo();
  };

  const handleToggleReporte = () => {
    if (vistaReporte) {
      setVistaReporte(false);
    } else {
      setVistaReporte(true);
      setTimeout(() => window.print(), 200);
    }
  };

  const estaCargando = loadingOffline && loadingDirecto && servidoresDirectos.length === 0;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 1cm 1.5cm 1cm 1.5cm;
          }
          
          html, body, #root, #__next, div, section, main {
            background: white !important;
            background-color: white !important;
            color: #111827 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            line-height: 1.1 !important;
          }

          .print\\:hidden, nav, header, footer, button, input, select, [data-radix-popper-content-wrapper], .bg-blue-50 {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            background: white !important;
            line-height: 1.1 !important;
          }
          th {
            background-color: #f3f4f6 !important;
            color: #111827 !important;
            border-bottom: 1px solid #9ca3af !important;
            border-top: 1px solid #e5e7eb !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            font-size: 10px !important;
            padding: 4px 6px !important;
            text-align: left !important;
          }
          td {
            color: #374151 !important;
            border-bottom: 1px solid #e5e7eb !important;
            font-size: 10px !important;
            padding: 4px 6px !important;
            vertical-align: middle !important;
          }
          tr {
            background-color: white !important;
            page-break-inside: avoid !important;
          }
          tr:nth-child(even) {
            background-color: #f9fafb !important;
          }
          
          .grupo-rol-header {
            background-color: #e5e7eb !important;
            color: #111827 !important;
            font-weight: 600 !important;
            border: 1px solid #d1d5db !important;
            border-left: 3px solid #4b5563 !important;
            padding: 4px 8px !important;
            font-size: 11px !important;
            text-transform: uppercase !important;
            margin-bottom: 0 !important;
            line-height: 1.1 !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50/50 pb-10 print:min-h-0 print:h-auto print:bg-white print:pb-0 print:m-0 print:p-0 print:overflow-visible font-sans text-xs">
        <div className="print:hidden max-w-6xl mx-auto pt-4 px-4">
          <SelectorComunidad />
        </div>

        <PullToRefresh onRefresh={recargarTodo}>
          {vistaReporte && (
            <div className="max-w-5xl mx-auto px-4 print:px-0 print:max-w-none">
              <EncabezadoRetiro configRetiro={configRetiro} modoReporte={modoReporte} comunidadNombre={comunidadActual?.nombre} />
            </div>
          )}

          <div className="bg-white border-b border-amber-100 py-4 px-6 print:hidden shadow-sm">
            <div className="max-w-6xl mx-auto flex justify-between items-center flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-amber-900">Servidores del Retiro</h1>
                  {online ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold">
                      <Wifi className="w-3 h-3" /> Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                      <WifiOff className="w-3 h-3" /> Offline
                    </span>
                  )}
                  {sincronizando && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Sync
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-700 mt-0.5">
                  {listaProcesada.length} servidor(es) en {(!comunidadActual || comunidadActual.id === "GLOBAL") ? "Vista Global" : comunidadActual?.nombre}
                  {ultimaSync && (
                    <span className="ml-2 text-gray-500">
                      · Última sync: {ultimaSync.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <a
                  href="/directorio-servidores"
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-900 to-amber-950 text-amber-300 hover:text-white px-3.5 py-2 rounded-xl text-sm font-bold transition-all shadow border border-amber-600/40"
                >
                  👥 Directorio por Parroquia
                </a>

                <button
                  onClick={() => setModalImportExportOpen(true)}
                  className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white px-3.5 py-2 rounded-xl text-sm font-bold transition-all shadow"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Excel & PDF
                </button>

                <button
                  onClick={handleToggleReporte}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${vistaReporte ? "bg-gray-600 text-white" : "bg-amber-800 text-white hover:bg-amber-900"}`}>
                  <Printer className="w-4 h-4" />
                  {vistaReporte ? "Cerrar Reporte" : "Ver e Imprimir Reporte"}
                </button>
                
                {puedeEditar && (
                  <button onClick={() => setMostrarForm(true)} className="bg-amber-800 hover:bg-amber-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow">
                    <PlusCircle className="w-4 h-4 inline mr-1" /> Nuevo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 mt-5 print:mt-0 print:px-0 print:max-w-none">
            {!puedeEditar && (
              <div className="mb-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl px-3 py-2 flex items-center gap-2 print:hidden font-medium">
                🔒 Tienes acceso de solo lectura a este módulo.
              </div>
            )}
            
            <div className="flex flex-wrap gap-3 mb-5 print:hidden">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-500" />
                <input type="text" placeholder="Buscar por nombre, parroquia o rol..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 py-2 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium bg-white" />
              </div>
              <MobileSelect
                value={orden}
                onChange={setOrden}
                options={[
                  { value: "nombre", label: "Ordenar por Nombre" },
                  { value: "edad", label: "Ordenar por Edad" },
                  { value: "rol", label: "Ordenar por Rol/Equipo" }
                ]}
                className="border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white font-bold text-amber-900" />
              
              <MobileSelect
                value={filtroEstado}
                onChange={setFiltroEstado}
                options={[
                  { value: "", label: "Todos los estados" },
                  { value: "Confirmado", label: "Confirmado" },
                  { value: "Pendiente", label: "Pendiente" }
                ]}
                className="border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white font-medium" />
            </div>

            {vistaReporte ? (
              <div className="print:mt-0">
                <div className="flex gap-2 mb-4 print:hidden">
                  <button
                    onClick={() => setModoReporte("simple")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${modoReporte === "simple" ? "bg-amber-800 text-white" : "bg-white border border-amber-200 text-amber-900 hover:bg-amber-50"}`}>
                    Lista Simple (Sin Equipo)
                  </button>
                  <button
                    onClick={() => setModoReporte("equipo")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${modoReporte === "equipo" ? "bg-amber-800 text-white" : "bg-white border border-amber-200 text-amber-900 hover:bg-amber-50"}`}>
                    Agrupado por Equipo
                  </button>
                </div>
                
                {modoReporte === "simple" ? (
                  <ReporteListaSimple caminantes={listaProcesada} onImprimir={setImprimiendo} />
                ) : (
                  <ReportePorEquipo caminantes={listaProcesada} onImprimir={setImprimiendo} />
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
                <table className="w-full text-sm text-left table-fixed">
                  <thead className="bg-amber-800 text-white text-xs font-bold">
                    <tr>
                      <th className="px-4 py-2.5 text-left w-[40%]">Nombre</th>
                      <th className="px-4 py-2.5 text-left w-[22%]">Rol / Equipo</th>
                      <th className="px-4 py-2.5 text-center w-[20%]">Estado</th>
                      <th className="px-4 py-2.5 text-center w-[18%]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 text-xs">
                    {estaCargando ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-amber-700 font-semibold">
                          <RefreshCw className="w-5 h-5 animate-spin inline mr-2" /> Cargando servidores de la comunidad...
                        </td>
                      </tr>
                    ) : listaProcesada.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-gray-400 font-semibold">No se encontraron servidores para esta comunidad.</td>
                      </tr>
                    ) : (
                      listaProcesada.map((s) => (
                        <tr key={`${s.id || s._id}-${versionDatos}`} className="hover:bg-amber-50/50 transition-colors">
                          <td className="px-4 py-2 font-bold text-amber-950 align-middle truncate">{s.nombre}</td>
                          <td className="px-4 py-2 align-middle font-medium text-gray-700 truncate">{s.rol || s.lugares_servido || "-"}</td>
                          <td className="px-4 py-2 text-center align-middle">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold ${s.estado === "Confirmado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {s.estado || "Pendiente"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center align-middle">
                            <div className="flex justify-center gap-2 items-center">
                              {s.pago_ficha === "Pagado" && (
                                <button onClick={() => setReciboPago(s)} title="Ver/Enviar recibo de pago">
                                  <Receipt className="w-4 h-4 text-green-600" />
                                </button>
                              )}
                              {puedeEditar && <button onClick={() => setEditando(s)}><Pencil className="w-4 h-4 text-amber-700" /></button>}
                              {puedeEditar && <button onClick={() => eliminar(s.id || s._id)}><Trash2 className="w-4 h-4 text-red-500" /></button>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </PullToRefresh>

        {imprimiendo && <ImpresionIndividualModal persona={imprimiendo} onClose={() => setImprimiendo(null)} />}
        <AnimatePresence>
          {mostrarForm && (
            <EditarServidorModal 
              onClose={() => setMostrarForm(false)} 
              onGuardado={() => { 
                setMostrarForm(false); 
                recargarTodo();
                const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
                window.dispatchEvent(new CustomEvent("emaus_data_changed", {
                  detail: { entidad: "Servidor", equipoId, timestamp: Date.now() }
                }));
              }} 
            />
          )}
          {editando && (
            <EditarServidorModal
              servidor={editando}
              onClose={() => setEditando(null)}
              onGuardado={() => { 
                setEditando(null); 
                recargarTodo();
                const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
                window.dispatchEvent(new CustomEvent("emaus_data_changed", {
                  detail: { entidad: "Servidor", equipoId, timestamp: Date.now() }
                }));
              }}
              onConfirmarConAutorizacion={(payload) => {
                setConfirmacion({ persona: editando, payload });
                setEditando(null);
              }}
            />
          )}
        </AnimatePresence>

        {confirmacion && (() => {
          const equipoIdAct = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id || 'def';
          const keyPrecioServ = `emaus_precio_serv_${equipoIdAct}_RD$`;
          const precioServidorValido = Number(configFin?.precio_ficha_servidor) || Number(localStorage.getItem(keyPrecioServ)) || 3000;

          return (
            <ConfirmacionPagoEditModal
              tipo="servidor"
              persona={confirmacion.persona}
              payload={confirmacion.payload}
              precioFicha={precioServidorValido}
              precioFichaServidor={precioServidorValido}
              numeroRetiro={configFin?.numero_retiro || configRetiro?.edicion}
              currentUser={user}
              configRetiro={configRetiro}
              onClose={() => setConfirmacion(null)}
              onGuardado={() => {
                recargarTodo();
                const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
                window.dispatchEvent(new CustomEvent("emaus_data_changed", {
                  detail: { entidad: "Servidor", equipoId, timestamp: Date.now() }
                }));
              }}
            />
          );
        })()}

        {reciboPago && (
          <ReciboPagoModal
            persona={reciboPago}
            tipo="servidor"
            onClose={() => setReciboPago(null)}
          />
        )}

        {modalImportExportOpen && (
          <ModalImportExportServidores
            registros={listaProcesada}
            comunidadActual={comunidadActual}
            onClose={() => setModalImportExportOpen(false)}
            onRefresh={() => {
              recargarTodo();
              const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
              window.dispatchEvent(new CustomEvent("emaus_data_changed", {
                detail: { entidad: "Servidor", equipoId, timestamp: Date.now() }
              }));
            }}
          />
        )}
      </div>
    </>
  );
}

function ModalImportExportServidores({ registros, comunidadActual, onClose, onRefresh }) {
  const [procesando, setProcesando] = useState(false);
  const [previewDatos, setPreviewDatos] = useState([]);
  const [archivoNombre, setArchivoNombre] = useState("");

  const { user } = useAuth();

  const equipoIdActivo = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id || "";
  const codigoComunidadActivo = comunidadActual?.codigo_comunidad || comunidadActual?.codigo || user?.codigo_comunidad || equipoIdActivo;
  const nombreComunidad = comunidadActual?.nombre || comunidadActual?.nombre_equipo || user?.nombre_equipo || "Comunidad Activa";
  const slugComunidadActivo = comunidadActual?.slug || user?.slug || "";

  const esVistaGlobalModal = !equipoIdActivo || equipoIdActivo === "global" || equipoIdActivo === "GLOBAL" || comunidadActual?.id === "global" || comunidadActual?.id === "GLOBAL";

  const descargarPlantilla = () => {
    try {
      const ejemplo = [{
        nombre: "Ana María Gomez",
        cedula: "001-0000000-2",
        apodo: "Anita",
        fecha_nacimiento: "1990-05-15",
        edad: 34,
        genero: "Femenino",
        estado_civil: "Soltero(a)",
        telefono: "809-555-0201",
        email: "ana@ejemplo.com",
        lugares_servido: "Cocina, Liturgia",
        pais: "República Dominicana",
        provincia: "Santiago",
        diocesis: "Archidiócesis de Santiago de los Caballeros",
        parroquia: "Catedral Santiago Apóstol",
        municipio: "Santiago",
        sector: "Centro",
        calle: "Calle Sol #45",
        contacto_emergencia: "Carlos Gomez",
        relacion_emergencia: "Hermano",
        telefono_emergencia: "809-555-0203",
        necesidades_medicas: "Alergia a la penicilina"
      }];

      const ws = XLSX.utils.json_to_sheet(ejemplo, { header: COLUMNAS_SERVIDORES_EXCEL });
      ws["!cols"] = COLUMNAS_SERVIDORES_EXCEL.map(col => ({ wch: Math.max(col.length + 5, 18) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Servidores");
      XLSX.writeFile(wb, "Plantilla_Importacion_Servidores_Emaus.xlsx");
      toast.success("Plantilla de Excel descargada correctamente.");
    } catch (e) {
      toast.error("Error al generar la plantilla de Excel.");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (esVistaGlobalModal) {
      toast.error("Selecciona una comunidad específica antes de cargar el archivo.");
      return;
    }

    setArchivoNombre(file.name);
    setProcesando(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!data || data.length === 0) {
          toast.warning("El archivo no contiene filas válidas.");
          setPreviewDatos([]);
        } else {
          setPreviewDatos(data);
          toast.info(`Se detectaron ${data.length} filas para importar.`);
        }
      } catch (err) {
        toast.error("Error al procesar el archivo Excel.");
      } finally {
        setProcesando(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const ejecutarImportacion = async () => {
    if (!previewDatos.length) return;
    if (esVistaGlobalModal) {
      toast.error("Por favor selecciona una comunidad específica antes de importar los servidores.");
      return;
    }
    setProcesando(true);

    try {
      let creados = 0;
      for (const item of previewDatos) {
        const payload = {
          ...item,
          tipo: "Servidor",
          rol: item.lugares_servido || item.rol || "Servidor",
          codigo_comunidad: codigoComunidadActivo,
          comunidad_codigo: codigoComunidadActivo,
          equipo_id: equipoIdActivo,
          comunidad_id: equipoIdActivo,
          retiro_id: equipoIdActivo,
          comunidad_nombre: nombreComunidad,
          nombre_equipo: nombreComunidad,
          slug: slugComunidadActivo,
          comunidad_slug: slugComunidadActivo,
          estado: "Activo",
        };

        if (payload.edad) payload.edad = Number(payload.edad);

        Object.keys(payload).forEach(k => {
          if (payload[k] === "" || payload[k] === undefined) delete payload[k];
        });

        const res = await base44.entities.Servidor.create(payload).catch(() => null);
        if (res) creados++;
      }

      toast.success(`✅ ¡Se importaron ${creados} servidores exitosamente en ${nombreComunidad}!`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (e) {
      toast.error("Ocurrió un fallo durante la importación.");
    } finally {
      setProcesando(false);
    }
  };

  const exportarExcel = () => {
    try {
      if (!registros.length) return toast.warning("No hay registros para exportar.");
      const ws = XLSX.utils.json_to_sheet(registros);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Servidores");
      XLSX.writeFile(wb, `Listado_Servidores_${nombreComunidad.replace(/\s+/g, '_')}.xlsx`);
      toast.success("Listado exportado a Excel.");
    } catch (e) {
      toast.error("Error al exportar Excel.");
    }
  };

  const exportarPDF = () => {
    try {
      if (!registros.length) return toast.warning("No hay registros para exportar a PDF.");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`RETIRO DE EMAÚS — ${nombreComunidad.toUpperCase()}`, 14, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Listado Oficial de Servidores — Total: ${registros.length}`, 14, 21);

      const cols = ["N°", "Nombre Completo", "Cédula", "Teléfono", "Parroquia", "Equipo / Área", "Estado"];
      const rows = registros.map((r, idx) => [
        String(idx + 1),
        r.nombre || "",
        r.cedula || "",
        r.telefono || "",
        r.parroquia || "",
        r.rol || r.lugares_servido || "Servidor",
        r.estado || "Activo"
      ]);

      const colW = [12, 55, 30, 30, 50, 45, 25];
      const startX = 14;
      let y = 27;
      const rowH = 6;

      doc.setFillColor(30, 58, 138);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      cols.forEach((h, i) => {
        doc.rect(startX + colW.slice(0, i).reduce((a, b) => a + b, 0), y, colW[i], rowH, "F");
        doc.text(h, startX + colW.slice(0, i).reduce((a, b) => a + b, 0) + 1.5, y + 4);
      });
      y += rowH;

      doc.setFont("helvetica", "normal");
      rows.forEach((row, ri) => {
        if (ri % 2 === 0) { doc.setFillColor(239, 246, 255); doc.rect(startX, y, colW.reduce((a, b) => a + b, 0), rowH, "F"); }
        doc.setTextColor(40, 40, 40);
        row.forEach((cell, i) => {
          const txt = String(cell).length > 26 ? String(cell).slice(0, 25) + "…" : String(cell);
          doc.text(txt, startX + colW.slice(0, i).reduce((a, b) => a + b, 0) + 1.5, y + 4);
        });
        y += rowH;
        if (y > 195) { doc.addPage(); y = 14; }
      });

      doc.save(`Reporte_Servidores_${nombreComunidad.replace(/\s+/g, '_')}.pdf`);
      toast.success("Documento PDF generado.");
    } catch (e) {
      toast.error("Error al generar PDF.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-blue-200">
        <div className="bg-blue-900 px-5 py-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-yellow-400" />
            <h2 className="text-base font-extrabold">Gestión de Datos: Servidores</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {esVistaGlobalModal && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 text-xs font-bold flex items-center gap-2">
              ⚠️ Estás en Vista Global. Por favor, selecciona una comunidad específica en la parte superior antes de importar para asegurar que los datos se asignen correctamente.
            </div>
          )}

          <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-blue-700" /> Importar desde Excel ({nombreComunidad})
              </h3>
              <button
                onClick={descargarPlantilla}
                className="flex items-center gap-1.5 bg-blue-800 hover:bg-blue-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow"
              >
                <Download className="w-3.5 h-3.5" /> Plantilla Excel
              </button>
            </div>

            <div className="border-2 border-dashed border-blue-300 rounded-xl p-3 bg-white text-center">
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} id="file-servidor" className="hidden" />
              <label htmlFor="file-servidor" className="cursor-pointer flex flex-col items-center justify-center gap-1">
                <FileSpreadsheet className="w-7 h-7 text-blue-700" />
                <span className="text-xs font-bold text-blue-950">
                  {archivoNombre ? `Seleccionado: ${archivoNombre}` : "Haz clic para subir archivo Excel"}
                </span>
              </label>
            </div>

            {previewDatos.length > 0 && (
              <div className="bg-white rounded-xl border border-blue-300 p-3 space-y-2">
                <p className="text-xs font-bold text-green-700">✓ {previewDatos.length} filas listas para importar</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setPreviewDatos([]); setArchivoNombre(""); }} className="px-3 py-1 text-xs border rounded-lg font-bold">Cancelar</button>
                  <button onClick={ejecutarImportacion} disabled={procesando} className="bg-green-700 hover:bg-green-800 text-white px-4 py-1 rounded-lg text-xs font-bold shadow">
                    {procesando ? "Importando..." : "Confirmar Importación"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-4 h-4 text-slate-700" /> Exportar Servidores Actuales ({registros.length})
            </h3>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={exportarExcel} className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold shadow">
                <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
              </button>
              <button onClick={exportarPDF} className="flex items-center justify-center gap-1.5 bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-xl text-xs font-bold shadow">
                <FileText className="w-4 h-4" /> PDF (.pdf)
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 px-4 py-2.5 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 border rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}