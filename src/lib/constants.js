// src/lib/constants.js
export const C={bg:"#161616",surf:"#1e1e1e",card:"#252525",bdr:"#2a2a2a",bdr2:"#333333",gold:"#cc0000",goldD:"#cc000022",goldL:"#e00000",red:"#cc0000",redD:"#cc000022",grn:"#43a047",grnD:"#43a04722",ylw:"#fb8c00",ylwD:"#fb8c0022",blue:"#1e88e5",txt:"#ffffff",txt2:"#cccccc",muted:"#888888",muted2:"#555555"};

export const PIE=["#cc0000","#666666","#999999","#444444","#aaaaaa"];

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
  {k:"manut",l:"Manutenção",icon:"🔩",group:"mecanico"},
];

export const DEFAULT_PERMS={
  superadmin:ALL_MODULES.map(m=>m.k),
  admin:ALL_MODULES.map(m=>m.k),
  estoque:["dash","os","estoque","kit","dist","dev","sol","rel"],
  tecnico:["dash","os","frota","kit","dev","sol","rel"],
  financeiro:["dash","nf","rel","email","os","dev","log"],
  mecanico:["dash","manut","frota"],
  superadmin:ALL_MODULES.map(m=>m.k),
};
const MASTER_LOGIN="stocktelmaster";
const MASTER_PASS="ST@fMa@wKQX2026!";
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toLocaleString("pt-BR");
const today=()=>new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})+" - "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const fmt=(n)=>new Intl.NumberFormat("pt-BR").format(n??0);
const useIsMobile=()=>{const[m,setM]=useState(()=>window.innerWidth<768);useEffect(()=>{const h=()=>setM(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return m;};

// Hook que sincroniza estado com Supabase (nuvem) + localStorage (fallback offline)
const useLS=(key,initial)=>{
  const[val,setVal]=useState(()=>{
    try{const s=localStorage.getItem(key);return s?JSON.parse(s):initial;}
    catch{return initial;}
  });
  // Carrega do Supabase ao montar
  useEffect(()=>{
    sbGet(key).then(remote=>{
      if(remote!==null){
        setVal(remote);
        try{localStorage.setItem(key,JSON.stringify(remote));}catch{}
      }
    }).catch(()=>{
      // Sem conexão: usa localStorage silenciosamente
    });
  },[key]);
  const set=(v)=>{
    setVal(prev=>{
      const next=typeof v==="function"?v(prev):v;
      try{localStorage.setItem(key,JSON.stringify(next));}catch{}
      sbSet(key,next).catch(()=>{});
      return next;
    });
  };
  return[val,set];
};

export const USERS0=[
  {id:"u0",name:"Master StockTel",email:"master@stocktel.com.br",phone:"",cpf:"",login:"stocktelmaster",pass:"ST@fMa@wKQX2026!",role:"superadmin",photo:"",perms:ALL_MODULES.map(m=>m.k),mustChangePassword:false},
  {id:"u1",name:"Administrador",email:"admin@stocktel.com.br",phone:"(21)99999-0001",cpf:"000.000.000-01",login:"admin",pass:"admin123",role:"admin",photo:"",perms:ALL_MODULES.map(m=>m.k),mustChangePassword:false},
  {id:"u2",name:"Marcos Estoque",email:"estoque@stocktel.com.br",phone:"(21)99999-0002",cpf:"000.000.000-02",login:"estoque",pass:"est123",role:"estoque",perms:DEFAULT_PERMS["estoque"]||[],mustChangePassword:false},
  {id:"u3",name:"João Silva",email:"joao@stocktel.com.br",phone:"(21)98888-0001",cpf:"111.111.111-01",login:"joao",pass:"tec123",role:"tecnico",perms:DEFAULT_PERMS["tecnico"]||[],mustChangePassword:false},
  {id:"u4",name:"Carlos Alberto",email:"carlos@stocktel.com.br",phone:"(21)98888-0002",cpf:"111.111.111-02",login:"carlos",pass:"tec456",role:"tecnico",perms:DEFAULT_PERMS["tecnico"]||[],mustChangePassword:false},
  {id:"u5",name:"João Paulo",email:"jpaulo@stocktel.com.br",phone:"(21)98888-0003",cpf:"111.111.111-03",login:"jpaulo",pass:"tec789",role:"tecnico",perms:DEFAULT_PERMS["tecnico"]||[],mustChangePassword:false},
  {id:"u6",name:"Marcos Vinícius",email:"marcos@stocktel.com.br",phone:"(21)98888-0004",cpf:"111.111.111-04",login:"marcos",pass:"tec321",role:"tecnico",perms:DEFAULT_PERMS["tecnico"]||[],mustChangePassword:false},
  {id:"u7",name:"Pedro Henrique",email:"pedro@stocktel.com.br",phone:"(21)98888-0005",cpf:"111.111.111-05",login:"pedro",pass:"tec654",role:"tecnico",perms:DEFAULT_PERMS["tecnico"]||[],mustChangePassword:false},
];
const STOCK0=[
  {id:"s1",code:"ONU-001",name:"ONU Huawei HG8145V5",cat:"Equipamentos",unit:"un",qty:12,min:20},
  {id:"s2",code:"ONT-001",name:"ONT ZTE F601",cat:"Equipamentos",unit:"un",qty:45,min:15},
  {id:"s3",code:"RTR-001",name:"Roteador WiFi 5G",cat:"Equipamentos",unit:"un",qty:30,min:10},
  {id:"s4",code:"SWT-001",name:"Switch 8 Portas",cat:"Equipamentos",unit:"un",qty:18,min:5},
  {id:"s5",code:"DROP-001",name:"Cabo Drop Flat 2FO (100m)",cat:"Cabos e Fios",unit:"rolo",qty:8,min:15},
  {id:"s6",code:"CNU-001",name:"Cabo NU Drop Óptico",cat:"Cabos e Fios",unit:"m",qty:1800,min:300},
  {id:"s7",code:"CNT-001",name:"Cabo NT Autossustentado",cat:"Cabos e Fios",unit:"m",qty:950,min:200},
  {id:"s8",code:"CON-001",name:"Conector SC/APC",cat:"Conectores",unit:"un",qty:25,min:50},
  {id:"s9",code:"CON-002",name:"Conector SC/UPC",cat:"Conectores",unit:"un",qty:180,min:50},
  {id:"s10",code:"CON-003",name:"Conector RJ45",cat:"Conectores",unit:"un",qty:350,min:100},
  {id:"s11",code:"SPL-001",name:"Splitter 1x8",cat:"Caixas e Acessórios",unit:"un",qty:55,min:20},
  {id:"s12",code:"SPL-002",name:"Splitter 1x16",cat:"Caixas e Acessórios",unit:"un",qty:30,min:15},
  {id:"s13",code:"CEO-001",name:"Caixa de Emenda Óptica",cat:"Caixas e Acessórios",unit:"un",qty:40,min:15},
  {id:"s14",code:"ANIL-001",name:"Anilha Galvanizada",cat:"Acessórios",unit:"pç",qty:30,min:60},
  {id:"s15",code:"ALCA-001",name:"Alça Preformada",cat:"Acessórios",unit:"un",qty:18,min:30},
  {id:"s16",code:"PCH-001",name:"Patch Cord SC/APC 3m",cat:"Cabos e Fios",unit:"un",qty:85,min:30},
  {id:"s17",code:"DIO-001",name:"DIO 16 Portas",cat:"Caixas e Acessórios",unit:"un",qty:12,min:5},
  {id:"s18",code:"FER-001",name:"Fusionadora de Fibra",cat:"Ferramentas",unit:"un",qty:4,min:2},
];
const TSTOCK0=[
  {id:"ts1",uid:"u3",sid:"s1",qty:3},{id:"ts2",uid:"u3",sid:"s6",qty:150},{id:"ts3",uid:"u3",sid:"s8",qty:10},{id:"ts4",uid:"u3",sid:"s14",qty:20},
  {id:"ts5",uid:"u4",sid:"s1",qty:2},{id:"ts6",uid:"u4",sid:"s7",qty:120},{id:"ts7",uid:"u4",sid:"s9",qty:15},{id:"ts8",uid:"u4",sid:"s15",qty:8},
  {id:"ts9",uid:"u5",sid:"s2",qty:4},{id:"ts10",uid:"u5",sid:"s6",qty:100},{id:"ts11",uid:"u5",sid:"s10",qty:30},
  {id:"ts12",uid:"u6",sid:"s1",qty:2},{id:"ts13",uid:"u6",sid:"s6",qty:80},{id:"ts14",uid:"u6",sid:"s8",qty:8},
  {id:"ts15",uid:"u7",sid:"s3",qty:2},{id:"ts16",uid:"u7",sid:"s6",qty:60},{id:"ts17",uid:"u7",sid:"s9",qty:10},
];
const OS0=[
  {id:"os1",uid:"u3",os:"OS-20250523001",client:"Maria Oliveira",cpf:"222.222.222-01",date:"23/05/2025 10:30",items:[{sid:"s6",qty:30},{sid:"s8",qty:2},{sid:"s1",qty:1}],notes:"Instalação FTTH"},
  {id:"os2",uid:"u4",os:"OS-20250522045",client:"Roberto Costa",cpf:"222.222.222-02",date:"22/05/2025 14:00",items:[{sid:"s7",qty:50},{sid:"s2",qty:1}],notes:"Manutenção rede"},
  {id:"os3",uid:"u5",os:"OS-20250521032",client:"Ana Souza",cpf:"222.222.222-03",date:"21/05/2025 10:15",items:[{sid:"s6",qty:40},{sid:"s10",qty:5}],notes:"Instalação nova"},
];
const RET0=[
  {id:"r1",uid:"u4",date:"23/05/2025 09:15",items:[{sid:"s6",qty:20},{sid:"s9",qty:3}],status:"pending",notes:"Sobrou do serviço",rDate:null,rBy:null},
  {id:"r2",uid:"u5",date:"22/05/2025 14:20",items:[{sid:"s6",qty:15}],status:"approved",notes:"Material excedente",rDate:"22/05/2025 16:30",rBy:"Administrador"},
];
const NF0=[
  {id:"nf1",num:"NF-1258",supplier:"Fiber Total",date:"2025-05-22",items:[{sid:"s6",qty:500,val:425},{sid:"s8",qty:100,val:160}],total:585,obs:"Compra mensal"},
  {id:"nf2",num:"NF-1201",supplier:"Óptica Sul",date:"2025-05-10",items:[{sid:"s1",qty:20,val:3600},{sid:"s2",qty:15,val:2700}],total:6300,obs:"Equipamentos CPE"},
];
const LOGS0=[
  {id:"l1",date:"23/05/2025 10:30",user:"João Silva",action:"Saída",detail:"Liberação · OS-20250523001",tipo:"saida"},
  {id:"l2",date:"23/05/2025 09:15",user:"Carlos Alberto",action:"Devolução Solicitada",detail:"OS-20250522045",tipo:"dev"},
  {id:"l3",date:"22/05/2025 16:45",user:"Administrador",action:"Entrada",detail:"NF-1258 · Fiber Total",tipo:"entrada"},
  {id:"l4",date:"22/05/2025 14:20",user:"Administrador",action:"Devolução Aprovada",detail:"Técnico: João Paulo",tipo:"aprovada"},
];
