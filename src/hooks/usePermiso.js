import { useAuth } from '@/lib/AuthContext';

const APP_CREATOR_EMAIL = "ccanario0687@gmail.com";
const ROLES_ADMINISTRATIVOS = ["admin", "administrador", "rector", "administracion"];
const MODULOS_BASICOS_COMUNIDAD = ["caminantes", "servidores", "inscripciones"];

export function getPermiso(user, key) {
  if (!user) return null;

  const emailClean = (user.email || "").toLowerCase().trim();
  const roleClean = (user.role || user.rol || "").toLowerCase().trim();

  // 👑 1. ÚNICO CREADOR GLOBAL
  if (emailClean === APP_CREATOR_EMAIL || user.es_creador === true) {
    return "edicion";
  }

  // 🛡️ 2. ADMINISTRADORES Y RECTORES DE COMUNIDAD
  if (
    user.es_admin === true ||
    ROLES_ADMINISTRATIVOS.includes(roleClean)
  ) {
    return "edicion";
  }

  // 📋 3. Matriz de permisos individuales por módulo
  let p = user.permisos_modulos;
  if (typeof p === "string") {
    try { p = JSON.parse(p || "{}"); } catch { p = {}; }
  }

  if (p && typeof p === "object" && p[key] !== undefined) {
    const v = p[key];
    if (v === true || v === "edicion") return "edicion";
    if (v === "lectura") return "lectura";
    if (v === "ninguno" || v === false) return null;
  }

  // 🔓 4. ACCESO POR DEFECTO PARA MIEMBROS DE LA COMUNIDAD
  if (MODULOS_BASICOS_COMUNIDAD.includes(key)) {
    return "edicion";
  }

  return null;
}

export function puedeVer(user, key) {
  return getPermiso(user, key) !== null;
}

export function puedeEditar(user, key) {
  return getPermiso(user, key) === "edicion";
}

export function usePermiso(moduloKey) {
  const { user } = useAuth();
  const nivel = getPermiso(user, moduloKey);

  return {
    nivel,
    puedeVer: nivel !== null,
    puedeEditar: nivel === "edicion"
  };
}