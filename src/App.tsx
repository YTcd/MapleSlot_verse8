import { GameServerProvider, useGameServer } from "@agent8/gameserver";
import GameComponent from "./components/GameComponent";
import "./App.css";

function AppContent() {
  useGameServer();
  return <GameComponent />;
}

function App() {
  return (
    <GameServerProvider>
      <div className="app">
        <AppContent />
      </div>
    </GameServerProvider>
  );
}

export default App;
