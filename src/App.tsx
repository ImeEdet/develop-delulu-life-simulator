import { useState } from "react";
import { useGame } from "./game/state";
import { Menu } from "./components/Menu";
import { Game } from "./components/Game";

export default function App() {
  const g = useGame();
  const [view, setView] = useState<"menu" | "game">(() => (g.state ? "game" : "menu"));

  if (!g.ready) {
    return (
      <div className="relative min-h-screen bg-dusk flex items-center justify-center">
        <div className="stars" />
        <p className="relative z-10 font-display font-bold text-2xl text-dim animate-pulse">Delulu Life is waking up…</p>
      </div>
    );
  }

  if (view === "game" && g.state) {
    return <Game g={g} onMenu={() => setView("menu")} />;
  }
  return <Menu g={g} onPlay={() => setView("game")} />;
}
