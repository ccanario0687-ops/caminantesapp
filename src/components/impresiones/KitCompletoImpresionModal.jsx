import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  Printer, X, Tag, Briefcase, BookOpen, Bed, FileText,
  CheckSquare, Square, Users, Sparkles, Scissors, ChevronLeft, ChevronRight, Layers,
  ArrowUp, ArrowDown, Move, Sliders
} from "lucide-react";
import { DEFAULTS_ESTILOS, DEFAULTS_POR_TIPO, cargarEstilosBlindados } from "@/components/impresiones/ConfiguracionImpresiones";
import { GafeteBorrador } from "@/components/impresiones/EditorBorradorGafete";
import { CartaBorrador } from "@/components/impresiones/EditorBorradorCarta";
import { GafeteCard, GafeteMaletaCard, GafeteCarpetaCard, GafeteCamaCard, CartaCard } from "@/pages/Impresiones";

export default function KitCompletoImpresionModal({
  personas = [],
  personaUnica = null,
  esServidor = false,
  config: configProp = null,
  onClose
}) {
  // Si nos pasan una persona única, la convertimos en array de 1 elemento
  const listaInicial = personaUnica ? [personaUnica] : (Array.isArray(personas) ? personas : []);
  
  const [config, setConfig] = useState(configProp);
  const [estilosPorTipo, setEstilosPorTipo] = useState({});
  const [indiceActual, setIndiceActual] = useState(0);
  const [filtroMesa, setFiltroMesa] = useState("todas");
  const [filtroEquipo, setFiltroEquipo] = useState("todos");

  // Piezas a incluir en cada Kit (seleccionables por el usuario)
  const [incluirPiezas, setIncluirPiezas] = useState({
    gafete: true,
    gafete_maleta: true,
    gafete_carpeta: true,
    gafete_cama: true,
    carta: false,
  });

  // Cantidad configurable por pieza
  const [cantidades, setCantidades] = useState({
    gafete: 1,
    gafete_maleta: 2, // 👈 2 por cada caminante por defecto
    gafete_carpeta: 1,
    gafete_cama: 1,
  });

  // Orden interactivo de fichas en el tablero A4 (reordenable por el usuario)
  const [ordenFichas, setOrdenFichas] = useState([
    { id: "gafete", label: "Gafete Pecho", icon: Tag },
    { id: "gafete_maleta", label: "Gafetes Maleta", icon: Briefcase },
    { id: "gafete_cama", label: "Gafete Cama", icon: Bed },
    { id: "gafete_carpeta", label: "Gafete Carpeta", icon: BookOpen },
  ]);

  const handleMoverFicha = (idx, direccion) => {
    const targetIdx = idx + direccion;
    if (targetIdx < 0 || targetIdx >= ordenFichas.length) return;
    setOrdenFichas(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Ajustes manuales milimétricos de alineación e impresión física
  const [ajustesAlineacion, setAjustesAlineacion] = useState({
    autoAjustar: true,
    escalaGeneralPct: 100,
    gapFilasMm: 2,
    margenArribaMm: 0,
    margenIzquierdaMm: 0,
    altoPechoMm: 68,
    altoMaletaMm: 44,
    altoCamaMm: 42,
    altoCarpetaMm: 94
  });

  const handleCambiarAjuste = (key, val) => {
    setAjustesAlineacion(prev => ({
      ...prev,
      [key]: typeof val === "number" ? Math.max(0, Math.min(200, val)) : val
    }));
  };

  const printRef = useRef(null);

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs.length > 0) {
        setConfig(cfgs[0]);
        setEstilosPorTipo(cargarEstilosBlindados(cfgs[0].estilos_impresion));
      } else {
        setEstilosPorTipo(cargarEstilosBlindados(configProp?.estilos_impresion));
      }
    }).catch(() => {
      setEstilosPorTipo(cargarEstilosBlindados(configProp?.estilos_impresion));
    });
  }, [configProp]);

  // Lista de mesas o equipos únicos para filtrar
  const mesasDisponibles = [...new Set(listaInicial.map(p => p.numero_mesa || p.mesa).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const equiposDisponibles = [...new Set(listaInicial.map(p => p.equipo_trabajo || p.equipo).filter(Boolean))].sort();

  // Filtrado de la lista
  const personasFiltradas = listaInicial.filter(p => {
    if (filtroMesa !== "todas" && String(p.numero_mesa || p.mesa) !== String(filtroMesa)) return false;
    if (filtroEquipo !== "todos" && String(p.equipo_trabajo || p.equipo) !== String(filtroEquipo)) return false;
    return true;
  });

  const personaActual = personasFiltradas[indiceActual] || personasFiltradas[0] || personaUnica;

  const togglePieza = (key) => {
    setIncluirPiezas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCambiarCantidad = (key, delta) => {
    setCantidades(prev => ({
      ...prev,
      [key]: Math.max(1, Math.min(10, (prev[key] || 1) + delta))
    }));
  };

  const handleImprimirKit = () => {
    window.print();
  };

  return (
    <>
      {/* CSS DE IMPRESIÓN EXPLÍCITO Y TOTALMENTE AISLADO */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }

          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print, .no-print * {
            display: none !important;
          }

          body * {
            visibility: hidden;
          }

          .area-impresion-kit-completo,
          .area-impresion-kit-completo * {
            visibility: visible !important;
          }

          .area-impresion-kit-completo {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 999999 !important;
            box-sizing: border-box !important;
            display: block !important;
          }

          .hoja-kit-page-wrapper {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
            position: relative !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* ── MODAL VISIBLE EN PANTALLA EN 3 COLUMNAS (HOJA AL CENTRO, CONTROLES A LOS LADOS) ── */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 no-print animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl max-w-[96vw] lg:max-w-[1360px] w-full flex flex-col overflow-hidden border border-amber-300 max-h-[95vh] h-[95vh]">
          
          {/* Header Superior */}
          <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-800 text-white px-5 py-3 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl border border-white/20">
                <Layers className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h2 className="font-bold text-base flex items-center gap-2">
                  📦 Kit Impreso Consolidado en 1 Clic ("Lote Completo")
                </h2>
                <p className="text-amber-200 text-xs">
                  {personaUnica ? `Kit para ${personaUnica.nombre}` : `Lote de ${personasFiltradas.length} participantes seleccionados`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleImprimirKit}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-black px-5 py-2 rounded-xl shadow-lg hover:shadow-xl transition cursor-pointer text-xs uppercase tracking-wider"
              >
                <Printer className="w-4 h-4" />
                Imprimir {personaUnica ? "Kit" : `Lote (${personasFiltradas.length} Kits)`}
              </button>

              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 text-amber-100 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Principal en 3 Columnas (Izquierda: Datos/Piezas | Centro: Hoja A4 | Derecha: Ajustes Milimétricos) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-100 min-h-0">
            
            {/* 📍 COLUMNA IZQUIERDA (Cols 3): Filtros y Piezas a Incluir */}
            <div className="lg:col-span-3 p-3 overflow-y-auto space-y-3 border-r border-slate-200 bg-slate-50">
              
              {/* Filtros por Lote */}
              {!personaUnica && (
                <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2 shadow-2xs">
                  <p className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-amber-100 pb-1">
                    <Users className="w-3.5 h-3.5 text-amber-700" /> Filtrar Lote:
                  </p>

                  {mesasDisponibles.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Por Mesa:</label>
                      <select 
                        value={filtroMesa} 
                        onChange={e => { setFiltroMesa(e.target.value); setIndiceActual(0); }}
                        className="w-full border border-amber-300 rounded-lg px-2 py-1 text-xs font-semibold bg-white text-slate-800"
                      >
                        <option value="todas">Todas las mesas ({listaInicial.length})</option>
                        {mesasDisponibles.map(m => (
                          <option key={m} value={m}>Mesa {m}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {equiposDisponibles.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-1">Por Equipo de Trabajo:</label>
                      <select 
                        value={filtroEquipo} 
                        onChange={e => { setFiltroEquipo(e.target.value); setIndiceActual(0); }}
                        className="w-full border border-amber-300 rounded-lg px-2 py-1 text-xs font-semibold bg-white text-slate-800"
                      >
                        <option value="todos">Todos los equipos</option>
                        {equiposDisponibles.map(eq => (
                          <option key={eq} value={eq}>{eq}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="pt-1 text-[11px] font-bold text-amber-800 text-right">
                    Kits a generar: <span className="bg-amber-200 px-2 py-0.5 rounded-full text-amber-950">{personasFiltradas.length} hojas A4</span>
                  </div>
                </div>
              )}

              {/* Selección de Piezas y Cantidades del Kit */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2 shadow-2xs">
                <p className="text-xs font-black text-amber-900 uppercase tracking-wider border-b border-amber-100 pb-1">
                  🧩 Piezas por Hoja A4:
                </p>
                <div className="space-y-2">
                  {[
                    { id: "gafete", label: "Gafete Pecho", icon: Tag },
                    { id: "gafete_maleta", label: "Gafetes Maleta", icon: Briefcase },
                    { id: "gafete_cama", label: "Gafete Cama", icon: Bed },
                    { id: "gafete_carpeta", label: "Gafete Carpeta", icon: BookOpen },
                  ].map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-amber-50/80 p-2 rounded-lg border border-amber-200 hover:bg-amber-100/60 text-xs font-bold text-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={incluirPiezas[p.id]}
                          onChange={() => togglePieza(p.id)}
                          className="w-4 h-4 accent-amber-800 cursor-pointer"
                        />
                        <p.icon className="w-3.5 h-3.5 text-amber-700" />
                        <span className="text-[11px]">{p.label}</span>
                      </label>

                      {incluirPiezas[p.id] && (
                        <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-md border border-amber-300 shadow-2xs">
                          <span className="text-[9px] text-amber-900 font-extrabold">Cant:</span>
                          <button
                            type="button"
                            onClick={() => handleCambiarCantidad(p.id, -1)}
                            className="w-4 h-4 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 font-black flex items-center justify-center cursor-pointer text-xs"
                          >
                            -
                          </button>
                          <span className="w-4 text-center font-mono font-black text-xs text-amber-950">
                            {cantidades[p.id] || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCambiarCantidad(p.id, 1)}
                            className="w-4 h-4 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 font-black flex items-center justify-center cursor-pointer text-xs"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Indicaciones de Corte */}
              <div className="bg-amber-100/80 border border-amber-300 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-950">
                <Scissors className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[11px]">
                  <strong>Líneas de guiado:</strong> Bordes punteados para recortar rápidamente con tijera o guillotina.
                </div>
              </div>

            </div>

            {/* 📍 COLUMNA CENTRAL (Cols 6): Vista Previa de la Hoja A4 Centrada Exacta */}
            <div className="lg:col-span-6 p-3 sm:p-4 flex flex-col items-center justify-between bg-slate-900 text-white overflow-y-auto min-h-0 relative">
              
              {/* Barra de Navegación de Participantes */}
              {personasFiltradas.length > 1 && (
                <div className="flex items-center justify-between w-full mb-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs shrink-0 z-10 shadow-md">
                  <button 
                    onClick={() => setIndiceActual(prev => Math.max(0, prev - 1))}
                    disabled={indiceActual === 0}
                    className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <span className="font-mono font-bold text-amber-200 text-xs truncate max-w-[260px]">
                    {indiceActual + 1}/{personasFiltradas.length}: <strong className="text-white">{personaActual?.nombre}</strong>
                  </span>
                  <button 
                    onClick={() => setIndiceActual(prev => Math.min(personasFiltradas.length - 1, prev + 1))}
                    disabled={indiceActual >= personasFiltradas.length - 1}
                    className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* VISTA PREVIA HOJA A4 CONSOLIDADA CENTRADA EXACTA */}
              <div className="w-full flex-1 flex items-center justify-center overflow-auto p-1 min-h-0">
                <div className="origin-top transform scale-[0.55] sm:scale-[0.62] md:scale-[0.68] lg:scale-[0.72] xl:scale-[0.78] transition-all transform-gpu shadow-2xl my-auto">
                  {personaActual ? (
                    <HojaKitA4Render 
                      persona={personaActual} 
                      piezas={incluirPiezas} 
                      cantidades={cantidades}
                      ordenFichas={ordenFichas}
                      estilosPorTipo={estilosPorTipo} 
                      config={config} 
                      esServidor={esServidor} 
                      print={false} 
                      ajustesAlineacion={ajustesAlineacion}
                    />
                  ) : (
                    <div className="p-8 text-center text-slate-400">No hay participantes seleccionados.</div>
                  )}
                </div>
              </div>

              <p className="text-[10px] font-mono text-amber-200/80 mt-1 text-center shrink-0">
                📄 Hoja A4 Centrada · Ajuste automático en 1 sola hoja sin solapados
              </p>
            </div>

            {/* 📍 COLUMNA DERECHA (Cols 3): Panel de Ajustes, Calibración y Reordenamiento de Fichas */}
            <div className="lg:col-span-3 p-3 overflow-y-auto space-y-3 border-l border-slate-800 bg-slate-950 text-slate-100">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" /> Ajuste y Modificación Manual
                </span>
                <button
                  type="button"
                  onClick={() => setAjustesAlineacion({ autoAjustar: true, escalaGeneralPct: 100, gapFilasMm: 2, margenArribaMm: 0, margenIzquierdaMm: 0, altoPechoMm: 68, altoMaletaMm: 44, altoCamaMm: 42, altoCarpetaMm: 94 })}
                  className="text-[10px] text-amber-300/80 hover:text-amber-200 underline cursor-pointer"
                >
                  Restablecer
                </button>
              </div>

              {/* 🧩 TABLERO DE FICHAS (REORDENAR POSICIÓN) */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[11px] font-black text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center gap-1">
                  <Move className="w-3.5 h-3.5 text-amber-400" /> Tablero de Fichas (Mover):
                </p>
                <div className="space-y-1.5">
                  {ordenFichas.map((ficha, idx) => (
                    <div key={ficha.id} className="flex items-center justify-between bg-slate-850 p-1.5 rounded-lg border border-slate-800 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <ficha.icon className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold text-slate-200">{ficha.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoverFicha(idx, -1)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-amber-300 cursor-pointer"
                          title="Mover Arriba"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === ordenFichas.length - 1}
                          onClick={() => handleMoverFicha(idx, 1)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-amber-300 cursor-pointer"
                          title="Mover Abajo"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggle Auto-Ajustar a 1 Hoja A4 */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px] font-bold text-amber-300">⚡ Auto-Ajustar a 1 Hoja A4:</span>
                  <input
                    type="checkbox"
                    checked={ajustesAlineacion.autoAjustar !== false}
                    onChange={e => handleCambiarAjuste("autoAjustar", e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </label>
                <p className="text-[9.5px] text-slate-400 leading-tight">
                  Escala automáticamente la hoja para garantizar que TODOS los gafetes quepan en 1 sola hoja A4 sin solaparse ni pasarse a la página 2.
                </p>
              </div>

              {/* Escala General % */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-300">Zoom / Escala Impresión:</span>
                  <span className="font-mono font-bold text-amber-400">{ajustesAlineacion.escalaGeneralPct ?? 100}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleCambiarAjuste("escalaGeneralPct", (ajustesAlineacion.escalaGeneralPct || 100) - 2)} className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">-</button>
                  <input 
                    type="range" 
                    min="75" 
                    max="115" 
                    value={ajustesAlineacion.escalaGeneralPct ?? 100} 
                    onChange={e => handleCambiarAjuste("escalaGeneralPct", Number(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <button type="button" onClick={() => handleCambiarAjuste("escalaGeneralPct", (ajustesAlineacion.escalaGeneralPct || 100) + 2)} className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">+</button>
                </div>
              </div>

              {/* Márgenes y Separaciones */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[11px] font-black text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-1">
                  📐 Márgenes y Separaciones:
                </p>
                
                <div className="space-y-1.5 text-[10.5px]">
                  {/* Sep. entre Filas */}
                  <div className="flex items-center justify-between bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-medium">Separación Filas:</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleCambiarAjuste("gapFilasMm", (ajustesAlineacion.gapFilasMm || 2) - 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">-</button>
                      <span className="w-6 text-center font-mono font-bold text-amber-300">{ajustesAlineacion.gapFilasMm ?? 2}mm</span>
                      <button type="button" onClick={() => handleCambiarAjuste("gapFilasMm", (ajustesAlineacion.gapFilasMm || 2) + 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">+</button>
                    </div>
                  </div>

                  {/* Margen Arriba */}
                  <div className="flex items-center justify-between bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-medium">Margen Superior:</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleCambiarAjuste("margenArribaMm", (ajustesAlineacion.margenArribaMm || 0) - 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">-</button>
                      <span className="w-6 text-center font-mono font-bold text-amber-300">{ajustesAlineacion.margenArribaMm ?? 0}mm</span>
                      <button type="button" onClick={() => handleCambiarAjuste("margenArribaMm", (ajustesAlineacion.margenArribaMm || 0) + 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">+</button>
                    </div>
                  </div>

                  {/* Margen Izquierda */}
                  <div className="flex items-center justify-between bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-medium">Margen Izquierdo:</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleCambiarAjuste("margenIzquierdaMm", (ajustesAlineacion.margenIzquierdaMm || 0) - 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">-</button>
                      <span className="w-6 text-center font-mono font-bold text-amber-300">{ajustesAlineacion.margenIzquierdaMm ?? 0}mm</span>
                      <button type="button" onClick={() => handleCambiarAjuste("margenIzquierdaMm", (ajustesAlineacion.margenIzquierdaMm || 0) + 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Altura de Cada Gafete Individual */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                <p className="text-[11px] font-black text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-1">
                  🏷️ Modificar Altura por Gafete:
                </p>

                <div className="space-y-1.5 text-[10.5px]">
                  {/* Alto Gafete Pecho */}
                  <div className="flex items-center justify-between bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-medium">Gafete Pecho:</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleCambiarAjuste("altoPechoMm", (ajustesAlineacion.altoPechoMm || 68) - 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">-</button>
                      <span className="w-6 text-center font-mono font-bold text-amber-300">{ajustesAlineacion.altoPechoMm ?? 68}mm</span>
                      <button type="button" onClick={() => handleCambiarAjuste("altoPechoMm", (ajustesAlineacion.altoPechoMm || 68) + 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">+</button>
                    </div>
                  </div>

                  {/* Alto Gafete Maleta */}
                  <div className="flex items-center justify-between bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-medium">Gafete Maleta:</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleCambiarAjuste("altoMaletaMm", (ajustesAlineacion.altoMaletaMm || 44) - 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">-</button>
                      <span className="w-6 text-center font-mono font-bold text-amber-300">{ajustesAlineacion.altoMaletaMm ?? 44}mm</span>
                      <button type="button" onClick={() => handleCambiarAjuste("altoMaletaMm", (ajustesAlineacion.altoMaletaMm || 44) + 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">+</button>
                    </div>
                  </div>

                  {/* Alto Gafete Cama */}
                  <div className="flex items-center justify-between bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-medium">Gafete Cama:</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleCambiarAjuste("altoCamaMm", (ajustesAlineacion.altoCamaMm || 42) - 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">-</button>
                      <span className="w-6 text-center font-mono font-bold text-amber-300">{ajustesAlineacion.altoCamaMm ?? 42}mm</span>
                      <button type="button" onClick={() => handleCambiarAjuste("altoCamaMm", (ajustesAlineacion.altoCamaMm || 42) + 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">+</button>
                    </div>
                  </div>

                  {/* Alto Gafete Carpeta */}
                  <div className="flex items-center justify-between bg-slate-850 p-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-medium">Gafete Carpeta:</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleCambiarAjuste("altoCarpetaMm", (ajustesAlineacion.altoCarpetaMm || 94) - 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">-</button>
                      <span className="w-6 text-center font-mono font-bold text-amber-300">{ajustesAlineacion.altoCarpetaMm ?? 94}mm</span>
                      <button type="button" onClick={() => handleCambiarAjuste("altoCarpetaMm", (ajustesAlineacion.altoCarpetaMm || 94) + 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-amber-300 font-bold flex items-center justify-center cursor-pointer text-xs">+</button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Footer de Botones */}
          <div className="bg-white border-t border-amber-200 px-5 py-2.5 flex items-center justify-between shrink-0">
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={handleImprimirKit}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-900 hover:to-amber-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition cursor-pointer text-xs"
            >
              <Printer className="w-4 h-4" />
              Imprimir {personaUnica ? "Kit de Participante" : `Lote Completo (${personasFiltradas.length} Kits)`}
            </button>
          </div>

        </div>
      </div>

      {/* ── SECCIÓN OCULTA SOLO PARA IMPRESIÓN FÍSICA (PRINT) ── */}
      <div className="area-impresion-kit-completo font-serif text-black" ref={printRef}>
        {(personasFiltradas.length > 0 ? personasFiltradas : listaInicial).map((personaItem, idx) => (
          <div key={personaItem.id || personaItem.cedula || idx} className="hoja-kit-page-wrapper">
            <HojaKitA4Render 
              persona={personaItem} 
              piezas={incluirPiezas} 
              cantidades={cantidades}
              ordenFichas={ordenFichas}
              estilosPorTipo={estilosPorTipo} 
              config={config} 
              esServidor={esServidor} 
              print={true} 
              ajustesAlineacion={ajustesAlineacion}
            />
          </div>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE RENDERIZADOR DE LA HOJA A4 CONSOLIDADA (1 KIT POR HOJA)
// ═══════════════════════════════════════════════════════════════
function HojaKitA4Render({ persona, piezas, cantidades = {}, ordenFichas = [], estilosPorTipo, config, esServidor, print, ajustesAlineacion = {} }) {
  const nombreRetiro = config?.nombre_retiro || "Retiro de Emaús";
  const edicion = config?.edicion ? `Edición #${config.edicion}` : "";

  const autoAjustar = ajustesAlineacion.autoAjustar !== false;
  const escalaGeneralPct = ajustesAlineacion.escalaGeneralPct ?? 100;
  const gapMm = ajustesAlineacion.gapFilasMm ?? 2;
  const margenArribaMm = ajustesAlineacion.margenArribaMm ?? 0;
  const margenIzqMm = ajustesAlineacion.margenIzquierdaMm ?? 0;

  const altoPecho = ajustesAlineacion.altoPechoMm ?? 68;
  const altoMaleta = ajustesAlineacion.altoMaletaMm ?? 44;
  const altoCama = ajustesAlineacion.altoCamaMm ?? 42;
  const altoCarpeta = ajustesAlineacion.altoCarpetaMm ?? 94;

  const eGafete = { ...(estilosPorTipo["gafete"] || {}), celdaAltoMm: altoPecho };
  const eMaleta = { ...(estilosPorTipo["gafete_maleta"] || {}), celdaAltoMm: altoMaleta };
  const eCarpeta = { ...(estilosPorTipo["gafete_carpeta"] || {}), celdaAltoMm: altoCarpeta };
  const eCama = { ...(estilosPorTipo["gafete_cama"] || {}), celdaAltoMm: altoCama };

  const logoUrl = config?.logo_url || config?.logo_hombres_url || config?.logo_mujeres_url || "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/28de3e4eb_logoemauscircular.png";

  const renderProps = { persona, nombreRetiro, edicion, logoUrl, esServidor, config, print };

  const listaPiezas = [];
  if (piezas.gafete) {
    const cant = Math.max(1, Number(cantidades.gafete || 1));
    for (let i = 0; i < cant; i++) listaPiezas.push({ tipo: "gafete", estilos: eGafete });
  }
  if (piezas.gafete_maleta) {
    const cant = Math.max(1, Number(cantidades.gafete_maleta || 2));
    for (let i = 0; i < cant; i++) listaPiezas.push({ tipo: "gafete_maleta", estilos: eMaleta });
  }
  if (piezas.gafete_cama) {
    const cant = Math.max(1, Number(cantidades.gafete_cama || 1));
    for (let i = 0; i < cant; i++) listaPiezas.push({ tipo: "gafete_cama", estilos: eCama });
  }
  if (piezas.gafete_carpeta) {
    const cant = Math.max(1, Number(cantidades.gafete_carpeta || 1));
    for (let i = 0; i < cant; i++) listaPiezas.push({ tipo: "gafete_carpeta", estilos: eCarpeta });
  }

  const gafetesPecho = listaPiezas.filter(p => p.tipo === "gafete");
  const gafetesMaleta = listaPiezas.filter(p => p.tipo === "gafete_maleta");
  const gafetesCama = listaPiezas.filter(p => p.tipo === "gafete_cama");
  const gafetesCarpeta = listaPiezas.filter(p => p.tipo === "gafete_carpeta");

  // Cálculo de auto-ajuste para garantizar 1 sola hoja A4
  const numFilasPecho = Math.ceil(gafetesPecho.length / 2);
  const numFilasMaleta = Math.ceil(gafetesMaleta.length / 2);
  const numFilasCama = gafetesCama.length;
  const numFilasCarpeta = gafetesCarpeta.length;

  const numBloques = (gafetesPecho.length ? 1 : 0) + (gafetesMaleta.length ? 1 : 0) + (gafetesCama.length ? 1 : 0) + (gafetesCarpeta.length ? 1 : 0);
  const altoAcumuladoMm = (numFilasPecho * altoPecho) + (numFilasMaleta * altoMaleta) + (numFilasCama * altoCama) + (numFilasCarpeta * altoCarpeta) + (numBloques * gapMm) + margenArribaMm;

  const maxAltoA4 = 265;
  let factorAuto = 1;
  if (autoAjustar && altoAcumuladoMm > maxAltoA4) {
    factorAuto = maxAltoA4 / altoAcumuladoMm;
  }

  const factorEscalaFinal = (escalaGeneralPct / 100) * factorAuto;

  // Filas en el orden personalizado del tablero definido por el usuario
  const listaFichasOrdenadas = (ordenFichas && ordenFichas.length > 0) ? ordenFichas : [
    { id: "gafete" }, { id: "gafete_maleta" }, { id: "gafete_cama" }, { id: "gafete_carpeta" }
  ];

  return (
    <div 
      className="hoja-kit-page"
      style={{
        width: print ? "194mm" : "185mm",
        height: print ? (autoAjustar ? "268mm" : "auto") : "auto",
        maxHeight: print ? "272mm" : "none",
        background: "#ffffff",
        border: print ? "none" : "1px solid #cbd5e1",
        borderRadius: print ? "0" : "8px",
        padding: print ? `${margenArribaMm}mm 0mm 0mm ${margenIzqMm}mm` : "4mm",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        gap: `${gapMm}mm`,
        color: "#1e293b",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        overflow: "visible",
        boxShadow: print ? "none" : "0 10px 25px rgba(0,0,0,0.3)",
        ...(factorEscalaFinal !== 1 ? {
          transform: `scale(${factorEscalaFinal})`,
          transformOrigin: "top left"
        } : {})
      }}
    >
      {listaFichasOrdenadas.map(ficha => {
        if (ficha.id === "gafete" && gafetesPecho.length > 0) {
          return (
            <div key="gafete" style={{ display: "flex", flexWrap: "nowrap", gap: `${gapMm}mm`, justifyContent: "flex-start", width: "194mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
              {gafetesPecho.map((pz, idx) => (
                <div key={`gafete-${idx}`} style={{ width: `calc((194mm - ${gapMm}mm) / 2)`, height: `${altoPecho}mm`, flexShrink: 0, boxSizing: "border-box", position: "relative" }}>
                  <GafetePiezaRender tipo={pz.tipo} estilos={pz.estilos} {...renderProps} />
                </div>
              ))}
            </div>
          );
        }

        if (ficha.id === "gafete_maleta" && gafetesMaleta.length > 0) {
          return (
            <div key="gafete_maleta" style={{ display: "flex", flexWrap: "nowrap", gap: `${gapMm}mm`, justifyContent: "space-between", width: "194mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
              {gafetesMaleta.map((pz, idx) => (
                <div key={`maleta-${idx}`} style={{ width: `calc((194mm - ${gapMm}mm) / 2)`, height: `${altoMaleta}mm`, flexShrink: 0, boxSizing: "border-box", position: "relative" }}>
                  <GafetePiezaRender tipo={pz.tipo} estilos={pz.estilos} {...renderProps} />
                </div>
              ))}
            </div>
          );
        }

        if (ficha.id === "gafete_cama" && gafetesCama.length > 0) {
          return (
            <div key="gafete_cama" style={{ display: "flex", flexDirection: "column", gap: `${gapMm}mm`, width: "194mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
              {gafetesCama.map((pz, idx) => (
                <div key={`cama-${idx}`} style={{ width: "194mm", height: `${altoCama}mm`, flexShrink: 0, boxSizing: "border-box", position: "relative" }}>
                  <GafetePiezaRender tipo={pz.tipo} estilos={pz.estilos} {...renderProps} />
                </div>
              ))}
            </div>
          );
        }

        if (ficha.id === "gafete_carpeta" && gafetesCarpeta.length > 0) {
          return (
            <div key="gafete_carpeta" style={{ display: "flex", flexDirection: "column", gap: `${gapMm}mm`, width: "194mm", breakInside: "avoid", pageBreakInside: "avoid" }}>
              {gafetesCarpeta.map((pz, idx) => (
                <div key={`carpeta-${idx}`} style={{ width: "194mm", height: `${altoCarpeta}mm`, flexShrink: 0, boxSizing: "border-box", position: "relative" }}>
                  <GafetePiezaRender tipo={pz.tipo} estilos={pz.estilos} {...renderProps} />
                </div>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

// Renderizador individual de cada pieza dentro de la hoja A4 usando los diseños reales e íntegros
function GafetePiezaRender({ tipo, persona, nombreRetiro, edicion, logoUrl, esServidor, estilos: e = {}, config, print }) {
  // Dimensiones físicas exactas respetadas por tipo (en mm)
  const celdaAncho = e.celdaAnchoMm || (
    tipo === "gafete" ? 96.5 :
    tipo === "gafete_maleta" ? 96.5 :
    tipo === "gafete_cama" ? 194 :
    tipo === "gafete_carpeta" ? 194 : 96.5
  );

  const celdaAlto = e.celdaAltoMm || (
    tipo === "gafete" ? 69 :
    tipo === "gafete_maleta" ? 44 :
    tipo === "gafete_cama" ? 42 :
    tipo === "gafete_carpeta" ? 95 : 69
  );

  const props = {
    persona,
    nombreRetiro,
    edicion,
    logoUrl,
    esServidor,
    config,
    estilos: e,
    print: true, // Se fuerza a true para garantizar que cada gafete respete exactamente sus dimensiones en mm
    celdaAncho,
    celdaAlto
  };

  if (tipo.startsWith("gafete") && e.usarBorrador && e.borrador?.length > 0) {
    return <GafeteBorrador persona={persona} config={config} bloques={e.borrador} print celdaAncho={celdaAncho} celdaAlto={celdaAlto} />;
  }

  if (tipo === "gafete") return <GafeteCard {...props} />;
  if (tipo === "gafete_maleta") return <GafeteMaletaCard {...props} />;
  if (tipo === "gafete_cama") return <GafeteCamaCard {...props} />;
  if (tipo === "gafete_carpeta") return <GafeteCarpetaCard {...props} />;
  if (tipo === "carta") return <CartaCard {...props} />;

  return null;
}
