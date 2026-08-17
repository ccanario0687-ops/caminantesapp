import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { puedeVer } from "@/lib/permisos";
import { 
  Search, Users, UserCheck, LayoutGrid, DollarSign, Printer, 
  FileText, Calendar, Mic2, MessageCircle, Archive, BookOpen, 
  UserPlus, DoorOpen, Settings, HelpCircle, Info, ChevronRight, X, Sparkles, Award, UserCog
} from "lucide-react";

const MODULOS_SISTEMA = [
  { key: "dashboard",             path: "/dashboard",            icon: Search,        label: "Dashboard",                categoria: "Módulo" },
  { key: "caminantes",            path: "/caminantes",           icon: Users,         label: "Caminantes",               categoria: "Módulo" },
  { key: "registro_caminante",    path: "/registro",             icon: UserPlus,      label: "Registrar Caminante",      categoria: "Módulo" },
  { key: "servidores",            path: "/servidores",           icon: UserCheck,     label: "Servidores",               categoria: "Módulo" },
  { key: "directorio_servidores", path: "/directorio-servidores", icon: Users,         label: "Directorio Servidores",    categoria: "Módulo" },
  { key: "inscripciones",         path: "/inscripciones",        icon: FileText,      label: "Inscripciones",            categoria: "Módulo" },
  { key: "solicitudes",           path: "/solicitudes",          icon: UserPlus,      label: "Aprobar Usuarios",         categoria: "Módulo" },
  { key: "equipos",               path: "/equipos",              icon: Users,         label: "Equipos de Trabajo",       categoria: "Módulo" },
  { key: "entrada",               path: "/entrada",              icon: DoorOpen,      label: "Control de Entrada",        categoria: "Módulo" },
  { key: "distribucion",          path: "/distribucion",         icon: LayoutGrid,    label: "Distribución",             categoria: "Módulo" },
  { key: "distintivos",           path: "/distintivos",          icon: LayoutGrid,    label: "Distintivos",              categoria: "Módulo" },
  { key: "impresiones",           path: "/impresiones",          icon: Printer,       label: "Impresiones",              categoria: "Módulo" },
  { key: "finanzas",              path: "/finanzas",             icon: DollarSign,    label: "Finanzas",                 categoria: "Módulo" },
  { key: "presupuesto",           path: "/presupuesto",          icon: FileText,      label: "Presupuesto",              categoria: "Módulo" },
  { key: "suplidores",            path: "/suplidores",           icon: FileText,      label: "Suplidores",               categoria: "Módulo" },
  { key: "programacion",          path: "/programacion",         icon: Calendar,      label: "Programación",             categoria: "Módulo" },
  { key: "charlistas",            path: "/charlistas",           icon: Mic2,          label: "Charlistas",               categoria: "Módulo" },
  { key: "sacerdotes",            path: "/sacerdotes",           icon: MessageCircle, label: "Mensajerías",              categoria: "Módulo" },
  { key: "reportes",              path: "/reportes",             icon: FileText,      label: "Reportes",                 categoria: "Módulo" },
  { key: "evaluaciones_reporte", path: "/evaluaciones-reporte", icon: Award,          label: "Evaluaciones",             categoria: "Módulo" },
  { key: "historial",             path: "/historial",            icon: Archive,       label: "Historial",                categoria: "Módulo" },
  { key: "hermandad",             path: "/hermandad",            icon: BookOpen,      label: "Biblioteca Hermandad",     categoria: "Módulo" },
  { key: "config_portada",        path: "/config-portada",       icon: Sparkles,      label: "Portada y Bienvenida",     categoria: "Módulo" },
  { key: "configuracion",         path: "/configuracion",        icon: Settings,      label: "Configuración",            categoria: "Módulo" },
  { key: "usuarios",              path: "/usuarios",             icon: UserCog,       label: "Usuarios del Sistema",     categoria: "Módulo" },
];

/**
 * Normaliza cadenas de texto para búsqueda insensible a acentos, mayúsculas y espacios.
 */
function normalizarTexto(txt) {
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function BuscadorGlobalModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [caminantes, setCaminantes] = useState([]);
  const [servidores, setServidores] = useState([]);
  const [usuariosSistema, setUsuariosSistema] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setLoadingDatos(true);

      // Cargar Caminantes, Servidores y Usuarios con tolerancia a fallos
      Promise.all([
        base44.entities.Caminante.list().catch(() => []),
        base44.entities.Servidor.list().catch(() => []),
        base44.entities.User.list().catch(() => []),
      ]).then(([cams, servs, users]) => {
        setCaminantes(Array.isArray(cams) ? cams : []);
        setServidores(Array.isArray(servs) ? servs : []);
        setUsuariosSistema(Array.isArray(users) ? users : []);
        setLoadingDatos(false);
      }).catch(() => setLoadingDatos(false));
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const queryNorm = normalizarTexto(query);
  const tieneBusqueda = queryNorm.length > 0;

  // 1. Filtrar Caminantes (por nombre, apodo, cédula, teléfono, email, parroquia)
  const caminantesCoincidentes = tieneBusqueda ? caminantes.filter(c => {
    const nom = normalizarTexto(c.nombre || c.nombre_completo || c.full_name);
    const apod = normalizarTexto(c.apodo);
    const ced = normalizarTexto(c.cedula).replace(/\D/g, "");
    const tel = normalizarTexto(c.telefono || c.celular).replace(/\D/g, "");
    const mail = normalizarTexto(c.email);
    const parroq = normalizarTexto(c.parroquia);
    const qClean = queryNorm.replace(/\D/g, "");

    return (
      nom.includes(queryNorm) ||
      apod.includes(queryNorm) ||
      mail.includes(queryNorm) ||
      parroq.includes(queryNorm) ||
      (qClean.length >= 2 && (ced.includes(qClean) || tel.includes(qClean)))
    );
  }).slice(0, 8) : [];

  // 2. Filtrar Servidores (por nombre, apodo, teléfono, equipo, rol)
  const servidoresCoincidentes = tieneBusqueda ? servidores.filter(s => {
    const nom = normalizarTexto(s.nombre || s.nombre_completo || s.full_name);
    const apod = normalizarTexto(s.apodo);
    const tel = normalizarTexto(s.telefono || s.celular).replace(/\D/g, "");
    const eq = normalizarTexto(s.equipo_trabajo || s.equipo || s.rol_servidor);
    const qClean = queryNorm.replace(/\D/g, "");

    return (
      nom.includes(queryNorm) ||
      apod.includes(queryNorm) ||
      eq.includes(queryNorm) ||
      (qClean.length >= 2 && tel.includes(qClean))
    );
  }).slice(0, 8) : [];

  // 3. Filtrar Usuarios del Sistema (por username, email, nombre)
  const usuariosCoincidentes = tieneBusqueda ? usuariosSistema.filter(u => {
    const nom = normalizarTexto(u.username || u.full_name || u.nombre);
    const mail = normalizarTexto(u.email);
    return nom.includes(queryNorm) || mail.includes(queryNorm);
  }).slice(0, 5) : [];

  // 4. Filtrar Módulos del Sistema
  const modulosCoincidentes = MODULOS_SISTEMA.filter(m => {
    if (!puedeVer(user, m.key) && m.key !== "dashboard") return false;
    if (!tieneBusqueda) return true;
    const labelNorm = normalizarTexto(m.label);
    const keyNorm = normalizarTexto(m.key);
    return labelNorm.includes(queryNorm) || keyNorm.includes(queryNorm);
  });

  // Ensamblar la lista de resultados unificada (personas primero si hay búsqueda)
  const resultados = tieneBusqueda
    ? [
        ...caminantesCoincidentes.map(c => ({
          key: `cam_${c.id}`,
          path: "/caminantes",
          label: c.nombre || c.nombre_completo || "Caminante",
          subtext: `🚶‍♂️ Caminante · Mesa ${c.numero_mesa || c.mesa || "S/A"} · Hab ${c.numero_habitacion || c.habitacion || "S/A"}`,
          type: "caminante"
        })),
        ...servidoresCoincidentes.map(s => ({
          key: `serv_${s.id}`,
          path: "/servidores",
          label: s.nombre || s.nombre_completo || "Servidor",
          subtext: `🤝 Servidor · ${s.equipo_trabajo || s.equipo || s.rol_servidor || "Servidores"}`,
          type: "servidor"
        })),
        ...usuariosCoincidentes.map(u => ({
          key: `usr_${u.id}`,
          path: "/usuarios",
          label: u.username || u.full_name || u.email,
          subtext: `👤 Usuario del Sistema · ${u.email} (${u.role || u.rol || "Usuario"})`,
          type: "usuario"
        })),
        ...modulosCoincidentes.map(m => ({
          ...m,
          subtext: `📌 Módulo del Sistema`,
          type: "modulo"
        }))
      ]
    : modulosCoincidentes.map(m => ({
        ...m,
        subtext: `📌 Módulo del Sistema`,
        type: "modulo"
      }));

  const handleSelectResult = (item) => {
    if (item?.path) {
      navigate(item.path);
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (resultados.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + resultados.length) % (resultados.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (resultados[selectedIndex]) {
        handleSelectResult(resultados[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99999] flex items-start justify-center pt-16 px-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border-2 border-amber-300 flex flex-col max-h-[80vh]">
        
        {/* BUSCADOR INPUT */}
        <div className="p-4 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-amber-700 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Escribe el nombre de un caminante, servidor o módulo..."
            className="w-full bg-transparent border-none text-sm font-bold text-amber-950 focus:outline-none placeholder:text-amber-600/70"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-amber-500 hover:text-amber-800 p-1">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-1 rounded-md font-mono font-bold shrink-0">
            ESC
          </span>
        </div>

        {/* LISTADO DE RESULTADOS */}
        <div className="p-2 overflow-y-auto flex-1 space-y-1 divide-y divide-amber-50 text-xs">
          {loadingDatos ? (
            <div className="py-12 text-center text-amber-700/70">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-amber-700 rounded-full animate-spin mx-auto mb-2" />
              <p className="font-bold text-xs">Buscando en caminantes, servidores y módulos...</p>
            </div>
          ) : resultados.length === 0 ? (
            <div className="py-12 text-center text-amber-700/70">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-600" />
              <p className="font-bold text-sm">No se encontraron resultados para "{query}"</p>
              <p className="text-[11px] text-amber-600 mt-1">Verifica la escritura o busca por apodo, teléfono o módulo.</p>
            </div>
          ) : (
            resultados.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon || (
                item.type === "caminante" ? Users :
                item.type === "servidor" ? UserCheck :
                item.type === "usuario" ? UserCog : Search
              );

              return (
                <div
                  key={item.key || idx}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-amber-700 text-white shadow-xs font-bold" 
                      : "hover:bg-amber-100/60 text-amber-950 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isSelected 
                        ? "bg-amber-600 text-white" 
                        : item.type === "caminante" ? "bg-green-100 text-green-800"
                        : item.type === "servidor" ? "bg-blue-100 text-blue-800"
                        : item.type === "usuario" ? "bg-purple-100 text-purple-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      <Icon className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-xs truncate">{item.label}</p>
                      <p className={`text-[10px] truncate ${isSelected ? "text-amber-200" : "text-amber-700 font-semibold"}`}>
                        {item.subtext}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? "text-amber-200" : "text-amber-400"}`} />
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-amber-200 bg-amber-50/80 flex items-center justify-between text-[11px] text-amber-800 font-semibold">
          <span>Usa las flechas <kbd className="px-1.5 py-0.5 bg-amber-200 rounded font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-amber-200 rounded font-mono text-[10px]">↓</kbd> para navegar</span>
          <span>Presiona <kbd className="px-1.5 py-0.5 bg-amber-200 rounded font-mono text-[10px]">Enter ↵</kbd> para abrir</span>
        </div>
      </div>
    </div>
  );
}
