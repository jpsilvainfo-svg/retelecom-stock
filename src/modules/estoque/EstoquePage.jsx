import React, { useState } from "react";
import { C } from "../../utils/colors.js";
import { fmt, uid } from "../../utils/formatters.js";
import { Bdg, Btn, Card, Inp, Modal, Sel, THead, TRow } from "../../components/ui.jsx";

const CATS = ["Equipamentos", "Cabos e Fios", "Conectores", "Caixas e Acessórios", "Acessórios", "Ferramentas"];

export default function EstoquePage({ stock, setStock, isAdmin, addLog, currentUser, isMobile }) {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ code: "", name: "", cat: "Equipamentos", unit: "un", qty: "", min: "" });
  const filtered = stock.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(q.toLowerCase()));

  const save = () => {
    if (!form.name || !form.qty) return;
    const payload = { ...form, qty: parseInt(form.qty) || 0, min: parseInt(form.min) || 0 };
    if (modal === "new") setStock((prev) => [...prev, { id: uid(), ...payload }]);
    else setStock((prev) => prev.map((item) => item.id === modal ? { ...item, ...payload } : item));
    addLog(currentUser.name, modal === "new" ? "Entrada" : "Edição", form.name);
    setModal(null);
  };

  const edit = (item) => {
    setForm({ code: item.code, name: item.name, cat: item.cat, unit: item.unit, qty: String(item.qty), min: String(item.min) });
    setModal(item.id);
  };

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
      <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: C.txt }}>Estoque Base</h1>
      <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto" }}>
        <Inp value={q} onChange={setQ} placeholder="Buscar material..." style={{ flex: 1 }} />
        {isAdmin && <Btn size="sm" color="gold" onClick={() => { setForm({ code: "", name: "", cat: "Equipamentos", unit: "un", qty: "", min: "" }); setModal("new"); }}>+ Novo</Btn>}
      </div>
    </div>

    {isMobile ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {filtered.map((item) => {
        const critical = item.qty <= item.min * 0.6;
        const low = item.qty <= item.min;
        return <Card key={item.id} style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div><div style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>{item.name}</div><div style={{ fontSize: 11, color: C.muted }}>{item.code} · {item.cat} · {item.unit}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 22, fontWeight: 800, color: critical ? C.red : low ? C.ylw : C.txt }}>{fmt(item.qty)}</div>{critical ? <Bdg color="red">Crítico</Bdg> : low ? <Bdg color="ylw">Baixo</Bdg> : <Bdg color="grn">OK</Bdg>}</div>
          </div>
          {isAdmin && <Btn size="xs" color="gold" outline onClick={() => edit(item)} style={{ marginTop: 8 }}>Editar</Btn>}
        </Card>;
      })}
    </div> : <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><THead cols={["Código", "Descrição", "Categoria", "Unid.", "Qtd", "Mín.", "Situação", isAdmin ? "Ações" : ""]} /></thead>
          <tbody>{filtered.map((item) => {
            const critical = item.qty <= item.min * 0.6;
            const low = item.qty <= item.min;
            return <TRow key={item.id} cells={[
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.muted }}>{item.code}</span>,
              <span style={{ fontWeight: 600, color: C.txt }}>{item.name}</span>,
              <span style={{ fontSize: 12, color: C.muted }}>{item.cat}</span>,
              <span style={{ fontSize: 12, color: C.muted }}>{item.unit}</span>,
              <span style={{ fontWeight: 800, color: critical ? C.red : low ? C.ylw : C.txt }}>{fmt(item.qty)}</span>,
              <span style={{ color: C.muted }}>{fmt(item.min)}</span>,
              critical ? <Bdg color="red">Crítico</Bdg> : low ? <Bdg color="ylw">Baixo</Bdg> : <Bdg color="grn">OK</Bdg>,
              isAdmin ? <div style={{ display: "flex", gap: 6 }}><Btn size="xs" color="gold" outline onClick={() => edit(item)}>Editar</Btn><Btn size="xs" color="red" outline onClick={() => { if (window.confirm(`Remover "${item.name}"?`)) { setStock((prev) => prev.filter((row) => row.id !== item.id)); addLog(currentUser.name, "Remoção", item.name); } }}>x</Btn></div> : <span />,
            ]} />;
          })}</tbody>
        </table>
      </div>
    </Card>}

    {modal && <Modal title={modal === "new" ? "Novo Item" : "Editar Item"} onClose={() => setModal(null)} isMobile={isMobile}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}><Inp label="Código" value={form.code} onChange={(value) => setForm((prev) => ({ ...prev, code: value }))} /><Sel label="Categoria" value={form.cat} onChange={(value) => setForm((prev) => ({ ...prev, cat: value }))} options={CATS.map((cat) => ({ value: cat, label: cat }))} /></div>
        <Inp label="Nome" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}><Inp label="Unidade" value={form.unit} onChange={(value) => setForm((prev) => ({ ...prev, unit: value }))} /><Inp label="Qtd" value={form.qty} onChange={(value) => setForm((prev) => ({ ...prev, qty: value }))} type="number" /><Inp label="Mín." value={form.min} onChange={(value) => setForm((prev) => ({ ...prev, min: value }))} type="number" /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><Btn color="ghost" outline onClick={() => setModal(null)}>Cancelar</Btn><Btn color="gold" onClick={save}>Salvar</Btn></div>
      </div>
    </Modal>}
  </div>;
}
