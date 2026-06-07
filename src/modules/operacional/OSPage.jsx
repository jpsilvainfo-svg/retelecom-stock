import React, { useState } from "react";
import { C } from "../../utils/colors.js";
import { fmt, now, uid } from "../../utils/formatters.js";
import { Bdg, Btn, Card, Inp } from "../../components/ui.jsx";
import ItemList from "./ItemList.jsx";

export default function OSPage({ os, setOs, tstock, setTstock, stock, users, currentUser, addLog, isMobile }) {
  const isTec = currentUser.role === "tecnico";
  const [modal, setModal] = useState(false);
  const [osNum, setOsNum] = useState("");
  const [client, setClient] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const myTstock = tstock.filter((item) => item.uid === currentUser.id);
  const viewOs = isTec ? os.filter((order) => order.uid === currentUser.id) : os;
  const validItems = items.filter((item) => item.sid && parseInt(item.qty) > 0);
  const stockOptions = myTstock.map((item) => {
    const material = stock.find((s) => s.id === item.sid);
    return material ? { ...material, qty: item.qty } : null;
  }).filter(Boolean);
  const blank = () => ({ id: uid(), sid: "", qty: "" });
  const updateItem = (id, key, value) => setItems((prev) => prev.map((row) => row.id === id ? { ...row, [key]: value } : row));

  const save = () => {
    if (!osNum.trim() || !client.trim()) { setErr("Informe OS e cliente."); return; }
    if (!validItems.length) { setErr("Adicione ao menos 1 material."); return; }
    const insufficient = validItems.find((row) => {
      const techStock = myTstock.find((item) => item.sid === row.sid);
      return !techStock || techStock.qty < parseInt(row.qty);
    });
    if (insufficient) { setErr(`Quantidade insuficiente: ${stock.find((s) => s.id === insufficient.sid)?.name || insufficient.sid}`); return; }
    setOs((prev) => [{ id: uid(), uid: currentUser.id, os: osNum.trim(), client: client.trim(), date: now(), items: validItems.map((row) => ({ sid: row.sid, qty: parseInt(row.qty) })), notes }, ...prev]);
    setTstock((prev) => prev.map((item) => {
      const used = validItems.find((row) => row.sid === item.sid && item.uid === currentUser.id);
      return used ? { ...item, qty: item.qty - parseInt(used.qty) } : item;
    }));
    addLog(currentUser.name, "Saída", `OS: ${osNum.trim()} · ${client.trim()}`);
    setModal(false); setErr(""); setOsNum(""); setClient(""); setNotes(""); setItems([]);
  };

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      <div><h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: C.txt }}>Ordens de Serviço</h1><p style={{ fontSize: 12, color: C.muted }}>Materiais utilizados por OS</p></div>
      {isTec && <Btn color="gold" size={isMobile ? "sm" : "md"} onClick={() => { setItems([]); setModal(true); }}>+ Nova OS</Btn>}
    </div>
    {viewOs.length === 0 && <Card style={{ padding: 30, textAlign: "center", color: C.muted }}>Nenhuma OS registrada.</Card>}
    {viewOs.map((order) => {
      const tech = users.find((user) => user.id === order.uid);
      return <Card key={order.id} style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div><span style={{ fontFamily: "'JetBrains Mono',monospace", color: C.gold, fontWeight: 800 }}>{order.os}</span> <strong style={{ color: C.txt }}>{order.client}</strong>{!isTec && <span style={{ color: C.muted }}> · {tech?.name || "?"}</span>}<div style={{ fontSize: 11, color: C.muted }}>{order.date}</div></div>
          <Bdg color="grn">Concluída</Bdg>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 6 }}>
          {order.items.map((item, index) => {
            const material = stock.find((s) => s.id === item.sid);
            return <div key={index} style={{ background: C.surf, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.bdr}` }}>
              <div style={{ fontSize: 11, color: C.muted }}>{material?.code || "--"}</div>
              <div style={{ fontSize: 12, color: C.txt, fontWeight: 700 }}>{material?.name || item.sid}</div>
              <div style={{ color: C.gold, fontWeight: 800 }}>{fmt(item.qty)}</div>
            </div>;
          })}
        </div>
      </Card>;
    })}
    {modal && <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.bdr2}`, borderRadius: isMobile ? "16px 16px 0 0" : 12, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><h2 style={{ color: C.txt, fontSize: 15 }}>Nova OS</h2><button onClick={() => setModal(false)} style={{ background: C.surf, color: C.muted, width: 32, height: 32, borderRadius: 8 }}>x</button></div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}><Inp label="Nº OS" value={osNum} onChange={setOsNum} /><Inp label="Cliente" value={client} onChange={setClient} /></div>
        <div style={{ marginTop: 10 }}><Inp label="Observação" value={notes} onChange={setNotes} /></div>
        <div style={{ marginTop: 12 }}><ItemList items={items} onAdd={() => setItems((prev) => [...prev, blank()])} onUpdate={updateItem} onRemove={(id) => setItems((prev) => prev.filter((row) => row.id !== id))} stockOptions={stockOptions} isMobile={isMobile} label="Materiais utilizados" /></div>
        {err && <div style={{ marginTop: 10, color: C.red, background: C.redD, border: `1px solid ${C.red}44`, borderRadius: 8, padding: 10 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}><Btn color="ghost" outline onClick={() => setModal(false)}>Cancelar</Btn><Btn color="gold" onClick={save}>Confirmar</Btn></div>
      </div>
    </div>}
  </div>;
}
