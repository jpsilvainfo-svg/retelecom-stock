import { useState, useMemo, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import { sbGet, sbSet } from "./supabase.js";

const C={bg:"#141414",surf:"#1c1c1c",card:"#222222",bdr:"#2e2e2e",bdr2:"#383838",gold:"#f0a500",goldD:"#f0a50022",goldL:"#f5b830",red:"#e53935",redD:"#e5393522",grn:"#43a047",grnD:"#43a04722",ylw:"#fb8c00",ylwD:"#fb8c0022",blue:"#1e88e5",txt:"#ffffff",txt2:"#cccccc",muted:"#888888",muted2:"#555555"};
const PIE=["#f0a500","#666666","#999999","#444444","#bbbbbb"];
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
  {id:"u1",name:"Administrador",email:"admin@retelecom.com",phone:"(21)99999-0001",cpf:"000.000.000-01",login:"admin",pass:"admin123",role:"admin",photo:""},
  {id:"u2",name:"Marcos Estoque",email:"estoque@retelecom.com",phone:"(21)99999-0002",cpf:"000.000.000-02",login:"estoque",pass:"est123",role:"estoque"},
  {id:"u3",name:"João Silva",email:"joao@retelecom.com",phone:"(21)98888-0001",cpf:"111.111.111-01",login:"joao",pass:"tec123",role:"tecnico"},
  {id:"u4",name:"Carlos Alberto",email:"carlos@retelecom.com",phone:"(21)98888-0002",cpf:"111.111.111-02",login:"carlos",pass:"tec456",role:"tecnico"},
  {id:"u5",name:"João Paulo",email:"jpaulo@retelecom.com",phone:"(21)98888-0003",cpf:"111.111.111-03",login:"jpaulo",pass:"tec789",role:"tecnico"},
  {id:"u6",name:"Marcos Vinícius",email:"marcos@retelecom.com",phone:"(21)98888-0004",cpf:"111.111.111-04",login:"marcos",pass:"tec321",role:"tecnico"},
  {id:"u7",name:"Pedro Henrique",email:"pedro@retelecom.com",phone:"(21)98888-0005",cpf:"111.111.111-05",login:"pedro",pass:"tec654",role:"tecnico"},
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
        <img src="/logo-retelecom.png" alt="R&E Telecom" style={{width:"100%",maxWidth:isMobile?260:320,objectFit:"contain",marginBottom:12}}/>
        <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".12em",textTransform:"uppercase"}}>Sistema de Gestão de Estoque · FTTH</div>
      </div>
      <Card style={{padding:isMobile?20:28,display:"flex",flexDirection:"column",gap:16,borderRadius:16}}>
        <Inp label="Login" value={login} onChange={setLogin} placeholder="Seu usuário"/>
        <Inp label="Senha" value={pass} onChange={setPass} type="password" placeholder="Sua senha" style={{}} />
        {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {err}</div>}
        <Btn onClick={go} color="gold" size="lg" style={{width:"100%",borderRadius:10,marginTop:4}}>Entrar</Btn>
      </Card>
      <div style={{marginTop:14,textAlign:"center",fontSize:11,color:C.muted2}}>R&E Telecom Estoque v1.0.0</div>
    </div>
  </div>;
}

/* ── SIDEBAR DESKTOP ── */
function Sidebar({user,page,setPage,onLogout}){
  const isTec=user.role==="tecnico";
  const isAdm=user.role==="admin";
  const nav=[
    {k:"dash",icon:"🏠",label:"Dashboard"},
    !isTec&&{k:"estoque",icon:"📦",label:"Estoque Base"},
    !isTec&&{k:"kit",icon:"🎒",label:"Estoque Técnico"},
    isAdm&&{k:"nf",icon:"📥",label:"Entrada de Materiais"},
    !isTec&&{k:"dist",icon:"🚀",label:"Saída / Liberação"},
    {k:"dev",icon:"↩️",label:"Devoluções"},
    {k:"os",icon:"🔧",label:"Ordens de Serviço"},
    {k:"sol",icon:"📋",label:"Solicitações"},
    {k:"rel",icon:"📊",label:"Relatórios"},
    isAdm&&{k:"email",icon:"📧",label:"Enviar Relatório"},
    isAdm&&{k:"cat",icon:"🏷️",label:"Categorias"},
    isAdm&&{k:"produtos",icon:"🔩",label:"Produtos"},
    isAdm&&{k:"usr",icon:"👥",label:"Usuários"},
    isAdm&&{k:"log",icon:"📋",label:"Logs do Sistema"},
  ].filter(Boolean);
  return <div style={{width:220,minWidth:220,background:C.surf,borderRight:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column",height:"100vh",flexShrink:0}}>
    <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <img src="/logo-retelecom.png" alt="R&E Telecom" style={{width:"100%",maxWidth:160,objectFit:"contain"}}/>
    </div>
    <div style={{padding:"8px 16px 6px",borderBottom:`1px solid ${C.bdr}`}}>
      <div style={{fontSize:10,color:C.muted2,lineHeight:1.4}}>Gestão de Estoque · Provedores FTTH</div>
    </div>
    <nav style={{flex:1,padding:"8px",overflowY:"auto"}}>
      {nav.map(n=>(
        <div key={n.k} onClick={()=>setPage(n.k)}
          style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,cursor:"pointer",marginBottom:2,
            background:page===n.k?`${C.gold}18`:"transparent",
            borderLeft:page===n.k?`3px solid ${C.gold}`:"3px solid transparent",
            color:page===n.k?C.gold:C.muted,fontWeight:page===n.k?600:400,fontSize:13}}>
          <span style={{fontSize:15}}>{n.icon}</span><span>{n.label}</span>
        </div>
      ))}
    </nav>
    <div style={{padding:"10px",borderTop:`1px solid ${C.bdr}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px",background:C.card,borderRadius:8,marginBottom:6}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,overflow:"hidden"}}>
          {user.photo?<img src={user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>👤</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
          <div style={{fontSize:10,color:C.muted}}>{user.email}</div>
        </div>
        <span style={{background:C.gold,color:"#000",fontSize:9,fontWeight:800,padding:"2px 5px",borderRadius:3,flexShrink:0}}>{user.role==="admin"?"ADM":user.role==="estoque"?"EST":"TEC"}</span>
      </div>
      <div onClick={onLogout} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer",color:C.muted,fontSize:12,borderRadius:6}}>
        <span>🚪</span>Sair
      </div>
    </div>
  </div>;
}

/* ── DRAWER MOBILE (menu lateral deslizante) ── */
function MobileDrawer({user,page,setPage,onLogout,onClose}){
  const isTec=user.role==="tecnico";
  const isAdm=user.role==="admin";
  const nav=[
    {k:"dash",icon:"🏠",label:"Dashboard"},
    !isTec&&{k:"estoque",icon:"📦",label:"Estoque Base"},
    !isTec&&{k:"kit",icon:"🎒",label:"Estoque Técnico"},
    isAdm&&{k:"nf",icon:"📥",label:"Entrada de Materiais"},
    !isTec&&{k:"dist",icon:"🚀",label:"Saída / Liberação"},
    {k:"dev",icon:"↩️",label:"Devoluções"},
    {k:"os",icon:"🔧",label:"Ordens de Serviço"},
    {k:"sol",icon:"📋",label:"Solicitações"},
    {k:"rel",icon:"📊",label:"Relatórios"},
    isAdm&&{k:"email",icon:"📧",label:"Enviar Relatório"},
    isAdm&&{k:"cat",icon:"🏷️",label:"Categorias"},
    isAdm&&{k:"produtos",icon:"🔩",label:"Produtos"},
    isAdm&&{k:"usr",icon:"👥",label:"Usuários"},
    isAdm&&{k:"log",icon:"📋",label:"Logs do Sistema"},
  ].filter(Boolean);
  const go=(k)=>{setPage(k);onClose();};
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000aa",zIndex:200}}/>
    <div className="sl" style={{position:"fixed",top:0,left:0,bottom:0,width:280,background:C.surf,zIndex:201,display:"flex",flexDirection:"column",borderRight:`1px solid ${C.bdr}`}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <img src="/logo-retelecom.png" alt="R&E Telecom" style={{height:50,objectFit:"contain"}}/>
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
              background:page===n.k?`${C.gold}18`:"transparent",
              borderLeft:page===n.k?`3px solid ${C.gold}`:"3px solid transparent",
              color:page===n.k?C.gold:C.txt2,fontWeight:page===n.k?600:400,fontSize:14}}>
            <span style={{fontSize:18}}>{n.icon}</span><span>{n.label}</span>
          </div>
        ))}
      </nav>
      <div onClick={()=>{onLogout();onClose();}} style={{display:"flex",alignItems:"center",gap:10,padding:"16px 20px",cursor:"pointer",color:C.red,fontSize:14,borderTop:`1px solid ${C.bdr}`,fontWeight:600}}>
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
  const isTec=user.role==="tecnico";
  const items=isTec
    ?[{k:"dash",icon:"🏠",label:"Início"},{k:"os",icon:"🔧",label:"OS"},{k:"dev",icon:"↩️",label:"Devoluções"},{k:"kit",icon:"🎒",label:"Meu Kit"},{k:"__menu",icon:"☰",label:"Menu"}]
    :[{k:"dash",icon:"🏠",label:"Início"},{k:"estoque",icon:"📦",label:"Estoque"},{k:"dist",icon:"🚀",label:"Saída"},{k:"dev",icon:"↩️",label:"Dev."},{k:"__menu",icon:"☰",label:"Menu"}];
  return <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.surf,borderTop:`1px solid ${C.bdr}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
    {items.map(it=>(
      <div key={it.k} onClick={()=>it.k==="__menu"?onMenuOpen():setPage(it.k)}
        style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 4px 6px",cursor:"pointer",
          color:page===it.k?C.gold:C.muted,borderTop:page===it.k?`2px solid ${C.gold}`:"2px solid transparent"}}>
        <span style={{fontSize:20,lineHeight:1}}>{it.icon}</span>
        <span style={{fontSize:10,marginTop:3,fontWeight:page===it.k?700:400}}>{it.label}</span>
      </div>
    ))}
  </div>;
}

/* ── DASHBOARD ── */
function Dashboard({stock,tstock,users,os,returns,logs,setPage,isMobile,currentUser,pendSol}){
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
  const[form,setForm]=useState({os:"",client:"",notes:"",items:[{sid:"",qty:""}]});
  const[err,setErr]=useState("");
  const myTstock=tstock.filter(t=>t.uid===currentUser.id);
  const myOpts=[{value:"",label:"— Selecionar material —"},...myTstock.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?{value:s.id,label:`[${s.code||"—"}] ${s.name} — Disponível: ${t.qty} ${s.unit}`}:null;}).filter(Boolean)];
  const updRow=(i,k,v)=>setForm(f=>({...f,items:f.items.map((r,j)=>j===i?{...r,[k]:v}:r)}));
  const viewOs=isTec?os.filter(o=>o.uid===currentUser.id):os;

  const save=()=>{
    if(!form.os.trim()){setErr("Informe o número da OS.");return;}
    if(!form.client.trim()){setErr("Informe o nome do cliente.");return;}
    const valid=form.items.filter(r=>r.sid&&parseInt(r.qty)>0);
    if(!valid.length){setErr("Adicione ao menos 1 material utilizado.");return;}
    let ok=true;
    valid.forEach(r=>{const ts=myTstock.find(t=>t.sid===r.sid);if(!ts||ts.qty<parseInt(r.qty)){ok=false;setErr(`Quantidade insuficiente: ${stock.find(s=>s.id===r.sid)?.name}`);}});
    if(!ok)return;
    setOs(p=>[{id:uid(),uid:currentUser.id,os:form.os.trim(),client:form.client.trim(),date:now(),items:valid.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),notes:form.notes},...p]);
    setTstock(p=>p.map(t=>{const it=valid.find(r=>r.sid===t.sid&&t.uid===currentUser.id);return it?{...t,qty:t.qty-parseInt(it.qty)}:t;}));
    addLog(currentUser.name,"Saída","OS: "+form.os.trim()+" · "+form.client.trim());
    setModal(false);setErr("");setForm({os:"",client:"",notes:"",items:[{sid:"",qty:""}]});
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Ordens de Serviço</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Registro de materiais utilizados por OS</p>
      </div>
      {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>setModal(true)}>+ Nova OS</Btn>}
    </div>

    {/* Lista de OS */}
    {viewOs.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted,fontSize:13}}>Nenhuma OS registrada.</span></Card>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {viewOs.map(o=>{
        const tech=users.find(u=>u.id===o.uid);
        return <Card key={o.id} style={{padding:16}}>
          {/* Cabeçalho da OS */}
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

          {/* Materiais utilizados — grade 3 colunas */}
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Materiais Utilizados</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
            {o.items.map((it,i)=>{
              const s=stock.find(x=>x.id===it.sid);
              return <div key={i} style={{background:C.surf,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column",gap:4}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"—"}</div>
                <div style={{fontSize:12,fontWeight:600,color:C.txt,lineHeight:1.3}}>{s?.name||"Material removido"}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2}}>
                  <span style={{fontSize:10,color:C.muted}}>{s?.unit||""}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>{fmt(it.qty)}</span>
                </div>
              </div>;
            })}
          </div>
        </Card>;
      })}
    </div>

    {/* Modal Nova OS */}
    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,
        width:"100%",maxWidth:640,maxHeight:isMobile?"92vh":"88vh",
        display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>

        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>🔧 Nova Ordem de Serviço</h2>
          <button onClick={()=>{setModal(false);setErr("");}} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Body scroll */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>

          {/* Dados da OS */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".08em",marginBottom:12}}>📋 DADOS DA OS</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
              <Inp label="Nº da OS *" value={form.os} onChange={v=>setForm(f=>({...f,os:v}))} placeholder="OS-20250523001"/>
              <Inp label="Nome do Cliente *" value={form.client} onChange={v=>setForm(f=>({...f,client:v}))} placeholder="Nome completo"/>
            </div>
            <div style={{marginTop:12}}>
              <Inp label="Observação / Tipo de Serviço" value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))} placeholder="Ex: Instalação FTTH, Manutenção, Reconexão..."/>
            </div>
          </div>

          {/* Materiais utilizados */}
          <div style={{background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`,overflow:"hidden"}}>
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".08em"}}>
                🔩 MATERIAIS UTILIZADOS
                <span style={{background:`${C.gold}22`,color:C.gold,fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4,marginLeft:8}}>
                  {form.items.filter(r=>r.sid&&parseInt(r.qty)>0).length} item(s)
                </span>
              </div>
              <Btn size="xs" color="gold" onClick={()=>setForm(f=>({...f,items:[...f.items,{sid:"",qty:""}]}))}>+ Adicionar</Btn>
            </div>

            {/* Cabeçalho */}
            {!isMobile&&<div style={{display:"grid",gridTemplateColumns:"1fr 100px 32px",gap:8,padding:"8px 14px",background:C.card,borderBottom:`1px solid ${C.bdr}`}}>
              <span style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Material</span>
              <span style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Quantidade</span>
              <span/>
            </div>}

            <div style={{padding:"8px 14px",display:"flex",flexDirection:"column",gap:6}}>
              {form.items.map((it,i)=>{
                const s=it.sid?stock.find(x=>x.id===it.sid):null;
                const ts=it.sid?myTstock.find(t=>t.sid===it.sid):null;
                return <div key={i} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 100px 32px",gap:8,alignItems:"center",
                  background:it.sid?`${C.gold}08`:C.card,borderRadius:8,padding:"8px 10px",border:`1px solid ${it.sid?`${C.gold}33`:C.bdr2}`}}>
                  <div>
                    <select value={it.sid} onChange={e=>updRow(i,"sid",e.target.value)}
                      style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"9px 10px",color:it.sid?C.txt:C.muted,fontSize:13}}>
                      {myOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {s&&ts&&<div style={{fontSize:10,color:C.grn,marginTop:3}}>✓ {s.name} · Disponível: <strong>{ts.qty}</strong> {s.unit}</div>}
                  </div>
                  <input type="number" value={it.qty} onChange={e=>updRow(i,"qty",e.target.value)}
                    placeholder="Qtd" min="0"
                    style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"9px 10px",color:C.txt,fontSize:14,fontWeight:700,width:"100%",textAlign:"center"}}/>
                  <button onClick={()=>setForm(f=>({...f,items:f.items.length>1?f.items.filter((_,j)=>j!==i):f.items}))}
                    style={{background:"transparent",color:C.muted2,border:"none",cursor:"pointer",fontSize:16,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6}}>✕</button>
                </div>;
              })}
            </div>

            <button onClick={()=>setForm(f=>({...f,items:[...f.items,{sid:"",qty:""}]}))}
              style={{width:"100%",margin:"0 0 8px",padding:"9px",background:"transparent",border:`2px dashed ${C.bdr2}`,
                borderRadius:0,color:C.muted,cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span style={{fontSize:18}}>+</span> Adicionar material
            </button>
          </div>

          {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {err}</div>}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>{setModal(false);setErr("");}}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>✅ Confirmar Baixa de Materiais</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

/* ── DEVOLUÇÕES ── */
function DevPage({returns,setReturns,tstock,setTstock,stock,users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({notes:"",items:[{sid:"",qty:""}]});
  const myTstock=tstock.filter(t=>t.uid===currentUser.id);
  const myOpts=[{value:"",label:"Selecionar..."},...myTstock.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?{value:s.id,label:`[${s.code}] ${s.name} — ${t.qty}`}:null;}).filter(Boolean)];
  const updRow=(i,k,v)=>setForm(f=>({...f,items:f.items.map((r,j)=>j===i?{...r,[k]:v}:r)}));
  const viewRet=isTec?returns.filter(r=>r.uid===currentUser.id):returns;
  const submit=()=>{
    const valid=form.items.filter(r=>r.sid&&parseInt(r.qty)>0);if(!valid.length)return;
    setReturns(p=>[{id:uid(),uid:currentUser.id,date:now(),items:valid.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),status:"pending",notes:form.notes,rDate:null,rBy:null},...p]);
    addLog(currentUser.name,"Devolução Solicitada",`${currentUser.name} · ${valid.length} item(s)`);
    setModal(false);setForm({notes:"",items:[{sid:"",qty:""}]});
  };
  const approve=(r)=>{
    setTstock(p=>p.map(t=>{const it=r.items.find(i=>i.sid===t.sid&&t.uid===r.uid);return it?{...t,qty:Math.max(0,t.qty-it.qty)}:t;}));
    setReturns(p=>p.map(x=>x.id===r.id?{...x,status:"approved",rDate:now(),rBy:currentUser.name}:x));
    addLog(currentUser.name,"Devolução Aprovada",`Técnico: ${users.find(u=>u.id===r.uid)?.name}`);
  };
  const sc={pending:"ylw",approved:"grn",rejected:"red"};
  const sl={pending:"⏳ Pendente",approved:"✅ Aprovada",rejected:"❌ Rejeitada"};
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Devoluções</h1>
      {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>setModal(true)}>↩ Solicitar</Btn>}
    </div>
    {viewRet.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhuma devolução registrada.</span></Card>}
    {viewRet.map(r=>{
      const tech=users.find(u=>u.id===r.uid);
      return <Card key={r.id} style={{padding:16,borderLeft:`3px solid ${r.status==="pending"?C.ylw:r.status==="approved"?C.grn:C.red}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <Bdg color={sc[r.status]}>{sl[r.status]}</Bdg>
              <span style={{fontSize:13,fontWeight:600,color:C.txt}}>{tech?.name||"?"}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{r.date}</span>
            </div>
            {r.notes&&<div style={{fontSize:12,color:C.muted,marginBottom:8}}>"{r.notes}"</div>}
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {r.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return <div key={i} style={{background:C.surf,borderRadius:5,padding:"4px 10px",fontSize:11,color:C.txt2}}>{s?.name?.split(" ")[0]||it.sid} <span style={{color:C.gold}}>×{it.qty}</span></div>;})}
            </div>
          </div>
          {!isTec&&r.status==="pending"&&<div style={{display:"flex",gap:8,flexShrink:0}}>
            <Btn size="sm" color="grn" onClick={()=>approve(r)}>✓ Aprovar</Btn>
            <Btn size="sm" color="red" outline onClick={()=>setReturns(p=>p.map(x=>x.id===r.id?{...x,status:"rejected",rDate:now(),rBy:currentUser.name}:x))}>✕</Btn>
          </div>}
        </div>
      </Card>;
    })}
    {modal&&<Modal title="Solicitar Devolução" onClose={()=>setModal(false)} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Inp label="Observação" value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))} placeholder="Ex: Sobrou do serviço"/>
        {form.items.map((it,i)=>(
          <div key={i} style={{display:"flex",flexDirection:isMobile?"column":"row",gap:8}}>
            <div style={{flex:1}}><Sel value={it.sid} onChange={v=>updRow(i,"sid",v)} options={myOpts}/></div>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <div style={{width:isMobile?"100%":110,flex:isMobile?1:"none"}}><Inp value={it.qty} onChange={v=>updRow(i,"qty",v)} placeholder="Qtd" type="number"/></div>
              <Btn size="sm" color="red" outline onClick={()=>setForm(f=>({...f,items:f.items.filter((_,j)=>j!==i)}))}>✕</Btn>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:10,justifyContent:"space-between"}}>
          <Btn color="ghost" outline size="sm" onClick={()=>setForm(f=>({...f,items:[...f.items,{sid:"",qty:""}]}))}>+ Material</Btn>
          <div style={{display:"flex",gap:8}}>
            <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn color="gold" onClick={submit}>Enviar</Btn>
          </div>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* ── NF ── */
function NFPage({nf,setNf,stock,setStock,addLog,currentUser,isMobile}){
  const CATS=["Equipamentos","Cabos e Fios","Conectores","Caixas e Acessórios","Acessórios","Ferramentas"];
  const blank=()=>({id:uid(),sid:"",qty:"",val:""});
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({num:"",supplier:"",date:"",obs:""});
  const[items,setItems]=useState([blank(),blank(),blank()]);
  const[novoMat,setNovoMat]=useState(null);
  const[formNM,setFormNM]=useState({code:"",name:"",cat:"Equipamentos",unit:"un",min:"0"});
  const[err,setErr]=useState("");

  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const addLinhas=(n)=>setItems(p=>[...p,...Array.from({length:n},blank)]);
  const remItem=(id)=>setItems(p=>p.length>1?p.filter(r=>r.id!==id):p);

  const salvarNM=()=>{
    if(!formNM.name.trim())return;
    const nm={id:uid(),code:formNM.code,name:formNM.name.trim(),cat:formNM.cat,unit:formNM.unit,qty:0,min:parseInt(formNM.min)||0};
    setStock(p=>[...p,nm]);
    updItem(novoMat,"sid",nm.id);
    addLog(currentUser.name,"Novo Material","Via NF: "+nm.name);
    setNovoMat(null);
    setFormNM({code:"",name:"",cat:"Equipamentos",unit:"un",min:"0"});
  };

  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);
  const totalPreview=items.reduce((a,r)=>a+(parseFloat(r.val)||0),0);

  const abrirModal=()=>{
    setForm({num:"",supplier:"",date:"",obs:""});
    setItems([blank(),blank(),blank()]);
    setErr(""); setNovoMat(null);
    setModal(true);
  };

  const save=()=>{
    if(!form.num.trim()){setErr("Informe o número da NF.");return;}
    if(!form.supplier.trim()){setErr("Informe o fornecedor.");return;}
    if(!validItems.length){setErr("Adicione ao menos 1 item com material e quantidade.");return;}
    const total=validItems.reduce((a,r)=>a+(parseFloat(r.val)||0),0);
    setNf(p=>[{id:uid(),num:form.num.trim(),supplier:form.supplier.trim(),
      date:form.date,obs:form.obs,
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
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {n.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:C.surf,borderRadius:6,padding:"5px 10px"}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,minWidth:60}}>{s?.code||"—"}</span>
                    <span style={{fontSize:12,color:C.txt,flex:1}}>{s?.name||"?"}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.grn,fontSize:12}}>+{fmt(it.qty)} {s?.unit||""}</span>
                    {it.val>0&&<span style={{fontSize:11,color:C.muted}}>R$ {fmt(it.val)}</span>}
                  </div>
                );})}
              </div>
              {n.obs&&<div style={{fontSize:11,color:C.muted,marginTop:6,fontStyle:"italic"}}>📝 {n.obs}</div>}
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

    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:"16px"}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,
        borderRadius:isMobile?"16px 16px 0 0":12,
        width:"100%",maxWidth:860,
        height:isMobile?"95vh":"92vh",
        display:"flex",flexDirection:"column"}}>

        {/* Cabeçalho fixo */}
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:16,fontWeight:700,color:C.txt}}>📥 Nova Nota Fiscal</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} item(s) preenchido(s) · Total: <span style={{color:C.grn,fontWeight:700}}>R$ {fmt(totalPreview)}</span></div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Corpo com scroll */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>

          {/* Dados da NF */}
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

          {/* Tabela de itens */}
          <div style={{background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`,overflow:"hidden"}}>
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".08em"}}>
                📦 ITENS DA NOTA
                <span style={{background:`${C.gold}22`,color:C.gold,fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4,marginLeft:8}}>{items.length} linhas</span>
                <span style={{background:`${C.grn}22`,color:C.grn,fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4,marginLeft:6}}>{validItems.length} preenchidos</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn size="xs" color="gold" outline onClick={()=>addLinhas(5)}>+5 linhas</Btn>
                <Btn size="xs" color="gold" onClick={()=>addLinhas(1)}>+ 1 linha</Btn>
              </div>
            </div>

            {/* Cabeçalho da tabela */}
            {!isMobile&&<div style={{display:"grid",gridTemplateColumns:"2fr 100px 110px 36px",gap:8,padding:"8px 14px",background:C.card,borderBottom:`1px solid ${C.bdr}`}}>
              <span style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Material</span>
              <span style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Quantidade</span>
              <span style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Valor (R$)</span>
              <span/>
            </div>}

            {/* Linhas de itens */}
            <div style={{padding:"8px 14px",display:"flex",flexDirection:"column",gap:6}}>
              {items.map((it,idx)=>(
                <div key={it.id} style={{
                  display:"grid",
                  gridTemplateColumns:isMobile?"1fr":"2fr 100px 110px 36px",
                  gap:isMobile?8:6,
                  alignItems:"center",
                  padding:isMobile?"10px":"6px 8px",
                  background:it.sid?`${C.gold}08`:C.card,
                  borderRadius:8,
                  border:`1px solid ${it.sid?`${C.gold}33`:C.bdr2}`}}>

                  {isMobile&&<div style={{fontSize:10,fontWeight:700,color:C.muted}}>ITEM {idx+1}</div>}

                  {/* Material + botão novo */}
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <select value={it.sid} onChange={e=>updItem(it.id,"sid",e.target.value)}
                        style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"8px 10px",color:it.sid?C.txt:C.muted,fontSize:13}}>
                        <option value="">— Selecionar material —</option>
                        {stock.map(s=><option key={s.id} value={s.id}>[{s.code||"—"}] {s.name} ({s.qty} {s.unit})</option>)}
                      </select>
                    </div>
                    <button onClick={()=>{setNovoMat(it.id);setFormNM({code:"",name:"",cat:"Equipamentos",unit:"un",min:"0"});}}
                      title="Cadastrar novo material"
                      style={{background:`${C.gold}22`,color:C.gold,border:`1px solid ${C.gold}55`,borderRadius:6,
                        width:32,height:32,cursor:"pointer",fontWeight:800,fontSize:16,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      +
                    </button>
                  </div>

                  {/* Qtd */}
                  <input type="number" value={it.qty} onChange={e=>updItem(it.id,"qty",e.target.value)}
                    placeholder="0"
                    style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"8px 10px",color:C.txt,fontSize:13,width:"100%"}}/>

                  {/* Valor */}
                  <input type="number" value={it.val} onChange={e=>updItem(it.id,"val",e.target.value)}
                    placeholder="0,00"
                    style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"8px 10px",color:C.txt,fontSize:13,width:"100%"}}/>

                  {/* Remover */}
                  <button onClick={()=>remItem(it.id)}
                    style={{background:"transparent",color:C.muted2,border:"none",cursor:"pointer",fontSize:16,
                      width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6}}>
                    ✕
                  </button>

                  {/* Cadastro novo material inline */}
                  {novoMat===it.id&&<div style={{gridColumn:"1/-1",background:`${C.gold}11`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:12,marginTop:4}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:10}}>✨ CADASTRAR NOVO MATERIAL</div>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginBottom:8}}>
                      <Inp label="Código" value={formNM.code} onChange={v=>setFormNM(f=>({...f,code:v}))} placeholder="Ex: ONU-010"/>
                      <Inp label="Nome do Material *" value={formNM.name} onChange={v=>setFormNM(f=>({...f,name:v}))} placeholder="Nome completo"/>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                      <Sel label="Categoria" value={formNM.cat} onChange={v=>setFormNM(f=>({...f,cat:v}))} options={CATS.map(c=>({value:c,label:c}))}/>
                      <Inp label="Unidade" value={formNM.unit} onChange={v=>setFormNM(f=>({...f,unit:v}))} placeholder="un, m, rolo..."/>
                      <Inp label="Qtd Mínima" value={formNM.min} onChange={v=>setFormNM(f=>({...f,min:v}))} type="number"/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <Btn size="sm" color="ghost" outline onClick={()=>setNovoMat(null)}>Cancelar</Btn>
                      <Btn size="sm" color="gold" onClick={salvarNM}>✓ Cadastrar e Selecionar</Btn>
                    </div>
                  </div>}
                </div>
              ))}
            </div>

            {/* Botões adicionar linhas */}
            <div style={{padding:"10px 14px",borderTop:`1px solid ${C.bdr}`,display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>addLinhas(1)} style={{background:"transparent",border:`1.5px dashed ${C.bdr2}`,borderRadius:7,padding:"7px 16px",color:C.muted,cursor:"pointer",fontSize:12,fontWeight:600}}>+ 1 linha</button>
              <button onClick={()=>addLinhas(5)} style={{background:"transparent",border:`1.5px dashed ${C.bdr2}`,borderRadius:7,padding:"7px 16px",color:C.muted,cursor:"pointer",fontSize:12,fontWeight:600}}>+ 5 linhas</button>
              <button onClick={()=>addLinhas(10)} style={{background:"transparent",border:`1.5px dashed ${C.bdr2}`,borderRadius:7,padding:"7px 16px",color:C.muted,cursor:"pointer",fontSize:12,fontWeight:600}}>+ 10 linhas</button>
            </div>
          </div>

          {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {err}</div>}
        </div>

        {/* Rodapé fixo com total e botão */}
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:20,alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,color:C.muted}}>ITENS PREENCHIDOS</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:800,color:C.gold}}>{validItems.length}</div>
            </div>
            <div>
              <div style={{fontSize:10,color:C.muted}}>VALOR TOTAL</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:800,color:C.grn}}>R$ {fmt(totalPreview)}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn color="gold" onClick={save} style={{minWidth:180}}>✅ Registrar Nota Fiscal</Btn>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}

/* ── RELATÓRIOS ── */
function RelPage({stock,os,returns,users,isMobile,currentUser}){
  const isTec=currentUser?.role==="tecnico";
  const viewOs=isTec?os.filter(o=>o.uid===currentUser.id):os;
  const viewRet=isTec?returns.filter(r=>r.uid===currentUser.id):returns;
  const[tab,setTab]=useState("estoque");
  const catData=useMemo(()=>{const m={};stock.forEach(s=>{m[s.cat]=(m[s.cat]||0)+s.qty;});return Object.entries(m).map(([name,value])=>({name,value}));},[stock]);
  const matData=useMemo(()=>{const m={};viewOs.forEach(o=>o.items.forEach(it=>{m[it.sid]=(m[it.sid]||0)+it.qty;}));return Object.entries(m).map(([sid,value])=>{const s=stock.find(x=>x.id===sid);return{name:s?.name?.split(" ").slice(0,2).join(" ")||sid,value};}).sort((a,b)=>b.value-a.value);},[viewOs,stock]);
  const techData=useMemo(()=>{const m={};viewOs.forEach(o=>{const u=users.find(x=>x.id===o.uid);const nm=u?.name.split(" ")[0]||"?";const tot=o.items.reduce((a,i)=>a+i.qty,0);m[nm]=(m[nm]||0)+tot;});return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);},[viewOs,users]);
  const maxT=techData[0]?.value||1;
  const exportXLS=(name,data)=>{const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,name);XLSX.writeFile(wb,`RE_Telecom_${name}_${new Date().toISOString().slice(0,10)}.xlsx`);};
  const print=()=>{
    const w=window.open("","_blank");
    w.document.write(`<html><head><title>R&E Telecom Relatório</title><style>body{font-family:Arial;padding:20px;color:#111;}h1{color:#c68500;}h2{border-bottom:2px solid #f0a500;padding-bottom:4px;margin:20px 0 8px;}table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}th{background:#f5f5f5;padding:7px 10px;text-align:left;border:1px solid #ddd;}td{padding:6px 10px;border:1px solid #eee;}.ok{color:green}.low{color:orange}.crit{color:red}@media print{button{display:none}}</style></head><body>
    <h1>⚡ R&E TELECOM ESTOQUE</h1><p style="color:#888;font-size:11px">Gerado em ${now()}</p>
    <button onclick="window.print()" style="margin:10px 0;padding:8px 16px;background:#f0a500;color:#000;border:none;cursor:pointer;border-radius:4px;font-weight:700">🖨️ Imprimir PDF</button>
    <h2>Estoque</h2><table><tr><th>Código</th><th>Material</th><th>Qtd</th><th>Mín.</th><th>Status</th></tr>
    ${stock.map(s=>`<tr><td>${s.code}</td><td>${s.name}</td><td class="${s.qty<=s.min*0.6?"crit":s.qty<=s.min?"low":"ok"}">${s.qty} ${s.unit}</td><td>${s.min}</td><td class="${s.qty<=s.min*0.6?"crit":s.qty<=s.min?"low":"ok"}">${s.qty<=s.min*0.6?"CRÍTICO":s.qty<=s.min?"BAIXO":"OK"}</td></tr>`).join("")}
    </table><h2>Ordens de Serviço</h2><table><tr><th>OS</th><th>Técnico</th><th>Cliente</th><th>Data</th></tr>
    ${os.map(o=>{const t=users.find(u=>u.id===o.uid);return`<tr><td>${o.os}</td><td>${t?.name||"?"}</td><td>${o.client}</td><td>${o.date}</td></tr>`;}).join("")}
    </table><p style="margin-top:30px;font-size:10px;color:#999">R&E Telecom Estoque v1.0.0 © ${new Date().getFullYear()}</p></body></html>`);
    w.document.close();
  };
  const sc2={pending:"ylw",approved:"grn",rejected:"red"};
  const sl2={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};
  const tabs=[{k:"estoque",l:"Estoque"},{k:"os",l:"OS"},{k:"tecnicos",l:"Técnicos"},{k:"dev",l:"Devoluções"}];
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>{isTec?"Meus Relatórios":"Relatórios"}</h1>
      <div style={{display:"flex",gap:8}}>
        <Btn color="gold" outline size="sm" onClick={print}>🖨️ PDF</Btn>
        <Btn color="grn" size="sm" onClick={()=>{
          if(tab==="estoque")exportXLS("Estoque",stock.map(s=>({Código:s.code,Material:s.name,Categoria:s.cat,Unidade:s.unit,"Qtd Atual":s.qty,"Qtd Mínima":s.min,Status:s.qty<=s.min*0.6?"CRÍTICO":s.qty<=s.min?"BAIXO":"OK"})));
          else if(tab==="os"){const rows=[];os.forEach(o=>{const t=users.find(u=>u.id===o.uid);o.items.forEach(it=>{const s=stock.find(x=>x.id===it.sid);rows.push({OS:o.os,Técnico:t?.name||"?",Cliente:o.client,Data:o.date,Material:s?.name||it.sid,Qtd:it.qty});});});exportXLS("OS",rows);}
          else if(tab==="tecnicos")exportXLS("Tecnicos",techData.map((t,i)=>({Posição:i+1,Técnico:t.name,Total:t.value})));
          else exportXLS("Devoluções",returns.map(r=>{const t=users.find(u=>u.id===r.uid);return{Técnico:t?.name||"?",Data:r.date,Status:sl2[r.status]||r.status,"Por":r.rBy||"—"};}));
        }}>📥 Excel</Btn>
      </div>
    </div>
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`,overflowX:"auto"}}>
      {tabs.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>)}
    </div>
    {tab==="estoque"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!isMobile&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Por Categoria</div>
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>{catData.map((_,i)=><Cell key={i} fill={PIE[i%PIE.length]}/>)}</Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart></ResponsiveContainer>
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Mais Consumidos</div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={matData.slice(0,6)} layout="vertical"><XAxis type="number" tick={{fill:C.muted,fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fill:C.muted,fontSize:9}} width={110}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/><Bar dataKey="value" fill={C.gold} radius={[0,4,4,0]}/></BarChart></ResponsiveContainer>
        </Card>
      </div>}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÓDIGO","MATERIAL","CATEGORIA","QTD ATUAL","QTD MÍN.","SITUAÇÃO"]}/></thead>
            <tbody>{stock.map(s=>{const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;return <TRow key={s.id} cells={[<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,s.name,s.cat,<span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:low?C.ylw:C.txt}}>{fmt(s.qty)}</span>,fmt(s.min),crit?<Bdg color="red">Crítico</Bdg>:low?<Bdg color="ylw">Baixo</Bdg>:<Bdg color="grn">OK</Bdg>]}/>;})}</tbody>
          </table>
        </div>
      </Card>
    </div>}
    {tab==="os"&&<Card style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><THead cols={["OS","TÉCNICO","CLIENTE","DATA","ITENS"]}/></thead>
      <tbody>{os.map(o=>{const t=users.find(u=>u.id===o.uid);return <TRow key={o.id} cells={[<span style={{fontFamily:"'JetBrains Mono',monospace",color:C.gold,fontSize:12}}>{o.os}</span>,t?.name||"?",o.client,<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{o.date}</span>,<span style={{color:C.gold,fontWeight:700}}>{o.items.reduce((a,i)=>a+i.qty,0)}</span>]}/>;})}</tbody>
    </table></div></Card>}
    {tab==="tecnicos"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!isMobile&&<Card style={{padding:16}}>
        <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={techData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>{techData.map((_,i)=><Cell key={i} fill={i===0?C.gold:PIE[i%PIE.length]}/>)}</Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart></ResponsiveContainer>
      </Card>}
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:14}}>Ranking de Consumo</div>
        {techData.map((t,i)=>(
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
    {tab==="dev"&&<Card style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><THead cols={["TÉCNICO","DATA","STATUS","APROVADO POR"]}/></thead>
      <tbody>{returns.map(r=>{const t=users.find(u=>u.id===r.uid);return <TRow key={r.id} cells={[t?.name||"?",<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{r.date}</span>,<Bdg color={sc2[r.status]}>{sl2[r.status]}</Bdg>,r.rBy||"—"]}/>;})}</tbody>
    </table></div></Card>}
  </div>;
}


/* ── USUÁRIOS ── */
function UsrPage({users,setUsers,addLog,currentUser,isMobile}){
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico",photo:""});
  const roles=[{value:"admin",label:"Administrador"},{value:"estoque",label:"Estoque"},{value:"tecnico",label:"Técnico"}];
  const rl={admin:"ADM",estoque:"EST",tecnico:"TEC"};
  const rc={admin:C.gold,estoque:C.blue,tecnico:C.grn};

  const handlePhoto=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>2*1024*1024){alert("Foto muito grande! Máximo 2MB.");return;}
    const reader=new FileReader();
    reader.onload=(ev)=>setForm(f=>({...f,photo:ev.target.result}));
    reader.readAsDataURL(file);
  };

  const save=()=>{
    if(!form.name.trim()||!form.login.trim()||!form.pass.trim())return;
    if(modal==="new"){setUsers(p=>[...p,{id:uid(),...form}]);addLog(currentUser.name,"Usuário Criado",form.name+" ("+form.role+")");}
    else{setUsers(p=>p.map(u=>u.id===modal?{...u,...form}:u));addLog(currentUser.name,"Usuário Editado",form.name);}
    setModal(null);
  };

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
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setForm({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico",photo:""});setModal("new");}}>+ Novo</Btn>
    </div>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {users.map(u=>(
          <Card key={u.id} style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
            <Avatar user={u} size={44}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:C.txt}}>{u.name}</div>
              <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.login} · {u.email}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
              <span style={{background:rc[u.role],color:"#000",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:3}}>{rl[u.role]}</span>
              <Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf||"",login:u.login,pass:u.pass,role:u.role,photo:u.photo||""});setModal(u.id);}}>Editar</Btn>
            </div>
          </Card>
        ))}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["FOTO","USUÁRIO","LOGIN","E-MAIL","TELEFONE","PERFIL","AÇÕES"]}/></thead>
            <tbody>{users.map(u=>(
              <TRow key={u.id} cells={[
                <Avatar user={u} size={36}/>,
                <span style={{fontWeight:600,color:C.txt}}>{u.name}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold}}>{u.login}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.email}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.phone}</span>,
                <span style={{background:rc[u.role],color:"#000",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:4}}>{rl[u.role]}</span>,
                <div style={{display:"flex",gap:6}}>
                  <Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf||"",login:u.login,pass:u.pass,role:u.role,photo:u.photo||""});setModal(u.id);}}>Editar</Btn>
                  {u.id!==currentUser.id&&<Btn size="xs" color="red" outline onClick={()=>{if(window.confirm("Remover "+u.name+"?")){setUsers(p=>p.filter(x=>x.id!==u.id));addLog(currentUser.name,"Usuário Removido",u.name);}}}>✕</Btn>}
                </div>
              ]}/>
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
          <Inp label="CPF" value={form.cpf||""} onChange={v=>setForm(f=>({...f,cpf:v}))} placeholder="000.000.000-00"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:12}}>
          <Inp label="Login *" value={form.login} onChange={v=>setForm(f=>({...f,login:v}))}/>
          <Inp label="Senha *" value={form.pass} onChange={v=>setForm(f=>({...f,pass:v}))} type="password"/>
          <div style={{gridColumn:isMobile?"1 / -1":"auto"}}><Sel label="Perfil" value={form.role} onChange={v=>setForm(f=>({...f,role:v}))} options={roles}/></div>
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
      <Btn size="sm" color="red" outline onClick={()=>{if(window.confirm("ATENÇÃO: Apaga TODOS os dados. Confirmar?")){Object.keys(localStorage).filter(k=>k.startsWith("re_")).forEach(k=>localStorage.removeItem(k));window.location.reload();}}}>🗑️ Resetar Todos os Dados</Btn>
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

/* ── EMAIL ── */
function EmailPage({stock,os,returns,users,isMobile}){
  const[emails,setEmails]=useState("");
  const[assunto,setAssunto]=useState("Relatório R&E Telecom Estoque");
  const[tipo,setTipo]=useState("completo");
  const[msg,setMsg]=useState("");
  const goPage=(p)=>{setPage(p);try{localStorage.setItem("re_page",p);}catch{}};
  const pendRet=returns.filter(r=>r.status==="pending").length;
  const lowStock=stock.filter(s=>s.qty<=s.min);
  const gerarCorpo=()=>{
    const linha=(l)=>`${l}\n`;
    let corpo=`R&E TELECOM — RELATÓRIO DE ESTOQUE\n`;
    corpo+=`Gerado em: ${now()}\n${"=".repeat(50)}\n\n`;
    if(tipo==="completo"||tipo==="estoque"){
      corpo+=`📦 ESTOQUE ATUAL\n${"-".repeat(40)}\n`;
      stock.forEach(s=>{corpo+=`${s.code} | ${s.name} | ${s.qty} ${s.unit} | ${s.qty<=s.min*0.6?"⚠️ CRÍTICO":s.qty<=s.min?"⬇️ BAIXO":"✅ OK"}\n`;});
      corpo+="\n";
    }
    if(tipo==="completo"||tipo==="criticos"){
      corpo+=`⚠️ ITENS COM BAIXO ESTOQUE (${lowStock.length})\n${"-".repeat(40)}\n`;
      lowStock.forEach(s=>{corpo+=`${s.code} | ${s.name} | Atual: ${s.qty} | Mínimo: ${s.min}\n`;});
      corpo+="\n";
    }
    if(tipo==="completo"||tipo==="os"){
      corpo+=`🔧 ORDENS DE SERVIÇO (${os.length})\n${"-".repeat(40)}\n`;
      os.slice(0,10).forEach(o=>{const t=users.find(u=>u.id===o.uid);corpo+=`${o.os} | ${o.client} | ${t?.name||"?"} | ${o.date}\n`;});
      corpo+="\n";
    }
    corpo+=`↩️ DEVOLUÇÕES PENDENTES: ${pendRet}\n\n`;
    corpo+=`${"=".repeat(50)}\nR&E Telecom Estoque v1.0.0`;
    return corpo;
  };
  const enviar=()=>{
    const lista=emails.split(/[,;\n]/).map(e=>e.trim()).filter(e=>e.includes("@"));
    if(!lista.length){setMsg("❌ Informe ao menos um e-mail válido.");return;}
    const corpo=gerarCorpo();
    const mailto=`mailto:${lista.join(",")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.open(mailto,"_blank");
    setMsg(`✅ Cliente de e-mail aberto com ${lista.length} destinatário(s)!`);
    setTimeout(()=>setMsg(""),5000);
  };
  const copiar=()=>{
    navigator.clipboard.writeText(gerarCorpo()).then(()=>{setMsg("✅ Relatório copiado! Cole no seu e-mail.");setTimeout(()=>setMsg(""),4000);});
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Enviar Relatório por E-mail</h1><p style={{fontSize:12,color:C.muted,marginTop:2}}>Envio manual para destinatários cadastrados</p></div>
    {msg&&<div style={{background:msg.includes("✅")?C.grnD:C.redD,border:`1px solid ${msg.includes("✅")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.includes("✅")?C.grn:C.red,fontSize:13}}>{msg}</div>}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
      <Card style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:4}}>⚙️ Configurar Envio</div>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Destinatários (um por linha ou separados por vírgula)</label>
          <textarea value={emails} onChange={e=>setEmails(e.target.value)} rows={4} placeholder={"joao@empresa.com\ngerente@empresa.com\ndiretoria@empresa.com"}
            style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"11px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
        </div>
        <Inp label="Assunto do E-mail" value={assunto} onChange={setAssunto}/>
        <Sel label="Tipo de Relatório" value={tipo} onChange={setTipo} options={[
          {value:"completo",label:"Relatório Completo"},
          {value:"estoque",label:"Apenas Estoque"},
          {value:"criticos",label:"Apenas Itens Críticos"},
          {value:"os",label:"Apenas Ordens de Serviço"},
        ]}/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn color="gold" onClick={enviar} style={{flex:1}}>📧 Abrir E-mail</Btn>
          <Btn color="ghost" outline onClick={copiar} style={{flex:1}}>📋 Copiar Conteúdo</Btn>
        </div>
        <div style={{background:C.surf,borderRadius:8,padding:"10px 14px",border:`1px solid ${C.bdr}`}}>
          <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
            💡 <strong style={{color:C.txt2}}>Como funciona:</strong> Clique em "Abrir E-mail" para abrir seu app de e-mail já preenchido, ou "Copiar Conteúdo" para colar manualmente.
          </div>
        </div>
      </Card>
      <Card style={{padding:18}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>📊 Resumo do Relatório</div>
        {[
          {icon:"📦",label:"Total de itens",value:stock.length,color:C.gold},
          {icon:"⚠️",label:"Itens críticos",value:stock.filter(s=>s.qty<=s.min*0.6).length,color:C.red},
          {icon:"⬇️",label:"Estoque baixo",value:stock.filter(s=>s.qty<=s.min&&s.qty>s.min*0.6).length,color:C.ylw},
          {icon:"🔧",label:"Ordens de serviço",value:os.length,color:C.blue},
          {icon:"↩️",label:"Devoluções pendentes",value:pendRet,color:C.ylw},
        ].map((item,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.bdr}22`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>{item.icon}</span>
              <span style={{fontSize:13,color:C.txt2}}>{item.label}</span>
            </div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:800,color:item.color}}>{item.value}</span>
          </div>
        ))}
        <div style={{marginTop:14,padding:"10px 12px",background:`${C.gold}11`,borderRadius:8,border:`1px solid ${C.gold}33`}}>
          <div style={{fontSize:11,color:C.gold,fontWeight:600}}>📅 Envio manual</div>
          <div style={{fontSize:11,color:C.muted,marginTop:4}}>Envie quando precisar. Em breve teremos envio automático agendado.</div>
        </div>
      </Card>
    </div>
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

/* ── EMAIL ── */
function EmailPage({stock,os,returns,users,isMobile}){
  const[emails,setEmails]=useState("");
  const[assunto,setAssunto]=useState("Relatório R&E Telecom Estoque");
  const[tipo,setTipo]=useState("completo");
  const[msg,setMsg]=useState("");
  const goPage=(p)=>{setPage(p);try{localStorage.setItem("re_page",p);}catch{}};
  const pendRet=returns.filter(r=>r.status==="pending").length;
  const lowStock=stock.filter(s=>s.qty<=s.min);
  const gerarCorpo=()=>{
    const linha=(l)=>`${l}\n`;
    let corpo=`R&E TELECOM — RELATÓRIO DE ESTOQUE\n`;
    corpo+=`Gerado em: ${now()}\n${"=".repeat(50)}\n\n`;
    if(tipo==="completo"||tipo==="estoque"){
      corpo+=`📦 ESTOQUE ATUAL\n${"-".repeat(40)}\n`;
      stock.forEach(s=>{corpo+=`${s.code} | ${s.name} | ${s.qty} ${s.unit} | ${s.qty<=s.min*0.6?"⚠️ CRÍTICO":s.qty<=s.min?"⬇️ BAIXO":"✅ OK"}\n`;});
      corpo+="\n";
    }
    if(tipo==="completo"||tipo==="criticos"){
      corpo+=`⚠️ ITENS COM BAIXO ESTOQUE (${lowStock.length})\n${"-".repeat(40)}\n`;
      lowStock.forEach(s=>{corpo+=`${s.code} | ${s.name} | Atual: ${s.qty} | Mínimo: ${s.min}\n`;});
      corpo+="\n";
    }
    if(tipo==="completo"||tipo==="os"){
      corpo+=`🔧 ORDENS DE SERVIÇO (${os.length})\n${"-".repeat(40)}\n`;
      os.slice(0,10).forEach(o=>{const t=users.find(u=>u.id===o.uid);corpo+=`${o.os} | ${o.client} | ${t?.name||"?"} | ${o.date}\n`;});
      corpo+="\n";
    }
    corpo+=`↩️ DEVOLUÇÕES PENDENTES: ${pendRet}\n\n`;
    corpo+=`${"=".repeat(50)}\nR&E Telecom Estoque v1.0.0`;
    return corpo;
  };
  const enviar=()=>{
    const lista=emails.split(/[,;\n]/).map(e=>e.trim()).filter(e=>e.includes("@"));
    if(!lista.length){setMsg("❌ Informe ao menos um e-mail válido.");return;}
    const corpo=gerarCorpo();
    const mailto=`mailto:${lista.join(",")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.open(mailto,"_blank");
    setMsg(`✅ Cliente de e-mail aberto com ${lista.length} destinatário(s)!`);
    setTimeout(()=>setMsg(""),5000);
  };
  const copiar=()=>{
    navigator.clipboard.writeText(gerarCorpo()).then(()=>{setMsg("✅ Relatório copiado! Cole no seu e-mail.");setTimeout(()=>setMsg(""),4000);});
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Enviar Relatório por E-mail</h1><p style={{fontSize:12,color:C.muted,marginTop:2}}>Envio manual para destinatários cadastrados</p></div>
    {msg&&<div style={{background:msg.includes("✅")?C.grnD:C.redD,border:`1px solid ${msg.includes("✅")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.includes("✅")?C.grn:C.red,fontSize:13}}>{msg}</div>}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16}}>
      <Card style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:4}}>⚙️ Configurar Envio</div>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Destinatários (um por linha ou separados por vírgula)</label>
          <textarea value={emails} onChange={e=>setEmails(e.target.value)} rows={4} placeholder={"joao@empresa.com\ngerente@empresa.com\ndiretoria@empresa.com"}
            style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"11px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
        </div>
        <Inp label="Assunto do E-mail" value={assunto} onChange={setAssunto}/>
        <Sel label="Tipo de Relatório" value={tipo} onChange={setTipo} options={[
          {value:"completo",label:"Relatório Completo"},
          {value:"estoque",label:"Apenas Estoque"},
          {value:"criticos",label:"Apenas Itens Críticos"},
          {value:"os",label:"Apenas Ordens de Serviço"},
        ]}/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn color="gold" onClick={enviar} style={{flex:1}}>📧 Abrir E-mail</Btn>
          <Btn color="ghost" outline onClick={copiar} style={{flex:1}}>📋 Copiar Conteúdo</Btn>
        </div>
        <div style={{background:C.surf,borderRadius:8,padding:"10px 14px",border:`1px solid ${C.bdr}`}}>
          <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>
            💡 <strong style={{color:C.txt2}}>Como funciona:</strong> Clique em "Abrir E-mail" para abrir seu app de e-mail já preenchido, ou "Copiar Conteúdo" para colar manualmente.
          </div>
        </div>
      </Card>
      <Card style={{padding:18}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>📊 Resumo do Relatório</div>
        {[
          {icon:"📦",label:"Total de itens",value:stock.length,color:C.gold},
          {icon:"⚠️",label:"Itens críticos",value:stock.filter(s=>s.qty<=s.min*0.6).length,color:C.red},
          {icon:"⬇️",label:"Estoque baixo",value:stock.filter(s=>s.qty<=s.min&&s.qty>s.min*0.6).length,color:C.ylw},
          {icon:"🔧",label:"Ordens de serviço",value:os.length,color:C.blue},
          {icon:"↩️",label:"Devoluções pendentes",value:pendRet,color:C.ylw},
        ].map((item,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.bdr}22`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>{item.icon}</span>
              <span style={{fontSize:13,color:C.txt2}}>{item.label}</span>
            </div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:800,color:item.color}}>{item.value}</span>
          </div>
        ))}
        <div style={{marginTop:14,padding:"10px 12px",background:`${C.gold}11`,borderRadius:8,border:`1px solid ${C.gold}33`}}>
          <div style={{fontSize:11,color:C.gold,fontWeight:600}}>📅 Envio manual</div>
          <div style={{fontSize:11,color:C.muted,marginTop:4}}>Envie quando precisar. Em breve teremos envio automático agendado.</div>
        </div>
      </Card>
    </div>
  </div>;
}

/* ── SOLICITAÇÕES DE MATERIAL ── */
function SolicitacaoPage({solicitacoes,setSolicitacoes,stock,setStock,tstock,setTstock,users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const[modal,setModal]=useState(false);
  const blank=()=>({id:uid(),sid:"",qty:""});
  const[form,setForm]=useState({urgencia:"normal",notes:"",items:[blank(),blank(),blank()]});
  const[msg,setMsg]=useState("");

  const updItem=(id,k,v)=>setForm(f=>({...f,items:f.items.map(r=>r.id===id?{...r,[k]:v}:r)}));
  const addLinhas=(n)=>setForm(f=>({...f,items:[...f.items,...Array.from({length:n},blank)]}));
  const remItem=(id)=>setForm(f=>({...f,items:f.items.length>1?f.items.filter(r=>r.id!==id):f.items}));

  const validItems=form.items.filter(r=>r.sid&&parseInt(r.qty)>0);
  const viewSol=isTec?solicitacoes.filter(s=>s.uid===currentUser.id):solicitacoes;
  const pendentes=solicitacoes.filter(s=>s.status==="pending");

  const enviar=()=>{
    if(!validItems.length){setMsg("err:Preencha ao menos 1 material e quantidade.");return;}
    const nova={id:uid(),uid:currentUser.id,date:now(),
      items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),
      status:"pending",urgencia:form.urgencia,notes:form.notes,rDate:null,rBy:null};
    setSolicitacoes(p=>[nova,...p]);
    addLog(currentUser.name,"Solicitação",currentUser.name+" solicitou "+validItems.length+" item(s)");
    setModal(false);
    setForm({urgencia:"normal",notes:"",items:[blank(),blank(),blank()]});
    setMsg("ok:Solicitação enviada com sucesso!");
    setTimeout(()=>setMsg(""),5000);
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
        {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>setModal(true)}>📋 Nova Solicitação</Btn>}
      </div>
    </div>

    {msg&&<div style={{background:msg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${msg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{msg.replace(/^(ok|err):/,"")}</div>}

    {viewSol.length===0&&<Card style={{padding:40,textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:10}}>📋</div>
      <div style={{fontSize:14,color:C.muted}}>{isTec?"Nenhuma solicitação feita ainda. Clique em Nova Solicitação!":"Nenhuma solicitação recebida."}</div>
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

              {/* Materiais em grade 3 colunas */}
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

              {sol.rBy&&<div style={{fontSize:11,color:C.muted,marginTop:8}}>{sl[sol.status].replace(/[^\w\s]/g,"")} por <strong style={{color:C.txt2}}>{sol.rBy}</strong> em {sol.rDate}</div>}
            </div>
            {!isTec&&sol.status==="pending"&&<div style={{display:"flex",flexDirection:isMobile?"row":"column",gap:8,flexShrink:0}}>
              <Btn size="sm" color="grn" onClick={()=>confirmar(sol)}>✓ Confirmar</Btn>
              <Btn size="sm" color="red" outline onClick={()=>rejeitar(sol)}>✕ Rejeitar</Btn>
            </div>}
          </div>
        </Card>;
      })}
    </div>

    {/* Modal Nova Solicitação — estilo planilha */}
    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,
        borderRadius:isMobile?"16px 16px 0 0":12,
        width:"100%",maxWidth:780,
        height:isMobile?"95vh":"90vh",
        display:"flex",flexDirection:"column",
        position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>

        {/* Header fixo */}
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>📋 Nova Solicitação de Material</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>
              {validItems.length} item(s) preenchido(s) ·
              <span style={{color:C.gold,fontWeight:700,marginLeft:4}}>{form.items.length} linhas</span>
            </div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Body scroll */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>

          {/* Urgência e obs */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".08em",marginBottom:12}}>⚙️ DETALHES DA SOLICITAÇÃO</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
              <Sel label="Urgência" value={form.urgencia} onChange={v=>setForm(f=>({...f,urgencia:v}))} options={[{value:"normal",label:"Normal"},{value:"alta",label:"🟡 Alta Prioridade"},{value:"urgente",label:"🔴 Urgente"}]}/>
              <Inp label="Observação" value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))} placeholder="Ex: Para instalação amanhã, OS-001..."/>
            </div>
          </div>

          {/* Tabela de itens */}
          <div style={{background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`,overflow:"hidden"}}>
            <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".08em"}}>
                🔩 MATERIAIS SOLICITADOS
                <span style={{background:`${C.gold}22`,color:C.gold,fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4,marginLeft:8}}>{form.items.length} linhas</span>
                <span style={{background:`${C.grn}22`,color:C.grn,fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4,marginLeft:6}}>{validItems.length} preenchidos</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Btn size="xs" color="gold" outline onClick={()=>addLinhas(5)}>+5 linhas</Btn>
                <Btn size="xs" color="gold" onClick={()=>addLinhas(1)}>+ 1 linha</Btn>
              </div>
            </div>

            {/* Cabeçalho */}
            {!isMobile&&<div style={{display:"grid",gridTemplateColumns:"1fr 100px 36px",gap:8,padding:"8px 14px",background:C.card,borderBottom:`1px solid ${C.bdr}`}}>
              <span style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Material</span>
              <span style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Quantidade</span>
              <span/>
            </div>}

            {/* Linhas */}
            <div style={{padding:"8px 14px",display:"flex",flexDirection:"column",gap:6}}>
              {form.items.map((it,idx)=>{
                const s=it.sid?stock.find(x=>x.id===it.sid):null;
                return <div key={it.id} style={{
                  display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 100px 36px",
                  gap:isMobile?8:6,alignItems:"center",
                  padding:isMobile?"10px":"6px 8px",
                  background:it.sid?`${C.gold}08`:C.card,
                  borderRadius:8,border:`1px solid ${it.sid?`${C.gold}33`:C.bdr2}`}}>

                  {isMobile&&<div style={{fontSize:10,fontWeight:700,color:C.muted}}>ITEM {idx+1}</div>}

                  <div>
                    <select value={it.sid} onChange={e=>updItem(it.id,"sid",e.target.value)}
                      style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"9px 10px",color:it.sid?C.txt:C.muted,fontSize:13}}>
                      <option value="">— Selecionar material —</option>
                      {stock.map(s=><option key={s.id} value={s.id}>[{s.code||"—"}] {s.name} | Estoque: {s.qty} {s.unit}</option>)}
                    </select>
                    {s&&<div style={{fontSize:10,color:C.grn,marginTop:3}}>✓ {s.name} · Estoque disponível: <strong>{s.qty}</strong> {s.unit}</div>}
                  </div>

                  <input type="number" value={it.qty} onChange={e=>updItem(it.id,"qty",e.target.value)}
                    placeholder="0" min="0"
                    style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"9px 10px",color:C.txt,fontSize:14,fontWeight:700,width:"100%",textAlign:"center"}}/>

                  <button onClick={()=>remItem(it.id)}
                    style={{background:"transparent",color:C.muted2,border:"none",cursor:"pointer",fontSize:16,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6}}>✕</button>
                </div>;
              })}
            </div>

            {/* Botões adicionar */}
            <div style={{padding:"10px 14px",borderTop:`1px solid ${C.bdr}`,display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>addLinhas(1)} style={{background:"transparent",border:`1.5px dashed ${C.bdr2}`,borderRadius:7,padding:"7px 16px",color:C.muted,cursor:"pointer",fontSize:12,fontWeight:600}}>+ 1 linha</button>
              <button onClick={()=>addLinhas(5)} style={{background:"transparent",border:`1.5px dashed ${C.bdr2}`,borderRadius:7,padding:"7px 16px",color:C.muted,cursor:"pointer",fontSize:12,fontWeight:600}}>+ 5 linhas</button>
              <button onClick={()=>addLinhas(10)} style={{background:"transparent",border:`1.5px dashed ${C.bdr2}`,borderRadius:7,padding:"7px 16px",color:C.muted,cursor:"pointer",fontSize:12,fontWeight:600}}>+ 10 linhas</button>
            </div>
          </div>

        </div>

        {/* Footer fixo */}
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{fontSize:12,color:C.muted}}>
            <span style={{color:C.gold,fontWeight:700,fontSize:16}}>{validItems.length}</span> item(s) preenchido(s)
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn color="gold" onClick={enviar} style={{minWidth:180}}>📤 Enviar Solicitação</Btn>
          </div>
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
  const isMobile=useIsMobile();
  const addLog=(u,a,d)=>{
    const tipo=a.toLowerCase().includes("saída")||a.toLowerCase().includes("saida")?"saida":a.toLowerCase().includes("entrada")?"entrada":a.toLowerCase().includes("aprovada")?"aprovada":a.toLowerCase().includes("devolução")||a.toLowerCase().includes("solicitada")?"dev":"outro";
    setLogs(p=>[{id:uid(),date:now(),user:u,action:a,detail:d,tipo},...p]);
  };
  if(!user)return <LoginPage users={users} onLogin={u=>{setUser(u);setPage("dash");try{localStorage.setItem("re_session",JSON.stringify(u));localStorage.setItem("re_page","dash");}catch{}}}/>;
  const isAdm=user.role==="admin";
  const goPage=(p)=>{setPage(p);try{localStorage.setItem("re_page",p);}catch{}};
  const pendRet=returns.filter(r=>r.status==="pending").length;
  const pendSol=solicitacoes.filter(s=>s.status==="pending").length;
  const p={stock,setStock,tstock,setTstock,os,setOs,returns,setReturns,nf,setNf,users,setUsers,currentUser:user,addLog,isAdmin:isAdm,isMobile};
  const pages={
    dash:<Dashboard {...p} setPage={setPage} logs={logs} pendSol={pendSol}/>,
    estoque:<EstoquePage {...p}/>,
    kit:<KitPage tstock={tstock} stock={stock} users={users} currentUser={user} isMobile={isMobile}/>,
    dist:<DistPage {...p}/>,
    os:<OSPage {...p}/>,
    dev:<DevPage {...p}/>,
    sol:<SolicitacaoPage solicitacoes={solicitacoes} setSolicitacoes={setSolicitacoes} stock={stock} setStock={setStock} tstock={tstock} setTstock={setTstock} users={users} currentUser={user} addLog={addLog} isMobile={isMobile}/>,
    nf:<NFPage nf={nf} setNf={setNf} stock={stock} setStock={setStock} addLog={addLog} currentUser={user} isMobile={isMobile}/>,
    rel:<RelPage stock={stock} os={os} returns={returns} users={users} isMobile={isMobile} currentUser={user}/>,
    email:<EmailPage stock={stock} os={os} returns={returns} users={users} isMobile={isMobile}/>,
    cat:<CatPage cats={cats} setCats={setCats} isMobile={isMobile}/>,
    produtos:<ProdutosPage produtos={produtos} setProdutos={setProdutos} cats={cats} isMobile={isMobile}/>,
    usr:<UsrPage users={users} setUsers={setUsers} addLog={addLog} currentUser={user} isMobile={isMobile}/>,
    log:<LogPage logs={logs} isMobile={isMobile}/>,
  };
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
        <span style={{fontSize:11,color:C.muted}}>R&E Telecom Estoque — v1.0.0</span>
        <span style={{fontSize:11,color:C.muted}}>© {new Date().getFullYear()} R&E Telecom — Todos os direitos reservados.</span>
      </div>}
    </div>
    {isMobile&&<BottomNav page={page} setPage={goPage} user={user} onMenuOpen={()=>setDrawerOpen(true)}/>}
  </div>;
}