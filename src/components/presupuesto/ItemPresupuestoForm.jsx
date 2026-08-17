import { useState, useEffect } from "react";
import { X, Save, Package } from "lucide-react";
import MobileSelect from "@/components/MobileSelect";

const CATEGORIAS = [
  "Alimentos y Bebidas",
  "Materiales Espirituales",
  "Uniformes y Vestimenta",
  "Logística y Transporte",
  "Sonido y Audiovisual",
  "Papelería e Imprenta",
  "Decoración",
  "Tecnología",
  "Misceláneos",
];

const UNIDADES = ["unidad", "caja", "paquete", "kg", "litro", "galón", "metro", "par", "docena", "rollo"];

const FORM_EMPTY = {
  nombre: "", categoria: "Alimentos y Bebidas", unidad: "unidad",
  cantidad_presupuestada: "", cantidad_en_existencia: "", costo_unitario: "",
  suplidor_nombre: "", prioridad: "Media", notas: "", completado: false,
};

export default function ItemPresupuestoForm({ item, presupuestoId, onGuardado, onCerrar, suplidores = [] }) {
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({ ...FORM_EMPTY, ...item });
    } else {
      setForm(FORM_EMPTY);
    }
  }, [item]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.categoria) return;
    setSaving(true);
    const data = {
      ...form,
      presupuesto_id: presupuestoId,
      cantidad_presupuestada: Number(form.cantidad_presupuestada) || 0,
      cantidad_en_existencia: Number(form.cantidad_en_existencia) || 0,
      costo_unitario: Number(form.costo_unitario) || 0,
    };
    await onGuardado(data, item?.id);
    setSaving(false);
  };

  const cantPresup = Number(form.cantidad_presupuestada) || 0;
  const cantExist = Number(form.cantidad_en_existencia) || 0;
  const costoUnit = Number(form.costo_unitario) || 0;
  const diferencia = Math.max(0, cantPresup - cantExist);
  const costoTotal = cantPresup * costoUnit;
  const costoAdicional = diferencia * costoUnit;

  const fmt = (n) => new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", minimumFractionDigits: 2 }).format(n);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="bg-amber-700 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <Package className="w-4 h-4" />
            {item ? "Editar Ítem" : "Agregar Ítem al Presupuesto"}
          </h2>
          <button onClick={onCerrar}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Nombre y categoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-amber-800 mb-1">Nombre del Ítem *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required
                placeholder="Ej: Biblia, Agua 5 litros, Gafetes..."
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Categoría *</label>
              <MobileSelect
                name="categoria"
                value={form.categoria}
                onChange={(v) => handleChange({ target: { name: "categoria", value: v } })}
                options={CATEGORIAS.map(c => ({ value: c, label: c }))}
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Unidad de Medida</label>
              <MobileSelect
                name="unidad"
                value={form.unidad}
                onChange={(v) => handleChange({ target: { name: "unidad", value: v } })}
                options={UNIDADES.map(u => ({ value: u, label: u }))}
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Cantidades y costo */}
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">Cantidades y Costos</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cant. Presupuestada</label>
                <input type="number" name="cantidad_presupuestada" value={form.cantidad_presupuestada}
                  onChange={handleChange} min="0" placeholder="0"
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cant. en Existencia</label>
                <input type="number" name="cantidad_en_existencia" value={form.cantidad_en_existencia}
                  onChange={handleChange} min="0" placeholder="0"
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Costo Unitario (RD$)</label>
                <input type="number" name="costo_unitario" value={form.costo_unitario}
                  onChange={handleChange} min="0" step="0.01" placeholder="0.00"
                  className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>

            {/* Cálculos en tiempo real */}
            {(cantPresup > 0 || costoUnit > 0) && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg p-2 text-center border border-amber-100">
                  <p className="text-xs text-gray-500">Diferencia</p>
                  <p className={`text-sm font-bold ${diferencia > 0 ? "text-red-600" : "text-green-600"}`}>
                    {diferencia > 0 ? `−${diferencia}` : "✓ OK"} {form.unidad}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-amber-100">
                  <p className="text-xs text-gray-500">Costo Total</p>
                  <p className="text-sm font-bold text-amber-700">{fmt(costoTotal)}</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border border-amber-100">
                  <p className="text-xs text-gray-500">Adicional Requerido</p>
                  <p className={`text-sm font-bold ${costoAdicional > 0 ? "text-red-600" : "text-green-600"}`}>
                    {fmt(costoAdicional)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Prioridad, suplidor, completado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Prioridad</label>
              <MobileSelect
                name="prioridad"
                value={form.prioridad}
                onChange={(v) => handleChange({ target: { name: "prioridad", value: v } })}
                options={[{ value: "Alta", label: "🔴 Alta" }, { value: "Media", label: "🟡 Media" }, { value: "Baja", label: "🟢 Baja" }]}
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Suplidor Sugerido</label>
              <input name="suplidor_nombre" value={form.suplidor_nombre} onChange={handleChange}
                placeholder="Nombre del proveedor..."
                list="suplidores-lista"
                className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <datalist id="suplidores-lista">
                {suplidores.map(s => <option key={s.id} value={s.nombre} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-800 mb-1">Notas</label>
            <textarea name="notas" value={form.notas} onChange={handleChange} rows={2}
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="completado" checked={form.completado} onChange={handleChange}
              id="completado-check" className="w-4 h-4 accent-amber-700" />
            <label htmlFor="completado-check" className="text-sm text-gray-700 font-medium">Marcar como adquirido/completado</label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-amber-50">
            <button type="button" onClick={onCerrar}
              className="px-4 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm hover:bg-amber-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar Ítem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}