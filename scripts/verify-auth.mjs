import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env={}; for(const l of readFileSync(".env.local","utf8").split(/\r?\n/)){const m=l.match(/^\s*([^#][^=]+?)\s*=\s*(.*)\s*$/);if(m)env[m[1].trim()]=m[2].trim();}
const sb=createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY, {auth:{persistSession:false}});
const email=process.argv[2], pass=process.argv[3];
if(!email||!pass){console.error("uso: node scripts/verify-auth.mjs <email> <senha>");process.exit(2);}
const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
console.log("1) login Supabase Auth:", error? "ERRO -> "+error.message : "OK (user "+data.user.email+")");
if(error) process.exit(1);
const { data: row, error: e2 } = await sb.from("re_data").select("value").eq("key","re_users").single();
const users = Array.isArray(row?.value)? row.value : [];
console.log("2) leitura autenticada re_users:", e2? "ERRO -> "+e2.message : `OK (${users.length} usuarios)`);
await sb.auth.signOut();
console.log("3) signOut: OK");
console.log("\nAuth + leitura autenticada funcionando.");
