import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initChunkRecovery, markAppBooted } from "./lib/chunkRecovery";

// Registra os handlers de falha de chunk ANTES de montar o React.
initChunkRecovery();

createRoot(document.getElementById("root")!).render(<App />);

// App montou: libera a flag anti-loop para futuras recuperações.
markAppBooted();
