import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Printer, X, Tag, Download, Check, Sparkles, Filter, Users, 
  CheckCircle2, Layers, Sliders, Footprints, HeartHandshake, Eye, QrCode
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const generarQR = (texto, size = 160) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(texto)}&bgcolor=ffffff&color=78350f`;
};

export default function ModalStickersMaletaAdhesivos({ abierto, onClose, configRetiro }) {
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Opciones de configuración de la hoja de stickers
  const [filtroTipo, setFiltroTipo] = useState("caminantes"); // "caminantes" | "servidores" | "todos"
  const [stickersPorHoja, setStickersPorHoja] = useState(12); // 8, 12, 16
  const [stickersPorPersona, setStickersPorPersona] = useState(2); // 1 o 2 stickers
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (abierto) {
      cargarParticipantes();
    }
  }, [abierto]);

  const cargarParticipantes = async () => {
    setLoading(true);
    try {
      const [cams, servs, remotas] = await Promise.all([
        base44.entities.Caminante.list().catch(() => []),
        base44.entities.Servidor?.list().catch(() => []) || Promise.resolve([]),
        base44.entities.InscripcionRemota.list().catch(() => [])
      ]);

      let lista = [];

      // Procesar caminantes
      (cams || []).forEach(c => {
        if (c.estado === "Aprobado" || c.estado === "Confirmado" || !c.estado) {
          lista.push({
            ...c,
            tipo_participante: "Caminante",
            ficha_num: c.numero_ficha || c.ficha || "1"
          });
        }
      });

      // Procesar servidores
      (servs || []).forEach(s => {
        if (s.estado === "Aprobado" || s.estado === "Confirmado" || !s.estado) {
          lista.push({
            ...s,
            tipo_participante: "Servidor",
            ficha_num: s.numero_ficha || s.ficha || "S"
          });
        }
      });

      // Procesar inscripciones remotas aprobadas
      (remotas || []).forEach(r => {
        const yaExiste = lista.some(x => (x.cedula && r.cedula && x.cedula === r.cedula) || x.id === r.id);
        if (!yaExiste && (r.estado === "Aprobado" || r.estado === "Confirmado")) {
          const esServ = String(r.tipo || r.rol || "").toLowerCase().includes("servid");
          lista.push({
            ...r,
            tipo_participante: esServ ? "Servidor" : "Caminante",
            ficha_num: r.numero_ficha || r.ficha || "1"
          });
        }
      });

      // Ordenar por número de ficha
      lista.sort((a, b) => (Number(a.ficha_num) || 999) - (Number(b.ficha_num) || 999));
      setParticipantes(lista);
    } catch (e) {
      console.error("Error al cargar participantes para stickers:", e);
      toast.error("Error al cargar participantes.");
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de participantes
  const participantesFiltrados = useMemo(() => {
    return participantes.filter(p => {
      const coincideTipo = 
        filtroTipo === "todos" || 
        (filtroTipo === "caminantes" && p.tipo_participante === "Caminante") ||
        (filtroTipo === "servidores" && p.tipo_participante === "Servidor");

      const q = busqueda.toLowerCase().trim();
      const coincideBusqueda = !q || 
        p.nombre?.toLowerCase().includes(q) || 
        p.parroquia?.toLowerCase().includes(q) ||
        String(p.ficha_num).includes(q);

      return coincideTipo && coincideBusqueda;
    });
  }, [participantes, filtroTipo, busqueda]);

  // Generar lista extendida de ítems de sticker (si es 2 por persona, duplica cada sticker con Maleta 1 y Maleta 2)
  const itemsStickers = useMemo(() => {
    const items = [];
    participantesFiltrados.forEach(p => {
      for (let i = 1; i <= stickersPorPersona; i++) {
        items.push({
          ...p,
          etiqueta_maleta: `MALETA #${i}`,
          num_maleta: i,
          key_unique: `${p.id || p._id || p.cedula}-${i}`
        });
      }
    });
    return items;
  }, [participantesFiltrados, stickersPorPersona]);

  if (!abierto) return null;

  const nombreRetiro = configRetiro?.nombre_retiro || "Retiro de Emaús";
  const edicion = configRetiro?.edicion ? `Edición #${configRetiro.edicion}` : "";

  const handleImprimir = () => {
    window.print();
  };

  // Configuración de la cuadrícula según cantidad por hoja
  const gridColsClass = 
    stickersPorHoja === 8 ? "grid-cols-2" :
    stickersPorHoja === 12 ? "grid-cols-3" :
    "grid-cols-4";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
      
      {/* IMPRESIÓN LIMPIA CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 6mm 8mm 6mm;
          }
          
          body * {
            visibility: hidden;
          }

          .area-impresion-stickers, .area-impresion-stickers * {
            visibility: visible;
          }

          .area-impresion-stickers {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .sticker-card-print {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* ENCABEZADO MODAL (NO PRINT) */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 p-4 flex items-center justify-between border-b border-amber-500/30 no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600/30 flex items-center justify-center border border-amber-500/40 text-amber-300">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
                Stickers Adhesivos de Maleta (PDF Masivo) <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-amber-200/80 font-mono">
                Impresión masiva optimizada para hojas de papel adhesivo estándar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleImprimir}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Imprimir Stickers Adhesivos
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BARRA DE CONFIGURACIÓN TÁCTICA (NO PRINT) */}
        <div className="bg-slate-950 p-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs no-print shrink-0">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro Tipo Participante */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1">Mostrar:</span>
              <button
                onClick={() => setFiltroTipo("caminantes")}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  filtroTipo === "caminantes" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Caminantes
              </button>
              <button
                onClick={() => setFiltroTipo("servidores")}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  filtroTipo === "servidores" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Servidores
              </button>
              <button
                onClick={() => setFiltroTipo("todos")}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  filtroTipo === "todos" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Todos
              </button>
            </div>

            {/* Selector de Stickers por Hoja */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1">Por Hoja A4:</span>
              {[8, 12, 16].map(num => (
                <button
                  key={num}
                  onClick={() => setStickersPorHoja(num)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                    stickersPorHoja === num ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {num} stickers
                </button>
              ))}
            </div>

            {/* Cantidad por Persona */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-1">Por Persona:</span>
              {[1, 2].map(cant => (
                <button
                  key={cant}
                  onClick={() => setStickersPorPersona(cant)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                    stickersPorPersona === cant ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {cant} {cant === 1 ? "sticker" : "stickers (M1 / M2)"}
                </button>
              ))}
            </div>
          </div>

          {/* Buscador */}
          <div className="w-full sm:w-56">
            <input
              type="text"
              placeholder="Buscar por nombre o ficha..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

        </div>

        {/* VISTA PREVIA Y ÁREA DE IMPRESIÓN */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 area-impresion-stickers flex flex-col items-center">
          
          <div className="text-center mb-3 no-print">
            <span className="text-xs font-bold text-amber-300 font-mono">
              Total de Stickers Generados: {itemsStickers.length} etiquetas ({Math.ceil(itemsStickers.length / stickersPorHoja)} páginas de papel adhesivo)
            </span>
          </div>

          {/* CUADRÍCULA DE HOJA ADHESIVA */}
          <div className={`w-full max-w-[210mm] bg-white text-slate-900 p-3 sm:p-5 rounded-2xl shadow-2xl border-2 border-slate-300 grid ${gridColsClass} gap-3 sm:gap-4 font-sans`}>
            
            {itemsStickers.map((item, index) => {
              const qrPayload = `MALETA|EMAUS|${item.nombre}|FICHA-${item.ficha_num}|${item.etiqueta_maleta}`;
              const qrUrl = generarQR(qrPayload, 140);
              const esServidor = item.tipo_participante === "Servidor";

              return (
                <div
                  key={item.key_unique || index}
                  className="sticker-card-print bg-white border-2 border-dashed border-slate-400 rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-amber-500 transition"
                  style={{ minHeight: stickersPorHoja === 8 ? "160px" : stickersPorHoja === 12 ? "135px" : "110px" }}
                >
                  {/* Encabezado del Sticker */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-black uppercase font-mono tracking-wider bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded">
                        EMAÚS · {item.etiqueta_maleta}
                      </span>
                    </div>

                    <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase ${
                      esServidor ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
                    }`}>
                      #{item.ficha_num}
                    </span>
                  </div>

                  {/* Cuerpo del Sticker: Nombre Grande + QR */}
                  <div className="flex items-center justify-between gap-1.5 my-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-900 text-sm sm:text-base uppercase leading-none tracking-tight truncate">
                        {item.nombre}
                      </h3>
                      {item.apodo && (
                        <p className="text-[10px] font-bold text-amber-800 italic mt-0.5">"{item.apodo}"</p>
                      )}
                      <p className="text-[9px] font-semibold text-slate-600 truncate mt-1">
                        {item.parroquia || "Retiro de Emaús"}
                      </p>
                    </div>

                    {/* QR Code */}
                    <div className="shrink-0 bg-white p-0.5 border border-slate-300 rounded">
                      <img src={qrUrl} alt="QR" className="w-12 h-12 object-contain" />
                    </div>
                  </div>

                  {/* Pie del Sticker: Habitación y Mesa */}
                  <div className="bg-slate-100 rounded-lg p-1 border border-slate-200 flex items-center justify-between text-[9px] font-bold text-slate-800 mt-1">
                    <span>
                      {item.numero_habitacion ? `Hab: N°${item.numero_habitacion}` : "Hab: —"}
                    </span>
                    <span>
                      {item.numero_mesa ? `Mesa: N°${item.numero_mesa}` : "Mesa: —"}
                    </span>
                    <span className="font-mono text-slate-500 text-[8px]">
                      {item.tipo_participante}
                    </span>
                  </div>

                </div>
              );
            })}

          </div>

        </div>

      </div>
    </div>
  );
}
