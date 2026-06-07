import React, { useState } from "react";
import { C } from "../../utils/colors.js";
import { uid } from "../../utils/formatters.js";
import { Btn, Card, Sel } from "../../components/ui.jsx";
import ItemList from "../operacional/ItemList.jsx";

export default function DistPage({ stock, setStock, tstock, setTstock, users, addLog, currentUser, isMobile }) {
  const techs = users.filter((user) => user.role === "tecnico");
  const [techId, setTechId] = useState(techs[0]?.id || "");
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const validItems = items.filter((item) => item.sid && parseInt(item.qty) > 0);
  const blank = () => ({ id: uid(), sid: "", qty: "" });

  const send = () => {
    if (!validItems.length) { setMsg("err:Adicione ao menos 1 material."); return; }
    const insufficient = validItems.find((item) => {
      const material = stock.find((row) => row.id === item.sid);
      return !material || material.qty < parseInt(item.qty);
    });
    if (insufficient) { alert(`Estoque insuficiente: ${stock.find((row) => row.id === insufficient.sid)?.name || insufficient.sid}`); return; }
    setStock((prev) => prev.map((material) => {
      const item = validItems.find((row) => row.sid === material.id);
      return item ? { ...material, qty: material.qty - parseInt(item.qty) } : material;
    }));
    setTstock((prev) => {
      let next = [...prev];
      validItems.forEach((item) => {
        const existing = next.find((row) => row.uid === techId && row.sid === item.sid);
        if (existing) next = next.map((row) => row.id === existing.id ? { ...row, qty: row.qty + parseInt(item.qty) } : row);
        else next.push({ id: uid(), uid: techId, sid: item.sid, qty: parseInt(item.qty) });
      });
      return next;
    });
    const tech = users.find((user) => user.id === techId);
    addLog(currentUser.name, "Saída", `Liberação · ${tech?.name || "?"} · ${validItems.length} item(s)`);
    setMsg(`ok:Liberado para ${tech?.name || "técnico"}.`);
    setItems([]);
    setTimeout(() => setMsg(""), 3500);
  };

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: C.txt }}>Saída / Liberação de Materiais</h1>
    {msg && <div style={{ background: msg.startsWith("ok:") ? C.grnD : C.redD, border: `1px solid ${msg.startsWith("ok:") ? C.grn : C.red}44`, borderRadius: 8, padding: 12, color: msg.startsWith("ok:") ? C.grn : C.red }}>{msg.replace(/^(ok|err):/, "")}</div>}
    <Card style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <Sel label="Técnico destinatário" value={techId} onChange={setTechId} options={techs.map((user) => ({ value: user.id, label: user.name }))} />
      <ItemList items={items} onAdd={() => setItems((prev) => [...prev, blank()])} onUpdate={(id, key, value) => setItems((prev) => prev.map((row) => row.id === id ? { ...row, [key]: value } : row))} onRemove={(id) => setItems((prev) => prev.filter((row) => row.id !== id))} stockOptions={stock} isMobile={isMobile} label="Materiais a liberar" />
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn color="gold" onClick={send} disabled={validItems.length === 0}>Liberar materiais</Btn></div>
    </Card>
  </div>;
}
