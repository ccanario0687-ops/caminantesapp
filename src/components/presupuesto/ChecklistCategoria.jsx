import { ChevronDown, ChevronRight, PlusCircle, Pencil, Trash2, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { useState } from "react";

const PRIORIDAD_COLOR = {
  Alta: "bg-red-100 text-red-700",
  Media: "bg-yellow-100 text-yellow-700",
  Baja: "bg-green-100 text-green-700",
};

const CATEGORIA_ICON = {
  "Alimentos y Bebidas": "🍽️",
  "Materiales Espirituales": "✝️",
  "Uniformes y Vestimenta": "👕",
  "Logística y Transporte": "📦",
  "Sonido y Audiovisual": "🎵",
  "Papelería e Imprenta": "📄",
  "Decoración": "🎨",
  "Tecnología": "💻",
  "Misceláneos": "📋",
};

const fmt = (n) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 0 }).format(n || 0);

export default function ChecklistCategoria({ categoria, items, onAgregar, onEditar, onEliminar, onToggleCompletado }) {
  const [expandido, setExpandido] = useState(true);

  const totalPresup = items.reduce((s, i) => s + (i.cantidad_presupuestada || 0) * (i.costo_unitario || 0), 0);
  const totalAdicional = items.reduce((s, i) => {
    const diff = Math.max(0, (i.cantidad_presupuestada || 0) - (i.cantidad_en_existencia || 0));
    return s + diff * (i.costo_unitario || 0);
  }, 0);
  const completados = items.filter(i => i.completado).length;
  const conFaltante = items.filter(i => (i.cantidad_presupuestada || 0) > (i.cantidad_en_existencia || 0)).length;
  const icon = CATEGORIA_ICON[categoria] || "📋";

  return (
    <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
      {/* Header de categoría */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-amber-50 transition-colors select-none"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <p className="font-bold text-gray-800 text-sm">{categoria}</p>
            <p className="text-xs text-gray-400">
              {completados}/{items.length} completados
              {conFaltante > 0 && <span className="text-red-500 ml-2">· {conFaltante} con faltante</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500">Presupuestado</p>
            <p className="text-sm font-bold text-amber-700">{fmt(totalPresup)}</p>
          </div>
          {totalAdicional > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500">Adicional</p>
              <p className="text-sm font-bold text-red-600">{fmt(totalAdicional)}</p>
            </div>
          )}
          <button
            onClick={e => { e.stopPropagation(); onAgregar(categoria); }}
            className="flex items-center gap-1 text-xs bg-amber-700 text-white px-2.5 py-1.5 rounded-lg hover:bg-amber-800 transition-colors"
          >
            <PlusCircle className="w-3 h-3" /> Agregar
          </button>
          {expandido
            ? <ChevronDown className="w-4 h-4 text-amber-400" />
            : <ChevronRight className="w-4 h-4 text-amber-400" />
          }
        </div>
      </div>

      {/* Items */}
      {expandido && (
        <div className="border-t border-amber-50">
          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <p>Sin ítems en esta categoría.</p>
              <button onClick={() => onAgregar(categoria)}
                className="text-amber-600 hover:text-amber-800 text-xs mt-1 underline">
                Agregar primer ítem
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-amber-50/70">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-amber-700 font-semibold w-8"></th>
                    <th className="px-3 py-2 text-left text-xs text-amber-700 font-semibold">Ítem</th>
                    <th className="px-3 py-2 text-center text-xs text-amber-700 font-semibold">Presup.</th>
                    <th className="px-3 py-2 text-center text-xs text-amber-700 font-semibold">Existencia</th>
                    <th className="px-3 py-2 text-center text-xs text-amber-700 font-semibold">Diferencia</th>
                    <th className="px-3 py-2 text-center text-xs text-amber-700 font-semibold">Costo Unit.</th>
                    <th className="px-3 py-2 text-center text-xs text-amber-700 font-semibold">Total</th>
                    <th className="px-3 py-2 text-center text-xs text-amber-700 font-semibold">Adicional</th>
                    <th className="px-3 py-2 text-center text-xs text-amber-700 font-semibold">Prior.</th>
                    <th className="px-3 py-2 text-center text-xs text-amber-700 font-semibold w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const diferencia = (item.cantidad_presupuestada || 0) - (item.cantidad_en_existencia || 0);
                    const costoTotal = (item.cantidad_presupuestada || 0) * (item.costo_unitario || 0);
                    const costoAdicional = Math.max(0, diferencia) * (item.costo_unitario || 0);
                    const tieneFaltante = diferencia > 0;

                    return (
                      <tr key={item.id}
                        className={`border-t border-gray-50 ${item.completado ? "opacity-60 bg-green-50/30" : idx % 2 === 0 ? "bg-white" : "bg-amber-50/20"}`}>
                        {/* Checkbox completado */}
                        <td className="px-3 py-2.5 text-center">
                          <button onClick={() => onToggleCompletado(item)}
                            className="hover:scale-110 transition-transform">
                            {item.completado
                              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                              : <Circle className="w-4 h-4 text-gray-300 hover:text-amber-400" />
                            }
                          </button>
                        </td>
                        {/* Nombre */}
                        <td className="px-3 py-2.5">
                          <div>
                            <p className={`font-medium text-gray-800 ${item.completado ? "line-through" : ""}`}>{item.nombre}</p>
                            {item.suplidor_nombre && (
                              <p className="text-xs text-gray-400 truncate max-w-[140px]">🏪 {item.suplidor_nombre}</p>
                            )}
                            {item.notas && (
                              <p className="text-xs text-gray-400 italic truncate max-w-[140px]">{item.notas}</p>
                            )}
                          </div>
                        </td>
                        {/* Cantidades */}
                        <td className="px-3 py-2.5 text-center text-gray-700 font-medium">
                          {item.cantidad_presupuestada || 0} <span className="text-gray-400 text-xs">{item.unidad}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-700 font-medium">
                          {item.cantidad_en_existencia || 0} <span className="text-gray-400 text-xs">{item.unidad}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {diferencia > 0 ? (
                            <span className="flex items-center justify-center gap-1 text-red-600 font-bold">
                              <AlertTriangle className="w-3 h-3" /> {diferencia}
                            </span>
                          ) : (
                            <span className="text-green-600 font-bold">✓</span>
                          )}
                        </td>
                        {/* Costos */}
                        <td className="px-3 py-2.5 text-center text-gray-600 text-xs">
                          {fmt(item.costo_unitario)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold text-amber-700 text-xs">
                          {fmt(costoTotal)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {costoAdicional > 0
                            ? <span className="text-red-600 font-bold text-xs">{fmt(costoAdicional)}</span>
                            : <span className="text-green-600 text-xs">—</span>
                          }
                        </td>
                        {/* Prioridad */}
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${PRIORIDAD_COLOR[item.prioridad] || PRIORIDAD_COLOR["Media"]}`}>
                            {item.prioridad || "Media"}
                          </span>
                        </td>
                        {/* Acciones */}
                        <td className="px-3 py-2.5">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => onEditar(item)}
                              className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onEliminar(item.id)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}