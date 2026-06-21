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
  {k:"docs",l:"Documentos",icon:"📎",group:"operacional"},
  {k:"patrimonio",l:"Patrimônio",icon:"🏢",group:"estoque"},
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
  estoque:["dash","os","estoque","kit","dist","dev","sol","docs","patrimonio","rel","ajuda","ponto"],
  tecnico:["dash","os","frota","kit","dev","sol","docs","patrimonio","rel","ajuda","ponto"],
  financeiro:["dash","nf","rel","email","os","dev","docs","patrimonio","log","ajuda","ponto"],
  mecanico:["dash","manut","frota","docs","ajuda","ponto"],
};

export const ACTION_LABELS={
  exportar:"Exportar relatórios",
  aprovar_ponto:"Aprovar fechamento de ponto",
  reabrir_ponto:"Reabrir fechamento de ponto",
  editar_ponto:"Editar registros de ponto",
  administrar_usuarios:"Administrar usuários",
};

export const DEFAULT_ACTION_PERMS={
  superadmin:Object.keys(ACTION_LABELS),
  admin:["exportar","aprovar_ponto","reabrir_ponto","editar_ponto","administrar_usuarios"],
  financeiro:["exportar","aprovar_ponto"],
  estoque:["exportar"],
  tecnico:[],
  mecanico:[],
};

export const DIAGNOSTIC_CHECKS=[
  {key:"supabase",label:"Conexao Supabase",group:"infra"},
  {key:"serviceWorker",label:"Service Worker",group:"browser"},
  {key:"localStorage",label:"LocalStorage",group:"browser"},
  {key:"notifications",label:"Notificacoes",group:"browser"},
  {key:"githubActions",label:"GitHub Actions",group:"deploy"},
  {key:"systemInfo",label:"Ambiente",group:"runtime"},
];

export const DIAGNOSTIC_MODULES=[
  {key:"re_stock",label:"Estoque Base",icon:"📦"},
  {key:"re_tstock",label:"Estoque Tecnico",icon:"🎒"},
  {key:"re_os",label:"Ordens de Servico",icon:"🔧"},
  {key:"re_pontos",label:"Ponto Eletronico",icon:"🕐"},
  {key:"re_veiculos",label:"Frota",icon:"🚗"},
  {key:"re_abast",label:"Abastecimentos",icon:"⛽"},
  {key:"re_returns",label:"Devolucoes",icon:"↩️"},
  {key:"re_nf",label:"Entradas NF",icon:"📥"},
  {key:"re_users",label:"Usuarios",icon:"👥"},
  {key:"re_sol",label:"Solicitacoes",icon:"📋"},
  {key:"re_logs",label:"Logs",icon:"🗒️"},
  {key:"re_checkouts",label:"Checklist Frota",icon:"✅"},
  {key:"re_pneus",label:"Pneus",icon:"🔄"},
  {key:"re_docs_veic",label:"Docs Veiculos",icon:"📄"},
  {key:"re_manut_os",label:"Manutencao OS",icon:"🔩"},
  {key:"re_escalas",label:"Escalas",icon:"📅"},
  {key:"re_folgas",label:"Folgas",icon:"🌴"},
  {key:"re_cats",label:"Categorias",icon:"🏷️"},
  {key:"re_produtos",label:"Produtos",icon:"🔩"},
];

export const CUSTOMIZE_DEFAULT_SETTINGS={
  logoUrl:null,
  companyName:"StockTel",
  companySlogan:"Solucoes em Telecomunicacoes",
  accentColor:"#d10000",
  sidebarBg:"#101010",
  fontSize:"medium",
  sidebarMode:"auto",
  notificationMode:"on",
  menuOrder:ALL_MODULES.map(m=>m.k),
  menuLabels:{},
  menuIcons:{},
  menuHidden:[],
  menuGroups:[],
  telegram:{ativo:false,token:"",chat_id:"",chat_ids:[]},
};

// ── PATRIMÔNIO ──────────────────────────────────────────────────────────
export const PATRIMONIO_CATEGORIAS=[
  "Computadores","Notebooks","Monitores","Cadeiras","Mesas","Armários",
  "Baias de atendimento","Celulares","Impressoras","Ferramentas",
  "Equipamentos de rede","Equipamentos de escritório","Outros",
];
// Categorias que mostram campos técnicos de informática
export const PATRIMONIO_CATEGORIAS_TI=["Computadores","Notebooks"];
export const PATRIMONIO_STATUS=[
  "Ativo","Em uso","Em estoque","Em manutenção","Emprestado",
  "Baixado","Perdido","Danificado","Inativo",
];
// Status que contam como "fora de operação" (baixado/inativo)
export const PATRIMONIO_STATUS_INATIVO=["Baixado","Inativo","Perdido"];
export const PATRIMONIO_CONSERVACAO=["Novo","Ótimo","Bom","Regular","Ruim","Sucata"];
export const PATRIMONIO_STATUS_COR={
  "Ativo":"#2e7d32","Em uso":"#1565c0","Em estoque":"#00838f","Em manutenção":"#f9a825",
  "Emprestado":"#6a1b9a","Baixado":"#9a9a9a","Perdido":"#c62828","Danificado":"#d84315","Inativo":"#616161",
};
export const PATRIMONIO_MANUT_STATUS=["Aberta","Em andamento","Concluída","Cancelada"];

export const CUSTOMIZE_THEMES=[
  {key:"stocktel",label:"StockTel",accentColor:"#d10000",sidebarBg:"#101010"},
  {key:"light",label:"Claro",accentColor:"#1565c0",sidebarBg:"#f5f5f5"},
  {key:"graphite",label:"Grafite",accentColor:"#f9a825",sidebarBg:"#151515"},
  {key:"green",label:"Operacional",accentColor:"#2e7d32",sidebarBg:"#0f1712"},
];
