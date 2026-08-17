import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const DEFAULTS_DISTINTIVO = {
  // Márgenes
  margenImpresion: 10,
  // Colores
  headerBgInicio: "#78350f",
  headerBgFin: "#b45309",
  headerTextColor: "#ffffff",
  fondoNumero: "#fef3c7",
  colorNumero: "#78350f",
  borderColor: "#92400e",
  colorNombre: "#1c1917",
  fondoPar: "#fffbeb",
  fondoImpar: "#fef3c7",
  // Tipografía
  fontFamily: "Georgia, serif",
  // Contenido
  mostrarLogo: true,
  mostrarEdicion: true,
  mostrarCruz: true,
  textoPie: "peregrino(s) en camino · Emaús",
  etiquetaHabitacion: "Habitación",
};

const FONT_OPTIONS = [
  { label: "Georgia (Serif)", value: "Georgia, serif" },
  { label: "Arial (Sans-serif)", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Palatino", value: "'Palatino Linotype', Palatino, serif" },
];

export default function ConfiguracionDistintivos({ config, configId, estilosIniciales, onGuardado }) {
  const [estilos, setEstilos] = useState({ ...DEFAULTS_DISTINTIVO, ...estilosIniciales });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEstilos({ ...DEFAULTS_DISTINTIVO, ...estilosIniciales });
  }, []);

  const set = (key, val) => setEstilos(prev => ({ ...prev, [key]: val }));

  const guardar = async () => {
    setSaving(true);
    if (configId) {
      let allEstilos = {};
      try { if (config?.estilos_impresion) allEstilos = JSON.parse(config.estilos_impresion); } catch {}
      allEstilos["distintivo"] = estilos;
      await base44.entities.ConfigRetiro.update(configId, { estilos_impresion: JSON.stringify(allEstilos) });
    }
    toast.success("Diseño guardado");
    setSaving(false);
    onGuardado(estilos);
  };

  const restaurar = () => {
    setEstilos({ ...DEFAULTS_DISTINTIVO });
    toast("Estilos restaurados a valores predeterminados");
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Diseño del Distintivo</p>
        <div className="flex gap-2">
          <button onClick={restaurar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-medium">
            <RefreshCw className="w-3 h-3" /> Restaurar
          </button>
          <button onClick={guardar} disabled={saving}
            className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60">
            <Save className="w-3 h-3" />
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Colores encabezado */}
        <Section title="🎨 Encabezado">
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Gradiente inicio" value={estilos.headerBgInicio} onChange={v => set("headerBgInicio", v)} />
            <ColorField label="Gradiente fin" value={estilos.headerBgFin} onChange={v => set("headerBgFin", v)} />
            <ColorField label="Texto encabezado" value={estilos.headerTextColor} onChange={v => set("headerTextColor", v)} />
            <ColorField label="Color borde" value={estilos.borderColor} onChange={v => set("borderColor", v)} />
          </div>
        </Section>

        {/* Colores número + lista */}
        <Section title="🔢 Número y Lista">
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Fondo área número" value={estilos.fondoNumero} onChange={v => set("fondoNumero", v)} />
            <ColorField label="Color número" value={estilos.colorNumero} onChange={v => set("colorNumero", v)} />
            <ColorField label="Fondo fila par" value={estilos.fondoPar} onChange={v => set("fondoPar", v)} />
            <ColorField label="Fondo fila impar" value={estilos.fondoImpar} onChange={v => set("fondoImpar", v)} />
            <ColorField label="Color nombres" value={estilos.colorNombre} onChange={v => set("colorNombre", v)} />
          </div>
        </Section>

        {/* Márgenes */}
        <Section title="📐 Márgenes de Impresión">
          <Field label="Margen en todos los lados (mm)">
            <div className="flex items-center gap-3">
              <input
                type="range" min="0" max="30" step="1"
                value={estilos.margenImpresion ?? 10}
                onChange={e => set("margenImpresion", Number(e.target.value))}
                className="flex-1 accent-amber-700"
              />
              <input
                type="number" min="0" max="30"
                value={estilos.margenImpresion ?? 10}
                onChange={e => set("margenImpresion", Number(e.target.value))}
                className={`${inputCls} w-20 text-center`}
              />
              <span className="text-xs text-gray-500 flex-shrink-0">mm</span>
            </div>
          </Field>
          <p className="text-xs text-gray-400">Se aplica igual en los 4 lados de cada hoja impresa.</p>
        </Section>

        {/* Tipografía */}
        <Section title="🔤 Tipografía">
          <Field label="Fuente">
            <select value={estilos.fontFamily} onChange={e => set("fontFamily", e.target.value)} className={inputCls}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>
        </Section>

        {/* Contenido */}
        <Section title="📋 Contenido">
          <Field label="Etiqueta habitación">
            <input type="text" value={estilos.etiquetaHabitacion}
              onChange={e => set("etiquetaHabitacion", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Texto pie de página">
            <input type="text" value={estilos.textoPie}
              onChange={e => set("textoPie", e.target.value)} className={inputCls} />
          </Field>
          <div className="space-y-2 pt-1">
            {[
              { key: "mostrarLogo", label: "Mostrar logo" },
              { key: "mostrarEdicion", label: "Mostrar edición" },
              { key: "mostrarCruz", label: "Mostrar símbolo ✝" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={estilos[key] !== false} onChange={e => set(key, e.target.checked)}
                  className="w-4 h-4 accent-amber-700 cursor-pointer" />
                <span className="text-xs text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-amber-100 p-3 space-y-3">
      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-amber-200 p-0.5 flex-shrink-0" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-amber-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-mono" />
      </div>
    </div>
  );
}