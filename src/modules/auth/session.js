import { SESSION_TTL } from "../../utils/constants.js";

export async function hashSenha(senha, saltB64 = null) {
  const enc = new TextEncoder();
  const salt = saltB64
    ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(senha), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  const saltResult = btoa(String.fromCharCode(...salt));
  return { hash: hashB64, salt: saltResult, pbkdf2: true };
}

export async function verificarSenha(senha, usuario) {
  if (!usuario) return false;
  if (usuario.passHash && usuario.passSalt) {
    const { hash } = await hashSenha(senha, usuario.passSalt);
    return hash === usuario.passHash;
  }
  return senha === usuario.pass;
}

export function sessaoValida(usuario) {
  if (!usuario) return false;
  if (!usuario.loginAt) return true;
  return Date.now() - usuario.loginAt < SESSION_TTL;
}
