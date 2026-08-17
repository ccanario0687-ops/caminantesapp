import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Save, RefreshCw, Layout, Palette, Type, AlignLeft, 
  AlignCenter, AlignRight, Check, Sparkles, Sliders, Globe, X, ZoomIn, ZoomOut, RotateCcw, Image, Upload, ShieldCheck, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Focus, Cloud
} from "lucide-react";
import { toast } from "sonner";
import { GafeteCard, GafeteMaletaCard, GafeteCamaCard, GafeteCarpetaCard } from "@/pages/Impresiones";

export const LOCAL_STORAGE_ESTILOS_KEY = "emaus_estilos_impresion_v2";

export const DEFAULTS_POR_TIPO = {
  gafete:         { columnas: 2, filas: 4, celdaAnchoMm: 96.5, celdaAltoMm: 69, orientacion: "horizontal" },
  gafete_maleta:  { columnas: 2, filas: 6, celdaAnchoMm: 96.5, celdaAltoMm: 44, orientacion: "horizontal" },
  gafete_cama:    { columnas: 1, filas: 6, celdaAnchoMm: 194,  celdaAltoMm: 42, orientacion: "horizontal" },
  gafete_carpeta: { columnas: 1, filas: 3, celdaAnchoMm: 194,  celdaAltoMm: 95, orientacion: "horizontal" },
  carta:          { columnas: 1, filas: 1, celdaAnchoMm: 194,  celdaAltoMm: 281, orientacion: "vertical" },
  ficha:          { columnas: 1, filas: 1, celdaAnchoMm: 194,  celdaAltoMm: 281, orientacion: "vertical" },
  formulario:     { columnas: 1, filas: 1, celdaAnchoMm: 194,  celdaAltoMm: 281, orientacion: "vertical" },
};

export const DEFAULTS_ESTILOS = {
  orientacion: "horizontal",
  plantillaMedidaId: "std_horiz",
  temaVisualId: "emaus_dorado",
  columnas: 2,
  filas: 4,
  tamanoManual: false,
  celdaAnchoMm: 96.5,
  celdaAltoMm: 69,
  margenImpresion: 8,
  margenArriba: 8,
  margenAbajo: 8,
  margenIzquierda: 8,
  margenDerecha: 8,
  eslogan: "",
  versiculo: "(LUCAS 24:13-35)",
  diocesis: "",
  parroquias: "",
  nombreColor: "#1e3a8a",
  headerBgColor: "#78350f",
  headerTextColor: "#ffffff",
  headerAlign: "left", // "left" | "center" | "right"
  bodyBgColor: "#ffffff",
  bodyTextColor: "#1c1917",
  borderColor: "#92400e",
  borderWidth: 2,
  nombreFontSize: "16",
  subtextFontSize: "9",
  align: "center",
  lineHeight: "1.15",
  nombreMarginTop: "0",
  nombreMarginBottom: "0",
  fontFamily: "Georgia, serif",
  paddingH: "16",
  paddingV: "12",
  borderRadius: "8",
  nombreRetiroPersonalizado: "",
  direccion: "",
  textoRolDefault: "SERVIDOR DE EMAÚS",
  textoFirma: "El Equipo de Emaús",
  textoCarta: "Con gran alegría te damos la bienvenida a este retiro. Este fin de semana es un regalo especial para ti, un tiempo para encontrarte con Dios y con tu comunidad de fe.",
  mostrarLogo: true,
  mostrarNombreRetiro: true,
  mostrarEdicion: true,
  mostrarParroquia: true,
  mostrarDireccion: false,
  mostrarNumeroHabitacion: true,
  mostrarNumeroMesa: true,
  mostrarTalla: true,
  mostrarTipoSangre: true,
  mostrarTelefono: false,
  mostrarPadrinoMadrina: true,
  mostrarNecesidadesMedicas: true,
  mostrarNotas: false,
  mostrarRol: true,
  // 🖼️ Imagen de Fondo / Marca de Agua desvanecida + Posicionamiento (Arriba, Abajo, Izq, Der)
  mostrarImagenFondo: false,
  imagenFondoUrl: "",
  imagenFondoOpacidad: 0.2,
  imagenFondoAjuste: "cover",
  imagenFondoPosH: 50, // 0% (Izq) - 100% (Der)
  imagenFondoPosV: 50, // 0% (Arriba) - 100% (Abajo)
  imagenFondoEscala: 100, // 50% - 200%
};

// 🌟 CARGAR Y HOMOLOGAR AUTOMÁTICAMENTE ESTILOS EN TODAS LAS SECCIONES Y DISPOSITIVOS 🌟
export function cargarEstilosBlindados(dbEstilosStr) {
  let dbEstilos = {};
  if (dbEstilosStr) {
    try {
      dbEstilos = typeof dbEstilosStr === "string" ? JSON.parse(dbEstilosStr) : dbEstilosStr;
    } catch {}
  }

  let localEstilos = {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ESTILOS_KEY);
    if (raw) localEstilos = JSON.parse(raw);
  } catch {}

  // Fusión de estilos DB Nube + LocalStorage (LocalStorage prevalece localmente si hay ediciones offline)
  const mergedRaw = { ...dbEstilos };
  Object.keys(localEstilos).forEach(k => {
    if (localEstilos[k]) {
      mergedRaw[k] = { ...(dbEstilos[k] || {}), ...localEstilos[k] };
    }
  });

  // Encontrar el diseño visual personalizado base del Gafete Principal
  const disenoGafetePrincipal = { ...(mergedRaw["gafete"] || mergedRaw["gafete_maleta"] || mergedRaw["gafete_carpeta"] || mergedRaw["gafete_cama"] || {}) };
  
  // Extraer propiedades visuales excluyendo dimensiones de grilla específicas
  const { columnas, filas, orientacion, celdaAnchoMm, celdaAltoMm, ...disenoVisualGafetePrincipal } = disenoGafetePrincipal;

  const TIPOS_DOC = ["gafete", "gafete_maleta", "gafete_carpeta", "gafete_cama", "carta", "ficha"];
  const res = {};

  TIPOS_DOC.forEach(t => {
    const defTipo = DEFAULTS_POR_TIPO[t] || {};
    const esGafeteSecundario = t.startsWith("gafete_");

    if (esGafeteSecundario) {
      // Los gafetes secundarios heredan el tema visual + borrador del Gafete Principal por defecto
      res[t] = {
        ...DEFAULTS_ESTILOS,
        ...disenoVisualGafetePrincipal, // Hereda visuales y borrador base del Gafete Principal
        ...defTipo,                     // Mantiene sus filas/columnas/dimensiones propias
        ...(mergedRaw[t] || {})         // Sobrescribe con personalizaciones propias si existen
      };
    } else {
      res[t] = {
        ...DEFAULTS_ESTILOS,
        ...defTipo,
        ...(mergedRaw[t] || {})
      };
    }
  });

  return res;
}

export function calcCeldaMm(columnas, filas, gap = 1) {
  const anchoPag = 194;
  const altoPag = 281;
  const ancho = Math.floor((anchoPag - gap * (columnas - 1)) / columnas * 10) / 10;
  const alto  = Math.floor((altoPag  - gap * (filas    - 1)) / filas    * 10) / 10;
  return { ancho, alto };
}

export const TEMAS_ESTANDAR = [
  {
    id: "emaus_dorado",
    label: "👑 Emaús Dorado Clásico",
    headerBgColor: "#78350f",
    headerTextColor: "#ffffff",
    nombreColor: "#1e3a8a",
    borderColor: "#b8860b",
    bodyBgColor: "#ffffff",
    bodyTextColor: "#1c1917",
    fontFamily: "Georgia, serif",
    borderWidth: 2
  },
  {
    id: "bordo_elegante",
    label: "🩸 Bordó Emaús Elegante",
    headerBgColor: "#8b1a1a",
    headerTextColor: "#ffffff",
    nombreColor: "#5c1a00",
    borderColor: "#d97706",
    bodyBgColor: "#fffdfa",
    bodyTextColor: "#292524",
    fontFamily: "Georgia, serif",
    borderWidth: 2
  },
  {
    id: "azul_liturgico",
    label: "⛪ Azul Marino Litúrgico",
    headerBgColor: "#0f2744",
    headerTextColor: "#ffffff",
    nombreColor: "#1e3a8a",
    borderColor: "#9ca3af",
    bodyBgColor: "#ffffff",
    bodyTextColor: "#1e293b",
    fontFamily: "Arial, sans-serif",
    borderWidth: 2
  },
  {
    id: "verde_esperanza",
    label: "🌿 Verde Esperanza",
    headerBgColor: "#064e3b",
    headerTextColor: "#ffffff",
    nombreColor: "#047857",
    borderColor: "#d97706",
    bodyBgColor: "#f0fdf4",
    bodyTextColor: "#064e3b",
    fontFamily: "Georgia, serif",
    borderWidth: 2
  },
  {
    id: "minimalista",
    label: "📄 Minimalista Blanco & Negro",
    headerBgColor: "#18181b",
    headerTextColor: "#ffffff",
    nombreColor: "#09090b",
    borderColor: "#52525b",
    bodyBgColor: "#ffffff",
    bodyTextColor: "#18181b",
    fontFamily: "Arial, sans-serif",
    borderWidth: 1.5
  }
];

export const PLANTILLAS_MEDIDAS = [
  {
    id: "std_horiz",
    label: "📏 Estándar Horizontal (96.5 × 69 mm · 8 por pág)",
    orientacion: "horizontal",
    columnas: 2,
    filas: 4,
    celdaAnchoMm: 96.5,
    celdaAltoMm: 69
  },
  {
    id: "std_vert",
    label: "📏 Estándar Vertical (69 × 96.5 mm · 6 por pág)",
    orientacion: "vertical",
    columnas: 2,
    filas: 3,
    celdaAnchoMm: 69,
    celdaAltoMm: 96.5
  },
  {
    id: "credencial_horiz",
    label: "🪪 Credencial Premium Horizontal (100 × 70 mm)",
    orientacion: "horizontal",
    columnas: 2,
    filas: 4,
    celdaAnchoMm: 100,
    celdaAltoMm: 70
  },
  {
    id: "credencial_vert",
    label: "🪪 Credencial Premium Vertical (70 × 100 mm)",
    orientacion: "vertical",
    columnas: 2,
    filas: 3,
    celdaAnchoMm: 70,
    celdaAltoMm: 100
  },
  {
    id: "tarjeta_compacta",
    label: "💳 Tarjeta Compacta (85.6 × 54 mm · 10 por pág)",
    orientacion: "horizontal",
    columnas: 2,
    filas: 5,
    celdaAnchoMm: 85.6,
    celdaAltoMm: 54
  }
];

const FONT_OPTIONS = [
  { label: "Georgia (Serif)", value: "Georgia, serif" },
  { label: "Arial (Sans-serif)", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Palatino", value: "'Palatino Linotype', Palatino, serif" },
  { label: "Impact (Enfático)", value: "Impact, sans-serif" }
];

const CAMPOS_VISIBLES_POR_TIPO = {
  gafete:         ["mostrarLogo","mostrarNombreRetiro","mostrarEdicion","mostrarParroquia","mostrarDireccion","mostrarRol"],
  gafete_maleta:  ["mostrarLogo","mostrarNombreRetiro","mostrarNumeroHabitacion","mostrarDireccion"],
  gafete_carpeta: ["mostrarLogo","mostrarNombreRetiro","mostrarImagenFondo","mostrarDireccion"],
  gafete_cama:    ["mostrarLogo","mostrarNombreRetiro","mostrarNumeroHabitacion","mostrarDireccion"],
  carta:          ["mostrarLogo","mostrarNombreRetiro","mostrarEdicion","mostrarDireccion","mostrarNumeroHabitacion"],
  ficha:          ["mostrarLogo","mostrarNombreRetiro","mostrarEdicion","mostrarParroquia","mostrarDireccion","mostrarNumeroHabitacion","mostrarNumeroMesa","mostrarTalla","mostrarTipoSangre","mostrarTelefono","mostrarPadrinoMadrina","mostrarNecesidadesMedicas","mostrarNotas","mostrarRol"],
};

const CAMPOS_LABELS = {
  mostrarLogo:             "Logo",
  mostrarNombreRetiro:     "Nombre del Retiro",
  mostrarEdicion:          "Edición / N° Retiro",
  mostrarParroquia:        "Parroquia",
  mostrarDireccion:        "Dirección / Lugar",
  mostrarNumeroHabitacion: "N° Habitación",
  mostrarNumeroMesa:       "N° Mesa",
  mostrarTalla:            "Talla de Camisa",
  mostrarTipoSangre:       "Tipo de Sangre",
  mostrarTelefono:         "Teléfono",
  mostrarPadrinoMadrina:   "Padrino / Madrina",
  mostrarNecesidadesMedicas: "Necesidades Médicas",
  mostrarNotas:            "Notas",
  mostrarRol:              "Texto del Rol / Servicio",
};

// 🎯 GAFETE EN EL MEDIO A ESCALA REAL (1:1 mm) CON VISTA PREVIA EN VIVO POR TIPO DE DOCUMENTO
function GafeteRealSizeCenter({ estilos, config, tipoDoc = "gafete", zoom }) {
  const e = estilos;
  const wMm = Number(e.celdaAnchoMm) || (e.orientacion === "vertical" ? 69 : 96.5);
  const hMm = Number(e.celdaAltoMm) || (e.orientacion === "vertical" ? 96.5 : 69);
  
  const wPx = Math.round(wMm * 3.7795);
  const hPx = Math.round(hMm * 3.7795);

  const esVertical = e.orientacion === "vertical" || hMm > wMm;
  const nombreRetiro = e.nombreRetiroPersonalizado || config?.nombre_retiro || config?.nombre || "RETIRO DE EMAÚS";
  const eslogan = e.eslogan || config?.eslogan || config?.lema || "Caminando con fe y esperanza hacia el Resucitado";
  const parroquia = e.parroquiaFormulario || e.parroquias || config?.parroquia || config?.provincia || "Parroquia Emaús";
  const lugar = e.direccion || config?.lugar || config?.ubicacion || "Casa de Retiros";
  const fechas = config?.fecha_inicio ? `${config.fecha_inicio} ${config.fecha_fin ? `- ${config.fecha_fin}` : ""}` : "";
  const versiculo = e.versiculo || "(LUCAS 24:13-35)";
  const textoRol = e.textoRolDefault || "SERVIDOR DE EMAÚS";
  const logoUrl = config?.logo_url || config?.logo_hombres_url || config?.logo_mujeres_url || "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/28de3e4eb_logoemauscircular.png";

  const textAlign = e.align || "center";
  const headerAlign = e.headerAlign || (esVertical ? "center" : "left");
  const lineHeight = e.lineHeight || 1.15;
  const borderWidth = e.borderWidth || 2;
  const borderRadius = e.borderRadius || 8;
  const headerBg = e.headerBgColor || "#78350f";
  const headerTextColor = e.headerTextColor || "#ffffff";
  const nombreColor = e.nombreColor || "#1e3a8a";
  const borderColor = e.borderColor || "#92400e";

  const posH = e.imagenFondoPosH ?? 50;
  const posV = e.imagenFondoPosV ?? 50;
  const escalaFondo = e.imagenFondoEscala ? e.imagenFondoEscala / 100 : 1;

  const NOMBRES_MODO = {
    gafete: "GAFETE PRINCIPAL (PECHO)",
    gafete_maleta: "GAFETE DE MALETA / EQUIPAJE",
    gafete_carpeta: "GAFETE DE CARPETA / GUÍA",
    gafete_cama: "GAFETE DE CAMA / HABITACIÓN",
    carta: "CARTA PARA CAMINANTE",
    ficha: "CARTA DE INVITACIÓN",
    formulario: "FORMULARIO DE INSCRIPCIÓN",
  };

  const tituloVistaPrevia = NOMBRES_MODO[tipoDoc] || "GAFETE DE EMAÚS";

  if (tipoDoc === "gafete_maleta" || tipoDoc === "gafete_cama" || tipoDoc === "gafete_carpeta") {
    const props = {
      persona: muestraPersona,
      logoUrl,
      nombreRetiro,
      edicion: config?.edicion,
      estilos: e,
      print: false,
      celdaAncho: wMm,
      celdaAlto: hMm
    };

    return (
      <div 
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
        className="flex flex-col items-center justify-center p-6 bg-slate-950/95 rounded-3xl border-2 border-amber-400/40 shadow-2xl relative w-full max-w-xl my-auto select-none"
      >
        <div className="flex items-center justify-between w-full mb-4 text-white/90 px-1 border-b border-amber-500/20 pb-2">
          <span className="text-xs font-mono font-black flex items-center gap-1.5 text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            VISTA PREVIA EN VIVO ({tituloVistaPrevia})
          </span>
          <span className="text-xs font-mono bg-amber-500/20 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-500/40 font-bold">
            {wMm}mm × {hMm}mm
          </span>
        </div>

        <div className="shadow-2xl rounded-lg overflow-hidden border border-amber-500/30">
          {tipoDoc === "gafete_maleta" && <GafeteMaletaCard {...props} />}
          {tipoDoc === "gafete_cama" && <GafeteCamaCard {...props} />}
          {tipoDoc === "gafete_carpeta" && <GafeteCarpetaCard {...props} />}
        </div>

        <p className="text-[11px] text-amber-300/80 mt-4 text-center font-mono">
          📐 Escala física real de impresión: <strong>{wMm}mm × {hMm}mm</strong>
        </p>
      </div>
    );
  }

  return (
    <div 
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: "center center",
        transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
      className="flex flex-col items-center justify-center p-6 bg-slate-950/95 rounded-3xl border-2 border-amber-400/40 shadow-2xl relative w-full max-w-xl my-auto select-none"
    >
      <div className="flex items-center justify-between w-full mb-4 text-white/90 px-1 border-b border-amber-500/20 pb-2">
        <span className="text-xs font-mono font-black flex items-center gap-1.5 text-amber-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          VISTA PREVIA EN VIVO ({tituloVistaPrevia})
        </span>
        <span className="text-xs font-mono bg-amber-500/20 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-500/40 font-bold">
          {wMm}mm × {hMm}mm
        </span>
      </div>

      {/* GAFETE EN TAMAÑO REAL 1:1 */}
      <div
        style={{
          width: `${wPx}px`,
          height: `${hPx}px`,
          position: "relative",
          border: `${borderWidth}px solid ${borderColor}`,
          borderRadius: `${borderRadius}px`,
          background: e.bodyBgColor || "#ffffff",
          color: e.bodyTextColor || "#1c1917",
          fontFamily: e.fontFamily || "Georgia, serif",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(184,134,11,0.25)",
          boxSizing: "border-box",
          transition: "all 0.15s ease-out"
        }}
      >
        {/* IMAGEN DE FONDO PERSONALIZADA DESVANECIDA CON POSICIONAMIENTO Y ESCALA */}
        {e.mostrarImagenFondo !== false && e.imagenFondoUrl && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
            pointerEvents: "none",
            overflow: "hidden"
          }}>
            <img 
              src={e.imagenFondoUrl} 
              alt="Fondo Gafete"
              style={{
                width: "100%",
                height: "100%",
                objectFit: e.imagenFondoAjuste || "cover",
                objectPosition: `${posH}% ${posV}%`,
                transform: `scale(${escalaFondo})`,
                transformOrigin: `${posH}% ${posV}%`,
                opacity: Number(e.imagenFondoOpacidad ?? 0.2),
                mixBlendMode: "multiply",
                filter: "contrast(110%)",
                display: "block",
                transition: "all 0.1s ease-out"
              }}
            />
          </div>
        )}

        {/* ENCABEZADO */}
        <div style={{
          display: "flex",
          flexDirection: esVertical ? "column" : "row",
          alignItems: "center",
          gap: "6px",
          padding: esVertical ? "6px 8px" : "8px 10px",
          borderBottom: `1px solid ${borderColor}44`,
          flexShrink: 0,
          background: headerBg,
          textAlign: headerAlign,
          justifyContent: headerAlign === "center" ? "center" : (headerAlign === "right" ? "flex-end" : "flex-start"),
          zIndex: 2
        }}>
          {e.mostrarLogo !== false && (
            <img src={logoUrl} alt="Logo" style={{ height: esVertical ? "36px" : "40px", width: "auto", objectFit: "contain", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0, width: "100%", textAlign: headerAlign }}>
            {e.mostrarNombreRetiro !== false && (
              <p style={{
                margin: 0,
                fontWeight: "900",
                fontSize: `${Math.max(Number(e.subtextFontSize || 9) + 1, 10)}px`,
                textTransform: "uppercase",
                color: headerTextColor,
                letterSpacing: "0.3px",
                lineHeight: 1.15,
                wordBreak: "break-word"
              }}>
                {nombreRetiro}
              </p>
            )}
            {eslogan && (
              <p style={{ margin: "1px 0 0", fontSize: "7.5px", fontStyle: "italic", color: headerTextColor, opacity: 0.95, lineHeight: 1.15 }}>
                {eslogan}
              </p>
            )}
          </div>
        </div>

        {/* CUERPO CENTRAL SEGÚN TIPO DE GAFETE O DOCUMENTO */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "6px 10px 8px", minHeight: 0, zIndex: 2 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: textAlign === "center" ? "center" : (textAlign === "right" ? "flex-end" : "flex-start") }}>
            {versiculo && (
              <p style={{ margin: "0 0 2px", fontSize: "7px", color: "#666", alignSelf: "flex-start" }}>{versiculo}</p>
            )}

            {/* NOMBRE DE LA PERSONA */}
            <p style={{
              margin: `${e.nombreMarginTop || 0}px 0 ${e.nombreMarginBottom || 0}px`,
              fontSize: `${Number(e.nombreFontSize) || 16}px`,
              fontWeight: "900",
              color: nombreColor,
              lineHeight: lineHeight,
              textTransform: "uppercase",
              textAlign: textAlign,
              wordBreak: "break-word",
              overflowWrap: "break-word",
              width: "100%"
            }}>
              JUAN ERNESTO PÉREZ
            </p>

            {/* CAJAS Y DETALLES DE VISTA PREVIA ESPECÍFICOS */}
            {tipoDoc === "gafete_maleta" && (
              <div style={{ marginTop: "3px", padding: "3px 6px", background: "#fef3c7", borderRadius: "5px", border: "1px solid #f59e0b", textAlign: "center", width: "100%" }}>
                <p style={{ margin: 0, fontSize: "10px", fontWeight: "900", color: "#78350f" }}>🧳 GAFETE DE MALETA</p>
                <p style={{ margin: "1px 0 0", fontSize: "9px", fontWeight: "bold", color: "#92400e" }}>HABITACIÓN: 102 · EQUIPO: COCINA</p>
              </div>
            )}

            {tipoDoc === "gafete_carpeta" && (
              <div style={{ marginTop: "3px", padding: "3px 6px", background: "#eff6ff", borderRadius: "5px", border: "1px solid #3b82f6", textAlign: "center", width: "100%" }}>
                <p style={{ margin: 0, fontSize: "10px", fontWeight: "900", color: "#1e3a8a" }}>📖 GAFETE DE CARPETA / GUÍA</p>
                <p style={{ margin: "1px 0 0", fontSize: "9px", fontWeight: "bold", color: "#1d4ed8" }}>MESA N° 3 · HABITACIÓN: 102</p>
              </div>
            )}

            {tipoDoc === "gafete_cama" && (
              <div style={{ marginTop: "3px", padding: "3px 6px", background: "#ecfdf5", borderRadius: "5px", border: "1px solid #10b981", textAlign: "center", width: "100%" }}>
                <p style={{ margin: 0, fontSize: "10px", fontWeight: "900", color: "#065f46" }}>🛏️ GAFETE DE CAMA / HABITACIÓN</p>
                <p style={{ margin: "1px 0 0", fontSize: "9px", fontWeight: "bold", color: "#047857" }}>HABITACIÓN: 102 (CAMANTE / SERVIDOR)</p>
              </div>
            )}

            {(tipoDoc === "carta" || tipoDoc === "ficha" || tipoDoc === "formulario") && (
              <div style={{ marginTop: "4px", padding: "4px", background: "#fffbeb", borderRadius: "5px", border: "1px solid #d97706", width: "100%" }}>
                <p style={{ margin: 0, fontSize: "9px", fontWeight: "bold", color: "#92400e" }}>📜 VISTA PREVIA CARTA / FICHA</p>
                <p style={{ margin: "2px 0 0", fontSize: "7.5px", color: "#451a03", lineHeight: 1.25 }}>
                  "Querido(a) hermano(a): Te damos la bienvenida a este Santo Retiro de Emaús..."
                </p>
              </div>
            )}

            {(tipoDoc === "gafete" || !tipoDoc) && e.mostrarRol !== false && (
              <p style={{ 
                margin: "2px 0 0", 
                fontSize: "9px", 
                color: headerBg !== "#ffffff" ? headerBg : nombreColor, 
                fontWeight: "900", 
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {textoRol}
              </p>
            )}
          </div>

          {/* PIE DE CARD */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "3px", flexShrink: 0 }}>
            {parroquia && (
              <p style={{ margin: "0 0 1px", fontSize: "7.5px", color: "#374151", fontWeight: "bold", textAlign: "center" }}>
                {parroquia}
              </p>
            )}
            {lugar && (
              <p style={{ margin: 0, fontSize: "6.5px", color: "#6b7280", textAlign: "center", lineHeight: 1.2 }}>
                {lugar} {fechas ? `· ${fechas}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* NÚMERO SECUENCIAL SOLO SIN EL SÍMBOLO # */}
        <div style={{
          position: "absolute",
          bottom: "3px",
          right: "5px",
          fontSize: "9px",
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
          1
        </div>
      </div>

      <p className="text-[11px] text-amber-300/80 mt-4 text-center font-mono">
        📐 Escala física real de impresión: <strong>{wMm}mm × {hMm}mm</strong>
      </p>
    </div>
  );
}

export default function ConfiguracionImpresiones({ config, configId, tipoDoc, estilosIniciales, onGuardado, onCerrar }) {
  const defPorTipo = DEFAULTS_POR_TIPO[tipoDoc] || { columnas: 2, filas: 4, orientacion: "horizontal" };
  const [estilos, setEstilos] = useState(() => {
    const blindados = cargarEstilosBlindados(config?.estilos_impresion);
    return { ...DEFAULTS_ESTILOS, ...defPorTipo, ...estilosIniciales, ...(blindados[tipoDoc] || {}) };
  });
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1.0);

  useEffect(() => {
    const def = DEFAULTS_POR_TIPO[tipoDoc] || { columnas: 2, filas: 4, orientacion: "horizontal" };
    const blindados = cargarEstilosBlindados(config?.estilos_impresion);
    setEstilos({ ...DEFAULTS_ESTILOS, ...def, ...estilosIniciales, ...(blindados[tipoDoc] || {}) });
  }, [tipoDoc]);

  const set = (key, val) => setEstilos(prev => ({ ...prev, [key]: val }));

  const guardar = async (nuevosEstilos = estilos) => {
    setSaving(true);

    const TIPOS_DOC = ["gafete", "gafete_maleta", "gafete_carpeta", "gafete_cama", "carta", "ficha"];
    let allEstilos = {};
    try {
      if (config?.estilos_impresion) {
        allEstilos = typeof config.estilos_impresion === "string" ? JSON.parse(config.estilos_impresion) : config.estilos_impresion;
      } else {
        const raw = localStorage.getItem(LOCAL_STORAGE_ESTILOS_KEY);
        if (raw) allEstilos = JSON.parse(raw);
      }
    } catch {}

    // Si editamos el Gafete Principal ("gafete"), propagar el diseño visual base a los gafetes secundarios
    if (tipoDoc === "gafete") {
      const GAFETES_SECUNDARIOS = ["gafete_maleta", "gafete_carpeta", "gafete_cama"];
      GAFETES_SECUNDARIOS.forEach(t => {
        const prevTipo = allEstilos[t] || {};
        allEstilos[t] = {
          ...prevTipo,
          headerBgColor: nuevosEstilos.headerBgColor,
          headerTextColor: nuevosEstilos.headerTextColor,
          nombreColor: nuevosEstilos.nombreColor,
          borderColor: nuevosEstilos.borderColor,
          bodyBgColor: nuevosEstilos.bodyBgColor,
          bodyTextColor: nuevosEstilos.bodyTextColor,
          fontFamily: nuevosEstilos.fontFamily,
          borderWidth: nuevosEstilos.borderWidth,
          borderRadius: nuevosEstilos.borderRadius,
          headerAlign: nuevosEstilos.headerAlign,
          align: nuevosEstilos.align,
          lineHeight: nuevosEstilos.lineHeight,
          nombreRetiroPersonalizado: nuevosEstilos.nombreRetiroPersonalizado,
          eslogan: nuevosEstilos.eslogan,
          versiculo: nuevosEstilos.versiculo,
          textoRolDefault: nuevosEstilos.textoRolDefault,
          diocesis: nuevosEstilos.diocesis,
          parroquias: nuevosEstilos.parroquias,
          direccion: nuevosEstilos.direccion,
          mostrarImagenFondo: nuevosEstilos.mostrarImagenFondo,
          imagenFondoUrl: nuevosEstilos.imagenFondoUrl,
          imagenFondoOpacidad: nuevosEstilos.imagenFondoOpacidad,
          imagenFondoAjuste: nuevosEstilos.imagenFondoAjuste,
          imagenFondoPosH: nuevosEstilos.imagenFondoPosH,
          imagenFondoPosV: nuevosEstilos.imagenFondoPosV,
          imagenFondoEscala: nuevosEstilos.imagenFondoEscala
        };
      });
    }

    // Guardar la configuración propia y aislada del tipo de documento activo
    allEstilos[tipoDoc] = nuevosEstilos;

    // 🔒 1. GUARDAR EN LOCALSTORAGE
    try {
      localStorage.setItem(LOCAL_STORAGE_ESTILOS_KEY, JSON.stringify(allEstilos));
    } catch {}

    // 🔒 2. NOTIFICAR AL COMPONENTE PADRE EN EL ACTO
    onGuardado(tipoDoc, nuevosEstilos);

    // ☁️ 3. TRANSMITIR OBLIGATORIAMENTE A LA NUBE DB BASE44 PARA TODOS LOS DISPOSITIVOS
    try {
      let targetId = configId;
      if (!targetId) {
        const cfgs = await base44.entities.ConfigRetiro.list().catch(() => []);
        if (cfgs.length > 0) targetId = cfgs[0].id;
      }

      if (targetId) {
        await base44.entities.ConfigRetiro.update(targetId, {
          estilos_impresion: JSON.stringify(allEstilos)
        });
        toast.success("☁️ Diseño homologado y guardado en la nube para todas las secciones y dispositivos");
      } else {
        await base44.entities.ConfigRetiro.create({
          nombre_retiro: config?.nombre_retiro || "Retiro de Emaús",
          estilos_impresion: JSON.stringify(allEstilos)
        });
        toast.success("☁️ Configuración global creada y transmitida a la nube");
      }
    } catch (err) {
      console.error("Error al transmitir a la nube DB:", err);
      toast.error("Diseño guardado localmente (error de sincronización en nube)");
    } finally {
      setSaving(false);
      if (onCerrar) onCerrar();
    }
  };

  const homologarTemaGlobal = async (tema) => {
    if (!tema) return;
    const estilosClonados = {
      headerBgColor: tema.headerBgColor,
      headerTextColor: tema.headerTextColor,
      nombreColor: tema.nombreColor,
      borderColor: tema.borderColor,
      bodyBgColor: tema.bodyBgColor,
      bodyTextColor: tema.bodyTextColor,
      fontFamily: tema.fontFamily,
      borderWidth: tema.borderWidth,
      temaVisualId: tema.id
    };

    const actualizados = { ...estilos, ...estilosClonados };
    setEstilos(actualizados);

    let allEstilos = {};
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ESTILOS_KEY);
      if (raw) allEstilos = JSON.parse(raw);
    } catch {}

    ["gafete", "gafete_maleta", "gafete_carpeta", "gafete_cama", "carta", "ficha"].forEach(t => {
      allEstilos[t] = { ...(allEstilos[t] || DEFAULTS_ESTILOS), ...estilosClonados };
    });

    try {
      localStorage.setItem(LOCAL_STORAGE_ESTILOS_KEY, JSON.stringify(allEstilos));
    } catch {}

    try {
      let targetId = configId;
      if (!targetId) {
        const cfgs = await base44.entities.ConfigRetiro.list().catch(() => []);
        if (cfgs.length > 0) targetId = cfgs[0].id;
      }
      if (targetId) {
        await base44.entities.ConfigRetiro.update(targetId, {
          estilos_impresion: JSON.stringify(allEstilos)
        });
        toast.success(`☁️ Tema "${tema.label}" homologado y sincronizado en la nube para todas las secciones`);
      }
    } catch {}

    onGuardado(tipoDoc, actualizados);
  };

  const aplicarPlantillaMedida = (plantilla) => {
    if (!plantilla) return;
    const actualizados = {
      ...estilos,
      plantillaMedidaId: plantilla.id,
      orientacion: plantilla.orientacion,
      columnas: plantilla.columnas,
      filas: plantilla.filas,
      celdaAnchoMm: plantilla.celdaAnchoMm,
      celdaAltoMm: plantilla.celdaAltoMm,
      tamanoManual: true
    };
    setEstilos(actualizados);
    toast.success(`Medida aplicada: ${plantilla.label}`);
  };

  const conmutarOrientacion = (nuevaOrientacion) => {
    if (estilos.orientacion === nuevaOrientacion) return;
    
    const actualAncho = estilos.celdaAnchoMm || 96.5;
    const actualAlto = estilos.celdaAltoMm || 69;

    let nuevoAncho = actualAlto;
    let nuevoAlto = actualAncho;
    let nuevasFilas = estilos.filas;

    if (nuevaOrientacion === "vertical") {
      if (nuevoAncho > nuevoAlto) {
        const temp = nuevoAncho;
        nuevoAncho = nuevoAlto;
        nuevoAlto = temp;
      }
      nuevasFilas = 3;
    } else {
      if (nuevoAlto > nuevoAncho) {
        const temp = nuevoAncho;
        nuevoAncho = nuevoAlto;
        nuevoAlto = temp;
      }
      nuevasFilas = 4;
    }

    setEstilos(prev => ({
      ...prev,
      orientacion: nuevaOrientacion,
      celdaAnchoMm: nuevoAncho,
      celdaAltoMm: nuevoAlto,
      filas: nuevasFilas,
      tamanoManual: true
    }));

    toast.info(`Orientación cambiada a ${nuevaOrientacion.toUpperCase()}`);
  };

  const restaurar = () => {
    const def = DEFAULTS_POR_TIPO[tipoDoc] || { columnas: 2, filas: 4, orientacion: "horizontal" };
    const res = { ...DEFAULTS_ESTILOS, ...def };
    setEstilos(res);
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ESTILOS_KEY);
      if (raw) {
        let local = JSON.parse(raw);
        delete local[tipoDoc];
        localStorage.setItem(LOCAL_STORAGE_ESTILOS_KEY, JSON.stringify(local));
      }
    } catch {}
    toast("Estilos restaurados a valores predeterminados");
  };

  const subirImagenFondoLocal = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      toast.info("☁️ Subiendo imagen a la nube Base44...");
      const res = await base44.integrations.Core.uploadFile({ file });
      if (res?.file_url) {
        set("imagenFondoUrl", res.file_url);
        set("mostrarImagenFondo", true);
        toast.success("☁️ Imagen alojada en la nube con éxito");
        return;
      }
    } catch {
      console.warn("Fallo subida nube direct file, creando imagen optimizada...");
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const compressedUrl = canvas.toDataURL("image/jpeg", 0.75);
        set("imagenFondoUrl", compressedUrl);
        set("mostrarImagenFondo", true);
        toast.success("🖼️ Imagen optimizada y cargada");
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  const camposVisibles = CAMPOS_VISIBLES_POR_TIPO[tipoDoc] || [];
  const toggleCampo = (key) => set(key, !estilos[key]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col p-3 md:p-5 backdrop-blur-md overflow-hidden animate-in fade-in">
      
      {/* 🚀 TOOLBAR SUPERIOR */}
      <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 border border-amber-500/30 mb-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black flex items-center gap-2 text-amber-200">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Editor Blindado & Sincronizado en Nube
            </h2>
            <span className="bg-emerald-900/80 text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border border-emerald-500/40 flex items-center gap-1">
              <Cloud className="w-3 h-3" /> Homologación Global Activa
            </span>
          </div>
          <p className="text-xs text-amber-100/90 mt-0.5">
            Retiro: <strong>{config?.nombre_retiro || config?.nombre || "Retiro de Emaús"}</strong> · Parroquia: <strong>{config?.parroquia || config?.provincia || "Parroquia Emaús"}</strong> · Lema: <em>"{config?.eslogan || config?.lema || "Camino de Fe"}"</em>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={restaurar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-400/40 text-amber-100 hover:bg-amber-800/80 text-xs font-bold cursor-pointer transition">
            <RefreshCw className="w-4 h-4" /> Restaurar
          </button>
          <button onClick={() => guardar()} disabled={saving}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg cursor-pointer transition border border-emerald-400 disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? "Guardando en la Nube..." : "Guardar en Nube"}
          </button>
          {onCerrar && (
            <button onClick={onCerrar} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 🚀 CUERPO EN 3 COLUMNAS */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-0">
        
        {/* PANEL IZQUIERDO: MEDIDAS, TEXTOS Y FONDO DESVANECIDO (Cols 3) */}
        <div className="lg:col-span-3 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-amber-700">
          
          <Section title="📐 Orientación, Formato y Medidas">
            <div className="space-y-3">

              {/* ALTERNADOR DE FORMATO ESTÁNDAR VS PERSONALIZADO */}
              <div className="bg-amber-100/70 p-2.5 rounded-xl border border-amber-300 space-y-2">
                <label className="block text-[11px] font-bold text-amber-950 uppercase tracking-wider">
                  Modo de Formato para {tipoDoc}:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const def = DEFAULTS_POR_TIPO[tipoDoc] || { columnas: 2, filas: 4, orientacion: "horizontal", celdaAnchoMm: 96.5, celdaAltoMm: 69 };
                      setEstilos(prev => ({
                        ...prev,
                        tamanoManual: false,
                        columnas: def.columnas,
                        filas: def.filas,
                        celdaAnchoMm: def.celdaAnchoMm || (def.orientacion === "vertical" ? 69 : 96.5),
                        celdaAltoMm: def.celdaAltoMm || (def.orientacion === "vertical" ? 96.5 : 69),
                        orientacion: def.orientacion || "horizontal"
                      }));
                      toast.success("Restablecido a Formato Estándar para este documento");
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      !estilos.tamanoManual
                        ? "bg-amber-900 text-white shadow-md border border-amber-950"
                        : "bg-white text-amber-900 border border-amber-300 hover:bg-amber-50"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" /> Formato Estándar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEstilos(prev => ({ ...prev, tamanoManual: true }));
                      toast.info("Modo de Formato Personalizado activado");
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      estilos.tamanoManual
                        ? "bg-amber-900 text-white shadow-md border border-amber-950"
                        : "bg-white text-amber-900 border border-amber-300 hover:bg-amber-50"
                    }`}
                  >
                    <Sliders className="w-4 h-4" /> Personalizar Medidas
                  </button>
                </div>
                <p className="text-[10px] text-amber-900 font-medium">
                  {!estilos.tamanoManual
                    ? `Formato estándar óptimo cargado para ${tipoDoc}.`
                    : "Formato personalizado activo: puedes ajustar libremente el ancho, alto y grilla."}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Orientación del Gafete:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => conmutarOrientacion("horizontal")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer transition ${
                      estilos.orientacion === "horizontal"
                        ? "bg-amber-900 text-white border-amber-950 shadow"
                        : "bg-white text-slate-700 border-amber-200 hover:bg-amber-50"
                    }`}
                  >
                    <Layout className="w-4 h-4 rotate-90" /> Horizontal
                  </button>

                  <button
                    type="button"
                    onClick={() => conmutarOrientacion("vertical")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer transition ${
                      estilos.orientacion === "vertical"
                        ? "bg-amber-900 text-white border-amber-950 shadow"
                        : "bg-white text-slate-700 border-amber-200 hover:bg-amber-50"
                    }`}
                  >
                    <Layout className="w-4 h-4" /> Vertical
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Tamaños Estándar:</label>
                <select
                  value={estilos.plantillaMedidaId || ""}
                  onChange={(e) => {
                    const p = PLANTILLAS_MEDIDAS.find(m => m.id === e.target.value);
                    if (p) aplicarPlantillaMedida(p);
                  }}
                  className={inputCls}
                >
                  <option value="">⚙️ Medidas Manuales (mm)</option>
                  {PLANTILLAS_MEDIDAS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Ancho (mm)">
                  <input type="number" min="20" max="200" step="0.5" value={estilos.celdaAnchoMm || 96.5}
                    onChange={e => set("celdaAnchoMm", parseFloat(e.target.value))} className={inputCls} />
                </Field>
                <Field label="Alto (mm)">
                  <input type="number" min="10" max="280" step="0.5" value={estilos.celdaAltoMm || 69}
                    onChange={e => set("celdaAltoMm", parseFloat(e.target.value))} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Columnas pág">
                  <input type="number" min="1" max="6" value={estilos.columnas}
                    onChange={e => set("columnas", Number(e.target.value))} className={inputCls} />
                </Field>
                <Field label="Filas pág">
                  <input type="number" min="1" max="10" value={estilos.filas}
                    onChange={e => set("filas", Number(e.target.value))} className={inputCls} />
                </Field>
              </div>
            </div>
          </Section>

          {/* 🖼️ IMAGEN DE FONDO DESVANECIDA CON CONTROLES DE POSICIÓN */}
          <Section title="🖼️ Imagen de Fondo & Posición">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-xs font-bold text-slate-800">
                <input 
                  type="checkbox" 
                  checked={estilos.mostrarImagenFondo !== false && Boolean(estilos.imagenFondoUrl)}
                  onChange={e => set("mostrarImagenFondo", e.target.checked)}
                  className="w-4 h-4 accent-amber-700 cursor-pointer" 
                />
                <span>Activar Imagen de Fondo</span>
              </label>

              <Field label="Subir o Ingresar Imagen">
                <div className="flex gap-1.5">
                  <input 
                    type="text" 
                    value={estilos.imagenFondoUrl || ""}
                    onChange={e => {
                      set("imagenFondoUrl", e.target.value);
                      if (e.target.value) set("mostrarImagenFondo", true);
                    }}
                    placeholder="https://... o sube una imagen"
                    className={inputCls} 
                  />
                  <label className="bg-amber-800 hover:bg-amber-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center shrink-0 shadow-xs">
                    <Upload className="w-3.5 h-3.5 mr-1" /> Subir
                    <input type="file" accept="image/*" onChange={subirImagenFondoLocal} className="hidden" />
                  </label>
                </div>
              </Field>

              {estilos.imagenFondoUrl && (
                <>
                  <Field label={`Opacidad / Desvanecido: ${Math.round((estilos.imagenFondoOpacidad ?? 0.2) * 100)}%`}>
                    <input 
                      type="range" 
                      min="0.05" 
                      max="1.0" 
                      step="0.05" 
                      value={estilos.imagenFondoOpacidad ?? 0.2}
                      onChange={e => set("imagenFondoOpacidad", parseFloat(e.target.value))}
                      className="w-full accent-amber-700 cursor-pointer" 
                    />
                  </Field>

                  {/* 🕹️ CONTROLES DE POSICIÓN Y MOVER IMAGEN (IZQ, DER, ARRIBA, ABAJO) */}
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 space-y-2">
                    <p className="text-[11px] font-bold text-amber-950 flex items-center gap-1 border-b border-amber-100 pb-1">
                      <Focus className="w-3.5 h-3.5 text-amber-700" /> Posición de la Imagen:
                    </p>

                    {/* Botones rápidos de dirección (Pads) */}
                    <div className="grid grid-cols-3 gap-1 max-w-[150px] mx-auto my-1">
                      <div />
                      <button 
                        type="button"
                        onClick={() => set("imagenFondoPosV", Math.max(0, (estilos.imagenFondoPosV ?? 50) - 15))}
                        className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                        title="Mover Arriba"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <div />

                      <button 
                        type="button"
                        onClick={() => set("imagenFondoPosH", Math.max(0, (estilos.imagenFondoPosH ?? 50) - 15))}
                        className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                        title="Mover Izquierda"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        type="button"
                        onClick={() => { set("imagenFondoPosH", 50); set("imagenFondoPosV", 50); set("imagenFondoEscala", 100); }}
                        className="p-1 bg-amber-900 text-white hover:bg-amber-950 rounded-lg text-[10px] font-bold flex items-center justify-center cursor-pointer"
                        title="Centrar"
                      >
                        Centro
                      </button>

                      <button 
                        type="button"
                        onClick={() => set("imagenFondoPosH", Math.min(100, (estilos.imagenFondoPosH ?? 50) + 15))}
                        className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                        title="Mover Derecha"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <div />
                      <button 
                        type="button"
                        onClick={() => set("imagenFondoPosV", Math.min(100, (estilos.imagenFondoPosV ?? 50) + 15))}
                        className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                        title="Mover Abajo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <div />
                    </div>

                    {/* Sliders finos X e Y */}
                    <div className="space-y-1.5 pt-1">
                      <Field label={`Horizontal (Izq ↔ Der): ${estilos.imagenFondoPosH ?? 50}%`}>
                        <input 
                          type="range" min="0" max="100" step="1" 
                          value={estilos.imagenFondoPosH ?? 50}
                          onChange={e => set("imagenFondoPosH", Number(e.target.value))}
                          className="w-full accent-amber-700 cursor-pointer" 
                        />
                      </Field>

                      <Field label={`Vertical (Arriba ↔ Abajo): ${estilos.imagenFondoPosV ?? 50}%`}>
                        <input 
                          type="range" min="0" max="100" step="1" 
                          value={estilos.imagenFondoPosV ?? 50}
                          onChange={e => set("imagenFondoPosV", Number(e.target.value))}
                          className="w-full accent-amber-700 cursor-pointer" 
                        />
                      </Field>

                      <Field label={`Escala / Zoom Imagen: ${estilos.imagenFondoEscala ?? 100}%`}>
                        <input 
                          type="range" min="50" max="200" step="5" 
                          value={estilos.imagenFondoEscala ?? 100}
                          onChange={e => set("imagenFondoEscala", Number(e.target.value))}
                          className="w-full accent-amber-700 cursor-pointer" 
                        />
                      </Field>
                    </div>
                  </div>

                  <Field label="Ajuste de Imagen">
                    <select 
                      value={estilos.imagenFondoAjuste || "cover"} 
                      onChange={e => set("imagenFondoAjuste", e.target.value)} 
                      className={inputCls}
                    >
                      <option value="cover">Cubrir todo (Cover)</option>
                      <option value="contain">Contener completa (Contain)</option>
                      <option value="fill">Estirar (Fill)</option>
                    </select>
                  </Field>
                </>
              )}
            </div>
          </Section>

          {/* EDITAR TEXTOS DE TODO EL GAFETE */}
          <Section title="📝 Editar Textos del Gafete">
            <div className="space-y-2.5">
              <Field label="Nombre del Retiro (Encabezado)">
                <input type="text" value={estilos.nombreRetiroPersonalizado || ""}
                  onChange={e => set("nombreRetiroPersonalizado", e.target.value)}
                  placeholder={config?.nombre_retiro || "RETIRO DE EMAÚS"}
                  className={inputCls} />
              </Field>

              <Field label="Eslogan / Lema">
                <input type="text" value={estilos.eslogan || ""}
                  onChange={e => set("eslogan", e.target.value)}
                  placeholder={config?.eslogan || "Caminando con fe y esperanza..."}
                  className={inputCls} />
              </Field>

              <Field label="Etiqueta del Rol / Servicio">
                <input type="text" value={estilos.textoRolDefault || "SERVIDOR DE EMAÚS"}
                  onChange={e => set("textoRolDefault", e.target.value)}
                  placeholder="Ej: SERVIDOR DE EMAÚS / RECTOR"
                  className={inputCls} />
              </Field>

              <Field label="Diócesis / Provincia">
                <input type="text" value={estilos.diocesis || ""}
                  onChange={e => set("diocesis", e.target.value)}
                  placeholder={config?.provincia || "Diócesis de San Francisco de Macorís"}
                  className={inputCls} />
              </Field>

              <Field label="Parroquia (Pie del gafete)">
                <input type="text" value={estilos.parroquias || ""}
                  onChange={e => set("parroquias", e.target.value)}
                  placeholder="Ej: Parroquia Santa Cruz"
                  className={inputCls} />
              </Field>

              <Field label="Dirección / Lugar">
                <input type="text" value={estilos.direccion || ""}
                  onChange={e => set("direccion", e.target.value)}
                  placeholder="Ej: Casa de Retiros San Juan"
                  className={inputCls} />
              </Field>

              <Field label="Versículo Bíblico">
                <input type="text" value={estilos.versiculo || "(LUCAS 24:13-35)"}
                  onChange={e => set("versiculo", e.target.value)}
                  className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* CAMPOS VISIBLES */}
          {camposVisibles.length > 0 && (
            <Section title="👁️ Campos Visibles">
              <div className="grid grid-cols-1 gap-1.5">
                {camposVisibles.map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-xs font-bold text-slate-800">
                    <input type="checkbox" checked={estilos[key] !== false}
                      onChange={() => toggleCampo(key)}
                      className="w-4 h-4 accent-amber-700 cursor-pointer" />
                    <span>{CAMPOS_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* 🚀 COLUMNA CENTRAL: ★ GAFETE EN EL MEDIO A ESCALA REAL + CONTROLES DE ZOOM */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-2 min-h-0 overflow-y-auto relative">
          
          <div className="mb-3 flex items-center gap-2 bg-amber-950/90 text-white px-4 py-1.5 rounded-full border border-amber-500/40 shadow-lg z-30">
            <span className="text-xs font-mono font-bold text-amber-200 mr-1 flex items-center gap-1">
              <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Zoom:
            </span>

            {[0.75, 1.0, 1.25, 1.5, 2.0].map(zVal => (
              <button
                key={zVal}
                type="button"
                onClick={() => setZoom(zVal)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                  zoom === zVal ? "bg-amber-500 text-amber-950 font-black" : "hover:bg-white/20 text-white"
                }`}
              >
                {zVal === 1.0 ? "1:1 Real" : `${zVal}x`}
              </button>
            ))}

            <button
              onClick={() => setZoom(1.0)}
              className="p-1 hover:bg-white/20 rounded text-amber-300 ml-1 cursor-pointer"
              title="Restablecer a escala 1:1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <GafeteRealSizeCenter estilos={estilos} config={config} tipoDoc={tipoDoc} zoom={zoom} />
        </div>

        {/* PANEL DERECHO: TEMAS HOMOLOGADOS, TIPOGRAFÍAS, ALINEACIÓN Y COLORES (Cols 3) */}
        <div className="lg:col-span-3 overflow-y-auto space-y-4 pl-1 scrollbar-thin scrollbar-thumb-amber-700">
          
          <Section title="🎨 Temas Visuales Homologados">
            <div className="space-y-2">
              {TEMAS_ESTANDAR.map(t => {
                const seleccionado = estilos.temaVisualId === t.id;
                return (
                  <div 
                    key={t.id}
                    onClick={() => setEstilos(prev => ({ ...prev, ...t, temaVisualId: t.id }))}
                    className={`p-2.5 rounded-xl border-2 cursor-pointer transition ${
                      seleccionado ? "border-amber-700 bg-amber-100 shadow-xs" : "border-gray-200 bg-white hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800">{t.label}</span>
                      {seleccionado && <Check className="w-4 h-4 text-amber-700 font-bold" />}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        homologarTemaGlobal(t);
                      }}
                      className="w-full text-[10px] bg-amber-800 hover:bg-amber-900 text-white py-1 rounded-md font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Globe className="w-3 h-3" /> Homologar a Todos los Gafetes
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="🔤 Tipografía y Alineación">
            <div className="space-y-2.5">
              <Field label="Tipografía (Fuente)">
                <select value={estilos.fontFamily} onChange={e => set("fontFamily", e.target.value)} className={inputCls}>
                  {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </Field>

              <Field label="Alineación del Encabezado">
                <div className="flex border border-amber-300 rounded-lg overflow-hidden">
                  {[
                    { val: "left", icon: AlignLeft, label: "Izq" },
                    { val: "center", icon: AlignCenter, label: "Centro" },
                    { val: "right", icon: AlignRight, label: "Der" }
                  ].map(al => (
                    <button
                      key={al.val}
                      type="button"
                      onClick={() => set("headerAlign", al.val)}
                      className={`flex-1 py-1 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                        (estilos.headerAlign || "left") === al.val ? "bg-amber-800 text-white" : "bg-white text-slate-700 hover:bg-amber-100"
                      }`}
                    >
                      <al.icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Alineación del Nombre">
                  <div className="flex border border-amber-300 rounded-lg overflow-hidden">
                    {[
                      { val: "left", icon: AlignLeft },
                      { val: "center", icon: AlignCenter },
                      { val: "right", icon: AlignRight }
                    ].map(al => (
                      <button
                        key={al.val}
                        type="button"
                        onClick={() => set("align", al.val)}
                        className={`flex-1 py-1 text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                          (estilos.align || "center") === al.val ? "bg-amber-800 text-white" : "bg-white text-slate-700 hover:bg-amber-100"
                        }`}
                      >
                        <al.icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Interlineado">
                  <select value={estilos.lineHeight || "1.15"} onChange={e => set("lineHeight", e.target.value)} className={inputCls}>
                    <option value="1.0">1.0 (Compacto)</option>
                    <option value="1.15">1.15 (Normal)</option>
                    <option value="1.25">1.25 (Holgado)</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Tamaño Nombre (px)">
                  <input type="number" min="8" max="60" value={estilos.nombreFontSize}
                    onChange={e => set("nombreFontSize", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Tamaño Subtexto (px)">
                  <input type="number" min="6" max="24" value={estilos.subtextFontSize}
                    onChange={e => set("subtextFontSize", e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="🎨 Colores Detallados">
            <div className="grid grid-cols-2 gap-2">
              <ColorField label="Fondo encabezado" value={estilos.headerBgColor} onChange={v => set("headerBgColor", v)} />
              <ColorField label="Texto encabezado" value={estilos.headerTextColor || "#ffffff"} onChange={v => set("headerTextColor", v)} />
              <ColorField label="Color del nombre" value={estilos.nombreColor || "#1e3a8a"} onChange={v => set("nombreColor", v)} />
              <ColorField label="Fondo cuerpo" value={estilos.bodyBgColor} onChange={v => set("bodyBgColor", v)} />
              <ColorField label="Texto cuerpo" value={estilos.bodyTextColor} onChange={v => set("bodyTextColor", v)} />
              <ColorField label="Color borde" value={estilos.borderColor} onChange={v => set("borderColor", v)} />
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-800";

function Section({ title, children }) {
  return (
    <div className="bg-amber-50/90 rounded-xl border border-amber-200 p-3 space-y-2.5 shadow-xs">
      <p className="text-xs font-black text-amber-900 uppercase tracking-wide border-b border-amber-200 pb-1 flex items-center justify-between">
        <span>{title}</span>
      </p>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-700 mb-0.5 truncate">{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border border-amber-300 p-0.5 flex-shrink-0" />
        <input type="text" value={value || ""} onChange={e => onChange(e.target.value)}
          className="w-full border border-amber-300 rounded-lg px-1.5 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-mono" />
      </div>
    </div>
  );
}