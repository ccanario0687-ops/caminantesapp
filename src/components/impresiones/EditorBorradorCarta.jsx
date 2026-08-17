import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Plus, Trash2, Save, X, GripVertical, ChevronDown
} from "lucide-react";
import { toast } from "sonner";

// ── Variables disponibles ────────────────────────────────────
const VARIABLES = [
  { label: "Nombre", token: "{{nombre}}" },
  { label: "Parroquia", token: "{{parroquia}}" },
  { label: "Mesa", token: "{{numero_mesa}}" },
  { label: "Habitación", token: "{{numero_habitacion}}" },
  { label: "Rol", token: "{{rol}}" },
  { label: "Nombre Retiro", token: "{{nombre_retiro}}" },
  { label: "Edición", token: "{{edicion}}" },
  { label: "Fecha Inicio", token: "{{fecha_inicio}}" },
  { label: "Lugar", token: "{{lugar}}" },
  { label: "Fecha Hoy", token: "{{fecha_hoy}}" },
];

const FONTS = [
  "Georgia, serif",
  "Arial, sans-serif",
  "'Times New Roman', serif",
  "Verdana, sans-serif",
  "'Palatino Linotype', serif",
  "Garamond, serif",
];
const FONT_LABELS = {
  "Georgia, serif": "Georgia",
  "Arial, sans-serif": "Arial",
  "'Times New Roman', serif": "Times New Roman",
  "Verdana, sans-serif": "Verdana",
  "'Palatino Linotype', serif": "Palatino",
  "Garamond, serif": "Garamond",
};

// Tipos de bloque para carta profesional
const TIPOS_BLOQUE_CARTA = [
  { val: "encabezado", label: "🖼️ Encabezado (logo + retiro)" },
  { val: "fecha",      label: "📅 Fecha y lugar" },
  { val: "saludo",     label: "👋 Saludo" },
  { val: "parrafo",    label: "📝 Párrafo" },
  { val: "firma",      label: "✍️ Firma" },
  { val: "separador",  label: "─── Separador" },
];

function resolverTokens(texto, persona, config) {
  if (!texto) return "";
  const hoy = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  return texto
    .replace(/{{nombre}}/g, persona?.nombre || "")
    .replace(/{{parroquia}}/g, persona?.parroquia || "")
    .replace(/{{numero_mesa}}/g, persona?.numero_mesa || "")
    .replace(/{{numero_habitacion}}/g, persona?.numero_habitacion || "")
    .replace(/{{rol}}/g, persona?.rol || persona?.rol_en_mesa || "")
    .replace(/{{nombre_retiro}}/g, config?.nombre_retiro || "Retiro de Emaús")
    .replace(/{{edicion}}/g, config?.edicion ? `Edición #${config.edicion}` : "")
    .replace(/{{fecha_inicio}}/g, config?.fecha_inicio || "")
    .replace(/{{lugar}}/g, config?.lugar || "")
    .replace(/{{fecha_hoy}}/g, hoy);
}

// ── Bloques por defecto para una carta profesional ──────────
const defaultBloquesCarta = (config) => [
  {
    id: "__enc__", tipo: "encabezado",
    mostrarLogo: true,
    nombreRetiro: config?.nombre_retiro || "Retiro de Emaús",
    edicion: config?.edicion ? `Edición #${config.edicion}` : "",
    color: "#78350f",
    borderColor: "#92400e",
    align: "center",
  },
  {
    id: "__fecha__", tipo: "fecha",
    texto: "{{lugar}}, {{fecha_hoy}}",
    fontFamily: "Georgia, serif", fontSize: 11, color: "#374151",
    bold: false, italic: false, underline: false, align: "right",
    marginTop: 16, marginBottom: 8,
  },
  {
    id: "__saludo__", tipo: "saludo",
    texto: "Querido(a) {{nombre}},",
    fontFamily: "Georgia, serif", fontSize: 12, color: "#1c1917",
    bold: false, italic: false, underline: false, align: "left",
    marginTop: 8, marginBottom: 6,
  },
  {
    id: "__p1__", tipo: "parrafo",
    texto: "Con gran alegría te damos la bienvenida a este retiro. Este fin de semana es un regalo especial para ti, un tiempo para encontrarte con Dios y con tu comunidad de fe.",
    fontFamily: "Georgia, serif", fontSize: 12, color: "#1c1917",
    bold: false, italic: false, underline: false, align: "justify",
    marginTop: 8, marginBottom: 6, lineHeight: 1.8,
  },
  {
    id: "__p2__", tipo: "parrafo",
    texto: "Dios te ha llamado por tu nombre para vivir esta experiencia de Emaús. Que tu corazón esté abierto a recibir todo lo que el Señor tiene preparado para ti.",
    fontFamily: "Georgia, serif", fontSize: 12, color: "#1c1917",
    bold: false, italic: false, underline: false, align: "justify",
    marginTop: 8, marginBottom: 6, lineHeight: 1.8,
  },
  {
    id: "__firma__", tipo: "firma",
    texto: "Con cariño en Cristo,\n\nEl Equipo de Emaús",
    fontFamily: "Georgia, serif", fontSize: 12, color: "#1c1917",
    bold: false, italic: false, underline: false, align: "left",
    marginTop: 24, marginBottom: 0,
  },
];

// ── Render de un bloque de carta ─────────────────────────────
function BloqueCartaRender({ bloque, persona, config, escala = 1 }) {
  if (bloque.tipo === "encabezado") {
    const DEFAULT_LOGO_EMAUS = "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/28de3e4eb_logoemauscircular.png";
    const logoUrl = config?.logo_url || config?.logo_hombres_url || config?.logo_mujeres_url || DEFAULT_LOGO_EMAUS;
    return (
      <div style={{ textAlign: bloque.align || "center", borderBottom: `2px solid ${bloque.borderColor || "#92400e"}44`, paddingBottom: "12px", marginBottom: "12px" }}>
        {bloque.mostrarLogo && (
          <img 
            src={logoUrl} 
            alt="Logo Emaús" 
            crossOrigin="anonymous"
            onError={(e) => { e.currentTarget.src = DEFAULT_LOGO_EMAUS; }}
            style={{ height: `${40 * escala}px`, objectFit: "contain", margin: "0 auto 6px", display: "block" }} 
          />
        )}
        <p style={{ margin: 0, fontWeight: "900", fontSize: `${11 * escala}px`, textTransform: "uppercase", letterSpacing: "3px", color: bloque.color || "#78350f" }}>
          {bloque.nombreRetiro || config?.nombre_retiro || "Retiro de Emaús"}
        </p>
        {bloque.edicion && (
          <p style={{ margin: "2px 0 0", fontSize: `${10 * escala}px`, color: bloque.color || "#78350f", opacity: 0.7 }}>{bloque.edicion}</p>
        )}
      </div>
    );
  }

  if (bloque.tipo === "separador") {
    return <hr style={{ border: "none", borderTop: `1px dashed #d1d5db`, margin: "12px 0" }} />;
  }

  const texto = resolverTokens(bloque.texto || "", persona, config);
  if (!texto.trim()) return null;

  return (
    <div style={{
      fontFamily: bloque.fontFamily || "Georgia, serif",
      fontSize: `${(bloque.fontSize || 12) * escala}px`,
      fontWeight: bloque.bold ? "bold" : "normal",
      fontStyle: bloque.italic ? "italic" : "normal",
      textDecoration: bloque.underline ? "underline" : "none",
      textAlign: bloque.align || "justify",
      color: bloque.color || "#1c1917",
      marginTop: `${(bloque.marginTop || 8) * escala}px`,
      marginBottom: `${(bloque.marginBottom || 4) * escala}px`,
      lineHeight: bloque.lineHeight || 1.7,
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
    }}>
      {texto}
    </div>
  );
}

// ── Editor de bloque encabezado de carta ─────────────────────
function EditorEncabezadoPanel({ bloque, onChange }) {
  const set = (k, v) => onChange({ ...bloque, [k]: v });
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Nombre del Retiro</label>
        <input type="text" value={bloque.nombreRetiro} onChange={e => set("nombreRetiro", e.target.value)}
          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Edición</label>
        <input type="text" value={bloque.edicion} onChange={e => set("edicion", e.target.value)}
          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Color texto encabezado" value={bloque.color} onChange={v => set("color", v)} />
        <ColorField label="Color línea divisoria" value={bloque.borderColor} onChange={v => set("borderColor", v)} />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[{val:"left",icon:AlignLeft},{val:"center",icon:AlignCenter},{val:"right",icon:AlignRight}].map(({val, icon:Icon}) => (
            <button key={val} onClick={() => set("align", val)}
              className={`px-2.5 py-1.5 ${bloque.align === val ? "bg-amber-700 text-white" : "bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={bloque.mostrarLogo !== false} onChange={e => set("mostrarLogo", e.target.checked)}
            className="w-4 h-4 accent-amber-700" />
          Mostrar logo
        </label>
      </div>
    </div>
  );
}

// ── Editor de bloque texto de carta ─────────────────────────
function EditorTextoCartaPanel({ bloque, onChange }) {
  const [showVarMenu, setShowVarMenu] = useState(false);
  const set = (k, v) => onChange({ ...bloque, [k]: v });
  const insertarVar = (token) => { set("texto", (bloque.texto || "") + token); setShowVarMenu(false); };

  return (
    <div className="space-y-3">
      {/* Tipo de bloque */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tipo de bloque</label>
        <select value={bloque.tipo} onChange={e => set("tipo", e.target.value)}
          className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
          {TIPOS_BLOQUE_CARTA.filter(t => t.val !== "encabezado" && t.val !== "separador").map(t => (
            <option key={t.val} value={t.val}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Texto */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-500">Contenido</label>
          <div className="relative">
            <button onClick={() => setShowVarMenu(v => !v)}
              className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded border border-amber-200 font-medium">
              + Variable <ChevronDown className="w-3 h-3" />
            </button>
            {showVarMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-amber-200 rounded-xl shadow-xl z-10 p-2 w-48 grid grid-cols-2 gap-1">
                {VARIABLES.map(v => (
                  <button key={v.token} onClick={() => insertarVar(v.token)}
                    className="text-left text-xs px-2 py-1.5 hover:bg-amber-50 rounded-lg text-amber-800 font-medium truncate">
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <textarea value={bloque.texto} onChange={e => set("texto", e.target.value)} rows={4}
          placeholder="Escribe el contenido..."
          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-y" />
      </div>

      {/* Formato */}
      <div className="flex flex-wrap gap-2">
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[{key:"bold",icon:Bold},{key:"italic",icon:Italic},{key:"underline",icon:Underline}].map(({key, icon:Icon}) => (
            <button key={key} onClick={() => set(key, !bloque[key])}
              className={`px-2.5 py-1.5 ${bloque[key] ? "bg-amber-700 text-white" : "bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[{val:"left",icon:AlignLeft},{val:"center",icon:AlignCenter},{val:"right",icon:AlignRight},{val:"justify",icon:AlignJustify}].map(({val, icon:Icon}) => (
            <button key={val} onClick={() => set("align", val)}
              className={`px-2.5 py-1.5 ${bloque.align === val ? "bg-amber-700 text-white" : "bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Fuente + tamaño + interlineado */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Fuente</label>
          <select value={bloque.fontFamily} onChange={e => set("fontFamily", e.target.value)}
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
            {FONTS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tamaño</label>
          <input type="number" min="8" max="24" value={bloque.fontSize}
            onChange={e => set("fontSize", Number(e.target.value))}
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ColorField label="Color texto" value={bloque.color} onChange={v => set("color", v)} />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Interlineado</label>
          <input type="number" min="1" max="3" step="0.1" value={bloque.lineHeight || 1.7}
            onChange={e => set("lineHeight", parseFloat(e.target.value))}
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Esp. arriba</label>
          <input type="number" min="0" max="60" value={bloque.marginTop}
            onChange={e => set("marginTop", Number(e.target.value))}
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
      </div>

      {/* Mini preview del texto */}
      <div className="bg-white border border-amber-100 rounded-lg p-3" style={{ minHeight: "40px" }}>
        <span style={{
          fontFamily: bloque.fontFamily, fontSize: "13px",
          fontWeight: bloque.bold ? "bold" : "normal",
          fontStyle: bloque.italic ? "italic" : "normal",
          textDecoration: bloque.underline ? "underline" : "none",
          color: bloque.color, lineHeight: bloque.lineHeight || 1.7,
          whiteSpace: "pre-wrap",
        }}>
          {bloque.texto ? bloque.texto.slice(0, 100) + (bloque.texto.length > 100 ? "…" : "") : "Texto de ejemplo"}
        </span>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function EditorBorradorCarta({ config, configId, tipoDoc, estilosIniciales, onGuardado, onCerrar }) {
  const borradorInicial = estilosIniciales?.borrador || null;
  const [bloques, setBloques] = useState(() => borradorInicial || defaultBloquesCarta(config));
  const [selIdx, setSelIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const personaEjemplo = {
    nombre: "Juan Pérez García",
    parroquia: "Parroquia Santa Cruz",
    numero_mesa: "3", numero_habitacion: "7",
    rol: "Caminante",
  };

  const sel = bloques[selIdx];

  const updateBloque = (idx, nb) => setBloques(prev => prev.map((b, i) => i === idx ? nb : b));

  const addBloque = (tipo = "parrafo") => {
    const nuevo = {
      id: Date.now(), tipo,
      texto: tipo === "separador" ? "" : "",
      fontFamily: "Georgia, serif", fontSize: 12, color: "#1c1917",
      bold: false, italic: false, underline: false,
      align: tipo === "fecha" ? "right" : tipo === "firma" ? "left" : "justify",
      marginTop: 8, marginBottom: 4, lineHeight: 1.7,
    };
    setBloques(prev => [...prev, nuevo]);
    setSelIdx(bloques.length);
  };

  const removeBloque = (idx) => {
    setBloques(prev => prev.filter((_, i) => i !== idx));
    setSelIdx(Math.max(0, selIdx - 1));
  };

  const moverBloque = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= bloques.length) return;
    const arr = [...bloques];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setBloques(arr);
    setSelIdx(next);
  };

  const guardar = async () => {
    setSaving(true);
    if (configId) {
      let allEstilos = {};
      try { if (config?.estilos_impresion) allEstilos = JSON.parse(config.estilos_impresion); } catch {}
      allEstilos[tipoDoc] = { ...(allEstilos[tipoDoc] || {}), borrador: bloques, usarBorrador: true };
      await base44.entities.ConfigRetiro.update(configId, { estilos_impresion: JSON.stringify(allEstilos) });
    }
    toast.success("Borrador de carta guardado");
    setSaving(false);
    onGuardado(tipoDoc, { ...estilosIniciales, borrador: bloques, usarBorrador: true });
  };

  const tipoLabel = (tipo) => TIPOS_BLOQUE_CARTA.find(t => t.val === tipo)?.label || tipo;

  return (
    <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-800 text-white">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">✉️ Editor de Carta Profesional</h3>
          <p className="text-amber-200 text-xs mt-0.5">Tamaño carta (8½ × 11 pulg.) · Estructura profesional por bloques</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={guardar} disabled={saving}
            className="flex items-center gap-1.5 bg-amber-100 text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60">
            <Save className="w-3 h-3" /> {saving ? "Guardando..." : "Guardar carta"}
          </button>
          <button onClick={onCerrar} className="text-amber-200 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-amber-100">

        {/* PANEL IZQUIERDO */}
        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: "82vh" }}>

          {/* Lista de bloques */}
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Estructura de la carta</p>
              <div className="flex gap-1">
                {[
                  { tipo: "parrafo", label: "+ Párrafo" },
                  { tipo: "separador", label: "─ Sep." },
                  { tipo: "firma", label: "✍️ Firma" },
                ].map(b => (
                  <button key={b.tipo} onClick={() => addBloque(b.tipo)}
                    className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200 font-semibold">
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {bloques.map((b, idx) => (
              <div key={b.id} onClick={() => setSelIdx(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all ${
                  selIdx === idx ? "bg-amber-50 border-amber-400" : "bg-gray-50 border-gray-200 hover:border-amber-200"
                }`}>
                <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-700">{tipoLabel(b.tipo)}</p>
                  {b.texto && <p className="text-xs text-gray-500 truncate">{b.texto.slice(0, 50)}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); moverBloque(idx, -1); }} className="text-gray-300 hover:text-gray-500 p-0.5">↑</button>
                  <button onClick={e => { e.stopPropagation(); moverBloque(idx, 1); }} className="text-gray-300 hover:text-gray-500 p-0.5">↓</button>
                  <button onClick={e => { e.stopPropagation(); removeBloque(idx); }} className="text-red-300 hover:text-red-500 p-0.5"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Editor del bloque */}
          {sel && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">
                Editando: {tipoLabel(sel.tipo)}
              </p>
              {sel.tipo === "encabezado"
                ? <EditorEncabezadoPanel bloque={sel} onChange={nb => updateBloque(selIdx, nb)} />
                : sel.tipo === "separador"
                  ? <p className="text-xs text-gray-500 italic">Este es un separador decorativo (línea horizontal). No tiene contenido editable.</p>
                  : <EditorTextoCartaPanel bloque={sel} onChange={nb => updateBloque(selIdx, nb)} />
              }
            </div>
          )}
        </div>

        {/* PANEL DERECHO — vista previa carta tamaño carta */}
        <div className="p-4 bg-gray-100 flex flex-col items-center overflow-y-auto" style={{ maxHeight: "82vh" }}>
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3 self-start">Vista previa (tamaño carta)</p>
          {/* Hoja carta escalada */}
          <div style={{ transform: "scale(0.55)", transformOrigin: "top center", width: "816px", marginBottom: "-340px" }}>
            <div style={{
              width: "816px", minHeight: "1056px",
              background: "#fff",
              padding: "72px 80px",
              boxShadow: "0 4px 32px #0003",
              boxSizing: "border-box",
              fontFamily: "Georgia, serif",
            }}>
              {bloques.map((b) => (
                <BloqueCartaRender key={b.id} bloque={b} persona={personaEjemplo} config={config} escala={1} />
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center max-w-xs">Vista previa con datos de ejemplo. Al imprimir se adaptará a cada persona.</p>
        </div>
      </div>
    </div>
  );
}

// ── Export: render carta para impresión ──────────────────────
export function CartaBorrador({ persona, config, bloques, print }) {
  return (
    <div style={{
      fontFamily: "Georgia, serif",
      background: "#fff",
      padding: print ? "18mm 20mm" : "24px 32px",
      boxSizing: "border-box",
      ...(print ? { pageBreakInside: "avoid" } : { border: "1px solid #e5e7eb", borderRadius: "8px" }),
    }}>
      {bloques.map((b) => (
        <BloqueCartaRender key={b.id} bloque={b} persona={persona} config={config} escala={print ? 1 : 1} />
      ))}
    </div>
  );
}

// ── Helper ───────────────────────────────────────────────────
function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-amber-200 p-0.5 flex-shrink-0" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-amber-200 rounded px-1.5 py-1 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-amber-400" />
      </div>
    </div>
  );
}