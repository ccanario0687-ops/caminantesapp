import { useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const CODIGO_AUTORIZACION = "EMAUS2025";

export default function CodigoAutorizacionModal({ titulo, onClose, onAceptar }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState(false);

  const handleVerificar = () => {
    if (codigo.trim().toUpperCase() === CODIGO_AUTORIZACION) {
      setError(false);
      onAceptar();
    } else {
      setError(true);
      toast.error("Código incorrecto");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="text-lg font-bold">{titulo}</h2>
          </div>
          <button onClick={onClose} className="hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-zinc-300 mb-4">
            Ingresa el código de autorización para continuar.
          </p>
          <input
            type="text"
            value={codigo}
            onChange={e => { setCodigo(e.target.value); setError(false); }}
            onKeyDown={e => e.key === "Enter" && handleVerificar()}
            placeholder="Código de autorización"
            className={`w-full border rounded-lg px-3 py-2.5 text-center text-base font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-amber-400 ${error ? "border-red-400 bg-red-50 dark:bg-red-950 dark:border-red-500 dark:text-zinc-100" : "border-amber-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"}`}
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-xs text-center mt-1.5">Código incorrecto. Inténtalo de nuevo.</p>
          )}

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleVerificar}
              className="px-5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium transition-colors"
            >
              Verificar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}