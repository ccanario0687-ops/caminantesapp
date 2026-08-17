/**
 * Utilidad compartida para cargar estilos de impresión desde ConfigRetiro.
 * Usada por: Impresiones, DistintivosHabitacion, ImpresionIndividualModal.
 */
import { base44 } from "@/api/base44Client";
import { DEFAULTS_ESTILOS, DEFAULTS_POR_TIPO } from "@/components/impresiones/ConfiguracionImpresiones";
import { DEFAULTS_DISTINTIVO } from "@/components/distintivos/ConfiguracionDistintivos";

/** Carga ConfigRetiro y devuelve { config, configId, estilosPorTipo, estilosDistintivo } */
export async function cargarConfigImpresion() {
  const cfgs = await base44.entities.ConfigRetiro.list();
  if (!cfgs || cfgs.length === 0) {
    return { config: null, configId: null, estilosPorTipo: {}, estilosDistintivo: { ...DEFAULTS_DISTINTIVO } };
  }
  const cfg = cfgs[0];
  let estilosPorTipo = {};
  let estilosDistintivo = { ...DEFAULTS_DISTINTIVO };
  try {
    if (cfg.estilos_impresion) {
      const parsed = JSON.parse(cfg.estilos_impresion);
      estilosPorTipo = parsed;
      if (parsed.distintivo) {
        estilosDistintivo = { ...DEFAULTS_DISTINTIVO, ...parsed.distintivo };
      }
    }
  } catch {}
  return { config: cfg, configId: cfg.id, estilosPorTipo, estilosDistintivo };
}

/** Devuelve los estilos combinados para un tipo de documento */
export function getEstilosTipo(estilosPorTipo, tipo) {
  return { ...DEFAULTS_ESTILOS, ...(DEFAULTS_POR_TIPO[tipo] || {}), ...(estilosPorTipo[tipo] || {}) };
}

/**
 * Carga todos los caminantes con paginación completa.
 * base44.entities.Caminante.list() solo devuelve 50 por defecto.
 */
export async function cargarTodosCaminantes() {
  const PAGE = 200;
  let all = [];
  let skip = 0;
  while (true) {
    const batch = await base44.entities.Caminante.filter({}, "-numero_ficha", PAGE, skip);
    all = all.concat(batch);
    if (batch.length < PAGE) break;
    skip += PAGE;
  }
  return all;
}

/**
 * Carga todos los servidores con paginación completa.
 */
export async function cargarTodosServidores() {
  const PAGE = 200;
  let all = [];
  let skip = 0;
  while (true) {
    const batch = await base44.entities.Servidor.filter({}, "-created_date", PAGE, skip);
    all = all.concat(batch);
    if (batch.length < PAGE) break;
    skip += PAGE;
  }
  return all;
}