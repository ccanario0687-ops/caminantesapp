import { useEffect, useState, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import BackArrow from "@/components/BackArrow";
import { ArrowLeft, Printer, Users, Heart, Tag, BookOpen, FileText, Bed, Briefcase, Settings2, X, Wifi, WifiOff, Eye, LayoutGrid, PenLine, Layers, CheckCircle2, Filter } from "lucide-react";
import ConfiguracionImpresiones, { DEFAULTS_ESTILOS, DEFAULTS_POR_TIPO, calcCeldaMm, cargarEstilosBlindados } from "@/components/impresiones/ConfiguracionImpresiones";
import EditorBorradorGafete, { GafeteBorrador } from "@/components/impresiones/EditorBorradorGafete";
import EditorBorradorCarta, { CartaBorrador } from "@/components/impresiones/EditorBorradorCarta";
import ModalSeleccionImpresion from "@/components/impresiones/ModalSeleccionImpresion";
import ModalPersonalizacionDocumento from "@/components/impresiones/ModalPersonalizacionDocumento";
import KitCompletoImpresionModal from "@/components/impresiones/KitCompletoImpresionModal";
import ModalStickersMaletaAdhesivos from "@/components/impresiones/ModalStickersMaletaAdhesivos";
import useOffline from "@/hooks/useOffline";
import { useAuth } from "@/lib/AuthContext";
import { useComunidad } from "@/lib/ComunidadContext";

const APP_CREATOR_EMAIL = "ccanario0687@gmail.com";

// Convierte "edicion" (texto como "9no Retiro...") en un número válido
const parsearNumeroRetiro = (ed) => {
  if (ed == null || ed === "") return "";
  const m = String(ed).match(/\d+/);
  return m ? m[0] : "";
};

const esPersonaPagada = (p) => {
  if (!p) return false;
  const pagoFicha = String(p.pago_ficha || "").toLowerCase();
  const estadoPago = String(p.estado_pago || "").toLowerCase();
  const pago = String(p.pago || "").toLowerCase();
  const statusPago = String(p.status_pago || "").toLowerCase();
  const estado = String(p.estado || "").toLowerCase();
  const estatus = String(p.estatus || "").toLowerCase();

  return (
    pagoFicha === "pagado" || 
    estadoPago === "pagado" || 
    pago === "pagado" || 
    statusPago === "pagado" || 
    estado === "pagado" ||
    estado === "confirmado" ||
    estatus === "confirmado" ||
    p.confirmado === true ||
    (p.monto_pendiente !== undefined && p.monto_pendiente !== null && Number(p.monto_pendiente) <= 0 && Number(p.monto_abonado || 0) > 0) ||
    (p.monto_abonado !== undefined && Number(p.monto_abonado) > 0 && Number(p.monto_pendiente || 0) <= 0)
  );
};

const TIPOS_IMPRESION = [
  { id: "gafete",         label: "Gafete",             icon: Tag },
  { id: "gafete_maleta",  label: "Gafete Maleta",       icon: Briefcase },
  { id: "gafete_carpeta", label: "Gafete Carpeta",      icon: BookOpen },
  { id: "gafete_cama",    label: "Gafete Cama",         icon: Bed },
  { id: "carta",          label: "Carta",               icon: FileText },
  { id: "ficha",          label: "Carta de Invitación", icon: FileText },
  { id: "formulario",     label: "Formulario Inscripción", icon: FileText },
];

export default function Impresiones() {
  const { user: currentUser } = useAuth();
  const { comunidadActual } = useComunidad();
  
  const esCreadorReal = Boolean(
    currentUser?.email === APP_CREATOR_EMAIL || currentUser?.es_creador === true
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
  }, [comunidadActual, currentUser, esCreadorReal]);

  const [seccion, setSeccion] = useState("caminantes");
  const [tipoActivo, setTipoActivo] = useState("gafete");
  const [disenioAbierto, setDisenioAbierto] = useState(false);
  const { records: caminantesOffline, loading: loadingCams, online: onlineCams } = useOffline("Caminante");
  const { records: servidoresOffline, loading: loadingServs, online: onlineServs } = useOffline("Servidor");

  const [caminantesDirectos, setCaminantesDirectos] = useState([]);
  const [servidoresDirectos, setServidoresDirectos] = useState([]);
  const [filtroPago, setFiltroPago] = useState("pagados"); // "pagados" | "todos"

  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroRetiro, setFiltroRetiro] = useState("");
  const [filtroEquipo, setFiltroEquipo] = useState("");
  const [retiros, setRetiros] = useState([]);
  const [estilosPorTipo, setEstilosPorTipo] = useState({});
  const [previstaPersona, setVistaPreviaPersona] = useState(null);
  const [vistaPagina, setVistaPagina] = useState(false);
  const [editorBorradorAbierto, setEditorBorradorAbierto] = useState(false);
  const [modalSeleccion, setModalSeleccion] = useState(false);
  const [modalPersonalizacion, setModalPersonalizacion] = useState(false);
  const [modalKitCompleto, setModalKitCompleto] = useState(false);
  const [modalStickersMaleta, setModalStickersMaleta] = useState(false);
  const [personasParaImprimir, setPersonasParaImprimir] = useState(null);

  const online = onlineCams && onlineServs;

  useEffect(() => {
    Promise.all([
      base44.entities.Caminante?.list?.("-created_date").catch(() => []) || Promise.resolve([]),
      base44.entities.Servidor?.list?.("-created_date").catch(() => []) || Promise.resolve([]),
      base44.entities.Servidores?.list?.("-created_date").catch(() => []) || Promise.resolve([]),
      base44.entities.InscripcionRemota?.list?.("-created_date").catch(() => []) || Promise.resolve([]),
    ]).then(([rCams, rServ1, rServ2, rRemotas]) => {
      // 1. Caminantes
      let camsRaw = [];
      if (Array.isArray(rCams)) camsRaw.push(...rCams);
      if (Array.isArray(rRemotas)) {
        const soloCamsRemotos = rRemotas.filter(c => {
          const est = String(c.estado || "").toLowerCase();
          const esAprob = est === "aprobado" || est === "confirmado" || est === "completado";
          const tipoStr = String(c.tipo || c.tipo_registro || "").toLowerCase();
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
        if (!mapaCams.has(key)) mapaCams.set(key, c);
      });
      setCaminantesDirectos(Array.from(mapaCams.values()).filter(coincideComunidad));

      // 2. Servidores
      let servsRaw = [];
      if (Array.isArray(rServ1)) servsRaw.push(...rServ1);
      if (Array.isArray(rServ2)) servsRaw.push(...rServ2);
      if (Array.isArray(rCams)) {
        const soloServs = rCams.filter(c => 
          String(c.tipo || "").toLowerCase() === "servidor" || 
          String(c.tipo_registro || "").toLowerCase() === "servidor" ||
          c.es_servidor === true ||
          Boolean(c.lugares_servido || c.rol_servidor)
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
        const key = cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(s.id || s._id || Math.random()));
        if (!mapaServs.has(key)) mapaServs.set(key, s);
      });
      setServidoresDirectos(Array.from(mapaServs.values()).filter(coincideComunidad));
    }).catch(err => console.warn("Error cargando unificados en impresiones:", err));
  }, [coincideComunidad]);

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs.length > 0) {
        setConfig(cfgs[0]);
        setConfigId(cfgs[0].id);
        setFiltroRetiro(parsearNumeroRetiro(cfgs[0].edicion));
        const blindados = cargarEstilosBlindados(cfgs[0].estilos_impresion);
        setEstilosPorTipo(blindados);
      } else {
        setEstilosPorTipo(cargarEstilosBlindados());
      }
    }).catch(() => {
      setEstilosPorTipo(cargarEstilosBlindados());
    });
  }, []);

  useEffect(() => {
    if (!loadingCams && !loadingServs) {
      setLoading(false);
    }
  }, [loadingCams, loadingServs]);

  const getEstilos = (tipo) => ({ ...DEFAULTS_ESTILOS, ...(DEFAULTS_POR_TIPO[tipo] || {}), ...estilosPorTipo[tipo] });

  const todosCaminantesUnificados = useMemo(() => {
    const mapa = new Map();
    [...caminantesDirectos, ...(caminantesOffline || [])].forEach(c => {
      if (!c) return;
      const cleanCed = c.cedula ? String(c.cedula).replace(/\D/g, "") : "";
      const cleanTel = c.telefono ? String(c.telefono).replace(/\D/g, "") : "";
      const cleanNom = c.nombre ? String(c.nombre).trim().toLowerCase() : "";
      const key = cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(c.id || c._id || Math.random()));
      if (!mapa.has(key)) mapa.set(key, c);
    });
    return Array.from(mapa.values()).filter(coincideComunidad);
  }, [caminantesDirectos, caminantesOffline, coincideComunidad]);

  const todosServidoresUnificados = useMemo(() => {
    const mapa = new Map();
    [...servidoresDirectos, ...(servidoresOffline || [])].forEach(s => {
      if (!s) return;
      const cleanCed = s.cedula ? String(s.cedula).replace(/\D/g, "") : "";
      const cleanTel = s.telefono ? String(s.telefono).replace(/\D/g, "") : "";
      const cleanNom = s.nombre ? String(s.nombre).trim().toLowerCase() : "";
      const key = cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(s.id || s._id || Math.random()));
      if (!mapa.has(key)) mapa.set(key, s);
    });
    return Array.from(mapa.values()).filter(coincideComunidad);
  }, [servidoresDirectos, servidoresOffline, coincideComunidad]);

  const equiposDisponibles = seccion === "servidores"
    ? [...new Set(todosServidoresUnificados.map(s => s.equipo_trabajo).filter(Boolean))].sort()
    : [];

  const personas = tipoActivo === "formulario"
    ? Array.from({ length: config?.total_fichas || 0 }, (_, i) => ({ id: `ficha-${i + 1}`, numero_ficha: i + 1, nombre: "" }))
    : seccion === "caminantes"
      ? todosCaminantesUnificados
          .filter(c => {
            if (filtroPago === "pagados" && !esPersonaPagada(c)) return false;
            if (filtroRetiro !== "" && c.numero_retiro && String(c.numero_retiro) !== String(filtroRetiro)) return false;
            return true;
          })
          .map((c, idx) => ({ ...c, _indexCaminante: idx + 1 }))
      : todosServidoresUnificados
          .filter(s => {
            if (filtroPago === "pagados" && !esPersonaPagada(s)) return false;
            if (filtroRetiro !== "" && s.numero_retiro && String(s.numero_retiro) !== String(filtroRetiro)) return false;
            if (filtroEquipo && s.equipo_trabajo !== filtroEquipo) return false;
            return true;
          })
          .map((s, idx) => ({ ...s, _indexServidor: idx + 1, _esServidor: true }));

  const estilosActivos = getEstilos(tipoActivo);
  const nombreRetiro = estilosActivos.nombreRetiroPersonalizado || config?.nombre_retiro || "Retiro de Emaús";
  const edicion = config?.edicion ? `Edición #${config.edicion}` : "";
  const DEFAULT_LOGO_EMAUS = "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/28de3e4eb_logoemauscircular.png";
  const logoUrl = config?.logo_url || config?.logo_hombres_url || config?.logo_mujeres_url || DEFAULT_LOGO_EMAUS;

  const handleSeleccionarTipo = (id) => {
    if (tipoActivo === id) {
      setDisenioAbierto(prev => !prev);
    } else {
      setTipoActivo(id);
      setDisenioAbierto(false);
    }
  };

  const handleGuardadoDiseno = (tipo, nuevosEstilos) => {
    let currentEstilos = {};
    if (config?.estilos_impresion) {
      try { currentEstilos = JSON.parse(config.estilos_impresion); } catch {}
    }
    currentEstilos[tipo] = nuevosEstilos;
    const updatedStr = JSON.stringify(currentEstilos);
    const homologados = cargarEstilosBlindados(updatedStr);

    setEstilosPorTipo(homologados);
    setConfig(prev => prev ? { ...prev, estilos_impresion: JSON.stringify(homologados) } : prev);

    try {
      localStorage.setItem("emaus_estilos_impresion_v2", JSON.stringify(homologados));
    } catch {}
  };

  const handleAbrirImprimir = () => {
    if (tipoActivo === "formulario") {
      handleConfirmarImpresion(personas);
    } else {
      setModalSeleccion(true);
    }
  };

  const handleConfirmarImpresion = (lista) => {
    setPersonasParaImprimir(lista);
    setTimeout(() => { window.print(); setPersonasParaImprimir(null); }, 80);
  };

  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-amber-600">Cargando...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50 print:bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-600 text-white px-6 py-6 shadow-lg print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackArrow />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Impresiones</h1>
                {online ? (
                  <span className="flex items-center gap-1 text-xs text-green-300 bg-green-800/40 px-2 py-0.5 rounded-full">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-800/40 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-3 h-3" /> Offline
                  </span>
                )}
              </div>
              <p className="text-amber-200 text-sm">Genera e imprime gafetes, cartas y fichas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setModalPersonalizacion(true);
              }}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow"
            >
              <Settings2 className="w-4 h-4 text-amber-200" />
              Personalizar {TIPOS_IMPRESION.find(t => t.id === tipoActivo)?.label}
              {estilosPorTipo[tipoActivo]?.usarBorrador && <span className="ml-1 w-2 h-2 bg-green-400 rounded-full" title="Borrador activo" />}
            </button>
            <button
              onClick={() => setModalKitCompleto(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-800 to-amber-900 hover:from-amber-900 hover:to-amber-950 text-white px-4 py-2 rounded-xl text-sm font-black transition-colors shadow-lg border border-amber-600 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-amber-300" />
              📦 Kit Completo (1-Clic)
            </button>
            <button
              onClick={() => setModalStickersMaleta(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-4 py-2 rounded-xl text-sm font-black transition-colors shadow-lg border border-emerald-500 cursor-pointer"
            >
              <Tag className="w-4 h-4 text-emerald-300" />
              🏷️ Stickers Adhesivos (PDF)
            </button>
            <button
              onClick={() => setVistaPagina(true)}
              className="flex items-center gap-2 bg-amber-100 text-amber-800 hover:bg-amber-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow"
            >
              <LayoutGrid className="w-4 h-4" />
              Vista Previa Página
            </button>
            <button
              onClick={handleAbrirImprimir}
              className="flex items-center gap-2 bg-white text-amber-800 hover:bg-amber-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow"
            >
              <Printer className="w-4 h-4" />
              Imprimir Por Tipo
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 print:px-0 print:py-0">
        <div className="print:hidden space-y-5">

          {/* Selector Caminantes / Servidores */}
          <div className="flex gap-3">
            {["caminantes", "servidores"].map(s => (
              <button key={s} onClick={() => setSeccion(s)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm border-2 ${
                  seccion === s ? "bg-amber-700 text-white border-amber-700" : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                }`}>
                {s === "caminantes" ? <Users className="w-5 h-5" /> : <Heart className="w-5 h-5" />}
                {s === "caminantes" ? "Impresión Caminantes" : "Impresión Servidores"}
              </button>
            ))}
          </div>

          {/* Conteo y Selector de Estado de Pago */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-amber-100/70 p-3 rounded-xl border border-amber-200">
            <span className="text-sm text-amber-950 font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-700" />
              {tipoActivo === "formulario"
                ? `${personas.length} formulario(s) (según total de fichas)`
                : `${personas.length} ${seccion === "caminantes" ? "caminante(s)" : "servidor(es)"} listos para imprimir`}
            </span>

            {tipoActivo !== "formulario" && (
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-amber-300">
                <button
                  onClick={() => setFiltroPago("pagados")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    filtroPago === "pagados" 
                      ? "bg-green-700 text-white shadow-xs" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> 🟢 Pagados / Confirmados
                </button>
                <button
                  onClick={() => setFiltroPago("todos")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    filtroPago === "todos" 
                      ? "bg-amber-800 text-white shadow-xs" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> 📋 Todos los Registrados
                </button>
              </div>
            )}
          </div>

          {/* Filtro por equipo (solo servidores) */}
          {seccion === "servidores" && equiposDisponibles.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-amber-700 font-semibold">Filtrar por equipo:</span>
              <select
                value={filtroEquipo}
                onChange={e => setFiltroEquipo(e.target.value)}
                className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
              >
                <option value="">Todos los equipos</option>
                {equiposDisponibles.map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
              {filtroEquipo && (
                <button
                  onClick={() => setFiltroEquipo("")}
                  className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
                >
                  <X className="w-3.5 h-3.5" /> Quitar filtro
                </button>
              )}
            </div>
          )}

          {/* Tipos de impresión */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Selecciona un documento para previsualizarlo o personalizar su diseño:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {TIPOS_IMPRESION.map(tipo => {
                const Icon = tipo.icon;
                const activo = tipoActivo === tipo.id;
                return (
                  <div key={tipo.id} className="relative group">
                    <button 
                      onClick={() => setTipoActivo(tipo.id)}
                      className={`w-full h-full flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 text-center transition-all ${
                        activo
                          ? "bg-amber-700 text-white border-amber-700 shadow-md"
                          : "bg-white text-amber-800 border-amber-200 hover:border-amber-400 hover:bg-amber-50"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-semibold leading-tight">{tipo.label}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTipoActivo(tipo.id);
                        setModalPersonalizacion(true);
                      }}
                      className={`absolute -top-1.5 -right-1.5 p-1 rounded-full border shadow transition-transform hover:scale-110 ${
                        activo 
                          ? "bg-white text-amber-800 border-amber-400" 
                          : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                      }`}
                      title={`Personalizar ${tipo.label}`}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón de acceso al modal de personalización del documento activo */}
          <div className="bg-amber-100/70 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <Settings2 className="w-5 h-5 text-amber-800" />
              <div>
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Documento Activo:</span>
                <span className="ml-2 text-sm font-bold text-amber-950">{TIPOS_IMPRESION.find(t => t.id === tipoActivo)?.label}</span>
                {estilosPorTipo[tipoActivo]?.usarBorrador && (
                  <span className="ml-2 text-[10px] bg-green-800 text-green-100 px-2 py-0.5 rounded-full font-semibold">
                    ✓ Borrador Personalizado Activo
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setModalPersonalizacion(true)}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow"
            >
              <PenLine className="w-3.5 h-3.5" />
              Abrir Modal de Personalización & Ajustes
            </button>
          </div>

          {/* Vista previa del documento seleccionado */}
          <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4">
            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-4">
              Vista previa — {TIPOS_IMPRESION.find(t => t.id === tipoActivo)?.label}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {personas.slice(0, 4).map(p => (
                <div key={p.id} className="relative group">
                  <VistaPrevia persona={p} tipo={tipoActivo}
                    nombreRetiro={nombreRetiro} edicion={edicion} logoUrl={logoUrl}
                    config={config}
                    esServidor={seccion === "servidores"} estilos={estilosActivos} />
                  <button
                    onClick={() => setVistaPreviaPersona(p)}
                    className="absolute top-2 right-2 bg-amber-700 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    title="Vista previa ampliada"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            {personas.length > 4 && (
              <p className="text-center text-xs text-gray-400 mt-4">
                Mostrando 4 de {personas.length}. Al imprimir se generarán todos.
              </p>
            )}
          </div>
        </div>

        {/* Modal Vista Previa */}
        {previstaPersona && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden" onClick={() => setVistaPreviaPersona(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">
                  Vista Previa — {TIPOS_IMPRESION.find(t => t.id === tipoActivo)?.label}
                </h3>
                <button onClick={() => setVistaPreviaPersona(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-center">
                <VistaPrevia persona={previstaPersona} tipo={tipoActivo}
                  nombreRetiro={nombreRetiro} edicion={edicion} logoUrl={logoUrl}
                  config={config} esServidor={seccion === "servidores"} estilos={estilosActivos} />
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">{previstaPersona.nombre}</p>
            </div>
          </div>
        )}

        {/* Modal Vista Previa Página A4 */}
        {vistaPagina && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 print:hidden overflow-auto" onClick={() => setVistaPagina(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Vista Previa de Página — {TIPOS_IMPRESION.find(t => t.id === tipoActivo)?.label}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {Number(estilosActivos.columnas) || 2} col × {Number(estilosActivos.filas) || 4} fil = {(Number(estilosActivos.columnas)||2)*(Number(estilosActivos.filas)||4)} por página · {personas.length} total
                  </p>
                </div>
                <button onClick={() => setVistaPagina(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="overflow-auto p-4 flex-1">
                {/* Simulación de página A4 escalada */}
                <div style={{ width: "210mm", background: "white", margin: "0 auto", padding: "8mm", boxShadow: "0 4px 24px #0003", transform: "scale(0.6)", transformOrigin: "top center", minHeight: "297mm" }}>
                  <GrillaImpresion
                    personas={personas.slice(0, (Number(estilosActivos.columnas)||2)*(Number(estilosActivos.filas)||4))}
                    tipo={tipoActivo}
                    nombreRetiro={nombreRetiro} edicion={edicion} logoUrl={logoUrl}
                    config={config} esServidor={seccion === "servidores"} estilos={estilosActivos}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vista de impresión */}
        <div className="hidden print:block print-area">
          <GrillaImpresion
            personas={personasParaImprimir ?? personas} tipo={tipoActivo}
            nombreRetiro={nombreRetiro} edicion={edicion} logoUrl={logoUrl}
            config={config} esServidor={seccion === "servidores"} estilos={estilosActivos}
          />
        </div>
      </div>

      {/* Modal selección de personas */}
      {modalSeleccion && (
        <ModalSeleccionImpresion
          personas={personas}
          seccion={seccion}
          onImprimir={handleConfirmarImpresion}
          onClose={() => setModalSeleccion(false)}
        />
      )}

      {/* Modal Personalización Documento (Propio para cada gafete/carta) */}
      {modalPersonalizacion && (
        <ModalPersonalizacionDocumento
          tipoDoc={tipoActivo}
          config={config}
          configId={configId}
          estilosIniciales={estilosPorTipo[tipoActivo] || {}}
          onGuardado={handleGuardadoDiseno}
          onCerrar={() => setModalPersonalizacion(false)}
          personaEjemplo={personas[0]}
        />
      )}

      {/* Modal Kit Impreso Consolidado en 1 Clic */}
      {modalKitCompleto && (
        <KitCompletoImpresionModal
          personas={personas}
          esServidor={seccion === "servidores"}
          config={config}
          onClose={() => setModalKitCompleto(false)}
        />
      )}

      {/* Modal Stickers Adhesivos de Maleta con QR (PDF Masivo) */}
      <ModalStickersMaletaAdhesivos
        abierto={modalStickersMaleta}
        onClose={() => setModalStickersMaleta(false)}
        configRetiro={config}
      />

      <style>{`
        @media print {
          @page { size: auto; margin: ${estilosActivos.margenArriba ?? estilosActivos.margenImpresion ?? 8}mm ${estilosActivos.margenDerecha ?? estilosActivos.margenImpresion ?? 8}mm ${estilosActivos.margenAbajo ?? estilosActivos.margenImpresion ?? 8}mm ${estilosActivos.margenIzquierda ?? estilosActivos.margenImpresion ?? 8}mm; }

          body * { visibility: hidden; }
          .print-area, .print-area *, .area-impresion-kit-completo, .area-impresion-kit-completo *, .area-impresion-stickers, .area-impresion-stickers * { visibility: visible !important; }
          .print-area, .area-impresion-kit-completo, .area-impresion-stickers {
            position: absolute !important;
            top: 0; left: 0;
            width: 100%;
            background: white !important;
          }

          body { margin: 0 !important; padding: 0 !important; background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// GrillaImpresion — genera las páginas para imprimir usando columnas/filas de estilos
// ──────────────────────────────────────────────────────────
function GrillaImpresion({ personas, tipo, nombreRetiro, edicion, logoUrl, config, esServidor, estilos }) {
  if (tipo === "carta" || tipo === "ficha" || tipo === "formulario") {
    return personas.map(p => (
      <ImpresionItem key={p.id} persona={p} tipo={tipo}
        nombreRetiro={nombreRetiro} edicion={edicion} logoUrl={logoUrl}
        config={config} esServidor={esServidor} estilos={estilos} />
    ));
  }

  const cols = Number(estilos.columnas) || (DEFAULTS_POR_TIPO[tipo]?.columnas || 2);
  const rows = Number(estilos.filas) || (DEFAULTS_POR_TIPO[tipo]?.filas || 4);
  const porPagina = cols * rows;
  const celdaAuto = calcCeldaMm(cols, rows);
  const celda = estilos.tamanoManual && estilos.celdaAnchoMm
    ? { ancho: estilos.celdaAnchoMm, alto: estilos.celdaAltoMm || celdaAuto.alto }
    : celdaAuto;
  const anchoPag = cols * celda.ancho + (cols - 1);

  // Gafete maleta: duplicar cada persona (2 etiquetas por persona)
  const lista = tipo === "gafete_maleta"
    ? personas.flatMap(p => [p, p])
    : personas;

  const paginas = Math.ceil(lista.length / porPagina);

  return Array.from({ length: paginas }, (_, pageIdx) => (
    <div key={pageIdx} style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, ${celda.ancho}mm)`,
      gridTemplateRows: `repeat(${rows}, ${celda.alto}mm)`,
      gap: "1mm",
      width: `${anchoPag}mm`,
      margin: "0 auto",
      pageBreakAfter: pageIdx < paginas - 1 ? "always" : "auto",
    }}>
      {lista.slice(pageIdx * porPagina, pageIdx * porPagina + porPagina).map((p, i) => (
        <ImpresionItem key={`${p.id}-${i}`} persona={p} tipo={tipo}
          nombreRetiro={nombreRetiro} edicion={edicion} logoUrl={logoUrl}
          config={config} esServidor={esServidor} estilos={estilos}
          celdaAncho={celda.ancho} celdaAlto={celda.alto} />
      ))}
    </div>
  ));
}

// ──────────────────────────────────────────────────────────
function VistaPrevia({ persona, tipo, nombreRetiro, edicion, logoUrl, esServidor, estilos, config }) {
  const props = { persona, nombreRetiro, edicion, logoUrl, esServidor, estilos, config };
  if (tipo.startsWith("gafete") && estilos.usarBorrador && estilos.borrador?.length > 0) {
    return <GafeteBorrador persona={persona} config={config} bloques={estilos.borrador} />;
  }
  if ((tipo === "carta" || tipo === "ficha") && estilos.usarBorrador && estilos.borrador?.length > 0) {
    return <CartaBorrador persona={persona} config={config} bloques={estilos.borrador} />;
  }
  const mapa = {
    gafete: <GafeteCard {...props} />,
    gafete_maleta: <GafeteMaletaCard persona={persona} logoUrl={logoUrl} nombreRetiro={nombreRetiro} edicion={edicion} estilos={estilos} print={false} />,
    gafete_carpeta: <GafeteCarpetaCard {...props} />,
    gafete_cama: <GafeteCamaCard {...props} />,
    carta: <CartaCard {...props} />,
    ficha: <FichaCard {...props} />,
    formulario: <FormularioInscripcionCard persona={persona} nombreRetiro={nombreRetiro} edicion={edicion} logoUrl={logoUrl} config={config} estilos={estilos} print={false} />,
  };
  return <div>{mapa[tipo] || null}</div>;
}

function ImpresionItem({ persona, tipo, nombreRetiro, edicion, logoUrl, esServidor, estilos, config, celdaAncho, celdaAlto }) {
  if (tipo.startsWith("gafete") && estilos.usarBorrador && estilos.borrador?.length > 0) {
    return (
      <div style={{ pageBreakInside: "avoid", overflow: "hidden" }}>
        <GafeteBorrador persona={persona} config={config} bloques={estilos.borrador} print celdaAncho={celdaAncho} celdaAlto={celdaAlto} />
      </div>
    );
  }
  if ((tipo === "carta" || tipo === "ficha") && estilos.usarBorrador && estilos.borrador?.length > 0) {
    return (
      <div style={{ pageBreakInside: "avoid" }}>
        <CartaBorrador persona={persona} config={config} bloques={estilos.borrador} print />
      </div>
    );
  }
  const props = { persona, nombreRetiro, edicion, logoUrl, esServidor, estilos, config, print: true, celdaAncho, celdaAlto };
  const mapa = {
    gafete: <GafeteCard {...props} />,
    gafete_maleta: <GafeteMaletaCard {...props} />,
    gafete_carpeta: <GafeteCarpetaCard {...props} />,
    gafete_cama: <GafeteCamaCard {...props} />,
    carta: <CartaCard {...props} />,
    ficha: <FichaCard {...props} />,
    formulario: <FormularioInscripcionCard persona={persona} nombreRetiro={nombreRetiro} edicion={edicion} logoUrl={logoUrl} config={config} estilos={estilos} print={true} />,
  };
  return <div style={{ pageBreakInside: "avoid", overflow: "hidden" }}>{mapa[tipo] || null}</div>;
}

// ──────────────────────────────────────────────────────────
// FORMULARIO DE INSCRIPCIÓN (blanco, numerado por ficha)
// El total generado siempre se basa en la cantidad de fichas (config.total_fichas)
// ──────────────────────────────────────────────────────────
function FormularioInscripcionCard({ persona, nombreRetiro, edicion, logoUrl, config, estilos, print }) {
  const e = estilos;
  const azul = e.esloganColor || "#00008B";
  const font = e.fontFamily || "'Times New Roman', serif";

  const diocesis = e.diocesis || config?.provincia || "Diócesis de San Francisco de Macorís";
  const parroquia = e.parroquiaFormulario || "";
  const fmt = (iso) => iso ? new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "";
  const fechas = e.fechasFormulario || (config?.fecha_inicio
    ? `${fmt(config.fecha_inicio)}${config?.fecha_fin ? ` - ${fmt(config.fecha_fin)}` : ""}` : "");
  const eslogan = e.eslogan || "";
  const parrafo = e.parrafoFormulario || "";

  const linea = (label, ancho) => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", flex: `0 0 ${ancho}`, minWidth: 0 }}>
      <span style={{ fontSize: "9px", fontWeight: 700, whiteSpace: "nowrap", color: "#111" }}>{label}:</span>
      <span style={{ flex: 1, borderBottom: "1px solid #333", height: "14px", minWidth: "18px" }}></span>
    </div>
  );
  const check = (label) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "9px", color: "#111" }}>
      <span style={{ display: "inline-block", width: "11px", height: "11px", border: "1px solid #333", borderRadius: "2px", flexShrink: 0 }}></span>
      {label}
    </span>
  );

  return (
    <div style={{
      border: "1.5px solid #444",
      borderRadius: "4px",
      background: "#fff",
      fontFamily: font,
      color: "#111",
      fontSize: "9px",
      lineHeight: 1.3,
      position: "relative",
      ...(print
        ? { margin: "0", padding: "10px 14px 12px", pageBreakInside: "avoid", pageBreakAfter: "always" }
        : { padding: "12px 16px", boxShadow: "0 2px 10px #0002" }),
    }}>
      {/* Ficha N° (esquina sup. derecha) */}
      <div style={{ position: "absolute", top: "8px", right: "14px", textAlign: "right" }}>
        <span style={{ fontWeight: 800, fontSize: "11px", color: "#111" }}>Ficha {persona.numero_ficha || ""}</span>
      </div>

      {/* Encabezado centrado */}
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        {logoUrl
          ? <img src={logoUrl} alt="" style={{ height: "34px", objectFit: "contain", margin: "0 auto 2px", display: "block" }} />
          : <div style={{ fontSize: "22px", lineHeight: 1 }}>✝</div>
        }
        <p style={{ margin: "1px 0 0", fontWeight: 800, fontSize: "12px" }}>{diocesis}</p>
        {parroquia && <p style={{ margin: "1px 0 0", fontWeight: 800, fontSize: "11px" }}>{parroquia}</p>}
        <p style={{ margin: "1px 0 0", fontStyle: "italic", fontSize: "11px" }}>{nombreRetiro}</p>
        {fechas && <p style={{ margin: "1px 0 0", fontSize: "9px" }}>{fechas}</p>}
        {eslogan && <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: "12px", color: azul, letterSpacing: "0.5px" }}>{eslogan}</p>}
      </div>

      {/* Campos */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: "6px" }}>
        {linea("Nombre", "63%")}
        {linea("Apodo", "35%")}
        {linea("Dirección", "100%")}
        {linea("Teléfono Res.", "49%")}
        {linea("Celular", "49%")}
        {linea("Cédula #", "30%")}
        {linea("E-Mail", "68%")}
      </div>

      {/* Estado civil */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", margin: "5px 0 3px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700 }}>Estado civil:</span>
        {["Casado", "Soltero", "Divorciado", "Concubinato"].map(c => <span key={c}>{check(c)}</span>)}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
        {linea("Ocupación", "49%")}
        {linea("Fecha de Nacimiento", "49%")}
        {linea("Parroquia a la que asiste", "100%")}
      </div>

      {/* Sacramentos */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", margin: "5px 0 3px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700 }}>¿Sacramentos que ha recibido?</span>
        {["Bautismo", "1era Comunión", "Confirmación", "Matrimonio"].map(c => <span key={c}>{check(c)}</span>)}
      </div>

      {/* Salud */}
      <div style={{ marginTop: "4px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700 }}>Problemas de salud, horario de medicamento, alergias y especificaciones de alimentación:</span>
        <div style={{ borderBottom: "1px solid #333", height: "14px", marginTop: "2px" }}></div>
        <div style={{ borderBottom: "1px solid #333", height: "14px", marginTop: "2px" }}></div>
      </div>

      {/* Talla */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", margin: "5px 0 4px" }}>
        <span style={{ fontSize: "9px", fontWeight: 700 }}>Talla de Poloshirt:</span>
        {["S", "M", "L", "XL", "XXL", "XXXL"].map(c => <span key={c}>{check(c)}</span>)}
      </div>

      {/* Contacto emergencia */}
      <p style={{ fontSize: "9px", fontWeight: 700, margin: "6px 0 2px" }}>Persona para contactar en caso de emergencias:</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
        {linea("Nombre", "50%")}
        {linea("Cel", "25%")}
        {linea("Relación", "23%")}
      </div>

      {/* Párrafo informativo editable */}
      {parrafo && (
        <p style={{ fontSize: "8.5px", lineHeight: 1.35, margin: "8px 0 0", textAlign: "justify" }}>
          {parrafo}
        </p>
      )}

      {/* Footer firmas */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: "10px" }}>
        {linea("Firma del Participante", "40%")}
        {linea("Invitado por", "34%")}
        {linea("Cel.", "24%")}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// GAFETE — formato PDF de referencia (2 col × 4 fila, A4)
// Tamaño de celda: 96.5mm × 69mm (A4 con 8mm márgenes, 2 col, 4 filas, gap 1mm)
// ──────────────────────────────────────────────────────────
function calcNombreFontSize(nombre, basePx) {
  const len = nombre.length;
  if (len <= 12) return basePx;
  if (len <= 18) return Math.round(basePx * 0.85);
  if (len <= 25) return Math.round(basePx * 0.72);
  return Math.round(basePx * 0.60);
}

export function GafeteCard({ persona, nombreRetiro, edicion, logoUrl, esServidor, estilos, config, print, celdaAncho, celdaAlto }) {
  const e = estilos;
  const eslogan = e.eslogan || config?.eslogan || "Caminando con fe y esperanza hacia el Resucitado";
  const lugar = e.direccion || config?.lugar || "";
  const fechas = (() => {
    if (!config?.fecha_inicio) return "";
    const fi = new Date(config.fecha_inicio + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    const ff = config.fecha_fin ? new Date(config.fecha_fin + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "";
    return ff ? `${fi} — ${ff}` : fi;
  })();
  const diocesis = e.diocesis || config?.provincia || "";
  const parroquias = e.parroquias || "";
  const versiculo = e.versiculo || "(LUCAS 24:13-35)";
  const headerBg = e.headerBgColor || "#78350f";
  const nombreColor = e.nombreColor || "#1e3a8a";
  const borderColor = e.borderColor || "#92400e";

  // Font size: usa el configurado, luego escala adaptativo
  const wMm = celdaAncho || 96.5;
  const hMm = celdaAlto || 69;
  const userSize = Number(e.nombreFontSize) || 16;
  // escala el tamaño configurado según la longitud del nombre
  const baseSize = print ? Math.max(userSize * 1.5, 24) : 24;
  const nombreSize = calcNombreFontSize(persona.nombre || "", baseSize);

  const esVertical = e.orientacion === "vertical" || (celdaAlto && celdaAncho && celdaAlto > celdaAncho);
  const borderWidth = e.borderWidth || 2;
  const textAlign = e.align || "center";
  const headerAlign = e.headerAlign || (esVertical ? "center" : "left");
  const lineHeight = e.lineHeight || 1.15;
  const borderRadius = e.borderRadius || (print ? "2" : "6");
  const equipoNombre = persona.equipo_trabajo || persona.equipo || persona.equipo_trabajo_nombre || "";
  const rolBase = persona.rol || persona.rol_servidor || persona.rol_en_mesa || (esServidor || persona._esServidor ? (e.textoRolDefault || "SERVIDOR DE EMAÚS") : "");
  const rolTextoDisplay = (esServidor || persona._esServidor || equipoNombre)
    ? (equipoNombre ? `${rolBase} · EQUIPO: ${equipoNombre}` : rolBase)
    : rolBase;

  return (
    <div style={{
      position: "relative",
      border: `${borderWidth}px solid ${borderColor}`,
      borderRadius: `${borderRadius}px`,
      background: e.bodyBgColor || "#fff",
      color: e.bodyTextColor || "#1c1917",
      fontFamily: e.fontFamily || "Arial, sans-serif",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      breakInside: "avoid",
      pageBreakInside: "avoid",
      boxSizing: "border-box",
      width: "100%",
      height: "100%",
      ...(print
        ? { maxWidth: `${wMm}mm`, maxHeight: `${hMm}mm` }
        : { boxShadow: "0 2px 10px #0002" }),
    }}>
      {/* IMAGEN DE FONDO PERSONALIZADA DESVANECIDA CON POSICIÓN Y ESCALA */}
      {e.mostrarImagenFondo !== false && e.imagenFondoUrl && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden"
        }}>
          <img 
            src={e.imagenFondoUrl} 
            alt="Fondo Gafete"
            style={{
              width: "100%",
              height: "100%",
              objectFit: e.imagenFondoAjuste || "cover",
              objectPosition: `${e.imagenFondoPosH ?? 50}% ${e.imagenFondoPosV ?? 50}%`,
              transform: `scale(${e.imagenFondoEscala ? e.imagenFondoEscala / 100 : 1})`,
              transformOrigin: `${e.imagenFondoPosH ?? 50}% ${e.imagenFondoPosV ?? 50}%`,
              opacity: Number(e.imagenFondoOpacidad ?? 0.2),
              mixBlendMode: "multiply",
              filter: "contrast(110%)",
              display: "block"
            }}
          />
        </div>
      )}

      {/* ENCABEZADO CON SOPORTE DE TEXTO BLANCO Y ALINEACIÓN */}
      <div style={{ 
        display: "flex", 
        flexDirection: esVertical ? "column" : "row",
        alignItems: "center", 
        gap: "4px", 
        padding: print ? (esVertical ? "4px 6px" : "5px 8px") : (esVertical ? "6px 8px" : "8px 10px"), 
        borderBottom: `1px solid ${borderColor}44`, 
        flexShrink: 0,
        background: headerBg,
        textAlign: headerAlign,
        justifyContent: headerAlign === "center" ? "center" : (headerAlign === "right" ? "flex-end" : "flex-start"),
        zIndex: 2,
        width: "100%",
        boxSizing: "border-box"
      }}>
        {e.mostrarLogo !== false && (
          logoUrl
            ? <img src={logoUrl} alt="" style={{ height: print ? (esVertical ? "38px" : "46px") : "44px", width: "auto", objectFit: "contain", flexShrink: 0 }} />
            : <div style={{ height: print ? "36px" : "44px", width: print ? "36px" : "44px", background: "#fef3c7", border: "1px dashed #92400e", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "20px" }}>✝</div>
        )}
        <div style={{ flex: 1, minWidth: 0, width: "100%", textAlign: headerAlign }}>
          {e.mostrarNombreRetiro !== false && (
            <p style={{
              margin: 0, fontWeight: "900",
              fontSize: print ? "10px" : "9.5px",
              textTransform: "uppercase",
              color: headerTextColor,
              letterSpacing: "0.3px",
              lineHeight: 1.15,
              wordBreak: "break-word",
            }}>
              {nombreRetiro}
            </p>
          )}
          {eslogan && (
            <p style={{ margin: "1px 0 0", fontSize: print ? "7px" : "6.5px", fontStyle: "italic", color: headerTextColor, opacity: 0.95, lineHeight: 1.15 }}>
              {eslogan}
            </p>
          )}
          {lugar && (
            <p style={{ margin: "1px 0 0", fontSize: print ? "6.5px" : "6px", color: headerTextColor, opacity: 0.85, lineHeight: 1.1 }}>{lugar}</p>
          )}
        </div>
      </div>

      {/* CUERPO — nombre y alineación configurable */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: print ? "4px 8px 5px" : "6px 10px 8px", minHeight: 0, zIndex: 2 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: textAlign === "center" ? "center" : (textAlign === "right" ? "flex-end" : "flex-start") }}>
          {versiculo && (
            <p style={{ margin: "0 0 2px", fontSize: print ? "7px" : "6.5px", color: "#555", alignSelf: "flex-start" }}>{versiculo}</p>
          )}
          <p style={{
            margin: `${e.nombreMarginTop || 0}px 0 ${e.nombreMarginBottom || 0}px`,
            fontSize: `${nombreSize}px`,
            fontWeight: "900",
            color: nombreColor,
            lineHeight: lineHeight,
            textTransform: "uppercase",
            textAlign: textAlign,
            wordBreak: "break-word",
            overflowWrap: "break-word",
            width: "100%",
          }}>
            {persona.nombre}
          </p>
          {e.mostrarRol !== false && rolTextoDisplay && (
            <p style={{ margin: "2px 0 0", fontSize: "8.5px", color: headerBg !== "#ffffff" ? headerBg : nombreColor, fontWeight: "900", textTransform: "uppercase" }}>
              {rolTextoDisplay}
            </p>
          )}
          {e.mostrarParroquia !== false && persona.parroquia && (
            <p style={{ margin: 0, fontSize: print ? "6.5px" : "6px", color: "#6b7280", textAlign: "center", lineHeight: 1.2 }}>
              {persona.parroquia}
            </p>
          )}
        </div>
      </div>

      {/* Número secuencial del servidor en la esquina inferior derecha (sin el signo #) */}
      {(esServidor || persona._esServidor || persona._indexServidor) && (
        <div style={{
          position: "absolute",
          bottom: print ? "2px" : "3px",
          right: print ? "4px" : "6px",
          fontSize: print ? "8px" : "9px",
          fontWeight: "900",
          color: "#4b5563",
          fontFamily: "monospace, sans-serif",
          lineHeight: 1,
          zIndex: 20,
          background: "rgba(255, 255, 255, 0.95)",
          padding: "1px 3.5px",
          borderRadius: "3px",
          border: "1px solid #d1d5db"
        }}>
          {persona._indexServidor || persona.numero_servidor || 1}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// GAFETE MALETA — Rediseño unificado e idéntico para Vista Previa e Impresión (96.5mm × 44mm)
// ──────────────────────────────────────────────────────────
export function GafeteMaletaCard({ persona, logoUrl, nombreRetiro, edicion, estilos: e = {}, print, celdaAncho, celdaAlto }) {
  const wMm = celdaAncho || e.celdaAnchoMm || 96.5;
  const hMm = celdaAlto || e.celdaAltoMm || 44;

  const headerBg = e.headerBgColor || "#b91c1c";
  const headerTextColor = e.headerTextColor || "#ffffff";
  const nombreColor = e.nombreColor || "#000000";
  const borderColor = e.borderColor || "#b91c1c";
  const bodyBg = e.bodyBgColor || "#ffffff";
  const fontFam = e.fontFamily || "Arial, sans-serif";

  const nombrePersona = (persona?.nombre || persona?.nombre_completo || "NOMBRE DEL CAMINANTE").toUpperCase();
  const habNum = persona?.numero_habitacion || persona?.habitacion || "7";
  const mesaNum = persona?.numero_mesa || persona?.mesa || "3";
  const edadText = persona?.edad ? `${persona.edad}` : "—";
  const tallaText = persona?.talla_camisa || persona?.talla || "—";
  const retHeader = nombreRetiro || e.nombreRetiroPersonalizado || "ENCABEZADO DEL RETIRO";
  const retSubheader = edicion ? `EDICIÓN #${edicion}` : "ENCABEZADO DEL RETIRO";

  return (
    <div
      style={{
        border: `1.5px solid ${borderColor}`,
        borderRadius: "4px",
        background: bodyBg,
        fontFamily: fontFam,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        position: "relative",
        margin: "0 auto",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        width: `${wMm}mm`,
        height: `${hMm}mm`
      }}
    >
      {/* Encabezado Rojo con Círculo Blanco */}
      <div
        style={{
          background: headerBg,
          color: headerTextColor,
          padding: "3px 8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          borderBottom: `1px solid ${borderColor}`,
          flexShrink: 0
        }}
      >
        <div style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: "1px solid #fee2e2"
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ width: "85%", height: "85%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: "9px", color: headerBg, fontWeight: "bold" }}>✝</span>
          )}
        </div>

        <div style={{ flex: 1, overflow: "hidden", textTransform: "uppercase" }}>
          <div style={{ fontSize: "8pt", fontWeight: "900", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.2px" }}>
            {retHeader}
          </div>
          <div style={{ fontSize: "5.5pt", opacity: 0.9, letterSpacing: "0.2px" }}>
            {retSubheader}
          </div>
        </div>
      </div>

      {/* Cuerpo Central con Ovalo Negro y Talón Derecho */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        
        {/* Lado Izquierdo (Cuerpo Principal) */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "4px 8px", gap: "6px", position: "relative" }}>
          
          {/* Ranura Ovalada Negra de Sujeción (Strap Pill Slot) */}
          <div style={{
            width: "7px",
            height: "22px",
            borderRadius: "4px",
            background: "#000000",
            flexShrink: 0
          }} />

          {/* Nombre y Detalles de Edad / SIXE */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
            
            {/* Nombre del Caminante */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2px 0" }}>
              <span style={{
                fontSize: "10pt",
                fontWeight: "900",
                color: nombreColor,
                lineHeight: 1.1,
                textAlign: "center",
                textTransform: "uppercase",
                wordBreak: "break-word"
              }}>
                {nombrePersona}
              </span>
            </div>

            {/* Fila Inferior Punteada con EDAD y SIXE */}
            <div style={{
              borderTop: "1px dashed #cbd5e1",
              paddingTop: "2px",
              paddingBottom: "1px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              fontSize: "6.5pt",
              fontWeight: "900",
              color: "#334155",
              textTransform: "uppercase"
            }}>
              <span>EDAD: <strong style={{ color: "#000" }}>{edadText}</strong></span>
              <span>SIXE: <strong style={{ color: "#000" }}>{tallaText}</strong></span>
            </div>

          </div>
        </div>

        {/* Línea Punteada Vertical de Trepado */}
        <div style={{ width: "0px", borderLeft: "1.5px dashed #cbd5e1", height: "100%" }} />

        {/* Lado Derecho (Habitación y Mesa) */}
        <div style={{
          width: "28%",
          background: "#f8fafc",
          padding: "3px 4px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "center",
          boxSizing: "border-box"
        }}>
          <div style={{ fontSize: "6.5pt", fontWeight: "900", color: "#000000", textTransform: "uppercase" }}>
            HABITACIÓN
          </div>

          <div style={{
            fontSize: "22pt",
            fontWeight: "900",
            color: headerBg,
            lineHeight: 0.95,
            fontFamily: "Arial Black, sans-serif"
          }}>
            {habNum}
          </div>

          <div style={{ fontSize: "6.5pt", fontWeight: "900", color: headerBg, textTransform: "uppercase" }}>
            MESA <strong style={{ color: headerBg }}>{mesaNum}</strong>
          </div>
        </div>

      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// GAFETE CARPETA — Totalmente editable con soporte de imágenes y marca de agua (194mm × 95mm)
// ──────────────────────────────────────────────────────────
export function GafeteCarpetaCard({ persona, logoUrl, nombreRetiro, edicion, estilos: e = {}, print, celdaAncho, celdaAlto }) {
  const wMm = celdaAncho || e.celdaAnchoMm || 194;
  const hMm = celdaAlto || e.celdaAltoMm || 95;

  const headerBg = e.headerBgColor || "#b91c1c";
  const headerTextColor = e.headerTextColor || "#ffffff";
  const nombreColor = e.nombreColor || "#000000";
  const borderColor = e.borderColor || "#b91c1c";
  const bodyBg = e.bodyBgColor || "#ffffff";
  const fontFam = e.fontFamily || "Arial, sans-serif";

  const bgImg = e.imagenFondoUrl || "https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=1200&q=80";

  const nombrePersona = (persona?.nombre || persona?.nombre_completo || "NOMBRE DEL CAMINANTE").toUpperCase();
  const habNum = persona?.numero_habitacion || persona?.habitacion || "";
  const mesaNum = persona?.numero_mesa || persona?.mesa || "";
  const retHeader = nombreRetiro || e.nombreRetiroPersonalizado || "ENCABEZADO DEL RETIRO";
  const retSubheader = edicion ? `EDICIÓN #${edicion}` : "ENCABEZADO DEL RETIRO";

  return (
    <div
      style={{
        border: `1.5px solid ${borderColor}`,
        borderRadius: "4px",
        background: bodyBg,
        fontFamily: fontFam,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        position: "relative",
        margin: "0 auto",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        width: `${wMm}mm`,
        height: `${hMm}mm`
      }}
    >
      {/* Banner Superior Rojo Centrado */}
      <div
        style={{
          background: headerBg,
          color: headerTextColor,
          padding: "5px 12px",
          textAlign: "center",
          textTransform: "uppercase",
          borderBottom: `1px solid ${borderColor}`,
          position: "relative",
          zIndex: 10,
          flexShrink: 0
        }}
      >
        <div style={{ fontSize: "12pt", fontWeight: "900", lineHeight: 1.1, letterSpacing: "0.8px" }}>
          {retHeader}
        </div>
        <div style={{ fontSize: "7.5pt", opacity: 0.9, letterSpacing: "0.4px" }}>
          {retSubheader}
        </div>
      </div>

      {/* Círculo de Logo Superpuesto en la Esquina Superior Izquierda */}
      {e.mostrarLogo !== false && (
        <div style={{
          position: "absolute",
          top: "6px",
          left: "12px",
          width: "58px",
          height: "58px",
          borderRadius: "50%",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 25,
          border: "2px solid #ffffff",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          padding: "3px"
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ width: "92%", height: "92%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: "22px", color: headerBg, fontWeight: "bold" }}>✝</span>
          )}
        </div>
      )}

      {/* Cuerpo Central con Marca de Agua / Imagen de Fondo Personalizable */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "10px 16px" }}>
        
        {/* Imagen de Fondo Configurable / Editable */}
        {e.mostrarImagenFondo !== false && bgImg && (
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            opacity: Number(e.imagenFondoOpacidad ?? 0.28),
            pointerEvents: "none"
          }}>
            <img
              src={bgImg}
              alt="Fondo Carpeta"
              style={{
                width: "100%",
                height: "100%",
                objectFit: e.imagenFondoAjuste || "cover",
                objectPosition: `${e.imagenFondoPosH ?? 50}% ${e.imagenFondoPosV ?? 50}%`,
                transform: `scale(${e.imagenFondoEscala ? e.imagenFondoEscala / 100 : 1})`,
                filter: "contrast(110%)"
              }}
            />
          </div>
        )}

        {/* Nombre del Caminante en Mayúsculas y Negrita Gigante */}
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", width: "100%" }}>
          <span style={{
            fontSize: "22pt",
            fontWeight: "900",
            color: nombreColor,
            lineHeight: 1.15,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            wordBreak: "break-word",
            textShadow: "0 1px 3px rgba(255,255,255,0.9)"
          }}>
            {nombrePersona}
          </span>
        </div>

      </div>

      {/* Banner Rojo Inferior (Footer) de Lado a Lado */}
      <div style={{
        background: headerBg,
        color: headerTextColor,
        padding: "5px 36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "10pt",
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        zIndex: 10,
        flexShrink: 0
      }}>
        <span>MESA: <strong style={{ color: "#ffffff", marginLeft: "6px" }}>{mesaNum}</strong></span>
        <span style={{ marginRight: "28px", paddingRight: "16px" }}>HABITACION: <strong style={{ color: "#ffffff", marginLeft: "6px", minWidth: "32px", display: "inline-block" }}>{habNum}</strong></span>
      </div>

    </div>
  );
}

// ──────────────────────────────────────────────────────────
// GAFETE CAMA — Rediseño unificado con EDAD y SIXE posicionados más abajo (194mm × 42mm)
// ──────────────────────────────────────────────────────────
export function GafeteCamaCard({ persona, logoUrl, nombreRetiro, edicion, estilos: e = {}, print, celdaAncho, celdaAlto }) {
  const wMm = celdaAncho || e.celdaAnchoMm || 194;
  const hMm = celdaAlto || e.celdaAltoMm || 42;

  const headerBg = e.headerBgColor || "#b91c1c";
  const headerTextColor = e.headerTextColor || "#ffffff";
  const nombreColor = e.nombreColor || "#000000";
  const borderColor = e.borderColor || "#b91c1c";
  const bodyBg = e.bodyBgColor || "#ffffff";
  const fontFam = e.fontFamily || "Arial, sans-serif";

  const nombrePersona = (persona?.nombre || persona?.nombre_completo || "NOMBRE DEL CAMINANTE").toUpperCase();
  const habNum = persona?.numero_habitacion || persona?.habitacion || "7";
  const edadText = persona?.edad ? `${persona.edad}` : "—";
  const tallaText = persona?.talla_camisa || persona?.talla || "—";
  const retHeader = nombreRetiro || e.nombreRetiroPersonalizado || "ENCABEZADO DEL RETIRO";
  const retSubheader = edicion ? `EDICIÓN #${edicion}` : "ENCABEZADO DEL RETIRO";

  return (
    <div
      style={{
        border: `1.5px solid ${borderColor}`,
        borderRadius: "4px",
        background: bodyBg,
        fontFamily: fontFam,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        position: "relative",
        margin: "0 auto",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        width: `${wMm}mm`,
        height: `${hMm}mm`
      }}
    >
      {/* Encabezado Rojo Centrado */}
      <div
        style={{
          background: headerBg,
          color: headerTextColor,
          padding: "3px 8px",
          textAlign: "center",
          textTransform: "uppercase",
          borderBottom: `1px solid ${borderColor}`,
          flexShrink: 0
        }}
      >
        <div style={{ fontSize: "8.5pt", fontWeight: "900", lineHeight: 1.1, letterSpacing: "0.5px" }}>
          {retHeader}
        </div>
        <div style={{ fontSize: "5.5pt", opacity: 0.9, letterSpacing: "0.3px" }}>
          {retSubheader}
        </div>
      </div>

      {/* Cuerpo Central con Logo Circular Izquierdo, Nombre al Centro y Habitación a la Derecha */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "4px 10px 2px", gap: "10px", position: "relative" }}>
        
        {/* Logo Circular Izquierdo */}
        {e.mostrarLogo !== false && (
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1.5px solid #cbd5e1",
            boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
            padding: "2px"
          }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ width: "90%", height: "90%", objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: "14px", color: headerBg, fontWeight: "bold" }}>✝</span>
            )}
          </div>
        )}

        {/* Nombre y Detalles de Edad / SIXE ubicados bien abajo */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", minWidth: 0 }}>
          
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "2px" }}>
            <span style={{
              fontSize: "13pt",
              fontWeight: "900",
              color: nombreColor,
              lineHeight: 1.1,
              textAlign: "center",
              textTransform: "uppercase",
              wordBreak: "break-word"
            }}>
              {nombrePersona}
            </span>
          </div>

          {/* Fila Inferior Punteada de EDAD y SIXE ubicada bien abajo */}
          <div style={{
            borderTop: "1px dashed #cbd5e1",
            paddingTop: "2px",
            paddingBottom: "1px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            fontSize: "7pt",
            fontWeight: "900",
            color: "#334155",
            textTransform: "uppercase"
          }}>
            <span>EDAD: <strong style={{ color: "#000" }}>{edadText}</strong></span>
            <span>SIXE: <strong style={{ color: "#000" }}>{tallaText}</strong></span>
          </div>

        </div>

        {/* Bloque Derecha: Habitación */}
        <div style={{
          paddingLeft: "8px",
          borderLeft: "1.5px dashed #cbd5e1",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          flexShrink: 0,
          minWidth: "75px"
        }}>
          <div style={{ fontSize: "7pt", fontWeight: "900", color: "#000000", textTransform: "uppercase" }}>
            HABITACIÓN
          </div>
          <div style={{
            fontSize: "26pt",
            fontWeight: "900",
            color: headerBg,
            lineHeight: 0.95,
            fontFamily: "Arial Black, sans-serif"
          }}>
            {habNum}
          </div>
        </div>

      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// CARTA
// ──────────────────────────────────────────────────────────
export function CartaCard({ persona, nombreRetiro, edicion, logoUrl, esServidor, estilos = {}, print }) {
  const e = estilos || {};
  const parrafos = e.textoCarta.split("\n\n").filter(Boolean);
  return (
    <div style={{
      border: `1px solid ${e.borderColor}`, borderRadius: `${e.borderRadius}px`,
      padding: print ? "24px 32px" : `${e.paddingV}px ${e.paddingH}px`,
      background: e.bodyBgColor, fontFamily: e.fontFamily,
      ...(print ? { margin: "8px 0", pageBreakInside: "avoid" } : {}),
    }}>
      <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: `2px solid ${e.borderColor}44`, paddingBottom: "12px" }}>
        {e.mostrarLogo !== false && logoUrl && <img src={logoUrl} alt="" style={{ height: "40px", objectFit: "contain", margin: "0 auto 6px", display: "block" }} />}
        {e.mostrarNombreRetiro !== false && <p style={{ fontSize: `${e.subtextFontSize}px`, color: e.borderColor, textTransform: "uppercase", letterSpacing: "3px", margin: 0, fontWeight: "bold" }}>{nombreRetiro}</p>}
        {e.mostrarEdicion !== false && edicion && <p style={{ fontSize: `${Number(e.subtextFontSize) - 1}px`, color: e.borderColor, margin: "2px 0 0", opacity: 0.7 }}>{edicion}</p>}
      </div>
      <p style={{ fontSize: print ? "13px" : `${e.subtextFontSize}px`, color: e.bodyTextColor, lineHeight: 1.7, margin: 0 }}>
        Querido(a) <strong>{persona.nombre}</strong>,
      </p>
      {parrafos.map((p, i) => (
        <p key={i} style={{ fontSize: print ? "13px" : `${e.subtextFontSize}px`, color: e.bodyTextColor, lineHeight: 1.7, margin: "8px 0 0" }}>{p}</p>
      ))}
      {esServidor && e.mostrarRol !== false && (
        <p style={{ fontSize: print ? "13px" : `${e.subtextFontSize}px`, color: e.bodyTextColor, lineHeight: 1.7, marginTop: "8px" }}>
          Como <strong>{persona.rol || "servidor"}</strong>, tu entrega y generosidad hacen posible que muchos corazones se abran al amor de Dios. Gracias por tu servicio desinteresado.
        </p>
      )}
      <p style={{ fontSize: print ? "13px" : `${e.subtextFontSize}px`, color: e.bodyTextColor, lineHeight: 1.7, marginTop: "12px" }}>
        Con cariño en Cristo,<br /><strong>{e.textoFirma}</strong>
      </p>
      {e.mostrarDireccion !== false && e.direccion && <p style={{ fontSize: `${Number(e.subtextFontSize) - 1}px`, color: "#888", marginTop: "10px", borderTop: "1px dashed #ddd", paddingTop: "8px" }}>{e.direccion}</p>}
      {e.mostrarNumeroHabitacion !== false && persona.numero_habitacion && (
        <div style={{ marginTop: "12px", borderTop: `1px dashed ${e.borderColor}55`, paddingTop: "8px", fontSize: `${e.subtextFontSize}px`, color: e.borderColor }}>
          Habitación: <strong>{persona.numero_habitacion}</strong>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// FICHA
// ──────────────────────────────────────────────────────────
function FichaCard({ persona, nombreRetiro, edicion, logoUrl, esServidor, estilos, print }) {
  const e = estilos;
  const fila = (label, valor) => valor ? (
    <tr key={label}>
      <td style={{ fontSize: `${e.subtextFontSize}px`, color: e.borderColor, fontWeight: "bold", paddingRight: "10px", paddingBottom: "4px", whiteSpace: "nowrap" }}>{label}</td>
      <td style={{ fontSize: `${e.subtextFontSize}px`, color: e.bodyTextColor, paddingBottom: "4px" }}>{valor}</td>
    </tr>
  ) : null;

  return (
    <div style={{
      border: `1px solid ${e.borderColor}`, borderRadius: `${e.borderRadius}px`,
      padding: `${e.paddingV}px ${e.paddingH}px`, background: e.bodyBgColor, fontFamily: e.fontFamily,
      ...(print ? { margin: "8px 0", pageBreakInside: "avoid" } : {}),
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          {e.mostrarLogo !== false && logoUrl && <img src={logoUrl} alt="" style={{ height: "28px", objectFit: "contain", marginBottom: "4px", display: "block" }} />}
          {e.mostrarNombreRetiro !== false && <p style={{ fontSize: `${e.subtextFontSize}px`, color: e.borderColor, textTransform: "uppercase", letterSpacing: "2px", margin: 0, fontWeight: "bold" }}>{nombreRetiro}</p>}
          {e.mostrarEdicion !== false && edicion && <p style={{ fontSize: `${Number(e.subtextFontSize) - 1}px`, color: e.borderColor, margin: "1px 0 0", opacity: 0.7 }}>{edicion}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: `${e.subtextFontSize}px`, color: e.borderColor, margin: 0, fontWeight: "bold" }}>FICHA DE {esServidor ? "SERVIDOR" : "CAMINANTE"}</p>
          <p style={{ fontSize: `${Number(e.subtextFontSize) - 1}px`, color: e.borderColor, margin: "2px 0 0", opacity: 0.7 }}>{new Date().toLocaleDateString("es-ES")}</p>
        </div>
      </div>
      <div style={{ borderBottom: `2px solid ${e.borderColor}44`, paddingBottom: "8px", marginBottom: "10px" }}>
        <p style={{ fontSize: `${e.nombreFontSize}px`, fontWeight: "900", color: e.bodyTextColor, margin: 0 }}>{persona.nombre}</p>
        {e.mostrarRol !== false && esServidor && persona.rol && <p style={{ fontSize: `${e.subtextFontSize}px`, color: e.borderColor, margin: "2px 0 0" }}>{persona.rol}</p>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {fila("Edad", persona.edad ? `${persona.edad} años` : null)}
          {fila("Género", persona.genero)}
          {e.mostrarTelefono !== false && fila("Teléfono", persona.telefono)}
          {e.mostrarParroquia !== false && fila("Parroquia", persona.parroquia)}
          {!esServidor && e.mostrarPadrinoMadrina !== false && fila("Padrino/Madrina", persona.padrino_madrina)}
          {!esServidor && e.mostrarNumeroHabitacion !== false && fila("Habitación", persona.numero_habitacion)}
          {!esServidor && e.mostrarNumeroMesa !== false && fila("Mesa", persona.numero_mesa)}
          {!esServidor && e.mostrarTalla !== false && fila("Talla camisa", persona.talla_camisa)}
          {e.mostrarTipoSangre !== false && fila("Tipo de sangre", persona.tipo_sangre)}
          {!esServidor && e.mostrarNecesidadesMedicas !== false && persona.necesidades_medicas && fila("Necesidades médicas", persona.necesidades_medicas)}
          {e.mostrarNotas !== false && persona.notas && fila("Notas", persona.notas)}
        </tbody>
      </table>
      {e.mostrarDireccion !== false && e.direccion && <p style={{ fontSize: `${Number(e.subtextFontSize) - 1}px`, color: "#888", marginTop: "8px", borderTop: "1px dashed #ddd", paddingTop: "6px" }}>{e.direccion}</p>}
    </div>
  );
}