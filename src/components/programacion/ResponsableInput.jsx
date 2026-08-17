import { useState } from "react";

export default function ResponsableInput({ value, servidores, onChange, onSelect }) {
  const [foco, setFoco] = useState(false);
  const termino = (value || "").toLowerCase();
  const sugerencias = termino
    ? servidores.filter(s => (s.nombre || "").toLowerCase().includes(termino)).slice(0, 6)
    : servidores.slice(0, 6);

  return (
    <div className="relative">
      <input type="text" value={value || ""}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFoco(true)}
        onBlur={() => setTimeout(() => setFoco(false), 150)}
        placeholder="Escribe para buscar servidor..."
        className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
      {foco && sugerencias.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-amber-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {sugerencias.map(s => (
            <button key={s.id} type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(s); setFoco(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center justify-between gap-2">
              <span className="truncate">{s.nombre}</span>
              {s.equipo_trabajo && (
                <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded whitespace-nowrap">{s.equipo_trabajo}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}