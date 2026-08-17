import { MapPin, Phone, Mail, Globe, X, Pencil, Trash2, Printer, Package, User, FileText } from "lucide-react";

const RENGLON_ICONS = {
  "Bebidas y Alimentos": "🍽️",
  "Logística": "📦",
  "Sonido y Audiovisual": "🎵",
  "Papelería": "📄",
  "Transporte": "🚐",
  "Imprenta": "🖨️",
  "Uniformes": "👕",
  "Decoración": "🎨",
  "Tecnología": "💻",
  "Otro": "📋",
};

const RENGLON_COLORS = {
  "Bebidas y Alimentos": "bg-green-100 text-green-700 border-green-200",
  "Logística": "bg-blue-100 text-blue-700 border-blue-200",
  "Sonido y Audiovisual": "bg-purple-100 text-purple-700 border-purple-200",
  "Papelería": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Transporte": "bg-orange-100 text-orange-700 border-orange-200",
  "Imprenta": "bg-pink-100 text-pink-700 border-pink-200",
  "Uniformes": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Decoración": "bg-rose-100 text-rose-700 border-rose-200",
  "Tecnología": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Otro": "bg-gray-100 text-gray-700 border-gray-200",
};

export default function SuplidorDetalle({ suplidor, onClose, onEditar, onEliminar, onImprimir }) {
  if (!suplidor) return null;

  const colorCls = RENGLON_COLORS[suplidor.renglon] || RENGLON_COLORS["Otro"];
  const icon = RENGLON_ICONS[suplidor.renglon] || "📋";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-amber-700 text-white px-5 py-4 rounded-t-2xl flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <h2 className="text-lg font-bold leading-tight">{suplidor.nombre}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold mt-1 inline-block ${colorCls}`}>
                {suplidor.renglon || "Otro"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="hover:opacity-75 mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 space-y-4">
          {/* Datos de contacto */}
          <div className="bg-amber-50 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Datos de Contacto</p>

            {suplidor.contacto && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <User className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{suplidor.contacto}</span>
              </div>
            )}
            {suplidor.telefono && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <a href={`tel:${suplidor.telefono}`} className="hover:text-amber-700 font-medium">{suplidor.telefono}</a>
              </div>
            )}
            {suplidor.email && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <a href={`mailto:${suplidor.email}`} className="hover:text-amber-700">{suplidor.email}</a>
              </div>
            )}
            {suplidor.provincia && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{suplidor.provincia}{suplidor.direccion ? ` · ${suplidor.direccion}` : ""}</span>
              </div>
            )}
          </div>

          {/* Producto/Servicio */}
          {suplidor.producto_servicio && (
            <div className="bg-white border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> Producto / Servicio
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{suplidor.producto_servicio}</p>
            </div>
          )}

          {/* Notas */}
          {suplidor.notas && (
            <div className="bg-white border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Notas
              </p>
              <p className="text-sm text-gray-600 leading-relaxed italic">{suplidor.notas}</p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="px-5 pb-5 flex justify-between items-center border-t border-amber-50 pt-4">
          <button onClick={() => onEliminar(suplidor.id)}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
          <div className="flex gap-2">
            <button onClick={() => onImprimir(suplidor)}
              className="flex items-center gap-1.5 text-sm border border-amber-300 text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button onClick={() => onEditar(suplidor)}
              className="flex items-center gap-1.5 text-sm bg-amber-700 hover:bg-amber-800 text-white px-4 py-1.5 rounded-lg transition-colors font-medium">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}