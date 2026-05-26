// StockTel v1.1 build 20260525_193511 - filtro periodo relatorio admin
import { useState, useMemo, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import { sbGet, sbSet } from "./supabase.js";

const C={bg:"#161616",surf:"#1e1e1e",card:"#252525",bdr:"#2a2a2a",bdr2:"#333333",gold:"#cc0000",goldD:"#cc000022",goldL:"#e00000",red:"#cc0000",redD:"#cc000022",grn:"#43a047",grnD:"#43a04722",ylw:"#fb8c00",ylwD:"#fb8c0022",blue:"#1e88e5",txt:"#ffffff",txt2:"#cccccc",muted:"#888888",muted2:"#555555"};
const PIE=["#cc0000","#666666","#999999","#444444","#aaaaaa"];
const ALL_MODULES=[
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
const DEFAULT_PERMS={
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
let _id=300;
const uid=()=>`${++_id}_${Date.now()}`;
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
    }).catch(()=>{});
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

const USERS0=[
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

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html{font-size:16px;}
body{background:#141414;font-family:'Inter',sans-serif;-webkit-text-size-adjust:100%;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:#1c1c1c;}
::-webkit-scrollbar-thumb{background:#333;border-radius:4px;}
button{cursor:pointer;border:none;font-family:'Inter',sans-serif;}
input,select,textarea{font-family:'Inter',sans-serif;border:none;outline:none;}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:none}}
@keyframes slideLeft{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:none}}
.fi{animation:fadeIn .2s ease}
.su{animation:slideUp .25s ease}
.sl{animation:slideLeft .25s ease}
`;

/* ── ATOMS ── */
function Btn({children,onClick,color="gold",size="md",disabled,style:sx={},outline,full}){
  const pal={gold:{bg:C.gold,fg:"#000"},red:{bg:C.red,fg:"#fff"},grn:{bg:C.grn,fg:"#fff"},ghost:{bg:"transparent",fg:C.muted}};
  const p=pal[color]||pal.gold;
  const sz={xs:{padding:"4px 10px",fontSize:11},sm:{padding:"7px 14px",fontSize:12},md:{padding:"10px 20px",fontSize:13},lg:{padding:"13px 24px",fontSize:15}}[size];
  return <button onClick={onClick} disabled={disabled} style={{background:outline?"transparent":p.bg,color:outline?p.bg:p.fg,border:outline?`1.5px solid ${p.bg}`:"none",borderRadius:8,fontWeight:600,opacity:disabled?.4:1,width:full?"100%":"auto",transition:"opacity .15s",...sz,...sx}}>{children}</button>;
}
function Inp({label,value,onChange,type="text",placeholder,style:sx={}}){
  return <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase"}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"11px 14px",color:C.txt,fontSize:14,width:"100%",...sx}}/>
  </div>;
}
function Sel({label,value,onChange,options,style:sx={}}){
  return <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase"}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"11px 14px",color:C.txt,fontSize:14,width:"100%",...sx}}>
      {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>;
}
function Card({children,style:sx={},onClick}){
  return <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:12,...sx}}>{children}</div>;
}
function Bdg({children,color="gold"}){
  const p={gold:{bg:C.goldD,fg:C.gold},red:{bg:C.redD,fg:C.red},grn:{bg:C.grnD,fg:C.grn},ylw:{bg:C.ylwD,fg:C.ylw},muted:{bg:"#88888820",fg:C.muted}}[color]||{bg:C.goldD,fg:C.gold};
  return <span style={{background:p.bg,color:p.fg,padding:"3px 10px",borderRadius:5,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",whiteSpace:"nowrap"}}>{children}</span>;
}
function Modal({title,children,onClose,isMobile}){
  return <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:"16px"}}>
    <div className={isMobile?"su":"fi"} style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,padding:isMobile?"20px 16px 32px":28,width:"100%",maxWidth:isMobile?"100%":680,maxHeight:isMobile?"90vh":"85vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${C.bdr}`}}>
        <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>{title}</h2>
        <button onClick={onClose} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      {children}
    </div>
  </div>;
}
function THead({cols}){
  return <tr>{cols.map((c,i)=><th key={i} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",background:C.surf,borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{c}</th>)}</tr>;
}
function TRow({cells}){
  return <tr style={{borderBottom:`1px solid ${C.bdr}22`}}>
    {cells.map((c,i)=><td key={i} style={{padding:"10px 12px",fontSize:13,color:C.txt2,verticalAlign:"middle"}}>{c}</td>)}
  </tr>;
}

/* ── LOGIN ── */
function LoginPage({users,onLogin}){
  const[login,setLogin]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const isMobile=useIsMobile();
  const go=()=>{const u=users.find(u=>u.login===login&&u.pass===pass);if(u)onLogin(u);else setErr("Login ou senha inválidos.");};
  const handleKey=e=>{if(e.key==="Enter")go();};
  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"16px":"20px"}}>
    <style>{CSS}</style>
    <div style={{position:"fixed",inset:0,backgroundImage:`radial-gradient(ellipse at 50% 0%,${C.gold}18 0%,transparent 60%)`,pointerEvents:"none"}}/>
    <div className="fi" style={{width:"100%",maxWidth:400,position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <img src="/logo-stocktel.png" alt="StockTel" style={{width:"100%",maxWidth:isMobile?260:320,objectFit:"contain",marginBottom:12}}/>
        <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".12em",textTransform:"uppercase"}}>Soluções em Telecomunicações</div>
      </div>
      <Card style={{padding:isMobile?20:28,display:"flex",flexDirection:"column",gap:16,borderRadius:16}}>
        <Inp label="Login" value={login} onChange={setLogin} placeholder="Seu usuário"/>
        <Inp label="Senha" value={pass} onChange={setPass} type="password" placeholder="Sua senha" style={{}} />
        {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {err}</div>}
        <Btn onClick={go} color="gold" size="lg" style={{width:"100%",borderRadius:10,marginTop:4}}>Entrar</Btn>
      </Card>
      <div style={{marginTop:14,textAlign:"center",fontSize:11,color:C.muted2}}>StockTel v1.0.0</div>
    </div>
  </div>;
}

/* ── SIDEBAR DESKTOP ── */
function Sidebar({user,page,setPage,onLogout}){
  const perms=user.perms||DEFAULT_PERMS[user.role]||["dash"];
  const nav=ALL_MODULES.filter(m=>perms.includes(m.k)).map(m=>({k:m.k,icon:m.icon,label:m.l}));
  return <div style={{width:220,minWidth:220,background:C.surf,borderRight:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column",height:"100vh",flexShrink:0}}>
    <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <img src="/logo-stocktel.png" alt="StockTel" style={{width:"100%",maxWidth:160,objectFit:"contain"}}/>
    </div>
    <div style={{padding:"8px 16px 6px",borderBottom:`1px solid ${C.bdr}`}}>
      <div style={{fontSize:10,color:C.muted2,lineHeight:1.4}}>Soluções em Telecomunicações</div>
    </div>
    <nav style={{flex:1,padding:"8px",overflowY:"auto"}}>
      {nav.map(n=>(
        <div key={n.k} onClick={()=>setPage(n.k)}
          style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,cursor:"pointer",marginBottom:2,
            background:page===n.k?"#8b000066":"transparent",
            borderLeft:page===n.k?`3px solid ${C.gold}`:"3px solid transparent",
            color:page===n.k?C.gold:C.muted,fontWeight:page===n.k?600:400,fontSize:13}}>
          <span style={{fontSize:15}}>{n.icon}</span><span>{n.label}</span>
        </div>
      ))}
    </nav>
    <div style={{padding:"10px",borderTop:`1px solid ${C.bdr}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px",background:C.card,borderRadius:8,marginBottom:6}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,overflow:"hidden"}}>
          {user.photo?<img src={user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>👤</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:600,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
          <div style={{fontSize:9,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
        </div>
        <span style={{background:C.gold,color:"#000",fontSize:8,fontWeight:800,padding:"1px 4px",borderRadius:3,flexShrink:0,letterSpacing:".03em"}}>{user.role==="admin"?"ADM":user.role==="estoque"?"EST":"TEC"}</span>
      </div>
      <div onClick={()=>window.dispatchEvent(new CustomEvent("openPerfil"))} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer",color:C.muted,fontSize:12,borderRadius:6}}>
        <span>⚙️</span>Meu Perfil
      </div>
      <div onClick={onLogout} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer",color:C.muted,fontSize:12,borderRadius:6}}>
        <span>🚪</span>Sair
      </div>
    </div>
  </div>;
}

/* ── DRAWER MOBILE (menu lateral deslizante) ── */
function MobileDrawer({user,page,setPage,onLogout,onClose}){
  const perms=user.perms||DEFAULT_PERMS[user.role]||["dash"];
  const nav=ALL_MODULES.filter(m=>perms.includes(m.k)).map(m=>({k:m.k,icon:m.icon,label:m.l}));
  const go=(k)=>{setPage(k);onClose();};
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000aa",zIndex:200}}/>
    <div className="sl" style={{position:"fixed",top:0,left:0,bottom:0,width:280,background:C.surf,zIndex:201,display:"flex",flexDirection:"column",borderRight:`1px solid ${C.bdr}`}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <img src="/logo-stocktel.png" alt="StockTel" style={{height:44,objectFit:"contain"}}/>
        <button onClick={onClose} style={{background:C.card,color:C.muted,width:32,height:32,borderRadius:8,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      <div style={{padding:"10px 14px 8px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,overflow:"hidden"}}>
          {user.photo?<img src={user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>👤</span>}
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.txt}}>{user.name}</div>
          <span style={{background:C.gold,color:"#000",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:3}}>{user.role==="admin"?"ADMINISTRADOR":user.role==="estoque"?"ESTOQUE":"TÉCNICO"}</span>
        </div>
      </div>
      <nav style={{flex:1,padding:"8px",overflowY:"auto"}}>
        {nav.map(n=>(
          <div key={n.k} onClick={()=>go(n.k)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:8,cursor:"pointer",marginBottom:2,
              background:page===n.k?`${C.gold}25`:"transparent",
              borderLeft:page===n.k?`3px solid ${C.gold}`:"3px solid transparent",
              color:page===n.k?C.gold:C.txt2,fontWeight:page===n.k?600:400,fontSize:14}}>
            <span style={{fontSize:18}}>{n.icon}</span><span>{n.label}</span>
          </div>
        ))}
      </nav>
      <div onClick={()=>{window.dispatchEvent(new CustomEvent("openPerfil"));onClose();}} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",cursor:"pointer",color:C.muted,fontSize:14,borderTop:`1px solid ${C.bdr}`,fontWeight:600}}>
        <span>⚙️</span>Meu Perfil
      </div>
      <div onClick={()=>{onLogout();onClose();}} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",cursor:"pointer",color:C.red,fontSize:14,fontWeight:600}}>
        <span>🚪</span>Sair do sistema
      </div>
    </div>
  </>;
}

/* ── TOPBAR ── */
function TopBar({user,pendRet,pendSol,setPage,isMobile,onMenuOpen}){
  return <div style={{height:isMobile?52:56,background:C.surf,borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",padding:isMobile?"0 14px":"0 24px",gap:10,flexShrink:0}}>
    {isMobile&&<button onClick={onMenuOpen} style={{background:"transparent",color:C.muted,fontSize:22,display:"flex",alignItems:"center",padding:4}}>☰</button>}
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:isMobile?13:14,fontWeight:600,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        Olá, <span style={{color:C.gold}}>{user.name.split(" ")[0]}</span>
      </div>
      {!isMobile&&<div style={{fontSize:11,color:C.muted}}>{today()}</div>}
    </div>
    {pendSol>0&&<div onClick={()=>setPage("sol")} style={{display:"flex",alignItems:"center",gap:5,background:`${C.blue}22`,border:`1px solid ${C.blue}44`,borderRadius:6,padding:isMobile?"5px 8px":"5px 12px",cursor:"pointer",flexShrink:0}}>
      <span style={{fontSize:13}}>📋</span>
      <span style={{fontSize:12,color:C.blue,fontWeight:700}}>{pendSol}</span>
      {!isMobile&&<span style={{fontSize:12,color:C.blue,fontWeight:600}}>solicitação{pendSol>1?"ões":""}</span>}
    </div>}
    {pendRet>0&&<div onClick={()=>setPage("dev")} style={{display:"flex",alignItems:"center",gap:5,background:C.ylwD,border:`1px solid ${C.ylw}44`,borderRadius:6,padding:isMobile?"5px 8px":"5px 12px",cursor:"pointer",flexShrink:0}}>
      <span style={{fontSize:13}}>🔔</span>
      {!isMobile&&<span style={{fontSize:12,color:C.ylw,fontWeight:600}}>{pendRet} devolução{pendRet>1?"ões":""}</span>}
      {isMobile&&<span style={{fontSize:12,color:C.ylw,fontWeight:700}}>{pendRet}</span>}
    </div>}
    {!isMobile&&<div style={{width:34,height:34,borderRadius:"50%",background:C.card,border:`1px solid ${C.bdr2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer"}}>🔔</div>}
  </div>;
}

/* ── BOTTOM NAV MOBILE ── */
function BottomNav({page,setPage,user,onMenuOpen}){
  // Pega permissões do usuário e monta nav dinâmico
  const perms=user.perms||DEFAULT_PERMS[user.role]||["dash"];
  const allItems=ALL_MODULES.filter(m=>perms.includes(m.k)).map(m=>({k:m.k,icon:m.icon,label:m.l.split(" ")[0]}));

  // Mostra os 4 primeiros itens + botão Menu
  const visible=allItems.slice(0,5);
  const items=[...visible,{k:"__menu",icon:"☰",label:"Menu"}];

  return <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.surf,borderTop:`1px solid ${C.bdr}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
    {items.map(it=>(
      <div key={it.k} onClick={()=>it.k==="__menu"?onMenuOpen():setPage(it.k)}
        style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 2px 6px",cursor:"pointer",
          color:page===it.k?C.gold:C.muted,
          borderTop:page===it.k?`2px solid ${C.gold}`:"2px solid transparent"}}>
        <span style={{fontSize:19,lineHeight:1}}>{it.icon}</span>
        <span style={{fontSize:8,marginTop:2,fontWeight:page===it.k?700:400,textAlign:"center",maxWidth:46,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.label}</span>
      </div>
    ))}
  </div>;
}


/* ── DASHBOARD ── */
function Dashboard({stock,tstock,users,os,returns,logs,setPage,isMobile,currentUser,pendSol,veiculos=[],abastecimentos=[]}){
  const isTec=currentUser?.role==="tecnico";
  const totalQty=stock.reduce((a,s)=>a+s.qty,0);
  const myTstock=tstock.filter(t=>t.uid===currentUser?.id);
  const myTstockQty=myTstock.reduce((a,t)=>a+t.qty,0);
  const techQty=tstock.reduce((a,t)=>a+t.qty,0);
  const pendRet=returns.filter(r=>r.status==="pending").length;
  const myPendRet=returns.filter(r=>r.uid===currentUser?.id&&r.status==="pending").length;
  const low=stock.filter(s=>s.qty<=s.min);
  const myOs=os.filter(o=>o.uid===currentUser?.id);
  const catData=useMemo(()=>{const m={};stock.forEach(s=>{m[s.cat]=(m[s.cat]||0)+s.qty;});return Object.entries(m).map(([name,value])=>({name,value}));},[stock]);
  const techUsage=useMemo(()=>{const m={};os.forEach(o=>{const u=users.find(x=>x.id===o.uid);const nm=u?.name.split(" ")[0]||"?";const tot=o.items.reduce((a,i)=>a+i.qty,0);if(!m[o.uid])m[o.uid]={name:nm,value:0};m[o.uid].value+=tot;});return Object.values(m).sort((a,b)=>b.value-a.value);},[os,users]);
  const maxU=techUsage[0]?.value||1;
  const lc={saida:C.gold,entrada:C.grn,dev:C.ylw,aprovada:C.grn};
  const li={saida:"→",entrada:"↓",dev:"↺",aprovada:"✓"};

  // ── DASHBOARD DO TÉCNICO ──
  if(isTec) return <div className="fi" style={{display:"flex",flexDirection:"column",gap:isMobile?14:20}}>
    {/* Cards do técnico */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:isMobile?10:16}}>
      {[
        {label:"MEU KIT",value:fmt(myTstockQty),sub:"Materiais em posse",icon:"🎒",color:C.gold},
        {label:"MINHAS OS",value:fmt(myOs.length),sub:"Ordens abertas",icon:"🔧",color:C.blue},
        {label:"DEVOLUÇÕES",value:fmt(myPendRet),sub:"Aguardando",icon:"↩️",color:myPendRet>0?C.ylw:C.gold},
      ].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?"12px":"18px",display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:isMobile?36:48,height:isMobile?36:48,borderRadius:10,background:`${s.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?18:22,flexShrink:0}}>{s.icon}</div>
          <div>
            <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:".06em",marginBottom:2}}>{s.label}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?20:26,fontWeight:800,color:C.txt,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.sub}</div>
          </div>
        </Card>
      ))}
    </div>

    {/* Kit do técnico resumo */}
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.bdr}`}}>
        <span style={{fontSize:13,fontWeight:700,color:C.txt}}>🎒 Meu Kit — Materiais em Posse</span>
        <Btn size="xs" color="gold" outline onClick={()=>setPage("kit")}>Ver tudo</Btn>
      </div>
      {myTstock.length===0
        ?<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Nenhum material no seu kit ainda.</div>
        :myTstock.slice(0,5).map(t=>{const s=stock.find(x=>x.id===t.sid);return s?
          <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:`1px solid ${C.bdr}18`}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{s.name}</div>
              <div style={{fontSize:10,color:C.muted}}>{s.code} · {s.unit}</div>
            </div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:18}}>{fmt(t.qty)}</span>
          </div>:null;
        })
      }
    </Card>

    {/* Últimas OS do técnico */}
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.bdr}`}}>
        <span style={{fontSize:13,fontWeight:700,color:C.txt}}>🔧 Minhas Últimas OS</span>
        <Btn size="xs" color="gold" outline onClick={()=>setPage("os")}>Ver todas</Btn>
      </div>
      {myOs.length===0
        ?<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Nenhuma OS registrada ainda.</div>
        :myOs.slice(0,3).map(o=>(
          <div key={o.id} style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}18`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold,fontWeight:700}}>{o.os}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{o.date}</span>
            </div>
            <div style={{fontSize:12,color:C.txt2,marginTop:2}}>{o.client}</div>
          </div>
        ))
      }
    </Card>

    {/* Ações rápidas técnico */}
    <Card style={{padding:16}}>
      <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Ações Rápidas</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {icon:"🔧",label:"Nova OS",p:"os"},
          {icon:"📋",label:"Solicitar Material",p:"sol"},
          {icon:"↩️",label:"Solicitar Devolução",p:"dev"},
          {icon:"🎒",label:"Meu Kit",p:"kit"},
        ].map((a,i)=>(
          <div key={i} onClick={()=>setPage(a.p)} style={{display:"flex",alignItems:"center",gap:10,padding:"14px",background:C.surf,borderRadius:10,cursor:"pointer",border:`1px solid ${C.bdr}`}}>
            <span style={{fontSize:24}}>{a.icon}</span>
            <span style={{fontSize:13,color:C.txt2,fontWeight:500}}>{a.label}</span>
          </div>
        ))}
      </div>
    </Card>
  </div>;

  // ── DASHBOARD ADMIN/ESTOQUE ──
  const alertasOleo=useMemo(()=>{
    if(!veiculos||veiculos.length===0)return[];
    return veiculos.filter(v=>v.status==="ativo").map(v=>{
      const regs=abastecimentos.filter(a=>a.veiculoId===v.id&&parseInt(a.odometro)>0);
      const kmAtual=regs.length>0?Math.max(...regs.map(a=>parseInt(a.odometro)||0)):parseInt(v.kmCadastro)||0;
      const kmBase=parseInt(v.kmCadastro)||0;
      const proxima=Math.ceil((kmAtual-kmBase+1)/10000)*10000+kmBase;
      const faltam=proxima-kmAtual;
      return{...v,kmAtual,faltam,urgente:faltam<=500,alerta:faltam<=2000};
    }).filter(v=>v.alerta).sort((a,b)=>a.faltam-b.faltam);
  },[veiculos,abastecimentos]);
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:isMobile?14:20}}>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:isMobile?10:16}}>
      {[
        {label:"TOTAL DE ITENS",value:fmt(stock.length),sub:"Itens cadastrados",icon:"📦"},
        {label:"ESTOQUE TOTAL",value:fmt(totalQty),sub:"Unidades disponíveis",icon:"🗄️"},
        {label:"MATERIAIS EM USO",value:fmt(techQty),sub:"Com técnicos",icon:"👷"},
        {label:"DEVOLUÇÕES PEND.",value:fmt(pendRet),sub:"Aguardando aprovação",icon:"↩️"},
      ].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?"12px":"18px",display:"flex",gap:isMobile?10:14,alignItems:"center"}}>
          <div style={{width:isMobile?36:48,height:isMobile?36:48,borderRadius:10,background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?18:22,flexShrink:0}}>{s.icon}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:".06em",marginBottom:2}}>{s.label}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?20:26,fontWeight:800,color:C.txt,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.sub}</div>
          </div>
        </Card>
      ))}
    </div>

    {isMobile?(
      <>
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:`1px solid ${C.bdr}`}}>
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>Movimentações Recentes</span>
            <Btn size="xs" color="ghost" outline onClick={()=>setPage("log")} style={{fontSize:10}}>Ver todas</Btn>
          </div>
          {logs.slice(0,3).map(l=>(
            <div key={l.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 14px",borderBottom:`1px solid ${C.bdr}18`}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:`${lc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,color:lc[l.tipo]||C.gold,fontWeight:700}}>{li[l.tipo]||"·"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:lc[l.tipo]||C.gold}}>{l.action}</div>
                <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.detail}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted2,marginTop:2}}>{l.date}</div>
              </div>
            </div>
          ))}
        </Card>
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:`1px solid ${C.bdr}`}}>
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>Itens com Baixo Nível</span>
            <Btn size="xs" color="ghost" outline onClick={()=>setPage("estoque")} style={{fontSize:10}}>Ver todos</Btn>
          </div>
          {low.slice(0,4).map(s=>{const crit=s.qty<=s.min*0.6;return(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${C.bdr}18`}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                <div style={{fontSize:10,color:C.muted}}>{s.code} · mín: {s.min}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:crit?C.red:C.ylw,fontSize:16}}>{s.qty}</span>
                {crit?<Bdg color="red">Crítico</Bdg>:<Bdg color="ylw">Baixo</Bdg>}
              </div>
            </div>
          );})}
        </Card>
        {alertasOleo.length>0&&<Card style={{padding:0,overflow:"hidden",borderLeft:`3px solid ${alertasOleo.some(a=>a.urgente)?C.red:C.ylw}`}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>⚙️ Alertas de Troca de Óleo</span>
            <Btn size="xs" color="gold" outline onClick={()=>setPage("frota")} style={{fontSize:10}}>Ver Frota</Btn>
          </div>
          {alertasOleo.map(v=>(
            <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${C.bdr}18`}}>
              <div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.gold,fontSize:13}}>{v.placa}</span>
                <span style={{fontSize:12,color:C.muted,marginLeft:8}}>{v.modelo}</span>
              </div>
              {v.urgente?<Bdg color="red">🔴 URGENTE: {fmt(v.faltam)} km</Bdg>:<Bdg color="ylw">🟡 {fmt(v.faltam)} km</Bdg>}
            </div>
          ))}
        </Card>}
        <Card style={{padding:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Ações Rápidas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{icon:"📥",label:"Nova Entrada (NF)",p:"nf"},{icon:"🚀",label:"Liberar Material",p:"dist"},{icon:"↩️",label:"Devoluções",p:"dev"},{icon:"🔧",label:"Nova OS",p:"os"},{icon:"📦",label:"Ver Estoque",p:"estoque"},{icon:"📊",label:"Relatórios",p:"rel"}].map((a,i)=>(
              <div key={i} onClick={()=>setPage(a.p)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px",background:C.surf,borderRadius:10,cursor:"pointer",border:`1px solid ${C.bdr}`}}>
                <span style={{fontSize:22}}>{a.icon}</span>
                <span style={{fontSize:12,color:C.txt2,lineHeight:1.3,fontWeight:500}}>{a.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </>
    ):(
      <>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr",gap:16}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.bdr}`}}>
              <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Movimentações Recentes</span>
              <Btn size="xs" color="ghost" outline onClick={()=>setPage("log")} style={{fontSize:11}}>Ver todas</Btn>
            </div>
            {logs.slice(0,4).map(l=>(
              <div key={l.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 18px",borderBottom:`1px solid ${C.bdr}18`}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${lc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,color:lc[l.tipo]||C.gold,fontWeight:700}}>{li[l.tipo]||"·"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12,fontWeight:700,color:lc[l.tipo]||C.gold}}>{l.action.toUpperCase()}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,flexShrink:0}}>{l.date}</span>
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.detail}</div>
                </div>
              </div>
            ))}
          </Card>
          <Card style={{padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Estoque por Categoria</span>
              <Btn size="xs" color="ghost" outline onClick={()=>setPage("rel")} style={{fontSize:11}}>Relatório</Btn>
            </div>
            <div style={{position:"relative"}}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {catData.map((_,i)=><Cell key={i} fill={PIE[i%PIE.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:800,color:C.txt}}>{fmt(totalQty)}</div>
                <div style={{fontSize:10,color:C.muted}}>Total</div>
              </div>
            </div>
            {catData.map((d,i)=>(
              <div key={d.name} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:5}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:PIE[i%PIE.length]}}/>
                  <span style={{color:C.txt2}}>{d.name}</span>
                </div>
                <span style={{color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{Math.round(d.value/totalQty*100)}%</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:18}}>
            <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>Técnicos - Consumo</div>
            {techUsage.map((t,i)=>(
              <div key={t.name} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,minWidth:16}}>{i+1}</span>
                    <span style={{fontSize:13,color:C.txt,fontWeight:500}}>{t.name}</span>
                  </div>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold,fontWeight:700}}>{fmt(t.value)}</span>
                </div>
                <div style={{height:6,background:C.bdr,borderRadius:3}}>
                  <div style={{height:"100%",width:`${(t.value/maxU)*100}%`,background:i===0?C.gold:"#555",borderRadius:3}}/>
                </div>
              </div>
            ))}
          </Card>
        </div>
        {alertasOleo.length>0&&<Card style={{padding:0,overflow:"hidden",borderLeft:`3px solid ${alertasOleo.some(a=>a.urgente)?C.red:C.ylw}`}}>
          <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:700,color:C.txt}}>⚙️ Alertas de Troca de Óleo</span>
            <Btn size="xs" color="gold" outline onClick={()=>setPage("frota")} style={{fontSize:11}}>Ver Frota</Btn>
          </div>
          <div style={{display:"flex",gap:0,flexWrap:"wrap"}}>
            {alertasOleo.map(v=>(
              <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 18px",borderRight:`1px solid ${C.bdr}`,flex:"1 1 300px",minWidth:280}}>
                <div>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v.placa}</span>
                  <span style={{fontSize:12,color:C.muted,marginLeft:8}}>{v.modelo}</span>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>🛣️ {fmt(v.kmAtual)} km atual</div>
                </div>
                {v.urgente?<Bdg color="red">🔴 URGENTE: faltam {fmt(v.faltam)} km</Bdg>:<Bdg color="ylw">🟡 Faltam {fmt(v.faltam)} km</Bdg>}
              </div>
            ))}
          </div>
        </Card>}
        <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.bdr}`}}>
              <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Itens com Baixo Nível</span>
              <Btn size="xs" color="ghost" outline onClick={()=>setPage("estoque")} style={{fontSize:11}}>Ver todos</Btn>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><THead cols={["CÓDIGO","DESCRIÇÃO","CATEGORIA","ESTOQUE","MÍNIMO","SITUAÇÃO"]}/></thead>
                <tbody>
                  {low.slice(0,5).map(s=>{const crit=s.qty<=s.min*0.6;return <TRow key={s.id} cells={[
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
                    <span style={{fontWeight:500,color:C.txt,fontSize:12}}>{s.name}</span>,
                    <span style={{fontSize:11,color:C.muted}}>{s.cat}</span>,
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:C.ylw,fontSize:13}}>{fmt(s.qty)}</span>,
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{fmt(s.min)}</span>,
                    crit?<Bdg color="red">▲ Crítico</Bdg>:<Bdg color="ylw">● Baixo</Bdg>
                  ]}/>;
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card style={{padding:18}}>
            <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>Ações Rápidas</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{icon:"📥",label:"Nova Entrada",p:"nf"},{icon:"🚀",label:"Liberar Material",p:"dist"},{icon:"↩️",label:"Devolução",p:"dev"},{icon:"🔧",label:"Nova OS",p:"os"},{icon:"📦",label:"Estoque Base",p:"estoque"},{icon:"📊",label:"Relatórios",p:"rel"}].map((a,i)=>(
                <div key={i} onClick={()=>setPage(a.p)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"12px 6px",background:C.surf,borderRadius:8,cursor:"pointer",border:`1px solid ${C.bdr}`,textAlign:"center"}}>
                  <span style={{fontSize:20}}>{a.icon}</span>
                  <span style={{fontSize:10,color:C.muted2,lineHeight:1.3}}>{a.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </>
    )}
  </div>;
}

function EstoquePage({stock,setStock,isAdmin,addLog,currentUser,isMobile}){
  const[q,setQ]=useState("");
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({code:"",name:"",cat:"Equipamentos",unit:"un",qty:"",min:""});
  const cats=["Equipamentos","Cabos e Fios","Conectores","Caixas e Acessórios","Acessórios","Ferramentas"];
  const filtered=stock.filter(s=>s.name.toLowerCase().includes(q.toLowerCase())||s.code.toLowerCase().includes(q.toLowerCase()));
  const save=()=>{
    if(!form.name||!form.qty)return;
    if(modal==="new")setStock(p=>[...p,{id:uid(),code:form.code,name:form.name,cat:form.cat,unit:form.unit,qty:parseInt(form.qty)||0,min:parseInt(form.min)||0}]);
    else setStock(p=>p.map(s=>s.id===modal?{...s,...form,qty:parseInt(form.qty)||0,min:parseInt(form.min)||0}:s));
    addLog(currentUser.name,modal==="new"?"Entrada":"Edição",form.name);
    setModal(null);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Estoque Base</h1></div>
      <div style={{display:"flex",gap:8,width:isMobile?"100%":"auto"}}>
        <Inp value={q} onChange={setQ} placeholder="🔍 Buscar..." style={{flex:1}}/>
        {isAdmin&&<Btn onClick={()=>{setForm({code:"",name:"",cat:"Equipamentos",unit:"un",qty:"",min:""});setModal("new");}} size="sm">+ Novo</Btn>}
      </div>
    </div>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(s=>{const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;return(
          <Card key={s.id} style={{padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.txt,marginBottom:2}}>{s.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{s.code} · {s.cat} · {s.unit}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0,marginLeft:10}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:crit?C.red:low?C.ylw:C.txt,fontSize:22}}>{fmt(s.qty)}</span>
                {crit?<Bdg color="red">Crítico</Bdg>:low?<Bdg color="ylw">Baixo</Bdg>:<Bdg color="grn">OK</Bdg>}
                {isAdmin&&<Btn size="xs" color="gold" outline onClick={()=>{setForm({code:s.code,name:s.name,cat:s.cat,unit:s.unit,qty:String(s.qty),min:String(s.min)});setModal(s.id);}}>Editar</Btn>}
              </div>
            </div>
            <div style={{marginTop:8,height:4,background:C.bdr,borderRadius:2}}>
              <div style={{height:"100%",width:`${Math.min(100,(s.qty/Math.max(s.min,1))*100)}%`,background:crit?C.red:low?C.ylw:C.grn,borderRadius:2}}/>
            </div>
            <div style={{fontSize:10,color:C.muted,marginTop:4}}>Mínimo: {s.min} {s.unit}</div>
          </Card>
        );})}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÓDIGO","DESCRIÇÃO","CATEGORIA","UNID.","QTD ATUAL","QTD MÍN.","SITUAÇÃO",isAdmin?"AÇÕES":""]}/></thead>
            <tbody>
              {filtered.map(s=>{const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;return <TRow key={s.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
                <span style={{fontWeight:500,color:C.txt}}>{s.name}</span>,
                <span style={{fontSize:12,color:C.muted}}>{s.cat}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.unit}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:low?C.ylw:C.txt,fontSize:14}}>{fmt(s.qty)}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{fmt(s.min)}</span>,
                crit?<Bdg color="red">▲ Crítico</Bdg>:low?<Bdg color="ylw">● Baixo</Bdg>:<Bdg color="grn">✓ OK</Bdg>,
                isAdmin?<div style={{display:"flex",gap:6}}>
                  <Btn size="xs" color="gold" outline onClick={()=>{setForm({code:s.code,name:s.name,cat:s.cat,unit:s.unit,qty:String(s.qty),min:String(s.min)});setModal(s.id);}}>Editar</Btn>
                  <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${s.name}"?`)){setStock(p=>p.filter(x=>x.id!==s.id));addLog(currentUser.name,"Remoção",s.name);}}}>✕</Btn>
                </div>:<span/>
              ]}/>;
              })}
            </tbody>
          </table>
        </div>
      </Card>
    )}
    {modal&&<Modal title={modal==="new"?"Novo Item":"Editar Item"} onClose={()=>setModal(null)} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Inp label="Código" value={form.code} onChange={v=>setForm(f=>({...f,code:v}))} placeholder="ONU-001"/>
          <Sel label="Categoria" value={form.cat} onChange={v=>setForm(f=>({...f,cat:v}))} options={cats.map(c=>({value:c,label:c}))}/>
        </div>
        <Inp label="Nome do Material *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Inp label="Unidade" value={form.unit} onChange={v=>setForm(f=>({...f,unit:v}))}/>
          <Inp label="Quantidade *" value={form.qty} onChange={v=>setForm(f=>({...f,qty:v}))} type="number"/>
          <Inp label="Qtd Mínima" value={form.min} onChange={v=>setForm(f=>({...f,min:v}))} type="number"/>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <Btn color="ghost" outline onClick={()=>setModal(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}


/* ── COMPONENTE REUTILIZÁVEL: Lista de itens estilo botão + lista ── */
function ItemList({items,onAdd,onUpdate,onRemove,stockOptions,isMobile,label,addLabel,showObs,showVal}){
  return <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {label&&<div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:2}}>{label} <span style={{background:`${C.gold}22`,color:C.gold,fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4,marginLeft:6}}>{items.filter(r=>r.sid&&parseInt(r.qty)>0).length} item(s)</span></div>}
    {items.map((it,idx)=>{
      const s=it.sid?stockOptions.find(x=>x.id===it.sid):null;
      return <div key={it.id} style={{display:"flex",alignItems:"flex-start",gap:8,background:it.sid?`${C.gold}08`:C.surf,borderRadius:10,padding:"10px 12px",border:`1px solid ${it.sid?`${C.gold}44`:C.bdr2}`}}>
        <div style={{width:24,height:24,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.gold,flexShrink:0,marginTop:2}}>{idx+1}</div>
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
          <select value={it.sid} onChange={e=>onUpdate(it.id,"sid",e.target.value)}
            style={{width:"100%",background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"9px 10px",color:it.sid?C.txt:C.muted,fontSize:13}}>
            <option value="">— Selecionar material —</option>
            {stockOptions.map(s=><option key={s.id} value={s.id}>[{s.code||"—"}] {s.name} ({s.qty} {s.unit})</option>)}
          </select>
          {s&&<div style={{fontSize:10,color:C.grn}}>✓ {s.name} · Disponível: <strong>{s.qty}</strong> {s.unit}</div>}
          <div style={{display:"flex",gap:6,flexWrap:isMobile?"wrap":"nowrap"}}>
            <input type="number" value={it.qty} onChange={e=>onUpdate(it.id,"qty",e.target.value)}
              placeholder="Quantidade" min="0"
              style={{width:isMobile?"100%":110,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:14,fontWeight:700,textAlign:"center",flex:isMobile?1:"none"}}/>
            {showVal&&<input type="number" value={it.val||""} onChange={e=>onUpdate(it.id,"val",e.target.value)}
              placeholder="Valor R$" min="0"
              style={{width:isMobile?"100%":120,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:13,flex:isMobile?1:"none"}}/>}
            {showObs&&<input type="text" value={it.obs||""} onChange={e=>onUpdate(it.id,"obs",e.target.value)}
              placeholder="Obs (opcional)"
              style={{flex:1,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:13}}/>}
          </div>
        </div>
        <button onClick={()=>onRemove(it.id)} style={{background:C.redD,color:C.red,border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>✕</button>
      </div>;
    })}
    <button onClick={onAdd} style={{
      width:"100%",padding:"13px",
      background:items.length===0?`${C.gold}18`:"transparent",
      border:`2px dashed ${C.gold}`,
      borderRadius:10,color:C.gold,
      cursor:"pointer",fontSize:13,fontWeight:700,
      display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      <span style={{fontSize:20,lineHeight:1}}>+</span>
      {items.length===0?(addLabel||"Clique para adicionar o primeiro material"):"Adicionar mais um material"}
    </button>
    {items.length===0&&<div style={{textAlign:"center",fontSize:11,color:C.muted2,marginTop:-4}}>Adicione os materiais e envie tudo junto no final</div>}
  </div>;
}

/* ── DIST ── */
function DistPage({stock,setStock,tstock,setTstock,users,addLog,currentUser,isMobile}){
  const techs=users.filter(u=>u.role==="tecnico");
  const[techId,setTechId]=useState(techs[0]?.id||"");
  const[items,setItems]=useState([]);
  const[msg,setMsg]=useState("");
  const blank=()=>({id:uid(),sid:"",qty:""});
  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));
  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);

  const send=()=>{
    if(!validItems.length){setMsg("err:Adicione ao menos 1 material.");return;}
    let ok=true;
    validItems.forEach(r=>{const si=stock.find(s=>s.id===r.sid);if(!si||si.qty<parseInt(r.qty)){ok=false;alert("Estoque insuficiente: "+(si?.name||r.sid));}});
    if(!ok)return;
    setStock(p=>p.map(s=>{const it=validItems.find(r=>r.sid===s.id);return it?{...s,qty:s.qty-parseInt(it.qty)}:s;}));
    setTstock(p=>{let n=[...p];validItems.forEach(r=>{const ex=n.find(t=>t.uid===techId&&t.sid===r.sid);if(ex)n=n.map(t=>t.id===ex.id?{...t,qty:t.qty+parseInt(r.qty)}:t);else n.push({id:uid(),uid:techId,sid:r.sid,qty:parseInt(r.qty)});});return n;});
    const tech=users.find(u=>u.id===techId);
    addLog(currentUser.name,"Saída","Liberação · "+tech?.name+" · "+validItems.length+" item(s)");
    setMsg("ok:✅ Liberado para "+tech?.name+"!");
    setItems([]);
    setTimeout(()=>setMsg(""),4000);
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Saída / Liberação de Materiais</h1>
    {msg&&<div style={{background:msg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${msg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{msg.replace(/^(ok|err):/,"")}</div>}
    <Card style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <Sel label="Técnico Destinatário" value={techId} onChange={setTechId} options={techs.map(t=>({value:t.id,label:t.name}))}/>
      <ItemList
        items={items}
        onAdd={()=>setItems(p=>[...p,blank()])}
        onUpdate={updItem}
        onRemove={remItem}
        stockOptions={stock}
        isMobile={isMobile}
        label="Materiais a Liberar"
        addLabel="Clique para adicionar o primeiro material a liberar"
      />
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Btn color="gold" onClick={send} disabled={validItems.length===0}>🚀 Liberar {validItems.length>0?validItems.length+" material(is)":""}</Btn>
      </div>
    </Card>
  </div>;
}

/* ── KIT ── */
function KitPage({tstock,stock,users,currentUser,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const[selTech,setSelTech]=useState(users.filter(u=>u.role==="tecnico")[0]?.id||"");
  const viewId=isTec?currentUser.id:selTech;
  const myItems=tstock.filter(t=>t.uid===viewId);
  const tech=users.find(u=>u.id===viewId);
  const total=myItems.reduce((a,t)=>a+t.qty,0);
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>{isTec?"Meu Estoque":"Estoque Técnico"}</h1>
      {!isTec&&<Sel value={selTech} onChange={setSelTech} options={users.filter(u=>u.role==="tecnico").map(t=>({value:t.id,label:t.name}))} style={{width:isMobile?"100%":220}}/>}
    </div>
    {tech&&<Card style={{padding:14,display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:40,height:40,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👷</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt}}>{tech.name}</div>
        <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tech.email}</div>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:10,color:C.muted}}>Total em posse</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:800,color:C.gold}}>{fmt(total)}</div>
      </div>
    </Card>}
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {myItems.length===0?<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum material em posse.</span></Card>
        :myItems.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?<Card key={t.id} style={{padding:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:13,fontWeight:600,color:C.txt}}>{s.name}</div><div style={{fontSize:11,color:C.muted}}>{s.code} · {s.unit}</div></div>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:24}}>{fmt(t.qty)}</span>
        </Card>:null;})}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÓDIGO","MATERIAL","CATEGORIA","UNIDADE","QTD EM POSSE"]}/></thead>
            <tbody>
              {myItems.length===0?<tr><td colSpan={5} style={{padding:30,textAlign:"center",color:C.muted}}>Nenhum material em posse.</td></tr>
              :myItems.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?<TRow key={t.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
                <span style={{fontWeight:500,color:C.txt}}>{s.name}</span>,
                <span style={{fontSize:12,color:C.muted}}>{s.cat}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.unit}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:20}}>{fmt(t.qty)}</span>
              ]}/>:null;})}
            </tbody>
          </table>
        </div>
      </Card>
    )}
  </div>;
}

/* ── OS ── */
function OSPage({os,setOs,tstock,setTstock,stock,users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const[modal,setModal]=useState(false);
  const[osNum,setOsNum]=useState("");
  const[client,setClient]=useState("");
  const[notes,setNotes]=useState("");
  const[items,setItems]=useState([]);
  const[err,setErr]=useState("");
  const blank=()=>({id:uid(),sid:"",qty:""});
  const myTstock=tstock.filter(t=>t.uid===currentUser.id);
  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));
  const viewOs=isTec?os.filter(o=>o.uid===currentUser.id):os;
  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);
  const myStockOpts=myTstock.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?{...s,qty:t.qty}:null;}).filter(Boolean);

  const save=()=>{
    if(!osNum.trim()){setErr("Informe o número da OS.");return;}
    if(!client.trim()){setErr("Informe o nome do cliente.");return;}
    if(!validItems.length){setErr("Adicione ao menos 1 material.");return;}
    let ok=true;
    validItems.forEach(r=>{const ts=myTstock.find(t=>t.sid===r.sid);if(!ts||ts.qty<parseInt(r.qty)){ok=false;setErr("Qtd insuficiente: "+(stock.find(s=>s.id===r.sid)?.name));}});
    if(!ok)return;
    setOs(p=>[{id:uid(),uid:currentUser.id,os:osNum.trim(),client:client.trim(),date:now(),items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),notes},...p]);
    setTstock(p=>p.map(t=>{const it=validItems.find(r=>r.sid===t.sid&&t.uid===currentUser.id);return it?{...t,qty:t.qty-parseInt(it.qty)}:t;}));
    addLog(currentUser.name,"Saída","OS: "+osNum.trim()+" · "+client.trim());
    setModal(false);setErr("");setOsNum("");setClient("");setNotes("");setItems([]);
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Ordens de Serviço</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Registro de materiais utilizados por OS</p>
      </div>
      {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setItems([]);setOsNum("");setClient("");setNotes("");setErr("");setModal(true);}}>+ Nova OS</Btn>}
    </div>

    {viewOs.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted,fontSize:13}}>Nenhuma OS registrada.</span></Card>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {viewOs.map(o=>{
        const tech=users.find(u=>u.id===o.uid);
        return <Card key={o.id} style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:12}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:15}}>{o.os}</span>
                <span style={{fontSize:14,fontWeight:700,color:C.txt}}>{o.client}</span>
                {!isTec&&<span style={{fontSize:12,color:C.muted}}>· {tech?.name||"?"}</span>}
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,marginTop:4}}>{o.date}</div>
              {o.notes&&<div style={{fontSize:12,color:C.muted,marginTop:4,fontStyle:"italic"}}>📝 {o.notes}</div>}
            </div>
            <Bdg color="grn">✓ Concluída</Bdg>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Materiais Utilizados</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
            {o.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
              <div key={i} style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"—"}</div>
                <div style={{fontSize:12,fontWeight:600,color:C.txt,lineHeight:1.3,marginTop:2}}>{s?.name||"?"}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                  <span style={{fontSize:10,color:C.muted}}>{s?.unit||""}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>{fmt(it.qty)}</span>
                </div>
              </div>
            );})}
          </div>
        </Card>;
      })}
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:600,maxHeight:isMobile?"92vh":"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>🔧 Nova OS</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} material(is) adicionado(s)</div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Inp label="Nº da OS *" value={osNum} onChange={setOsNum} placeholder="OS-20250523001"/>
            <Inp label="Cliente *" value={client} onChange={setClient} placeholder="Nome do cliente"/>
          </div>
          <Inp label="Observação / Tipo de Serviço" value={notes} onChange={setNotes} placeholder="Ex: Instalação FTTH, Manutenção..."/>
          <ItemList
            items={items}
            onAdd={()=>setItems(p=>[...p,blank()])}
            onUpdate={updItem}
            onRemove={remItem}
            stockOptions={myStockOpts}
            isMobile={isMobile}
            label="Materiais Utilizados"
            addLabel="Clique para adicionar o primeiro material utilizado"
          />
          {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {err}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={save} disabled={validItems.length===0}>✅ Confirmar Baixa</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

/* ── DEVOLUÇÕES ── */
function DevPage({returns,setReturns,tstock,setTstock,stock,users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const[modal,setModal]=useState(false);
  const[items,setItems]=useState([]);
  const[notes,setNotes]=useState("");
  const myTstock=tstock.filter(t=>t.uid===currentUser.id);
  const blank=()=>({id:uid(),sid:"",qty:""});
  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));
  const viewRet=isTec?returns.filter(r=>r.uid===currentUser.id):returns;
  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);

  const submit=()=>{
    if(!validItems.length)return;
    setReturns(p=>[{id:uid(),uid:currentUser.id,date:now(),items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),status:"pending",notes,rDate:null,rBy:null},...p]);
    addLog(currentUser.name,"Devolução Solicitada",currentUser.name+" · "+validItems.length+" item(s)");
    setModal(false);setItems([]);setNotes("");
  };

  const approve=(r)=>{
    setTstock(p=>p.map(t=>{const it=r.items.find(i=>i.sid===t.sid&&t.uid===r.uid);return it?{...t,qty:Math.max(0,t.qty-it.qty)}:t;}));
    setReturns(p=>p.map(x=>x.id===r.id?{...x,status:"approved",rDate:now(),rBy:currentUser.name}:x));
    addLog(currentUser.name,"Devolução Aprovada","Técnico: "+(users.find(u=>u.id===r.uid)?.name));
  };

  const sc={pending:"ylw",approved:"grn",rejected:"red"};
  const sl={pending:"⏳ Pendente",approved:"✅ Aprovada",rejected:"❌ Rejeitada"};

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Devoluções</h1>
      {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setItems([]);setNotes("");setModal(true);}}>↩ Solicitar Devolução</Btn>}
    </div>

    {viewRet.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted,fontSize:13}}>Nenhuma devolução registrada.</span></Card>}
    {viewRet.map(r=>{
      const tech=users.find(u=>u.id===r.uid);
      return <Card key={r.id} style={{padding:16,borderLeft:`3px solid ${r.status==="pending"?C.ylw:r.status==="approved"?C.grn:C.red}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:10}}>
              <Bdg color={sc[r.status]}>{sl[r.status]}</Bdg>
              <span style={{fontSize:13,fontWeight:700,color:C.txt}}>{tech?.name||"?"}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{r.date}</span>
            </div>
            {r.notes&&<div style={{fontSize:12,color:C.muted,marginBottom:8,fontStyle:"italic"}}>"{r.notes}"</div>}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
              {r.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
                <div key={i} style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"—"}</div>
                  <div style={{fontSize:12,fontWeight:600,color:C.txt,lineHeight:1.3,marginTop:2}}>{s?.name||"?"}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                    <span style={{fontSize:10,color:C.muted}}>{s?.unit||""}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>{fmt(it.qty)}</span>
                  </div>
                </div>
              );})}
            </div>
            {r.rBy&&<div style={{fontSize:11,color:C.muted,marginTop:8}}>{sl[r.status]} por <strong style={{color:C.txt2}}>{r.rBy}</strong> em {r.rDate}</div>}
          </div>
          {!isTec&&r.status==="pending"&&<div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
            <Btn size="sm" color="grn" onClick={()=>approve(r)}>✓ Aprovar</Btn>
            <Btn size="sm" color="red" outline onClick={()=>setReturns(p=>p.map(x=>x.id===r.id?{...x,status:"rejected",rDate:now(),rBy:currentUser.name}:x))}>✕ Rejeitar</Btn>
          </div>}
        </div>
      </Card>;
    })}

    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:560,maxHeight:isMobile?"92vh":"85vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>↩ Solicitar Devolução</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} material(is) selecionado(s)</div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Inp label="Observação" value={notes} onChange={setNotes} placeholder="Ex: Sobrou do serviço, OS-001..."/>
          <ItemList
            items={items}
            onAdd={()=>setItems(p=>[...p,blank()])}
            onUpdate={updItem}
            onRemove={remItem}
            stockOptions={myTstock.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?{...s,qty:t.qty}:null;}).filter(Boolean)}
            isMobile={isMobile}
            label="Materiais a Devolver"
            addLabel="Clique para adicionar o primeiro material a devolver"
          />
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={submit} disabled={validItems.length===0}>📤 Enviar {validItems.length>0?validItems.length+" item(is)":""}</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

/* ── NF ── */
function NFPage({nf,setNf,stock,setStock,addLog,currentUser,isMobile}){
  const CATS=["Equipamentos","Cabos e Fios","Conectores","Caixas e Acessórios","Acessórios","Ferramentas"];
  const blank=()=>({id:uid(),sid:"",qty:"",val:""});
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({num:"",supplier:"",date:"",obs:""});
  const[items,setItems]=useState([]);
  const[novoMat,setNovoMat]=useState(null);
  const[formNM,setFormNM]=useState({code:"",name:"",cat:"Equipamentos",unit:"un",min:"0"});
  const[err,setErr]=useState("");

  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));
  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);
  const totalPreview=items.reduce((a,r)=>a+(parseFloat(r.val)||0),0);

  const salvarNM=()=>{
    if(!formNM.name.trim())return;
    const nm={id:uid(),code:formNM.code,name:formNM.name.trim(),cat:formNM.cat,unit:formNM.unit,qty:0,min:parseInt(formNM.min)||0};
    setStock(p=>[...p,nm]);
    updItem(novoMat,"sid",nm.id);
    addLog(currentUser.name,"Novo Material","Via NF: "+nm.name);
    setNovoMat(null);
    setFormNM({code:"",name:"",cat:"Equipamentos",unit:"un",min:"0"});
  };

  const abrirModal=()=>{setForm({num:"",supplier:"",date:"",obs:""});setItems([]);setErr("");setNovoMat(null);setModal(true);};

  const save=()=>{
    if(!form.num.trim()){setErr("Informe o número da NF.");return;}
    if(!form.supplier.trim()){setErr("Informe o fornecedor.");return;}
    if(!validItems.length){setErr("Adicione ao menos 1 item com material e quantidade.");return;}
    const total=validItems.reduce((a,r)=>a+(parseFloat(r.val)||0),0);
    setNf(p=>[{id:uid(),num:form.num.trim(),supplier:form.supplier.trim(),date:form.date,obs:form.obs,
      items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty),val:parseFloat(r.val)||0})),
      total,registeredBy:currentUser.name,registeredAt:now()},...p]);
    setStock(p=>p.map(s=>{const it=validItems.find(r=>r.sid===s.id);return it?{...s,qty:s.qty+parseInt(it.qty)}:s;}));
    addLog(currentUser.name,"Entrada","NF: "+form.num.trim()+" · "+form.supplier.trim()+" · "+validItems.length+" item(s)");
    setModal(false);
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Entrada de Materiais</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Registro de notas fiscais com entrada automática no estoque</p>
      </div>
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={abrirModal}>+ Nova NF</Btn>
    </div>

    {nf.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{fontSize:13,color:C.muted}}>Nenhuma nota fiscal registrada ainda.</span></Card>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {nf.map(n=>(
        <Card key={n.id} style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:10}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:15}}>{n.num}</span>
                <span style={{fontSize:13,color:C.txt,fontWeight:600}}>{n.supplier}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{n.date}</span>
                {n.registeredBy&&<span style={{fontSize:11,color:C.muted}}>· {n.registeredBy}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6,marginBottom:6}}>
                {n.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
                  <div key={i} style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"—"}</div>
                    <div style={{fontSize:12,fontWeight:600,color:C.txt,lineHeight:1.3,marginTop:2}}>{s?.name||"?"}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.grn,fontSize:13}}>+{fmt(it.qty)} {s?.unit||""}</span>
                      {it.val>0&&<span style={{fontSize:10,color:C.muted}}>R${fmt(it.val)}</span>}
                    </div>
                  </div>
                );})}
              </div>
              {n.obs&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>📝 {n.obs}</div>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:10,color:C.muted}}>TOTAL</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:800,color:C.grn}}>R$ {fmt(n.total)}</div>
              <div style={{fontSize:10,color:C.muted}}>{n.items.length} item(s)</div>
            </div>
          </div>
        </Card>
      ))}
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:640,height:isMobile?"95vh":"90vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>📥 Nova Nota Fiscal</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} item(s) · Total: <span style={{color:C.grn,fontWeight:700}}>R$ {fmt(totalPreview)}</span></div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".08em",marginBottom:10}}>📄 DADOS DA NOTA FISCAL</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
              <Inp label="Número da NF *" value={form.num} onChange={v=>setForm(f=>({...f,num:v}))} placeholder="Ex: NF-1259"/>
              <Inp label="Fornecedor / Empresa *" value={form.supplier} onChange={v=>setForm(f=>({...f,supplier:v}))} placeholder="Nome do fornecedor"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginTop:10}}>
              <Inp label="Data da Compra" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date"/>
              <Inp label="Observação" value={form.obs} onChange={v=>setForm(f=>({...f,obs:v}))} placeholder="Opcional"/>
            </div>
          </div>

          {/* Itens usando ItemList + botão novo material inline */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:2}}>
              Itens da Nota <span style={{background:`${C.gold}22`,color:C.gold,fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4,marginLeft:6}}>{validItems.length} item(s)</span>
            </div>
            {items.map((it,idx)=>{
              const s=it.sid?stock.find(x=>x.id===it.sid):null;
              return <div key={it.id} style={{display:"flex",alignItems:"flex-start",gap:8,background:it.sid?`${C.gold}08`:C.surf,borderRadius:10,padding:"10px 12px",border:`1px solid ${it.sid?`${C.gold}44`:C.bdr2}`}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.gold,flexShrink:0,marginTop:2}}>{idx+1}</div>
                <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <select value={it.sid} onChange={e=>updItem(it.id,"sid",e.target.value)}
                      style={{flex:1,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"9px 10px",color:it.sid?C.txt:C.muted,fontSize:13}}>
                      <option value="">— Selecionar material —</option>
                      {stock.map(s=><option key={s.id} value={s.id}>[{s.code||"—"}] {s.name} ({s.qty} {s.unit})</option>)}
                    </select>
                    <button onClick={()=>{setNovoMat(it.id);setFormNM({code:"",name:"",cat:"Equipamentos",unit:"un",min:"0"});}}
                      title="Novo material" style={{background:`${C.gold}22`,color:C.gold,border:`1px solid ${C.gold}55`,borderRadius:7,width:32,height:36,cursor:"pointer",fontWeight:800,fontSize:16,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                  </div>
                  {s&&<div style={{fontSize:10,color:C.grn}}>✓ {s.name} · Estoque: {s.qty} {s.unit}</div>}
                  {novoMat===it.id&&<div style={{background:`${C.gold}11`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:10}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:8}}>✨ Cadastrar Novo Material</div>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginBottom:8}}>
                      <Inp label="Código" value={formNM.code} onChange={v=>setFormNM(f=>({...f,code:v}))} placeholder="ONU-010"/>
                      <Inp label="Nome *" value={formNM.name} onChange={v=>setFormNM(f=>({...f,name:v}))} placeholder="Nome completo"/>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                      <Sel label="Categoria" value={formNM.cat} onChange={v=>setFormNM(f=>({...f,cat:v}))} options={CATS.map(c=>({value:c,label:c}))}/>
                      <Inp label="Unidade" value={formNM.unit} onChange={v=>setFormNM(f=>({...f,unit:v}))} placeholder="un, m..."/>
                      <Inp label="Qtd Mín." value={formNM.min} onChange={v=>setFormNM(f=>({...f,min:v}))} type="number"/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <Btn size="sm" color="ghost" outline onClick={()=>setNovoMat(null)}>Cancelar</Btn>
                      <Btn size="sm" color="gold" onClick={salvarNM}>✓ Cadastrar e Selecionar</Btn>
                    </div>
                  </div>}
                  <div style={{display:"flex",gap:6}}>
                    <input type="number" value={it.qty} onChange={e=>updItem(it.id,"qty",e.target.value)} placeholder="Quantidade" min="0"
                      style={{flex:1,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:14,fontWeight:700,textAlign:"center"}}/>
                    <input type="number" value={it.val||""} onChange={e=>updItem(it.id,"val",e.target.value)} placeholder="Valor R$" min="0"
                      style={{flex:1,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:13}}/>
                  </div>
                </div>
                <button onClick={()=>remItem(it.id)} style={{background:C.redD,color:C.red,border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>✕</button>
              </div>;
            })}
            <button onClick={()=>setItems(p=>[...p,blank()])} style={{width:"100%",padding:"13px",background:items.length===0?`${C.gold}18`:"transparent",border:`2px dashed ${C.gold}`,borderRadius:10,color:C.gold,cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <span style={{fontSize:20,lineHeight:1}}>+</span>
              {items.length===0?"Clique para adicionar o primeiro item da nota":"Adicionar mais um item"}
            </button>
            {items.length===0&&<div style={{textAlign:"center",fontSize:11,color:C.muted2,marginTop:-4}}>Adicione todos os itens da nota e registre no final</div>}
          </div>

          {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {err}</div>}
        </div>

        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:18}}>R$ {fmt(totalPreview)}</span>
            <span style={{fontSize:12,color:C.muted,marginLeft:8}}>{validItems.length} item(s)</span>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn color="gold" onClick={save} disabled={validItems.length===0}>✅ Registrar Nota Fiscal</Btn>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}

/* ── RELATÓRIOS ── */
function RelPage({stock,os,returns,users,nf,isMobile,currentUser}){
  const isTec=currentUser?.role==="tecnico";
  const[tab,setTab]=useState("estoque");

  // ── Filtro de período ──
  const hoje=new Date().toISOString().slice(0,10);
  const primeiroDiaMes=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
  const[dtInicio,setDtInicio]=useState(primeiroDiaMes);
  const[dtFim,setDtFim]=useState(hoje);
  const[periodoRapido,setPeriodoRapido]=useState("mes");

  const aplicarPeriodo=(p)=>{
    setPeriodoRapido(p);
    const hoje2=new Date();
    if(p==="hoje"){
      const d=hoje2.toISOString().slice(0,10);
      setDtInicio(d);setDtFim(d);
    } else if(p==="semana"){
      const ini=new Date(hoje2);ini.setDate(hoje2.getDate()-7);
      setDtInicio(ini.toISOString().slice(0,10));setDtFim(hoje2.toISOString().slice(0,10));
    } else if(p==="mes"){
      setDtInicio(new Date(hoje2.getFullYear(),hoje2.getMonth(),1).toISOString().slice(0,10));
      setDtFim(hoje2.toISOString().slice(0,10));
    } else if(p==="trimestre"){
      const ini=new Date(hoje2);ini.setMonth(hoje2.getMonth()-3);
      setDtInicio(ini.toISOString().slice(0,10));setDtFim(hoje2.toISOString().slice(0,10));
    } else if(p==="tudo"){
      setDtInicio("2020-01-01");setDtFim("2099-12-31");
    }
  };

  // ── Filtragem por data ──
  const parseDateBR=(dateStr)=>{
    if(!dateStr)return null;
    // formato DD/MM/YYYY HH:MM ou DD/MM/YYYY
    const parts=dateStr.split(" ")[0].split("/");
    if(parts.length===3)return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    // formato YYYY-MM-DD
    return new Date(dateStr);
  };
  const inRange=(dateStr)=>{
    const d=parseDateBR(dateStr);
    if(!d)return true;
    const ini=new Date(dtInicio+"T00:00:00");
    const fim=new Date(dtFim+"T23:59:59");
    return d>=ini&&d<=fim;
  };

  const viewOs=useMemo(()=>{
    const base=isTec?os.filter(o=>o.uid===currentUser.id):os;
    return base.filter(o=>inRange(o.date));
  },[os,dtInicio,dtFim,isTec,currentUser]);

  const viewRet=useMemo(()=>{
    const base=isTec?returns.filter(r=>r.uid===currentUser.id):returns;
    return base.filter(r=>inRange(r.date));
  },[returns,dtInicio,dtFim,isTec,currentUser]);

  const viewNF=useMemo(()=>nf.filter(n=>inRange(n.date)),[nf,dtInicio,dtFim]);

  const catData=useMemo(()=>{const m={};stock.forEach(s=>{m[s.cat]=(m[s.cat]||0)+s.qty;});return Object.entries(m).map(([name,value])=>({name,value}));},[stock]);
  const matData=useMemo(()=>{const m={};viewOs.forEach(o=>o.items.forEach(it=>{m[it.sid]=(m[it.sid]||0)+it.qty;}));return Object.entries(m).map(([sid,value])=>{const s=stock.find(x=>x.id===sid);return{name:s?.name?.split(" ").slice(0,2).join(" ")||sid,value};}).sort((a,b)=>b.value-a.value);},[viewOs,stock]);
  const techData=useMemo(()=>{const m={};viewOs.forEach(o=>{const u=users.find(x=>x.id===o.uid);const nm=u?.name.split(" ")[0]||"?";const tot=o.items.reduce((a,i)=>a+i.qty,0);m[nm]=(m[nm]||0)+tot;});return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);},[viewOs,users]);
  const maxT=techData[0]?.value||1;

  const totalNFGasto=viewNF.reduce((a,n)=>a+(n.total||0),0);
  const LOGO_URL=window.location.origin+"/logo-stocktel.png";
  const periodoLabel=dtInicio===dtFim?`${dtInicio.split("-").reverse().join("/")}`:
    `${dtInicio.split("-").reverse().join("/")} a ${dtFim.split("-").reverse().join("/")}`;

  // ── Gera PDF Profissional ──
  const gerarPDF=()=>{
    const w=window.open("","_blank","width=1100,height=800");
    const fmt2=(n)=>new Intl.NumberFormat("pt-BR").format(n??0);
    const fmtR=(n)=>"R$ "+new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2}).format(n??0);
    const statusStyle=(s)=>{
      if(s.qty<=s.min*0.6)return"background:#ffebee;color:#c62828;border:1px solid #ef9a9a;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;";
      if(s.qty<=s.min)return"background:#fff3e0;color:#e65100;border:1px solid #ffcc80;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;";
      return"background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;";
    };
    const statusTxt=(s)=>s.qty<=s.min*0.6?"▲ CRÍTICO":s.qty<=s.min?"● BAIXO":"✓ OK";

    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>StockTel — Relatório ${periodoLabel}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#222;background:#fff;font-size:13px;}
      .page{max-width:960px;margin:0 auto;padding:32px;}
      .header{background:linear-gradient(135deg,#1a1a1a 0%,#2d0000 50%,#cc0000 100%);color:#fff;padding:28px 32px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;}
      .header img{height:70px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.5));}
      .header-info{text-align:right;}
      .header-title{font-size:22px;font-weight:800;letter-spacing:.04em;}
      .header-sub{font-size:12px;opacity:.8;margin-top:4px;}
      .header-period{font-size:13px;font-weight:700;margin-top:8px;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;display:inline-block;}
      .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;}
      .card{border-radius:10px;padding:16px;text-align:center;border:1px solid;}
      .card-title{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;}
      .card-value{font-size:26px;font-weight:800;line-height:1;}
      .card-sub{font-size:10px;margin-top:4px;opacity:.7;}
      .card-red{background:#ffebee;border-color:#ef9a9a;color:#c62828;}
      .card-orange{background:#fff3e0;border-color:#ffcc80;color:#e65100;}
      .card-green{background:#e8f5e9;border-color:#a5d6a7;color:#2e7d32;}
      .card-blue{background:#e3f2fd;border-color:#90caf9;color:#1565c0;}
      .section{margin-bottom:28px;}
      .section-title{font-size:15px;font-weight:800;color:#cc0000;padding:10px 14px;background:#fff5f5;border-left:4px solid #cc0000;border-radius:0 8px 8px 0;margin-bottom:14px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#1a1a1a;color:#fff;padding:10px 12px;text-align:left;font-weight:700;font-size:11px;letter-spacing:.05em;text-transform:uppercase;}
      tr:nth-child(even) td{background:#f9f9f9;}
      td{padding:9px 12px;border-bottom:1px solid #eee;vertical-align:middle;}
      .footer{margin-top:36px;padding-top:16px;border-top:2px solid #cc0000;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;}
      .footer-logo{color:#cc0000;font-weight:800;font-size:13px;}
      @media print{.no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{padding:16px;}}
    </style></head><body>
    <div class="page">
      <div class="no-print" style="padding:12px;background:#f5f5f5;border-radius:8px;margin-bottom:20px;display:flex;gap:10px;align-items:center;">
        <button onclick="window.print()" style="background:#cc0000;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">🖨️ Imprimir / Salvar PDF</button>
        <button onclick="window.close()" style="background:#333;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:13px;">✕ Fechar</button>
        <span style="font-size:11px;color:#666;">Selecione "Salvar como PDF" no diálogo de impressão</span>
      </div>
      <div class="header">
        <img src="${LOGO_URL}" alt="StockTel" onerror="this.style.display='none'"/>
        <div class="header-info">
          <div class="header-title">RELATÓRIO ${isTec?"DO TÉCNICO":"OPERACIONAL"}</div>
          <div class="header-sub">Soluções em Telecomunicações</div>
          <div class="header-period">📅 Período: ${periodoLabel}</div>
        </div>
      </div>
      <div class="cards">
        <div class="card card-blue"><div class="card-title">Itens em Estoque</div><div class="card-value">${fmt2(stock.length)}</div><div class="card-sub">Total cadastrado</div></div>
        <div class="card card-red"><div class="card-title">OS no Período</div><div class="card-value">${fmt2(viewOs.length)}</div><div class="card-sub">${periodoLabel}</div></div>
        <div class="card card-orange"><div class="card-title">Devoluções</div><div class="card-value">${fmt2(viewRet.length)}</div><div class="card-sub">No período</div></div>
        <div class="card card-green"><div class="card-title">NFs / Gasto</div><div class="card-value" style="font-size:16px;">${fmtR(totalNFGasto)}</div><div class="card-sub">${viewNF.length} notas no período</div></div>
      </div>
      <div class="section">
        <div class="section-title">📦 Estoque de Materiais</div>
        <table><thead><tr><th>Código</th><th>Material</th><th>Categoria</th><th>Qtd Atual</th><th>Qtd Mínima</th><th>Situação</th></tr></thead>
        <tbody>${stock.map(s=>`<tr><td><code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:11px;">${s.code||"—"}</code></td><td style="font-weight:600;">${s.name}</td><td style="color:#666;">${s.cat}</td><td style="font-weight:700;font-size:15px;color:${s.qty<=s.min*0.6?"#c62828":s.qty<=s.min?"#e65100":"#2e7d32"};">${fmt2(s.qty)}</td><td style="color:#888;">${fmt2(s.min)}</td><td><span style="${statusStyle(s)}">${statusTxt(s)}</span></td></tr>`).join("")}</tbody></table>
      </div>
      <div class="section">
        <div class="section-title">🔧 Ordens de Serviço — ${periodoLabel} (${viewOs.length})</div>
        ${viewOs.length===0?'<p style="color:#888;padding:12px;">Nenhuma OS no período selecionado.</p>':`<table><thead><tr><th>Nº OS</th><th>Técnico</th><th>Cliente</th><th>Data</th><th>Total Itens</th></tr></thead>
        <tbody>${viewOs.map(o=>{const t=users.find(u=>u.id===o.uid);const tot=o.items.reduce((a,i)=>a+i.qty,0);return`<tr><td style="font-weight:700;color:#cc0000;">${o.os}</td><td style="font-weight:600;">${t?.name||"?"}</td><td>${o.client}</td><td style="color:#888;font-size:11px;">${o.date}</td><td style="text-align:center;font-weight:700;">${fmt2(tot)}</td></tr>`;}).join("")}</tbody></table>`}
      </div>
      <div class="section">
        <div class="section-title">↩️ Devoluções — ${periodoLabel} (${viewRet.length})</div>
        ${viewRet.length===0?'<p style="color:#888;padding:12px;">Nenhuma devolução no período.</p>':`<table><thead><tr><th>Técnico</th><th>Data</th><th>Status</th><th>Aprovado por</th></tr></thead>
        <tbody>${viewRet.map(r=>{const t=users.find(u=>u.id===r.uid);const stc={pending:"background:#fff3e0;color:#e65100",approved:"background:#e8f5e9;color:#2e7d32",rejected:"background:#ffebee;color:#c62828"};const stl={pending:"⏳ Pendente",approved:"✅ Aprovada",rejected:"❌ Rejeitada"};return`<tr><td style="font-weight:600;">${t?.name||"?"}</td><td style="color:#888;font-size:11px;">${r.date}</td><td><span style="${stc[r.status]||""};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${stl[r.status]||r.status}</span></td><td style="color:#888;">${r.rBy||"—"}</td></tr>`;}).join("")}</tbody></table>`}
      </div>
      ${viewNF.length>0?`<div class="section"><div class="section-title">💰 Notas Fiscais — ${periodoLabel} (${viewNF.length})</div>
        <table><thead><tr><th>Nº NF</th><th>Fornecedor</th><th>Data</th><th>Itens</th><th>Valor</th></tr></thead>
        <tbody>${viewNF.map(n=>`<tr><td style="font-weight:700;color:#cc0000;">${n.num}</td><td style="font-weight:600;">${n.supplier}</td><td style="color:#888;font-size:11px;">${n.date}</td><td style="text-align:center;">${n.items?.length||0}</td><td style="font-weight:800;color:#2e7d32;">${fmtR(n.total)}</td></tr>`).join("")}
        <tr style="background:#fff0f0;"><td colspan="4" style="font-weight:800;text-align:right;padding-right:20px;">TOTAL DO PERÍODO:</td><td style="font-weight:800;font-size:16px;color:#cc0000;">${fmtR(totalNFGasto)}</td></tr></tbody></table></div>`:""}
      <div class="footer">
        <div class="footer-logo">StockTel — Soluções em Telecomunicações</div>
        <div>Gerado em ${new Date().toLocaleString("pt-BR")} · v1.0.0</div>
        <div>© ${new Date().getFullYear()} StockTel</div>
      </div>
    </div></body></html>`);
    w.document.close();
  };

  // ── Gera Excel por Período ──
  const gerarExcel=()=>{
    const wb=XLSX.utils.book_new();
    const statusTxt=(s)=>s.qty<=s.min*0.6?"CRÍTICO":s.qty<=s.min?"BAIXO":"OK";

    const estoqueData=[
      [`STOCKTEL — RELATÓRIO DE ESTOQUE — ${periodoLabel}`,"","","","",""],[""],
      ["CÓDIGO","MATERIAL","CATEGORIA","UNIDADE","QTD ATUAL","QTD MÍNIMA","SITUAÇÃO"],
      ...stock.map(s=>[s.code||"—",s.name,s.cat,s.unit,s.qty,s.min,statusTxt(s)])
    ];
    const ws1=XLSX.utils.aoa_to_sheet(estoqueData);
    ws1["!cols"]=[{wch:12},{wch:35},{wch:20},{wch:8},{wch:12},{wch:12},{wch:10}];
    XLSX.utils.book_append_sheet(wb,ws1,"📦 Estoque");

    const osData=[
      [`STOCKTEL — ORDENS DE SERVIÇO — ${periodoLabel}`,"","","",""],[""],
      ["Nº OS","TÉCNICO","CLIENTE","DATA","TOTAL ITENS"],
      ...viewOs.map(o=>{const t=users.find(u=>u.id===o.uid);return[o.os,t?.name||"?",o.client,o.date,o.items.reduce((a,i)=>a+i.qty,0)];})
    ];
    const ws2=XLSX.utils.aoa_to_sheet(osData);
    ws2["!cols"]=[{wch:18},{wch:22},{wch:25},{wch:20},{wch:14}];
    XLSX.utils.book_append_sheet(wb,ws2,"🔧 Ordens de Serviço");

    const retData=[
      [`STOCKTEL — DEVOLUÇÕES — ${periodoLabel}`,"","",""],[""],
      ["TÉCNICO","DATA","STATUS","APROVADO POR"],
      ...viewRet.map(r=>{const t=users.find(u=>u.id===r.uid);const sl={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};return[t?.name||"?",r.date,sl[r.status]||r.status,r.rBy||"—"];})
    ];
    const ws3=XLSX.utils.aoa_to_sheet(retData);
    ws3["!cols"]=[{wch:22},{wch:20},{wch:14},{wch:22}];
    XLSX.utils.book_append_sheet(wb,ws3,"↩️ Devoluções");

    if(!isTec){
      const nfData=[
        [`STOCKTEL — NOTAS FISCAIS — ${periodoLabel}`,"","",""],[""],
        ["Nº NF","FORNECEDOR","DATA","ITENS","VALOR TOTAL"],
        ...viewNF.map(n=>[n.num,n.supplier,n.date,n.items?.length||0,Number(n.total||0)]),
        [""],["TOTAL DO PERÍODO","","",viewNF.length,Number(totalNFGasto)]
      ];
      const ws4=XLSX.utils.aoa_to_sheet(nfData);
      ws4["!cols"]=[{wch:16},{wch:25},{wch:14},{wch:10},{wch:16}];
      XLSX.utils.book_append_sheet(wb,ws4,"💰 Notas Fiscais");

      const tecData=[
        [`STOCKTEL — TÉCNICOS — ${periodoLabel}`,"","","",""],[""],
        ["TÉCNICO","OS NO PERÍODO","MAT. CONSUMIDO"],
        ...techData.map((t,i)=>[t.name,viewOs.filter(o=>users.find(u=>u.id===o.uid)?.name.split(" ")[0]===t.name).length,t.value])
      ];
      const ws5=XLSX.utils.aoa_to_sheet(tecData);
      ws5["!cols"]=[{wch:22},{wch:16},{wch:16}];
      XLSX.utils.book_append_sheet(wb,ws5,"👷 Técnicos");
    }

    XLSX.writeFile(wb,`StockTel_${periodoLabel.replace(/\//g,"-")}.xlsx`);
  };

  const tabs=[{k:"estoque",l:"📦 Estoque"},{k:"os",l:"🔧 OS"},{k:"tecnicos",l:"👷 Técnicos"},{k:"dev",l:"↩️ Devoluções"}];
  const sc2={pending:"ylw",approved:"grn",rejected:"red"};
  const sl2={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>

    {/* Header com título e botões */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>{isTec?"Meus Relatórios":"Relatórios"}</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Filtre por período e exporte em PDF ou Excel</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn color="red" size="sm" onClick={gerarPDF}>🖨️ PDF</Btn>
        <Btn color="grn" size="sm" onClick={gerarExcel}>📊 Excel</Btn>
      </div>
    </div>



    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`,overflowX:"auto"}}>
      {tabs.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>)}
    </div>

    {/* ESTOQUE */}
    {tab==="estoque"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!isMobile&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Por Categoria</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {catData.map((_,i)=><Cell key={i} fill={PIE[i%PIE.length]}/>)}
            </Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Mais Consumidos no Período</div>
          {matData.length===0?<div style={{color:C.muted,fontSize:12}}>Nenhuma OS no período.</div>
          :<ResponsiveContainer width="100%" height={200}>
            <BarChart data={matData.slice(0,6)} layout="vertical">
              <XAxis type="number" tick={{fill:C.muted,fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fill:C.muted,fontSize:9}} width={110}/>
              <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/><Bar dataKey="value" fill={C.gold} radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>}
        </Card>
      </div>}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÓDIGO","MATERIAL","CATEGORIA","QTD ATUAL","QTD MÍN.","SITUAÇÃO"]}/></thead>
            <tbody>{stock.map(s=>{const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;return<TRow key={s.id} cells={[
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
              s.name,s.cat,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:low?C.ylw:C.txt}}>{fmt(s.qty)}</span>,
              fmt(s.min),
              crit?<Bdg color="red">▲ Crítico</Bdg>:low?<Bdg color="ylw">● Baixo</Bdg>:<Bdg color="grn">✓ OK</Bdg>
            ]}/>;})}</tbody>
          </table>
        </div>
      </Card>
    </div>}

    {/* OS */}
    {tab==="os"&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}`,fontSize:12,color:C.muted}}>{viewOs.length} OS no período: {periodoLabel}</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><THead cols={["OS","TÉCNICO","CLIENTE","DATA","ITENS"]}/></thead>
        <tbody>
          {viewOs.length===0?<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhuma OS no período selecionado.</td></tr>
          :viewOs.map(o=>{const t=users.find(u=>u.id===o.uid);return<TRow key={o.id} cells={[
            <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.gold,fontSize:12,fontWeight:700}}>{o.os}</span>,
            t?.name||"?",o.client,
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{o.date}</span>,
            <span style={{color:C.gold,fontWeight:700}}>{o.items.reduce((a,i)=>a+i.qty,0)}</span>
          ]}/>;})}</tbody>
      </table></div>
    </Card>}

    {/* TÉCNICOS */}
    {tab==="tecnicos"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!isMobile&&techData.length>0&&<Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:14}}>Consumo no Período</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart><Pie data={techData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
            {techData.map((_,i)=><Cell key={i} fill={i===0?C.gold:PIE[i%PIE.length]}/>)}
          </Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart>
        </ResponsiveContainer>
      </Card>}
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:14}}>Ranking — {periodoLabel}</div>
        {techData.length===0?<div style={{color:C.muted,fontSize:12}}>Nenhuma OS no período.</div>
        :techData.map((t,i)=>(
          <div key={t.name} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,minWidth:20}}>{i+1}</span>
                <span style={{fontSize:14,color:C.txt,fontWeight:500}}>{t.name}</span>
              </div>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:C.gold,fontWeight:700}}>{fmt(t.value)}</span>
            </div>
            <div style={{height:8,background:C.bdr,borderRadius:4}}>
              <div style={{height:"100%",width:`${(t.value/maxT)*100}%`,background:i===0?C.gold:"#555",borderRadius:4}}/>
            </div>
          </div>
        ))}
      </Card>
    </div>}

    {/* DEVOLUÇÕES */}
    {tab==="dev"&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}`,fontSize:12,color:C.muted}}>{viewRet.length} devoluções no período: {periodoLabel}</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><THead cols={["TÉCNICO","DATA SOLICITAÇÃO","STATUS","APROVADO POR"]}/></thead>
        <tbody>
          {viewRet.length===0?<tr><td colSpan={4} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhuma devolução no período.</td></tr>
          :viewRet.map(r=>{const t=users.find(u=>u.id===r.uid);return<TRow key={r.id} cells={[
            t?.name||"?",
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{r.date}</span>,
            <Bdg color={sc2[r.status]}>{sl2[r.status]}</Bdg>,
            r.rBy||"—"
          ]}/>;})}</tbody>
      </table></div>
    </Card>}
  </div>;
}

/* ── USUÁRIOS ── */
function UsrPage({users,setUsers,addLog,currentUser,isMobile}){
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico",photo:"",perms:DEFAULT_PERMS["tecnico"],mustChangePassword:true});
  const roles=[{value:"admin",label:"Administrador"},{value:"estoque",label:"Estoque"},{value:"tecnico",label:"Técnico"},{value:"financeiro",label:"Financeiro"},{value:"mecanico",label:"Mecânico"}];
  const isMaster=currentUser?.role==="superadmin";
  const rl={superadmin:"MASTER",admin:"ADM",estoque:"EST",tecnico:"TEC",financeiro:"FIN",mecanico:"MEC"};
  const rc={superadmin:"#ff00ff",admin:C.gold,estoque:C.blue,tecnico:C.grn,financeiro:C.ylw,mecanico:"#888888"};

  const handlePhoto=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>2*1024*1024){alert("Foto muito grande! Máximo 2MB.");return;}
    const reader=new FileReader();
    reader.onload=(ev)=>setForm(f=>({...f,photo:ev.target.result}));
    reader.readAsDataURL(file);
  };

  const isRoot=currentUser.role==="superadmin";
  const save=()=>{
    if(!form.name.trim()||!form.login.trim()||!form.pass.trim())return;
    const permsToSave=form.perms.length>0?form.perms:DEFAULT_PERMS[form.role]||["dash"];
    if(modal==="new"){
      setUsers(p=>[...p,{id:uid(),...form,perms:permsToSave}]);
      addLog(currentUser.name,"Usuário Criado",form.name+" ("+form.role+")");
    } else {
      // Admin não pode alterar login/senha de outros usuários — só o próprio ou superadmin
      setUsers(p=>p.map(u=>{
        if(u.id!==modal)return u;
        if(isRoot){
          return{...u,...form,perms:permsToSave};
        }
        // Admin pode editar nome, email, telefone, foto, perfil e permissões
        // mas NÃO pode alterar login ou senha de outros
        return{...u,name:form.name,email:form.email,phone:form.phone,cpf:form.cpf,role:form.role,photo:form.photo,perms:permsToSave,mustChangePassword:form.mustChangePassword};
      }));
      addLog(currentUser.name,"Usuário Editado",form.name);
    }
    setModal(null);
  };

  const togglePerm=(k)=>{
    setForm(f=>({...f,perms:f.perms.includes(k)?f.perms.filter(p=>p!==k):[...f.perms,k]}));
  };
  const setRoleAndPerms=(role)=>{
    setForm(f=>({...f,role,perms:DEFAULT_PERMS[role]||["dash"]}));
  };
  const MODULE_GROUPS={geral:"Geral",estoque:"Estoque",operacional:"Operacional",relatorios:"Relatórios",admin:"Administração"};

  const Avatar=({user,size=36})=>(
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,overflow:"hidden",
      background:rc[user.role]+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.4}}>
      {user.photo
        ?<img src={user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        :<span>👤</span>}
    </div>
  );

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Usuários</h1></div>
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setForm({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico",photo:"",perms:DEFAULT_PERMS["tecnico"],mustChangePassword:true});setModal("new");}}>+ Novo</Btn>
    </div>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {users.filter(u=>isMaster||u.role!=="superadmin").map(u=>(
          <Card key={u.id} style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
            <Avatar user={u} size={44}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:C.txt}}>{u.name}</div>
              <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.login} · {u.email}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
              <span style={{background:rc[u.role],color:"#000",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:3}}>{rl[u.role]}</span>
              <div style={{display:"flex",gap:6}}>
                <Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf||"",login:u.login,pass:u.pass,role:u.role,photo:u.photo||"",perms:u.perms||DEFAULT_PERMS[u.role]||["dash"],mustChangePassword:u.mustChangePassword||false});setModal(u.id);}}>Editar</Btn>
                {u.id!==currentUser.id&&isRoot&&<Btn size="xs" color="red" outline onClick={()=>{if(window.confirm("Remover "+u.name+"?")){setUsers(p=>p.filter(x=>x.id!==u.id));addLog(currentUser.name,"Usuário Removido",u.name);}}}>✕</Btn>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["FOTO","USUÁRIO","LOGIN","E-MAIL","TELEFONE","MATRÍCULA","PERFIL","AÇÕES"]}/></thead>
            <tbody>{users.filter(u=>isMaster||u.role!=="superadmin").map(u=>(
              {u.role==="superadmin"&&!isMaster?null:<TRow key={u.id} cells={[
                <Avatar user={u} size={36}/>,
                <span style={{fontWeight:600,color:C.txt}}>{u.name}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold}}>{u.login}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.email}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.phone}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{u.cpf||"—"}</span>,
                <span style={{background:rc[u.role]||C.gold,color:u.role==="superadmin"?"#fff":"#000",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:4}}>{rl[u.role]||u.role}</span>,
                <div style={{display:"flex",gap:6}}>
                  {isMaster&&<Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf||"",login:u.login,pass:u.pass,role:u.role,photo:u.photo||"",perms:u.perms||DEFAULT_PERMS[u.role]||["dash"],mustChangePassword:u.mustChangePassword||false});setModal(u.id);}}>Editar</Btn>}
                  {isMaster&&u.role!=="superadmin"&&<Btn size="xs" color="red" outline onClick={()=>{if(window.confirm("Remover "+u.name+"?")){setUsers(p=>p.filter(x=>x.id!==u.id));addLog(currentUser.name,"Usuário Removido",u.name);}}}>✕</Btn>}
                  {!isMaster&&<span style={{fontSize:11,color:C.muted}}>—</span>}
                </div>
              ]}/>}
            ))}</tbody>
          </table>
        </div>
      </Card>
    )}
    {modal&&<Modal title={modal==="new"?"Novo Usuário":"Editar Usuário"} onClose={()=>setModal(null)} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Foto de perfil */}
        <div style={{display:"flex",alignItems:"center",gap:16,padding:14,background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`}}>
          <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,border:`2px solid ${C.bdr2}`}}>
            {form.photo?<img src={form.photo} alt="foto" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>👤</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:C.txt,marginBottom:6}}>Foto de Perfil</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:10}}>JPG, PNG ou GIF · Máximo 2MB</div>
            <label style={{background:C.gold,color:"#000",padding:"7px 14px",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,display:"inline-block"}}>
              📷 Escolher Foto
              <input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
            </label>
            {form.photo&&<button onClick={()=>setForm(f=>({...f,photo:""}))} style={{background:"transparent",color:C.red,border:"none",cursor:"pointer",fontSize:12,marginLeft:10,fontWeight:600}}>✕ Remover</button>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Inp label="Nome Completo *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
          <Inp label="E-mail" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} type="email"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Inp label="Telefone" value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="(00) 00000-0000"/>
          <Inp label="Matrícula" value={form.cpf||""} onChange={v=>setForm(f=>({...f,cpf:v}))} placeholder="Ex: MAT-001"/>
        </div>
        {/* Perfil e permissões */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:12}}>
          {(isRoot||modal==="new")&&<Inp label="Login *" value={form.login} onChange={v=>setForm(f=>({...f,login:v}))}/>}
          {(isRoot||modal==="new")&&<Inp label="Senha *" value={form.pass} onChange={v=>setForm(f=>({...f,pass:v}))} type="password"/>}
          {!isRoot&&modal!=="new"&&<div style={{gridColumn:"1 / -1",background:C.surf,borderRadius:8,padding:"10px 14px",border:`1px solid ${C.bdr}`,fontSize:12,color:C.muted}}>
            🔒 Login e senha só podem ser alterados pelo próprio usuário em <strong style={{color:C.txt}}>Meu Perfil</strong>
          </div>}
          <div style={{gridColumn:(isRoot||modal==="new")?"auto":"1 / -1"}}>
            <Sel label="Perfil" value={form.role} onChange={setRoleAndPerms} options={roles}/>
          </div>
        </div>

        {/* Trocar senha no primeiro acesso */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.surf,borderRadius:8,border:`1px solid ${C.bdr}`}}>
          <input type="checkbox" id="mustChange" checked={form.mustChangePassword}
            onChange={e=>setForm(f=>({...f,mustChangePassword:e.target.checked}))}
            style={{width:16,height:16,accentColor:C.gold,cursor:"pointer"}}/>
          <label htmlFor="mustChange" style={{fontSize:12,color:C.txt,cursor:"pointer"}}>
            🔐 Exigir troca de senha no primeiro acesso
          </label>
        </div>

        {/* Permissões por módulo */}
        <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase"}}>🔑 Acesso aos Módulos</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setForm(f=>({...f,perms:ALL_MODULES.map(m=>m.k)}))} style={{background:`${C.grn}22`,color:C.grn,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>Marcar Tudo</button>
              <button onClick={()=>setForm(f=>({...f,perms:[]}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>Desmarcar</button>
            </div>
          </div>
          {Object.entries(MODULE_GROUPS).map(([group,groupLabel])=>{
            const mods=ALL_MODULES.filter(m=>m.group===group);
            return <div key={group} style={{marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted2,letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>{groupLabel}</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
                {mods.map(m=>(
                  <div key={m.k} onClick={()=>togglePerm(m.k)}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",
                      background:form.perms.includes(m.k)?`${C.gold}18`:C.card,
                      border:`1px solid ${form.perms.includes(m.k)?`${C.gold}55`:C.bdr2}`}}>
                    <div style={{width:16,height:16,borderRadius:4,background:form.perms.includes(m.k)?C.gold:C.bdr2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {form.perms.includes(m.k)&&<span style={{fontSize:10,color:"#000",fontWeight:800}}>✓</span>}
                    </div>
                    <span style={{fontSize:11,color:form.perms.includes(m.k)?C.txt:C.muted}}>{m.icon} {m.l}</span>
                  </div>
                ))}
              </div>
            </div>;
          })}
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModal(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar Usuário</Btn>
        </div>
      </div>
    </Modal>}
    <div style={{marginTop:8,padding:"12px 16px",background:C.redD,border:`1px solid ${C.red}33`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:C.red}}>⚠️ Zona de Perigo</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Apaga todos os dados e volta ao estado inicial.</div>
      </div>
      {isRoot?<Btn size="sm" color="red" outline onClick={()=>{if(window.confirm("ATENÇÃO: Apaga TODOS os dados. Confirmar?")){Object.keys(localStorage).filter(k=>k.startsWith("re_")).forEach(k=>localStorage.removeItem(k));window.location.reload();}}}>🗑️ Resetar Todos os Dados</Btn>:<span style={{fontSize:12,color:C.muted}}>🔒 Apenas o usuário Root pode resetar o sistema.</span>}
    </div>
  </div>;
}
/* ── LOGS ── */
function LogPage({logs,isMobile}){
  const tc={saida:C.gold,entrada:C.grn,dev:C.ylw,aprovada:C.grn};
  const ic={saida:"→",entrada:"↓",dev:"↺",aprovada:"✓"};
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Logs do Sistema</h1>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {logs.map(l=>(
          <Card key={l.id} style={{padding:14,borderLeft:`3px solid ${tc[l.tipo]||C.gold}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:700,color:tc[l.tipo]||C.gold}}>{l.action}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,flexShrink:0}}>{l.date}</span>
            </div>
            <div style={{fontSize:12,fontWeight:600,color:C.txt,marginBottom:2}}>{l.user}</div>
            <div style={{fontSize:11,color:C.muted}}>{l.detail}</div>
          </Card>
        ))}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["DATA/HORA","USUÁRIO","AÇÃO","DETALHE"]}/></thead>
            <tbody>{logs.map(l=>(
              <TRow key={l.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{l.date}</span>,
                <span style={{fontSize:12,fontWeight:600,color:C.txt}}>{l.user}</span>,
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:`${tc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:tc[l.tipo]||C.gold,fontWeight:700}}>{ic[l.tipo]||"·"}</div>
                  <span style={{fontSize:12,fontWeight:600,color:tc[l.tipo]||C.gold}}>{l.action}</span>
                </div>,
                <span style={{fontSize:12,color:C.muted}}>{l.detail}</span>
              ]}/>
            ))}</tbody>
          </table>
        </div>
      </Card>
    )}
  </div>;
}

/* ── CATEGORIAS ── */
function CatPage({cats,setCats,isMobile}){
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({name:"",icon:"📦"});
  const[editId,setEditId]=useState(null);
  const icons=["📦","🔌","🔧","📡","🛠️","💡","🔩","🗃️","📋","⚙️","🔗","🏷️"];
  const save=()=>{
    if(!form.name.trim())return;
    if(editId){setCats(p=>p.map(c=>c.id===editId?{...c,...form}:c));}
    else{setCats(p=>[...p,{id:uid(),name:form.name.trim(),icon:form.icon}]);}
    setModal(false);setForm({name:"",icon:"📦"});setEditId(null);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Categorias</h1><p style={{fontSize:12,color:C.muted,marginTop:2}}>Gerencie as categorias de materiais</p></div>
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setForm({name:"",icon:"📦"});setEditId(null);setModal(true);}}>+ Nova Categoria</Btn>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
      {cats.map(c=>(
        <Card key={c.id} style={{padding:16,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{c.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Categoria ativa</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
            <Btn size="xs" color="gold" outline onClick={()=>{setForm({name:c.name,icon:c.icon});setEditId(c.id);setModal(true);}}>✏️</Btn>
            <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${c.name}"?`))setCats(p=>p.filter(x=>x.id!==c.id));}}>✕</Btn>
          </div>
        </Card>
      ))}
    </div>
    {modal&&<Modal title={editId?"Editar Categoria":"Nova Categoria"} onClose={()=>{setModal(false);setEditId(null);}} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Inp label="Nome da Categoria *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Ex: Equipamentos"/>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:8}}>Ícone</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {icons.map(ic=>(
              <div key={ic} onClick={()=>setForm(f=>({...f,icon:ic}))}
                style={{width:40,height:40,borderRadius:8,background:form.icon===ic?`${C.gold}33`:C.surf,border:`2px solid ${form.icon===ic?C.gold:C.bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer"}}>
                {ic}
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>{setModal(false);setEditId(null);}}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ── PRODUTOS ── */
function ProdutosPage({produtos,setProdutos,cats,isMobile}){
  const[q,setQ]=useState("");
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({code:"",name:"",cat:"",unit:"un",desc:""});
  const filtered=produtos.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.code.toLowerCase().includes(q.toLowerCase()));
  const save=()=>{
    if(!form.name.trim())return;
    if(modal==="new")setProdutos(p=>[...p,{id:uid(),...form,name:form.name.trim()}]);
    else setProdutos(p=>p.map(x=>x.id===modal?{...x,...form,name:form.name.trim()}:x));
    setModal(null);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Produtos</h1><p style={{fontSize:12,color:C.muted,marginTop:2}}>Cadastro de produtos e materiais</p></div>
      <div style={{display:"flex",gap:8,width:isMobile?"100%":"auto"}}>
        <Inp value={q} onChange={setQ} placeholder="🔍 Buscar produto..." style={{flex:1}}/>
        <Btn size="sm" color="gold" onClick={()=>{setForm({code:"",name:"",cat:cats[0]?.name||"",unit:"un",desc:""});setModal("new");}}>+ Novo</Btn>
      </div>
    </div>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(p=>(
          <Card key={p.id} style={{padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:2}}>{p.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{p.code} · {p.cat} · {p.unit}</div>
                {p.desc&&<div style={{fontSize:11,color:C.muted2,marginTop:4}}>{p.desc}</div>}
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:10}}>
                <Btn size="xs" color="gold" outline onClick={()=>{setForm({code:p.code,name:p.name,cat:p.cat,unit:p.unit,desc:p.desc||""});setModal(p.id);}}>✏️</Btn>
                <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${p.name}"?`))setProdutos(x=>x.filter(i=>i.id!==p.id));}}>✕</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÓDIGO","NOME DO PRODUTO","CATEGORIA","UNIDADE","DESCRIÇÃO","AÇÕES"]}/></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={6} style={{padding:30,textAlign:"center",color:C.muted}}>Nenhum produto cadastrado.</td></tr>
              :filtered.map(p=>(
                <TRow key={p.id} cells={[
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{p.code}</span>,
                  <span style={{fontWeight:600,color:C.txt}}>{p.name}</span>,
                  <Bdg color="muted">{p.cat}</Bdg>,
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{p.unit}</span>,
                  <span style={{fontSize:11,color:C.muted}}>{p.desc||"—"}</span>,
                  <div style={{display:"flex",gap:6}}>
                    <Btn size="xs" color="gold" outline onClick={()=>{setForm({code:p.code,name:p.name,cat:p.cat,unit:p.unit,desc:p.desc||""});setModal(p.id);}}>Editar</Btn>
                    <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${p.name}"?`))setProdutos(x=>x.filter(i=>i.id!==p.id));}}>✕</Btn>
                  </div>
                ]}/>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )}
    {modal&&<Modal title={modal==="new"?"Novo Produto":"Editar Produto"} onClose={()=>setModal(null)} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Inp label="Código" value={form.code} onChange={v=>setForm(f=>({...f,code:v}))} placeholder="ONU-001"/>
          <Inp label="Nome do Produto *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Ex: ONU Huawei HG8145V5"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Sel label="Categoria" value={form.cat} onChange={v=>setForm(f=>({...f,cat:v}))} options={cats.map(c=>({value:c.name,label:`${c.icon} ${c.name}`}))}/>
          <Inp label="Unidade" value={form.unit} onChange={v=>setForm(f=>({...f,unit:v}))} placeholder="un, m, rolo, pç..."/>
        </div>
        <Inp label="Descrição" value={form.desc} onChange={v=>setForm(f=>({...f,desc:v}))} placeholder="Descrição opcional do produto"/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModal(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar Produto</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ── EMAIL / RELATÓRIO ADMIN ── */
function AdminRelPage({nf,stock,os,returns,tstock,users,solicitacoes,isMobile,addLog}){
  const[tab,setTab]=useState("financeiro");
  const[emails,setEmails]=useState("");
  const[msg,setMsg]=useState("");

  const LOGO_URL=window.location.origin+"/logo-stocktel.png";

  // ── Filtro de período ──
  const hoje=new Date().toISOString().slice(0,10);
  const primeiroDiaMes=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
  const[dtInicio,setDtInicio]=useState(primeiroDiaMes);
  const[dtFim,setDtFim]=useState(hoje);
  const[periodoRapido,setPeriodoRapido]=useState("mes");

  const aplicarPeriodo=(p)=>{
    setPeriodoRapido(p);
    const h=new Date();
    if(p==="hoje"){const d=h.toISOString().slice(0,10);setDtInicio(d);setDtFim(d);}
    else if(p==="semana"){const i=new Date(h);i.setDate(h.getDate()-7);setDtInicio(i.toISOString().slice(0,10));setDtFim(h.toISOString().slice(0,10));}
    else if(p==="mes"){setDtInicio(new Date(h.getFullYear(),h.getMonth(),1).toISOString().slice(0,10));setDtFim(h.toISOString().slice(0,10));}
    else if(p==="trimestre"){const i=new Date(h);i.setMonth(h.getMonth()-3);setDtInicio(i.toISOString().slice(0,10));setDtFim(h.toISOString().slice(0,10));}
    else if(p==="tudo"){setDtInicio("2020-01-01");setDtFim("2099-12-31");}
  };

  const parseDateBR=(s)=>{if(!s)return null;const p=s.split(" ")[0].split("/");if(p.length===3)return new Date(`${p[2]}-${p[1]}-${p[0]}`);return new Date(s);};
  const inRange=(s)=>{const d=parseDateBR(s);if(!d)return true;return d>=new Date(dtInicio+"T00:00:00")&&d<=new Date(dtFim+"T23:59:59");};
  const periodoLabel=dtInicio===dtFim?dtInicio.split("-").reverse().join("/"):`${dtInicio.split("-").reverse().join("/")} a ${dtFim.split("-").reverse().join("/")}`;

  // ── Cálculos financeiros ──
  const viewNFAdmin=useMemo(()=>nf.filter(n=>inRange(n.date)),[nf,dtInicio,dtFim]);
  const viewOsAdmin=useMemo(()=>os.filter(o=>inRange(o.date)),[os,dtInicio,dtFim]);
  const viewRetAdmin=useMemo(()=>returns.filter(r=>inRange(r.date)),[returns,dtInicio,dtFim]);

  const gastoPorMes=useMemo(()=>{
    const m={};
    viewNFAdmin.forEach(n=>{
      const mes=n.date?n.date.substring(0,7):"Sem data";
      if(!m[mes])m[mes]={mes,total:0,qtdNF:0,itens:0};
      m[mes].total+=n.total||0;
      m[mes].qtdNF+=1;
      m[mes].itens+=n.items?.length||0;
    });
    return Object.values(m).sort((a,b)=>a.mes.localeCompare(b.mes));
  },[viewNFAdmin]);

  const alertasPreco=useMemo(()=>{
    const hist={};
    const sorted=[...viewNFAdmin].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    sorted.forEach(n=>{
      n.items?.forEach(it=>{
        const s=stock.find(x=>x.id===it.sid);
        if(!s||!it.qty||it.qty===0)return;
        const unitPrice=it.val/it.qty;
        if(!hist[it.sid])hist[it.sid]={name:s.name,code:s.code,unit:s.unit,prices:[]};
        hist[it.sid].prices.push({date:n.date,nf:n.num,price:unitPrice,qty:it.qty,total:it.val});
      });
    });
    const alerts=[];
    Object.values(hist).forEach(item=>{
      if(item.prices.length>=2){
        const prev=item.prices[item.prices.length-2];
        const curr=item.prices[item.prices.length-1];
        const diff=curr.price-prev.price;
        const pct=prev.price>0?(diff/prev.price)*100:0;
        if(Math.abs(pct)>=1){
          alerts.push({name:item.name,code:item.code,unit:item.unit,
            prevPrice:prev.price,currPrice:curr.price,
            prevNF:prev.nf,currNF:curr.nf,
            diff,pct,up:diff>0});
        }
      }
    });
    return alerts.sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct));
  },[viewNFAdmin,stock]);

  const rankingTec=useMemo(()=>{
    return users.filter(u=>u.role==="tecnico").map(u=>{
      const myOs=viewOsAdmin.filter(o=>o.uid===u.id);
      const myKit=tstock.filter(t=>t.uid===u.id);
      const myDev=viewRetAdmin.filter(r=>r.uid===u.id);
      const mySol=solicitacoes?.filter(s=>s.uid===u.id)||[];
      const totalMat=myKit.reduce((a,t)=>a+t.qty,0);
      const totalOsMat=myOs.reduce((a,o)=>a+o.items.reduce((b,i)=>b+i.qty,0),0);
      return{...u,qtdOS:myOs.length,matEmPosse:totalMat,matUsado:totalOsMat,devs:myDev.length,sols:mySol.length};
    }).sort((a,b)=>b.qtdOS-a.qtdOS);
  },[users,viewOsAdmin,tstock,viewRetAdmin,solicitacoes,dtInicio,dtFim]);

  const totalGasto=viewNFAdmin.reduce((a,n)=>a+(n.total||0),0);
  const totalNFs=viewNFAdmin.length;
  const mediaGastoPorNF=totalNFs>0?totalGasto/totalNFs:0;
  const maxMes=gastoPorMes.length>0?Math.max(...gastoPorMes.map(m=>m.total)):1;
  const alertasAlta=alertasPreco.filter(a=>a.up);
  const alertasBaixa=alertasPreco.filter(a=>!a.up);

  // ── Gera PDF Profissional ──
  const gerarPDF=()=>{
    const w=window.open("","_blank","width=1100,height=800");
    const low=stock.filter(s=>s.qty<=s.min);
    const crit=stock.filter(s=>s.qty<=s.min*0.6);
    const ok=stock.filter(s=>s.qty>s.min);

    const statusStyle=(s)=>{
      if(s.qty<=s.min*0.6)return'background:#ffebee;color:#c62828;border:1px solid #ef9a9a;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;';
      if(s.qty<=s.min)return'background:#fff3e0;color:#e65100;border:1px solid #ffcc80;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;';
      return'background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;';
    };
    const statusTxt=(s)=>s.qty<=s.min*0.6?"▲ CRÍTICO":s.qty<=s.min?"● BAIXO":"✓ OK";
    const fmt2=(n)=>new Intl.NumberFormat("pt-BR").format(n??0);
    const fmtR=(n)=>"R$ "+new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2}).format(n??0);

    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>StockTel — Relatório Completo</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#222;background:#fff;font-size:13px;}
      .page{max-width:960px;margin:0 auto;padding:32px;}
      /* Header */
      .header{background:linear-gradient(135deg,#1a1a1a 0%,#2d0000 50%,#cc0000 100%);color:#fff;padding:28px 32px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;}
      .header img{height:70px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5));}
      .header-info{text-align:right;}
      .header-title{font-size:22px;font-weight:800;letter-spacing:.04em;}
      .header-sub{font-size:12px;opacity:.8;margin-top:4px;}
      .header-date{font-size:11px;opacity:.7;margin-top:8px;background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:20px;display:inline-block;}
      /* Summary cards */
      .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;}
      .card{border-radius:10px;padding:16px;text-align:center;border:1px solid;}
      .card-title{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;}
      .card-value{font-size:28px;font-weight:800;line-height:1;}
      .card-sub{font-size:10px;margin-top:4px;opacity:.7;}
      .card-red{background:#ffebee;border-color:#ef9a9a;color:#c62828;}
      .card-orange{background:#fff3e0;border-color:#ffcc80;color:#e65100;}
      .card-green{background:#e8f5e9;border-color:#a5d6a7;color:#2e7d32;}
      .card-blue{background:#e3f2fd;border-color:#90caf9;color:#1565c0;}
      /* Section */
      .section{margin-bottom:28px;}
      .section-title{font-size:15px;font-weight:800;color:#cc0000;padding:10px 14px;background:#fff5f5;border-left:4px solid #cc0000;border-radius:0 8px 8px 0;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
      /* Tables */
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#1a1a1a;color:#fff;padding:10px 12px;text-align:left;font-weight:700;font-size:11px;letter-spacing:.05em;text-transform:uppercase;}
      tr:nth-child(even) td{background:#f9f9f9;}
      tr:hover td{background:#fff0f0;}
      td{padding:9px 12px;border-bottom:1px solid #eee;vertical-align:middle;}
      /* Alert boxes */
      .alert-up{background:#fff5f5;border:1px solid #ffcdd2;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;}
      .alert-down{background:#f1f8e9;border:1px solid #c5e1a5;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;}
      .alert-name{font-weight:700;font-size:13px;}
      .alert-detail{font-size:11px;color:#666;margin-top:2px;}
      .alert-pct-up{font-size:18px;font-weight:800;color:#c62828;}
      .alert-pct-down{font-size:18px;font-weight:800;color:#2e7d32;}
      /* Bar chart */
      .bar-wrap{display:flex;flex-direction:column;gap:8px;margin-top:8px;}
      .bar-row{display:flex;align-items:center;gap:10px;}
      .bar-label{font-size:11px;color:#555;min-width:70px;font-weight:600;}
      .bar-bg{flex:1;background:#f0f0f0;border-radius:4px;height:22px;overflow:hidden;}
      .bar-fill{height:100%;background:linear-gradient(90deg,#cc0000,#ff4444);border-radius:4px;display:flex;align-items:center;padding-left:8px;}
      .bar-fill span{font-size:11px;font-weight:700;color:#fff;white-space:nowrap;}
      .bar-val{font-size:11px;font-weight:700;color:#cc0000;min-width:80px;text-align:right;}
      /* Tech table */
      .tech-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;}
      /* Footer */
      .footer{margin-top:36px;padding-top:16px;border-top:2px solid #cc0000;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;}
      .footer-logo{color:#cc0000;font-weight:800;font-size:13px;}
      /* Print */
      @media print{
        .no-print{display:none!important;}
        body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .page{padding:16px;}
      }
    </style>
    </head><body>
    <div class="page">

      <div class="no-print" style="padding:12px;background:#f5f5f5;border-radius:8px;margin-bottom:20px;display:flex;gap:10px;align-items:center;">
        <button onclick="window.print()" style="background:#cc0000;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">🖨️ Imprimir / Salvar PDF</button>
        <button onclick="window.close()" style="background:#333;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:13px;">✕ Fechar</button>
        <span style="font-size:11px;color:#666;">Dica: No diálogo de impressão, selecione "Salvar como PDF"</span>
      </div>

      <!-- HEADER -->
      <div class="header">
        <img src="${LOGO_URL}" alt="StockTel" onerror="this.style.display='none'"/>
        <div class="header-info">
          <div class="header-title">RELATÓRIO COMPLETO</div>
          <div class="header-sub">Soluções em Telecomunicações</div>
          <div class="header-date">📅 Gerado em: ${new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</div>
        </div>
      </div>

      <!-- CARDS RESUMO -->
      <div class="cards">
        <div class="card card-blue">
          <div class="card-title">Total de Itens</div>
          <div class="card-value">${fmt2(stock.length)}</div>
          <div class="card-sub">Cadastrados no sistema</div>
        </div>
        <div class="card card-red">
          <div class="card-title">Itens Críticos</div>
          <div class="card-value">${fmt2(crit.length)}</div>
          <div class="card-sub">Abaixo do mínimo</div>
        </div>
        <div class="card card-orange">
          <div class="card-title">Estoque Baixo</div>
          <div class="card-value">${fmt2(low.length-crit.length)}</div>
          <div class="card-sub">Atenção necessária</div>
        </div>
        <div class="card card-green">
          <div class="card-title">Total Investido</div>
          <div class="card-value" style="font-size:18px;">${fmtR(totalGasto)}</div>
          <div class="card-sub">${fmt2(totalNFs)} notas fiscais</div>
        </div>
      </div>

      <!-- ESTOQUE -->
      <div class="section">
        <div class="section-title">📦 Estoque de Materiais</div>
        <table>
          <thead><tr><th>Código</th><th>Material</th><th>Categoria</th><th>Qtd Atual</th><th>Qtd Mínima</th><th>Unidade</th><th>Situação</th></tr></thead>
          <tbody>
            ${stock.map(s=>`<tr>
              <td><code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:11px;">${s.code||"—"}</code></td>
              <td style="font-weight:600;">${s.name}</td>
              <td style="color:#666;">${s.cat}</td>
              <td style="font-weight:700;font-size:15px;color:${s.qty<=s.min*0.6?"#c62828":s.qty<=s.min?"#e65100":"#2e7d32"};">${fmt2(s.qty)}</td>
              <td style="color:#888;">${fmt2(s.min)}</td>
              <td style="color:#888;">${s.unit}</td>
              <td><span style="${statusStyle(s)}">${statusTxt(s)}</span></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <!-- ORDENS DE SERVIÇO -->
      <div class="section">
        <div class="section-title">🔧 Ordens de Serviço (${fmt2(os.length)})</div>
        <table>
          <thead><tr><th>Nº OS</th><th>Técnico</th><th>Cliente</th><th>Data</th><th>Materiais</th><th>Total Itens</th></tr></thead>
          <tbody>
            ${os.map(o=>{const t=users.find(u=>u.id===o.uid);const mats=o.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name.split(" ")[0]}(${it.qty})`:"?";}).join(", ");const tot=o.items.reduce((a,i)=>a+i.qty,0);return`<tr>
              <td style="font-weight:700;color:#cc0000;">${o.os}</td>
              <td style="font-weight:600;">${t?.name||"?"}</td>
              <td>${o.client}</td>
              <td style="color:#888;font-size:11px;">${o.date}</td>
              <td style="font-size:11px;color:#555;">${mats}</td>
              <td style="font-weight:700;text-align:center;">${fmt2(tot)}</td>
            </tr>`;}).join("")}
          </tbody>
        </table>
      </div>

      <!-- TÉCNICOS RANKING -->
      <div class="section">
        <div class="section-title">👷 Desempenho dos Técnicos</div>
        <table>
          <thead><tr><th>#</th><th>Técnico</th><th>OS Realizadas</th><th>Material em Posse</th><th>Mat. Consumido</th><th>Devoluções</th><th>Solicitações</th></tr></thead>
          <tbody>
            ${rankingTec.map((t,i)=>`<tr>
              <td style="font-weight:800;font-size:16px;color:${i===0?"#cc0000":i===1?"#888":"#aaa"};text-align:center;">${i+1}</td>
              <td style="font-weight:700;">${t.name}</td>
              <td style="text-align:center;"><span class="tech-badge" style="background:#fff0f0;color:#cc0000;border:1px solid #ffcdd2;">${fmt2(t.qtdOS)} OS</span></td>
              <td style="text-align:center;font-weight:700;color:#1565c0;">${fmt2(t.matEmPosse)}</td>
              <td style="text-align:center;font-weight:700;color:#cc0000;">${fmt2(t.matUsado)}</td>
              <td style="text-align:center;color:#e65100;">${fmt2(t.devs)}</td>
              <td style="text-align:center;color:#6a1b9a;">${fmt2(t.sols)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <!-- NOTAS FISCAIS -->
      <div class="section">
        <div class="section-title">💰 Notas Fiscais — Histórico de Compras</div>
        <table>
          <thead><tr><th>Nº NF</th><th>Fornecedor</th><th>Data</th><th>Itens</th><th>Valor Total</th></tr></thead>
          <tbody>
            ${nf.map(n=>`<tr>
              <td style="font-weight:700;color:#cc0000;">${n.num}</td>
              <td style="font-weight:600;">${n.supplier}</td>
              <td style="color:#888;font-size:11px;">${n.date}</td>
              <td style="text-align:center;">${n.items?.length||0}</td>
              <td style="font-weight:800;font-size:14px;color:#2e7d32;">${fmtR(n.total)}</td>
            </tr>`).join("")}
            <tr style="background:#fff0f0;">
              <td colspan="4" style="font-weight:800;text-align:right;padding-right:20px;">TOTAL INVESTIDO:</td>
              <td style="font-weight:800;font-size:16px;color:#cc0000;">${fmtR(totalGasto)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- GASTOS POR MÊS -->
      ${gastoPorMes.length>0?`
      <div class="section">
        <div class="section-title">📊 Gastos por Mês</div>
        <div class="bar-wrap">
          ${gastoPorMes.map(m=>`
          <div class="bar-row">
            <div class="bar-label">${m.mes}</div>
            <div class="bar-bg">
              <div class="bar-fill" style="width:${Math.max(5,(m.total/maxMes)*100)}%">
                <span>${m.qtdNF} NF(s)</span>
              </div>
            </div>
            <div class="bar-val">${fmtR(m.total)}</div>
          </div>`).join("")}
        </div>
      </div>`:""}

      <!-- ALERTAS DE PREÇO -->
      ${alertasPreco.length>0?`
      <div class="section">
        <div class="section-title">🔔 Alertas de Variação de Preço</div>
        ${alertasAlta.length>0?`<div style="font-weight:700;color:#c62828;margin-bottom:8px;font-size:12px;">📈 AUMENTO DE PREÇO (${alertasAlta.length})</div>`:""}
        ${alertasAlta.map(a=>`
        <div class="alert-up">
          <div>
            <div class="alert-name">📦 ${a.name} <span style="font-size:10px;color:#888;">(${a.code})</span></div>
            <div class="alert-detail">${a.prevNF}: ${fmtR(a.prevPrice)}/${a.unit} → ${a.currNF}: ${fmtR(a.currPrice)}/${a.unit}</div>
          </div>
          <div class="alert-pct-up">▲ +${a.pct.toFixed(1)}%</div>
        </div>`).join("")}
        ${alertasBaixa.length>0?`<div style="font-weight:700;color:#2e7d32;margin-bottom:8px;margin-top:12px;font-size:12px;">📉 REDUÇÃO DE PREÇO (${alertasBaixa.length})</div>`:""}
        ${alertasBaixa.map(a=>`
        <div class="alert-down">
          <div>
            <div class="alert-name">📦 ${a.name} <span style="font-size:10px;color:#888;">(${a.code})</span></div>
            <div class="alert-detail">${a.prevNF}: ${fmtR(a.prevPrice)}/${a.unit} → ${a.currNF}: ${fmtR(a.currPrice)}/${a.unit}</div>
          </div>
          <div class="alert-pct-down">▼ ${a.pct.toFixed(1)}%</div>
        </div>`).join("")}
      </div>`:""}

      <!-- DEVOLUÇÕES -->
      <div class="section">
        <div class="section-title">↩️ Devoluções (${fmt2(returns.length)})</div>
        <table>
          <thead><tr><th>Técnico</th><th>Data</th><th>Materiais</th><th>Status</th><th>Aprovado por</th></tr></thead>
          <tbody>
            ${returns.map(r=>{const t=users.find(u=>u.id===r.uid);const mats=r.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name.split(" ")[0]}(${it.qty})`:"?";}).join(", ");const stc={pending:"background:#fff3e0;color:#e65100",approved:"background:#e8f5e9;color:#2e7d32",rejected:"background:#ffebee;color:#c62828"};const stl={pending:"⏳ Pendente",approved:"✅ Aprovada",rejected:"❌ Rejeitada"};return`<tr>
              <td style="font-weight:600;">${t?.name||"?"}</td>
              <td style="color:#888;font-size:11px;">${r.date}</td>
              <td style="font-size:11px;">${mats}</td>
              <td><span style="${stc[r.status]||""};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${stl[r.status]||r.status}</span></td>
              <td style="color:#888;">${r.rBy||"—"}</td>
            </tr>`;}).join("")}
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-logo">StockTel — Soluções em Telecomunicações · v1.1</div>
        <div>Relatório gerado em ${new Date().toLocaleString("pt-BR")} · v1.0.0</div>
        <div>© ${new Date().getFullYear()} StockTel — Todos os direitos reservados</div>
      </div>

    </div>
    </body></html>`);
    w.document.close();
  };

  // ── Gera Excel Profissional ──
  const gerarExcel=()=>{
    const wb=XLSX.utils.book_new();
    const fmtR2=(n)=>"R$ "+Number(n||0).toFixed(2).replace(".",",");
    const statusTxt=(s)=>s.qty<=s.min*0.6?"CRÍTICO":s.qty<=s.min?"BAIXO":"OK";

    // Aba 1: Estoque
    const estoqueData=[
      ["STOCKTEL — RELATÓRIO DE ESTOQUE","","","","","",""],
      [`Gerado em: ${new Date().toLocaleString("pt-BR")}`,"","","","","",""],
      [""],
      ["CÓDIGO","MATERIAL","CATEGORIA","UNIDADE","QTD ATUAL","QTD MÍNIMA","SITUAÇÃO"],
      ...stock.map(s=>[s.code||"—",s.name,s.cat,s.unit,s.qty,s.min,statusTxt(s)])
    ];
    const wsEst=XLSX.utils.aoa_to_sheet(estoqueData);
    wsEst["!cols"]=[{wch:12},{wch:35},{wch:20},{wch:8},{wch:12},{wch:12},{wch:10}];
    XLSX.utils.book_append_sheet(wb,wsEst,"📦 Estoque");

    // Aba 2: OS
    const osData=[
      ["STOCKTEL — ORDENS DE SERVIÇO","","","","",""],
      [`Total: ${os.length} OS`,"","","","",""],
      [""],
      ["Nº OS","TÉCNICO","CLIENTE","DATA","MATERIAIS","TOTAL ITENS"],
      ...os.map(o=>{const t=users.find(u=>u.id===o.uid);const mats=o.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name}(${it.qty})`:it.sid;}).join("; ");const tot=o.items.reduce((a,i)=>a+i.qty,0);return[o.os,t?.name||"?",o.client,o.date,mats,tot];})
    ];
    const wsOS=XLSX.utils.aoa_to_sheet(osData);
    wsOS["!cols"]=[{wch:18},{wch:20},{wch:25},{wch:18},{wch:50},{wch:12}];
    XLSX.utils.book_append_sheet(wb,wsOS,"🔧 Ordens de Serviço");

    // Aba 3: Técnicos
    const tecData=[
      ["STOCKTEL — DESEMPENHO DOS TÉCNICOS","","","","","",""],
      [""],
      ["#","TÉCNICO","OS REALIZADAS","MAT. EM POSSE","MAT. CONSUMIDO","DEVOLUÇÕES","SOLICITAÇÕES"],
      ...rankingTec.map((t,i)=>[i+1,t.name,t.qtdOS,t.matEmPosse,t.matUsado,t.devs,t.sols])
    ];
    const wsTec=XLSX.utils.aoa_to_sheet(tecData);
    wsTec["!cols"]=[{wch:4},{wch:22},{wch:15},{wch:16},{wch:16},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb,wsTec,"👷 Técnicos");

    // Aba 4: Financeiro
    const finData=[
      ["STOCKTEL — RELATÓRIO FINANCEIRO","","","",""],
      [`Total Investido: ${fmtR2(totalGasto)}  |  ${totalNFs} Notas Fiscais  |  Média: ${fmtR2(mediaGastoPorNF)}/NF`,"","","",""],
      [""],
      ["Nº NF","FORNECEDOR","DATA","QTD ITENS","VALOR TOTAL"],
      ...nf.map(n=>[n.num,n.supplier,n.date,n.items?.length||0,Number(n.total||0)]),
      [""],
      ["TOTAL","","","",Number(totalGasto)],
      [""],
      ["GASTOS POR MÊS","","","",""],
      ["MÊS","QTD NFs","TOTAL MÊS","",""],
      ...gastoPorMes.map(m=>[m.mes,m.qtdNF,Number(m.total),"",""])
    ];
    const wsFin=XLSX.utils.aoa_to_sheet(finData);
    wsFin["!cols"]=[{wch:16},{wch:25},{wch:14},{wch:12},{wch:16}];
    XLSX.utils.book_append_sheet(wb,wsFin,"💰 Financeiro");

    // Aba 5: Alertas de Preço
    if(alertasPreco.length>0){
      const altData=[
        ["STOCKTEL — ALERTAS DE VARIAÇÃO DE PREÇO","","","","","",""],
        [""],
        ["CÓDIGO","MATERIAL","NF ANTERIOR","PREÇO ANT.","NF ATUAL","PREÇO ATUAL","VARIAÇÃO %"],
        ...alertasPreco.map(a=>[a.code,a.name,a.prevNF,Number(a.prevPrice.toFixed(2)),a.currNF,Number(a.currPrice.toFixed(2)),`${a.up?"+":""}${a.pct.toFixed(1)}%`])
      ];
      const wsAlt=XLSX.utils.aoa_to_sheet(altData);
      wsAlt["!cols"]=[{wch:12},{wch:30},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12}];
      XLSX.utils.book_append_sheet(wb,wsAlt,"🔔 Alertas de Preço");
    }

    // Aba 6: Devoluções
    const devData=[
      ["STOCKTEL — DEVOLUÇÕES","","","",""],
      [""],
      ["TÉCNICO","DATA","MATERIAIS","STATUS","APROVADO POR"],
      ...returns.map(r=>{const t=users.find(u=>u.id===r.uid);const mats=r.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name}(${it.qty})`:it.sid;}).join("; ");const sl={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};return[t?.name||"?",r.date,mats,sl[r.status]||r.status,r.rBy||"—"];})
    ];
    const wsDev=XLSX.utils.aoa_to_sheet(devData);
    wsDev["!cols"]=[{wch:22},{wch:20},{wch:50},{wch:14},{wch:22}];
    XLSX.utils.book_append_sheet(wb,wsDev,"↩️ Devoluções");

    XLSX.writeFile(wb,`StockTel_Relatorio_${new Date().toISOString().slice(0,10)}.xlsx`);
    setMsg("ok:✅ Excel gerado com 6 abas!");
    setTimeout(()=>setMsg(""),4000);
  };

  // ── Enviar por email ──
  const enviarEmail=()=>{
    const lista=emails.split(/[,;\n]/).map(e=>e.trim()).filter(e=>e.includes("@"));
    if(!lista.length){setMsg("err:Informe ao menos um e-mail válido.");return;}
    const corpo=`StockTel — Relatório Completo\nGerado em: ${new Date().toLocaleString("pt-BR")}\n${"=".repeat(50)}\n\n📦 ESTOQUE: ${stock.length} itens | Críticos: ${stock.filter(s=>s.qty<=s.min*0.6).length} | Baixo: ${stock.filter(s=>s.qty<=s.min&&s.qty>s.min*0.6).length}\n💰 FINANCEIRO: ${totalNFs} NFs | Total: R$ ${totalGasto.toFixed(2)}\n🔧 OS: ${os.length} ordens de serviço\n👷 TÉCNICOS: ${rankingTec.length}\n🔔 ALERTAS DE PREÇO: ${alertasAlta.length} aumentos | ${alertasBaixa.length} reduções\n\n${"=".repeat(50)}\nStockTel v1.0.0 © ${new Date().getFullYear()} StockTel`;
    window.open(`mailto:${lista.join(",")}?subject=${encodeURIComponent("StockTel — Relatório "+new Date().toLocaleDateString("pt-BR"))}&body=${encodeURIComponent(corpo)}`,"_blank");
    setMsg("ok:✅ App de e-mail aberto!");
    setTimeout(()=>setMsg(""),5000);
  };

  const tabs2=[{k:"financeiro",l:"💰 Financeiro"},{k:"tecnicos",l:"👷 Técnicos"},{k:"alertas",l:"🔔 Alertas de Preço"},{k:"email",l:"📧 Enviar"}];

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Relatório Administrativo</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Financeiro · Técnicos · Alertas de Preço · Exportação</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn color="red" size="sm" onClick={gerarPDF}>🖨️ Gerar PDF</Btn>
        <Btn color="grn" size="sm" onClick={gerarExcel}>📊 Gerar Excel</Btn>
      </div>
    </div>

    {msg&&<div style={{background:msg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${msg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{msg.replace(/^(ok|err):/,"")}</div>}

    {/* FILTRO DE PERÍODO — destaque */}
    <Card style={{padding:16,border:`2px solid ${C.gold}55`}}>
      <div style={{fontSize:12,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>📅 Filtrar Período do Relatório</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {[{k:"hoje",l:"Hoje"},{k:"semana",l:"Última Semana"},{k:"mes",l:"Este Mês"},{k:"trimestre",l:"3 Meses"},{k:"tudo",l:"Tudo"}].map(p=>(
          <button key={p.k} onClick={()=>aplicarPeriodo(p.k)} style={{
            padding:"7px 16px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:periodoRapido===p.k?700:400,
            border:`1.5px solid ${periodoRapido===p.k?C.gold:C.bdr2}`,
            background:periodoRapido===p.k?C.gold:"transparent",
            color:periodoRapido===p.k?"#000":C.muted}}>
            {p.l}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:10,alignItems:"end"}}>
        <Inp label="Data Início" value={dtInicio} onChange={v=>{setDtInicio(v);setPeriodoRapido("custom");}} type="date"/>
        <Inp label="Data Fim" value={dtFim} onChange={v=>{setDtFim(v);setPeriodoRapido("custom");}} type="date"/>
        <div style={{background:`${C.gold}18`,border:`1px solid ${C.gold}55`,borderRadius:8,padding:"10px 14px"}}>
          <div style={{fontSize:10,color:C.muted,marginBottom:3}}>PERÍODO SELECIONADO</div>
          <div style={{fontSize:13,fontWeight:800,color:C.gold}}>📅 {periodoLabel}</div>
          <div style={{display:"flex",gap:10,marginTop:6}}>
            <span style={{fontSize:10,color:C.grn,fontWeight:700}}>{viewNFAdmin.length} NFs</span>
            <span style={{fontSize:10,color:C.red,fontWeight:700}}>{viewOsAdmin.length} OS</span>
            <span style={{fontSize:10,color:C.ylw,fontWeight:700}}>{viewRetAdmin.length} Dev.</span>
          </div>
        </div>
      </div>
    </Card>

    {/* Cards resumo */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
      {[
        {label:"TOTAL INVESTIDO",value:`R$ ${fmt(Math.round(totalGasto))}`,sub:`${totalNFs} notas fiscais`,icon:"💰",color:C.grn},
        {label:"MÉDIA POR NF",value:`R$ ${fmt(Math.round(mediaGastoPorNF))}`,sub:"valor médio",icon:"📊",color:C.blue},
        {label:"ALERTAS ALTA",value:fmt(alertasAlta.length),sub:"aumentos de preço",icon:"📈",color:C.red},
        {label:"ALERTAS BAIXA",value:fmt(alertasBaixa.length),sub:"reduções de preço",icon:"📉",color:C.grn},
      ].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?12:16,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:40,height:40,borderRadius:10,background:`${s.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{s.icon}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:".06em",marginBottom:2}}>{s.label}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?16:18,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.sub}</div>
          </div>
        </Card>
      ))}
    </div>

    {/* Filtro de Período */}
    <Card style={{padding:16}}>
      <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>📅 Filtrar por Período</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {[{k:"hoje",l:"Hoje"},{k:"semana",l:"Última Semana"},{k:"mes",l:"Este Mês"},{k:"trimestre",l:"3 Meses"},{k:"tudo",l:"Tudo"}].map(p=>(
          <button key={p.k} onClick={()=>aplicarPeriodo(p.k)}
            style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${periodoRapido===p.k?C.gold:C.bdr2}`,
              background:periodoRapido===p.k?`${C.gold}22`:"transparent",
              color:periodoRapido===p.k?C.gold:C.muted,fontSize:12,
              fontWeight:periodoRapido===p.k?700:400,cursor:"pointer"}}>
            {p.l}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"200px 200px auto",gap:10,alignItems:"end"}}>
        <Inp label="Data Início" value={dtInicio} onChange={v=>{setDtInicio(v);setPeriodoRapido("custom");}} type="date"/>
        <Inp label="Data Fim" value={dtFim} onChange={v=>{setDtFim(v);setPeriodoRapido("custom");}} type="date"/>
        <div style={{paddingBottom:2}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>PERÍODO</div>
          <div style={{background:`${C.gold}22`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:700,color:C.gold,whiteSpace:"nowrap"}}>
            📅 {periodoLabel}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:12,marginTop:12,flexWrap:"wrap"}}>
        {[
          {label:"NFs",value:viewNFAdmin.length,color:C.grn},
          {label:"OS",value:viewOsAdmin.length,color:C.red},
          {label:"Devoluções",value:viewRetAdmin.length,color:C.ylw},
        ].map((c,i)=>(
          <div key={i} style={{background:C.surf,borderRadius:8,padding:"7px 12px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:c.color,fontSize:16}}>{c.value}</span>
            <span style={{fontSize:11,color:C.muted}}>{c.label} no período</span>
          </div>
        ))}
      </div>
    </Card>

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`,overflowX:"auto"}}>
      {tabs2.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>)}
    </div>

    {/* FINANCEIRO */}
    {tab==="financeiro"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card style={{padding:18}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:16}}>📊 Gastos Mensais — {periodoLabel}</div>
        {gastoPorMes.length===0?<div style={{color:C.muted,fontSize:13}}>Nenhuma nota fiscal no período selecionado.</div>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {gastoPorMes.map(m=>(
            <div key={m.mes}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:600,color:C.txt}}>{m.mes} <span style={{fontSize:10,color:C.muted}}>· {m.qtdNF} NF(s)</span></span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:13}}>R$ {fmt(Math.round(m.total))}</span>
              </div>
              <div style={{height:24,background:C.bdr,borderRadius:6,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.max(3,(m.total/maxMes)*100)}%`,background:`linear-gradient(90deg,${C.red},#ff4444)`,borderRadius:6,display:"flex",alignItems:"center",paddingLeft:8}}>
                  <span style={{fontSize:10,fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>{m.itens} item(s)</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{marginTop:8,padding:"10px 14px",background:C.surf,borderRadius:8,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:C.muted}}>Total geral ({totalNFs} NFs)</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:16}}>R$ {fmt(Math.round(totalGasto))}</span>
          </div>
        </div>}
      </Card>
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,fontSize:14,fontWeight:700,color:C.txt}}>📋 Detalhamento por Nota Fiscal</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["Nº NF","FORNECEDOR","DATA","ITENS","VALOR TOTAL"]}/></thead>
            <tbody>
              {nf.length===0?<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhuma NF registrada.</td></tr>
              :viewNFAdmin.map(n=><TRow key={n.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.gold,fontWeight:700}}>{n.num}</span>,
                <span style={{fontWeight:600,color:C.txt}}>{n.supplier}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{n.date}</span>,
                <span style={{textAlign:"center"}}>{n.items?.length||0}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:14}}>R$ {fmt(Math.round(n.total||0))}</span>
              ]}/>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>}

    {/* TÉCNICOS */}
    {tab==="tecnicos"&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,fontSize:14,fontWeight:700,color:C.txt}}>👷 Ranking dos Técnicos</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["#","TÉCNICO","OS REALIZADAS","MAT. EM POSSE","MAT. CONSUMIDO","DEVOLUÇÕES","SOLICITAÇÕES"]}/></thead>
          <tbody>
            {rankingTec.length===0?<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhum técnico cadastrado.</td></tr>
            :rankingTec.map((t,i)=><TRow key={t.id} cells={[
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:18,color:i===0?C.red:i===1?C.muted:"#555"}}>{i+1}</span>,
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${C.red}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>👷</div>
                <span style={{fontWeight:600,color:C.txt}}>{t.name}</span>
              </div>,
              <Bdg color="red">{t.qtdOS} OS</Bdg>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.blue,fontSize:14}}>{fmt(t.matEmPosse)}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.red,fontSize:14}}>{fmt(t.matUsado)}</span>,
              <span style={{color:C.ylw,fontWeight:600}}>{t.devs}</span>,
              <span style={{color:C.muted}}>{t.sols}</span>
            ]}/>)}
          </tbody>
        </table>
      </div>
    </Card>}

    {/* ALERTAS */}
    {tab==="alertas"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {alertasPreco.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhuma variação de preço detectada ainda.<br/>Registre ao menos 2 NFs com o mesmo produto.</span></Card>}
      {alertasAlta.length>0&&<div>
        <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:8,letterSpacing:".06em",textTransform:"uppercase"}}>📈 Aumento de Preço ({alertasAlta.length})</div>
        {alertasAlta.map((a,i)=>(
          <Card key={i} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C.red}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:4}}>📦 {a.name} <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>({a.code})</span></div>
                <div style={{fontSize:11,color:C.muted}}>
                  <span style={{color:C.txt2}}>{a.prevNF}:</span> R$ {a.prevPrice.toFixed(2)}/{a.unit}
                  <span style={{margin:"0 8px",color:C.muted}}>→</span>
                  <span style={{color:C.txt2}}>{a.currNF}:</span> R$ {a.currPrice.toFixed(2)}/{a.unit}
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:4}}>Diferença: <strong style={{color:C.red}}>+R$ {Math.abs(a.diff).toFixed(2)}</strong> por {a.unit}</div>
              </div>
              <div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"8px 14px",textAlign:"center",flexShrink:0}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.red,fontSize:22}}>▲ +{a.pct.toFixed(1)}%</div>
                <div style={{fontSize:10,color:C.muted}}>mais caro</div>
              </div>
            </div>
          </Card>
        ))}
      </div>}
      {alertasBaixa.length>0&&<div style={{marginTop:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.grn,marginBottom:8,letterSpacing:".06em",textTransform:"uppercase"}}>📉 Redução de Preço ({alertasBaixa.length})</div>
        {alertasBaixa.map((a,i)=>(
          <Card key={i} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C.grn}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:4}}>📦 {a.name} <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>({a.code})</span></div>
                <div style={{fontSize:11,color:C.muted}}>
                  <span style={{color:C.txt2}}>{a.prevNF}:</span> R$ {a.prevPrice.toFixed(2)}/{a.unit}
                  <span style={{margin:"0 8px"}}> → </span>
                  <span style={{color:C.txt2}}>{a.currNF}:</span> R$ {a.currPrice.toFixed(2)}/{a.unit}
                </div>
              </div>
              <div style={{background:C.grnD,border:`1px solid ${C.grn}44`,borderRadius:8,padding:"8px 14px",textAlign:"center",flexShrink:0}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:22}}>▼ {a.pct.toFixed(1)}%</div>
                <div style={{fontSize:10,color:C.muted}}>mais barato</div>
              </div>
            </div>
          </Card>
        ))}
      </div>}
    </div>}

    {/* EMAIL */}
    {tab==="email"&&<Card style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{fontSize:14,fontWeight:700,color:C.txt}}>📧 Enviar Relatório por E-mail</div>
      <div>
        <label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Destinatários (um por linha ou vírgula)</label>
        <textarea value={emails} onChange={e=>setEmails(e.target.value)} rows={4}
          placeholder={"financeiro@empresa.com\ngerente@empresa.com"}
          style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"11px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
      </div>
      <div style={{background:C.surf,borderRadius:8,padding:"12px 14px",border:`1px solid ${C.bdr}`,fontSize:12,color:C.muted,lineHeight:1.6}}>
        💡 Clique em <strong style={{color:C.txt}}>Gerar PDF</strong> ou <strong style={{color:C.txt}}>Gerar Excel</strong> no topo para baixar os arquivos, depois anexe no seu e-mail. Ou clique abaixo para abrir o app de e-mail com resumo no corpo.
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Btn color="red" onClick={gerarPDF} style={{flex:1}}>🖨️ Gerar PDF Completo</Btn>
        <Btn color="grn" onClick={gerarExcel} style={{flex:1}}>📊 Gerar Excel (6 abas)</Btn>
        <Btn color="gold" onClick={enviarEmail} style={{flex:1}}>📧 Abrir App de E-mail</Btn>
      </div>
    </Card>}
  </div>;
}

/* ── SOLICITAÇÕES DE MATERIAL ── */
function SolicitacaoPage({solicitacoes,setSolicitacoes,stock,setStock,tstock,setTstock,users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const[modal,setModal]=useState(false);
  const[items,setItems]=useState([]);
  const[urgencia,setUrgencia]=useState("normal");
  const[notes,setNotes]=useState("");
  const[msg,setMsg]=useState("");

  const viewSol=isTec?solicitacoes.filter(s=>s.uid===currentUser.id):solicitacoes;
  const pendentes=solicitacoes.filter(s=>s.status==="pending");

  const abrirModal=()=>{setItems([]);setUrgencia("normal");setNotes("");setModal(true);};

  const addItem=()=>setItems(p=>[...p,{id:uid(),sid:"",qty:""}]);
  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));

  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);

  const enviar=()=>{
    if(!validItems.length){setMsg("err:Adicione ao menos 1 material.");return;}
    setSolicitacoes(p=>[{id:uid(),uid:currentUser.id,date:now(),
      items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),
      status:"pending",urgencia,notes,rDate:null,rBy:null},...p]);
    addLog(currentUser.name,"Solicitação",currentUser.name+" solicitou "+validItems.length+" item(s)");
    setModal(false);
    setMsg("ok:Solicitação enviada!");
    setTimeout(()=>setMsg(""),4000);
  };

  const confirmar=(sol)=>{
    let ok=true;
    sol.items.forEach(it=>{const s=stock.find(x=>x.id===it.sid);if(!s||s.qty<it.qty){ok=false;alert("Estoque insuficiente: "+(s?.name||it.sid));}});
    if(!ok)return;
    setStock(p=>p.map(s=>{const it=sol.items.find(i=>i.sid===s.id);return it?{...s,qty:s.qty-it.qty}:s;}));
    setTstock(p=>{let n=[...p];sol.items.forEach(it=>{const ex=n.find(t=>t.uid===sol.uid&&t.sid===it.sid);if(ex)n=n.map(t=>t.id===ex.id?{...t,qty:t.qty+it.qty}:t);else n.push({id:uid(),uid:sol.uid,sid:it.sid,qty:it.qty});});return n;});
    setSolicitacoes(p=>p.map(s=>s.id===sol.id?{...s,status:"confirmed",rDate:now(),rBy:currentUser.name}:s));
    addLog(currentUser.name,"Saída","Solicitação confirmada · "+(users.find(u=>u.id===sol.uid)?.name));
  };

  const rejeitar=(sol)=>{
    setSolicitacoes(p=>p.map(s=>s.id===sol.id?{...s,status:"rejected",rDate:now(),rBy:currentUser.name}:s));
    addLog(currentUser.name,"Solicitação Rejeitada","Técnico: "+(users.find(u=>u.id===sol.uid)?.name));
  };

  const sc={pending:"ylw",confirmed:"grn",rejected:"red"};
  const sl={pending:"⏳ Aguardando",confirmed:"✅ Confirmada",rejected:"❌ Rejeitada"};
  const urg={normal:{label:"Normal",color:C.muted},alta:{label:"🟡 Alta",color:C.ylw},urgente:{label:"🔴 Urgente",color:C.red}};

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Solicitações de Material</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>{isTec?"Solicite materiais ao estoque":"Gerencie pedidos dos técnicos"}</p>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        {!isTec&&pendentes.length>0&&<Bdg color="ylw">🔔 {pendentes.length} pendente{pendentes.length>1?"s":""}</Bdg>}
        {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={abrirModal}>📋 Nova Solicitação</Btn>}
      </div>
    </div>

    {msg&&<div style={{background:msg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${msg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{msg.replace(/^(ok|err):/,"")}</div>}

    {viewSol.length===0&&<Card style={{padding:40,textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:10}}>📋</div>
      <div style={{fontSize:14,color:C.muted}}>{isTec?"Nenhuma solicitação ainda. Clique em Nova Solicitação!":"Nenhuma solicitação recebida."}</div>
    </Card>}

    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {viewSol.map(sol=>{
        const tech=users.find(u=>u.id===sol.uid);
        const isUrg=sol.urgencia==="urgente";
        return <Card key={sol.id} style={{padding:16,borderLeft:`3px solid ${sol.status==="pending"?isUrg?C.red:C.ylw:sol.status==="confirmed"?C.grn:C.red}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:10}}>
                <Bdg color={sc[sol.status]}>{sl[sol.status]}</Bdg>
                {sol.urgencia!=="normal"&&<span style={{fontSize:11,fontWeight:700,color:urg[sol.urgencia]?.color}}>{urg[sol.urgencia]?.label}</span>}
                <span style={{fontSize:13,fontWeight:700,color:C.txt}}>👷 {tech?.name||"?"}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{sol.date}</span>
              </div>
              {sol.notes&&<div style={{fontSize:12,color:C.muted,marginBottom:10,fontStyle:"italic"}}>"{sol.notes}"</div>}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
                {sol.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
                  <div key={i} style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"—"}</div>
                    <div style={{fontSize:12,fontWeight:600,color:C.txt,lineHeight:1.3,marginTop:2}}>{s?.name||"?"}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                      <span style={{fontSize:10,color:C.muted}}>{s?.unit||""}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>{fmt(it.qty)}</span>
                    </div>
                  </div>
                );})}
              </div>
              {sol.rBy&&<div style={{fontSize:11,color:C.muted,marginTop:8}}>Resolvido por <strong style={{color:C.txt2}}>{sol.rBy}</strong> em {sol.rDate}</div>}
            </div>
            {!isTec&&sol.status==="pending"&&<div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
              <Btn size="sm" color="grn" onClick={()=>confirmar(sol)}>✓ Confirmar</Btn>
              <Btn size="sm" color="red" outline onClick={()=>rejeitar(sol)}>✕ Rejeitar</Btn>
            </div>}
          </div>
        </Card>;
      })}
    </div>

    {/* Modal — layout limpo com botão adicionar */}
    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,
        borderRadius:isMobile?"16px 16px 0 0":12,
        width:"100%",maxWidth:600,
        height:isMobile?"95vh":"auto",
        maxHeight:isMobile?"95vh":"88vh",
        display:"flex",flexDirection:"column",
        position:isMobile?"absolute":"relative",
        bottom:isMobile?0:"auto"}}>

        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>📋 Nova Solicitação</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} material(is) adicionado(s)</div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Body scroll */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>

          {/* Urgência e obs */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="Urgência" value={urgencia} onChange={setUrgencia} options={[{value:"normal",label:"Normal"},{value:"alta",label:"🟡 Alta Prioridade"},{value:"urgente",label:"🔴 Urgente"}]}/>
            <Inp label="Observação" value={notes} onChange={setNotes} placeholder="Ex: Para OS de amanhã..."/>
          </div>

          {/* Lista de materiais adicionados */}
          {items.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>
              Materiais da Solicitação
            </div>
            {items.map((it,idx)=>{
              const s=it.sid?stock.find(x=>x.id===it.sid):null;
              return <div key={it.id} style={{
                display:"flex",alignItems:"center",gap:8,
                background:it.sid?`${C.gold}08`:C.surf,
                borderRadius:10,padding:"10px 12px",
                border:`1px solid ${it.sid?`${C.gold}44`:C.bdr2}`}}>
                {/* Número */}
                <div style={{width:24,height:24,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.gold,flexShrink:0}}>{idx+1}</div>
                {/* Select material */}
                <div style={{flex:1,minWidth:0}}>
                  <select value={it.sid} onChange={e=>updItem(it.id,"sid",e.target.value)}
                    style={{width:"100%",background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:it.sid?C.txt:C.muted,fontSize:13}}>
                    <option value="">— Selecionar material —</option>
                    {stock.map(s=><option key={s.id} value={s.id}>[{s.code||"—"}] {s.name} ({s.qty} {s.unit})</option>)}
                  </select>
                  {s&&<div style={{fontSize:10,color:C.grn,marginTop:3}}>✓ Disponível: {s.qty} {s.unit}</div>}
                </div>
                {/* Qtd */}
                <input type="number" value={it.qty} onChange={e=>updItem(it.id,"qty",e.target.value)}
                  placeholder="Qtd" min="0"
                  style={{width:70,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:14,fontWeight:700,textAlign:"center",flexShrink:0}}/>
                {/* Remover */}
                <button onClick={()=>remItem(it.id)}
                  style={{background:C.redD,color:C.red,border:"none",borderRadius:7,width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
              </div>;
            })}
          </div>}

          {/* Botão adicionar material — bem destacado */}
          <button onClick={addItem} style={{
            width:"100%",padding:"14px",
            background:items.length===0?`${C.gold}22`:"transparent",
            border:`2px dashed ${C.gold}`,
            borderRadius:10,color:C.gold,
            cursor:"pointer",fontSize:14,fontWeight:700,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            transition:"all .2s"}}>
            <span style={{fontSize:22,lineHeight:1}}>+</span>
            {items.length===0?"Clique aqui para adicionar o primeiro material":"Adicionar mais um material"}
          </button>

          {items.length===0&&<div style={{textAlign:"center",fontSize:12,color:C.muted2,marginTop:-4}}>
            Adicione os materiais um por um e envie tudo junto no final
          </div>}

        </div>

        {/* Footer fixo */}
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <div style={{fontSize:13,color:C.muted}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:18}}>{validItems.length}</span> material(is)
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn color="gold" onClick={enviar} disabled={validItems.length===0}>📤 Enviar Solicitação</Btn>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}





/* ── FROTA ── */
function FrotaPage({veiculos,setVeiculos,abastecimentos,setAbastecimentos,checkouts,setCheckouts,users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const isAdm=currentUser.role==="admin";
  const[tab,setTab]=useState(isTec?"check":"veic");
  const[modalVeic,setModalVeic]=useState(null);
  const[modalAbast,setModalAbast]=useState(false);
  const[modalCheck,setModalCheck]=useState(null);
  const[modalFotos,setModalFotos]=useState(null);
  const[modalDoc,setModalDoc]=useState(null);
  const techs=users.filter(u=>u.role==="tecnico");

  const FOTOS_LABELS=["Frente","Lado Esquerdo","Lado Direito","Traseira"];
  const FOTOS_ICONS=["⬆️","⬅️","➡️","⬇️"];
  const STATUS_OPTS=["ativo","manutenção","inativo"];
  const STATUS_COLOR={ativo:C.grn,manutenção:C.ylw,inativo:C.red};
  const COMB_OPTS=["gasolina","etanol","diesel","flex","gnv"];
  const COMB_NÍVEL=["reserva","1/4","1/2","3/4","cheio"];
  const COMB_COLOR={reserva:C.red,"1/4":C.ylw,"1/2":C.ylw,"3/4":C.grn,cheio:C.grn};
  const PNEU_OPTS=["ok","baixo","problema"];
  const PNEU_COLOR={ok:C.grn,baixo:C.ylw,problema:C.red};
  const PNEU_ICON={ok:"✅","baixo":"⚠️",problema:"❌"};

  const blankVeic=()=>({id:uid(),placa:"",modelo:"",ano:"",cor:"",tecnicoId:"",dtAquisicao:"",kmCadastro:"",status:"ativo",obs:"",fotos:["","","",""],docPDF:""});
  const blankAbast=()=>({id:uid(),veiculoId:"",tecnicoId:currentUser.id,dtAbast:new Date().toISOString().slice(0,10),odometro:"",litros:"",valor:"",combustivel:"gasolina",posto:"",foto:"",obs:""});
  const blankCheck=(tipo)=>({
    id:uid(),veiculoId:"",tecnicoId:currentUser.id,tipo:tipo||"retirada",
    dtCheck:new Date().toISOString().slice(0,10),km:"",
    combustivel:"cheio",
    pneus:{diant_esq:"ok",diant_dir:"ok",tras_esq:"ok",tras_dir:"ok"},
    avarias:false,descAvarias:"",
    fotoOdometro:"",fotosAvarias:["","",""],
    obs:"",registradoEm:now()
  });

  const[formVeic,setFormVeic]=useState(blankVeic());
  const[formAbast,setFormAbast]=useState(blankAbast());
  const[formCheck,setFormCheck]=useState(blankCheck("retirada"));
  const[errVeic,setErrVeic]=useState("");
  const[errAbast,setErrAbast]=useState("");
  const[errCheck,setErrCheck]=useState("");

  const viewAbast=isTec?abastecimentos.filter(a=>a.tecnicoId===currentUser.id):abastecimentos;
  const viewCheck=isTec?checkouts.filter(c=>c.tecnicoId===currentUser.id):checkouts;

  const getKmAtual=(veicId)=>{
    const regs=abastecimentos.filter(a=>a.veiculoId===veicId&&parseInt(a.odometro)>0);
    const regsCheck=checkouts.filter(c=>c.veiculoId===veicId&&parseInt(c.km)>0);
    const allKms=[...regs.map(a=>parseInt(a.odometro)||0),...regsCheck.map(c=>parseInt(c.km)||0)];
    if(!allKms.length){const v=veiculos.find(x=>x.id===veicId);return parseInt(v?.kmCadastro)||0;}
    return Math.max(...allKms);
  };

  const getAlertaOleo=(veic)=>{
    const kmAtual=getKmAtual(veic.id);
    const kmBase=parseInt(veic.kmCadastro)||0;
    const proxima=Math.ceil((kmAtual-kmBase+1)/10000)*10000+kmBase;
    const faltam=proxima-kmAtual;
    return{kmAtual,faltam,urgente:faltam<=500,alerta:faltam<=2000};
  };

  const handleFotoVeic=(idx,e)=>{const file=e.target.files[0];if(!file)return;if(file.size>3*1024*1024){alert("Máx 3MB.");return;}const r=new FileReader();r.onload=(ev)=>setFormVeic(f=>({...f,fotos:f.fotos.map((ft,i)=>i===idx?ev.target.result:ft)}));r.readAsDataURL(file);};
  const handleDocPDF=(e)=>{const file=e.target.files[0];if(!file)return;if(file.size>5*1024*1024){alert("Máx 5MB.");return;}const r=new FileReader();r.onload=(ev)=>setFormVeic(f=>({...f,docPDF:ev.target.result}));r.readAsDataURL(file);};
  const handleFotoAbast=(e)=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=(ev)=>setFormAbast(f=>({...f,foto:ev.target.result}));r.readAsDataURL(file);};
  const handleFotoOdo=(e)=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=(ev)=>setFormCheck(f=>({...f,fotoOdometro:ev.target.result}));r.readAsDataURL(file);};
  const handleFotoAvaria=(idx,e)=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=(ev)=>setFormCheck(f=>({...f,fotosAvarias:f.fotosAvarias.map((ft,i)=>i===idx?ev.target.result:ft)}));r.readAsDataURL(file);};

  const salvarVeic=()=>{
    if(!formVeic.placa.trim()){setErrVeic("Informe a placa.");return;}
    if(!formVeic.modelo.trim()){setErrVeic("Informe o modelo.");return;}
    const data={...formVeic,placa:formVeic.placa.toUpperCase().trim(),fotos:formVeic.fotos||["","","",""]};
    if(modalVeic==="new"){setVeiculos(p=>[{...data,id:uid()},...p]);addLog(currentUser.name,"Frota","Cadastrado: "+data.placa);}
    else{setVeiculos(p=>p.map(v=>v.id===modalVeic?data:v));addLog(currentUser.name,"Frota","Editado: "+data.placa);}
    setModalVeic(null);setErrVeic("");
  };

  const salvarAbast=()=>{
    if(!formAbast.veiculoId){setErrAbast("Selecione o veículo.");return;}
    if(!formAbast.odometro){setErrAbast("Informe o odômetro.");return;}
    if(!formAbast.litros){setErrAbast("Informe os litros.");return;}
    if(!formAbast.valor){setErrAbast("Informe o valor.");return;}
    const veic=veiculos.find(v=>v.id===formAbast.veiculoId);
    setAbastecimentos(p=>[{...formAbast,id:uid(),registradoEm:now()},...p]);
    addLog(currentUser.name,"Abastecimento",`${veic?.placa||"?"} · ${formAbast.litros}L · R$${formAbast.valor}`);
    setModalAbast(false);setErrAbast("");setFormAbast(blankAbast());
  };

  const salvarCheck=()=>{
    if(!formCheck.veiculoId){setErrCheck("Selecione o veículo.");return;}
    if(!formCheck.km){setErrCheck("Informe a quilometragem.");return;}
    const veic=veiculos.find(v=>v.id===formCheck.veiculoId);
    setCheckouts(p=>[{...formCheck,id:uid(),registradoEm:now()},...p]);
    addLog(currentUser.name,formCheck.tipo==="retirada"?"Retirada de Veículo":"Devolução de Veículo",`${veic?.placa||"?"} · ${formCheck.km} km · ${currentUser.name}`);
    setModalCheck(null);setErrCheck("");
  };

  const totalGasto=viewAbast.reduce((a,x)=>a+(parseFloat(x.valor)||0),0);
  const totalLitros=viewAbast.reduce((a,x)=>a+(parseFloat(x.litros)||0),0);

  const tabList=isAdm
    ?[{k:"veic",l:"🚗 Veículos"},{k:"abast",l:"⛽ Abastecimento"},{k:"check",l:"📋 Checklist Retirada"}]
    :[{k:"check",l:"📋 Meu Checklist"},{k:"abast",l:"⛽ Meus Abastecimentos"}];

  // ── Botão para preencher checklist
  const renderCheckBtn=(veic)=>(
    <Btn size="xs" color="gold" onClick={()=>{setFormCheck({...blankCheck("retirada"),veiculoId:veic.id,km:String(getKmAtual(veic.id))});setModalCheck("new");}}>📋 Checklist</Btn>
  );

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>🚗 Frota</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Veículos, abastecimento e checklist de retirada</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {isAdm&&tab==="veic"&&<Btn color="gold" size="sm" onClick={()=>{setFormVeic(blankVeic());setModalVeic("new");setErrVeic("");}}>+ Cadastrar Veículo</Btn>}
        {tab==="abast"&&<Btn color="gold" size="sm" onClick={()=>{setFormAbast(blankAbast());setModalAbast(true);setErrAbast("");}}>⛽ Abastecimento</Btn>}
        {tab==="check"&&<div style={{display:"flex",gap:8}}>
          <Btn color="gold" size="sm" onClick={()=>{setFormCheck(blankCheck("retirada"));setModalCheck("new");}}>📋 Retirada</Btn>
          <Btn color="ghost" outline size="sm" onClick={()=>{setFormCheck(blankCheck("devolucao"));setModalCheck("new");}}>↩️ Devolução</Btn>
        </div>}
      </div>
    </div>

    {tab==="abast"&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
      {[{label:"ABASTECIMENTOS",value:fmt(viewAbast.length),icon:"⛽",color:C.gold},{label:"LITROS TOTAL",value:fmt(Math.round(totalLitros)),icon:"🛢️",color:C.blue},{label:"GASTO TOTAL",value:`R$ ${fmt(Math.round(totalGasto))}`,icon:"💰",color:C.grn}].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?12:14,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${s.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{s.icon}</div>
          <div><div style={{fontSize:9,fontWeight:700,color:C.muted}}>{s.label}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?16:20,fontWeight:800,color:s.color}}>{s.value}</div></div>
        </Card>
      ))}
    </div>}

    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`}}>
      {tabList.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 18px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>)}
    </div>

    {/* ── VEÍCULOS ── */}
    {tab==="veic"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {veiculos.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum veículo cadastrado.</span></Card>}
      {veiculos.map(v=>{
        const tech=users.find(u=>u.id===v.tecnicoId);
        const oleo=getAlertaOleo(v);
        const temFoto=v.fotos?.some(f=>f);
        return <Card key={v.id} style={{padding:16,borderLeft:`3px solid ${STATUS_COLOR[v.status]||C.gold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>{v.placa}</span>
                <span style={{fontSize:14,fontWeight:700,color:C.txt}}>{v.modelo} {v.ano}</span>
                <Bdg color={v.status==="ativo"?"grn":v.status==="manutenção"?"ylw":"red"}>{v.status}</Bdg>
                {oleo.urgente&&<Bdg color="red">🔴 Óleo URGENTE!</Bdg>}
                {!oleo.urgente&&oleo.alerta&&<Bdg color="ylw">🟡 Óleo em breve</Bdg>}
                {v.docPDF&&<Bdg color="muted">📄 Doc. Anexado</Bdg>}
              </div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:12,color:C.muted,marginBottom:8}}>
                {v.cor&&<span>🎨 {v.cor}</span>}
                <span>👷 {tech?.name||"—"}</span>
                {v.dtAquisicao&&<span>📅 {v.dtAquisicao}</span>}
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.blue}}>🛣️ {fmt(oleo.kmAtual)} km</span>
                {oleo.alerta&&<span style={{color:oleo.urgente?C.red:C.ylw,fontWeight:700}}>⚙️ Faltam {fmt(oleo.faltam)} km</span>}
              </div>
              {v.obs&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic",marginBottom:8}}>{v.obs}</div>}
              {temFoto&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {v.fotos?.map((foto,i)=>foto?(
                  <div key={i} style={{position:"relative",cursor:"pointer"}} onClick={()=>setModalFotos(v)}>
                    <img src={foto} alt={FOTOS_LABELS[i]} style={{width:64,height:52,objectFit:"cover",borderRadius:6,border:`1px solid ${C.bdr2}`}}/>
                    <div style={{position:"absolute",bottom:2,left:2,background:"#000000bb",color:"#fff",fontSize:8,padding:"1px 4px",borderRadius:3}}>{FOTOS_ICONS[i]}</div>
                  </div>
                ):null)}
              </div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
              {renderCheckBtn(v)}
              {v.docPDF&&<Btn size="xs" color="ghost" outline onClick={()=>setModalDoc(v)}>📄 Documento</Btn>}
              {isAdm&&<>
                {temFoto&&<Btn size="xs" color="ghost" outline onClick={()=>setModalFotos(v)}>🖼️</Btn>}
                <Btn size="xs" color="gold" outline onClick={()=>{setFormVeic({...v,fotos:v.fotos||["","","",""],docPDF:v.docPDF||""});setModalVeic(v.id);setErrVeic("");}}>Editar</Btn>
                <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Excluir ${v.placa}?`)){setVeiculos(p=>p.filter(x=>x.id!==v.id));addLog(currentUser.name,"Frota","Excluído: "+v.placa);}}}>✕</Btn>
              </>}
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* ── ABASTECIMENTO ── */}
    {tab==="abast"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {viewAbast.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum abastecimento registrado.</span></Card>}
      {viewAbast.map(a=>{
        const v=veiculos.find(x=>x.id===a.veiculoId);
        const tech=users.find(u=>u.id===a.tecnicoId);
        return <Card key={a.id} style={{padding:14,borderLeft:`3px solid ${C.gold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v?.placa||"?"}</span>
                <span style={{fontSize:12,color:C.txt}}>{v?.modelo||""}</span>
                <Bdg color="gold">{a.combustivel}</Bdg>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{a.dtAbast}</span>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12}}>
                <span style={{color:C.grn,fontWeight:700}}>R$ {(parseFloat(a.valor)||0).toFixed(2)}</span>
                <span style={{color:C.muted}}>{a.litros}L</span>
                <span style={{color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>🛣️ {fmt(parseInt(a.odometro)||0)} km</span>
                {a.litros&&a.valor&&parseFloat(a.litros)>0&&<span style={{color:C.muted}}>R$ {(parseFloat(a.valor)/parseFloat(a.litros)).toFixed(2)}/L</span>}
                {a.posto&&<span style={{color:C.muted}}>📍 {a.posto}</span>}
              </div>
              {!isTec&&<div style={{fontSize:10,color:C.muted,marginTop:3}}>👷 {tech?.name||"?"}</div>}
            </div>
            {a.foto&&<img src={a.foto} alt="nota" style={{width:56,height:56,objectFit:"cover",borderRadius:8,border:`1px solid ${C.bdr2}`,cursor:"pointer",flexShrink:0}} onClick={()=>window.open(a.foto,"_blank")}/>}
          </div>
        </Card>;
      })}
    </div>}

    {/* ── CHECKLIST ── */}
    {tab==="check"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {viewCheck.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum checklist registrado. Clique em "📋 Retirada" para iniciar.</span></Card>}
      {viewCheck.map(c=>{
        const v=veiculos.find(x=>x.id===c.veiculoId);
        const tech=users.find(u=>u.id===c.tecnicoId);
        const pneuProb=Object.values(c.pneus||{}).some(p=>p==="problema");
        const pneuBaixo=Object.values(c.pneus||{}).some(p=>p==="baixo");
        return <Card key={c.id} style={{padding:16,borderLeft:`3px solid ${c.tipo==="retirada"?C.gold:C.grn}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <Bdg color={c.tipo==="retirada"?"gold":"grn"}>{c.tipo==="retirada"?"🚗 Retirada":"↩️ Devolução"}</Bdg>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v?.placa||"?"}</span>
                <span style={{fontSize:13,color:C.txt}}>{v?.modelo||""}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{c.dtCheck}</span>
                {!isTec&&<span style={{fontSize:11,color:C.muted}}>· {tech?.name||"?"}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginBottom:8}}>
                <div style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:2}}>QUILOMETRAGEM</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.blue,fontSize:14}}>{fmt(parseInt(c.km)||0)} km</div>
                </div>
                <div style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:2}}>COMBUSTÍVEL</div>
                  <div style={{fontWeight:700,color:COMB_COLOR[c.combustivel]||C.gold,fontSize:13}}>⛽ {c.combustivel}</div>
                </div>
                <div style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:2}}>PNEUS</div>
                  <div style={{fontWeight:700,color:pneuProb?C.red:pneuBaixo?C.ylw:C.grn,fontSize:13}}>{pneuProb?"❌ Problema":pneuBaixo?"⚠️ Baixo":"✅ OK"}</div>
                </div>
                <div style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:2}}>AVARIAS</div>
                  <div style={{fontWeight:700,color:c.avarias?C.red:C.grn,fontSize:13}}>{c.avarias?"⚠️ Sim":"✅ Não"}</div>
                </div>
              </div>
              {c.avarias&&c.descAvarias&&<div style={{fontSize:12,color:C.ylw,marginBottom:6}}>⚠️ {c.descAvarias}</div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {c.fotoOdometro&&<img src={c.fotoOdometro} alt="odômetro" style={{width:60,height:50,objectFit:"cover",borderRadius:6,border:`1px solid ${C.bdr2}`,cursor:"pointer"}} onClick={()=>window.open(c.fotoOdometro,"_blank")}/>}
                {c.fotosAvarias?.filter(f=>f).map((foto,i)=><img key={i} src={foto} alt={`avaria ${i+1}`} style={{width:60,height:50,objectFit:"cover",borderRadius:6,border:`1px solid ${C.red}44`,cursor:"pointer"}} onClick={()=>window.open(foto,"_blank")}/>)}
              </div>
              {c.obs&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic",marginTop:6}}>{c.obs}</div>}
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* ── MODAL DOCUMENTO ── */}
    {modalDoc&&<div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:12,width:"100%",maxWidth:700,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,color:C.txt}}>📄 Documento — {modalDoc.placa} {modalDoc.modelo}</span>
          <div style={{display:"flex",gap:8}}>
            <Btn size="sm" color="gold" onClick={()=>window.open(modalDoc.docPDF,"_blank")}>⬇️ Abrir PDF</Btn>
            <button onClick={()=>setModalDoc(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,padding:20,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <iframe src={modalDoc.docPDF} title="Documento" style={{width:"100%",height:"60vh",border:"none",borderRadius:8,background:"#fff"}}/>
        </div>
      </div>
    </div>}

    {/* ── MODAL FOTOS ── */}
    {modalFotos&&<div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:12,width:"100%",maxWidth:700,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,color:C.txt}}>🖼️ Fotos — {modalFotos.placa} {modalFotos.modelo}</span>
          <button onClick={()=>setModalFotos(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr",gap:12}}>
            {FOTOS_LABELS.map((label,i)=>(
              <div key={i} style={{borderRadius:10,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
                <div style={{background:C.surf,padding:"7px 12px",fontSize:11,fontWeight:700,color:C.gold}}>{FOTOS_ICONS[i]} {label}</div>
                {modalFotos.fotos?.[i]?<img src={modalFotos.fotos[i]} alt={label} style={{width:"100%",height:180,objectFit:"cover",cursor:"pointer"}} onClick={()=>window.open(modalFotos.fotos[i],"_blank")}/>:<div style={{height:180,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13}}>Sem foto</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>}

    {/* ── MODAL CADASTRO VEÍCULO ── */}
    {modalVeic&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:660,height:isMobile?"95vh":"92vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>🚗 {modalVeic==="new"?"Cadastrar":"Editar"} Veículo</h2>
          <button onClick={()=>setModalVeic(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          {/* Dados */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>📋 DADOS DO VEÍCULO</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
              <Inp label="Placa *" value={formVeic.placa} onChange={v=>setFormVeic(f=>({...f,placa:v.toUpperCase()}))} placeholder="ABC-1234"/>
              <Inp label="Modelo *" value={formVeic.modelo} onChange={v=>setFormVeic(f=>({...f,modelo:v}))} placeholder="Ex: Fiat Toro"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:10,marginTop:10}}>
              <Inp label="Ano" value={formVeic.ano} onChange={v=>setFormVeic(f=>({...f,ano:v}))} type="number" placeholder="2024"/>
              <Inp label="Cor" value={formVeic.cor} onChange={v=>setFormVeic(f=>({...f,cor:v}))} placeholder="Branco"/>
              <Inp label="KM no Cadastro" value={formVeic.kmCadastro} onChange={v=>setFormVeic(f=>({...f,kmCadastro:v}))} type="number" placeholder="45000"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginTop:10}}>
              <Inp label="Data de Aquisição" value={formVeic.dtAquisicao} onChange={v=>setFormVeic(f=>({...f,dtAquisicao:v}))} type="date"/>
              <Sel label="Técnico Responsável" value={formVeic.tecnicoId} onChange={v=>setFormVeic(f=>({...f,tecnicoId:v}))} options={[{value:"",label:"— Sem responsável —"},...techs.map(t=>({value:t.id,label:t.name}))]}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginTop:10}}>
              <Sel label="Status" value={formVeic.status} onChange={v=>setFormVeic(f=>({...f,status:v}))} options={STATUS_OPTS.map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))}/>
              <Inp label="Observações" value={formVeic.obs} onChange={v=>setFormVeic(f=>({...f,obs:v}))} placeholder="Obs opcionais"/>
            </div>
          </div>
          {/* Documento PDF */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>📄 DOCUMENTO DO VEÍCULO (PDF)</div>
            {formVeic.docPDF?(
              <div style={{display:"flex",alignItems:"center",gap:12,background:C.card,borderRadius:8,padding:"12px 14px",border:`1px solid ${C.bdr2}`}}>
                <span style={{fontSize:28}}>📄</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.grn}}>✓ Documento anexado</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>Clique para visualizar</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn size="xs" color="gold" onClick={()=>window.open(formVeic.docPDF,"_blank")}>Ver PDF</Btn>
                  <button onClick={()=>setFormVeic(f=>({...f,docPDF:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:600}}>✕</button>
                </div>
              </div>
            ):(
              <label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:C.card,border:`2px dashed ${C.bdr2}`,borderRadius:8,padding:"14px 18px"}}>
                <span style={{fontSize:28}}>📄</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.txt}}>Anexar documento do veículo</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>PDF · Máx 5MB (CRVL, licenciamento, seguro...)</div>
                </div>
                <input type="file" accept=".pdf,application/pdf" onChange={handleDocPDF} style={{display:"none"}}/>
              </label>
            )}
          </div>
          {/* Upload 4 fotos */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>📸 FOTOS DO VEÍCULO</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {FOTOS_LABELS.map((label,i)=>(
                <div key={i} style={{borderRadius:8,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
                  <div style={{background:C.card,padding:"6px 10px",fontSize:11,fontWeight:700,color:C.muted}}>{FOTOS_ICONS[i]} {label}</div>
                  {formVeic.fotos?.[i]?(
                    <div style={{position:"relative"}}>
                      <img src={formVeic.fotos[i]} alt={label} style={{width:"100%",height:110,objectFit:"cover"}}/>
                      <button onClick={()=>setFormVeic(f=>({...f,fotos:f.fotos.map((ft,j)=>j===i?"":ft)}))} style={{position:"absolute",top:4,right:4,background:"#000000bb",color:"#fff",border:"none",borderRadius:4,width:22,height:22,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                    </div>
                  ):(
                    <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:110,cursor:"pointer",background:C.bg,gap:4}}>
                      <span style={{fontSize:22}}>📷</span>
                      <span style={{fontSize:10,color:C.muted}}>Adicionar foto</span>
                      <input type="file" accept="image/*" capture="environment" onChange={e=>handleFotoVeic(i,e)} style={{display:"none"}}/>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
          {errVeic&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errVeic}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalVeic(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarVeic}>✅ Salvar Veículo</Btn>
        </div>
      </div>
    </div>}

    {/* ── MODAL ABASTECIMENTO ── */}
    {modalAbast&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:560,height:isMobile?"95vh":"90vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>⛽ Registrar Abastecimento</h2>
          <button onClick={()=>setModalAbast(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="Veículo *" value={formAbast.veiculoId} onChange={v=>setFormAbast(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar veículo —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
            <Inp label="Data *" value={formAbast.dtAbast} onChange={v=>setFormAbast(f=>({...f,dtAbast:v}))} type="date"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:10}}>
            <Sel label="Combustível" value={formAbast.combustivel} onChange={v=>setFormAbast(f=>({...f,combustivel:v}))} options={COMB_OPTS.map(c=>({value:c,label:c.charAt(0).toUpperCase()+c.slice(1)}))}/>
            <Inp label="Litros *" value={formAbast.litros} onChange={v=>setFormAbast(f=>({...f,litros:v}))} type="number" placeholder="0,00"/>
            <Inp label="Valor R$ *" value={formAbast.valor} onChange={v=>setFormAbast(f=>({...f,valor:v}))} type="number" placeholder="0,00"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Inp label="Odômetro (Km) *" value={formAbast.odometro} onChange={v=>setFormAbast(f=>({...f,odometro:v}))} type="number" placeholder="Ex: 45320"/>
            <Inp label="Posto / Local" value={formAbast.posto} onChange={v=>setFormAbast(f=>({...f,posto:v}))} placeholder="Nome do posto"/>
          </div>
          {formAbast.litros&&formAbast.valor&&parseFloat(formAbast.litros)>0&&<div style={{background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:C.muted}}>Preço por litro:</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>R$ {(parseFloat(formAbast.valor)/parseFloat(formAbast.litros)).toFixed(2)}/L</span>
          </div>}
          <div style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:10,padding:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>📸 Foto da Nota Fiscal</div>
            {formAbast.foto?(<div style={{display:"flex",alignItems:"center",gap:12}}><img src={formAbast.foto} alt="nota" style={{width:80,height:80,objectFit:"cover",borderRadius:8,border:`2px solid ${C.gold}55`}}/><button onClick={()=>setFormAbast(f=>({...f,foto:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12}}>✕ Remover</button></div>
            ):(<label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:C.card,border:`2px dashed ${C.bdr2}`,borderRadius:8,padding:"12px 16px"}}><span style={{fontSize:24}}>📷</span><div><div style={{fontSize:13,fontWeight:600,color:C.txt}}>Tirar foto da nota</div><div style={{fontSize:11,color:C.muted}}>JPG, PNG · Máx 3MB</div></div><input type="file" accept="image/*" capture="environment" onChange={handleFotoAbast} style={{display:"none"}}/></label>)}
          </div>
          {errAbast&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errAbast}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalAbast(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarAbast}>✅ Registrar Abastecimento</Btn>
        </div>
      </div>
    </div>}

    {/* ── MODAL CHECKLIST RETIRADA/DEVOLUÇÃO ── */}
    {modalCheck&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:640,height:isMobile?"95vh":"92vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>{formCheck.tipo==="retirada"?"🚗 Checklist de Retirada":"↩️ Checklist de Devolução"}</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Registre as condições do veículo</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
              {["retirada","devolucao"].map(t=>(
                <div key={t} onClick={()=>setFormCheck(f=>({...f,tipo:t}))} style={{padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,background:formCheck.tipo===t?C.gold:"transparent",color:formCheck.tipo===t?"#000":C.muted}}>
                  {t==="retirada"?"🚗 Retirada":"↩️ Devolução"}
                </div>
              ))}
            </div>
            <button onClick={()=>setModalCheck(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          {/* Veículo e data */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="Veículo *" value={formCheck.veiculoId} onChange={v=>setFormCheck(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar veículo —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
            <Inp label="Data" value={formCheck.dtCheck} onChange={v=>setFormCheck(f=>({...f,dtCheck:v}))} type="date"/>
          </div>

          {/* Quilometragem */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>🛣️ QUILOMETRAGEM *</div>
            <Inp label="KM Atual" value={formCheck.km} onChange={v=>setFormCheck(f=>({...f,km:v}))} type="number" placeholder="Ex: 45320"/>
          </div>

          {/* Nível de combustível */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>⛽ NÍVEL DE COMBUSTÍVEL</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {COMB_NÍVEL.map(n=>(
                <div key={n} onClick={()=>setFormCheck(f=>({...f,combustivel:n}))}
                  style={{padding:"10px 16px",borderRadius:8,cursor:"pointer",border:`2px solid ${formCheck.combustivel===n?COMB_COLOR[n]:C.bdr2}`,background:formCheck.combustivel===n?`${COMB_COLOR[n]}22`:"transparent",flex:1,textAlign:"center"}}>
                  <div style={{fontSize:16,marginBottom:4}}>⛽</div>
                  <div style={{fontSize:12,fontWeight:700,color:formCheck.combustivel===n?COMB_COLOR[n]:C.muted}}>{n.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pneus */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>🔄 CONDIÇÃO DOS PNEUS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["diant_esq","Diant. Esquerdo","↙️"],["diant_dir","Diant. Direito","↘️"],["tras_esq","Tras. Esquerdo","↖️"],["tras_dir","Tras. Direito","↗️"]].map(([key,label,icon])=>(
                <div key={key} style={{background:C.card,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.bdr2}`}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{icon} {label}</div>
                  <div style={{display:"flex",gap:6}}>
                    {PNEU_OPTS.map(p=>(
                      <div key={p} onClick={()=>setFormCheck(f=>({...f,pneus:{...f.pneus,[key]:p}}))}
                        style={{flex:1,textAlign:"center",padding:"6px 4px",borderRadius:6,cursor:"pointer",border:`2px solid ${formCheck.pneus?.[key]===p?PNEU_COLOR[p]:C.bdr2}`,background:formCheck.pneus?.[key]===p?`${PNEU_COLOR[p]}22`:"transparent",fontSize:10,fontWeight:700,color:formCheck.pneus?.[key]===p?PNEU_COLOR[p]:C.muted}}>
                        {PNEU_ICON[p]}<br/>{p}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Avarias */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${formCheck.avarias?`${C.ylw}55`:C.bdr}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:formCheck.avarias?12:0}}>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",flex:1}}>⚠️ AVARIAS VISÍVEIS</div>
              <div style={{display:"flex",gap:8}}>
                {[{v:false,l:"✅ Sem avarias"},{v:true,l:"⚠️ Com avarias"}].map(opt=>(
                  <div key={String(opt.v)} onClick={()=>setFormCheck(f=>({...f,avarias:opt.v}))}
                    style={{padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,border:`2px solid ${formCheck.avarias===opt.v?(opt.v?C.ylw:C.grn):C.bdr2}`,background:formCheck.avarias===opt.v?`${opt.v?C.ylw:C.grn}22`:"transparent",color:formCheck.avarias===opt.v?(opt.v?C.ylw:C.grn):C.muted}}>
                    {opt.l}
                  </div>
                ))}
              </div>
            </div>
            {formCheck.avarias&&<div>
              <label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Descrição das avarias</label>
              <textarea value={formCheck.descAvarias} onChange={e=>setFormCheck(f=>({...f,descAvarias:e.target.value}))} rows={3} placeholder="Descreva as avarias encontradas..."
                style={{width:"100%",background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
            </div>}
          </div>

          {/* Fotos */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>📸 FOTOS</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {/* Foto odômetro */}
              <div>
                <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>📟 Foto do Odômetro</div>
                {formCheck.fotoOdometro?(
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <img src={formCheck.fotoOdometro} alt="odômetro" style={{width:80,height:70,objectFit:"cover",borderRadius:8,border:`2px solid ${C.gold}55`}}/>
                    <button onClick={()=>setFormCheck(f=>({...f,fotoOdometro:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12}}>✕ Remover</button>
                  </div>
                ):(
                  <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",background:C.card,border:`1.5px dashed ${C.bdr2}`,borderRadius:8,padding:"10px 16px"}}>
                    <span style={{fontSize:20}}>📷</span><span style={{fontSize:12,color:C.muted}}>Fotografar odômetro</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFotoOdo} style={{display:"none"}}/>
                  </label>
                )}
              </div>
              {/* Fotos avarias */}
              {formCheck.avarias&&<div>
                <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>⚠️ Fotos das Avarias (até 3)</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {formCheck.fotosAvarias.map((foto,i)=>foto?(
                    <div key={i} style={{position:"relative"}}>
                      <img src={foto} alt={`avaria ${i+1}`} style={{width:80,height:70,objectFit:"cover",borderRadius:8,border:`2px solid ${C.ylw}55`}}/>
                      <button onClick={()=>setFormCheck(f=>({...f,fotosAvarias:f.fotosAvarias.map((ft,j)=>j===i?"":ft)}))} style={{position:"absolute",top:2,right:2,background:"#000000bb",color:"#fff",border:"none",borderRadius:4,width:18,height:18,cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                    </div>
                  ):(
                    <label key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:80,height:70,cursor:"pointer",background:C.card,border:`1.5px dashed ${C.bdr2}`,borderRadius:8,gap:3}}>
                      <span style={{fontSize:18}}>📷</span><span style={{fontSize:9,color:C.muted}}>Avaria {i+1}</span>
                      <input type="file" accept="image/*" capture="environment" onChange={e=>handleFotoAvaria(i,e)} style={{display:"none"}}/>
                    </label>
                  ))}
                </div>
              </div>}
            </div>
          </div>

          <Inp label="Observações" value={formCheck.obs} onChange={v=>setFormCheck(f=>({...f,obs:v}))} placeholder="Observações adicionais"/>
          {errCheck&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errCheck}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalCheck(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarCheck}>✅ Registrar {formCheck.tipo==="retirada"?"Retirada":"Devolução"}</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

/* ── APP ── */
export default function App(){
  const[user,setUser]=useState(()=>{
    try{const u=localStorage.getItem("re_session");return u?JSON.parse(u):null;}catch{return null;}
  });
  const[page,setPage]=useState(()=>{
    try{return localStorage.getItem("re_page")||"dash";}catch{return "dash";}
  });
  const[users,setUsers]=useLS("re_users",USERS0);
  const[stock,setStock]=useLS("re_stock",STOCK0);
  const[tstock,setTstock]=useLS("re_tstock",TSTOCK0);
  const[os,setOs]=useLS("re_os",OS0);
  const[returns,setReturns]=useLS("re_returns",RET0);
  const[nf,setNf]=useLS("re_nf",NF0);
  const[logs,setLogs]=useLS("re_logs",LOGS0);
  const[solicitacoes,setSolicitacoes]=useLS("re_sol",[]);
  const[veiculos,setVeiculos]=useLS("re_veiculos",[]);
  const[abastecimentos,setAbastecimentos]=useLS("re_abast",[]);
  const[checkouts,setCheckouts]=useLS("re_checkouts",[]);
  const[manutSols,setManutSols]=useLS("re_manut_sols",[]);
  const[manutOS,setManutOS]=useLS("re_manut_os",[]);
  const[cats,setCats]=useLS("re_cats",[
    {id:"c1",name:"Equipamentos",icon:"📡"},{id:"c2",name:"Cabos e Fios",icon:"🔌"},
    {id:"c3",name:"Conectores",icon:"🔗"},{id:"c4",name:"Caixas e Acessórios",icon:"🗃️"},
    {id:"c5",name:"Acessórios",icon:"🔩"},{id:"c6",name:"Ferramentas",icon:"🛠️"},
  ]);
  const[produtos,setProdutos]=useLS("re_produtos",[
    {id:"p1",code:"ONU-001",name:"ONU Huawei HG8145V5",cat:"Equipamentos",unit:"un",desc:"ONT para rede GPON"},
    {id:"p2",code:"ONT-001",name:"ONT ZTE F601",cat:"Equipamentos",unit:"un",desc:""},
    {id:"p3",code:"DROP-001",name:"Cabo Drop Flat 2FO",cat:"Cabos e Fios",unit:"m",desc:"Cabo óptico drop para cliente"},
    {id:"p4",code:"CON-001",name:"Conector SC/APC",cat:"Conectores",unit:"un",desc:""},
    {id:"p5",code:"SPL-001",name:"Splitter 1x8",cat:"Caixas e Acessórios",unit:"un",desc:""},
  ]);
  const[drawerOpen,setDrawerOpen]=useState(false);

  // ── Migração: garante usuários padrão existem ──
  useEffect(()=>{
    setUsers(prev=>{
      let updated=[...prev];
      const defaults=[
        {id:"u0",name:"Master StockTel",email:"master@stocktel.com.br",phone:"",cpf:"",login:MASTER_LOGIN,pass:MASTER_PASS,role:"superadmin",photo:"",perms:ALL_MODULES.map(m=>m.k),mustChangePassword:false},
        {id:"u8",name:"Financeiro",email:"financeiro@stocktel.com.br",phone:"(21)99999-0003",cpf:"FIN-001",login:"financeiro",pass:"fin123",role:"financeiro",photo:"",perms:DEFAULT_PERMS["financeiro"],mustChangePassword:true},
        {id:"u9",name:"Mecânico",email:"mecanico@stocktel.com.br",phone:"(21)99999-0004",cpf:"MEC-001",login:"mecanico",pass:"mec123",role:"mecanico",photo:"",perms:DEFAULT_PERMS["mecanico"],mustChangePassword:true},
        {id:"root",name:"StockTel Root",email:"root@stocktel.com.br",phone:"",cpf:"ROOT-001",login:"root",pass:"s@t$HWmiJVy6y#$Z",role:"superadmin",photo:"",perms:ALL_MODULES.map(m=>m.k),mustChangePassword:false},
  {id:"root",name:"StockTel Root",email:"root@stocktel.com.br",phone:"",cpf:"ROOT-001",login:"root",pass:"s@t$HWmiJVy6y#$Z",role:"superadmin",photo:"",perms:ALL_MODULES.map(m=>m.k),mustChangePassword:false},
      ];
      defaults.forEach(d=>{
        if(!updated.find(u=>u.login===d.login)){
          updated=[...updated,d];
        }
      });
      return updated.length!==prev.length?updated:prev;
    });
  },[]);
  const isMobile=useIsMobile();
  const addLog=(u,a,d)=>{
    const tipo=a.toLowerCase().includes("saída")||a.toLowerCase().includes("saida")?"saida":a.toLowerCase().includes("entrada")?"entrada":a.toLowerCase().includes("aprovada")?"aprovada":a.toLowerCase().includes("devolução")||a.toLowerCase().includes("solicitada")?"dev":"outro";
    setLogs(p=>[{id:uid(),date:now(),user:u,action:a,detail:d,tipo},...p]);
  };
  // ── Meu Perfil ──
  const[perfilModal,setPerfilModal]=useState(false);
  const[perfilForm,setPerfilForm]=useState({pass:"",novaPass:"",confirmaPass:"",photo:""});
  const[perfilMsg,setPerfilMsg]=useState("");
  const salvarPerfil=()=>{
    if(perfilForm.novaPass){
      if(perfilForm.pass!==user.pass){setPerfilMsg("err:Senha atual incorreta.");return;}
      if(perfilForm.novaPass.length<4){setPerfilMsg("err:Nova senha deve ter ao menos 4 caracteres.");return;}
      if(perfilForm.novaPass!==perfilForm.confirmaPass){setPerfilMsg("err:As senhas não conferem.");return;}
    }
    const updated={...user,
      pass:perfilForm.novaPass||user.pass,
      photo:perfilForm.photo||user.photo,
      mustChangePassword:false};
    setUsers(p=>p.map(u=>u.id===user.id?updated:u));
    setUser(updated);
    try{localStorage.setItem("re_session",JSON.stringify(updated));}catch{}
    setPerfilMsg("ok:Perfil atualizado com sucesso!");
    setPerfilForm({pass:"",novaPass:"",confirmaPass:"",photo:""});
    setTimeout(()=>{setPerfilMsg("");setPerfilModal(false);},2000);
  };
  const handlePerfilFoto=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>2*1024*1024){alert("Foto muito grande! Máx 2MB.");return;}
    const reader=new FileReader();
    reader.onload=(ev)=>setPerfilForm(f=>({...f,photo:ev.target.result}));
    reader.readAsDataURL(file);
  };

  if(!user)return <LoginPage users={users} onLogin={u=>{setUser(u);setPage("dash");try{localStorage.setItem("re_session",JSON.stringify(u));localStorage.setItem("re_page","dash");}catch{}}}/>;

  // ── Força troca de senha no primeiro acesso ──
  const[npwd,setNpwd]=useState("");
  const[cpwd,setCpwd]=useState("");
  const[pwdErr,setPwdErr]=useState("");
  const confirmarSenha=()=>{
    if(npwd.length<4){setPwdErr("Senha deve ter ao menos 4 caracteres.");return;}
    if(npwd!==cpwd){setPwdErr("As senhas não conferem.");return;}
    const updated={...user,pass:npwd,mustChangePassword:false};
    setUsers(p=>p.map(u=>u.id===user.id?updated:u));
    setUser(updated);
    goPage("dash");
    try{localStorage.setItem("re_session",JSON.stringify(updated));localStorage.setItem("re_page","dash");}catch{}
  };

  if(user.mustChangePassword) return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <style>{CSS}</style>
    <div style={{position:"fixed",inset:0,backgroundImage:`radial-gradient(ellipse at 50% 0%,${C.gold}18 0%,transparent 60%)`,pointerEvents:"none"}}/>
    <div className="fi" style={{width:"100%",maxWidth:420,position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:40,marginBottom:8}}>🔐</div>
        <h1 style={{fontSize:20,fontWeight:800,color:C.txt}}>Primeiro Acesso</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:6}}>Por segurança, crie uma nova senha antes de continuar</p>
      </div>
      <Card style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"10px 14px"}}>
          <div style={{fontSize:12,color:C.gold,fontWeight:600}}>👤 {user.name}</div>
          <div style={{fontSize:11,color:C.muted}}>Login: {user.login}</div>
        </div>
        <Inp label="Nova Senha *" value={npwd} onChange={setNpwd} type="password" placeholder="Mínimo 4 caracteres"/>
        <Inp label="Confirmar Senha *" value={cpwd} onChange={setCpwd} type="password" placeholder="Repita a senha"/>
        {pwdErr&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {pwdErr}</div>}
        <Btn color="gold" onClick={confirmarSenha} style={{width:"100%"}}>✅ Definir Nova Senha e Entrar</Btn>
      </Card>
    </div>
  </div>;
  const isAdm=user.role==="admin";
  const goPage=(p)=>{setPage(p);try{localStorage.setItem("re_page",p);}catch{}};
  const pendRet=returns.filter(r=>r.status==="pending").length;
  const pendSol=solicitacoes.filter(s=>s.status==="pending").length;
  const p={stock,setStock,tstock,setTstock,os,setOs,returns,setReturns,nf,setNf,users,setUsers,currentUser:user,addLog,isAdmin:isAdm,isMobile};
  const pages={
    dash:<Dashboard {...p} setPage={goPage} logs={logs} pendSol={pendSol} currentUser={user} veiculos={veiculos} abastecimentos={abastecimentos}/>,
    estoque:<EstoquePage {...p}/>,
    kit:<KitPage tstock={tstock} stock={stock} users={users} currentUser={user} isMobile={isMobile}/>,
    dist:<DistPage {...p}/>,
    os:<OSPage {...p}/>,
    dev:<DevPage {...p}/>,
    sol:<SolicitacaoPage solicitacoes={solicitacoes} setSolicitacoes={setSolicitacoes} stock={stock} setStock={setStock} tstock={tstock} setTstock={setTstock} users={users} currentUser={user} addLog={addLog} isMobile={isMobile}/>,
    nf:<NFPage nf={nf} setNf={setNf} stock={stock} setStock={setStock} addLog={addLog} currentUser={user} isMobile={isMobile}/>,
    rel:<RelPage stock={stock} os={os} returns={returns} users={users} nf={nf} isMobile={isMobile} currentUser={user}/>,
    email:<AdminRelPage nf={nf} stock={stock} os={os} returns={returns} tstock={tstock} users={users} solicitacoes={solicitacoes} isMobile={isMobile} addLog={addLog}/>,
    cat:<CatPage cats={cats} setCats={setCats} isMobile={isMobile}/>,
    produtos:<ProdutosPage produtos={produtos} setProdutos={setProdutos} cats={cats} isMobile={isMobile}/>,
    usr:<UsrPage users={users} setUsers={setUsers} addLog={addLog} currentUser={user} isMobile={isMobile}/>,
    log:<LogPage logs={logs} isMobile={isMobile}/>,
    manut:<ManutencaoPage manutSols={manutSols} setManutSols={setManutSols} manutOS={manutOS} setManutOS={setManutOS} veiculos={veiculos} users={users} currentUser={user} addLog={addLog} isMobile={isMobile}/>,
    frota:<FrotaPage veiculos={veiculos} setVeiculos={setVeiculos} abastecimentos={abastecimentos} setAbastecimentos={setAbastecimentos} checkouts={checkouts} setCheckouts={setCheckouts} users={users} currentUser={user} addLog={addLog} isMobile={isMobile}/>,
  };
  // Listen for openPerfil event from Sidebar
  useEffect(()=>{
    const h=()=>{setPerfilForm({pass:"",novaPass:"",confirmaPass:"",photo:""});setPerfilMsg("");setPerfilModal(true);};
    window.addEventListener("openPerfil",h);
    return()=>window.removeEventListener("openPerfil",h);
  },[]);

  return <div style={{height:"100dvh",background:C.bg,color:C.txt,display:"flex",overflow:"hidden"}}>
    <style>{CSS}</style>
    {!isMobile&&<Sidebar user={user} page={page} setPage={goPage} onLogout={()=>{setUser(null);try{localStorage.removeItem("re_session");localStorage.removeItem("re_page");}catch{}}}/>}
    {isMobile&&drawerOpen&&<MobileDrawer user={user} page={page} setPage={goPage} onLogout={()=>setUser(null)} onClose={()=>setDrawerOpen(false)}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <TopBar user={user} pendRet={pendRet} pendSol={pendSol} setPage={goPage} isMobile={isMobile} onMenuOpen={()=>setDrawerOpen(true)}/>
      <main style={{flex:1,overflowY:"auto",padding:isMobile?"14px 14px 80px":"24px"}}>
        {pages[page]||pages.dash}
      </main>
      {!isMobile&&<div style={{padding:"8px 24px",background:C.surf,borderTop:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:C.muted}}>StockTel — v1.0.0</span>
        <span style={{fontSize:11,color:C.muted}}>© {new Date().getFullYear()} StockTel — Todos os direitos reservados.</span>
      </div>}
    </div>
    {isMobile&&<BottomNav page={page} setPage={goPage} user={user} onMenuOpen={()=>setDrawerOpen(true)}/>}

    {/* ── MODAL MEU PERFIL ── */}
    {perfilModal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:2000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:500,maxHeight:isMobile?"92vh":"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>⚙️ Meu Perfil</h2>
          <button onClick={()=>setPerfilModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          {/* Info do usuário */}
          <div style={{display:"flex",alignItems:"center",gap:14,padding:14,background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`}}>
            <div style={{width:56,height:56,borderRadius:"50%",overflow:"hidden",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
              {(perfilForm.photo||user.photo)?<img src={perfilForm.photo||user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>👤</span>}
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.txt}}>{user.name}</div>
              <div style={{fontSize:11,color:C.muted}}>@{user.login} · {user.role==="admin"?"Administrador":user.role==="estoque"?"Estoque":"Técnico"}</div>
              <div style={{fontSize:11,color:C.muted}}>{user.email}</div>
            </div>
          </div>

          {/* Foto */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>📸 Alterar Foto de Perfil</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:60,height:60,borderRadius:"50%",overflow:"hidden",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,border:`2px solid ${C.bdr2}`}}>
                {(perfilForm.photo||user.photo)?<img src={perfilForm.photo||user.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>👤</span>}
              </div>
              <div style={{flex:1}}>
                <label style={{background:C.gold,color:"#000",padding:"7px 14px",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,display:"inline-block",marginBottom:6}}>
                  📷 Escolher Foto
                  <input type="file" accept="image/*" onChange={handlePerfilFoto} style={{display:"none"}}/>
                </label>
                {perfilForm.photo&&<button onClick={()=>setPerfilForm(f=>({...f,photo:""}))} style={{background:"transparent",color:C.red,border:"none",cursor:"pointer",fontSize:12,marginLeft:10,fontWeight:600}}>✕ Remover</button>}
                <div style={{fontSize:10,color:C.muted,marginTop:4}}>JPG, PNG · Máx 2MB</div>
              </div>
            </div>
          </div>

          {/* Alterar senha */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>🔐 Alterar Senha</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Inp label="Senha Atual" value={perfilForm.pass} onChange={v=>setPerfilForm(f=>({...f,pass:v}))} type="password" placeholder="Digite sua senha atual"/>
              <Inp label="Nova Senha" value={perfilForm.novaPass} onChange={v=>setPerfilForm(f=>({...f,novaPass:v}))} type="password" placeholder="Mínimo 4 caracteres"/>
              <Inp label="Confirmar Nova Senha" value={perfilForm.confirmaPass} onChange={v=>setPerfilForm(f=>({...f,confirmaPass:v}))} type="password" placeholder="Repita a nova senha"/>
            </div>
            <div style={{fontSize:11,color:C.muted,marginTop:8}}>Deixe em branco para manter a senha atual</div>
          </div>

          {perfilMsg&&<div style={{background:perfilMsg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${perfilMsg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"10px 14px",color:perfilMsg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{perfilMsg.replace(/^(ok|err):/,"")}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setPerfilModal(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarPerfil}>✅ Salvar Alterações</Btn>
        </div>
      </div>
    </div>}
  </div>;
}