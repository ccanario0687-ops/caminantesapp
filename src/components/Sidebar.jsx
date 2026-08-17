import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useComunidad } from "@/lib/ComunidadContext";
import { base44 } from "@/api/base44Client";
import {
  Home, Users, UserCheck, Settings, FileText, LayoutGrid,
  Printer, HelpCircle, DollarSign, Truck, Calendar, Mic2, Music,
  MessageCircle, Archive, ClipboardList, BookOpen, UserCog, LogOut,
  Menu, X, ChevronRight, ChevronDown, Lock, Info, Award, UserPlus, DoorOpen,
  Sparkles, Layers, Star, Search, ShieldCheck
} from "lucide-react";
import { getPermiso, puedeVer } from "@/lib/permisos";

const FAVORITES_STORAGE_KEY = "emaus_sidebar_favorites_v1";

const MENU_STRUCTURE = [
  // 🏠 DASHBOARD (Acceso Directo)
  { key: "dashboard", path: "/dashboard", icon: Home, label: "Dashboard", alwaysVisible: true },
  
  // 📋 1. REGISTRO Y PARTICIPANTES
  {
    groupKey: "registro",
    groupLabel: "REGISTRO",
    icon: ClipboardList,
    items: [
      { key: "inscripciones",      path: "/inscripciones", icon: ClipboardList, label: "Inscripciones" },
      { key: "caminantes",         path: "/caminantes",    icon: Users,         label: "Caminantes" },
      { key: "registro_caminante", path: "/registro",      icon: UserPlus,      label: "Registrar Caminante" },
      { key: "servidores",         path: "/servidores",    icon: UserCheck,     label: "Servidores" },
    ]
  },

  // 🛏️ 2. LOGÍSTICA Y CASA
  {
    groupKey: "logistica",
    groupLabel: "LOGÍSTICA Y CASA",
    icon: Layers,
    items: [
      { key: "equipos",      path: "/equipos",      icon: Layers,     label: "Equipos de Trabajo" },
      { key: "entrada",      path: "/entrada",      icon: DoorOpen,   label: "Control de Entrada" },
      { key: "distribucion", path: "/distribucion", icon: LayoutGrid, label: "Distribución" },
      { key: "distintivos",  path: "/distintivos",  icon: LayoutGrid, label: "Distintivos" },
      { key: "impresiones",  path: "/impresiones",  icon: Printer,    label: "Impresiones" },
    ]
  },

  // 💰 3. FINANZAS Y COMPRAS
  {
    groupKey: "finanzas_group",
    groupLabel: "FINANZAS Y COMPRAS",
    icon: DollarSign,
    items: [
      { key: "finanzas",    path: "/finanzas",    icon: DollarSign, label: "Finanzas" },
      { key: "presupuesto", path: "/presupuesto", icon: FileText,   label: "Presupuesto" },
      { key: "suplidores",  path: "/suplidores",  icon: Truck,      label: "Suplidores" },
    ]
  },

  // ⛪ 4. PROGRAMACIÓN Y LITURGIA
  {
    groupKey: "liturgia_group",
    groupLabel: "PROGRAMACIÓN Y LITURGIA",
    icon: Calendar,
    items: [
      { key: "programacion", path: "/programacion", icon: Calendar,      label: "Programación" },
      { key: "charlistas",   path: "/charlistas",   icon: Mic2,          label: "Charlistas" },
      { key: "cancionero",   path: "/cancionero",   icon: Music,         label: "Cancionero & Misal", alwaysVisible: true },
      { key: "sacerdotes",   path: "/sacerdotes",   icon: MessageCircle, label: "Mensajerías" },
    ]
  },

  // 📖 5. HERMANDAD Y HISTORIAL
  {
    groupKey: "hermandad_group",
    groupLabel: "HERMANDAD Y HISTORIAL",
    icon: BookOpen,
    items: [
      { key: "hermandad",             path: "/hermandad",            icon: BookOpen, label: "Biblioteca Hermandad" },
      { key: "directorio_servidores", path: "/directorio-servidores", icon: Users,    label: "Directorio Servidores", alwaysVisible: true },
      { key: "reportes",              path: "/reportes",             icon: FileText, label: "Reportes Generales" },
      { key: "evaluaciones_reporte", path: "/evaluaciones-reporte", icon: Award,    label: "Evaluaciones", alwaysVisible: true },
      { key: "historial",             path: "/historial",            icon: Archive,  label: "Historial" },
    ]
  },

  // ⚙️ 6. USUARIOS Y CONFIGURACIÓN
  {
    groupKey: "usuarios_group",
    groupLabel: "USUARIOS Y CONFIGURACIÓN",
    icon: UserCog,
    requiresUserManagement: true,
    items: [
      { key: "usuarios",           path: "/usuarios",           icon: UserCog,     label: "Usuarios del Sistema", requiresUserManagement: true },
      { key: "solicitudes",        path: "/solicitudes",        icon: UserPlus,    label: "Aprobar Usuarios",     hasBadge: true },
      { key: "auditoria",          path: "/auditoria",          icon: ShieldCheck, label: "Bitácora de Auditoría", alwaysVisible: true },
      { key: "config_portada",     path: "/config-portada",     icon: Sparkles,    label: "Portada y Bienvenida" },
      { key: "configuracion",      path: "/configuracion",      icon: Settings,    label: "Configuración" },
      { key: "cambiar_contrasena", path: "/cambiar-contrasena", icon: Lock,        label: "Cambiar Contraseña" },
      { key: "ayuda",              path: "/ayuda",              icon: HelpCircle,  label: "Ayuda y Soporte" },
      { key: "sobre_nosotros",     path: "/sobre-nosotros",     icon: Info,        label: "Sobre Nosotros" },
    ]
  },
];

// Helper aplanado de ítems
const FLAT_MENU_ITEMS = MENU_STRUCTURE.reduce((acc, entry) => {
  if (entry.items) return [...acc, ...entry.items];
  return [...acc, entry];
}, []);

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { comunidadActual } = useComunidad();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);

  // Estado de Favoritos
  const [favoritos, setFavoritos] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ["caminantes", "finanzas"];
    } catch {
      return ["caminantes", "finanzas"];
    }
  });

  const toggleFavorite = (e, itemKey) => {
    e.preventDefault();
    e.stopPropagation();
    setFavoritos(prev => {
      const next = prev.includes(itemKey) 
        ? prev.filter(k => k !== itemKey) 
        : [...prev, itemKey];
      try { localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Estado para controlar qué grupos están desplegados (CERRADOS POR DEFECTO PARA ORDEN VISUAL)
  const [openGroups, setOpenGroups] = useState({});

  // 🔄 CARGAR LOGO MAESTRO GLOBAL Y CONTEO DE SOLICITUDES PENDIENTES
  useEffect(() => {
    base44.entities.ConfigRetiro.list().then((cfgs) => {
      const configMaestra = (cfgs || []).find(c => c.logo_url) || (cfgs.length > 0 ? cfgs[0] : null);
      if (configMaestra && configMaestra.logo_url) {
        setLogoUrl(configMaestra.logo_url);
      }
    }).catch(() => {});

    // Cargar solicitudes pendientes para el badge
    const cargarSolicitudesPendientes = () => {
      base44.entities.SolicitudAcceso.list("-created_date").then((sols) => {
        if (Array.isArray(sols)) {
          const p = sols.filter(s => s.estado === "Pendiente").length;
          setSolicitudesPendientes(p);
        }
      }).catch(() => {});
    };

    cargarSolicitudesPendientes();
    const interval = setInterval(cargarSolicitudesPendientes, 15000);
    return () => clearInterval(interval);
  }, []);

  // Expandir automáticamente el grupo que contenga la ruta activa
  useEffect(() => {
    MENU_STRUCTURE.forEach(entry => {
      if (entry.groupKey && entry.items) {
        const hasActive = entry.items.some(item => location.pathname.startsWith(item.path));
        if (hasActive) {
          setOpenGroups(prev => ({ ...prev, [entry.groupKey]: true }));
        }
      }
    });
  }, [location.pathname]);

  const isAdmin = user?.role === "admin" || user?.es_admin === true || user?.email === "ccanario0687@gmail.com";
  const puedeGestionarUsuarios = isAdmin || puedeVer(user, "usuarios");

  const toggleGroup = (groupKey) => {
    setOpenGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const handleLogout = () => {
    logout();
  };

  const displayName = user?.username || user?.full_name || "Usuario";
  const displayEmail = user?.email || "";
  const displayRole = isAdmin ? "Admin" : "User";
  const roleColor = isAdmin ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const isItemVisible = (item) => {
    if (item.alwaysVisible) return true;
    if (item.requiresUserManagement && !puedeGestionarUsuarios) return false;
    return getPermiso(user, item.key) !== null;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header Superior Izquierdo — Muestra el nombre de la comunidad COMPLETO */}
      <div className="px-4 py-4 border-b border-amber-200 bg-amber-100/40">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-800 flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden border-2 border-amber-600/30 shadow-xs mt-0.5">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo Oficial Emaús" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-lg">✝</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-amber-900 text-sm leading-tight">Emaús</p>
            <p className="text-amber-700 text-xs font-bold leading-snug break-words whitespace-normal mt-0.5">
              {comunidadActual?.nombre || "Sistema de Gestión"}
            </p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {/* BUSCADOR RÁPIDO CTRL+K */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open_global_search"))}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-100/70 border border-amber-200/90 text-amber-900 text-xs font-bold shadow-2xs hover:bg-amber-200/60 transition mb-2 cursor-pointer"
        >
          <Search className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="flex-1 text-left">Buscar todo...</span>
          <kbd className="text-[10px] bg-white border border-amber-300 px-1.5 py-0.5 rounded font-mono text-amber-800 font-bold shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* ⭐ SECCIÓN FAVORITOS */}
        {favoritos.length > 0 && (() => {
          const itemsFavoritos = FLAT_MENU_ITEMS.filter(item => favoritos.includes(item.key) && isItemVisible(item));
          if (itemsFavoritos.length === 0) return null;
          return (
            <div className="mb-3 space-y-0.5 border-b border-amber-200/70 pb-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase text-amber-800 tracking-wider">
                <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                <span>Favoritos</span>
              </div>
              {itemsFavoritos.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={`fav_${item.key}`}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors group relative ${
                      active ? "bg-amber-700 text-white shadow-xs" : "text-amber-950 hover:bg-amber-100/80"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-white" : "text-amber-700"}`} />
                    <span className="truncate">{item.label}</span>
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(e, item.key)}
                      title="Quitar de Favoritos"
                      className="ml-auto opacity-70 hover:opacity-100 p-0.5 cursor-pointer"
                    >
                      <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                    </button>
                  </Link>
                );
              })}
            </div>
          );
        })()}

        {MENU_STRUCTURE.map(entry => {
          // 📦 GRUPO DESPLEGABLE CON SUBÍTEMS
          if (entry.groupKey && entry.items) {
            const visibleChildren = entry.items.filter(isItemVisible);
            if (visibleChildren.length === 0) return null;

            const isOpen = Boolean(openGroups[entry.groupKey]);
            const GroupIcon = entry.icon;
            const hasAnyChildActive = visibleChildren.some(child => isActive(child.path));
            const groupTotalBadge = visibleChildren.reduce((acc, item) => {
              return acc + (item.hasBadge ? solicitudesPendientes : 0);
            }, 0);

            return (
              <div key={entry.groupKey} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.groupKey)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    hasAnyChildActive
                      ? "text-amber-900 bg-amber-200/60"
                      : "text-amber-800 hover:bg-amber-100/70"
                  }`}
                >
                  <GroupIcon className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="truncate flex-1 text-left">{entry.groupLabel}</span>
                  {groupTotalBadge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.5 shadow-sm animate-pulse">
                      {groupTotalBadge}
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="pl-3 space-y-0.5 border-l-2 border-amber-300 ml-3.5 my-1">
                    {visibleChildren.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      const hasBadge = item.hasBadge && solicitudesPendientes > 0;
                      return (
                        <Link
                          key={item.key}
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors group relative ${
                            active
                              ? "bg-amber-700 text-white shadow-xs font-semibold"
                              : "text-amber-900 hover:bg-amber-100/80"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-white" : "text-amber-600 group-hover:text-amber-800"}`} />
                          <span className="truncate">{item.label}</span>
                          {hasBadge && (
                            <span className="ml-auto bg-red-500 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.5 shadow-sm animate-pulse">
                              {solicitudesPendientes}
                            </span>
                          )}
                          {!hasBadge && !isAdmin && getPermiso(user, item.key) === "lectura" && (
                            <Lock className="w-3 h-3 ml-auto text-amber-400" />
                          )}
                          {active && !hasBadge && <ChevronRight className="w-3 h-3 ml-auto text-amber-200" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // 📄 ÍTEM INDIVIDUAL DE NIVEL SUPERIOR
          if (!isItemVisible(entry)) return null;

          const Icon = entry.icon;
          const active = isActive(entry.path);
          return (
            <Link
              key={entry.key}
              to={entry.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors group relative ${
                active
                  ? "bg-amber-700 text-white shadow-xs font-semibold"
                  : "text-amber-800 hover:bg-amber-100"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-amber-600 group-hover:text-amber-800"}`} />
              <span className="truncate">{entry.label}</span>
              {!isAdmin && getPermiso(user, entry.key) === "lectura" && (
                <Lock className="w-3 h-3 ml-auto text-amber-400" />
              )}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-amber-200" />}
            </Link>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="px-3 py-3 border-t border-amber-200">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
            <span className="text-amber-800 font-bold text-xs">
              {(displayName || "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-amber-500 truncate">{displayEmail}</p>
          </div>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${roleColor}`}>
            {displayRole}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors font-medium cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed left-4 z-50 p-2 bg-amber-700 text-white rounded-lg shadow-lg cursor-pointer"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`md:hidden safe-top fixed top-0 left-0 h-full w-64 bg-amber-50 border-r border-amber-200 z-50 shadow-xl transform transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar de 256px (w-64) para lectura holgada del nombre completo */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-amber-50 border-r border-amber-200 shrink-0 sticky top-0 h-screen overflow-hidden">
        <SidebarContent />
      </aside>
    </>
  );
}