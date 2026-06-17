import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([^#][^=]+?)\s*=\s*(.*)\s*$/); if (m) env[m[1].trim()] = m[2].trim();
}
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY, { auth: { persistSession: false } });
const BUCKET = "stocktel-files";
const path = `geral/_verify_${Date.now()}.pdf`;
const blob = new Blob(["%PDF-1.4 teste " + new Date().toISOString()], { type: "application/pdf" });
const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "text/plain" });
console.log("1) upload binario:", up.error ? "ERRO -> " + up.error.message : "OK");
if (up.error) process.exit(1);
const ins = await sb.from("re_files").insert({ module: "geral", bucket: BUCKET, path, filename: "_verify.pdf", content_type: "application/pdf", size_bytes: blob.size, created_by: "verify-script" }).select().single();
console.log("2) metadata re_files:", ins.error ? "ERRO -> " + ins.error.message : "OK (id " + ins.data.id + ")");
const sign = await sb.storage.from(BUCKET).createSignedUrl(path, 60);
console.log("3) url assinada:", sign.error ? "ERRO -> " + sign.error.message : "OK");
await sb.storage.from(BUCKET).remove([path]);
if (ins.data) await sb.from("re_files").delete().eq("id", ins.data.id);
console.log("4) limpeza: OK");
console.log(up.error || ins.error || sign.error ? "\nFALHOU" : "\nStorage funcionando end-to-end com a chave do app.");
