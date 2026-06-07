import React, { useState } from "react";
import { C } from "../../utils/colors.js";
import { fmt, now, uid } from "../../utils/formatters.js";
import { Bdg, Btn, Card, Inp } from "../../components/ui.jsx";
import ItemList from "./ItemList.jsx";

export default function DevPage({ returns, setReturns, tstock, setTstock, stock, users, currentUser, addLog, isMobile }) {
  const isTec = currentUser.role === "tecnico";
  const [modal, setModal] = useState(false);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const myTstock = tstock.filter((item) => item.uid === currentUser.id);
  const viewReturns = isTec ? returns.filter((item) => item.uid === currentUser.id) : returns;
  const validItems = items.filter((item) => item.sid && parseInt(item.qty) > 0);
  const blank = () => ({ id: uid(), sid: "", qty: "" });
  const stockOptions = myTstock.map((item) => {
    const material = stock.find((s) => s.id === item.sid);
    return material ? { ...material, qty: item.qty } : null;
  }).filter(Boolean);

  const submit = () => {
    if (!validItems.length) return;
    setReturns((prev) => [{ id: uid(), uid: currentUser.id, date: now(), items: validItems.map((row) => ({ sid: row.sid, qty: parseInt(row.qty) })), status: "pending", notes, rDate: null, rBy: null }, ...prev]);
    addLog(currentUser.name, "Devolução Solicitada", `${currentUser.name} · ${validItems.length} item(s)`);
    setModal(false); setItems([]); setNotes("");
  };

  const approve = (request) => {
    setTstock((prev) => prev.map((item) => {
      const returned = request.items.find((row) => row.sid === item.sid && item.uid === request.uid);
      return returned ? { ...item, qty: Math.max(0, item.qty - returned.qty) } : item;
    }));
    setReturns((prev) => prev.map((item) => item.id === request.id ? { ...item, status: "approved", rDate: now(), rBy: currentUser.name } : item));
    addLog(currentUser.name, "Devolução Aprovada", `Técnico: ${users.find((user) => user.id === request.uid)?.name || "?"}`);
  };

  const reject = (request) => {
    setReturns((prev) => prev.map((item) => item.id === request.id ? { ...item, status: "rejected", rDate: now(), rBy: currentUser.name } : item));
    addLog(currentUser.name, "Devolução Rejeitada", `Técnico: ${users.find((user) => user.id === request.uid)?.name || "?"}`);
  };

  const color = { pending: "ylw", approved: "grn", rejected: "red" };
  const label = { pending: "Aguardando", approved: "Aprovada", rejected: "Rejeitada" };

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h1 style={{ fontSize: isMobile ? 17 : 20, color: C.txt }}>Devoluções</h1>{isTec && <Btn color="gold" onClick={() => setModal(true)}>Solicitar</Btn>}</div>
    {viewReturns.length === 0 && <Card style={{ padding: 30, textAlign: "center", color: C.muted }}>Nenhuma devolução registrada.</Card>}
    {viewReturns.map((request) => {
      const tech = users.find((user) => user.id === request.uid);
      return <Card key={request.id} style={{ padding: 16, borderLeft: `3px solid ${request.status === "pending" ? C.ylw : request.status === "approved" ? C.grn : C.red}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div><Bdg color={color[request.status]}>{label[request.status]}</Bdg> <strong style={{ color: C.txt }}>{tech?.name || "?"}</strong><div style={{ fontSize: 11, color: C.muted }}>{request.date}</div>{request.notes && <div style={{ fontSize: 12, color: C.muted }}>{request.notes}</div>}</div>
          {!isTec && request.status === "pending" && <div style={{ display: "flex", gap: 8 }}><Btn size="sm" color="grn" onClick={() => approve(request)}>Aprovar</Btn><Btn size="sm" color="red" outline onClick={() => reject(request)}>Rejeitar</Btn></div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 6, marginTop: 10 }}>
          {request.items.map((item, index) => {
            const material = stock.find((s) => s.id === item.sid);
            return <div key={index} style={{ background: C.surf, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.bdr}` }}><div style={{ fontSize: 12, color: C.txt, fontWeight: 700 }}>{material?.name || item.sid}</div><div style={{ color: C.gold, fontWeight: 800 }}>{fmt(item.qty)}</div></div>;
          })}
        </div>
      </Card>;
    })}
    {modal && <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.bdr2}`, borderRadius: isMobile ? "16px 16px 0 0" : 12, width: "100%", maxWidth: 560, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><h2 style={{ color: C.txt, fontSize: 15 }}>Solicitar devolução</h2><button onClick={() => setModal(false)} style={{ background: C.surf, color: C.muted, width: 32, height: 32, borderRadius: 8 }}>x</button></div>
        <Inp label="Observação" value={notes} onChange={setNotes} />
        <div style={{ marginTop: 12 }}><ItemList items={items} onAdd={() => setItems((prev) => [...prev, blank()])} onUpdate={(id, key, value) => setItems((prev) => prev.map((row) => row.id === id ? { ...row, [key]: value } : row))} onRemove={(id) => setItems((prev) => prev.filter((row) => row.id !== id))} stockOptions={stockOptions} isMobile={isMobile} label="Materiais a devolver" /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}><Btn color="ghost" outline onClick={() => setModal(false)}>Cancelar</Btn><Btn color="gold" onClick={submit}>Enviar</Btn></div>
      </div>
    </div>}
  </div>;
}
