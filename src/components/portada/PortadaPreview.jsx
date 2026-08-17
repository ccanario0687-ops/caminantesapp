import React from 'react';

/**
 * Componente de vista previa de la portada
 * Aislado para evitar parpadeos y no hace llamadas externas
 */
export default function PortadaPreview({ config }) {
  // Calcular estilos una sola vez, memorizado
  const bgStyle = React.useMemo(() => {
    if (config.foto_fondo_url) {
      return {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${config.foto_fondo_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return {
      background: `linear-gradient(160deg, ${config.color_fondo_inicio} 0%, ${config.color_fondo_medio} 40%, ${config.color_fondo_fin} 100%)`,
    };
  }, [config.foto_fondo_url, config.color_fondo_inicio, config.color_fondo_medio, config.color_fondo_fin]);

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden h-full">
      <div className="px-4 py-2 border-b border-amber-100 flex items-center gap-2">
        <span className="text-sm font-semibold text-amber-800">Vista Previa</span>
        <span className="text-xs text-amber-500 ml-auto">caminantesapp.com</span>
      </div>
      <div
        className="flex flex-col items-center justify-center text-center p-6 min-h-[500px]"
        style={bgStyle}
      >
        {config.mostrar_imagen_circular !== false && config.foto_principal_url && (
          <div className="mb-4 relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-amber-300 shadow-xl mx-auto flex-shrink-0">
              <img 
                src={config.foto_principal_url} 
                alt="" 
                className="w-full h-full object-cover" 
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            
            </div>
          </div>
        )}
        <h1 
          className="text-xl font-bold mb-0.5 drop-shadow-lg" 
          style={{ fontFamily: "Georgia, serif", color: config.color_titulo }}
        >
          {config.titulo || "Hermandad de Emaús"}
        </h1>
        <p 
          className="text-xs tracking-widest uppercase mb-3" 
          style={{ color: config.color_subtitulo }}
        >
          {config.subtitulo}
        </p>
        {config.versiculo && (
          <div className="bg-white/10 border border-amber-300/30 rounded-xl px-4 py-3 max-w-xs mb-4">
            <p className="text-amber-100 text-xs italic leading-relaxed">"{config.versiculo}"</p>
            {config.versiculo_referencia && (
              <p className="text-amber-400 text-xs mt-1">— {config.versiculo_referencia}</p>
            )}
          </div>
        )}
        <div
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow"
          style={{ backgroundColor: config.color_boton }}
        >
          {config.texto_boton || "Ingresar al Sistema"}
        </div>
        <p className="text-amber-400 text-xs mt-4 opacity-60">caminantesapp.com</p>
      </div>
    </div>
  );
}