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
  { label: "Talla", token: "{{talla_camisa}}" },
  { label: "Tipo Sangre", token: "{{tipo_sangre}}" },
  { label: "Padrino/Madrina", token: "{{padrino_madrina}}" },
  { label: "N° Retiro", token: "{{numero_retiro}}" },
  { label: "Nombre Retiro", token: "{{nombre_retiro}}" },
  { label: "Edición", token: "{{edicion}}" },
  { label: "Fecha Inicio", token: "{{fecha_inicio}}" },
  { label: "Lugar", token: "{{lugar}}" },
];

const FONTS = [
  "Arial, sans-serif",
  "Georgia, serif",
  "'Times New Roman', serif",
  "Verdana, sans-serif",
  "'Palatino Linotype', serif",
  "Tahoma, sans-serif",
  "Impact, sans-serif",
];
const FONT_LABELS = {
  "Arial, sans-serif": "Arial",
  "Georgia, serif": "Georgia",
  "'Times New Roman', serif": "Times New Roman",
  "Verdana, sans-serif": "Verdana",
  "'Palatino Linotype', serif": "Palatino",
  "Tahoma, sans-serif": "Tahoma",
  "Impact, sans-serif": "Impact",
};

// Bloque de logo — especial, no se puede eliminar ni mover
const BLOQUE_LOGO_ID = "__logo__";
const DEFAULT_BLOQUE_LOGO = (config) => ({
  id: BLOQUE_LOGO_ID,
  tipo: "logo",
  nombreRetiro: config?.nombre_retiro || "Retiro de Emaús",
  eslogan: config?.eslogan || "Caminando con fe y esperanza hacia el Resucitado",
  headerBgColor: "#78350f",
  borderColor: "#92400e",
  mostrarLogo: true,
});

const DEFAULT_BLOQUE = () => ({
  id: Date.now() + Math.random(),
  tipo: "texto",
  texto: "",
  fontSize: 14,
  fontFamily: "Arial, sans-serif",
  bold: false,
  italic: false,
  underline: false,
  align: "center",
  color: "#1e3a8a",
  marginTop: 4,
  marginBottom: 4,
});

// ── Resolver tokens ──────────────────────────────────────────
function resolverTokens(texto, persona, config) {
  if (!texto) return "";
  return texto
    .replace(/{{nombre}}/g, persona?.nombre || "")
    .replace(/{{parroquia}}/g, persona?.parroquia || "")
    .replace(/{{numero_mesa}}/g, persona?.numero_mesa || "")
    .replace(/{{numero_habitacion}}/g, persona?.numero_habitacion || "")
    .replace(/{{rol}}/g, persona?.rol || persona?.rol_en_mesa || "")
    .replace(/{{talla_camisa}}/g, persona?.talla_camisa || "")
    .replace(/{{tipo_sangre}}/g, persona?.tipo_sangre || "")
    .replace(/{{padrino_madrina}}/g, persona?.padrino_madrina || "")
    .replace(/{{numero_retiro}}/g, persona?.numero_retiro || "")
    .replace(/{{nombre_retiro}}/g, config?.nombre_retiro || "Retiro de Emaús")
    .replace(/{{edicion}}/g, config?.edicion ? `Edición #${config.edicion}` : "")
    .replace(/{{fecha_inicio}}/g, config?.fecha_inicio || "")
    .replace(/{{lugar}}/g, config?.lugar || "");
}

// ── Render de un bloque de texto ─────────────────────────────
function BloqueTextoRender({ bloque, persona, config }) {
  const texto = resolverTokens(bloque.texto, persona, config);
  if (!texto.trim()) return null;
  return (
    <div style={{
      fontFamily: bloque.fontFamily,
      fontSize: `${bloque.fontSize}px`,
      fontWeight: bloque.bold ? "bold" : "normal",
      fontStyle: bloque.italic ? "italic" : "normal",
      textDecoration: bloque.underline ? "underline" : "none",
      textAlign: bloque.align,
      color: bloque.color,
      marginTop: `${bloque.marginTop}px`,
      marginBottom: `${bloque.marginBottom}px`,
      wordBreak: "break-word",
      lineHeight: 1.25,
      whiteSpace: "pre-wrap",
    }}>
      {texto}
    </div>
  );
}

// ── Render del bloque logo/encabezado ────────────────────────
function BloqueLogoRender({ bloque, config, print }) {
  const DEFAULT_LOGO_EMAUS = "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/28de3e4eb_logoemauscircular.png";
  const logoUrl = config?.logo_url || config?.logo_hombres_url || config?.logo_mujeres_url || DEFAULT_LOGO_EMAUS;
  const nombreRetiro = bloque.nombreRetiro || config?.nombre_retiro || "Retiro de Emaús";
  const eslogan = bloque.eslogan || config?.eslogan || "";
  const headerBg = bloque.headerBgColor || "#78350f";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: print ? "4px 8px" : "6px 10px",
      borderBottom: `1px solid ${bloque.borderColor || "#92400e"}44`,
      flexShrink: 0,
    }}>
      {bloque.mostrarLogo !== false && (
        <img 
          src={logoUrl || DEFAULT_LOGO_EMAUS} 
          alt="Logo Emaús" 
          crossOrigin="anonymous"
          onError={(e) => { e.currentTarget.src = DEFAULT_LOGO_EMAUS; }}
          style={{ height: print ? "38px" : "44px", width: "auto", objectFit: "contain", flexShrink: 0 }} 
        />
      )}
      <div style={{ flex: 1, minWidth: 0, textAlign: bloque.align || "left" }}>
        <p style={{
          margin: 0,
          fontWeight: bloque.bold !== undefined ? (bloque.bold ? "bold" : "700") : "900",
          fontStyle: bloque.italic ? "italic" : "normal",
          textDecoration: bloque.underline ? "underline" : "none",
          fontFamily: bloque.fontFamily || "Arial, sans-serif",
          fontSize: print ? `${bloque.nombreFontSize || 9}px` : `${bloque.nombreFontSize || 10}px`,
          textTransform: "uppercase",
          color: headerBg,
          letterSpacing: "0.3px",
          lineHeight: 1.2,
          wordBreak: "break-word",
          whiteSpace: "pre-line",
        }}>
          {nombreRetiro}
        </p>
        {eslogan && (
          <p style={{ margin: "1px 0 0", fontSize: print ? "6.5px" : "7px", fontStyle: "italic", color: "#333", lineHeight: 1.2 }}>{eslogan}</p>
        )}
      </div>
    </div>
  );
}

// ── Editor del bloque logo ───────────────────────────────────
function EditorBloqueLogoPanel({ bloque, onChange }) {
  const set = (key, val) => onChange({ ...bloque, [key]: val });
  return (
    <div className="space-y-3">
      <p className="text-xs text-amber-600 font-medium">Encabezado fijo con logo. Edita texto, tipografía y colores.</p>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Nombre del Retiro</label>
        <textarea value={bloque.nombreRetiro} onChange={e => set("nombreRetiro", e.target.value)}
          rows={2}
          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Eslogan / Lema</label>
        <input type="text" value={bloque.eslogan} onChange={e => set("eslogan", e.target.value)}
          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </div>

      {/* Tipografía */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fuente</label>
          <select value={bloque.fontFamily || "Arial, sans-serif"} onChange={e => set("fontFamily", e.target.value)}
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
            {FONTS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tam. nombre (px)</label>
          <input type="number" min="6" max="20" value={bloque.nombreFontSize || 10}
            onChange={e => set("nombreFontSize", Number(e.target.value))}
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
      </div>

      {/* Formato + alineación */}
      <div className="flex flex-wrap gap-2">
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[
            { key: "bold", icon: Bold, label: "Negrita" },
            { key: "italic", icon: Italic, label: "Cursiva" },
            { key: "underline", icon: Underline, label: "Subrayado" },
          ].map(({ key, icon: Icon, label }) => (
            <button key={key} title={label} onClick={() => set(key, !bloque[key])}
              className={`px-2.5 py-1.5 text-sm transition-colors ${bloque[key] ? "bg-amber-700 text-white" : "bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[
            { val: "left", icon: AlignLeft },
            { val: "center", icon: AlignCenter },
            { val: "right", icon: AlignRight },
          ].map(({ val, icon: Icon }) => (
            <button key={val} onClick={() => set("align", val)}
              className={`px-2.5 py-1.5 transition-colors ${(bloque.align || "left") === val ? "bg-amber-700 text-white" : "bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Colores */}
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Color nombre retiro" value={bloque.headerBgColor} onChange={v => set("headerBgColor", v)} />
        <ColorField label="Color borde gafete" value={bloque.borderColor} onChange={v => set("borderColor", v)} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={bloque.mostrarLogo !== false}
          onChange={e => set("mostrarLogo", e.target.checked)}
          className="w-4 h-4 accent-amber-700 cursor-pointer" />
        <span className="text-xs text-gray-700">Mostrar logo del retiro</span>
      </label>
    </div>
  );
}

// ── Editor del bloque texto ──────────────────────────────────
function EditorBloqueTextoPanel({ bloque, onChange, selIdx, config }) {
  const [showVarMenu, setShowVarMenu] = useState(false);
  const set = (key, val) => onChange({ ...bloque, [key]: val });
  const insertarVariable = (token) => {
    set("texto", (bloque.texto || "") + token);
    setShowVarMenu(false);
  };

  return (
    <div className="space-y-3">
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
                  <button key={v.token} onClick={() => insertarVariable(v.token)}
                    className="text-left text-xs px-2 py-1.5 hover:bg-amber-50 rounded-lg text-amber-800 font-medium truncate">
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <textarea value={bloque.texto} onChange={e => set("texto", e.target.value)} rows={3}
          placeholder="Escribe texto o inserta una variable... (Enter = nueva línea)"
          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-y" />
      </div>

      {/* Bold / Italic / Underline + Alineación en una fila */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[
            { key: "bold", icon: Bold, label: "Negrita" },
            { key: "italic", icon: Italic, label: "Cursiva" },
            { key: "underline", icon: Underline, label: "Subrayado" },
          ].map(({ key, icon: Icon, label }) => (
            <button key={key} title={label} onClick={() => set(key, !bloque[key])}
              className={`px-2.5 py-1.5 text-sm transition-colors ${bloque[key] ? "bg-amber-700 text-white" : "bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
        <div className="flex border border-amber-200 rounded-lg overflow-hidden">
          {[
            { val: "left", icon: AlignLeft },
            { val: "center", icon: AlignCenter },
            { val: "right", icon: AlignRight },
            { val: "justify", icon: AlignJustify },
          ].map(({ val, icon: Icon }) => (
            <button key={val} onClick={() => set("align", val)}
              className={`px-2.5 py-1.5 transition-colors ${bloque.align === val ? "bg-amber-700 text-white" : "bg-white text-gray-600 hover:bg-amber-50"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Fuente + tamaño */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fuente</label>
          <select value={bloque.fontFamily} onChange={e => set("fontFamily", e.target.value)}
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
            {FONTS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tamaño (px)</label>
          <input type="number" min="6" max="72" value={bloque.fontSize}
            onChange={e => set("fontSize", Number(e.target.value))}
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
      </div>

      {/* Color texto + Negrita/Cursiva visual en color */}
      <div className="grid grid-cols-3 gap-3">
        <ColorField label="Color texto" value={bloque.color} onChange={v => set("color", v)} />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Margen arriba</label>
          <input type="number" min="0" max="40" value={bloque.marginTop}
            onChange={e => set("marginTop", Number(e.target.value))}
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Margen abajo</label>
          <input type="number" min="0" max="40" value={bloque.marginBottom}
            onChange={e => set("marginBottom", Number(e.target.value))}
            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
      </div>

      {/* Vista previa del estilo del texto */}
      <div className="bg-white border border-amber-100 rounded-lg p-3 text-center" style={{ minHeight: "36px" }}>
        <span style={{
          fontFamily: bloque.fontFamily,
          fontSize: `${Math.min(bloque.fontSize, 22)}px`,
          fontWeight: bloque.bold ? "bold" : "normal",
          fontStyle: bloque.italic ? "italic" : "normal",
          textDecoration: bloque.underline ? "underline" : "none",
          color: bloque.color,
        }}>
          {bloque.texto || "Texto de ejemplo"}
        </span>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function EditorBorradorGafete({ config, configId, tipoDoc, estilosIniciales, onGuardado, onCerrar }) {
  const borradorInicial = estilosIniciales?.borrador || null;

  const [bloques, setBloques] = useState(() => {
    if (borradorInicial) {
      // Si el borrador guardado no tiene bloque logo, lo inyectamos al inicio
      const tieneLogoBloque = borradorInicial.some(b => b.tipo === "logo");
      if (!tieneLogoBloque) {
        return [DEFAULT_BLOQUE_LOGO(config), ...borradorInicial];
      }
      return borradorInicial;
    }
    const base = [
      DEFAULT_BLOQUE_LOGO(config),
      { ...DEFAULT_BLOQUE(), id: 2, texto: "{{nombre}}", fontSize: 20, bold: true, color: "#1e3a8a", marginTop: 8 },
      { ...DEFAULT_BLOQUE(), id: 3, texto: "{{parroquia}}", fontSize: 9, color: "#555555", marginTop: 4 },
    ];
    // Defaults con habitación/mesa según tipo
    if (tipoDoc === "gafete_cama" || tipoDoc === "gafete_maleta") {
      base.push({ ...DEFAULT_BLOQUE(), id: 4, texto: "Habitación: {{numero_habitacion}}", fontSize: 11, bold: true, color: "#dc2626", marginTop: 6 });
    }
    if (tipoDoc === "gafete_carpeta") {
      base.push({ ...DEFAULT_BLOQUE(), id: 4, texto: "Habitación: {{numero_habitacion}}", fontSize: 10, bold: true, color: "#dc2626", marginTop: 5 });
      base.push({ ...DEFAULT_BLOQUE(), id: 5, texto: "Mesa: {{numero_mesa}}", fontSize: 10, bold: false, color: "#555555", marginTop: 3 });
    }
    return base;
  });

  const [selIdx, setSelIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const personaEjemplo = {
    nombre: "Juan Pérez García",
    parroquia: "Parroquia Santa Cruz",
    numero_mesa: "3",
    numero_habitacion: "7",
    rol: "Caminante",
    talla_camisa: "L",
    tipo_sangre: "O+",
    padrino_madrina: "Carlos Rodríguez",
    numero_retiro: config?.edicion || "12",
  };

  const sel = bloques[selIdx];
  const borderColorActivo = bloques[0]?.borderColor || "#92400e";

  const updateBloque = (idx, nuevoBloque) => {
    setBloques(prev => prev.map((b, i) => i === idx ? nuevoBloque : b));
  };

  const addBloque = () => {
    setBloques(prev => [...prev, { ...DEFAULT_BLOQUE(), id: Date.now() }]);
    setSelIdx(bloques.length);
  };

  const removeBloque = (idx) => {
    if (idx === 0) return; // no borrar bloque logo
    setBloques(prev => prev.filter((_, i) => i !== idx));
    setSelIdx(Math.max(0, selIdx - 1));
  };

  const moverBloque = (idx, dir) => {
    if (idx === 0 || (idx + dir) === 0) return; // no mover bloque logo
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
      const estilosActuales = allEstilos[tipoDoc] || {};
      allEstilos[tipoDoc] = { ...estilosActuales, borrador: bloques, usarBorrador: true };
      await base44.entities.ConfigRetiro.update(configId, { estilos_impresion: JSON.stringify(allEstilos) });
    }
    toast.success("Borrador guardado");
    setSaving(false);
    onGuardado(tipoDoc, { ...estilosIniciales, borrador: bloques, usarBorrador: true });
  };

  return (
    <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-700 text-white">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide">✏️ Editor de Borrador — {tipoDoc.replace("_", " ").toUpperCase()}</h3>
          <p className="text-amber-200 text-xs mt-0.5">El primer bloque es el encabezado con logo · el color del borde se controla desde ahí</p>
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
        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: "80vh" }}>

          {/* Lista de bloques */}
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Bloques</p>
              <button onClick={addBloque}
                className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 font-semibold">
                <Plus className="w-3 h-3" /> Añadir bloque
              </button>
            </div>

            {bloques.map((b, idx) => (
              <div key={b.id} onClick={() => setSelIdx(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all ${
                  selIdx === idx ? "bg-amber-50 border-amber-400" : "bg-gray-50 border-gray-200 hover:border-amber-200"
                }`}>
                <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {b.tipo === "logo"
                    ? <p className="text-xs font-bold text-amber-700 truncate">🖼️ Encabezado + Logo</p>
                    : <>
                        <p className="text-xs font-medium text-gray-700 truncate"
                           style={{ fontWeight: b.bold ? "bold" : "normal", fontStyle: b.italic ? "italic" : "normal", color: b.color }}>
                          {b.texto || <span className="text-gray-400 italic font-normal" style={{ color: "#9ca3af" }}>bloque vacío</span>}
                        </p>
                        <p className="text-xs text-gray-400">{b.fontSize}px · {FONT_LABELS[b.fontFamily] || "Arial"}</p>
                      </>
                  }
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {idx !== 0 && <>
                    <button onClick={e => { e.stopPropagation(); moverBloque(idx, -1); }} className="text-gray-300 hover:text-gray-500 p-0.5">↑</button>
                    <button onClick={e => { e.stopPropagation(); moverBloque(idx, 1); }} className="text-gray-300 hover:text-gray-500 p-0.5">↓</button>
                    <button onClick={e => { e.stopPropagation(); removeBloque(idx); }} className="text-red-300 hover:text-red-500 p-0.5"><Trash2 className="w-3 h-3" /></button>
                  </>}
                </div>
              </div>
            ))}
          </div>

          {/* Editor del bloque seleccionado */}
          {sel && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">
                {sel.tipo === "logo" ? "🖼️ Editar Encabezado" : `Editar Bloque #${selIdx + 1}`}
              </p>
              {sel.tipo === "logo"
                ? <EditorBloqueLogoPanel bloque={sel} onChange={nb => updateBloque(selIdx, nb)} />
                : <EditorBloqueTextoPanel bloque={sel} onChange={nb => updateBloque(selIdx, nb)} selIdx={selIdx} config={config} />
              }
            </div>
          )}
        </div>

        {/* PANEL DERECHO — vista previa grande */}
        <div className="p-4 bg-gray-50 flex flex-col items-center overflow-y-auto" style={{ maxHeight: "80vh" }}>
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3 self-start">Vista previa en vivo</p>
          <GafeteBorradorPreviewLive bloques={bloques} persona={personaEjemplo} config={config} borderColor={borderColorActivo} />
          <p className="text-xs text-gray-400 mt-3 text-center max-w-xs">Datos de ejemplo. Al imprimir se usarán los datos reales de cada persona.</p>
        </div>
      </div>
    </div>
  );
}

// ── Vista previa del gafete en el editor (grande) ────────────
function GafeteBorradorPreviewLive({ bloques, persona, config, borderColor }) {
  return (
    <div style={{
      width: "360px",
      minHeight: "230px",
      border: `3px solid ${borderColor || "#92400e"}`,
      borderRadius: "8px",
      background: "#fff",
      boxShadow: "0 6px 24px #0003",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Arial, sans-serif",
    }}>
      {bloques.map((b) =>
        b.tipo === "logo"
          ? <BloqueLogoRender key={b.id} bloque={b} config={config} print={false} />
          : <div key={b.id} style={{ padding: "0 14px" }}>
              <BloqueTextoRender bloque={b} persona={persona} config={config} />
            </div>
      )}
    </div>
  );
}

// ── Export: render para impresión ────────────────────────────
export function GafeteBorrador({ persona, config, bloques, print, celdaAncho, celdaAlto }) {
  const wMm = celdaAncho || 96.5;
  const hMm = celdaAlto || 69;
  const bloqueLogoData = bloques.find(b => b.tipo === "logo") || DEFAULT_BLOQUE_LOGO(config);
  const borderColor = bloqueLogoData.borderColor || "#92400e";

  return (
    <div style={{
      position: "relative",
      border: `2px solid ${borderColor}`,
      borderRadius: print ? "2px" : "6px",
      background: "#fff",
      overflow: "hidden",
      boxSizing: "border-box",
      breakInside: "avoid",
      pageBreakInside: "avoid",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Arial, sans-serif",
      ...(print ? { width: `${wMm}mm`, height: `${hMm}mm` } : { boxShadow: "0 2px 10px #0002" }),
    }}>
      {bloques.map((b) =>
        b.tipo === "logo"
          ? <BloqueLogoRender key={b.id} bloque={b} config={config} print={print} />
          : <div key={b.id} style={{ padding: print ? "0 10px" : "0 12px" }}>
              <BloqueTextoRender bloque={b} persona={persona} config={config} />
            </div>
      )}

      {/* Número secuencial del servidor en la esquina inferior derecha */}
      {(persona?.esServidor || persona?._esServidor || persona?._indexServidor) && (
        <div style={{
          position: "absolute",
          bottom: print ? "2px" : "3px",
          right: print ? "4px" : "6px",
          fontSize: print ? "8px" : "9px",
          fontWeight: "900",
          color: "#4b5563",
          fontFamily: "monospace, sans-serif",
          lineHeight: 1,
          zIndex: 20,
          background: "rgba(255, 255, 255, 0.95)",
          padding: "1px 3.5px",
          borderRadius: "3px",
          border: "1px solid #d1d5db"
        }}>
          {persona._indexServidor || persona.numero_servidor || 1}
        </div>
      )}
    </div>
  );
}

// ── Helper de color ──────────────────────────────────────────
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