import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Registra o Service Worker para habilitar PWA, cache offline e instalacao.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(registration => {
        console.log("[PWA] Service Worker registrado:", registration.scope);
        registration.update?.();
      })
      .catch(error => console.warn("[PWA] Service Worker falhou:", error));
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.info("[PWA] Nova versao ativa. Atualize a pagina quando for conveniente.");
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
