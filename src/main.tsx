import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App";

const atualizar = registerSW({
  immediate: true,
  onNeedRefresh() { (window as unknown as { __atualizarApp?: () => void }).__atualizarApp = () => void atualizar(true); window.dispatchEvent(new Event("dsa-nova-versao")); },
});

window.__dsa_ok = false;
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
