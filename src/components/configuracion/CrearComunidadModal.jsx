import { useState } from "react";
import { 
  X, Building2, User, ShieldCheck, Sparkles, CheckCircle2, 
  ArrowRight, ArrowLeft, Lock, Crown, DollarSign, Upload, Check
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function CrearComunidadModal({ onClose, onComunidadCreada }) {
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    // Paso 1: Datos de la Comunidad / Parroquia
    nombreParroquia: "",
    diocesis: "Diócesis de Santo Domingo",
    provincia: "Santo Domingo",
    direccion: "",
    telefonoContacto: "",
    logoUrl: "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/28de3e4eb_logoemauscircular.png",

    // Paso 2: Usuario Coordinador Admin
    nombreCoordinador: "",
    emailCoordinador: "",
    passwordCoordinador: "",
    confirmPassword: "",

    // Paso 3: Selección de Plan
    planSeleccionado: "pro", // "gratis", "pro", "diocesis"
  });

  const handleChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSiguiente = (e) => {
    e.preventDefault();
    if (paso === 1) {
      if (!form.nombreParroquia.trim()) {
        toast.error("Por favor ingresa el nombre de tu Parroquia o Comunidad");
        return;
      }
      setPaso(2);
    } else if (paso === 2) {
      if (!form.nombreCoordinador.trim() || !form.emailCoordinador.trim()) {
        toast.error("Ingresa el nombre y correo del coordinador");
        return;
      }
      if (form.passwordCoordinador.length < 6) {
        toast.error("La contraseña debe tener al menos 6 caracteres");
        return;
      }
      if (form.passwordCoordinador !== form.confirmPassword) {
        toast.error("Las contraseñas no coinciden");
        return;
      }
      setPaso(3);
    }
  };

  const handleFinalizarAprovisionamiento = async () => {
    setLoading(true);
    try {
      const slugClean = form.nombreParroquia.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 20);
      const equipoIdNuevo = `eq_${slugClean}_${Date.now().toString(36)}`;

      const nuevaComunidadObj = {
        id: equipoIdNuevo,
        equipo_id: equipoIdNuevo,
        slug: slugClean,
        nombre: form.nombreParroquia,
        diocesis: form.diocesis,
        provincia: form.provincia,
        direccion: form.direccion,
        telefono: form.telefonoContacto,
        logo_url: form.logoUrl,
        plan: form.planSeleccionado,
        fecha_creacion: new Date().toISOString(),
        _secured_tenant: true
      };

      // 1. Guardar la nueva comunidad en la entidad Equipos / Comunidades de Base44
      if (base44.entities?.EquiposRetiro?.create) {
        await base44.entities.EquiposRetiro.create(nuevaComunidadObj).catch(() => null);
      }

      // 2. Crear el registro inicial de ConfigRetiro para la nueva comunidad
      if (base44.entities?.ConfigRetiro?.create) {
        await base44.entities.ConfigRetiro.create({
          equipo_id: equipoIdNuevo,
          nombre_retiro: `Retiro de Emaús - ${form.nombreParroquia}`,
          parroquia: form.nombreParroquia,
          diocesis: form.diocesis,
          logo_url: form.logoUrl,
          plan: form.planSeleccionado
        }).catch(() => null);
      }

      // 3. Crear el usuario Administrador / Coordinador
      const nuevoUsuarioAdmin = {
        email: form.emailCoordinador.toLowerCase().trim(),
        username: form.nombreCoordinador,
        nombre_completo: form.nombreCoordinador,
        equipo_id: equipoIdNuevo,
        comunidad_id: equipoIdNuevo,
        nombre_equipo: form.nombreParroquia,
        rol: "Coordinador",
        es_admin: true,
        fecha_registro: new Date().toISOString()
      };

      if (base44.entities?.Usuarios?.create) {
        await base44.entities.Usuarios.create(nuevoUsuarioAdmin).catch(() => null);
      }

      // Celebración con Confeti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      toast.success(`🎉 ¡Comunidad "${form.nombreParroquia}" aprovisionada con éxito!`);
      
      if (onComunidadCreada) {
        onComunidadCreada(nuevaComunidadObj, nuevoUsuarioAdmin);
      }
      onClose();
    } catch (err) {
      console.error("Error al aprovisionar comunidad:", err);
      toast.error("Ocurrió un error durante el aprovisionamiento de la comunidad");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8 flex flex-col">
        
        {/* Header */}
        <div className="bg-amber-900 text-white px-6 py-4 flex items-center justify-between border-b border-amber-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-700/60 border border-amber-500/40 flex items-center justify-center text-amber-200 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  Crear Mi Comunidad Emaús 🌐
                </h2>
                <span className="bg-amber-500/20 text-amber-200 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Paso {paso} de 3
                </span>
              </div>
              <p className="text-xs text-amber-200/80">
                Aprovisionamiento instantáneo de espacio de trabajo seguro Multi-Tenant
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-amber-950/60 hover:bg-amber-950 text-amber-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador de Progreso */}
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center justify-between text-xs font-bold text-amber-900">
          <div className={`flex items-center gap-1.5 ${paso >= 1 ? "text-amber-900 font-extrabold" : "opacity-40"}`}>
            <span className="w-5 h-5 rounded-full bg-amber-700 text-white text-[10px] flex items-center justify-center">1</span>
            Parroquia
          </div>
          <div className="h-0.5 w-8 bg-amber-200"></div>
          <div className={`flex items-center gap-1.5 ${paso >= 2 ? "text-amber-900 font-extrabold" : "opacity-40"}`}>
            <span className="w-5 h-5 rounded-full bg-amber-700 text-white text-[10px] flex items-center justify-center">2</span>
            Coordinador
          </div>
          <div className="h-0.5 w-8 bg-amber-200"></div>
          <div className={`flex items-center gap-1.5 ${paso >= 3 ? "text-amber-900 font-extrabold" : "opacity-40"}`}>
            <span className="w-5 h-5 rounded-full bg-amber-700 text-white text-[10px] flex items-center justify-center">3</span>
            Plan & Confirmar
          </div>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6 space-y-4">
          
          {/* PASO 1: Datos de la Parroquia */}
          {paso === 1 && (
            <form onSubmit={handleSiguiente} className="space-y-4">
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-3">
                <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  1. Información de la Parroquia o Casa de Retiros
                </h3>

                <div>
                  <label className="block text-xs font-extrabold text-amber-900 mb-1">
                    Nombre de la Parroquia / Comunidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombreParroquia}
                    onChange={e => handleChange("nombreParroquia", e.target.value)}
                    placeholder="Ej: Parroquia Santa Cruz de Mayo"
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-200 focus:border-amber-500 focus:outline-none bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-amber-900 mb-1">
                      Diócesis / Arquidiócesis
                    </label>
                    <input
                      type="text"
                      value={form.diocesis}
                      onChange={e => handleChange("diocesis", e.target.value)}
                      placeholder="Ej: Diócesis de Santo Domingo"
                      className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-200 focus:border-amber-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-amber-900 mb-1">
                      Provincia / Ciudad
                    </label>
                    <input
                      type="text"
                      value={form.provincia}
                      onChange={e => handleChange("provincia", e.target.value)}
                      placeholder="Ej: Santo Domingo"
                      className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-200 focus:border-amber-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-amber-900 mb-1">
                    Dirección / Ubicación de la Casa de Retiros
                  </label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={e => handleChange("direccion", e.target.value)}
                    placeholder="Ej: Av. Principal #45, Casa de Retiros Emaús"
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-200 focus:border-amber-500 focus:outline-none bg-white"
                  />
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-amber-900/20"
                >
                  Siguiente: Datos del Coordinador <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* PASO 2: Datos del Coordinador Admin */}
          {paso === 2 && (
            <form onSubmit={handleSiguiente} className="space-y-4">
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-3">
                <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-700" />
                  2. Datos del Coordinador Administrador
                </h3>

                <div>
                  <label className="block text-xs font-extrabold text-amber-900 mb-1">
                    Nombre del Coordinador Principal *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombreCoordinador}
                    onChange={e => handleChange("nombreCoordinador", e.target.value)}
                    placeholder="Ej: Juan Carlos Pérez"
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-200 focus:border-amber-500 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-amber-900 mb-1">
                    Correo Electrónico del Coordinador *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.emailCoordinador}
                    onChange={e => handleChange("emailCoordinador", e.target.value)}
                    placeholder="coordinador@parroquia.com"
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-200 focus:border-amber-500 focus:outline-none bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-amber-900 mb-1">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={form.passwordCoordinador}
                      onChange={e => handleChange("passwordCoordinador", e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-200 focus:border-amber-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-amber-900 mb-1">
                      Confirmar Contraseña *
                    </label>
                    <input
                      type="password"
                      required
                      value={form.confirmPassword}
                      onChange={e => handleChange("confirmPassword", e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-200 focus:border-amber-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>

              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-amber-900/20"
                >
                  Siguiente: Seleccionar Plan <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* PASO 3: Selección de Plan y Confirmación */}
          {paso === 3 && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-600" />
                3. Selecciona tu Plan de Suscripción Emaús SaaS
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Plan Gratis Demo */}
                <div
                  onClick={() => handleChange("planSeleccionado", "gratis")}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer text-left relative ${
                    form.planSeleccionado === "gratis"
                      ? "border-amber-600 bg-amber-50/70 shadow-md"
                      : "border-slate-200 hover:border-amber-300 bg-white"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Prueba Demo</span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-1">Plan Inicial</h4>
                  <p className="text-lg font-black text-slate-800 mt-0.5">Gratis</p>
                  <ul className="text-[11px] text-slate-600 space-y-1 mt-2 font-medium">
                    <li>✓ Hasta 50 caminantes</li>
                    <li>✓ Registro de servidores</li>
                    <li>✓ Control de mesas</li>
                  </ul>
                </div>

                {/* Plan Pro Recomendado */}
                <div
                  onClick={() => handleChange("planSeleccionado", "pro")}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer text-left relative ${
                    form.planSeleccionado === "pro"
                      ? "border-amber-600 bg-amber-50/90 shadow-lg ring-2 ring-amber-500/30"
                      : "border-slate-200 hover:border-amber-300 bg-white"
                  }`}
                >
                  <span className="bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider absolute top-3 right-3">
                    Recomendado
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Completo</span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-1">Plan Pro Emaús</h4>
                  <p className="text-lg font-black text-amber-800 mt-0.5">Suscripción Pro</p>
                  <ul className="text-[11px] text-slate-700 space-y-1 mt-2 font-medium">
                    <li>✓ Caminantes ilimitados</li>
                    <li>✓ Kit de impresiones completo</li>
                    <li>✓ Bitácora e historial en vivo</li>
                    <li>✓ Aislamiento Multi-Tenant RLS</li>
                  </ul>
                </div>

                {/* Plan Diócesis */}
                <div
                  onClick={() => handleChange("planSeleccionado", "diocesis")}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer text-left relative ${
                    form.planSeleccionado === "diocesis"
                      ? "border-amber-600 bg-amber-50/70 shadow-md"
                      : "border-slate-200 hover:border-amber-300 bg-white"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">Multi-Comunidad</span>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-1">Plan Diócesis</h4>
                  <p className="text-lg font-black text-purple-900 mt-0.5">Enterprise</p>
                  <ul className="text-[11px] text-slate-600 space-y-1 mt-2 font-medium">
                    <li>✓ Múltiples comunidades</li>
                    <li>✓ Consolidados globales</li>
                    <li>✓ Soporte prioritario</li>
                  </ul>
                </div>

              </div>

              {/* Botones de Finalización */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalizarAprovisionamiento}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-amber-900/30"
                >
                  {loading ? (
                    <span>Aprovisionando espacio de trabajo...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Aprovisionar Mi Comunidad Ahora
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
