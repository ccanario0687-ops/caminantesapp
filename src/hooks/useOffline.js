import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  saveLocalData,
  getLocalData,
  queueMutation,
  applyLocalMutation,
  syncPendingMutations,
} from "@/lib/offlineDB";

export default function useOffline(entityName) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const syncInProgress = useRef(false);
  const recordsRef = useRef([]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        reload();
      }
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Polling ligero en segundo plano cada 12 segundos para sincronizar cambios de otros dispositivos
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine && !syncInProgress.current) {
        reload();
      }
    }, 12000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [reload]);

  const reload = useCallback(async () => {
    setLoading(true);
    const isOnline = navigator.onLine;

    if (isOnline) {
      try {
        let data = null;
        try {
          data = await base44.entities[entityName].list(10000);
        } catch (e1) {
          try {
            data = await base44.entities[entityName].list({ limit: 10000 });
          } catch (e2) {
            data = await base44.entities[entityName].list("-created_at").catch(() => []);
          }
        }

        let rawList = null;
        if (Array.isArray(data)) {
          rawList = data;
        } else if (data && Array.isArray(data.data)) {
          rawList = data.data;
        } else if (data && Array.isArray(data.items)) {
          rawList = data.items;
        } else if (data && Array.isArray(data.records)) {
          rawList = data.records;
        }

        if (rawList !== null) {
          const dataNormalizada = rawList.map(item => {
            const resolvedId = String(item.id || item._id || "").trim();
            return {
              ...item,
              id: resolvedId,
              _id: resolvedId
            };
          });

          dataNormalizada.sort((a, b) => {
            const tA = new Date(a.created_at || a.created_date || a.updated_at || 0).getTime();
            const tB = new Date(b.created_at || b.created_date || b.updated_at || 0).getTime();
            return tB - tA;
          });

          setRecords(dataNormalizada);
          await saveLocalData(entityName, dataNormalizada);
        } else {
          const local = await getLocalData(entityName);
          setRecords(local || []);
        }
      } catch (err) {
        console.warn(`[useOffline] Falló carga remota de ${entityName}, usando datos locales:`, err);
        const local = await getLocalData(entityName);
        setRecords(local || []);
      }
    } else {
      const local = await getLocalData(entityName);
      setRecords(local || []);
    }
    setLoading(false);
  }, [entityName]);

  useEffect(() => {
    if (online && !syncInProgress.current) {
      syncInProgress.current = true;
      syncPendingMutations(base44).finally(() => {
        syncInProgress.current = false;
        reload();
      });
    }
  }, [online, reload]);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(
    async (data) => {
      if (online) {
        const tempId = "temp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
        const optimistic = { ...data, id: tempId, _id: tempId, created_date: new Date().toISOString() };
        setRecords((prev) => [optimistic, ...prev]);
        try {
          const result = await base44.entities[entityName].create(data);
          const resolvedId = String(result.id || result._id || tempId).trim();
          const resultNormalizado = { ...result, id: resolvedId, _id: resolvedId };
          setRecords((prev) => prev.map((r) => (r.id === tempId ? resultNormalizado : r)));
          return resultNormalizado;
        } catch (e) {
          setRecords((prev) => prev.filter((r) => r.id !== tempId));
          throw e;
        }
      } else {
        const tempId = "temp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
        const record = { ...data, id: tempId, _id: tempId, created_date: new Date().toISOString() };
        await applyLocalMutation(entityName, "create", tempId, record);
        await queueMutation(entityName, tempId, "create", record);
        setRecords((prev) => [record, ...prev]);
        return record;
      }
    },
    [entityName, online]
  );

  const update = useCallback(
    async (id, data) => {
      if (!id) return;
      const targetId = String(id).trim();

      setRecords((prev) => {
        const next = prev.map((r) => {
          const rId = String(r.id || r._id || "").trim();
          return (rId === targetId) ? { ...r, ...data } : r;
        });
        saveLocalData(entityName, next).catch(() => {});
        return next;
      });

      if (online) {
        try {
          await base44.entities[entityName].update(targetId, data);
          await applyLocalMutation(entityName, "update", targetId, data);
        } catch (e) {
          console.warn(`[useOffline] Falló actualización remota de ${entityName}, manteniendo localmente:`, e);
          await applyLocalMutation(entityName, "update", targetId, data);
          await queueMutation(entityName, targetId, "update", data);
        }
      } else {
        await applyLocalMutation(entityName, "update", targetId, data);
        await queueMutation(entityName, targetId, "update", data);
      }
    },
    [entityName, online]
  );

  const remove = useCallback(
    async (id) => {
      if (!id) return;
      const targetId = String(id).trim();

      if (online) {
        const snapshot = recordsRef.current;
        setRecords((prev) => prev.filter((r) => String(r.id || r._id || "").trim() !== targetId));
        try {
          await base44.entities[entityName].delete(targetId);
        } catch (e) {
          setRecords(snapshot);
          throw e;
        }
      } else {
        await applyLocalMutation(entityName, "delete", targetId, null);
        await queueMutation(entityName, targetId, "delete", null);
        setRecords((prev) => prev.filter((r) => String(r.id || r._id || "").trim() !== targetId));
      }
    },
    [entityName, online]
  );

  return { records, loading, online, create, update, remove, reload };
}