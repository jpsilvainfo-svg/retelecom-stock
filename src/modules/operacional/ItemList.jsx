import React from "react";
import { C } from "../../utils/colors.js";

export default function ItemList({ items, onAdd, onUpdate, onRemove, stockOptions, isMobile, label, addLabel, showObs, showVal }) {
  const validCount = items.filter((row) => row.sid && parseInt(row.qty) > 0).length;
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 2 }}>
      {label} <span style={{ background: `${C.gold}22`, color: C.gold, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, marginLeft: 6 }}>{validCount} item(s)</span>
    </div>}
    {items.map((item, index) => {
      const selected = item.sid ? stockOptions.find((stock) => stock.id === item.sid) : null;
      return <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: item.sid ? `${C.gold}08` : C.surf, borderRadius: 10, padding: "10px 12px", border: `1px solid ${item.sid ? `${C.gold}44` : C.bdr2}` }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.gold, flexShrink: 0, marginTop: 2 }}>{index + 1}</div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <select value={item.sid} onChange={(event) => onUpdate(item.id, "sid", event.target.value)} style={{ width: "100%", background: C.card, border: `1px solid ${C.bdr2}`, borderRadius: 7, padding: "9px 10px", color: item.sid ? C.txt : C.muted, fontSize: 13 }}>
            <option value="">-- Selecionar material --</option>
            {stockOptions.map((stock) => <option key={stock.id} value={stock.id}>[{stock.code || "--"}] {stock.name} ({stock.qty} {stock.unit})</option>)}
          </select>
          {selected && <div style={{ fontSize: 10, color: C.grn }}>Disponivel: <strong>{selected.qty}</strong> {selected.unit}</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <input type="number" value={item.qty} onChange={(event) => onUpdate(item.id, "qty", event.target.value)} placeholder="Quantidade" min="0" style={{ width: isMobile ? "100%" : 110, background: C.card, border: `1px solid ${C.bdr2}`, borderRadius: 7, padding: "8px 10px", color: C.txt, fontSize: 14, fontWeight: 700, textAlign: "center", flex: isMobile ? 1 : "none" }} />
            {showVal && <input type="number" value={item.val || ""} onChange={(event) => onUpdate(item.id, "val", event.target.value)} placeholder="Valor R$" min="0" style={{ width: isMobile ? "100%" : 120, background: C.card, border: `1px solid ${C.bdr2}`, borderRadius: 7, padding: "8px 10px", color: C.txt, fontSize: 13, flex: isMobile ? 1 : "none" }} />}
            {showObs && <input type="text" value={item.obs || ""} onChange={(event) => onUpdate(item.id, "obs", event.target.value)} placeholder="Obs" style={{ flex: 1, background: C.card, border: `1px solid ${C.bdr2}`, borderRadius: 7, padding: "8px 10px", color: C.txt, fontSize: 13 }} />}
          </div>
        </div>
        <button onClick={() => onRemove(item.id)} style={{ background: C.redD, color: C.red, border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>x</button>
      </div>;
    })}
    <button onClick={onAdd} style={{ width: "100%", padding: 13, background: items.length === 0 ? `${C.gold}18` : "transparent", border: `2px dashed ${C.gold}`, borderRadius: 10, color: C.gold, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
      + {items.length === 0 ? (addLabel || "Adicionar primeiro material") : "Adicionar mais um material"}
    </button>
  </div>;
}
