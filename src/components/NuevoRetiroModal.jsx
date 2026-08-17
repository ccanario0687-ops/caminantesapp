import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, AlertTriangle, RefreshCw, ShieldCheck, Archive } from "lucide-react";
import { toast } from "sonner";

// Código de autorización requerido para iniciar un nuevo retiro
const CODIGO_AUTORIZACION = "EMAUS2025";

export default function NuevoRetiroModal({ onClose, onCompletado }) {
  const [paso, setPaso] = useState(1); // 1=advertencia, 2=código, 3=archivar, 4=número retiro
  const [codigo, setCodigo] = useState("");
  const [codigoError, setCodigoError] = useState(false);
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [retiroActual, setRetiroActual] = useState(null);
  const [archivando, setArchivando] = useState(false);

  const [parroquiaActual, setParroquiaActual] = useState("");

  useEffect(() => {
    base44.entities.ConfigRetiro.list().then(cfgs => {
      if (cfgs.length > 0) {
        setRetiroActual(cfgs[0].edicion);
        setParroquiaActual(cfgs[0].nombre_retiro || cfgs[0].provincia || "");
      }
    });
  }, []);

  const handleVerificarCodigo = () => {
    if (codigo.trim().toUpperCase() === CODIGO_AUTORIZACION) {
      setCodigoError(false);
      setPaso(3); // paso 3 = archivar
    } else {
      setCodigoError(true);
    }
  };

  const handleArchivar = async () => {
    setArchivando(true);
    const [caminantes, servidores] = await Promise.all([
      base44.entities.Caminante.list(),
      base44.entities.Servidor.list()
    ]);
    const numRetiro = retiroActual ? Number(retiroActual) : 0;

    // Solo guardar nombre y datos clave para minimizar tamaño
    const caminantesData = caminantes.map(c => ({
      f: c.numero_ficha,
      n: c.nombre,
      p: c.parroquia,
      pm: c.padrino_madrina,
      tp: c.telefono_padrino,
      r: c.rol_en_mesa,
      m: c.numero_mesa,
      e: c.estado,
      g: c.genero,
      t: c.telefono,
    }));
    const servidoresData = servidores.map(s => ({
      n: s.nombre,
      r: s.rol,
      p: s.parroquia,
      m: s.numero_mesa,
      e: s.estado,
      g: s.genero,
      t: s.telefono,
    }));

    await base44.entities.HistorialRetiro.create({
      numero_retiro: numRetiro,
      parroquia: parroquiaActual,
      fecha_archivo: new Date().toISOString().split("T")[0],
      total_caminantes: caminantes.length,
      total_servidores: servidores.length,
      caminantes: JSON.stringify(caminantesData),
      servidores: JSON.stringify(servidoresData),
    });
    setArchivando(false);
    toast.success(`Retiro #${numRetiro} archivado exitosamente`);
    setPaso(4);
  };

  const handleSaltarArchivo = () => {
    setPaso(4);
  };

  const limpiarEntidad = async (entidad) => {
    // Traer todos los registros y eliminarlos secuencialmente con pausa
    let registros = [];
    let pagina = await entidad.list(undefined, 500, 0);
    registros = [...pagina];
    while (pagina.length === 500) {
      pagina = await entidad.list(undefined, 500, registros.length);
      registros = [...registros, ...pagina];
    }
    if (registros.length === 0) return;

    // Eliminar uno por uno con pausa corta para evitar rate limit
    for (let i = 0; i < registros.length; i++) {
      await entidad.delete(registros[i].id);
      if (i % 3 === 2) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  const handleConfirmar = async () => {
    if (!nuevoNumero || isNaN(Number(nuevoNumero))) {
      toast.error("Ingresa un número de retiro válido.");
      return;
    }
    setProcesando(true);

    // Limpiar secuencialmente para no sobrecargar la API
    await limpiarEntidad(base44.entities.Caminante);
    await limpiarEntidad(base44.entities.Servidor);
    await limpiarEntidad(base44.entities.Charlista);
    await limpiarEntidad(base44.entities.Sacerdote);
    await limpiarEntidad(base44.entities.Programacion);
    await limpiarEntidad(base44.entities.MovimientoFinanciero);

    // Actualizar número de retiro en ConfigRetiro
    const configs = await base44.entities.ConfigRetiro.list();
    if (configs.length > 0) {
      await base44.entities.ConfigRetiro.update(configs[0].id, { edicion: String(nuevoNumero) });
    }

    toast.success(`¡Listo! Sistema preparado para el Retiro #${nuevoNumero}`);
    setProcesando(false);
    onCompletado();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            <h2 className="text-lg font-bold">Nuevo Retiro</h2>
          </div>
          {!procesando && (
            <button onClick={onClose} className="hover:opacity-75 transition-opacity">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">

          {/* Paso 1: Advertencia */}
          {paso === 1 && (
            <div>
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700 mb-1">¡Atención! Esta acción no se puede deshacer</p>
                  <p className="text-sm text-red-600">
                    Al iniciar un nuevo retiro se <strong>eliminarán todos</strong> los registros actuales: caminantes, servidores, charlistas, sacerdotes, programación y movimientos financieros.
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                Asegúrate de haber impreso o guardado todos los reportes del retiro actual antes de continuar.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                  Cancelar
                </button>
                <button
                  onClick={() => setPaso(2)}
                  className="px-5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Código de autorización */}
          {paso === 2 && (
            <div>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-amber-100 rounded-full p-4">
                  <ShieldCheck className="w-8 h-8 text-amber-700" />
                </div>
              </div>
              <h3 className="text-center text-base font-bold text-gray-800 mb-1">Código de Autorización</h3>
              <p className="text-center text-sm text-gray-500 mb-5">
                Ingresa el código de autorización para continuar con el proceso de nuevo retiro.
              </p>
              <div className="mb-2">
                <input
                  type="text"
                  value={codigo}
                  onChange={e => { setCodigo(e.target.value); setCodigoError(false); }}
                  onKeyDown={e => e.key === "Enter" && handleVerificarCodigo()}
                  placeholder="Código de autorización"
                  className={`w-full border rounded-lg px-3 py-2.5 text-center text-base font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-amber-400 ${codigoError ? "border-red-400 bg-red-50" : "border-amber-300"}`}
                  autoFocus
                />
                {codigoError && (
                  <p className="text-red-500 text-xs text-center mt-1.5">Código incorrecto. Inténtalo de nuevo.</p>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => setPaso(1)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                  Atrás
                </button>
                <button
                  onClick={handleVerificarCodigo}
                  className="px-5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium transition-colors"
                >
                  Verificar
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Archivar retiro actual */}
          {paso === 3 && !archivando && (
            <div>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-amber-100 rounded-full p-4">
                  <Archive className="w-8 h-8 text-amber-700" />
                </div>
              </div>
              <h3 className="text-center text-base font-bold text-gray-800 mb-1">
                ¿Archivar Retiro #{retiroActual || "actual"}?
              </h3>
              <p className="text-center text-sm text-gray-500 mb-5">
                Puedes guardar la lista de caminantes y servidores del retiro actual en el historial antes de limpiar los registros.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleArchivar}
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  Sí, archivar Retiro #{retiroActual || "actual"} antes de continuar
                </button>
                <button
                  onClick={handleSaltarArchivo}
                  className="w-full px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  No archivar, continuar sin guardar
                </button>
              </div>
            </div>
          )}

          {/* Archivando */}
          {paso === 3 && archivando && (
            <div className="text-center py-6">
              <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-700 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-amber-800 font-semibold">Archivando retiro...</p>
              <p className="text-sm text-gray-500 mt-1">Por favor espera.</p>
            </div>
          )}

          {/* Paso 4: Número de retiro */}
          {paso === 4 && !procesando && (
            <div>
              <p className="text-sm text-gray-700 mb-4">
                Ingresa el número del <strong>nuevo retiro</strong>. Este número se usará para identificar a todos los participantes.
              </p>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-amber-800 mb-1">Número del nuevo retiro</label>
                <input
                  type="number"
                  min="1"
                  value={nuevoNumero}
                  onChange={e => setNuevoNumero(e.target.value)}
                  placeholder="Ej: 46"
                  className="w-full border border-amber-300 rounded-lg px-3 py-2.5 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setPaso(3)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                  Atrás
                </button>
                <button
                  onClick={handleConfirmar}
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors"
                >
                  Sí, iniciar Retiro #{nuevoNumero || "..."}
                </button>
              </div>
            </div>
          )}

          {/* Procesando */}
          {procesando && (
            <div className="text-center py-6">
              <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-700 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-amber-800 font-semibold">Limpiando registros...</p>
              <p className="text-sm text-gray-500 mt-1">Por favor espera, no cierres esta ventana.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}