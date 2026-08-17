import { useState } from "react";
import { X, Printer, CheckSquare, Square, Users } from "lucide-react";

export default function ModalSeleccionImpresion({ personas, seccion, onImprimir, onClose }) {
  const [modo, setModo] = useState("todos"); // "todos" | "seleccion"
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [busqueda, setBusqueda] = useState("");

  const filtradas = personas.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.parroquia?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const togglePersona = (id) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (seleccionados.size === filtradas.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(filtradas.map(p => p.id)));
    }
  };

  const handleImprimir = () => {
    if (modo === "todos") {
      onImprimir(personas);
    } else {
      const lista = personas.filter(p => seleccionados.has(p.id));
      if (lista.length === 0) return;
      onImprimir(lista);
    }
    onClose();
  };

  const todosMarcados = filtradas.length > 0 && seleccionados.size === filtradas.length;
  const algunoMarcado = seleccionados.size > 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-800 to-amber-600 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            <div>
              <h2 className="font-bold text-base">Imprimir {seccion === "caminantes" ? "Caminantes" : "Servidores"}</h2>
              <p className="text-amber-200 text-xs">{personas.length} persona(s) disponibles</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:opacity-75"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Modo */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setModo("todos")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                modo === "todos" ? "bg-amber-700 text-white border-amber-700" : "bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400"
              }`}
            >
              <Users className="w-6 h-6" />
              <span className="text-sm font-bold">Imprimir Todos</span>
              <span className={`text-xs ${modo === "todos" ? "text-amber-200" : "text-gray-500"}`}>{personas.length} persona(s)</span>
            </button>
            <button
              onClick={() => setModo("seleccion")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                modo === "seleccion" ? "bg-amber-700 text-white border-amber-700" : "bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400"
              }`}
            >
              <CheckSquare className="w-6 h-6" />
              <span className="text-sm font-bold">Seleccionar</span>
              <span className={`text-xs ${modo === "seleccion" ? "text-amber-200" : "text-gray-500"}`}>Elige quiénes imprimir</span>
            </button>
          </div>

          {/* Lista de selección */}
          {modo === "seleccion" && (
            <div className="space-y-2">
              {/* Búsqueda + seleccionar todos */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar por nombre o parroquia..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <button
                  onClick={toggleTodos}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-semibold whitespace-nowrap"
                >
                  {todosMarcados ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                  {todosMarcados ? "Ninguno" : "Todos"}
                </button>
              </div>

              <div className="text-xs text-amber-600 font-medium">
                {seleccionados.size} seleccionado(s) de {filtradas.length}
              </div>

              {/* Lista con checkboxes */}
              <div className="border border-amber-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {filtradas.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-sm">No se encontraron personas</p>
                ) : (
                  filtradas.map((p, i) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors ${
                        seleccionados.has(p.id) ? "bg-amber-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-amber-50`}
                    >
                      <input
                        type="checkbox"
                        checked={seleccionados.has(p.id)}
                        onChange={() => togglePersona(p.id)}
                        className="w-4 h-4 accent-amber-700 cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                        {p.parroquia && <p className="text-xs text-gray-500 truncate">{p.parroquia}</p>}
                      </div>
                      {p.numero_habitacion && (
                        <span className="text-xs text-amber-600 font-semibold flex-shrink-0">Hab. {p.numero_habitacion}</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={handleImprimir}
            disabled={modo === "seleccion" && seleccionados.size === 0}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir {modo === "todos" ? `${personas.length} persona(s)` : `${seleccionados.size} seleccionada(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}