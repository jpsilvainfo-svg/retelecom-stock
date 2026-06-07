export const uid=()=>crypto.randomUUID();

export const now=()=>new Date().toLocaleString("pt-BR");

export const today=()=>new Date().toLocaleDateString("pt-BR",{
  weekday:"long",
  day:"2-digit",
  month:"long",
  year:"numeric"
})+" - "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});

export const fmt=(n)=>new Intl.NumberFormat("pt-BR").format(n??0);
