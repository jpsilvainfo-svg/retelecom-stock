import React, { useMemo, useState } from "react";
import { C } from "../../utils/colors.js";
import { fmt } from "../../utils/formatters.js";
import { Bdg, Btn, Card, THead, TRow } from "../../components/ui.jsx";

export default function RelatoriosPage({ stock, os, returns, users, nf, isMobile, currentUser, abastecimentos = [], manutOS = [], veiculos = [] }) {
  const [tab, setTab] = useState("analytics");
  const isTec = currentUser.role === "tecnico";
  const osView = isTec ? os.filter((o) => o.uid === currentUser.id) : os;
  const returnsView = isTec ? returns.filter((r) => r.uid === currentUser.id) : returns;

  const analytics = useMemo(() => {
    const baixo = stock.filter((s) => s.qty <= s.min);
    const totalNF = nf.reduce((a, n) => a + (n.total || 0), 0);
    const totalFrota = abastecimentos.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0) + manutOS.reduce((a, m) => a + (parseFloat(m.valorTotal || m.custo) || 0), 0);
    const porTecnico = users.filter((u) => u.role === "tecnico").map((u) => ({ user: u, os: os.filter((o) => o.uid === u.id).length, devolucoes: returns.filter((r) => r.uid === u.id).length })).sort((a, b) => b.os - a.os);
    return { baixo, totalNF, totalFrota, porTecnico };
  }, [stock, nf, abastecimentos, manutOS, users, os, returns]);

  const exportCSV = () => {
    const rows = [["tipo", "descricao", "valor"], ["estoque_baixo", "Itens abaixo do minimo", analytics.baixo.length], ["os", "Ordens de servico", osView.length], ["devolucoes", "Devolucoes", returnsView.length], ["nf_total", "Total NF", analytics.totalNF], ["frota_total", "Total frota", analytics.totalFrota]];
    const blob = new Blob(["\ufeff" + rows.map((r) => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `stocktel-relatorios-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}><div><h1 style={{ fontSize: isMobile ? 17 : 20, color: C.txt }}>Relatórios e Analytics</h1><p style={{ color: C.muted, fontSize: 12 }}>Estoque, operação, financeiro e frota.</p></div><div style={{ display: "flex", gap: 6 }}>{["analytics", "estoque", "tecnicos"].map((t) => <Btn key={t} size="sm" color={tab === t ? "gold" : "ghost"} outline={tab !== t} onClick={() => setTab(t)}>{t}</Btn>)}<Btn size="sm" color="grn" outline onClick={exportCSV}>CSV</Btn></div></div>
    {tab === "analytics" && <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: 10 }}><Card style={{ padding: 14 }}><small style={{ color: C.muted }}>Estoque baixo</small><div style={{ color: analytics.baixo.length ? C.red : C.grn, fontSize: 24, fontWeight: 900 }}>{analytics.baixo.length}</div></Card><Card style={{ padding: 14 }}><small style={{ color: C.muted }}>OS</small><div style={{ color: C.gold, fontSize: 24, fontWeight: 900 }}>{osView.length}</div></Card><Card style={{ padding: 14 }}><small style={{ color: C.muted }}>Devoluções</small><div style={{ color: C.ylw, fontSize: 24, fontWeight: 900 }}>{returnsView.length}</div></Card><Card style={{ padding: 14 }}><small style={{ color: C.muted }}>NF</small><div style={{ color: C.grn, fontSize: 20, fontWeight: 900 }}>R$ {fmt(analytics.totalNF)}</div></Card><Card style={{ padding: 14 }}><small style={{ color: C.muted }}>Frota</small><div style={{ color: C.blue, fontSize: 20, fontWeight: 900 }}>R$ {fmt(analytics.totalFrota)}</div></Card></div>}
    {tab === "estoque" && <Card style={{ padding: 0, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><THead cols={["Código", "Material", "Qtd", "Mín.", "Status"]} /></thead><tbody>{stock.filter((s) => s.qty <= s.min).map((s) => <TRow key={s.id} cells={[s.code, s.name, <strong style={{ color: C.red }}>{fmt(s.qty)}</strong>, fmt(s.min), s.qty <= s.min * 0.6 ? <Bdg color="red">Crítico</Bdg> : <Bdg color="ylw">Baixo</Bdg>]} />)}</tbody></table></Card>}
    {tab === "tecnicos" && <Card style={{ padding: 0, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><THead cols={["Técnico", "OS", "Devoluções"]} /></thead><tbody>{analytics.porTecnico.map((r) => <TRow key={r.user.id} cells={[r.user.name, r.os, r.devolucoes]} />)}</tbody></table></Card>}
    <div style={{ color: C.muted, fontSize: 11 }}>Veículos cadastrados: {veiculos.length}</div>
  </div>;
}
