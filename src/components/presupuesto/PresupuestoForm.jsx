import { useState, useEffect } from "react";
import { X, Save, FileText } from "lucide-react";
import MobileSelect from "@/components/MobileSelect";

const FORM_EMPTY = { nombre: "", numero_retiro: "", estado: "Borrador", notas: "" };

const ESTADOS = ["Borrador", "En Revisión", "Aprobado", "Ejecutado"];

export default function PresupuestoForm({ presupuesto, onGuardado, onCerrar }) {
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(presupuesto ? { ...FORM_EMPTY, ...presupuesto } : FORM_EMPTY);
  }, [presupuesto]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre) return;
    setSaving(true);
    await onGuardado({ ...form, numero_retiro: Number(form.numero_retiro) || null }, presupuesto?.id);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-amber-700 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {presupuesto ? "Editar Presupuesto" : "Nuevo Presupuesto"}
          </h2>
          <button onClick={onCerrar}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-amber-800 mb-1">Nombre del Presupuesto *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              placeholder="Ej: Presupuesto Retiro #12 — Hombres"
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Número de Retiro</label>
              <input type="number" name="numero_retiro" value={form.numero_retiro} onChange={handleChange}
                placeholder="Ej: 12"
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Estado</label>
              <MobileSelect
                name="estado"
                value={form.estado}
                onChange={(v) => handleChange({ target: { name: "estado", value: v } })}
                options={ESTADOS.map(e => ({ value: e, label: e }))}
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-800 mb-1">Notas</label>
            <textarea name="notas" value={form.notas} onChange={handleChange} rows={3}
              placeholder="Observaciones generales del presupuesto..."
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-amber-50">
            <button type="button" onClick={onCerrar}
              className="px-4 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm hover:bg-amber-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}