import { useState } from "react";
import { useGame } from "./game/state";
import { Menu } from "./components/Menu";
import { Game } from "./components/Game";

export default function App() {
  const g = useGame();
  const [view, setView] = useState<"menu" | "game">(() => (g.state ? "game" : "menu"));

  if (view === "game" && g.state) {
    return <Game g={g} onMenu={() => setView("menu")} />;
  }
  return <Menu g={g} onPlay={() => setView("game")} />;
}
