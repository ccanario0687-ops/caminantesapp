import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const DEFAULTS = {
  titulo: "Hermandad de Emaús",
  subtitulo: "Lucas 24, 13-35",
  versiculo: "¿No ardía nuestro corazón mientras nos hablaba en el camino y nos explicaba las Escrituras?",
  versiculo_referencia: "Lucas 24, 32",
  foto_fondo_url: "",
  foto_principal_url: "https://images.unsplash.com/photo-1548625149-720fb8b2e8f4?w=600&q=80",
  color_fondo_inicio: "#5c1a00",
  color_fondo_medio: "#8B1a1a",
  color_fondo_fin: "#b8860b",
  color_titulo: "#ffffff",
  color_subtitulo: "#fcd34d",
  color_boton: "#f59e0b",
  texto_boton: "Ingresar al Sistema",
  mostrar_imagen_circular: true,
};

export default function Portada() {
  const [config, setConfig] = useState(DEFAULTS);

  useEffect(() => {
    // Cargar ConfigPortada de forma pública
    base44.entities.ConfigPortada.list()
      .then(data => {
        if (data?.length > 0) setConfig({ ...DEFAULTS, ...data[0] });
      })
      .catch(() => {});
  }, []);

  const handleLogin = () => {
    // Redirigir al login; tras autenticarse el usuario vuelve al Dashboard (/)
    base44.auth.redirectToLogin("/");
  };

  const bgStyle = config.foto_fondo_url
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${config.foto_fondo_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: `linear-gradient(160deg, ${config.color_fondo_inicio} 0%, ${config.color_fondo_medio} 40%, ${config.color_fondo_fin} 100%)`,
      };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 text-center"
      style={bgStyle}
    >
      {/* Top spacer */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-xl">
          {/* Imagen circular principal */}
          {config.mostrar_imagen_circular !== false && config.foto_principal_url && (
            <div className="mb-6 relative">
              <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-amber-300 shadow-2xl mx-auto">
                <img
                  src={config.foto_principal_url}
                  alt="Imagen principal"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                ✝ Emaús
              </div>
            </div>
          )}

          {/* Título */}
          <h1
            className="text-3xl sm:text-4xl font-bold mb-1 drop-shadow-lg"
            style={{ fontFamily: "Georgia, serif", color: config.color_titulo }}
          >
            {config.titulo}
          </h1>

          {/* Subtítulo */}
          <p
            className="tracking-widest uppercase text-xs mb-4"
            style={{ color: config.color_subtitulo }}
          >
            {config.subtitulo}
          </p>

          {/* Versículo */}
          {config.versiculo && (
            <div className="bg-white/10 border border-amber-300/40 rounded-2xl px-6 py-4 max-w-sm mx-auto mb-8">
              <p className="text-amber-100 text-sm italic leading-relaxed">
                "{config.versiculo}"
              </p>
              {config.versiculo_referencia && (
                <p className="text-amber-400 text-xs mt-2">— {config.versiculo_referencia}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom section with buttons */}
      <div className="w-full max-w-sm space-y-3 pb-6">
        {/* Main login button */}
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-2 font-bold text-base px-6 py-3.5 rounded-2xl shadow-xl transition-all active:scale-95 text-white hover:opacity-90"
          style={{ backgroundColor: config.color_boton }}
        >
          {config.texto_boton}
        </button>

        {/* Register link */}
        <a
          href="/inscripcion"
          className="block w-full text-center bg-white/20 hover:bg-white/30 border border-white/40 text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-all"
        >
          ¿Primera vez? Solicita tu participación
        </a>
      </div>

      <p className="text-amber-400 text-xs opacity-70">
        Sistema de Gestión — Retiro de Emaús
      </p>
    </div>
  );
}