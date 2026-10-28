import { useState } from "react";
import { useGame } from "./game/state";
import { Menu } from "./components/Menu";
import { Game } from "./components/Game";
import { UpdateBanner } from "./components/UpdateBanner";
import { useAppUpdate } from "./game/useAppUpdate";

export default function App() {
  const g = useGame();
  const update = useAppUpdate();
  const [view, setView] = useState<"menu" | "game">(() => {
    if (typeof window !== "undefined") {
      try {
        if (window.sessionStorage.getItem("delulu-last-view") === "game") return "game";
      } catch {
        // Session storage may be disabled; the app remains fully playable.
      }
    }
    return g.state ? "game" : "menu";
  });
  const navigate = (next: "menu" | "game") => {
    try { window.sessionStorage.setItem("delulu-last-view", next); } catch { /* optional convenience only */ }
    setView(next);
  };
  const updateBanner = update.updateAvailable ? <UpdateBanner updating={update.updating} onUpdate={() => update.applyUpdate(g.quickSave)} /> : null;

  if (!g.ready) {
    return (
<div className={update.updateAvailable ? "has-update-banner" : ""}>
        <div className="relative min-h-screen bg-dusk flex items-center justify-center">
          <div className="stars" />
          <p className="relative z-10 font-display font-bold text-2xl text-dim animate-pulse">Delulu Life is waking up…</p>
        </div>
        {updateBanner}
      </div>
    );
  }

  if (view === "game" && g.state) {
    return <div className={update.updateAvailable ? "has-update-banner" : ""}><Game g={g} onMenu={() => navigate("menu")} />{updateBanner}</div>;
  }
  return <div className={update.updateAvailable ? "has-update-banner" : ""}><Menu g={g} onPlay={() => navigate("game")} />{updateBanner}</div>;
}
