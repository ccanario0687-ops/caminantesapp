import { useState } from "react";
import { X, Printer, Calendar, Clock, Sunrise, Sun, Moon } from "lucide-react";

const shiftOf = (h) => {
  const hh = Number((h || "0").split(":")[0]);
  if (hh < 12) return "Mañana";
  if (hh < 18) return "Tarde";
  return "Noche";
};

const SHIFT_META = {
  "Mañana": { Icon: Sunrise, cls: "text-amber-500" },
  "Tarde": { Icon: Sun, cls: "text-orange-500" },
  "Noche": { Icon: Moon, cls: "text-indigo-500" },
};

export default function VistaPreviaPrograma({
  programaciones,
  configRetiro,
  numeroRetiro,
  moderadoresPorFecha,
  onClose,
  onPrint,
}) {
  const [diaActivo, setDiaActivo] = useState(null);

  const agrupados = programaciones.reduce((acc, p) => {
    if (!acc[p.fecha]) acc[p.fecha] = [];
    acc[p.fecha].push(p);
    return acc;
  }, {});
  const dias = Object.keys(agrupados).sort();
  const diaSel = diaActivo || dias[0] || null;

  const formatFecha = (f) => {
    const d = new Date(f + "T12:00:00");
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const formatHora = (h) => {
    if (!h) return "-";
    const [hh, mm] = h.split(":").map(Number);
    const ampm = hh < 12 ? "AM" : "PM";
    const h12 = hh % 12 || 12;
    return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
  };

  const modDe = (fecha, turno) => {
    const m = (moderadoresPorFecha[fecha] || []).find((x) => x.turno === turno);
    return m?.nombre || "";
  };

  const nombreRetiro = configRetiro?.nombre_retiro || "Retiro de Emaús";
  const edicion = configRetiro?.edicion ? `Retiro #${configRetiro.edicion}` : numeroRetiro ? `Retiro #${numeroRetiro}` : "";

  const acts = diaSel ? [...(agrupados[diaSel] || [])].sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || "")) : [];

  const filas = [];
  let turnoAnterior = null;
  let idx = 0;
  acts.forEach((p) => {
    const turnoActual = shiftOf(p.hora_inicio);
    if (turnoActual !== turnoAnterior) {
      const meta = SHIFT_META[turnoActual] || SHIFT_META["Mañana"];
      const nombreMod = modDe(diaSel, turnoActual);
      filas.push(
        <tr key={`div-${p.id}-${turnoActual}`}>
          <td colSpan={6} className="bg-amber-50 border-y border-amber-200 px-4 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <meta.Icon className={`w-4 h-4 ${meta.cls}`} />
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">{turnoActual}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-700">
                Moderador: <strong className={nombreMod ? "text-amber-800" : "text-gray-400"}>{nombreMod || "Sin asignar"}</strong>
              </span>
            </div>
          </td>
        </tr>
      );
      turnoAnterior = turnoActual;
    }
    const i = idx++;
    filas.push(
      <tr key={p.id} className={p.resaltar ? "bg-amber-100/70" : i % 2 === 0 ? "bg-white" : "bg-amber-50/40"}>
        <td className="px-4 py-3 font-medium text-amber-900 whitespace-nowrap">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 opacity-50" />{formatHora(p.hora_inicio)}</span>
        </td>
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatHora(p.hora_fin)}</td>
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.tiempo_minutos ? `${p.tiempo_minutos} min` : "-"}</td>
        <td className="px-4 py-3">
          <span className={p.resaltar ? "font-bold text-amber-900 text-base" : "font-medium text-gray-800"}>
            {p.actividad}
          </span>
          {p.descripcion && <span className="block text-xs font-normal text-gray-500 mt-0.5">{p.descripcion}</span>}
        </td>
        <td className="px-4 py-3 text-gray-600 font-medium">
          {p.responsable || "-"}
          {p.responsable_2 && <span className="block text-xs text-amber-600">{p.responsable_2}</span>}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {p.equipo ? (
            <span className="inline-block bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded text-xs">{p.equipo}</span>
          ) : (<span className="text-gray-400">—</span>)}
        </td>
      </tr>
    );
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-bold leading-tight">Vista Previa del Programa</h2>
              <p className="text-amber-100 text-xs">{nombreRetiro}{edicion ? ` · ${edicion}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onPrint} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="hover:opacity-75"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Pestañas de días */}
        {dias.length > 1 && (
          <div className="flex gap-1 px-5 py-2 bg-amber-50/60 border-b border-amber-100 overflow-x-auto">
            {dias.map(d => (
              <button key={d} onClick={() => setDiaActivo(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-colors ${
                  d === diaSel ? "bg-amber-700 text-white" : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-100"
                }`}>
                {formatFecha(d)}
              </button>
            ))}
          </div>
        )}

        {/* Contenido */}
        <div className="overflow-y-auto p-5">
          {dias.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No hay actividades para mostrar.</p>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="text-base font-bold text-amber-900 capitalize flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  {formatFecha(diaSel)}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{acts.length} actividad(es)</p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-amber-100">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50 border-b border-amber-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold whitespace-nowrap">Hora Desde</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold whitespace-nowrap">Hora Hasta</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold whitespace-nowrap">Tiempo</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold">Actividad</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold">Responsable</th>
                      <th className="text-left px-4 py-2 text-amber-800 font-semibold">Equipo</th>
                    </tr>
                  </thead>
                  <tbody>{filas}</tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}