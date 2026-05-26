// src/lib/utils.js
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
export const today = () => new Date().toISOString().slice(0,10);
export const fmt = (n) => new Intl.NumberFormat("pt-BR").format(n??0);
export const calcularTotalItens = (items) => items.reduce((acc,i)=>acc+(parseInt(i.qty)||0),0);
export const validarItens = (items) => items.filter(i=>i.sid&&parseInt(i.qty)>0);
