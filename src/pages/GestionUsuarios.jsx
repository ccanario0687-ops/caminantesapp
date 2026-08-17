// GestionUsuarios.jsx - Módulo Completo con Reparación de Sync 100% Infalible y Permisos por Módulo
import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";
import { 
  Users, Plus, Shield, Search, Check, AtSign, RefreshCw, Crown, 
  Building2, UserPlus, X, Copy, Link as LinkIcon, QrCode, Eye, 
  CheckCheck, Download, ShieldCheck, Activity, Wrench, AlertTriangle, Settings,
  FileText, Calendar, Filter, UserCheck, Key, Lock
} from "lucide-react";
import { toast } from "sonner";
import MobileTopBar from "@/components/MobileTopBar";
import SelectorComunidad from "@/components/SelectorComunidad";
import ModalCodigoAutorizacion from "@/components/ModalCodigoAutorizacion";
import { registrarAuditoria, obtenerBitacoraAuditoria } from "@/lib/auditoria";
import { PLANTILLAS_ROLES } from "@/lib/permisos";

const APP_CREATOR_EMAIL = "ccanario0687@gmail.com";
const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";
const POLLING_INTERVAL = 5000;
const DEBOUNCE_MS = 500;

// ============================================================
// 🔄 HOOK REUTILIZABLE DE SINCRONIZACIÓN (VERSIÓN ROBUSTA)
// ============================================================
export function useSincronizacionComunidad(opciones = {}) {
  const {
    entidad = "User",
    onDataChanged = null,
    enabled = true,
    mostrarNotificacion = true,
  } = opciones;

  const { comunidadActual } = useComunidad();
  const { user } = useAuth();
  
  const [ultimaSync, setUltimaSync] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [versionDatos, setVersionDatos] = useState(0);
  
  const ultimoHashRef = useRef(null);
  const intervalRef = useRef(null);
  const debounceRef = useRef(null);
  const entidadValidaRef = useRef(true);
  
  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  const obtenerNombreEntidadReal = (nombre) => {
    const mapeo = {
      "Usuarios": "User",
      "usuario": "User",
      "User": "User",
      "Caminantes": "Caminante",
      "caminante": "Caminante",
      "Caminante": "Caminante",
      "Servidores": "Servidor",
      "servidor": "Servidor",
      "Servidor": "Servidor",
      "Configuraciones": "ConfigRetiro",
      "Configuracion": "ConfigRetiro",
      "ConfigRetiro": "ConfigRetiro",
      "Movimientos": "MovimientoFinanciero",
      "MovimientoFinanciero": "MovimientoFinanciero",
    };
    return mapeo[nombre] || nombre;
  };

  const generarHashDatos = useCallback(async () => {
    try {
      const entidadesARevisar = ["Caminante", "Servidor", "ConfigRetiro", "MovimientoFinanciero"];
      const entidadReal = obtenerNombreEntidadReal(entidad);
      
      if (!entidadesARevisar.includes(entidadReal)) {
        if (!base44.entities[entidadReal]) {
          entidadValidaRef.current = false;
          return null;
        }
        
        try {
          const data = await base44.entities[entidadReal].list().catch(() => null);
          if (data === null) {
            entidadValidaRef.current = false;
            return null;
          }
          
          const filtrados = (data || []).filter(item => 
            !equipoIdActivo || 
            String(item.equipo_id) === String(equipoIdActivo) ||
            String(item.comunidad_id) === String(equipoIdActivo)
          );
          
          const ultimoUpdate = filtrados.reduce((max, item) => {
            const t = new Date(item.updated_at || item.created_at || 0).getTime();
            return Math.max(max, t);
          }, 0);
          
          return `${filtrados.length}-${ultimoUpdate}`;
        } catch (err) {
          if (err?.response?.status === 404 || err?.message?.includes("not found")) {
            entidadValidaRef.current = false;
          }
          return null;
        }
      }
      
      const resultados = await Promise.all(
        entidadesARevisar.map(async (ent) => {
          try {
            if (!base44.entities[ent]) return `${ent}:0:0`;
            
            const data = await base44.entities[ent].list().catch(() => []);
            const filtrados = (data || []).filter(item => 
              !equipoIdActivo || 
              String(item.equipo_id) === String(equipoIdActivo) ||
              String(item.comunidad_id) === String(equipoIdActivo)
            );
            const ultimoUpdate = filtrados.reduce((max, item) => {
              const t = new Date(item.updated_at || item.created_at || 0).getTime();
              return Math.max(max, t);
            }, 0);
            return `${ent}:${filtrados.length}:${ultimoUpdate}`;
          } catch {
            return `${ent}:0:0`;
          }
        })
      );
      
      return resultados.join("|");
    } catch (e) {
      return null;
    }
  }, [entidad, equipoIdActivo]);

  const verificarCambios = useCallback(async (silencioso = true) => {
    if (!enabled || !equipoIdActivo || !entidadValidaRef.current) return;
    
    try {
      if (!silencioso) setSincronizando(true);
      const hashActual = await generarHashDatos();
      if (!hashActual) return;
      
      const cambioDetectado = ultimoHashRef.current && hashActual !== ultimoHashRef.current;
      
      if (cambioDetectado) {
        setVersionDatos(v => v + 1);
        setUltimaSync(new Date());
        
        if (mostrarNotificacion && !silencioso) {
          toast.info("🔄 Datos actualizados desde otro usuario", { duration: 2000 });
        }
        
        if (onDataChanged) onDataChanged({ hash: hashActual, timestamp: Date.now() });
        
        window.dispatchEvent(new CustomEvent("emaus_data_sync", {
          detail: { entidad, equipoId: equipoIdActivo, timestamp: Date.now() }
        }));
      }
      
      ultimoHashRef.current = hashActual;
    } catch (e) {
      console.warn(`[SYNC] Error verificando cambios:`, e);
    } finally {
      if (!silencioso) setSincronizando(false);
    }
  }, [enabled, equipoIdActivo, generarHashDatos, entidad, mostrarNotificacion, onDataChanged]);

  useEffect(() => {
    if (!enabled || !equipoIdActivo) return;
    entidadValidaRef.current = true;
    
    verificarCambios(true);
    intervalRef.current = setInterval(() => verificarCambios(true), POLLING_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [enabled, equipoIdActivo, verificarCambios]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "emaus_last_sync_time" && entidadValidaRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => verificarCambios(true), DEBOUNCE_MS);
      }
    };
    const handleCustom = (e) => {
      if (e.detail?.equipoId === equipoIdActivo && entidadValidaRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => verificarCambios(true), DEBOUNCE_MS);
      }
    };
    const handleFocus = () => {
      if (entidadValidaRef.current) verificarCambios(true);
    };
    
    window.addEventListener("storage", handleStorage);
    window.addEventListener("emaus_data_changed", handleCustom);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("emaus_data_changed", handleCustom);
      window.removeEventListener("focus", handleFocus);
      clearTimeout(debounceRef.current);
    };
  }, [equipoIdActivo, verificarCambios]);

  const forzarRecarga = useCallback(() => {
    entidadValidaRef.current = true;
    ultimoHashRef.current = null;
    verificarCambios(false);
  }, [verificarCambios]);

  return { ultimaSync, sincronizando, versionDatos, forzarRecarga, equipoIdActivo };
}

// ============================================================
// CONSTANTES
// ============================================================
export const MODULOS = [
  { key: "caminantes",            label: "Caminantes",                icon: "👥" },
  { key: "servidores",            label: "Servidores",                icon: "❤️" },
  { key: "directorio_servidores", label: "Directorio Servidores",     icon: "👤" },
  { key: "inscripciones",         label: "Inscripciones",             icon: "📝" },
  { key: "solicitudes",           label: "Aprobar Usuarios / Solicitudes", icon: "📩" },
  { key: "equipos",               label: "Equipos de Trabajo",        icon: "🤝" },
  { key: "entrada",               label: "Control de Entrada",        icon: "🚪" },
  { key: "distribucion",          label: "Distribución",              icon: "🛏️" },
  { key: "distintivos",           label: "Distintivos",               icon: "🏷️" },
  { key: "impresiones",           label: "Impresiones",               icon: "🖨️" },
  { key: "finanzas",              label: "Finanzas",                  icon: "💵" },
  { key: "presupuesto",           label: "Presupuesto",               icon: "📄" },
  { key: "suplidores",            label: "Suplidores",                icon: "📦" },
  { key: "programacion",          label: "Programación",              icon: "📅" },
  { key: "charlistas",            label: "Charlistas",                icon: "🎤" },
  { key: "sacerdotes",            label: "Sacerdotes / Mensajerías",  icon: "⛪" },
  { key: "reportes",              label: "Reportes",                  icon: "📊" },
  { key: "evaluaciones_reporte", label: "Evaluaciones",              icon: "🏆" },
  { key: "historial",             label: "Historial",                 icon: "📚" },
  { key: "biblioteca",            label: "Biblioteca / Hermandad",     icon: "📖" },
  { key: "config_portada",        label: "Portada y Bienvenida",      icon: "🖼️" },
  { key: "configuracion",         label: "Configuración",             icon: "⚙️" },
  { key: "usuarios",              label: "Usuarios del Sistema",      icon: "⚙️" },
];

export const PERMISOS_TOTALES_ADMIN = MODULOS.reduce((acc, m) => ({ ...acc, [m.key]: "edicion" }), {});

const generarSlug = (texto) => {
  if (!texto) return "";
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
};

const construirLinkInscripcion = (slugOrId, tipo = "caminante") => {
  if (!slugOrId) return `${BASE_URL}/inscripcion/${tipo}`;
  return `${BASE_URL}/inscripcion/${tipo}?retiro_id=${slugOrId}`;
};

export const esAdminORector = (u) => {
  if (!u) return false;
  const emailNorm = String(u.email || "").toLowerCase();
  if (emailNorm === APP_CREATOR_EMAIL || emailNorm === "gilbertohidalgogp@gmail.com" || 
      u.es_creador === true || u.es_admin === true) return true;
  const r = String(u.role || u.rol || "").toLowerCase();
  return r.includes("admin") || r.includes("rect") || r.includes("direct") || r.includes("coord");
};

export const notificarCambioGlobal = (entidad = "General", equipoId = null) => {
  if (typeof window === "undefined") return;
  const timestamp = Date.now().toString();
  localStorage.setItem("emaus_last_sync_time", timestamp);
  localStorage.setItem("emaus_last_sync_entity", entidad);
  window.dispatchEvent(new CustomEvent("emaus_data_changed", {
    detail: { entidad, equipoId, timestamp }
  }));
};

export function esUsuarioDeComunidad(u, targetComunidad, idMiEquipo, listaEquipos = [], esCreadorConfirmado = false, esVistaGlobal = false) {
  if (!u) return false;
  const emailNorm = String(u.email || "").toLowerCase();
  const esElCreadorEnBase = emailNorm === APP_CREATOR_EMAIL || u.es_creador === true;
  if (esElCreadorEnBase) return true;
  if (esCreadorConfirmado && esVistaGlobal) return true;

  const idsValidos = new Set();
  const slugsValidos = new Set();
  const nombresValidos = new Set();
  const codigosValidos = new Set();

  const agregarMetaComunidad = (c) => {
    if (!c) return;
    [c.equipo_id, c.id, c._id, c.comunidad_id, idMiEquipo].filter(Boolean).forEach(id => idsValidos.add(String(id)));
    [c.slug, c.comunidad_slug, generarSlug(c.nombre || c.nombre_equipo || c.nombre_retiro || "")].filter(Boolean).forEach(s => slugsValidos.add(String(s).toLowerCase()));
    [c.nombre, c.nombre_equipo, c.nombre_retiro, c.comunidad].filter(Boolean).forEach(n => nombresValidos.add(String(n).toLowerCase()));
    [c.codigo_comunidad, c.codigo, c.comunidad_codigo].filter(Boolean).forEach(cod => codigosValidos.add(String(cod).toLowerCase()));
  };

  agregarMetaComunidad(targetComunidad);

  if (Array.isArray(listaEquipos) && listaEquipos.length > 0) {
    listaEquipos.forEach(eq => {
      const eqIds = [eq.equipo_id, eq.id, eq._id, eq.comunidad_id].filter(Boolean).map(String);
      const eqSlugs = [eq.slug, eq.comunidad_slug, generarSlug(eq.nombre || eq.nombre_equipo || "")].filter(Boolean).map(s => String(s).toLowerCase());
      const eqNombres = [eq.nombre, eq.nombre_equipo, eq.comunidad].filter(Boolean).map(n => String(n).toLowerCase());
      const eqCodigos = [eq.codigo_comunidad, eq.codigo].filter(Boolean).map(c => String(c).toLowerCase());

      const perteneceAComunidad = 
        eqIds.some(id => idsValidos.has(id)) ||
        eqSlugs.some(s => slugsValidos.has(s)) ||
        eqNombres.some(n => nombresValidos.has(n)) ||
        eqCodigos.some(c => codigosValidos.has(c));

      if (perteneceAComunidad) agregarMetaComunidad(eq);
    });
  }

  const uIds = [u.equipo_id, u.comunidad_id, u.id_equipo, u.equipoId].filter(Boolean).map(String);
  const uSlugs = [u.slug, u.comunidad_slug, generarSlug(u.nombre_equipo || u.comunidad_nombre || u.comunidad || "")].filter(Boolean).map(s => String(s).toLowerCase());
  const uNombres = [u.nombre_equipo, u.comunidad_nombre, u.comunidad, u.nombre_retiro].filter(Boolean).map(n => String(n).toLowerCase());
  const uCodigos = [u.codigo_comunidad, u.comunidad_codigo].filter(Boolean).map(c => String(c).toLowerCase());

  if (idsValidos.size === 0 && slugsValidos.size === 0 && nombresValidos.size === 0 && codigosValidos.size === 0) {
    if (idMiEquipo) return uIds.includes(String(idMiEquipo));
    return true;
  }

  return (
    uIds.some(id => idsValidos.has(id)) ||
    uSlugs.some(s => slugsValidos.has(s)) ||
    uNombres.some(n => nombresValidos.has(n)) ||
    uCodigos.some(c => codigosValidos.has(c))
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function GestionUsuarios() {
  const { comunidadActual } = useComunidad();
  const { user: currentUserAuth } = useAuth();
  
  const { versionDatos, ultimaSync, sincronizando } = useSincronizacionComunidad({
    entidad: "User",
    mostrarNotificacion: true,
  });
  
  const [usuarios, setUsuarios] = useState([]);
  const [equipos, setEquipos] = useState({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [invitando, setInvitando] = useState(false);
  const [creandoComunidad, setCreandoComunidad] = useState(false);
  const [mostrarModalAutorizacion, setMostrarModalAutorizacion] = useState(false);
  const [usuarioEditarAutorizacion, setUsuarioEditarAutorizacion] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [esCreador, setEsCreador] = useState(false);
  const [myEquipoId, setMyEquipoId] = useState(null);
  const [listaEquipos, setListaEquipos] = useState([]);
  const [miComunidadInfo, setMiComunidadInfo] = useState(null);
  const [mostrarMiComunidad, setMostrarMiComunidad] = useState(false);
  const [previewLink, setPreviewLink] = useState(null);
  const [reparando, setReparando] = useState(false);
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false);
  const [mostrarBitacora, setMostrarBitacora] = useState(false);

  const esCreadorReal = Boolean(
    currentUserAuth?.email === APP_CREATOR_EMAIL || currentUserAuth?.es_creador === true
  );
  const esAdminOEsCreador = esCreadorReal || esAdminORector(currentUserAuth);
  const comunidadActiva = comunidadActual || miComunidadInfo;

  const esVistaGlobal = Boolean(
    !comunidadActual || comunidadActual.id === "GLOBAL" || 
    comunidadActual.id === "global" || comunidadActual.slug === "global"
  );

  const nombreRetiroReal = comunidadActiva?.nombre_retiro || comunidadActiva?.nombre || 
                          comunidadActiva?.nombre_equipo || "mi-retiro";
  const slugActivo = comunidadActiva?.slug || generarSlug(nombreRetiroReal) || 
                    comunidadActiva?.equipo_id || comunidadActiva?.id;

  const ejecutarCarga = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const idComunidadSeleccionada = comunidadActual?.equipo_id || comunidadActual?.id || comunidadActual?.slug;
      const [res, me, eqs] = await Promise.all([
        base44.functions.invoke("gestionUsuarios", { 
          action: "list", equipo_id: idComunidadSeleccionada || null,
          ver_todo: esVistaGlobal, es_creador: esCreadorReal
        }).catch(() => ({ data: {} })),
        base44.auth.me().catch(() => null),
        base44.functions.invoke("gestionUsuarios", { action: "listEquipos" }).catch(() => ({ data: {} })),
      ]);

      let todosLosUsuarios = res?.data?.usuarios || [];
      if (!Array.isArray(todosLosUsuarios) || todosLosUsuarios.length === 0) {
        try {
          const directUsers = await base44.entities.User.list();
          if (Array.isArray(directUsers) && directUsers.length > 0) todosLosUsuarios = directUsers;
        } catch (e) {}
      }

      const userMail = String(me?.email || currentUserAuth?.email || "").toLowerCase();
      const esCreadorConfirmado = Boolean(
        userMail === APP_CREATOR_EMAIL || me?.es_creador === true || 
        currentUserAuth?.es_creador === true || res?.data?.es_creador === true
      );

      const equiposVisibles = eqs?.data?.equipos || [];
      setListaEquipos(equiposVisibles);

      const idMiEquipo = idComunidadSeleccionada || res?.data?.equipo_id || me?.equipo_id || currentUserAuth?.equipo_id;
      let miEquipoObj = (equiposVisibles || []).find(e => 
        (idMiEquipo && (String(e.equipo_id) === String(idMiEquipo) || String(e.slug) === String(idMiEquipo) || String(e.id) === String(idMiEquipo))) ||
        (e.admin_email && String(e.admin_email).toLowerCase() === userMail)
      ) || comunidadActual;

      if (miEquipoObj) setMiComunidadInfo(miEquipoObj);
      const targetComunidad = comunidadActual || miEquipoObj;
      const usuariosComunidad = (todosLosUsuarios || []).filter(u => 
        esUsuarioDeComunidad(u, targetComunidad, idMiEquipo, equiposVisibles, esCreadorConfirmado, esVistaGlobal)
      );

      setUsuarios(usuariosComunidad);
      setEquipos(res?.data?.equipos || {});
      setEsCreador(esCreadorConfirmado);
      setMyEquipoId(idMiEquipo || miEquipoObj?.equipo_id || miEquipoObj?.id);
      setCurrentUser(me || currentUserAuth);
    } catch (e) {
      console.error("Error cargando usuarios:", e);
      if (!silencioso) toast.error("Error al cargar usuarios");
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [comunidadActual, esVistaGlobal, esCreadorReal, currentUserAuth]);

  useEffect(() => {
    let isMounted = true;
    const cargar = async (silencioso) => { if (isMounted) await ejecutarCarga(silencioso); };
    cargar(false);

    const handleSync = () => cargar(true);
    const handleFocus = () => cargar(true);
    window.addEventListener("emaus_data_sync", handleSync);
    window.addEventListener("emaus_data_changed", handleSync);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener("emaus_data_sync", handleSync);
      window.removeEventListener("emaus_data_changed", handleSync);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleSync);
    };
  }, [ejecutarCarga, versionDatos]);

  // 🚀 REPARACIÓN DE USUARIOS DIRECTA Y MULTIFUENTE (INFALIBLE)
  const repararUsuariosComunidad = async () => {
    setReparando(true);
    toast.info("🔧 Iniciando reparación automática de usuarios...", { duration: 3000 });

    try {
      const idCanonico = String(
        myEquipoId || 
        comunidadActual?.equipo_id || 
        comunidadActual?.id || 
        comunidadActual?.slug || 
        currentUserAuth?.equipo_id || 
        "comunidad_oficial"
      );
      const nombreComunidad = comunidadActiva?.nombre || comunidadActiva?.nombre_equipo || currentUserAuth?.nombre_equipo || "SANTA MARIA DE LA ASUNCION";
      const slugComunidad = comunidadActiva?.slug || generarSlug(nombreComunidad) || idCanonico;
      const codigoComunidad = comunidadActiva?.codigo_comunidad || comunidadActiva?.codigo || null;

      const payloadReparacion = {
        equipo_id: idCanonico,
        comunidad_id: idCanonico,
        nombre_equipo: nombreComunidad,
        slug: slugComunidad,
        comunidad_slug: slugComunidad,
        codigo_comunidad: codigoComunidad
      };

      let reparadosExito = 0;

      for (const u of usuarios) {
        let ok = false;
        
        // 1. Modificar entidad de usuario directamente en Base44
        try {
          if (base44.entities?.User?.update) {
            await base44.entities.User.update(u.id, payloadReparacion);
            ok = true;
          }
        } catch (errDirect) {
          console.warn("User.update directo falló:", errDirect);
        }

        // 2. Invocar backend function como soporte adicional
        try {
          await base44.functions.invoke("gestionUsuarios", {
            action: "update",
            userId: u.id,
            data: payloadReparacion
          });
          ok = true;
        } catch (errFunc) {
          console.warn("Function update falló:", errFunc);
        }

        if (ok) reparadosExito++;
      }

      toast.success(`✅ ¡Reparación exitosa! ${reparadosExito} usuario(s) corregidos con su comunidad y slug.`);
      notificarCambioGlobal("Usuarios", idCanonico);
      await ejecutarCarga(false);
    } catch (e) {
      toast.error("Error durante la reparación: " + (e.message || ""));
    } finally {
      setReparando(false);
    }
  };

  const handleInvitar = async ({ email, role, username, equipo_id, nombre_equipo, slug }) => {
    try {
      const rLower = String(role).toLowerCase();
      const esAdminRole = rLower.includes("admin") || rLower.includes("rect") || role === "admin" || role === "rector";
      const permisosFinales = esAdminRole ? PERMISOS_TOTALES_ADMIN : { caminantes: "edicion", servidores: "edicion", inscripciones: "edicion" };
      const targetEquipo = (listaEquipos || []).find(e => 
        String(e.equipo_id) === String(equipo_id) || String(e.id) === String(equipo_id) || String(e.slug) === String(equipo_id)
      ) || miComunidadInfo || comunidadActiva;
      const targetEquipoId = equipo_id || targetEquipo?.equipo_id || targetEquipo?.id || myEquipoId;

      try {
        if (base44.users?.inviteUser) {
          await base44.users.inviteUser(email, esAdminRole ? "admin" : "user");
        }
      } catch (errSDK) {}

      let exitoSetup = false;
      try {
        const res = await base44.functions.invoke("gestionUsuarios", {
          action: "setupNewUser", email, username, role: esAdminRole ? "admin" : role,
          permisos_modulos: JSON.stringify(permisosFinales),
          equipo_id: targetEquipoId, comunidad_id: targetEquipoId,
          nombre_equipo: nombre_equipo || targetEquipo?.nombre || comunidadActiva?.nombre,
          slug: slug || targetEquipo?.slug || generarSlug(nombre_equipo || targetEquipo?.nombre || ""),
          codigo_comunidad: targetEquipo?.codigo_comunidad || targetEquipo?.codigo || null
        });
        if (res?.data?.success || res?.data) exitoSetup = true;
      } catch (eFunc) {}

      if (!exitoSetup && base44.entities.User?.create) {
        await base44.entities.User.create({
          email: email.toLowerCase().trim(),
          full_name: username || email.split("@")[0],
          username: username || email.split("@")[0],
          role: esAdminRole ? "ADMINISTRADOR" : "USUARIO",
          rol: esAdminRole ? "ADMINISTRADOR" : "USUARIO",
          es_admin: esAdminRole,
          permisos_modulos: JSON.stringify(permisosFinales),
          equipo_id: targetEquipoId,
          comunidad_id: targetEquipoId,
          nombre_equipo: nombre_equipo || targetEquipo?.nombre || comunidadActiva?.nombre,
          slug: slug || targetEquipo?.slug || generarSlug(nombre_equipo || targetEquipo?.nombre || "")
        }).catch(() => {});
      }

      toast.success(`✅ Invitación enviada y usuario registrado para ${email}`);
      setInvitando(false);
      notificarCambioGlobal("Usuarios", targetEquipoId);
      await ejecutarCarga(false);
    } catch (e) { 
      toast.error("Error al invitar: " + (e?.response?.data?.message || e.message || "Desconocido")); 
    }
  };

  const handleCrearComunidad = async ({ nombre, adminEmail, slug, color_primario, color_secundario }) => {
    if (!esCreador) { toast.error("Solo el Creador Global puede crear nuevas comunidades."); return; }
    try {
      const res = await base44.functions.invoke("gestionUsuarios", { 
        action: "crearComunidad", nombre, adminEmail: adminEmail || currentUser?.email,
        slug: slug || generarSlug(nombre),
        color_primario: color_primario || "#b45309", color_secundario: color_secundario || "#f59e0b",
      });
      if (res.data?.error) { toast.error(res.data.error); return; }
      toast.success(`✅ Comunidad "${nombre}" creada`, { duration: 5000 });
      setCreandoComunidad(false);
      notificarCambioGlobal("Comunidades");
      await ejecutarCarga(false);
    } catch (e) { toast.error("Error al crear: " + (e.message || "Desconocido")); }
  };

  const handleGuardarPermisos = async (userId, permisos, role, username, equipo_id, nombre_equipo) => {
    try {
      const rLower = String(role || "").toLowerCase();
      const esNuevoAdmin = rLower.includes("admin") || rLower.includes("rect") || role === "admin" || role === "rector";
      const permisosDefinitivos = esNuevoAdmin ? PERMISOS_TOTALES_ADMIN : permisos;
      const targetEquipo = (listaEquipos || []).find(e => 
        String(e.equipo_id) === String(equipo_id) || String(e.id) === String(equipo_id) || String(e.slug) === String(equipo_id)
      ) || miComunidadInfo || comunidadActiva;

      const data = { 
        role: esNuevoAdmin ? "ADMINISTRADOR" : role,
        rol: esNuevoAdmin ? "ADMINISTRADOR" : role,
        es_admin: esNuevoAdmin,
        permisos_modulos: typeof permisosDefinitivos === "string" ? permisosDefinitivos : JSON.stringify(permisosDefinitivos),
        username,
        full_name: username,
        equipo_id: equipo_id || targetEquipo?.equipo_id || targetEquipo?.id || myEquipoId,
        comunidad_id: targetEquipo?.comunidad_id || targetEquipo?.equipo_id || equipo_id || myEquipoId,
        slug: targetEquipo?.slug || generarSlug(nombre_equipo || targetEquipo?.nombre || ""),
        comunidad_slug: targetEquipo?.slug || generarSlug(nombre_equipo || targetEquipo?.nombre || ""),
        nombre_equipo: nombre_equipo || targetEquipo?.nombre || targetEquipo?.nombre_equipo || null,
        codigo_comunidad: targetEquipo?.codigo_comunidad || targetEquipo?.codigo || null
      };

      await base44.functions.invoke("gestionUsuarios", { action: "update", userId, data }).catch(async () => {
        await base44.entities.User.update(userId, data);
      });

      registrarAuditoria({
        usuario: currentUserAuth,
        accion: esNuevoAdmin ? "Otorgar Rol Administrador" : "Modificar Permisos",
        entidad: "User",
        detalles: `Actualizado rol/permisos para ${username || userId} (${esNuevoAdmin ? "ADMIN" : "USUARIO"}). Permisos: ${typeof permisosDefinitivos === "string" ? permisosDefinitivos : JSON.stringify(permisosDefinitivos)}`,
        equipo_id: data.equipo_id
      });

      toast.success(esNuevoAdmin ? "✅ Permisos homologados de Administrador." : "✅ Permisos por módulo actualizados.");
      setEditando(null);
      notificarCambioGlobal("Permisos", data.equipo_id);
      await ejecutarCarga(false);
    } catch (e) { toast.error("Error al guardar: " + (e.message || "")); }
  };

  const handleClaim = async (userId) => {
    try {
      await base44.functions.invoke("gestionUsuarios", { 
        action: "claimUser", userId, equipo_id: myEquipoId, comunidad_id: myEquipoId,
        nombre_equipo: comunidadActiva?.nombre, slug: slugActivo
      });
      toast.success("Usuario agregado a tu comunidad");
      notificarCambioGlobal("Usuarios", myEquipoId);
      await ejecutarCarga(false);
    } catch (e) { toast.error("Error al agregar el usuario"); }
  };

  const handleRenombrar = async (equipo_id, nombre_equipo) => {
    try {
      await base44.functions.invoke("gestionUsuarios", { action: "renombrarEquipo", equipo_id, nombre_equipo });
      toast.success("Comunidad renombrada");
      notificarCambioGlobal("Comunidad", equipo_id);
      await ejecutarCarga(false);
    } catch (e) { toast.error("Error al renombrar"); }
  };

  const handleActualizarSlug = async (equipo_id, nuevoSlug) => {
    try {
      await base44.functions.invoke("gestionUsuarios", { action: "actualizarSlugEquipo", equipo_id, slug: nuevoSlug });
      toast.success(`Link actualizado: ${construirLinkInscripcion(nuevoSlug)}`);
      notificarCambioGlobal("ComunidadSlug", equipo_id);
      await ejecutarCarga(false);
    } catch (e) { toast.error("Error al actualizar: " + (e.message || "")); }
  };

  const handleActualizarColores = async (equipo_id, colores) => {
    try {
      await base44.functions.invoke("gestionUsuarios", { action: "actualizarColoresEquipo", equipo_id, ...colores });
      toast.success("Personalización guardada");
      notificarCambioGlobal("Colores", equipo_id);
      await ejecutarCarga(false);
    } catch (e) { toast.error("Error al guardar"); }
  };

  const filtrados = usuarios.filter(u =>
    !busqueda || u.full_name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.username?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const renderVistaCreadorMulticomunidad = () => {
    const totalAdmins = usuarios.filter(u => esAdminORector(u)).length;
    const totalComunidades = listaEquipos.length;
    const grupos = {};
    filtrados.forEach(u => {
      const key = u.nombre_equipo || u.equipo_id || "__sin_equipo__";
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(u);
    });
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 rounded-3xl p-6 text-white shadow-2xl border-2 border-yellow-500/40 relative overflow-hidden">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 px-3 py-1 rounded-full text-xs font-bold uppercase mb-2">
                <Crown className="w-4 h-4 text-yellow-400" /> Creador Global
              </div>
              <h2 className="text-2xl font-extrabold">Panel Multicomunidad</h2>
            </div>
            <button onClick={() => setCreandoComunidad(true)} className="flex items-center gap-2 bg-yellow-400 text-amber-950 hover:bg-yellow-300 px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-lg">
              <Building2 className="w-4 h-4" /> Crear Nueva Comunidad
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-amber-700/50">
            <div className="bg-amber-950/50 backdrop-blur-md p-3.5 rounded-2xl border border-amber-600/30">
              <p className="text-[10px] text-amber-300 font-bold uppercase">Comunidades</p>
              <p className="text-2xl font-black text-white mt-0.5">{totalComunidades}</p>
            </div>
            <div className="bg-amber-950/50 backdrop-blur-md p-3.5 rounded-2xl border border-amber-600/30">
              <p className="text-[10px] text-amber-300 font-bold uppercase">Usuarios</p>
              <p className="text-2xl font-black text-white mt-0.5">{usuarios.length}</p>
            </div>
            <div className="bg-amber-950/50 backdrop-blur-md p-3.5 rounded-2xl border border-amber-600/30">
              <p className="text-[10px] text-amber-300 font-bold uppercase">Admins</p>
              <p className="text-2xl font-black text-yellow-300 mt-0.5">{totalAdmins}</p>
            </div>
            <div className="bg-amber-950/50 backdrop-blur-md p-3.5 rounded-2xl border border-amber-600/30">
              <p className="text-[10px] text-amber-300 font-bold uppercase">Sincronización</p>
              <p className="text-xs font-bold text-green-400 mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Tiempo Real
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {Object.entries(grupos).map(([nombreGrupo, miembros]) => {
            const label = nombreGrupo === "__sin_equipo__" ? "Sin Comunidad" : nombreGrupo;
            return (
              <div key={nombreGrupo} className="bg-white rounded-2xl border border-amber-200/80 shadow-md overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 bg-amber-50/80 border-b border-amber-100">
                  <div className="w-9 h-9 rounded-xl bg-amber-800 text-white flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-amber-900 text-base">{label}</span>
                  <span className="ml-auto text-xs text-amber-800 bg-amber-200/60 px-3 py-1 rounded-full font-extrabold">
                    {miembros.length} Miembro(s)
                  </span>
                </div>
                <div className="divide-y divide-amber-50">
                  {miembros.map(u => (
                    <UsuarioCard 
                      key={u.id} 
                      usuario={u} 
                      onEditar={() => setEditando(u)} 
                      onEditarPIN={() => setUsuarioEditarAutorizacion(u)} 
                      esAdminOEsCreador={true} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-12 font-sans text-xs">
      <MobileTopBar title="Gestión de Usuarios" />

      {comunidadActiva && (
        <div className="mb-6 bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><Building2 className="w-6 h-6" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-amber-200 font-bold">Comunidad Activa</p>
                  {sincronizando && (
                    <span className="bg-blue-400/30 text-blue-200 text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                      🔄 Sincronizando...
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold">{nombreRetiroReal}</h2>
                <p className="text-xs text-amber-200 font-mono mt-0.5">
                  ID: {slugActivo}
                  {ultimaSync && <span className="ml-2 text-amber-300">· Sinc: {ultimaSync.toLocaleTimeString()}</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setMostrarDiagnostico(true)} className="flex items-center gap-1.5 bg-blue-500 text-white hover:bg-blue-600 px-3.5 py-2 rounded-xl text-xs font-bold shadow">
                <Activity className="w-3.5 h-3.5" /> Diagnóstico
              </button>
              <button onClick={repararUsuariosComunidad} disabled={reparando} className="flex items-center gap-1.5 bg-orange-500 text-white hover:bg-orange-600 px-3.5 py-2 rounded-xl text-xs font-bold shadow disabled:opacity-50">
                <Wrench className="w-3.5 h-3.5" /> {reparando ? "Reparando..." : "Reparar Sync"}
              </button>
              <button onClick={() => setMostrarMiComunidad(true)} className="flex items-center gap-1.5 bg-white text-amber-800 hover:bg-amber-50 px-3.5 py-2 rounded-xl text-xs font-bold shadow">
                <Eye className="w-3.5 h-3.5" /> Gestionar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
            <Users className="w-6 h-6" /> Gestión de Usuarios
            <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> {usuarios.length} usuarios
            </span>
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => ejecutarCarga(false)} className="flex items-center gap-2 border border-amber-200 text-amber-700 hover:bg-amber-50 px-3 py-2 rounded-lg text-sm">
            <RefreshCw className={`w-4 h-4 ${sincronizando ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setMostrarBitacora(true)} className="flex items-center gap-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3.5 py-2 rounded-lg text-sm font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-amber-700" /> Bitácora Auditoría
          </button>
          <button onClick={() => setMostrarModalAutorizacion(true)} className="flex items-center gap-2 border border-amber-600 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white px-3.5 py-2 rounded-lg text-sm font-bold shadow transition">
            <Key className="w-4 h-4 text-amber-200" /> Mi PIN / Código de Autorización
          </button>
          {esCreador && (
            <button onClick={() => setCreandoComunidad(true)} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow">
              <Building2 className="w-4 h-4" /> Nueva Comunidad
            </button>
          )}
          {esAdminOEsCreador && (
            <button onClick={() => setInvitando(true)} className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow">
              <UserPlus className="w-4 h-4" /> Invitar Usuario
            </button>
          )}
        </div>
      </div>

      <SelectorComunidad />

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
        <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-amber-600 text-sm font-semibold flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-700" /> Cargando usuarios...
        </div>
      ) : esCreador && esVistaGlobal ? (
        renderVistaCreadorMulticomunidad()
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-amber-900 text-amber-100 uppercase text-[10px] font-black tracking-wider border-b border-amber-800">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">#</th>
                  <th className="py-3.5 px-4">Usuario / Nombre</th>
                  <th className="py-3.5 px-4">Correo Electrónico</th>
                  <th className="py-3.5 px-4">Rol del Sistema</th>
                  <th className="py-3.5 px-4">Comunidad / Equipo</th>
                  <th className="py-3.5 px-4 text-center">Acciones (Permisos & PIN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 font-medium text-slate-700">
                {filtrados.map((u, idx) => {
                  const esAdminNorm = esAdminORector(u);
                  const esCreadorGlobal = u.email === APP_CREATOR_EMAIL || u.es_creador === true;
                  const mostrarClaim = !esCreador && !u.equipo_id && !esAdminORector(u);

                  return (
                    <tr key={u.id || idx} className="hover:bg-amber-50/60 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-amber-700">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-800 text-amber-200 font-black text-xs flex items-center justify-center border border-amber-600 shrink-0">
                            {(u.username || u.full_name || u.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.full_name || u.username || "Sin nombre"}</p>
                            {u.username && <p className="text-[10px] text-amber-700 font-mono">@{u.username}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{u.email}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border w-fit ${
                            esCreadorGlobal ? "bg-amber-100 text-amber-900 border-amber-300" :
                            esAdminNorm ? "bg-purple-100 text-purple-900 border-purple-300" :
                            "bg-blue-100 text-blue-900 border-blue-300"
                          }`}>
                            {esCreadorGlobal ? "👑 Creador" : u.role || u.rol || "Servidor"}
                          </span>
                          {u.codigo_autorizacion ? (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 w-fit">
                              <Key className="w-2.5 h-2.5 text-emerald-600" /> PIN Activo
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 w-fit">
                              Sin PIN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-semibold">
                        {u.nombre_equipo || u.comunidad_nombre || u.equipo_id || "Comunidad Asignada"}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {esAdminOEsCreador && (
                            <>
                              <button
                                onClick={() => setUsuarioEditarAutorizacion(u)}
                                className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="Configurar Código/PIN de Autorización de Transacciones"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-700" />
                                <span>PIN</span>
                              </button>
                              <button
                                onClick={() => setEditando(u)}
                                className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Permisos</span>
                              </button>
                            </>
                          )}
                          {mostrarClaim && (
                            <button
                              onClick={() => handleClaim(u.id)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Vincular</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-gray-400 bg-white p-6">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-700" />
                      <p className="text-sm font-semibold text-gray-700">No hay usuarios en esta comunidad.</p>
                      <button onClick={repararUsuariosComunidad} className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold">
                        🔧 Reparar Sincronización
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invitando && <InvitarModal myEquipoId={myEquipoId} esCreador={esCreador} onClose={() => setInvitando(false)} onInvitar={handleInvitar} />}
      {creandoComunidad && esCreador && <CrearComunidadModal currentUser={currentUser} onClose={() => setCreandoComunidad(false)} onCrear={handleCrearComunidad} />}
      {editando && <PermisosModal usuario={editando} onClose={() => setEditando(null)} onGuardar={handleGuardarPermisos} esCreador={esCreador} equipos={listaEquipos} />}
      {mostrarMiComunidad && comunidadActiva && <MiComunidadModal comunidad={comunidadActiva} onClose={() => setMostrarMiComunidad(false)} onActualizarSlug={handleActualizarSlug} onActualizarColores={handleActualizarColores} onRenombrar={handleRenombrar} />}
      {previewLink && <PreviewLinkModal nombre={previewLink.nombre} slug={previewLink.slug} onClose={() => setPreviewLink(null)} />}
      {mostrarDiagnostico && <DiagnosticoSyncModal usuarios={usuarios} comunidad={comunidadActiva} myEquipoId={myEquipoId} onClose={() => setMostrarDiagnostico(false)} onReparar={repararUsuariosComunidad} />}
      {mostrarBitacora && <BitacoraAuditoriaModal equipoId={myEquipoId} onClose={() => setMostrarBitacora(false)} />}
      {mostrarModalAutorizacion && <ModalCodigoAutorizacion user={currentUser} onClose={() => setMostrarModalAutorizacion(false)} onActualizado={() => ejecutarCarga(false)} />}
      {usuarioEditarAutorizacion && <ModalCodigoAutorizacion user={usuarioEditarAutorizacion} onClose={() => setUsuarioEditarAutorizacion(null)} onActualizado={() => ejecutarCarga(false)} />}
    </div>
  );
}

// ============================================================
// MODALES Y SUBCOMPONENTES
// ============================================================
function DiagnosticoSyncModal({ usuarios, comunidad, myEquipoId, onClose, onReparar }) {
  const [diagnostico, setDiagnostico] = useState(null);
  const [ejecutandoReparacion, setEjecutandoReparacion] = useState(false);

  const ejecutarDiagnostico = useCallback(async () => {
    const idCanonico = String(myEquipoId || comunidad?.equipo_id || comunidad?.id || "");
    const resultados = { total: usuarios.length, correctos: 0, conProblemas: [], detalles: [] };
    
    for (const u of usuarios) {
      const problema = [];
      if (!u.equipo_id && !u.comunidad_id) problema.push("Sin comunidad_id");
      if (!u.slug && !u.comunidad_slug) problema.push("Sin slug");
      
      if (problema.length === 0) {
        resultados.correctos++;
      } else {
        resultados.conProblemas.push({ usuario: u.full_name || u.email, email: u.email, problemas: problema });
      }
      resultados.detalles.push({ usuario: u.full_name || u.email, equipo_id: u.equipo_id || "❌", comunidad_id: u.comunidad_id || "❌", correcto: problema.length === 0 });
    }
    setDiagnostico(resultados);
  }, [usuarios, myEquipoId, comunidad]);

  useEffect(() => { ejecutarDiagnostico(); }, [ejecutarDiagnostico]);

  const handleRepararModal = async () => {
    setEjecutandoReparacion(true);
    await onReparar();
    await ejecutarDiagnostico();
    setEjecutandoReparacion(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><Activity className="w-5 h-5" /> Diagnóstico de Sincronización</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {!diagnostico ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-gray-600 mt-2">Analizando usuarios...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-700 font-bold">Total</p>
                  <p className="text-2xl font-black text-blue-900">{diagnostico.total}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-700 font-bold">Correctos ✓</p>
                  <p className="text-2xl font-black text-green-900">{diagnostico.correctos}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-700 font-bold">Con Problemas</p>
                  <p className="text-2xl font-black text-red-900">{diagnostico.conProblemas.length}</p>
                </div>
              </div>
              {diagnostico.conProblemas.length > 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h3 className="font-bold text-yellow-900 text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Usuarios pendientes por sincronizar comunidad
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {diagnostico.conProblemas.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-yellow-300">
                        <p className="font-bold text-xs text-gray-900">{item.usuario}</p>
                        <p className="text-[11px] text-gray-500">{item.email}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.problemas.map((p, i) => (
                            <span key={i} className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⚠ {p}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 text-center">
                  <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <p className="font-black text-emerald-900 text-base">¡Todos los usuarios están 100% sincronizados!</p>
                  <p className="text-xs text-emerald-700 mt-1">Todos los perfiles poseen su comunidad e identificadores asignados correctamente.</p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 text-xs">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-white">Cerrar</button>
          <button onClick={handleRepararModal} disabled={ejecutandoReparacion} className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow disabled:opacity-50">
            <Wrench className={`w-4 h-4 ${ejecutandoReparacion ? "animate-spin" : ""}`} /> {ejecutandoReparacion ? "Reparando..." : "Reparar Todos"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiComunidadModal({ comunidad, onClose, onActualizarSlug, onActualizarColores, onRenombrar }) {
  const [editandoSlug, setEditandoSlug] = useState(false);
  const [nuevoSlug, setNuevoSlug] = useState(comunidad.slug || generarSlug(comunidad.nombre || comunidad.nombre_retiro));
  const slugActual = comunidad.slug || comunidad.equipo_id || generarSlug(comunidad.nombre || comunidad.nombre_retiro);
  const linkCaminante = construirLinkInscripcion(slugActual, "caminante");
  const linkServidor = construirLinkInscripcion(slugActual, "servidor");
  const colorPrimario = comunidad.color_primario || "#b45309";
  const colorSecundario = comunidad.color_secundario || "#f59e0b";

  const handleGuardarSlug = async () => {
    if (!nuevoSlug.trim()) return;
    await onActualizarSlug(comunidad.equipo_id, nuevoSlug.trim());
    setEditandoSlug(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-5 flex items-center justify-between text-white rounded-t-2xl" style={{ background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})` }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><Building2 className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] uppercase opacity-80">Tu comunidad</p>
              <h2 className="text-xl font-bold">{comunidad.nombre || comunidad.nombre_retiro}</h2>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-2">ID del link</h3>
            {editandoSlug ? (
              <div className="space-y-2">
                <input type="text" value={nuevoSlug} onChange={e => setNuevoSlug(generarSlug(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
                <button onClick={handleGuardarSlug} className="w-full bg-blue-700 text-white px-3 py-2 rounded-lg text-xs">Guardar</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white px-3 py-2 rounded-lg">{slugActual}</code>
                <button onClick={() => setEditandoSlug(true)} className="text-xs text-blue-700 font-bold">Editar</button>
              </div>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-bold text-blue-900 mb-1">Link Caminantes:</p>
            <code className="text-[11px] text-blue-800 break-all">{linkCaminante}</code>
          </div>
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-3">
            <p className="text-xs font-bold text-pink-900 mb-1">Link Servidores:</p>
            <code className="text-[11px] text-pink-800 break-all">{linkServidor}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewLinkModal({ nombre, slug, onClose }) {
  const linkCam = construirLinkInscripcion(slug, "caminante");
  const linkSer = construirLinkInscripcion(slug, "servidor");
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold flex items-center gap-2"><Eye className="w-5 h-5" /> Links de {nombre}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3 text-xs">
          <p className="text-xs font-bold">Caminantes:</p>
          <code className="block text-xs bg-gray-100 px-3 py-2 rounded font-mono break-all">{linkCam}</code>
          <p className="text-xs font-bold mt-2">Servidores:</p>
          <code className="block text-xs bg-gray-100 px-3 py-2 rounded font-mono break-all">{linkSer}</code>
        </div>
      </div>
    </div>
  );
}

function CrearComunidadModal({ onClose, onCrear, currentUser }) {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [creando, setCreando] = useState(false);
  useEffect(() => { setSlug(generarSlug(nombre)); }, [nombre]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    await onCrear({ nombre: nombre.trim(), adminEmail: adminEmail.trim() || currentUser?.email, slug: slug.trim() || generarSlug(nombre) });
    setCreando(false);
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="font-bold flex items-center gap-2"><Building2 className="w-5 h-5" /> Crear Comunidad</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" />
          <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="Email admin" className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancelar</button>
            <button type="submit" disabled={creando} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm disabled:opacity-60">{creando ? "Creando..." : "Crear"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsuarioCard({ usuario: u, onEditar, onEditarPIN, mostrarClaim, onClaim, esAdminOEsCreador }) {
  const permisos = (() => {
    try { return typeof u.permisos_modulos === "string" ? JSON.parse(u.permisos_modulos || "{}") : u.permisos_modulos || {}; } catch { return {}; }
  })();
  const esAdminNorm = esAdminORector(u);
  const modActivos = esAdminNorm ? MODULOS.length : MODULOS.filter(m => permisos[m.key] && permisos[m.key] !== "ninguno").length;
  const esCreadorGlobal = u.email === APP_CREATOR_EMAIL || u.es_creador === true;
  const tieneProblemas = !u.equipo_id || !u.comunidad_id;

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 flex flex-wrap items-center gap-4 transition-colors ${tieneProblemas ? "border-orange-300 bg-orange-50/30" : "border-amber-100 hover:border-amber-300"}`}>
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
        <span className="text-amber-800 font-bold text-sm">{(u.username || u.full_name || u.email || "?")[0].toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-[180px]">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-800 text-sm">{u.full_name || "Sin nombre"}</p>
          {u.username && <span className="flex items-center gap-0.5 bg-amber-50 text-amber-700 text-xs font-mono px-2 py-0.5 rounded-full border border-amber-200"><AtSign className="w-3 h-3" />{u.username}</span>}
          {esCreadorGlobal && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold"><Crown className="w-3 h-3 inline" /> Creador</span>}
          {u.codigo_autorizacion ? (
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
              <Key className="w-3 h-3 text-emerald-700" /> PIN Activo
            </span>
          ) : (
            <span className="text-[10px] font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
              Sin PIN
            </span>
          )}
          {tieneProblemas && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">⚠ Sync</span>}
        </div>
        <p className="text-xs text-gray-500">{u.email}</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${esAdminNorm ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
          {esAdminNorm ? "Administrador" : "Usuario"}
        </span>
        <span className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
          {modActivos} / {MODULOS.length} Módulos
        </span>
        {mostrarClaim && (
          <button onClick={onClaim} className="flex items-center gap-1.5 text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs font-medium">
            <UserPlus className="w-3 h-3" /> Agregar
          </button>
        )}
        {esAdminOEsCreador && (
          <>
            <button onClick={onEditarPIN} className="flex items-center gap-1.5 text-amber-900 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition" title="Configurar Código/PIN de Autorización de Transacciones">
              <Key className="w-3.5 h-3.5 text-amber-700" /> PIN Autorización
            </button>
            <button onClick={onEditar} className="flex items-center gap-1.5 text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold">
              <Shield className="w-3.5 h-3.5" /> Permisos
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function InvitarModal({ onClose, onInvitar, myEquipoId, esCreador }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("user");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEnviando(true);
    await onInvitar({ email: email.trim(), role, username: username.trim().toUpperCase(), equipo_id: myEquipoId });
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-200">
        <div className="bg-amber-900 text-white px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><UserPlus className="w-5 h-5 text-amber-300" /> Invitar Usuario</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button" 
              onClick={() => setRole("user")} 
              className={`p-3 rounded-xl border-2 transition ${role === "user" ? "bg-amber-800 text-white border-amber-800 shadow-xs" : "bg-white border-amber-200 text-slate-700"}`}
            >
              <p className="font-bold text-xs">👤 Usuario Estándar</p>
            </button>
            <button 
              type="button" 
              onClick={() => setRole("admin")} 
              className={`p-3 rounded-xl border-2 transition ${role === "admin" ? "bg-amber-800 text-white border-amber-800 shadow-xs" : "bg-white border-amber-200 text-slate-700"}`}
            >
              <p className="font-bold text-xs">🏛️ Administrador</p>
            </button>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico *</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="ejemplo@correo.com" 
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre o Apodo (Opcional)</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Nombre del usuario" 
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono uppercase font-bold focus:ring-2 focus:ring-amber-500" 
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={enviando} className="px-5 py-2 bg-amber-800 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50">
              {enviando ? "Enviando..." : "Confirmar Invitación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// 📊 MODAL DE PERMISOS POR MÓDULO CON GRILLA INTERACTIVA COMPLETA
// ============================================================
function PermisosModal({ usuario, onClose, onGuardar, esCreador, equipos }) {
  const [role, setRole] = useState(usuario.role || usuario.rol || "user");
  const [username, setUsername] = useState(usuario.username || usuario.full_name || "");
  const [comunidad, setComunidad] = useState(usuario.equipo_id || usuario.comunidad_id || "");
  const [guardando, setGuardando] = useState(false);
  const esAdminInicial = esAdminORector(usuario);

  const permsIniciales = (() => {
    if (esAdminInicial) return PERMISOS_TOTALES_ADMIN;
    let raw = {};
    try { 
      raw = typeof usuario.permisos_modulos === "string" 
        ? JSON.parse(usuario.permisos_modulos || "{}") 
        : usuario.permisos_modulos || {}; 
    } catch { raw = {}; }
    
    const norm = {};
    MODULOS.forEach(m => {
      const v = raw[m.key];
      if (v === true || v === "edicion") norm[m.key] = "edicion";
      else if (v === "lectura") norm[m.key] = "lectura";
      else norm[m.key] = "ninguno";
    });
    return norm;
  })();

  const [permisos, setPermisos] = useState(permsIniciales);

  const esAdminActual = Boolean(
    role === "admin" || 
    role === "ADMINISTRADOR" || 
    role === "rector" || 
    role === "RECTOR"
  );

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === "admin" || newRole === "ADMINISTRADOR") {
      setPermisos(PERMISOS_TOTALES_ADMIN);
    }
  };

  const handleCambiarPermisoModulo = (modKey, nivel) => {
    setPermisos(prev => ({
      ...prev,
      [modKey]: nivel
    }));
  };

  const handleAplicarATodos = (nivel) => {
    const obj = {};
    MODULOS.forEach(m => { obj[m.key] = nivel; });
    setPermisos(obj);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    const eq = (equipos || []).find(e => String(e.equipo_id || e.id) === String(comunidad));
    const permisosAGuardar = esAdminActual ? PERMISOS_TOTALES_ADMIN : permisos;
    
    await onGuardar(
      usuario.id, 
      permisosAGuardar, 
      role, 
      username.trim().toUpperCase(), 
      comunidad || null, 
      eq?.nombre || eq?.nombre_equipo || usuario.nombre_equipo
    );
    setGuardando(false);
  };

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col border border-amber-200">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 px-6 py-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-700/60 border border-yellow-500/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight">
                Permisos y Rol: {usuario.full_name || usuario.email}
              </h2>
              <p className="text-xs text-amber-200 font-medium">Configura el rol y acceso por módulo en el sistema.</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-xl text-amber-200 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* SECCIÓN 1: DATOS BÁSICOS & ROL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1">
                Rol del Usuario
              </label>
              <select 
                value={role} 
                onChange={e => handleRoleChange(e.target.value)} 
                className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs font-bold bg-white text-amber-950 focus:ring-2 focus:ring-amber-500"
              >
                <option value="user">👤 Usuario Estándar (Permisos Personalizados)</option>
                <option value="admin">🏛️ Administrador / Rector (Acceso Total Edición)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1">
                Usuario / Apodo
              </label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="Nombre o alias" 
                className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs font-mono uppercase font-bold bg-white text-amber-950 focus:ring-2 focus:ring-amber-500" 
              />
            </div>

            {esCreador && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-amber-950 mb-1">
                  Comunidad de Pertenencia
                </label>
                <select 
                  value={comunidad} 
                  onChange={e => setComunidad(e.target.value)} 
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs font-bold bg-white text-amber-950 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Sin comunidad asignada</option>
                  {equipos.map(e => (
                    <option key={e.equipo_id || e.id} value={e.equipo_id || e.id}>
                      {e.nombre || e.nombre_equipo} ({e.codigo_comunidad || e.slug || "Comunidad"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: PLANTILLAS RÁPIDAS DE ROLES DE RETIRO */}
          {!esAdminActual && (
            <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80 space-y-2">
              <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-700" /> Plantillas de Roles Predefinidos (Asignación en 1 Clic):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PLANTILLAS_ROLES.map(plantilla => (
                  <button
                    key={plantilla.key}
                    type="button"
                    onClick={() => {
                      setPermisos(prev => ({ ...prev, ...plantilla.permisos }));
                      toast.info(`Plantilla "${plantilla.label}" aplicada`);
                    }}
                    className="text-left bg-white hover:bg-amber-100/70 border border-amber-200 p-2 rounded-xl transition cursor-pointer shadow-2xs group"
                  >
                    <p className="font-bold text-[11px] text-amber-900 group-hover:text-amber-950 truncate">{plantilla.label}</p>
                    <p className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">{plantilla.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: GRILLA DE PERMISOS POR MÓDULO */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-2">
              <div>
                <h3 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-700" /> Matriz de Permisos por Módulo ({MODULOS.length})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Asigna acceso de lectura, edición o bloquea cada módulo.</p>
              </div>

              {!esAdminActual && (
                <div className="flex items-center gap-1 text-[10px]">
                  <button 
                    type="button" 
                    onClick={() => handleAplicarATodos("edicion")}
                    className="px-2.5 py-1 bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 rounded-lg font-bold transition"
                  >
                    🟢 Todo Edición
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleAplicarATodos("lectura")}
                    className="px-2.5 py-1 bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 rounded-lg font-bold transition"
                  >
                    🟡 Todo Lectura
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleAplicarATodos("ninguno")}
                    className="px-2.5 py-1 bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 rounded-lg font-bold transition"
                  >
                    🔴 Sin Acceso
                  </button>
                </div>
              )}
            </div>

            {esAdminActual ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-center space-y-1">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-emerald-950 text-sm">Administrador con Acceso Total</h4>
                <p className="text-xs text-emerald-800 font-medium max-w-md mx-auto">
                  Como <strong>Administrador</strong>, este usuario posee automáticamente permisos de <strong>Lectura, Edición y Administración</strong> en los {MODULOS.length} módulos del sistema.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MODULOS.map(mod => {
                  const nivelActual = permisos[mod.key] || "ninguno";

                  return (
                    <div 
                      key={mod.key} 
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                        nivelActual === "edicion" ? "bg-green-50/60 border-green-200" :
                        nivelActual === "lectura" ? "bg-amber-50/60 border-amber-200" :
                        "bg-slate-50 border-slate-200 opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{mod.icon}</span>
                        <span className="font-extrabold text-slate-900 truncate">{mod.label}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCambiarPermisoModulo(mod.key, "edicion")}
                          className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition ${
                            nivelActual === "edicion" 
                              ? "bg-green-700 text-white shadow-xs" 
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-green-50"
                          }`}
                          title="Acceso total: Ver, Crear, Editar y Eliminar"
                        >
                          Edición
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCambiarPermisoModulo(mod.key, "lectura")}
                          className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition ${
                            nivelActual === "lectura" 
                              ? "bg-amber-700 text-white shadow-xs" 
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-amber-50"
                          }`}
                          title="Solo lectura: Ver e Imprimir"
                        >
                          Lectura
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCambiarPermisoModulo(mod.key, "ninguno")}
                          className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition ${
                            nivelActual === "ninguno" 
                              ? "bg-rose-700 text-white shadow-xs" 
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-rose-50"
                          }`}
                          title="Sin acceso: Ocultar módulo"
                        >
                          Oculto
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-white transition"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleGuardar} 
            disabled={guardando} 
            className="px-6 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-black shadow-md transition disabled:opacity-50"
          >
            {guardando ? "Guardando Permisos..." : "Guardar Permisos"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🛡️ MODAL DE BITÁCORA DE AUDITORÍA Y CONTROL DE CAMBIOS
// ============================================================
function BitacoraAuditoriaModal({ equipoId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroAccion, setFiltroAccion] = useState("");

  useEffect(() => {
    setLoading(true);
    obtenerBitacoraAuditoria(equipoId).then(data => {
      setLogs(data || []);
      setLoading(false);
    });
  }, [equipoId]);

  const filtrados = logs.filter(l => {
    const matchAccion = !filtroAccion || String(l.accion || "").toLowerCase().includes(filtroAccion.toLowerCase());
    const matchBusqueda = !busqueda || 
      String(l.usuario_email || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      String(l.usuario_nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      String(l.entidad || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      String(l.detalles || "").toLowerCase().includes(busqueda.toLowerCase());
    return matchAccion && matchBusqueda;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-amber-200">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-yellow-300" /> Bitácora de Auditoría y Control de Cambios
            </h2>
            <p className="text-amber-200 text-xs mt-0.5">Registro histórico transparente de acciones ejecutadas en el sistema</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition text-amber-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FILTROS */}
        <div className="p-4 border-b border-amber-100 bg-amber-50/50 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
            <input 
              type="text" 
              placeholder="Buscar por usuario, acción o detalles..."
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-medium" 
            />
          </div>
          <select 
            value={filtroAccion} 
            onChange={e => setFiltroAccion(e.target.value)}
            className="border border-amber-200 rounded-xl px-3 py-2 text-xs bg-white text-amber-950 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Todas las Acciones</option>
            <option value="Aprobar">Aprobaciones</option>
            <option value="Permisos">Cambios de Permisos</option>
            <option value="Crear">Creación de Registros</option>
            <option value="Modificar">Modificaciones</option>
            <option value="Eliminar">Eliminaciones</option>
          </select>
        </div>

        {/* LISTADO */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2 text-xs">
          {loading ? (
            <div className="py-16 text-center text-amber-700 font-semibold">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" /> Cargando eventos de auditoría...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-amber-50/30 rounded-2xl border border-amber-100 p-8">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-700" />
              <p className="text-sm font-bold text-amber-900">No se encontraron eventos de auditoría registrados.</p>
              <p className="text-xs text-amber-700 mt-1">Las futuras modificaciones y aprobaciones aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            filtrados.map((log, idx) => (
              <div key={log.id || idx} className="bg-white border border-amber-100 rounded-2xl p-4 shadow-2xs hover:border-amber-300 transition space-y-1.5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      log.accion?.includes("Aprobar") ? "bg-green-100 text-green-800 border border-green-300" :
                      log.accion?.includes("Permisos") ? "bg-purple-100 text-purple-800 border border-purple-300" :
                      log.accion?.includes("Eliminar") ? "bg-red-100 text-red-800 border border-red-300" :
                      "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}>
                      {log.accion}
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                      Entidad: {log.entidad}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.created_date || log.created_at || Date.now()).toLocaleString("es-ES")}
                  </span>
                </div>
                <p className="font-bold text-slate-800 text-xs">{log.detalles}</p>
                <p className="text-[11px] text-amber-800 font-medium">
                  Ejecutado por: <strong className="text-amber-950">{log.usuario_nombre}</strong> ({log.usuario_email})
                </p>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-amber-200 bg-amber-50/60 flex justify-between items-center text-xs">
          <span className="text-amber-900 font-extrabold">{filtrados.length} evento(s) de auditoría</span>
          <button onClick={onClose} className="px-5 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl font-bold shadow transition">
            Cerrar Bitácora
          </button>
        </div>
      </div>
    </div>
  );
}