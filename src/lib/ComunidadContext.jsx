// ComunidadContext.jsx - Contexto Global con Control Total para Creador y Aislamiento para Admins
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';

const APP_CREATOR_EMAIL = "ccanario0687@gmail.com";
const ComunidadContext = createContext();

export const OBJ_VISTA_GLOBAL = {
  id: "global",
  equipo_id: "global",
  slug: "global",
  nombre: "🌐 Vista Global (Todos los Registros)"
};

export function ComunidadProvider({ children }) {
  const { user } = useAuth();

  // 👑 PERMISO CREADOR GLOBAL EXCLUSIVO
  const esCreador = useMemo(() => Boolean(
    user?.email === APP_CREATOR_EMAIL || 
    user?.es_creador === true
  ), [user]);

  const [comunidadActual, setComunidadActual] = useState(() => {
    try {
      const saved = localStorage.getItem("comunidad_activa_obj");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Si no es creador, bloqueamos obligatoriamente en su comunidad asignada
  useEffect(() => {
    if (user && !esCreador && (user.equipo_id || user.comunidad_id)) {
      const idAsignado = user.equipo_id || user.comunidad_id;
      const nombreAsignado = user.nombre_equipo || user.nombre_comunidad || "Mi Comunidad";
      const objAsignado = {
        id: idAsignado,
        equipo_id: idAsignado,
        nombre: nombreAsignado,
        slug: user.slug || idAsignado
      };
      setComunidadActual(objAsignado);
      localStorage.setItem("comunidad_activa_obj", JSON.stringify(objAsignado));
    }
  }, [user, esCreador]);

  const cambiarComunidad = (comunidad) => {
    if (!esCreador) {
      console.warn("🔒 Acción bloqueada: Solo el Creador Global puede cambiar de comunidad.");
      return;
    }
    setComunidadActual(comunidad);
    if (comunidad) {
      localStorage.setItem("comunidad_activa_obj", JSON.stringify(comunidad));
    } else {
      localStorage.removeItem("comunidad_activa_obj");
    }
  };

  // 🌐 Variable que indica si se está visualizando todo globalmente
  const esVistaGlobal = esCreador && (!comunidadActual || comunidadActual.id === "global" || comunidadActual.slug === "global");

  return (
    <ComunidadContext.Provider
      value={{
        comunidadActual,
        cambiarComunidad,
        esCreador,
        esVistaGlobal,
      }}
    >
      {children}
    </ComunidadContext.Provider>
  );
}

export function useComunidad() {
  const context = useContext(ComunidadContext);
  if (!context) {
    throw new Error('useComunidad debe ser usado dentro de un ComunidadProvider');
  }
  return context;
}