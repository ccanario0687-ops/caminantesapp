import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Save } from "lucide-react";
import { toast } from "sonner";
import MobileSelect from "@/components/MobileSelect";

const TIPOS_MOVIMIENTO = [
  { value: "donacion", label: "Donación" },
  { value: "ingreso", label: "Ingreso" },
  { value: "gasto", label: "Gasto" }
];

export default function FormOtrosMovimientos({ numeroRetiro, onGuardado, currentUser }) {
  const [form, setForm] = useState({
    tipo: "donacion",
    descripcion: "",
    monto: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.descripcion || !form.monto) {
      toast.error("Completa todos los campos");
      return;
    }
    setSaving(true);
    const registradoPor = currentUser?.username || currentUser?.full_name || currentUser?.email || "Sistema";
    await base44.entities.MovimientoFinanciero.create({
      tipo: form.tipo,
      descripcion: form.descripcion,
      monto: Number(form.monto),
      numero_retiro: numeroRetiro,
      fecha: new Date().toISOString().split("T")[0],
      registrado_por: registradoPor,
      equipo_id: currentUser?.equipo_id,
    });
    toast.success("Movimiento registrado");
    setForm({ tipo: "donacion", descripcion: "", monto: "" });
    onGuardado();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-amber-100 p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-amber-800 mb-1">Tipo</label>
          <MobileSelect
            name="tipo"
            value={form.tipo}
            onChange={(v) => handleChange({ target: { name: "tipo", value: v } })}
            options={TIPOS_MOVIMIENTO}
            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-amber-800 mb-1">Descripción</label>
          <input
            type="text"
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Ej: Donación anónima"
            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-amber-800 mb-1">Monto (RD$)</label>
            <input
              type="number"
              name="monto"
              value={form.monto}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>
    </form>
  );
}