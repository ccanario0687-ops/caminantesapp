import { useState } from "react";
import { X, Sliders, PenLine, Eye, Tag, Briefcase, BookOpen, Bed, FileText, Settings2, DoorOpen } from "lucide-react";
import ConfiguracionImpresiones from "@/components/impresiones/ConfiguracionImpresiones";
import EditorBorradorGafete, { GafeteBorrador } from "@/components/impresiones/EditorBorradorGafete";
import EditorBorradorCarta, { CartaBorrador } from "@/components/impresiones/EditorBorradorCarta";
import ConfiguracionDistintivos from "@/components/distintivos/ConfiguracionDistintivos";
import EditorBorradorDistintivo, { BloqueRender } from "@/components/distintivos/EditorBorradorDistintivo";

const NOMBRES_TIPO = {
  gafete:         { label: "Gafete Principal",        icon: Tag,       desc: "Gafete identificador para caminantes y servidores" },
  gafete_maleta:  { label: "Gafete de Maleta",        icon: Briefcase, desc: "Etiqueta identificadora para equipaje" },
  gafete_carpeta: { label: "Gafete de Carpeta",       icon: BookOpen,  desc: "Distintivo para carpetas de trabajo" },
  gafete_cama:    { label: "Gafete de Cama",          icon: Bed,       desc: "Identificador para cama en habitación" },
  carta:          { label: "Carta para Caminante",    icon: FileText,  desc: "Carta personalizada de bienvenida o reflexión" },
  ficha:          { label: "Carta de Invitación",     icon: FileText,  desc: "Documento oficial de invitación al retiro" },
  formulario:     { label: "Formulario Inscripción",  icon: FileText,  desc: "Formulario de registro impreso en blanco" },
  distintivo:     { label: "Distintivo de Habitación",icon: DoorOpen,  desc: "Cartel impreso para puerta de habitación" },
};

export default function ModalPersonalizacionDocumento({
  tipoDoc: tipoDocInicial = "gafete",
  config,
  configId,
  estilosIniciales,
  onGuardado,
  onCerrar,
  personaEjemplo
}) {
  const [tipoActivoDoc, setTipoActivoDoc] = useState(tipoDocInicial);
  const [tab, setTab] = useState("borrador"); // "estilos" | "borrador"

  const meta = NOMBRES_TIPO[tipoActivoDoc] || { label: tipoActivoDoc, icon: Settings2, desc: "Personalización del documento" };
  const IconoDoc = meta.icon;

  const muestra = personaEjemplo || {
    nombre: "Juan Pérez García",
    nombre_completo: "Juan Pérez García",
    parroquia: "Parroquia Santa Cruz",
    numero_mesa: "3",
    mesa: "Mesa 3",
    numero_habitacion: "102",
    habitacion: "Habitación 102",
    equipo_trabajo: "Cocina y Logística",
    equipo: "Cocina y Logística",
    rol: "Servidor de Emaús",
    talla_camisa: "L",
    tipo_sangre: "O+",
    padrino_madrina: "Carlos Rodríguez",
    numero_retiro: config?.edicion || "12",
  };

  const isDistintivo = tipoActivoDoc === "distintivo";
  const isCarta = tipoActivoDoc === "carta" || tipoActivoDoc === "ficha";
  const isGafete = tipoActivoDoc.startsWith("gafete");

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200 print:hidden" onClick={onCerrar}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-amber-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Principal */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-700 text-white px-5 py-3.5 flex items-center justify-between shadow-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <IconoDoc className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base leading-tight">Centro de Diseño y Ajustes — {meta.label}</h2>
                <span className="text-[10px] bg-amber-950/80 text-amber-200 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider border border-amber-500/30">
                  {tipoActivoDoc}
                </span>
              </div>
              <p className="text-amber-200/80 text-xs mt-0.5">{meta.desc}</p>
            </div>
          </div>
          <button 
            onClick={onCerrar} 
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-amber-100 hover:text-white"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 🌟 BARRA HORIZONTAL DE NAVEGACIÓN Y SELECCIÓN DE DOCUMENTOS 🌟 */}
        <div className="bg-amber-950/90 text-white px-4 py-2 flex items-center gap-2 overflow-x-auto border-b border-amber-800/60 flex-shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 shrink-0 mr-1">
            Seleccionar Documento:
          </span>
          {Object.entries(NOMBRES_TIPO).map(([id, t]) => {
            const Icon = t.icon;
            const activo = tipoActivoDoc === id;
            return (
              <button
                key={id}
                onClick={() => setTipoActivoDoc(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activo
                    ? "bg-amber-500 text-slate-950 shadow-md font-bold scale-105"
                    : "bg-amber-900/40 text-amber-200 hover:bg-amber-800/60 hover:text-white border border-amber-700/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Bar de Pestañas de Edición */}
        <div className="bg-amber-50/90 border-b border-amber-200 px-5 py-2 flex items-center justify-between flex-shrink-0 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {!isDistintivo && (
              <button
                onClick={() => setTab("borrador")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  tab === "borrador"
                    ? "bg-amber-700 text-white shadow-sm"
                    : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-100/60"
                }`}
              >
                <PenLine className="w-3.5 h-3.5" />
                Editor de Borrador (Estructura & Bloques)
              </button>
            )}
            <button
              onClick={() => setTab("estilos")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab === "estilos"
                  ? "bg-amber-700 text-white shadow-sm"
                  : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-100/60"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Diseño, Colores, Tamaños & Grilla
            </button>
          </div>

          <div className="text-xs text-amber-800 font-medium hidden sm:block">
            Modificando exclusivamente: <span className="font-bold underline text-amber-950">{meta.label}</span>
          </div>
        </div>

        {/* Cuerpo principal desplazable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">

          {/* TAB 1: Editor de Borrador (Bloques) */}
          {tab === "borrador" && !isDistintivo && (
            <div className="space-y-4">
              {isGafete && (
                <EditorBorradorGafete
                  key={`editor-gafete-${tipoActivoDoc}`}
                  config={config}
                  configId={configId}
                  tipoDoc={tipoActivoDoc}
                  estilosIniciales={estilosIniciales}
                  onGuardado={(tipo, nuevosEstilos) => {
                    onGuardado(tipo, nuevosEstilos);
                  }}
                  onCerrar={onCerrar}
                />
              )}
              {isCarta && (
                <EditorBorradorCarta
                  key={`editor-carta-${tipoActivoDoc}`}
                  config={config}
                  configId={configId}
                  tipoDoc={tipoActivoDoc}
                  estilosIniciales={estilosIniciales}
                  onGuardado={(tipo, nuevosEstilos) => {
                    onGuardado(tipo, nuevosEstilos);
                  }}
                  onCerrar={onCerrar}
                />
              )}
            </div>
          )}

          {/* TAB 2: Configuración de Estilos y Diseño */}
          {(tab === "estilos" || isDistintivo) && (
            <div className="space-y-4">
              {!isDistintivo ? (
                <ConfiguracionImpresiones
                  key={`config-impresiones-${tipoActivoDoc}`}
                  config={config}
                  configId={configId}
                  tipoDoc={tipoActivoDoc}
                  estilosIniciales={estilosIniciales}
                  onGuardado={(tipo, nuevosEstilos) => {
                    onGuardado(tipo, nuevosEstilos);
                  }}
                  onCerrar={onCerrar}
                />
              ) : (
                <ConfiguracionDistintivos
                  key="config-distintivos"
                  config={config}
                  configId={configId}
                  estilosIniciales={estilosIniciales}
                  onGuardado={(nuevosEstilos) => {
                    onGuardado("distintivo", nuevosEstilos);
                  }}
                />
              )}
            </div>
          )}

        </div>

        {/* Footer del Modal */}
        <div className="bg-white border-t border-amber-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-500">
            Los cambios se guardan de forma independiente para <strong className="text-amber-800">{meta.label}</strong>.
          </p>
          <button
            onClick={onCerrar}
            className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-colors shadow"
          >
            Listo / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
