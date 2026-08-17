// usePermiso.js - Control de Permisos con Único Creador Global y Rol de Administrador Homologado
import { useAuth } from '@/lib/AuthContext';

// 👑 ÚNICO CREADOR GLOBAL DEL SISTEMA
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

  // 🛡️ 2. ADMINISTRADORES Y RECTORES DE COMUNIDAD (Acceso Total a su Comunidad)
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

  // Mapeo de alias para compatibilidad entre claves de rutas y claves de la matriz
  let targetKey = key;
  if (key === "mensajeria") targetKey = p?.sacerdotes !== undefined ? "sacerdotes" : "mensajeria";
  if (key === "hermandad") targetKey = p?.biblioteca !== undefined ? "biblioteca" : "hermandad";
  if (key === "evaluaciones_reporte") targetKey = p?.evaluaciones !== undefined ? "evaluaciones" : "evaluaciones_reporte";
  if (key === "directorio_servidores") targetKey = p?.servidores !== undefined ? "servidores" : "directorio_servidores";
  if (key === "registro_caminante") targetKey = p?.caminantes !== undefined ? "caminantes" : "registro_caminante";

  if (p && typeof p === "object") {
    // Si la clave exacta o su targetKey están definidos
    const v = p[targetKey] !== undefined ? p[targetKey] : p[key];
    if (v !== undefined) {
      if (v === true || v === "edicion") return "edicion";
      if (v === "lectura") return "lectura";
      if (v === "ninguno" || v === false) return null;
    }
  }

  // 🔓 4. ACCESO POR DEFECTO PARA MIEMBROS DE LA COMUNIDAD
  if (MODULOS_BASICOS_COMUNIDAD.includes(key) || MODULOS_BASICOS_COMUNIDAD.includes(targetKey)) {
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

// 🎯 PLANTILLAS PRECONFIGURADAS DE ROLES Y PERMISOS
export const PLANTILLAS_ROLES = [
  {
    key: "rector",
    label: "👑 Rector / Coordinador",
    description: "Acceso total de edición a todos los módulos del retiro",
    permisos: {
      caminantes: "edicion", servidores: "edicion", directorio_servidores: "edicion",
      inscripciones: "edicion", solicitudes: "edicion", equipos: "edicion",
      entrada: "edicion", distribucion: "edicion", distintivos: "edicion",
      impresiones: "edicion", finanzas: "edicion", presupuesto: "edicion",
      suplidores: "edicion", programacion: "edicion", charlistas: "edicion",
      sacerdotes: "edicion", reportes: "edicion", evaluaciones_reporte: "edicion",
      historial: "edicion", biblioteca: "edicion", config_portada: "edicion",
      configuracion: "edicion", usuarios: "edicion"
    }
  },
  {
    key: "tesorero",
    label: "💰 Tesorero / Finanzas",
    description: "Gestión de ingresos, egresos, cuotas, presupuesto e impresiones de recibos",
    permisos: {
      finanzas: "edicion", presupuesto: "edicion", suplidores: "edicion",
      impresiones: "edicion", reportes: "lectura", caminantes: "lectura", servidores: "lectura"
    }
  },
  {
    key: "secretaria",
    label: "📝 Secretaría / Inscripciones",
    description: "Registro de caminantes y servidores, impresiones, distintivos y solicitudes",
    permisos: {
      caminantes: "edicion", servidores: "edicion", inscripciones: "edicion",
      distintivos: "edicion", impresiones: "edicion", directorio_servidores: "edicion",
      solicitudes: "edicion"
    }
  },
  {
    key: "logistica",
    label: "🛏️ Logística / Casa y Alojamiento",
    description: "Asignación de habitaciones, mesas, distintivos y control de entrada",
    permisos: {
      distribucion: "edicion", distintivos: "edicion", entrada: "edicion",
      equipos: "edicion", caminantes: "lectura", servidores: "lectura"
    }
  },
  {
    key: "liturgia",
    label: "⛪ Liturgia / Sacerdotes y Charlas",
    description: "Gestión de sacerdotes, mensajerías, charlistas y programación",
    permisos: {
      sacerdotes: "edicion", charlistas: "edicion", programacion: "edicion",
      biblioteca: "edicion"
    }
  },
  {
    key: "intendencia",
    label: "📦 Intendencia / Cocina y Compras",
    description: "Control de suplidores, compras y menú del retiro",
    permisos: {
      suplidores: "edicion", programacion: "lectura", presupuesto: "lectura"
    }
  }
];