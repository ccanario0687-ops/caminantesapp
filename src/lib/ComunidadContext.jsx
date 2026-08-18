// ComunidadContext.jsx - Contexto Global con Aislamiento Multi-Tenant Enterprise
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getActiveTenantId, validateTenantAccess } from '@/lib/enterpriseTenantGuard';
import { registrarAuditoria } from '@/lib/auditoria';

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
        slug: user.slug || idAsignado,
        _secured: true
      };
      setComunidadActual(objAsignado);
      localStorage.setItem("comunidad_activa_obj", JSON.stringify(objAsignado));
    }
  }, [user, esCreador]);

  const cambiarComunidad = (comunidad) => {
    const validacion = validateTenantAccess(user, comunidadActual, comunidad?.id || comunidad?.equipo_id);
    if (!validacion.permitido) {
      console.warn(validacion.razon);
      return;
    }

    setComunidadActual(comunidad);
    if (comunidad) {
      localStorage.setItem("comunidad_activa_obj", JSON.stringify(comunidad));
    } else {
      localStorage.removeItem("comunidad_activa_obj");
    }

    // Registrar evento de auditoría de cambio de espacio de trabajo
    try {
      registrarAuditoria({
        usuario: user,
        accion: "CAMBIO_TENANT",
        entidad: "ComunidadContext",
        detalles: `Espacio de trabajo cambiado a: ${comunidad?.nombre || "Vista Global"}`,
        equipo_id: comunidad?.id || "global"
      });
    } catch {}
  };

  // ID del Inquilino activo
  const activeTenantId = useMemo(() => getActiveTenantId(user, comunidadActual), [user, comunidadActual]);

  // 🌐 Variable que indica si se está visualizando todo globalmente
  const esVistaGlobal = esCreador && (!comunidadActual || comunidadActual.id === "global" || comunidadActual.slug === "global");

  return (
    <ComunidadContext.Provider
      value={{
        comunidadActual,
        cambiarComunidad,
        esCreador,
        esVistaGlobal,
        activeTenantId,
        isTenantSecured: true,
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