import { useCallback, useEffect, useRef, useState } from "react";
import type { CustomSpec, GameState, SaveMeta } from "./types";
import { newCustomLife, newRandomLife } from "./characters";
import { ageUp, continueAs, getEvent } from "./simulate";
import { runEvent } from "./events";
import { doAction } from "./actions";
import { getDriver, type StorageDriver } from "./persistence/storage";
import {
  AUTOSAVE_ID, deleteSlot, exportEnvelope, importEnvelope, listSlots, loadSlot,
  migrateLegacySave, renameSlot, writeSlot,
} from "./persistence/saves";

export interface ImportResult {
  ok: boolean;
  error?: string;
}

function newSlotId(): string {
  return `slot-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function useGame() {
  const driverRef = useRef<StorageDriver | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<GameState | null>(null);
  const [saves, setSaves] = useState<SaveMeta[]>([]);

  const refreshSaves = useCallback(async () => {
    if (!driverRef.current) return;
    setSaves(await listSlots(driverRef.current));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const driver = getDriver();
      driverRef.current = driver;
      try {
        await migrateLegacySave(driver);
      } catch {
        /* legacy migration is best-effort */
      }
      const slots = await listSlots(driver);
      if (cancelled) return;
      setSaves(slots);
      if (slots.length > 0) {
        const loaded = await loadSlot(driver, slots[0].id);
        if (!cancelled && loaded) setState(loaded);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    async (s: GameState) => {
      const driver = driverRef.current;
      if (!driver) return;
      if (!s.saveSlotId) s.saveSlotId = newSlotId();
      await writeSlot(driver, s.saveSlotId, s);
      void refreshSaves();
    },
    [refreshSaves]
  );

  const commit = useCallback(
    (fn: (s: GameState) => void) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev)) as GameState;
        fn(next);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const beginLife = useCallback(
    (n: GameState) => {
      n.saveSlotId = newSlotId();
      void persist(n);
      setState(n);
    },
    [persist]
  );

  const startRandom = useCallback(() => {
    beginLife(newRandomLife(state?.livesLived ?? 0));
  }, [beginLife, state]);

  const startCustom = useCallback(
    (spec: CustomSpec) => {
      beginLife(newCustomLife(spec, state?.livesLived ?? 0));
    },
    [beginLife, state]
  );

  const ageUpAction = useCallback(() => commit((s) => ageUp(s)), [commit]);

  const resolve = useCallback(
    (choiceId: string) =>
      commit((s) => {
        const pc = s.pending[0];
        if (!pc) return;
        s.pending.shift();
        const p = s.chars[s.currentId];
        const ev = getEvent(pc.eventId);
        if (ev) runEvent(s, p, ev, choiceId);
      }),
    [commit]
  );

  const act = useCallback(
    (id: string, opt?: string) => commit((s) => doAction(s, id, opt)),
    [commit]
  );

  const cont = useCallback((id: string) => commit((s) => continueAs(s, id)), [commit]);

  const dismissToast = useCallback(() => commit((s) => (s.toast = null)), [commit]);

  const openSlot = useCallback(
    async (id: string) => {
      const driver = driverRef.current;
      if (!driver) return;
      const loaded = await loadSlot(driver, id);
      if (loaded) setState(loaded);
    },
    []
  );

  const renameSave = useCallback(
    async (id: string, name: string) => {
      const driver = driverRef.current;
      if (!driver) return;
      await renameSlot(driver, id, name);
      await refreshSaves();
    },
    [refreshSaves]
  );

  const deleteSave = useCallback(
    async (id: string) => {
      const driver = driverRef.current;
      if (!driver) return;
      await deleteSlot(driver, id);
      if (state?.saveSlotId === id) setState(null);
      await refreshSaves();
    },
    [refreshSaves, state]
  );

  const exportSave = useCallback((): string | null => {
    if (!state) return null;
    return exportEnvelope(state);
  }, [state]);

  const importSave = useCallback(
    async (json: string): Promise<ImportResult> => {
      const driver = driverRef.current;
      if (!driver) return { ok: false, error: "Storage is not ready yet." };
      const result = importEnvelope(json);
      if (!result.ok || !result.state) {
        return { ok: false, error: result.errors.join(" ") };
      }
      const n = result.state;
      n.saveSlotId = newSlotId();
      await writeSlot(driver, n.saveSlotId, n, `Imported — ${n.chars[n.currentId]?.firstName ?? "life"}`);
      await refreshSaves();
      setState(n);
      return { ok: true };
    },
    [refreshSaves]
  );

  const endLineage = useCallback(() => setState(null), []);

  const quickSave = useCallback(() => {
    if (state) void persist(state);
  }, [state, persist]);

  return {
    ready,
    state,
    saves,
    startRandom,
    startCustom,
    ageUpAction,
    resolve,
    act,
    cont,
    dismissToast,
    openSlot,
    renameSave,
    deleteSave,
    exportSave,
    importSave,
    endLineage,
    quickSave,
    autosaveId: AUTOSAVE_ID,
  };
}

export type GameApi = ReturnType<typeof useGame>;
