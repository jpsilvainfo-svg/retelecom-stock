export const APP_VERSION="1.3.1";
export const APP_VERSION_LABEL=`v${APP_VERSION}`;
export const APP_RELEASE_DATE="06/06/2026";
export const SESSION_TTL=8*60*60*1000;

export const ALL_MODULES=[
  {k:"dash",l:"Dashboard",icon:"🏠",group:"geral"},
  {k:"os",l:"Ordens de Serviço",icon:"🔧",group:"operacional"},
  {k:"frota",l:"Frota",icon:"🚗",group:"operacional"},
  {k:"estoque",l:"Estoque Base",icon:"📦",group:"estoque"},
  {k:"kit",l:"Estoque Técnico",icon:"🎒",group:"estoque"},
  {k:"nf",l:"Entrada de Materiais (NF)",icon:"📥",group:"estoque"},
  {k:"dist",l:"Saída / Liberação",icon:"🚀",group:"estoque"},
  {k:"dev",l:"Devoluções",icon:"↩️",group:"operacional"},
  {k:"sol",l:"Solicitações",icon:"📋",group:"operacional"},
  {k:"rel",l:"Relatórios",icon:"📊",group:"relatorios"},
  {k:"email",l:"Relatório Administrativo",icon:"📧",group:"relatorios"},
  {k:"cat",l:"Categorias",icon:"🏷️",group:"admin"},
  {k:"produtos",l:"Produtos",icon:"🔩",group:"admin"},
  {k:"usr",l:"Usuários",icon:"👥",group:"admin"},
  {k:"log",l:"Logs do Sistema",icon:"📋",group:"admin"},
  {k:"ajuda",l:"Ajuda / Docs",icon:"❓",group:"admin"},
  {k:"manut",l:"Manutenção",icon:"🔩",group:"mecanico"},
  {k:"ponto",l:"Ponto Eletrônico",icon:"🕐",group:"operacional"},
  {k:"diag",l:"Diagnóstico do Sistema",icon:"🛡️",group:"admin"},
  {k:"customize",l:"Personalizar Sistema",icon:"🎨",group:"admin"}
];

export const ROOT_ONLY=["customize","diag"];

export const DEFAULT_PERMS={
  superadmin:ALL_MODULES.map(m=>m.k).filter(k=>!ROOT_ONLY.includes(k)),
  admin:ALL_MODULES.map(m=>m.k).filter(k=>!ROOT_ONLY.includes(k)),
  estoque:["dash","os","estoque","kit","dist","dev","sol","rel","ajuda","ponto"],
  tecnico:["dash","os","frota","kit","dev","sol","rel","ajuda","ponto"],
  financeiro:["dash","nf","rel","email","os","dev","log","ajuda","ponto"],
  mecanico:["dash","manut","frota","ajuda","ponto"],
};
