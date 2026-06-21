// src/modules/patrimonio/PatrimonioPage.jsx — Gestão de Patrimônio (bens da empresa)
import { useState, useMemo, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { Btn, Card, Inp, Sel, Bdg, Modal, THead, TRow } from "../../components/ui.jsx";
import { C } from "../../utils/colors.js";
import {
  PATRIMONIO_CATEGORIAS, PATRIMONIO_CATEGORIAS_TI, PATRIMONIO_STATUS,
  PATRIMONIO_STATUS_INATIVO, PATRIMONIO_CONSERVACAO, PATRIMONIO_STATUS_COR,
  PATRIMONIO_MANUT_STATUS,
} from "../../utils/constants.js";
import { sbUploadFile, sbFileUrl, sbDeleteFile } from "../../supabase.js";
import { compressImage } from "../../utils/image.js";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nowISO = () => new Date().toISOString();
const fmtData = (v) => { try { return v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"; } catch { return v || "—"; } };
const fmtDataCurta = (v) => { try { return v ? new Date(v + (v.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR") : "—"; } catch { return v || "—"; } };
const fmtBRL = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const isTI = (cat) => PATRIMONIO_CATEGORIAS_TI.includes(cat);

// Próximo código patrimonial sequencial (PAT-0001)
function proximoCodigo(lista) {
  let max = 0;
  for (const p of lista) {
    const m = String(p.codigo || "").match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return "PAT-" + String(max + 1).padStart(4, "0");
}

const FORM_VAZIO = {
  nome: "", categoria: "Computadores", subcategoria: "", marca: "", modelo: "", serie: "",
  descricao: "", conservacao: "Bom", status: "Ativo", localizacao: "", setor: "", empresa: "",
  responsavelId: "", dataAquisicao: "", valorAquisicao: "", valorAtual: "", notaFiscal: "",
  fornecedor: "", garantia: "", garantiaFim: "", obs: "",
  // TI
  ti_processador: "", ti_ram: "", ti_tipoArmazenamento: "", ti_capacidade: "", ti_so: "",
  ti_placaMae: "", ti_placaVideo: "", ti_vinculados: [], ti_usuarioId: "",
};

export default function PatrimonioPage({ patrimonios = [], setPatrimonios, users = [], currentUser, addLog, isMobile, customization, initialDetailId }) {
  const role = currentUser?.role;
  const isRoot = currentUser?.login === "root";
  const canCreate = ["admin", "superadmin", "estoque"].includes(role) || isRoot;
  const canEdit = canCreate;
  const canMove = canCreate;
  const canManut = canCreate;
  const canBaixar = ["admin", "superadmin"].includes(role) || isRoot;
  const canReport = ["admin", "superadmin", "financeiro", "estoque"].includes(role) || isRoot;
  const soVeProprios = role === "tecnico"; // técnico só vê os itens dele

  const userName = (id) => users.find(u => u.id === id)?.name || "—";

  const [view, setView] = useState("lista"); // lista | detalhe
  const [detalheId, setDetalheId] = useState(initialDetailId || null);
  const [modal, setModal] = useState(null); // {tipo:'cad'|'mov'|'manut'|'baixa'|'rel'|'etiqueta', id?}
  const [form, setForm] = useState(FORM_VAZIO);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // filtros
  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fResp, setFResp] = useState("");
  const [fSetor, setFSetor] = useState("");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (initialDetailId) { setDetalheId(initialDetailId); setView("detalhe"); } }, [initialDetailId]);

  // Lista visível conforme permissão (técnico só os próprios)
  const baseLista = useMemo(() => {
    if (!soVeProprios) return patrimonios;
    return patrimonios.filter(p => p.responsavelId === currentUser?.id || p.ti_usuarioId === currentUser?.id);
  }, [patrimonios, soVeProprios, currentUser]);

  const filtrada = useMemo(() => {
    const t = q.trim().toLowerCase();
    return baseLista.filter(p => {
      if (fCat && p.categoria !== fCat) return false;
      if (fStatus && p.status !== fStatus) return false;
      if (fResp && p.responsavelId !== fResp) return false;
      if (fSetor && !((p.setor || "") + (p.empresa || "") + (p.localizacao || "")).toLowerCase().includes(fSetor.toLowerCase())) return false;
      if (t) {
        const alvo = [p.codigo, p.nome, p.serie, p.categoria, p.modelo, p.marca, userName(p.responsavelId), p.localizacao, p.setor, p.empresa].join(" ").toLowerCase();
        if (!alvo.includes(t)) return false;
      }
      return true;
    });
  }, [baseLista, q, fCat, fStatus, fResp, fSetor]); // eslint-disable-line

  // ── Resumo / dashboard ──
  const resumo = useMemo(() => {
    const porCat = {}, porStatus = {};
    let valorTotal = 0, semResp = 0, manut = 0, inativos = 0;
    for (const p of baseLista) {
      porCat[p.categoria] = (porCat[p.categoria] || 0) + 1;
      porStatus[p.status] = (porStatus[p.status] || 0) + 1;
      valorTotal += Number(p.valorAtual || p.valorAquisicao || 0);
      if (!p.responsavelId) semResp++;
      if (p.status === "Em manutenção") manut++;
      if (PATRIMONIO_STATUS_INATIVO.includes(p.status)) inativos++;
    }
    return { total: baseLista.length, porCat, porStatus, valorTotal, semResp, manut, inativos };
  }, [baseLista]);

  const itemAtual = useMemo(() => patrimonios.find(p => p.id === detalheId) || null, [patrimonios, detalheId]);

  // ── Persistência + auditoria ──
  const registrarHist = (item, tipo, detalhe) => ({
    ...item,
    historico: [{ id: uid(), data: nowISO(), tipo, detalhe, usuario: currentUser?.name || "?" }, ...(item.historico || [])],
  });

  const salvarItem = (item) => setPatrimonios(prev => {
    const existe = prev.some(p => p.id === item.id);
    return existe ? prev.map(p => p.id === item.id ? item : p) : [item, ...prev];
  });

  // ── Upload de fotos/anexos ──
  const enviarArquivos = async (fileList, kind, relatedKey) => {
    const out = [];
    for (const original of Array.from(fileList || [])) {
      const f = kind === "foto" ? await compressImage(original) : original;
      if (f.size > 10 * 1024 * 1024) { setMsg(`"${original.name}" passa de 10 MB e foi ignorado.`); continue; }
      const r = await sbUploadFile(f, { module: "patrimonio", relatedKey, createdBy: currentUser?.name, ownerId: currentUser?.id });
      if (r.ok) out.push({ path: r.file.path, filename: r.file.filename, content_type: r.file.content_type, kind });
      else setMsg(`Falha ao enviar "${original.name}": ${r.error}`);
    }
    return out;
  };

  const abrirArquivo = async (path) => { const u = await sbFileUrl(path); if (u) window.open(u, "_blank", "noopener"); else setMsg("Não foi possível abrir o arquivo."); };

  // ── CADASTRO ──
  const abrirCadastro = (item) => {
    if (item) {
      setForm({ ...FORM_VAZIO, ...item, ti_vinculados: item.ti_vinculados || [],
        valorAquisicao: item.valorAquisicao ?? "", valorAtual: item.valorAtual ?? "" });
      setModal({ tipo: "cad", id: item.id });
    } else { setForm(FORM_VAZIO); setModal({ tipo: "cad" }); }
  };

  const salvarCadastro = async (fotosFiles, anexoFiles) => {
    if (!form.nome.trim()) { setMsg("Informe o nome do item."); return; }
    setBusy(true); setMsg("");
    const editando = !!modal.id;
    const id = modal.id || uid();
    let base = editando ? patrimonios.find(p => p.id === id) : null;

    const fotosNovas = await enviarArquivos(fotosFiles, "foto", id);
    const anexosNovos = await enviarArquivos(anexoFiles, "doc", id);

    const dados = {
      ...(base || {}),
      id,
      codigo: base?.codigo || proximoCodigo(patrimonios),
      nome: form.nome.trim(), categoria: form.categoria, subcategoria: form.subcategoria,
      marca: form.marca, modelo: form.modelo, serie: form.serie, descricao: form.descricao,
      conservacao: form.conservacao, status: form.status, localizacao: form.localizacao,
      setor: form.setor, empresa: form.empresa, responsavelId: form.responsavelId,
      dataAquisicao: form.dataAquisicao, valorAquisicao: parseFloat(form.valorAquisicao) || 0,
      valorAtual: parseFloat(form.valorAtual) || 0, notaFiscal: form.notaFiscal,
      fornecedor: form.fornecedor, garantia: form.garantia, garantiaFim: form.garantiaFim, obs: form.obs,
      ti_processador: form.ti_processador, ti_ram: form.ti_ram, ti_tipoArmazenamento: form.ti_tipoArmazenamento,
      ti_capacidade: form.ti_capacidade, ti_so: form.ti_so, ti_placaMae: form.ti_placaMae,
      ti_placaVideo: form.ti_placaVideo, ti_vinculados: form.ti_vinculados, ti_usuarioId: form.ti_usuarioId,
      anexos: [...(base?.anexos || []), ...fotosNovas, ...anexosNovos],
      movimentacoes: base?.movimentacoes || [],
      manutencoes: base?.manutencoes || [],
      criadoPor: base?.criadoPor || currentUser?.name, criadoEm: base?.criadoEm || nowISO(),
      atualizadoPor: currentUser?.name, atualizadoEm: nowISO(),
    };
    const comHist = registrarHist(dados, editando ? "Edição" : "Cadastro",
      editando ? "Dados atualizados" + (fotosNovas.length || anexosNovos.length ? ` (+${fotosNovas.length + anexosNovos.length} anexo)` : "") : "Item cadastrado");
    salvarItem(comHist);
    addLog?.(currentUser?.name, editando ? "Patrimônio Editado" : "Patrimônio Cadastrado", `${comHist.codigo} · ${comHist.nome}`);
    setBusy(false); setModal(null);
    setMsg(editando ? "Patrimônio atualizado." : `Cadastrado: ${comHist.codigo}`);
  };

  // ── MOVIMENTAÇÃO ──
  const [movForm, setMovForm] = useState({ setor: "", localizacao: "", responsavelId: "", obs: "" });
  const abrirMov = (item) => { setMovForm({ setor: item.setor || "", localizacao: item.localizacao || "", responsavelId: item.responsavelId || "", obs: "" }); setModal({ tipo: "mov", id: item.id }); };
  const salvarMov = () => {
    const item = patrimonios.find(p => p.id === modal.id); if (!item) return;
    const mov = {
      id: uid(), data: nowISO(), usuario: currentUser?.name,
      deSetor: item.setor, paraSetor: movForm.setor, deLocal: item.localizacao, paraLocal: movForm.localizacao,
      deResp: item.responsavelId, paraResp: movForm.responsavelId, obs: movForm.obs,
    };
    let upd = { ...item, setor: movForm.setor, localizacao: movForm.localizacao, responsavelId: movForm.responsavelId, atualizadoPor: currentUser?.name, atualizadoEm: nowISO(), movimentacoes: [mov, ...(item.movimentacoes || [])] };
    upd = registrarHist(upd, "Movimentação", `${item.setor || "—"} → ${movForm.setor || "—"} · Resp.: ${userName(item.responsavelId)} → ${userName(movForm.responsavelId)}`);
    salvarItem(upd);
    addLog?.(currentUser?.name, "Patrimônio Movimentado", `${item.codigo} · ${userName(movForm.responsavelId)}`);
    setModal(null); setMsg("Movimentação registrada.");
  };

  // ── MANUTENÇÃO ──
  const [manutForm, setManutForm] = useState({ defeito: "", dataEnvio: "", prestador: "", valor: "", dataRetorno: "", status: "Aberta", obs: "" });
  const abrirManut = (item) => { setManutForm({ defeito: "", dataEnvio: "", prestador: "", valor: "", dataRetorno: "", status: "Aberta", obs: "" }); setModal({ tipo: "manut", id: item.id }); };
  const salvarManut = async (anexoFiles) => {
    const item = patrimonios.find(p => p.id === modal.id); if (!item) return;
    if (!manutForm.defeito.trim()) { setMsg("Descreva o defeito/problema."); return; }
    setBusy(true);
    const anexos = await enviarArquivos(anexoFiles, "doc", item.id);
    const manut = { id: uid(), data: nowISO(), ...manutForm, valor: parseFloat(manutForm.valor) || 0, usuario: currentUser?.name, anexos };
    let upd = { ...item, manutencoes: [manut, ...(item.manutencoes || [])], anexos: [...(item.anexos || []), ...anexos] };
    if (manutForm.status === "Aberta" || manutForm.status === "Em andamento") upd.status = "Em manutenção";
    upd = registrarHist(upd, "Manutenção", `${manutForm.status} · ${manutForm.defeito.slice(0, 60)}${manutForm.valor ? " · " + fmtBRL(manutForm.valor) : ""}`);
    salvarItem(upd);
    addLog?.(currentUser?.name, "Patrimônio Manutenção", `${item.codigo} · ${manutForm.status}`);
    setBusy(false); setModal(null); setMsg("Manutenção registrada.");
  };

  // ── BAIXA ──
  const [baixaForm, setBaixaForm] = useState({ motivo: "", obs: "" });
  const abrirBaixa = (item) => { setBaixaForm({ motivo: "", obs: "" }); setModal({ tipo: "baixa", id: item.id }); };
  const salvarBaixa = () => {
    const item = patrimonios.find(p => p.id === modal.id); if (!item) return;
    if (!baixaForm.obs.trim()) { setMsg("A observação da baixa é obrigatória."); return; }
    let upd = { ...item, status: "Baixado", baixa: { motivo: baixaForm.motivo, obs: baixaForm.obs, data: nowISO(), usuario: currentUser?.name }, atualizadoPor: currentUser?.name, atualizadoEm: nowISO() };
    upd = registrarHist(upd, "Baixa", `${baixaForm.motivo || "Baixa"} — ${baixaForm.obs}`);
    salvarItem(upd);
    addLog?.(currentUser?.name, "Patrimônio Baixado", `${item.codigo} · ${baixaForm.motivo}`);
    setModal(null); setMsg("Item baixado (mantido como inativo).");
  };

  // ── QR / ETIQUETA ──
  const imprimirEtiqueta = async (item) => {
    const url = `${window.location.origin}/?patrimonio=${item.id}`;
    const qr = await QRCode.toDataURL(url, { width: 240, margin: 1 });
    const marca = customization?.companyName || "StockTel";
    const w = window.open("", "_blank");
    if (!w) { setMsg("Permita pop-ups para imprimir a etiqueta."); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta ${item.codigo}</title>
      <style>body{font-family:Arial,sans-serif;margin:0;padding:16px}.etq{width:300px;border:2px solid #000;border-radius:10px;padding:14px;display:flex;gap:14px;align-items:center}
      .info{flex:1}.cod{font-size:20px;font-weight:800}.nome{font-size:13px;margin-top:4px}.emp{font-size:10px;color:#555;margin-top:6px}img{width:120px;height:120px}
      @media print{.no{display:none}}</style></head><body>
      <div class="etq"><img src="${qr}"/><div class="info"><div class="cod">${item.codigo}</div><div class="nome">${(item.nome||"").replace(/</g,"&lt;")}</div><div class="emp">${marca}</div></div></div>
      <button class="no" style="margin-top:16px;padding:10px 18px" onclick="window.print()">Imprimir</button>
      </body></html>`);
    w.document.close();
  };

  // ── RELATÓRIOS ──
  const linhasRelatorio = (lista) => lista.map(p => ({
    Codigo: p.codigo, Nome: p.nome, Categoria: p.categoria, Subcategoria: p.subcategoria || "",
    Marca: p.marca || "", Modelo: p.modelo || "", Serie: p.serie || "", Status: p.status,
    Conservacao: p.conservacao || "", Responsavel: userName(p.responsavelId), Setor: p.setor || "",
    Empresa: p.empresa || "", Localizacao: p.localizacao || "", "Aquisicao": fmtDataCurta(p.dataAquisicao),
    "Valor Aquisicao": Number(p.valorAquisicao || 0), "Valor Atual": Number(p.valorAtual || 0),
    "Nota Fiscal": p.notaFiscal || "", Fornecedor: p.fornecedor || "",
  }));
  const exportarExcel = (lista, nome) => {
    const ws = XLSX.utils.json_to_sheet(linhasRelatorio(lista));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Patrimonio");
    XLSX.writeFile(wb, `patrimonio-${nome}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    addLog?.(currentUser?.name, "Patrimônio Relatório", `Excel · ${nome} · ${lista.length} itens`);
  };
  const exportarPDF = (lista, titulo) => {
    const total = lista.reduce((a, p) => a + Number(p.valorAtual || p.valorAquisicao || 0), 0);
    const linhas = lista.map(p => `<tr><td>${p.codigo}</td><td>${(p.nome||"").replace(/</g,"&lt;")}</td><td>${p.categoria}</td><td>${p.status}</td><td>${userName(p.responsavelId)}</td><td>${p.setor||""}</td><td style="text-align:right">${fmtBRL(p.valorAtual||p.valorAquisicao)}</td></tr>`).join("");
    const w = window.open("", "_blank"); if (!w) { setMsg("Permita pop-ups para gerar o PDF."); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
      <style>body{font-family:Arial;margin:24px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f0f0f0}tfoot td{font-weight:bold}</style></head><body>
      <h1>${titulo}</h1><div>Gerado em ${new Date().toLocaleString("pt-BR")} · ${lista.length} itens</div>
      <table><thead><tr><th>Código</th><th>Nome</th><th>Categoria</th><th>Status</th><th>Responsável</th><th>Setor</th><th>Valor</th></tr></thead>
      <tbody>${linhas}</tbody><tfoot><tr><td colspan="6">Valor total</td><td style="text-align:right">${fmtBRL(total)}</td></tr></tfoot></table>
      <button style="margin-top:16px;padding:10px 18px" onclick="window.print()">Imprimir / Salvar PDF</button></body></html>`);
    w.document.close();
    addLog?.(currentUser?.name, "Patrimônio Relatório", `PDF · ${titulo} · ${lista.length} itens`);
  };

  // =========================== RENDER ===========================
  const Cards = () => {
    const cardStyle = { padding: 16, flex: "1 1 150px", minWidth: 140 };
    const Num = ({ label, value, cor }) => (
      <Card style={cardStyle}><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: cor || C.txt, marginTop: 6 }}>{value}</div></Card>
    );
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <Num label="Total de bens" value={resumo.total} />
        <Num label="Valor estimado" value={fmtBRL(resumo.valorTotal)} cor={C.grn} />
        <Num label="Em manutenção" value={resumo.manut} cor="#f9a825" />
        <Num label="Baixados/Inativos" value={resumo.inativos} cor={C.muted} />
        <Num label="Sem responsável" value={resumo.semResp} cor={resumo.semResp ? C.red : C.txt} />
      </div>
    );
  };

  if (view === "detalhe" && itemAtual) {
    return <Detalhe item={itemAtual} users={users} userName={userName} onVoltar={() => { setView("lista"); setDetalheId(null); }}
      onAbrirArquivo={abrirArquivo} canEdit={canEdit} canMove={canMove} canManut={canManut} canBaixar={canBaixar}
      onEditar={() => abrirCadastro(itemAtual)} onMov={() => abrirMov(itemAtual)} onManut={() => abrirManut(itemAtual)}
      onBaixar={() => abrirBaixa(itemAtual)} onEtiqueta={() => imprimirEtiqueta(itemAtual)} isMobile={isMobile} patrimonios={patrimonios} />;
  }

  const rc = PATRIMONIO_STATUS_COR;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div><h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: C.txt, margin: 0 }}>🏢 Patrimônio</h1>
          <span style={{ fontSize: 12, color: C.muted }}>Controle de bens da empresa</span></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canReport && <Btn color="ghost" size="sm" onClick={() => setModal({ tipo: "rel" })}>📊 Relatórios</Btn>}
          {canCreate && <Btn color="gold" size="sm" onClick={() => abrirCadastro(null)}>+ Novo patrimônio</Btn>}
        </div>
      </div>

      <Cards />

      {/* Filtros */}
      <Card style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr 1fr", gap: 10 }}>
          <Inp placeholder="Buscar (código, nome, série, marca...)" value={q} onChange={setQ} />
          <Sel value={fCat} onChange={setFCat} options={[{ value: "", label: "Categoria (todas)" }, ...PATRIMONIO_CATEGORIAS]} />
          <Sel value={fStatus} onChange={setFStatus} options={[{ value: "", label: "Status (todos)" }, ...PATRIMONIO_STATUS]} />
          <Sel value={fResp} onChange={setFResp} options={[{ value: "", label: "Responsável (todos)" }, ...users.map(u => ({ value: u.id, label: u.name }))]} />
          <Inp placeholder="Setor / empresa / local" value={fSetor} onChange={setFSetor} />
        </div>
      </Card>

      {msg && <div style={{ background: C.surf, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: C.txt2 }}>{msg}</div>}

      {/* Tabela */}
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><THead cols={["Código", "Item", "Categoria", "Status", "Responsável", "Setor", "Valor", "Ações"]} /></thead>
          <tbody>
            {filtrada.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: C.muted }}>Nenhum patrimônio encontrado.</td></tr>}
            {filtrada.map(p => <TRow key={p.id} cells={[
              <b style={{ color: C.txt }}>{p.codigo}</b>,
              <span>{p.nome}{p.serie ? <div style={{ fontSize: 11, color: C.muted }}>S/N: {p.serie}</div> : null}</span>,
              p.categoria,
              <span style={{ background: (rc[p.status] || "#666") + "22", color: rc[p.status] || C.muted, padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{p.status}</span>,
              userName(p.responsavelId),
              p.setor || "—",
              fmtBRL(p.valorAtual || p.valorAquisicao),
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <Btn size="xs" color="ghost" onClick={() => { setDetalheId(p.id); setView("detalhe"); }}>Ver</Btn>
                {canEdit && <Btn size="xs" color="gold" outline onClick={() => abrirCadastro(p)}>Editar</Btn>}
                {canMove && <Btn size="xs" color="ghost" onClick={() => abrirMov(p)}>Mover</Btn>}
              </div>,
            ]} />)}
          </tbody>
        </table>
      </Card>

      {/* MODAIS */}
      {modal?.tipo === "cad" && <ModalCadastro form={form} setForm={setForm} onSalvar={salvarCadastro} onClose={() => setModal(null)}
        users={users} patrimonios={patrimonios} busy={busy} isMobile={isMobile} editando={!!modal.id} />}
      {modal?.tipo === "mov" && <Modal title="Movimentar patrimônio" onClose={() => setModal(null)} isMobile={isMobile}>
        <div style={{ display: "grid", gap: 12 }}>
          <Inp label="Novo setor/departamento" value={movForm.setor} onChange={v => setMovForm(f => ({ ...f, setor: v }))} />
          <Inp label="Nova localização" value={movForm.localizacao} onChange={v => setMovForm(f => ({ ...f, localizacao: v }))} />
          <Sel label="Novo responsável" value={movForm.responsavelId} onChange={v => setMovForm(f => ({ ...f, responsavelId: v }))} options={[{ value: "", label: "— sem responsável —" }, ...users.map(u => ({ value: u.id, label: u.name }))]} />
          <Inp label="Observação" value={movForm.obs} onChange={v => setMovForm(f => ({ ...f, obs: v }))} />
          <Btn color="gold" full onClick={salvarMov}>Registrar movimentação</Btn>
        </div>
      </Modal>}
      {modal?.tipo === "manut" && <ModalManut form={manutForm} setForm={setManutForm} onSalvar={salvarManut} onClose={() => setModal(null)} busy={busy} isMobile={isMobile} />}
      {modal?.tipo === "baixa" && <Modal title="Baixa patrimonial" onClose={() => setModal(null)} isMobile={isMobile}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 12, color: C.muted }}>O item não é apagado — fica marcado como <b>Baixado/Inativo</b> e mantém o histórico.</div>
          <Inp label="Motivo da baixa" value={baixaForm.motivo} onChange={v => setBaixaForm(f => ({ ...f, motivo: v }))} placeholder="Ex.: obsoleto, perda, doação..." />
          <Inp label="Observação (obrigatória)" value={baixaForm.obs} onChange={v => setBaixaForm(f => ({ ...f, obs: v }))} />
          <Btn color="red" full onClick={salvarBaixa}>Confirmar baixa</Btn>
        </div>
      </Modal>}
      {modal?.tipo === "rel" && <ModalRelatorios lista={baseLista} users={users} userName={userName} onExcel={exportarExcel} onPDF={exportarPDF} onClose={() => setModal(null)} isMobile={isMobile} />}
    </div>
  );
}

// ─────────────────────────── SUBCOMPONENTES ───────────────────────────
function Secao({ titulo, children }) {
  return <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: ".05em", margin: "6px 0 10px" }}>{titulo}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>{children}</div>
  </div>;
}

function ModalCadastro({ form, setForm, onSalvar, onClose, users, patrimonios, busy, isMobile, editando }) {
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const [fotos, setFotos] = useState(null);
  const [anexos, setAnexos] = useState(null);
  const ti = isTI(form.categoria);
  const toggleVinc = (id) => setForm(f => ({ ...f, ti_vinculados: (f.ti_vinculados || []).includes(id) ? f.ti_vinculados.filter(x => x !== id) : [...(f.ti_vinculados || []), id] }));
  return <Modal title={editando ? "Editar patrimônio" : "Novo patrimônio"} onClose={onClose} isMobile={isMobile}>
    <Secao titulo="Identificação">
      <Inp label="Nome do item *" value={form.nome} onChange={set("nome")} />
      <Sel label="Categoria" value={form.categoria} onChange={set("categoria")} options={PATRIMONIO_CATEGORIAS} />
      <Inp label="Subcategoria" value={form.subcategoria} onChange={set("subcategoria")} />
      <Inp label="Marca" value={form.marca} onChange={set("marca")} />
      <Inp label="Modelo" value={form.modelo} onChange={set("modelo")} />
      <Inp label="Número de série" value={form.serie} onChange={set("serie")} />
      <Sel label="Conservação" value={form.conservacao} onChange={set("conservacao")} options={PATRIMONIO_CONSERVACAO} />
      <Sel label="Status" value={form.status} onChange={set("status")} options={PATRIMONIO_STATUS} />
    </Secao>
    <Secao titulo="Localização & responsável">
      <Inp label="Localização atual" value={form.localizacao} onChange={set("localizacao")} />
      <Inp label="Setor/departamento" value={form.setor} onChange={set("setor")} />
      <Inp label="Empresa vinculada" value={form.empresa} onChange={set("empresa")} />
      <Sel label="Responsável" value={form.responsavelId} onChange={set("responsavelId")} options={[{ value: "", label: "— sem responsável —" }, ...users.map(u => ({ value: u.id, label: u.name }))]} />
    </Secao>
    <Secao titulo="Aquisição & valores">
      <Inp label="Data de aquisição" type="date" value={form.dataAquisicao} onChange={set("dataAquisicao")} />
      <Inp label="Valor de aquisição (R$)" type="number" value={form.valorAquisicao} onChange={set("valorAquisicao")} />
      <Inp label="Valor estimado atual (R$)" type="number" value={form.valorAtual} onChange={set("valorAtual")} />
      <Inp label="Nota fiscal" value={form.notaFiscal} onChange={set("notaFiscal")} />
      <Inp label="Fornecedor" value={form.fornecedor} onChange={set("fornecedor")} />
      <Inp label="Garantia" value={form.garantia} onChange={set("garantia")} placeholder="Ex.: 12 meses" />
      <Inp label="Data final da garantia" type="date" value={form.garantiaFim} onChange={set("garantiaFim")} />
    </Secao>
    {ti && <Secao titulo="Especificações (informática)">
      <Inp label="Processador" value={form.ti_processador} onChange={set("ti_processador")} />
      <Inp label="Memória RAM" value={form.ti_ram} onChange={set("ti_ram")} />
      <Inp label="Tipo de armazenamento" value={form.ti_tipoArmazenamento} onChange={set("ti_tipoArmazenamento")} placeholder="SSD / HD / NVMe" />
      <Inp label="Capacidade" value={form.ti_capacidade} onChange={set("ti_capacidade")} placeholder="Ex.: 512 GB" />
      <Inp label="Sistema operacional" value={form.ti_so} onChange={set("ti_so")} />
      <Inp label="Placa-mãe" value={form.ti_placaMae} onChange={set("ti_placaMae")} />
      <Inp label="Placa de vídeo" value={form.ti_placaVideo} onChange={set("ti_placaVideo")} />
      <Sel label="Usado por (funcionário)" value={form.ti_usuarioId} onChange={set("ti_usuarioId")} options={[{ value: "", label: "—" }, ...users.map(u => ({ value: u.id, label: u.name }))]} />
    </Secao>}
    {ti && <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Periféricos/itens vinculados (monitor, teclado, mouse, nobreak):</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 110, overflow: "auto" }}>
        {patrimonios.filter(p => p.id !== form.id).map(p => (
          <span key={p.id} onClick={() => toggleVinc(p.id)} style={{ cursor: "pointer", fontSize: 11, padding: "4px 9px", borderRadius: 6, border: `1px solid ${C.bdr2}`, background: (form.ti_vinculados || []).includes(p.id) ? C.gold : "transparent", color: (form.ti_vinculados || []).includes(p.id) ? "#fff" : C.txt2 }}>{p.codigo} {p.nome}</span>
        ))}
      </div>
    </div>}
    <Secao titulo="Descrição & anexos">
      <div style={{ gridColumn: "1/-1" }}><Inp label="Descrição completa" value={form.descricao} onChange={set("descricao")} /></div>
      <div style={{ gridColumn: "1/-1" }}><Inp label="Observações" value={form.obs} onChange={set("obs")} /></div>
    </Secao>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginTop: 10 }}>
      <label style={{ fontSize: 12, color: C.muted }}>📷 Fotos do item<input type="file" accept="image/*" multiple onChange={e => setFotos(e.target.files)} style={{ display: "block", marginTop: 6, color: C.txt2 }} /></label>
      <label style={{ fontSize: 12, color: C.muted }}>📄 Documento/NF (PDF)<input type="file" accept="application/pdf,image/*" multiple onChange={e => setAnexos(e.target.files)} style={{ display: "block", marginTop: 6, color: C.txt2 }} /></label>
    </div>
    <Btn color="gold" full style={{ marginTop: 16 }} disabled={busy} onClick={() => onSalvar(fotos, anexos)}>{busy ? "Salvando..." : (editando ? "Salvar alterações" : "Cadastrar patrimônio")}</Btn>
  </Modal>;
}

function ModalManut({ form, setForm, onSalvar, onClose, busy, isMobile }) {
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const [anexos, setAnexos] = useState(null);
  return <Modal title="Manutenção do patrimônio" onClose={onClose} isMobile={isMobile}>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
      <div style={{ gridColumn: "1/-1" }}><Inp label="Defeito/problema *" value={form.defeito} onChange={set("defeito")} /></div>
      <Inp label="Data de envio" type="date" value={form.dataEnvio} onChange={set("dataEnvio")} />
      <Inp label="Prestador responsável" value={form.prestador} onChange={set("prestador")} />
      <Inp label="Valor (R$)" type="number" value={form.valor} onChange={set("valor")} />
      <Inp label="Data de retorno" type="date" value={form.dataRetorno} onChange={set("dataRetorno")} />
      <Sel label="Status" value={form.status} onChange={set("status")} options={PATRIMONIO_MANUT_STATUS} />
      <div style={{ gridColumn: "1/-1" }}><Inp label="Observações" value={form.obs} onChange={set("obs")} /></div>
      <label style={{ fontSize: 12, color: C.muted, gridColumn: "1/-1" }}>📎 Comprovantes/fotos<input type="file" accept="application/pdf,image/*" multiple onChange={e => setAnexos(e.target.files)} style={{ display: "block", marginTop: 6, color: C.txt2 }} /></label>
    </div>
    <Btn color="gold" full style={{ marginTop: 16 }} disabled={busy} onClick={() => onSalvar(anexos)}>{busy ? "Salvando..." : "Registrar manutenção"}</Btn>
  </Modal>;
}

function ModalRelatorios({ lista, users, userName, onExcel, onPDF, onClose, isMobile }) {
  const [tipo, setTipo] = useState("geral");
  const [valor, setValor] = useState("");
  const filtrar = () => {
    if (tipo === "manutencao") return lista.filter(p => p.status === "Em manutenção");
    if (tipo === "baixados") return lista.filter(p => PATRIMONIO_STATUS_INATIVO.includes(p.status));
    if (tipo === "categoria" && valor) return lista.filter(p => p.categoria === valor);
    if (tipo === "responsavel" && valor) return lista.filter(p => p.responsavelId === valor);
    if (tipo === "setor" && valor) return lista.filter(p => (p.setor || "").toLowerCase() === valor.toLowerCase());
    return lista;
  };
  const sub = filtrar();
  const titulos = { geral: "Relatório Geral de Patrimônio", categoria: "Patrimônio por Categoria", responsavel: "Patrimônio por Responsável", setor: "Patrimônio por Setor", manutencao: "Itens em Manutenção", baixados: "Itens Baixados/Inativos", valor: "Valor Patrimonial Total" };
  return <Modal title="Relatórios de Patrimônio" onClose={onClose} isMobile={isMobile}>
    <div style={{ display: "grid", gap: 12 }}>
      <Sel label="Tipo de relatório" value={tipo} onChange={(v) => { setTipo(v); setValor(""); }} options={[
        { value: "geral", label: "Geral" }, { value: "categoria", label: "Por categoria" }, { value: "responsavel", label: "Por responsável" },
        { value: "setor", label: "Por setor/localização" }, { value: "manutencao", label: "Em manutenção" }, { value: "baixados", label: "Baixados/inativos" }, { value: "valor", label: "Valor total" },
      ]} />
      {tipo === "categoria" && <Sel label="Categoria" value={valor} onChange={setValor} options={[{ value: "", label: "—" }, ...PATRIMONIO_CATEGORIAS]} />}
      {tipo === "responsavel" && <Sel label="Responsável" value={valor} onChange={setValor} options={[{ value: "", label: "—" }, ...users.map(u => ({ value: u.id, label: u.name }))]} />}
      {tipo === "setor" && <Inp label="Setor" value={valor} onChange={setValor} />}
      <div style={{ fontSize: 13, color: C.txt2 }}>Itens no relatório: <b>{sub.length}</b> · Valor total: <b>{fmtBRL(sub.reduce((a, p) => a + Number(p.valorAtual || p.valorAquisicao || 0), 0))}</b></div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn color="grn" full onClick={() => onExcel(sub, tipo)}>📊 Exportar Excel</Btn>
        <Btn color="gold" full onClick={() => onPDF(sub, titulos[tipo])}>📄 Exportar PDF</Btn>
      </div>
    </div>
  </Modal>;
}

function Detalhe({ item, userName, onVoltar, onAbrirArquivo, canEdit, canMove, canManut, canBaixar, onEditar, onMov, onManut, onBaixar, onEtiqueta, isMobile, patrimonios }) {
  const rc = PATRIMONIO_STATUS_COR;
  const fotos = (item.anexos || []).filter(a => a.kind === "foto");
  const docs = (item.anexos || []).filter(a => a.kind !== "foto");
  const Campo = ({ label, valor }) => valor ? <div><div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 13, color: C.txt, marginTop: 2 }}>{valor}</div></div> : null;
  const vincNomes = (item.ti_vinculados || []).map(id => patrimonios.find(p => p.id === id)).filter(Boolean);
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Btn color="ghost" size="sm" onClick={onVoltar}>← Voltar</Btn>
        <div><h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.txt, margin: 0 }}>{item.codigo} · {item.nome}</h1>
          <span style={{ background: (rc[item.status] || "#666") + "22", color: rc[item.status] || C.muted, padding: "2px 9px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{item.status}</span></div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {canEdit && <Btn size="sm" color="gold" outline onClick={onEditar}>Editar</Btn>}
        {canMove && <Btn size="sm" color="ghost" onClick={onMov}>Movimentar</Btn>}
        {canManut && <Btn size="sm" color="ghost" onClick={onManut}>Manutenção</Btn>}
        <Btn size="sm" color="ghost" onClick={onEtiqueta}>🏷️ Etiqueta/QR</Btn>
        {canBaixar && item.status !== "Baixado" && <Btn size="sm" color="red" outline onClick={onBaixar}>Baixar</Btn>}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 14 }}>
      <Card style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
          <Campo label="Categoria" valor={item.categoria} /><Campo label="Subcategoria" valor={item.subcategoria} />
          <Campo label="Marca" valor={item.marca} /><Campo label="Modelo" valor={item.modelo} />
          <Campo label="Nº de série" valor={item.serie} /><Campo label="Conservação" valor={item.conservacao} />
          <Campo label="Responsável" valor={userName(item.responsavelId)} /><Campo label="Setor" valor={item.setor} />
          <Campo label="Empresa" valor={item.empresa} /><Campo label="Localização" valor={item.localizacao} />
          <Campo label="Aquisição" valor={fmtDataCurta(item.dataAquisicao)} /><Campo label="Valor aquisição" valor={item.valorAquisicao ? fmtBRL(item.valorAquisicao) : null} />
          <Campo label="Valor atual" valor={item.valorAtual ? fmtBRL(item.valorAtual) : null} /><Campo label="Nota fiscal" valor={item.notaFiscal} />
          <Campo label="Fornecedor" valor={item.fornecedor} /><Campo label="Garantia" valor={item.garantia} />
          <Campo label="Garantia até" valor={fmtDataCurta(item.garantiaFim)} />
        </div>
        {item.descricao && <div style={{ marginTop: 14 }}><div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Descrição</div><div style={{ fontSize: 13, color: C.txt2, marginTop: 3 }}>{item.descricao}</div></div>}
        {item.obs && <div style={{ marginTop: 10 }}><div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Observações</div><div style={{ fontSize: 13, color: C.txt2, marginTop: 3 }}>{item.obs}</div></div>}
        {isTI(item.categoria) && <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.bdr}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, textTransform: "uppercase", marginBottom: 8 }}>Especificações</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
            <Campo label="Processador" valor={item.ti_processador} /><Campo label="RAM" valor={item.ti_ram} />
            <Campo label="Armazenamento" valor={[item.ti_tipoArmazenamento, item.ti_capacidade].filter(Boolean).join(" · ")} />
            <Campo label="SO" valor={item.ti_so} /><Campo label="Placa-mãe" valor={item.ti_placaMae} /><Campo label="Placa de vídeo" valor={item.ti_placaVideo} />
            <Campo label="Usado por" valor={item.ti_usuarioId ? userName(item.ti_usuarioId) : null} />
            <Campo label="Vinculados" valor={vincNomes.length ? vincNomes.map(p => p.codigo).join(", ") : null} />
          </div>
        </div>}
        {item.baixa && <div style={{ marginTop: 12, padding: 10, background: C.red + "15", borderRadius: 8, fontSize: 12, color: C.txt2 }}>
          <b>Baixado</b> em {fmtData(item.baixa.data)} por {item.baixa.usuario} — {item.baixa.motivo}: {item.baixa.obs}</div>}
      </Card>

      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        {fotos.length > 0 && <Card style={{ padding: 14 }}><div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>📷 FOTOS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{fotos.map((f, i) => <Btn key={i} size="xs" color="ghost" onClick={() => onAbrirArquivo(f.path)}>Foto {i + 1}</Btn>)}</div></Card>}
        {docs.length > 0 && <Card style={{ padding: 14 }}><div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>📄 DOCUMENTOS</div>
          <div style={{ display: "grid", gap: 6 }}>{docs.map((f, i) => <Btn key={i} size="xs" color="ghost" onClick={() => onAbrirArquivo(f.path)}>{f.filename || `Anexo ${i + 1}`}</Btn>)}</div></Card>}
        <Card style={{ padding: 14 }}><div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>📜 HISTÓRICO</div>
          <div style={{ display: "grid", gap: 8, maxHeight: 240, overflow: "auto" }}>
            {(item.historico || []).length === 0 && <span style={{ fontSize: 12, color: C.muted }}>Sem registros.</span>}
            {(item.historico || []).map(h => <div key={h.id} style={{ borderLeft: `2px solid ${C.gold}`, paddingLeft: 8 }}>
              <div style={{ fontSize: 12, color: C.txt, fontWeight: 600 }}>{h.tipo}</div>
              <div style={{ fontSize: 11, color: C.txt2 }}>{h.detalhe}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{fmtData(h.data)} · {h.usuario}</div></div>)}
          </div></Card>
      </div>
    </div>

    {(item.manutencoes || []).length > 0 && <Card style={{ padding: 16, marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, textTransform: "uppercase", marginBottom: 10 }}>🔧 Manutenções</div>
      <div style={{ display: "grid", gap: 8 }}>{(item.manutencoes || []).map(m => <div key={m.id} style={{ padding: 10, background: C.surf, borderRadius: 8, fontSize: 12, color: C.txt2 }}>
        <b>{m.status}</b> — {m.defeito} {m.prestador ? `· ${m.prestador}` : ""} {m.valor ? `· ${fmtBRL(m.valor)}` : ""}<div style={{ fontSize: 10, color: C.muted }}>{fmtData(m.data)} · {m.usuario}</div></div>)}</div>
    </Card>}
  </div>;
}
