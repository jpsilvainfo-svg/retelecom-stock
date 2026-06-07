import React, { useState } from "react";
import { C } from "../../utils/colors.js";
import { APP_VERSION_LABEL, DIAGNOSTIC_MODULES } from "../../utils/constants.js";
import { Bdg, Btn, Card, THead, TRow } from "../../components/ui.jsx";
import { checkDataModules, runSystemChecks, syncModuleToCloud } from "./SystemCheck.js";

export default function Diagnostico({ currentUser, isMobile }) {
  const isRoot = currentUser?.login === "root";
  const [checking, setChecking] = useState(false);
  const [syncingKey, setSyncingKey] = useState("");
  const [checks, setChecks] = useState([]);
  const [modules, setModules] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [lastCheck, setLastCheck] = useState("");
  const [log, setLog] = useState([]);

  if (!isRoot) {
    return <div style={{ padding: 40, textAlign: "center", color: C.red, fontSize: 15, fontWeight: 700 }}>🔒 Acesso restrito ao usuário Root.</div>;
  }

  const runAll = async () => {
    setChecking(true);
    const result = await runSystemChecks();
    const moduleRows = await checkDataModules();
    setChecks(result.checks);
    setSystemInfo(result.systemInfo);
    setModules(moduleRows);
    setLastCheck(new Date().toLocaleString("pt-BR"));
    setChecking(false);
  };

  const syncOne = async (mod) => {
    setSyncingKey(mod.key);
    try {
      const result = await syncModuleToCloud(mod);
      setLog((prev) => [{ id: Date.now(), module: mod.label, ok: Boolean(result.ok), detail: result.error || result.detail || "Sincronizado", ts: new Date().toLocaleTimeString("pt-BR") }, ...prev]);
      setModules(await checkDataModules());
    } catch (error) {
      setLog((prev) => [{ id: Date.now(), module: mod.label, ok: false, detail: error.message, ts: new Date().toLocaleTimeString("pt-BR") }, ...prev]);
    } finally {
      setSyncingKey("");
    }
  };

  const syncAll = async () => {
    for (const mod of DIAGNOSTIC_MODULES) {
      await syncOne(mod);
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ checks, modules, systemInfo, log, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stocktel-diagnostico-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const okCount = checks.filter((c) => c.ok).length;
  const moduleErrors = modules.filter((m) => m.status === "erro").length;
  const moduleStale = modules.filter((m) => m.status === "desatualizado").length;

  const statusColor = { ok: C.grn, desatualizado: C.ylw, sem_dados: C.muted, erro: C.red };
  const statusLabel = { ok: "Sincronizado", desatualizado: "Desatualizado", sem_dados: "Sem dados remoto", erro: "Erro" };

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: isMobile ? 17 : 22, fontWeight: 800, color: C.txt }}>🛡️ Diagnóstico do Sistema</h1>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Root only · {APP_VERSION_LABEL}{lastCheck ? ` · Última verificação: ${lastCheck}` : ""}</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn color="gold" onClick={runAll} disabled={checking}>{checking ? "Verificando..." : "Verificar tudo"}</Btn>
        <Btn color="grn" outline onClick={syncAll} disabled={checking || Boolean(syncingKey)}>Forçar sync</Btn>
        <Btn color="ghost" outline onClick={exportJSON} disabled={!checks.length && !modules.length}>Exportar JSON</Btn>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
      <Card style={{ padding: 14 }}><div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>CHECKS OK</div><div style={{ fontSize: 24, fontWeight: 800, color: C.grn }}>{okCount}/{checks.length || 0}</div></Card>
      <Card style={{ padding: 14 }}><div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>MÓDULOS</div><div style={{ fontSize: 24, fontWeight: 800, color: C.gold }}>{modules.length || DIAGNOSTIC_MODULES.length}</div></Card>
      <Card style={{ padding: 14 }}><div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>DESATUALIZADOS</div><div style={{ fontSize: 24, fontWeight: 800, color: moduleStale ? C.ylw : C.grn }}>{moduleStale}</div></Card>
      <Card style={{ padding: 14 }}><div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>ERROS</div><div style={{ fontSize: 24, fontWeight: 800, color: moduleErrors ? C.red : C.grn }}>{moduleErrors}</div></Card>
    </div>

    {checks.length > 0 && <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", background: C.surf, borderBottom: `1px solid ${C.bdr}`, fontSize: 12, fontWeight: 800, color: C.gold }}>Checks de ambiente</div>
      {checks.map((check) => <div key={check.key} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.bdr}18`, display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div><div style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>{check.label}</div><div style={{ fontSize: 11, color: C.muted }}>{check.detail}</div></div>
        <Bdg color={check.ok ? "grn" : "red"}>{check.ok ? "OK" : "Falha"}</Bdg>
      </div>)}
    </Card>}

    {modules.length > 0 && <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><THead cols={["Módulo", "Local", "Remoto", "Status", "Ação"]} /></thead>
          <tbody>{modules.map((mod) => <TRow key={mod.key} cells={[
            <span style={{ fontWeight: 700, color: C.txt }}>{mod.icon} {mod.label}</span>,
            <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.gold }}>{mod.localCount}</span>,
            <span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.blue }}>{mod.remoteCount}</span>,
            <span style={{ color: statusColor[mod.status] || C.muted, fontWeight: 700 }}>{statusLabel[mod.status] || mod.status}</span>,
            <Btn size="xs" color="ghost" outline onClick={() => syncOne(mod)} disabled={Boolean(syncingKey)}>{syncingKey === mod.key ? "..." : "Sync"}</Btn>,
          ]} />)}</tbody>
        </table>
      </div>
    </Card>}

    {systemInfo && <Card style={{ padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, marginBottom: 8 }}>Ambiente</div>
      <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 11, color: C.muted }}>{JSON.stringify(systemInfo, null, 2)}</pre>
    </Card>}

    {log.length > 0 && <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", background: C.surf, borderBottom: `1px solid ${C.bdr}`, fontSize: 12, fontWeight: 800, color: C.gold }}>Log de sincronização</div>
      {log.slice(0, 20).map((item) => <div key={item.id} style={{ padding: "8px 16px", borderBottom: `1px solid ${C.bdr}18`, display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12, color: C.txt }}>{item.module} · {item.detail}</span>
        <span style={{ fontSize: 11, color: item.ok ? C.grn : C.red }}>{item.ts}</span>
      </div>)}
    </Card>}
  </div>;
}
