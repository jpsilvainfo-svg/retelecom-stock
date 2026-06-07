import React, { useState } from "react";
import { C } from "../../utils/colors.js";
import { fmt } from "../../utils/formatters.js";
import { Card, Sel, THead, TRow } from "../../components/ui.jsx";

export default function KitPage({ tstock, stock, users, currentUser, isMobile }) {
  const isTec = currentUser.role === "tecnico";
  const techs = users.filter((user) => user.role === "tecnico");
  const [selTech, setSelTech] = useState(techs[0]?.id || "");
  const viewId = isTec ? currentUser.id : selTech;
  const items = tstock.filter((item) => item.uid === viewId);
  const tech = users.find((user) => user.id === viewId);
  const total = items.reduce((sum, item) => sum + item.qty, 0);

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
      <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: C.txt }}>{isTec ? "Meu Estoque" : "Estoque Técnico"}</h1>
      {!isTec && <Sel value={selTech} onChange={setSelTech} options={techs.map((user) => ({ value: user.id, label: user.name }))} style={{ width: isMobile ? "100%" : 220 }} />}
    </div>
    {tech && <Card style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ color: C.txt, fontWeight: 800 }}>{tech.name}</div><div style={{ color: C.muted, fontSize: 12 }}>{tech.email}</div></div><div style={{ textAlign: "right" }}><div style={{ color: C.muted, fontSize: 10 }}>Total em posse</div><div style={{ color: C.gold, fontSize: 22, fontWeight: 900 }}>{fmt(total)}</div></div></Card>}
    {isMobile ? <div style={{ display: "grid", gap: 8 }}>{items.length === 0 ? <Card style={{ padding: 30, textAlign: "center", color: C.muted }}>Nenhum material em posse.</Card> : items.map((item) => { const material = stock.find((row) => row.id === item.sid); return material ? <Card key={item.id} style={{ padding: 14, display: "flex", justifyContent: "space-between" }}><div><div style={{ color: C.txt, fontWeight: 700 }}>{material.name}</div><div style={{ color: C.muted, fontSize: 11 }}>{material.code} · {material.unit}</div></div><div style={{ color: C.gold, fontWeight: 900, fontSize: 22 }}>{fmt(item.qty)}</div></Card> : null; })}</div> : <Card style={{ padding: 0, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><THead cols={["Código", "Material", "Categoria", "Unidade", "Qtd em posse"]} /></thead><tbody>{items.length === 0 ? <tr><td colSpan={5} style={{ padding: 30, textAlign: "center", color: C.muted }}>Nenhum material em posse.</td></tr> : items.map((item) => { const material = stock.find((row) => row.id === item.sid); return material ? <TRow key={item.id} cells={[material.code, material.name, material.cat, material.unit, <strong style={{ color: C.gold }}>{fmt(item.qty)}</strong>]} /> : null; })}</tbody></table></Card>}
  </div>;
}
