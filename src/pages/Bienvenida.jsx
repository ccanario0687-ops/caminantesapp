import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { LogOut } from "lucide-react";

const DEFAULTS = {
  titulo: "Hermandad de Emaús",
  subtitulo: "Lucas 24, 13-35",
  versiculo: "¿No ardía nuestro corazón mientras nos hablaba en el camino y nos explicaba las Escrituras?",
  versiculo_referencia: "Lucas 24, 32",
  foto_fondo_url: "",
  foto_principal_url: "",
  color_fondo_inicio: "#5c1a00",
  color_fondo_medio: "#8B1a1a",
  color_fondo_fin: "#b8860b",
  color_titulo: "#ffffff",
  color_subtitulo: "#fcd34d",
  color_boton: "#f59e0b",
  texto_boton: "Ingresar al Sistema",
  mostrar_imagen_circular: true,
};

export default function Bienvenida() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState(() => {
    const preloaded = typeof window !== 'undefined' && window.__INITIAL_CONFIG__;
    if (preloaded && !preloaded.error) {
      return applyStatic(preloaded);
    }
    return DEFAULTS;
  });
  const [bgError, setBgError] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(() => {
    return typeof window === 'undefined' || !window.__INITIAL_CONFIG__;
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
      return;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__INITIAL_CONFIG__) {
      setLoading(false);
      return;
    }

    base44.entities.ConfigPortada.list()
      .then(configs => {
        if (configs && configs.length > 0) {
          applyConfig(configs[0]);
          return;
        }
        throw new Error('sin datos');
      })
      .catch(() => {
        base44.functions.invoke('getConfigPortada', {})
          .then(res => {
            const db = res.data;
            if (db && !db.error) applyConfig(db);
          })
          .catch(() => {
            fetch('/api/functions/getConfigPortada')
              .then(res => res.json())
              .then(db => { if (db && !db.error) applyConfig(db); })
              .catch(() => {});
          });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin('/dashboard');
  };

  const handleLogout = () => {
    logout();
  };



  const applyStatic = (db) => ({
    titulo: db.titulo || DEFAULTS.titulo,
    subtitulo: db.subtitulo || DEFAULTS.subtitulo,
    versiculo: db.versiculo || DEFAULTS.versiculo,
    versiculo_referencia: db.versiculo_referencia || DEFAULTS.versiculo_referencia,
    foto_fondo_url: db.foto_fondo_url || "",
    foto_principal_url: db.foto_principal_url || "",
    color_fondo_inicio: db.color_fondo_inicio || DEFAULTS.color_fondo_inicio,
    color_fondo_medio: db.color_fondo_medio || DEFAULTS.color_fondo_medio,
    color_fondo_fin: db.color_fondo_fin || DEFAULTS.color_fondo_fin,
    color_titulo: db.color_titulo || DEFAULTS.color_titulo,
    color_subtitulo: db.color_subtitulo || DEFAULTS.color_subtitulo,
    color_boton: db.color_boton || DEFAULTS.color_boton,
    texto_boton: db.texto_boton || DEFAULTS.texto_boton,
    mostrar_imagen_circular: db.mostrar_imagen_circular !== false,
  });

  const applyConfig = (db) => {
    if (!db || db.error) return;
    setConfig({
      titulo: db.titulo || DEFAULTS.titulo,
      subtitulo: db.subtitulo || DEFAULTS.subtitulo,
      versiculo: db.versiculo || DEFAULTS.versiculo,
      versiculo_referencia: db.versiculo_referencia || DEFAULTS.versiculo_referencia,
      foto_fondo_url: db.foto_fondo_url || "",
      foto_principal_url: db.foto_principal_url || "",
      color_fondo_inicio: db.color_fondo_inicio || DEFAULTS.color_fondo_inicio,
      color_fondo_medio: db.color_fondo_medio || DEFAULTS.color_fondo_medio,
      color_fondo_fin: db.color_fondo_fin || DEFAULTS.color_fondo_fin,
      color_titulo: db.color_titulo || DEFAULTS.color_titulo,
      color_subtitulo: db.color_subtitulo || DEFAULTS.color_subtitulo,
      color_boton: db.color_boton || DEFAULTS.color_boton,
      texto_boton: db.texto_boton || DEFAULTS.texto_boton,
      mostrar_imagen_circular: db.mostrar_imagen_circular !== false,
    });
  };

  useEffect(() => {
    if (!config.foto_fondo_url) {
      setBgLoaded(true);
      return;
    }
    setBgLoaded(false);
    setBgError(false);
    const img = new Image();
    img.onload = () => setBgLoaded(true);
    img.onerror = () => setBgError(true);
    img.src = config.foto_fondo_url;
  }, [config.foto_fondo_url]);

  const useImage = config.foto_fondo_url && !bgError && bgLoaded;

  const showLoading = loading || (config.foto_fondo_url && !bgLoaded && !bgError);

  const bgStyle = useImage
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${config.foto_fondo_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: `linear-gradient(160deg, ${config.color_fondo_inicio} 0%, ${config.color_fondo_medio} 40%, ${config.color_fondo_fin} 100%)`,
      };

  if (showLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: `linear-gradient(160deg, ${config.color_fondo_inicio} 0%, ${config.color_fondo_medio} 40%, ${config.color_fondo_fin} 100%)` }}>
        <div className="w-10 h-10 border-4 border-amber-300/30 border-t-amber-300 rounded-full animate-spin"></div>
        <p className="text-amber-200/80 text-sm font-medium">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 text-center" style={bgStyle}>
      {/* Botón cerrar sesión (visible solo si autenticado) */}
      {isAuthenticated && (
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      )}

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-xl">
          {config.mostrar_imagen_circular && config.foto_principal_url && (
            <div className="mb-6 relative">
              <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-amber-300 shadow-2xl mx-auto bg-amber-900/30 flex items-center justify-center">
                {imgError ? (
                  <span className="text-amber-300 text-5xl">✝</span>
                ) : (
                  <img
                    src={config.foto_principal_url}
                    alt="Logo del retiro"
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                )}
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                ✝ Emaús
              </div>
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold mb-1 drop-shadow-lg" style={{ fontFamily: "Georgia, serif", color: config.color_titulo }}>
            {config.titulo}
          </h1>

          <p className="tracking-widest uppercase text-xs mb-4" style={{ color: config.color_subtitulo }}>
            {config.subtitulo}
          </p>

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

      <div className="w-full max-w-sm space-y-3 pb-6">
        <button
          type="button"
          onClick={handleLogin}
          className="w-full font-bold text-base px-6 py-3.5 rounded-2xl shadow-xl transition-all active:scale-95 text-white hover:opacity-90 cursor-pointer select-none"
          style={{ backgroundColor: config.color_boton }}
        >
          {config.texto_boton}
        </button>

        <Link
          to="/inscripcion"
          className="block w-full text-center bg-white/20 hover:bg-white/30 border border-white/40 text-white py-2.5 px-4 rounded-xl font-semibold text-sm transition-all"
        >
          ¿Primera vez? Solicita tu participación
        </Link>
      </div>

      <p className="text-amber-400 text-xs opacity-70">
        Sistema de Gestión — Retiro de Emaús
      </p>

    </div>
  );
}