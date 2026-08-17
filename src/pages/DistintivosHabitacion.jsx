import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import BackArrow from "@/components/BackArrow";
import SelectorComunidad from "@/components/SelectorComunidad";
import { Printer, Settings2, X, PenLine, Crown, Wifi, WifiOff, Users } from "lucide-react";
import ConfiguracionDistintivos, { DEFAULTS_DISTINTIVO } from "@/components/distintivos/ConfiguracionDistintivos";
import EditorBorradorDistintivo, { BloqueRender } from "@/components/distintivos/EditorBorradorDistintivo";
import ModalPersonalizacionDocumento from "@/components/impresiones/ModalPersonalizacionDocumento";
import useOffline from "@/hooks/useOffline";
import { useComunidad } from "@/lib/ComunidadContext";
import { useAuth } from "@/lib/AuthContext";

export default function DistintivosHabitacion() {
  const { records: todosCaminantes, loading: loadingCams, online } = useOffline("Caminante");
  const { comunidadActual } = useComunidad();
  const { user } = useAuth();

  // 🎯 Identificador de la comunidad activa
  const equipoIdActivo = 
    comunidadActual?.equipo_id || 
    comunidadActual?.id || 
    comunidadActual?.slug || 
    user?.equipo_id;

  // 🔒 AISLAMIENTO MULTI-TENANT DE CAMINANTES
  const caminantes = (todosCaminantes || []).filter(c => 
    !equipoIdActivo || 
    c.equipo_id === equipoIdActivo || 
    c.comunidad_id === equipoIdActivo || 
    c.retiro_id === equipoIdActivo
  );

  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroRetiro, setFiltroRetiro] = useState("");
  const [estilos, setEstilos] = useState(DEFAULTS_DISTINTIVO);
  const [disenioAbierto, setDisenioAbierto] = useState(false);
  const [editorBorradorAbierto, setEditorBorradorAbierto] = useState(false);
  const [modalPersonalizacion, setModalPersonalizacion] = useState(false);
  const [imprimirHabitacion, setImprimirHabitacion] = useState(null);
  const [incluirTodos, setIncluirTodos] = useState(false);

  useEffect(() => {
    // Cargar configuración del retiro directamente desde la base de datos
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs && cfgs.length > 0) {
        const c = cfgs[0];
        setConfig(c);
        setConfigId(c.id);
        setFiltroRetiro(c.edicion ? String(c.edicion) : "");
        if (c.estilos_distintivo) {
          setEstilos(prev => ({ ...prev, ...c.estilos_distintivo }));
        }
      }
      setLoading(false);
    }).catch(err => {
      console.error("Error cargando config:", err);
      setLoading(false);
    });
  }, []);

  // Filtrado robusto y permisivo
  const filtrados = caminantes.filter(c => {
    if (!c.numero_habitacion) return false; // Solo los que tienen habitación
    if (!incluirTodos && c.estado !== "Confirmado") return false; 
    if (filtroRetiro !== "" && String(c.numero_retiro) !== filtroRetiro) return false;
    return true;
  });

  const habitaciones = filtrados.reduce((acc, c) => {
    const key = c.numero_habitacion;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const habitacionesOrdenadas = Object.keys(habitaciones).map(Number).sort((a, b) => a - b);

  const logoUrl = config?.logo_url || null;
  const nombreRetiro = config?.nombre_retiro || "Retiro de Emaús";
  const edicion = config?.edicion ? `Edición #${config.edicion}` : "";

  const usarBorrador = estilos.usarBorrador && estilos.borrador?.length > 0;

  const imprimirTodo = () => {
    setImprimirHabitacion(null);
    setTimeout(() => window.print(), 100);
  };

  const imprimirUna = (num) => {
    setImprimirHabitacion(num);
    setTimeout(() => { window.print(); setImprimirHabitacion(null); }, 100);
  };

  if (loading || loadingCams) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-amber-600">Cargando datos...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50 print:bg-white pb-12">
      {/* Selector de Comunidad Superior */}
      <div className="max-w-6xl mx-auto pt-4 px-6 print:hidden">
        <SelectorComunidad />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-600 text-white px-6 py-6 shadow-lg print:hidden mt-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackArrow />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Distintivos de Habitación</h1>
                {online ? (
                  <span className="flex items-center gap-1 text-xs text-green-300 bg-green-800/40 px-2 py-0.5 rounded-full">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-800/40 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-3 h-3" /> Offline
                  </span>
                )}
              </div>
              <p className="text-amber-200 text-sm">Imprime los carteles para cada puerta en {comunidadActual?.nombre || "la comunidad activa"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModalPersonalizacion(true)}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow"
            >
              <Settings2 className="w-4 h-4 text-amber-200" />
              Personalizar Distintivo
              {usarBorrador && <span className="ml-1 w-2 h-2 bg-green-400 rounded-full" title="Borrador activo" />}
            </button>
            <button
              onClick={imprimirTodo}
              disabled={habitacionesOrdenadas.length === 0}
              className="flex items-center gap-2 bg-white text-amber-800 hover:bg-amber-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Imprimir Todo
            </button>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="max-w-6xl mx-auto px-4 py-6 print:hidden space-y-4">
        
        {/* Filtros y estadísticas */}
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg">
              <Users className="w-4 h-4 text-amber-700" />
              <span className="text-sm font-bold text-amber-800">{habitacionesOrdenadas.length}</span>
              <span className="text-sm text-amber-700">habitación(es) con personas asignadas</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-amber-200 overflow-hidden">
              <button
                onClick={() => setIncluirTodos(false)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  !incluirTodos ? "bg-amber-700 text-white" : "bg-white text-amber-700 hover:bg-amber-50"
                }`}
              >
                Solo confirmados
              </button>
              <button
                onClick={() => setIncluirTodos(true)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-amber-200 ${
                  incluirTodos ? "bg-amber-700 text-white" : "bg-white text-amber-700 hover:bg-amber-50"
                }`}
              >
                Todos los inscritos
              </button>
            </div>
            
            {config?.edicion && (
              <select 
                value={filtroRetiro} 
                onChange={(e) => setFiltroRetiro(e.target.value)}
                className="border border-amber-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="">Todas las ediciones</option>
                <option value={String(config.edicion)}>Edición {config.edicion}</option>
              </select>
            )}
          </div>
        </div>

        {/* Editor de borrador */}
        {editorBorradorAbierto && (
          <EditorBorradorDistintivo
            config={config}
            configId={configId}
            estilosIniciales={estilos}
            onGuardado={(nuevosEstilos) => setEstilos(prev => ({ ...prev, ...nuevosEstilos }))}
            onCerrar={() => setEditorBorradorAbierto(false)}
          />
        )}

        {/* Botón y panel de diseño clásico */}
        {!editorBorradorAbierto && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setDisenioAbierto(prev => !prev)}
                className="flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                {disenioAbierto ? "Ocultar diseño" : "Ajustar diseño del distintivo"}
              </button>
              {disenioAbierto && (
                <button onClick={() => setDisenioAbierto(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {disenioAbierto && (
              <ConfiguracionDistintivos
                config={config}
                configId={configId}
                estilosIniciales={estilos}
                onGuardado={(nuevosEstilos) => setEstilos(nuevosEstilos)}
              />
            )}
          </div>
        )}

        {/* Mensajes de estado vacío inteligentes */}
        {caminantes.length > 0 && filtrados.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-5xl mb-3">🔍</p>
            <p className="text-lg font-medium text-gray-600">No se encontraron habitaciones con los filtros actuales en esta comunidad.</p>
            <p className="text-sm mt-1">
              {incluirTodos 
                ? "Verifica que los caminantes tengan un número de habitación asignado en el módulo de Distribución." 
                : "Prueba activando 'Todos los inscritos' o verifica que el estado del caminante sea 'Confirmado'."}
            </p>
          </div>
        ) : habitacionesOrdenadas.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-5xl mb-3">🚪</p>
            <p className="text-lg font-medium text-gray-600">No hay habitaciones asignadas aún en esta comunidad.</p>
            <p className="text-sm mt-1">Usa el módulo de <strong>Distribución</strong> para asignar personas a habitaciones y asegúrate de presionar el botón "Guardar".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {habitacionesOrdenadas.map(num => (
              <TarjetaHabitacionVista
                key={num}
                numero={num}
                personas={habitaciones[num]}
                estilos={estilos}
                imprimirUna={imprimirUna}
              />
            ))}
          </div>
        )}
      </div>

      {/* Vista de impresión */}
      <div className="print-area" style={{ display: "none" }}>
        {(() => {
          const lista = imprimirHabitacion !== null ? [imprimirHabitacion] : habitacionesOrdenadas;
          return lista.map((num, idx) =>
            usarBorrador
              ? <TarjetaBorradorImpresion key={num} numero={num} personas={habitaciones[num]} config={config} bloques={estilos.borrador} esUltima={idx === lista.length - 1} />
              : <TarjetaImpresion key={num} numero={num} personas={habitaciones[num]} logoUrl={logoUrl} nombreRetiro={nombreRetiro} edicion={edicion} estilos={estilos} esUltima={idx === lista.length - 1} />
          );
        })()}
      </div>

      {/* Modal Personalización Distintivos de Habitación */}
      {modalPersonalizacion && (
        <ModalPersonalizacionDocumento
          tipoDoc="distintivo"
          config={config}
          configId={configId}
          estilosIniciales={estilos}
          onGuardado={(tipo, nuevosEstilos) => {
            setEstilos(prev => ({ ...prev, ...nuevosEstilos }));
          }}
          onCerrar={() => setModalPersonalizacion(false)}
        />
      )}

      <style>{`
        @media print {
          @page { size: auto; margin: ${estilos.margenArriba ?? estilos.margenImpresion ?? 10}mm ${estilos.margenDerecha ?? estilos.margenImpresion ?? 10}mm ${estilos.margenAbajo ?? estilos.margenImpresion ?? 10}mm ${estilos.margenIzquierda ?? estilos.margenImpresion ?? 10}mm; }
          body * { visibility: hidden !important; }
          .print-area { visibility: visible !important; display: block !important; position: absolute !important; top: 0; left: 0; width: 100%; }
          .print-area * { visibility: visible !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

// ── Tarjeta visual de habitación con impresión individual ─────
function TarjetaHabitacionVista({ numero, personas, estilos: e, imprimirUna }) {
  // Ordenar para que el líder aparezca siempre primero en la lista
  const personasOrdenadas = [...personas].sort((a, b) => {
    const aLider = a.rol_en_mesa === "Líder de Mesa" || a._esLider;
    const bLider = b.rol_en_mesa === "Líder de Mesa" || b._esLider;
    if (aLider && !bLider) return -1;
    if (!aLider && bLider) return 1;
    return 0;
  });

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col">
      <div className="text-center py-4 px-3" style={{ background: `linear-gradient(135deg, ${e.headerBgInicio}, ${e.headerBgFin})`, color: e.headerTextColor }}>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">{e.etiquetaHabitacion}</p>
        <p className="text-5xl font-black leading-none mt-1" style={{ color: e.headerTextColor }}>{numero}</p>
      </div>
      <ul className="flex-1 divide-y divide-amber-50 px-4 py-2">
        {personasOrdenadas.map((p, i) => {
          const esLider = p.rol_en_mesa === "Líder de Mesa" || p._esLider;
          return (
            <li key={p.id} className="py-2 flex items-center gap-2">
              <span className="text-xs font-bold w-6 text-right flex-shrink-0" style={{ color: e.colorNumero }}>{i + 1}.</span>
              <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5 flex-1 min-w-0">
                {esLider && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
                <span className="truncate">{p.nombre}</span>
                {esLider && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                    LÍDER
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between px-4 py-2 border-t border-amber-100 bg-amber-50">
        <span className="text-xs text-amber-600 font-semibold">{personasOrdenadas.length} persona(s)</span>
        <button
          onClick={() => imprimirUna(numero)}
          className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir
        </button>
      </div>
    </div>
  );
}

// ── Tarjeta borrador (vista previa miniatura) ─────────────────
function TarjetaBorradorPreview({ numero, personas, config, bloques }) {
  return (
    <div className="bg-white rounded-xl border-2 border-amber-200 shadow-md overflow-hidden" style={{ transform: "scale(1)", transformOrigin: "top left" }}>
      <div style={{ transform: "scale(0.38)", transformOrigin: "top left", width: "816px", pointerEvents: "none" }}>
        <div style={{ width: "816px", background: "#fff", display: "flex", flexDirection: "column" }}>
          {bloques.map(b => (
            <BloqueRender key={b.id} bloque={b} habitacion={{ numero }} personas={personas} config={config} print={true} />
          ))}
        </div>
      </div>
      <div className="px-3 py-1.5 bg-amber-50 text-xs text-amber-700 font-medium border-t border-amber-100">
        Habitación {numero} · {personas.length} persona(s)
      </div>
    </div>
  );
}

// ── Tarjeta borrador para impresión (tamaño carta) ────────────
function TarjetaBorradorImpresion({ numero, personas, config, bloques, esUltima }) {
  return (
    <div style={{
      width: "8.5in",
      height: "11in",
      pageBreakAfter: esUltima ? "avoid" : "always",
      pageBreakInside: "avoid",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxSizing: "border-box",
      background: "#fff",
    }}>
      {bloques.map(b => (
        <BloqueRender key={b.id} bloque={b} habitacion={{ numero }} personas={personas} config={config} print={true} />
      ))}
    </div>
  );
}

// ── Tarjeta clásica impresión (carta) — multi-página profesional ──
function TarjetaImpresion({ numero, personas, logoUrl, nombreRetiro, edicion, estilos: e, esUltima }) {
  // Ordenar para que el líder aparezca siempre primero en la lista impresa
  const personasOrdenadas = [...personas].sort((a, b) => {
    const aLider = a.rol_en_mesa === "Líder de Mesa" || a._esLider;
    const bLider = b.rol_en_mesa === "Líder de Mesa" || b._esLider;
    if (aLider && !bLider) return -1;
    if (!aLider && bLider) return 1;
    return 0;
  });

  const n = personasOrdenadas.length;
  const nombreFontSize = n <= 4 ? "58px" : n <= 6 ? "46px" : n <= 8 ? "38px" : n <= 10 ? "32px" : "26px";
  const numHabFontSize = n <= 4 ? "130px" : n <= 7 ? "110px" : "90px";

  const POR_PRIMERA = 8;
  const POR_RESTO = 14;
  const paginas = [];
  let restantes = [...personasOrdenadas];
  let pagIdx = 0;
  while (restantes.length > 0) {
    paginas.push(restantes.splice(0, pagIdx === 0 ? POR_PRIMERA : POR_RESTO));
    pagIdx++;
  }
  if (paginas.length === 0) paginas.push([]);

  const totalPaginas = paginas.length;
  const esUltimaTotal = esUltima !== false;

  const Encabezado = () => (
    <div style={{ background: `linear-gradient(135deg, ${e.headerBgInicio}, ${e.headerBgFin})`, color: e.headerTextColor, textAlign: "center", padding: "12px 24px 10px", flexShrink: 0 }}>
      {e.mostrarLogo !== false && logoUrl && (
        <img src={logoUrl} alt="Logo" style={{ height: "40px", objectFit: "contain", margin: "0 auto 5px", display: "block" }} />
      )}
      <p style={{ fontSize: "11px", letterSpacing: "5px", textTransform: "uppercase", opacity: 0.9, margin: 0, fontFamily: e.fontFamily }}>{nombreRetiro}</p>
      {e.mostrarEdicion !== false && edicion && <p style={{ fontSize: "9px", opacity: 0.7, margin: "1px 0 0", fontFamily: e.fontFamily }}>{edicion}</p>}
    </div>
  );

  return (
    <>
      {paginas.map((grupoPersonas, pi) => {
        const esUltimaPagina = pi === totalPaginas - 1 && esUltimaTotal;
        const globalIdx0 = pi === 0 ? 0 : (POR_PRIMERA + (pi - 1) * POR_RESTO);
        return (
          <div key={pi} style={{
            width: "8.5in",
            height: "11in",
            pageBreakAfter: esUltimaPagina ? "avoid" : "always",
            pageBreakInside: "avoid",
            display: "flex", flexDirection: "column",
            fontFamily: e.fontFamily,
            background: "#fff",
            boxSizing: "border-box",
            overflow: "hidden",
          }}>
            <Encabezado />

            {pi === 0 && (
              <div style={{ background: e.fondoNumero, textAlign: "center", padding: "6px 0 4px", borderBottom: `4px solid ${e.borderColor}`, flexShrink: 0 }}>
                <p style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase", color: e.colorNumero, margin: 0, fontWeight: "bold" }}>{e.etiquetaHabitacion}</p>
                <p style={{ fontSize: numHabFontSize, fontWeight: "900", color: e.colorNumero, margin: 0, lineHeight: 0.95, letterSpacing: "-4px" }}>{numero}</p>
              </div>
            )}

            {pi > 0 && (
              <div style={{ background: e.fondoNumero, borderBottom: `3px solid ${e.borderColor}`, padding: "6px 32px", display: "flex", items: "center", gap: "16px", flexShrink: 0 }}>
                <span style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: e.colorNumero, fontWeight: "bold" }}>{e.etiquetaHabitacion}</span>
                <span style={{ fontSize: "36px", fontWeight: "900", color: e.colorNumero, lineHeight: 1 }}>{numero}</span>
                <span style={{ fontSize: "11px", color: e.colorNumero, opacity: 0.6, marginLeft: "auto" }}>Pág. {pi + 1}</span>
              </div>
            )}

            {e.mostrarCruz !== false && (
              <div style={{ textAlign: "center", fontSize: "18px", color: e.borderColor, padding: "5px 0 3px", flexShrink: 0 }}>✝</div>
            )}

            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-evenly", padding: "4px 40px", overflow: "hidden" }}>
              {grupoPersonas.map((p, i) => {
                const globalIdx = globalIdx0 + i;
                const esLider = p.rol_en_mesa === "Líder de Mesa" || p._esLider;
                
                return (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: "16px",
                    padding: "8px 24px",
                    background: globalIdx % 2 === 0 ? e.fondoPar : e.fondoImpar,
                    borderRadius: "8px",
                    borderLeft: `5px solid ${esLider ? "#d97706" : e.borderColor}`,
                    flexShrink: 0,
                    boxShadow: esLider ? "0 2px 4px rgba(217, 119, 6, 0.1)" : "none"
                  }}>
                    <span style={{ color: esLider ? "#d97706" : e.borderColor, fontWeight: "900", fontSize: "20px", minWidth: "36px", textAlign: "right" }}>
                      {globalIdx + 1}.
                    </span>
                    <span style={{ 
                      fontSize: nombreFontSize, 
                      fontWeight: esLider ? "900" : "700", 
                      color: e.colorNombre, 
                      lineHeight: 1.1,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flex: 1,
                      minWidth: 0
                    }}>
                      {esLider && <span style={{ fontSize: "22px", flexShrink: 0 }}>👑</span>}
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre}</span>
                      {esLider && (
                        <span style={{ 
                          fontSize: "12px", 
                          background: e.borderColor, 
                          color: "#fff", 
                          padding: "2px 8px", 
                          borderRadius: "4px", 
                          fontWeight: "bold", 
                          letterSpacing: "1px",
                          whiteSpace: "nowrap",
                          flexShrink: 0
                        }}>
                          LÍDER
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ background: e.fondoNumero, borderTop: `2px solid ${e.borderColor}44`, textAlign: "center", padding: "7px", color: e.colorNumero, fontSize: "10px", letterSpacing: "1px", flexShrink: 0 }}>
              {personasOrdenadas.length} {e.textoPie}
            </div>
          </div>
        );
      })}
    </>
  );
}