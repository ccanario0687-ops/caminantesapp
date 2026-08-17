import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Lock, ArrowLeft, Eye, EyeOff, Save, Key, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import ModalCodigoAutorizacion from "@/components/ModalCodigoAutorizacion";

export default function CambiarContrasena() {
  const navigate = useNavigate();
  const { user, checkUserAuth } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mostrarPINModal, setMostrarPINModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("La contraseña nueva debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      await base44.auth.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success("Contraseña cambiada exitosamente.");
      navigate("/dashboard");
    } catch (error) {
      const msg = error?.response?.data?.message || error?.data?.message || "Error al cambiar la contraseña.";
      toast.error(msg);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="bg-gradient-to-r from-amber-800 to-amber-600 text-white px-6 py-6 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/dashboard" className="hover:opacity-75 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Seguridad y Acceso</h1>
            <p className="text-amber-200 text-sm">Cambiar contraseña y gestionar PIN de autorización</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* TARJETA DE CÓDIGO DE AUTORIZACIÓN */}
        <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 text-white rounded-2xl p-5 shadow-md border border-amber-700/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
                <Key className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Código PIN de Autorización</h3>
                <p className="text-amber-200/80 text-xs">Reversos y transacciones delicadas</p>
              </div>
            </div>
            {user?.codigo_autorizacion ? (
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 font-bold px-2.5 py-1 rounded-full border border-emerald-400/40">
                ✓ Activo
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/30 text-amber-200 font-bold px-2.5 py-1 rounded-full border border-amber-400/40">
                ⚠️ Sin PIN
              </span>
            )}
          </div>
          <p className="text-xs text-amber-100/90 leading-relaxed">
            Este código personal te permite autorizar <strong>reversos de transacciones</strong> y operaciones protegidas en el sistema.
          </p>
          <button
            type="button"
            onClick={() => setMostrarPINModal(true)}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition shadow-sm flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {user?.codigo_autorizacion ? "Cambiar mi PIN de Autorización" : "Crear PIN de Autorización"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-amber-100 p-6 space-y-5">
          <h3 className="font-bold text-slate-900 text-base border-b border-amber-100 pb-2">Contraseña de Inicio de Sesión</h3>

          {/* Contraseña actual */}
          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Contraseña Actual</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                className="w-full border border-amber-200 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-amber-500 hover:text-amber-700"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-amber-200 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-amber-500 hover:text-amber-700"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar nueva contraseña */}
          <div>
            <label className="block text-sm font-semibold text-amber-800 mb-1">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              className="w-full border border-amber-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <Lock className="w-3.5 h-3.5 inline mr-1" />
            La contraseña debe tener al menos 8 caracteres. Usa una combinación segura de letras, números y símbolos.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link to="/dashboard" className="px-5 py-2.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium transition-colors">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Cambiar Contraseña"}
            </button>
          </div>
        </form>
      </div>

      {mostrarPINModal && (
        <ModalCodigoAutorizacion
          user={user}
          onClose={() => setMostrarPINModal(false)}
          checkUserAuth={checkUserAuth}
        />
      )}
    </div>
  );
}