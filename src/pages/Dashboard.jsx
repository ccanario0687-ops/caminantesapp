import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useComunidad } from "@/lib/ComunidadContext";
import { puedeVer } from "@/lib/permisos";
import { 
  Users, CheckCircle, Clock, XCircle, PlusCircle, Heart, BarChart2, 
  Shuffle, Settings, DoorOpen, RefreshCw, Printer, HelpCircle, 
  DollarSign, Archive, BookOpen, ClipboardList, Mic2, Calendar, 
  Truck, UserCheck, FileText, Cake, UserCheck as UserCheckIcon, 
  MapPin, User, Sparkles, Church, Flag, Pencil, Trash2, Lock
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RetiroResumen from "@/components/dashboard/RetiroResumen";
import NuevoRetiroModal from "@/components/NuevoRetiroModal";
import SelectorComunidad from "@/components/SelectorComunidad";
import { toast } from "sonner";

const ACCESOS = [
  { key: "caminantes",    path: "/caminantes",    icon: Users,          label: "Caminantes" },
  { key: "servidores",    path: "/servidores",     icon: Heart,          label: "Servidores" },
  { key: "inscripciones", path: "/inscripciones",  icon: ClipboardList,  label: "Inscripciones" },
  { key: "distribucion",  path: "/distribucion",   icon: Shuffle,        label: "Distribución" },
  { key: "reportes",      path: "/reportes",       icon: BarChart2,      label: "Reportes" },
  { key: "distintivos",   path: "/distintivos",    icon: DoorOpen,       label: "Distintivos" },
  { key: "impresiones",   path: "/impresiones",    icon: Printer,        label: "Impresiones" },
  { key: "configuracion", path: "/configuracion",  icon: Settings,       label: "Configuración" },
  { key: "finanzas",      path: "/finanzas",       icon: DollarSign,     label: "Finanzas" },
  { key: "suplidores",    path: "/suplidores",     icon: Truck,          label: "Suplidores" },
  { key: "programacion",  path: "/programacion",   icon: Calendar,       label: "Programación" },
  { key: "charlistas",    path: "/charlistas",     icon: Mic2,           label: "Charlistas" },
  { key: "mensajeria",    path: "/mensajeria",     icon: null,           label: "Mensajeria", emoji: "📨" },
  { key: "historial",     path: "/historial",      icon: Archive,        label: "Historial" },
  { key: "biblioteca",    path: "/biblioteca",     icon: BookOpen,       label: "Biblioteca" },
  { key: "equipos",       path: "/equipos",        icon: UserCheck,      label: "Equipos de Trabajo" },
  { key: "entrada",       path: "/entrada",        icon: null,           label: "Control de Entrada", emoji: "🚪" },
  { key: "presupuesto",   path: "/presupuesto",    icon: FileText,       label: "Presupuesto" },
  { key: "solicitudes",    path: "/solicitudes",    icon: null,           label: "Solicitudes de Acceso", emoji: "📩" },
];

const LOCAL_STORAGE_KEY = "emaus_comunidades_local_v1";

// ⏰ SUBCOMPONENTE DE CONTEO REGRESIVO (Edición y Eliminación EXCLUSIVA para el CREADOR)
function ConteoRegresivoComunidades({ configList = [] }) {
  const { user: currentUser } = useAuth();
  const { esCreador: esCreadorContext } = useComunidad();

  // 👑 PERMISO STRICTO DEL CREADOR (Excluye administradores comunes)
  const esCreador = Boolean(
    currentUser?.email === "ccanario0687@gmail.com" ||
    currentUser?.es_creador === true ||
    (esCreadorContext === true && currentUser?.email === "ccanario0687@gmail.com")
  );

  const [comunidades, setComunidades] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [formComunidad, setFormComunidad] = useState({
    nombre_comunidad: "",
    parroquia: "",
    proximo_retiro: "",
    fecha_retiro: "",
    lugar: "",
    coordinador: ""
  });

  useEffect(() => {
    let baseComunidades = [];

    if (configList && configList.length > 0) {
      baseComunidades = configList.map((cfg, idx) => ({
        id: cfg.id || `base44_cfg_${idx}`,
        nombre_comunidad: cfg.nombre_comunidad || cfg.parroquia || cfg.nombre_retiro || `Comunidad #${idx + 1}`,
        parroquia: cfg.parroquia || cfg.provincia || "Parroquia Emaús",
        proximo_retiro: cfg.proximo_retiro || cfg.nombre_retiro || `Retiro #${cfg.edicion || idx + 1}`,
        fecha_inicio: cfg.fecha_inicio || cfg.fecha_retiro,
        lugar: cfg.lugar || "Casa de Retiro",
        coordinador: cfg.coordinador || cfg.contacto_rector || ""
      }));
    }

    let locales = [];
    try {
      const guardadas = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (guardadas) locales = JSON.parse(guardadas);
    } catch (e) {}

    if (baseComunidades.length === 0 && locales.length === 0) {
      const nowMs = Date.now();
      locales = [
        {
          id: "com_1",
          nombre_comunidad: "Comunidad San Jerónimo",
          parroquia: "Parroquia San Jerónimo Real",
          proximo_retiro: "XXVI Retiro Emaús Hombres",
          fecha_inicio: new Date(nowMs + 2 * 86400000 + 14 * 3600000 + 30 * 60000).toISOString(),
          lugar: "Casa de Retiro Valle Bendito",
          coordinador: "Hermano Manuel Santos"
        },
        {
          id: "com_2",
          nombre_comunidad: "Comunidad San Juan Bautista",
          parroquia: "Parroquia San Juan Bautista",
          proximo_retiro: "XIV Retiro Emaús Mujeres",
          fecha_inicio: new Date(nowMs + 9 * 86400000 + 8 * 3600000 + 15 * 60000).toISOString(),
          lugar: "Centro de Espiritualidad Monte María",
          coordinador: "Hermana Carmen Reyes"
        },
        {
          id: "com_3",
          nombre_comunidad: "Nuestra Señora de la Altagracia",
          parroquia: "Santuario Basílica Altagracia",
          proximo_retiro: "XXVII Retiro Emaús Hombres",
          fecha_inicio: new Date(nowMs + 21 * 86400000 + 19 * 3600000).toISOString(),
          lugar: "Casa de Convivencia Tabor",
          coordinador: "Hermano Carlos De León"
        },
        {
          id: "com_4",
          nombre_comunidad: "Comunidad Santa María Reina",
          parroquia: "Parroquia Santa María Reina",
          proximo_retiro: "XV Retiro Emaús Mujeres",
          fecha_inicio: new Date(nowMs + 38 * 86400000 + 5 * 3600000).toISOString(),
          lugar: "Villa Emaús Jarabacoa",
          coordinador: "Hermana Patricia Morales"
        }
      ];
      try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(locales)); } catch(e){}
    }

    const combinadas = [...baseComunidades];
    locales.forEach(loc => {
      if (!combinadas.some(b => b.id === loc.id)) {
        combinadas.push(loc);
      }
    });

    setComunidades(combinadas);
  }, [configList]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const calcularTiempoRestante = (fechaTarget) => {
    if (!fechaTarget) return null;
    const targetMs = new Date(fechaTarget).getTime();
    const diff = targetMs - now;

    if (isNaN(targetMs) || diff <= 0) {
      return { finalizado: true };
    }

    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      finalizado: false,
      dias: String(dias).padStart(2, "0"),
      horas: String(horas).padStart(2, "0"),
      minutos: String(minutos).padStart(2, "0"),
      segundos: String(segundos).padStart(2, "0")
    };
  };

  const guardarEnStorage = (lista) => {
    setComunidades(lista);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lista));
    } catch (e) {}
  };

  const guardarComunidad = async (e) => {
    e.preventDefault();
    if (!esCreador) {
      toast.error("🔒 Solo el Creador de la aplicación puede modificar retiros.");
      return;
    }

    const fechaIso = formComunidad.fecha_retiro 
      ? new Date(formComunidad.fecha_retiro).toISOString() 
      : new Date().toISOString();

    const datosPayload = {
      nombre_comunidad: formComunidad.nombre_comunidad,
      parroquia: formComunidad.parroquia,
      proximo_retiro: formComunidad.proximo_retiro,
      nombre_retiro: formComunidad.proximo_retiro,
      fecha_inicio: fechaIso,
      lugar: formComunidad.lugar,
      coordinador: formComunidad.coordinador
    };

    let guardadoEnBase44 = false;
    try {
      if (editandoId && !editandoId.startsWith("com_")) {
        await base44.entities.ConfigRetiro.update(editandoId, datosPayload);
        guardadoEnBase44 = true;
      } else {
        await base44.entities.ConfigRetiro.create(datosPayload);
        guardadoEnBase44 = true;
      }
    } catch (err) {
      console.warn("API de Base44 sin créditos. Guardado local de respaldo...");
    }

    if (editandoId) {
      const actualizadas = comunidades.map(c => c.id === editandoId ? { ...c, ...datosPayload } : c);
      guardarEnStorage(actualizadas);
    } else {
      const nuevaLocal = { id: "com_" + Date.now(), ...datosPayload };
      guardarEnStorage([...comunidades, nuevaLocal]);
    }

    toast.success(guardadoEnBase44 ? "¡Retiro guardado en Base44!" : "¡Retiro guardado localmente!");
    cerrarModal();
  };

  const abrirModalEditar = (com) => {
    if (!esCreador) return;
    setEditandoId(com.id);
    let fechaInputValue = "";
    if (com.fecha_inicio || com.fecha_retiro) {
      try {
        const d = new Date(com.fecha_inicio || com.fecha_retiro);
        fechaInputValue = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } catch (e) {}
    }

    setFormComunidad({
      nombre_comunidad: com.nombre_comunidad || "",
      parroquia: com.parroquia || "",
      proximo_retiro: com.proximo_retiro || com.nombre_retiro || "",
      fecha_retiro: fechaInputValue,
      lugar: com.lugar || "",
      coordinador: com.coordinador || ""
    });
    setModalAbierto(true);
  };

  const eliminarComunidad = async (id) => {
    if (!esCreador) {
      toast.error("🔒 Solo el Creador de la aplicación puede eliminar retiros.");
      return;
    }

    if (confirm("¿Deseas eliminar esta comunidad y su conteo regresivo?")) {
      try {
        if (!id.startsWith("com_")) {
          await base44.entities.ConfigRetiro.delete(id).catch(() => null);
        }
      } catch (e) {}

      const filtradas = comunidades.filter(c => c.id !== id);
      guardarEnStorage(filtradas);
      toast.success("Comunidad eliminada.");
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditandoId(null);
    setFormComunidad({
      nombre_comunidad: "",
      parroquia: "",
      proximo_retiro: "",
      fecha_retiro: "",
      lugar: "",
      coordinador: ""
    });
  };

  return (
    <div className="mb-8 bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-amber-100">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-700" />
            <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
              Conteo Regresivo de Retiros por Comunidad
            </h2>
          </div>
          <p className="text-xs text-amber-800 mt-1 font-medium">
            Tiempo restante en vivo para los próximos retiros de Emaús.
          </p>
        </div>

        {/* 🔒 Solo el CREADOR ÚNICO (no administradores generales) puede ver el botón de Programar */}
        {esCreador ? (
          <button
            onClick={() => {
              setEditandoId(null);
              const defaultDate = new Date(Date.now() + 7 * 86400000);
              const isoStr = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
              setFormComunidad({
                nombre_comunidad: "",
                parroquia: "",
                proximo_retiro: "",
                fecha_retiro: isoStr,
                lugar: "",
                coordinador: ""
              });
              setModalAbierto(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-700 to-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" /> Programar Retiro de Comunidad
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-amber-200">
            <Lock className="w-3.5 h-3.5 text-amber-700" /> Vista de Lectura
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {comunidades.map((com, index) => {
          const tiempo = calcularTiempoRestante(com.fecha_inicio || com.fecha_retiro);
          const nombreComunidad = com.nombre_comunidad || com.parroquia || `Comunidad Emaús #${index + 1}`;
          const nombreRetiro = com.proximo_retiro || com.nombre_retiro || com.nombre || "Retiro de Emaús";
          const fechaText = com.fecha_inicio ? new Date(com.fecha_inicio).toLocaleDateString("es-DO", {
            weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
          }) : "Fecha por definir";

          return (
            <div
              key={com.id || index}
              className="bg-gradient-to-br from-amber-50/70 to-orange-50/50 border border-amber-200 rounded-xl p-5 shadow-md flex flex-col justify-between gap-4 hover:shadow-lg transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                      <Church className="w-4 h-4 text-amber-700" />
                      {nombreComunidad}
                    </h3>
                    {com.parroquia && (
                      <p className="text-xs text-amber-800/80 font-medium">{com.parroquia}</p>
                    )}
                  </div>
                  
                  {/* 🔒 Botones de Editar / Eliminar visibles ÚNICAMENTE para el Creador (Excluye Admins) */}
                  {esCreador && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abrirModalEditar(com)}
                        title="Editar Fecha o Datos"
                        className="p-1.5 text-amber-700 hover:bg-amber-200/60 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => eliminarComunidad(com.id)}
                        title="Eliminar Comunidad"
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white/80 border border-amber-100 rounded-lg p-3 my-2 space-y-1 text-xs shadow-sm">
                  <p className="font-bold text-red-900 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    {nombreRetiro}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-700" />
                    {com.lugar || "Casa de Retiros Emaús"}
                  </p>
                  <p className="text-gray-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    {fechaText}
                  </p>
                  {com.coordinador && (
                    <p className="text-gray-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-700" />
                      Coord: {com.coordinador}
                    </p>
                  )}
                </div>
              </div>

              {tiempo && tiempo.finalizado ? (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-center font-bold text-sm flex items-center justify-center gap-2 shadow-inner">
                  <Flag className="w-4 h-4 text-emerald-600" />
                  ¡Retiro en Curso / Hoy! 🎉
                </div>
              ) : tiempo ? (
                <div className="grid grid-cols-4 gap-2 bg-gradient-to-r from-amber-950 to-red-950 text-white p-3 rounded-xl shadow-inner text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold text-amber-300 font-mono">{tiempo.dias}</span>
                    <span className="text-[9px] uppercase tracking-wider text-amber-200/80 font-bold">Días</span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold text-amber-300 font-mono">{tiempo.horas}</span>
                    <span className="text-[9px] uppercase tracking-wider text-amber-200/80 font-bold">Horas</span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold text-amber-300 font-mono">{tiempo.minutos}</span>
                    <span className="text-[9px] uppercase tracking-wider text-amber-200/80 font-bold">Min</span>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold text-amber-300 font-mono">{tiempo.segundos}</span>
                    <span className="text-[9px] uppercase tracking-wider text-amber-200/80 font-bold">Seg</span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {modalAbierto && esCreador && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-amber-300">
            <h3 className="text-lg font-bold text-amber-900 mb-4 pb-2 border-b border-amber-100 flex items-center gap-2">
              <Church className="w-5 h-5 text-amber-700" /> {editandoId ? "Editar Retiro de Comunidad" : "Programar Retiro para Comunidad"}
            </h3>
            <form onSubmit={guardarComunidad} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Comunidad</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Comunidad San Jerónimo"
                  value={formComunidad.nombre_comunidad}
                  onChange={(e) => setFormComunidad({ ...formComunidad, nombre_comunidad: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Parroquia / Sector</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Parroquia San Jerónimo"
                    value={formComunidad.parroquia}
                    onChange={(e) => setFormComunidad({ ...formComunidad, parroquia: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del Retiro</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. XXVI Retiro Emaús Hombres"
                    value={formComunidad.proximo_retiro}
                    onChange={(e) => setFormComunidad({ ...formComunidad, proximo_retiro: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha y Hora de Inicio</label>
                  <input
                    type="datetime-local"
                    required
                    value={formComunidad.fecha_retiro}
                    onChange={(e) => setFormComunidad({ ...formComunidad, fecha_retiro: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lugar del Retiro</label>
                  <input
                    type="text"
                    placeholder="Ej. Casa de Retiros Valle Bendito"
                    value={formComunidad.lugar}
                    onChange={(e) => setFormComunidad({ ...formComunidad, lugar: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Coordinador(a)</label>
                <input
                  type="text"
                  placeholder="Ej. Hermano Manuel Santos"
                  value={formComunidad.coordinador}
                  onChange={(e) => setFormComunidad({ ...formComunidad, coordinador: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-700 to-red-700 text-white rounded-lg text-xs font-bold hover:brightness-110 shadow"
                >
                  Guardar Comunidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 🏠 COMPONENTE PRINCIPAL DASHBOARD
export default function Dashboard() {
  const [caminantes, setCaminantes] = useState([]);
  const [servidores, setServidores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarNuevoRetiro, setMostrarNuevoRetiro] = useState(false);
  const { user: currentUser } = useAuth();
  const { comunidadActual } = useComunidad();
  
  const esCreadorReal = Boolean(
    currentUser?.email === "ccanario0687@gmail.com" || currentUser?.es_creador === true
  );

  const coincideComunidadItem = (item) => {
    if (!item) return false;
    if (esCreadorReal && (!comunidadActual || comunidadActual.id === "GLOBAL" || comunidadActual.id === "global" || comunidadActual.slug === "global")) {
      return true;
    }

    const idActivo = String(comunidadActual?.equipo_id || comunidadActual?.id || currentUser?.equipo_id || "").toLowerCase();
    const codigoActivo = String(comunidadActual?.codigo_comunidad || comunidadActual?.codigo || currentUser?.codigo_comunidad || "").toLowerCase();
    const slugActivo = String(comunidadActual?.slug || currentUser?.slug || "").toLowerCase();
    const nombreActivo = String(comunidadActual?.nombre || comunidadActual?.nombre_equipo || currentUser?.nombre_equipo || "").toLowerCase();

    const idReg = String(item.equipo_id || item.comunidad_id || item.retiro_id || item.id_equipo || "").toLowerCase();
    const codigoReg = String(item.codigo_comunidad || item.comunidad_codigo || item.codigo || "").toLowerCase();
    const slugReg = String(item.slug || item.comunidad_slug || "").toLowerCase();
    const nombreReg = String(item.comunidad_nombre || item.nombre_equipo || item.comunidad || "").toLowerCase();

    if (idActivo && idReg && idReg === idActivo) return true;
    if (codigoActivo && codigoReg && codigoReg === codigoActivo) return true;
    if (slugActivo && slugReg && slugReg === slugActivo) return true;
    if (nombreActivo && nombreReg && nombreReg === nombreActivo) return true;

    // Incluir registros sin comunidad asignada para la comunidad activa
    if (!idReg && !codigoReg && !slugReg && !nombreReg) return true;

    return false;
  };

  const filtrarPorComunidad = (arr) => {
    return (arr || []).filter(coincideComunidadItem);
  };
  
  const [configList, setConfigList] = useState([]);
  const [cumpleaneros, setCumpleaneros] = useState([]);
  const [loadingCumple, setLoadingCumple] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const [caminantesData, s1, s2, rRemotas, configsData] = await Promise.all([
        base44.entities.Caminante.list().catch(() => []),
        base44.entities.Servidor.list().catch(() => []),
        base44.entities.Servidores?.list?.().catch(() => []) || Promise.resolve([]),
        base44.entities.InscripcionRemota?.list?.().catch(() => []) || Promise.resolve([]),
        base44.entities.ConfigRetiro.list().catch(() => [])
      ]);

      let acumuladosServ = [];
      if (Array.isArray(s1)) acumuladosServ.push(...s1);
      if (Array.isArray(s2)) acumuladosServ.push(...s2);

      if (Array.isArray(caminantesData)) {
        const soloServs = caminantesData.filter(c => 
          String(c.tipo || "").toLowerCase() === "servidor" || 
          String(c.tipo_registro || "").toLowerCase() === "servidor" ||
          c.es_servidor === true ||
          Boolean(c.lugares_servido || c.rol_servidor)
        );
        acumuladosServ.push(...soloServs);
      }

      if (Array.isArray(rRemotas)) {
        const soloServsRemotos = rRemotas.filter(c => {
          const est = String(c.estado || "").toLowerCase();
          const esAprobado = est === "aprobado" || est === "confirmado";
          const tipoStr = String(c.tipo || c.tipo_inscripcion || c.tipo_registro || c.rol_servidor || "").toLowerCase();
          const esServ = tipoStr.includes("servid") || c.es_servidor === true || Boolean(c.lugares_servido || c.rol_servidor || c.equipo_trabajo);
          return esAprobado && esServ;
        });
        acumuladosServ.push(...soloServsRemotos);
      }

      // Local Storage Fallback
      try {
        const locServs = JSON.parse(localStorage.getItem("emaus_servidores") || "[]");
        if (Array.isArray(locServs) && locServs.length > 0) acumuladosServ.push(...locServs);
      } catch {}

      // Deduplicación inteligente por cédula / ID / nombre+teléfono
      const mapaUnicos = new Map();
      acumuladosServ.forEach(s => {
        if (!s) return;
        const cleanCed = s.cedula ? String(s.cedula).replace(/\D/g, "") : "";
        const cleanTel = s.telefono ? String(s.telefono).replace(/\D/g, "") : "";
        const cleanNom = s.nombre ? String(s.nombre).trim().toLowerCase() : "";
        const keyInscrip = s.inscripcion_id || s.inscripcion_remota_id ? String(s.inscripcion_id || s.inscripcion_remota_id) : null;

        let key = keyInscrip || (cleanCed ? `ced_${cleanCed}` : (cleanNom && cleanTel ? `nom_${cleanNom}_${cleanTel}` : String(s.id || s._id)));
        const previo = mapaUnicos.get(key) || {};
        mapaUnicos.set(key, { ...previo, ...s });
      });

      setCaminantes(caminantesData || []);
      setServidores(Array.from(mapaUnicos.values()));
      setConfigList(configsData || []);
    } catch (err) {
      console.warn("Error cargando en Dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const isAdmin = currentUser?.role === "admin";
  const permisos = (() => {
    try { return JSON.parse(currentUser?.permisos_modulos || "{}"); } catch { return {}; }
  })();

  const accesosFiltrados = ACCESOS.filter(a => {
    if (isAdmin) return true;
    const k = a.altKey || a.key;
    return puedeVer(currentUser, k);
  });

  const camsView = filtrarPorComunidad(caminantes);
  const servsView = filtrarPorComunidad(servidores);
  const cfgView = filtrarPorComunidad(configList);
  const totalFichas = cfgView?.[0]?.total_fichas || 0;

  // Cifras Reconciliadas
  const total = camsView.length;
  const confirmados = camsView.filter((c) => c.estado === "Confirmado" || c.estado === "Ingresado" || c.asistencia_checkin).length;
  const pendientes = camsView.filter((c) => c.estado === "Pendiente" || (!c.estado && !c.asistencia_checkin)).length;
  const cancelados = camsView.filter((c) => c.estado === "Cancelado").length;

  const totalServidores = servsView.length;
  const servidoresPagos = servsView.filter((s) => s.pago_ficha === "Pagado" || s.estado === "Confirmado").length;
  const servidoresPresentes = servsView.filter((s) => s.asistencia_checkin || s.presente || s.estado === "Ingresado").length;
  
  const porcentajeInscritos = totalFichas > 0
    ? Math.min(100, Math.round((total / totalFichas) * 100))
    : 0;

  const [personaPostalCumple, setPersonaPostalCumple] = useState(null);

  useEffect(() => {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    const hoyStr = `${mes}-${dia}`;
    const cums = [];
    [...camsView, ...servsView].forEach(p => {
      if (!p || !p.fecha_nacimiento) return;
      const md = String(p.fecha_nacimiento).slice(5, 10);
      if (md === hoyStr) {
        cums.push({ 
          ...p, 
          nombre: p.nombre || p.nombre_completo || "Hermano(a)", 
          tipo: p.tipo || (p.rol ? 'Servidor' : 'Caminante') 
        });
      }
    });
    setCumpleaneros(cums);
    setLoadingCumple(false);
  }, [camsView, servsView]);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #fdf6e3 0%, #fff8f0 60%, #fce8e8 100%)" }}>
      {/* Header */}
      <div className="text-white px-6 py-8 shadow-xl relative overflow-hidden" style={{ background: "linear-gradient(135deg, #5c1a00 0%, #8B1a1a 40%, #b8860b 100%)" }}>
        <img
          src="https://media.base44.com/images/public/69e8403342580bac45e5b3bd/ee196c230_jesus.jpg"
          alt="Rostro de Jesús"
          className="absolute right-0 top-0 h-full w-auto object-cover object-center select-none pointer-events-none"
          style={{
            opacity: 0.7,
            mixBlendMode: "screen",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 25%, black 55%)",
            maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 25%, black 55%)"
          }}
        />
        <div className="max-w-6xl mx-auto flex items-center gap-5 relative z-10">
          <img
            src="https://media.base44.com/images/public/69e8403342580bac45e5b3bd/28de3e4eb_logoemauscircular.png"
            alt="Logo Emaús"
            className="w-16 h-16 object-contain rounded-full bg-white/10 p-1 shrink-0" />
          
          <div>
            <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: "Georgia, serif" }}>Hermandad de Emaús</h1>
            <p style={{ color: "#fde68a", fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", marginTop: "2px" }}>Lucas 24, 13-35 · Sistema de Registro</p>
            {currentUser ? (
              <p style={{ color: "#fcd34d", fontSize: "13px", marginTop: "6px", fontStyle: "italic" }}>
                ✝ Bienvenido Hermano: <strong style={{ color: "#ffffff" }}>{currentUser.username || currentUser.full_name || currentUser.email}</strong>
              </p>
            ) : null}
            <p style={{ color: "#fef08a", fontSize: "12px", marginTop: "4px", fontStyle: "italic", opacity: 0.9 }}>
              ❤️ Desarrollado con mucho amor para la Hermandad de Emaús
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Selector de Comunidad en Dashboard */}
        <div className="mb-6">
          <SelectorComunidad />
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {(isAdmin || permisos["caminantes"]) && (
            <Link to="/registro" className="col-span-2 sm:col-span-3 lg:col-span-5 text-white px-5 py-3 text-base font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:brightness-110" style={{ background: "linear-gradient(135deg,#8B1a1a 0%,#c0392b 60%,#b8860b 100%)" }}>
              <PlusCircle className="w-5 h-5" /> Registrar Nuevo Caminante
            </Link>
          )}

          {accesosFiltrados.map(a => {
            const IconComponent = a.icon;
            return (
              <Link key={a.path} to={a.path}
                className="flex flex-col items-center gap-1.5 bg-white hover:bg-amber-50 border-2 px-3 py-3 rounded-xl font-medium transition-colors shadow text-center"
                style={{ borderColor: "#b8860b", color: "#5c1a00" }}>
                {a.emoji
                  ? <span className="w-5 h-5 flex items-center justify-center text-lg">{a.emoji}</span>
                  : <IconComponent className="w-5 h-5" style={{ color: "#b8860b" }} />
                }
                <span className="text-xs font-semibold">{a.label}</span>
              </Link>
            );
          })}

          <Link to="/ayuda" className="flex flex-col items-center gap-1.5 bg-white hover:bg-amber-50 border-2 px-3 py-3 rounded-xl font-medium transition-colors shadow text-center" style={{ borderColor: "#b8860b", color: "#5c1a00" }}>
            <HelpCircle className="w-5 h-5" style={{ color: "#b8860b" }} /><span className="text-xs font-semibold">Ayuda</span>
          </Link>

          {isAdmin && (
            <button onClick={() => setMostrarNuevoRetiro(true)} className="flex flex-col items-center gap-1.5 border-2 px-3 py-3 rounded-xl font-medium transition-all shadow text-center hover:brightness-110" style={{ background: "linear-gradient(135deg,#7f1d1d,#991b1b)", borderColor: "#7f1d1d", color: "white" }}>
              <RefreshCw className="w-5 h-5" /><span className="text-xs font-bold">Nuevo Retiro</span>
            </button>
          )}
        </div>

        {/* Alerta de Cumpleaños */}
        {!loadingCumple && cumpleaneros.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-pink-50 via-amber-50 to-orange-50 border-2 border-pink-300 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-pink-500/10 border border-pink-300 flex items-center justify-center shadow-sm">
                  <Cake className="w-6 h-6 text-pink-600 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-pink-900 tracking-tight">🎂 ¡Cumpleañeros de Hoy!</h3>
                  <p className="text-xs text-pink-700 font-medium">{cumpleaneros.length} persona(s) celebran su cumpleaños hoy en la comunidad</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cumpleaneros.map((cp, i) => (
                <div key={i} className="flex items-center justify-between gap-3 bg-white/90 rounded-2xl p-3.5 border border-pink-200 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow">
                      {cp.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-black text-gray-800 truncate leading-snug">{cp.nombre}</p>
                      <p className="text-[11px] text-pink-700 font-medium">{cp.tipo} de Emaús</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setPersonaPostalCumple(cp)}
                    className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white rounded-xl font-black text-[11px] flex items-center gap-1.5 shadow transition hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                    title="Diseñar postal de cumpleaños personalizada y enviar felicidades por WhatsApp"
                  >
                    <Cake className="w-3.5 h-3.5 text-yellow-200" />
                    <span>🎁 Felicitar</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Postal de Cumpleaños */}
        {personaPostalCumple && (
          <ModalPostalCumpleanos
            persona={personaPostalCumple}
            config={cfgView?.[0]}
            comunidadActual={comunidadActual}
            onClose={() => setPersonaPostalCumple(null)}
          />
        )}

        {/* ⏰ SECCIÓN DE CONTEO REGRESIVO POR COMUNIDAD (Protegida) */}
        <ConteoRegresivoComunidades configList={configList} />

        {/* Stats Reconciliados de Caminantes */}
        <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-700" /> Resumen de Caminantes
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Caminantes" value={total} icon={Users} color="amber" loading={loading} />
          <StatCard label="Confirmados / Check-in" value={confirmados} icon={CheckCircle} color="green" loading={loading} />
          <StatCard label="Pendientes" value={pendientes} icon={Clock} color="yellow" loading={loading} />
          <StatCard label="Cancelados" value={cancelados} icon={XCircle} color="red" loading={loading} />
        </div>

        {/* Stats Reconciliados de Servidores & Capacidad */}
        <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-amber-700" /> Resumen de Servidores & Capacidad
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Servidores Inscritos" value={totalServidores} icon={Heart} color="amber" loading={loading} />
          <StatCard label="Servidores Pagos" value={servidoresPagos} icon={CheckCircle} color="green" loading={loading} />
          <StatCard label="Servidores Presentes" value={servidoresPresentes} icon={UserCheckIcon} color="blue" loading={loading} />
          <StatCard label={`% Fichas Llenas${totalFichas > 0 ? ` (${total}/${totalFichas})` : ""}`} value={`${porcentajeInscritos}%`} icon={BarChart2} color="yellow" loading={loading} />
        </div>

        {mostrarNuevoRetiro && (
          <NuevoRetiroModal
            onClose={() => setMostrarNuevoRetiro(false)}
            onCompletado={() => { setMostrarNuevoRetiro(false); setLoading(true); cargar(); }}
          />
        )}
      </div>
    </div>
  );
}