// src/lib/supabase.js
// ⚠️ Regenere suas chaves em: supabase.com/dashboard → Settings → API
import { createClient } from "@supabase/supabase-js";
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://enwlwudxtxpebxqfzkku.supabase.co";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_cZys0aMM3A6o7VSUCgU-tw_yduC-9I5";
const sb = createClient(SUPA_URL, SUPA_KEY);
export async function sbGet(key){try{const{data,error}=await sb.from("re_data").select("value,updated_at").eq("key",key).single();if(error||!data)return null;return{value:data.value,updated_at:data.updated_at};}catch{return null;}}
export async function sbSet(key,value){const ts=new Date().toISOString();try{const{error}=await sb.from("re_data").upsert({key,value,updated_at:ts});return!error;}catch{return false;}}
