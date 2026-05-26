// src/lib/supabase.js
// ⚠️ Regenere suas chaves em: supabase.com/dashboard → Settings → API
import { createClient } from "@supabase/supabase-js";
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://enwlwudxtxpebxqfzkku.supabase.co";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud2x3dWR4dHhlYnhxZnpra3UiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0NzE3NjMzNiwiZXhwIjoyMDYyNzUyMzM2fQ.9R7qDT5kCKCqLCsKNLCJimqq5bYb0V8P6R-L5-vTxSM";
const sb = createClient(SUPA_URL, SUPA_KEY);
export async function sbGet(key){try{const{data,error}=await sb.from("re_data").select("value").eq("key",key).single();if(error||!data)return null;return data.value;}catch{return null;}}
export async function sbSet(key,value){try{const{error}=await sb.from("re_data").upsert({key,value,updated_at:new Date().toISOString()});return!error;}catch{return false;}}
