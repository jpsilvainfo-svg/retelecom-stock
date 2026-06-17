// src/modules/docs/DocumentosPage.jsx — central de arquivos (Supabase Storage)
import { useState, useEffect, useCallback } from "react";
import { Btn, Card } from "../../components/ui.jsx";
import { C } from "../../utils/colors.js";
import { sbUploadFile, sbListFiles, sbFileUrl, sbDeleteFile } from "../../supabase.js";

const CATEGORIAS = [
  { v: "geral", l: "Geral" },
  { v: "os", l: "Ordens de Serviço" },
  { v: "dev", l: "Devoluções" },
  { v: "frota", l: "Frota / Veículos" },
  { v: "usuarios", l: "Usuários / RH" },
  { v: "nf", l: "Notas Fiscais" },
];

const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(b) {
  if (!b) return "";
  const u = ["B", "KB", "MB", "GB"]; let i = 0, n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}
function fileIcon(ct) {
  if (!ct) return "📄";
  if (ct.startsWith("image/")) return "🖼️";
  if (ct.includes("pdf")) return "📕";
  if (ct.includes("sheet") || ct.includes("csv") || ct.includes("excel")) return "📊";
  return "📄";
}
function fmtDate(iso) {
  try { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
  catch { return iso || ""; }
}

export default function DocumentosPage({ currentUser, addLog, isMobile }) {
  const [cat, setCat] = useState("geral");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const isAdmin = ["admin", "superadmin"].includes(currentUser?.role) || currentUser?.login === "root";

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => { setLoading(true); setReloadKey(k => k + 1); }, []);

  // Busca dentro de uma IIFE async: o setState ocorre só após o await, fora do
  // corpo síncrono do efeito (evita cascata de renders).
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await sbListFiles({ module: cat });
      if (!alive) return;
      if (r.ok) setFiles(r.files); else setMsg("Erro ao listar: " + r.error);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [cat, reloadKey]);

  const onPick = async (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = "";
    if (!list.length) return;
    setUploading(true); setMsg("");
    let okCount = 0;
    for (const f of list) {
      if (f.size > MAX_BYTES) { setMsg(`"${f.name}" passa de 10 MB e foi ignorado.`); continue; }
      const r = await sbUploadFile(f, {
        module: cat,
        createdBy: currentUser?.name || currentUser?.login || "?",
        ownerId: currentUser?.id || null,
      });
      if (!r.ok) setMsg(`Falha ao enviar "${f.name}": ${r.error}`);
      else { okCount++; addLog?.(currentUser?.name || "?", "Arquivo enviado", `${f.name} (${cat})`); }
    }
    setUploading(false);
    if (okCount) setMsg(`${okCount} arquivo(s) enviado(s).`);
    reload();
  };

  const open = async (f) => {
    setMsg("");
    const url = await sbFileUrl(f.path);
    if (url) window.open(url, "_blank", "noopener");
    else setMsg("Não foi possível gerar o link do arquivo.");
  };

  const remove = async (f) => {
    if (!window.confirm(`Remover "${f.filename}"?`)) return;
    const r = await sbDeleteFile(f);
    if (r.ok) { addLog?.(currentUser?.name || "?", "Arquivo removido", f.filename); reload(); }
    else setMsg("Falha ao remover: " + r.error);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, margin: 0, color: C.txt }}>📎 Documentos</h1>
        <span style={{ fontSize: 12, color: C.muted }}>Armazenamento de PDFs, fotos e documentos</span>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>Categoria</label>
            <select value={cat} onChange={e => { setLoading(true); setCat(e.target.value); }}
              style={{ background: C.bg, color: C.txt, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, minWidth: 220 }}>
              {CATEGORIAS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <label style={{ display: "inline-flex" }}>
            <input type="file" multiple accept="image/*,application/pdf,.csv,.xlsx"
              onChange={onPick} disabled={uploading} style={{ display: "none" }} />
            <span style={{
              background: uploading ? C.muted2 : "#d10000", color: "#fff", fontWeight: 700, fontSize: 14,
              padding: "11px 18px", borderRadius: 8, cursor: uploading ? "default" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>{uploading ? "Enviando…" : "＋ Enviar arquivo"}</span>
          </label>
          <Btn color="gold" outline size="sm" onClick={reload} disabled={loading}>↻ Atualizar</Btn>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
          Tipos aceitos: PDF, imagens (PNG/JPG), CSV e Excel · até 10 MB por arquivo · no celular você pode tirar foto na hora.
        </div>
      </Card>

      {msg && <div style={{ background: C.surf, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: C.txt2 }}>{msg}</div>}

      {loading ? (
        <div style={{ color: C.muted, padding: 20 }}>Carregando…</div>
      ) : files.length === 0 ? (
        <Card><div style={{ color: C.muted, padding: "20px 8px", textAlign: "center" }}>Nenhum arquivo nesta categoria ainda.</div></Card>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {files.map(f => (
            <Card key={f.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 26 }}>{fileIcon(f.content_type)}</span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, color: C.txt, wordBreak: "break-word" }}>{f.filename}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {formatSize(f.size_bytes)} · {fmtDate(f.created_at)}{f.created_by ? ` · por ${f.created_by}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn size="sm" color="gold" onClick={() => open(f)}>Abrir</Btn>
                  {isAdmin && <Btn size="sm" color="red" outline onClick={() => remove(f)}>✕</Btn>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
