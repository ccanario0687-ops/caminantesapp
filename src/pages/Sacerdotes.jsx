import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import {
  Send, Users, FileText, X, Phone, History,
  AlertTriangle, Sparkles, Settings2, Loader2
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// LOGO DE WHATSAPP (SVG OFICIAL)
// ═══════════════════════════════════════════════════════════════
const WhatsAppLogo = ({ className = "w-6 h-6 text-white" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.572-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// PLANTILLAS PREDEFINIDAS
// ═══════════════════════════════════════════════════════════════
const PLANTILLAS = [
  {
    id: "recordatorio_pago",
    nombre: "⏰ Recordatorio de Pago",
    texto: `Hola {nombre} 🙏

Te recordamos que tu ficha del Retiro de Emaús tiene un saldo pendiente de {monto_pendiente}.
{abono}
¿Podrías confirmar cuándo podrás completar el pago? ¡Gracias! ✝️`
  },
  {
    id: "confirmacion_pago",
    nombre: "✅ Confirmación de Pago",
    texto: `Hola {nombre} 🙏

Hemos recibido tu pago de {monto} correspondiente a tu ficha del Retiro de Emaús.

¡Gracias por tu aporte! Que Dios te bendiga. ✝️`
  },
  {
    id: "info_retiro",
    nombre: "📢 Información del Retiro",
    texto: `Hola {nombre} ✝️

{mensaje}

¡Nos vemos en el retiro! Que Dios te bendiga. 🙏`
  },
  {
    id: "agradecimiento_servidor",
    nombre: "💖 Agradecimiento al Servidor",
    texto: `Hola {nombre} 💖

Gracias por tu servicio en este Retiro de Emaús. Tu entrega hace posible que muchos vivan esta experiencia. ✝️🙏`
  },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS BLINDADOS (evitan errores de conversión)
// ═══════════════════════════════════════════════════════════════
const aTexto = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "object") {
    if (typeof v.value !== "undefined") return aTexto(v.value);
    if (typeof v.nombre !== "undefined") return aTexto(v.nombre);
    try { return JSON.stringify(v); } catch { return ""; }
  }
  return "";
};

const aNumero = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "object") v = v.value ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtSeguro = (v) => {
  return aNumero(v).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const normalizarTelefono = (tel) => {
  const digits = aTexto(tel).replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.length === 10 ? "1" + digits : digits;
  return full.length === 11 ? full : null;
};

const reemplazarVariables = (texto, persona, extra, monedaActiva, obtenerPendiente) => {
  const montoAbonado = aNumero(persona.monto_abonado);
  const montoPendiente = obtenerPendiente ? obtenerPendiente(persona) : aNumero(persona.monto_pendiente);

  const abono = montoAbonado > 0
    ? `Ya has abonado ${monedaActiva} ${fmtSeguro(montoAbonado)}. `
    : "";
  const mesa = aNumero(persona.numero_mesa);

  // Limpiar cualquier prefijo 'RD$' o '$' directo en la plantilla para evitar símbolos duplicados
  const textoLimpio = aTexto(texto)
    .replace(/RD\$\s*\{/g, "{")
    .replace(/\$\s*\{/g, "{");

  return textoLimpio
    .replaceAll("{nombre}", aTexto(persona.nombre) || aTexto(persona.nombre_completo) || "herman@")
    .replaceAll("{monto_pendiente}", `${monedaActiva} ${fmtSeguro(montoPendiente)}`)
    .replaceAll("{monto_abonado}", `${monedaActiva} ${fmtSeguro(montoAbonado)}`)
    .replaceAll("{monto}", `${monedaActiva} ${fmtSeguro(montoPendiente > 0 ? montoPendiente : montoAbonado)}`)
    .replaceAll("{parroquia}", aTexto(persona.parroquia) || "tu parroquia")
    .replaceAll("{mesa}", mesa > 0 ? `Mesa ${mesa}` : "")
    .replaceAll("{abono}", abono)
    .replaceAll("{mensaje}", aTexto(extra));
};

const leerHistorial = () => {
  try { return JSON.parse(localStorage.getItem("historial_whatsapp") || "[]"); }
  catch { return []; }
};

const leerApiConfig = () => {
  try { return JSON.parse(localStorage.getItem("whatsapp_api_config") || "null"); }
  catch { return null; }
};

// ═══════════════════════════════════════════════════════════════
// EXPORT PRINCIPAL: Módulo Mensajería WhatsApp
// ═══════════════════════════════════════════════════════════════
export default function Mensajeria() {
  const { comunidadActual } = useComunidad();
  const { user: currentUser } = useAuth();

  const [caminantes, setCaminantes] = useState([]);
  const [servidores, setServidores] = useState([]);
  const [configRetiro, setConfigRetiro] = useState(null);
  const [configFinanza, setConfigFinanza] = useState(null);
  const [moneda, setMoneda] = useState(() => localStorage.getItem("emaus_moneda") || "RD$");
  const [loading, setLoading] = useState(true);

  const [tipoDest, setTipoDest] = useState("caminantes");
  const [filtroDest, setFiltroDest] = useState("todos");
  const [seleccionados, setSeleccionados] = useState({});

  const [plantillaId, setPlantillaId] = useState("recordatorio_pago");
  const [texto, setTexto] = useState(PLANTILLAS[0].texto);
  const [mensajeExtra, setMensajeExtra] = useState("");

  const [cola, setCola] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [historial, setHistorial] = useState(leerHistorial());
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const [apiConfig, setApiConfig] = useState(leerApiConfig());
  const [mostrarConfigApi, setMostrarConfigApi] = useState(false);
  const [probandoApi, setProbandoApi] = useState(false);

  const esCreadorReal = Boolean(
    currentUser?.email === "ccanario0687@gmail.com" || 
    currentUser?.es_creador === true
  );

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
    const slugReg = String(item.slug || item.retiro_id || item.comunidad_slug || "");
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
  }, [comunidadActual, currentUser, esCreadorReal]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Caminante?.list?.("-created_date").catch(() => []) || Promise.resolve([]),
      base44.entities.Servidor?.list?.("-created_date").catch(() => []) || Promise.resolve([]),
      base44.entities.Servidores?.list?.("-created_date").catch(() => []) || Promise.resolve([]),
      base44.entities.InscripcionRemota?.list?.("-created_date").catch(() => []) || Promise.resolve([]),
      base44.entities.ConfigRetiro?.list?.().catch(() => []) || Promise.resolve([]),
      base44.entities.ConfigFinanza?.list?.().catch(() => []) || Promise.resolve([]),
    ]).then(([rCaminantes, rServ1, rServ2, rRemotas, cfgsRet, cfgsFin]) => {
      
      // 1. PROCESAR Y UNIFICAR TODOS LOS SERVIDORES DE TODAS LAS FUENTES
      let servsRaw = [];
      if (Array.isArray(rServ1)) servsRaw.push(...rServ1);
      if (Array.isArray(rServ2)) servsRaw.push(...rServ2);

      if (Array.isArray(rCaminantes)) {
        const soloServs = rCaminantes.filter(c => 
          String(c.tipo || "").toLowerCase() === "servidor" || 
          String(c.tipo_registro || "").toLowerCase() === "servidor" ||
          c.es_servidor === true ||
          Boolean(c.lugares_servido || c.rol_servidor || c.equipo_trabajo)
        );
        servsRaw.push(...soloServs);
      }

      if (Array.isArray(rRemotas)) {
        const soloServsRemotos = rRemotas.filter(c => {
          const est = String(c.estado || "").toLowerCase();
          const esAprob = est === "aprobado" || est === "confirmado" || est === "completado";
          const tipoStr = String(c.tipo || c.tipo_inscripcion || c.tipo_registro || c.rol_servidor || "").toLowerCase();
          const esServ = tipoStr.includes("servid") || c.es_servidor === true || Boolean(c.lugares_servido || c.rol_servidor || c.equipo_trabajo);
          return esAprob && esServ;
        });
        servsRaw.push(...soloServsRemotos);
      }

      const mapaServs = new Map();
      servsRaw.forEach(s => {
        if (!s) return;
        const cleanCed = s.cedula ? String(s.cedula).replace(/\D/g, "") : "";
        const cleanTel = s.telefono ? String(s.telefono).replace(/\D/g, "") : "";
        const cleanNom = s.nombre ? String(s.nombre).trim().toLowerCase() : "";
        const keyInscrip = s.inscripcion_id || s.inscripcion_remota_id ? String(s.inscripcion_id || s.inscripcion_remota_id) : null;

        let key = null;
        if (keyInscrip && mapaServs.has(keyInscrip)) {
          key = keyInscrip;
        } else if (cleanCed && mapaServs.has(`ced_${cleanCed}`)) {
          key = `ced_${cleanCed}`;
        } else if (cleanNom && cleanTel && mapaServs.has(`nom_${cleanNom}_${cleanTel}`)) {
          key = `nom_${cleanNom}_${cleanTel}`;
        } else {
          key = keyInscrip ? keyInscrip : (cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(s.id || s._id || Math.random())));
        }

        const prev = mapaServs.get(key) || {};
        mapaServs.set(key, {
          ...s,
          ...prev,
          id: prev.id || s.id || key,
          nombre: prev.nombre || s.nombre || s.nombre_completo,
          telefono: prev.telefono || s.telefono,
          equipo_trabajo: prev.equipo_trabajo || s.equipo_trabajo || prev.rol || s.rol,
          monto_abonado: Math.max(Number(prev.monto_abonado || 0), Number(s.monto_abonado || 0)),
          _tipo: "Servidor"
        });
      });

      const todosServidores = Array.from(mapaServs.values());
      const servsFiltrados = todosServidores.filter(coincideComunidad);

      // 2. PROCESAR Y UNIFICAR CAMINANTES
      let camsRaw = [];
      if (Array.isArray(rCaminantes)) {
        const soloCams = rCaminantes.filter(c => 
          String(c.tipo || "").toLowerCase() !== "servidor" && 
          String(c.tipo_registro || "").toLowerCase() !== "servidor" &&
          !c.es_servidor &&
          !c.rol_servidor
        );
        camsRaw.push(...soloCams);
      }

      if (Array.isArray(rRemotas)) {
        const soloCamsRemotos = rRemotas.filter(c => {
          const est = String(c.estado || "").toLowerCase();
          const esAprob = est === "aprobado" || est === "confirmado" || est === "completado";
          const tipoStr = String(c.tipo || c.tipo_inscripcion || c.tipo_registro || "").toLowerCase();
          const esServ = tipoStr.includes("servid") || c.es_servidor === true;
          return esAprob && !esServ;
        });
        camsRaw.push(...soloCamsRemotos);
      }

      const mapaCams = new Map();
      camsRaw.forEach(c => {
        if (!c) return;
        const cleanCed = c.cedula ? String(c.cedula).replace(/\D/g, "") : "";
        const cleanTel = c.telefono ? String(c.telefono).replace(/\D/g, "") : "";
        const cleanNom = c.nombre ? String(c.nombre).trim().toLowerCase() : "";
        const key = cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(c.id || c._id || Math.random()));

        if (!mapaCams.has(key)) {
          mapaCams.set(key, { ...c, _tipo: "Caminante" });
        }
      });

      const todosCaminantes = Array.from(mapaCams.values());
      const camsFiltrados = todosCaminantes.filter(coincideComunidad);

      // 3. CONFIGURACIONES
      const activeCfgRet = (cfgsRet || []).find(coincideComunidad) || cfgsRet[0] || null;
      const activeCfgFin = (cfgsFin || []).find(coincideComunidad) || cfgsFin[0] || null;

      setConfigRetiro(activeCfgRet);
      setConfigFinanza(activeCfgFin);

      if (activeCfgRet?.moneda) {
        setMoneda(activeCfgRet.moneda);
        localStorage.setItem("emaus_moneda", activeCfgRet.moneda);
      }

      setCaminantes(camsFiltrados);
      setServidores(servsFiltrados);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [coincideComunidad]);

  const equipoIdActivo = comunidadActual?.equipo_id || comunidadActual?.id || null;

  const precioCaminante = useMemo(() => {
    const key = `emaus_precio_cam_${equipoIdActivo || 'def'}_${moneda}`;
    const localVal = localStorage.getItem(key);
    if (localVal && !isNaN(Number(localVal)) && Number(localVal) > 0) return Number(localVal);
    if (moneda === "USD$") return Number(configFinanza?.precio_ficha_caminante_usd ?? configFinanza?.precio_ficha_caminante ?? 0);
    if (moneda === "EUR$") return Number(configFinanza?.precio_ficha_caminante_eur ?? configFinanza?.precio_ficha_caminante ?? 0);
    return Number(configFinanza?.precio_ficha_caminante ?? 0);
  }, [configFinanza, moneda, equipoIdActivo]);

  const precioServidor = useMemo(() => {
    const key = `emaus_precio_serv_${equipoIdActivo || 'def'}_${moneda}`;
    const localVal = localStorage.getItem(key);
    if (localVal && !isNaN(Number(localVal)) && Number(localVal) > 0) return Number(localVal);
    if (moneda === "USD$") return Number(configFinanza?.precio_ficha_servidor_usd ?? configFinanza?.precio_ficha_servidor ?? 0);
    if (moneda === "EUR$") return Number(configFinanza?.precio_ficha_servidor_eur ?? configFinanza?.precio_ficha_servidor ?? 0);
    return Number(configFinanza?.precio_ficha_servidor ?? 0);
  }, [configFinanza, moneda, equipoIdActivo]);

  const obtenerMontoPendiente = useCallback((persona) => {
    if (!persona) return 0;
    const esPagado = 
      persona.pago_ficha === "Pagado" || 
      persona.estado_pago === "Pagado" || 
      persona.pago === "Pagado" || 
      persona.status_pago === "Pagado";

    if (esPagado) return 0;

    const abonado = Number(persona.monto_abonado) || 0;
    const tipo = persona._tipo || "Caminante";

    if (persona.monto_pendiente !== undefined && persona.monto_pendiente !== null && Number(persona.monto_pendiente) > 0) {
      return Number(persona.monto_pendiente);
    }

    const precioBase = tipo === "Caminante" ? precioCaminante : precioServidor;
    const precioTotal = Number(persona.monto_total || persona.precio_ficha || precioBase);
    return Math.max(0, precioTotal - abonado);
  }, [precioCaminante, precioServidor]);

  const destinatarios = useMemo(() => {
    let lista = [];
    if (tipoDest === "caminantes" || tipoDest === "todos") {
      lista = lista.concat(caminantes.map(c => ({ ...c, _tipo: "Caminante" })));
    }
    if (tipoDest === "servidores" || tipoDest === "todos") {
      lista = lista.concat(servidores.map(s => ({ ...s, _tipo: "Servidor" })));
    }

    if (filtroDest === "pendientes") {
      lista = lista.filter(p => obtenerMontoPendiente(p) > 0);
    } else if (filtroDest === "parciales") {
      lista = lista.filter(p => {
        const abonado = aNumero(p.monto_abonado);
        const pend = obtenerMontoPendiente(p);
        return abonado > 0 && pend > 0;
      });
    } else if (filtroDest === "pagados") {
      lista = lista.filter(p => obtenerMontoPendiente(p) <= 0);
    }

    return lista.filter(p => p.estado !== "Cancelado");
  }, [caminantes, servidores, tipoDest, filtroDest, obtenerMontoPendiente]);

  const seleccionadosLista = destinatarios.filter(p => seleccionados[p.id]);
  const telefonosInvalidos = seleccionadosLista.filter(p => !normalizarTelefono(p.telefono));

  const toggleSeleccion = (id) => setSeleccionados(prev => ({ ...prev, [id]: !prev[id] }));

  const seleccionarTodos = () => {
    const todosSel = destinatarios.length > 0 && destinatarios.every(p => seleccionados[p.id]);
    const nuevo = {};
    destinatarios.forEach(p => nuevo[p.id] = !todosSel);
    setSeleccionados(nuevo);
  };

  const aplicarPlantilla = (id) => {
    const p = PLANTILLAS.find(x => x.id === id);
    setPlantillaId(id);
    if (p) setTexto(p.texto);
  };

  const guardarHistorial = (items) => {
    const nuevo = [...items, ...historial].slice(0, 200);
    setHistorial(nuevo);
    localStorage.setItem("historial_whatsapp", JSON.stringify(nuevo));
  };

  const iniciarColaManual = () => {
    const validos = seleccionadosLista
      .map(p => ({
        id: p.id,
        nombre: aTexto(p.nombre) || aTexto(p.nombre_completo) || "Sin nombre",
        tipo: p._tipo,
        telefono: normalizarTelefono(p.telefono),
        mensaje: reemplazarVariables(texto, p, mensajeExtra, moneda, obtenerMontoPendiente),
      }))
      .filter(p => p.telefono);

    if (validos.length === 0) {
      toast.error("Ningún seleccionado tiene teléfono válido.");
      return;
    }
    if (telefonosInvalidos.length > 0) {
      toast.warning(`${telefonosInvalidos.length} contacto(s) sin teléfono válido serán omitidos.`);
    }
    setCola({ items: validos, idx: 0 });
  };

  const abrirWhatsAppActual = () => {
    if (!cola) return;
    const item = cola.items[cola.idx];
    window.open(`https://wa.me/${item.telefono}?text=${encodeURIComponent(item.mensaje)}`, "_blank");
    guardarHistorial([{ ...item, fecha: new Date().toISOString(), modo: "Manual (wa.me)" }]);
    avanzarCola();
  };

  const avanzarCola = () => {
    setCola(prev => {
      if (!prev) return null;
      const next = prev.idx + 1;
      if (next >= prev.items.length) {
        toast.success("✅ Cola de envío completada.");
        return null;
      }
      return { ...prev, idx: next };
    });
  };

  const enviarViaApi = async (item) => {
    const res = await fetch(`https://graph.facebook.com/v19.0/${apiConfig.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiConfig.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: item.telefono,
        type: "text",
        text: { body: item.mensaje },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Error de API");
    return data;
  };

  const enviarTodosApi = async () => {
    if (!apiConfig?.token || !apiConfig?.phoneNumberId) {
      toast.error("Configura primero la API de WhatsApp (botón ⚙️).");
      setMostrarConfigApi(true);
      return;
    }
    const validos = seleccionadosLista
      .map(p => ({
        id: p.id,
        nombre: aTexto(p.nombre) || aTexto(p.nombre_completo) || "Sin nombre",
        tipo: p._tipo,
        telefono: normalizarTelefono(p.telefono),
        mensaje: reemplazarVariables(texto, p, mensajeExtra, moneda, obtenerMontoPendiente),
      }))
      .filter(p => p.telefono);

    if (validos.length === 0) { toast.error("Ningún teléfono válido."); return; }

    setEnviando(true);
    let ok = 0, fail = 0;
    const enviadosLog = [];
    for (const item of validos) {
      try {
        await enviarViaApi(item);
        ok++;
        enviadosLog.push({ ...item, fecha: new Date().toISOString(), modo: "API Automática" });
      } catch (e) {
        fail++;
        console.error("Fallo envío a", item.nombre, e);
      }
      await new Promise(r => setTimeout(r, 400));
    }
    guardarHistorial(enviadosLog);
    setEnviando(false);
    toast.success(`📤 Envío completado: ${ok} enviados, ${fail} fallidos.`);
    if (fail > 0) toast.warning("Algunos fallaron. Si el contacto no te escribió en 24h, necesitas una PLANTILLA aprobada por Meta.");
  };

  const guardarApiConfig = (cfg) => {
    localStorage.setItem("whatsapp_api_config", JSON.stringify(cfg));
    setApiConfig(cfg);
    setMostrarConfigApi(false);
    toast.success("✅ Configuración de API guardada.");
  };

  const probarApi = async (cfg) => {
    setProbandoApi(true);
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${cfg.phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: (aTexto(cfg.telefonoPrueba).replace(/\D/g, "")),
          type: "text",
          text: { body: `✅ Prueba de conexión del Centro de Mensajería Emaús en ${moneda}.` },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Error");
      toast.success("✅ Mensaje de prueba enviado. Revisa tu WhatsApp.");
    } catch (e) {
      toast.error("❌ " + e.message);
    } finally {
      setProbandoApi(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-amber-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;

  const itemActual = cola?.items[cola?.idx];

  return (
    <div className="min-h-screen bg-amber-50/40 p-4 md:p-6">
      {/* ═══ HEADER WHATSAPP EXCLUSIVO CON MONEDA DINÁMICA ═══ */}
      <div className="max-w-5xl mx-auto mb-5">
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl p-5 text-white shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
              <WhatsAppLogo className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">Mensajería WhatsApp</h1>
                <span className="bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-white/30">
                  Moneda Activa: <strong>{moneda}</strong>
                </span>
              </div>
              <p className="text-xs opacity-90">Envía confirmaciones de cobro, recordatorios e información del retiro en <strong>{moneda}</strong></p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarHistorial(!mostrarHistorial)}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-xs font-medium transition"
            >
              <History className="w-3.5 h-3.5" /> Historial ({historial.length})
            </button>
            <button
              onClick={() => setMostrarConfigApi(true)}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-xs font-medium transition"
            >
              <Settings2 className="w-3.5 h-3.5" /> {apiConfig ? "API Conectada ✅" : "Conectar API"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ═══ COLUMNA 1: DESTINATARIOS ═══ */}
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-emerald-700" /> 1. Destinatarios ({destinatarios.length})
            </h2>
            <button onClick={seleccionarTodos} className="text-[11px] text-emerald-700 font-bold hover:underline">
              {destinatarios.length > 0 && destinatarios.every(p => seleccionados[p.id]) ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select value={tipoDest} onChange={e => { setTipoDest(e.target.value); setSeleccionados({}); }} className="border border-emerald-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-emerald-300">
                <option value="caminantes">🚶 Caminantes</option>
                <option value="servidores">🙏 Servidores</option>
                <option value="todos">👥 Todos</option>
              </select>
              <select value={filtroDest} onChange={e => { setFiltroDest(e.target.value); setSeleccionados({}); }} className="border border-emerald-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-emerald-300">
                <option value="todos">Todos</option>
                <option value="pendientes">💰 Con saldo pendiente</option>
                <option value="parciales">⏳ Pago parcial</option>
                <option value="pagados">✅ Pagados</option>
              </select>
            </div>

            <div className="border border-emerald-100 rounded-xl max-h-72 overflow-y-auto divide-y divide-emerald-50">
              {destinatarios.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">No hay destinatarios con este filtro</p>
              ) : destinatarios.map(p => {
                const telOk = !!normalizarTelefono(p.telefono);
                const montoPend = obtenerMontoPendiente(p);
                return (
                  <label key={p.id} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-emerald-50/60 ${seleccionados[p.id] ? "bg-emerald-50" : ""}`}>
                    <input type="checkbox" checked={!!seleccionados[p.id]} onChange={() => toggleSeleccion(p.id)} className="w-4 h-4 accent-emerald-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{aTexto(p.nombre) || aTexto(p.nombre_completo) || "Sin nombre"}</p>
                      <p className="text-[10px] text-gray-500">
                        {p._tipo} · {aTexto(p.telefono) || "sin teléfono"}
                        {montoPend > 0 ? (
                          <span className="text-red-600 font-semibold"> · Debe {moneda} {fmtSeguro(montoPend)}</span>
                        ) : (
                          <span className="text-green-600 font-semibold"> · ✅ Pagado</span>
                        )}
                      </p>
                    </div>
                    {!telOk && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-600">
              <span><strong>{seleccionadosLista.length}</strong> seleccionados</span>
              {telefonosInvalidos.length > 0 && (
                <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {telefonosInvalidos.length} sin teléfono válido</span>
              )}
            </div>
          </div>
        </div>

        {/* ═══ COLUMNA 2: MENSAJE ═══ */}
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-emerald-100 bg-emerald-50/50">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-emerald-700" /> 2. Mensaje ({moneda})
            </h2>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {PLANTILLAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => aplicarPlantilla(p.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition ${
                    plantillaId === p.id ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:bg-emerald-50"
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>

            {texto.includes("{mensaje}") && (
              <div>
                <label className="text-[11px] font-medium text-gray-700 mb-1 block">📢 Escribe la información del retiro:</label>
                <textarea
                  value={mensajeExtra}
                  onChange={e => setMensajeExtra(e.target.value)}
                  rows="2"
                  className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-300"
                  placeholder="Ej: El retiro inicia el viernes a las 5:00 PM. Llevar ropa cómoda y biblia..."
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium text-gray-700 mb-1 block">✏️ Mensaje (editable):</label>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                rows="6"
                className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-300 font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Variables: {"{nombre} {monto_pendiente} {monto_abonado} {parroquia} {mesa} {mensaje}"}
              </p>
            </div>

            {seleccionadosLista.length > 0 && seleccionadosLista[0] && (
              <div className="bg-[#e7ffd9] rounded-xl p-3 border border-green-200 shadow-xs">
                <p className="text-[10px] text-green-800 font-semibold mb-1 flex items-center gap-1">
                  <WhatsAppLogo className="w-3.5 h-3.5 text-green-600" /> Vista previa ({aTexto(seleccionadosLista[0].nombre) || "Sin nombre"}):
                </p>
                <p className="text-xs text-gray-800 whitespace-pre-wrap">
                  {reemplazarVariables(texto, seleccionadosLista[0], mensajeExtra, moneda, obtenerMontoPendiente)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={iniciarColaManual}
                disabled={seleccionadosLista.length === 0}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold disabled:opacity-40 shadow transition"
              >
                <WhatsAppLogo className="w-4 h-4" /> Envío Manual (wa.me)
              </button>
              <button
                onClick={enviarTodosApi}
                disabled={seleccionadosLista.length === 0 || enviando}
                className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold disabled:opacity-40 shadow transition"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Envío Automático (API)
              </button>
            </div>
            <p className="text-[10px] text-gray-500">
              💡 <strong>Manual:</strong> abre WhatsApp con el mensaje listo, tú presionas enviar (gratis). · <strong>API:</strong> envío masivo automático desde tu número exclusivo.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ MODAL COLA MANUAL ═══ */}
      {cola && itemActual && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-emerald-600 text-white px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <WhatsAppLogo className="w-4 h-4" /> Envío manual · {cola.idx + 1} de {cola.items.length}
              </h3>
              <button onClick={() => setCola(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="h-1.5 bg-emerald-100">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(cola.idx / cola.items.length) * 100}%` }} />
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{itemActual.nombre}</p>
                  <p className="text-[11px] text-gray-500">{itemActual.tipo} · +{itemActual.telefono}</p>
                </div>
              </div>
              <div className="bg-[#e7ffd9] rounded-xl p-3 border border-green-200 max-h-48 overflow-y-auto">
                <p className="text-xs text-gray-800 whitespace-pre-wrap">{itemActual.mensaje}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={avanzarCola} className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  Omitir →
                </button>
                <button onClick={abrirWhatsAppActual} className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow">
                  <WhatsAppLogo className="w-4 h-4" /> Abrir WhatsApp ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONFIG API ═══ */}
      {mostrarConfigApi && (
        <ConfigApiModal
          configInicial={apiConfig}
          onCerrar={() => setMostrarConfigApi(false)}
          onGuardar={guardarApiConfig}
          onProbar={probarApi}
          probando={probandoApi}
          moneda={moneda}
        />
      )}

      {/* ═══ MODAL HISTORIAL ═══ */}
      {mostrarHistorial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-emerald-600 text-white px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2"><History className="w-4 h-4" /> Historial de envíos</h3>
              <button onClick={() => setMostrarHistorial(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {historial.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-10">Aún no has enviado mensajes</p>
              ) : historial.map((h, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold text-gray-800">{h.nombre}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${aTexto(h.modo).includes("API") ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>{h.modo}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">{new Date(h.fecha).toLocaleString("es-DO")} · +{h.telefono}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODAL DE CONFIGURACIÓN DE API WHATSAPP
// ═══════════════════════════════════════════════════════════════
function ConfigApiModal({ configInicial, onCerrar, onGuardar, onProbar, probando, moneda }) {
  const [token, setToken] = useState(configInicial?.token || "");
  const [phoneNumberId, setPhoneNumberId] = useState(configInicial?.phoneNumberId || "");
  const [telefonoPrueba, setTelefonoPrueba] = useState(configInicial?.telefonoPrueba || "");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-blue-700 text-white px-5 py-3 flex justify-between items-center">
          <h3 className="font-bold text-sm flex items-center gap-2"><Settings2 className="w-4 h-4" /> Conectar WhatsApp Business API ({moneda})</h3>
          <button onClick={onCerrar}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800 space-y-1">
            <p className="font-bold">📋 Pasos para obtener tus credenciales:</p>
            <p>1. Compra un número nuevo (SIM o Twilio) exclusivo para la app.</p>
            <p>2. En <strong>developers.facebook.com</strong> crea una app con WhatsApp Cloud API.</p>
            <p>3. Registra el número en el WhatsApp Manager.</p>
            <p>4. Copia aquí el <strong>Token de acceso permanente</strong> y el <strong>Phone Number ID</strong>.</p>
            <p>5. Aprueba plantillas en Meta para mensajes masivos.</p>
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-700 mb-1 block">Token de acceso (Bearer)</label>
            <textarea value={token} onChange={e => setToken(e.target.value.trim())} rows="2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[11px] font-mono" placeholder="EAAG..." />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-700 mb-1 block">Phone Number ID</label>
            <input value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value.trim())} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono" placeholder="1055XXXXXXXXX" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-700 mb-1 block">Tu número para prueba (con código de país)</label>
            <input value={telefonoPrueba} onChange={e => setTelefonoPrueba(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs" placeholder="18095550000" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onProbar({ token, phoneNumberId, telefonoPrueba })}
              disabled={probando || !token || !phoneNumberId || !telefonoPrueba}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-40 shadow transition"
            >
              {probando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Probar
            </button>
            <button
              onClick={() => onGuardar({ token, phoneNumberId, telefonoPrueba })}
              disabled={!token || !phoneNumberId}
              className="px-3 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-40 shadow transition"
            >
              Guardar conexión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
