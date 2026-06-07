import React, { useState } from "react";
import { C } from "../../utils/colors.js";
import { ALL_MODULES } from "../../utils/constants.js";
import { Btn, Card, Inp, Sel } from "../../components/ui.jsx";
import { applyRuntimeSettings, applyTheme, exportSettings, getDefaultTheme, getThemes, importSettings, resetToDefault } from "./CustomizeSettings.js";

export default function Customize({ currentUser, isMobile, customization, setCustomization }) {
  const isRoot = currentUser?.login === "root";
  const [draft, setDraft] = useState(() => ({ ...getDefaultTheme(), ...customization }));
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("marca");

  if (!isRoot) {
    return <div style={{ padding: 40, textAlign: "center", color: C.red, fontSize: 15, fontWeight: 700 }}>🔒 Acesso restrito ao usuário Root.</div>;
  }

  const update = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const save = () => {
    setCustomization(draft);
    applyRuntimeSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  const reset = () => {
    const next = resetToDefault();
    setDraft(next);
    setCustomization(next);
    applyRuntimeSettings(next);
  };
  const selectTheme = (themeKey) => setDraft((prev) => applyTheme(prev, themeKey));

  const handleLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { alert("Logo muito grande. Use imagens menores que 500KB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => update("logoUrl", ev.target.result);
    reader.readAsDataURL(file);
  };

  const downloadJSON = () => {
    const blob = new Blob([exportSettings(draft)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stocktel-customization.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadJSON = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { setDraft(importSettings(ev.target.result)); }
      catch { alert("Arquivo inválido. Use JSON exportado pelo StockTel."); }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const moveMenu = (key, dir) => {
    const order = [...(draft.menuOrder || ALL_MODULES.map((m) => m.k))];
    const index = order.indexOf(key);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    update("menuOrder", order);
  };

  const toggleHidden = (key) => {
    const hidden = [...(draft.menuHidden || [])];
    update("menuHidden", hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key]);
  };

  const modules = (draft.menuOrder || ALL_MODULES.map((m) => m.k)).map((key) => ALL_MODULES.find((m) => m.k === key)).filter(Boolean);
  const previewAccent = draft.accentColor || "#d10000";

  const tabs = [
    { key: "marca", label: "Marca" },
    { key: "menu", label: "Menu" },
    { key: "tema", label: "Tema" },
    { key: "telegram", label: "Telegram" },
  ];

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: isMobile ? 17 : 22, color: C.txt, fontWeight: 800 }}>🎨 Personalizar Sistema</h1>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Root only · marca, menu, tema e Telegram.</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 7, border: `1px solid ${C.bdr}`, color: C.txt, background: C.surf, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          Importar
          <input type="file" accept=".json" onChange={uploadJSON} style={{ display: "none" }} />
        </label>
        <Btn size="sm" color="ghost" outline onClick={downloadJSON}>Exportar</Btn>
        <Btn size="sm" color="ghost" outline onClick={reset}>Reset</Btn>
        <Btn size="sm" color={saved ? "grn" : "gold"} onClick={save}>{saved ? "Salvo" : "Salvar"}</Btn>
      </div>
    </div>

    <div style={{ display: "flex", borderBottom: `1px solid ${C.bdr}`, gap: 2, overflowX: "auto" }}>
      {tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} style={{ padding: "9px 16px", background: "transparent", color: tab === item.key ? previewAccent : C.muted, borderBottom: `2px solid ${tab === item.key ? previewAccent : "transparent"}`, fontWeight: 800, fontSize: 13 }}>{item.label}</button>)}
    </div>

    {tab === "marca" && <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 12 }}>
      <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <Inp label="Nome da empresa" value={draft.companyName || ""} onChange={(v) => update("companyName", v)} />
        <Inp label="Slogan" value={draft.companySlogan || ""} onChange={(v) => update("companySlogan", v)} />
        <label style={{ padding: 14, borderRadius: 10, border: `2px dashed ${previewAccent}55`, color: previewAccent, fontWeight: 800, cursor: "pointer" }}>
          Carregar logomarca
          <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
        </label>
        {draft.logoUrl && <Btn color="red" outline onClick={() => update("logoUrl", null)}>Remover logo</Btn>}
      </Card>
      <Card style={{ padding: 18, textAlign: "center" }}>
        <div style={{ minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", background: draft.sidebarBg, borderRadius: 8, marginBottom: 12 }}>
          {draft.logoUrl ? <img src={draft.logoUrl} alt="Logo" style={{ maxWidth: "90%", maxHeight: 80, objectFit: "contain" }} /> : <span style={{ color: previewAccent, fontSize: 24, fontWeight: 900 }}>{draft.companyName}</span>}
        </div>
        <div style={{ color: C.txt, fontWeight: 800 }}>{draft.companyName}</div>
        <div style={{ color: C.muted, fontSize: 12 }}>{draft.companySlogan}</div>
      </Card>
    </div>}

    {tab === "menu" && <Card style={{ padding: 0, overflow: "hidden" }}>
      {modules.map((mod, index) => {
        const hidden = (draft.menuHidden || []).includes(mod.k);
        return <div key={mod.k} style={{ display: "grid", gridTemplateColumns: "44px 1fr auto auto", gap: 8, alignItems: "center", padding: "9px 12px", borderBottom: `1px solid ${C.bdr}18`, opacity: hidden ? 0.45 : 1 }}>
          <input value={draft.menuIcons?.[mod.k] || mod.icon} onChange={(e) => update("menuIcons", { ...(draft.menuIcons || {}), [mod.k]: e.target.value })} style={{ width: 36, textAlign: "center", background: C.surf, color: C.txt, border: `1px solid ${C.bdr}`, borderRadius: 6, padding: 5 }} />
          <input value={draft.menuLabels?.[mod.k] || mod.l} onChange={(e) => update("menuLabels", { ...(draft.menuLabels || {}), [mod.k]: e.target.value })} style={{ background: C.surf, color: C.txt, border: `1px solid ${C.bdr}`, borderRadius: 6, padding: "7px 10px" }} />
          <button onClick={() => toggleHidden(mod.k)} style={{ color: hidden ? C.red : C.grn, background: C.surf, border: `1px solid ${C.bdr}`, borderRadius: 6, padding: "6px 8px" }}>{hidden ? "Oculto" : "Visível"}</button>
          <div style={{ display: "flex", gap: 3 }}>
            <button disabled={index === 0} onClick={() => moveMenu(mod.k, -1)} style={{ background: C.surf, color: C.muted, border: `1px solid ${C.bdr}`, borderRadius: 4, padding: "3px 6px" }}>▲</button>
            <button disabled={index === modules.length - 1} onClick={() => moveMenu(mod.k, 1)} style={{ background: C.surf, color: C.muted, border: `1px solid ${C.bdr}`, borderRadius: 4, padding: "3px 6px" }}>▼</button>
          </div>
        </div>;
      })}
    </Card>}

    {tab === "tema" && <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 12 }}>
      <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <Inp label="Cor de destaque" value={draft.accentColor || ""} onChange={(v) => update("accentColor", v)} type="color" />
        <Inp label="Fundo da sidebar" value={draft.sidebarBg || ""} onChange={(v) => update("sidebarBg", v)} type="color" />
        <Sel label="Tamanho de fonte" value={draft.fontSize || "medium"} onChange={(v) => update("fontSize", v)} options={[{ value: "small", label: "Pequeno" }, { value: "medium", label: "Médio" }, { value: "large", label: "Grande" }]} />
      </Card>
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 800, marginBottom: 10 }}>Temas rápidos</div>
        <div style={{ display: "grid", gap: 8 }}>
          {getThemes().map((theme) => <button key={theme.key} onClick={() => selectTheme(theme.key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surf, color: C.txt, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: 10 }}>
            <span>{theme.label}</span><span style={{ display: "inline-flex", gap: 5 }}><i style={{ width: 16, height: 16, borderRadius: 4, background: theme.accentColor }} /><i style={{ width: 16, height: 16, borderRadius: 4, background: theme.sidebarBg, border: `1px solid ${C.bdr}` }} /></span>
          </button>)}
        </div>
      </Card>
    </div>}

    {tab === "telegram" && <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div><div style={{ color: C.txt, fontWeight: 800 }}>Notificações Telegram</div><div style={{ color: C.muted, fontSize: 12 }}>Configuração visual do bot operacional.</div></div>
        <button onClick={() => update("telegram", { ...(draft.telegram || {}), ativo: !draft.telegram?.ativo })} style={{ padding: "7px 12px", borderRadius: 8, background: draft.telegram?.ativo ? C.grn : C.surf, color: draft.telegram?.ativo ? "#000" : C.muted, fontWeight: 800 }}>{draft.telegram?.ativo ? "Ativo" : "Inativo"}</button>
      </div>
      <Inp label="Token do bot" value={draft.telegram?.token || ""} onChange={(v) => update("telegram", { ...(draft.telegram || {}), token: v })} />
      <Inp label="Chat ID principal" value={draft.telegram?.chat_id || ""} onChange={(v) => update("telegram", { ...(draft.telegram || {}), chat_id: v })} />
      <Btn color="blue" outline onClick={async () => {
        if (!draft.telegram?.token || !draft.telegram?.chat_id) { alert("Preencha token e chat ID."); return; }
        const response = await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: draft.telegram.token, chat_id: draft.telegram.chat_id, message: "StockTel Bot - teste de personalizacao OK" }) });
        const result = await response.json();
        alert(result.ok ? "Mensagem enviada." : "Falha ao enviar.");
      }}>Testar bot</Btn>
    </Card>}
  </div>;
}
