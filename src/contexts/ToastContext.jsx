// src/contexts/ToastContext.jsx
import React, { createContext, useState, useCallback } from "react";

export const ToastContext = createContext({ showToast: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, type = "info") => {
    const id = crypto.randomUUID();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const themes = {
    success: { bg: "#1a3a1a", border: "#2e7d32", color: "#4caf50", icon: "✅" },
    error:   { bg: "#3a1a1a", border: "#cc0000", color: "#ef5350", icon: "❌" },
    warning: { bg: "#3a2a00", border: "#f0a500", color: "#ffc107", icon: "⚠️" },
    info:    { bg: "#1a2a3a", border: "#f0a500", color: "#f0a500", icon: "ℹ️" },
  };
  const th = themes[toast.type] || themes.info;
  return (
    <div style={{ background: th.bg, border: `1px solid ${th.border}`, borderRadius: 10,
      padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 4px 24px #00000088", maxWidth: 380, minWidth: 280,
      animation: "slideLeft 0.3s ease" }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{th.icon}</span>
      <span style={{ fontSize: 13, color: th.color, flex: 1, fontWeight: 500, lineHeight: 1.4 }}>{toast.msg}</span>
      <button onClick={onClose} style={{ background: "transparent", color: th.color, border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, opacity: 0.7 }}>✕</button>
    </div>
  );
}
