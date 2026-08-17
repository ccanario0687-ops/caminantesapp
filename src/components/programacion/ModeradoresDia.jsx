import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Sunrise, Sun, Moon, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TURNOS = [
  { key: "Mañana", Icon: Sunrise, color: "text-amber-500" },
  { key: "Tarde", Icon: Sun, color: "text-orange-500" },
  { key: "Noche", Icon: Moon, color: "text-indigo-500" },
];

export default function ModeradoresDia({ fecha, numeroRetiro, registros, onGuardado }) {
  const { user } = useAuth();
  const [valores, setValores] = useState({ Mañana: "", Tarde: "", Noche: "" });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const map = { Mañana: "", Tarde: "", Noche: "" };
    (registros || []).forEach(r => {
      if (map[r.turno] !== undefined) map[r.turno] = r.nombre || "";
    });
    setValores(map);
  }, [registros]);

  const guardar = async () => {
    setGuardando(true);
    try {
      const existing = {};
      (registros || []).forEach(r => { existing[r.turno] = r; });
      for (const turno of ["Mañana", "Tarde", "Noche"]) {
        const nombre = (valores[turno] || "").trim();
        const ex = existing[turno];
        if (ex) {
          await base44.entities.ModeradorDia.update(ex.id, { nombre, equipo_id: user?.equipo_id || null });
        } else if (nombre) {
          await base44.entities.ModeradorDia.create({
            fecha,
            turno,
            nombre,
            numero_retiro: Number(numeroRetiro),
            equipo_id: user?.equipo_id || null
          });
        }
      }
      toast.success("Moderadores guardados");
      onGuardado?.();
    } catch (e) {
      toast.error("Error al guardar moderadores");
    }
    setGuardando(false);
  };

  return (
    <div className="px-5 py-3 bg-amber-50/40 border-t border-amber-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Moderadores del día</p>
        <button onClick={guardar} disabled={guardando}
          className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-60">
          {guardando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {TURNOS.map(({ key, Icon, color }) => (
          <div key={key} className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
            <Icon className={`w-4 h-4 ${color} shrink-0`} />
            <input
              id={`mod-input-${fecha}-${key}`}
              type="text" value={valores[key]}
              onChange={e => setValores(v => ({ ...v, [key]: e.target.value }))}
              placeholder={`${key}...`}
              className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}