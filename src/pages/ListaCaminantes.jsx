// ListaCaminantes.jsx - VERSIÓN MEJORADA CON SINCRONIZACIÓN EN TIEMPO REAL
import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { 
  PlusCircle, Search, Pencil, Trash2, Printer, X, Wifi, WifiOff, 
  Eye, Receipt, FileSpreadsheet, Download, Upload, CheckCircle2, Table, FileText,
  RefreshCw, Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useComunidad } from "@/lib/ComunidadContext";
import SelectorComunidad from "@/components/SelectorComunidad";
import EditarCaminanteModal from "@/components/caminantes/EditarCaminanteModal";
import AccionesCaminante from "@/components/caminantes/AccionesCaminante";
import CobroFichaModal from "@/components/caminantes/CobroFichaModal";
import ConfirmacionPagoEditModal from "@/components/cobros/ConfirmacionPagoEditModal";
import ReciboPagoModal from "@/components/cobros/ReciboPagoModal";
import ImpresionIndividualModal from "@/components/ImpresionIndividualModal";
import PullToRefresh from "@/components/PullToRefresh";
import MobileSelect from "@/components/MobileSelect";
import { AnimatePresence } from "framer-motion";
import useOffline from "@/hooks/useOffline";
import { usePermiso } from "@/hooks/usePermiso";
import { registrarAccionAuditoria } from "@/utils/auditLogger";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const APP_CREATOR_EMAIL = "ccanario0687@gmail.com";
const POLLING_INTERVAL = 5000; // 5 segundos

// Resto de constantes...
const COLUMNAS_CAMINANTES_EXCEL = [
  "nombre", "cedula", "apodo", "edad", "genero", "estado_civil", 
  "telefono", "email", "pais", "provincia", "diocesis", "parroquia", 
  "municipio", "sector", "calle", "padrino_madrina", "telefono_padrino", 
  "contacto_emergencia", "relacion_emergencia", "telefono_emergencia", 
  "talla_camisa", "tipo_sangre", "necesidades_medicas"
];

export default function ListaCaminantes() {
  const { records: todosCaminantes, loading, online, remove, update, reload } = useOffline("Caminante");
  const [busqueda, setBusqueda] = useState("");
  const [criterioOrden, setCriterioOrden] = useState("ficha");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [editando, setEditando] = useState(null);
  const [imprimiendo, setImprimiendo] = useState(null);
  const [verDetalle, setVerDetalle] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [modalImportExportOpen, setModalImportExportOpen] = useState(false);
  const [cobrando, setCobrando] = useState(null);
  const [configFin, setConfigFin] = useState(null);
  const [configRetiro, setConfigRetiro] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [reciboPago, setReciboPago] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState(null);
  const [versionDatos, setVersionDatos] = useState(0);
  
  const { user } = useAuth();
  const { puedeEditar } = usePermiso("caminantes");
  const { comunidadActual } = useComunidad();

  const esCreadorReal = Boolean(
    user?.email === APP_CREATOR_EMAIL || user?.es_creador === true
  );

  const [caminantesDirectos, setCaminantesDirectos] = useState([]);
  const [loadingDirecto, setLoadingDirecto] = useState(true);

  const coincideComunidad = useCallback((item) => {
    if (!item) return false;
    if (esCreadorReal && (!comunidadActual || comunidadActual.id === "GLOBAL" || comunidadActual.id === "global" || comunidadActual.slug === "global")) {
      return true;
    }

    const idActivo = comunidadActual?.equipo_id || comunidadActual?.id || (!esCreadorReal ? user?.equipo_id : null);
    const slugActivo = comunidadActual?.slug;
    const nombreActivo = comunidadActual?.nombre || comunidadActual?.nombre_equipo;

    if (!idActivo && !slugActivo && esCreadorReal) return true;

    const idReg = String(item.equipo_id || item.comunidad_id || item.id_equipo || "");
    const slugReg = String(item.slug || item.comunidad_slug || item.retiro_id || "");
    const nombreReg = String(item.nombre_equipo || item.comunidad || item.comunidad_nombre || "");

    const strIdActivo = String(idActivo || "");
    const strSlugActivo = String(slugActivo || "");
    const strNombreActivo = String(nombreActivo || "");

    if (!idReg && !slugReg && !nombreReg) return true;

    return (
      (strIdActivo && idReg && idReg === strIdActivo) ||
      (strSlugActivo && slugReg && slugReg === strSlugActivo) ||
      (strNombreActivo && nombreReg && nombreReg.toLowerCase() === strNombreActivo.toLowerCase())
    );
  }, [comunidadActual, user, esCreadorReal]);

  const cargarCaminantesUnificados = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoadingDirecto(true);
    try {
      const [r1, r2, rRemotas] = await Promise.all([
        base44.entities.Caminante.list("-created_date").catch(() => []),
        base44.entities.Caminantes?.list("-created_date").catch(() => []) || Promise.resolve([]),
        base44.entities.InscripcionRemota?.list("-created_date").catch(() => []) || Promise.resolve([]),
      ]);

      let acumulados = [];
      if (Array.isArray(r1)) acumulados.push(...r1);
      if (Array.isArray(r2)) acumulados.push(...r2);

      if (Array.isArray(rRemotas)) {
        const soloCaminantesRemotosAprobados = rRemotas.filter(c => {
          const est = String(c.estado || "").toLowerCase();
          const esAprob = est === "aprobado" || est === "confirmado" || est === "completado";
          const tipoStr = String(c.tipo || c.tipo_registro || "").toLowerCase();
          const esServ = tipoStr.includes("servid") || c.es_servidor === true;
          return esAprob && !esServ;
        });
        acumulados.push(...soloCaminantesRemotosAprobados);
      }

      const mapa = new Map();
      acumulados.forEach(c => {
        if (!c) return;

        const estNorm = String(c.estado || "").toLowerCase();
        if (estNorm === "lista de espera" || estNorm === "rechazado" || estNorm === "no asistirá") {
          return;
        }

        const cleanCed = c.cedula ? String(c.cedula).replace(/\D/g, "") : "";
        const cleanTel = c.telefono ? String(c.telefono).replace(/\D/g, "") : "";
        const cleanNom = c.nombre ? String(c.nombre).trim().toLowerCase() : "";
        const keyInscrip = c.inscripcion_id || c.inscripcion_remota_id ? String(c.inscripcion_id || c.inscripcion_remota_id) : null;

        let key = null;
        if (keyInscrip && mapa.has(keyInscrip)) {
          key = keyInscrip;
        } else if (cleanCed && mapa.has(`ced_${cleanCed}`)) {
          key = `ced_${cleanCed}`;
        } else if (cleanNom && cleanTel && mapa.has(`nom_${cleanNom}_${cleanTel}`)) {
          key = `nom_${cleanNom}_${cleanTel}`;
        } else {
          key = keyInscrip ? keyInscrip : (cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(c.id || c._id || Math.random())));
        }

        const prev = mapa.get(key) || {};
        mapa.set(key, {
          ...c,
          ...prev,
          id: prev.id || c.id || key,
          nombre: prev.nombre || c.nombre || c.nombre_completo,
          cedula: prev.cedula || c.cedula,
          telefono: prev.telefono || c.telefono,
          parroquia: prev.parroquia || c.parroquia,
          numero_ficha: prev.numero_ficha || c.numero_ficha || prev.ficha || c.ficha,
          pago_ficha: prev.pago_ficha || c.pago_ficha || "Pendiente",
          estado: prev.estado || c.estado || "Pendiente",
          _tipo: "Caminante"
        });
      });

      const unificados = Array.from(mapa.values());
      setCaminantesDirectos(unificados);
    } catch (err) {
      console.warn("Error unificando caminantes:", err);
    } finally {
      setLoadingDirecto(false);
    }
  }, []);

  useEffect(() => {
    cargarCaminantesUnificados();
  }, [cargarCaminantesUnificados, versionDatos]);

  // 🆕 SINCRONIZACIÓN EN TIEMPO REAL CON POLLING
  useEffect(() => {
    const equipoIdActivo = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
    if (!equipoIdActivo && !esCreadorReal) return;

    let intervalId = null;

    const verificarCambios = async () => {
      try {
        setSincronizando(true);
        await cargarCaminantesUnificados(true);
        setUltimaSync(new Date());
      } catch (err) {
        console.warn("Error verificando cambios:", err);
      } finally {
        setSincronizando(false);
      }
    };

    verificarCambios();
    intervalId = setInterval(verificarCambios, POLLING_INTERVAL);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [comunidadActual, user?.equipo_id, esCreadorReal, cargarCaminantesUnificados]);

  // 🆕 LISTENER DE EVENTOS DE SINCRONIZACIÓN
  useEffect(() => {
    const handleSync = (e) => {
      const entidad = e?.detail?.entidad;
      if (entidad === "Caminante" || entidad === "Caminantes" || entidad === "Inscripciones" || entidad === "Reparacion") {
        console.log("🔄 [Caminantes] Evento de sync recibido:", entidad);
        setVersionDatos(v => v + 1);
        cargarCaminantesUnificados(true);
        reload();
      }
    };

    const handleStorage = (e) => {
      if (e.key === "emaus_last_sync_time") {
        cargarCaminantesUnificados(true);
        reload();
      }
    };

    window.addEventListener("emaus_data_changed", handleSync);
    window.addEventListener("emaus_data_sync", handleSync);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("emaus_data_changed", handleSync);
      window.removeEventListener("emaus_data_sync", handleSync);
      window.removeEventListener("storage", handleStorage);
    };
  }, [reload, cargarCaminantesUnificados]);

  useEffect(() => {
    const idActivo = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
    base44.entities.ConfigFinanza.list().then(c => {
      const match = (c || []).find(item => String(item.equipo_id || item.comunidad_id || "") === String(idActivo));
      if (match) setConfigFin(match);
    }).catch(() => {});
    base44.entities.ConfigRetiro.list().then(c => {
      const match = (c || []).find(item => String(item.equipo_id || item.comunidad_id || "") === String(idActivo));
      if (match) setConfigRetiro(match);
    }).catch(() => {});
  }, [comunidadActual, user?.equipo_id]);

  // 🆕 FILTRADO ROBUSTO Y CONSISTENTE (Consolidado entre Offline y Base de Datos)
  const mapaFinal = new Map();
  [...caminantesDirectos, ...todosCaminantes].forEach(item => {
    if (!item) return;
    const cleanCed = item.cedula ? String(item.cedula).replace(/\D/g, "") : "";
    const cleanTel = item.telefono ? String(item.telefono).replace(/\D/g, "") : "";
    const cleanNom = item.nombre ? String(item.nombre).trim().toLowerCase() : "";
    const key = cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(item.id || item._id || Math.random()));
    if (!mapaFinal.has(key)) {
      mapaFinal.set(key, item);
    }
  });

  const caminantesComunidad = Array.from(mapaFinal.values()).filter(c => {
    if (!c) return false;

    const estadoNorm = String(c.estado || "").toLowerCase();
    if (estadoNorm === "lista de espera" || estadoNorm === "rechazado" || estadoNorm === "no asistirá") {
      return false;
    }

    return coincideComunidad(c);
  });

  const filtrados = caminantesComunidad.filter(c => {
    const coincideBusqueda =
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cedula?.includes(busqueda) || 
      c.parroquia?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.padrino_madrina?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === "" || c.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  }).sort((a, b) => {
    if (criterioOrden === "alfabetico") {
      return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
    } else if (criterioOrden === "edad") {
      return (Number(a.edad) || 0) - (Number(b.edad) || 0);
    } else {
      const numA = Number(a.numero_ficha || a.ficha);
      const numB = Number(b.numero_ficha || b.ficha);
      if (!numA) return 1;
      if (!numB) return -1;
      return numA - numB;
    }
  });

  const eliminar = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar este caminante?")) return;
    const elim = caminantesComunidad.find(c => c.id === id || c._id === id);
    await remove(id);
    
    // 🛡️ Registrar en la Bitácora de Auditoría
    registrarAccionAuditoria({
      usuario: user,
      accion: "ELIMINACION",
      modulo: "Caminantes",
      detalle: `Eliminado caminante ${elim?.nombre || id}`,
      entidad: "Caminante",
      entidad_id: id,
      datos_previos: elim
    });

    // 🆕 Notificar cambio a otros usuarios
    const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
    window.dispatchEvent(new CustomEvent("emaus_data_changed", {
      detail: { entidad: "Caminante", equipoId, timestamp: Date.now() }
    }));
    
    toast.success(online ? "Caminante eliminado." : "Caminante eliminado (se sincronizará al conectar).");
  };

  const cambiarEstado = async (caminante, estado, label) => {
    try {
      await update(caminante.id, { estado });

      // 🛡️ Registrar en la Bitácora de Auditoría
      registrarAccionAuditoria({
        usuario: user,
        accion: "MODIFICACION",
        modulo: "Caminantes",
        detalle: `Estado cambiado a "${label}" para ${caminante.nombre}`,
        entidad: "Caminante",
        entidad_id: caminante.id,
        datos_previos: { estado: caminante.estado },
        datos_nuevos: { estado }
      });
      
      // 🆕 Notificar cambio
      const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
      window.dispatchEvent(new CustomEvent("emaus_data_changed", {
        detail: { entidad: "Caminante", equipoId, timestamp: Date.now() }
      }));
      
      toast.success(`${caminante.nombre} → ${label}`);
    } catch {
      toast.error("No se pudo actualizar el estado.");
    }
  };

  const iniciarCobro = (caminante) => setCobrando(caminante);

  const estadoColor = (estado) => {
    if (estado === "Confirmado") return "bg-green-100 text-green-700";
    if (estado === "Cancelado") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div>
      <SelectorComunidad />

      <PullToRefresh onRefresh={reload}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-amber-900 leading-tight">Caminantes Registrados</h1>
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
          <p className="text-amber-600 text-sm mt-0.5 leading-none">
            {caminantesComunidad.length} caminante(s) en {(!comunidadActual || comunidadActual.id === "GLOBAL") ? "Vista Global" : comunidadActual?.nombre}
            {ultimaSync && (
              <span className="ml-2 text-xs text-gray-500">
                · Última sync: {ultimaSync.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setModalImportExportOpen(true)}
            className="flex items-center gap-2 bg-emerald-700 text-white hover:bg-emerald-800 px-3.5 py-2 rounded-xl text-sm font-bold transition-all shadow"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel & PDF
          </button>

          <button
            onClick={() => setMostrarReporte(true)}
            className="flex items-center gap-2 bg-amber-800 text-white hover:bg-amber-900 px-3.5 py-2 rounded-xl text-sm font-bold transition-all shadow"
          >
            <Printer className="w-4 h-4" /> Reporte
          </button>
          
          {puedeEditar && (
            <Link
              to="/registro"
              className="flex items-center gap-2 bg-white text-amber-900 hover:bg-amber-50 px-3.5 py-2 rounded-xl text-sm font-bold transition-all shadow border border-amber-300"
            >
              <PlusCircle className="w-4 h-4" /> Nuevo
            </Link>
          )}
        </div>
      </div>

      {!puedeEditar && (
        <div className="mb-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl px-3 py-2 flex items-center gap-2 font-medium">
          🔒 Tienes acceso de solo lectura a este módulo.
        </div>
      )}

      <div>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula, parroquia..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-medium"
            />
          </div>
          
          <MobileSelect
            value={criterioOrden}
            onChange={setCriterioOrden}
            options={[
              { value: "ficha", label: "🔢 Ordenar por N° Ficha" },
              { value: "alfabetico", label: "🔤 Ordenar Alfabéticamente" },
              { value: "edad", label: "🎂 Ordenar por Edad" },
            ]}
            className="border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-amber-900 font-bold"
          />

          <MobileSelect
            value={filtroEstado}
            onChange={setFiltroEstado}
            options={[
              { value: "", label: "Todos los estados" },
              { value: "Confirmado", label: "Confirmado" },
              { value: "Pendiente", label: "Pendiente" },
              { value: "Cancelado", label: "Cancelado" },
            ]}
            className="border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          />
        </div>

        {loading ? (
          <p className="text-amber-600 text-sm font-semibold">Cargando caminantes...</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🕊️</p>
            <p className="font-semibold text-sm">No se encontraron caminantes en esta comunidad.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm leading-normal">
                <thead className="bg-amber-800 text-white font-bold">
                  <tr>
                    <th className="text-left px-4 py-2.5">Nombre</th>
                    <th className="text-left px-4 py-2.5">N° Ficha</th>
                    <th className="text-left px-4 py-2.5 hidden md:table-cell">Parroquia</th>
                    <th className="text-left px-4 py-2.5 hidden md:table-cell">Mesa</th>
                    <th className="text-left px-4 py-2.5 hidden lg:table-cell">Teléfono</th>
                    <th className="text-left px-4 py-2.5">Estado</th>
                    <th className="text-left px-4 py-2.5">Acciones</th>
                    <th className="text-left px-4 py-2.5">Imprimir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {filtrados.map((c, i) => (
                    <tr key={`${c.id}-${versionDatos}`} className={`${i % 2 === 0 ? "bg-white" : "bg-amber-50/40"} hover:bg-amber-50 transition-colors`}>
                      <td className="px-4 py-2 font-bold text-amber-950">{c.nombre}</td>
                      <td className="px-4 py-2 text-amber-900 font-extrabold">{c.numero_ficha || c.ficha || "-"}</td>
                      <td className="px-4 py-2 text-gray-600 font-medium hidden md:table-cell">{c.parroquia || "-"}</td>
                      <td className="px-4 py-2 text-gray-600 font-medium hidden md:table-cell">{c.numero_mesa || "-"}</td>
                      <td className="px-4 py-2 text-gray-600 font-medium hidden lg:table-cell">{c.telefono || "-"}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold leading-tight ${estadoColor(c.estado)}`}>
                          {c.estado || "Pendiente"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 items-center">
                          <button onClick={() => setVerDetalle(c)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Vista Rápida">
                            <Eye className="w-4 h-4" />
                          </button>
                          {puedeEditar && (
                            <button onClick={() => setEditando(c)} className="text-amber-700 hover:text-amber-900 transition-colors" title="Editar">
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {puedeEditar && (
                            <button onClick={() => eliminar(c.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {puedeEditar && (
                            <AccionesCaminante caminante={c} onAccion={cambiarEstado} onConfirmar={iniciarCobro} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 items-center">
                          <button onClick={() => setImprimiendo(c)} className="text-amber-600 hover:text-amber-800 transition-colors" title="Imprimir documentos">
                            <Printer className="w-4 h-4" />
                          </button>
                          {c.pago_ficha === "Pagado" && (
                            <button onClick={() => setReciboPago(c)} className="text-green-600 hover:text-green-800 transition-colors" title="Ver/Enviar recibo de pago">
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      </PullToRefresh>

      {/* Modales (sin cambios) */}
      {imprimiendo && (
        <ImpresionIndividualModal persona={imprimiendo} esServidor={false} onClose={() => setImprimiendo(null)} />
      )}

      {cobrando && (
        <CobroFichaModal
          caminante={cobrando}
          precioFicha={configFin?.precio_ficha_caminante || 0}
          precioFichaServidor={configFin?.precio_ficha_servidor || 0}
          numeroRetiro={configFin?.numero_retiro}
          currentUser={user}
          onClose={() => setCobrando(null)}
          onGuardado={() => { 
            setCobrando(null); 
            reload();
            // 🆕 Notificar cambio
            const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
            window.dispatchEvent(new CustomEvent("emaus_data_changed", {
              detail: { entidad: "Caminante", equipoId, timestamp: Date.now() }
            }));
          }}
        />
      )}

      <AnimatePresence>
        {editando && (
          <EditarCaminanteModal
            caminante={editando}
            onClose={() => setEditando(null)}
            onGuardado={() => { 
              setEditando(null); 
              reload();
              // 🆕 Notificar cambio
              const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
              window.dispatchEvent(new CustomEvent("emaus_data_changed", {
                detail: { entidad: "Caminante", equipoId, timestamp: Date.now() }
              }));
            }}
            onConfirmarConAutorizacion={(payload) => {
              setConfirmacion({ persona: editando, payload });
              setEditando(null);
            }}
          />
        )}
      </AnimatePresence>

      {confirmacion && (
        <ConfirmacionPagoEditModal
          tipo="caminante"
          persona={confirmacion.persona}
          payload={confirmacion.payload}
          precioFicha={configFin?.precio_ficha_caminante || 0}
          precioFichaServidor={configFin?.precio_ficha_servidor || 0}
          numeroRetiro={configFin?.numero_retiro}
          currentUser={user}
          configRetiro={configRetiro}
          onClose={() => setConfirmacion(null)}
          onGuardado={() => {
            reload();
            const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
            window.dispatchEvent(new CustomEvent("emaus_data_changed", {
              detail: { entidad: "Caminante", equipoId, timestamp: Date.now() }
            }));
          }}
        />
      )}

      {reciboPago && (
        <ReciboPagoModal persona={reciboPago} tipo="caminante" onClose={() => setReciboPago(null)} />
      )}

      {verDetalle && (
        <ModalVistaPrevia caminante={verDetalle} onClose={() => setVerDetalle(null)} />
      )}

      {mostrarReporte && (
        <ReporteCaminantes caminantes={filtrados} onClose={() => setMostrarReporte(false)} comunidadNombre={comunidadActual?.nombre} />
      )}

      {modalImportExportOpen && (
        <ModalImportExportCaminantes
          registros={filtrados}
          comunidadActual={comunidadActual}
          onClose={() => setModalImportExportOpen(false)}
          onRefresh={() => {
            reload();
            const equipoId = comunidadActual?.equipo_id || comunidadActual?.id || user?.equipo_id;
            window.dispatchEvent(new CustomEvent("emaus_data_changed", {
              detail: { entidad: "Caminante", equipoId, timestamp: Date.now() }
            }));
          }}
        />
      )}
    </div>
  );
}

// 📊 COMPONENTE AUXILIAR DEL MODAL DE IMPORTACIÓN / EXPORTACIÓN MASIVA
function ModalImportExportCaminantes({ registros, comunidadActual, onClose, onRefresh }) {
  const [procesando, setProcesando] = useState(false);
  const [previewDatos, setPreviewDatos] = useState([]);
  const [archivoNombre, setArchivoNombre] = useState("");

  const equipoIdActivo = comunidadActual?.equipo_id || comunidadActual?.id || "general";
  const codigoComunidadActivo = comunidadActual?.codigo_comunidad || comunidadActual?.codigo || equipoIdActivo;
  const nombreComunidad = comunidadActual?.nombre || "Comunidad Activa";

  // 1. Descargar Plantilla Excel
  const descargarPlantilla = () => {
    try {
      const ejemplo = [{
        nombre: "Juan Carlos Pérez",
        cedula: "001-0000000-1",
        apodo: "Juanky",
        edad: 35,
        genero: "Masculino",
        estado_civil: "Casado(a) por la Iglesia",
        telefono: "809-555-0101",
        email: "juan@ejemplo.com",
        pais: "República Dominicana",
        provincia: "Distrito Nacional",
        diocesis: "Archidiócesis de Santo Domingo",
        parroquia: "Parroquia San Antonio de Padua",
        municipio: "Santo Domingo",
        sector: "Gazcue",
        calle: "Calle Principal #12",
        padrino_madrina: "Pedro Martinez",
        telefono_padrino: "809-555-0102",
        contacto_emergencia: "Maria Perez",
        relacion_emergencia: "Esposa",
        telefono_emergencia: "809-555-0103",
        talla_camisa: "L",
        tipo_sangre: "O+",
        necesidades_medicas: "Hipertensión"
      }];

      const ws = XLSX.utils.json_to_sheet(ejemplo, { header: COLUMNAS_CAMINANTES_EXCEL });
      ws["!cols"] = COLUMNAS_CAMINANTES_EXCEL.map(col => ({ wch: Math.max(col.length + 5, 18) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Caminantes");
      XLSX.writeFile(wb, "Plantilla_Importacion_Caminantes_Emaus.xlsx");
      toast.success("Plantilla de Excel descargada correctamente.");
    } catch (e) {
      toast.error("Error al generar la plantilla de Excel.");
    }
  };

  // 2. Leer archivo subido
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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

  // 3. Ejecutar Importación en Base44 con Código de Comunidad
  const ejecutarImportacion = async () => {
    if (!previewDatos.length) return;
    setProcesando(true);

    try {
      let creados = 0;
      for (const item of previewDatos) {
        const payload = {
          ...item,
          tipo: "Caminante",
          rol_en_mesa: "Caminante",
          codigo_comunidad: codigoComunidadActivo,
          comunidad_codigo: codigoComunidadActivo,
          equipo_id: equipoIdActivo,
          comunidad_id: equipoIdActivo,
          retiro_id: equipoIdActivo,
          comunidad_nombre: nombreComunidad,
          nombre_equipo: nombreComunidad,
          estado: "Pendiente",
        };

        if (payload.edad) payload.edad = Number(payload.edad);

        Object.keys(payload).forEach(k => {
          if (payload[k] === "" || payload[k] === undefined) delete payload[k];
        });

        const res = await base44.entities.Caminante.create(payload).catch(() => null);
        if (res) creados++;
      }

      toast.success(`✅ ¡Se importaron ${creados} caminantes exitosamente!`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (e) {
      toast.error("Ocurrió un fallo durante la importación.");
    } finally {
      setProcesando(false);
    }
  };

  // 4. Exportar a Excel
  const exportarExcel = () => {
    try {
      if (!registros.length) return toast.warning("No hay registros para exportar.");
      const ws = XLSX.utils.json_to_sheet(registros);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Caminantes");
      XLSX.writeFile(wb, `Listado_Caminantes_${nombreComunidad.replace(/\s+/g, '_')}.xlsx`);
      toast.success("Listado exportado a Excel.");
    } catch (e) {
      toast.error("Error al exportar Excel.");
    }
  };

  // 5. Exportar a PDF
  const exportarPDF = () => {
    try {
      if (!registros.length) return toast.warning("No hay registros para exportar a PDF.");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`RETIRO DE EMAÚS — ${nombreComunidad.toUpperCase()}`, 14, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Listado Oficial de Caminantes — Total: ${registros.length}`, 14, 21);

      const cols = ["N° Ficha", "Nombre Completo", "Cédula", "Teléfono", "Parroquia", "Edad", "Padrino/Madrina", "Estado"];
      const rows = registros.map((r, idx) => [
        String(r.numero_ficha || r.ficha || idx + 1),
        r.nombre || "",
        r.cedula || "",
        r.telefono || "",
        r.parroquia || "",
        r.edad ? `${r.edad} años` : "",
        r.padrino_madrina || "",
        r.estado || "Pendiente"
      ]);

      const colW = [20, 55, 30, 30, 45, 20, 45, 28];
      const startX = 14;
      let y = 27;
      const rowH = 6;

      doc.setFillColor(180, 83, 9);
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
        if (ri % 2 === 0) { doc.setFillColor(254, 243, 199); doc.rect(startX, y, colW.reduce((a, b) => a + b, 0), rowH, "F"); }
        doc.setTextColor(40, 40, 40);
        row.forEach((cell, i) => {
          const txt = String(cell).length > 28 ? String(cell).slice(0, 27) + "…" : String(cell);
          doc.text(txt, startX + colW.slice(0, i).reduce((a, b) => a + b, 0) + 1.5, y + 4);
        });
        y += rowH;
        if (y > 195) { doc.addPage(); y = 14; }
      });

      doc.save(`Reporte_Caminantes_${nombreComunidad.replace(/\s+/g, '_')}.pdf`);
      toast.success("Documento PDF generado.");
    } catch (e) {
      toast.error("Error al generar PDF.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-amber-200">
        <div className="bg-amber-900 px-5 py-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-yellow-400" />
            <h2 className="text-base font-extrabold">Gestión de Datos: Caminantes</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* SECCIÓN IMPORTACIÓN */}
          <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-700" /> Importar desde Excel
              </h3>
              <button
                onClick={descargarPlantilla}
                className="flex items-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow"
              >
                <Download className="w-3.5 h-3.5" /> Plantilla Excel
              </button>
            </div>

            <div className="border-2 border-dashed border-amber-300 rounded-xl p-3 bg-white text-center">
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} id="file-caminante" className="hidden" />
              <label htmlFor="file-caminante" className="cursor-pointer flex flex-col items-center justify-center gap-1">
                <FileSpreadsheet className="w-7 h-7 text-amber-700" />
                <span className="text-xs font-bold text-amber-950">
                  {archivoNombre ? `Seleccionado: ${archivoNombre}` : "Haz clic para subir archivo Excel"}
                </span>
              </label>
            </div>

            {previewDatos.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-300 p-3 space-y-2">
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

          {/* SECCIÓN EXPORTACIÓN */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-4 h-4 text-slate-700" /> Exportar Caminantes Actuales ({registros.length})
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

function ModalVistaPrevia({ caminante, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-amber-100">
        <div className="bg-amber-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <h2 className="text-base font-bold">Detalles del Caminante</h2>
          </div>
          <button onClick={onClose} className="hover:opacity-75 transition-opacity">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto text-sm leading-snug">
          <div className="border-b border-amber-100 pb-2">
            <p className="text-[11px] text-amber-600 font-semibold uppercase tracking-wider leading-none">Nombre Completo</p>
            <p className="text-base font-bold text-amber-950 mt-1 leading-tight">{caminante.nombre}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 font-medium leading-none">N° Ficha</p>
              <p className="font-semibold text-gray-800 mt-1 leading-none">{caminante.numero_ficha || caminante.ficha || "Sin asignar"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium leading-none">Cédula</p>
              <p className="font-semibold text-gray-800 mt-1 leading-none">{caminante.cedula || "No registrada"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 font-medium leading-none">Teléfono</p>
              <p className="font-semibold text-gray-800 mt-1 leading-none">{caminante.telefono || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium leading-none">Estado Civil</p>
              <p className="font-semibold text-gray-800 mt-1 leading-none">{caminante.estado_civil || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 font-medium leading-none">Parroquia</p>
              <p className="font-semibold text-gray-800 mt-1 leading-none">{caminante.parroquia || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium leading-none">Mesa Asignada</p>
              <p className="font-semibold text-gray-800 mt-1 leading-none">{caminante.numero_mesa || "-"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 font-medium leading-none">Padrino / Madrina</p>
            <p className="font-semibold text-gray-800 mt-1 leading-tight">{caminante.padrino_madrina || "-"}</p>
          </div>

          <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
            <p className="text-[11px] text-amber-800 font-bold uppercase mb-1.5 tracking-wide leading-none">Sacramentos Recibidos</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-amber-950">
              <span className={caminante.bautismo ? "text-green-700" : "text-gray-400 line-through"}>✓ Bautismo</span>
              <span className={caminante.confirmacion ? "text-green-700" : "text-gray-400 line-through"}>✓ Confirmación</span>
              <span className={caminante.comunion ? "text-green-700" : "text-gray-400 line-through"}>✓ 1ra Comunión</span>
              <span className={caminante.matrimonio ? "text-green-700" : "text-gray-400 line-through"}>✓ Matrimonio</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-2.5 flex justify-end border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium transition-colors text-xs shadow">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function ReporteCaminantes({ caminantes, onClose, comunidadNombre }) {
  const handlePrint = () => {
    const win = window.open("", "_blank", "width=1000,height=700");
    let html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { margin: 0; font-family: Arial, sans-serif; font-size: 10px; line-height: 1.2; }
        .header { background: #78350f; color: white; padding: 10px 16px; text-align: center; border-radius: 6px; margin-bottom: 10px; }
        .header h1 { margin: 0; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #b8860b; color: white; padding: 5px 8px; text-align: left; font-size: 10px; font-weight: bold; border: 1px solid #fcd34d; }
        td { padding: 4px 8px; border: 1px solid #fde68a; font-size: 9px; vertical-align: middle; }
        tr:nth-child(even) td { background: #fffbeb; }
        .footer { text-align: center; font-size: 9px; color: #999; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 6px; }
        .badge { display: inline-block; padding: 1px 5px; border-radius: 6px; font-size: 8px; font-weight: bold; }
        .conf { background: #d1fae5; color: #065f46; }
        .pend { background: #fef3c7; color: #92400e; }
        .canc { background: #fee2e2; color: #991b1b; }
      </style></head><body>
      <div class="header"><h1>✝️ Retiro de Emaús — Reporte de Caminantes</h1>
        <p style="margin:2px 0;font-size:10px">${comunidadNombre || "Vista Global"} | Total: ${caminantes.length} caminante(s) | ${new Date().toLocaleDateString('es-ES')}</p>
      </div>
      <table><thead><tr>
        <th>#Ficha</th><th>Nombre</th><th>Parroquia</th>
        <th>Padrino/Madrina</th><th>Teléfono</th><th>Mesa</th><th>Habitación</th><th>Estado</th>
      </tr></thead><tbody>`;

    caminantes.forEach(c => {
      const estadoClass = c.estado === "Confirmado" ? "conf" : c.estado === "Cancelado" ? "canc" : "pend";
      html += `<tr>
        <td><strong>${c.numero_ficha || c.ficha || "-"}</strong></td>
        <td>${c.nombre}</td>
        <td>${c.parroquia || "-"}</td>
        <td>${c.padrino_madrina || "-"}</td>
        <td>${c.telefono || "-"}</td>
        <td>${c.numero_mesa || "-"}</td>
        <td>${c.numero_habitacion || "-"}</td>
        <td><span class="badge ${estadoClass}">${c.estado || "Pendiente"}</span></td>
      </tr>`;
    });

    html += `</tbody></table>
      <div class="footer">Impreso: ${new Date().toLocaleDateString('es-ES')} | Retiro de Emaús</div>
      </body></html>`;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-amber-700 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            <h2 className="text-base font-bold">Reporte de Caminantes</h2>
          </div>
          <button onClick={onClose} className="hover:opacity-75"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-1 leading-snug">Se imprimirá un reporte con todos los caminantes de <strong>{comunidadNombre || "Vista Global"}</strong>.</p>
          <p className="text-xs text-gray-500 mb-3">{caminantes.length} caminante(s)</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
            <button onClick={handlePrint} className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}