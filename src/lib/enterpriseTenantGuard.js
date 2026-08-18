// enterpriseTenantGuard.js - Guardia Central de Aislamiento Multi-Tenant Enterprise
// Enforces tenant isolation, validates equipo_id/comunidad_id, and prevents cross-tenant data leakage.

/**
 * Obtiene el ID de inquilino (Tenant ID) activo con validación estricta
 */
export function getActiveTenantId(user, comunidadActual) {
  const esCreador = Boolean(
    user?.email === "ccanario0687@gmail.com" || user?.es_creador === true
  );

  // Si es Creador y está en Vista Global
  if (esCreador && (!comunidadActual || comunidadActual.id === "global" || comunidadActual.slug === "global")) {
    return "global";
  }

  // ID asignado obligatoriamente por el perfil de usuario (Non-Creators can ONLY access their assigned tenant)
  if (!esCreador && (user?.equipo_id || user?.comunidad_id)) {
    return String(user.equipo_id || user.comunidad_id);
  }

  // Tenant seleccionado por el Creador Global
  if (comunidadActual?.equipo_id || comunidadActual?.id) {
    return String(comunidadActual.equipo_id || comunidadActual.id);
  }

  return user?.equipo_id || user?.comunidad_id || "global";
}

/**
 * Aplica el filtro de inquilino (Tenant Filter) a cualquier lista o consulta de datos
 */
export function applyTenantFilter(list = [], tenantId = "global") {
  if (!Array.isArray(list)) return [];
  if (!tenantId || tenantId === "global") return list;

  const targetId = String(tenantId).toLowerCase().trim();

  return list.filter(item => {
    if (!item) return false;
    const itemTenant = String(item.equipo_id || item.comunidad_id || item.equipo || "").toLowerCase().trim();
    // Si el registro no especifica tenant o coincide con el tenant activo, se permite
    return !itemTenant || itemTenant === "global" || itemTenant === targetId;
  });
}

/**
 * Inyecta los metadatos obligatorios de tenant en un nuevo registro
 */
export function injectTenantMetadata(payload = {}, user, comunidadActual) {
  const activeTenantId = getActiveTenantId(user, comunidadActual);
  const tenantNombre = comunidadActual?.nombre || user?.nombre_equipo || user?.nombre_comunidad || "Comunidad Emaús";

  return {
    ...payload,
    equipo_id: activeTenantId !== "global" ? activeTenantId : (payload.equipo_id || "global"),
    comunidad_id: activeTenantId !== "global" ? activeTenantId : (payload.comunidad_id || "global"),
    nombre_equipo: payload.nombre_equipo || tenantNombre,
    _tenant_secured: true,
    _created_by_tenant: activeTenantId,
  };
}

/**
 * Valida si el usuario tiene permiso explícito para realizar acciones en el inquilino objetivo
 */
export function validateTenantAccess(user, comunidadActual, targetTenantId) {
  const esCreador = Boolean(
    user?.email === "ccanario0687@gmail.com" || user?.es_creador === true
  );

  if (esCreador) return { permitido: true, razon: "Acceso concedido como Creador Global" };

  const userTenant = String(user?.equipo_id || user?.comunidad_id || "").toLowerCase().trim();
  const target = String(targetTenantId || "").toLowerCase().trim();

  if (!userTenant) {
    return { permitido: false, razon: "🔒 Usuario sin comunidad o inquilino asignado." };
  }

  if (target && target !== "global" && target !== userTenant) {
    return { permitido: false, razon: `🔒 Acceso Denegado: No tienes permisos para acceder a la comunidad ${target}.` };
  }

  return { permitido: true, razon: "Acceso verificado para el inquilino asignado" };
}
