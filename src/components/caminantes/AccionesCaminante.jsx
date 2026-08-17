import { useState } from "react";
import { MoreVertical, UserX, Hourglass, CheckCircle } from "lucide-react";

/**
 * Menú de acciones para un caminante.
 * - Confirmar: dispara el cobro de ficha (onConfirmar).
 * - Lista de Espera / No Asistirá: cambio de estado directo (onAccion).
 */
export default function AccionesCaminante({ caminante, onAccion, onConfirmar, disabled }) {
  const [abierto, setAbierto] = useState(false);

  const ejecutar = (estado, label) => {
    setAbierto(false);
    onAccion(caminante, estado, label);
  };

  const confirmar = () => {
    setAbierto(false);
    onConfirmar(caminante);
  };

  const opciones = [];
  if (caminante.estado !== "Confirmado") {
    opciones.push({
      icon: CheckCircle,
      label: "Confirmar (cobrar ficha)",
      onClick: confirmar,
      color: "text-green-700 hover:bg-green-50",
    });
  }
  if (caminante.estado !== "Lista de Espera") {
    opciones.push({
      icon: Hourglass,
      label: "Enviar a Lista de Espera",
      onClick: () => ejecutar("Lista de Espera", "Lista de Espera"),
      color: "text-blue-700 hover:bg-blue-50",
    });
  }
  if (caminante.estado !== "No Asistirá") {
    opciones.push({
      icon: UserX,
      label: "No Asistirá",
      onClick: () => ejecutar("No Asistirá", "No Asistirá"),
      color: "text-gray-600 hover:bg-gray-50",
    });
  }

  if (opciones.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        disabled={disabled}
        className="p-1 rounded text-amber-600 hover:bg-amber-100 disabled:opacity-50 transition-colors"
        title="Acciones"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-xl border border-amber-100 py-1 w-56">
            {opciones.map((op, i) => (
              <button
                key={i}
                type="button"
                onClick={op.onClick}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs ${op.color} ${i > 0 ? "border-t border-gray-50" : ""}`}
              >
                <op.icon className="w-3.5 h-3.5" /> {op.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}