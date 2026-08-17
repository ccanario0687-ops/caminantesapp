import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Save, Check, UserCheck, ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";
import CodigoAutorizacionModal from "@/components/CodigoAutorizacionModal";

const METODOS = [
  { value: "Efectivo", label: "Efectivo", color: "bg-green-600" },
  { value: "Transferencia", label: "Transferencia", color: "bg-blue-600" },
  { value: "Patrocinado", label: "Patrocinado por", color: "bg-purple-600" },
];

export default function CobroCuotasModal({ tipo, onClose, onGuardado, precioFicha, precioFichaServidor = 0, numeroRetiro, currentUser }) {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seleccionadas, setSeleccionadas] = useState(new Set());
  const [procesando, setProcesando] = useState(false);
  const [metodo, setMetodo] = useState("Efectivo");
  const [patrocinador, setPatrocinador] = useState("");
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        let data;
        if (tipo === "caminante") {
          data = await base44.entities.Caminante.list();
        } else {
          data = await base44.entities.Servidor.list();
        }

        // Mostrar TODOS los pendientes (el sistema está bloqueado al retiro
        // actual por RLS/equipo_id, así que no hace falta filtrar por numero_retiro).
        const filtered = data
          .filter(p => p.estado === "Pendiente")
          .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", 'es'));

        setPersonas(filtered);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    cargar();
  }, [tipo]);

  const toggleSeleccion = (id) => {
    const newSet = new Set(seleccionadas);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSeleccionadas(newSet);
  };

  const registradoPor = currentUser?.username || currentUser?.full_name || currentUser?.email || "Sistema";
  const tipoMovimiento = tipo === "caminante" ? "cuota_caminante" : "cuota_servidor";

  const esLM = (p) => tipo === "caminante" && p.rol_en_mesa === "Líder de Mesa";
  const precioDe = (p) => Number(esLM(p) ? precioFichaServidor : precioFicha) || 0;
  const tipoDe = (p) => esLM(p) ? "cuota_servidor" : tipoMovimiento;

  const ejecutarCobro = async () => {
    setProcesando(true);
    const selectedPersonas = personas.filter(p => seleccionadas.has(p.id));

    await Promise.all(
      selectedPersonas.map(p => {
        if (tipo === "caminante") {
          return base44.entities.Caminante.update(p.id, { pago_ficha: "Pagado", estado: "Confirmado" });
        } else {
          return base44.entities.Servidor.update(p.id, { pago_ficha: "Pagado", estado: "Confirmado" });
        }
      })
    );

    await Promise.all(
      selectedPersonas.map(p =>
        base44.entities.MovimientoFinanciero.create({
          tipo: tipoDe(p),
          descripcion: `Cuota ${tipo} - ${p.nombre}${metodo === "Patrocinado" ? ` (Patrocinado por ${patrocinador})` : ""}`,
          monto: precioDe(p),
          metodo_pago: metodo,
          patrocinador: metodo === "Patrocinado" ? patrocinador : undefined,
          numero_retiro: p.numero_retiro || (numeroRetiro ? Number(numeroRetiro) : 0),
          [tipo === "caminante" ? "caminante_id" : "servidor_id"]: p.id,
          caminante_nombre: p.nombre,
          fecha: new Date().toISOString().split("T")[0],
          registrado_por: registradoPor,
          equipo_id: currentUser?.equipo_id,
        })
      )
    );

    toast.success(`${seleccionadas.size} ${tipo === "caminante" ? "caminante(s)" : "servidor(es)"} cobrados`);
    setProcesando(false);
    onGuardado();
  };

  const handleCobrar = () => {
    if (seleccionadas.size === 0) {
      toast.error("Selecciona al menos una persona");
      return;
    }
    if (metodo === "Patrocinado") {
      if (!patrocinador.trim()) {
        toast.error("Indica el nombre del patrocinador.");
        return;
      }
      setPidiendoCodigo(true);
    } else {
      ejecutarCobro();
    }
  };

  const total = personas.filter(p => seleccionadas.has(p.id)).reduce((s, p) => s + precioDe(p), 0);

  const personasFiltradas = personas.filter(p => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (p.nombre || "").toLowerCase().includes(q) ||
           (p.parroquia || "").toLowerCase().includes(q) ||
           (p.telefono || "").includes(q) ||
           (String(p.numero_ficha || "")).includes(q);
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">Cargando...</div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between bg-amber-700 text-white px-5 py-4 sticky top-0">
            <h2 className="text-lg font-bold">Cobrar Fichas - {tipo === "caminante" ? "Caminantes" : "Servidores"}</h2>
            <button onClick={onClose} className="hover:opacity-75">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {personas.length === 0 ? (
              <p className="text-center text-gray-400 py-6">No hay {tipo === "caminante" ? "caminantes" : "servidores"} con pago pendiente</p>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Seleccionados:</span> {seleccionadas.size} de {personas.length} ·
                    <span className="font-bold ml-2">Total: RD${total.toFixed(2)}</span>
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Método de pago</p>
                  <div className="grid grid-cols-3 gap-2">
                    {METODOS.map(m => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMetodo(m.value)}
                        className={`px-2 py-2.5 rounded-lg text-xs font-medium border-2 transition-colors ${
                          metodo === m.value ? `${m.color} text-white border-transparent` : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {metodo === "Patrocinado" && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> Nombre del patrocinador (aplica a todos los seleccionados)
                    </p>
                    <input
                      type="text"
                      value={patrocinador}
                      onChange={e => setPatrocinador(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <p className="text-[11px] text-purple-600 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Se requerirá el código de autorización del coordinador.
                    </p>
                  </div>
                )}

                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder={`Buscar ${tipo === "caminante" ? "caminante" : "servidor"}...`}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {personasFiltradas.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-4">
                      {busqueda ? "Sin coincidencias" : "No hay pendientes"}
                    </p>
                  ) : null}
                  {personasFiltradas.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(p.id)}
                        onChange={() => toggleSeleccion(p.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {p.nombre}
                          {esLM(p) && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">LM</span>}
                        </p>
                        <p className="text-xs text-gray-500">{p.parroquia || "-"}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.estado === "Confirmado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {p.estado}
                      </span>
                      <span className="text-sm font-semibold text-amber-700">RD${precioDe(p).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCobrar}
                    disabled={procesando || seleccionadas.size === 0}
                    className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    <Check className="w-4 h-4" />
                    {procesando ? "Procesando..." : "Cobrar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {pidiendoCodigo && (
        <CodigoAutorizacionModal
          titulo="Autorización de Coordinador"
          onClose={() => setPidiendoCodigo(false)}
          onAceptar={() => { setPidiendoCodigo(false); ejecutarCobro(); }}
        />
      )}
    </>
  );
}