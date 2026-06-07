import React, { useCallback, useMemo, useState } from "react";
import { C } from "../../utils/colors.js";
import { fmt, now, uid } from "../../utils/formatters.js";
import { Bdg, Btn, Card, Inp, Sel, THead, TRow } from "../../components/ui.jsx";

const TIPOS = {
  entrada: { l: "Entrada", c: C.grn },
  saida_almoco: { l: "Saída Almoço", c: C.ylw },
  volta_almoco: { l: "Volta Almoço", c: C.blue },
  saida: { l: "Saída", c: C.red },
};
const SEQ = ["entrada", "saida_almoco", "volta_almoco", "saida"];

export default function PontoPage({ pontos, setPontos, pontoFechamentos = [], setPontoFechamentos, users, currentUser, addLog, isMobile, showToast }) {
  const isAdm = ["admin", "superadmin"].includes(currentUser.role);
  const isFinanceiro = currentUser.role === "financeiro";
  const canClose = isAdm || isFinanceiro;
  const hoje = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState(isFinanceiro ? "fechamento" : "meu");
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [userId, setUserId] = useState("");

  const usuariosPonto = users.filter((u) => ["tecnico", "mecanico", "estoque", "admin", "superadmin", "financeiro"].includes(u.role));
  const pontosHoje = pontos.filter((p) => p.funcionarioId === currentUser.id && String(p.dt).startsWith(hoje));
  const proximo = SEQ.find((tipo) => !pontosHoje.some((p) => p.tipo === tipo));
  const fechadoHoje = pontoFechamentos.some((f) => f.mes === hoje.slice(0, 7) && (!f.userId || f.userId === currentUser.id) && ["fechado", "aprovado"].includes(f.status));

  const fmtHora = (iso) => iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const minutosDia = useCallback((uid, ds) => {
    const regs = pontos.filter((p) => p.funcionarioId === uid && String(p.dt).startsWith(ds)).sort((a, b) => new Date(a.dt) - new Date(b.dt));
    const ent = regs.find((p) => p.tipo === "entrada");
    const sai = [...regs].reverse().find((p) => p.tipo === "saida");
    const almS = regs.find((p) => p.tipo === "saida_almoco");
    const almV = regs.find((p) => p.tipo === "volta_almoco");
    if (!ent || !sai) return { mins: 0, regs, ent, sai, almS, almV, incompleto: regs.length > 0 };
    const bruto = (new Date(sai.dt) - new Date(ent.dt)) / 60000;
    const almoco = almS && almV ? Math.max(0, (new Date(almV.dt) - new Date(almS.dt)) / 60000) : 0;
    return { mins: Math.max(0, bruto - almoco), regs, ent, sai, almS, almV, incompleto: false };
  }, [pontos]);
  const minFmt = (mins) => `${Math.floor(Math.abs(mins) / 60)}h${String(Math.round(Math.abs(mins)) % 60).padStart(2, "0")}m`;

  const resumo = useMemo(() => {
    const [ano, mesNum] = mes.split("-").map(Number);
    const dias = new Date(ano, mesNum, 0).getDate();
    return usuariosPonto.filter((u) => userId ? u.id === userId : true).map((u) => {
      const linhas = Array.from({ length: dias }, (_, idx) => {
        const ds = `${ano}-${String(mesNum).padStart(2, "0")}-${String(idx + 1).padStart(2, "0")}`;
        const real = minutosDia(u.id, ds);
        return { ds, ...real };
      }).filter((l) => l.regs.length);
      return {
        user: u,
        linhas,
        realizado: linhas.reduce((a, l) => a + l.mins, 0),
        incompletos: linhas.filter((l) => l.incompleto).length,
        manuais: linhas.reduce((a, l) => a + l.regs.filter((r) => r.aprovadoPor || r.localValido === false).length, 0),
      };
    });
  }, [mes, userId, usuariosPonto, minutosDia]);

  const bater = (tipo) => {
    if (fechadoHoje) { showToast?.("Mês fechado. Solicite reabertura para registrar ponto.", "warning"); return; }
    const reg = { id: uid(), funcionarioId: currentUser.id, funcionarioNome: currentUser.name, tipo, dt: new Date().toISOString(), localValido: true, aprovado: true };
    setPontos((prev) => [...prev, reg]);
    addLog(currentUser.name, "Ponto", `${TIPOS[tipo].l} registrada`);
    showToast?.(`${TIPOS[tipo].l} registrada.`, "success");
  };

  const salvarFechamento = (status) => {
    const idAtual = pontoFechamentos.find((f) => f.mes === mes && (userId ? f.userId === userId : !f.userId))?.id || uid();
    const payload = {
      id: idAtual,
      mes,
      userId: userId || "",
      status,
      funcionarios: resumo.length,
      realizado: resumo.reduce((a, r) => a + r.realizado, 0),
      alertas: resumo.reduce((a, r) => a + r.incompletos + r.manuais, 0),
      fechadoPor: currentUser.name,
      fechadoEm: new Date().toISOString(),
      aprovadoPor: status === "aprovado" ? currentUser.name : "",
      aprovadoEm: status === "aprovado" ? new Date().toISOString() : "",
    };
    setPontoFechamentos((prev) => [payload, ...prev.filter((f) => f.id !== idAtual)]);
    addLog(currentUser.name, status === "aprovado" ? "Ponto Fechamento Aprovado" : "Ponto Fechamento", `${mes} · ${userId || "todos"}`);
    showToast?.("Fechamento salvo.", "success");
  };

  const fechamentoAtual = pontoFechamentos.find((f) => f.mes === mes && (userId ? f.userId === userId : !f.userId));

  return <div className="fi" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
      <div><h1 style={{ fontSize: isMobile ? 17 : 20, color: C.txt }}>Ponto Eletrônico</h1><p style={{ fontSize: 12, color: C.muted }}>{new Date().toLocaleDateString("pt-BR")}</p></div>
      <div style={{ display: "flex", gap: 6 }}>{["meu", ...(canClose ? ["fechamento"] : []), ...(isAdm ? ["gestao"] : [])].map((t) => <Btn key={t} size="sm" color={tab === t ? "gold" : "ghost"} outline={tab !== t} onClick={() => setTab(t)}>{t}</Btn>)}</div>
    </div>

    {tab === "meu" && <div style={{ display: "grid", gap: 12 }}>
      <Card style={{ padding: 20, textAlign: "center" }}><div style={{ fontSize: 36, color: C.txt, fontFamily: "'JetBrains Mono',monospace" }}>{new Date().toLocaleTimeString("pt-BR")}</div><div style={{ color: C.muted, fontSize: 12 }}>{proximo ? `Próximo: ${TIPOS[proximo].l}` : "Jornada encerrada"}</div></Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{SEQ.map((tipo) => {
        const done = pontosHoje.find((p) => p.tipo === tipo);
        return <button key={tipo} disabled={Boolean(done) || proximo !== tipo} onClick={() => bater(tipo)} style={{ padding: 16, borderRadius: 10, background: done ? `${TIPOS[tipo].c}22` : C.card, border: `1px solid ${done ? TIPOS[tipo].c : C.bdr}`, color: done ? TIPOS[tipo].c : C.txt, fontWeight: 800, opacity: !done && proximo !== tipo ? 0.45 : 1 }}>{TIPOS[tipo].l}<br/><span style={{ fontSize: 11 }}>{done ? fmtHora(done.dt) : "Registrar"}</span></button>;
      })}</div>
    </div>}

    {tab === "gestao" && isAdm && <Card style={{ padding: 0, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><THead cols={["Funcionário", "Tipo", "Horário", "Status"]} /></thead><tbody>{pontos.slice().sort((a, b) => new Date(b.dt) - new Date(a.dt)).slice(0, 80).map((p) => <TRow key={p.id} cells={[p.funcionarioNome, TIPOS[p.tipo]?.l || p.tipo, fmtHora(p.dt), p.localValido === false ? <Bdg color="ylw">Manual</Bdg> : <Bdg color="grn">OK</Bdg>]} />)}</tbody></table></Card>}

    {tab === "fechamento" && canClose && <div style={{ display: "grid", gap: 12 }}>
      <Card style={{ padding: 14 }}><div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "180px 1fr auto auto", gap: 10, alignItems: "end" }}><Inp label="Mês" type="month" value={mes} onChange={setMes} /><Sel label="Funcionário" value={userId} onChange={setUserId} options={[{ value: "", label: "Todos" }, ...usuariosPonto.map((u) => ({ value: u.id, label: u.name }))]} /><Btn color="gold" outline onClick={() => salvarFechamento("fechado")}>Fechar</Btn><Btn color="grn" onClick={() => salvarFechamento("aprovado")}>Aprovar</Btn></div></Card>
      {fechamentoAtual && <Card style={{ padding: 12, border: `1px solid ${fechamentoAtual.status === "aprovado" ? C.grn : C.gold}55` }}><strong style={{ color: fechamentoAtual.status === "aprovado" ? C.grn : C.gold }}>{fechamentoAtual.status}</strong><span style={{ color: C.muted }}> · {fechamentoAtual.fechadoPor} · {new Date(fechamentoAtual.fechadoEm).toLocaleString("pt-BR")}</span>{isAdm && <Btn size="xs" color="red" outline onClick={() => setPontoFechamentos((prev) => prev.filter((f) => f.id !== fechamentoAtual.id))} style={{ marginLeft: 10 }}>Reabrir</Btn>}</Card>}
      <Card style={{ padding: 0, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><THead cols={["Funcionário", "Realizado", "Incompletos", "Manuais"]} /></thead><tbody>{resumo.map((r) => <TRow key={r.user.id} cells={[r.user.name, <strong style={{ color: C.grn }}>{minFmt(r.realizado)}</strong>, r.incompletos, r.manuais]} />)}</tbody></table></Card>
    </div>}
  </div>;
}
