import React, { useState } from "react";
import { C } from "../../utils/colors.js";
import { fmt, now, uid } from "../../utils/formatters.js";
import { Btn, Card, Inp } from "../../components/ui.jsx";
import ItemList from "../operacional/ItemList.jsx";

export default function NFPage({ nf, setNf, stock, setStock, addLog, currentUser, isMobile }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ num: "", supplier: "", date: "", obs: "" });
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const validItems = items.filter((item) => item.sid && parseInt(item.qty) > 0);
  const total = validItems.reduce((sum, item) => sum + (parseFloat(item.val) || 0), 0);
  const blank = () => ({ id: uid(), sid: "", qty: "", val: "" });

  const save = () => {
    if (!form.num.trim() || !form.supplier.trim()) { setErr("Informe número e fornecedor."); return; }
    if (!validItems.length) { setErr("Adicione ao menos 1 item."); return; }
    const payload = { id: uid(), num: form.num.trim(), supplier: form.supplier.trim(), date: form.date, obs: form.obs, items: validItems.map((item) => ({ sid: item.sid, qty: parseInt(item.qty), val: parseFloat(item.val) || 0 })), total, registeredBy: currentUser.name, registeredAt: now() };
    setNf((prev) => [payload, ...prev]);
    setStock((prev) => prev.map((material) => {
      const item = validItems.find((row) => row.sid === material.id);
      return item ? { ...material, qty: material.qty + parseInt(item.qty) } : material;
    }));
    addLog(currentUser.name, "Entrada", `NF: ${form.num.trim()} · ${form.supplier.trim()} · ${validItems.length} item(s)`);
    setModal(false); setForm({ num: "", supplier: "", date: "", obs: "" }); setItems([]); setErr("");
  };

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: C.txt }}>Entrada de Materiais</h1><p style={{ fontSize: 12, color: C.muted }}>Notas fiscais com entrada automática no estoque</p></div><Btn color="gold" onClick={() => setModal(true)}>+ Nova NF</Btn></div>
    {nf.length === 0 && <Card style={{ padding: 30, textAlign: "center", color: C.muted }}>Nenhuma nota fiscal registrada.</Card>}
    {nf.map((note) => <Card key={note.id} style={{ padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><strong style={{ color: C.gold }}>{note.num}</strong> <span style={{ color: C.txt }}>{note.supplier}</span><div style={{ fontSize: 11, color: C.muted }}>{note.date} · {note.registeredBy}</div></div><div style={{ color: C.grn, fontWeight: 900 }}>R$ {fmt(note.total)}</div></div><div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 6, marginTop: 10 }}>{note.items.map((item, index) => { const material = stock.find((row) => row.id === item.sid); return <div key={index} style={{ background: C.surf, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.bdr}` }}><div style={{ color: C.txt, fontWeight: 700, fontSize: 12 }}>{material?.name || item.sid}</div><div style={{ color: C.grn, fontWeight: 800 }}>+{fmt(item.qty)}</div></div>; })}</div></Card>)}
    {modal && <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.bdr2}`, borderRadius: isMobile ? "16px 16px 0 0" : 12, width: "100%", maxWidth: 640, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><h2 style={{ color: C.txt, fontSize: 15 }}>Nova Nota Fiscal</h2><button onClick={() => setModal(false)} style={{ background: C.surf, color: C.muted, width: 32, height: 32, borderRadius: 8 }}>x</button></div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}><Inp label="Número" value={form.num} onChange={(value) => setForm((prev) => ({ ...prev, num: value }))} /><Inp label="Fornecedor" value={form.supplier} onChange={(value) => setForm((prev) => ({ ...prev, supplier: value }))} /></div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginTop: 10 }}><Inp label="Data" value={form.date} onChange={(value) => setForm((prev) => ({ ...prev, date: value }))} type="date" /><Inp label="Observação" value={form.obs} onChange={(value) => setForm((prev) => ({ ...prev, obs: value }))} /></div>
        <div style={{ marginTop: 12 }}><ItemList items={items} onAdd={() => setItems((prev) => [...prev, blank()])} onUpdate={(id, key, value) => setItems((prev) => prev.map((row) => row.id === id ? { ...row, [key]: value } : row))} onRemove={(id) => setItems((prev) => prev.filter((row) => row.id !== id))} stockOptions={stock} isMobile={isMobile} label="Itens da nota" showVal /></div>
        {err && <div style={{ marginTop: 10, color: C.red, background: C.redD, border: `1px solid ${C.red}44`, borderRadius: 8, padding: 10 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}><strong style={{ color: C.grn }}>R$ {fmt(total)}</strong><div style={{ display: "flex", gap: 10 }}><Btn color="ghost" outline onClick={() => setModal(false)}>Cancelar</Btn><Btn color="gold" onClick={save}>Registrar</Btn></div></div>
      </div>
    </div>}
  </div>;
}
