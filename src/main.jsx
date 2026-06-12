import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// App cloud-only: SEM cache offline no navegador. Desregistra qualquer service
// worker que tenha sobrado de versões anteriores e limpa os caches, para
// garantir que os clientes sempre falem direto com o servidor.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(regs => regs.forEach(reg => reg.unregister()))
    .catch(() => {});
}
if (window.caches?.keys) {
  caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
