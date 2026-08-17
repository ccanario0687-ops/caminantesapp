import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, DollarSign, UserCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import CodigoAutorizacionModal from "@/components/CodigoAutorizacionModal";
import ReciboPagoModal from "@/components/cobros/ReciboPagoModal";

const METODOS = [
  { value: "Efectivo", label: "Efectivo", color: "bg-green-600" },
  { value: "Transferencia", label: "Transferencia", color: "bg-blue-600" },
  { value: "Patrocinado", label: "Patrocinado por", color: "bg-purple-600" },
];

/**
 * Modal para cobrar la ficha de un caminante individual y confirmarlo.
 * - Selecciona método de pago (Efectivo, Transferencia, Patrocinado).
 * - Si es Patrocinado, pide nombre del patrocinador + código de coordinador.
 * - Registra el movimiento financiero y marca el caminante como Confirmado + Pagado.
 */
export default function CobroFichaModal({ caminante, precioFicha, precioFichaServidor = 0, numeroRetiro, currentUser, onClose, onGuardado }) {
  const [metodo, setMetodo] = useState("Efectivo");
  const [patrocinador, setPatrocinador] = useState("");
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [recibo, setRecibo] = useState(null);

  const registradoPor = currentUser?.username || currentUser?.full_name || currentUser?.email || "Sistema";

  const esLM = caminante.rol_en_mesa === "Líder de Mesa";
  const monto = Number(esLM ? precioFichaServidor : precioFicha) || 0;
  const tipoMovimiento = esLM ? "cuota_servidor" : "cuota_caminante";

  const confirmar = async () => {
    setProcesando(true);
    try {
      const targetId = caminante.id || caminante._id;
      let exitoUpdate = false;

      const updateData = {
        pago_ficha: "Pagado",
        estado_pago: "Pagado",
        pago: "Pagado",
        status_pago: "Pagado",
        estado: "Confirmado",
        confirmado: true,
        monto_abonado: monto,
        monto_pendiente: 0,
      };

      if (targetId && !String(targetId).startsWith("ced_") && !String(targetId).startsWith("nom_")) {
        try {
          await base44.entities.Caminante.update(targetId, updateData);
          exitoUpdate = true;
        } catch (err) {
          console.warn("Fallback update caminante:", err);
        }
      }

      if (!exitoUpdate && (caminante.inscripcion_remota_id || caminante.inscripcion_id || targetId)) {
        const remId = caminante.inscripcion_remota_id || caminante.inscripcion_id || targetId;
        if (remId && base44.entities.InscripcionRemota?.update) {
          await base44.entities.InscripcionRemota.update(remId, updateData).catch(() => null);
        }
      }

      // Crear el movimiento financiero (requiere equipo_id por RLS)
      await base44.entities.MovimientoFinanciero.create({
        tipo: tipoMovimiento,
        descripcion: `Cuota caminante - ${caminante.nombre}${metodo === "Patrocinado" ? ` (Patrocinado por ${patrocinador})` : ""}`,
        monto,
        metodo_pago: metodo,
        patrocinador: metodo === "Patrocinado" ? patrocinador : undefined,
        numero_retiro: caminante.numero_retiro || (numeroRetiro ? Number(numeroRetiro) : 0),
        caminante_id: String(targetId || ""),
        caminante_nombre: caminante.nombre,
        fecha: new Date().toISOString().split("T")[0],
        registrado_por: registradoPor,
        equipo_id: currentUser?.equipo_id || caminante.equipo_id,
      }).catch(e => console.warn("Error movimiento financiero:", e));

      toast.success(`${caminante.nombre} confirmado · RD$${monto.toFixed(2)} (${metodo})`);
      setRecibo({
        monto,
        metodo,
        patrocinador: metodo === "Patrocinado" ? patrocinador : "",
        registradoPor,
        fechaMov: new Date().toISOString().split("T")[0],
      });
      if (onGuardado) onGuardado();
    } catch (e) {
      toast.error("No se pudo registrar el cobro.");
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmar = () => {
    if (metodo === "Patrocinado") {
      if (!patrocinador.trim()) {
        toast.error("Indica el nombre del patrocinador.");
        return;
      }
      setPidiendoCodigo(true);
    } else {
      confirmar();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <h2 className="text-lg font-bold">Confirmar y Cobrar Ficha</h2>
            </div>
            <button onClick={onClose} className="hover:opacity-75"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-900">{caminante.nombre}</p>
              <p className="text-xs text-amber-700">{caminante.parroquia || "-"} · Ficha #{caminante.numero_ficha || "—"}</p>
              {esLM && <p className="text-[11px] text-blue-600 font-semibold">Líder de Mesa · tarifa de servidor</p>}
              <p className="text-2xl font-bold text-amber-800 mt-1">{monto.toFixed(2)}</p>
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
                  <UserCheck className="w-3.5 h-3.5" /> Nombre del patrocinador
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

            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
              <p>Registrado por: <strong>{registradoPor}</strong></p>
              {metodo === "Patrocinado" && patrocinador && (
                <p>Patrocinado por: <strong>{patrocinador}</strong></p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={procesando}
                className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {procesando ? "Procesando..." : `Confirmar · RD${monto.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {pidiendoCodigo && (
        <CodigoAutorizacionModal
          titulo="Autorización de Coordinador"
          onClose={() => setPidiendoCodigo(false)}
          onAceptar={() => { setPidiendoCodigo(false); confirmar(); }}
        />
      )}

      {recibo && (
        <ReciboPagoModal
          persona={{ ...caminante, pago_ficha: "Pagado", estado: "Confirmado" }}
          tipo="caminante"
          monto={recibo.monto}
          metodoPago={recibo.metodo}
          patrocinador={recibo.patrocinador}
          registradoPor={recibo.registradoPor}
          fechaMov={recibo.fechaMov}
          onClose={() => { setRecibo(null); onGuardado(); }}
        />
      )}
    </>
  );
}