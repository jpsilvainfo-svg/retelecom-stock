import React, { useMemo, useState } from "react";
import { C } from "../../utils/colors.js";
import { fmt, uid } from "../../utils/formatters.js";
import { Bdg, Btn, Card, Inp, Sel, THead, TRow } from "../../components/ui.jsx";

export default function FrotaPage({ veiculos, setVeiculos, abastecimentos, setAbastecimentos, users, currentUser, addLog, isMobile }) {
  const [tab, setTab] = useState("veiculos");
  const [formVeic, setFormVeic] = useState({ placa: "", modelo: "", ano: "", tecnicoId: "", status: "ativo", kmCadastro: "" });
  const [formAbast, setFormAbast] = useState({ veiculoId: "", tecnicoId: currentUser.id, dtAbast: new Date().toISOString().slice(0, 10), odometro: "", litros: "", valor: "", combustivel: "gasolina", posto: "" });
  const isAdm = ["admin", "superadmin", "mecanico"].includes(currentUser.role);
  const techs = users.filter((u) => ["tecnico", "mecanico", "admin"].includes(u.role));

  const resumo = useMemo(() => {
    const totalComb = abastecimentos.reduce((a, b) => a + (parseFloat(b.valor) || 0), 0);
    const litros = abastecimentos.reduce((a, b) => a + (parseFloat(b.litros) || 0), 0);
    return { totalComb, litros, ativos: veiculos.filter((v) => v.status !== "inativo").length };
  }, [veiculos, abastecimentos]);

  const salvarVeic = () => {
    if (!formVeic.placa.trim()) return;
    const data = { id: uid(), ...formVeic, placa: formVeic.placa.toUpperCase() };
    setVeiculos((prev) => [data, ...prev]);
    addLog(currentUser.name, "Frota", `Cadastrado: ${data.placa}`);
    setFormVeic({ placa: "", modelo: "", ano: "", tecnicoId: "", status: "ativo", kmCadastro: "" });
  };

  const salvarAbast = () => {
    if (!formAbast.veiculoId || !formAbast.valor) return;
    const veic = veiculos.find((v) => v.id === formAbast.veiculoId);
    setAbastecimentos((prev) => [{ id: uid(), ...formAbast }, ...prev]);
    addLog(currentUser.name, "Abastecimento", `${veic?.placa || "?"} · R$${formAbast.valor}`);
    setFormAbast({ veiculoId: "", tecnicoId: currentUser.id, dtAbast: new Date().toISOString().slice(0, 10), odometro: "", litros: "", valor: "", combustivel: "gasolina", posto: "" });
  };

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
      <h1 style={{ fontSize: isMobile ? 17 : 20, color: C.txt }}>Frota</h1>
      <div style={{ display: "flex", gap: 6 }}>{["veiculos", "abastecimentos"].map((t) => <Btn key={t} size="sm" color={tab === t ? "gold" : "ghost"} outline={tab !== t} onClick={() => setTab(t)}>{t}</Btn>)}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }}><Card style={{ padding: 14 }}><small style={{ color: C.muted }}>Veículos ativos</small><div style={{ color: C.gold, fontSize: 24, fontWeight: 900 }}>{resumo.ativos}</div></Card><Card style={{ padding: 14 }}><small style={{ color: C.muted }}>Combustível</small><div style={{ color: C.grn, fontSize: 24, fontWeight: 900 }}>R$ {fmt(resumo.totalComb)}</div></Card><Card style={{ padding: 14 }}><small style={{ color: C.muted }}>Litros</small><div style={{ color: C.blue, fontSize: 24, fontWeight: 900 }}>{fmt(resumo.litros)}</div></Card></div>

    {tab === "veiculos" && <div style={{ display: "grid", gap: 12 }}>
      {isAdm && <Card style={{ padding: 14 }}><div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(6,1fr)", gap: 8, alignItems: "end" }}><Inp label="Placa" value={formVeic.placa} onChange={(v) => setFormVeic((p) => ({ ...p, placa: v }))} /><Inp label="Modelo" value={formVeic.modelo} onChange={(v) => setFormVeic((p) => ({ ...p, modelo: v }))} /><Inp label="Ano" value={formVeic.ano} onChange={(v) => setFormVeic((p) => ({ ...p, ano: v }))} /><Inp label="KM inicial" value={formVeic.kmCadastro} onChange={(v) => setFormVeic((p) => ({ ...p, kmCadastro: v }))} /><Sel label="Responsável" value={formVeic.tecnicoId} onChange={(v) => setFormVeic((p) => ({ ...p, tecnicoId: v }))} options={[{ value: "", label: "Sem responsável" }, ...techs.map((u) => ({ value: u.id, label: u.name }))]} /><Btn color="gold" onClick={salvarVeic}>Cadastrar</Btn></div></Card>}
      <Card style={{ padding: 0, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><THead cols={["Placa", "Modelo", "Ano", "Responsável", "Status"]} /></thead><tbody>{veiculos.map((v) => <TRow key={v.id} cells={[v.placa, v.modelo || "-", v.ano || "-", users.find((u) => u.id === v.tecnicoId)?.name || "-", <Bdg color={v.status === "ativo" ? "grn" : "ylw"}>{v.status || "ativo"}</Bdg>]} />)}</tbody></table></Card>
    </div>}

    {tab === "abastecimentos" && <div style={{ display: "grid", gap: 12 }}>
      <Card style={{ padding: 14 }}><div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(6,1fr)", gap: 8, alignItems: "end" }}><Sel label="Veículo" value={formAbast.veiculoId} onChange={(v) => setFormAbast((p) => ({ ...p, veiculoId: v }))} options={[{ value: "", label: "Selecionar" }, ...veiculos.map((v) => ({ value: v.id, label: `${v.placa} · ${v.modelo || ""}` }))]} /><Inp label="Data" type="date" value={formAbast.dtAbast} onChange={(v) => setFormAbast((p) => ({ ...p, dtAbast: v }))} /><Inp label="KM" value={formAbast.odometro} onChange={(v) => setFormAbast((p) => ({ ...p, odometro: v }))} /><Inp label="Litros" value={formAbast.litros} onChange={(v) => setFormAbast((p) => ({ ...p, litros: v }))} /><Inp label="Valor" value={formAbast.valor} onChange={(v) => setFormAbast((p) => ({ ...p, valor: v }))} /><Btn color="gold" onClick={salvarAbast}>Registrar</Btn></div></Card>
      <Card style={{ padding: 0, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><THead cols={["Data", "Veículo", "KM", "Litros", "Valor"]} /></thead><tbody>{abastecimentos.map((a) => <TRow key={a.id} cells={[a.dtAbast, veiculos.find((v) => v.id === a.veiculoId)?.placa || "-", a.odometro || "-", a.litros || "-", <strong style={{ color: C.grn }}>R$ {fmt(a.valor)}</strong>]} />)}</tbody></table></Card>
    </div>}
  </div>;
}
