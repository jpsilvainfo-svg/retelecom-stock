import React, { useState } from "react";
import { C } from "../../utils/colors.js";
import { fmt, now, uid } from "../../utils/formatters.js";
import { Bdg, Btn, Card, Inp, Sel } from "../../components/ui.jsx";
import ItemList from "./ItemList.jsx";

export default function SolicitacaoPage({ solicitacoes, setSolicitacoes, stock, setStock, tstock, setTstock, users, currentUser, addLog, isMobile }) {
  const isTec = currentUser.role === "tecnico";
  const [modal, setModal] = useState(false);
  const [items, setItems] = useState([]);
  const [urgencia, setUrgencia] = useState("normal");
  const [notes, setNotes] = useState("");
  const view = isTec ? solicitacoes.filter((item) => item.uid === currentUser.id) : solicitacoes;
  const validItems = items.filter((item) => item.sid && parseInt(item.qty) > 0);
  const blank = () => ({ id: uid(), sid: "", qty: "" });

  const submit = () => {
    if (!validItems.length) return;
    setSolicitacoes((prev) => [{ id: uid(), uid: currentUser.id, date: now(), items: validItems.map((row) => ({ sid: row.sid, qty: parseInt(row.qty) })), status: "pending", urgencia, notes, rDate: null, rBy: null }, ...prev]);
    addLog(currentUser.name, "Solicitação", `${currentUser.name} solicitou ${validItems.length} item(s)`);
    setModal(false); setItems([]); setNotes(""); setUrgencia("normal");
  };

  const confirm = (request) => {
    const insufficient = request.items.find((item) => {
      const material = stock.find((s) => s.id === item.sid);
      return !material || material.qty < item.qty;
    });
    if (insufficient) { alert(`Estoque insuficiente: ${stock.find((s) => s.id === insufficient.sid)?.name || insufficient.sid}`); return; }
    setStock((prev) => prev.map((material) => {
      const requested = request.items.find((item) => item.sid === material.id);
      return requested ? { ...material, qty: material.qty - requested.qty } : material;
    }));
    setTstock((prev) => {
      let next = [...prev];
      request.items.forEach((requested) => {
        const existing = next.find((item) => item.uid === request.uid && item.sid === requested.sid);
        if (existing) next = next.map((item) => item.id === existing.id ? { ...item, qty: item.qty + requested.qty } : item);
        else next.push({ id: uid(), uid: request.uid, sid: requested.sid, qty: requested.qty });
      });
      return next;
    });
    setSolicitacoes((prev) => prev.map((item) => item.id === request.id ? { ...item, status: "confirmed", rDate: now(), rBy: currentUser.name } : item));
    addLog(currentUser.name, "Saída", `Solicitação confirmada · ${users.find((user) => user.id === request.uid)?.name || "?"}`);
  };

  const reject = (request) => {
    setSolicitacoes((prev) => prev.map((item) => item.id === request.id ? { ...item, status: "rejected", rDate: now(), rBy: currentUser.name } : item));
    addLog(currentUser.name, "Solicitação Rejeitada", `Técnico: ${users.find((user) => user.id === request.uid)?.name || "?"}`);
  };

  const colors = { pending: "ylw", confirmed: "grn", rejected: "red" };
  const labels = { pending: "Aguardando", confirmed: "Confirmada", rejected: "Rejeitada" };

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      <div><h1 style={{ fontSize: isMobile ? 17 : 20, color: C.txt }}>Solicitações de Material</h1><p style={{ fontSize: 12, color: C.muted }}>{isTec ? "Solicite materiais ao estoque" : "Gerencie pedidos dos técnicos"}</p></div>
      {isTec && <Btn color="gold" onClick={() => setModal(true)}>Nova Solicitação</Btn>}
    </div>
    {view.length === 0 && <Card style={{ padding: 30, textAlign: "center", color: C.muted }}>Nenhuma solicitação registrada.</Card>}
    {view.map((request) => {
      const tech = users.find((user) => user.id === request.uid);
      return <Card key={request.id} style={{ padding: 16, borderLeft: `3px solid ${request.status === "pending" ? C.ylw : request.status === "confirmed" ? C.grn : C.red}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div><Bdg color={colors[request.status]}>{labels[request.status]}</Bdg> <strong style={{ color: C.txt }}>{tech?.name || "?"}</strong><span style={{ color: C.muted, fontSize: 11 }}> · {request.date}</span>{request.urgencia !== "normal" && <span style={{ marginLeft: 8, color: request.urgencia === "urgente" ? C.red : C.ylw, fontSize: 12, fontWeight: 800 }}>{request.urgencia}</span>}</div>
          {!isTec && request.status === "pending" && <div style={{ display: "flex", gap: 8 }}><Btn size="sm" color="grn" onClick={() => confirm(request)}>Confirmar</Btn><Btn size="sm" color="red" outline onClick={() => reject(request)}>Rejeitar</Btn></div>}
        </div>
        {request.notes && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{request.notes}</div>}
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
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><h2 style={{ color: C.txt, fontSize: 15 }}>Nova solicitação</h2><button onClick={() => setModal(false)} style={{ background: C.surf, color: C.muted, width: 32, height: 32, borderRadius: 8 }}>x</button></div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}><Sel label="Urgência" value={urgencia} onChange={setUrgencia} options={[{ value: "normal", label: "Normal" }, { value: "alta", label: "Alta" }, { value: "urgente", label: "Urgente" }]} /><Inp label="Observação" value={notes} onChange={setNotes} /></div>
        <div style={{ marginTop: 12 }}><ItemList items={items} onAdd={() => setItems((prev) => [...prev, blank()])} onUpdate={(id, key, value) => setItems((prev) => prev.map((row) => row.id === id ? { ...row, [key]: value } : row))} onRemove={(id) => setItems((prev) => prev.filter((row) => row.id !== id))} stockOptions={stock} isMobile={isMobile} label="Materiais solicitados" /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}><Btn color="ghost" outline onClick={() => setModal(false)}>Cancelar</Btn><Btn color="gold" onClick={submit}>Enviar</Btn></div>
      </div>
    </div>}
  </div>;
}
