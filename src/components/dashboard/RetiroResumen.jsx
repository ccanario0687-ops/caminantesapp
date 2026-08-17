import { Link } from "react-router-dom";
import { Settings } from "lucide-react";

export default function RetiroResumen({ numero, caminantes, config }) {
  const confirmados = caminantes.filter(c => c.estado === "Confirmado").length;
  const pendientes = caminantes.filter(c => c.estado === "Pendiente").length;
  const cancelados = caminantes.filter(c => c.estado === "Cancelado").length;

  // Usar el nombre del retiro de la config si el número coincide con la edición actual
  const esRetiroActual = config && String(config.edicion) === String(numero);
  const nombreRetiro = esRetiroActual && config.nombre_retiro ? config.nombre_retiro : `Retiro #${numero}`;
  const lugar = esRetiroActual && config.lugar ? config.lugar : null;
  const fechaInicio = esRetiroActual && config.fecha_inicio ? new Date(config.fecha_inicio + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <Link
      to="/configuracion"
      className="block border border-amber-200 rounded-lg p-4 hover:bg-amber-50 hover:border-amber-400 transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-bold text-amber-800 group-hover:text-amber-900 leading-tight">{nombreRetiro}</h3>
        <Settings className="w-4 h-4 text-amber-400 group-hover:text-amber-600 shrink-0 mt-0.5" />
      </div>
      {lugar && <p className="text-xs text-amber-600 mb-1">📍 {lugar}</p>}
      {fechaInicio && <p className="text-xs text-gray-400 mb-2">{fechaInicio}</p>}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Total caminantes</span>
          <span className="font-semibold text-amber-900">{caminantes.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-600">Confirmados</span>
          <span className="font-semibold text-green-700">{confirmados}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-yellow-600">Pendientes</span>
          <span className="font-semibold text-yellow-700">{pendientes}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-red-500">Cancelados</span>
          <span className="font-semibold text-red-600">{cancelados}</span>
        </div>
      </div>
    </Link>
  );
}