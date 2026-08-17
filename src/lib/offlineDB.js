import Dexie from "dexie";

// Base de datos local IndexedDB para funcionamiento offline
class OfflineDB extends Dexie {
  constructor() {
    super("EmausRetiro");
    this.version(1).stores({
      // Almacena datos de cada entidad (clave: nombreEntidad)
      data: "entityName,id",
      // Cola de cambios pendientes por sincronizar
      mutations: "++id,entityName,recordId,action,timestamp",
    });
    this.data = this.table("data");
    this.mutations = this.table("mutations");
  }
}

export const db = new OfflineDB();

// Guardar datos de una entidad localmente
export async function saveLocalData(entityName, records) {
  // Borrar datos anteriores de esta entidad y guardar los nuevos
  await db.data.where("entityName").equals(entityName).delete();
  const rows = records.map((r) => ({ ...r, entityName }));
  await db.data.bulkPut(rows);
}

// Leer datos locales de una entidad
export async function getLocalData(entityName) {
  const rows = await db.data.where("entityName").equals(entityName).toArray();
  return rows.map(({ entityName: _, ...record }) => record);
}

// Encolar una mutación (create, update, delete)
export async function queueMutation(entityName, recordId, action, payload) {
  await db.mutations.add({
    entityName,
    recordId,
    action,
    payload: payload ? JSON.stringify(payload) : null,
    timestamp: Date.now(),
  });
}

// Obtener todas las mutaciones pendientes
export async function getPendingMutations() {
  return db.mutations.orderBy("timestamp").toArray();
}

// Eliminar mutaciones ya sincronizadas
export async function clearMutation(id) {
  await db.mutations.delete(id);
}

// Aplicar una mutación a los datos locales
export async function applyLocalMutation(entityName, action, recordId, payload) {
  if (action === "delete") {
    await db.data.where({ entityName, id: recordId }).delete();
  } else if (action === "create") {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    await db.data.put({ ...data, id: recordId, entityName });
  } else if (action === "update") {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    const existing = await db.data.get({ entityName, id: recordId });
    if (existing) {
      await db.data.put({ ...existing, ...data, entityName });
    } else {
      await db.data.put({ ...data, id: recordId, entityName });
    }
  }
}

// Sincronizar cola de mutaciones pendientes
export async function syncPendingMutations(base44) {
  const pending = await getPendingMutations();
  for (const mut of pending) {
    try {
      const payload = mut.payload ? JSON.parse(mut.payload) : null;
      if (mut.action === "create") {
        await base44.entities[mut.entityName].create(payload);
      } else if (mut.action === "update") {
        await base44.entities[mut.entityName].update(mut.recordId, payload);
      } else if (mut.action === "delete") {
        await base44.entities[mut.entityName].delete(mut.recordId);
      }
      await clearMutation(mut.id);
    } catch (e) {
      console.warn("Error sincronizando mutación:", mut, e);
    }
  }
}