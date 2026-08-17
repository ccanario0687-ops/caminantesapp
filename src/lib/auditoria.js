import { base44 } from "@/api/base44Client";
import { registrarAccionAuditoria } from "@/utils/auditLogger";

const AUDIT_LOCAL_STORAGE_KEY = "emaus_audit_logs_local_v1";

/**
 * Registra un evento en la Bitácora de Auditoría de Cambios
 * @param {Object} params - { usuario_email, usuario_nombre, accion, entidad, detalles, equipo_id }
 */
export async function registrarAuditoria({ usuario, accion, entidad, detalles, equipo_id }) {
  const email = usuario?.email || "sistema@emaus.app";
  const nombre = usuario?.username || usuario?.full_name || email.split("@")[0];
  const equipoIdFinal = equipo_id || usuario?.equipo_id || "global";

  const payload = {
    usuario_email: email,
    usuario_nombre: nombre,
    accion: accion || "Modificación",
    entidad: entidad || "General",
    detalles: typeof detalles === "object" ? JSON.stringify(detalles) : String(detalles || ""),
    equipo_id: String(equipoIdFinal),
  };

  // Conectar con la bitácora centralizada de auditoría
  registrarAccionAuditoria({
    usuario,
    accion: accion?.toUpperCase() || "MODIFICACION",
    modulo: entidad || "Usuarios",
    detalle: typeof detalles === "object" ? JSON.stringify(detalles) : String(detalles || ""),
    entidad: entidad || "General",
    entidad_id: String(equipoIdFinal)
  });

  // 1. Guardar en LocalStorage como respaldo inmediato
  try {
    const prev = JSON.parse(localStorage.getItem(AUDIT_LOCAL_STORAGE_KEY) || "[]");
    const nuevoLocal = [
      { id: "audit_loc_" + Date.now(), ...payload, created_date: new Date().toISOString() },
      ...prev.slice(0, 199) // Guardar hasta 200 registros en local
    ];
    localStorage.setItem(AUDIT_LOCAL_STORAGE_KEY, JSON.stringify(nuevoLocal));
  } catch (e) {
    console.warn("[AUDITORIA] Error en respaldo local:", e);
  }

  // 2. Guardar en Base44 si la entidad o función está disponible
  try {
    if (base44.entities?.AuditLog?.create) {
      await base44.entities.AuditLog.create(payload);
    }
  } catch (err) {
    console.warn("[AUDITORIA] Fallback local activo. Base44 AuditLog not sync:", err?.message);
  }

  // Notificar cambio
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("emaus_audit_event", { detail: payload }));
  }
}

/**
 * Consulta la Bitácora de Auditoría filtrando por equipo/comunidad
 * @param {string} equipoId 
 */
export async function obtenerBitacoraAuditoria(equipoId = null) {
  let registrosBase44 = [];
  try {
    if (base44.entities?.AuditLog?.list) {
      registrosBase44 = await base44.entities.AuditLog.list("-created_date").catch(() => []);
    }
  } catch (e) {}

  let registrosLocales = [];
  try {
    registrosLocales = JSON.parse(localStorage.getItem(AUDIT_LOCAL_STORAGE_KEY) || "[]");
  } catch (e) {}

  // Combinar y deduplicar
  const mapa = new Map();
  [...(registrosBase44 || []), ...(registrosLocales || [])].forEach(item => {
    if (!item) return;
    const key = item.id || `${item.usuario_email}_${item.accion}_${item.created_date}`;
    if (!mapa.has(key)) {
      mapa.set(key, item);
    }
  });

  const todos = Array.from(mapa.values());
  todos.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  if (!equipoId || equipoId === "GLOBAL" || equipoId === "global") {
    return todos;
  }

  return todos.filter(item => 
    !item.equipo_id || 
    String(item.equipo_id).toLowerCase() === String(equipoId).toLowerCase()
  );
}
