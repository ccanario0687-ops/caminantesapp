import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import useOffline from "@/hooks/useOffline";
import { 
  Users, Search, Phone, MessageSquare, Building2, MapPin, Cake, X
} from "lucide-react";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";
import MobileTopBar from "@/components/MobileTopBar";
import SelectorComunidad from "@/components/SelectorComunidad";
import ModalPostalCumpleanos from "@/components/ModalPostalCumpleanos";

export default function DirectorioServidores() {
  const { records: todosServidores, loading } = useOffline("Servidor");
  const { comunidadActual } = useComunidad();
  const { user } = useAuth();
  const [personaPostalCumple, setPersonaPostalCumple] = useState(null);
  const [configRetiro, setConfigRetiro] = useState(null);

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (Array.isArray(cfgs) && cfgs.length > 0) setConfigRetiro(cfgs[0]);
    }).catch(() => {});
  }, []);

  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  const servidores = (todosServidores || []).filter(s => 
    !equipoIdActivo || 
    s.equipo_id === equipoIdActivo || 
    s.comunidad_id === equipoIdActivo
  );

  const [busqueda, setBusqueda] = useState("");
  const [filtroParroquia, setFiltroParroquia] = useState("Todas");
  const [filtroEquipo, setFiltroEquipo] = useState("Todos");

  const parroquiasDisponibles = ["Todas", ...new Set(servidores.map(s => s.parroquia).filter(Boolean))].sort();
  const equiposDisponibles = ["Todos", ...new Set(servidores.map(s => s.equipo_trabajo || s.rol).filter(Boolean))].sort();

  // Detectar servidores cumpleañeros de hoy
  const hoyStr = new Date().toISOString().slice(5, 10);
  const cumpleanerosServidores = servidores.filter(s => {
    if (!s.fecha_nacimiento) return false;
    return String(s.fecha_nacimiento).slice(5, 10) === hoyStr;
  });

  const filtrados = servidores.filter(s => {
    const term = busqueda.toLowerCase();
    const matchQ = !busqueda || 
      (s.nombre && s.nombre.toLowerCase().includes(term)) ||
      (s.apodo && s.apodo.toLowerCase().includes(term)) ||
      (s.telefono && s.telefono.includes(term)) ||
      (s.parroquia && s.parroquia.toLowerCase().includes(term));

    const matchP = filtroParroquia === "Todas" || s.parroquia === filtroParroquia;
    const matchE = filtroEquipo === "Todos" || (s.equipo_trabajo === filtroEquipo || s.rol === filtroEquipo);

    return matchQ && matchP && matchE;
  });

  const abrirWhatsApp = (tel, nombre) => {
    if (!tel) return;
    const numLimpio = String(tel).replace(/\D/g, "");
    const msg = encodeURIComponent(`Hola hermano(a) ${nombre || ""}, te saludamos de la Comunidad Emaús ✝. Nos gustaría contactarte para coordinar el próximo retiro.`);
    window.open(`https://wa.me/1${numLimpio}?text=${msg}`, "_blank");
  };

  return (
    <div className="pb-12 font-sans text-slate-800">
      <MobileTopBar title="Directorio de Servidores" />

      <div className="mb-4">
        <SelectorComunidad />
      </div>

      {/* HEADER DE DIRECTORIO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-amber-950 flex items-center gap-2">
            <Users className="w-7 h-7 text-amber-700" /> Directorio de Servidores de Emaús
          </h1>
          <p className="text-xs text-amber-700 font-medium">
            Catálogo completo de hermanos servidores por Parroquia, Diócesis y Equipos de trabajo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs px-3.5 py-1.5 rounded-full">
            👥 {filtrados.length} Servidores Registrados
          </span>
        </div>
      </div>

      {/* BANNER DESTACADO DE CUMPLEAÑEROS EN DIRECTORIO */}
      {cumpleanerosServidores.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-pink-50 via-amber-50 to-orange-50 border-2 border-pink-300 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-300 flex items-center justify-center">
                <Cake className="w-6 h-6 text-pink-600 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-black text-pink-900">🎂 ¡Cumpleañeros de Hoy en el Directorio!</h3>
                <p className="text-xs text-pink-700 font-medium">{cumpleanerosServidores.length} hermano(s) servidor(es) celebran su cumpleaños hoy</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cumpleanerosServidores.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 bg-white rounded-2xl p-3 border border-pink-200 shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {s.nombre ? s.nombre.charAt(0).toUpperCase() : "S"}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-black text-slate-800 truncate">{s.nombre}</p>
                    <p className="text-[10px] text-amber-700 font-bold">{s.equipo_trabajo || s.rol || "Servidor"}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPersonaPostalCumple(s)}
                  className="px-2.5 py-1 bg-gradient-to-r from-pink-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white rounded-xl font-black text-[10px] flex items-center gap-1 shadow cursor-pointer shrink-0"
                >
                  <Cake className="w-3 h-3 text-yellow-200" />
                  <span>🎁 Postal</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTROS Y BÚSQUEDA AVANZADA */}
      <div className="bg-white rounded-3xl p-5 shadow-md border border-amber-200 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-amber-500" />
            <input
              type="text"
              placeholder="Buscar por nombre, apodo o teléfono..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-amber-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 bg-amber-50/20"
            />
          </div>

          <div>
            <select
              value={filtroParroquia}
              onChange={e => setFiltroParroquia(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-900 bg-white focus:ring-2 focus:ring-amber-500"
            >
              <option value="Todas">🏠 Todas las Parroquias ({parroquiasDisponibles.length - 1})</option>
              {parroquiasDisponibles.filter(p => p !== "Todas").map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filtroEquipo}
              onChange={e => setFiltroEquipo(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-900 bg-white focus:ring-2 focus:ring-amber-500"
            >
              <option value="Todos">🛡️ Todos los Equipos de Servicio ({equiposDisponibles.length - 1})</option>
              {equiposDisponibles.filter(eq => eq !== "Todos").map(eq => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* VISTA EXCLUSIVA TIPO LISTA / TABLA DE DIRECTORIO */}
      {loading ? (
        <div className="py-20 text-center text-amber-700 font-semibold">Cargando directorio...</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-amber-200 text-center text-gray-500 shadow-sm">
          <Users className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-black text-amber-950">No se encontraron servidores</h3>
          <p className="text-xs text-gray-500 mt-1">Ajusta los filtros de búsqueda o registra nuevos servidores en la lista.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-md border border-amber-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gradient-to-r from-amber-900 to-amber-950 text-amber-100 uppercase text-[10px] font-black tracking-wider border-b border-amber-800">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Servidor</th>
                  <th className="py-3.5 px-4">Equipo / Rol</th>
                  <th className="py-3.5 px-4">Parroquia & Diócesis</th>
                  <th className="py-3.5 px-4">Teléfono</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 font-medium text-slate-700">
                {filtrados.map((s, idx) => {
                  const esCumpleHoy = s.fecha_nacimiento && String(s.fecha_nacimiento).slice(5, 10) === hoyStr;

                  return (
                    <tr key={s.id || idx} className="hover:bg-amber-50/60 transition-colors">
                      {/* 1. NÚMERO */}
                      <td className="py-3 px-4 text-center font-bold text-amber-700">{idx + 1}</td>

                      {/* 2. SERVIDOR */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-800 to-amber-950 text-amber-200 font-black text-xs flex items-center justify-center border border-amber-700 shadow-2xs shrink-0">
                            {s.nombre ? s.nombre.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-xs">{s.nombre}</span>
                              {esCumpleHoy && (
                                <span className="bg-pink-100 text-pink-800 border border-pink-300 font-black text-[9px] px-2 py-0.5 rounded-full animate-pulse shrink-0">
                                  🎂 ¡Cumple Hoy!
                                </span>
                              )}
                            </div>
                            {s.apodo && <p className="text-[11px] font-bold text-amber-700 font-serif">"{s.apodo}"</p>}
                          </div>
                        </div>
                      </td>

                      {/* 3. EQUIPO / ROL */}
                      <td className="py-3 px-4">
                        {s.equipo_trabajo || s.rol ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] px-2.5 py-1 rounded-md inline-block whitespace-nowrap">
                            {s.equipo_trabajo || s.rol}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Servidor</span>
                        )}
                      </td>

                      {/* 4. PARROQUIA & DIÓCESIS */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {s.parroquia && (
                            <p className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                              <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span className="truncate">{s.parroquia}</span>
                            </p>
                          )}
                          {s.diocesis && (
                            <p className="flex items-center gap-1.5 text-gray-500 font-medium text-[10px]">
                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="truncate">{s.diocesis}</span>
                            </p>
                          )}
                          {!s.parroquia && !s.diocesis && <span className="text-gray-400 italic text-[11px]">—</span>}
                        </div>
                      </td>

                      {/* 5. TELÉFONO */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {s.telefono ? (
                          <a
                            href={`tel:${s.telefono}`}
                            className="flex items-center gap-1.5 font-bold text-slate-900 hover:text-amber-700 transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                            <span>{s.telefono}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Sin teléfono</span>
                        )}
                      </td>

                      {/* 6. ACCIONES EN LISTA */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirWhatsApp(s.telefono, s.nombre)}
                            disabled={!s.telefono}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 sm:px-2.5 sm:py-1 rounded-xl text-[11px] font-black transition flex items-center gap-1 shadow-2xs disabled:opacity-40 cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPersonaPostalCumple(s)}
                            className="bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-300 p-2 sm:px-2.5 sm:py-1 rounded-xl text-[11px] font-black transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Crear postal de cumpleaños"
                          >
                            <Cake className="w-3.5 h-3.5 text-pink-600" />
                            <span className="hidden sm:inline">Postal</span>
                          </button>

                          {s.telefono && (
                            <a
                              href={`tel:${s.telefono}`}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 p-2 rounded-xl transition flex items-center justify-center"
                              title="Llamar directamente"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE POSTAL DE CUMPLEAÑEROS */}
      {personaPostalCumple && (
        <ModalPostalCumpleanos
          persona={personaPostalCumple}
          config={configRetiro}
          comunidadActual={comunidadActual}
          onClose={() => setPersonaPostalCumple(null)}
        />
      )}
    </div>
  );
}
