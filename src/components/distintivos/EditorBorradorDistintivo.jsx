import { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Plus, Trash2, Save, X, GripVertical, ChevronDown
} from "lucide-react";
import { toast } from "sonner";

// ── Variables disponibles ────────────────────────────────────
const VARIABLES = [
  { label: "N° Habitación", token: "{{numero_habitacion}}" },
  { label: "Nombre Retiro", token: "{{nombre_retiro}}" },
  { label: "Edición", token: "{{edicion}}" },
  { label: "Lugar", token: "{{lugar}}" },
  { label: "Fecha Inicio", token: "{{fecha_inicio}}" },
];

const VARS_PERSONA = [
  { label: "Nombre", token: "{{nombre}}" },
  { label: "Parroquia", token: "{{parroquia}}" },
  { label: "Mesa", token: "{{numero_mesa}}" },
];

const FONTS = [
  "Georgia, serif",
  "Arial, sans-serif",
  "'Times New Roman', serif",
  "Verdana, sans-serif",
  "'Palatino Linotype', serif",
  "Impact, sans-serif",
];
const FONT_LABELS = {
  "Georgia, serif": "Georgia",
  "Arial, sans-serif": "Arial",
  "'Times New Roman', serif": "Times New Roman",
  "Verdana, sans-serif": "Verdana",
  "'Palatino Linotype', serif": "Palatino",
  "Impact, sans-serif": "Impact",
};

// ── Resolver tokens ───────────────────────────────────────────
function resolverTokens(texto, habitacion, config) {
  if (!texto) return "";
  return texto
    .replace(/{{numero_habitacion}}/g, habitacion?.numero || "7")
    .replace(/{{nombre_retiro}}/g, config?.nombre_retiro || "Retiro de Emaús")
    .replace(/{{edicion}}/g, config?.edicion ? `Edición #${config.edicion}` : "")
    .replace(/{{lugar}}/g, config?.lugar || "")
    .replace(/{{fecha_inicio}}/g, config?.fecha_inicio || "");
}

// ── Bloques por defecto ───────────────────────────────────────
const DEFAULT_BLOQUE_LOGO = (config) => ({
  id: "__logo__",
  tipo: "encabezado",
  nombreRetiro: config?.nombre_retiro || "Retiro de Emaús",
  edicion: config?.edicion ? `Edición #${config.edicion}` : "",
  mostrarLogo: true,
  mostrarEdicion: true,
  bgInicio: "#78350f",
  bgFin: "#b45309",
  textColor: "#ffffff",
  fontFamily: "Georgia, serif",
  fontSize: 13,
  bold: false,
  align: "center",
  paddingV: 16,
});

const DEFAULT_BLOQUE_NUM = () => ({
  id: "__num__",
  tipo: "numero_habitacion",
  etiqueta: "Habitación",
  fontFamily: "Georgia, serif",
  bgColor: "#fef3c7",
  numColor: "#78350f",
  borderColor: "#92400e",
  numFontSize: 140,
  etiquetaFontSize: 11,
});

const DEFAULT_BLOQUE_LISTA = () => ({
  id: "__lista__",
  tipo: "lista_personas",
  fontFamily: "Georgia, serif",
  fontSize: 46,
  lineHeight: 1.15,
  colorNombre: "#1c1917",
  colorNumero: "#92400e",
  fondoPar: "#fffbeb",
  fondoImpar: "#fef3c7",
  mostrarCruz: true,
});

const DEFAULT_BLOQUE_PIE = () => ({
  id: "__pie__",
  tipo: "pie",
  texto: "{{numero_personas}} peregrino(s) en camino · Emaús",
  fontFamily: "Georgia, serif",
  fontSize: 10,
  color: "#92400e",
  bgColor: "#fef3c7",
  bold: false,
  align: "center",
});

const defaultBloques = (config) => [
  DEFAULT_BLOQUE_LOGO(config),
  DEFAULT_BLOQUE_NUM(),
  DEFAULT_BLOQUE_LISTA(),
  DEFAULT_BLOQUE_PIE(),
];

// ── Vista previa del distintivo ───────────────────────────────
function DistintivoPreview({ bloques, config }) {
  const habitacionEjemplo = { numero: 7 };
  const personasEjemplo = [
    { id: 1, nombre: "María González" },
    { id: 2, nombre: "José Martínez" },
    { id: 3, nombre: "Ana Rodríguez" },
  ];

  return (
    <div style={{
      width: "400px",
      background: "#fff",
      boxShadow: "0 6px 24px #0003",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {bloques.map(b => (
        <BloqueRender key={b.id} bloque={b} habitacion={habitacionEjemplo} personas={personasEjemplo} config={config} print={false} />
      ))}
    </div>
  );
}

// ── Renders de cada tipo de bloque ───────────────────────────
export function BloqueRender({ bloque: b, habitacion, personas, config, print }) {
  const logoUrl = config?.logo_url || null;
  const escala = print ? 1 : 0.55;

  if (b.tipo === "encabezado") {
    return (
      <div style={{
        background: `linear-gradient(135deg, ${b.bgInicio}, ${b.bgFin})`,
        color: b.textColor,
        textAlign: b.align || "center",
        padding: print ? `${b.paddingV || 16}px 24px 12px` : "10px 16px 8px",
        flexShrink: 0,
      }}>
        {b.mostrarLogo !== false && (
          logoUrl
            ? <img src={logoUrl} alt="Logo" style={{ height: print ? `${b.logoHeight ?? 48}px` : "32px", objectFit: "contain", margin: "0 auto 6px", display: "block" }} />
            : !print && <div style={{ height: "32px", width: "32px", background: "rgba(255,255,255,0.2)", borderRadius: "4px", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>✝</div>
        )}
        <p style={{
          fontSize: print ? `${b.fontSize || 13}px` : `${Math.max(8, (b.fontSize || 13) * 0.7)}px`,
          fontFamily: b.fontFamily,
          fontWeight: b.bold ? "bold" : "normal",
          letterSpacing: `${b.letterSpacing ?? 3}px`,
          textTransform: "uppercase",
          opacity: 0.95,
          margin: 0,
        }}>
          {resolverTokens(b.nombreRetiro || "{{nombre_retiro}}", habitacion, config)}
        </p>
        {b.mostrarEdicion !== false && (b.edicion || config?.edicion) && (
          <p style={{ fontSize: print ? "10px" : "7px", opacity: 0.7, margin: "2px 0 0" }}>
            {b.edicion || (config?.edicion ? `Edición #${config.edicion}` : "")}
          </p>
        )}
      </div>
    );
  }

  if (b.tipo === "numero_habitacion") {
    const numSize = print ? `${b.numFontSize || 140}px` : `${Math.round((b.numFontSize || 140) * 0.4)}px`;
    const etSize = print ? `${b.etiquetaFontSize || 11}px` : `${Math.round((b.etiquetaFontSize || 11) * 0.7)}px`;
    const pV = print ? `${b.paddingV ?? 8}px` : "5px";
    const bw = b.borderWidth ?? 4;
    return (
      <div style={{
        background: b.bgColor,
        textAlign: "center",
        padding: `${pV} 0`,
        borderBottom: `${bw}px solid ${b.borderColor}`,
        flexShrink: 0,
      }}>
        <p style={{ fontSize: etSize, letterSpacing: `${b.etiquetaSpacing ?? 4}px`, textTransform: "uppercase", color: b.numColor, margin: 0, fontWeight: "bold", fontFamily: b.fontFamily }}>
          {b.etiqueta || "Habitación"}
        </p>
        <p style={{ fontSize: numSize, fontWeight: "900", color: b.numColor, margin: 0, lineHeight: 1, letterSpacing: "-4px", fontFamily: b.fontFamily }}>
          {habitacion?.numero || 7}
        </p>
      </div>
    );
  }

  if (b.tipo === "lista_personas") {
    const n = personas?.length || 3;
    const configuredSize = b.fontSize;
    const adaptiveSize = n <= 4 ? 58 : n <= 6 ? 46 : n <= 8 ? 38 : n <= 10 ? 32 : 26;
    const nameFontSizePx = print ? `${configuredSize || adaptiveSize}px` : (n <= 3 ? "20px" : "16px");
    const lineH = b.lineHeight || 1.15;
    const numFontSz = print ? `${b.numFontSize ?? 20}px` : "11px";
    const pV = print ? `${b.filaPaddingV ?? 8}px` : "3px";
    const pH = print ? `${b.filaPaddingH ?? 24}px` : "8px";
    const gap = print ? `${b.filaGap ?? 8}px` : "3px";
    const radius = `${b.filaRadius ?? 8}px`;
    const bw = b.filaBorderWidth ?? 4;
    const listaPH = print ? `${b.listaPaddingH ?? 40}px` : "12px";
    const listaPTop = print ? `${b.listaPaddingTop ?? 8}px` : "4px";
    return (
      <>
        {b.mostrarCruz !== false && (
          <div style={{ textAlign: "center", fontSize: print ? "18px" : "13px", color: b.colorNumero, padding: print ? "5px 0 3px" : "3px 0", flexShrink: 0 }}>✝</div>
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: `${listaPTop} ${listaPH} 6px`, gap }}>
          {(personas || []).map((p, i) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: print ? "16px" : "8px",
              padding: `${pV} ${pH}`,
              background: i % 2 === 0 ? b.fondoPar : b.fondoImpar,
              borderRadius: radius,
              borderLeft: `${bw}px solid ${b.colorNumero}`,
            }}>
              <span style={{ color: b.colorNumero, fontWeight: "900", fontSize: numFontSz, minWidth: print ? "36px" : "18px", textAlign: "right", fontFamily: b.fontFamily }}>
                {i + 1}.
              </span>
              <span style={{ fontSize: nameFontSizePx, fontWeight: "700", color: b.colorNombre, lineHeight: lineH, fontFamily: b.fontFamily }}>
                {p.nombre}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (b.tipo === "pie") {
    const texto = (b.texto || "").replace(/{{numero_personas}}/g, personas?.length || 3);
    return (
      <div style={{
        background: b.bgColor,
        borderTop: `3px solid ${b.bgColor}`,
        textAlign: b.align || "center",
        padding: print ? "8px" : "5px",
        color: b.color,
        fontSize: print ? `${b.fontSize || 10}px` : `${Math.max(7, (b.fontSize || 10) * 0.8)}px`,
        fontFamily: b.fontFamily,
        fontWeight: b.bold ? "bold" : "normal",
        letterSpacing: "1px",
        flexShrink: 0,
      }}>
        {resolverTokens(texto, habitacion, config)}
      </div>
    );
  }

  // Bloque de texto libre
  if (b.tipo === "texto") {
    const texto = resolverTokens(b.texto || "", habitacion, config);
    if (!texto.trim()) return null;
    return (
      <div style={{
        fontFamily: b.fontFamily,
        fontSize: print ? `${b.fontSize}px` : `${Math.max(7, b.fontSize * 0.6)}px`,
        fontWeight: b.bold ? "bold" : "normal",
        fontStyle: b.italic ? "italic" : "normal",
        textDecoration: b.underline ? "underline" : "none",
        textAlign: b.align,
        color: b.color,
        marginTop: `${b.marginTop || 0}px`,
        marginBottom: `${b.marginBottom || 0}px`,
        padding: print ? "0 32px" : "0 12px",
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
      }}>
        {texto}
      </div>
    );
  }

  return null;
}

// ── Editores por tipo de bloque ───────────────────────────────
function EditorEncabezado({ bloque: b, onChange }) {
  const set = (k, v) => onChange({ ...b, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Nombre del Retiro">
        <input type="text" value={b.nombreRetiro} onChange={e => set("nombreRetiro", e.target.value)} className={inputCls} />
      </Field>
      <Field label="Edición">
        <input type="text" value={b.edicion} onChange={e => set("edicion", e.target.value)} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tamaño texto (px)">
          <input type="number" min="8" max="24" value={b.fontSize || 13} onChange={e => set("fontSize", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Fuente">
          <select value={b.fontFamily} onChange={e => set("fontFamily", e.target.value)} className={inputCls}>
            {FONTS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[{val:"left",icon:AlignLeft},{val:"center",icon:AlignCenter},{val:"right",icon:AlignRight}].map(({val,icon:Icon}) => (
            <button key={val} onClick={() => set("align", val)}
              className={`px-2.5 py-1.5 ${(b.align||"center")===val?"bg-amber-700 text-white":"bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
        <button onClick={() => set("bold", !b.bold)}
          className={`px-2.5 py-1.5 rounded border ${b.bold?"bg-amber-700 text-white border-amber-700":"bg-white text-gray-600 border-amber-200 hover:bg-amber-50"}`}>
          <Bold className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Gradiente inicio" value={b.bgInicio} onChange={v => set("bgInicio", v)} />
        <ColorField label="Gradiente fin" value={b.bgFin} onChange={v => set("bgFin", v)} />
        <ColorField label="Color texto" value={b.textColor} onChange={v => set("textColor", v)} />
        <Field label="Padding vertical (px)">
          <input type="number" min="4" max="60" value={b.paddingV || 16} onChange={e => set("paddingV", Number(e.target.value))} className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Alto logo (px)">
          <input type="number" min="16" max="120" value={b.logoHeight ?? 48} onChange={e => set("logoHeight", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Espaciado letras título">
          <input type="number" min="0" max="12" value={b.letterSpacing ?? 3} onChange={e => set("letterSpacing", Number(e.target.value))} className={inputCls} />
        </Field>
      </div>
      <div className="space-y-1.5">
        {[{key:"mostrarLogo",label:"Mostrar logo"},{key:"mostrarEdicion",label:"Mostrar edición"}].map(({key,label}) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={b[key]!==false} onChange={e => set(key, e.target.checked)} className="w-4 h-4 accent-amber-700" />
            <span className="text-xs text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function EditorNumeroHab({ bloque: b, onChange }) {
  const set = (k, v) => onChange({ ...b, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Etiqueta">
        <input type="text" value={b.etiqueta || "Habitación"} onChange={e => set("etiqueta", e.target.value)} className={inputCls} />
      </Field>
      <Field label="Fuente">
        <select value={b.fontFamily} onChange={e => set("fontFamily", e.target.value)} className={inputCls}>
          {FONTS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tam. número (px)">
          <input type="number" min="40" max="260" value={b.numFontSize || 140} onChange={e => set("numFontSize", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Tam. etiqueta (px)">
          <input type="number" min="6" max="28" value={b.etiquetaFontSize || 11} onChange={e => set("etiquetaFontSize", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Espaciado letras etiqueta">
          <input type="number" min="0" max="20" value={b.etiquetaSpacing ?? 4} onChange={e => set("etiquetaSpacing", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Padding vertical (px)">
          <input type="number" min="0" max="60" value={b.paddingV ?? 8} onChange={e => set("paddingV", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Grosor borde inferior (px)">
          <input type="number" min="0" max="16" value={b.borderWidth ?? 4} onChange={e => set("borderWidth", Number(e.target.value))} className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Fondo área" value={b.bgColor} onChange={v => set("bgColor", v)} />
        <ColorField label="Color número" value={b.numColor} onChange={v => set("numColor", v)} />
        <ColorField label="Color borde inferior" value={b.borderColor} onChange={v => set("borderColor", v)} />
      </div>
    </div>
  );
}

function EditorListaPersonas({ bloque: b, onChange }) {
  const set = (k, v) => onChange({ ...b, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Fuente">
        <select value={b.fontFamily} onChange={e => set("fontFamily", e.target.value)} className={inputCls}>
          {FONTS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tamaño fuente (px)">
          <input type="number" min="10" max="120" value={b.fontSize || 46}
            onChange={e => set("fontSize", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Interlineado">
          <input type="number" min="0.8" max="3" step="0.05" value={b.lineHeight || 1.15}
            onChange={e => set("lineHeight", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Tam. número fila (px)">
          <input type="number" min="8" max="40" value={b.numFontSize ?? 20}
            onChange={e => set("numFontSize", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Padding vertical fila (px)">
          <input type="number" min="0" max="40" value={b.filaPaddingV ?? 8}
            onChange={e => set("filaPaddingV", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Padding horizontal fila (px)">
          <input type="number" min="0" max="60" value={b.filaPaddingH ?? 24}
            onChange={e => set("filaPaddingH", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Espaciado entre filas (px)">
          <input type="number" min="0" max="32" value={b.filaGap ?? 8}
            onChange={e => set("filaGap", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Radio esquinas fila (px)">
          <input type="number" min="0" max="24" value={b.filaRadius ?? 8}
            onChange={e => set("filaRadius", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Ancho borde izq fila (px)">
          <input type="number" min="0" max="12" value={b.filaBorderWidth ?? 4}
            onChange={e => set("filaBorderWidth", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Padding lateral lista (px)">
          <input type="number" min="0" max="120" value={b.listaPaddingH ?? 40}
            onChange={e => set("listaPaddingH", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Padding superior lista (px)">
          <input type="number" min="0" max="60" value={b.listaPaddingTop ?? 8}
            onChange={e => set("listaPaddingTop", Number(e.target.value))} className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Color nombres" value={b.colorNombre} onChange={v => set("colorNombre", v)} />
        <ColorField label="Color números" value={b.colorNumero} onChange={v => set("colorNumero", v)} />
        <ColorField label="Fondo fila par" value={b.fondoPar} onChange={v => set("fondoPar", v)} />
        <ColorField label="Fondo fila impar" value={b.fondoImpar} onChange={v => set("fondoImpar", v)} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={b.mostrarCruz !== false} onChange={e => set("mostrarCruz", e.target.checked)} className="w-4 h-4 accent-amber-700" />
        <span className="text-xs text-gray-700">Mostrar símbolo ✝</span>
      </label>
    </div>
  );
}

function EditorPie({ bloque: b, onChange }) {
  const [showVarMenu, setShowVarMenu] = useState(false);
  const set = (k, v) => onChange({ ...b, [k]: v });
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-500">Texto (usa {"{{numero_personas}}"})</label>
          <div className="relative">
            <button onClick={() => setShowVarMenu(v => !v)}
              className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded border border-amber-200 font-medium">
              + Variable <ChevronDown className="w-3 h-3" />
            </button>
            {showVarMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-amber-200 rounded-xl shadow-xl z-10 p-2 w-48 grid grid-cols-2 gap-1">
                {[{label:"N° Personas",token:"{{numero_personas}}"},...VARIABLES].map(v => (
                  <button key={v.token} onClick={() => { set("texto", (b.texto||"")+v.token); setShowVarMenu(false); }}
                    className="text-left text-xs px-2 py-1.5 hover:bg-amber-50 rounded-lg text-amber-800 font-medium truncate">
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <input type="text" value={b.texto || ""} onChange={e => set("texto", e.target.value)} className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tamaño (px)">
          <input type="number" min="6" max="20" value={b.fontSize || 10} onChange={e => set("fontSize", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Fuente">
          <select value={b.fontFamily} onChange={e => set("fontFamily", e.target.value)} className={inputCls}>
            {FONTS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Color texto" value={b.color} onChange={v => set("color", v)} />
        <ColorField label="Fondo pie" value={b.bgColor} onChange={v => set("bgColor", v)} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => set("bold", !b.bold)}
          className={`px-2.5 py-1.5 rounded border text-xs ${b.bold?"bg-amber-700 text-white border-amber-700":"bg-white text-gray-600 border-amber-200 hover:bg-amber-50"}`}>
          <Bold className="w-3.5 h-3.5" />
        </button>
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[{val:"left",icon:AlignLeft},{val:"center",icon:AlignCenter},{val:"right",icon:AlignRight}].map(({val,icon:Icon}) => (
            <button key={val} onClick={() => set("align", val)}
              className={`px-2.5 py-1.5 ${(b.align||"center")===val?"bg-amber-700 text-white":"bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditorTextoLibre({ bloque: b, onChange }) {
  const [showVarMenu, setShowVarMenu] = useState(false);
  const set = (k, v) => onChange({ ...b, [k]: v });
  const allVars = [...VARIABLES, ...VARS_PERSONA];
  return (
    <div className="space-y-3">
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
                {allVars.map(v => (
                  <button key={v.token} onClick={() => { set("texto", (b.texto||"")+v.token); setShowVarMenu(false); }}
                    className="text-left text-xs px-2 py-1.5 hover:bg-amber-50 rounded-lg text-amber-800 font-medium truncate">
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <textarea value={b.texto} onChange={e => set("texto", e.target.value)} rows={3}
          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-y" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[{key:"bold",icon:Bold},{key:"italic",icon:Italic},{key:"underline",icon:Underline}].map(({key,icon:Icon}) => (
            <button key={key} onClick={() => set(key, !b[key])}
              className={`px-2.5 py-1.5 ${b[key]?"bg-amber-700 text-white":"bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[{val:"left",icon:AlignLeft},{val:"center",icon:AlignCenter},{val:"right",icon:AlignRight}].map(({val,icon:Icon}) => (
            <button key={val} onClick={() => set("align", val)}
              className={`px-2.5 py-1.5 ${b.align===val?"bg-amber-700 text-white":"bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fuente">
          <select value={b.fontFamily} onChange={e => set("fontFamily", e.target.value)} className={inputCls}>
            {FONTS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
          </select>
        </Field>
        <Field label="Tamaño (px)">
          <input type="number" min="6" max="72" value={b.fontSize || 14} onChange={e => set("fontSize", Number(e.target.value))} className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <ColorField label="Color texto" value={b.color || "#1c1917"} onChange={v => set("color", v)} />
        <Field label="Margen arriba">
          <input type="number" min="0" max="60" value={b.marginTop || 0} onChange={e => set("marginTop", Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Margen abajo">
          <input type="number" min="0" max="60" value={b.marginBottom || 0} onChange={e => set("marginBottom", Number(e.target.value))} className={inputCls} />
        </Field>
      </div>
    </div>
  );
}

// ── Etiqueta del tipo de bloque ───────────────────────────────
const TIPO_LABELS = {
  encabezado: "🏷️ Encabezado + Logo",
  numero_habitacion: "🔢 Número de Habitación",
  lista_personas: "👥 Lista de Personas",
  pie: "📌 Pie de Página",
  texto: "📝 Texto Libre",
};

// ── Componente principal ──────────────────────────────────────
export default function EditorBorradorDistintivo({ config, configId, estilosIniciales, onGuardado, onCerrar }) {
  const borradorInicial = estilosIniciales?.borrador || null;
  const [bloques, setBloques] = useState(() => borradorInicial || defaultBloques(config));
  const [selIdx, setSelIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [numPersonasPreview, setNumPersonasPreview] = useState(4);

  const sel = bloques[selIdx];

  const FIJOS = ["encabezado", "numero_habitacion", "lista_personas", "pie"];
  const esFijo = (b) => FIJOS.includes(b.tipo);

  const updateBloque = (idx, nb) => setBloques(prev => prev.map((b, i) => i === idx ? nb : b));

  const addBloque = () => {
    const nuevo = {
      id: Date.now(),
      tipo: "texto",
      texto: "",
      fontFamily: "Georgia, serif",
      fontSize: 14,
      bold: false, italic: false, underline: false,
      align: "center",
      color: "#1c1917",
      marginTop: 8, marginBottom: 0,
    };
    setBloques(prev => [...prev, nuevo]);
    setSelIdx(bloques.length);
  };

  const removeBloque = (idx) => {
    if (esFijo(bloques[idx])) return;
    setBloques(prev => prev.filter((_, i) => i !== idx));
    setSelIdx(Math.max(0, selIdx - 1));
  };

  const moverBloque = (idx, dir) => {
    if (esFijo(bloques[idx])) return;
    const next = idx + dir;
    if (next < 0 || next >= bloques.length || esFijo(bloques[next])) return;
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
      allEstilos["distintivo"] = { ...(allEstilos["distintivo"] || {}), borrador: bloques, usarBorrador: true };
      await base44.entities.ConfigRetiro.update(configId, { estilos_impresion: JSON.stringify(allEstilos) });
    }
    toast.success("Borrador de distintivo guardado");
    setSaving(false);
    onGuardado({ ...(estilosIniciales || {}), borrador: bloques, usarBorrador: true });
  };

  const renderEditor = (b) => {
    if (b.tipo === "encabezado") return <EditorEncabezado bloque={b} onChange={nb => updateBloque(selIdx, nb)} />;
    if (b.tipo === "numero_habitacion") return <EditorNumeroHab bloque={b} onChange={nb => updateBloque(selIdx, nb)} />;
    if (b.tipo === "lista_personas") return <EditorListaPersonas bloque={b} onChange={nb => updateBloque(selIdx, nb)} />;
    if (b.tipo === "pie") return <EditorPie bloque={b} onChange={nb => updateBloque(selIdx, nb)} />;
    if (b.tipo === "texto") return <EditorTextoLibre bloque={b} onChange={nb => updateBloque(selIdx, nb)} />;
    return null;
  };

  return (
    <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-800 text-white">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">🚪 Editor de Distintivo de Habitación</h3>
          <p className="text-amber-200 text-xs mt-0.5">Tamaño carta (8½ × 11 pulg.) · Una hoja por habitación</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={guardar} disabled={saving}
            className="flex items-center gap-1.5 bg-amber-100 text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60">
            <Save className="w-3 h-3" /> {saving ? "Guardando..." : "Guardar borrador"}
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
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Secciones</p>
              <p className="text-xs text-gray-400 italic">Edita el diseño de cada sección</p>
            </div>
            {bloques.map((b, idx) => (
              <div key={b.id} onClick={() => setSelIdx(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all ${
                  selIdx === idx ? "bg-amber-50 border-amber-400" : "bg-gray-50 border-gray-200 hover:border-amber-200"
                }`}>
                <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-700 truncate">{TIPO_LABELS[b.tipo] || "Bloque"}</p>
                  {b.texto && <p className="text-xs text-gray-400 truncate">{b.texto.slice(0, 40)}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-300 italic">fijo</span>
                </div>
              </div>
            ))}
          </div>

          {/* Editor del bloque seleccionado */}
          {sel && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">
                {TIPO_LABELS[sel.tipo] || "Editar Bloque"}
              </p>
              {renderEditor(sel)}
            </div>
          )}
        </div>

        {/* PANEL DERECHO — vista previa */}
        <div className="p-4 bg-gray-100 flex flex-col items-center overflow-y-auto" style={{ maxHeight: "82vh" }}>
          <div className="flex items-center justify-between w-full mb-3">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Vista previa (carta)</p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Personas:</label>
              <input type="number" min="1" max="20" value={numPersonasPreview}
                onChange={e => setNumPersonasPreview(Math.max(1, Math.min(20, Number(e.target.value))))}
                className="w-14 border border-amber-200 rounded px-2 py-0.5 text-xs text-center bg-white focus:outline-none focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          {/* Hoja carta escalada */}
          <div style={{ transform: "scale(0.55)", transformOrigin: "top center", width: "816px", marginBottom: "-340px" }}>
            <div style={{
              width: "816px", minHeight: "1056px",
              background: "#fff",
              boxShadow: "0 4px 32px #0003",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
            }}>
              {bloques.map(b => (
                <BloqueRender key={b.id} bloque={b}
                  habitacion={{ numero: 7 }}
                  personas={Array.from({ length: numPersonasPreview }, (_, i) => ({
                    id: i + 1,
                    nombre: ["María González", "José Martínez", "Ana Rodríguez", "Carlos Pérez", "Laura Díaz", "Pedro Ramírez", "Isabel Torres", "Miguel Ángel Vargas", "Carmen Soto", "Roberto Herrera", "Patricia Núñez", "Felipe Castillo", "Sandra Mora", "Andrés Vidal", "Lucía Fernández", "Diego Montoya", "Elena Ruiz", "Marcos Leal", "Sofía Blanco", "Javier Cruz"][i] || `Persona ${i + 1}`
                  }))}
                  config={config} print={true} />
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center max-w-xs">Ajusta "Personas" para simular distintas cantidades.</p>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
const inputCls = "w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white";

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
      <div className="flex items-center gap-1.5">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-amber-200 p-0.5 flex-shrink-0" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-amber-200 rounded px-1.5 py-1 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-amber-400" />
      </div>
    </div>
  );
}