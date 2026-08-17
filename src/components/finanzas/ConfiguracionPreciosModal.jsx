import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Save } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracionPreciosModal({ config, configId, onClose, onGuardado }) {
  const [form, setForm] = useState({
    precio_ficha_caminante: config?.precio_ficha_caminante || 0,
    precio_ficha_servidor: config?.precio_ficha_servidor || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: Number(value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (configId) {
      await base44.entities.ConfigFinanza.update(configId, form);
    } else {
      await base44.entities.ConfigFinanza.create(form);
    }
    toast.success("Precios actualizados");
    onGuardado();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between bg-amber-700 text-white px-5 py-4 rounded-t-xl">
          <h2 className="text-lg font-bold">Configurar Precios de Fichas</h2>
          <button onClick={onClose} className="hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Precio Ficha Caminante</label>
            <input
              type="number"
              name="precio_ficha_caminante"
              value={form.precio_ficha_caminante}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Precio Ficha Servidor</label>
            <input
              type="number"
              name="precio_ficha_servidor"
              value={form.precio_ficha_servidor}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}