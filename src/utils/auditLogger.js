import { base44 } from "@/api/base44Client";

/**
 * Servicio Centralizado de Registro de Auditoría y Registro de Actividades
 */

export async function registrarAccionAuditoria({
  usuario = null,
  accion = "MODIFICACION", // "APROBACION", "CREACION", "MODIFICACION", "ELIMINACION", "PAGO", "ACCESO"
  modulo = "General",     // "Inscripciones", "Caminantes", "Servidores", "Finanzas", "Distribución", "Usuarios", "Configuración"
  detalle = "",
  entidad = "",
  entidad_id = "",
  datos_previos = null,
  datos_nuevos = null,
}) {
  try {
    // Obtener información del usuario activo desde el AuthContext o localStorage si no se pasa explícitamente
    let usuarioEmail = usuario?.email || usuario?.name || "Sistema";
    let usuarioNombre = usuario?.name || usuario?.email || "Usuario del Sistema";

    if (!usuario && typeof window !== "undefined") {
      const userStoredStr = localStorage.getItem("emaus_user_auth");
      if (userStoredStr) {
        try {
          const uObj = JSON.parse(userStoredStr);
          usuarioEmail = uObj.email || usuarioEmail;
          usuarioNombre = uObj.nombre || uObj.name || uObj.email || usuarioNombre;
        } catch { null }
      }
    }

    const nuevoLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      fecha_hora: new Date().toISOString(),
      usuario_email: usuarioEmail,
      usuario_nombre: usuarioNombre,
      accion: String(accion).toUpperCase(),
      modulo: String(modulo),
      detalle: String(detalle),
      entidad: String(entidad || ""),
      entidad_id: String(entidad_id || ""),
      datos_previos: datos_previos ? JSON.stringify(datos_previos) : null,
      datos_nuevos: datos_nuevos ? JSON.stringify(datos_nuevos) : null,
    };

    // 1. Guardar en entidad Base44 BitacoraAuditoria si existe
    base44.entities.BitacoraAuditoria?.create(nuevoLog).catch(() => null);

    // 2. Guardar en caché de localStorage para disponibilidad inmediata y offline
    if (typeof window !== "undefined") {
      const logsExistentesStr = localStorage.getItem("emaus_bitacora_auditoria_logs");
      let logsExistentes = [];
      if (logsExistentesStr) {
        try { logsExistentes = JSON.parse(logsExistentesStr); } catch { logsExistentes = []; }
      }
      const actualizados = [nuevoLog, ...logsExistentes].slice(0, 500); // Guardar los 500 más recientes
      localStorage.setItem("emaus_bitacora_auditoria_logs", JSON.stringify(actualizados));
      
      // Emitir evento para actualización en tiempo real en la pantalla de bitácora
      window.dispatchEvent(new CustomEvent("emaus_audit_log_added", { detail: nuevoLog }));
    }

    return nuevoLog;
  } catch (e) {
    console.warn("Error al registrar auditoría:", e);
    return null;
  }
}

export function obtenerLogsAuditoriaLocal() {
  if (typeof window === "undefined") return [];
  const logsExistentesStr = localStorage.getItem("emaus_bitacora_auditoria_logs");
  if (!logsExistentesStr) return [];
  try {
    return JSON.parse(logsExistentesStr);
  } catch {
    return [];
  }
}
