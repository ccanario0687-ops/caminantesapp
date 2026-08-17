// SelectorComunidad.jsx - Selector Multicomunidad Exclusivo para Creador con Opción Global Total
import { useEffect, useState } from "react";
import { useComunidad } from "@/lib/ComunidadContext";
import { base44 } from "@/api/base44Client";
import { Building2, ChevronDown, Crown } from "lucide-react";

export default function SelectorComunidad() {
  const { comunidadActual, cambiarComunidad, esCreador } = useComunidad();
  const [comunidades, setComunidades] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!esCreador) return;

    setLoading(true);
    base44.functions.invoke("gestionUsuarios", { action: "listEquipos" })
      .then((res) => {
        const eqs = res?.data?.equipos || [];
        setComunidades(eqs);
        setLoading(false);
      })
      .catch(() => {
        base44.entities.ConfigRetiro.list()
          .then((cfgs) => {
            const mapeados = (cfgs || []).map(c => {
              const idReal = c.equipo_id || c.comunidad_id || c.id || c.slug;
              return {
                id: idReal,
                equipo_id: idReal,
                nombre: c.nombre_retiro || c.nombre_equipo || c.parroquia || c.nombre || "Comunidad",
                nombre_equipo: c.nombre_equipo || c.nombre_retiro || c.parroquia || c.nombre,
                slug: c.slug || idReal
              };
            });
            setComunidades(mapeados);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, [esCreador]);

  // Si no es creador, se muestra únicamente la indicación de su comunidad aislada
  if (!esCreador) {
    if (!comunidadActual) return null;
    return (
      <div className="bg-amber-100/80 border border-amber-300 rounded-xl px-4 py-2 flex items-center justify-between text-xs mb-4">
        <div className="flex items-center gap-2 text-amber-900 font-bold">
          <Building2 className="w-4 h-4 text-amber-700" />
          <span>Comunidad: {comunidadActual.nombre || "Mi Comunidad"}</span>
        </div>
        <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold text-[10px] border border-amber-400">
          Aislada
        </span>
      </div>
    );
  }

  const handleSelect = (e) => {
    const val = e.target.value;
    if (!val || val === "GLOBAL") {
      cambiarComunidad(null); // 🌐 Cambia a Vista Global Total sin filtros
    } else {
      const encontrada = comunidades.find(c => String(c.equipo_id || c.id) === String(val));
      if (encontrada) {
        cambiarComunidad({
          id: encontrada.equipo_id || encontrada.id,
          equipo_id: encontrada.equipo_id || encontrada.id,
          nombre: encontrada.nombre || encontrada.nombre_equipo || "Comunidad",
          slug: encontrada.slug
        });
      } else {
        cambiarComunidad({
          id: val,
          equipo_id: val,
          nombre: val,
        });
      }
    }
  };

  const idActivo = (!comunidadActual || comunidadActual.id === "GLOBAL" || comunidadActual.id === "global") 
    ? "GLOBAL" 
    : (comunidadActual.equipo_id || comunidadActual.id);

  return (
    <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 border-2 border-yellow-500/40 rounded-2xl p-3.5 shadow-md text-white mb-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-300">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Selector Global de Comunidad (Creador)</p>
            <p className="text-xs font-semibold text-white">
              {(!comunidadActual || comunidadActual.id === "GLOBAL" || comunidadActual.id === "global") 
                ? "🌐 Vista Global (Todas las Comunidades)" 
                : `Filtrando: ${comunidadActual.nombre}`}
            </p>
          </div>
        </div>

        <div className="relative min-w-[250px]">
          <select
            value={idActivo}
            onChange={handleSelect}
            className="w-full bg-black/40 border border-yellow-400/50 rounded-xl px-3 py-2 text-xs font-bold text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer appearance-none pr-8"
          >
            <option value="GLOBAL" className="bg-amber-900 text-white font-bold">
              🌐 Vista Global (Ver Todos los Registros)
            </option>
            {comunidades.map((c) => (
              <option 
                key={c.equipo_id || c.id} 
                value={c.equipo_id || c.id}
                className="bg-amber-950 text-white"
              >
                🏛️ {c.nombre || c.nombre_equipo || c.nombre_retiro}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-yellow-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}