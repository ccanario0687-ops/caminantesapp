import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Upload, Eye, Monitor, Palette, Type, Image } from "lucide-react";
import { toast } from "sonner";
import PortadaPreview from "@/components/portada/PortadaPreview";

const DEFAULTS = {
  titulo: "Hermandad de Emaús",
  subtitulo: "Lucas 24, 13-35",
  versiculo: "¿No ardía nuestro corazón mientras nos hablaba en el camino y nos explicaba las Escrituras?",
  versiculo_referencia: "Lucas 24, 32",
  foto_fondo_url: "",
  foto_principal_url: "https://images.unsplash.com/photo-1548625149-720fb8b2e8f4?w=600&q=80",
  color_fondo_inicio: "#5c1a00",
  color_fondo_medio: "#8B1a1a",
  color_fondo_fin: "#b8860b",
  color_titulo: "#ffffff",
  color_subtitulo: "#fcd34d",
  color_boton: "#f59e0b",
  texto_boton: "Ingresar al Sistema",
  mostrar_imagen_circular: true,
};

export default function ConfigPortada() {
  const [form, setForm] = useState(DEFAULTS);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // 'fondo' | 'principal'

  useEffect(() => {
    base44.entities.ConfigPortada.list().then(data => {
      if (data.length > 0) {
        setForm({ ...DEFAULTS, ...data[0] });
        setConfigId(data[0].id);
      }
      setLoading(false);
    });
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(field);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set(field, file_url);
    setUploading(null);
    toast.success("Imagen subida correctamente");
  };

  const handleSave = async () => {
    setSaving(true);
    if (configId) {
      await base44.entities.ConfigPortada.update(configId, form);
    } else {
      const created = await base44.entities.ConfigPortada.create(form);
      setConfigId(created.id);
    }
    toast.success("¡Portada guardada!");
    setSaving(false);
  };



  if (loading) return <div className="py-20 text-center text-amber-600">Cargando...</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
            <Monitor className="w-6 h-6" /> Configuración de Portada
          </h1>
          <p className="text-amber-600 text-sm mt-1">
            Personaliza la página de bienvenida de <strong>caminantesapp.com</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/bienvenida"
            target="_blank"
            className="flex items-center gap-2 border border-amber-300 text-amber-700 hover:bg-amber-50 px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Eye className="w-4 h-4" /> Ver Portada
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de edición */}
        <div className="space-y-4">

          {/* Textos */}
          <Section title="Textos" icon={<Type className="w-4 h-4" />}>
            <Field label="Título principal">
              <input value={form.titulo} onChange={e => set("titulo", e.target.value)}
                className={inp} placeholder="Hermandad de Emaús" />
            </Field>
            <Field label="Subtítulo / Eslogan">
              <input value={form.subtitulo} onChange={e => set("subtitulo", e.target.value)}
                className={inp} placeholder="Lucas 24, 13-35" />
            </Field>
            <Field label="Versículo bíblico">
              <textarea value={form.versiculo} onChange={e => set("versiculo", e.target.value)}
                rows={3} className={inp} placeholder="Texto del versículo..." />
            </Field>
            <Field label="Referencia del versículo">
              <input value={form.versiculo_referencia} onChange={e => set("versiculo_referencia", e.target.value)}
                className={inp} placeholder="Ej: Lucas 24, 32" />
            </Field>
            <Field label="Texto del botón de ingreso">
              <input value={form.texto_boton} onChange={e => set("texto_boton", e.target.value)}
                className={inp} placeholder="Ingresar al Sistema" />
            </Field>
          </Section>

          {/* Imágenes */}
          <Section title="Imágenes" icon={<Image className="w-4 h-4" />}>
            <Field label="Imagen de fondo (opcional)">
              <div className="flex items-center gap-3">
                {form.foto_fondo_url && (
                  <img src={form.foto_fondo_url} alt="Fondo" className="w-16 h-12 object-cover rounded-lg border border-amber-200" />
                )}
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-medium">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading === "foto_fondo_url" ? "Subiendo..." : "Subir imagen"}
                    <input type="file" accept="image/*" onChange={e => handleUpload(e, "foto_fondo_url")} className="hidden" />
                  </label>
                  {form.foto_fondo_url && (
                    <button onClick={() => set("foto_fondo_url", "")}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 border border-red-200 rounded-lg">
                      Quitar
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-amber-500 mt-1">Si no hay imagen de fondo, se usará el gradiente de colores.</p>
            </Field>

            <Field label="Foto circular central">
              <div className="flex items-center gap-3">
                {form.foto_principal_url && (
                  <img src={form.foto_principal_url} alt="Principal" className="w-14 h-14 object-cover rounded-full border-2 border-amber-300" />
                )}
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-medium">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading === "foto_principal_url" ? "Subiendo..." : "Subir foto"}
                    <input type="file" accept="image/*" onChange={e => handleUpload(e, "foto_principal_url")} className="hidden" />
                  </label>
                  {form.foto_principal_url && (
                    <button onClick={() => set("foto_principal_url", "")}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 border border-red-200 rounded-lg">
                      Quitar
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="mostrar_circ" checked={!!form.mostrar_imagen_circular}
                  onChange={e => set("mostrar_imagen_circular", e.target.checked)}
                  className="rounded border-amber-300" />
                <label htmlFor="mostrar_circ" className="text-xs text-amber-700">Mostrar imagen circular</label>
              </div>
            </Field>

            <Field label="O pega una URL de imagen (foto circular)">
              <input value={form.foto_principal_url} onChange={e => set("foto_principal_url", e.target.value)}
                className={inp} placeholder="https://..." />
            </Field>
          </Section>

          {/* Colores */}
          <Section title="Colores" icon={<Palette className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-4">
              <ColorField label="Fondo inicio" value={form.color_fondo_inicio} onChange={v => set("color_fondo_inicio", v)} />
              <ColorField label="Fondo medio" value={form.color_fondo_medio} onChange={v => set("color_fondo_medio", v)} />
              <ColorField label="Fondo final" value={form.color_fondo_fin} onChange={v => set("color_fondo_fin", v)} />
              <ColorField label="Color título" value={form.color_titulo} onChange={v => set("color_titulo", v)} />
              <ColorField label="Color subtítulo" value={form.color_subtitulo} onChange={v => set("color_subtitulo", v)} />
              <ColorField label="Color botón" value={form.color_boton} onChange={v => set("color_boton", v)} />
            </div>
            <p className="text-xs text-amber-500 mt-2">💡 Los colores de fondo solo aplican si no hay imagen de fondo.</p>
          </Section>
        </div>

        {/* Vista previa */}
        <div className="lg:sticky lg:top-4 self-start">
          <PortadaPreview config={form} />
        </div>
      </div>
    </div>
  );
}

const inp = "w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400";

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4">
      <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2 border-b border-amber-100 pb-2">
        <span className="text-amber-600">{icon}</span> {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-amber-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-amber-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-amber-200 cursor-pointer p-0.5" />
        <input type="text" value={value || ""} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-amber-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
          placeholder="#000000" />
      </div>
    </div>
  );
}