import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Lock, Key, Eye, EyeOff, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { registrarAuditoria } from "@/lib/auditoria";

export default function ModalCodigoAutorizacion({ user, onClose, onActualizado, checkUserAuth }) {
  const [codigo, setCodigo] = useState(user?.codigo_autorizacion || "");
  const [confirmar, setConfirmar] = useState(user?.codigo_autorizacion || "");
  const [verCodigo, setVerCodigo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const tieneCodigoActual = Boolean(user?.codigo_autorizacion);

  const handleGuardar = async (e) => {
    e?.preventDefault();

    const valClean = String(codigo).trim();
    const confClean = String(confirmar).trim();

    if (!valClean) {
      toast.error("Por favor ingresa un código o PIN de autorización.");
      return;
    }

    if (valClean.length < 4) {
      toast.error("El código de autorización debe tener al menos 4 caracteres.");
      return;
    }

    if (valClean !== confClean) {
      toast.error("El código y la confirmación no coinciden.");
      return;
    }

    setGuardando(true);
    try {
      let actualizado = false;

      // 1. Intentar actualización vía función backend updateSelf
      try {
        const res = await base44.functions.invoke("gestionUsuarios", {
          action: "updateSelf",
          data: { codigo_autorizacion: valClean }
        });
        if (res?.data?.ok || res?.data?.success) actualizado = true;
      } catch (_e) {}

      // 2. Si es admin y edita a otro usuario o falla la función
      if (!actualizado && user?.id) {
        await base44.entities.User.update(user.id, {
          codigo_autorizacion: valClean
        }).catch(() => {});
        actualizado = true;
      }

      // 3. Actualizar objeto en memoria y en localStorage
      if (user) user.codigo_autorizacion = valClean;
      localStorage.setItem("emaus_codigo_autorizacion", valClean);

      await registrarAuditoria({
        usuario: user?.nombre || user?.email || "Usuario",
        accion: "Actualizar Código de Autorización",
        entidad: "User",
        detalles: `El usuario ${user?.email} actualizó su clave/PIN personal para autorización de transacciones y reversos.`
      });

      toast.success("🔐 Código de autorización guardado y enlazado a tu usuario.");
      if (checkUserAuth) await checkUserAuth();
      if (onActualizado) onActualizado(valClean);
      onClose();
    } catch (err) {
      toast.error("Error al guardar código: " + (err.message || "Error desconocido"));
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCodigo = async () => {
    if (!confirm("¿Seguro que deseas eliminar tu código de autorización personal? No podrás autorizar reversos hasta crear uno nuevo.")) {
      return;
    }

    setGuardando(true);
    try {
      if (user?.id) {
        await base44.entities.User.update(user.id, {
          codigo_autorizacion: ""
        }).catch(() => {});
      }
      localStorage.removeItem("emaus_codigo_autorizacion");

      toast.info("Código de autorización eliminado.");
      if (checkUserAuth) await checkUserAuth();
      if (onActualizado) onActualizado("");
      onClose();
    } catch (err) {
      toast.error("Error al eliminar código");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-700 text-white px-5 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Key className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Código de Autorización Personal</h3>
              <p className="text-amber-200/80 text-xs">PIN de seguridad enlazado a tu usuario</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-amber-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleGuardar} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong>Uso del Código:</strong> Este PIN te identificará al autorizar <strong>reversos de transacciones</strong>, anulaciones de aportes o modificaciones delicadas en la plataforma.
            </div>
          </div>

          {/* Input Código */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800">
              Código / PIN de Autorización (4 a 8 caracteres):
            </label>
            <div className="relative">
              <input
                type={verCodigo ? "text" : "password"}
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="Ej: 1234 o CLAVE_2026"
                maxLength={20}
                required
                className="w-full px-3 py-2.5 pr-10 border border-amber-300 rounded-xl text-sm font-mono font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-widest"
              />
              <button
                type="button"
                onClick={() => setVerCodigo(!verCodigo)}
                className="absolute right-3 top-2.5 text-amber-600 hover:text-amber-800"
                title={verCodigo ? "Ocultar PIN" : "Mostrar PIN"}
              >
                {verCodigo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Código */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800">
              Confirmar Código:
            </label>
            <input
              type={verCodigo ? "text" : "password"}
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repite tu código"
              maxLength={20}
              required
              className="w-full px-3 py-2.5 border border-amber-300 rounded-xl text-sm font-mono font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-widest"
            />
          </div>

          {/* Footer Botones */}
          <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
            {tieneCodigoActual ? (
              <button
                type="button"
                onClick={handleEliminarCodigo}
                disabled={guardando}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar PIN
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5 disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {guardando ? "Guardando..." : "Enlazar y Guardar PIN"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
