// src/lib/supabase.js
// ⚠️ Regenere suas chaves em: supabase.com/dashboard → Settings → API
import { createClient } from "@supabase/supabase-js";
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://enwlwudxtxpebxqfzkku.supabase.co";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_cZys0aMM3A6o7VSUCgU-tw_yduC-9I5";
const sb = createClient(SUPA_URL, SUPA_KEY);
function normalizeRow(data){if(!data)return null;let value=data.value;let updated_at=data.updated_at;if(value&&typeof value==="object"&&!Array.isArray(value)&&Object.prototype.hasOwnProperty.call(value,"empty")&&Object.prototype.hasOwnProperty.call(value,"value")&&Object.prototype.hasOwnProperty.call(value,"updated_at")){if(value.empty===true)return{value:null,updated_at:value.updated_at||updated_at,empty:true};updated_at=value.updated_at||updated_at;value=value.value;}return{value,updated_at};}
function isWrappedRemoteValue(value){return value&&typeof value==="object"&&!Array.isArray(value)&&Object.prototype.hasOwnProperty.call(value,"empty")&&Object.prototype.hasOwnProperty.call(value,"value")&&Object.prototype.hasOwnProperty.call(value,"updated_at");}
export async function sbPing(){const t0=Date.now();try{const{error}=await sb.from("re_data").select("key").limit(1);return{ok:!error,ms:Date.now()-t0,error:error?.message||null};}catch(e){return{ok:false,ms:Date.now()-t0,error:e?.message||"Erro de rede"};}}
export async function sbGet(key){try{const{data,error}=await sb.from("re_data").select("value,updated_at").eq("key",key).single();if(error?.code==="PGRST116")return{value:null,updated_at:null,empty:true};if(error||!data)return null;return normalizeRow(data);}catch{return null;}}
export async function sbSet(key,value){const ts=new Date().toISOString();try{if(isWrappedRemoteValue(value))return{ok:false,error:"Valor aninhado de sbGet rejeitado. Recarregue/sincronize dados locais antes de enviar."};const{error}=await sb.from("re_data").upsert({key,value,updated_at:ts});return{ok:!error,error:error?.message||null};}catch(e){return{ok:false,error:e?.message||"Erro de rede"};}}
