import { useCallback, useState } from "react";
import type { CustomSpec, GameState } from "./types";
import { newCustomLife, newRandomLife } from "./characters";
import { ageUp, continueAs, getEvent } from "./simulate";
import { runEvent } from "./events";
import { doAction } from "./actions";

const KEY = "delulu-life-save-v1";

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as GameState;
    if (d.version !== 1 || !d.chars[d.currentId]) return null;
    return d;
  } catch {
    return null;
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

function persist(s: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or unavailable */
  }
}

export function useGame() {
  const [state, setState] = useState<GameState | null>(() => loadSave());

  const commit = useCallback((fn: (s: GameState) => void) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as GameState;
      fn(next);
      persist(next);
      return next;
    });
  }, []);

  const startRandom = useCallback(() => {
    setState((prev) => {
      const n = newRandomLife(prev?.livesLived ?? 0);
      persist(n);
      return n;
    });
  }, []);

  const startCustom = useCallback((spec: CustomSpec) => {
    setState((prev) => {
      const n = newCustomLife(spec, prev?.livesLived ?? 0);
      persist(n);
      return n;
    });
  }, []);

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

  return { state, startRandom, startCustom, ageUpAction, resolve, act, cont, dismissToast };
}

export type GameApi = ReturnType<typeof useGame>;
