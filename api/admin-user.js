// api/admin-user.js — gestão de contas de login (Supabase Auth) com service_role.
// SEGURO: exige o token de um usuário autenticado E que ele seja admin/superadmin.
// Ações: create | setPassword | delete  (corpo JSON: {action, login, password}).
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_DOMAIN = "stocktel.app";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!URL || !SERVICE) return res.status(500).json({ error: "Servidor sem service_role configurada" });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sem token de sessão" });

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  // 1) valida o token e identifica quem chamou
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return res.status(401).json({ error: "Sessão inválida" });
  const callerLogin = who.user.user_metadata?.login || String(who.user.email || "").split("@")[0];

  // 2) confere que o solicitante é admin/superadmin na re_users
  const { data: row } = await admin.from("re_data").select("value").eq("key", "re_users").single();
  const users = Array.isArray(row?.value) ? row.value : [];
  const caller = users.find(u => String(u.login).toLowerCase() === String(callerLogin).toLowerCase());
  const isAdmin = caller && (["admin", "superadmin"].includes(caller.role) || caller.login === "root");
  if (!isAdmin) return res.status(403).json({ error: "Sem permissão (apenas admin)" });

  // 3) executa a ação
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { action, login, password } = body;
  if (!login) return res.status(400).json({ error: "login obrigatório" });
  const email = `${String(login).trim().toLowerCase()}@${EMAIL_DOMAIN}`;

  async function findAuthUser() {
    let page = 1;
    for (;;) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      const list = data?.users || [];
      const hit = list.find(u => String(u.email).toLowerCase() === email);
      if (hit) return hit;
      if (list.length < 1000) return null;
      page++;
    }
  }

  try {
    if (action === "create") {
      if (!password || password.length < 4) return res.status(400).json({ error: "senha mínima de 4 caracteres" });
      const { error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { login },
      });
      if (error && !/already|registered|exists/i.test(error.message)) return res.status(400).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    if (action === "setPassword") {
      if (!password || password.length < 4) return res.status(400).json({ error: "senha mínima de 4 caracteres" });
      const target = await findAuthUser();
      if (!target) return res.status(404).json({ error: "conta de login não encontrada" });
      const { error } = await admin.auth.admin.updateUserById(target.id, { password });
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    if (action === "delete") {
      const target = await findAuthUser();
      if (target) await admin.auth.admin.deleteUser(target.id);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "ação inválida" });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "erro interno" });
  }
}
