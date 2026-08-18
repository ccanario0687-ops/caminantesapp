import { useState } from "react";
import { 
  Building2, Sparkles, ShieldCheck, Users, CheckCircle2, 
  ArrowRight, Crown, Layers, FileText, Check 
} from "lucide-react";
import CrearComunidadModal from "@/components/configuracion/CrearComunidadModal";

export default function CrearComunidadPublica() {
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col selection:bg-amber-500 selection:text-white">
      
      {/* Header Público */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-black shadow-lg shadow-amber-500/20">
              ⛪
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">
                Emaús<span className="text-amber-400">SaaS</span> Enterprise
              </h1>
              <p className="text-xs text-slate-400">Plataforma Multi-Tenant de Gestión de Retiros</p>
            </div>
          </div>

          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-600/30 transition cursor-pointer uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4" /> Crear Mi Comunidad
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center text-center">
        
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-amber-400" /> Aislamiento Multi-Tenant de Grado Empresarial
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl leading-tight">
          Gestión Profesional de Retiros de Emaús para tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Parroquia</span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mt-4 font-medium leading-relaxed">
          Digitaliza inscripciones, control de mesas, asignación de habitaciones, cobros, kit de impresiones y bitácora en vivo en un entorno 100% seguro y aislado.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-amber-600/30 transition cursor-pointer text-sm uppercase tracking-wider"
          >
            Aprovisionar Mi Comunidad en 60s <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mallas de Características */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left w-full">
          
          <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/80">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Aislamiento RLS en Base de Datos</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Tus caminantes, finanzas y listas están protegidos bajo políticas de seguridad en la nube que garantizan que ninguna otra comunidad acceda a tus registros.
            </p>
          </div>

          <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/80">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Kit de Impresión de Gafetes</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Genera gafetes de pecho, equipaje, carpeta y habitación en hojas A4 con plantilla de 3 columnas ajustada milimétricamente.
            </p>
          </div>

          <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/80">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Sincronización en Vivo</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Cualquier registro realizado desde un celular en la entrada del retiro se actualiza en tiempo real en las laptops del equipo.
            </p>
          </div>

        </div>

      </main>

      {/* Modal de Aprovisionamiento */}
      {modalAbierto && (
        <CrearComunidadModal
          onClose={() => setModalAbierto(false)}
          onComunidadCreada={(nuevaComunidad) => {
            window.location.href = "/";
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p className="font-bold text-slate-400">
          Emaús SaaS Enterprise 🌐 — Plataforma de Gestión Multi-Tenant para Retiros Parroquiales
        </p>
      </footer>

    </div>
  );
}
