// src/components/layout/TopBar.jsx
import React, { useState, useEffect } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../../lib/constants";
import { Btn, Bdg } from "../ui";
import { queueSize, queueGet, queueRemove } from "../../hooks/useLS";
import { sbSet } from "../../supabase";

const today = () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) + " - " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// ── Indicador de sincronização ───────────────────────────────────────────
function SyncIndicator({ isMobile, setPage, isAdmin }) {
  const [pending, setPending] = useState(() => queueSize());
  const [status, setStatus] = useState("ok"); // ok | syncing | error
  const [lastError, setLastError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  // Escuta eventos de sync
  useEffect(() => {
    const onOk = () => { setPending(queueSize()); setStatus("ok"); };
    const onFail = (e) => { setPending(queueSize()); setStatus("error"); setLastError(e.detail?.error); };
    const onChange = () => setPending(queueSize());
    window.addEventListener("sync-ok", onOk);
    window.addEventListener("sync-fail", onFail);
    window.addEventListener("sync-queue-change", onChange);
    return () => {
      window.removeEventListener("sync-ok", onOk);
      window.removeEventListener("sync-fail", onFail);
      window.removeEventListener("sync-queue-change", onChange);
    };
  }, []);

  // Retry automático a cada 30s se houver pendentes
  useEffect(() => {
    const interval = setInterval(async () => {
      const q = queueGet();
      const keys = Object.keys(q);
      if (keys.length === 0) return;
      setStatus("syncing");
      let anyFail = false;
      for (const key of keys) {
        const res = await sbSet(key, q[key].value);
        if (res.ok) {
          localStorage.setItem(key + "__ts", new Date().toISOString());
          queueRemove(key);
        } else {
          anyFail = true;
        }
      }
      setPending(queueSize());
      setStatus(anyFail ? "error" : "ok");
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Retry manual
  const retryNow = async () => {
    setRetrying(true);
    setStatus("syncing");
    const q = queueGet();
    const keys = Object.keys(q);
    let anyFail = false;
    for (const key of keys) {
      const res = await sbSet(key, q[key].value);
      if (res.ok) {
        localStorage.setItem(key + "__ts", new Date().toISOString());
        queueRemove(key);
      } else { anyFail = true; }
    }
    setPending(queueSize());
    setStatus(anyFail ? "error" : "ok");
    setRetrying(false);
  };

  if (pending === 0 && status === "ok") {
    return (
      <div title="Sincronizado com a nuvem" style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: `${C.grn}15`, border: `1px solid ${C.grn}30` }}>
        <span style={{ fontSize: 11 }}>☁️</span>
        {!isMobile && <span style={{ fontSize: 10, color: C.grn, fontWeight: 600 }}>Sincronizado</span>}
      </div>
    );
  }

  if (status === "syncing") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: `${C.blue}15`, border: `1px solid ${C.blue}30` }}>
        <span style={{ fontSize: 11, animation: "spin 1s linear infinite" }}>⏳</span>
        {!isMobile && <span style={{ fontSize: 10, color: C.blue, fontWeight: 600 }}>Sincronizando...</span>}
      </div>
    );
  }

  // Tem pendentes ou erro
  return (
    <div
      onClick={retryNow}
      title={lastError ? `Erro: ${lastError}` : `${pending} item(s) aguardando sync — clique para tentar agora`}
      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: `${C.ylw}15`, border: `1px solid ${C.ylw}44`, cursor: "pointer" }}
    >
      <span style={{ fontSize: 11 }}>{retrying ? "⏳" : "⚠️"}</span>
      {!isMobile && (
        <span style={{ fontSize: 10, color: C.ylw, fontWeight: 600 }}>
          {retrying ? "Tentando..." : `${pending} pendente${pending > 1 ? "s" : ""} — Tentar`}
        </span>
      )}
      {isMobile && <span style={{ fontSize: 10, color: C.ylw, fontWeight: 700 }}>{pending}</span>}
    </div>
  );
}

function TopBar({ user, pendRet, pendSol, setPage, isMobile, onMenuOpen }) {
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  return (
    <div style={{ height: isMobile ? 52 : 56, background: C.surf, borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", padding: isMobile ? "0 14px" : "0 24px", gap: 10, flexShrink: 0 }}>
      {isMobile && <button onClick={onMenuOpen} style={{ background: "transparent", color: C.muted, fontSize: 22, display: "flex", alignItems: "center", padding: 4 }}>☰</button>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Olá, <span style={{ color: C.gold }}>{user.name.split(" ")[0]}</span>
        </div>
        {!isMobile && <div style={{ fontSize: 11, color: C.muted }}>{today()}</div>}
      </div>

      <SyncIndicator isMobile={isMobile} setPage={setPage} isAdmin={isAdmin} />

      {pendSol > 0 && <div onClick={() => setPage("sol")} style={{ display: "flex", alignItems: "center", gap: 5, background: `${C.blue}22`, border: `1px solid ${C.blue}44`, borderRadius: 6, padding: isMobile ? "5px 8px" : "5px 12px", cursor: "pointer", flexShrink: 0 }}>
        <span style={{ fontSize: 13 }}>📋</span>
        <span style={{ fontSize: 12, color: C.blue, fontWeight: 700 }}>{pendSol}</span>
        {!isMobile && <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>solicitação{pendSol > 1 ? "ões" : ""}</span>}
      </div>}
      {pendRet > 0 && <div onClick={() => setPage("dev")} style={{ display: "flex", alignItems: "center", gap: 5, background: C.ylwD, border: `1px solid ${C.ylw}44`, borderRadius: 6, padding: isMobile ? "5px 8px" : "5px 12px", cursor: "pointer", flexShrink: 0 }}>
        <span style={{ fontSize: 13 }}>🔔</span>
        {!isMobile && <span style={{ fontSize: 12, color: C.ylw, fontWeight: 600 }}>{pendRet} devolução{pendRet > 1 ? "ões" : ""}</span>}
        {isMobile && <span style={{ fontSize: 12, color: C.ylw, fontWeight: 700 }}>{pendRet}</span>}
      </div>}
      {!isMobile && <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.card, border: `1px solid ${C.bdr2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer" }}>🔔</div>}
    </div>
  );
}

export default TopBar;
