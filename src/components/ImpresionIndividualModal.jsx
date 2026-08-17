import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Printer, Tag, Briefcase, BookOpen, Bed, FileText, Layers } from "lucide-react";
import { GafeteBorrador } from "@/components/impresiones/EditorBorradorGafete";
import { CartaBorrador } from "@/components/impresiones/EditorBorradorCarta";
import { DEFAULTS_ESTILOS, DEFAULTS_POR_TIPO, cargarEstilosBlindados } from "@/components/impresiones/ConfiguracionImpresiones";
import KitCompletoImpresionModal from "@/components/impresiones/KitCompletoImpresionModal";

const TIPOS = [
  { id: "kit",            label: "📦 Kit 1-Clic", icon: Layers },
  { id: "gafete",         label: "Gafete",       icon: Tag },
  { id: "gafete_maleta",  label: "Maleta",        icon: Briefcase },
  { id: "gafete_carpeta", label: "Carpeta",       icon: BookOpen },
  { id: "gafete_cama",    label: "Cama",          icon: Bed },
  { id: "carta",          label: "Carta",         icon: FileText },
  { id: "ficha",          label: "Ficha",         icon: FileText },
];

export default function ImpresionIndividualModal({ persona, esServidor = false, onClose }) {
  const [tipo, setTipo] = useState("gafete");
  const [config, setConfig] = useState(null);
  const [estilosPorTipo, setEstilosPorTipo] = useState({});
  const printRef = useRef(null);

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs.length > 0) {
        setConfig(cfgs[0]);
        setEstilosPorTipo(cargarEstilosBlindados(cfgs[0].estilos_impresion));
      } else {
        setEstilosPorTipo(cargarEstilosBlindados());
      }
    }).catch(() => {
      setEstilosPorTipo(cargarEstilosBlindados());
    });
  }, []);

  const getEstilos = (t) => ({ ...DEFAULTS_ESTILOS, ...(DEFAULTS_POR_TIPO[t] || {}), ...(estilosPorTipo[t] || {}) });

  const estilosActivos = getEstilos(tipo);
  const nombreRetiro = estilosActivos.nombreRetiroPersonalizado || config?.nombre_retiro || "Retiro de Emaús";
  const edicion = config?.edicion ? `Edición #${config.edicion}` : "";
  const logoUrl = config?.logo_url || null;

  const handlePrint = () => {
    window.print();
  };

  if (tipo === "kit") {
    return (
      <KitCompletoImpresionModal
        personaUnica={persona}
        esServidor={esServidor}
        config={config}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      {/* Modal visible en pantalla */}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 print:hidden">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-800 to-amber-600 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              <div>
                <h2 className="font-bold text-base">Imprimir documentos</h2>
                <p className="text-amber-200 text-xs">{persona.nombre}</p>
              </div>
            </div>
            <button onClick={onClose} className="hover:opacity-75 transition-opacity">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5">
            {/* Tipo de documento */}
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">Selecciona el tipo de documento</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {TIPOS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTipo(t.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-center transition-all ${
                      tipo === t.id
                        ? "bg-amber-700 text-white border-amber-700 shadow"
                        : "bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{t.label}</span>
                    {estilosPorTipo[t.id]?.usarBorrador && (
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" title="Borrador personalizado activo" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Vista previa */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-5">
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-3 text-center">Vista previa</p>
              <div className="max-w-xs mx-auto scale-90 origin-top">
                <DocRender
                  persona={persona} tipo={tipo}
                  nombreRetiro={nombreRetiro} edicion={edicion} logoUrl={logoUrl}
                  esServidor={esServidor} estilos={estilosActivos} config={config}
                  print={false}
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Área de impresión — invisible en pantalla, visible al imprimir */}
      <div className="imp-individual-area" style={{ display: "none" }} ref={printRef}>
        <DocRender
          persona={persona} tipo={tipo}
          nombreRetiro={nombreRetiro} edicion={edicion} logoUrl={logoUrl}
          esServidor={esServidor} estilos={estilosActivos} config={config}
          print={true}
        />
      </div>

      <style>{`
        @media print {
          @page { size: auto; margin: 10mm; }
          body * { visibility: hidden !important; }
          .imp-individual-area { visibility: visible !important; display: block !important; position: absolute !important; top: 0; left: 0; width: 100%; }
          .imp-individual-area * { visibility: visible !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </>
  );
}

// ── Renderer unificado — usa exactamente los mismos componentes que Impresiones ──
function DocRender({ persona, tipo, nombreRetiro, edicion, logoUrl, esServidor, estilos: e, config, print }) {
  // Borrador activo (gafete)
  if (tipo.startsWith("gafete") && e.usarBorrador && e.borrador?.length > 0) {
    const { ancho, alto } = print ? { ancho: e.celdaAnchoMm || 96.5, alto: e.celdaAltoMm || 69 } : {};
    return <GafeteBorrador persona={persona} config={config} bloques={e.borrador} print={print} celdaAncho={ancho} celdaAlto={alto} />;
  }
  // Borrador activo (carta/ficha)
  if ((tipo === "carta" || tipo === "ficha") && e.usarBorrador && e.borrador?.length > 0) {
    return <CartaBorrador persona={persona} config={config} bloques={e.borrador} print={print} />;
  }

  const props = { persona, nombreRetiro, edicion, logoUrl, esServidor, estilos: e, config, print };

  if (tipo === "gafete")         return <GafeteCard {...props} />;
  if (tipo === "gafete_maleta")  return <GafeteMaletaCard {...props} />;
  if (tipo === "gafete_carpeta") return <GafeteCarpetaCard {...props} />;
  if (tipo === "gafete_cama")    return <GafeteCamaCard {...props} />;
  if (tipo === "carta")          return <CartaCard {...props} />;
  if (tipo === "ficha")          return <FichaCard {...props} />;
  return null;
}

// ── Los mismos renderers del módulo Impresiones ──────────────

function calcNombreFontSize(nombre, basePx) {
  const len = (nombre || "").length;
  if (len <= 12) return basePx;
  if (len <= 18) return Math.round(basePx * 0.85);
  if (len <= 25) return Math.round(basePx * 0.72);
  return Math.round(basePx * 0.60);
}

function GafeteCard({ persona, nombreRetiro, edicion, logoUrl, esServidor, estilos: e, config, print }) {
  const eslogan = e.eslogan || config?.eslogan || "";
  const lugar = e.direccion || config?.lugar || "";
  const headerBg = e.headerBgColor || "#78350f";
  const headerTextColor = e.headerTextColor || "#ffffff";
  const nombreColor = e.nombreColor || "#1e3a8a";
  const borderColor = e.borderColor || "#92400e";
  const userSize = Number(e.nombreFontSize) || 16;
  const baseSize = print ? Math.max(userSize * 1.5, 24) : 24;
  const nombreSize = calcNombreFontSize(persona.nombre, baseSize);
  const wMm = e.celdaAnchoMm || 96.5;
  const hMm = e.celdaAltoMm || 69;

  const esVertical = e.orientacion === "vertical" || (hMm && wMm && hMm > wMm);
  const borderWidth = e.borderWidth || 2;
  const textAlign = e.align || "center";
  const headerAlign = e.headerAlign || (esVertical ? "center" : "left");
  const lineHeight = e.lineHeight || 1.15;
  const borderRadius = e.borderRadius || (print ? "2" : "6");

  const posH = e.imagenFondoPosH ?? 50;
  const posV = e.imagenFondoPosV ?? 50;
  const equipoNombre = persona.equipo_trabajo || persona.equipo || persona.equipo_trabajo_nombre || "";
  const rolBase = persona.rol || persona.rol_servidor || persona.rol_en_mesa || e.textoRolDefault || "SERVIDOR DE EMAÚS";
  const textoRol = (esServidor || persona._esServidor || equipoNombre)
    ? (equipoNombre ? `${rolBase} · EQUIPO: ${equipoNombre}` : rolBase)
    : rolBase;

  return (
    <div style={{
      position: "relative",
      border: `${borderWidth}px solid ${borderColor}`, borderRadius: `${borderRadius}px`,
      background: e.bodyBgColor || "#fff",
      color: e.bodyTextColor || "#1c1917",
      fontFamily: e.fontFamily || "Georgia, serif",
      overflow: "hidden", display: "flex", flexDirection: "column",
      boxSizing: "border-box",
      ...(print ? { width: `${wMm}mm`, height: `${hMm}mm` } : { boxShadow: "0 2px 10px #0002" }),
    }}>
      {/* IMAGEN DE FONDO PERSONALIZADA DESVANECIDA CON POSICIÓN Y ESCALA */}
      {e.mostrarImagenFondo !== false && e.imagenFondoUrl && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          width: "100%", height: "100%",
          zIndex: 0, pointerEvents: "none", overflow: "hidden"
        }}>
          <img 
            src={e.imagenFondoUrl} 
            alt="Fondo Gafete"
            style={{
              width: "100%", height: "100%",
              objectFit: e.imagenFondoAjuste || "cover",
              objectPosition: `${posH}% ${posV}%`,
              transform: `scale(${escalaFondo})`,
              transformOrigin: `${posH}% ${posV}%`,
              opacity: Number(e.imagenFondoOpacidad ?? 0.2),
              mixBlendMode: "multiply",
              filter: "contrast(110%)",
              display: "block"
            }}
          />
        </div>
      )}

      {/* ENCABEZADO */}
      <div style={{ 
        display: "flex", 
        flexDirection: esVertical ? "column" : "row",
        alignItems: "center", 
        gap: "4px", 
        padding: print ? (esVertical ? "4px 6px" : "5px 8px") : (esVertical ? "6px 8px" : "8px 10px"), 
        borderBottom: `1px solid ${borderColor}44`, 
        flexShrink: 0,
        background: headerBg,
        textAlign: headerAlign,
        justifyContent: headerAlign === "center" ? "center" : (headerAlign === "right" ? "flex-end" : "flex-start"),
        zIndex: 2
      }}>
        {e.mostrarLogo !== false && (
          logoUrl
            ? <img src={logoUrl} alt="" style={{ height: print ? (esVertical ? "38px" : "46px") : "44px", width: "auto", objectFit: "contain", flexShrink: 0 }} />
            : <div style={{ height: "44px", width: "44px", background: "#fef3c7", border: "1px dashed #92400e", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "22px" }}>✝</div>
        )}
        <div style={{ flex: 1, minWidth: 0, width: "100%", textAlign: headerAlign }}>
          {e.mostrarNombreRetiro !== false && <p style={{ margin: 0, fontWeight: "900", fontSize: print ? "10px" : "9.5px", textTransform: "uppercase", color: headerTextColor, letterSpacing: "0.3px", lineHeight: 1.15, wordBreak: "break-word" }}>{nombreRetiro}</p>}
          {eslogan && <p style={{ margin: "1px 0 0", fontSize: print ? "7px" : "6.5px", fontStyle: "italic", color: headerTextColor, opacity: 0.95, lineHeight: 1.15 }}>{eslogan}</p>}
          {lugar && <p style={{ margin: "1px 0 0", fontSize: "6.5px", color: headerTextColor, opacity: 0.9, lineHeight: 1.1 }}>{lugar}</p>}
        </div>
      </div>

      {/* CUERPO CENTRAL DE LA PERSONA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: textAlign === "center" ? "center" : (textAlign === "right" ? "flex-end" : "flex-start"), padding: print ? "4px 8px 5px" : "6px 10px 8px", zIndex: 2 }}>
        <p style={{ margin: `${e.nombreMarginTop || 0}px 0 ${e.nombreMarginBottom || 0}px`, fontSize: `${nombreSize}px`, fontWeight: "900", color: nombreColor, lineHeight: lineHeight, textTransform: "uppercase", textAlign: textAlign, wordBreak: "break-word", width: "100%" }}>
          {persona.nombre}
        </p>
        {(esServidor || persona._esServidor) && e.mostrarRol !== false && (
          <p style={{ margin: "2px 0 0", fontSize: "8.5px", color: headerBg !== "#ffffff" ? headerBg : nombreColor, fontWeight: "900", textTransform: "uppercase" }}>{textoRol}</p>
        )}
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb", padding: "3px 10px 5px", flexShrink: 0, zIndex: 2 }}>
        {e.mostrarParroquia !== false && persona.parroquia && <p style={{ margin: 0, fontSize: print ? "6.5px" : "6px", color: "#6b7280", textAlign: "center" }}>{persona.parroquia}</p>}
      </div>

      {/* Número secuencial del servidor en la esquina inferior derecha */}
      {(esServidor || persona._esServidor || persona._indexServidor) && (
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

// ──────────────────────────────────────────────────────────
// GAFETE MALETA — Rediseño exacto 1:1 con la imagen de referencia (12 por página)
// ──────────────────────────────────────────────────────────
function GafeteMaletaCard({ persona, logoUrl, nombreRetiro, edicion, estilos: e = {}, print, celdaAncho, celdaAlto }) {
  const wMm = celdaAncho || e.celdaAnchoMm || 96.5;
  const hMm = celdaAlto || e.celdaAltoMm || 44;

  const headerBg = e.headerBgColor || "#b91c1c"; // Rojo exacto del modelo
  const headerTextColor = e.headerTextColor || "#ffffff";
  const nombreColor = e.nombreColor || "#000000";
  const borderColor = e.borderColor || "#b91c1c";
  const bodyBg = e.bodyBgColor || "#ffffff";
  const fontFam = e.fontFamily || "Arial, sans-serif";

  const nombrePersona = (persona?.nombre || persona?.nombre_completo || "NOMBRE DEL CAMINANTE").toUpperCase();
  const habNum = persona?.numero_habitacion || persona?.habitacion || "7";
  const mesaNum = persona?.numero_mesa || persona?.mesa || "3";
  const edadText = persona?.edad ? `${persona.edad}` : "—";
  const tallaText = persona?.talla_camisa || persona?.talla || "—";
  const retHeader = nombreRetiro || e.nombreRetiroPersonalizado || "ENCABEZADO DEL RETIRO";
  const retSubheader = edicion ? `EDICIÓN #${edicion}` : "ENCABEZADO DEL RETIRO";

  return (
    <div
      style={{
        border: `1.5px solid ${borderColor}`,
        borderRadius: "4px",
        background: bodyBg,
        fontFamily: fontFam,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        position: "relative",
        margin: "0 auto",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        ...(print ? { width: `${wMm}mm`, height: `${hMm}mm` } : { width: "100%", minHeight: "110px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" })
      }}
    >
      {/* ── 1. ENCABEZADO ROJO CON LIZ CIRCULAR ── */}
      <div
        style={{
          background: headerBg,
          color: headerTextColor,
          padding: print ? "1mm 2.5mm" : "4px 8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <div style={{
          width: print ? "4.5mm" : "18px",
          height: print ? "4.5mm" : "18px",
          borderRadius: "50%",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: "1px solid #fee2e2"
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ width: "85%", height: "85%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: "9px", color: headerBg, fontWeight: "bold" }}>✝</span>
          )}
        </div>

        <div style={{ flex: 1, overflow: "hidden", textTransform: "uppercase" }}>
          <div style={{ fontSize: print ? "6.5pt" : "8.5pt", fontWeight: "900", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.2px" }}>
            {retHeader}
          </div>
          <div style={{ fontSize: print ? "4.5pt" : "6pt", opacity: 0.9, letterSpacing: "0.2px" }}>
            {retSubheader}
          </div>
        </div>
      </div>

      {/* ── 2. CUERPO CENTRAL CON OVALO NEGRO Y TALÓN DERECHO ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        
        {/* Lado Izquierdo (Cuerpo Principal ~72% Ancho) */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: print ? "1.5mm 2.5mm" : "6px 8px", gap: "6px", position: "relative" }}>
          
          {/* Ranura Ovalada Negra de Sujeción (Strap Pill Slot) */}
          <div style={{
            width: print ? "1.8mm" : "7px",
            height: print ? "6mm" : "22px",
            borderRadius: "4px",
            background: "#000000",
            flexShrink: 0
          }} />

          {/* Nombre y Detalles de Edad / SIXE */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
            
            {/* Nombre del Caminante */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "1mm 0" }}>
              <span style={{
                fontSize: print ? "8.5pt" : "11pt",
                fontWeight: "900",
                color: nombreColor,
                lineHeight: 1.15,
                textAlign: "center",
                textTransform: "uppercase",
                wordBreak: "break-word"
              }}>
                {nombrePersona}
              </span>
            </div>

            {/* Fila Inferior Punteada con EDAD y SIXE */}
            <div style={{
              borderTop: "1px dashed #cbd5e1",
              paddingTop: "1px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              fontSize: print ? "5.5pt" : "7.5pt",
              fontWeight: "900",
              color: "#334155",
              textTransform: "uppercase"
            }}>
              <span>EDAD: <strong style={{ color: "#000" }}>{edadText}</strong></span>
              <span>SIXE: <strong style={{ color: "#000" }}>{tallaText}</strong></span>
            </div>

          </div>
        </div>

        {/* Línea Punteada Vertical de Trepado */}
        <div style={{ width: "0px", borderLeft: "1.5px dashed #cbd5e1", height: "100%" }} />

        {/* Lado Derecho (Habitación y Mesa ~28% Ancho) */}
        <div style={{
          width: "28%",
          background: "#f8fafc",
          padding: print ? "1.5mm 1mm" : "4px 4px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "center",
          boxSizing: "border-box"
        }}>
          <div style={{ fontSize: print ? "5.5pt" : "7.5pt", fontWeight: "900", color: "#000000", textTransform: "uppercase" }}>
            HABITACIÓN
          </div>

          <div style={{
            fontSize: print ? "20pt" : "26pt",
            fontWeight: "900",
            color: headerBg,
            lineHeight: 0.95,
            fontFamily: "Arial Black, sans-serif"
          }}>
            {habNum}
          </div>

          <div style={{ fontSize: print ? "5.5pt" : "7.5pt", fontWeight: "900", color: headerBg, textTransform: "uppercase" }}>
            MESA <strong style={{ color: headerBg }}>{mesaNum}</strong>
          </div>
        </div>

      </div>
    </div>
  );
}

function GafeteCarpetaCard({ persona, nombreRetiro, logoUrl, estilos: e, print }) {
  const wMm = e.celdaAnchoMm || 63;
  const hMm = e.celdaAltoMm || 54;
  return (
    <div style={{
      border: `2px solid ${e.borderColor}`, borderRadius: `${e.borderRadius}px`,
      padding: "6px 8px", textAlign: "center", background: e.bodyBgColor, fontFamily: e.fontFamily,
      overflow: "hidden", boxSizing: "border-box",
      ...(print ? { width: `${wMm}mm`, height: `${hMm}mm` } : { boxShadow: "0 2px 8px #0001" }),
    }}>
      {e.mostrarLogo !== false && logoUrl && <img src={logoUrl} alt="" style={{ height: "22px", objectFit: "contain", margin: "0 auto 3px", display: "block" }} />}
      {e.mostrarNombreRetiro !== false && <p style={{ fontSize: "7px", color: e.borderColor, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 3px", fontWeight: "bold" }}>{nombreRetiro}</p>}
      <p style={{ fontSize: "8px", color: e.bodyTextColor, margin: "0 0 2px" }}>📁 Carpeta de</p>
      <p style={{ fontSize: "13px", fontWeight: "900", color: e.bodyTextColor, margin: 0, wordBreak: "break-word", lineHeight: 1.2 }}>{persona.nombre}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// GAFETE CAMA (Rediseñado: Número de habitación como protagonista)
// ──────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// GAFETE CAMA
// ──────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// GAFETE CAMA (Actualizado para coincidir con Gafete Maleta)
// ──────────────────────────────────────────────────────────
function GafeteCamaCard({ persona, nombreRetiro, estilos, print, celdaAncho, celdaAlto }) {
  const e = estilos;
  const wMm = celdaAncho || 63;
  const hMm = celdaAlto || 54;
  
  return (
    <div style={{
      border: `${print ? "3px" : "2px"} dashed ${e.borderColor}`, 
      borderRadius: `${e.borderRadius}px`,
      padding: "6px 8px", 
      textAlign: "center",
      background: e.bodyBgColor, 
      fontFamily: e.fontFamily,
      overflow: "hidden", 
      boxSizing: "border-box",
      breakInside: "avoid", 
      pageBreakInside: "avoid",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      ...(print 
        ? { width: `${wMm}mm`, height: `${hMm}mm` } 
        : { boxShadow: "0 2px 8px #0001", minHeight: "80px" }
      ),
    }}>
      <p style={{ fontSize: "16px", margin: "0 0 4px" }}>🛏️</p>
      
      {e.mostrarNombreRetiro !== false && (
        <p style={{ 
          fontSize: "7px", 
          color: e.borderColor, 
          textTransform: "uppercase", 
          letterSpacing: "1px", 
          margin: "0 0 3px", 
          fontWeight: "bold" 
        }}>
          {nombreRetiro}
        </p>
      )}
      
      <p style={{ 
        fontSize: "13px", 
        fontWeight: "900", 
        color: e.bodyTextColor, 
        margin: "0 0 6px", 
        lineHeight: 1.2, 
        wordBreak: "break-word",
        textTransform: "uppercase"
      }}>
        {persona.nombre}
      </p>
      
      {/* Bloque de Habitación idéntico al Gafete Maleta */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "6px" }}>
        <span style={{ 
          fontSize: print ? "7px" : "9px", 
          fontWeight: "bold", 
          color: "#374151", 
          textTransform: "uppercase", 
          letterSpacing: "0.5px", 
          fontFamily: "Arial, sans-serif" 
        }}>
          HABITACIÓN
        </span>
        <span style={{ 
          fontSize: print ? "18px" : "22px", 
          fontWeight: "900", 
          color: e.borderColor || "#dc2626", 
          lineHeight: 1, 
          fontFamily: "Arial Black, Arial, sans-serif" 
        }}>
          {persona.numero_habitacion || "—"}
        </span>
      </div>

      {e.mostrarDireccion !== false && e.direccion && (
        <p style={{ fontSize: "7px", color: "#888", marginTop: "4px" }}>{e.direccion}</p>
      )}
    </div>
  );
}
function CartaCard({ persona, nombreRetiro, edicion, logoUrl, esServidor, estilos: e, print }) {
  const parrafos = (e.textoCarta || "").split("\n\n").filter(Boolean);
  return (
    <div style={{
      border: `1px solid ${e.borderColor}`, borderRadius: `${e.borderRadius}px`,
      padding: print ? "24px 32px" : `${e.paddingV}px ${e.paddingH}px`,
      background: e.bodyBgColor, fontFamily: e.fontFamily,
      ...(print ? { maxWidth: "180mm", margin: "0 auto" } : {}),
    }}>
      <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: `2px solid ${e.borderColor}44`, paddingBottom: "12px" }}>
        {e.mostrarLogo !== false && logoUrl && <img src={logoUrl} alt="" style={{ height: "40px", objectFit: "contain", margin: "0 auto 6px", display: "block" }} />}
        {e.mostrarNombreRetiro !== false && <p style={{ fontSize: `${e.subtextFontSize}px`, color: e.borderColor, textTransform: "uppercase", letterSpacing: "3px", margin: 0, fontWeight: "bold" }}>{nombreRetiro}</p>}
        {e.mostrarEdicion !== false && edicion && <p style={{ fontSize: `${Number(e.subtextFontSize) - 1}px`, color: e.borderColor, margin: "2px 0 0", opacity: 0.7 }}>{edicion}</p>}
      </div>
      <p style={{ fontSize: print ? "13px" : `${e.subtextFontSize}px`, color: e.bodyTextColor, lineHeight: 1.7, margin: 0 }}>
        Querido(a) <strong>{persona.nombre}</strong>,
      </p>
      {parrafos.map((p, i) => (
        <p key={i} style={{ fontSize: print ? "13px" : `${e.subtextFontSize}px`, color: e.bodyTextColor, lineHeight: 1.7, margin: "8px 0 0" }}>{p}</p>
      ))}
      {esServidor && e.mostrarRol !== false && (
        <p style={{ fontSize: print ? "13px" : `${e.subtextFontSize}px`, color: e.bodyTextColor, lineHeight: 1.7, marginTop: "8px" }}>
          Como <strong>{persona.rol || "servidor"}</strong>, tu entrega y generosidad hacen posible que muchos corazones se abran al amor de Dios.
        </p>
      )}
      <p style={{ fontSize: print ? "13px" : `${e.subtextFontSize}px`, color: e.bodyTextColor, lineHeight: 1.7, marginTop: "12px" }}>
        Con cariño en Cristo,<br /><strong>{e.textoFirma || "El Equipo de Emaús"}</strong>
      </p>
    </div>
  );
}

function FichaCard({ persona, nombreRetiro, edicion, logoUrl, esServidor, estilos: e, print }) {
  const fila = (label, valor) => valor ? (
    <tr key={label}>
      <td style={{ fontSize: `${e.subtextFontSize}px`, color: e.borderColor, fontWeight: "bold", paddingRight: "10px", paddingBottom: "4px", whiteSpace: "nowrap" }}>{label}</td>
      <td style={{ fontSize: `${e.subtextFontSize}px`, color: e.bodyTextColor, paddingBottom: "4px" }}>{valor}</td>
    </tr>
  ) : null;

  return (
    <div style={{
      border: `1px solid ${e.borderColor}`, borderRadius: `${e.borderRadius}px`,
      padding: `${e.paddingV}px ${e.paddingH}px`, background: e.bodyBgColor, fontFamily: e.fontFamily,
      ...(print ? { maxWidth: "180mm", margin: "0 auto" } : {}),
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          {e.mostrarLogo !== false && logoUrl && <img src={logoUrl} alt="" style={{ height: "28px", objectFit: "contain", marginBottom: "4px", display: "block" }} />}
          {e.mostrarNombreRetiro !== false && <p style={{ fontSize: `${e.subtextFontSize}px`, color: e.borderColor, textTransform: "uppercase", letterSpacing: "2px", margin: 0, fontWeight: "bold" }}>{nombreRetiro}</p>}
          {e.mostrarEdicion !== false && edicion && <p style={{ fontSize: `${Number(e.subtextFontSize) - 1}px`, color: e.borderColor, margin: "1px 0 0", opacity: 0.7 }}>{edicion}</p>}
        </div>
        <p style={{ fontSize: `${e.subtextFontSize}px`, color: e.borderColor, margin: 0, fontWeight: "bold" }}>FICHA DE {esServidor ? "SERVIDOR" : "CAMINANTE"}</p>
      </div>
      <div style={{ borderBottom: `2px solid ${e.borderColor}44`, paddingBottom: "8px", marginBottom: "10px" }}>
        <p style={{ fontSize: `${e.nombreFontSize}px`, fontWeight: "900", color: e.bodyTextColor, margin: 0 }}>{persona.nombre}</p>
        {e.mostrarRol !== false && esServidor && persona.rol && <p style={{ fontSize: `${e.subtextFontSize}px`, color: e.borderColor, margin: "2px 0 0" }}>{persona.rol}</p>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {fila("Edad", persona.edad ? `${persona.edad} años` : null)}
          {fila("Género", persona.genero)}
          {!esServidor && persona.ocupacion && fila("Ocupación", persona.ocupacion)}
          {e.mostrarTelefono !== false && fila("Teléfono", persona.telefono)}
          {e.mostrarParroquia !== false && fila("Parroquia", persona.parroquia)}
          {!esServidor && fila("Dirección", [persona.calle, persona.sector, persona.municipio, persona.provincia].filter(Boolean).join(", ") || persona.direccion)}
          {!esServidor && e.mostrarPadrinoMadrina !== false && fila("Padrino/Madrina", persona.padrino_madrina)}
          {!esServidor && persona.contacto_emergencia && fila("Contacto emerg.", [persona.contacto_emergencia, persona.relacion_emergencia].filter(Boolean).join(" · "))}
          {!esServidor && persona.telefono_emergencia && fila("Tel. emergencia", persona.telefono_emergencia)}
          {!esServidor && e.mostrarNumeroHabitacion !== false && fila("Habitación", persona.numero_habitacion)}
          {!esServidor && e.mostrarNumeroMesa !== false && fila("Mesa", persona.numero_mesa)}
          {!esServidor && e.mostrarTalla !== false && fila("Talla camisa", persona.talla_camisa)}
          {e.mostrarTipoSangre !== false && fila("Tipo de sangre", persona.tipo_sangre)}
          {!esServidor && e.mostrarNecesidadesMedicas !== false && persona.necesidades_medicas && fila("Necesidades médicas", persona.necesidades_medicas)}
          {e.mostrarNotas !== false && persona.notas && fila("Notas", persona.notas)}
        </tbody>
      </table>
    </div>
  );
}