import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, ShieldCheck, CheckCircle, UserCheck } from "lucide-react";
import { toast } from "sonner";
import CodigoAutorizacionModal from "@/components/CodigoAutorizacionModal";
import ReciboPagoModal from "@/components/cobros/ReciboPagoModal";

const CODIGO_AUTORIZACION = "EMAUS2025";
const METODOS = [
  { value: "Efectivo", label: "Efectivo", color: "bg-green-600" },
  { value: "Transferencia", label: "Transferencia", color: "bg-blue-600" },
  { value: "Patrocinado", label: "Patrocinado por", color: "bg-purple-600" },
];

/**
 * Modal que se abre DESPUÉS de cerrar el modal de edición cuando el usuario
 * cambió el estado de "Pendiente" a "Confirmado".
 * Flujo: método de pago + (patrocinador si aplica) + contraseña de coordinador
 *        → guardar cambios + registrar pago + notificación + recibo.
 */
export default function ConfirmacionPagoEditModal({
  tipo,
  persona,
  payload,
  precioFicha,
  precioFichaServidor = 0,
  numeroRetiro,
  currentUser,
  configRetiro,
  onClose,
  onGuardado,
}) {
  const [metodo, setMetodo] = useState("Efectivo");
  const [patrocinador, setPatrocinador] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [recibo, setRecibo] = useState(null);

  const registradoPor = currentUser?.username || currentUser?.full_name || currentUser?.email || "Sistema";
  const esLM = tipo === "caminante" && persona.rol_en_mesa === "Líder de Mesa";
  const tipoMovimiento = esLM ? "cuota_servidor" : (tipo === "caminante" ? "cuota_caminante" : "cuota_servidor");
  const idField = tipo === "caminante" ? "caminante_id" : "servidor_id";

  const keyCam = `emaus_precio_cam_${currentUser?.equipo_id || 'def'}_RD$`;
  const keyServ = `emaus_precio_serv_${currentUser?.equipo_id || 'def'}_RD$`;

  const pCam = Number(precioFicha) || Number(localStorage.getItem(keyCam)) || 3000;
  const pServ = Number(precioFichaServidor || precioFicha) || Number(localStorage.getItem(keyServ)) || 3000;

  const montoCalculado = Number(esLM ? pServ : (tipo === "caminante" ? pCam : pServ)) || 3000;

  const handleGuardar = () => {
    if (metodo === "Patrocinado" && !patrocinador.trim()) {
      toast.error("Indica el nombre del patrocinador.");
      return;
    }
    setPidiendoCodigo(true);
  };

  const ejecutarGuardado = async () => {
    setPidiendoCodigo(false);
    setProcesando(true);
    try {
      const monto = montoCalculado;
      const id = persona.id || persona._id;

      // Guardar los cambios del formulario + estado Confirmado + pago Pagado
      await base44.entities[tipo === "caminante" ? "Caminante" : "Servidor"].update(id, {
        ...payload,
        estado: "Confirmado",
        pago_ficha: "Pagado",
        monto_abonado: monto,
        monto_pagado: monto,
        monto_pendiente: 0,
      });

      // Registrar el movimiento financiero
      await base44.entities.MovimientoFinanciero.create({
        tipo: tipoMovimiento,
        descripcion: `Cuota ${tipo} - ${persona.nombre}${metodo === "Patrocinado" ? ` (Patrocinado por ${patrocinador})` : ""}`,
        monto,
        metodo_pago: metodo,
        patrocinador: metodo === "Patrocinado" ? patrocinador : undefined,
        numero_retiro: persona.numero_retiro || (numeroRetiro ? Number(numeroRetiro) : 0),
        [idField]: id,
        caminante_nombre: persona.nombre,
        fecha: new Date().toISOString().split("T")[0],
        registrado_por: registradoPor,
        equipo_id: currentUser?.equipo_id,
      });

      toast.success(
        `✅ Cambio aplicado: ${persona.nombre} confirmado · Pago RD$${monto.toFixed(2)} (${metodo})`,
        { duration: 5000 }
      );

      // Mostrar el recibo
      setRecibo({
        personaActualizada: {
          ...persona,
          ...payload,
          estado: "Confirmado",
          pago_ficha: "Pagado",
          monto_abonado: monto,
          monto_pagado: monto,
        },
        monto,
        metodo,
        patrocinador: metodo === "Patrocinado" ? patrocinador : "",
        registradoPor,
        fechaMov: new Date().toISOString().split("T")[0],
      });

      if (onGuardado) onGuardado();
    } catch (e) {
      toast.error("No se pudo registrar el cobro: " + (e?.message || "error desconocido"));
    } finally {
      setProcesando(false);
    }
  };

  if (recibo) {
    return (
      <ReciboPagoModal
        persona={recibo.personaActualizada}
        tipo={tipo}
        monto={recibo.monto}
        metodoPago={recibo.metodo}
        patrocinador={recibo.patrocinador}
        registradoPor={recibo.registradoPor}
        fechaMov={recibo.fechaMov}
        configRetiro={configRetiro}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-green-700 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <h2 className="text-base font-bold">Confirmar y Cobrar Ficha</h2>
            </div>
            <button onClick={onClose} className="hover:opacity-75"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-900">{persona.nombre}</p>
              <p className="text-xs text-amber-700">
                {persona.parroquia || "-"} · {tipo === "caminante" ? "Ficha" : "Registro"} #{persona.numero_ficha || "—"}
              </p>
              <p className="text-2xl font-bold text-amber-800 mt-1">RD${montoCalculado.toFixed(2)}</p>
              {esLM && <p className="text-[11px] text-blue-600 font-semibold">Líder de Mesa · tarifa de servidor</p>}
              <p className="text-[11px] text-gray-500 mt-1">
                Cambio de estado: <span className="line-through">Pendiente</span> → <span className="font-bold text-green-700">Confirmado</span>
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
                  <UserCheck className="w-3.5 h-3.5" /> Nombre del patrocinador
                </p>
                <input
                  type="text"
                  value={patrocinador}
                  onChange={e => setPatrocinador(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            )}

            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
              <p>Registrado por: <strong>{registradoPor}</strong></p>
              <p className="flex items-center gap-1 mt-1 text-amber-600">
                <ShieldCheck className="w-3 h-3" /> Se requiere código de autorización del coordinador.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={procesando}
                className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {procesando ? "Procesando..." : `Confirmar · RD$${montoCalculado.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {pidiendoCodigo && (
        <CodigoAutorizacionModal
          titulo="Autorización de Coordinador"
          onClose={() => setPidiendoCodigo(false)}
          onAceptar={() => ejecutarGuardado()}
        />
      )}
    </>
  );
}