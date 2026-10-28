import { useCallback, useEffect, useState } from "react";

export interface AppUpdateState {
  updateAvailable: boolean;
  updating: boolean;
  applyUpdate: (beforeReload?: () => Promise<void>) => void;
}

/** Detect a waiting production service worker and apply it only on request. */
export function useAppUpdate(): AppUpdateState {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    let activeRegistration: ServiceWorkerRegistration | null = null;
    let interval: number | undefined;
    let disposed = false;
    let installingWorker: ServiceWorker | null = null;
    let onWorkerStateChange: (() => void) | null = null;
    let hasController = !!navigator.serviceWorker.controller;
    let reloading = false;

    const revealWaitingWorker = () => {
      if (activeRegistration?.waiting && navigator.serviceWorker.controller) setUpdateAvailable(true);
    };
    const onInstalling = () => {
      const worker = activeRegistration?.installing;
      if (!worker) return;
      if (installingWorker && onWorkerStateChange) installingWorker.removeEventListener("statechange", onWorkerStateChange);
      installingWorker = worker;
      onWorkerStateChange = () => {
        if (worker.state === "installed") revealWaitingWorker();
      };
      worker.addEventListener("statechange", onWorkerStateChange);
    };
    const checkForUpdate = () => {
      if (document.visibilityState === "visible") void activeRegistration?.update().catch(() => undefined);
    };
    const onControllerChange = () => {
      // The first controller is a fresh install, not an app update. A later
      // controller change means the user (possibly in another tab) applied one.
      if (!hasController) {
        hasController = true;
        return;
      }
      if (!reloading) {
        reloading = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("focus", checkForUpdate);

    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((next) => {
      if (disposed) return;
      activeRegistration = next;
      setRegistration(next);
      next.addEventListener("updatefound", onInstalling);
      if (next.installing) onInstalling();
      revealWaitingWorker();
      checkForUpdate();
      interval = window.setInterval(checkForUpdate, 30 * 60 * 1000);
    }).catch((error) => {
      console.warn("Delulu Life: service worker registration failed", error);
    });

    return () => {
      disposed = true;
      if (interval !== undefined) window.clearInterval(interval);
      if (installingWorker && onWorkerStateChange) installingWorker.removeEventListener("statechange", onWorkerStateChange);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", checkForUpdate);
      window.removeEventListener("focus", checkForUpdate);
      activeRegistration?.removeEventListener("updatefound", onInstalling);
    };
  }, []);

  const applyUpdate = useCallback((beforeReload?: () => Promise<void>) => {
    const waiting = registration?.waiting;
    if (!waiting) {
      setUpdateAvailable(false);
      setUpdating(false);
      return;
    }
    setUpdating(true);
    void (beforeReload?.() ?? Promise.resolve()).then(() => {
      waiting.postMessage({ type: "SKIP_WAITING" });
    }).catch((error) => {
      console.error("Delulu Life: could not save before applying update", error);
      setUpdating(false);
    });
  }, [registration]);

  return { updateAvailable, updating, applyUpdate };
}
