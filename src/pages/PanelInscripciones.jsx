import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useComunidad } from "@/lib/ComunidadContext";
import SelectorComunidad from "@/components/SelectorComunidad";
import { 
  CheckCircle, XCircle, User, Heart, Search, Eye, Check, X, 
  Copy, CheckCheck, Link as LinkIcon, RefreshCw, Hourglass, UserX, 
  Ticket, MoreVertical, Phone, Building, Calendar, IdCard, ExternalLink,
  MapPin, ShieldAlert, CreditCard, Stethoscope, AlertTriangle, Printer,
  Share2, Download, MessageCircle, Sparkles, QrCode, Footprints, HeartHandshake, 
  Upload, Image as ImageIcon, Settings, Sliders, Maximize2, Move
} from "lucide-react";
import { toast } from "sonner";
import { openPrintWindow, buildPrintDoc } from "@/lib/printStyles";
import { formatFecha } from "@/utils/formatters";
import ModalConfirmacionWhatsApp from "@/components/ModalConfirmacionWhatsApp";
import { registrarAccionAuditoria } from "@/utils/auditLogger";

export const notificarCambioComunidad = (entidad = "General", equipoId = null) => {
  if (typeof window === "undefined") return;
  const timestamp = Date.now().toString();
  localStorage.setItem("emaus_last_sync_time", timestamp);
  localStorage.setItem("emaus_last_sync_entity", entidad);
  
  window.dispatchEvent(new CustomEvent("emaus_data_changed", { 
    detail: { entidad, equipoId, timestamp } 
  }));
};

const FILTROS = ["", "Pendiente", "Aprobado", "Lista de Espera", "No Asistirá", "Rechazado"];
const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

export default function PanelInscripciones() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [caminantes, setCaminantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("Pendiente");
  const [busqueda, setBusqueda] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [config, setConfig] = useState(null);
  const [procesando, setProcesando] = useState(null);
  
  const [mostrarModalBoleta, setMostrarModalBoleta] = useState(false);
  const [personaSeleccionadaBoleta, setPersonaSeleccionadaBoleta] = useState(null);
  const [notifWhatsAppPersona, setNotifWhatsAppPersona] = useState(null);

  const { user } = useAuth();
  const { comunidadActual } = useComunidad();

  const comunidadActiva = comunidadActual;
  const equipoIdActivo = 
    comunidadActiva?.equipo_id || 
    comunidadActiva?.id || 
    comunidadActiva?.slug || 
    user?.equipo_id;

  const idComunidadReal = 
    comunidadActiva?.slug || 
    comunidadActiva?.equipo_id || 
    comunidadActiva?.id || 
    user?.equipo_id || 
    "general";

  const codigoComunidad = 
    comunidadActiva?.codigo_comunidad || 
    comunidadActiva?.codigo || 
    comunidadActiva?.slug || 
    `COM-${(comunidadActiva?.id || equipoIdActivo || "000").slice(-4).toUpperCase()}`;

  const nombreComunidadEnv = encodeURIComponent(comunidadActiva?.nombre || "");
  const urlCaminantes = `${BASE_URL}/inscripcion/caminante?codigo_comunidad=${encodeURIComponent(codigoComunidad)}&equipo_id=${encodeURIComponent(idComunidadReal)}&retiro_id=${encodeURIComponent(idComunidadReal)}&comunidad_nombre=${nombreComunidadEnv}`;
  const urlServidores = `${BASE_URL}/inscripcion/servidor?codigo_comunidad=${encodeURIComponent(codigoComunidad)}&equipo_id=${encodeURIComponent(idComunidadReal)}&retiro_id=${encodeURIComponent(idComunidadReal)}&comunidad_nombre=${nombreComunidadEnv}`;

  const cargar = async () => {
    setLoading(true);
    try {
      const [data, cfgs, cams, servs] = await Promise.all([
        base44.entities.InscripcionRemota.list("-created_date").catch(() => []),
        base44.entities.ConfigRetiro.list().catch(() => []),
        base44.entities.Caminante.list().catch(() => []),
        base44.entities.Servidor?.list().catch(() => []) || Promise.resolve([]),
      ]);

      const coincideComunidadItem = (item) => {
        if (!equipoIdActivo || equipoIdActivo === "global" || equipoIdActivo === "GLOBAL") return true;

        const idActivo = String(comunidadActiva?.equipo_id || comunidadActiva?.id || user?.equipo_id || "").toLowerCase();
        const codigoActivo = String(comunidadActiva?.codigo_comunidad || comunidadActiva?.codigo || user?.codigo_comunidad || "").toLowerCase();
        const slugActivo = String(comunidadActiva?.slug || user?.slug || "").toLowerCase();
        const nombreActivo = String(comunidadActiva?.nombre || comunidadActiva?.nombre_equipo || user?.nombre_equipo || "").toLowerCase();

        const idReg = String(item.equipo_id || item.comunidad_id || item.retiro_id || item.id_equipo || "").toLowerCase();
        const codigoReg = String(item.codigo_comunidad || item.comunidad_codigo || item.codigo || "").toLowerCase();
        const slugReg = String(item.slug || item.comunidad_slug || "").toLowerCase();
        const nombreReg = String(item.comunidad_nombre || item.nombre_equipo || item.comunidad || "").toLowerCase();

        if (idActivo && idReg && idReg === idActivo) return true;
        if (codigoActivo && codigoReg && codigoReg === codigoActivo) return true;
        if (slugActivo && slugReg && slugReg === slugActivo) return true;
        if (nombreActivo && nombreReg && nombreReg === nombreActivo) return true;

        const sinComunidad = !idReg && !codigoReg && !slugReg && !nombreReg;
        if (sinComunidad) return true;

        return false;
      };

      const mapaUnicos = new Map();
      const indexById = new Map();
      const indexByCed = new Map();
      const indexByNomTel = new Map();

      // 1. Registrar todas las Inscripciones Remotas como la fuente primaria de solicitudes
      (data || []).forEach(item => {
        if (item && (item.id || item._id)) {
          const itemId = String(item.id || item._id);
          const cleanCed = item.cedula ? String(item.cedula).replace(/\D/g, "") : "";
          const cleanTel = item.telefono ? String(item.telefono).replace(/\D/g, "") : "";
          const cleanNom = item.nombre ? String(item.nombre).trim().toLowerCase() : "";

          mapaUnicos.set(itemId, item);
          indexById.set(itemId, itemId);
          if (cleanCed) indexByCed.set(cleanCed, itemId);
          if (cleanNom && cleanTel) indexByNomTel.set(`${cleanNom}_${cleanTel}`, itemId);
        }
      });

      // Helper para vincular Servidores/Caminantes creados con su solicitud remota original
      const encontrarKeyRemota = (item) => {
        const keyInscrip = item.inscripcion_id || item.inscripcion_remota_id ? String(item.inscripcion_id || item.inscripcion_remota_id) : null;
        if (keyInscrip && indexById.has(keyInscrip)) return indexById.get(keyInscrip);

        const cleanCed = item.cedula ? String(item.cedula).replace(/\D/g, "") : "";
        if (cleanCed && indexByCed.has(cleanCed)) return indexByCed.get(cleanCed);

        const cleanTel = item.telefono ? String(item.telefono).replace(/\D/g, "") : "";
        const cleanNom = item.nombre ? String(item.nombre).trim().toLowerCase() : "";
        if (cleanNom && cleanTel && indexByNomTel.has(`${cleanNom}_${cleanTel}`)) return indexByNomTel.get(`${cleanNom}_${cleanTel}`);

        return null;
      };

      // 2. Fusionar Servidores respetando el estado de Aprobación de la solicitud remota
      (servs || []).forEach(item => {
        if (item && (item.id || item._id)) {
          const keyRemota = encontrarKeyRemota(item);
          if (keyRemota) {
            const previo = mapaUnicos.get(keyRemota) || {};
            const estadoFinal = (previo.estado === "Aprobado" || item.estado_aprobacion === "Aprobado") ? "Aprobado" : previo.estado;
            mapaUnicos.set(keyRemota, {
              ...item,
              ...previo,
              estado: estadoFinal,
              tipo: item.tipo || previo.tipo || "Servidor"
            });
          } else {
            const itemId = String(item.id || item._id);
            if (!mapaUnicos.has(itemId)) {
              mapaUnicos.set(itemId, { ...item, tipo: item.tipo || "Servidor" });
            }
          }
        }
      });

      // 3. Fusionar Caminantes respetando el estado de Aprobación de la solicitud remota
      (cams || []).forEach(item => {
        if (item && (item.id || item._id)) {
          const keyRemota = encontrarKeyRemota(item);
          if (keyRemota) {
            const previo = mapaUnicos.get(keyRemota) || {};
            const estadoFinal = (previo.estado === "Aprobado" || item.estado_aprobacion === "Aprobado") ? "Aprobado" : previo.estado;
            mapaUnicos.set(keyRemota, {
              ...item,
              ...previo,
              estado: estadoFinal,
              tipo: item.tipo || previo.tipo || "Caminante"
            });
          } else {
            const itemId = String(item.id || item._id);
            if (!mapaUnicos.has(itemId)) {
              mapaUnicos.set(itemId, { ...item, tipo: item.tipo || "Caminante" });
            }
          }
        }
      });

      const todosUnificados = Array.from(mapaUnicos.values());

      const solicitudesFiltradas = todosUnificados.filter(coincideComunidadItem);
      
      const caminantesFiltrados = (cams || []).filter(coincideComunidadItem);

      const keyLocalConfig = `emaus_config_retiro_${equipoIdActivo}`;
      let configBackupLocal = null;
      try {
        const raw = localStorage.getItem(keyLocalConfig);
        if (raw) configBackupLocal = JSON.parse(raw);
      } catch (e) {}

      const configRetiro = (cfgs || []).find(cfg => 
        !equipoIdActivo || 
        cfg.codigo_comunidad === codigoComunidad ||
        cfg.equipo_id === equipoIdActivo || 
        cfg.comunidad_id === equipoIdActivo || 
        cfg.retiro_id === equipoIdActivo
      ) || cfgs?.[0];

      const configMezclada = {
        ...(configBackupLocal || {}),
        ...(configRetiro || {}),
        logo_url: (configRetiro?.logo_url && configRetiro.logo_url.trim()) ? configRetiro.logo_url : (configBackupLocal?.logo_url || localStorage.getItem(`emaus_logo_url_${equipoIdActivo}`) || ""),
        logo_hombres_url: (configRetiro?.logo_hombres_url && configRetiro.logo_hombres_url.trim()) ? configRetiro.logo_hombres_url : (configBackupLocal?.logo_hombres_url || localStorage.getItem(`emaus_logo_hombres_url_${equipoIdActivo}`) || ""),
        logo_mujeres_url: (configRetiro?.logo_mujeres_url && configRetiro.logo_mujeres_url.trim()) ? configRetiro.logo_mujeres_url : (configBackupLocal?.logo_mujeres_url || localStorage.getItem(`emaus_logo_mujeres_url_${equipoIdActivo}`) || ""),
      };

      setSolicitudes(solicitudesFiltradas);
      setCaminantes(caminantesFiltrados);
      setConfig(configMezclada);
    } catch (e) {
      console.error("Error al cargar datos:", e);
      toast.error("Error al actualizar la lista");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    const unsubscribe = base44.entities.InscripcionRemota.subscribe((event) => {
      if (event.type === "create") {
        setSolicitudes(prev => [event.data, ...prev.filter(s => s.id !== event.data.id)]);
      } else if (event.type === "update") {
        setSolicitudes(prev => prev.map(s => s.id === event.data.id ? { ...s, ...event.data } : s));
      } else if (event.type === "delete") {
        setSolicitudes(prev => prev.filter(s => s.id !== event.data.id));
      }
    });
    return unsubscribe;
  }, [comunidadActual]);

  const obtenerProximaFichaDisponible = (listaCaminantes, maxFichas = 100) => {
    const fichasUsadas = new Set(
      (listaCaminantes || [])
        .map(c => Number(c.numero_ficha || c.ficha))
        .filter(f => !isNaN(f) && f > 0)
    );

    for (let i = 1; i <= maxFichas; i++) {
      if (!fichasUsadas.has(i)) {
        return i;
      }
    }
    return 1;
  };

  const fichasAsignadas = caminantes.filter(c => c.numero_ficha || c.ficha).length;
  const totalFichas = config?.total_fichas || 100;
  const fichasDisponibles = Math.max(0, totalFichas - fichasAsignadas);

  const filtradas = solicitudes.filter(s => {
    const hayBusqueda = busqueda.trim().length > 0;
    const coincideEstado = !filtroEstado || s.estado === filtroEstado || hayBusqueda;
    const coincideBusqueda = 
      !hayBusqueda || 
      s.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
      s.apodo?.toLowerCase().includes(busqueda.toLowerCase()) || 
      s.parroquia?.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.cedula?.includes(busqueda) ||
      s.telefono?.includes(busqueda);
    return coincideEstado && coincideBusqueda;
  });

  const pendientes = solicitudes.filter(s => s.estado === "Pendiente").length;
  const enEspera = solicitudes.filter(s => s.estado === "Lista de Espera").length;

  // 🚀 APROBAR CON CREACIÓN DE RESPALDO INFALIBLE
  const aprobar = async (s) => {
    if (!s) return;
    const solId = s.id || s._id;
    setProcesando(solId);

    try {
      const idBase44Comunidad = comunidadActiva?.equipo_id || comunidadActiva?.id || s.equipo_id || equipoIdActivo;
      const slugComunidad = s.retiro_id || s.comunidad_slug || comunidadActiva?.slug || idComunidadReal;
      const nombreComunidad = comunidadActiva?.nombre || s.comunidad_nombre || s.comunidad || "Comunidad Emaús";
      const targetEquipoId = idBase44Comunidad || slugComunidad || "general";

      const tipoNorm = String(s.tipo || s.tipo_inscripcion || s.tipo_registro || s.rol_servidor || "").toLowerCase();
      const esServidor = tipoNorm.includes("servid") || s.es_servidor === true || Boolean(s.lugares_servido || s.rol_servidor || s.equipo_trabajo);
      const numRetiro = Number(s.numero_retiro || config?.edicion || 1);

      let fichaAsignada = s.numero_ficha ? Number(s.numero_ficha) : null;
      if (!esServidor && !fichaAsignada) {
        const proximaFicha = obtenerProximaFichaDisponible(caminantes, totalFichas);
        fichaAsignada = proximaFicha ? Number(proximaFicha) : 1;
      }

      const usuarioAprobador = user?.nombre || user?.nombre_completo || user?.username || user?.email || "Coordinación";
      const emailAprobador = user?.email || "";
      const ahoraObj = new Date();
      const fechaAprobacion = ahoraObj.toLocaleDateString("es-DO");
      const horaAprobacion = ahoraObj.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true });
      const fechaHoraAprobacion = `${fechaAprobacion} ${horaAprobacion}`;

      // 1. Respuesta visual instantánea en la tabla
      setSolicitudes(prev => prev.map(item => {
        const itemId = item.id || item._id;
        if (itemId === solId || (s.cedula && item.cedula === s.cedula)) {
          return { 
            ...item, 
            estado: "Aprobado", 
            numero_ficha: fichaAsignada || item.numero_ficha,
            aprobado_por: usuarioAprobador,
            aprobado_por_email: emailAprobador,
            fecha_aprobacion: fechaAprobacion,
            hora_aprobacion: horaAprobacion,
            fecha_hora_aprobacion: fechaHoraAprobacion
          };
        }
        return item;
      }));

      // 2. Marcar la solicitud remota como Aprobado con auditoría
      if (solId) {
        await base44.entities.InscripcionRemota.update(solId, { 
          estado: "Aprobado",
          aprobado_por: usuarioAprobador,
          aprobado_por_email: emailAprobador,
          fecha_aprobacion: fechaAprobacion,
          hora_aprobacion: horaAprobacion,
          fecha_hora_aprobacion: fechaHoraAprobacion,
          ...(fichaAsignada ? { numero_ficha: fichaAsignada } : {})
        }).catch(err => console.warn("Error actualizando registro remoto:", err));
      }

      // 3. Crear o actualizar Caminante / Servidor con auditoría de quién aprobó
      const existeEnCaminantes = caminantes.find(c => (c.id && c.id === solId) || (s.cedula && c.cedula && c.cedula === s.cedula));

      if (existeEnCaminantes && existeEnCaminantes.id) {
        const fichaFinal = fichaAsignada || existeEnCaminantes.numero_ficha || existeEnCaminantes.ficha || 1;
        await base44.entities.Caminante.update(existeEnCaminantes.id, { 
          estado: "Pendiente",
          pago_ficha: "Pendiente",
          numero_ficha: Number(fichaFinal),
          ficha: Number(fichaFinal),
          aprobado_por: usuarioAprobador,
          aprobado_por_email: emailAprobador,
          fecha_aprobacion: fechaAprobacion,
          hora_aprobacion: horaAprobacion,
          fecha_hora_aprobacion: fechaHoraAprobacion,
          equipo_id: targetEquipoId,
          comunidad_id: targetEquipoId,
          retiro_id: slugComunidad,
          comunidad_slug: slugComunidad,
          nombre_equipo: nombreComunidad,
          comunidad: nombreComunidad
        });
      } else {
        const payloadLimpio = {
          inscripcion_id: solId,
          inscripcion_remota_id: solId,
          tipo: esServidor ? "Servidor" : "Caminante",
          tipo_registro: esServidor ? "Servidor" : "Caminante",
          es_servidor: esServidor,
          nombre: s.nombre || "Participante",
          apodo: s.apodo || "",
          cedula: s.cedula || "",
          telefono: s.telefono || "",
          email: s.email || "",
          diocesis: s.diocesis || "",
          parroquia: s.parroquia || "",
          padrino_madrina: s.padrino_madrina || "",
          telefono_padrino: s.telefono_padrino || "",
          ocupacion: s.ocupacion || "",
          sacramento: s.sacramento || "",
          direccion: s.direccion || "",
          calle: s.calle || "",
          sector: s.sector || "",
          municipio: s.municipio || "",
          provincia: s.provincia || "",
          fecha_nacimiento: s.fecha_nacimiento || "",
          edad: !isNaN(Number(s.edad)) && Number(s.edad) > 0 ? Number(s.edad) : undefined,
          genero: s.genero || "",
          estado_civil: s.estado_civil || "",
          peso_kg: !isNaN(Number(s.peso_kg)) && Number(s.peso_kg) > 0 ? Number(s.peso_kg) : undefined,
          talla_cm: !isNaN(Number(s.talla_cm)) && Number(s.talla_cm) > 0 ? Number(s.talla_cm) : undefined,
          talla_camisa: s.talla_camisa || "",
          tipo_sangre: s.tipo_sangre || "",
          condicion_fisica: s.condicion_fisica || "Ninguna",
          necesidades_medicas: s.necesidades_medicas || "",
          contacto_emergencia: s.contacto_emergencia || "",
          relacion_emergencia: s.relacion_emergencia || "",
          telefono_emergencia: s.telefono_emergencia || "",
          
          estado: "Pendiente", // 👈 PASA A LA LISTA OFICIAL EN ESTADO PENDIENTE HASTA REALIZAR EL PAGO
          pago_ficha: "Pendiente",
          numero_ficha: fichaAsignada ? Number(fichaAsignada) : 1,
          ficha: fichaAsignada ? Number(fichaAsignada) : 1,

          monto_pagado: !isNaN(Number(s.monto_pagado)) ? Number(s.monto_pagado) : 0,
          metodo_pago: s.metodo_pago || "Efectivo",
          numero_retiro: numRetiro,
          
          aprobado_por: usuarioAprobador,
          aprobado_por_email: emailAprobador,
          fecha_aprobacion: fechaAprobacion,
          hora_aprobacion: horaAprobacion,
          fecha_hora_aprobacion: fechaHoraAprobacion,

          equipo_id: targetEquipoId,
          comunidad_id: targetEquipoId,
          retiro_id: slugComunidad || targetEquipoId,
          comunidad_slug: slugComunidad,
          nombre_equipo: nombreComunidad,
          comunidad: nombreComunidad,
        };

        // Eliminar undefineds
        Object.keys(payloadLimpio).forEach(k => {
          if (payloadLimpio[k] === undefined) delete payloadLimpio[k];
        });

        if (esServidor) {
          try {
            await base44.entities.Servidor.create(payloadLimpio);
          } catch (errServ) {
            await base44.entities.Servidor.create({
              nombre: s.nombre || "Servidor",
              estado: "Pendiente",
              pago_ficha: "Pendiente",
              equipo_id: targetEquipoId,
              comunidad_id: targetEquipoId,
            }).catch(e => console.error("Error definitivo Servidor:", e));
          }
        } else {
          try {
            await base44.entities.Caminante.create(payloadLimpio);
          } catch (errCam) {
            console.warn("Creación completa falló, ejecutando creación de respaldo esencial...", errCam);
            await base44.entities.Caminante.create({
              nombre: s.nombre || "Caminante",
              cedula: s.cedula || "",
              telefono: s.telefono || "",
              parroquia: s.parroquia || "",
              estado: "Pendiente",
              pago_ficha: "Pendiente",
              numero_ficha: fichaAsignada ? Number(fichaAsignada) : 1,
              ficha: fichaAsignada ? Number(fichaAsignada) : 1,
              equipo_id: targetEquipoId,
              comunidad_id: targetEquipoId,
              retiro_id: slugComunidad
            }).catch(e => console.error("Error definitivo Caminante:", e));
          }
        }
      }

      if (esServidor) {
        toast.success(`✅ Servidor ${s.nombre} aprobado (Estado: Pendiente de Pago).`);
      } else {
        toast.success(`✅ Caminante ${s.nombre} aprobado con Ficha #${fichaAsignada} (Estado: Pendiente de Pago).`);
      }

      notificarCambioComunidad("Caminantes", targetEquipoId);
      notificarCambioComunidad("Servidores", targetEquipoId);
      notificarCambioComunidad("Inscripciones", targetEquipoId);

      // 🛡️ Registrar en la Bitácora de Auditoría
      registrarAccionAuditoria({
        usuario: user,
        accion: "APROBACION",
        modulo: "Inscripciones",
        detalle: `Aprobada ficha #${fichaAsignada} para ${s.nombre} (${esServidor ? "Servidor" : "Caminante"})`,
        entidad: "InscripcionRemota",
        entidad_id: s.id || s._id,
        datos_previos: { estado: s.estado },
        datos_nuevos: { estado: "Aprobado", numero_ficha: fichaAsignada }
      });

      // 🚀 Desencadenar Modal de Notificación Automatizada de WhatsApp y Correo
      setNotifWhatsAppPersona({
        persona: { ...s, numero_ficha: fichaAsignada },
        config,
        fichaNum: fichaAsignada
      });

      setDetalle(null);
    } catch (e) {
      console.error("Error al aprobar:", e);
      toast.error("Error al aprobar la inscripción");
    } finally {
      setProcesando(null);
      cargar();
    }
  };

  const cambiarEstado = async (s, estado, mensaje) => {
    if (!s) return;
    const solId = s.id || s._id;
    setProcesando(solId);
    try {
      if (solId) {
        await base44.entities.InscripcionRemota.update(solId, { estado }).catch(async () => {
          await base44.entities.Caminante.update(solId, { estado }).catch(() => null);
        });
      }
      setSolicitudes(prev => prev.map(item => (item.id === solId || item._id === solId) ? { ...item, estado } : item));
      toast.success(mensaje);

      // 🛡️ Registrar en la Bitácora de Auditoría
      const tipoAccionAud = estado === "Rechazado" ? "ELIMINACION" : "MODIFICACION";
      registrarAccionAuditoria({
        usuario: user,
        accion: tipoAccionAud,
        modulo: "Inscripciones",
        detalle: `Estado cambiado a "${estado}" para ${s.nombre}`,
        entidad: "InscripcionRemota",
        entidad_id: solId,
        datos_previos: { estado: s.estado },
        datos_nuevos: { estado }
      });

      setDetalle(null);
      await cargar();
    } catch (e) {
      toast.error("Error al actualizar estado");
    } finally {
      setProcesando(null);
    }
  };

  const enviarListaEspera = (s) => cambiarEstado(s, "Lista de Espera", `${s.nombre} enviado a Lista de Espera`);
  const enviarNoAsistira = (s) => cambiarEstado(s, "No Asistirá", `${s.nombre} movido a No Asistirá`);

  const imc = (s) => {
    if (!s.peso_kg || !s.talla_cm) return null;
    return (s.peso_kg / Math.pow(s.talla_cm / 100, 2)).toFixed(1);
  };

  const abrirBoletaGeneral = () => {
    setPersonaSeleccionadaBoleta(null);
    setMostrarModalBoleta(true);
  };

  const abrirBoletaPersona = (p) => {
    setPersonaSeleccionadaBoleta(p);
    setMostrarModalBoleta(true);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-semibold text-slate-500">
        <div className="w-7 h-7 border-2 border-amber-300 border-t-amber-800 rounded-full animate-spin mx-auto mb-2"></div>
        Cargando solicitudes...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12 font-sans text-slate-800 text-xs leading-tight">
      <SelectorComunidad />

      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <User className="w-5 h-5 text-amber-700" />
              Inscripciones Remotas
              <button onClick={cargar} className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">
                <RefreshCw className="w-3 h-3" />
              </button>
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
              <span>Solicitudes recibidas para {comunidadActiva?.nombre || "la comunidad activa"}.</span>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.2 rounded font-mono font-bold text-[10px]">
                🔑 {codigoComunidad}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={abrirBoletaGeneral}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-800 to-amber-700 text-white font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-amber-900 transition text-xs"
            >
              <QrCode className="w-4 h-4 text-amber-200" />
              Generar Boleta con QR
            </button>

            <Link
              to="/impresiones"
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-2 rounded-xl shadow-sm transition text-xs"
            >
              <Ticket className="w-4 h-4 text-emerald-200" />
              🏷️ Stickers Adhesivos
            </Link>

            <LinkCopiable label="Caminantes" url={urlCaminantes} color="amber" />
            <LinkCopiable label="Servidores" url={urlServidores} color="blue" />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
              ● {pendientes} Pendientes
            </span>
            <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-md font-semibold">
              ● {enEspera} En Espera
            </span>
            <span className="text-slate-400">Total: {solicitudes.length}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
            <Ticket className="w-3.5 h-3.5 text-amber-700" />
            <span className="font-semibold text-slate-700">Fichas Libres:</span>
            <span className={`font-bold px-1.5 py-0.2 rounded ${fichasDisponibles > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              {fichasDisponibles} / {totalFichas}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, cédula o parroquia..."
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white" 
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {FILTROS.map(e => (
            <button 
              key={e} 
              onClick={() => setFiltroEstado(e)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filtroEstado === e 
                  ? "bg-amber-800 text-white" 
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {e || "Todos"}
              {e === "Pendiente" && pendientes > 0 && <span className="ml-1 bg-rose-500 text-white px-1 rounded-full text-[10px]">{pendientes}</span>}
              {e === "Lista de Espera" && enEspera > 0 && <span className="ml-1 bg-blue-500 text-white px-1 rounded-full text-[10px]">{enEspera}</span>}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-10 text-center text-slate-400 leading-[1.15]">
          <p className="text-2xl mb-1">📋</p>
          <p className="text-xs font-medium text-slate-600">No hay solicitudes {filtroEstado ? filtroEstado.toLowerCase() : ""} para mostrar en esta comunidad.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden text-xs leading-[1.15]">
          {filtradas.map(s => {
            const solId = s.id || s._id;
            const esCaminante = (s.tipo || "").toLowerCase() !== "servidor";

            return (
              <div 
                key={solId} 
                className="px-3.5 py-1.5 hover:bg-amber-50/40 transition-colors flex items-center justify-between gap-3 leading-[1.15]"
              >
                <div className="flex items-center gap-2 min-w-[240px] flex-1 leading-[1.15]">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 font-bold ${
                    esCaminante ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                  }`}>
                    {esCaminante ? <Footprints className="w-3.5 h-3.5" /> : <HeartHandshake className="w-3.5 h-3.5" />}
                  </div>

                  <div className="space-y-0.5 min-w-0 leading-[1.15]">
                    <div className="flex items-center gap-1.5 flex-wrap leading-[1.15]">
                      <span className="font-bold text-slate-900 text-xs tracking-tight truncate max-w-[220px] md:max-w-none leading-[1.15]">
                        {s.nombre}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded flex items-center gap-1 ${
                        esCaminante ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}>
                        {esCaminante ? <Footprints className="w-2.5 h-2.5" /> : <HeartHandshake className="w-2.5 h-2.5" />}
                        {s.tipo || (esCaminante ? "Caminante" : "Servidor")}
                      </span>
                      {s.numero_ficha && (
                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded">
                          Ficha #{s.numero_ficha}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium truncate leading-[1.15]">
                      <span>{s.parroquia || "Sin parroquia"}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono">{s.telefono || "Sin teléfono"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 leading-[1.15]">
                  <button
                    onClick={() => setNotifWhatsAppPersona({ persona: s, config, fichaNum: s.numero_ficha })}
                    className="p-1 text-emerald-800 hover:bg-emerald-50 rounded border border-emerald-300 transition-colors flex items-center gap-1 text-xs font-semibold px-2 py-1 cursor-pointer"
                    title="Enviar o reenviar notificación por WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                  </button>

                  <button
                    onClick={() => abrirBoletaPersona(s)}
                    className="p-1 text-amber-800 hover:bg-amber-50 rounded border border-amber-200 transition-colors flex items-center gap-1 text-xs font-semibold px-2 py-1"
                    title="Imprimir Boleta Personal con QR"
                  >
                    <Ticket className="w-3.5 h-3.5 text-amber-700" /> Boleta
                  </button>

                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full leading-[1.15] ${
                    s.estado === "Pendiente" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                    s.estado === "Aprobado" || s.estado === "Confirmado" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                    s.estado === "Rechazado" ? "bg-rose-50 text-rose-800 border border-rose-200" :
                    s.estado === "Lista de Espera" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {s.estado}
                  </span>

                  <button 
                    onClick={() => setDetalle(s)}
                    className="p-1 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold px-2 py-1"
                    title="Ver Ficha Completa"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detalle
                  </button>

                  {s.estado === "Pendiente" && (
                    <button 
                      onClick={() => aprobar(s)} 
                      disabled={procesando === solId}
                      className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> Aprobar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detalle && (
        <DetalleModal
          solicitud={detalle}
          onClose={() => setDetalle(null)}
          onAprobar={() => aprobar(detalle)}
          onListaEspera={() => enviarListaEspera(detalle)}
          onNoAsistira={() => enviarNoAsistira(detalle)}
          onRechazar={() => cambiarEstado(detalle, "Rechazado", "Solicitud rechazada")}
          procesando={procesando === (detalle.id || detalle._id)}
          imc={imc(detalle)}
        />
      )}

      {mostrarModalBoleta && (
        <ModalBoletaInvitacionQR
          config={config}
          comunidadActual={comunidadActual}
          urlCaminantes={urlCaminantes}
          urlServidores={urlServidores}
          persona={personaSeleccionadaBoleta}
          abierto={mostrarModalBoleta}
          onClose={() => { setMostrarModalBoleta(false); setPersonaSeleccionadaBoleta(null); }}
        />
      )}

      {notifWhatsAppPersona && (
        <ModalConfirmacionWhatsApp
          persona={notifWhatsAppPersona.persona}
          config={notifWhatsAppPersona.config || config}
          fichaNum={notifWhatsAppPersona.fichaNum}
          onClose={() => setNotifWhatsAppPersona(null)}
        />
      )}
    </div>
  );
}

function LinkCopiable({ label, url, color }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard.writeText(url);
    setCopiado(true);
    toast.success(`Link de ${label} copiado`);
    setTimeout(() => setCopiado(false), 2000);
  };

  const styles = {
    amber: "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/70",
    blue:  "bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100/70",
  };
  const s = styles[color] || styles.amber;

  return (
    <div className={`border rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs ${s}`}>
      <div className="max-w-[150px] min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider opacity-75">{label}:</p>
        <p className="text-[11px] font-mono truncate">{url}</p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-black/5 rounded text-inherit" title="Abrir link">
        <ExternalLink className="w-3 h-3" />
      </a>
      <button onClick={copiar} className="p-1 hover:bg-black/5 rounded text-inherit" title="Copiar link">
        {copiado ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function ModalBoletaInvitacionQR({ config, comunidadActual, urlCaminantes, urlServidores, persona, abierto, onClose }) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState(persona ? (String(persona.tipo).toLowerCase() === "servidor" ? "servidores" : "caminantes") : "caminantes");
  const [mostrarPanelConfig, setMostrarPanelConfig] = useState(false);
  const [descargandoJpg, setDescargandoJpg] = useState(false);
  const boletaRef = useRef(null);

  const DEFAULT_LOGO_EMAUS = "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/28de3e4eb_logoemauscircular.png";
  const defaultJesusCover = "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/ee196c230_jesus.jpg";

  const [opacidad, setOpacidad] = useState(() => Number(localStorage.getItem("boleta_opacidad")) || 0.6);
  const [zoom, setZoom] = useState(() => Number(localStorage.getItem("boleta_zoom")) || 100);
  const [posX, setPosX] = useState(() => Number(localStorage.getItem("boleta_pos_x")) ?? 50);
  const [posY, setPosY] = useState(() => Number(localStorage.getItem("boleta_pos_y")) ?? 50);
  const [imagenPortadaCustom, setImagenPortadaCustom] = useState(() => localStorage.getItem("emaus_banner_portada") || null);

  if (!abierto) return null;

  const esServidor = tipoSeleccionado === "servidores";
  const targetUrl = esServidor ? urlServidores : urlCaminantes;

  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    "default";

  // Logos de respaldo en localStorage
  const logoGeneralLocal = typeof window !== "undefined" ? (localStorage.getItem(`emaus_logo_url_${equipoIdActivo}`) || localStorage.getItem("emaus_logo_url")) : null;
  const logoHombresLocal = typeof window !== "undefined" ? (localStorage.getItem(`emaus_logo_hombres_url_${equipoIdActivo}`) || localStorage.getItem("emaus_logo_hombres_url")) : null;
  const logoMujeresLocal = typeof window !== "undefined" ? (localStorage.getItem(`emaus_logo_mujeres_url_${equipoIdActivo}`) || localStorage.getItem("emaus_logo_mujeres_url")) : null;

  // Selección inteligente del logo oficial según género / tipo de retiro (Hombres, Mujeres o General)
  const tipoPersona = persona?.tipo || (esServidor ? "Servidor" : "Caminante");
  const generoVal = persona?.genero || config?.tipo_retiro || "";
  const esHombres = String(generoVal).toLowerCase().includes("hom") || String(generoVal).toLowerCase().includes("masc") || String(tipoPersona).toLowerCase().includes("hom");
  const esMujeres = String(generoVal).toLowerCase().includes("muj") || String(generoVal).toLowerCase().includes("fem") || String(tipoPersona).toLowerCase().includes("muj");

  let logoOficial = null;
  if (esHombres && (config?.logo_hombres_url || logoHombresLocal)) {
    logoOficial = config?.logo_hombres_url || logoHombresLocal;
  } else if (esMujeres && (config?.logo_mujeres_url || logoMujeresLocal)) {
    logoOficial = config?.logo_mujeres_url || logoMujeresLocal;
  }

  if (!logoOficial || !String(logoOficial).trim()) {
    logoOficial = config?.logo_url || comunidadActual?.logo_url || logoGeneralLocal || DEFAULT_LOGO_EMAUS;
  }

  const datosQR = persona ? JSON.stringify({
    id: persona.id || persona._id,
    cedula: persona.cedula || "",
    nombre: persona.nombre || "",
    tipo: persona.tipo || (esServidor ? "Servidor" : "Caminante"),
    comunidad: comunidadActual?.nombre || ""
  }) : targetUrl;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(datosQR)}&color=${esServidor ? "1e3a8a" : "7f1d1d"}`;
  const bannerActual = (imagenPortadaCustom && String(imagenPortadaCustom).trim()) || (config?.portada_url && String(config.portada_url).trim()) || defaultJesusCover;

  const handleCambiarOpacidad = (val) => {
    const num = parseFloat(val);
    setOpacidad(num);
    localStorage.setItem("boleta_opacidad", String(num));
  };

  const handleCambiarZoom = (val) => {
    const num = parseInt(val, 10);
    setZoom(num);
    localStorage.setItem("boleta_zoom", String(num));
  };

  const handleCambiarPosX = (val) => {
    const num = parseInt(val, 10);
    setPosX(num);
    localStorage.setItem("boleta_pos_x", String(num));
  };

  const handleCambiarPosY = (val) => {
    const num = parseInt(val, 10);
    setPosY(num);
    localStorage.setItem("boleta_pos_y", String(num));
  };

  const handleEstablecerPosicionPresets = (x, y) => {
    setPosX(x);
    setPosY(y);
    localStorage.setItem("boleta_pos_x", String(x));
    localStorage.setItem("boleta_pos_y", String(y));
  };

  const handleDescargarJPG = async () => {
    if (!boletaRef.current) return;
    setDescargandoJpg(true);
    const toastId = toast.loading("Generando boleta JPG en alta resolución...");

    try {
      const canvas = await html2canvas(boletaRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      const nombreLimpio = persona?.nombre ? persona.nombre.trim().replace(/\s+/g, "_") : "Invitacion";
      link.download = `Boleta_Emaus_${nombreLimpio}.jpg`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("¡Boleta JPG descargada con éxito!", { id: toastId });
    } catch (err) {
      console.error("Error al generar JPG:", err);
      toast.error("No se pudo generar la imagen JPG: " + (err?.message || "Error visual"), { id: toastId });
    } finally {
      setDescargandoJpg(false);
    }
  };

  const handleSubirImagen = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target.result;
        setImagenPortadaCustom(dataUrl);
        localStorage.setItem("emaus_banner_portada", dataUrl);
        toast.success("Imagen de portada guardada");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImprimir = () => {
    const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const colorTema = esServidor ? "#1e3a8a" : "#7f1d1d";
    const colorSubtema = esServidor ? "#2563eb" : "#991b1b";
    const iconoRolSimbolo = esServidor ? "🤝 SERVICIO" : "🦶 CAMINANTE";

    const htmlContent = `
      <div style="max-width: 650px; margin: 0 auto; font-family: 'Georgia', serif; background: #fffcf7; border: 3px double ${colorTema}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
        
        <div style="position: relative; padding: 28px 24px; text-align: center; color: white; overflow: hidden;">
          <div style="position: absolute; inset: 0; background-image: url('${bannerActual}'); background-size: ${zoom}%; background-position: ${posX}% ${posY}%; opacity: ${opacidad}; filter: brightness(0.7);"></div>
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, ${colorTema} 100%); opacity: 0.85;"></div>

          <div style="position: relative; z-index: 10;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="width: 55px; height: 55px; border-radius: 50%; overflow: hidden; border: 2px solid #f59e0b; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                ${logoOficial ? `<img src="${logoOficial}" crossorigin="anonymous" onerror="this.onerror=null; this.src='${DEFAULT_LOGO_EMAUS}';" style="width:100%; height:100%; object-fit:cover;" />` : `<img src="${DEFAULT_LOGO_EMAUS}" style="width:100%; height:100%; object-fit:cover;" />`}
              </div>
              
              <div style="background: rgba(255,255,255,0.25); backdrop-filter: blur(4px); padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.4); font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #fef3c7;">
                ${iconoRolSimbolo}
              </div>
            </div>

            <div style="font-size: 24px; font-weight: bold; letter-spacing: 1px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.6);">✝️ RETIRO DE EMAÚS</div>
            <div style="font-size: 16px; font-weight: 600; color: #fcd34d; margin-top: 2px; text-shadow: 0 1px 3px rgba(0,0,0,0.6);">${escHtml(config?.nombre_retiro || "Emaús")} · Edición #${escHtml(config?.edicion || "1")}</div>
            <div style="font-size: 12px; font-style: italic; opacity: 0.95; margin-top: 6px; color: #fef3c7;">"${escHtml(config?.eslogan || "¡Jesucristo ha Resucitado! En verdad ha Resucitado")}"</div>
          </div>
        </div>

        <div style="padding: 24px; display: grid; grid-template-columns: 1fr 190px; gap: 20px; align-items: center; background: #fffcf7;">
          <div style="space-y: 12px;">
            ${persona ? `
              <div style="border-bottom: 2px solid ${colorSubtema}; padding-bottom: 8px; margin-bottom: 10px;">
                <span style="font-size: 10px; font-weight: bold; color: ${colorTema}; letter-spacing: 1px; text-transform: uppercase;">
                  ${persona.tipo === "Servidor" ? "PASES DE SERVICIO · SERVIDOR" : "BOLETA OFICIAL · CAMINANTE"}
                </span>
                <h2 style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #0f172a;">${escHtml(persona.nombre)}</h2>
                ${persona.apodo ? `<div style="font-size: 12px; color: #475569; font-weight: bold;">("${escHtml(persona.apodo)}")</div>` : ""}
              </div>
            ` : `
              <div style="border-bottom: 2px solid ${colorSubtema}; padding-bottom: 8px; margin-bottom: 10px;">
                <span style="font-size: 10px; font-weight: bold; color: ${colorTema}; letter-spacing: 1px; text-transform: uppercase;">INVITACIÓN OFICIAL DE INSCRIPCIÓN</span>
                <h2 style="margin: 4px 0 0 0; font-size: 18px; font-weight: bold; color: #0f172a;">${escHtml(comunidadActual?.nombre || "Comunidad Emaús")}</h2>
              </div>
            `}

            <table style="width: 100%; margin-top: 10px; font-size: 12px; line-height: 1.7; color: #334155; border-collapse: collapse;">
              ${persona?.cedula ? `<tr><td style="font-weight: bold; color: ${colorTema}; padding:2px 0;">🆔 Cédula / DNI:</td><td>${escHtml(persona.cedula)}</td></tr>` : ""}
              ${persona?.numero_ficha ? `<tr><td style="font-weight: bold; color: ${colorTema}; padding:2px 0;">🎫 Ficha Número:</td><td><strong style="color:#15803d;">#${escHtml(persona.numero_ficha)}</strong></td></tr>` : ""}
              <tr>
                <td style="font-weight: bold; color: ${colorTema}; padding:2px 0;">⛪ Parroquia:</td>
                <td>${escHtml(persona?.parroquia || config?.parroquia || "General")}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: ${colorTema}; padding:2px 0;">📍 Diócesis:</td>
                <td>${escHtml(config?.provincia || "Distrito Nacional")}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: ${colorTema}; padding:2px 0;">🏡 Casa de Retiros:</td>
                <td>${escHtml(config?.lugar || "Casa de Retiros Emaús")}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: ${colorTema}; padding:2px 0;">📅 Fechas del Retiro:</td>
                <td>${config?.fecha_inicio || "Próximamente"} al ${config?.fecha_fin || ""}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: ${colorTema}; padding:2px 0;">📞 Contacto:</td>
                <td>${escHtml(config?.telefono_contacto || config?.coordinador || "Coordinación Emaús")}</td>
              </tr>
            </table>

            <div style="margin-top: 14px; background: ${esServidor ? "#eff6ff" : "#fef3c7"}; border: 1px solid ${esServidor ? "#bfdbfe" : "#fde68a"}; padding: 10px 14px; border-radius: 10px; font-size: 11px; color: ${esServidor ? "#1e40af" : "#78350f"}; font-weight: 600;">
              ${persona ? `👉 Presenta este código QR en la entrada del retiro para tu Check-In de <strong>${persona.tipo || (esServidor ? "Servidor" : "Caminante")}</strong>.` : `👉 Escanea el Código QR con tu móvil para registrarte como <strong>${esServidor ? "Servidor" : "Caminante"}</strong>.`}
            </div>
          </div>

          <div style="text-align: center; border-left: 2px dashed ${esServidor ? "#bfdbfe" : "#fde68a"}; padding-left: 16px;">
            <div style="background: white; padding: 8px; border-radius: 16px; border: 2px solid ${colorTema}; display: inline-block;">
              <img src="${qrUrl}" alt="QR Code" style="width: 170px; height: 170px; display: block;" />
            </div>
            <div style="font-size: 10px; font-weight: bold; color: ${colorTema}; margin-top: 8px; text-transform: uppercase;">
              ${persona ? "CHECK-IN PERSONAL" : "REGISTRO ONLINE"}
            </div>
          </div>
        </div>

        <div style="background: ${colorTema}; color: white; padding: 12px 24px; text-align: center; font-size: 11px; font-weight: bold;">
          "¿No ardía nuestro corazón mientras nos hablaba en el camino?" · Lucas 24, 32
        </div>

      </div>
    `;

    openPrintWindow(buildPrintDoc(`Boleta Emaús - ${persona ? persona.nombre : "Invitación"}`, htmlContent));
  };

  const handleEnviarWhatsApp = () => {
    const texto = encodeURIComponent(
      `✝️ *BOLETA / INVITACIÓN DE EMAÚS*\n` +
      `*${comunidadActual?.nombre || "Comunidad Emaús"}*\n\n` +
      (persona ? `👤 *Participante:* ${persona.nombre}\n🎗️ *Rol:* ${persona.tipo || "Caminante"}\n` : "") +
      `⛪ *Parroquia:* ${config?.parroquia || "General"}\n` +
      `🏡 *Lugar:* ${config?.lugar || "Casa de Retiros"}\n` +
      `📅 *Fechas:* ${config?.fecha_inicio || "Próximamente"}\n` +
      `📞 *Contacto:* ${config?.telefono_contacto || config?.coordinador || "Coordinación Emaús"}\n\n` +
      `👉 *Acceso / Inscripción online:* ${targetUrl}`
    );
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-amber-200">
        
        <div className={`px-6 py-4 text-white flex justify-between items-center ${esServidor ? "bg-gradient-to-r from-blue-900 to-slate-900" : "bg-gradient-to-r from-amber-900 to-amber-800"}`}>
          <div className="flex items-center gap-2">
            {esServidor ? <HeartHandshake className="w-5 h-5 text-blue-300" /> : <Footprints className="w-5 h-5 text-amber-300" />}
            <h3 className="font-bold text-base">
              Boleta {persona ? `de ${persona.nombre}` : "Oficial de Invitación"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarPanelConfig(!mostrarPanelConfig)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition border ${
                mostrarPanelConfig ? "bg-amber-400 text-amber-950 border-amber-300" : "bg-white/10 hover:bg-white/20 text-white border-white/20"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Ajustar Fondo & Logo</span>
            </button>

            <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {mostrarPanelConfig && (
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 animate-in slide-in-from-top-2 border border-slate-700 shadow-inner text-xs">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Settings className="w-4 h-4" /> Personalizar Fondo y Movimiento Libre
                </span>
                <button onClick={() => setMostrarPanelConfig(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-300 mb-1 flex justify-between">
                    <span>Opacidad Fondo:</span>
                    <span className="text-amber-400">{Math.round(opacidad * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={opacidad}
                    onChange={(e) => handleCambiarOpacidad(e.target.value)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 mb-1 flex justify-between">
                    <span>Tamaño / Zoom:</span>
                    <span className="text-amber-400">{zoom}%</span>
                  </label>
                  <input
                    type="range"
                    min="80"
                    max="250"
                    step="10"
                    value={zoom}
                    onChange={(e) => handleCambiarZoom(e.target.value)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 mb-1 flex justify-between">
                    <span className="flex items-center gap-1"><Move className="w-3 h-3 text-amber-400" /> Posición Horizontal (X):</span>
                    <span className="text-amber-400">{posX}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={posX}
                    onChange={(e) => handleCambiarPosX(e.target.value)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 mb-1 flex justify-between">
                    <span className="flex items-center gap-1"><Move className="w-3 h-3 rotate-90 text-amber-400" /> Posición Vertical (Y):</span>
                    <span className="text-amber-400">{posY}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={posY}
                    onChange={(e) => handleCambiarPosY(e.target.value)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-1 text-[10px]">
                  <button onClick={() => handleEstablecerPosicionPresets(50, 50)} className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300">Centro</button>
                  <button onClick={() => handleEstablecerPosicionPresets(50, 0)} className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300">Arriba</button>
                  <button onClick={() => handleEstablecerPosicionPresets(50, 100)} className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300">Abajo</button>
                  <button onClick={() => handleEstablecerPosicionPresets(0, 50)} className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300">Izquierda</button>
                  <button onClick={() => handleEstablecerPosicionPresets(100, 50)} className="bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300">Derecha</button>
                </div>

                <label className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Imagen Custom</span>
                  <input type="file" accept="image/*" onChange={handleSubirImagen} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {!persona && (
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setTipoSeleccionado("caminantes")}
                className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-bold transition ${
                  !esServidor ? "bg-amber-800 text-white shadow-xs" : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Footprints className="w-3.5 h-3.5" /> Caminantes
              </button>
              <button
                onClick={() => setTipoSeleccionado("servidores")}
                className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-bold transition ${
                  esServidor ? "bg-blue-800 text-white shadow-xs" : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" /> Servidores
              </button>
            </div>
          )}

          <div ref={boletaRef} className={`border-2 rounded-2xl overflow-hidden shadow-md ${esServidor ? "border-blue-900/30 bg-blue-50/20" : "border-amber-900/30 bg-amber-50/20"}`}>
            <div className="relative p-5 text-white overflow-hidden min-h-[130px] flex flex-col justify-between">
              <div 
                className="absolute inset-0 bg-no-repeat transition-all duration-200"
                style={{ 
                  backgroundImage: `url('${bannerActual}')`, 
                  backgroundSize: `${zoom}%`, 
                  backgroundPosition: `${posX}% ${posY}%`, 
                  opacity: opacidad, 
                  filter: "brightness(0.7)" 
                }}
              />
              <div className={`absolute inset-0 opacity-80 ${esServidor ? "bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900" : "bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950"}`} />

              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md border ${
                    esServidor ? "bg-blue-500/20 text-blue-200 border-blue-300/30" : "bg-amber-500/20 text-amber-200 border-amber-300/30"
                  }`}>
                    {esServidor ? "🤝 PASES DE SERVICIO · SERVIDOR" : "🦶 BOLETA OFICIAL · CAMINANTE"}
                  </span>
                  <h4 className="text-lg font-extrabold text-white mt-1 drop-shadow-md">
                    {persona ? persona.nombre : (comunidadActual?.nombre || "Comunidad Emaús")}
                  </h4>
                  {persona?.apodo && <p className="text-xs text-amber-200 font-bold">("{persona.apodo}")</p>}
                </div>

                <div className="w-11 h-11 rounded-full border-2 border-amber-400 overflow-hidden bg-white shadow-lg flex items-center justify-center shrink-0">
                  <img 
                    src={logoOficial || DEFAULT_LOGO_EMAUS} 
                    alt="Logo Oficial Emaús" 
                    crossOrigin="anonymous"
                    onError={(e) => { e.currentTarget.src = DEFAULT_LOGO_EMAUS; }}
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>

              <div className="relative z-10 flex justify-between items-end mt-3 text-[11px] font-semibold text-amber-100">
                <span>Retiro #{config?.edicion || "1"}</span>
                <span>{config?.parroquia || "Parroquia General"}</span>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-white">
              <div className="md:col-span-2 space-y-1.5 text-xs text-slate-700 font-medium">
                {persona?.cedula && <p><strong>🆔 Cédula:</strong> {persona.cedula}</p>}
                {persona?.numero_ficha && <p><strong>🎫 Ficha #:</strong> <span className="text-emerald-700 font-bold">#{persona.numero_ficha}</span></p>}
                <p><strong>⛪ Parroquia:</strong> {persona?.parroquia || config?.parroquia || "General"}</p>
                <p><strong>📍 Diócesis:</strong> {config?.provincia || "Distrito Nacional"}</p>
                <p><strong>🏡 Casa Retiros:</strong> {config?.lugar || "Casa de Retiros Emaús"}</p>
                <p><strong>📅 Fechas:</strong> {config?.fecha_inicio ? formatFecha(config.fecha_inicio) : "Próximamente"}{config?.fecha_fin ? ` al ${formatFecha(config.fecha_fin)}` : ""}</p>
                <p><strong>📞 Contacto:</strong> {config?.telefono_contacto || config?.coordinador || "Coordinación Emaús"}</p>
              </div>

              <div className={`text-center p-2 rounded-xl border ${esServidor ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
                <img src={qrUrl} alt="QR Code" className="w-28 h-28 mx-auto rounded-lg" />
                <span className={`text-[9px] font-bold block mt-1 ${esServidor ? "text-blue-900" : "text-amber-900"}`}>
                  {persona ? "CHECK-IN QR" : "REGISTRO ONLINE"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleEnviarWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar por WhatsApp
          </button>

          <button
            type="button"
            onClick={handleDescargarJPG}
            disabled={descargandoJpg}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            {descargandoJpg ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generando JPG...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 text-amber-200" />
                <span>Descargar Boleta (JPG)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleImprimir}
            className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-bold shadow-md transition ${
              esServidor ? "bg-blue-800 hover:bg-blue-900" : "bg-amber-800 hover:bg-amber-900"
            }`}
          >
            <Printer className="w-4 h-4" />
            Descargar / Imprimir Boleta
          </button>
        </div>
      </div>
    </div>
  );
}

function DetalleModal({ solicitud: s, onClose, onAprobar, onListaEspera, onNoAsistira, onRechazar, procesando, imc }) {
  const itemFila = (label, val, icon) => (
    <div className="flex items-start justify-between text-xs py-1.5 border-b border-gray-100 gap-3">
      <span className="text-gray-500 font-medium shrink-0 flex items-center gap-1.5">
        {icon} {label}:
      </span>
      <span className="text-gray-800 font-bold text-right leading-snug break-all">
        {val || <span className="text-gray-400 font-normal italic">No especificado</span>}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col border border-amber-100">
        <div className="bg-amber-800 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-900/80 px-2 py-0.5 rounded text-amber-200">
              Ficha Completa de Inscripción
            </span>
            <h2 className="font-bold text-base md:text-lg leading-tight mt-0.5">{s.nombre}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.tipo === "Caminante" ? "bg-amber-200 text-amber-900" : "bg-blue-200 text-blue-900"}`}>
                {s.tipo}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Estado: {s.estado}
              </span>
              {s.numero_ficha && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Ficha #{s.numero_ficha}
                </span>
              )}
            </div>
            {imc && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${Number(imc) >= 30 ? "bg-orange-100 text-orange-800 border border-orange-300" : "bg-gray-100 text-gray-700"}`}>
                IMC: {imc} {Number(imc) >= 30 && "(Sugerido 1er Piso)"}
              </span>
            )}
          </div>

          {(s.aprobado_por || s.fecha_aprobacion || s.estado === "Aprobado") && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1">
              <h3 className="font-bold text-emerald-900 border-b border-emerald-200 pb-1 mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Auditoría de Aprobación
              </h3>
              {itemFila("Aprobado Por", s.aprobado_por || "Coordinación")}
              {itemFila("Email de Aprobador", s.aprobado_por_email)}
              {itemFila("Fecha de Aprobación", s.fecha_aprobacion || s.fecha_hora_aprobacion)}
              {itemFila("Hora de Aprobación", s.hora_aprobacion)}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-3.5 space-y-1">
            <h3 className="font-bold text-amber-900 border-b pb-1 mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-700" /> Información Personal
            </h3>
            {itemFila("Nombre Completo", s.nombre)}
            {itemFila("Apodo", s.apodo)}
            {itemFila("Cédula", s.cedula)}
            {itemFila("Edad", s.edad ? `${s.edad} años` : null)}
            {itemFila("Fecha de Nacimiento", s.fecha_nacimiento)}
            {itemFila("Género", s.genero)}
            {itemFila("Estado Civil", s.estado_civil)}
            {itemFila("Ocupación", s.ocupacion)}
            {itemFila("Teléfono", s.telefono)}
            {itemFila("Email", s.email)}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3.5 space-y-1">
            <h3 className="font-bold text-amber-900 border-b pb-1 mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-700" /> Ubicación Eclesiástica y Dirección
            </h3>
            {itemFila("Diócesis / Arquidiócesis", s.diocesis)}
            {itemFila("Parroquia / Templo", s.parroquia)}
            {itemFila("Municipio", s.municipio)}
            {itemFila("Provincia", s.provincia)}
            {itemFila("Calle / Número", s.calle)}
            {itemFila("Sector / Barrio", s.sector)}
            {itemFila("Dirección Completa", s.direccion)}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3.5 space-y-1">
            <h3 className="font-bold text-amber-900 border-b pb-1 mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-700" /> Padrino y Emergencia
            </h3>
            {itemFila("Padrino / Madrina", s.padrino_madrina)}
            {itemFila("Teléfono del Padrino", s.telefono_padrino)}
            {itemFila("Contacto de Emergencia", s.contacto_emergencia)}
            {itemFila("Relación de Emergencia", s.relacion_emergencia)}
            {itemFila("Teléfono de Emergencia", s.telefono_emergencia)}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3.5 space-y-1">
            <h3 className="font-bold text-amber-900 border-b pb-1 mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-amber-700" /> Datos Físicos y Médicos
            </h3>
            {itemFila("Peso", s.peso_kg ? `${s.peso_kg} kg` : null)}
            {itemFila("Estatura", s.talla_cm ? `${s.talla_cm} cm` : null)}
            {itemFila("Talla de Camisa", s.talla_camisa)}
            {itemFila("Tipo de Sangre", s.tipo_sangre)}
            {itemFila("Condición Física Especial", s.condicion_fisica)}
            {itemFila("Necesidades Médicas / Alergias", s.necesidades_medicas)}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3.5 space-y-1">
            <h3 className="font-bold text-amber-900 border-b pb-1 mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-amber-700" /> Ministerio y Pago
            </h3>
            {itemFila("Sacramento", s.sacramento)}
            {itemFila("Rol de Servidor", s.rol_servidor || s.rol)}
            {itemFila("Rol en Mesa", s.rol_en_mesa)}
            {itemFila("Monto Pagado", s.monto_pagado ? `RD$ ${s.monto_pagado}` : "Pendiente de pago")}
            {itemFila("Método de Pago", s.metodo_pago)}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 sticky bottom-0">
          <button 
            onClick={onClose} 
            className="px-3 py-2 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition text-xs"
          >
            Cerrar Ficha
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {s.estado === "Pendiente" && (
              <>
                <button 
                  onClick={onAprobar} 
                  disabled={procesando} 
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl flex items-center gap-1 shadow-md transition disabled:opacity-50 text-xs"
                >
                  <CheckCircle className="w-4 h-4" /> Aprobar Ficha Auto
                </button>

                <button 
                  onClick={onListaEspera} 
                  disabled={procesando} 
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold rounded-xl flex items-center gap-1 transition disabled:opacity-50 text-xs"
                >
                  <Hourglass className="w-4 h-4" /> Lista de Espera
                </button>

                <button 
                  onClick={onNoAsistira} 
                  disabled={procesando} 
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-bold rounded-xl flex items-center gap-1 transition disabled:opacity-50 text-xs"
                >
                  <UserX className="w-4 h-4" /> No Asistirá
                </button>

                <button 
                  onClick={onRechazar} 
                  disabled={procesando} 
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1 shadow-md transition disabled:opacity-50 text-xs"
                >
                  <XCircle className="w-4 h-4" /> Rechazar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}