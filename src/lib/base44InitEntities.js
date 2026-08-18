// base44InitEntities.js - Creador e Inicializador Automático de Entidades Base44
import { base44 } from "@/api/base44Client";

/**
 * Inicializa automáticamente las entidades 'EquiposRetiro' y 'ConfigRetiro' en Base44 si no existen registros.
 */
export async function inicializarEntidadesBase44() {
  try {
    // 1. Inicializar la entidad 'EquiposRetiro' (Comunidades)
    let comunidades = await base44.entities.EquiposRetiro?.list().catch(() => []) || [];
    if (!Array.isArray(comunidades) || comunidades.length === 0) {
      console.log("🌱 Inicializando entidad 'EquiposRetiro' en Base44...");
      await base44.entities.EquiposRetiro.create({
        id: "eq_global",
        equipo_id: "global",
        slug: "global",
        nombre: "🌐 Vista Global (Todas las Comunidades)",
        diocesis: "Arquidiócesis Primada",
        provincia: "Santo Domingo",
        plan: "pro",
        fecha_creacion: new Date().toISOString()
      }).catch(() => null);

      await base44.entities.EquiposRetiro.create({
        id: "eq_santacruz",
        equipo_id: "eq_santacruz",
        slug: "santacruz",
        nombre: "Parroquia Santa Cruz de Mayo",
        diocesis: "Diócesis de Santo Domingo",
        provincia: "Santo Domingo",
        plan: "pro",
        fecha_creacion: new Date().toISOString()
      }).catch(() => null);
    }

    // 2. Inicializar la entidad 'ConfigRetiro' (Configuración por Comunidad)
    let configs = await base44.entities.ConfigRetiro?.list().catch(() => []) || [];
    if (!Array.isArray(configs) || configs.length === 0) {
      console.log("🌱 Inicializando entidad 'ConfigRetiro' en Base44...");
      await base44.entities.ConfigRetiro.create({
        equipo_id: "eq_santacruz",
        nombre_retiro: "Retiro de Emaús - Parroquia Santa Cruz",
        parroquia: "Parroquia Santa Cruz de Mayo",
        diocesis: "Diócesis de Santo Domingo",
        logo_url: "https://media.base44.com/images/public/69e8403342580bac45e5b3bd/28de3e4eb_logoemauscircular.png",
        plan: "pro"
      }).catch(() => null);
    }

    return { exito: true, mensaje: "Entidades EquiposRetiro y ConfigRetiro verificadas e inicializadas en Base44." };
  } catch (err) {
    console.warn("Advertencia al inicializar entidades en Base44:", err);
    return { exito: false, error: err?.message };
  }
}
