import { useCallback, useEffect, useRef, useState } from "react";

/** Check often while the app is foregrounded; mobile browsers throttle background timers. */
export const UPDATE_POLL_INTERVAL_MS = 60_000;

export function shouldCheckForUpdate(isVisible: boolean, isOnline: boolean): boolean {
  return isVisible && isOnline;
}

export interface AppUpdateState {
  updateAvailable: boolean;
  updating: boolean;
  applyUpdate: (beforeReload?: () => Promise<void>) => void;
}

/** A waiting worker is actionable even if this particular page has no controller yet. */
export function hasWaitingUpdate(registration: Pick<ServiceWorkerRegistration, "waiting"> | null): boolean {
  return !!registration?.waiting;
}

/** Detect a waiting production service worker and apply it only on request. */
export function useAppUpdate(): AppUpdateState {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const updateRequested = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    let activeRegistration: ServiceWorkerRegistration | null = null;
    let interval: number | undefined;
    let disposed = false;
    let installingWorker: ServiceWorker | null = null;
    let onWorkerStateChange: (() => void) | null = null;
    let hasController = !!navigator.serviceWorker.controller;
    let hadActiveWorker = hasController;
    let waitingWorkerDetected = false;
    let reloading = false;

    const revealWaitingWorker = () => {
      if (disposed) return;
      if (hasWaitingUpdate(activeRegistration)) {
        waitingWorkerDetected = true;
        setUpdateAvailable(true);
      }
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
      // Surface an already-waiting worker immediately, even when offline or when
      // the current browser page is not yet controlled by the registration.
      revealWaitingWorker();
      if (!shouldCheckForUpdate(document.visibilityState === "visible", navigator.onLine) || !activeRegistration) return;
      void activeRegistration.update().then(revealWaitingWorker).catch(() => undefined);
    };
    const onControllerChange = () => {
      const firstController = !hasController;
      hasController = true;
      // Ignore only the first activation of a brand-new install. If an existing
      // registration or a waiting worker was present, this is an update and the
      // running page must reload to use the newly activated app shell.
      if (firstController && !hadActiveWorker && !waitingWorkerDetected && !updateRequested.current) {
        revealWaitingWorker();
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
    window.addEventListener("pageshow", checkForUpdate);
    window.addEventListener("online", checkForUpdate);

    void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((next) => {
      if (disposed) return;
      activeRegistration = next;
      hadActiveWorker = hadActiveWorker || !!next.active;
      setRegistration(next);
      next.addEventListener("updatefound", onInstalling);
      if (next.installing) onInstalling();
      checkForUpdate();
      // Foreground online checks keep installed Android/iOS apps from needing a
      // manual refresh. Background timers are throttled by mobile browsers;
      // pageshow/visibilitychange/focus check immediately when users return.
      interval = window.setInterval(checkForUpdate, UPDATE_POLL_INTERVAL_MS);
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
      window.removeEventListener("pageshow", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
      activeRegistration?.removeEventListener("updatefound", onInstalling);
    };
  }, []);

  const applyUpdate = useCallback((beforeReload?: () => Promise<void>) => {
    const waiting = registration?.waiting;
    if (!waiting) {
      updateRequested.current = false;
      setUpdateAvailable(false);
      setUpdating(false);
      return;
    }
    updateRequested.current = true;
    setUpdating(true);
    void (beforeReload?.() ?? Promise.resolve()).then(() => {
      waiting.postMessage({ type: "SKIP_WAITING" });
    }).catch((error) => {
      updateRequested.current = false;
      console.error("Delulu Life: could not save before applying update", error);
      setUpdating(false);
    });
  }, [registration]);

  return { updateAvailable, updating, applyUpdate };
}
