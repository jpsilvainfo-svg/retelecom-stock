// StockTel v1.6 FIXED-20260527 â€” visual premium + main/render corrigido
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import { sbGet, sbSet } from "./supabase.js";

const C={
  bg:"#070707",
  surf:"#101010",
  card:"#171717",
  card2:"#1d1d1f",
  bdr:"#2d2d2d",
  bdr2:"#3a3a3a",
  gold:"#d10000",
  goldD:"#d1000026",
  goldL:"#ff1a1a",
  red:"#d10000",
  redD:"#d1000026",
  grn:"#00c853",
  grnD:"#00c85322",
  ylw:"#ff9800",
  ylwD:"#ff980022",
  blue:"#2196f3",
  blueD:"#2196f322",
  txt:"#ffffff",
  txt2:"#d6d6d6",
  muted:"#9a9a9a",
  muted2:"#666666",
  glass:"rgba(20,20,22,.82)",
  shadow:"0 18px 45px rgba(0,0,0,.45)",
  glow:"0 0 28px rgba(209,0,0,.20)"
};
const PIE=["#d10000","#ff9800","#ffd54f","#00c853","#2196f3","#9c27b0","#9e9e9e","#607d8b"];
const catColor=(name,i)=>{
  const n=String(name||"").toLowerCase();
  if(n.includes("equip"))return "#d10000";
  if(n.includes("cabo"))return "#2196f3";
  if(n.includes("conector"))return "#00c853";
  if(n.includes("caixa"))return "#ff9800";
  if(n.includes("acess"))return "#ffd54f";
  if(n.includes("ferrament"))return "#9c27b0";
  if(n.includes("prevent"))return "#00bcd4";
  return PIE[i%PIE.length];
};
const consumptionColor=(pct)=> pct>=75?"#d10000":pct>=50?"#ff9800":"#00c853";
const ALL_MODULES=[
  {k:"dash",l:"Dashboard",icon:"ðŸ ",group:"geral"},
  {k:"os",l:"Ordens de ServiÃ§o",icon:"ðŸ”§",group:"operacional"},
  {k:"frota",l:"Frota",icon:"ðŸš—",group:"operacional"},
  {k:"estoque",l:"Estoque Base",icon:"ðŸ“¦",group:"estoque"},
  {k:"kit",l:"Estoque TÃ©cnico",icon:"ðŸŽ’",group:"estoque"},
  {k:"nf",l:"Entrada de Materiais (NF)",icon:"ðŸ“¥",group:"estoque"},
  {k:"dist",l:"SaÃ­da / LiberaÃ§Ã£o",icon:"ðŸš€",group:"estoque"},
  {k:"dev",l:"DevoluÃ§Ãµes",icon:"â†©ï¸",group:"operacional"},
  {k:"sol",l:"SolicitaÃ§Ãµes",icon:"ðŸ“‹",group:"operacional"},
  {k:"rel",l:"RelatÃ³rios",icon:"ðŸ“Š",group:"relatorios"},
  {k:"email",l:"RelatÃ³rio Administrativo",icon:"ðŸ“§",group:"relatorios"},
  {k:"cat",l:"Categorias",icon:"ðŸ·ï¸",group:"admin"},
  {k:"produtos",l:"Produtos",icon:"ðŸ”©",group:"admin"},
  {k:"usr",l:"UsuÃ¡rios",icon:"ðŸ‘¥",group:"admin"},
  {k:"log",l:"Logs do Sistema",icon:"ðŸ“‹",group:"admin"},
  {k:"ajuda",l:"Ajuda / Docs",icon:"â“",group:"admin"},
  {k:"manut",l:"ManutenÃ§Ã£o",icon:"ðŸ”©",group:"mecanico"},
  {k:"ponto",l:"Ponto EletrÃ´nico",icon:"ðŸ•",group:"operacional"}
];
const DEFAULT_PERMS={
  superadmin:ALL_MODULES.map(m=>m.k),
  admin:ALL_MODULES.map(m=>m.k),
  estoque:["dash","os","estoque","kit","dist","dev","sol","rel","ajuda","ponto"],
  tecnico:["dash","os","frota","kit","dev","sol","rel","ajuda","ponto"],
  financeiro:["dash","nf","rel","email","os","dev","log","ajuda"],
  mecanico:["dash","manut","frota","ajuda","ponto"],
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
      // Sem conexÃ£o: usa localStorage silenciosamente
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

const USERS0=[
  {id:"u0",name:"Master StockTel",email:"master@stocktel.com.br",phone:"",cpf:"",login:"stocktelmaster",pass:"ST@fMa@wKQX2026!",role:"superadmin",photo:"",perms:ALL_MODULES.map(m=>m.k),mustChangePassword:false},
  {id:"u1",name:"Administrador",email:"admin@stocktel.com.br",phone:"(21)99999-0001",cpf:"000.000.000-01",login:"admin",pass:"admin123",role:"admin",photo:"",perms:ALL_MODULES.map(m=>m.k),mustChangePassword:false},
  {id:"u2",name:"Marcos Estoque",email:"estoque@stocktel.com.br",phone:"(21)99999-0002",cpf:"000.000.000-02",login:"estoque",pass:"est123",role:"estoque",perms:DEFAULT_PERMS["estoque"]||[],mustChangePassword:false},
  {id:"u3",name:"JoÃ£o Silva",email:"joao@stocktel.com.br",phone:"(21)98888-0001",cpf:"111.111.111-01",login:"joao",pass:"tec123",role:"tecnico",perms:DEFAULT_PERMS["tecnico"]||[],mustChangePassword:false},
  {id:"u4",name:"Carlos Alberto",email:"carlos@stocktel.com.br",phone:"(21)98888-0002",cpf:"111.111.111-02",login:"carlos",pass:"tec456",role:"tecnico",perms:DEFAULT_PERMS["tecnico"]||[],mustChangePassword:false},
  {id:"u5",name:"JoÃ£o Paulo",email:"jpaulo@stocktel.com.br",phone:"(21)98888-0003",cpf:"111.111.111-03",login:"jpaulo",pass:"tec789",role:"tecnico",perms:DEFAULT_PERMS["tecnico"]||[],mustChangePassword:false},
  {id:"u6",name:"Marcos VinÃ­cius",email:"marcos@stocktel.com.br",phone:"(21)98888-0004",cpf:"111.111.111-04",login:"marcos",pass:"tec321",role:"tecnico",perms:DEFAULT_PERMS["tecnico"]||[],mustChangePassword:false},
  {id:"u7",name:"Pedro Henrique",email:"pedro@stocktel.com.br",phone:"(21)98888-0005",cpf:"111.111.111-05",login:"pedro",pass:"tec654",role:"tecnico",perms:DEFAULT_PERMS["tecnico"]||[],mustChangePassword:false},
];
const STOCK0=[
  {id:"s1",code:"ONU-001",name:"ONU Huawei HG8145V5",cat:"Equipamentos",unit:"un",qty:12,min:20},
  {id:"s2",code:"ONT-001",name:"ONT ZTE F601",cat:"Equipamentos",unit:"un",qty:45,min:15},
  {id:"s3",code:"RTR-001",name:"Roteador WiFi 5G",cat:"Equipamentos",unit:"un",qty:30,min:10},
  {id:"s4",code:"SWT-001",name:"Switch 8 Portas",cat:"Equipamentos",unit:"un",qty:18,min:5},
  {id:"s5",code:"DROP-001",name:"Cabo Drop Flat 2FO (100m)",cat:"Cabos e Fios",unit:"rolo",qty:8,min:15},
  {id:"s6",code:"CNU-001",name:"Cabo NU Drop Ã“ptico",cat:"Cabos e Fios",unit:"m",qty:1800,min:300},
  {id:"s7",code:"CNT-001",name:"Cabo NT Autossustentado",cat:"Cabos e Fios",unit:"m",qty:950,min:200},
  {id:"s8",code:"CON-001",name:"Conector SC/APC",cat:"Conectores",unit:"un",qty:25,min:50},
  {id:"s9",code:"CON-002",name:"Conector SC/UPC",cat:"Conectores",unit:"un",qty:180,min:50},
  {id:"s10",code:"CON-003",name:"Conector RJ45",cat:"Conectores",unit:"un",qty:350,min:100},
  {id:"s11",code:"SPL-001",name:"Splitter 1x8",cat:"Caixas e AcessÃ³rios",unit:"un",qty:55,min:20},
  {id:"s12",code:"SPL-002",name:"Splitter 1x16",cat:"Caixas e AcessÃ³rios",unit:"un",qty:30,min:15},
  {id:"s13",code:"CEO-001",name:"Caixa de Emenda Ã“ptica",cat:"Caixas e AcessÃ³rios",unit:"un",qty:40,min:15},
  {id:"s14",code:"ANIL-001",name:"Anilha Galvanizada",cat:"AcessÃ³rios",unit:"pÃ§",qty:30,min:60},
  {id:"s15",code:"ALCA-001",name:"AlÃ§a Preformada",cat:"AcessÃ³rios",unit:"un",qty:18,min:30},
  {id:"s16",code:"PCH-001",name:"Patch Cord SC/APC 3m",cat:"Cabos e Fios",unit:"un",qty:85,min:30},
  {id:"s17",code:"DIO-001",name:"DIO 16 Portas",cat:"Caixas e AcessÃ³rios",unit:"un",qty:12,min:5},
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
  {id:"os1",uid:"u3",os:"OS-20250523001",client:"Maria Oliveira",cpf:"222.222.222-01",date:"23/05/2025 10:30",items:[{sid:"s6",qty:30},{sid:"s8",qty:2},{sid:"s1",qty:1}],notes:"InstalaÃ§Ã£o FTTH"},
  {id:"os2",uid:"u4",os:"OS-20250522045",client:"Roberto Costa",cpf:"222.222.222-02",date:"22/05/2025 14:00",items:[{sid:"s7",qty:50},{sid:"s2",qty:1}],notes:"ManutenÃ§Ã£o rede"},
  {id:"os3",uid:"u5",os:"OS-20250521032",client:"Ana Souza",cpf:"222.222.222-03",date:"21/05/2025 10:15",items:[{sid:"s6",qty:40},{sid:"s10",qty:5}],notes:"InstalaÃ§Ã£o nova"},
];
const RET0=[
  {id:"r1",uid:"u4",date:"23/05/2025 09:15",items:[{sid:"s6",qty:20},{sid:"s9",qty:3}],status:"pending",notes:"Sobrou do serviÃ§o",rDate:null,rBy:null},
  {id:"r2",uid:"u5",date:"22/05/2025 14:20",items:[{sid:"s6",qty:15}],status:"approved",notes:"Material excedente",rDate:"22/05/2025 16:30",rBy:"Administrador"},
];
const NF0=[
  {id:"nf1",num:"NF-1258",supplier:"Fiber Total",date:"2025-05-22",items:[{sid:"s6",qty:500,val:425},{sid:"s8",qty:100,val:160}],total:585,obs:"Compra mensal"},
  {id:"nf2",num:"NF-1201",supplier:"Ã“ptica Sul",date:"2025-05-10",items:[{sid:"s1",qty:20,val:3600},{sid:"s2",qty:15,val:2700}],total:6300,obs:"Equipamentos CPE"},
];
const LOGS0=[
  {id:"l1",date:"23/05/2025 10:30",user:"JoÃ£o Silva",action:"SaÃ­da",detail:"LiberaÃ§Ã£o Â· OS-20250523001",tipo:"saida"},
  {id:"l2",date:"23/05/2025 09:15",user:"Carlos Alberto",action:"DevoluÃ§Ã£o Solicitada",detail:"OS-20250522045",tipo:"dev"},
  {id:"l3",date:"22/05/2025 16:45",user:"Administrador",action:"Entrada",detail:"NF-1258 Â· Fiber Total",tipo:"entrada"},
  {id:"l4",date:"22/05/2025 14:20",user:"Administrador",action:"DevoluÃ§Ã£o Aprovada",detail:"TÃ©cnico: JoÃ£o Paulo",tipo:"aprovada"},
];

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html{font-size:16px;background:#070707;}
body{
  background:
    radial-gradient(circle at 10% 0%,rgba(209,0,0,.16),transparent 32%),
    radial-gradient(circle at 88% 8%,rgba(255,26,26,.10),transparent 30%),
    linear-gradient(135deg,#070707 0%,#101010 42%,#070707 100%);
  font-family:'Inter',sans-serif;
  -webkit-text-size-adjust:100%;
  color:#fff;
}
body:before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  opacity:.18;
  background-image:
    linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);
  background-size:42px 42px;
  mask-image:linear-gradient(to bottom,black,transparent 82%);
}
::-webkit-scrollbar{width:6px;height:6px;}
::-webkit-scrollbar-track{background:#0d0d0d;}
::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#d10000,#3a3a3a);border-radius:6px;}
button{cursor:pointer;border:none;font-family:'Inter',sans-serif;}
input,select,textarea{font-family:'Inter',sans-serif;border:none;outline:none;}
input:focus,select:focus,textarea:focus{box-shadow:0 0 0 1px rgba(209,0,0,.55),0 0 22px rgba(209,0,0,.18)!important;border-color:#d10000!important;}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideLeft{from{opacity:0;transform:translateX(-100%)}to{opacity:1;transform:none}}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 18px rgba(209,0,0,.18)}50%{box-shadow:0 0 32px rgba(209,0,0,.35)}}
.fi{animation:fadeIn .28s ease}
.su{animation:slideUp .25s ease}
.sl{animation:slideLeft .25s ease}

/* â”€â”€ PREMIUM UI â”€â”€ */
.fi { animation: fadeIn 0.25s ease; }
.card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
.gradient-red { background: linear-gradient(135deg, #cc0000 0%, #8b0000 100%); }
.gradient-dark { background: linear-gradient(135deg, #1a1a1a 0%, #2d0000 60%, #cc000044 100%); }
.pulse { animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
@keyframes countUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
.kpi-value { animation: countUp 0.5s ease; }
.badge-glow { box-shadow: 0 0 12px currentColor; }
.progress-bar { height:6px; border-radius:3px; background:#2a2a2a; overflow:hidden; }
.progress-fill { height:100%; border-radius:3px; transition:width 0.6s ease; }
.stat-card { position:relative; overflow:hidden; }
.stat-card::after { content:''; position:absolute; top:-50%; right:-20%; width:120px; height:120px; border-radius:50%; background:currentColor; opacity:0.05; }
.tooltip-wrapper { position:relative; }
.tooltip-wrapper:hover .tooltip { display:block; }
.tooltip { display:none; position:absolute; bottom:100%; left:50%; transform:translateX(-50%); background:#1a1a1a; color:#fff; padding:6px 12px; border-radius:6px; font-size:11px; white-space:nowrap; z-index:100; margin-bottom:6px; border:1px solid #333; }
`;

/* â”€â”€ ATOMS â”€â”€ */
function Btn({children,onClick,color="gold",size="md",disabled,style:sx={},outline,full}){
  const pal={
    gold:{bg:`linear-gradient(135deg,${C.gold},${C.goldL})`,solid:C.gold,fg:"#fff"},
    red:{bg:`linear-gradient(135deg,${C.red},${C.goldL})`,solid:C.red,fg:"#fff"},
    grn:{bg:`linear-gradient(135deg,${C.grn},#0fdc68)`,solid:C.grn,fg:"#061107"},
    ghost:{bg:"transparent",solid:C.bdr2,fg:C.muted}
  };
  const p=pal[color]||pal.gold;
  const sz={xs:{padding:"5px 11px",fontSize:11},sm:{padding:"8px 15px",fontSize:12},md:{padding:"11px 21px",fontSize:13},lg:{padding:"14px 25px",fontSize:15}}[size];
  return <button onClick={onClick} disabled={disabled} style={{
    background:outline?"rgba(255,255,255,.02)":p.bg,
    color:outline?p.solid:p.fg,
    border:outline?`1px solid ${p.solid}`:"1px solid rgba(255,255,255,.06)",
    borderRadius:12,
    fontWeight:800,
    opacity:disabled?.45:1,
    width:full?"100%":"auto",
    transition:"all .22s ease",
    boxShadow:outline?"none":`0 10px 22px ${color==="ghost"?"rgba(0,0,0,.22)":"rgba(209,0,0,.22)"}`,
    letterSpacing:".01em",
    ...sz,
    ...sx
  }}>{children}</button>;
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
  return <div onClick={onClick} style={{
    background:`linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012)),${C.card}`,
    border:`1px solid ${C.bdr}`,
    borderTop:`1px solid rgba(255,255,255,.08)`,
    borderRadius:18,
    boxShadow:C.shadow,
    backdropFilter:"blur(10px)",
    position:"relative",
    overflow:"hidden",
    transition:"transform .22s ease, box-shadow .22s ease, border-color .22s ease",
    ...sx
  }}>{children}</div>;
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
        <button onClick={onClose} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>âœ•</button>
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

/* â”€â”€ LOGIN â”€â”€ */
class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e){return{hasError:true,error:e};}
  render(){
    if(this.state.hasError){
      return <div style={{minHeight:"100vh",background:"#161616",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
        <div style={{fontSize:40}}>âš ï¸</div>
        <div style={{fontSize:18,fontWeight:700,color:"#cc0000"}}>Erro ao carregar o sistema</div>
        <div style={{fontSize:13,color:"#888",maxWidth:500,textAlign:"center"}}>{String(this.state.error?.message||this.state.error)}</div>
        <button onClick={()=>window.location.reload()} style={{background:"#cc0000",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:8}}>
          ðŸ”„ Recarregar
        </button>
      </div>;
    }
    return this.props.children;
  }
}


/* â”€â”€ TOAST NOTIFICATION â”€â”€ */
function Toast({msg,type="info",onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t);},[onClose]);
  const themes={
    success:{bg:C.grnD,border:C.grn,color:C.grn,icon:"âœ…"},
    error:  {bg:C.redD,border:C.red,color:C.red,icon:"âŒ"},
    warning:{bg:`${C.ylw}22`,border:C.ylw,color:C.ylw,icon:"âš ï¸"},
    info:   {bg:`${C.gold}22`,border:C.gold,color:C.gold,icon:"â„¹ï¸"},
  };
  const th=themes[type]||themes.info;
  return <div style={{position:"fixed",top:16,right:16,zIndex:9999,maxWidth:380,minWidth:280,
    background:th.bg,border:`1px solid ${th.border}`,borderRadius:10,padding:"12px 16px",
    display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 24px #00000088",
    animation:"slideLeft 0.3s ease"}}>
    <span style={{fontSize:20,flexShrink:0}}>{th.icon}</span>
    <span style={{fontSize:13,color:th.color,flex:1,fontWeight:500,lineHeight:1.4}}>{msg}</span>
    <button onClick={onClose} style={{background:"transparent",color:th.color,border:"none",
      cursor:"pointer",fontSize:18,padding:"0 2px",lineHeight:1,opacity:0.7}}>âœ•</button>
  </div>;
}

/* â”€â”€ LOADING SPINNER â”€â”€ */
function Spinner(){
  return <div style={{position:"fixed",inset:0,background:"#161616ee",zIndex:8000,
    display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
    <div style={{width:48,height:48,border:`4px solid ${C.gold}33`,
      borderTop:`4px solid ${C.gold}`,borderRadius:"50%",
      animation:"spin 0.8s linear infinite"}}/>
    <div style={{fontSize:13,color:C.muted}}>Carregando...</div>
  </div>;
}

function LoginPage({users,onLogin}){
  const isMobile=useIsMobile();
  const[login,setLogin]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);
  const[showPass,setShowPass]=useState(false);

  const doLogin=()=>{
    if(!login||!pass){setErr("Preencha login e senha.");return;}
    setLoading(true);
    setTimeout(()=>{
      const u=users.find(u=>u.login===login&&u.pass===pass);
      if(u){setErr("");onLogin(u);}
      else{setErr("Login ou senha incorretos.");setLoading(false);}
    },400);
  };

  return <div style={{minHeight:"100vh",background:"#070707",display:"flex",alignItems:"center",justifyContent:"center",padding:16,position:"relative",overflow:"hidden"}}>
    {/* Background effects */}
    <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% -10%,rgba(209,0,0,0.15) 0%,transparent 70%)",pointerEvents:"none"}}/>
    <div style={{position:"fixed",top:"20%",right:"10%",width:300,height:300,background:"radial-gradient(circle,rgba(209,0,0,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
    <div style={{position:"fixed",bottom:"20%",left:"5%",width:200,height:200,background:"radial-gradient(circle,rgba(33,150,243,0.05) 0%,transparent 70%)",pointerEvents:"none"}}/>

    <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:1}}>
      {/* Logo */}
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:14,marginBottom:12}}>
          <img src="/logo-stocktel.png" alt="StockTel" style={{height:52,filter:"drop-shadow(0 0 16px rgba(209,0,0,0.5))"}} onError={e=>e.target.style.display="none"}/>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-0.5px",lineHeight:1}}>StockTel</div>
            <div style={{fontSize:12,color:"#9a9a9a",letterSpacing:".08em",textTransform:"uppercase"}}>SoluÃ§Ãµes em Telecom</div>
          </div>
        </div>
        <div style={{fontSize:14,color:"#666",marginTop:4}}>GestÃ£o inteligente para provedores FTTH</div>
      </div>

      {/* Card */}
      <div style={{background:"rgba(23,23,23,0.95)",border:"1px solid #2d2d2d",borderRadius:16,padding:isMobile?24:32,boxShadow:"0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)"}}>
        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4}}>Bem-vindo de volta ðŸ‘‹</h2>
          <p style={{fontSize:13,color:"#666"}}>Entre com suas credenciais de acesso</p>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Login field */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#666",letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Login</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"#444"}}>ðŸ‘¤</span>
              <input value={login} onChange={e=>setLogin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}
                placeholder="Seu usuÃ¡rio" autoComplete="username"
                style={{width:"100%",background:"#101010",border:"1px solid #2d2d2d",borderRadius:10,padding:"12px 12px 12px 38px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}
                onFocus={e=>e.target.style.borderColor="#d10000"} onBlur={e=>e.target.style.borderColor="#2d2d2d"}/>
            </div>
          </div>

          {/* Password field */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#666",letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Senha</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"#444"}}>ðŸ”’</span>
              <input value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}
                type={showPass?"text":"password"} placeholder="Sua senha" autoComplete="current-password"
                style={{width:"100%",background:"#101010",border:"1px solid #2d2d2d",borderRadius:10,padding:"12px 42px 12px 38px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}
                onFocus={e=>e.target.style.borderColor="#d10000"} onBlur={e=>e.target.style.borderColor="#2d2d2d"}/>
              <button onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:"#444",padding:0}}>
                {showPass?"ðŸ™ˆ":"ðŸ‘ï¸"}
              </button>
            </div>
          </div>

          {/* Error */}
          {err&&<div style={{background:"rgba(209,0,0,0.12)",border:"1px solid rgba(209,0,0,0.3)",borderRadius:8,padding:"10px 14px",color:"#ff4444",fontSize:13,display:"flex",alignItems:"center",gap:8}}>
            <span>âš ï¸</span> {err}
          </div>}

          {/* Submit */}
          <button onClick={doLogin} disabled={loading}
            style={{width:"100%",padding:"13px",borderRadius:10,border:"none",cursor:loading?"not-allowed":"pointer",fontSize:14,fontWeight:700,letterSpacing:".04em",transition:"all 0.2s",marginTop:4,
              background:loading?"#333":"linear-gradient(135deg,#d10000 0%,#ff1a1a 100%)",
              color:"#fff",boxShadow:loading?"none":"0 4px 20px rgba(209,0,0,0.4)"}}>
            {loading?"Verificando...":"Entrar â†’"}
          </button>
        </div>

        {/* Footer */}
        <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid #1a1a1a",textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
            {[{icon:"ðŸ“¦",label:"Estoque"},{icon:"ðŸ”§",label:"OS"},{icon:"ðŸš—",label:"Frota"},{icon:"ðŸ“Š",label:"RelatÃ³rios"}].map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#444"}}>
                <span>{f.icon}</span><span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#333"}}>
        StockTel v1.6 Â· Â© {new Date().getFullYear()} Â· Todos os direitos reservados
      </div>
    </div>
  </div>;
}


function Sidebar({user,page,setPage,onLogout}){
  const basePerms=user.perms||DEFAULT_PERMS[user.role]||["dash"];
  // Garante que mÃ³dulos novos do perfil apareÃ§am mesmo em users antigos
  const roleDefaults=DEFAULT_PERMS[user.role]||[];
  const perms=[...new Set([...basePerms,...roleDefaults])];
  const nav=ALL_MODULES.filter(m=>perms.includes(m.k)).map(m=>({k:m.k,icon:m.icon,label:m.l,group:m.group}));
  const groupLabels={geral:"GERAL",operacional:"OPERAÃ‡ÃƒO",estoque:"ESTOQUE",relatorios:"RELATÃ“RIOS",admin:"ADMIN",mecanico:"MECÃ‚NICO"};
  const groups=[...new Set(nav.map(n=>n.group||"geral"))];
  return <div style={{
    width:258,
    minWidth:258,
    background:"linear-gradient(180deg,rgba(22,22,24,.96),rgba(10,10,10,.98))",
    borderRight:`1px solid ${C.bdr}`,
    boxShadow:"18px 0 45px rgba(0,0,0,.35)",
    display:"flex",
    flexDirection:"column",
    height:"100vh",
    flexShrink:0,
    position:"relative",
    overflow:"hidden"
  }}>
    <div style={{position:"absolute",top:-120,left:-90,width:230,height:230,borderRadius:"50%",background:"rgba(209,0,0,.20)",filter:"blur(55px)"}}/>
    <div style={{padding:"22px 18px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",zIndex:1}}>
      <img src="/logo-stocktel.png" alt="StockTel" style={{width:"100%",maxWidth:180,objectFit:"contain",filter:"drop-shadow(0 0 16px rgba(209,0,0,.30))"}}/>
    </div>
    <div style={{padding:"10px 18px 8px",borderBottom:`1px solid ${C.bdr}`,position:"relative",zIndex:1}}>
      <div style={{fontSize:10,color:C.muted,letterSpacing:".18em",textTransform:"uppercase",lineHeight:1.5}}>SoluÃ§Ãµes em TelecomunicaÃ§Ãµes</div>
    </div>
    <nav style={{flex:1,padding:"12px",overflowY:"auto",position:"relative",zIndex:1}}>
      {groups.map(g=><div key={g} style={{marginBottom:12}}>
        <div style={{fontSize:9,color:C.muted2,fontWeight:900,letterSpacing:".16em",padding:"8px 10px 6px",textTransform:"uppercase"}}>{groupLabels[g]||g}</div>
        {nav.filter(n=>(n.group||"geral")===g).map(n=>{
          const active=page===n.k;
          return <div key={n.k} onClick={()=>setPage(n.k)}
            style={{
              display:"flex",
              alignItems:"center",
              gap:11,
              padding:"11px 13px",
              borderRadius:13,
              cursor:"pointer",
              marginBottom:4,
              background:active?"linear-gradient(135deg,rgba(209,0,0,.32),rgba(209,0,0,.08))":"transparent",
              border:active?`1px solid rgba(209,0,0,.45)`:"1px solid transparent",
              boxShadow:active?"0 0 28px rgba(209,0,0,.18)":"none",
              color:active?C.txt:C.muted,
              fontWeight:active?800:600,
              fontSize:13,
              transition:"all .2s ease"
            }}>
            <span style={{fontSize:16,width:20,textAlign:"center",filter:active?"drop-shadow(0 0 8px rgba(209,0,0,.8))":"none"}}>{n.icon}</span>
            <span style={{flex:1}}>{n.label}</span>
            {active&&<span style={{width:6,height:6,borderRadius:"50%",background:C.gold,boxShadow:"0 0 12px rgba(209,0,0,.9)"}}/>}
          </div>;
        })}
      </div>)}
    </nav>
    <div style={{padding:"12px",borderTop:`1px solid ${C.bdr}`,position:"relative",zIndex:1}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px",background:"rgba(255,255,255,.035)",border:`1px solid ${C.bdr}`,borderRadius:14,marginBottom:8}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${C.goldD},rgba(255,255,255,.06))`,border:`1px solid rgba(209,0,0,.35)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,overflow:"hidden"}}>
          {user.photo?<img src={user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>ðŸ‘¤</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:800,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
          <div style={{fontSize:9,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
        </div>
        <span style={{background:`linear-gradient(135deg,${C.gold},${C.goldL})`,color:"#fff",fontSize:8,fontWeight:900,padding:"3px 6px",borderRadius:6,flexShrink:0,letterSpacing:".06em"}}>{user.role==="admin"?"ADM":user.role==="estoque"?"EST":user.role==="mecanico"?"MEC":user.role==="financeiro"?"FIN":"TEC"}</span>
      </div>
      <div onClick={()=>window.dispatchEvent(new CustomEvent("openPerfil"))} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",cursor:"pointer",color:C.muted,fontSize:12,borderRadius:8,fontWeight:700}}>
        <span>âš™ï¸</span>Meu Perfil
      </div>
      <div onClick={onLogout} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",cursor:"pointer",color:C.red,fontSize:12,borderRadius:8,fontWeight:800}}>
        <span>ðŸšª</span>Sair
      </div>
    </div>
  </div>;
}

/* â”€â”€ DRAWER MOBILE (menu lateral deslizante) â”€â”€ */
/* â”€â”€ DRAWER MOBILE (menu lateral deslizante) â”€â”€ */
function MobileDrawer({user,page,setPage,onLogout,onClose}){
  const perms=user.perms||DEFAULT_PERMS[user.role]||["dash"];
  const nav=ALL_MODULES.filter(m=>perms.includes(m.k)).map(m=>({k:m.k,icon:m.icon,label:m.l}));
  const go=(k)=>{setPage(k);onClose();};
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000aa",zIndex:200}}/>
    <div className="sl" style={{position:"fixed",top:0,left:0,bottom:0,width:280,background:C.surf,zIndex:201,display:"flex",flexDirection:"column",borderRight:`1px solid ${C.bdr}`}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <img src="/logo-stocktel.png" alt="StockTel" style={{height:44,objectFit:"contain"}}/>
        <button onClick={onClose} style={{background:C.card,color:C.muted,width:32,height:32,borderRadius:8,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>âœ•</button>
      </div>
      <div style={{padding:"10px 14px 8px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,overflow:"hidden"}}>
          {user.photo?<img src={user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>ðŸ‘¤</span>}
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.txt}}>{user.name}</div>
          <span style={{background:C.gold,color:"#000",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:3}}>{user.role==="admin"?"ADMINISTRADOR":user.role==="estoque"?"ESTOQUE":"TÃ‰CNICO"}</span>
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
        <span>âš™ï¸</span>Meu Perfil
      </div>
      <div onClick={()=>{onLogout();onClose();}} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",cursor:"pointer",color:C.red,fontSize:14,fontWeight:600}}>
        <span>ðŸšª</span>Sair do sistema
      </div>
    </div>
  </>;
}

/* â”€â”€ TOPBAR â”€â”€ */
function TopBar({user,pendRet,pendSol,setPage,isMobile,onMenuOpen}){
  return <div style={{
    height:isMobile?58:66,
    background:"linear-gradient(90deg,rgba(16,16,16,.94),rgba(24,24,24,.90))",
    borderBottom:`1px solid ${C.bdr}`,
    boxShadow:"0 10px 30px rgba(0,0,0,.28)",
    display:"flex",
    alignItems:"center",
    padding:isMobile?"0 14px":"0 26px",
    gap:12,
    flexShrink:0,
    backdropFilter:"blur(12px)"
  }}>
    {isMobile&&<button onClick={onMenuOpen} style={{background:"rgba(255,255,255,.04)",color:C.txt,width:38,height:38,borderRadius:12,fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",padding:4,border:`1px solid ${C.bdr}`}}>â˜°</button>}
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:isMobile?13:15,fontWeight:900,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        OlÃ¡, <span style={{color:C.gold,textShadow:"0 0 14px rgba(209,0,0,.45)"}}>{user.name.split(" ")[0]}</span>
      </div>
      {!isMobile&&<div style={{fontSize:11,color:C.muted,letterSpacing:".02em"}}>{today()}</div>}
    </div>
    {pendSol>0&&<div onClick={()=>setPage("sol")} style={{display:"flex",alignItems:"center",gap:6,background:C.blueD,border:`1px solid ${C.blue}55`,borderRadius:12,padding:isMobile?"7px 10px":"7px 13px",cursor:"pointer",flexShrink:0,boxShadow:"0 0 18px rgba(33,150,243,.16)"}}>
      <span style={{fontSize:13}}>ðŸ“‹</span>
      <span style={{fontSize:12,color:C.blue,fontWeight:900}}>{pendSol}</span>
      {!isMobile&&<span style={{fontSize:12,color:C.blue,fontWeight:800}}>solicitaÃ§Ã£o{pendSol>1?"Ãµes":""}</span>}
    </div>}
    {pendRet>0&&<div onClick={()=>setPage("dev")} style={{display:"flex",alignItems:"center",gap:6,background:C.ylwD,border:`1px solid ${C.ylw}55`,borderRadius:12,padding:isMobile?"7px 10px":"7px 13px",cursor:"pointer",flexShrink:0,boxShadow:"0 0 18px rgba(255,152,0,.16)"}}>
      <span style={{fontSize:13}}>ðŸ””</span>
      {!isMobile&&<span style={{fontSize:12,color:C.ylw,fontWeight:800}}>{pendRet} devoluÃ§Ã£o{pendRet>1?"Ãµes":""}</span>}
      {isMobile&&<span style={{fontSize:12,color:C.ylw,fontWeight:900}}>{pendRet}</span>}
    </div>}
    {!isMobile&&<div style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,.035)",border:`1px solid ${C.bdr2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer",boxShadow:"0 0 20px rgba(209,0,0,.10)"}}>ðŸ””</div>}
  </div>;
}

/* â”€â”€ BOTTOM NAV MOBILE â”€â”€ */
/* â”€â”€ BOTTOM NAV MOBILE â”€â”€ */
function BottomNav({page,setPage,user,onMenuOpen}){
  const basePerms=user.perms||DEFAULT_PERMS[user.role]||["dash"];
  const roleDefaults=DEFAULT_PERMS[user.role]||[];
  const perms=[...new Set([...basePerms,...roleDefaults])];
  const allItems=ALL_MODULES.filter(m=>perms.includes(m.k)).map(m=>({k:m.k,icon:m.icon,label:m.l.split(" ")[0]}));
  const visible=allItems.slice(0,5);
  const items=[...visible,{k:"__menu",icon:"â˜°",label:"Menu"}];

  return <div style={{
    position:"fixed",
    bottom:0,
    left:0,
    right:0,
    background:"linear-gradient(180deg,rgba(20,20,22,.92),rgba(8,8,8,.98))",
    borderTop:`1px solid ${C.bdr}`,
    display:"flex",
    zIndex:100,
    paddingBottom:"env(safe-area-inset-bottom)",
    boxShadow:"0 -14px 35px rgba(0,0,0,.48)",
    backdropFilter:"blur(14px)"
  }}>
    {items.map(it=>{
      const active=page===it.k;
      return <div key={it.k} onClick={()=>it.k==="__menu"?onMenuOpen():setPage(it.k)}
        style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"9px 2px 7px",cursor:"pointer",
          color:active?C.gold:C.muted,
          borderTop:active?`2px solid ${C.gold}`:"2px solid transparent",
          background:active?"rgba(209,0,0,.10)":"transparent",
          transition:"all .2s ease"}}>
        <span style={{fontSize:20,lineHeight:1,filter:active?"drop-shadow(0 0 8px rgba(209,0,0,.85))":"none"}}>{it.icon}</span>
        <span style={{fontSize:8,marginTop:3,fontWeight:active?900:600,textAlign:"center",maxWidth:48,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.label}</span>
      </div>;
    })}
  </div>;
}


/* â”€â”€ DASHBOARD â”€â”€ */
/* â”€â”€ DASHBOARD â”€â”€ */
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
  const li={saida:"â†’",entrada:"â†“",dev:"â†º",aprovada:"âœ“"};

  // â”€â”€ DASHBOARD DO TÃ‰CNICO â”€â”€
  if(isTec) return <div className="fi" style={{display:"flex",flexDirection:"column",gap:isMobile?14:20}}>
    {/* Cards do tÃ©cnico */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:isMobile?10:16}}>
      {[
        {label:"MEU KIT",value:fmt(myTstockQty),sub:"Materiais em posse",icon:"ðŸŽ’",color:C.gold},
        {label:"MINHAS OS",value:fmt(myOs.length),sub:"Ordens abertas",icon:"ðŸ”§",color:C.blue},
        {label:"DEVOLUÃ‡Ã•ES",value:fmt(myPendRet),sub:"Aguardando",icon:"â†©ï¸",color:myPendRet>0?C.ylw:C.gold},
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

    {/* Kit do tÃ©cnico resumo */}
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.bdr}`}}>
        <span style={{fontSize:13,fontWeight:700,color:C.txt}}>ðŸŽ’ Meu Kit â€” Materiais em Posse</span>
        <Btn size="xs" color="gold" outline onClick={()=>setPage("kit")}>Ver tudo</Btn>
      </div>
      {myTstock.length===0
        ?<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Nenhum material no seu kit ainda.</div>
        :myTstock.slice(0,5).map(t=>{const s=stock.find(x=>x.id===t.sid);return s?
          <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:`1px solid ${C.bdr}18`}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{s.name}</div>
              <div style={{fontSize:10,color:C.muted}}>{s.code} Â· {s.unit}</div>
            </div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:18}}>{fmt(t.qty)}</span>
          </div>:null;
        })
      }
    </Card>

    {/* Ãšltimas OS do tÃ©cnico */}
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.bdr}`}}>
        <span style={{fontSize:13,fontWeight:700,color:C.txt}}>ðŸ”§ Minhas Ãšltimas OS</span>
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

    {/* AÃ§Ãµes rÃ¡pidas tÃ©cnico */}
    <Card style={{padding:16}}>
      <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>AÃ§Ãµes RÃ¡pidas</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {icon:"ðŸ”§",label:"Nova OS",p:"os"},
          {icon:"ðŸ“‹",label:"Solicitar Material",p:"sol"},
          {icon:"â†©ï¸",label:"Solicitar DevoluÃ§Ã£o",p:"dev"},
          {icon:"ðŸŽ’",label:"Meu Kit",p:"kit"},
        ].map((a,i)=>(
          <div key={i} onClick={()=>setPage(a.p)} style={{display:"flex",alignItems:"center",gap:10,padding:"14px",background:C.surf,borderRadius:10,cursor:"pointer",border:`1px solid ${C.bdr}`}}>
            <span style={{fontSize:24}}>{a.icon}</span>
            <span style={{fontSize:13,color:C.txt2,fontWeight:500}}>{a.label}</span>
          </div>
        ))}
      </div>
    </Card>
  </div>;

  // â”€â”€ DASHBOARD ADMIN/ESTOQUE â”€â”€
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
        {label:"TOTAL DE ITENS",value:fmt(stock.length),sub:"Itens cadastrados",icon:"ðŸ“¦"},
        {label:"ESTOQUE TOTAL",value:fmt(totalQty),sub:"Unidades disponÃ­veis",icon:"ðŸ—„ï¸"},
        {label:"MATERIAIS EM USO",value:fmt(techQty),sub:"Com tÃ©cnicos",icon:"ðŸ‘·"},
        {label:"DEVOLUÃ‡Ã•ES PEND.",value:fmt(pendRet),sub:"Aguardando aprovaÃ§Ã£o",icon:"â†©ï¸"},
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
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>MovimentaÃ§Ãµes Recentes</span>
            <Btn size="xs" color="ghost" outline onClick={()=>setPage("log")} style={{fontSize:10}}>Ver todas</Btn>
          </div>
          {logs.slice(0,3).map(l=>(
            <div key={l.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 14px",borderBottom:`1px solid ${C.bdr}18`}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:`${lc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,color:lc[l.tipo]||C.gold,fontWeight:700}}>{li[l.tipo]||"Â·"}</div>
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
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>Itens com Baixo NÃ­vel</span>
            <Btn size="xs" color="ghost" outline onClick={()=>setPage("estoque")} style={{fontSize:10}}>Ver todos</Btn>
          </div>
          {low.slice(0,4).map(s=>{const crit=s.qty<=s.min*0.6;return(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${C.bdr}18`}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                <div style={{fontSize:10,color:C.muted}}>{s.code} Â· mÃ­n: {s.min}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:crit?C.red:C.ylw,fontSize:16}}>{s.qty}</span>
                {crit?<Bdg color="red">CrÃ­tico</Bdg>:<Bdg color="ylw">Baixo</Bdg>}
              </div>
            </div>
          );})}
        </Card>
        {alertasOleo.length>0&&<Card style={{padding:0,overflow:"hidden",borderLeft:`3px solid ${alertasOleo.some(a=>a.urgente)?C.red:C.ylw}`}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>âš™ï¸ Alertas de Troca de Ã“leo</span>
            <Btn size="xs" color="gold" outline onClick={()=>setPage("frota")} style={{fontSize:10}}>Ver Frota</Btn>
          </div>
          {alertasOleo.map(v=>(
            <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${C.bdr}18`}}>
              <div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.gold,fontSize:13}}>{v.placa}</span>
                <span style={{fontSize:12,color:C.muted,marginLeft:8}}>{v.modelo}</span>
              </div>
              {v.urgente?<Bdg color="red">ðŸ”´ URGENTE: {fmt(v.faltam)} km</Bdg>:<Bdg color="ylw">ðŸŸ¡ {fmt(v.faltam)} km</Bdg>}
            </div>
          ))}
        </Card>}
        <Card style={{padding:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>AÃ§Ãµes RÃ¡pidas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{icon:"ðŸ“¥",label:"Nova Entrada (NF)",p:"nf"},{icon:"ðŸš€",label:"Liberar Material",p:"dist"},{icon:"â†©ï¸",label:"DevoluÃ§Ãµes",p:"dev"},{icon:"ðŸ”§",label:"Nova OS",p:"os"},{icon:"ðŸ“¦",label:"Ver Estoque",p:"estoque"},{icon:"ðŸ“Š",label:"RelatÃ³rios",p:"rel"}].map((a,i)=>(
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
              <span style={{fontSize:14,fontWeight:700,color:C.txt}}>MovimentaÃ§Ãµes Recentes</span>
              <Btn size="xs" color="ghost" outline onClick={()=>setPage("log")} style={{fontSize:11}}>Ver todas</Btn>
            </div>
            {logs.slice(0,4).map(l=>(
              <div key={l.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 18px",borderBottom:`1px solid ${C.bdr}18`}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${lc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,color:lc[l.tipo]||C.gold,fontWeight:700}}>{li[l.tipo]||"Â·"}</div>
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
              <Btn size="xs" color="ghost" outline onClick={()=>setPage("rel")} style={{fontSize:11}}>RelatÃ³rio</Btn>
            </div>
            <div style={{position:"relative"}}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {catData.map((d,i)=><Cell key={i} fill={catColor(d.name,i)}/>)}
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
                  <div style={{width:7,height:7,borderRadius:"50%",background:catColor(d.name,i)}}/>
                  <span style={{color:C.txt2}}>{d.name}</span>
                </div>
                <span style={{color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{Math.round(d.value/totalQty*100)}%</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:18}}>
            <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>TÃ©cnicos - Consumo</div>
            {techUsage.map((t,i)=>{
              const pct=Math.round((t.value/maxU)*100);
              const c=consumptionColor(pct);
              return <div key={`${t.name}-${i}`} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,minWidth:16}}>{i+1}</span>
                    <span style={{fontSize:13,color:C.txt,fontWeight:700}}>{t.name}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:10,fontWeight:900,color:c,letterSpacing:".06em"}}>{pct>=75?"ALTO":pct>=50?"MÃ‰DIO":"OK"}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:c,fontWeight:900}}>{fmt(t.value)}</span>
                  </div>
                </div>
                <div style={{height:8,background:"rgba(255,255,255,.08)",borderRadius:999,overflow:"hidden",boxShadow:"inset 0 0 10px rgba(0,0,0,.45)"}}>
                  <div style={{
                    height:"100%",
                    width:`${pct}%`,
                    background:"linear-gradient(90deg,#00c853 0%,#ffd54f 52%,#ff9800 72%,#d10000 100%)",
                    borderRadius:999,
                    boxShadow:`0 0 14px ${c}88`
                  }}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.muted2,marginTop:3}}>
                  <span>Baixo</span><span>MÃ©dio</span><span>Alto</span>
                </div>
              </div>;
            })}
          </Card>
        </div>
        {alertasOleo.length>0&&<Card style={{padding:0,overflow:"hidden",borderLeft:`3px solid ${alertasOleo.some(a=>a.urgente)?C.red:C.ylw}`}}>
          <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:700,color:C.txt}}>âš™ï¸ Alertas de Troca de Ã“leo</span>
            <Btn size="xs" color="gold" outline onClick={()=>setPage("frota")} style={{fontSize:11}}>Ver Frota</Btn>
          </div>
          <div style={{display:"flex",gap:0,flexWrap:"wrap"}}>
            {alertasOleo.map(v=>(
              <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 18px",borderRight:`1px solid ${C.bdr}`,flex:"1 1 300px",minWidth:280}}>
                <div>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v.placa}</span>
                  <span style={{fontSize:12,color:C.muted,marginLeft:8}}>{v.modelo}</span>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>ðŸ›£ï¸ {fmt(v.kmAtual)} km atual</div>
                </div>
                {v.urgente?<Bdg color="red">ðŸ”´ URGENTE: faltam {fmt(v.faltam)} km</Bdg>:<Bdg color="ylw">ðŸŸ¡ Faltam {fmt(v.faltam)} km</Bdg>}
              </div>
            ))}
          </div>
        </Card>}
        <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.bdr}`}}>
              <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Itens com Baixo NÃ­vel</span>
              <Btn size="xs" color="ghost" outline onClick={()=>setPage("estoque")} style={{fontSize:11}}>Ver todos</Btn>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><THead cols={["CÃ“DIGO","DESCRIÃ‡ÃƒO","CATEGORIA","ESTOQUE","MÃNIMO","SITUAÃ‡ÃƒO"]}/></thead>
                <tbody>
                  {low.slice(0,5).map(s=>{const crit=s.qty<=s.min*0.6;return <TRow key={s.id} cells={[
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
                    <span style={{fontWeight:500,color:C.txt,fontSize:12}}>{s.name}</span>,
                    <span style={{fontSize:11,color:C.muted}}>{s.cat}</span>,
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:C.ylw,fontSize:13}}>{fmt(s.qty)}</span>,
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{fmt(s.min)}</span>,
                    crit?<Bdg color="red">â–² CrÃ­tico</Bdg>:<Bdg color="ylw">â— Baixo</Bdg>
                  ]}/>;
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card style={{padding:18}}>
            <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>AÃ§Ãµes RÃ¡pidas</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{icon:"ðŸ“¥",label:"Nova Entrada",p:"nf"},{icon:"ðŸš€",label:"Liberar Material",p:"dist"},{icon:"â†©ï¸",label:"DevoluÃ§Ã£o",p:"dev"},{icon:"ðŸ”§",label:"Nova OS",p:"os"},{icon:"ðŸ“¦",label:"Estoque Base",p:"estoque"},{icon:"ðŸ“Š",label:"RelatÃ³rios",p:"rel"}].map((a,i)=>(
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
  const cats=["Equipamentos","Cabos e Fios","Conectores","Caixas e AcessÃ³rios","AcessÃ³rios","Ferramentas"];
  const filtered=stock.filter(s=>s.name.toLowerCase().includes(q.toLowerCase())||s.code.toLowerCase().includes(q.toLowerCase()));
    const save=()=>{
    if(!form.name||!form.qty)return;
    if(modal==="new")setStock(p=>[...p,{id:uid(),code:form.code,name:form.name,cat:form.cat,unit:form.unit,qty:parseInt(form.qty)||0,min:parseInt(form.min)||0}]);
    else setStock(p=>p.map(s=>s.id===modal?{...s,...form,qty:parseInt(form.qty)||0,min:parseInt(form.min)||0}:s));
    addLog(currentUser.name,modal==="new"?"Entrada":"EdiÃ§Ã£o",form.name);
    setModal(null);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Estoque Base</h1></div>
      <div style={{display:"flex",gap:8,width:isMobile?"100%":"auto"}}>
        <Inp value={q} onChange={setQ} placeholder="ðŸ” Buscar..." style={{flex:1}}/>
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
                <div style={{fontSize:11,color:C.muted}}>{s.code} Â· {s.cat} Â· {s.unit}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0,marginLeft:10}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:crit?C.red:low?C.ylw:C.txt,fontSize:22}}>{fmt(s.qty)}</span>
                {crit?<Bdg color="red">CrÃ­tico</Bdg>:low?<Bdg color="ylw">Baixo</Bdg>:<Bdg color="grn">OK</Bdg>}
                {isAdmin&&<Btn size="xs" color="gold" outline onClick={()=>{setForm({code:s.code,name:s.name,cat:s.cat,unit:s.unit,qty:String(s.qty),min:String(s.min)});setModal(s.id);}}>Editar</Btn>}
              </div>
            </div>
            <div style={{marginTop:8,height:4,background:C.bdr,borderRadius:2}}>
              <div style={{height:"100%",width:`${Math.min(100,(s.qty/Math.max(s.min,1))*100)}%`,background:crit?C.red:low?C.ylw:C.grn,borderRadius:2}}/>
            </div>
            <div style={{fontSize:10,color:C.muted,marginTop:4}}>MÃ­nimo: {s.min} {s.unit}</div>
          </Card>
        );})}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÃ“DIGO","DESCRIÃ‡ÃƒO","CATEGORIA","UNID.","QTD ATUAL","QTD MÃN.","SITUAÃ‡ÃƒO",isAdmin?"AÃ‡Ã•ES":""]}/></thead>
            <tbody>
              {filtered.map(s=>{const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;return <TRow key={s.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
                <span style={{fontWeight:500,color:C.txt}}>{s.name}</span>,
                <span style={{fontSize:12,color:C.muted}}>{s.cat}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.unit}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:low?C.ylw:C.txt,fontSize:14}}>{fmt(s.qty)}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{fmt(s.min)}</span>,
                crit?<Bdg color="red">â–² CrÃ­tico</Bdg>:low?<Bdg color="ylw">â— Baixo</Bdg>:<Bdg color="grn">âœ“ OK</Bdg>,
                isAdmin?<div style={{display:"flex",gap:6}}>
                  <Btn size="xs" color="gold" outline onClick={()=>{setForm({code:s.code,name:s.name,cat:s.cat,unit:s.unit,qty:String(s.qty),min:String(s.min)});setModal(s.id);}}>Editar</Btn>
                  <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${s.name}"?`)){setStock(p=>p.filter(x=>x.id!==s.id));addLog(currentUser.name,"RemoÃ§Ã£o",s.name);}}}>âœ•</Btn>
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
          <Inp label="CÃ³digo" value={form.code} onChange={v=>setForm(f=>({...f,code:v}))} placeholder="ONU-001"/>
          <Sel label="Categoria" value={form.cat} onChange={v=>setForm(f=>({...f,cat:v}))} options={cats.map(c=>({value:c,label:c}))}/>
        </div>
        <Inp label="Nome do Material *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Inp label="Unidade" value={form.unit} onChange={v=>setForm(f=>({...f,unit:v}))}/>
          <Inp label="Quantidade *" value={form.qty} onChange={v=>setForm(f=>({...f,qty:v}))} type="number"/>
          <Inp label="Qtd MÃ­nima" value={form.min} onChange={v=>setForm(f=>({...f,min:v}))} type="number"/>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <Btn color="ghost" outline onClick={()=>setModal(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}


/* â”€â”€ COMPONENTE REUTILIZÃVEL: Lista de itens estilo botÃ£o + lista â”€â”€ */
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
            <option value="">â€” Selecionar material â€”</option>
            {stockOptions.map(s=><option key={s.id} value={s.id}>[{s.code||"â€”"}] {s.name} ({s.qty} {s.unit})</option>)}
          </select>
          {s&&<div style={{fontSize:10,color:C.grn}}>âœ“ {s.name} Â· DisponÃ­vel: <strong>{s.qty}</strong> {s.unit}</div>}
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
        <button onClick={()=>onRemove(it.id)} style={{background:C.redD,color:C.red,border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>âœ•</button>
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

/* â”€â”€ DIST â”€â”€ */
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
    addLog(currentUser.name,"SaÃ­da","LiberaÃ§Ã£o Â· "+tech?.name+" Â· "+validItems.length+" item(s)");
    setMsg("ok:âœ… Liberado para "+tech?.name+"!");
    setItems([]);
    setTimeout(()=>setMsg(""),4000);
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>SaÃ­da / LiberaÃ§Ã£o de Materiais</h1>
    {msg&&<div style={{background:msg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${msg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{msg.replace(/^(ok|err):/,"")}</div>}
    <Card style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <Sel label="TÃ©cnico DestinatÃ¡rio" value={techId} onChange={setTechId} options={techs.map(t=>({value:t.id,label:t.name}))}/>
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
        <Btn color="gold" onClick={send} disabled={validItems.length===0}>ðŸš€ Liberar {validItems.length>0?validItems.length+" material(is)":""}</Btn>
      </div>
    </Card>
  </div>;
}

/* â”€â”€ KIT â”€â”€ */
function KitPage({tstock,stock,users,currentUser,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const[selTech,setSelTech]=useState(users.filter(u=>u.role==="tecnico")[0]?.id||"");
  const viewId=isTec?currentUser.id:selTech;
  const myItems=tstock.filter(t=>t.uid===viewId);
  const tech=users.find(u=>u.id===viewId);
  const total=myItems.reduce((a,t)=>a+t.qty,0);
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>{isTec?"Meu Estoque":"Estoque TÃ©cnico"}</h1>
      {!isTec&&<Sel value={selTech} onChange={setSelTech} options={users.filter(u=>u.role==="tecnico").map(t=>({value:t.id,label:t.name}))} style={{width:isMobile?"100%":220}}/>}
    </div>
    {tech&&<Card style={{padding:14,display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:40,height:40,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>ðŸ‘·</div>
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
          <div><div style={{fontSize:13,fontWeight:600,color:C.txt}}>{s.name}</div><div style={{fontSize:11,color:C.muted}}>{s.code} Â· {s.unit}</div></div>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:24}}>{fmt(t.qty)}</span>
        </Card>:null;})}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÃ“DIGO","MATERIAL","CATEGORIA","UNIDADE","QTD EM POSSE"]}/></thead>
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

/* â”€â”€ OS â”€â”€ */
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
    if(!osNum.trim()){setErr("Informe o nÃºmero da OS.");return;}
    if(!client.trim()){setErr("Informe o nome do cliente.");return;}
    if(!validItems.length){setErr("Adicione ao menos 1 material.");return;}
    let ok=true;
    validItems.forEach(r=>{const ts=myTstock.find(t=>t.sid===r.sid);if(!ts||ts.qty<parseInt(r.qty)){ok=false;setErr("Qtd insuficiente: "+(stock.find(s=>s.id===r.sid)?.name));}});
    if(!ok)return;
    setOs(p=>[{id:uid(),uid:currentUser.id,os:osNum.trim(),client:client.trim(),date:now(),items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),notes},...p]);
    setTstock(p=>p.map(t=>{const it=validItems.find(r=>r.sid===t.sid&&t.uid===currentUser.id);return it?{...t,qty:t.qty-parseInt(it.qty)}:t;}));
    addLog(currentUser.name,"SaÃ­da","OS: "+osNum.trim()+" Â· "+client.trim());
    setModal(false);setErr("");setOsNum("");setClient("");setNotes("");setItems([]);
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Ordens de ServiÃ§o</h1>
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
                {!isTec&&<span style={{fontSize:12,color:C.muted}}>Â· {tech?.name||"?"}</span>}
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,marginTop:4}}>{o.date}</div>
              {o.notes&&<div style={{fontSize:12,color:C.muted,marginTop:4,fontStyle:"italic"}}>ðŸ“ {o.notes}</div>}
            </div>
            <Bdg color="grn">âœ“ ConcluÃ­da</Bdg>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Materiais Utilizados</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
            {o.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
              <div key={i} style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"â€”"}</div>
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
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>ðŸ”§ Nova OS</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} material(is) adicionado(s)</div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Inp label="NÂº da OS *" value={osNum} onChange={setOsNum} placeholder="OS-20250523001"/>
            <Inp label="Cliente *" value={client} onChange={setClient} placeholder="Nome do cliente"/>
          </div>
          <Inp label="ObservaÃ§Ã£o / Tipo de ServiÃ§o" value={notes} onChange={setNotes} placeholder="Ex: InstalaÃ§Ã£o FTTH, ManutenÃ§Ã£o..."/>
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
          {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>âš ï¸ {err}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={save} disabled={validItems.length===0}>âœ… Confirmar Baixa</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

/* â”€â”€ DEVOLUÃ‡Ã•ES â”€â”€ */
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
    addLog(currentUser.name,"DevoluÃ§Ã£o Solicitada",currentUser.name+" Â· "+validItems.length+" item(s)");
    setModal(false);setItems([]);setNotes("");
  };

  const approve=(r)=>{
    setTstock(p=>p.map(t=>{const it=r.items.find(i=>i.sid===t.sid&&t.uid===r.uid);return it?{...t,qty:Math.max(0,t.qty-it.qty)}:t;}));
    setReturns(p=>p.map(x=>x.id===r.id?{...x,status:"approved",rDate:now(),rBy:currentUser.name}:x));
    addLog(currentUser.name,"DevoluÃ§Ã£o Aprovada","TÃ©cnico: "+(users.find(u=>u.id===r.uid)?.name));
  };

  const sc={pending:"ylw",approved:"grn",rejected:"red"};
  const sl={pending:"â³ Pendente",approved:"âœ… Aprovada",rejected:"âŒ Rejeitada"};

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>DevoluÃ§Ãµes</h1>
      {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setItems([]);setNotes("");setModal(true);}}>â†© Solicitar DevoluÃ§Ã£o</Btn>}
    </div>

    {viewRet.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted,fontSize:13}}>Nenhuma devoluÃ§Ã£o registrada.</span></Card>}
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
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"â€”"}</div>
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
            <Btn size="sm" color="grn" onClick={()=>approve(r)}>âœ“ Aprovar</Btn>
            <Btn size="sm" color="red" outline onClick={()=>setReturns(p=>p.map(x=>x.id===r.id?{...x,status:"rejected",rDate:now(),rBy:currentUser.name}:x))}>âœ• Rejeitar</Btn>
          </div>}
        </div>
      </Card>;
    })}

    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:560,maxHeight:isMobile?"92vh":"85vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>â†© Solicitar DevoluÃ§Ã£o</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} material(is) selecionado(s)</div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Inp label="ObservaÃ§Ã£o" value={notes} onChange={setNotes} placeholder="Ex: Sobrou do serviÃ§o, OS-001..."/>
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
          <Btn color="gold" onClick={submit} disabled={validItems.length===0}>ðŸ“¤ Enviar {validItems.length>0?validItems.length+" item(is)":""}</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

/* â”€â”€ NF â”€â”€ */
function NFPage({nf,setNf,stock,setStock,addLog,currentUser,isMobile}){
  const CATS=["Equipamentos","Cabos e Fios","Conectores","Caixas e AcessÃ³rios","AcessÃ³rios","Ferramentas"];
  const blank=()=>({id:uid(),sid:"",qty:"",val:""});
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({num:"",supplier:"",date:"",obs:"",pdfName:"",pdfData:""});
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

  const abrirModal=()=>{setForm({num:"",supplier:"",date:"",obs:"",pdfName:"",pdfData:""});setItems([]);setErr("");setNovoMat(null);setModal(true);};

  const handlePdfUpload=(file)=>{
    if(!file)return;
    if(file.type!=="application/pdf"){
      setErr("O arquivo precisa ser PDF.");
      return;
    }
    const reader=new FileReader();
    reader.onload=()=>{
      setForm(f=>({...f,pdfName:file.name,pdfData:reader.result}));
    };
    reader.readAsDataURL(file);
  };

  const save=()=>{
    if(!form.num.trim()){setErr("Informe o nÃºmero da NF.");return;}
    if(!form.supplier.trim()){setErr("Informe o fornecedor.");return;}
    if(!validItems.length){setErr("Adicione ao menos 1 item com material e quantidade.");return;}
    const total=validItems.reduce((a,r)=>a+(parseFloat(r.val)||0),0);
    setNf(p=>[{id:uid(),num:form.num.trim(),supplier:form.supplier.trim(),date:form.date,obs:form.obs,pdfName:form.pdfName,pdfData:form.pdfData,
      items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty),val:parseFloat(r.val)||0})),
      total,registeredBy:currentUser.name,registeredAt:now()},...p]);
    setStock(p=>p.map(s=>{const it=validItems.find(r=>r.sid===s.id);return it?{...s,qty:s.qty+parseInt(it.qty)}:s;}));
    addLog(currentUser.name,"Entrada","NF: "+form.num.trim()+" Â· "+form.supplier.trim()+" Â· "+validItems.length+" item(s)");
    setModal(false);
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Entrada de Materiais</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Registro de notas fiscais com entrada automÃ¡tica no estoque</p>
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
                {n.registeredBy&&<span style={{fontSize:11,color:C.muted}}>Â· {n.registeredBy}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6,marginBottom:6}}>
                {n.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
                  <div key={i} style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"â€”"}</div>
                    <div style={{fontSize:12,fontWeight:600,color:C.txt,lineHeight:1.3,marginTop:2}}>{s?.name||"?"}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.grn,fontSize:13}}>+{fmt(it.qty)} {s?.unit||""}</span>
                      {it.val>0&&<span style={{fontSize:10,color:C.muted}}>R${fmt(it.val)}</span>}
                    </div>
                  </div>
                );})}
              </div>
              {n.obs&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>ðŸ“ {n.obs}</div>}
              {n.pdfData&&<button onClick={()=>window.open(n.pdfData,"_blank")} style={{marginTop:6,background:`${C.gold}22`,border:`1px solid ${C.gold}55`,borderRadius:6,padding:"6px 10px",color:C.gold,fontSize:11,fontWeight:700,cursor:"pointer"}}>ðŸ“Ž Visualizar PDF da NF {n.pdfName?`Â· ${n.pdfName}`:""}</button>}
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
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>ðŸ“¥ Nova Nota Fiscal</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} item(s) Â· Total: <span style={{color:C.grn,fontWeight:700}}>R$ {fmt(totalPreview)}</span></div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>âœ•</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".08em",marginBottom:10}}>ðŸ“„ DADOS DA NOTA FISCAL</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
              <Inp label="NÃºmero da NF *" value={form.num} onChange={v=>setForm(f=>({...f,num:v}))} placeholder="Ex: NF-1259"/>
              <Inp label="Fornecedor / Empresa *" value={form.supplier} onChange={v=>setForm(f=>({...f,supplier:v}))} placeholder="Nome do fornecedor"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginTop:10}}>
              <Inp label="Data da Compra" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date"/>
              <Inp label="ObservaÃ§Ã£o" value={form.obs} onChange={v=>setForm(f=>({...f,obs:v}))} placeholder="Opcional"/>
            </div>
            <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase"}}>Anexar PDF da Nota Fiscal</label>
              <label style={{background:C.card,border:`1.5px dashed ${C.gold}`,borderRadius:8,padding:"12px 14px",color:C.txt2,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.pdfName?`ðŸ“Ž ${form.pdfName}`:"ðŸ“„ Clique para anexar a NF em PDF"}</span>
                <span style={{color:C.gold,fontWeight:800,flexShrink:0}}>Upload</span>
                <input type="file" accept="application/pdf" onChange={e=>handlePdfUpload(e.target.files?.[0])} style={{display:"none"}}/>
              </label>
              {form.pdfData&&<button type="button" onClick={()=>window.open(form.pdfData,"_blank")} style={{background:"transparent",color:C.gold,fontSize:12,textAlign:"left",cursor:"pointer",fontWeight:700}}>ðŸ‘ï¸ Visualizar PDF anexado</button>}
            </div>
          </div>

          {/* Itens usando ItemList + botÃ£o novo material inline */}
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
                      <option value="">â€” Selecionar material â€”</option>
                      {stock.map(s=><option key={s.id} value={s.id}>[{s.code||"â€”"}] {s.name} ({s.qty} {s.unit})</option>)}
                    </select>
                    <button onClick={()=>{setNovoMat(it.id);setFormNM({code:"",name:"",cat:"Equipamentos",unit:"un",min:"0"});}}
                      title="Novo material" style={{background:`${C.gold}22`,color:C.gold,border:`1px solid ${C.gold}55`,borderRadius:7,width:32,height:36,cursor:"pointer",fontWeight:800,fontSize:16,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                  </div>
                  {s&&<div style={{fontSize:10,color:C.grn}}>âœ“ {s.name} Â· Estoque: {s.qty} {s.unit}</div>}
                  {novoMat===it.id&&<div style={{background:`${C.gold}11`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:10}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:8}}>âœ¨ Cadastrar Novo Material</div>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginBottom:8}}>
                      <Inp label="CÃ³digo" value={formNM.code} onChange={v=>setFormNM(f=>({...f,code:v}))} placeholder="ONU-010"/>
                      <Inp label="Nome *" value={formNM.name} onChange={v=>setFormNM(f=>({...f,name:v}))} placeholder="Nome completo"/>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                      <Sel label="Categoria" value={formNM.cat} onChange={v=>setFormNM(f=>({...f,cat:v}))} options={CATS.map(c=>({value:c,label:c}))}/>
                      <Inp label="Unidade" value={formNM.unit} onChange={v=>setFormNM(f=>({...f,unit:v}))} placeholder="un, m..."/>
                      <Inp label="Qtd MÃ­n." value={formNM.min} onChange={v=>setFormNM(f=>({...f,min:v}))} type="number"/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <Btn size="sm" color="ghost" outline onClick={()=>setNovoMat(null)}>Cancelar</Btn>
                      <Btn size="sm" color="gold" onClick={salvarNM}>âœ“ Cadastrar e Selecionar</Btn>
                    </div>
                  </div>}
                  <div style={{display:"flex",gap:6}}>
                    <input type="number" value={it.qty} onChange={e=>updItem(it.id,"qty",e.target.value)} placeholder="Quantidade" min="0"
                      style={{flex:1,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:14,fontWeight:700,textAlign:"center"}}/>
                    <input type="number" value={it.val||""} onChange={e=>updItem(it.id,"val",e.target.value)} placeholder="Valor R$" min="0"
                      style={{flex:1,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:13}}/>
                  </div>
                </div>
                <button onClick={()=>remItem(it.id)} style={{background:C.redD,color:C.red,border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>âœ•</button>
              </div>;
            })}
            <button onClick={()=>setItems(p=>[...p,blank()])} style={{width:"100%",padding:"13px",background:items.length===0?`${C.gold}18`:"transparent",border:`2px dashed ${C.gold}`,borderRadius:10,color:C.gold,cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <span style={{fontSize:20,lineHeight:1}}>+</span>
              {items.length===0?"Clique para adicionar o primeiro item da nota":"Adicionar mais um item"}
            </button>
            {items.length===0&&<div style={{textAlign:"center",fontSize:11,color:C.muted2,marginTop:-4}}>Adicione todos os itens da nota e registre no final</div>}
          </div>

          {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>âš ï¸ {err}</div>}
        </div>

        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:18}}>R$ {fmt(totalPreview)}</span>
            <span style={{fontSize:12,color:C.muted,marginLeft:8}}>{validItems.length} item(s)</span>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn color="gold" onClick={save} disabled={validItems.length===0}>âœ… Registrar Nota Fiscal</Btn>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}

/* â”€â”€ RELATÃ“RIOS â”€â”€ */
function RelPage({stock,os,returns,users,nf,isMobile,currentUser,abastecimentos=[],manutOS=[],veiculos=[]}){
  const isTec=currentUser?.role==="tecnico";
  const[tab,setTab]=useState("estoque");

  // â”€â”€ Filtro de perÃ­odo â”€â”€
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

  // â”€â”€ Filtragem por data â”€â”€
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

  // â”€â”€ VariÃ¡veis de frota (adicionadas para o resumo) â”€â”€
  const fmtMoeda=(n)=>"R$ "+new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2}).format(n??0);
  const viewAbastAdmin=abastecimentos.filter(a=>inRange(a.dtAbast));
  const viewManutAdmin=manutOS.filter(o=>inRange(o.dtEntrada||o.date||""));
  const totalCombFrota=viewAbastAdmin.reduce((s,a)=>s+(parseFloat(a.valor)||0),0);
  const totalManutFrota=viewManutAdmin.reduce((s,o)=>s+(o.pecas?.reduce((ps,p)=>ps+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0),0);
  const totalGeralFrota=totalCombFrota+totalManutFrota;
  const fotosFrota=viewAbastAdmin.filter(a=>a.foto);
  const LOGO_URL=window.location.origin+"/logo-stocktel.png";
  const periodoLabel=dtInicio===dtFim?`${dtInicio.split("-").reverse().join("/")}`:
    `${dtInicio.split("-").reverse().join("/")} a ${dtFim.split("-").reverse().join("/")}`;

  // â”€â”€ Gera PDF Profissional â”€â”€
  const gerarPDF=()=>{
    const w=window.open("","_blank","width=1100,height=800");
    const fmt2=(n)=>new Intl.NumberFormat("pt-BR").format(n??0);
    const fmtR=(n)=>"R$ "+new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2}).format(n??0);
    const statusStyle=(s)=>{
      if(s.qty<=s.min*0.6)return"background:#ffebee;color:#c62828;border:1px solid #ef9a9a;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;";
      if(s.qty<=s.min)return"background:#fff3e0;color:#e65100;border:1px solid #ffcc80;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;";
      return"background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;";
    };
    const statusTxt=(s)=>s.qty<=s.min*0.6?"â–² CRÃTICO":s.qty<=s.min?"â— BAIXO":"âœ“ OK";

    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>StockTel â€” RelatÃ³rio ${periodoLabel}</title>
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
      @media print{...no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{padding:16px;}}
    </style></head><body>
    <div class="page">
      <div class="no-print" style="padding:12px;background:#f5f5f5;border-radius:8px;margin-bottom:20px;display:flex;gap:10px;align-items:center;">
        <button onclick="window.print()" style="background:#cc0000;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">ðŸ–¨ï¸ Imprimir / Salvar PDF</button>
        <button onclick="window.close()" style="background:#333;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:13px;">âœ• Fechar</button>
        <span style="font-size:11px;color:#666;">Selecione "Salvar como PDF" no diÃ¡logo de impressÃ£o</span>
      </div>
      <div class="header">
        <img src="${LOGO_URL}" alt="StockTel" onerror="this.style.display='none'"/>
        <div class="header-info">
          <div class="header-title">RELATÃ“RIO ${isTec?"DO TÃ‰CNICO":"OPERACIONAL"}</div>
          <div class="header-sub">SoluÃ§Ãµes em TelecomunicaÃ§Ãµes</div>
          <div class="header-period">ðŸ“… PerÃ­odo: ${periodoLabel}</div>
        </div>
      </div>
      <div class="cards">
        <div class="card card-blue"><div class="card-title">Itens em Estoque</div><div class="card-value">${fmt2(stock.length)}</div><div class="card-sub">Total cadastrado</div></div>
        <div class="card card-red"><div class="card-title">OS no PerÃ­odo</div><div class="card-value">${fmt2(viewOs.length)}</div><div class="card-sub">${periodoLabel}</div></div>
        <div class="card card-orange"><div class="card-title">DevoluÃ§Ãµes</div><div class="card-value">${fmt2(viewRet.length)}</div><div class="card-sub">No perÃ­odo</div></div>
        <div class="card card-green"><div class="card-title">NFs / Gasto</div><div class="card-value" style="font-size:16px;">${fmtR(totalNFGasto)}</div><div class="card-sub">${viewNF.length} notas no perÃ­odo</div></div>
      </div>
      <div class="section">
        <div class="section-title">ðŸ“¦ Estoque de Materiais</div>
        <table><thead><tr><th>CÃ³digo</th><th>Material</th><th>Categoria</th><th>Qtd Atual</th><th>Qtd MÃ­nima</th><th>SituaÃ§Ã£o</th></tr></thead>
        <tbody>${stock.map(s=>`<tr><td><code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:11px;">${s.code||"â€”"}</code></td><td style="font-weight:600;">${s.name}</td><td style="color:#666;">${s.cat}</td><td style="font-weight:700;font-size:15px;color:${s.qty<=s.min*0.6?"#c62828":s.qty<=s.min?"#e65100":"#2e7d32"};">${fmt2(s.qty)}</td><td style="color:#888;">${fmt2(s.min)}</td><td><span style="${statusStyle(s)}">${statusTxt(s)}</span></td></tr>`).join("")}</tbody></table>
      </div>
      <div class="section">
        <div class="section-title">ðŸ”§ Ordens de ServiÃ§o â€” ${periodoLabel} (${viewOs.length})</div>
        ${viewOs.length===0?'<p style="color:#888;padding:12px;">Nenhuma OS no perÃ­odo selecionado.</p>':`<table><thead><tr><th>NÂº OS</th><th>TÃ©cnico</th><th>Cliente</th><th>Data</th><th>Total Itens</th></tr></thead>
        <tbody>${viewOs.map(o=>{const t=users.find(u=>u.id===o.uid);const tot=o.items.reduce((a,i)=>a+i.qty,0);return`<tr><td style="font-weight:700;color:#cc0000;">${o.os}</td><td style="font-weight:600;">${t?.name||"?"}</td><td>${o.client}</td><td style="color:#888;font-size:11px;">${o.date}</td><td style="text-align:center;font-weight:700;">${fmt2(tot)}</td></tr>`;}).join("")}</tbody></table>`}
      </div>
      <div class="section">
        <div class="section-title">â†©ï¸ DevoluÃ§Ãµes â€” ${periodoLabel} (${viewRet.length})</div>
        ${viewRet.length===0?'<p style="color:#888;padding:12px;">Nenhuma devoluÃ§Ã£o no perÃ­odo.</p>':`<table><thead><tr><th>TÃ©cnico</th><th>Data</th><th>Status</th><th>Aprovado por</th></tr></thead>
        <tbody>${viewRet.map(r=>{const t=users.find(u=>u.id===r.uid);const stc={pending:"background:#fff3e0;color:#e65100",approved:"background:#e8f5e9;color:#2e7d32",rejected:"background:#ffebee;color:#c62828"};const stl={pending:"â³ Pendente",approved:"âœ… Aprovada",rejected:"âŒ Rejeitada"};return`<tr><td style="font-weight:600;">${t?.name||"?"}</td><td style="color:#888;font-size:11px;">${r.date}</td><td><span style="${stc[r.status]||""};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${stl[r.status]||r.status}</span></td><td style="color:#888;">${r.rBy||"â€”"}</td></tr>`;}).join("")}</tbody></table>`}
      </div>
      ${viewNF.length>0?`<div class="section"><div class="section-title">ðŸ’° Notas Fiscais â€” ${periodoLabel} (${viewNF.length})</div>
        <table><thead><tr><th>NÂº NF</th><th>Fornecedor</th><th>Data</th><th>Itens</th><th>Valor</th></tr></thead>
        <tbody>${viewNF.map(n=>`<tr><td style="font-weight:700;color:#cc0000;">${n.num}</td><td style="font-weight:600;">${n.supplier}</td><td style="color:#888;font-size:11px;">${n.date}</td><td style="text-align:center;">${n.items?.length||0}</td><td style="font-weight:800;color:#2e7d32;">${fmtR(n.total)}</td></tr>`).join("")}
        <tr style="background:#fff0f0;"><td colspan="4" style="font-weight:800;text-align:right;padding-right:20px;">TOTAL DO PERÃODO:</td><td style="font-weight:800;font-size:16px;color:#cc0000;">${fmtR(totalNFGasto)}</td></tr></tbody></table></div>`:""}
      <div class="footer">
        <div class="footer-logo">StockTel â€” SoluÃ§Ãµes em TelecomunicaÃ§Ãµes</div>
        <div>Gerado em ${new Date().toLocaleString("pt-BR")} Â· v1.0.0</div>
        <div>Â© ${new Date().getFullYear()} StockTel</div>
      </div>
    </div></body></html>`);
    w.document.close();
  };

  // â”€â”€ Gera Excel por PerÃ­odo â”€â”€
  const gerarExcel=()=>{
    const wb=XLSX.utils.book_new();
    const statusTxt=(s)=>s.qty<=s.min*0.6?"CRÃTICO":s.qty<=s.min?"BAIXO":"OK";

    const estoqueData=[
      [`STOCKTEL â€” RELATÃ“RIO DE ESTOQUE â€” ${periodoLabel}`,"","","","",""],[""],
      ["CÃ“DIGO","MATERIAL","CATEGORIA","UNIDADE","QTD ATUAL","QTD MÃNIMA","SITUAÃ‡ÃƒO"],
      ...stock.map(s=>[s.code||"â€”",s.name,s.cat,s.unit,s.qty,s.min,statusTxt(s)])
    ];
    const ws1=XLSX.utils.aoa_to_sheet(estoqueData);
    ws1["!cols"]=[{wch:12},{wch:35},{wch:20},{wch:8},{wch:12},{wch:12},{wch:10}];
    XLSX.utils.book_append_sheet(wb,ws1,"ðŸ“¦ Estoque");

    const osData=[
      [`STOCKTEL â€” ORDENS DE SERVIÃ‡O â€” ${periodoLabel}`,"","","",""],[""],
      ["NÂº OS","TÃ‰CNICO","CLIENTE","DATA","TOTAL ITENS"],
      ...viewOs.map(o=>{const t=users.find(u=>u.id===o.uid);return[o.os,t?.name||"?",o.client,o.date,o.items.reduce((a,i)=>a+i.qty,0)];})
    ];
    const ws2=XLSX.utils.aoa_to_sheet(osData);
    ws2["!cols"]=[{wch:18},{wch:22},{wch:25},{wch:20},{wch:14}];
    XLSX.utils.book_append_sheet(wb,ws2,"ðŸ”§ Ordens de ServiÃ§o");

    const retData=[
      [`STOCKTEL â€” DEVOLUÃ‡Ã•ES â€” ${periodoLabel}`,"","",""],[""],
      ["TÃ‰CNICO","DATA","STATUS","APROVADO POR"],
      ...viewRet.map(r=>{const t=users.find(u=>u.id===r.uid);const sl={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};return[t?.name||"?",r.date,sl[r.status]||r.status,r.rBy||"â€”"];})
    ];
    const ws3=XLSX.utils.aoa_to_sheet(retData);
    ws3["!cols"]=[{wch:22},{wch:20},{wch:14},{wch:22}];
    XLSX.utils.book_append_sheet(wb,ws3,"â†©ï¸ DevoluÃ§Ãµes");

    if(!isTec){
      const nfData=[
        [`STOCKTEL â€” NOTAS FISCAIS â€” ${periodoLabel}`,"","",""],[""],
        ["NÂº NF","FORNECEDOR","DATA","ITENS","VALOR TOTAL"],
        ...viewNF.map(n=>[n.num,n.supplier,n.date,n.items?.length||0,Number(n.total||0)]),
        [""],["TOTAL DO PERÃODO","","",viewNF.length,Number(totalNFGasto)]
      ];
      const ws4=XLSX.utils.aoa_to_sheet(nfData);
      ws4["!cols"]=[{wch:16},{wch:25},{wch:14},{wch:10},{wch:16}];
      XLSX.utils.book_append_sheet(wb,ws4,"ðŸ’° Notas Fiscais");

      const tecData=[
        [`STOCKTEL â€” TÃ‰CNICOS â€” ${periodoLabel}`,"","","",""],[""],
        ["TÃ‰CNICO","OS NO PERÃODO","MAT. CONSUMIDO"],
        ...techData.map((t,i)=>[t.name,viewOs.filter(o=>users.find(u=>u.id===o.uid)?.name.split(" ")[0]===t.name).length,t.value])
      ];
      const ws5=XLSX.utils.aoa_to_sheet(tecData);
      ws5["!cols"]=[{wch:22},{wch:16},{wch:16}];
      XLSX.utils.book_append_sheet(wb,ws5,"ðŸ‘· TÃ©cnicos");
    }

    XLSX.writeFile(wb,`StockTel_${periodoLabel.replace(/\//g,"-")}.xlsx`);
  };

  const tabs=[{k:"estoque",l:"ðŸ“¦ Estoque"},{k:"os",l:"ðŸ”§ OS"},{k:"tecnicos",l:"ðŸ‘· TÃ©cnicos"},{k:"dev",l:"â†©ï¸ DevoluÃ§Ãµes"}];
  const sc2={pending:"ylw",approved:"grn",rejected:"red"};
  const sl2={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>

    {/* Header com tÃ­tulo e botÃµes */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>{isTec?"Meus RelatÃ³rios":"RelatÃ³rios"}</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Filtre por perÃ­odo e exporte em PDF ou Excel</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn color="red" size="sm" onClick={gerarPDF}>ðŸ–¨ï¸ PDF</Btn>
        <Btn color="grn" size="sm" onClick={gerarExcel}>ðŸ“Š Excel</Btn>
      </div>
    </div>




    {/* RESUMO DE GASTOS DA FROTA */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
      {[
        {l:"COMBUSTÃVEL",v:fmtMoeda(totalCombFrota),s:`${viewAbastAdmin.length} abastecimento(s)`,i:"â›½",c:C.grn},
        {l:"MANUTENÃ‡ÃƒO",v:fmtMoeda(totalManutFrota),s:`${viewManutAdmin.length} OS mecÃ¢nica(s)`,i:"ðŸ”§",c:C.ylw},
        {l:"TOTAL FROTA",v:fmtMoeda(totalGeralFrota),s:"combustÃ­vel + manutenÃ§Ã£o",i:"ðŸš—",c:C.red},
        {l:"COMPROVANTES",v:fmt(fotosFrota.length),s:"fotos/anexos no perÃ­odo",i:"ðŸ“¸",c:C.blue},
      ].map((x,i)=>(
        <Card key={i} style={{padding:14,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:40,height:40,borderRadius:10,background:`${x.c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{x.i}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:9,fontWeight:800,color:C.muted,letterSpacing:".06em",textTransform:"uppercase"}}>{x.l}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:x.c,fontSize:isMobile?15:18,whiteSpace:"nowrap"}}>{x.v}</div>
            <div style={{fontSize:10,color:C.muted}}>{x.s}</div>
          </div>
        </Card>
      ))}
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
              {catData.map((d,i)=><Cell key={i} fill={catColor(d.name,i)}/>)}
            </Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Mais Consumidos no PerÃ­odo</div>
          {matData.length===0?<div style={{color:C.muted,fontSize:12}}>Nenhuma OS no perÃ­odo.</div>
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
            <thead><THead cols={["CÃ“DIGO","MATERIAL","CATEGORIA","QTD ATUAL","QTD MÃN.","SITUAÃ‡ÃƒO"]}/></thead>
            <tbody>{stock.map(s=>{const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;return<TRow key={s.id} cells={[
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
              s.name,s.cat,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:low?C.ylw:C.txt}}>{fmt(s.qty)}</span>,
              fmt(s.min),
              crit?<Bdg color="red">â–² CrÃ­tico</Bdg>:low?<Bdg color="ylw">â— Baixo</Bdg>:<Bdg color="grn">âœ“ OK</Bdg>
            ]}/>;})}</tbody>
          </table>
        </div>
      </Card>
    </div>}

    {/* OS */}
    {tab==="os"&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}`,fontSize:12,color:C.muted}}>{viewOs.length} OS no perÃ­odo: {periodoLabel}</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><THead cols={["OS","TÃ‰CNICO","CLIENTE","DATA","ITENS"]}/></thead>
        <tbody>
          {viewOs.length===0?<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhuma OS no perÃ­odo selecionado.</td></tr>
          :viewOs.map(o=>{const t=users.find(u=>u.id===o.uid);return<TRow key={o.id} cells={[
            <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.gold,fontSize:12,fontWeight:700}}>{o.os}</span>,
            t?.name||"?",o.client,
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{o.date}</span>,
            <span style={{color:C.gold,fontWeight:700}}>{o.items.reduce((a,i)=>a+i.qty,0)}</span>
          ]}/>;})}</tbody>
      </table></div>
    </Card>}


    {/* FROTA / GASTOS */}
    {tab==="frota"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card style={{padding:18}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:12}}>ðŸš— Gastos com VeÃ­culos â€” {periodoLabel}</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
          {[
            {l:"CombustÃ­vel",v:fmtMoeda(totalCombFrota),c:C.grn},
            {l:"ManutenÃ§Ã£o",v:fmtMoeda(totalManutFrota),c:C.ylw},
            {l:"Total",v:fmtMoeda(totalGeralFrota),c:C.red},
            {l:"Comprovantes",v:fmt(fotosFrota.length),c:C.blue},
          ].map((x,i)=><div key={i} style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:10,padding:12}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{x.l}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:800,color:x.c,marginTop:4}}>{x.v}</div>
          </div>)}
        </div>
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,fontSize:14,fontWeight:700,color:C.txt}}>ðŸ“‹ Gasto por veÃ­culo</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["PLACA","MODELO","COMBUSTÃVEL","MANUTENÃ‡ÃƒO","TOTAL","REGISTROS","FOTOS"]}/></thead>
            <tbody>
              {gastosFrotaPorVeiculo.length===0?<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhum gasto de frota no perÃ­odo selecionado.</td></tr>
              :gastosFrotaPorVeiculo.map(v=><TRow key={v.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold}}>{v.placa||"â€”"}</span>,
                <span style={{fontWeight:600,color:C.txt}}>{v.modelo||"â€”"}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.grn}}>{fmtMoeda(v.combustivel)}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.ylw}}>{fmtMoeda(v.manutencao)}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.red}}>{fmtMoeda(v.total)}</span>,
                <span style={{fontSize:12,color:C.muted}}>{v.qtdAbast} abast. Â· {v.qtdManut} manut.</span>,
                <Bdg color={v.fotos>0?"grn":"muted"}>ðŸ“¸ {v.fotos}</Bdg>
              ]}/>) }
            </tbody>
          </table>
        </div>
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,fontSize:14,fontWeight:700,color:C.txt}}>ðŸ“¸ Comprovantes/Fotos vinculados aos gastos</div>
        {fotosFrota.length===0?<div style={{padding:22,textAlign:"center",color:C.muted,fontSize:13}}>Nenhuma foto de comprovante no perÃ­odo.</div>
        :<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(220px,1fr))",gap:10,padding:14}}>
          {fotosFrota.map((f,i)=><div key={i} style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:10,padding:10}}>
            <img src={f.foto} alt="comprovante" style={{width:"100%",height:120,objectFit:"cover",borderRadius:8,border:`1px solid ${C.bdr2}`,cursor:"pointer"}} onClick={()=>window.open(f.foto,"_blank")}/>
            <div style={{marginTop:8,display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.tipo} Â· {f.veiculo?.placa||"â€”"}</div>
                <div style={{fontSize:10,color:C.muted}}>{f.data||"Sem data"} Â· {f.desc}</div>
              </div>
              <span style={{fontSize:12,fontWeight:800,color:C.grn,whiteSpace:"nowrap"}}>{fmtMoeda(f.valor)}</span>
            </div>
          </div>)}
        </div>}
      </Card>
    </div>}

    {/* TÃ‰CNICOS */}
    {tab==="tecnicos"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!isMobile&&techData.length>0&&<Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:14}}>Consumo no PerÃ­odo</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart><Pie data={techData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
            {techData.map((_,i)=><Cell key={i} fill={i===0?C.gold:PIE[i%PIE.length]}/>)}
          </Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart>
        </ResponsiveContainer>
      </Card>}
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:14}}>Ranking â€” {periodoLabel}</div>
        {techData.length===0?<div style={{color:C.muted,fontSize:12}}>Nenhuma OS no perÃ­odo.</div>
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

    {/* DEVOLUÃ‡Ã•ES */}
    {tab==="dev"&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}`,fontSize:12,color:C.muted}}>{viewRet.length} devoluÃ§Ãµes no perÃ­odo: {periodoLabel}</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><THead cols={["TÃ‰CNICO","DATA SOLICITAÃ‡ÃƒO","STATUS","APROVADO POR"]}/></thead>
        <tbody>
          {viewRet.length===0?<tr><td colSpan={4} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhuma devoluÃ§Ã£o no perÃ­odo.</td></tr>
          :viewRet.map(r=>{const t=users.find(u=>u.id===r.uid);return<TRow key={r.id} cells={[
            t?.name||"?",
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{r.date}</span>,
            <Bdg color={sc2[r.status]}>{sl2[r.status]}</Bdg>,
            r.rBy||"â€”"
          ]}/>;})}</tbody>
      </table></div>
    </Card>}
  </div>;
}

/* â”€â”€ USUÃRIOS â”€â”€ */
function UsrPage({users,setUsers,addLog,currentUser,isMobile}){
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico",photo:"",perms:DEFAULT_PERMS["tecnico"],mustChangePassword:true});
  const roles=[{value:"admin",label:"Administrador"},{value:"estoque",label:"Estoque"},{value:"tecnico",label:"TÃ©cnico"},{value:"financeiro",label:"Financeiro"},{value:"mecanico",label:"MecÃ¢nico"}];
  const isRoot=currentUser?.role==="superadmin";
  const rl={superadmin:"MASTER",admin:"ADM",estoque:"EST",tecnico:"TEC",financeiro:"FIN",mecanico:"MEC"};
  const rc={superadmin:"#ff00ff",admin:C.gold,estoque:C.blue,tecnico:C.grn,financeiro:C.ylw,mecanico:"#888888"};

  const handlePhoto=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>2*1024*1024){alert("Foto muito grande! MÃ¡ximo 2MB.");return;}
    const reader=new FileReader();
    reader.onload=(ev)=>setForm(f=>({...f,photo:ev.target.result}));
    reader.readAsDataURL(file);
  };

  const save=()=>{
    if(!form.name.trim()||!form.login.trim()||!form.pass.trim())return;
    const permsToSave=form.perms.length>0?form.perms:DEFAULT_PERMS[form.role]||["dash"];
    if(modal==="new"){
      setUsers(p=>[...p,{id:uid(),...form,perms:permsToSave}]);
      addLog(currentUser.name,"UsuÃ¡rio Criado",form.name+" ("+form.role+")");
    } else {
      // Admin nÃ£o pode alterar login/senha de outros usuÃ¡rios â€” sÃ³ o prÃ³prio ou superadmin
      setUsers(p=>p.map(u=>{
        if(u.id!==modal)return u;
        if(isRoot){
          return{...u,...form,perms:permsToSave};
        }
        // Admin pode editar nome, email, telefone, foto, perfil e permissÃµes
        // mas NÃƒO pode alterar login ou senha de outros
        return{...u,name:form.name,email:form.email,phone:form.phone,cpf:form.cpf,role:form.role,photo:form.photo,perms:permsToSave,mustChangePassword:form.mustChangePassword};
      }));
      addLog(currentUser.name,"UsuÃ¡rio Editado",form.name);
    }
    setModal(null);
  };

  const togglePerm=(k)=>{
    setForm(f=>({...f,perms:f.perms.includes(k)?f.perms.filter(p=>p!==k):[...f.perms,k]}));
  };
  const setRoleAndPerms=(role)=>{
    setForm(f=>({...f,role,perms:DEFAULT_PERMS[role]||["dash"]}));
  };
  const MODULE_GROUPS={geral:"Geral",estoque:"Estoque",operacional:"Operacional",relatorios:"RelatÃ³rios",admin:"AdministraÃ§Ã£o"};

  const Avatar=({user,size=36})=>(
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,overflow:"hidden",
      background:rc[user.role]+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.4}}>
      {user.photo
        ?<img src={user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        :<span>ðŸ‘¤</span>}
    </div>
  );

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>UsuÃ¡rios</h1></div>
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setForm({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico",photo:"",perms:DEFAULT_PERMS["tecnico"],mustChangePassword:true});setModal("new");}}>+ Novo</Btn>
    </div>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {users.filter(u=>isRoot||u.role!=="superadmin").map(u=>(
          <Card key={u.id} style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
            <Avatar user={u} size={44}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:C.txt}}>{u.name}</div>
              <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.login} Â· {u.email}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
              <span style={{background:rc[u.role],color:"#000",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:3}}>{rl[u.role]}</span>
              <div style={{display:"flex",gap:6}}>
                <Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf||"",login:u.login,pass:u.pass,role:u.role,photo:u.photo||"",perms:u.perms||DEFAULT_PERMS[u.role]||["dash"],mustChangePassword:u.mustChangePassword||false});setModal(u.id);}}>Editar</Btn>
                {u.id!==currentUser.id&&isRoot&&<Btn size="xs" color="red" outline onClick={()=>{if(window.confirm("Remover "+u.name+"?")){setUsers(p=>p.filter(x=>x.id!==u.id));addLog(currentUser.name,"UsuÃ¡rio Removido",u.name);}}}>âœ•</Btn>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["FOTO","USUÃRIO","LOGIN","E-MAIL","TELEFONE","MATRÃCULA","PERFIL","AÃ‡Ã•ES"]}/></thead>
            <tbody>{users.filter(u=>isRoot||u.role!=="superadmin").map(u=>{
              if(u.role==="superadmin"&&!isRoot)return null;
              return <TRow key={u.id} cells={[
                <Avatar user={u} size={36}/>,
                <span style={{fontWeight:600,color:C.txt}}>{u.name}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold}}>{u.login}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.email}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.phone}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{u.cpf||"â€”"}</span>,
                <span style={{background:rc[u.role]||C.gold,color:u.role==="superadmin"?"#fff":"#000",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:4}}>{rl[u.role]||u.role}</span>,
                <div style={{display:"flex",gap:6}}>
                  {isRoot&&<Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf||"",login:u.login,pass:u.pass,role:u.role,photo:u.photo||"",perms:u.perms||DEFAULT_PERMS[u.role]||["dash"],mustChangePassword:u.mustChangePassword||false});setModal(u.id);}}>Editar</Btn>}
                  {isRoot&&u.role!=="superadmin"&&<Btn size="xs" color="red" outline onClick={()=>{if(window.confirm("Remover "+u.name+"?")){setUsers(p=>p.filter(x=>x.id!==u.id));addLog(currentUser.name,"UsuÃ¡rio Removido",u.name);}}}>âœ•</Btn>}
                  {!isRoot&&<span style={{fontSize:11,color:C.muted}}>â€”</span>}
                </div>
              ]}/>;
            })}</tbody>
          </table>
        </div>
      </Card>
    )}
    {modal&&<Modal title={modal==="new"?"Novo UsuÃ¡rio":"Editar UsuÃ¡rio"} onClose={()=>setModal(null)} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Foto de perfil */}
        <div style={{display:"flex",alignItems:"center",gap:16,padding:14,background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`}}>
          <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,border:`2px solid ${C.bdr2}`}}>
            {form.photo?<img src={form.photo} alt="foto" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>ðŸ‘¤</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:C.txt,marginBottom:6}}>Foto de Perfil</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:10}}>JPG, PNG ou GIF Â· MÃ¡ximo 2MB</div>
            <label style={{background:C.gold,color:"#000",padding:"7px 14px",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,display:"inline-block"}}>
              ðŸ“· Escolher Foto
              <input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
            </label>
            {form.photo&&<button onClick={()=>setForm(f=>({...f,photo:""}))} style={{background:"transparent",color:C.red,border:"none",cursor:"pointer",fontSize:12,marginLeft:10,fontWeight:600}}>âœ• Remover</button>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Inp label="Nome Completo *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
          <Inp label="E-mail" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} type="email"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Inp label="Telefone" value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="(00) 00000-0000"/>
          <Inp label="MatrÃ­cula" value={form.cpf||""} onChange={v=>setForm(f=>({...f,cpf:v}))} placeholder="Ex: MAT-001"/>
        </div>
        {/* Perfil e permissÃµes */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:12}}>
          {(isRoot||modal==="new")&&<Inp label="Login *" value={form.login} onChange={v=>setForm(f=>({...f,login:v}))}/>}
          {(isRoot||modal==="new")&&<Inp label="Senha *" value={form.pass} onChange={v=>setForm(f=>({...f,pass:v}))} type="password"/>}
          {!isRoot&&modal!=="new"&&<div style={{gridColumn:"1 / -1",background:C.surf,borderRadius:8,padding:"10px 14px",border:`1px solid ${C.bdr}`,fontSize:12,color:C.muted}}>
            ðŸ”’ Login e senha sÃ³ podem ser alterados pelo prÃ³prio usuÃ¡rio em <strong style={{color:C.txt}}>Meu Perfil</strong>
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
            ðŸ” Exigir troca de senha no primeiro acesso
          </label>
        </div>

        {/* PermissÃµes por mÃ³dulo */}
        <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase"}}>ðŸ”‘ Acesso aos MÃ³dulos</div>
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
                      {form.perms.includes(m.k)&&<span style={{fontSize:10,color:"#000",fontWeight:800}}>âœ“</span>}
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
          <Btn color="gold" onClick={save}>Salvar UsuÃ¡rio</Btn>
        </div>
      </div>
    </Modal>}
    <div style={{marginTop:8,padding:"12px 16px",background:C.redD,border:`1px solid ${C.red}33`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:C.red}}>âš ï¸ Zona de Perigo</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Apaga todos os dados e volta ao estado inicial.</div>
      </div>
      isRoot
          ?<Btn size="sm" color="red" outline onClick={()=>{if(window.confirm("ATENÃ‡ÃƒO: Apaga TODOS os dados. Confirmar?")){Object.keys(localStorage).filter(k=>k.startsWith("re_")).forEach(k=>localStorage.removeItem(k));window.location.reload();}}}>ðŸ—‘ï¸ Resetar Todos os Dados</Btn>
          :<span style={{fontSize:12,color:C.muted}}>ðŸ”’ Apenas o usuÃ¡rio Root pode resetar o sistema.</span>
    </div>
  </div>;
}
/* â”€â”€ LOGS â”€â”€ */
function LogPage({logs,isMobile}){
  const tc={saida:C.gold,entrada:C.grn,dev:C.ylw,aprovada:C.grn};
  const ic={saida:"â†’",entrada:"â†“",dev:"â†º",aprovada:"âœ“"};
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
            <thead><THead cols={["DATA/HORA","USUÃRIO","AÃ‡ÃƒO","DETALHE"]}/></thead>
            <tbody>{logs.map(l=>(
              <TRow key={l.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{l.date}</span>,
                <span style={{fontSize:12,fontWeight:600,color:C.txt}}>{l.user}</span>,
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:`${tc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:tc[l.tipo]||C.gold,fontWeight:700}}>{ic[l.tipo]||"Â·"}</div>
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

/* â”€â”€ CATEGORIAS â”€â”€ */
function CatPage({cats,setCats,isMobile}){
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({name:"",icon:"ðŸ“¦"});
  const[editId,setEditId]=useState(null);
  const icons=["ðŸ“¦","ðŸ”Œ","ðŸ”§","ðŸ“¡","ðŸ› ï¸","ðŸ’¡","ðŸ”©","ðŸ—ƒï¸","ðŸ“‹","âš™ï¸","ðŸ”—","ðŸ·ï¸"];
  const save=()=>{
    if(!form.name.trim())return;
    if(editId){setCats(p=>p.map(c=>c.id===editId?{...c,...form}:c));}
    else{setCats(p=>[...p,{id:uid(),name:form.name.trim(),icon:form.icon}]);}
    setModal(false);setForm({name:"",icon:"ðŸ“¦"});setEditId(null);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Categorias</h1><p style={{fontSize:12,color:C.muted,marginTop:2}}>Gerencie as categorias de materiais</p></div>
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setForm({name:"",icon:"ðŸ“¦"});setEditId(null);setModal(true);}}>+ Nova Categoria</Btn>
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
            <Btn size="xs" color="gold" outline onClick={()=>{setForm({name:c.name,icon:c.icon});setEditId(c.id);setModal(true);}}>âœï¸</Btn>
            <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${c.name}"?`))setCats(p=>p.filter(x=>x.id!==c.id));}}>âœ•</Btn>
          </div>
        </Card>
      ))}
    </div>
    {modal&&<Modal title={editId?"Editar Categoria":"Nova Categoria"} onClose={()=>{setModal(false);setEditId(null);}} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Inp label="Nome da Categoria *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Ex: Equipamentos"/>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:8}}>Ãcone</label>
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

/* â”€â”€ PRODUTOS â”€â”€ */
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
        <Inp value={q} onChange={setQ} placeholder="ðŸ” Buscar produto..." style={{flex:1}}/>
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
                <div style={{fontSize:11,color:C.muted}}>{p.code} Â· {p.cat} Â· {p.unit}</div>
                {p.desc&&<div style={{fontSize:11,color:C.muted2,marginTop:4}}>{p.desc}</div>}
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:10}}>
                <Btn size="xs" color="gold" outline onClick={()=>{setForm({code:p.code,name:p.name,cat:p.cat,unit:p.unit,desc:p.desc||""});setModal(p.id);}}>âœï¸</Btn>
                <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${p.name}"?`))setProdutos(x=>x.filter(i=>i.id!==p.id));}}>âœ•</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÃ“DIGO","NOME DO PRODUTO","CATEGORIA","UNIDADE","DESCRIÃ‡ÃƒO","AÃ‡Ã•ES"]}/></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={6} style={{padding:30,textAlign:"center",color:C.muted}}>Nenhum produto cadastrado.</td></tr>
              :filtered.map(p=>(
                <TRow key={p.id} cells={[
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{p.code}</span>,
                  <span style={{fontWeight:600,color:C.txt}}>{p.name}</span>,
                  <Bdg color="muted">{p.cat}</Bdg>,
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{p.unit}</span>,
                  <span style={{fontSize:11,color:C.muted}}>{p.desc||"â€”"}</span>,
                  <div style={{display:"flex",gap:6}}>
                    <Btn size="xs" color="gold" outline onClick={()=>{setForm({code:p.code,name:p.name,cat:p.cat,unit:p.unit,desc:p.desc||""});setModal(p.id);}}>Editar</Btn>
                    <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${p.name}"?`))setProdutos(x=>x.filter(i=>i.id!==p.id));}}>âœ•</Btn>
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
          <Inp label="CÃ³digo" value={form.code} onChange={v=>setForm(f=>({...f,code:v}))} placeholder="ONU-001"/>
          <Inp label="Nome do Produto *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Ex: ONU Huawei HG8145V5"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Sel label="Categoria" value={form.cat} onChange={v=>setForm(f=>({...f,cat:v}))} options={cats.map(c=>({value:c.name,label:`${c.icon} ${c.name}`}))}/>
          <Inp label="Unidade" value={form.unit} onChange={v=>setForm(f=>({...f,unit:v}))} placeholder="un, m, rolo, pÃ§..."/>
        </div>
        <Inp label="DescriÃ§Ã£o" value={form.desc} onChange={v=>setForm(f=>({...f,desc:v}))} placeholder="DescriÃ§Ã£o opcional do produto"/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModal(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar Produto</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

/* â”€â”€ EMAIL / RELATÃ“RIO ADMIN â”€â”€ */
function AdminRelPage({nf,stock,os,returns,tstock,users,solicitacoes,isMobile,addLog,veiculos=[],abastecimentos=[],manutOS=[]}){
  const[tab,setTab]=useState("financeiro");
  const[emails,setEmails]=useState("");
  const[msg,setMsg]=useState("");

  const LOGO_URL=window.location.origin+"/logo-stocktel.png";

  // â”€â”€ Filtro de perÃ­odo â”€â”€
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

  // â”€â”€ CÃ¡lculos financeiros â”€â”€
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


  // â”€â”€ Gastos da frota no RelatÃ³rio Administrativo â”€â”€
  const fmtMoeda=(n)=>"R$ "+new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0));
  const veicById=(id)=>veiculos.find(v=>v.id===id)||{};
  const custoManut=(o)=>{
    const pecas=o.pecas?.reduce((s,p)=>s+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0;
    return pecas+(parseFloat(o.valorMaoObra)||0)+(parseFloat(o.valorTotal)||0)+(parseFloat(o.custo)||0);
  };
  const viewAbastAdmin=useMemo(()=>abastecimentos.filter(a=>inRange(a.dtAbast||a.date||a.data)),[abastecimentos,dtInicio,dtFim]);
  const viewManutAdmin=useMemo(()=>manutOS.filter(o=>inRange(o.dtEntrada||o.dtSaida||o.date||o.data)),[manutOS,dtInicio,dtFim]);
  const totalCombFrota=viewAbastAdmin.reduce((s,a)=>s+(parseFloat(a.valor)||0),0);
  const totalManutFrota=viewManutAdmin.reduce((s,o)=>s+custoManut(o),0);
  const totalGeralFrota=totalCombFrota+totalManutFrota;
  const fotosFrota=useMemo(()=>[
    ...viewAbastAdmin.filter(a=>a.foto).map(a=>({tipo:"Abastecimento",data:a.dtAbast||a.date||a.data,veiculo:veicById(a.veiculoId),valor:parseFloat(a.valor)||0,foto:a.foto,desc:a.posto||a.combustivel||"Comprovante"})),
    ...viewManutAdmin.flatMap(o=>(o.fotos||o.fotosComprovante||o.fotosServico||[]).filter(Boolean).map(f=>({tipo:"ManutenÃ§Ã£o",data:o.dtEntrada||o.dtSaida||o.date||o.data,veiculo:veicById(o.veiculoId),valor:custoManut(o),foto:f,desc:o.descricao||o.tipo||"Comprovante"})))
  ],[viewAbastAdmin,viewManutAdmin,veiculos]);
  const gastosFrotaPorVeiculo=useMemo(()=>{
    const map={};
    veiculos.forEach(v=>{map[v.id]={id:v.id,placa:v.placa,modelo:v.modelo,combustivel:0,manutencao:0,total:0,qtdAbast:0,qtdManut:0,fotos:0};});
    viewAbastAdmin.forEach(a=>{
      const v=veicById(a.veiculoId); const id=a.veiculoId||"sem";
      if(!map[id])map[id]={id,placa:v.placa||"â€”",modelo:v.modelo||"Sem veÃ­culo",combustivel:0,manutencao:0,total:0,qtdAbast:0,qtdManut:0,fotos:0};
      map[id].combustivel+=parseFloat(a.valor)||0; map[id].qtdAbast+=1; if(a.foto)map[id].fotos+=1;
    });
    viewManutAdmin.forEach(o=>{
      const v=veicById(o.veiculoId); const id=o.veiculoId||"sem";
      if(!map[id])map[id]={id,placa:v.placa||"â€”",modelo:v.modelo||"Sem veÃ­culo",combustivel:0,manutencao:0,total:0,qtdAbast:0,qtdManut:0,fotos:0};
      map[id].manutencao+=custoManut(o); map[id].qtdManut+=1; map[id].fotos+=(o.fotos||o.fotosComprovante||o.fotosServico||[]).filter(Boolean).length;
    });
    return Object.values(map).map(v=>({...v,total:v.combustivel+v.manutencao})).sort((a,b)=>b.total-a.total);
  },[veiculos,viewAbastAdmin,viewManutAdmin]);

  // â”€â”€ Gera PDF Profissional â”€â”€
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
    const statusTxt=(s)=>s.qty<=s.min*0.6?"â–² CRÃTICO":s.qty<=s.min?"â— BAIXO":"âœ“ OK";
    const fmt2=(n)=>new Intl.NumberFormat("pt-BR").format(n??0);
    const fmtR=(n)=>"R$ "+new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2}).format(n??0);

    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>StockTel â€” RelatÃ³rio Completo</title>
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
        <button onclick="window.print()" style="background:#cc0000;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">ðŸ–¨ï¸ Imprimir / Salvar PDF</button>
        <button onclick="window.close()" style="background:#333;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:13px;">âœ• Fechar</button>
        <span style="font-size:11px;color:#666;">Dica: No diÃ¡logo de impressÃ£o, selecione "Salvar como PDF"</span>
      </div>

      <!-- HEADER -->
      <div class="header">
        <img src="${LOGO_URL}" alt="StockTel" onerror="this.style.display='none'"/>
        <div class="header-info">
          <div class="header-title">RELATÃ“RIO COMPLETO</div>
          <div class="header-sub">SoluÃ§Ãµes em TelecomunicaÃ§Ãµes</div>
          <div class="header-date">ðŸ“… Gerado em: ${new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</div>
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
          <div class="card-title">Itens CrÃ­ticos</div>
          <div class="card-value">${fmt2(crit.length)}</div>
          <div class="card-sub">Abaixo do mÃ­nimo</div>
        </div>
        <div class="card card-orange">
          <div class="card-title">Estoque Baixo</div>
          <div class="card-value">${fmt2(low.length-crit.length)}</div>
          <div class="card-sub">AtenÃ§Ã£o necessÃ¡ria</div>
        </div>
        <div class="card card-green">
          <div class="card-title">Total Investido</div>
          <div class="card-value" style="font-size:18px;">${fmtR(totalGasto)}</div>
          <div class="card-sub">${fmt2(totalNFs)} notas fiscais</div>
        </div>
      </div>

      <!-- ESTOQUE -->
      <div class="section">
        <div class="section-title">ðŸ“¦ Estoque de Materiais</div>
        <table>
          <thead><tr><th>CÃ³digo</th><th>Material</th><th>Categoria</th><th>Qtd Atual</th><th>Qtd MÃ­nima</th><th>Unidade</th><th>SituaÃ§Ã£o</th></tr></thead>
          <tbody>
            ${stock.map(s=>`<tr>
              <td><code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:11px;">${s.code||"â€”"}</code></td>
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

      <!-- ORDENS DE SERVIÃ‡O -->
      <div class="section">
        <div class="section-title">ðŸ”§ Ordens de ServiÃ§o (${fmt2(os.length)})</div>
        <table>
          <thead><tr><th>NÂº OS</th><th>TÃ©cnico</th><th>Cliente</th><th>Data</th><th>Materiais</th><th>Total Itens</th></tr></thead>
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

      <!-- TÃ‰CNICOS RANKING -->
      <div class="section">
        <div class="section-title">ðŸ‘· Desempenho dos TÃ©cnicos</div>
        <table>
          <thead><tr><th>#</th><th>TÃ©cnico</th><th>OS Realizadas</th><th>Material em Posse</th><th>Mat. Consumido</th><th>DevoluÃ§Ãµes</th><th>SolicitaÃ§Ãµes</th></tr></thead>
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
        <div class="section-title">ðŸ’° Notas Fiscais â€” HistÃ³rico de Compras</div>
        <table>
          <thead><tr><th>NÂº NF</th><th>Fornecedor</th><th>Data</th><th>Itens</th><th>Valor Total</th></tr></thead>
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

      <!-- GASTOS POR MÃŠS -->
      ${gastoPorMes.length>0?`
      <div class="section">
        <div class="section-title">ðŸ“Š Gastos por MÃªs</div>
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

      <!-- ALERTAS DE PREÃ‡O -->
      ${alertasPreco.length>0?`
      <div class="section">
        <div class="section-title">ðŸ”” Alertas de VariaÃ§Ã£o de PreÃ§o</div>
        ${alertasAlta.length>0?`<div style="font-weight:700;color:#c62828;margin-bottom:8px;font-size:12px;">ðŸ“ˆ AUMENTO DE PREÃ‡O (${alertasAlta.length})</div>`:""}
        ${alertasAlta.map(a=>`
        <div class="alert-up">
          <div>
            <div class="alert-name">ðŸ“¦ ${a.name} <span style="font-size:10px;color:#888;">(${a.code})</span></div>
            <div class="alert-detail">${a.prevNF}: ${fmtR(a.prevPrice)}/${a.unit} â†’ ${a.currNF}: ${fmtR(a.currPrice)}/${a.unit}</div>
          </div>
          <div class="alert-pct-up">â–² +${a.pct.toFixed(1)}%</div>
        </div>`).join("")}
        ${alertasBaixa.length>0?`<div style="font-weight:700;color:#2e7d32;margin-bottom:8px;margin-top:12px;font-size:12px;">ðŸ“‰ REDUÃ‡ÃƒO DE PREÃ‡O (${alertasBaixa.length})</div>`:""}
        ${alertasBaixa.map(a=>`
        <div class="alert-down">
          <div>
            <div class="alert-name">ðŸ“¦ ${a.name} <span style="font-size:10px;color:#888;">(${a.code})</span></div>
            <div class="alert-detail">${a.prevNF}: ${fmtR(a.prevPrice)}/${a.unit} â†’ ${a.currNF}: ${fmtR(a.currPrice)}/${a.unit}</div>
          </div>
          <div class="alert-pct-down">â–¼ ${a.pct.toFixed(1)}%</div>
        </div>`).join("")}
      </div>`:""}


      <!-- GASTOS DA FROTA -->
      <div class="section">
        <div class="section-title">ðŸš— Gastos com VeÃ­culos/Frota â€” ${periodoLabel}</div>
        <div class="cards" style="grid-template-columns:repeat(4,1fr);">
          <div class="card card-green"><div class="card-title">CombustÃ­vel</div><div class="card-value" style="font-size:18px;">${fmtR(totalCombFrota)}</div><div class="card-sub">${fmt2(viewAbastAdmin.length)} abastecimento(s)</div></div>
          <div class="card card-orange"><div class="card-title">ManutenÃ§Ã£o</div><div class="card-value" style="font-size:18px;">${fmtR(totalManutFrota)}</div><div class="card-sub">${fmt2(viewManutAdmin.length)} OS mecÃ¢nica(s)</div></div>
          <div class="card card-red"><div class="card-title">Total Frota</div><div class="card-value" style="font-size:18px;">${fmtR(totalGeralFrota)}</div><div class="card-sub">combustÃ­vel + manutenÃ§Ã£o</div></div>
          <div class="card card-blue"><div class="card-title">Comprovantes</div><div class="card-value">${fmt2(fotosFrota.length)}</div><div class="card-sub">fotos/anexos</div></div>
        </div>
        <table>
          <thead><tr><th>Placa</th><th>Modelo</th><th>CombustÃ­vel</th><th>ManutenÃ§Ã£o</th><th>Total</th><th>Registros</th><th>Fotos</th></tr></thead>
          <tbody>
            ${gastosFrotaPorVeiculo.length?gastosFrotaPorVeiculo.map(v=>`<tr>
              <td style="font-weight:800;color:#cc0000;">${v.placa||"â€”"}</td>
              <td>${v.modelo||"â€”"}</td>
              <td style="font-weight:700;color:#2e7d32;">${fmtR(v.combustivel)}</td>
              <td style="font-weight:700;color:#e65100;">${fmtR(v.manutencao)}</td>
              <td style="font-weight:800;color:#cc0000;">${fmtR(v.total)}</td>
              <td>${v.qtdAbast} abast. Â· ${v.qtdManut} manut.</td>
              <td>${v.fotos}</td>
            </tr>`).join(""):`<tr><td colspan="7" style="text-align:center;color:#888;">Nenhum gasto de frota no perÃ­odo.</td></tr>`}
          </tbody>
        </table>
        ${fotosFrota.length?`<div style="margin-top:14px;font-size:11px;color:#666;">ðŸ“¸ Comprovantes/fotos existem no sistema e podem ser visualizados na tela do RelatÃ³rio Administrativo.</div>`:""}
      </div>

      <!-- DEVOLUÃ‡Ã•ES -->
      <div class="section">
        <div class="section-title">â†©ï¸ DevoluÃ§Ãµes (${fmt2(returns.length)})</div>
        <table>
          <thead><tr><th>TÃ©cnico</th><th>Data</th><th>Materiais</th><th>Status</th><th>Aprovado por</th></tr></thead>
          <tbody>
            ${returns.map(r=>{const t=users.find(u=>u.id===r.uid);const mats=r.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name.split(" ")[0]}(${it.qty})`:"?";}).join(", ");const stc={pending:"background:#fff3e0;color:#e65100",approved:"background:#e8f5e9;color:#2e7d32",rejected:"background:#ffebee;color:#c62828"};const stl={pending:"â³ Pendente",approved:"âœ… Aprovada",rejected:"âŒ Rejeitada"};return`<tr>
              <td style="font-weight:600;">${t?.name||"?"}</td>
              <td style="color:#888;font-size:11px;">${r.date}</td>
              <td style="font-size:11px;">${mats}</td>
              <td><span style="${stc[r.status]||""};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${stl[r.status]||r.status}</span></td>
              <td style="color:#888;">${r.rBy||"â€”"}</td>
            </tr>`;}).join("")}
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-logo">StockTel â€” SoluÃ§Ãµes em TelecomunicaÃ§Ãµes Â· v1.1</div>
        <div>RelatÃ³rio gerado em ${new Date().toLocaleString("pt-BR")} Â· v1.0.0</div>
        <div>Â© ${new Date().getFullYear()} StockTel â€” Todos os direitos reservados</div>
      </div>

    </div>
    </body></html>`);
    w.document.close();
  };

  // â”€â”€ Gera Excel Profissional â”€â”€
  const gerarExcel=()=>{
    const wb=XLSX.utils.book_new();
    const fmtR2=(n)=>"R$ "+Number(n||0).toFixed(2).replace(".",",");
    const statusTxt=(s)=>s.qty<=s.min*0.6?"CRÃTICO":s.qty<=s.min?"BAIXO":"OK";

    // Aba 1: Estoque
    const estoqueData=[
      ["STOCKTEL â€” RELATÃ“RIO DE ESTOQUE","","","","","",""],
      [`Gerado em: ${new Date().toLocaleString("pt-BR")}`,"","","","","",""],
      [""],
      ["CÃ“DIGO","MATERIAL","CATEGORIA","UNIDADE","QTD ATUAL","QTD MÃNIMA","SITUAÃ‡ÃƒO"],
      ...stock.map(s=>[s.code||"â€”",s.name,s.cat,s.unit,s.qty,s.min,statusTxt(s)])
    ];
    const wsEst=XLSX.utils.aoa_to_sheet(estoqueData);
    wsEst["!cols"]=[{wch:12},{wch:35},{wch:20},{wch:8},{wch:12},{wch:12},{wch:10}];
    XLSX.utils.book_append_sheet(wb,wsEst,"ðŸ“¦ Estoque");

    // Aba 2: OS
    const osData=[
      ["STOCKTEL â€” ORDENS DE SERVIÃ‡O","","","","",""],
      [`Total: ${os.length} OS`,"","","","",""],
      [""],
      ["NÂº OS","TÃ‰CNICO","CLIENTE","DATA","MATERIAIS","TOTAL ITENS"],
      ...os.map(o=>{const t=users.find(u=>u.id===o.uid);const mats=o.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name}(${it.qty})`:it.sid;}).join("; ");const tot=o.items.reduce((a,i)=>a+i.qty,0);return[o.os,t?.name||"?",o.client,o.date,mats,tot];})
    ];
    const wsOS=XLSX.utils.aoa_to_sheet(osData);
    wsOS["!cols"]=[{wch:18},{wch:20},{wch:25},{wch:18},{wch:50},{wch:12}];
    XLSX.utils.book_append_sheet(wb,wsOS,"ðŸ”§ Ordens de ServiÃ§o");

    // Aba 3: TÃ©cnicos
    const tecData=[
      ["STOCKTEL â€” DESEMPENHO DOS TÃ‰CNICOS","","","","","",""],
      [""],
      ["#","TÃ‰CNICO","OS REALIZADAS","MAT. EM POSSE","MAT. CONSUMIDO","DEVOLUÃ‡Ã•ES","SOLICITAÃ‡Ã•ES"],
      ...rankingTec.map((t,i)=>[i+1,t.name,t.qtdOS,t.matEmPosse,t.matUsado,t.devs,t.sols])
    ];
    const wsTec=XLSX.utils.aoa_to_sheet(tecData);
    wsTec["!cols"]=[{wch:4},{wch:22},{wch:15},{wch:16},{wch:16},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb,wsTec,"ðŸ‘· TÃ©cnicos");

    // Aba 4: Financeiro
    const finData=[
      ["STOCKTEL â€” RELATÃ“RIO FINANCEIRO","","","",""],
      [`Total Investido: ${fmtR2(totalGasto)}  |  ${totalNFs} Notas Fiscais  |  MÃ©dia: ${fmtR2(mediaGastoPorNF)}/NF`,"","","",""],
      [""],
      ["NÂº NF","FORNECEDOR","DATA","QTD ITENS","VALOR TOTAL"],
      ...nf.map(n=>[n.num,n.supplier,n.date,n.items?.length||0,Number(n.total||0)]),
      [""],
      ["TOTAL","","","",Number(totalGasto)],
      [""],
      ["GASTOS POR MÃŠS","","","",""],
      ["MÃŠS","QTD NFs","TOTAL MÃŠS","",""],
      ...gastoPorMes.map(m=>[m.mes,m.qtdNF,Number(m.total),"",""])
    ];
    const wsFin=XLSX.utils.aoa_to_sheet(finData);
    wsFin["!cols"]=[{wch:16},{wch:25},{wch:14},{wch:12},{wch:16}];
    XLSX.utils.book_append_sheet(wb,wsFin,"ðŸ’° Financeiro");

    // Aba 5: Alertas de PreÃ§o
    if(alertasPreco.length>0){
      const altData=[
        ["STOCKTEL â€” ALERTAS DE VARIAÃ‡ÃƒO DE PREÃ‡O","","","","","",""],
        [""],
        ["CÃ“DIGO","MATERIAL","NF ANTERIOR","PREÃ‡O ANT.","NF ATUAL","PREÃ‡O ATUAL","VARIAÃ‡ÃƒO %"],
        ...alertasPreco.map(a=>[a.code,a.name,a.prevNF,Number(a.prevPrice.toFixed(2)),a.currNF,Number(a.currPrice.toFixed(2)),`${a.up?"+":""}${a.pct.toFixed(1)}%`])
      ];
      const wsAlt=XLSX.utils.aoa_to_sheet(altData);
      wsAlt["!cols"]=[{wch:12},{wch:30},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12}];
      XLSX.utils.book_append_sheet(wb,wsAlt,"ðŸ”” Alertas de PreÃ§o");
    }


    // Aba 6: Frota / Gastos
    const frotaData=[
      ["STOCKTEL â€” GASTOS COM VEÃCULOS/FROTA","","","","","",""],
      [`PerÃ­odo: ${periodoLabel} | CombustÃ­vel: ${fmtR2(totalCombFrota)} | ManutenÃ§Ã£o: ${fmtR2(totalManutFrota)} | Total: ${fmtR2(totalGeralFrota)}` ,"","","","","",""],
      [""],
      ["PLACA","MODELO","COMBUSTÃVEL","MANUTENÃ‡ÃƒO","TOTAL","QTD ABAST.","QTD MANUT.","FOTOS"],
      ...gastosFrotaPorVeiculo.map(v=>[v.placa||"â€”",v.modelo||"â€”",Number(v.combustivel||0),Number(v.manutencao||0),Number(v.total||0),v.qtdAbast,v.qtdManut,v.fotos]),
      [""],
      ["COMPROVANTES/FOTOS","","","","","","",""],
      ["TIPO","DATA","PLACA","MODELO","DESCRIÃ‡ÃƒO","VALOR","POSSUI FOTO",""],
      ...fotosFrota.map(f=>[f.tipo,f.data||"",f.veiculo?.placa||"â€”",f.veiculo?.modelo||"â€”",f.desc||"",Number(f.valor||0),"SIM",""])
    ];
    const wsFrota=XLSX.utils.aoa_to_sheet(frotaData);
    wsFrota["!cols"]=[{wch:12},{wch:24},{wch:16},{wch:16},{wch:16},{wch:12},{wch:12},{wch:8}];
    XLSX.utils.book_append_sheet(wb,wsFrota,"ðŸš— Frota Gastos");

    // Aba 6: DevoluÃ§Ãµes
    const devData=[
      ["STOCKTEL â€” DEVOLUÃ‡Ã•ES","","","",""],
      [""],
      ["TÃ‰CNICO","DATA","MATERIAIS","STATUS","APROVADO POR"],
      ...returns.map(r=>{const t=users.find(u=>u.id===r.uid);const mats=r.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name}(${it.qty})`:it.sid;}).join("; ");const sl={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};return[t?.name||"?",r.date,mats,sl[r.status]||r.status,r.rBy||"â€”"];})
    ];
    const wsDev=XLSX.utils.aoa_to_sheet(devData);
    wsDev["!cols"]=[{wch:22},{wch:20},{wch:50},{wch:14},{wch:22}];
    XLSX.utils.book_append_sheet(wb,wsDev,"â†©ï¸ DevoluÃ§Ãµes");

    XLSX.writeFile(wb,`StockTel_Relatorio_${new Date().toISOString().slice(0,10)}.xlsx`);
    setMsg("ok:âœ… Excel gerado com 7 abas!");
    setTimeout(()=>setMsg(""),4000);
  };

  // â”€â”€ Enviar por email â”€â”€
  const enviarEmail=()=>{
    const lista=emails.split(/[,;\n]/).map(e=>e.trim()).filter(e=>e.includes("@"));
    if(!lista.length){setMsg("err:Informe ao menos um e-mail vÃ¡lido.");return;}
    const corpo=`StockTel â€” RelatÃ³rio Completo\nGerado em: ${new Date().toLocaleString("pt-BR")}\n${"=".repeat(50)}\n\nðŸ“¦ ESTOQUE: ${stock.length} itens | CrÃ­ticos: ${stock.filter(s=>s.qty<=s.min*0.6).length} | Baixo: ${stock.filter(s=>s.qty<=s.min&&s.qty>s.min*0.6).length}\nðŸ’° FINANCEIRO: ${totalNFs} NFs | Total: R$ ${totalGasto.toFixed(2)}\nðŸ”§ OS: ${os.length} ordens de serviÃ§o\nðŸ‘· TÃ‰CNICOS: ${rankingTec.length}\nðŸ”” ALERTAS DE PREÃ‡O: ${alertasAlta.length} aumentos | ${alertasBaixa.length} reduÃ§Ãµes\n\n${"=".repeat(50)}\nStockTel v1.0.0 Â© ${new Date().getFullYear()} StockTel`;
    window.open(`mailto:${lista.join(",")}?subject=${encodeURIComponent("StockTel â€” RelatÃ³rio "+new Date().toLocaleDateString("pt-BR"))}&body=${encodeURIComponent(corpo)}`,"_blank");
    setMsg("ok:âœ… App de e-mail aberto!");
    setTimeout(()=>setMsg(""),5000);
  };

  const tabs2=[{k:"financeiro",l:"ðŸ’° Financeiro"},{k:"frota",l:"ðŸš— Frota/Gastos"},{k:"tecnicos",l:"ðŸ‘· TÃ©cnicos"},{k:"sla",l:"â±ï¸ SLA"},{k:"tendencia",l:"ðŸ“ˆ TendÃªncia"},{k:"alertas",l:"ðŸ”” Alertas de PreÃ§o"},{k:"email",l:"ðŸ“§ Enviar"}];

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>RelatÃ³rio Administrativo</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Financeiro Â· TÃ©cnicos Â· Alertas de PreÃ§o Â· ExportaÃ§Ã£o</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn color="red" size="sm" onClick={gerarPDF}>ðŸ–¨ï¸ Gerar PDF</Btn>
        <Btn color="grn" size="sm" onClick={gerarExcel}>ðŸ“Š Gerar Excel</Btn>
      </div>
    </div>

    {msg&&<div style={{background:msg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${msg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{msg.replace(/^(ok|err):/,"")}</div>}

    {/* FILTRO DE PERÃODO â€” destaque */}
    <Card style={{padding:16,border:`2px solid ${C.gold}55`}}>
      <div style={{fontSize:12,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>ðŸ“… Filtrar PerÃ­odo do RelatÃ³rio</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {[{k:"hoje",l:"Hoje"},{k:"semana",l:"Ãšltima Semana"},{k:"mes",l:"Este MÃªs"},{k:"trimestre",l:"3 Meses"},{k:"tudo",l:"Tudo"}].map(p=>(
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
        <Inp label="Data InÃ­cio" value={dtInicio} onChange={v=>{setDtInicio(v);setPeriodoRapido("custom");}} type="date"/>
        <Inp label="Data Fim" value={dtFim} onChange={v=>{setDtFim(v);setPeriodoRapido("custom");}} type="date"/>
        <div style={{background:`${C.gold}18`,border:`1px solid ${C.gold}55`,borderRadius:8,padding:"10px 14px"}}>
          <div style={{fontSize:10,color:C.muted,marginBottom:3}}>PERÃODO SELECIONADO</div>
          <div style={{fontSize:13,fontWeight:800,color:C.gold}}>ðŸ“… {periodoLabel}</div>
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
        {label:"TOTAL INVESTIDO",value:`R$ ${fmt(Math.round(totalGasto))}`,sub:`${totalNFs} notas fiscais`,icon:"ðŸ’°",color:C.grn},
        {label:"MÃ‰DIA POR NF",value:`R$ ${fmt(Math.round(mediaGastoPorNF))}`,sub:"valor mÃ©dio",icon:"ðŸ“Š",color:C.blue},
        {label:"ALERTAS ALTA",value:fmt(alertasAlta.length),sub:"aumentos de preÃ§o",icon:"ðŸ“ˆ",color:C.red},
        {label:"ALERTAS BAIXA",value:fmt(alertasBaixa.length),sub:"reduÃ§Ãµes de preÃ§o",icon:"ðŸ“‰",color:C.grn},
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

    {/* Filtro de PerÃ­odo */}
    <Card style={{padding:16}}>
      <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>ðŸ“… Filtrar por PerÃ­odo</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {[{k:"hoje",l:"Hoje"},{k:"semana",l:"Ãšltima Semana"},{k:"mes",l:"Este MÃªs"},{k:"trimestre",l:"3 Meses"},{k:"tudo",l:"Tudo"}].map(p=>(
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
        <Inp label="Data InÃ­cio" value={dtInicio} onChange={v=>{setDtInicio(v);setPeriodoRapido("custom");}} type="date"/>
        <Inp label="Data Fim" value={dtFim} onChange={v=>{setDtFim(v);setPeriodoRapido("custom");}} type="date"/>
        <div style={{paddingBottom:2}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>PERÃODO</div>
          <div style={{background:`${C.gold}22`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:700,color:C.gold,whiteSpace:"nowrap"}}>
            ðŸ“… {periodoLabel}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:12,marginTop:12,flexWrap:"wrap"}}>
        {[
          {label:"NFs",value:viewNFAdmin.length,color:C.grn},
          {label:"OS",value:viewOsAdmin.length,color:C.red},
          {label:"DevoluÃ§Ãµes",value:viewRetAdmin.length,color:C.ylw},
        ].map((c,i)=>(
          <div key={i} style={{background:C.surf,borderRadius:8,padding:"7px 12px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:c.color,fontSize:16}}>{c.value}</span>
            <span style={{fontSize:11,color:C.muted}}>{c.label} no perÃ­odo</span>
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
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:16}}>ðŸ“Š Gastos Mensais â€” {periodoLabel}</div>
        {gastoPorMes.length===0?<div style={{color:C.muted,fontSize:13}}>Nenhuma nota fiscal no perÃ­odo selecionado.</div>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {gastoPorMes.map(m=>(
            <div key={m.mes}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:600,color:C.txt}}>{m.mes} <span style={{fontSize:10,color:C.muted}}>Â· {m.qtdNF} NF(s)</span></span>
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
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,fontSize:14,fontWeight:700,color:C.txt}}>ðŸ“‹ Detalhamento por Nota Fiscal</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["NÂº NF","FORNECEDOR","DATA","ITENS","VALOR TOTAL"]}/></thead>
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

    {/* TÃ‰CNICOS */}
    {tab==="tecnicos"&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,fontSize:14,fontWeight:700,color:C.txt}}>ðŸ‘· Ranking dos TÃ©cnicos</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["#","TÃ‰CNICO","OS REALIZADAS","MAT. EM POSSE","MAT. CONSUMIDO","DEVOLUÃ‡Ã•ES","SOLICITAÃ‡Ã•ES"]}/></thead>
          <tbody>
            {rankingTec.length===0?<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhum tÃ©cnico cadastrado.</td></tr>
            :rankingTec.map((t,i)=><TRow key={t.id} cells={[
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:18,color:i===0?C.red:i===1?C.muted:"#555"}}>{i+1}</span>,
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${C.red}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>ðŸ‘·</div>
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

    {/* FROTA */}
    {tab==="frota"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card style={{padding:18}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:4}}>ðŸš— Gastos por VeÃ­culo â€” {periodoLabel}</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:16}}>CombustÃ­vel + ManutenÃ§Ã£o no perÃ­odo selecionado</div>
        {veiculos.length===0?<div style={{color:C.muted}}>Nenhum veÃ­culo cadastrado.</div>:
        veiculos.map(v=>{
          const gastoComb=abastecimentos.filter(a=>a.veiculoId===v.id&&inRange(a.dtAbast)).reduce((s,a)=>s+(parseFloat(a.valor)||0),0);
          const litrosV=abastecimentos.filter(a=>a.veiculoId===v.id&&inRange(a.dtAbast)).reduce((s,a)=>s+(parseFloat(a.litros)||0),0);
          const qtdAbast=abastecimentos.filter(a=>a.veiculoId===v.id&&inRange(a.dtAbast)).length;
          const gastoManut=manutOS.filter(o=>o.veiculoId===v.id&&inRange(o.dtEntrada||"")).reduce((s,o)=>s+(o.pecas?.reduce((ps,p)=>ps+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0),0);
          const total=gastoComb+gastoManut;
          if(total===0&&qtdAbast===0)return null;
          const pctComb=total>0?Math.round((gastoComb/total)*100):0;
          return <div key={v.id} style={{marginBottom:14,padding:14,background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v.placa}</span>
                <span style={{fontSize:12,color:C.txt2}}>{v.modelo} {v.ano}</span>
                <Bdg color={v.status==="ativo"?"grn":v.status==="manutenÃ§Ã£o"?"ylw":"red"}>{v.status}</Bdg>
              </div>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:16,color:C.grn}}>R$ {fmt(Math.round(total))}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:10}}>
              {[
                {l:"COMBUSTÃVEL",v:`R$ ${fmt(Math.round(gastoComb))}`,s:`${qtdAbast} abast Â· ${Math.round(litrosV)}L`,c:C.gold,i:"â›½"},
                {l:"MANUTENÃ‡ÃƒO",v:`R$ ${fmt(Math.round(gastoManut))}`,s:`${manutOS.filter(o=>o.veiculoId===v.id).length} OS`,c:C.red,i:"ðŸ”§"},
                {l:"TOTAL",v:`R$ ${fmt(Math.round(total))}`,s:"no perÃ­odo",c:C.grn,i:"ðŸ’°"},
                {l:"% COMBUSTÃVEL",v:`${pctComb}%`,s:"do total",c:C.blue,i:"ðŸ“Š"},
              ].map((s,i)=>(
                <div key={i} style={{background:C.card,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:16,marginBottom:3}}>{s.i}</div>
                  <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",marginBottom:2,fontWeight:700}}>{s.l}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:13,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.s}</div>
                </div>
              ))}
            </div>
            {/* Barra de composiÃ§Ã£o */}
            <div style={{marginTop:6}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4}}>
                <span>â›½ CombustÃ­vel {pctComb}%</span><span>ðŸ”§ ManutenÃ§Ã£o {100-pctComb}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width:`${pctComb}%`,background:`linear-gradient(90deg,${C.gold},${C.goldL})`}}/>
              </div>
            </div>
          </div>;
        }).filter(Boolean)}
        {/* Total geral */}
        {veiculos.length>0&&<div style={{marginTop:14,padding:14,background:`${C.gold}18`,borderRadius:10,border:`1px solid ${C.gold}44`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.txt}}>ðŸ’° Total Geral da Frota</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{periodoLabel}</div>
          </div>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:20,color:C.gold}}>
            R$ {fmt(Math.round(
              abastecimentos.filter(a=>inRange(a.dtAbast)).reduce((s,a)=>s+(parseFloat(a.valor)||0),0)+
              manutOS.filter(o=>inRange(o.dtEntrada||"")).reduce((s,o)=>s+(o.pecas?.reduce((ps,p)=>ps+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0),0)
            ))}
          </span>
        </div>}
      </Card>
    </div>}

    {/* ALERTAS */}
    
  {/* SLA */}
  {tab==="sla"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <Card style={{padding:18}}>
      <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:16}}>â±ï¸ SLA â€” AnÃ¡lise de Desempenho no PerÃ­odo</div>
      {(()=>{
        const osP=os.filter(o=>inRange(o.date));
        if(osP.length===0) return <div style={{color:C.muted}}>Nenhuma OS no perÃ­odo selecionado.</div>;
        const techSLA=users.filter(u=>u.role==="tecnico").map(t=>{
          const myOs=osP.filter(o=>o.uid===t.id);
          const totalMat=myOs.reduce((s,o)=>s+o.items.reduce((a,i)=>a+i.qty,0),0);
          return{name:t.name.split(" ")[0],photo:t.photo,total:myOs.length,totalMat};
        }).filter(t=>t.total>0).sort((a,b)=>b.total-a.total);
        const maxOS=techSLA[0]?.total||1;
        return <>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:12,marginBottom:20}}>
            {[
              {l:"OS NO PERÃODO",v:osP.length,i:"ðŸ”§",c:C.gold},
              {l:"TÃ‰CNICOS ATIVOS",v:techSLA.length,i:"ðŸ‘·",c:C.grn},
              {l:"MÃ‰DIA OS/TÃ‰CNICO",v:techSLA.length>0?Math.round(osP.length/techSLA.length):0,i:"ðŸ“Š",c:C.blue},
            ].map((s,i)=>(
              <div key={i} style={{background:C.surf,borderRadius:10,padding:14,textAlign:"center",border:`1px solid ${C.bdr}`}}>
                <div style={{fontSize:20,marginBottom:4}}>{s.i}</div>
                <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{s.l}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:22,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["#","TÃ‰CNICO","OS","MATERIAIS","PERFORMANCE"]}/></thead>
            <tbody>{techSLA.map((t,i)=>{
              const pct=Math.round((t.total/maxOS)*100);
              return <TRow key={t.name} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:[C.gold,C.muted,C.ylw][i]||C.muted,fontSize:14}}>{i+1}</span>,
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:"50%",overflow:"hidden",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {t.photo?<img src={t.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:12}}>ðŸ‘¤</span>}
                  </div>
                  <span style={{fontWeight:600}}>{t.name}</span>
                </div>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.txt,fontSize:16}}>{t.total}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.blue}}>{t.totalMat}</span>,
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,background:C.bdr,borderRadius:4,height:8}}>
                    <div style={{background:i===0?C.grn:i===1?C.gold:C.blue,height:8,borderRadius:4,width:`${pct}%`}}/>
                  </div>
                  <span style={{fontSize:11,color:C.muted,minWidth:35}}>{pct}%</span>
                </div>
              ]}/>;
            })}</tbody>
          </table>
        </>;
      })()}
    </Card>
  </div>}

  {/* TENDÃŠNCIA */}
  {tab==="tendencia"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <Card style={{padding:18}}>
      <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:16}}>ðŸ“ˆ TendÃªncia de Consumo e PrevisÃ£o de Ruptura</div>
      {/* Consumo mensal */}
      <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>ðŸ“Š Consumo Mensal de Materiais</div>
      {(()=>{
        const meses={};
        os.forEach(o=>{const mes=(o.date||"").slice(0,7);if(!mes)return;o.items?.forEach(it=>{meses[mes]=(meses[mes]||0)+it.qty;});});
        const dados=Object.entries(meses).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6);
        if(dados.length===0) return <div style={{color:C.muted,fontSize:12}}>Nenhum dado de consumo ainda.</div>;
        const maxV=Math.max(...dados.map(([,v])=>v))||1;
        return <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {dados.map(([mes,qty])=>(
            <div key={mes} style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:11,color:C.muted,minWidth:55,fontFamily:"'JetBrains Mono',monospace"}}>{mes.slice(5)}/{mes.slice(2,4)}</span>
              <div style={{flex:1,background:C.bdr,borderRadius:4,height:10}}>
                <div style={{background:`linear-gradient(90deg,${C.gold},${C.goldL})`,height:10,borderRadius:4,width:`${(qty/maxV)*100}%`}}/>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:C.txt,minWidth:40,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{qty}</span>
            </div>
          ))}
        </div>;
      })()}
      {/* PrevisÃ£o de ruptura */}
      <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>âš ï¸ PrevisÃ£o de Ruptura (prÃ³ximos 90 dias)</div>
      {(()=>{
        const consumo90={};
        const limite=new Date();limite.setDate(limite.getDate()-90);
        os.filter(o=>new Date(o.date)>=limite).forEach(o=>o.items?.forEach(it=>{consumo90[it.sid]=(consumo90[it.sid]||0)+it.qty;}));
        const previsoes=stock.filter(s=>consumo90[s.id]>0).map(s=>{
          const c90=consumo90[s.id]||0;
          const cDia=c90/90;
          const dias=cDia>0?Math.round(s.qty/cDia):999;
          return{...s,dias,cDia:cDia.toFixed(2)};
        }).filter(s=>s.dias<90).sort((a,b)=>a.dias-b.dias).slice(0,10);
        if(previsoes.length===0) return <div style={{background:`${C.grn}18`,border:`1px solid ${C.grn}44`,borderRadius:8,padding:"10px 14px",color:C.grn,fontSize:13}}>âœ… Nenhum item com risco de ruptura nos prÃ³ximos 90 dias.</div>;
        return <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["MATERIAL","ESTOQUE","CONSUMO/DIA","DIAS RESTANTES","AÃ‡ÃƒO"]}/></thead>
          <tbody>{previsoes.map((s,i)=>(
            <TRow key={i} cells={[
              <span style={{fontWeight:600,fontSize:12}}>{s.name}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:s.qty<=s.min?C.red:C.ylw}}>{s.qty} {s.unit}</span>,
              <span style={{fontSize:11,color:C.muted}}>{s.cDia}/dia</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:14,color:s.dias<=15?C.red:s.dias<=30?C.ylw:C.gold}}>{s.dias===999?"âˆž":s.dias+"d"}</span>,
              <Bdg color={s.dias<=15?"red":s.dias<=30?"ylw":"gold"}>{s.dias<=15?"COMPRAR JÃ":s.dias<=30?"ATENÃ‡ÃƒO":"MONITORAR"}</Bdg>
            ]}/>
          ))}</tbody>
        </table>;
      })()}
      {/* VariaÃ§Ã£o de preÃ§os */}
      <div style={{fontSize:13,fontWeight:700,color:C.txt,margin:"20px 0 12px"}}>ðŸ’¹ VariaÃ§Ã£o de PreÃ§os por Material</div>
      {(()=>{
        const pm={};
        [...nf].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).forEach(n=>n.items?.forEach(it=>{if(!pm[it.sid])pm[it.sid]=[];if(it.unitCost)pm[it.sid].push({price:it.unitCost});}));
        const trends=Object.entries(pm).filter(([,v])=>v.length>=2).map(([sid,prices])=>{
          const s=stock.find(x=>x.id===sid);
          const vp=((prices[prices.length-1].price-prices[0].price)/prices[0].price*100).toFixed(1);
          return{name:s?.name||sid,first:prices[0].price,last:prices[prices.length-1].price,vp:parseFloat(vp)};
        }).sort((a,b)=>Math.abs(b.vp)-Math.abs(a.vp)).slice(0,8);
        if(trends.length===0) return <div style={{color:C.muted,fontSize:12}}>MÃ­nimo 2 NFs do mesmo produto para anÃ¡lise.</div>;
        return <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["MATERIAL","PREÃ‡O INICIAL","PREÃ‡O ATUAL","VARIAÃ‡ÃƒO"]}/></thead>
          <tbody>{trends.map((t,i)=>(
            <TRow key={i} cells={[
              <span style={{fontWeight:600,fontSize:12}}>{t.name.slice(0,35)}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>R$ {(t.first||0).toFixed(2)}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>R$ {(t.last||0).toFixed(2)}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:t.vp>5?C.red:t.vp<-5?C.grn:C.muted}}>
                {t.vp>0?"â†‘":"â†“"} {Math.abs(t.vp)}%
              </span>
            ]}/>
          ))}</tbody>
        </table>;
      })()}
    </Card>
  </div>}

  {tab==="alertas"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {alertasPreco.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhuma variaÃ§Ã£o de preÃ§o detectada ainda.<br/>Registre ao menos 2 NFs com o mesmo produto.</span></Card>}
      {alertasAlta.length>0&&<div>
        <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:8,letterSpacing:".06em",textTransform:"uppercase"}}>ðŸ“ˆ Aumento de PreÃ§o ({alertasAlta.length})</div>
        {alertasAlta.map((a,i)=>(
          <Card key={i} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C.red}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:4}}>ðŸ“¦ {a.name} <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>({a.code})</span></div>
                <div style={{fontSize:11,color:C.muted}}>
                  <span style={{color:C.txt2}}>{a.prevNF}:</span> R$ {a.prevPrice.toFixed(2)}/{a.unit}
                  <span style={{margin:"0 8px",color:C.muted}}>â†’</span>
                  <span style={{color:C.txt2}}>{a.currNF}:</span> R$ {a.currPrice.toFixed(2)}/{a.unit}
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:4}}>DiferenÃ§a: <strong style={{color:C.red}}>+R$ {Math.abs(a.diff).toFixed(2)}</strong> por {a.unit}</div>
              </div>
              <div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"8px 14px",textAlign:"center",flexShrink:0}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.red,fontSize:22}}>â–² +{a.pct.toFixed(1)}%</div>
                <div style={{fontSize:10,color:C.muted}}>mais caro</div>
              </div>
            </div>
          </Card>
        ))}
      </div>}
      {alertasBaixa.length>0&&<div style={{marginTop:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.grn,marginBottom:8,letterSpacing:".06em",textTransform:"uppercase"}}>ðŸ“‰ ReduÃ§Ã£o de PreÃ§o ({alertasBaixa.length})</div>
        {alertasBaixa.map((a,i)=>(
          <Card key={i} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C.grn}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:4}}>ðŸ“¦ {a.name} <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>({a.code})</span></div>
                <div style={{fontSize:11,color:C.muted}}>
                  <span style={{color:C.txt2}}>{a.prevNF}:</span> R$ {a.prevPrice.toFixed(2)}/{a.unit}
                  <span style={{margin:"0 8px"}}> â†’ </span>
                  <span style={{color:C.txt2}}>{a.currNF}:</span> R$ {a.currPrice.toFixed(2)}/{a.unit}
                </div>
              </div>
              <div style={{background:C.grnD,border:`1px solid ${C.grn}44`,borderRadius:8,padding:"8px 14px",textAlign:"center",flexShrink:0}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:22}}>â–¼ {a.pct.toFixed(1)}%</div>
                <div style={{fontSize:10,color:C.muted}}>mais barato</div>
              </div>
            </div>
          </Card>
        ))}
      </div>}
    </div>}

    {/* EMAIL */}
    {tab==="email"&&<Card style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{fontSize:14,fontWeight:700,color:C.txt}}>ðŸ“§ Enviar RelatÃ³rio por E-mail</div>
      <div>
        <label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:6}}>DestinatÃ¡rios (um por linha ou vÃ­rgula)</label>
        <textarea value={emails} onChange={e=>setEmails(e.target.value)} rows={4}
          placeholder={"financeiro@empresa.com\ngerente@empresa.com"}
          style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"11px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
      </div>
      <div style={{background:C.surf,borderRadius:8,padding:"12px 14px",border:`1px solid ${C.bdr}`,fontSize:12,color:C.muted,lineHeight:1.6}}>
        ðŸ’¡ Clique em <strong style={{color:C.txt}}>Gerar PDF</strong> ou <strong style={{color:C.txt}}>Gerar Excel</strong> no topo para baixar os arquivos, depois anexe no seu e-mail. Ou clique abaixo para abrir o app de e-mail com resumo no corpo.
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Btn color="red" onClick={gerarPDF} style={{flex:1}}>ðŸ–¨ï¸ Gerar PDF Completo</Btn>
        <Btn color="grn" onClick={gerarExcel} style={{flex:1}}>ðŸ“Š Gerar Excel (6 abas)</Btn>
        <Btn color="gold" onClick={enviarEmail} style={{flex:1}}>ðŸ“§ Abrir App de E-mail</Btn>
      </div>
    </Card>}
  </div>;
}

/* â”€â”€ SOLICITAÃ‡Ã•ES DE MATERIAL â”€â”€ */
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
    addLog(currentUser.name,"SolicitaÃ§Ã£o",currentUser.name+" solicitou "+validItems.length+" item(s)");
    setModal(false);
    setMsg("ok:SolicitaÃ§Ã£o enviada!");
    setTimeout(()=>setMsg(""),4000);
  };

  const confirmar=(sol)=>{
    let ok=true;
    sol.items.forEach(it=>{const s=stock.find(x=>x.id===it.sid);if(!s||s.qty<it.qty){ok=false;alert("Estoque insuficiente: "+(s?.name||it.sid));}});
    if(!ok)return;
    setStock(p=>p.map(s=>{const it=sol.items.find(i=>i.sid===s.id);return it?{...s,qty:s.qty-it.qty}:s;}));
    setTstock(p=>{let n=[...p];sol.items.forEach(it=>{const ex=n.find(t=>t.uid===sol.uid&&t.sid===it.sid);if(ex)n=n.map(t=>t.id===ex.id?{...t,qty:t.qty+it.qty}:t);else n.push({id:uid(),uid:sol.uid,sid:it.sid,qty:it.qty});});return n;});
    setSolicitacoes(p=>p.map(s=>s.id===sol.id?{...s,status:"confirmed",rDate:now(),rBy:currentUser.name}:s));
    addLog(currentUser.name,"SaÃ­da","SolicitaÃ§Ã£o confirmada Â· "+(users.find(u=>u.id===sol.uid)?.name));
  };

  const rejeitar=(sol)=>{
    setSolicitacoes(p=>p.map(s=>s.id===sol.id?{...s,status:"rejected",rDate:now(),rBy:currentUser.name}:s));
    addLog(currentUser.name,"SolicitaÃ§Ã£o Rejeitada","TÃ©cnico: "+(users.find(u=>u.id===sol.uid)?.name));
  };

  const sc={pending:"ylw",confirmed:"grn",rejected:"red"};
  const sl={pending:"â³ Aguardando",confirmed:"âœ… Confirmada",rejected:"âŒ Rejeitada"};
  const urg={normal:{label:"Normal",color:C.muted},alta:{label:"ðŸŸ¡ Alta",color:C.ylw},urgente:{label:"ðŸ”´ Urgente",color:C.red}};

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>SolicitaÃ§Ãµes de Material</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>{isTec?"Solicite materiais ao estoque":"Gerencie pedidos dos tÃ©cnicos"}</p>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        {!isTec&&pendentes.length>0&&<Bdg color="ylw">ðŸ”” {pendentes.length} pendente{pendentes.length>1?"s":""}</Bdg>}
        {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={abrirModal}>ðŸ“‹ Nova SolicitaÃ§Ã£o</Btn>}
      </div>
    </div>

    {msg&&<div style={{background:msg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${msg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{msg.replace(/^(ok|err):/,"")}</div>}

    {viewSol.length===0&&<Card style={{padding:40,textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:10}}>ðŸ“‹</div>
      <div style={{fontSize:14,color:C.muted}}>{isTec?"Nenhuma solicitaÃ§Ã£o ainda. Clique em Nova SolicitaÃ§Ã£o!":"Nenhuma solicitaÃ§Ã£o recebida."}</div>
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
                <span style={{fontSize:13,fontWeight:700,color:C.txt}}>ðŸ‘· {tech?.name||"?"}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{sol.date}</span>
              </div>
              {sol.notes&&<div style={{fontSize:12,color:C.muted,marginBottom:10,fontStyle:"italic"}}>"{sol.notes}"</div>}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
                {sol.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
                  <div key={i} style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"â€”"}</div>
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
              <Btn size="sm" color="grn" onClick={()=>confirmar(sol)}>âœ“ Confirmar</Btn>
              <Btn size="sm" color="red" outline onClick={()=>rejeitar(sol)}>âœ• Rejeitar</Btn>
            </div>}
          </div>
        </Card>;
      })}
    </div>

    {/* Modal â€” layout limpo com botÃ£o adicionar */}
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
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>ðŸ“‹ Nova SolicitaÃ§Ã£o</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} material(is) adicionado(s)</div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>âœ•</button>
        </div>

        {/* Body scroll */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>

          {/* UrgÃªncia e obs */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="UrgÃªncia" value={urgencia} onChange={setUrgencia} options={[{value:"normal",label:"Normal"},{value:"alta",label:"ðŸŸ¡ Alta Prioridade"},{value:"urgente",label:"ðŸ”´ Urgente"}]}/>
            <Inp label="ObservaÃ§Ã£o" value={notes} onChange={setNotes} placeholder="Ex: Para OS de amanhÃ£..."/>
          </div>

          {/* Lista de materiais adicionados */}
          {items.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>
              Materiais da SolicitaÃ§Ã£o
            </div>
            {items.map((it,idx)=>{
              const s=it.sid?stock.find(x=>x.id===it.sid):null;
              return <div key={it.id} style={{
                display:"flex",alignItems:"center",gap:8,
                background:it.sid?`${C.gold}08`:C.surf,
                borderRadius:10,padding:"10px 12px",
                border:`1px solid ${it.sid?`${C.gold}44`:C.bdr2}`}}>
                {/* NÃºmero */}
                <div style={{width:24,height:24,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.gold,flexShrink:0}}>{idx+1}</div>
                {/* Select material */}
                <div style={{flex:1,minWidth:0}}>
                  <select value={it.sid} onChange={e=>updItem(it.id,"sid",e.target.value)}
                    style={{width:"100%",background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:it.sid?C.txt:C.muted,fontSize:13}}>
                    <option value="">â€” Selecionar material â€”</option>
                    {stock.map(s=><option key={s.id} value={s.id}>[{s.code||"â€”"}] {s.name} ({s.qty} {s.unit})</option>)}
                  </select>
                  {s&&<div style={{fontSize:10,color:C.grn,marginTop:3}}>âœ“ DisponÃ­vel: {s.qty} {s.unit}</div>}
                </div>
                {/* Qtd */}
                <input type="number" value={it.qty} onChange={e=>updItem(it.id,"qty",e.target.value)}
                  placeholder="Qtd" min="0"
                  style={{width:70,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:14,fontWeight:700,textAlign:"center",flexShrink:0}}/>
                {/* Remover */}
                <button onClick={()=>remItem(it.id)}
                  style={{background:C.redD,color:C.red,border:"none",borderRadius:7,width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>âœ•</button>
              </div>;
            })}
          </div>}

          {/* BotÃ£o adicionar material â€” bem destacado */}
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
            <Btn color="gold" onClick={enviar} disabled={validItems.length===0}>ðŸ“¤ Enviar SolicitaÃ§Ã£o</Btn>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}





/* â”€â”€ FROTA â”€â”€ */
function FrotaPage({veiculos,setVeiculos,abastecimentos,setAbastecimentos,checkouts,setCheckouts,pneus,setPneus,docsVeic,setDocsVeic,manutOS=[],manutSols=[],users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const isAdm=["admin","superadmin"].includes(currentUser.role);
  const isFin=currentUser.role==="financeiro";

  const[tab,setTab]=useState("dash");
  const[modalVeic,setModalVeic]=useState(null);
  const[modalAbast,setModalAbast]=useState(false);
  const[modalCheck,setModalCheck]=useState(null);
  const[modalFotos,setModalFotos]=useState(null);
  const[modalDoc,setModalDoc]=useState(null);
  const[modalHist,setModalHist]=useState(null);
  const[modalPneu,setModalPneu]=useState(null);
  const[modalCusto,setModalCusto]=useState(null);
  const techs=users.filter(u=>u.role==="tecnico");

  const FOTOS_LABELS=["Frente","Lado Esquerdo","Lado Direito","Traseira"];
  const FOTOS_ICONS=["â¬†ï¸","â¬…ï¸","âž¡ï¸","â¬‡ï¸"];
  const STATUS_OPTS=["ativo","manutenÃ§Ã£o","inativo"];
  const STATUS_COLOR={ativo:C.grn,manutenÃ§Ã£o:C.ylw,inativo:C.red};
  const COMB_OPTS=["gasolina","etanol","diesel","flex","gnv"];
  const COMB_NIVEL=["reserva","1/4","1/2","3/4","cheio"];
  const COMB_COLOR={reserva:C.red,"1/4":C.ylw,"1/2":C.ylw,"3/4":C.grn,cheio:C.grn};
  const PNEU_OPTS=["ok","baixo","problema"];
  const PNEU_COLOR={ok:C.grn,baixo:C.ylw,problema:C.red};
  const PNEU_ICON={ok:"âœ…",baixo:"âš ï¸",problema:"âŒ"};

  const hoje=new Date();
  const diasAte=(dataStr)=>{
    if(!dataStr)return null;
    const d=new Date(dataStr);
    return Math.floor((d-hoje)/(1000*60*60*24));
  };

  const blankVeic=()=>({id:uid(),placa:"",modelo:"",ano:"",cor:"",tecnicoId:"",dtAquisicao:"",kmCadastro:"",status:"ativo",obs:"",fotos:["","","",""],docPDF:"",vencIPVA:"",vencLicenc:"",vencSeguro:""});
  const blankAbast=()=>({id:uid(),veiculoId:"",tecnicoId:currentUser.id,dtAbast:hoje.toISOString().slice(0,10),odometro:"",litros:"",valor:"",combustivel:"gasolina",posto:"",foto:"",obs:""});
  const blankCheck=(tipo)=>({id:uid(),veiculoId:"",tecnicoId:currentUser.id,tipo:tipo||"retirada",dtCheck:hoje.toISOString().slice(0,10),km:"",combustivel:"cheio",pneus:{diant_esq:"ok",diant_dir:"ok",tras_esq:"ok",tras_dir:"ok"},avarias:false,descAvarias:"",fotoOdometro:"",fotosAvarias:["","",""],obs:""});
  const blankPneu=()=>({id:uid(),veiculoId:"",posicao:"diant_esq",marca:"",dot:"",dtTroca:hoje.toISOString().slice(0,10),kmTroca:"",obs:""});

  const[formVeic,setFormVeic]=useState(blankVeic());
  const[formAbast,setFormAbast]=useState(blankAbast());
  const[formCheck,setFormCheck]=useState(blankCheck("retirada"));
  const[formPneu,setFormPneu]=useState(blankPneu());
  const[errVeic,setErrVeic]=useState("");
  const[errAbast,setErrAbast]=useState("");
  const[errCheck,setErrCheck]=useState("");
  const[selVeicHist,setSelVeicHist]=useState("");

  // â”€â”€ KM helpers â”€â”€
  const getKmAtual=(veicId)=>{
    const regs=[...abastecimentos.filter(a=>a.veiculoId===veicId&&parseInt(a.odometro)>0),...checkouts.filter(c=>c.veiculoId===veicId&&parseInt(c.km)>0)];
    if(!regs.length){const v=veiculos.find(x=>x.id===veicId);return parseInt(v?.kmCadastro)||0;}
    return Math.max(...regs.map(r=>parseInt(r.odometro||r.km)||0));
  };
  const getAlertaOleo=(veic)=>{
    const kmAtual=getKmAtual(veic.id);
    const kmBase=parseInt(veic.kmCadastro)||0;
    const proxima=Math.ceil((kmAtual-kmBase+1)/10000)*10000+kmBase;
    const faltam=proxima-kmAtual;
    return{kmAtual,faltam,urgente:faltam<=500,alerta:faltam<=2000};
  };

  // â”€â”€ Consumo mÃ©dio â”€â”€
  const getConsumo=(veicId)=>{
    const regs=abastecimentos.filter(a=>a.veiculoId===veicId&&a.litros&&a.odometro).sort((a,b)=>parseInt(a.odometro)-parseInt(b.odometro));
    if(regs.length<2)return null;
    const km=parseInt(regs[regs.length-1].odometro)-parseInt(regs[0].odometro);
    const litros=regs.slice(1).reduce((s,r)=>s+(parseFloat(r.litros)||0),0);
    return litros>0?(km/litros).toFixed(1):null;
  };

  // â”€â”€ Custo por km â”€â”€
  const getCustoPorKm=(veicId)=>{
    const kmAtual=getKmAtual(veicId);
    const v=veiculos.find(x=>x.id===veicId);
    const kmBase=parseInt(v?.kmCadastro)||0;
    const kmRodados=kmAtual-kmBase;
    if(kmRodados<=0)return null;
    const gastoComb=abastecimentos.filter(a=>a.veiculoId===veicId).reduce((s,a)=>s+(parseFloat(a.valor)||0),0);
    const gastoManut=manutOS.filter(o=>o.veiculoId===veicId).reduce((s,o)=>s+(o.pecas?.reduce((ps,p)=>ps+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0),0);
    return((gastoComb+gastoManut)/kmRodados).toFixed(2);
  };

  // â”€â”€ NotificaÃ§Ãµes â”€â”€
  const getNotificacoes=useMemo(()=>{
    const notifs=[];
    veiculos.filter(v=>v.status==="ativo").forEach(v=>{
      const oleo=getAlertaOleo(v);
      if(oleo.urgente) notifs.push({tipo:"urgente",veic:v,msg:`ðŸ”´ Troca de Ã³leo URGENTE â€” ${v.placa} (faltam ${fmt(oleo.faltam)} km)`,icon:"âš™ï¸"});
      else if(oleo.alerta) notifs.push({tipo:"alerta",veic:v,msg:`ðŸŸ¡ Troca de Ã³leo em breve â€” ${v.placa} (faltam ${fmt(oleo.faltam)} km)`,icon:"âš™ï¸"});
      const checkVenc=[
        {campo:"vencIPVA",label:"IPVA"},
        {campo:"vencLicenc",label:"Licenciamento"},
        {campo:"vencSeguro",label:"Seguro"},
      ];
      checkVenc.forEach(({campo,label})=>{
        const dias=diasAte(v[campo]);
        if(dias!==null&&dias<=30) notifs.push({tipo:dias<=7?"urgente":"alerta",veic:v,msg:`${dias<=7?"ðŸ”´":"ðŸŸ¡"} ${label} vencendo â€” ${v.placa} (${dias<=0?"VENCIDO":dias+" dias"})`});
      });
    });
    const solsAbertas=manutSols.filter(s=>s.status==="aberta").length;
    if(solsAbertas>0) notifs.push({tipo:"info",msg:`ðŸ“‹ ${solsAbertas} solicitaÃ§Ã£o(Ãµes) de manutenÃ§Ã£o aguardando anÃ¡lise`,icon:"ðŸ”§"});
    return notifs;
  },[veiculos,abastecimentos,checkouts,manutSols]);

  // â”€â”€ Gastos mensais combustÃ­vel â”€â”€
  const gastosMensisComb=useMemo(()=>{
    const m={};
    abastecimentos.forEach(a=>{
      const mes=(a.dtAbast||"").slice(0,7);
      if(!mes)return;
      m[mes]=(m[mes]||0)+(parseFloat(a.valor)||0);
    });
    return Object.entries(m).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6);
  },[abastecimentos]);

  // â”€â”€ Ranking tÃ©cnicos â”€â”€
  const rankingTec=useMemo(()=>{
    return techs.map(t=>{
      const abasts=abastecimentos.filter(a=>a.tecnicoId===t.id);
      const gasto=abasts.reduce((s,a)=>s+(parseFloat(a.valor)||0),0);
      const veicsResp=veiculos.filter(v=>v.tecnicoId===t.id).length;
      return{...t,abasts:abasts.length,gasto,veicsResp};
    }).sort((a,b)=>b.abasts-a.abasts);
  },[techs,abastecimentos,veiculos]);

  const viewAbast=isTec?abastecimentos.filter(a=>a.tecnicoId===currentUser.id):abastecimentos;
  const viewCheck=isTec?checkouts.filter(c=>c.tecnicoId===currentUser.id):checkouts;

  // â”€â”€ File handlers â”€â”€
  const handleFotoVeic=(idx,e)=>{const f=e.target.files[0];if(!f)return;if(f.size>3*1024*1024){alert("MÃ¡x 3MB");return;}const r=new FileReader();r.onload=ev=>setFormVeic(fv=>({...fv,fotos:fv.fotos.map((ft,i)=>i===idx?ev.target.result:ft)}));r.readAsDataURL(f);};
  const handleDocPDF=(e)=>{const f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024){alert("MÃ¡x 5MB");return;}const r=new FileReader();r.onload=ev=>setFormVeic(fv=>({...fv,docPDF:ev.target.result}));r.readAsDataURL(f);};
  const handleFotoAbast=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setFormAbast(fa=>({...fa,foto:ev.target.result}));r.readAsDataURL(f);};
  const handleFotoOdo=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setFormCheck(fc=>({...fc,fotoOdometro:ev.target.result}));r.readAsDataURL(f);};
  const handleFotoAvaria=(idx,e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setFormCheck(fc=>({...fc,fotosAvarias:fc.fotosAvarias.map((ft,i)=>i===idx?ev.target.result:ft)}));r.readAsDataURL(f);};

  // â”€â”€ Salvar veÃ­culo â”€â”€
  const salvarVeic=()=>{
    if(!formVeic.placa.trim()){setErrVeic("Informe a placa.");return;}
    if(!formVeic.modelo.trim()){setErrVeic("Informe o modelo.");return;}
    const data={...formVeic,placa:formVeic.placa.toUpperCase().trim(),fotos:formVeic.fotos||["","","",""]};
    if(modalVeic==="new"){setVeiculos(p=>[{...data,id:uid()},...p]);addLog(currentUser.name,"Frota","Cadastrado: "+data.placa);}
    else{setVeiculos(p=>p.map(v=>v.id===modalVeic?data:v));addLog(currentUser.name,"Frota","Editado: "+data.placa);}
    setModalVeic(null);setErrVeic("");
  };

  const salvarAbast=()=>{
    if(!formAbast.veiculoId){setErrAbast("Selecione o veÃ­culo.");return;}
    if(!formAbast.odometro){setErrAbast("Informe o odÃ´metro.");return;}
    if(!formAbast.litros||!formAbast.valor){setErrAbast("Informe litros e valor.");return;}
    const veic=veiculos.find(v=>v.id===formAbast.veiculoId);
    setAbastecimentos(p=>[{...formAbast,id:uid(),registradoEm:now()},...p]);
    addLog(currentUser.name,"Abastecimento",`${veic?.placa||"?"} Â· ${formAbast.litros}L Â· R$${formAbast.valor}`);
    setModalAbast(false);setErrAbast("");setFormAbast(blankAbast());
  };

  const salvarCheck=()=>{
    if(!formCheck.veiculoId){setErrCheck("Selecione o veÃ­culo.");return;}
    if(!formCheck.km){setErrCheck("Informe a quilometragem.");return;}
    const veic=veiculos.find(v=>v.id===formCheck.veiculoId);
    setCheckouts(p=>[{...formCheck,id:uid(),registradoEm:now()},...p]);
    addLog(currentUser.name,formCheck.tipo==="retirada"?"Retirada":"DevoluÃ§Ã£o",`${veic?.placa||"?"} Â· ${formCheck.km} km`);
    setModalCheck(null);setErrCheck("");
  };

  const salvarPneu=()=>{
    if(!formPneu.veiculoId){alert("Selecione o veÃ­culo.");return;}
    if(!formPneu.marca){alert("Informe a marca.");return;}
    setPneus(p=>[{...formPneu,id:uid(),registradoPor:currentUser.id},...p]);
    addLog(currentUser.name,"Pneu",`${veiculos.find(v=>v.id===formPneu.veiculoId)?.placa||"?"} Â· ${formPneu.posicao} Â· ${formPneu.marca}`);
    setModalPneu(null);setFormPneu(blankPneu());
  };

  // â”€â”€ Tab list â”€â”€
  const tabList=isAdm
    ?[{k:"dash",l:"ðŸ“Š Dashboard"},{k:"veic",l:"ðŸš— VeÃ­culos"},{k:"abast",l:"â›½ Abastecimento"},{k:"check",l:"ðŸ“‹ Checklist"},{k:"pneus",l:"ðŸ”„ Pneus"},{k:"hist",l:"ðŸ“– HistÃ³rico"},{k:"custos",l:"ðŸ’° Custos"}]
    :isTec
    ?[{k:"check",l:"ðŸ“‹ Checklist"},{k:"abast",l:"â›½ Abastecimento"}]
    :[{k:"dash",l:"ðŸ“Š Dashboard"},{k:"abast",l:"â›½ Abastecimento"}];

  // â”€â”€ Filtro de data â”€â”€
  const hoje2=new Date().toISOString().slice(0,10);
  const primMes=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
  const[dtFrIn,setDtFrIn]=useState(primMes);
  const[dtFrFim,setDtFrFim]=useState(hoje2);
  const[modoFiltro,setModoFiltro]=useState("mes");

  const aplicarFiltroFrota=(modo)=>{
    setModoFiltro(modo);
    const h=new Date();
    if(modo==="hoje"){const d=h.toISOString().slice(0,10);setDtFrIn(d);setDtFrFim(d);}
    else if(modo==="semana"){const i=new Date(h);i.setDate(h.getDate()-7);setDtFrIn(i.toISOString().slice(0,10));setDtFrFim(h.toISOString().slice(0,10));}
    else if(modo==="mes"){setDtFrIn(new Date(h.getFullYear(),h.getMonth(),1).toISOString().slice(0,10));setDtFrFim(h.toISOString().slice(0,10));}
    else if(modo==="ano"){setDtFrIn(new Date(h.getFullYear(),0,1).toISOString().slice(0,10));setDtFrFim(h.toISOString().slice(0,10));}
    else if(modo==="tudo"){setDtFrIn("2020-01-01");setDtFrFim("2099-12-31");}
  };
  const inFrotaRange=(dtStr)=>{
    if(!dtStr)return true;
    const d=new Date(dtStr+"T00:00:00");
    return d>=new Date(dtFrIn+"T00:00:00")&&d<=new Date(dtFrFim+"T23:59:59");
  };
  const frotaLabel=dtFrIn===dtFrFim?dtFrIn.split("-").reverse().join("/"):`${dtFrIn.split("-").reverse().join("/")} a ${dtFrFim.split("-").reverse().join("/")}`;

  // Filtered views
  const viewAbastFilt=viewAbast.filter(a=>inFrotaRange(a.dtAbast));
  const viewCheckFilt=viewCheck.filter(c=>inFrotaRange(c.dtCheck));
  const totalGastoComb=viewAbastFilt.reduce((a,x)=>a+(parseFloat(x.valor)||0),0);
  const totalLitros=viewAbastFilt.reduce((a,x)=>a+(parseFloat(x.litros)||0),0);

  if(!tab||!tabList.find(t=>t.k===tab)) {
    // reset to first available tab
  }

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>ðŸš— Frota</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>GestÃ£o completa de veÃ­culos, combustÃ­vel e manutenÃ§Ã£o</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {isAdm&&tab==="veic"&&<Btn color="gold" size="sm" onClick={()=>{setFormVeic(blankVeic());setModalVeic("new");setErrVeic("");}}>+ VeÃ­culo</Btn>}
        {(isAdm||isTec)&&tab==="abast"&&<Btn color="gold" size="sm" onClick={()=>{setFormAbast(blankAbast());setModalAbast(true);setErrAbast("");}}>â›½ Abastecimento</Btn>}
        {(isAdm||isTec)&&tab==="check"&&<div style={{display:"flex",gap:8}}>
          <Btn color="gold" size="sm" onClick={()=>{setFormCheck(blankCheck("retirada"));setModalCheck("new");}}>ðŸ“‹ Retirada</Btn>
          <Btn color="ghost" outline size="sm" onClick={()=>{setFormCheck(blankCheck("devolucao"));setModalCheck("new");}}>â†©ï¸ DevoluÃ§Ã£o</Btn>
        </div>}
        {isAdm&&tab==="pneus"&&<Btn color="gold" size="sm" onClick={()=>{setFormPneu(blankPneu());setModalPneu("new");}}>ðŸ”„ Registrar Pneu</Btn>}
      </div>
    </div>

    {/* NotificaÃ§Ãµes */}
    {getNotificacoes.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
      {getNotificacoes.map((n,i)=>(
        <div key={i} style={{background:n.tipo==="urgente"?C.redD:`${C.ylw}18`,border:`1px solid ${n.tipo==="urgente"?C.red:C.ylw}44`,borderRadius:8,padding:"10px 14px",fontSize:12,color:n.tipo==="urgente"?C.red:C.ylw,fontWeight:600}}>
          {n.msg}
        </div>
      ))}
    </div>}

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`,overflowX:"auto",gap:0}}>
      {tabList.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:12,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>)}
    </div>

    {/* Filtro de PerÃ­odo */}
    <Card style={{padding:12}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:11,fontWeight:700,color:C.gold}}>ðŸ“… PERÃODO:</span>
        {[{k:"hoje",l:"Hoje"},{k:"semana",l:"Semana"},{k:"mes",l:"MÃªs"},{k:"ano",l:"Ano"},{k:"tudo",l:"Tudo"}].map(p=>(
          <button key={p.k} onClick={()=>aplicarFiltroFrota(p.k)} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${modoFiltro===p.k?C.gold:C.bdr2}`,background:modoFiltro===p.k?`${C.gold}22`:"transparent",color:modoFiltro===p.k?C.gold:C.muted,fontSize:12,fontWeight:modoFiltro===p.k?700:400,cursor:"pointer"}}>
            {p.l}
          </button>
        ))}
        <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input type="date" value={dtFrIn} onChange={e=>{setDtFrIn(e.target.value);setModoFiltro("custom");}} style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"5px 10px",color:C.txt,fontSize:12}}/>
            <span style={{color:C.muted,fontSize:12}}>atÃ©</span>
            <input type="date" value={dtFrFim} onChange={e=>{setDtFrFim(e.target.value);setModoFiltro("custom");}} style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"5px 10px",color:C.txt,fontSize:12}}/>
          </div>
          <div style={{background:`${C.gold}18`,border:`1px solid ${C.gold}44`,borderRadius:6,padding:"4px 12px",fontSize:11,fontWeight:700,color:C.gold}}>
            ðŸ“… {frotaLabel} Â· {viewAbastFilt.length} abast Â· {viewCheckFilt.length} checks
          </div>
        </div>
      </div>
    </Card>

    {/* â”€â”€ DASHBOARD FROTA â”€â”€ */}
    {tab==="dash"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* KPI Cards */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
        {[
          {l:"VEÃCULOS ATIVOS",v:fmt(veiculos.filter(v=>v.status==="ativo").length),i:"ðŸš—",c:C.grn},
          {l:"EM MANUTENÃ‡ÃƒO",v:fmt(veiculos.filter(v=>v.status==="manutenÃ§Ã£o").length),i:"ðŸ”§",c:C.ylw},
          {l:"TROCA Ã“LEO PENDENTE",v:fmt(veiculos.filter(v=>getAlertaOleo(v).alerta).length),i:"âš™ï¸",c:C.red},
          {l:"OS ABERTAS",v:fmt(manutOS.filter(o=>o.status!=="concluida").length),i:"ðŸ“‹",c:C.gold},
        ].map((s,i)=>(
          <Card key={i} style={{padding:isMobile?12:16,display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:40,height:40,borderRadius:10,background:`${s.c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{s.i}</div>
            <div><div style={{fontSize:9,fontWeight:700,color:C.muted}}>{s.l}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?16:22,fontWeight:800,color:s.c}}>{s.v}</div></div>
          </Card>
        ))}
      </div>

      {/* Gastos combustÃ­vel e Consumo */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>â›½ Gastos com CombustÃ­vel (6 meses)</div>
          {gastosMensisComb.length===0?<div style={{color:C.muted,fontSize:12}}>Sem dados</div>:
          gastosMensisComb.map(([mes,val])=>(
            <div key={mes} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:3}}>
                <span>{mes}</span><span style={{color:C.grn,fontWeight:700}}>R$ {fmt(Math.round(val))}</span>
              </div>
              <div style={{background:C.bdr,borderRadius:4,height:6}}>
                <div style={{background:C.grn,height:6,borderRadius:4,width:`${Math.min(100,(val/Math.max(...gastosMensisComb.map(([,v])=>v)))*100)}%`}}/>
              </div>
            </div>
          ))}
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>ðŸ“Š Consumo e Custo por VeÃ­culo</div>
          {veiculos.filter(v=>v.status==="ativo").slice(0,6).map(v=>{
            const consumo=getConsumo(v.id);
            const custoKm=getCustoPorKm(v.id);
            const oleo=getAlertaOleo(v);
            return <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.bdr}18`}}>
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.gold,fontSize:12}}>{v.placa}</div>
                <div style={{fontSize:10,color:C.muted}}>{v.modelo}</div>
              </div>
              <div style={{display:"flex",gap:10,fontSize:11}}>
                {consumo&&<span style={{color:C.blue}}>â›½ {consumo} km/L</span>}
                {custoKm&&<span style={{color:C.grn}}>R${custoKm}/km</span>}
                {oleo.alerta&&<span style={{color:oleo.urgente?C.red:C.ylw}}>{oleo.urgente?"ðŸ”´":"ðŸŸ¡"}{fmt(oleo.faltam)}km</span>}
              </div>
            </div>;
          })}
        </Card>
      </div>

      {/* Ranking tÃ©cnicos */}
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>ðŸ† Ranking de TÃ©cnicos (Abastecimentos)</div>
        {rankingTec.length===0?<div style={{color:C.muted,fontSize:12}}>Sem dados</div>:
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <THead cols={["TÃ©cnico","VeÃ­culos","Abastecimentos","Gasto Total"]}/>
            <tbody>{rankingTec.map((t,i)=><TRow key={t.id} cells={[
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{background:C.surf,borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.gold}}>{i+1}</span>
                <span style={{fontSize:12}}>{t.name}</span>
              </div>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{t.veicsResp}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.blue}}>{t.abasts}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.grn,fontWeight:700}}>R$ {fmt(Math.round(t.gasto))}</span>,
            ]}/> )}</tbody>
          </table>
        </div>}
      </Card>

      {/* Vencimentos */}
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>ðŸ“… Vencimentos de Documentos</div>
        {veiculos.filter(v=>{
          const campos=[v.vencIPVA,v.vencLicenc,v.vencSeguro];
          return campos.some(c=>c&&diasAte(c)!==null&&diasAte(c)<=90);
        }).length===0?<div style={{color:C.muted,fontSize:12}}>Todos os documentos em dia âœ…</div>:
        veiculos.filter(v=>[v.vencIPVA,v.vencLicenc,v.vencSeguro].some(c=>c&&diasAte(c)!==null&&diasAte(c)<=90)).map(v=>(
          <div key={v.id} style={{marginBottom:10,padding:"10px 14px",background:C.surf,borderRadius:8}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.gold,fontSize:12,marginBottom:6}}>{v.placa} â€” {v.modelo}</div>
            {[{campo:"vencIPVA",label:"IPVA"},{campo:"vencLicenc",label:"Licenciamento"},{campo:"vencSeguro",label:"Seguro"}].map(({campo,label})=>{
              if(!v[campo])return null;
              const d=diasAte(v[campo]);
              if(d===null||d>90)return null;
              return <div key={campo} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:d<=7?C.red:d<=30?C.ylw:C.muted}}>
                <span>{label}: {v[campo]}</span>
                <span style={{fontWeight:700}}>{d<=0?"VENCIDO":d===0?"HOJE":d+" dias"}</span>
              </div>;
            })}
          </div>
        ))}
      </Card>
    </div>}

    {/* â”€â”€ VEÃCULOS â”€â”€ */}
    {tab==="veic"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {veiculos.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum veÃ­culo cadastrado.</span></Card>}
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
                <Bdg color={v.status==="ativo"?"grn":v.status==="manutenÃ§Ã£o"?"ylw":"red"}>{v.status}</Bdg>
                {oleo.urgente&&<Bdg color="red">ðŸ”´ Ã“leo URGENTE!</Bdg>}
                {!oleo.urgente&&oleo.alerta&&<Bdg color="ylw">ðŸŸ¡ Ã“leo em breve</Bdg>}
                {v.docPDF&&<Bdg color="muted">ðŸ“„ Doc</Bdg>}
              </div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:12,color:C.muted,marginBottom:8}}>
                {v.cor&&<span>ðŸŽ¨ {v.cor}</span>}
                <span>ðŸ‘· {tech?.name||"â€”"}</span>
                {v.dtAquisicao&&<span>ðŸ“… {v.dtAquisicao}</span>}
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.blue}}>ðŸ›£ï¸ {fmt(oleo.kmAtual)} km</span>
                {oleo.alerta&&<span style={{color:oleo.urgente?C.red:C.ylw,fontWeight:700}}>âš™ï¸ Faltam {fmt(oleo.faltam)} km</span>}
                {getConsumo(v.id)&&<span style={{color:C.grn}}>â›½ {getConsumo(v.id)} km/L</span>}
              </div>
              {/* Vencimentos inline */}
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:8}}>
                {[{c:"vencIPVA",l:"IPVA"},{c:"vencLicenc",l:"Licenc."},{c:"vencSeguro",l:"Seguro"}].map(({c,l})=>{
                  if(!v[c])return null;
                  const d=diasAte(v[c]);
                  if(d===null||d>90)return null;
                  return <span key={c} style={{fontSize:10,color:d<=7?C.red:C.ylw,fontWeight:700,background:d<=7?C.redD:`${C.ylw}22`,padding:"2px 8px",borderRadius:5}}>{l}: {d<=0?"VENCIDO":d+"d"}</span>;
                })}
              </div>
              {v.obs&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic",marginBottom:6}}>{v.obs}</div>}
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
              <Btn size="xs" color="gold" outline onClick={()=>setModalHist(v)}>ðŸ“– HistÃ³rico</Btn>
              {v.docPDF&&<Btn size="xs" color="ghost" outline onClick={()=>setModalDoc(v)}>ðŸ“„ Doc</Btn>}
              {temFoto&&<Btn size="xs" color="ghost" outline onClick={()=>setModalFotos(v)}>ðŸ–¼ï¸</Btn>}
              {isAdm&&<>
                <Btn size="xs" color="gold" outline onClick={()=>{setFormVeic({...v,fotos:v.fotos||["","","",""],docPDF:v.docPDF||""});setModalVeic(v.id);setErrVeic("");}}>Editar</Btn>
                <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Excluir ${v.placa}?`)){setVeiculos(p=>p.filter(x=>x.id!==v.id));addLog(currentUser.name,"Frota","ExcluÃ­do: "+v.placa);}}}>âœ•</Btn>
              </>}
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* â”€â”€ ABASTECIMENTO â”€â”€ */}
    {tab==="abast"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {/* resumo */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
        {[{l:"ABASTECIMENTOS",v:fmt(viewAbast.length),i:"â›½",c:C.gold},{l:"LITROS",v:fmt(Math.round(totalLitros)),i:"ðŸ›¢ï¸",c:C.blue},{l:"GASTO TOTAL",v:`R$ ${fmt(Math.round(totalGastoComb))}`,i:"ðŸ’°",c:C.grn}].map((s,i)=>(
          <Card key={i} style={{padding:isMobile?12:14,display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${s.c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{s.i}</div>
            <div><div style={{fontSize:9,fontWeight:700,color:C.muted}}>{s.l}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?15:19,fontWeight:800,color:s.c}}>{s.v}</div></div>
          </Card>
        ))}
      </div>
      {viewAbastFilt.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum abastecimento no perÃ­odo selecionado.</span></Card>}
      {viewAbastFilt.map(a=>{
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
                <span style={{color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>ðŸ›£ï¸ {fmt(parseInt(a.odometro)||0)} km</span>
                {a.litros&&a.valor&&parseFloat(a.litros)>0&&<span style={{color:C.muted}}>R$ {(parseFloat(a.valor)/parseFloat(a.litros)).toFixed(2)}/L</span>}
                {a.posto&&<span style={{color:C.muted}}>ðŸ“ {a.posto}</span>}
              </div>
              {!isTec&&<div style={{fontSize:10,color:C.muted,marginTop:3}}>ðŸ‘· {tech?.name||"?"}</div>}
            </div>
            {a.foto&&<img src={a.foto} alt="nota" style={{width:56,height:56,objectFit:"cover",borderRadius:8,border:`1px solid ${C.bdr2}`,cursor:"pointer",flexShrink:0}} onClick={()=>window.open(a.foto,"_blank")}/>}
          </div>
        </Card>;
      })}
    </div>}

    {/* â”€â”€ CHECKLIST â”€â”€ */}
    {tab==="check"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {viewCheckFilt.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum checklist no perÃ­odo.</span></Card>}
      {viewCheckFilt.map(c=>{
        const v=veiculos.find(x=>x.id===c.veiculoId);
        const tech=users.find(u=>u.id===c.tecnicoId);
        const pneuProb=Object.values(c.pneus||{}).some(p=>p==="problema");
        const pneuBaixo=Object.values(c.pneus||{}).some(p=>p==="baixo");
        return <Card key={c.id} style={{padding:16,borderLeft:`3px solid ${c.tipo==="retirada"?C.gold:C.grn}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <Bdg color={c.tipo==="retirada"?"gold":"grn"}>{c.tipo==="retirada"?"ðŸš— Retirada":"â†©ï¸ DevoluÃ§Ã£o"}</Bdg>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v?.placa||"?"}</span>
                <span style={{fontSize:13,color:C.txt}}>{v?.modelo||""}</span>
                <span style={{fontSize:11,color:C.muted}}>{c.dtCheck}</span>
                {!isTec&&<span style={{fontSize:11,color:C.muted}}>Â· {tech?.name||"?"}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginBottom:8}}>
                {[
                  {l:"KM",v:`${fmt(parseInt(c.km)||0)} km`,c:C.blue},
                  {l:"COMBUSTÃVEL",v:`â›½ ${c.combustivel||"?"}`,c:COMB_COLOR[c.combustivel]||C.gold},
                  {l:"PNEUS",v:pneuProb?"âŒ Problema":pneuBaixo?"âš ï¸ Baixo":"âœ… OK",c:pneuProb?C.red:pneuBaixo?C.ylw:C.grn},
                  {l:"AVARIAS",v:c.avarias?"âš ï¸ Sim":"âœ… NÃ£o",c:c.avarias?C.ylw:C.grn},
                ].map((s,i)=>(
                  <div key={i} style={{background:C.surf,borderRadius:8,padding:"6px 10px"}}>
                    <div style={{fontSize:9,color:C.muted,marginBottom:2}}>{s.l}</div>
                    <div style={{fontSize:12,fontWeight:700,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
              {c.avarias&&c.descAvarias&&<div style={{fontSize:11,color:C.ylw,marginBottom:6}}>âš ï¸ {c.descAvarias}</div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {c.fotoOdometro&&<img src={c.fotoOdometro} alt="odÃ´metro" style={{width:60,height:50,objectFit:"cover",borderRadius:6,border:`1px solid ${C.bdr2}`,cursor:"pointer"}} onClick={()=>window.open(c.fotoOdometro,"_blank")}/>}
                {c.fotosAvarias?.filter(f=>f).map((foto,i)=><img key={i} src={foto} alt={`avaria`} style={{width:60,height:50,objectFit:"cover",borderRadius:6,border:`1px solid ${C.red}44`,cursor:"pointer"}} onClick={()=>window.open(foto,"_blank")}/>)}
              </div>
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* â”€â”€ PNEUS â”€â”€ */}
    {tab==="pneus"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {pneus.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum pneu registrado.</span></Card>}
      {pneus.map(p=>{
        const v=veiculos.find(x=>x.id===p.veiculoId);
        const POSICOES={diant_esq:"Dianteiro Esq",diant_dir:"Dianteiro Dir",tras_esq:"Traseiro Esq",tras_dir:"Traseiro Dir",estepe:"Estepe"};
        return <Card key={p.id} style={{padding:14,borderLeft:`3px solid ${C.blue}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:13}}>{v?.placa||"?"}</span>
                <Bdg color="blue">{POSICOES[p.posicao]||p.posicao}</Bdg>
              </div>
              <div style={{fontSize:12,color:C.txt,fontWeight:600}}>{p.marca} {p.dot&&`Â· DOT: ${p.dot}`}</div>
              <div style={{display:"flex",gap:12,fontSize:11,color:C.muted,marginTop:4,flexWrap:"wrap"}}>
                {p.dtTroca&&<span>ðŸ“… Trocado: {p.dtTroca}</span>}
                {p.kmTroca&&<span style={{fontFamily:"'JetBrains Mono',monospace"}}>ðŸ›£ï¸ {fmt(parseInt(p.kmTroca)||0)} km</span>}
                {p.obs&&<span>ðŸ“ {p.obs}</span>}
              </div>
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* â”€â”€ HISTÃ“RICO POR VEÃCULO â”€â”€ */}
    {tab==="hist"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Card style={{padding:14}}>
        <Sel label="Selecionar VeÃ­culo" value={selVeicHist} onChange={setSelVeicHist} options={[{value:"",label:"â€” Todos os veÃ­culos â€”"},...veiculos.map(v=>({value:v.id,label:`${v.placa} â€” ${v.modelo}`}))]}/>
      </Card>
      {(selVeicHist?veiculos.filter(v=>v.id===selVeicHist):veiculos).map(v=>{
        const vAbast=abastecimentos.filter(a=>a.veiculoId===v.id).sort((a,b)=>b.dtAbast?.localeCompare(a.dtAbast));
        const vCheck=checkouts.filter(c=>c.veiculoId===v.id).sort((a,b)=>b.dtCheck?.localeCompare(a.dtCheck));
        const vManut=manutOS.filter(o=>o.veiculoId===v.id);
        const vPneus=pneus.filter(p=>p.veiculoId===v.id);
        const oleo=getAlertaOleo(v);
        return <Card key={v.id} style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",background:C.surf,borderBottom:`1px solid ${C.bdr}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:15}}>{v.placa}</span>
                <span style={{fontSize:13,color:C.txt,marginLeft:10}}>{v.modelo} {v.ano}</span>
              </div>
              <div style={{display:"flex",gap:12,fontSize:11,color:C.muted,flexWrap:"wrap"}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.blue}}>ðŸ›£ï¸ {fmt(oleo.kmAtual)} km</span>
                {getConsumo(v.id)&&<span style={{color:C.grn}}>â›½ {getConsumo(v.id)} km/L</span>}
                <span>{vAbast.length} abast Â· {vCheck.length} checks Â· {vManut.length} OS Â· {vPneus.length} pneus</span>
              </div>
            </div>
          </div>
          {/* Linha do tempo */}
          <div style={{padding:14,display:"flex",flexDirection:"column",gap:8,maxHeight:400,overflowY:"auto"}}>
            {[
              ...vAbast.map(a=>({tipo:"abast",dt:a.dtAbast,label:`â›½ ${a.dtAbast} â€” ${a.litros}L R$${a.valor} (${a.combustivel}) Â· ${fmt(parseInt(a.odometro)||0)} km`,color:C.gold})),
              ...vCheck.map(c=>({tipo:"check",dt:c.dtCheck,label:`${c.tipo==="retirada"?"ðŸš—":"â†©ï¸"} ${c.dtCheck} â€” ${c.tipo} Â· ${fmt(parseInt(c.km)||0)} km Â· Pneus: ${Object.values(c.pneus||{}).some(p=>p==="problema")?"âŒ":"âœ…"} Â· Avarias: ${c.avarias?"âš ï¸":"âœ…"}`,color:c.tipo==="retirada"?C.gold:C.grn})),
              ...vManut.map(o=>({tipo:"manut",dt:o.dtEntrada,label:`ðŸ”§ ${o.dtEntrada} â€” ${o.tipo} Â· ${o.descricao?.slice(0,40)} Â· ${o.status}`,color:C.red})),
              ...vPneus.map(p=>({tipo:"pneu",dt:p.dtTroca,label:`ðŸ”„ ${p.dtTroca} â€” Pneu ${p.posicao}: ${p.marca} (DOT: ${p.dot||"?"})`,color:C.blue})),
            ].sort((a,b)=>(b.dt||"").localeCompare(a.dt||"")).map((e,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:e.color,flexShrink:0,marginTop:5}}/>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{e.label}</div>
              </div>
            ))}
            {[...vAbast,...vCheck,...vManut,...vPneus].length===0&&<div style={{color:C.muted,fontSize:12,textAlign:"center",padding:16}}>Sem registros para este veÃ­culo.</div>}
          </div>
        </Card>;
      })}
    </div>}

    {/* â”€â”€ CUSTOS â”€â”€ */}
    {tab==="custos"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      {veiculos.map(v=>{
        const vAbast=abastecimentos.filter(a=>a.veiculoId===v.id);
        const vManut=manutOS.filter(o=>o.veiculoId===v.id);
        const gastoComb=vAbast.reduce((s,a)=>s+(parseFloat(a.valor)||0),0);
        const gastoManut=vManut.reduce((s,o)=>s+(o.pecas?.reduce((ps,p)=>ps+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0),0);
        const totalLitrosV=vAbast.reduce((s,a)=>s+(parseFloat(a.litros)||0),0);
        const kmAtual=getKmAtual(v.id);
        const kmBase=parseInt(v.kmCadastro)||0;
        const kmRodados=kmAtual-kmBase;
        const custoKm=kmRodados>0?((gastoComb+gastoManut)/kmRodados).toFixed(2):null;
        const consumo=getConsumo(v.id);
        if(gastoComb===0&&gastoManut===0)return null;
        return <Card key={v.id} style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:15}}>{v.placa}</span>
              <span style={{fontSize:13,color:C.txt,marginLeft:10}}>{v.modelo} {v.ano}</span>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {custoKm&&<Bdg color="grn">R$ {custoKm}/km</Bdg>}
              {consumo&&<Bdg color="blue">{consumo} km/L</Bdg>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
            {[
              {l:"COMBUSTÃVEL",v:`R$ ${fmt(Math.round(gastoComb))}`,c:C.gold,i:"â›½"},
              {l:"MANUTENÃ‡ÃƒO",v:`R$ ${fmt(Math.round(gastoManut))}`,c:C.red,i:"ðŸ”§"},
              {l:"TOTAL GERAL",v:`R$ ${fmt(Math.round(gastoComb+gastoManut))}`,c:C.grn,i:"ðŸ’°"},
              {l:"KM RODADOS",v:fmt(kmRodados),c:C.blue,i:"ðŸ›£ï¸"},
            ].map((s,i)=>(
              <div key={i} style={{background:C.surf,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:9,color:C.muted,marginBottom:4}}>{s.i} {s.l}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:14,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
        </Card>;
      }).filter(Boolean)}
      {veiculos.filter(v=>{
        const gastoComb=abastecimentos.filter(a=>a.veiculoId===v.id).reduce((s,a)=>s+(parseFloat(a.valor)||0),0);
        const gastoManut=manutOS.filter(o=>o.veiculoId===v.id).reduce((s,o)=>s+(o.pecas?.reduce((ps,p)=>ps+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0),0);
        return gastoComb===0&&gastoManut===0;
      }).length===veiculos.length&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Sem dados de custo ainda.</span></Card>}
    </div>}

    {/* â”€â”€ MODAIS â”€â”€ */}

    {/* Fotos */}
    {modalFotos&&<div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:12,width:"100%",maxWidth:700,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,color:C.txt}}>ðŸ–¼ï¸ Fotos â€” {modalFotos.placa} {modalFotos.modelo}</span>
          <button onClick={()=>setModalFotos(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>âœ•</button>
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

    {/* Documento PDF */}
    {modalDoc&&<div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:12,width:"100%",maxWidth:700,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,color:C.txt}}>ðŸ“„ Documento â€” {modalDoc.placa}</span>
          <div style={{display:"flex",gap:8}}>
            <Btn size="sm" color="gold" onClick={()=>window.open(modalDoc.docPDF,"_blank")}>â¬‡ï¸ Abrir PDF</Btn>
            <button onClick={()=>setModalDoc(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>âœ•</button>
          </div>
        </div>
        <div style={{flex:1,padding:20}}><iframe src={modalDoc.docPDF} title="Doc" style={{width:"100%",height:"60vh",border:"none",borderRadius:8}}/></div>
      </div>
    </div>}

    {/* Modal Cadastro VeÃ­culo */}
    {modalVeic&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:680,height:isMobile?"95vh":"94vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>ðŸš— {modalVeic==="new"?"Cadastrar":"Editar"} VeÃ­culo</h2>
          <button onClick={()=>setModalVeic(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          {/* Dados bÃ¡sicos */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>ðŸ“‹ DADOS DO VEÃCULO</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
              <Inp label="Placa *" value={formVeic.placa} onChange={v=>setFormVeic(f=>({...f,placa:v.toUpperCase()}))} placeholder="ABC-1234"/>
              <Inp label="Modelo *" value={formVeic.modelo} onChange={v=>setFormVeic(f=>({...f,modelo:v}))} placeholder="Ex: Fiat Toro"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:10,marginTop:10}}>
              <Inp label="Ano" value={formVeic.ano} onChange={v=>setFormVeic(f=>({...f,ano:v}))} type="number" placeholder="2024"/>
              <Inp label="Cor" value={formVeic.cor} onChange={v=>setFormVeic(f=>({...f,cor:v}))} placeholder="Branco"/>
              <Inp label="KM Cadastro" value={formVeic.kmCadastro} onChange={v=>setFormVeic(f=>({...f,kmCadastro:v}))} type="number" placeholder="45000"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginTop:10}}>
              <Inp label="Data AquisiÃ§Ã£o" value={formVeic.dtAquisicao} onChange={v=>setFormVeic(f=>({...f,dtAquisicao:v}))} type="date"/>
              <Sel label="TÃ©cnico ResponsÃ¡vel" value={formVeic.tecnicoId} onChange={v=>setFormVeic(f=>({...f,tecnicoId:v}))} options={[{value:"",label:"â€” Sem responsÃ¡vel â€”"},...techs.map(t=>({value:t.id,label:t.name}))]}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginTop:10}}>
              <Sel label="Status" value={formVeic.status} onChange={v=>setFormVeic(f=>({...f,status:v}))} options={STATUS_OPTS.map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))}/>
              <Inp label="ObservaÃ§Ãµes" value={formVeic.obs} onChange={v=>setFormVeic(f=>({...f,obs:v}))} placeholder="Obs opcionais"/>
            </div>
          </div>
          {/* Vencimentos */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>ðŸ“… VENCIMENTOS</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
              <Inp label="Venc. IPVA" value={formVeic.vencIPVA||""} onChange={v=>setFormVeic(f=>({...f,vencIPVA:v}))} type="date"/>
              <Inp label="Venc. Licenciamento" value={formVeic.vencLicenc||""} onChange={v=>setFormVeic(f=>({...f,vencLicenc:v}))} type="date"/>
              <Inp label="Venc. Seguro" value={formVeic.vencSeguro||""} onChange={v=>setFormVeic(f=>({...f,vencSeguro:v}))} type="date"/>
            </div>
          </div>
          {/* Documento PDF */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>ðŸ“„ DOCUMENTO DO VEÃCULO (PDF)</div>
            {formVeic.docPDF?(
              <div style={{display:"flex",alignItems:"center",gap:12,background:C.card,borderRadius:8,padding:"12px 14px",border:`1px solid ${C.bdr2}`}}>
                <span style={{fontSize:28}}>ðŸ“„</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.grn}}>âœ“ Documento anexado</div></div>
                <div style={{display:"flex",gap:8}}>
                  <Btn size="xs" color="gold" onClick={()=>window.open(formVeic.docPDF,"_blank")}>Ver</Btn>
                  <button onClick={()=>setFormVeic(f=>({...f,docPDF:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>âœ•</button>
                </div>
              </div>
            ):(
              <label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:C.card,border:`2px dashed ${C.bdr2}`,borderRadius:8,padding:"14px 18px"}}>
                <span style={{fontSize:28}}>ðŸ“„</span>
                <div><div style={{fontSize:13,fontWeight:600,color:C.txt}}>Anexar CRVL / Licenciamento</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>PDF Â· MÃ¡x 5MB</div></div>
                <input type="file" accept=".pdf,application/pdf" onChange={handleDocPDF} style={{display:"none"}}/>
              </label>
            )}
          </div>
          {/* 4 Fotos */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>ðŸ“¸ FOTOS (4 Ã¢ngulos)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {FOTOS_LABELS.map((label,i)=>(
                <div key={i} style={{borderRadius:8,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
                  <div style={{background:C.card,padding:"6px 10px",fontSize:11,fontWeight:700,color:C.muted}}>{FOTOS_ICONS[i]} {label}</div>
                  {formVeic.fotos?.[i]?(
                    <div style={{position:"relative"}}>
                      <img src={formVeic.fotos[i]} alt={label} style={{width:"100%",height:110,objectFit:"cover"}}/>
                      <button onClick={()=>setFormVeic(f=>({...f,fotos:f.fotos.map((ft,j)=>j===i?"":ft)}))} style={{position:"absolute",top:4,right:4,background:"#000000bb",color:"#fff",border:"none",borderRadius:4,width:22,height:22,cursor:"pointer",fontSize:12}}>âœ•</button>
                    </div>
                  ):(
                    <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:110,cursor:"pointer",background:C.bg,gap:4}}>
                      <span style={{fontSize:22}}>ðŸ“·</span><span style={{fontSize:10,color:C.muted}}>Foto</span>
                      <input type="file" accept="image/*" capture="environment" onChange={e=>handleFotoVeic(i,e)} style={{display:"none"}}/>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
          {errVeic&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>âš ï¸ {errVeic}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalVeic(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarVeic}>âœ… Salvar VeÃ­culo</Btn>
        </div>
      </div>
    </div>}

    {/* Modal Abastecimento */}
    {modalAbast&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:560,height:isMobile?"95vh":"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>â›½ Registrar Abastecimento</h2>
          <button onClick={()=>setModalAbast(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="VeÃ­culo *" value={formAbast.veiculoId} onChange={v=>setFormAbast(f=>({...f,veiculoId:v}))} options={[{value:"",label:"â€” Selecionar â€”"},...veiculos.map(v=>({value:v.id,label:`${v.placa} â€” ${v.modelo}`}))]}/>
            <Inp label="Data *" value={formAbast.dtAbast} onChange={v=>setFormAbast(f=>({...f,dtAbast:v}))} type="date"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:10}}>
            <Sel label="CombustÃ­vel" value={formAbast.combustivel} onChange={v=>setFormAbast(f=>({...f,combustivel:v}))} options={COMB_OPTS.map(c=>({value:c,label:c.charAt(0).toUpperCase()+c.slice(1)}))}/>
            <Inp label="Litros *" value={formAbast.litros} onChange={v=>setFormAbast(f=>({...f,litros:v}))} type="number" placeholder="0,00"/>
            <Inp label="Valor R$ *" value={formAbast.valor} onChange={v=>setFormAbast(f=>({...f,valor:v}))} type="number" placeholder="0,00"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Inp label="OdÃ´metro (Km) *" value={formAbast.odometro} onChange={v=>setFormAbast(f=>({...f,odometro:v}))} type="number" placeholder="Ex: 45320"/>
            <Inp label="Posto / Local" value={formAbast.posto} onChange={v=>setFormAbast(f=>({...f,posto:v}))} placeholder="Nome do posto"/>
          </div>
          {formAbast.litros&&formAbast.valor&&parseFloat(formAbast.litros)>0&&(
            <div style={{background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:C.muted}}>PreÃ§o por litro:</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>R$ {(parseFloat(formAbast.valor)/parseFloat(formAbast.litros)).toFixed(2)}/L</span>
            </div>
          )}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>ðŸ“¸ Nota Fiscal</div>
            {formAbast.foto?(
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <img src={formAbast.foto} alt="nota" style={{width:80,height:80,objectFit:"cover",borderRadius:8,border:`2px solid ${C.gold}55`}}/>
                <button onClick={()=>setFormAbast(f=>({...f,foto:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12}}>âœ• Remover</button>
              </div>
            ):(
              <label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:C.card,border:`2px dashed ${C.bdr2}`,borderRadius:8,padding:"12px 16px"}}>
                <span style={{fontSize:24}}>ðŸ“·</span>
                <div><div style={{fontSize:13,fontWeight:600,color:C.txt}}>Tirar foto da nota</div><div style={{fontSize:11,color:C.muted}}>JPG, PNG Â· MÃ¡x 3MB</div></div>
                <input type="file" accept="image/*" capture="environment" onChange={handleFotoAbast} style={{display:"none"}}/>
              </label>
            )}
          </div>
          {errAbast&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>âš ï¸ {errAbast}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalAbast(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarAbast}>âœ… Registrar</Btn>
        </div>
      </div>
    </div>}

    {/* Modal Checklist */}
    {modalCheck&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:640,height:isMobile?"95vh":"92vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>{formCheck.tipo==="retirada"?"ðŸš— Checklist de Retirada":"â†©ï¸ Checklist de DevoluÃ§Ã£o"}</h2>
            <p style={{fontSize:11,color:C.muted,marginTop:2}}>Registre as condiÃ§Ãµes do veÃ­culo</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
              {["retirada","devolucao"].map(t=>(
                <div key={t} onClick={()=>setFormCheck(f=>({...f,tipo:t}))} style={{padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:600,background:formCheck.tipo===t?C.gold:"transparent",color:formCheck.tipo===t?"#000":C.muted}}>{t==="retirada"?"ðŸš—":"â†©ï¸"} {t}</div>
              ))}
            </div>
            <button onClick={()=>setModalCheck(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>âœ•</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="VeÃ­culo *" value={formCheck.veiculoId} onChange={v=>setFormCheck(f=>({...f,veiculoId:v}))} options={[{value:"",label:"â€” Selecionar â€”"},...veiculos.map(v=>({value:v.id,label:`${v.placa} â€” ${v.modelo}`}))]}/>
            <Inp label="Data" value={formCheck.dtCheck} onChange={v=>setFormCheck(f=>({...f,dtCheck:v}))} type="date"/>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>ðŸ›£ï¸ QUILOMETRAGEM *</div>
            <Inp label="KM Atual" value={formCheck.km} onChange={v=>setFormCheck(f=>({...f,km:v}))} type="number" placeholder="Ex: 45320"/>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>â›½ NÃVEL DE COMBUSTÃVEL</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {COMB_NIVEL.map(n=>(
                <div key={n} onClick={()=>setFormCheck(f=>({...f,combustivel:n}))} style={{flex:1,minWidth:60,textAlign:"center",padding:"10px 8px",borderRadius:8,cursor:"pointer",border:`2px solid ${formCheck.combustivel===n?COMB_COLOR[n]:C.bdr2}`,background:formCheck.combustivel===n?`${COMB_COLOR[n]}22`:"transparent"}}>
                  <div style={{fontSize:16,marginBottom:4}}>â›½</div>
                  <div style={{fontSize:11,fontWeight:700,color:formCheck.combustivel===n?COMB_COLOR[n]:C.muted}}>{n.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>ðŸ”„ PNEUS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["diant_esq","â†™ï¸ Diant. Esq"],["diant_dir","â†˜ï¸ Diant. Dir"],["tras_esq","â†–ï¸ Tras. Esq"],["tras_dir","â†—ï¸ Tras. Dir"]].map(([key,label])=>(
                <div key={key} style={{background:C.card,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.bdr2}`}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{label}</div>
                  <div style={{display:"flex",gap:6}}>
                    {PNEU_OPTS.map(p=>(
                      <div key={p} onClick={()=>setFormCheck(f=>({...f,pneus:{...f.pneus,[key]:p}}))} style={{flex:1,textAlign:"center",padding:"6px 4px",borderRadius:6,cursor:"pointer",border:`2px solid ${formCheck.pneus?.[key]===p?PNEU_COLOR[p]:C.bdr2}`,background:formCheck.pneus?.[key]===p?`${PNEU_COLOR[p]}22`:"transparent",fontSize:10,fontWeight:700,color:formCheck.pneus?.[key]===p?PNEU_COLOR[p]:C.muted}}>
                        {PNEU_ICON[p]}<br/>{p}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${formCheck.avarias?`${C.ylw}55`:C.bdr}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:formCheck.avarias?12:0}}>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",flex:1}}>âš ï¸ AVARIAS</div>
              <div style={{display:"flex",gap:8}}>
                {[{v:false,l:"âœ… Sem avarias"},{v:true,l:"âš ï¸ Com avarias"}].map(opt=>(
                  <div key={String(opt.v)} onClick={()=>setFormCheck(f=>({...f,avarias:opt.v}))} style={{padding:"7px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,border:`2px solid ${formCheck.avarias===opt.v?(opt.v?C.ylw:C.grn):C.bdr2}`,background:formCheck.avarias===opt.v?`${opt.v?C.ylw:C.grn}22`:"transparent",color:formCheck.avarias===opt.v?(opt.v?C.ylw:C.grn):C.muted}}>{opt.l}</div>
                ))}
              </div>
            </div>
            {formCheck.avarias&&<div>
              <label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>DescriÃ§Ã£o</label>
              <textarea value={formCheck.descAvarias} onChange={e=>setFormCheck(f=>({...f,descAvarias:e.target.value}))} rows={3} placeholder="Descreva as avarias..." style={{width:"100%",background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
            </div>}
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>ðŸ“¸ FOTOS</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>ðŸ“Ÿ Foto do OdÃ´metro</div>
              {formCheck.fotoOdometro?(
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <img src={formCheck.fotoOdometro} alt="odÃ´metro" style={{width:80,height:70,objectFit:"cover",borderRadius:8,border:`2px solid ${C.gold}55`}}/>
                  <button onClick={()=>setFormCheck(f=>({...f,fotoOdometro:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12}}>âœ•</button>
                </div>
              ):(
                <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",background:C.card,border:`1.5px dashed ${C.bdr2}`,borderRadius:8,padding:"10px 16px"}}>
                  <span style={{fontSize:20}}>ðŸ“·</span><span style={{fontSize:12,color:C.muted}}>Fotografar odÃ´metro</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleFotoOdo} style={{display:"none"}}/>
                </label>
              )}
            </div>
            {formCheck.avarias&&<div>
              <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>âš ï¸ Fotos das Avarias (atÃ© 3)</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {formCheck.fotosAvarias.map((foto,i)=>foto?(
                  <div key={i} style={{position:"relative"}}>
                    <img src={foto} alt={`avaria`} style={{width:80,height:70,objectFit:"cover",borderRadius:8,border:`2px solid ${C.ylw}55`}}/>
                    <button onClick={()=>setFormCheck(f=>({...f,fotosAvarias:f.fotosAvarias.map((ft,j)=>j===i?"":ft)}))} style={{position:"absolute",top:2,right:2,background:"#000000bb",color:"#fff",border:"none",borderRadius:4,width:18,height:18,cursor:"pointer",fontSize:10}}>âœ•</button>
                  </div>
                ):(
                  <label key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:80,height:70,cursor:"pointer",background:C.card,border:`1.5px dashed ${C.bdr2}`,borderRadius:8}}>
                    <span style={{fontSize:18}}>ðŸ“·</span><span style={{fontSize:9,color:C.muted}}>Avaria {i+1}</span>
                    <input type="file" accept="image/*" capture="environment" onChange={e=>handleFotoAvaria(i,e)} style={{display:"none"}}/>
                  </label>
                ))}
              </div>
            </div>}
          </div>
          {errCheck&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>âš ï¸ {errCheck}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalCheck(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarCheck}>âœ… Registrar {formCheck.tipo==="retirada"?"Retirada":"DevoluÃ§Ã£o"}</Btn>
        </div>
      </div>
    </div>}

    {/* Modal Pneu */}
    {modalPneu&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:480,maxHeight:isMobile?"88vh":"82vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>ðŸ”„ Registrar Pneu</h2>
          <button onClick={()=>setModalPneu(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Sel label="VeÃ­culo *" value={formPneu.veiculoId} onChange={v=>setFormPneu(f=>({...f,veiculoId:v}))} options={[{value:"",label:"â€” Selecionar â€”"},...veiculos.map(v=>({value:v.id,label:`${v.placa} â€” ${v.modelo}`}))]}/>
          <Sel label="PosiÃ§Ã£o" value={formPneu.posicao} onChange={v=>setFormPneu(f=>({...f,posicao:v}))} options={[{value:"diant_esq",label:"â†™ï¸ Dianteiro Esquerdo"},{value:"diant_dir",label:"â†˜ï¸ Dianteiro Direito"},{value:"tras_esq",label:"â†–ï¸ Traseiro Esquerdo"},{value:"tras_dir",label:"â†—ï¸ Traseiro Direito"},{value:"estepe",label:"ðŸ”„ Estepe"}]}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Marca *" value={formPneu.marca} onChange={v=>setFormPneu(f=>({...f,marca:v}))} placeholder="Ex: Michelin"/>
            <Inp label="DOT" value={formPneu.dot} onChange={v=>setFormPneu(f=>({...f,dot:v}))} placeholder="Ex: 2024"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Data de Troca" value={formPneu.dtTroca} onChange={v=>setFormPneu(f=>({...f,dtTroca:v}))} type="date"/>
            <Inp label="KM na Troca" value={formPneu.kmTroca} onChange={v=>setFormPneu(f=>({...f,kmTroca:v}))} type="number" placeholder="45000"/>
          </div>
          <Inp label="ObservaÃ§Ãµes" value={formPneu.obs} onChange={v=>setFormPneu(f=>({...f,obs:v}))} placeholder="Recapagem, rodÃ­zio, etc."/>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalPneu(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarPneu}>âœ… Salvar Pneu</Btn>
        </div>
      </div>
    </div>}
  </div>;
}


/* â”€â”€ MANUTENÃ‡ÃƒO (MECÃ‚NICO) â”€â”€ */
function ManutencaoPage({manutSols,setManutSols,manutOS,setManutOS,veiculos,users,currentUser,addLog,isMobile}){
  const isMec=currentUser.role==="mecanico";
  const isAdm=currentUser.role==="admin"||currentUser.role==="superadmin";
  const[tab,setTab]=useState("sols");
  const[modalSol,setModalSol]=useState(false);
  const[modalOS,setModalOS]=useState(null);

  const blankSol=()=>({id:uid(),veiculoId:"",solicitanteId:currentUser.id,tipo:"corretiva",urgencia:"normal",descricao:"",status:"aberta",dtSol:now(),obs:""});
  const blankOS=()=>({id:uid(),solicitacaoId:"",veiculoId:"",mecanicoId:currentUser.id,tipo:"corretiva",descricao:"",kmEntrada:"",kmSaida:"",dtEntrada:new Date().toISOString().slice(0,10),dtSaida:"",pecas:[],servicos:"",status:"aberta",obs:""});
  const blankPeca=()=>({id:uid(),nome:"",qtd:"1",valor:""});

  const[formSol,setFormSol]=useState(blankSol());
  const[formOS,setFormOS]=useState(blankOS());
  const[errSol,setErrSol]=useState("");
  const[errOS,setErrOS]=useState("");

  const TYPE_OPTS=["corretiva","preventiva","revisÃ£o","elÃ©trica","pneus","outros"];
  const URG_COLOR={normal:C.muted,alta:C.ylw,urgente:C.red};
  const STATUS_SOL_COLOR={aberta:"ylw",analisada:"blue",aprovada:"grn",pendente_fin:"gold",liberada:"blue",em_andamento:"blue",concluida:"grn",cancelada:"red"};
  const STATUS_SOL_LABEL={aberta:"â³ Aberta",analisada:"ðŸ” Analisada",aprovada:"âœ… Aprovada",pendente_fin:"ðŸ’° Ag. Financeiro",liberada:"ðŸ”“ Liberada",em_andamento:"ðŸ”§ Em Andamento",concluida:"âœ… ConcluÃ­da",cancelada:"âŒ Cancelada"};
  const STATUS_OS_COLOR={aberta:"ylw",em_andamento:"blue",concluida:"grn"};
  const STATUS_OS_LABEL={aberta:"â³ Aberta",em_andamento:"ðŸ”§ Em Andamento",concluida:"âœ… ConcluÃ­da"};

  const getVeic=(id)=>veiculos.find(v=>v.id===id);
  const getUser=(id)=>users.find(u=>u.id===id);
  const totalPecas=(os)=>os.pecas?.reduce((a,p)=>a+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0;

  const salvarSol=()=>{
    if(!formSol.veiculoId){setErrSol("Selecione o veÃ­culo.");return;}
    if(!formSol.descricao.trim()){setErrSol("Descreva o problema.");return;}
    setManutSols(p=>[{...formSol,id:uid()},...p]);
    addLog(currentUser.name,"ManutenÃ§Ã£o","SolicitaÃ§Ã£o: "+formSol.tipo+" Â· "+(getVeic(formSol.veiculoId)?.placa||"?"));
    setModalSol(false);setErrSol("");setFormSol(blankSol());
  };

  const salvarOS=()=>{
    if(!formOS.veiculoId){setErrOS("Selecione o veÃ­culo.");return;}
    if(!formOS.descricao.trim()){setErrOS("Descreva o serviÃ§o.");return;}
    if(modalOS==="new"){
      setManutOS(p=>[{...formOS,id:uid()},...p]);
      addLog(currentUser.name,"OS MecÃ¢nica","Aberta: "+(getVeic(formOS.veiculoId)?.placa||"?")+" Â· "+formOS.tipo);
    } else {
      setManutOS(p=>p.map(o=>o.id===modalOS?{...formOS}:o));
      addLog(currentUser.name,"OS MecÃ¢nica","Atualizada: "+(getVeic(formOS.veiculoId)?.placa||"?"));
    }
    setModalOS(null);setErrOS("");
  };

  const concluirOS=(os,kmSaida)=>{
    setManutOS(p=>p.map(o=>o.id===os.id?{...o,status:"concluida",kmSaida,dtSaida:new Date().toISOString().slice(0,10)}:o));
    if(os.solicitacaoId) setManutSols(p=>p.map(s=>s.id===os.solicitacaoId?{...s,status:"concluida"}:s));
    addLog(currentUser.name,"OS MecÃ¢nica","ConcluÃ­da: "+(getVeic(os.veiculoId)?.placa||"?"));
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>ðŸ”© ManutenÃ§Ã£o</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>SolicitaÃ§Ãµes e ordens de serviÃ§o</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn color="gold" size="sm" onClick={()=>{setFormSol(blankSol());setModalSol(true);setErrSol("");}}>+ SolicitaÃ§Ã£o</Btn>
        {(isAdm||isMec)&&<Btn color="red" size="sm" onClick={()=>{setFormOS(blankOS());setModalOS("new");setErrOS("");}}>ðŸ”§ Nova OS</Btn>}
      </div>
    </div>

    {/* Resumo */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
      {[
        {l:"SOLICITAÃ‡Ã•ES",v:fmt(manutSols.length),i:"ðŸ“‹",c:C.gold},
        {l:"EM ABERTO",v:fmt(manutSols.filter(s=>s.status==="aberta").length),i:"â³",c:C.ylw},
        {l:"OS ABERTAS",v:fmt(manutOS.filter(o=>o.status!=="concluida").length),i:"ðŸ”§",c:C.red},
        {l:"CONCLUÃDAS",v:fmt(manutOS.filter(o=>o.status==="concluida").length),i:"âœ…",c:C.grn},
      ].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?12:14,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${s.c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{s.i}</div>
          <div><div style={{fontSize:9,fontWeight:700,color:C.muted}}>{s.l}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?16:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
        </Card>
      ))}
    </div>

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`}}>
      {[{k:"sols",l:"ðŸ“‹ SolicitaÃ§Ãµes"},{k:"os",l:"ðŸ”§ Ordens de ServiÃ§o"},{k:"hist",l:"ðŸ“Š HistÃ³rico"}].map(t=>(
        <div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>
      ))}
    </div>

    {/* SolicitaÃ§Ãµes */}
    {tab==="sols"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {manutSols.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhuma solicitaÃ§Ã£o ainda. Clique em "+ SolicitaÃ§Ã£o".</span></Card>}
      {manutSols.map(s=>{
        const v=getVeic(s.veiculoId);
        const sol=getUser(s.solicitanteId);
        const osVinc=manutOS.find(o=>o.solicitacaoId===s.id);
        return <Card key={s.id} style={{padding:16,borderLeft:`3px solid ${C[STATUS_SOL_COLOR[s.status]]||C.gold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <Bdg color={STATUS_SOL_COLOR[s.status]||"gold"}>{STATUS_SOL_LABEL[s.status]||s.status}</Bdg>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v?.placa||"?"}</span>
                <span style={{fontSize:12,color:C.txt}}>{v?.modelo||""}</span>
                {s.urgencia==="urgente"&&<Bdg color="red">ðŸ”´ URGENTE</Bdg>}
                {s.urgencia==="alta"&&<Bdg color="ylw">ðŸŸ¡ Alta</Bdg>}
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:4}}>ðŸ”§ {s.tipo} Â· {sol?.name||"?"} Â· {s.dtSol}</div>
              <div style={{fontSize:13,color:C.txt2}}>{s.descricao}</div>
              {osVinc&&<div style={{marginTop:8,background:C.surf,borderRadius:6,padding:"6px 10px",fontSize:11,color:C.muted}}>OS vinculada: <strong style={{color:C.gold}}>#{osVinc.id.slice(-4)}</strong> â€” {STATUS_OS_LABEL[osVinc.status]}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {isMec&&s.status==="aberta"&&<Btn size="xs" color="blue" onClick={()=>setManutSols(p=>p.map(x=>x.id===s.id?{...x,status:"analisada",analisadoPor:currentUser.name,dtAnalise:now()}:x))}>ðŸ” Analisar</Btn>}
              {isAdm&&s.status==="analisada"&&<Btn size="xs" color="grn" onClick={()=>setManutSols(p=>p.map(x=>x.id===s.id?{...x,status:"aprovada",aprovadoPor:currentUser.name,dtAprovacao:now()}:x))}>âœ… Aprovar</Btn>}
              {currentUser.role==="financeiro"&&s.status==="aprovada"&&<Btn size="xs" color="gold" onClick={()=>setManutSols(p=>p.map(x=>x.id===s.id?{...x,status:"liberada",liberadoPor:currentUser.name,dtLiberacao:now()}:x))}>ðŸ”“ Liberar</Btn>}
              {(isAdm||isMec)&&(s.status==="aberta"||s.status==="liberada")&&<Btn size="xs" color="gold" onClick={()=>{setFormOS({...blankOS(),solicitacaoId:s.id,veiculoId:s.veiculoId,tipo:s.tipo,descricao:s.descricao});setModalOS("new");setTab("os");}}>ðŸ”§ Criar OS</Btn>}
              {(isAdm||isMec)&&s.status!=="concluida"&&s.status!=="cancelada"&&<Btn size="xs" color="red" outline onClick={()=>setManutSols(p=>p.map(x=>x.id===s.id?{...x,status:"cancelada"}:x))}>Cancelar</Btn>}
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* OS */}
    {tab==="os"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {manutOS.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhuma OS. Clique em "ðŸ”§ Nova OS".</span></Card>}
      {manutOS.map(os=>{
        const v=getVeic(os.veiculoId);
        const mec=getUser(os.mecanicoId);
        const tp=totalPecas(os);
        return <Card key={os.id} style={{padding:16,borderLeft:`3px solid ${C[STATUS_OS_COLOR[os.status]]||C.gold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <Bdg color={STATUS_OS_COLOR[os.status]||"gold"}>{STATUS_OS_LABEL[os.status]||os.status}</Bdg>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v?.placa||"?"}</span>
                <span style={{fontSize:13,color:C.txt}}>{v?.modelo||""}</span>
                <span style={{fontSize:11,color:C.muted}}>ðŸ”§ {os.tipo}</span>
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:6}}>ðŸ‘¨â€ðŸ”§ {mec?.name||"?"} Â· {os.dtEntrada}{os.dtSaida&&` â†’ ${os.dtSaida}`}</div>
              <div style={{fontSize:13,color:C.txt2,marginBottom:6}}>{os.descricao}</div>
              <div style={{display:"flex",gap:14,fontSize:12,flexWrap:"wrap"}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>KM entrada: <strong style={{color:C.txt}}>{fmt(parseInt(os.kmEntrada)||0)}</strong></span>
                {os.kmSaida&&<span style={{fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>KM saÃ­da: <strong style={{color:C.txt}}>{fmt(parseInt(os.kmSaida)||0)}</strong></span>}
              </div>
              {os.servicos&&<div style={{fontSize:12,color:C.txt2,marginTop:4}}><strong>ServiÃ§os:</strong> {os.servicos}</div>}
              {os.pecas?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                {os.pecas.map((p,i)=>(
                  <div key={i} style={{background:C.surf,borderRadius:6,padding:"4px 10px",fontSize:11,border:`1px solid ${C.bdr}`}}>{p.nome} Ã—{p.qtd}{p.valor&&<span style={{color:C.gold}}> R${(parseFloat(p.valor)*parseInt(p.qtd)).toFixed(2)}</span>}</div>
                ))}
                {tp>0&&<div style={{fontSize:12,color:C.grn,fontWeight:700,alignSelf:"center"}}>Total: R${tp.toFixed(2)}</div>}
              </div>}
            </div>
            {os.status!=="concluida"&&(isAdm||isMec)&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
              <Btn size="xs" color="gold" outline onClick={()=>{setFormOS({...os,pecas:os.pecas||[]});setModalOS(os.id);}}>Editar</Btn>
              <Btn size="xs" color="grn" onClick={()=>{const km=prompt("KM de saÃ­da:");if(km)concluirOS(os,km);}}>âœ… Concluir</Btn>
            </div>}
          </div>
        </Card>;
      })}
    </div>}

    {/* HistÃ³rico por veÃ­culo */}
    {tab==="hist"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {veiculos.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum veÃ­culo cadastrado.</span></Card>}
      {veiculos.map(v=>{
        const osV=manutOS.filter(o=>o.veiculoId===v.id);
        const solV=manutSols.filter(s=>s.veiculoId===v.id);
        if(!osV.length&&!solV.length) return null;
        return <Card key={v.id} style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",background:C.surf,borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v.placa}</span>
              <span style={{fontSize:13,color:C.txt}}>{v.modelo} {v.ano}</span>
            </div>
            <span style={{fontSize:12,color:C.muted}}>{fmt(osV.length)} OS Â· {fmt(solV.length)} Sol.</span>
          </div>
          {osV.map(os=>(
            <div key={os.id} style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}18`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:2}}>
                  <Bdg color={STATUS_OS_COLOR[os.status]||"gold"}>{STATUS_OS_LABEL[os.status]}</Bdg>
                  <span style={{fontSize:12,color:C.txt}}>{os.tipo} â€” {os.descricao.slice(0,50)}</span>
                </div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>KM {fmt(parseInt(os.kmEntrada)||0)} â†’ {os.kmSaida?fmt(parseInt(os.kmSaida)):"-"} Â· {os.dtEntrada}</span>
              </div>
              {totalPecas(os)>0&&<span style={{fontSize:12,color:C.grn,fontWeight:700}}>R${totalPecas(os).toFixed(2)}</span>}
            </div>
          ))}
        </Card>;
      }).filter(Boolean)}
    </div>}

    {/* Modal SolicitaÃ§Ã£o */}
    {modalSol&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:560,maxHeight:isMobile?"92vh":"85vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>ðŸ“‹ Nova SolicitaÃ§Ã£o</h2>
          <button onClick={()=>setModalSol(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Sel label="VeÃ­culo *" value={formSol.veiculoId} onChange={v=>setFormSol(f=>({...f,veiculoId:v}))} options={[{value:"",label:"â€” Selecionar â€”"},...veiculos.map(v=>({value:v.id,label:`${v.placa} â€” ${v.modelo}`}))]}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Sel label="Tipo" value={formSol.tipo} onChange={v=>setFormSol(f=>({...f,tipo:v}))} options={TYPE_OPTS.map(t=>({value:t,label:t.charAt(0).toUpperCase()+t.slice(1)}))}/>
            <Sel label="UrgÃªncia" value={formSol.urgencia} onChange={v=>setFormSol(f=>({...f,urgencia:v}))} options={[{value:"normal",label:"Normal"},{value:"alta",label:"ðŸŸ¡ Alta"},{value:"urgente",label:"ðŸ”´ Urgente"}]}/>
          </div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>DescriÃ§Ã£o *</label><textarea value={formSol.descricao} onChange={e=>setFormSol(f=>({...f,descricao:e.target.value}))} rows={4} placeholder="Descreva o problema..." style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/></div>
          {errSol&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>âš ï¸ {errSol}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalSol(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarSol}>âœ… Enviar SolicitaÃ§Ã£o</Btn>
        </div>
      </div>
    </div>}

    {/* Modal OS */}
    {modalOS&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:640,height:isMobile?"95vh":"90vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>ðŸ”§ {modalOS==="new"?"Nova OS":"Editar OS"}</h2>
          <button onClick={()=>setModalOS(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Sel label="VeÃ­culo *" value={formOS.veiculoId} onChange={v=>setFormOS(f=>({...f,veiculoId:v}))} options={[{value:"",label:"â€” Selecionar â€”"},...veiculos.map(v=>({value:v.id,label:`${v.placa} â€” ${v.modelo}`}))]}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Sel label="Tipo" value={formOS.tipo} onChange={v=>setFormOS(f=>({...f,tipo:v}))} options={TYPE_OPTS.map(t=>({value:t,label:t.charAt(0).toUpperCase()+t.slice(1)}))}/>
            <Sel label="Status" value={formOS.status} onChange={v=>setFormOS(f=>({...f,status:v}))} options={Object.entries(STATUS_OS_LABEL).map(([k,l])=>({value:k,label:l}))}/>
          </div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Problema / DescriÃ§Ã£o *</label><textarea value={formOS.descricao} onChange={e=>setFormOS(f=>({...f,descricao:e.target.value}))} rows={3} style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif",marginBottom:10}}/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>ServiÃ§os Executados</label><textarea value={formOS.servicos} onChange={e=>setFormOS(f=>({...f,servicos:e.target.value}))} rows={2} placeholder="Ex: Troca de Ã³leo..." style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:10}}>
            <Inp label="KM Entrada" value={formOS.kmEntrada} onChange={v=>setFormOS(f=>({...f,kmEntrada:v}))} type="number" placeholder="45000"/>
            <Inp label="KM SaÃ­da" value={formOS.kmSaida} onChange={v=>setFormOS(f=>({...f,kmSaida:v}))} type="number" placeholder="45050"/>
            <Inp label="Data Entrada" value={formOS.dtEntrada} onChange={v=>setFormOS(f=>({...f,dtEntrada:v}))} type="date"/>
            <Inp label="Data SaÃ­da" value={formOS.dtSaida} onChange={v=>setFormOS(f=>({...f,dtSaida:v}))} type="date"/>
          </div>
          {/* PeÃ§as */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase"}}>ðŸ”© PeÃ§as Utilizadas</span>
              <Btn size="xs" color="gold" onClick={()=>setFormOS(f=>({...f,pecas:[...f.pecas,blankPeca()]}))}>+ PeÃ§a</Btn>
            </div>
            {formOS.pecas?.length===0&&<div style={{color:C.muted,fontSize:12,textAlign:"center",padding:"8px 0"}}>Nenhuma peÃ§a</div>}
            {formOS.pecas?.map((p,i)=>(
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"2fr 70px 100px 30px",gap:8,alignItems:"end",marginBottom:8}}>
                <Inp label={i===0?"Nome":"_"} value={p.nome} onChange={v=>setFormOS(f=>({...f,pecas:f.pecas.map((x,j)=>j===i?{...x,nome:v}:x)}))} placeholder="Nome da peÃ§a"/>
                <Inp label={i===0?"Qtd":"_"} value={p.qtd} onChange={v=>setFormOS(f=>({...f,pecas:f.pecas.map((x,j)=>j===i?{...x,qtd:v}:x)}))} type="number"/>
                <Inp label={i===0?"Valor R$":"_"} value={p.valor} onChange={v=>setFormOS(f=>({...f,pecas:f.pecas.map((x,j)=>j===i?{...x,valor:v}:x)}))} type="number"/>
                <button onClick={()=>setFormOS(f=>({...f,pecas:f.pecas.filter((_,j)=>j!==i)}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,height:36,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2}}>âœ•</button>
              </div>
            ))}
            {formOS.pecas?.length>0&&<div style={{textAlign:"right",fontSize:12,color:C.grn,fontWeight:700}}>Total: R${totalPecas(formOS).toFixed(2)}</div>}
          </div>
          <Inp label="ObservaÃ§Ãµes" value={formOS.obs} onChange={v=>setFormOS(f=>({...f,obs:v}))} placeholder="ObservaÃ§Ãµes"/>
          {errOS&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>âš ï¸ {errOS}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalOS(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarOS}>âœ… Salvar OS</Btn>
        </div>
      </div>
    </div>}
  </div>;
}


/* â”€â”€ DOCUMENTAÃ‡ÃƒO / AJUDA â”€â”€ */
function HelpPage({currentUser,isMobile}){
  const[section,setSection]=useState("inicio");
  const isAdm=["admin","superadmin"].includes(currentUser?.role);

  const sections=[
    {k:"inicio",l:"ðŸ  InÃ­cio",icon:"ðŸ "},
    {k:"estoque",l:"ðŸ“¦ Estoque",icon:"ðŸ“¦"},
    {k:"os",l:"ðŸ”§ Ordens de ServiÃ§o",icon:"ðŸ”§"},
    {k:"frota",l:"ðŸš— Frota",icon:"ðŸš—"},
    {k:"relatorios",l:"ðŸ“Š RelatÃ³rios",icon:"ðŸ“Š"},
    {k:"usuarios",l:"ðŸ‘¥ UsuÃ¡rios",icon:"ðŸ‘¥"},
    {k:"faq",l:"â“ FAQ",icon:"â“"},
    {k:"atalhos",l:"âŒ¨ï¸ Atalhos",icon:"âŒ¨ï¸"},
  ];

  const InfoCard=({icon,title,items,color=C.gold})=>(
    <div style={{background:C.surf,borderRadius:10,padding:16,border:`1px solid ${C.bdr}`,marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:20}}>{icon}</span>
        <span style={{fontSize:14,fontWeight:700,color}}>{title}</span>
      </div>
      <ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:8}}>
        {items.map((item,i)=>(
          <li key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{color,fontSize:12,marginTop:2,flexShrink:0}}>â–¶</span>
            <span style={{fontSize:13,color:C.txt2,lineHeight:1.5}}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const TipCard=({tip,color=C.ylw})=>(
    <div style={{background:`${color}15`,border:`1px solid ${color}44`,borderRadius:8,padding:"10px 14px",marginBottom:8,display:"flex",gap:10,alignItems:"flex-start"}}>
      <span style={{fontSize:16,flexShrink:0}}>ðŸ’¡</span>
      <span style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{tip}</span>
    </div>
  );

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div>
      <h1 style={{fontSize:isMobile?17:22,fontWeight:700,color:C.txt}}>ðŸ“š DocumentaÃ§Ã£o & Ajuda</h1>
      <p style={{fontSize:12,color:C.muted,marginTop:4}}>Guia completo do StockTel â€” Sistema de GestÃ£o para Provedores FTTH</p>
    </div>

    {/* Quick stats */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
      {[
        {l:"VERSÃƒO",v:"1.0",i:"ðŸš€",c:C.gold},
        {l:"MÃ“DULOS",v:"15+",i:"ðŸ“¦",c:C.blue},
        {l:"PERFIS",v:"6",i:"ðŸ‘¥",c:C.grn},
        {l:"SUPORTE",v:"24/7",i:"ðŸŽ§",c:C.ylw},
      ].map((s,i)=>(
        <Card key={i} style={{padding:12,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${s.c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{s.i}</div>
          <div>
            <div style={{fontSize:9,fontWeight:700,color:C.muted}}>{s.l}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
          </div>
        </Card>
      ))}
    </div>

    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"220px 1fr",gap:14}}>
      {/* Menu */}
      <Card style={{padding:12,alignSelf:"flex-start"}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>SEÃ‡Ã•ES</div>
        {sections.map(s=>(
          <div key={s.k} onClick={()=>setSection(s.k)}
            style={{padding:"9px 12px",borderRadius:8,cursor:"pointer",marginBottom:4,
              background:section===s.k?`${C.gold}22`:"transparent",
              border:`1px solid ${section===s.k?`${C.gold}55`:"transparent"}`,
              color:section===s.k?C.gold:C.muted,fontSize:13,fontWeight:section===s.k?700:400,
              display:"flex",alignItems:"center",gap:8}}>
            <span>{s.icon}</span>{s.l}
          </div>
        ))}
      </Card>

      {/* Content */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>

        {section==="inicio"&&<>
          <Card style={{padding:20,background:"linear-gradient(135deg,#1a1a1a,#2d0000)"}}>
            <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
              <div style={{fontSize:48}}>ðŸš€</div>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:C.txt}}>Bem-vindo ao StockTel</div>
                <div style={{fontSize:13,color:C.muted,marginTop:4}}>Sistema completo de gestÃ£o para provedores de internet FTTH</div>
                <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Bdg color="grn">Logado como {currentUser?.role}</Bdg>
                  <Bdg color="gold">v1.0.0</Bdg>
                </div>
              </div>
            </div>
          </Card>
          <InfoCard icon="ðŸŽ¯" title="O que Ã© o StockTel?" color={C.gold} items={[
            "Sistema web de gestÃ£o de estoque e operaÃ§Ãµes para provedores FTTH",
            "Controle completo de materiais: ONU, ONT, cabos, conectores, splitters e mais",
            "GestÃ£o de frota: veÃ­culos, abastecimento, manutenÃ§Ã£o e checklists",
            "Ordens de ServiÃ§o com baixa automÃ¡tica do estoque do tÃ©cnico",
            "RelatÃ³rios gerenciais com PDF e Excel profissionais",
            "Acesso via web e celular â€” sincronizaÃ§Ã£o em tempo real via Supabase",
          ]}/>
          <InfoCard icon="ðŸ‘¥" title="Perfis de UsuÃ¡rio" color={C.blue} items={[
            "ðŸ”´ Admin: acesso total â€” gerencia usuÃ¡rios, estoque, frota, relatÃ³rios",
            "ðŸ“¦ Estoque: cadastro e controle de materiais, liberaÃ§Ã£o para tÃ©cnicos",
            "ðŸ”§ TÃ©cnico: kit pessoal, OS, checklists de frota e abastecimento",
            "ðŸ”© MecÃ¢nico: ordens de serviÃ§o de manutenÃ§Ã£o e pneus",
            "ðŸ’° Financeiro: NFs, relatÃ³rios financeiros e aprovaÃ§Ã£o de manutenÃ§Ã£o",
            "ðŸ” ROOT (stocktelmaster): Ãºnico que pode deletar usuÃ¡rios e resetar o sistema",
          ]}/>
          <TipCard tip="Dica: Use o botÃ£o âš™ï¸ Meu Perfil no menu lateral para alterar sua senha e foto de perfil a qualquer momento."/>
        </>}

        {section==="estoque"&&<>
          <InfoCard icon="ðŸ“¦" title="Estoque Base" color={C.gold} items={[
            "Cadastre materiais com cÃ³digo, nome, categoria, unidade e quantidade mÃ­nima",
            "Alertas automÃ¡ticos quando o estoque atinge o nÃ­vel mÃ­nimo (ðŸ”´ CRÃTICO / ðŸŸ¡ BAIXO)",
            "Categorias personalizÃ¡veis: Equipamentos, Cabos, Conectores, AcessÃ³rios, etc.",
            "Entrada via Nota Fiscal: registre o fornecedor, valor e itens recebidos",
          ]}/>
          <InfoCard icon="ðŸŽ’" title="Estoque TÃ©cnico (Kit)" color={C.blue} items={[
            "Cada tÃ©cnico tem seu kit individual de materiais",
            "Admin/Estoque libera materiais do estoque base para o kit do tÃ©cnico",
            "TÃ©cnico registra OS com baixa automÃ¡tica dos materiais do seu kit",
            "DevoluÃ§Ãµes: tÃ©cnico devolve materiais excedentes para o estoque base",
            "RelatÃ³rio de kit por tÃ©cnico disponÃ­vel nos RelatÃ³rios",
          ]}/>
          <InfoCard icon="ðŸ”" title="Fluxo de Materiais" color={C.grn} items={[
            "1ï¸âƒ£ Entrada de NF â†’ material entra no Estoque Base",
            "2ï¸âƒ£ SaÃ­da/LiberaÃ§Ã£o â†’ do Estoque Base para o Kit do TÃ©cnico",
            "3ï¸âƒ£ OS â†’ tÃ©cnico usa materiais do seu kit, baixa automÃ¡tica",
            "4ï¸âƒ£ DevoluÃ§Ã£o â†’ material volta do kit para o Estoque Base",
            "5ï¸âƒ£ SolicitaÃ§Ã£o â†’ tÃ©cnico pede mais materiais pelo app",
          ]}/>
          <TipCard tip="Materiais Preventivos (Ã³leos, correias, pastilhas) ficam em categoria especial no Estoque Base. O MecÃ¢nico pode solicitar diretamente."/>
        </>}

        {section==="os"&&<>
          <InfoCard icon="ðŸ”§" title="Ordens de ServiÃ§o" color={C.red} items={[
            "Registre OS com nÃºmero, cliente, data e materiais utilizados",
            "Baixa automÃ¡tica dos materiais no kit do tÃ©cnico ao salvar a OS",
            "Filtro por perÃ­odo e por tÃ©cnico nos RelatÃ³rios",
            "ExportaÃ§Ã£o PDF e Excel com listagem completa",
          ]}/>
          <InfoCard icon="â†©ï¸" title="DevoluÃ§Ãµes" color={C.ylw} items={[
            "TÃ©cnico solicita devoluÃ§Ã£o de materiais excedentes",
            "Admin/Estoque aprova ou rejeita a devoluÃ§Ã£o",
            "Material aprovado retorna automaticamente ao Estoque Base",
            "HistÃ³rico completo de todas as devoluÃ§Ãµes",
          ]}/>
          <InfoCard icon="ðŸ“‹" title="SolicitaÃ§Ãµes" color={C.blue} items={[
            "TÃ©cnico solicita materiais diretamente pelo sistema",
            "Admin/Estoque recebe alerta de solicitaÃ§Ã£o pendente",
            "Ao confirmar, o material Ã© transferido do Estoque Base para o Kit",
            "UrgÃªncia: Normal, Alta ou Urgente",
          ]}/>
        </>}

        {section==="frota"&&<>
          <InfoCard icon="ðŸš—" title="GestÃ£o de VeÃ­culos" color={C.gold} items={[
            "Cadastre veÃ­culos com placa, modelo, ano, cor, tÃ©cnico responsÃ¡vel",
            "Upload do documento do veÃ­culo (CRVL/licenciamento em PDF)",
            "4 fotos do veÃ­culo: Frente, Lado Esq, Lado Dir, Traseira",
            "Controle de vencimentos: IPVA, Licenciamento, Seguro â€” alertas automÃ¡ticos",
            "Alerta de troca de Ã³leo a cada 10.000 km",
          ]}/>
          <InfoCard icon="â›½" title="Abastecimento" color={C.grn} items={[
            "Registre combustÃ­vel, litros, valor, KM e posto",
            "CÃ¡lculo automÃ¡tico do preÃ§o por litro",
            "Foto da nota fiscal diretamente pela cÃ¢mera do celular",
            "Consumo mÃ©dio por veÃ­culo (km/L) calculado automaticamente",
          ]}/>
          <InfoCard icon="ðŸ“‹" title="Checklist (Retirada/DevoluÃ§Ã£o)" color={C.blue} items={[
            "Preencha ao retirar e ao devolver cada veÃ­culo",
            "Registre: KM, nÃ­vel de combustÃ­vel, estado dos 4 pneus",
            "Foto do odÃ´metro e fotos de avarias",
            "HistÃ³rico completo disponÃ­vel na aba HistÃ³rico",
          ]}/>
          <InfoCard icon="ðŸ”„" title="Controle de Pneus" color={C.ylw} items={[
            "Registre marca, DOT, data de troca, KM e posiÃ§Ã£o",
            "5 posiÃ§Ãµes: Dianteiro Esq/Dir, Traseiro Esq/Dir, Estepe",
            "HistÃ³rico de todos os pneus por veÃ­culo",
          ]}/>
        </>}

        {section==="relatorios"&&<>
          <InfoCard icon="ðŸ“Š" title="RelatÃ³rios DisponÃ­veis" color={C.gold} items={[
            "ðŸ“¦ Estoque: listagem completa com situaÃ§Ã£o (OK/Baixo/CrÃ­tico)",
            "ðŸ”§ OS: todas as ordens por perÃ­odo e tÃ©cnico",
            "ðŸ‘· TÃ©cnicos: ranking com materiais consumidos e devoluÃ§Ãµes",
            "â†©ï¸ DevoluÃ§Ãµes: histÃ³rico de todas as devoluÃ§Ãµes",
            "ðŸ’° NFs: notas fiscais com valor total no perÃ­odo",
          ]}/>
          <InfoCard icon="ðŸ“ˆ" title="RelatÃ³rio Administrativo" color={C.blue} items={[
            "ðŸ’° Financeiro: gastos mensais com NFs e fornecedores",
            "ðŸš— Frota: gastos por veÃ­culo (combustÃ­vel + manutenÃ§Ã£o)",
            "ðŸ‘· TÃ©cnicos: ranking completo de performance",
            "â±ï¸ SLA: tempo mÃ©dio de atendimento por tÃ©cnico",
            "ðŸ“ˆ TendÃªncia: crescimento de OS e gastos mÃªs a mÃªs",
            "ðŸ”” Alertas de PreÃ§o: detecta variaÃ§Ãµes de preÃ§o entre NFs",
          ]}/>
          <InfoCard icon="ðŸ–¨ï¸" title="ExportaÃ§Ã£o" color={C.grn} items={[
            "PDF profissional: abre em nova aba para imprimir ou salvar",
            "Excel: mÃºltiplas abas organizadas por categoria",
            "Filtro de perÃ­odo: Hoje, Semana, MÃªs, Trimestre ou personalizado",
          ]}/>
        </>}

        {section==="usuarios"&&<>
          <InfoCard icon="ðŸ‘¥" title="GestÃ£o de UsuÃ¡rios (Admin)" color={C.gold} items={[
            "Crie usuÃ¡rios com login, senha, perfil e permissÃµes personalizadas",
            "Defina quais mÃ³dulos cada usuÃ¡rio pode acessar",
            "Foto de perfil e matrÃ­cula para identificaÃ§Ã£o",
            "OpÃ§Ã£o de exigir troca de senha no primeiro acesso",
          ]}/>
          <InfoCard icon="ðŸ”" title="SeguranÃ§a" color={C.red} items={[
            "Apenas o usuÃ¡rio ROOT pode deletar usuÃ¡rios ou resetar o sistema",
            "Admin nÃ£o pode alterar senha de outros usuÃ¡rios â€” cada um altera a prÃ³pria em Meu Perfil",
            "SessÃ£o persistente: nÃ£o perde login ao fechar o navegador",
            "Dados sincronizados com Supabase (nuvem segura)",
          ]}/>
          <TipCard tip="O usuÃ¡rio ROOT (login: stocktelmaster) Ã© oculto para todos e sÃ³ vocÃª deve conhecer a senha. Guarde-a em local seguro!" color={C.red}/>
        </>}

        {section==="faq"&&<>
          {[
            {p:"Por que o sistema mostra tela preta?",r:"Pressione Ctrl+Shift+R para forÃ§ar o reload. Se persistir, limpe o cache do navegador."},
            {p:"Como recuperar senha de um usuÃ¡rio?",r:"O Admin edita o usuÃ¡rio e define nova senha. Cada usuÃ¡rio pode alterar a prÃ³pria em âš™ï¸ Meu Perfil."},
            {p:"Os dados sÃ£o salvos onde?",r:"No Supabase (PostgreSQL na nuvem) + localStorage como backup offline. Os dados ficam salvos mesmo sem internet."},
            {p:"Como liberar material para tÃ©cnico?",r:"Estoque Base â†’ SaÃ­da/LiberaÃ§Ã£o â†’ selecione tÃ©cnico e materiais â†’ confirmar."},
            {p:"Como registrar que um tÃ©cnico fez uma OS?",r:"Menu Ordens de ServiÃ§o â†’ Nova OS â†’ preencha os dados e materiais usados. A baixa do kit Ã© automÃ¡tica."},
            {p:"O tÃ©cnico nÃ£o vÃª o menu Estoque Base. Por quÃª?",r:"O perfil TÃ©cnico tem acesso apenas ao Kit (estoque pessoal), OS, SolicitaÃ§Ãµes e Frota. O Admin controla as permissÃµes."},
            {p:"Como cadastrar um veÃ­culo novo?",r:"Frota â†’ aba VeÃ­culos â†’ + VeÃ­culo. Preencha os dados e faÃ§a upload das fotos e documento PDF."},
            {p:"Como o sistema avisa sobre troca de Ã³leo?",r:"Automaticamente quando faltam 2.000 km (ðŸŸ¡ alerta) ou 500 km (ðŸ”´ urgente) para completar 10.000 km."},
          ].map((f,i)=>(
            <Card key={i} style={{padding:14}}>
              <div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:6}}>â“ {f.p}</div>
              <div style={{fontSize:12,color:C.txt2,lineHeight:1.6}}>â†³ {f.r}</div>
            </Card>
          ))}
        </>}

        {section==="atalhos"&&<>
          <Card style={{padding:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>âŒ¨ï¸ Atalhos e Dicas de Uso</div>
            {[
              ["Ctrl+Shift+R","ForÃ§ar reload / limpar cache","teclado"],
              ["F12","Abrir DevTools para ver erros","teclado"],
              ["Ctrl+P (na tela PDF)","Imprimir ou salvar como PDF","teclado"],
              ["Swipe â† â†’","Navegar entre abas no mobile","mobile"],
              ["Segurar botÃ£o Home","Instalar como app no celular","mobile"],
              ["CÃ¢mera no upload de foto","Use 'capture' para foto direta","mobile"],
            ].map(([atalho,desc,tipo],i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<5?`1px solid ${C.bdr}`:"none"}}>
                <div style={{background:tipo==="mobile"?`${C.blue}22`:`${C.gold}22`,border:`1px solid ${tipo==="mobile"?C.blue:C.gold}44`,borderRadius:6,padding:"4px 10px",minWidth:80,textAlign:"center"}}>
                  <span style={{fontSize:11,fontWeight:700,color:tipo==="mobile"?C.blue:C.gold,fontFamily:"'JetBrains Mono',monospace"}}>{atalho}</span>
                </div>
                <div>
                  <div style={{fontSize:12,color:C.txt}}>{desc}</div>
                  <Bdg color={tipo==="mobile"?"blue":"gold"} style={{marginTop:4}}>{tipo}</Bdg>
                </div>
              </div>
            ))}
          </Card>
          <Card style={{padding:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>ðŸ“ž Suporte</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.8}}>
              <div>ðŸ“§ Sistema desenvolvido com React + Vite + Supabase + Vercel</div>
              <div>ðŸš€ Deploy automÃ¡tico via GitHub â†’ Vercel</div>
              <div>ðŸ’¾ Banco de dados: Supabase (PostgreSQL)</div>
              <div style={{marginTop:10,padding:"10px 14px",background:C.surf,borderRadius:8,color:C.txt2,fontSize:11}}>
                Para suporte tÃ©cnico, acesse o repositÃ³rio ou entre em contato com o desenvolvedor.
              </div>
            </div>
          </Card>
        </>}

      </div>
    </div>
  </div>;
}


/* â”€â”€ PONTO ELETRÃ”NICO â”€â”€ */
function PontoPage({pontos,setPontos,pontoConfig,setPontoConfig,pontoSolicits,setPontoSolicits,escalas=[],setEscalas,folgas=[],setFolgas,users,currentUser,addLog,isMobile,showToast}){
  const isAdm=["admin","superadmin"].includes(currentUser.role);
  const hoje=new Date().toISOString().slice(0,10);
  const DIAS_PONTO=["Dom","Seg","Ter","Qua","Qui","Sex","S\u00e1b"];
  const ESCALA_PADRAO={diasSemana:["Dom","Seg","Ter","Qua","Qui","Sex","S\u00e1b"],entrada:"08:00",saida:"18:00",saidaFimSemana:"17:00",almEntrada:"12:00",almSaida:"13:00",padrao:true};

  // â”€â”€ Haversine â”€â”€
  const haversine=(lat1,lng1,lat2,lng2)=>{
    const R=6371000,toRad=d=>d*Math.PI/180;
    const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  // â”€â”€ Estado local â”€â”€
  const[geoLoading,setGeoLoading]=useState(false);
  const[geoErro,setGeoErro]=useState("");
  const[tab,setTab]=useState(isAdm?"admin":"meu");
  const[mesEscala,setMesEscala]=useState(new Date().getMonth());
  const[anoEscala,setAnoEscala]=useState(new Date().getFullYear());
  const[modalEscala,setModalEscala]=useState(null);
  const[modalFolga,setModalFolga]=useState(null);
  const[formEscala,setFormEscala]=useState({userId:"",tipo:"semanal",diasSemana:[],entrada:"08:00",saida:"17:00",obs:""});
  const[formFolga,setFormFolga]=useState({userId:"",data:"",tipoFolga:"folga",obs:""});
  const[viewUserId,setViewUserId]=useState("");
  const[modalSolicit,setModalSolicit]=useState(false);
  const[motivoSolicit,setMotivoSolicit]=useState("");
  const[tipoSolicit,setTipoSolicit]=useState("");
  const[motivoAnalise,setMotivoAnalise]=useState([]);
  const[solicitGeo,setSolicitGeo]=useState({});
  const[modalConfig,setModalConfig]=useState(false);
  const[formConfig,setFormConfig]=useState({...pontoConfig});
  const[filtroUser,setFiltroUser]=useState("");
  const[filtroDt,setFiltroDt]=useState(hoje);
  const[modalEdit,setModalEdit]=useState(null);

  // â”€â”€ Helpers â”€â”€
  const TIPOS={
    entrada:   {l:"Entrada",      icon:"ðŸŸ¢",geo:true,  cor:C.grn},
    saida_almoco:{l:"SaÃ­da AlmoÃ§o",icon:"ðŸŸ¡",geo:false, cor:C.ylw},
    volta_almoco:{l:"Volta AlmoÃ§o",icon:"ðŸ”µ",geo:false, cor:C.blue},
    saida:     {l:"SaÃ­da",        icon:"ðŸ”´",geo:true,  cor:C.red},
  };
  const SEQUENCIA=["entrada","saida_almoco","volta_almoco","saida"];

  const pontosHoje=(uid)=>pontos.filter(p=>p.funcionarioId===uid&&p.dt.startsWith(hoje));
  const minutosDia=(hhmm="00:00")=>{
    const [h,m]=String(hhmm).split(":").map(Number);
    return (h||0)*60+(m||0);
  };
  const getEscalaDoDia=(uid,dt=new Date())=>{
    const dia=DIAS_PONTO[dt.getDay()];
    const cfg=escalas.find(e=>e.userId===uid);
    const base=cfg||ESCALA_PADRAO;
    const saida=(dt.getDay()===0||dt.getDay()===6)?(base.saidaFimSemana||"17:00"):(base.saida||"18:00");
    return {...base,dia,saida,padrao:!cfg};
  };
  const getFolgaDiaAtual=(uid,dt=new Date())=>{
    const ds=dt.toISOString().slice(0,10);
    return folgas.find(f=>(f.userId===uid||f.todos)&&f.data===ds)||null;
  };
  const analisarRegraPonto=(uid,tipo,dt=new Date())=>{
    const escalaDia=getEscalaDoDia(uid,dt);
    const folgaDia=getFolgaDiaAtual(uid,dt);
    const motivos=[];
    if(folgaDia) motivos.push(`${folgaDia.tipoFolga||"folga"} registrada para o dia`);
    if(!escalaDia.diasSemana?.includes(escalaDia.dia)) motivos.push("dia fora da escala configurada");
    const min=minutosDia(dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}));
    const entrada=minutosDia(escalaDia.entrada||"08:00");
    const saida=minutosDia(escalaDia.saida||"18:00");
    if(["entrada","saida"].includes(tipo)&&(min<entrada||min>saida)) motivos.push(`fora do horario permitido (${escalaDia.entrada} ?s ${escalaDia.saida})`);
    return {precisaAprovacao:motivos.length>0,motivos,escalaDia,folgaDia};
  };
  const ultimoTipo=(uid)=>{
    const ph=pontosHoje(uid);
    if(!ph.length)return null;
    return ph[ph.length-1].tipo;
  };
  const proximoTipo=(uid)=>{
    const u=ultimoTipo(uid);
    if(!u)return "entrada";
    const idx=SEQUENCIA.indexOf(u);
    if(idx>=SEQUENCIA.length-1)return null;
    return SEQUENCIA[idx+1];
  };
  const fmtHora=(isoStr)=>{
    if(!isoStr)return "--:--";
    const d=new Date(isoStr);
    return d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  };
  const calcHoras=(uid)=>{
    const ph=pontosHoje(uid);
    const ent=ph.find(p=>p.tipo==="entrada");
    const sai=ph.find(p=>p.tipo==="saida");
    if(!ent||!sai)return null;
    const ms=new Date(sai.dt)-new Date(ent.dt);
    const alm_s=ph.find(p=>p.tipo==="saida_almoco");
    const alm_v=ph.find(p=>p.tipo==="volta_almoco");
    let almMs=0;
    if(alm_s&&alm_v) almMs=new Date(alm_v.dt)-new Date(alm_s.dt);
    const trabMs=ms-almMs;
    const h=Math.floor(trabMs/3600000),m=Math.floor((trabMs%3600000)/60000);
    return `${h}h${m.toString().padStart(2,"0")}m`;
  };

  // â”€â”€ Bater ponto (com geo quando necessÃ¡rio) â”€â”€
  const baterPonto=(tipo)=>{
    const cfg=pontoConfig;
    const precisaGeo=TIPOS[tipo].geo;
    const agora=new Date();
    const regra=analisarRegraPonto(currentUser.id,tipo,agora);
    const solicitarAnalise=(motivos,geo={})=>{
      setTipoSolicit(tipo);
      setMotivoAnalise(motivos);
      setSolicitGeo(geo);
      setModalSolicit(true);
    };
    const registrarDireto=(geo={})=>{
      const reg={id:uid(),funcionarioId:currentUser.id,funcionarioNome:currentUser.name,tipo,dt:agora.toISOString(),lat:geo.lat??null,lng:geo.lng??null,distancia:geo.distancia??null,localValido:geo.localValido??true,aprovado:true,accuracy:geo.accuracy??null,foraHorario:false,foraEscala:false};
      setPontos(p=>[...p,reg]);
      addLog(currentUser.name,"Ponto",`${TIPOS[tipo].l} registrada${geo.distancia!==undefined&&geo.distancia!==null?` - ${geo.distancia}m da empresa`:""}`);
      showToast(`${TIPOS[tipo].icon} ${TIPOS[tipo].l} registrada!`,"success");
    };
    if(regra.precisaAprovacao){
      solicitarAnalise(regra.motivos,{foraHorario:regra.motivos.some(m=>m.includes("horario")),foraEscala:regra.motivos.some(m=>m.includes("escala")||m.includes("folga"))});
      showToast("Ponto fora da regra. Informe o motivo para analise do administrador.","warning");
      return;
    }
    if(!precisaGeo){
      registrarDireto({lat:null,lng:null,distancia:null,localValido:true});
      return;
    }
    // Precisa de geo
    if(!cfg.lat||!cfg.lng){
      showToast("GeolocalizaÃ§Ã£o da empresa nÃ£o configurada. Contate o administrador.","error");
      return;
    }
    if(!navigator.geolocation){
      showToast("Navegador nÃ£o suporta geolocalizaÃ§Ã£o.","error");
      return;
    }
    setGeoLoading(true);
    setGeoErro("");
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        setGeoLoading(false);
        const {latitude:ulat,longitude:ulng,accuracy}=pos.coords;
        const dist=haversine(parseFloat(cfg.lat),parseFloat(cfg.lng),ulat,ulng);
        const valido=dist<=parseFloat(cfg.raio);
        if(valido){
          registrarDireto({lat:ulat,lng:ulng,distancia:Math.round(dist),localValido:true,accuracy:Math.round(accuracy)});
        } else {
          setGeoErro(`VocÃª estÃ¡ a ${Math.round(dist)}m da empresa. Limite: ${cfg.raio}m. Solicite aprovaÃ§Ã£o manual.`);
          setTipoSolicit(tipo);
          setMotivoAnalise([`fora da geolocalizacao da empresa (${Math.round(dist)}m, limite ${cfg.raio}m)`]);
          setSolicitGeo({lat:ulat,lng:ulng,distancia:Math.round(dist),accuracy:Math.round(accuracy),localValido:false});
          showToast(`Fora do raio permitido (${Math.round(dist)}m). Solicite aprovacao.`,"warning");
        }
      },
      (err)=>{
        setGeoLoading(false);
        const msgs={1:"PermissÃ£o de localizaÃ§Ã£o negada.",2:"PosiÃ§Ã£o indisponÃ­vel.",3:"Tempo esgotado."};
        const msg=msgs[err.code]||"Erro de geolocalizaÃ§Ã£o.";
        setGeoErro(msg+" Solicite aprovaÃ§Ã£o manual se necessÃ¡rio.");
        setTipoSolicit(tipo);
        setMotivoAnalise([msg]);
        setSolicitGeo({localValido:false,geoErro:msg});
        showToast(msg,"error");
      },
      {enableHighAccuracy:true,timeout:10000,maximumAge:0}
    );
  };

  const enviarSolicit=()=>{
    if(!motivoSolicit.trim()){showToast("Descreva o motivo.","warning");return;}
    const sol={id:uid(),funcionarioId:currentUser.id,funcionarioNome:currentUser.name,tipo:tipoSolicit,dt:new Date().toISOString(),motivo:motivoSolicit.trim(),motivosAnalise:motivoAnalise,status:"pendente",adminNotif:true,...solicitGeo};
    setPontoSolicits(p=>[...p,sol]);
    addLog(currentUser.name,"Ponto SolicitaÃ§Ã£o",`${TIPOS[tipoSolicit]?.l||tipoSolicit} â€” ${motivoSolicit.slice(0,40)}`);
    showToast("SolicitaÃ§Ã£o enviada! O administrador serÃ¡ notificado.","success");
    setModalSolicit(false);setMotivoSolicit("");setTipoSolicit("");setGeoErro("");setMotivoAnalise([]);setSolicitGeo({});
  };

  const aprovarSolicit=(sol,aprovar)=>{
    // Aprova: cria registro de ponto; rejeita: apenas atualiza status
    if(aprovar){
      const reg={id:uid(),funcionarioId:sol.funcionarioId,funcionarioNome:sol.funcionarioNome,tipo:sol.tipo,dt:sol.dt,lat:sol.lat??null,lng:sol.lng??null,distancia:sol.distancia??null,localValido:sol.localValido??false,aprovado:true,aprovadoPor:currentUser.name,solicitacaoId:sol.id,foraHorario:sol.motivosAnalise?.some(m=>m.includes("horario"))||false,foraEscala:sol.motivosAnalise?.some(m=>m.includes("escala")||m.includes("folga"))||false};
      setPontos(p=>[...p,reg]);
    }
    setPontoSolicits(p=>p.map(s=>s.id===sol.id?{...s,status:aprovar?"aprovado":"rejeitado",resolvidoPor:currentUser.name,resolvidoEm:new Date().toISOString()}:s));
    addLog(currentUser.name,"Ponto Admin",`SolicitaÃ§Ã£o ${aprovar?"aprovada":"rejeitada"}: ${sol.funcionarioNome} â€” ${TIPOS[sol.tipo]?.l}`);
    showToast(`SolicitaÃ§Ã£o ${aprovar?"aprovada":"rejeitada"}!`,aprovar?"success":"warning");
  };

  const salvarConfig=()=>{
    if(!formConfig.lat||!formConfig.lng){showToast("Informe latitude e longitude.","warning");return;}
    setPontoConfig({...formConfig});
    setModalConfig(false);
    showToast("ConfiguraÃ§Ã£o salva!","success");
    addLog(currentUser.name,"Ponto Config",`Raio: ${formConfig.raio}m | Empresa: ${formConfig.nome}`);
  };

  const getMinhaLocalizacao=()=>{
    if(!navigator.geolocation){showToast("Navegador nÃ£o suporta geo.","error");return;}
    navigator.geolocation.getCurrentPosition(
      pos=>{ setFormConfig(f=>({...f,lat:pos.coords.latitude.toFixed(7),lng:pos.coords.longitude.toFixed(7)})); showToast("LocalizaÃ§Ã£o obtida!","success"); },
      ()=>showToast("NÃ£o foi possÃ­vel obter localizaÃ§Ã£o.","error"),
      {enableHighAccuracy:true,timeout:8000}
    );
  };

  // Pendentes para notif
  const solicsPendentes=pontoSolicits.filter(s=>s.status==="pendente");
  const meuProximo=proximoTipo(currentUser.id);
  const meusPontosHoje=pontosHoje(currentUser.id);

  // UsuÃ¡rios com acesso ao ponto
  const usersComPonto=users.filter(u=>["tecnico","mecanico","estoque","admin","superadmin"].includes(u.role));

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>ðŸ• Ponto EletrÃ´nico</h1>
        <p style={{fontSize:12,color:C.muted}}>
          {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}
        </p>
      </div>
      {isAdm&&<div style={{display:"flex",gap:8}}>
        {solicsPendentes.length>0&&<div style={{background:C.redD,border:`1px solid ${C.red}55`,borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,color:C.red}}>
          ðŸ”” {solicsPendentes.length} solicit.
        </div>}
        <Btn size="sm" color="ghost" outline onClick={()=>{setFormConfig({...pontoConfig});setModalConfig(true);}}>âš™ï¸ Configurar</Btn>
      </div>}
    </div>

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`,gap:0}}>
      {[
        {k:"meu",l:"ðŸ• Meu Ponto"},
        {k:"escala",l:"ðŸ“… Escala & Folgas"},
        ...(isAdm?[{k:"admin",l:`ðŸ“‹ GestÃ£o${solicsPendentes.length>0?` (${solicsPendentes.length})`:""}`,},{k:"config_view",l:"ðŸ“Š Resumo Equipe"}]:[]),
      ].map(t=>(
        <div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>
      ))}
    </div>

    {/* â”€â”€ MEU PONTO â”€â”€ */}
    {tab==="meu"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>

      {/* RelÃ³gio */}
      <Card style={{padding:20,textAlign:"center",background:"linear-gradient(135deg,#161616,#1a1a1a)"}}>
        <RelogioAtual/>
        <div style={{fontSize:12,color:C.muted,marginTop:6}}>
          {meuProximo?`PrÃ³ximo: ${TIPOS[meuProximo]?.l}`:meusPontosHoje.find(p=>p.tipo==="saida")?"âœ… Jornada encerrada":"Sem pontos hoje"}
        </div>
        {meusPontosHoje.length>0&&calcHoras(currentUser.id)&&(
          <div style={{marginTop:8,display:"inline-block",background:`${C.grn}22`,border:`1px solid ${C.grn}44`,borderRadius:8,padding:"4px 14px",fontSize:13,fontWeight:700,color:C.grn}}>
            â± Trabalhadas: {calcHoras(currentUser.id)}
          </div>
        )}
      </Card>

      {/* BotÃµes de ponto */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {SEQUENCIA.map(tipo=>{
          const info=TIPOS[tipo];
          const jaBateu=meusPontosHoje.some(p=>p.tipo===tipo);
          const ehProximo=meuProximo===tipo;
          const bloqueado=!ehProximo||jaBateu;
          const reg=meusPontosHoje.find(p=>p.tipo===tipo);
          return <div key={tipo} onClick={()=>{if(!bloqueado&&!geoLoading)baterPonto(tipo);}}
            style={{padding:16,borderRadius:12,border:`2px solid ${jaBateu?info.cor:ehProximo?`${info.cor}88`:C.bdr2}`,
              background:jaBateu?`${info.cor}18`:ehProximo?`${info.cor}10`:"transparent",
              cursor:bloqueado?"not-allowed":"pointer",opacity:bloqueado&&!jaBateu?0.45:1,
              transition:"all 0.2s",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <div style={{fontSize:28}}>{info.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:jaBateu?info.cor:ehProximo?info.cor:C.muted}}>{info.l}</div>
            {jaBateu&&reg&&<div style={{fontSize:11,color:info.cor,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{fmtHora(reg.dt)}</div>}
            {jaBateu&&reg&&reg.distancia!==null&&<div style={{fontSize:10,color:C.muted}}>{reg.distancia}m</div>}
            {ehProximo&&!jaBateu&&!geoLoading&&<div style={{fontSize:10,color:info.cor,fontWeight:600}}>Toque para registrar</div>}
            {ehProximo&&!jaBateu&&geoLoading&&<div style={{fontSize:10,color:C.ylw}}>ðŸ“¡ Buscando localizaÃ§Ã£o...</div>}
          </div>;
        })}
      </div>

      {/* Erro geo + solicitar */}
      {geoErro&&<Card style={{padding:14,border:`1px solid ${C.red}55`,background:C.redD}}>
        <div style={{fontSize:13,color:C.red,fontWeight:600,marginBottom:10}}>âš ï¸ {geoErro}</div>
        <Btn color="gold" onClick={()=>{setModalSolicit(true);}}>ðŸ“ Solicitar AprovaÃ§Ã£o Manual</Btn>
      </Card>}

      {/* HistÃ³rico do dia */}
      {meusPontosHoje.length>0&&<Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",background:C.surf,borderBottom:`1px solid ${C.bdr}`,fontSize:12,fontWeight:700,color:C.gold}}>ðŸ“‹ Registros de Hoje</div>
        {meusPontosHoje.map((p,i)=>(
          <div key={p.id} style={{padding:"10px 16px",borderBottom:i<meusPontosHoje.length-1?`1px solid ${C.bdr}18`:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{TIPOS[p.tipo]?.icon}</span>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.txt}}>{TIPOS[p.tipo]?.l}</div>
                <div style={{fontSize:10,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{fmtHora(p.dt)}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {p.localValido?<Bdg color="grn">âœ… VÃ¡lido</Bdg>:<Bdg color="ylw">âš ï¸ Manual</Bdg>}
              {p.distancia!==null&&<span style={{fontSize:11,color:C.muted}}>{p.distancia}m</span>}
              {p.aprovadoPor&&<span style={{fontSize:10,color:C.muted}}>por {p.aprovadoPor}</span>}
            </div>
          </div>
        ))}
      </Card>}

      {/* HistÃ³rico semana */}
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>ðŸ“… HistÃ³rico da Semana</div>
        {(()=>{
          const dias=[];
          for(let i=6;i>=0;i--){
            const d=new Date();d.setDate(d.getDate()-i);
            const ds=d.toISOString().slice(0,10);
            const dp=pontos.filter(p=>p.funcionarioId===currentUser.id&&p.dt.startsWith(ds));
            if(dp.length>0||i===0) dias.push({ds,dp,d});
          }
          return dias.map(({ds,dp,d})=>{
            const ent=dp.find(p=>p.tipo==="entrada");
            const sai=dp.find(p=>p.tipo==="saida");
            const isHoje=ds===hoje;
            return <div key={ds} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.bdr}18`}}>
              <div>
                <div style={{fontSize:12,fontWeight:isHoje?700:400,color:isHoje?C.gold:C.txt}}>
                  {d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})}
                  {isHoje&&<Bdg color="gold" style={{marginLeft:6}}>Hoje</Bdg>}
                </div>
              </div>
              <div style={{display:"flex",gap:8,fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>
                {ent?<span style={{color:C.grn}}>â–¶ {fmtHora(ent.dt)}</span>:<span>â–¶ --:--</span>}
                {sai?<span style={{color:C.red}}>â–  {fmtHora(sai.dt)}</span>:<span>â–  --:--</span>}
                {ent&&sai&&<span style={{color:C.grn,fontWeight:700}}>â±{calcHoras(currentUser.id)||"?"}</span>}
                {dp.length===0&&<span style={{color:C.muted}}>Sem registros</span>}
              </div>
            </div>;
          });
        })()}
      </Card>
    </div>}

    {/* â”€â”€ GESTÃƒO ADMIN â”€â”€ */}
    {tab==="admin"&&isAdm&&<div style={{display:"flex",flexDirection:"column",gap:12}}>

      {/* SolicitaÃ§Ãµes pendentes */}
      {solicsPendentes.length>0&&<div>
        <div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:8}}>ðŸ”” SolicitaÃ§Ãµes Pendentes ({solicsPendentes.length})</div>
        {solicsPendentes.map(s=>(
          <Card key={s.id} style={{padding:14,marginBottom:8,border:`1px solid ${C.red}44`,background:C.redD}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
                  <span style={{fontWeight:700,color:C.txt}}>{s.funcionarioNome}</span>
                  <Bdg color="red">{TIPOS[s.tipo]?.l}</Bdg>
                  <span style={{fontSize:11,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{new Date(s.dt).toLocaleString("pt-BR")}</span>
                </div>
                <div style={{fontSize:12,color:C.txt2,background:C.surf,borderRadius:6,padding:"6px 10px"}}>ðŸ“ {s.motivo}</div>
                {s.motivosAnalise?.length>0&&<div style={{fontSize:11,color:C.ylw,marginTop:6}}>Analise: {s.motivosAnalise.join("; ")}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                <Btn size="xs" color="grn" onClick={()=>aprovarSolicit(s,true)}>âœ… Aprovar</Btn>
                <Btn size="xs" color="red" outline onClick={()=>aprovarSolicit(s,false)}>âœ• Rejeitar</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>}

      {/* Filtros */}
      <Card style={{padding:14}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
          <Sel label="FuncionÃ¡rio" value={filtroUser} onChange={setFiltroUser}
            options={[{value:"",label:"â€” Todos â€”"},...usersComPonto.map(u=>({value:u.id,label:`${u.name} (${u.role})`}))]}/>
          <Inp label="Data" value={filtroDt} onChange={setFiltroDt} type="date"/>
        </div>
      </Card>

      {/* Lista de registros */}
      {(()=>{
        const filtered=pontos.filter(p=>
          p.dt.startsWith(filtroDt)&&
          (filtroUser?p.funcionarioId===filtroUser:true)
        ).sort((a,b)=>new Date(b.dt)-new Date(a.dt));
        if(!filtered.length) return <Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum registro para este filtro.</span></Card>;
        return <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <THead cols={["FuncionÃ¡rio","Tipo","HorÃ¡rio","Local","Dist.","Status",""]}/>
              <tbody>
                {filtered.map(p=>(
                  <TRow key={p.id} cells={[
                    <span style={{fontWeight:600,color:C.txt,fontSize:12}}>{p.funcionarioNome}</span>,
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span>{TIPOS[p.tipo]?.icon}</span>
                      <span style={{fontSize:12,color:TIPOS[p.tipo]?.cor}}>{TIPOS[p.tipo]?.l}</span>
                    </div>,
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.txt}}>{fmtHora(p.dt)}</span>,
                    p.lat?<span style={{fontSize:10,color:C.muted}}>{parseFloat(p.lat).toFixed(4)},{parseFloat(p.lng).toFixed(4)}</span>:<span style={{color:C.muted,fontSize:11}}>â€”</span>,
                    p.distancia!==null?<span style={{fontSize:12,color:p.distancia<=parseInt(pontoConfig.raio)?C.grn:C.red}}>{p.distancia}m</span>:<span style={{color:C.muted}}>â€”</span>,
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{p.localValido?<Bdg color="grn">Geo</Bdg>:p.aprovado?<Bdg color="ylw">Manual</Bdg>:<Bdg color="red">Negado</Bdg>}{p.foraHorario&&<Bdg color="red">Fora horario</Bdg>}{p.foraEscala&&<Bdg color="ylw">Fora escala</Bdg>}</div>,
                    isAdm?<button onClick={()=>setModalEdit(p)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.muted,fontSize:14}}>âœï¸</button>:null,
                  ]}/>
                ))}
              </tbody>
            </table>
          </div>
        </Card>;
      })()}

      {/* HistÃ³rico de solicitaÃ§Ãµes */}
      {pontoSolicits.filter(s=>s.status!=="pendente").length>0&&<>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginTop:4}}>ðŸ“‹ HistÃ³rico de SolicitaÃ§Ãµes</div>
        {pontoSolicits.filter(s=>s.status!=="pendente").slice(0,10).map(s=>(
          <Card key={s.id} style={{padding:12,marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div>
                <span style={{fontWeight:600,color:C.txt,fontSize:12}}>{s.funcionarioNome}</span>
                <span style={{color:C.muted,fontSize:11,marginLeft:8}}>{TIPOS[s.tipo]?.l} Â· {new Date(s.dt).toLocaleDateString("pt-BR")}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <Bdg color={s.status==="aprovado"?"grn":"red"}>{s.status==="aprovado"?"âœ… Aprovado":"âŒ Rejeitado"}</Bdg>
                {s.resolvidoPor&&<span style={{fontSize:10,color:C.muted}}>por {s.resolvidoPor}</span>}
              </div>
            </div>
            <div style={{fontSize:11,color:C.muted,marginTop:4}}>ðŸ“ {s.motivo}</div>
          </Card>
        ))}
      </>}
    </div>}

    {/* â”€â”€ RESUMO EQUIPE â”€â”€ */}
    {tab==="config_view"&&isAdm&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:13,fontWeight:700,color:C.txt}}>ðŸ“Š Resumo de Hoje â€” {new Date().toLocaleDateString("pt-BR")}</div>
      {usersComPonto.map(u=>{
        const ph=pontosHoje(u.id);
        const ent=ph.find(p=>p.tipo==="entrada");
        const sai=ph.find(p=>p.tipo==="saida");
        const almS=ph.find(p=>p.tipo==="saida_almoco");
        const almV=ph.find(p=>p.tipo==="volta_almoco");
        const hTrab=calcHoras(u.id);
        return <Card key={u.id} style={{padding:14,borderLeft:`3px solid ${ph.length>0?C.grn:C.bdr2}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:C.gold,fontSize:14}}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.txt}}>{u.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{u.role}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{display:"flex",gap:6,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>
                <span style={{color:ent?C.grn:C.muted}}>â–¶ {ent?fmtHora(ent.dt):"--:--"}</span>
                <span style={{color:almS?C.ylw:C.muted}}>â˜€ {almS?fmtHora(almS.dt):"--:--"}</span>
                <span style={{color:almV?C.blue:C.muted}}>â†© {almV?fmtHora(almV.dt):"--:--"}</span>
                <span style={{color:sai?C.red:C.muted}}>â–  {sai?fmtHora(sai.dt):"--:--"}</span>
              </div>
              {hTrab&&<Bdg color="grn">â± {hTrab}</Bdg>}
              {!ent&&<Bdg color="red">Ausente</Bdg>}
              {ent&&!sai&&<Bdg color="ylw">Em jornada</Bdg>}
              {ent&&sai&&<Bdg color="grn">Encerrado</Bdg>}
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* â”€â”€ ABA ESCALA & FOLGAS â”€â”€ */}
    {tab==="escala"&&<EscalaFolgaTab
      escalas={escalas} setEscalas={setEscalas}
      folgas={folgas} setFolgas={setFolgas}
      users={users} currentUser={currentUser}
      isAdm={isAdm} isMobile={isMobile}
      addLog={addLog} showToast={showToast}
      mesEscala={mesEscala} setMesEscala={setMesEscala}
      anoEscala={anoEscala} setAnoEscala={setAnoEscala}
      viewUserId={viewUserId} setViewUserId={setViewUserId}
    />}


    {/* â”€â”€ MODAL SOLICITAR APROVAÃ‡ÃƒO â”€â”€ */}
    {modalSolicit&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:480,maxHeight:"80vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>ðŸ“ Solicitar AprovaÃ§Ã£o Manual</h2>
            <p style={{fontSize:11,color:C.muted,marginTop:2}}>Tipo: {TIPOS[tipoSolicit]?.l}</p>
          </div>
          <button onClick={()=>setModalSolicit(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:`${C.ylw}18`,border:`1px solid ${C.ylw}44`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.ylw}}>
            A solicita??o ser? analisada pelo administrador antes do ponto entrar nos registros.
            {motivoAnalise.length>0&&<div style={{marginTop:6}}>Motivo da analise: {motivoAnalise.join("; ")}</div>}
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Motivo da solicitaÃ§Ã£o *</label>
            <textarea value={motivoSolicit} onChange={e=>setMotivoSolicit(e.target.value)} rows={4}
              placeholder="Ex: Estava no cliente, GPS sem sinal, visitando fornecedor, problema de internet..."
              style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
          </div>
          <div style={{fontSize:11,color:C.muted,background:C.surf,borderRadius:8,padding:"10px 14px"}}>
            ðŸ“‹ Registro: {TIPOS[tipoSolicit]?.l} Â· {new Date().toLocaleString("pt-BR")}<br/>
            ðŸ‘¤ FuncionÃ¡rio: {currentUser.name}
          </div>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalSolicit(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={enviarSolicit}>ðŸ“¨ Enviar SolicitaÃ§Ã£o</Btn>
        </div>
      </div>
    </div>}

    {/* â”€â”€ MODAL CONFIG GEO â”€â”€ */}
    {modalConfig&&isAdm&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:520,maxHeight:"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>âš™ï¸ ConfiguraÃ§Ã£o â€” Ponto EletrÃ´nico</h2>
          <button onClick={()=>setModalConfig(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>ðŸ¢ DADOS DA EMPRESA</div>
            <Inp label="Nome da Empresa" value={formConfig.nome||""} onChange={v=>setFormConfig(f=>({...f,nome:v}))} placeholder="Ex: ReTelecom Ltda"/>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase"}}>ðŸ“ LOCALIZAÃ‡ÃƒO</div>
              <Btn size="xs" color="gold" onClick={getMinhaLocalizacao}>ðŸ“¡ Usar minha posiÃ§Ã£o atual</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Inp label="Latitude *" value={formConfig.lat||""} onChange={v=>setFormConfig(f=>({...f,lat:v}))} placeholder="-22.9068"/>
              <Inp label="Longitude *" value={formConfig.lng||""} onChange={v=>setFormConfig(f=>({...f,lng:v}))} placeholder="-43.1729"/>
            </div>
            {formConfig.lat&&formConfig.lng&&<div style={{marginTop:10,padding:"8px 12px",background:C.card,borderRadius:8,fontSize:11,color:C.muted}}>
              ðŸ—ºï¸ Ver no mapa:
              <a href={`https://www.google.com/maps?q=${formConfig.lat},${formConfig.lng}`} target="_blank" rel="noreferrer"
                style={{color:C.gold,marginLeft:6,textDecoration:"underline"}}>Google Maps â†—</a>
            </div>}
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>ðŸ“ RAIO DE TOLERÃ‚NCIA</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
              {[50,100,150,200,300,500].map(r=>(
                <div key={r} onClick={()=>setFormConfig(f=>({...f,raio:r}))}
                  style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600,
                    border:`1.5px solid ${parseInt(formConfig.raio)===r?C.gold:C.bdr2}`,
                    background:parseInt(formConfig.raio)===r?`${C.gold}22`:"transparent",
                    color:parseInt(formConfig.raio)===r?C.gold:C.muted}}>
                  {r}m
                </div>
              ))}
            </div>
            <Inp label="Ou digite o raio (metros)" value={String(formConfig.raio)} onChange={v=>setFormConfig(f=>({...f,raio:parseInt(v)||100}))} type="number" placeholder="150"/>
            <div style={{marginTop:10,padding:"8px 12px",background:`${C.gold}15`,borderRadius:8,fontSize:11,color:C.gold}}>
              ðŸ’¡ Raio recomendado: 100-200m para empresas urbanas. Use 300-500m se houver variaÃ§Ã£o de GPS.
            </div>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>ðŸ“‹ REGRAS</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:12,color:C.txt2}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:C.grn}}>âœ…</span> Entrada â€” geolocalizaÃ§Ã£o obrigatÃ³ria
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:C.ylw}}>ðŸŒ</span> SaÃ­da almoÃ§o â€” qualquer local
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:C.blue}}>ðŸŒ</span> Volta almoÃ§o â€” qualquer local
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:C.grn}}>âœ…</span> SaÃ­da â€” geolocalizaÃ§Ã£o obrigatÃ³ria
              </div>
            </div>
          </div>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalConfig(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarConfig}>âœ… Salvar ConfiguraÃ§Ã£o</Btn>
        </div>
      </div>
    </div>}

    {/* â”€â”€ MODAL EDITAR REGISTRO (ADMIN) â”€â”€ */}
    {modalEdit&&isAdm&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:12,width:"100%",maxWidth:420,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>âœï¸ Editar Registro</h2>
          <button onClick={()=>setModalEdit(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>âœ•</button>
        </div>
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:12,color:C.muted,background:C.surf,borderRadius:8,padding:"8px 12px"}}>
            ðŸ‘¤ {modalEdit.funcionarioNome} Â· {TIPOS[modalEdit.tipo]?.l} Â· {new Date(modalEdit.dt).toLocaleString("pt-BR")}
          </div>
          <EditarHora reg={modalEdit} onSave={(novaHora)=>{
            setPontos(p=>p.map(x=>x.id===modalEdit.id?{...x,dt:novaHora,editadoPor:currentUser.name,editadoEm:new Date().toISOString()}:x));
            addLog(currentUser.name,"Ponto EdiÃ§Ã£o",`${modalEdit.funcionarioNome} â€” ${TIPOS[modalEdit.tipo]?.l} â†’ ${new Date(novaHora).toLocaleTimeString("pt-BR")}`);
            showToast("Registro editado com log de auditoria.","success");
            setModalEdit(null);
          }} onDelete={()=>{
            if(!window.confirm("Excluir este registro? A aÃ§Ã£o serÃ¡ logada."))return;
            setPontos(p=>p.filter(x=>x.id!==modalEdit.id));
            addLog(currentUser.name,"Ponto ExclusÃ£o",`${modalEdit.funcionarioNome} â€” ${TIPOS[modalEdit.tipo]?.l} excluÃ­do`);
            showToast("Registro excluÃ­do.","warning");
            setModalEdit(null);
          }}/>
        </div>
      </div>
    </div>}
  </div>;
}


/* â”€â”€ ESCALA & FOLGAS â”€â”€ */
function EscalaFolgaTab({escalas,setEscalas,folgas,setFolgas,users,currentUser,isAdm,isMobile,addLog,showToast,mesEscala,setMesEscala,anoEscala,setAnoEscala,viewUserId,setViewUserId}){
  const DIAS_SEMANA=["Dom","Seg","Ter","Qua","Qui","Sex","SÃ¡b"];
  const DIAS_SEMANA_FULL=["Domingo","Segunda-feira","TerÃ§a-feira","Quarta-feira","Quinta-feira","Sexta-feira","SÃ¡bado"];
  const MESES=["Janeiro","Fevereiro","MarÃ§o","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const TIPOS_FOLGA={folga:{l:"Folga",c:C.ylw,i:"ðŸŸ¡"},ferias:{l:"FÃ©rias",c:C.blue,i:"ðŸ–ï¸"},feriado:{l:"Feriado",c:C.gold,i:"ðŸŽ‰"},abono:{l:"Abono",c:C.grn,i:"âœ…"},atestado:{l:"Atestado",c:C.red,i:"ðŸ¥"}};

  const[modalEscala,setModalEscala]=useState(null);
  const[modalFolga,setModalFolga]=useState(null);
  const[formEscala,setFormEscala]=useState({userId:"",diasSemana:["Dom","Seg","Ter","Qua","Qui","Sex","S\u00e1b"],entrada:"08:00",saida:"18:00",saidaFimSemana:"17:00",almEntrada:"12:00",almSaida:"13:00",obs:""});
  const[formFolga,setFormFolga]=useState({userId:currentUser.id,data:"",tipoFolga:"folga",obs:"",todos:false});
  const[filtroView,setFiltroView]=useState(viewUserId||currentUser.id);

  const hoje=new Date();
  const primeiroDia=new Date(anoEscala,mesEscala,1);
  const ultimoDia=new Date(anoEscala,mesEscala+1,0);
  const diasNoMes=ultimoDia.getDate();
  const diaInicioSemana=primeiroDia.getDay();

  const navMes=(dir)=>{
    let m=mesEscala+dir,a=anoEscala;
    if(m>11){m=0;a++;}
    if(m<0){m=11;a--;}
    setMesEscala(m);setAnoEscala(a);
  };

  const dtStr=(dia)=>`${anoEscala}-${String(mesEscala+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;

  // Escala do usuÃ¡rio: obtÃ©m os dias de trabalho
  const getEscalaUser=(uid)=>escalas.find(e=>e.userId===uid)||null;
  const isDiaTrabalho=(uid,dia)=>{
    const e=getEscalaUser(uid);
    if(!e)return false;
    const dt=new Date(anoEscala,mesEscala,dia);
    const nomeDia=DIAS_SEMANA[dt.getDay()];
    return e.diasSemana?.includes(nomeDia);
  };
  const getFolgaDia=(uid,dia)=>{
    const ds=dtStr(dia);
    return folgas.find(f=>(f.userId===uid||f.todos)&&f.data===ds)||null;
  };

  const usersComEscala=users.filter(u=>["tecnico","mecanico","estoque","admin","superadmin","financeiro"].includes(u.role));

  const salvarEscala=()=>{
    if(!formEscala.userId){showToast("Selecione o funcionÃ¡rio.","warning");return;}
    if(!formEscala.diasSemana.length){showToast("Selecione ao menos um dia.","warning");return;}
    const existing=escalas.find(e=>e.userId===formEscala.userId);
    if(existing){
      setEscalas(p=>p.map(e=>e.userId===formEscala.userId?{...formEscala,id:existing.id}:e));
    } else {
      setEscalas(p=>[...p,{...formEscala,id:uid()}]);
    }
    const u=users.find(x=>x.id===formEscala.userId);
    addLog(currentUser.name,"Escala",`Escala definida: ${u?.name||"?"} â€” ${formEscala.diasSemana.join(",")} ${formEscala.entrada}â€“${formEscala.saida}`);
    showToast("Escala salva com sucesso!","success");
    setModalEscala(null);
  };

  const salvarFolga=()=>{
    if(!formFolga.data){showToast("Selecione a data.","warning");return;}
    if(!formFolga.userId&&!formFolga.todos){showToast("Selecione o funcionÃ¡rio.","warning");return;}
    const nova={...formFolga,id:uid(),criadoPor:currentUser.name};
    setFolgas(p=>[...p,nova]);
    const u=users.find(x=>x.id===formFolga.userId);
    addLog(currentUser.name,"Folga",`${TIPOS_FOLGA[formFolga.tipoFolga]?.l}: ${formFolga.todos?"Todos":u?.name||"?"} â€” ${formFolga.data}`);
    showToast(`${TIPOS_FOLGA[formFolga.tipoFolga]?.l} registrada!`,"success");
    setModalFolga(null);
    setFormFolga({userId:currentUser.id,data:"",tipoFolga:"folga",obs:"",todos:false});
  };

  const excluirFolga=(id)=>{
    setFolgas(p=>p.filter(f=>f.id!==id));
    showToast("Folga removida.","warning");
  };

  // CalendÃ¡rio em array de semanas
  const gerarCalendario=()=>{
    const cells=[];
    for(let i=0;i<diaInicioSemana;i++) cells.push(null);
    for(let d=1;d<=diasNoMes;d++) cells.push(d);
    while(cells.length%7!==0) cells.push(null);
    const weeks=[];
    for(let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7));
    return weeks;
  };
  const semanas=gerarCalendario();

  const userView=users.find(u=>u.id===filtroView)||currentUser;
  const escalaView=getEscalaUser(filtroView);

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>

    {/* Filtro de visualizaÃ§Ã£o + botÃµes admin */}
    <Card style={{padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div style={{flex:1,minWidth:200}}>
          <Sel label={isAdm?"Ver escala de:":"FuncionÃ¡rio"} value={filtroView} onChange={v=>{setFiltroView(v);setViewUserId(v);}}
            options={isAdm
              ?[...usersComEscala.map(u=>({value:u.id,label:`${u.name} (${u.role})`}))]
              :[{value:currentUser.id,label:currentUser.name}]}/>
        </div>
        {isAdm&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn size="sm" color="gold" onClick={()=>{
            const ex=getEscalaUser(filtroView);
            setFormEscala(ex?{...ex}:{userId:filtroView,diasSemana:["Dom","Seg","Ter","Qua","Qui","Sex","S\u00e1b"],entrada:"08:00",saida:"18:00",saidaFimSemana:"17:00",almEntrada:"12:00",almSaida:"13:00",obs:""});
            setModalEscala("edit");
          }}>âš™ï¸ Editar Escala</Btn>
          <Btn size="sm" color="ylw" onClick={()=>{setFormFolga({userId:filtroView,data:"",tipoFolga:"folga",obs:"",todos:false});setModalFolga("new");}}>âž• Registrar Folga</Btn>
          <Btn size="sm" color="ghost" outline onClick={()=>{setFormFolga({userId:"",data:"",tipoFolga:"feriado",obs:"Feriado Nacional",todos:true});setModalFolga("new");}}>ðŸŽ‰ Feriado</Btn>
        </div>}
      </div>
      {escalaView&&<div style={{marginTop:12,padding:"10px 14px",background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:8,display:"flex",gap:14,flexWrap:"wrap",fontSize:12}}>
        <span style={{fontWeight:700,color:C.gold}}>ðŸ“… Escala de {userView?.name}:</span>
        <span style={{color:C.txt}}>{escalaView.diasSemana?.join(" Â· ")}</span>
        <span style={{color:C.grn}}>â–¶ Entrada: {escalaView.entrada}</span>
        <span style={{color:C.red}}>â–  SaÃ­da: {escalaView.saida}</span>
        {escalaView.saidaFimSemana&&<span style={{color:C.red}}>Fim de semana: {escalaView.saidaFimSemana}</span>}
        {escalaView.almEntrada&&<span style={{color:C.ylw}}>â˜€ AlmoÃ§o: {escalaView.almEntrada}â€“{escalaView.almSaida}</span>}
      </div>}
      {!escalaView&&<div style={{marginTop:8,fontSize:12,color:C.muted,textAlign:isAdm?"left":"center"}}>
        {isAdm?"Nenhuma escala definida para este funcionÃ¡rio. Clique em 'âš™ï¸ Editar Escala'.":"Nenhuma escala definida. Contate o administrador."}
      </div>}
    </Card>

    {/* NavegaÃ§Ã£o do mÃªs */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <button onClick={()=>navMes(-1)} style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",color:C.txt,fontSize:16}}>â€¹</button>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:16,fontWeight:700,color:C.txt}}>{MESES[mesEscala]} {anoEscala}</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>
          {hoje.getMonth()===mesEscala&&hoje.getFullYear()===anoEscala&&"MÃªs atual â€¢ "}
          <span style={{cursor:"pointer",color:C.gold,textDecoration:"underline"}} onClick={()=>{setMesEscala(hoje.getMonth());setAnoEscala(hoje.getFullYear());}}>Hoje</span>
        </div>
      </div>
      <button onClick={()=>navMes(1)} style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",color:C.txt,fontSize:16}}>â€º</button>
    </div>

    {/* CalendÃ¡rio */}
    <Card style={{padding:0,overflow:"hidden"}}>
      {/* CabeÃ§alho dias semana */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:C.surf,borderBottom:`1px solid ${C.bdr}`}}>
        {DIAS_SEMANA.map((d,i)=>(
          <div key={d} style={{textAlign:"center",padding:"8px 4px",fontSize:11,fontWeight:700,
            color:i===0||i===6?C.red:C.muted}}>{d}</div>
        ))}
      </div>
      {/* Semanas */}
      {semanas.map((sem,si)=>(
        <div key={si} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:si<semanas.length-1?`1px solid ${C.bdr}18`:"none"}}>
          {sem.map((dia,di)=>{
            if(!dia) return <div key={di} style={{minHeight:64,background:"transparent"}}/>;
            const dtHoje=hoje.getDate()===dia&&hoje.getMonth()===mesEscala&&hoje.getFullYear()===anoEscala;
            const isTrabalho=isDiaTrabalho(filtroView,dia);
            const folga=getFolgaDia(filtroView,dia);
            const isDS=di===0||di===6;
            const folgaInfo=folga?TIPOS_FOLGA[folga.tipoFolga]:null;

            // Background
            let bg="transparent";
            let border="none";
            if(dtHoje) border=`2px solid ${C.gold}`;
            if(folga) bg=`${folgaInfo?.c||C.ylw}18`;
            else if(isTrabalho&&!isDS) bg=`${C.grn}12`;
            else if(isDS) bg=`${C.red}06`;

            return <div key={di} style={{minHeight:isMobile?52:64,padding:isMobile?"4px":"6px",
              background:bg,border,position:"relative",
              borderLeft:di>0?`1px solid ${C.bdr}18`:"none"}}>
              {/* NÃºmero do dia */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <span style={{
                  fontSize:isMobile?11:13,fontWeight:dtHoje?800:400,
                  color:dtHoje?C.gold:isDS?C.red:C.txt,
                  background:dtHoje?`${C.gold}22`:"transparent",
                  borderRadius:dtHoje?20:0,padding:dtHoje?"2px 6px":0
                }}>{dia}</span>
                {folga&&<span style={{fontSize:isMobile?12:14}}>{folgaInfo?.i}</span>}
                {isTrabalho&&!folga&&!isDS&&<span style={{fontSize:10,color:C.grn}}>âœ“</span>}
              </div>
              {/* Info no dia */}
              {!isMobile&&<div style={{marginTop:3}}>
                {folga&&<div style={{fontSize:9,color:folgaInfo?.c||C.ylw,fontWeight:700,lineHeight:1.3}}>
                  {folgaInfo?.l}{folga.todos?" (Todos)":""}
                </div>}
                {isTrabalho&&!folga&&!isDS&&<div style={{fontSize:9,color:C.grn,lineHeight:1.3}}>
                  {escalaView?.entrada}â€“{escalaView?.saida}
                </div>}
              </div>}
              {/* Excluir folga (admin) */}
              {isAdm&&folga&&!folga.todos&&<button onClick={()=>excluirFolga(folga.id)}
                style={{position:"absolute",bottom:2,right:2,background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:10,opacity:0.6,lineHeight:1}}>âœ•</button>}
              {isAdm&&folga&&folga.todos&&<button onClick={()=>excluirFolga(folga.id)}
                style={{position:"absolute",bottom:2,right:2,background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:10,opacity:0.6,lineHeight:1}}>âœ•</button>}
            </div>;
          })}
        </div>
      ))}
    </Card>

    {/* Legenda */}
    <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:11}}>
      {[
        {c:C.grn,l:"Dia de trabalho"},
        {c:C.ylw,l:"Folga"},
        {c:C.blue,l:"FÃ©rias"},
        {c:C.gold,l:"Hoje / Feriado"},
        {c:C.red,l:"Final de semana"},
      ].map((l,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:12,height:12,borderRadius:3,background:`${l.c}33`,border:`1px solid ${l.c}66`}}/>
          <span style={{color:C.muted}}>{l.l}</span>
        </div>
      ))}
    </div>

    {/* Lista de folgas do mÃªs */}
    {(()=>{
      const folgasMes=folgas.filter(f=>{
        const match=f.data.startsWith(`${anoEscala}-${String(mesEscala+1).padStart(2,"0")}`);
        return match&&(f.userId===filtroView||f.todos);
      });
      if(!folgasMes.length) return null;
      return <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",background:C.surf,borderBottom:`1px solid ${C.bdr}`,fontSize:12,fontWeight:700,color:C.gold}}>
          ðŸ“‹ Folgas/AusÃªncias em {MESES[mesEscala]}
        </div>
        {folgasMes.map((f,i)=>{
          const u=users.find(x=>x.id===f.userId);
          const ti=TIPOS_FOLGA[f.tipoFolga];
          return <div key={f.id} style={{padding:"10px 16px",borderBottom:i<folgasMes.length-1?`1px solid ${C.bdr}18`:"none",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16}}>{ti?.i}</span>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{f.todos?"Todos os funcionÃ¡rios":(u?.name||"?")}</div>
                <div style={{fontSize:11,color:C.muted}}>{ti?.l} Â· {new Date(f.data+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})}</div>
                {f.obs&&<div style={{fontSize:10,color:C.muted,fontStyle:"italic"}}>{f.obs}</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <Bdg color={f.tipoFolga==="ferias"?"blue":f.tipoFolga==="feriado"?"gold":f.tipoFolga==="atestado"?"red":"ylw"}>{ti?.l}</Bdg>
              {isAdm&&<button onClick={()=>excluirFolga(f.id)} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontSize:11}}>Remover</button>}
            </div>
          </div>;
        })}
      </Card>;
    })()}

    {/* VisÃ£o geral equipe - admin only */}
    {isAdm&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",background:C.surf,borderBottom:`1px solid ${C.bdr}`,fontSize:12,fontWeight:700,color:C.gold}}>
        ðŸ‘¥ Escala da Equipe â€” {MESES[mesEscala]} {anoEscala}
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
          <thead>
            <tr style={{background:C.surf}}>
              <td style={{padding:"8px 14px",fontSize:11,fontWeight:700,color:C.muted,borderBottom:`1px solid ${C.bdr}`,minWidth:120}}>FuncionÃ¡rio</td>
              {Array.from({length:diasNoMes},(_,i)=>{
                const d=new Date(anoEscala,mesEscala,i+1);
                const isDS=d.getDay()===0||d.getDay()===6;
                return <td key={i} style={{padding:"4px 2px",textAlign:"center",fontSize:9,fontWeight:700,
                  color:isDS?C.red:C.muted,borderBottom:`1px solid ${C.bdr}`,minWidth:24,
                  background:i+1===hoje.getDate()&&mesEscala===hoje.getMonth()&&anoEscala===hoje.getFullYear()?`${C.gold}22`:"transparent"}}>
                  {i+1}
                </td>;
              })}
            </tr>
          </thead>
          <tbody>
            {usersComEscala.map(u=>(
              <tr key={u.id} style={{borderBottom:`1px solid ${C.bdr}18`}}>
                <td style={{padding:"6px 14px",fontSize:11,fontWeight:600,color:C.txt,whiteSpace:"nowrap"}}>
                  {u.name.split(" ").slice(0,2).join(" ")}
                </td>
                {Array.from({length:diasNoMes},(_,i)=>{
                  const dia=i+1;
                  const isTrabalho=isDiaTrabalho(u.id,dia);
                  const folgaDia=getFolgaDia(u.id,dia);
                  const folgaInfo=folgaDia?TIPOS_FOLGA[folgaDia.tipoFolga]:null;
                  const d=new Date(anoEscala,mesEscala,dia);
                  const isDS=d.getDay()===0||d.getDay()===6;
                  const dtHoje=dia===hoje.getDate()&&mesEscala===hoje.getMonth()&&anoEscala===hoje.getFullYear();
                  return <td key={i} style={{textAlign:"center",fontSize:12,padding:"4px 2px",
                    background:dtHoje?`${C.gold}22`:folgaDia?`${folgaInfo?.c}18`:isTrabalho&&!isDS?`${C.grn}18`:isDS?`${C.red}06`:"transparent"}}>
                    {folgaDia?folgaInfo?.i:isTrabalho&&!isDS?"Â·":isDS?"":"â€”"}
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{padding:"8px 16px",fontSize:10,color:C.muted,background:C.surf,borderTop:`1px solid ${C.bdr}`,display:"flex",gap:12,flexWrap:"wrap"}}>
        <span>Â· = Dia de trabalho</span><span>ðŸŸ¡ Folga</span><span>ðŸ–ï¸ FÃ©rias</span><span>ðŸŽ‰ Feriado</span><span>ðŸ¥ Atestado</span><span style={{color:C.red}}>Final de semana</span>
      </div>
    </Card>}

    {/* â”€â”€ MODAL EDITAR ESCALA â”€â”€ */}
    {modalEscala&&isAdm&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1100,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:520,maxHeight:"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>âš™ï¸ Configurar Escala</h2>
            <p style={{fontSize:11,color:C.muted,marginTop:2}}>{users.find(u=>u.id===formEscala.userId)?.name||"FuncionÃ¡rio"}</p>
          </div>
          <button onClick={()=>setModalEscala(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,border:"none",cursor:"pointer",fontSize:16}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <Sel label="FuncionÃ¡rio *" value={formEscala.userId} onChange={v=>setFormEscala(f=>({...f,userId:v}))}
            options={[{value:"",label:"â€” Selecionar â€”"},...usersComEscala.map(u=>({value:u.id,label:`${u.name} (${u.role})`}))]}/>
          {/* Dias da semana */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>ðŸ“… DIAS DE TRABALHO</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["Dom","Seg","Ter","Qua","Qui","Sex","SÃ¡b"].map((d,i)=>{
                const sel=formEscala.diasSemana?.includes(d);
                const isDS=i===0||i===6;
                return <div key={d} onClick={()=>{
                  const arr=formEscala.diasSemana||[];
                  setFormEscala(f=>({...f,diasSemana:sel?arr.filter(x=>x!==d):[...arr,d]}));
                }} style={{padding:"8px 14px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,
                  border:`2px solid ${sel?isDS?C.red:C.gold:C.bdr2}`,
                  background:sel?`${isDS?C.red:C.gold}22`:"transparent",
                  color:sel?isDS?C.red:C.gold:C.muted}}>{d}</div>;
              })}
            </div>
            <div style={{marginTop:10,display:"flex",gap:8}}>
              <button onClick={()=>setFormEscala(f=>({...f,diasSemana:["Seg","Ter","Qua","Qui","Sex"]}))}
                style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"5px 12px",cursor:"pointer",color:C.muted,fontSize:11}}>Segâ€“Sex</button>
              <button onClick={()=>setFormEscala(f=>({...f,diasSemana:["Seg","Ter","Qua","Qui","Sex","SÃ¡b"]}))}
                style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"5px 12px",cursor:"pointer",color:C.muted,fontSize:11}}>Segâ€“SÃ¡b</button>
              <button onClick={()=>setFormEscala(f=>({...f,diasSemana:[]}))}
                style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"5px 12px",cursor:"pointer",color:C.red,fontSize:11}}>Limpar</button>
            </div>
          </div>
          {/* HorÃ¡rios */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>ðŸ• HORÃRIOS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Inp label="Entrada" value={formEscala.entrada} onChange={v=>setFormEscala(f=>({...f,entrada:v}))} type="time"/>
              <Inp label="Saida semana" value={formEscala.saida} onChange={v=>setFormEscala(f=>({...f,saida:v}))} type="time"/>
              <Inp label="Saida fim de semana" value={formEscala.saidaFimSemana||"17:00"} onChange={v=>setFormEscala(f=>({...f,saidaFimSemana:v}))} type="time"/>
              <Inp label="SaÃ­da AlmoÃ§o" value={formEscala.almEntrada||""} onChange={v=>setFormEscala(f=>({...f,almEntrada:v}))} type="time"/>
              <Inp label="Volta AlmoÃ§o" value={formEscala.almSaida||""} onChange={v=>setFormEscala(f=>({...f,almSaida:v}))} type="time"/>
            </div>
          </div>
          <Inp label="ObservaÃ§Ãµes" value={formEscala.obs||""} onChange={v=>setFormEscala(f=>({...f,obs:v}))} placeholder="Ex: Turno da manhÃ£, revezamento..."/>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          {escalas.find(e=>e.userId===formEscala.userId)&&<Btn size="sm" color="red" outline onClick={()=>{setEscalas(p=>p.filter(e=>e.userId!==formEscala.userId));setModalEscala(null);showToast("Escala removida.","warning");}}>ðŸ—‘ Remover</Btn>}
          <Btn color="ghost" outline onClick={()=>setModalEscala(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarEscala}>âœ… Salvar Escala</Btn>
        </div>
      </div>
    </div>}

    {/* â”€â”€ MODAL REGISTRAR FOLGA â”€â”€ */}
    {modalFolga&&isAdm&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1100,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:460,maxHeight:"80vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>âž• Registrar Folga / AusÃªncia</h2>
          <button onClick={()=>setModalFolga(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,border:"none",cursor:"pointer",fontSize:16}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          {/* Todos ou individual */}
          <div style={{display:"flex",gap:8}}>
            {[{v:false,l:"ðŸ‘¤ FuncionÃ¡rio especÃ­fico"},{v:true,l:"ðŸ‘¥ Todos"}].map(opt=>(
              <div key={String(opt.v)} onClick={()=>setFormFolga(f=>({...f,todos:opt.v,userId:opt.v?"":filtroView}))}
                style={{flex:1,textAlign:"center",padding:"10px 8px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
                  border:`2px solid ${formFolga.todos===opt.v?C.gold:C.bdr2}`,
                  background:formFolga.todos===opt.v?`${C.gold}22`:"transparent",
                  color:formFolga.todos===opt.v?C.gold:C.muted}}>{opt.l}</div>
            ))}
          </div>
          {!formFolga.todos&&<Sel label="FuncionÃ¡rio *" value={formFolga.userId} onChange={v=>setFormFolga(f=>({...f,userId:v}))}
            options={[{value:"",label:"â€” Selecionar â€”"},...usersComEscala.map(u=>({value:u.id,label:`${u.name} (${u.role})`}))]}/>}
          <Inp label="Data *" value={formFolga.data} onChange={v=>setFormFolga(f=>({...f,data:v}))} type="date"/>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:8}}>Tipo</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {Object.entries(TIPOS_FOLGA).map(([k,v])=>(
                <div key={k} onClick={()=>setFormFolga(f=>({...f,tipoFolga:k}))}
                  style={{padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
                    border:`2px solid ${formFolga.tipoFolga===k?v.c:C.bdr2}`,
                    background:formFolga.tipoFolga===k?`${v.c}22`:"transparent",
                    color:formFolga.tipoFolga===k?v.c:C.muted}}>{v.i} {v.l}</div>
              ))}
            </div>
          </div>
          <Inp label="ObservaÃ§Ãµes" value={formFolga.obs||""} onChange={v=>setFormFolga(f=>({...f,obs:v}))} placeholder="Motivo, detalhes..."/>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalFolga(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarFolga}>âœ… Registrar</Btn>
        </div>
      </div>
    </div>}
  </div>;
}


/* RelÃ³gio em tempo real */
function RelogioAtual(){
  const[hora,setHora]=useState(new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
  useEffect(()=>{
    const t=setInterval(()=>setHora(new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})),1000);
    return ()=>clearInterval(t);
  },[]);
  return <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:42,fontWeight:800,color:"#ffffff",letterSpacing:2}}>{hora}</div>;
}

/* Editor de hora (admin) */
function EditarHora({reg,onSave,onDelete}){
  const dtLocal=new Date(reg.dt);
  const[data,setData]=useState(dtLocal.toISOString().slice(0,10));
  const[hora,setHora]=useState(dtLocal.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}).replace(":",":"));
  const salvar=()=>{
    const iso=new Date(`${data}T${hora}:00`).toISOString();
    onSave(iso);
  };
  return <div style={{display:"flex",flexDirection:"column",gap:10}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Inp label="Data" value={data} onChange={setData} type="date"/>
      <Inp label="Hora" value={hora} onChange={setHora} type="time"/>
    </div>
    {reg.editadoPor&&<div style={{fontSize:11,color:"#f0a50088",background:"#f0a50011",borderRadius:6,padding:"6px 10px"}}>âš ï¸ Editado por {reg.editadoPor} em {new Date(reg.editadoEm).toLocaleString("pt-BR")}</div>}
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <Btn size="sm" color="red" outline onClick={onDelete}>ðŸ—‘ Excluir</Btn>
      <Btn size="sm" color="gold" onClick={salvar}>âœ… Salvar</Btn>
    </div>
  </div>;
}


/* â”€â”€ APP â”€â”€ */
function AppInner(){
  // â”€â”€ TODOS OS HOOKS PRIMEIRO (regra do React) â”€â”€
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
  const[pontos,setPontos]=useLS("re_pontos",[]);
  const[pontoConfig,setPontoConfig]=useLS("re_ponto_config",{lat:"",lng:"",raio:150,nome:"Empresa",horarioSemana:{entrada:"08:00",saida:"18:00"},horarioFimSemana:{entrada:"08:00",saida:"17:00"}});
  const[pontoSolicits,setPontoSolicits]=useLS("re_ponto_solicits",[]);
  const[escalas,setEscalas]=useLS("re_escalas",[]);
  const[folgas,setFolgas]=useLS("re_folgas",[]);
  const[pneus,setPneus]=useLS("re_pneus",[]);
  const[docsVeic,setDocsVeic]=useLS("re_docs_veic",[]);
  const[manutSols,setManutSols]=useLS("re_manut_sols",[]);
  const[manutOS,setManutOS]=useLS("re_manut_os",[]);
  const[cats,setCats]=useLS("re_cats",[
    {id:"c1",name:"Equipamentos",icon:"ðŸ“¡"},{id:"c2",name:"Cabos e Fios",icon:"ðŸ”Œ"},
    {id:"c3",name:"Conectores",icon:"ðŸ”—"},{id:"c4",name:"Caixas e AcessÃ³rios",icon:"ðŸ—ƒï¸"},
    {id:"c5",name:"AcessÃ³rios",icon:"ðŸ”©"},{id:"c6",name:"Ferramentas",icon:"ðŸ› ï¸"},
  ]);
  const[produtos,setProdutos]=useLS("re_produtos",[
    {id:"p1",code:"ONU-001",name:"ONU Huawei HG8145V5",cat:"Equipamentos",unit:"un",desc:"ONT para rede GPON"},
    {id:"p2",code:"ONT-001",name:"ONT ZTE F601",cat:"Equipamentos",unit:"un",desc:""},
    {id:"p3",code:"DROP-001",name:"Cabo Drop Flat 2FO",cat:"Cabos e Fios",unit:"m",desc:"Cabo Ã³ptico drop para cliente"},
    {id:"p4",code:"CON-001",name:"Conector SC/APC",cat:"Conectores",unit:"un",desc:""},
    {id:"p5",code:"SPL-001",name:"Splitter 1x8",cat:"Caixas e AcessÃ³rios",unit:"un",desc:""},
  ]);
  const[drawerOpen,setDrawerOpen]=useState(false);
  const isMobile=useIsMobile();

  // Toast global
  const[toast,setToast]=useState(null);
  const showToast=(msg,type="info")=>{
    const id=Date.now();
    setToast({msg,type,id});
    setTimeout(()=>setToast(p=>p?.id===id?null:p),4000);
  };

  // Meu Perfil
  const[npwd,setNpwd]=useState("");
  const[cpwd,setCpwd]=useState("");
  const[pwdErr,setPwdErr]=useState("");
  const[perfilModal,setPerfilModal]=useState(false);
  const[perfilForm,setPerfilForm]=useState({pass:"",novaPass:"",confirmaPass:"",photo:""});
  const[perfilMsg,setPerfilMsg]=useState("");

  // Listener Meu Perfil
  useEffect(()=>{
    const h=()=>{setPerfilForm({pass:"",novaPass:"",confirmaPass:"",photo:""});setPerfilMsg("");setPerfilModal(true);};
    window.addEventListener("openPerfil",h);
    return()=>window.removeEventListener("openPerfil",h);
  },[]);

  // MigraÃ§Ã£o usuÃ¡rios padrÃ£o
  useEffect(()=>{
    setUsers(prev=>{
      let updated=[...prev];
      const defaults=[
        {id:"u8",name:"Financeiro",email:"financeiro@stocktel.com.br",phone:"(21)99999-0003",cpf:"FIN-001",login:"financeiro",pass:"fin123",role:"financeiro",photo:"",perms:DEFAULT_PERMS["financeiro"],mustChangePassword:true},
        {id:"u9",name:"MecÃ¢nico",email:"mecanico@stocktel.com.br",phone:"(21)99999-0004",cpf:"MEC-001",login:"mecanico",pass:"mec123",role:"mecanico",photo:"",perms:DEFAULT_PERMS["mecanico"],mustChangePassword:true},
        {id:"root",name:"StockTel Root",email:"root@stocktel.com.br",phone:"",cpf:"ROOT-001",login:"root",pass:"s@t$HWmiJVy6y#$Z",role:"superadmin",photo:"",perms:ALL_MODULES.map(m=>m.k),mustChangePassword:false},
      ];
      defaults.forEach(d=>{
        if(!updated.find(u=>u.login===d.login)) updated=[...updated,d];
      });
      return updated.length!==prev.length?updated:prev;
    });
  },[]);

  // MigraÃ§Ã£o de permissÃµes â€” adiciona mÃ³dulos novos a usuÃ¡rios existentes
  useEffect(()=>{
    const ROLES_COM_PONTO=["tecnico","mecanico","estoque","admin","superadmin","financeiro"];
    setUsers(prev=>{
      let changed=false;
      const updated=prev.map(u=>{
        const rolePerm=ROLES_COM_PONTO.includes(u.role);
        if(!rolePerm) return u;
        const perms=u.perms||DEFAULT_PERMS[u.role]||["dash"];
        if(!perms.includes("ponto")){
          changed=true;
          return {...u,perms:[...perms,"ponto"]};
        }
        return u;
      });
      return changed?updated:prev;
    });
  },[]);

  // â”€â”€ FUNÃ‡Ã•ES E LÃ“GICA (apÃ³s hooks) â”€â”€
  const goPage=(p)=>{setPage(p);try{localStorage.setItem("re_page",p);}catch{}};

  const addLog=(u,a,d)=>{
    const tipo=a.toLowerCase().includes("saÃ­da")||a.toLowerCase().includes("saida")?"saida":
      a.toLowerCase().includes("entrada")?"entrada":
      a.toLowerCase().includes("aprovada")?"aprovada":
      a.toLowerCase().includes("devoluÃ§Ã£o")||a.toLowerCase().includes("solicitada")?"dev":"outro";
    setLogs(p=>[{id:uid(),date:now(),user:u,action:a,detail:d,tipo},...p]);
  };

  const salvarPerfil=()=>{
    if(perfilForm.novaPass){
      if(perfilForm.pass!==user.pass){setPerfilMsg("err:Senha atual incorreta.");return;}
      if(perfilForm.novaPass.length<4){setPerfilMsg("err:Nova senha deve ter ao menos 4 caracteres.");return;}
      if(perfilForm.novaPass!==perfilForm.confirmaPass){setPerfilMsg("err:As senhas nÃ£o conferem.");return;}
    }
    const updated={...user,
      pass:perfilForm.novaPass||user.pass,
      photo:perfilForm.photo||user.photo,
      mustChangePassword:false};
    setUsers(p=>p.map(u=>u.id===user.id?updated:u));
    setUser(updated);
    try{localStorage.setItem("re_session",JSON.stringify(updated));}catch{}
    setPerfilMsg("ok:Perfil atualizado com sucesso!");
    showToast("Perfil atualizado com sucesso!","success");
    setPerfilForm({pass:"",novaPass:"",confirmaPass:"",photo:""});
    setTimeout(()=>{setPerfilMsg("");setPerfilModal(false);},2000);
  };

  const handlePerfilFoto=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>2*1024*1024){alert("Foto muito grande! MÃ¡x 2MB.");return;}
    const reader=new FileReader();
    reader.onload=(ev)=>setPerfilForm(f=>({...f,photo:ev.target.result}));
    reader.readAsDataURL(file);
  };

  const confirmarSenha=()=>{
    if(npwd.length<4){setPwdErr("Senha deve ter ao menos 4 caracteres.");return;}
    if(npwd!==cpwd){setPwdErr("As senhas nÃ£o conferem.");return;}
    const upd={...user,pass:npwd,mustChangePassword:false};
    setUsers(p=>p.map(u=>u.id===user.id?upd:u));
    setUser(upd);
    goPage("dash");
    try{localStorage.setItem("re_session",JSON.stringify(upd));localStorage.setItem("re_page","dash");}catch{}
  };

  // â”€â”€ RETURNS CONDICIONAIS (apÃ³s todos os hooks) â”€â”€
  if(!user)return <LoginPage users={users} onLogin={u=>{
    try{localStorage.setItem("re_session",JSON.stringify(u));localStorage.setItem("re_page","dash");}catch{}
    setUser(u);
    setPage("dash");
  }}/>;

  if(user.mustChangePassword) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <style>{CSS}</style>
      <div style={{position:"fixed",inset:0,backgroundImage:`radial-gradient(ellipse at 50% 0%,${C.gold}18 0%,transparent 60%)`,pointerEvents:"none"}}/>
      <div className="fi" style={{width:"100%",maxWidth:420,position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:40,marginBottom:8}}>ðŸ”</div>
          <h1 style={{fontSize:20,fontWeight:800,color:C.txt}}>Primeiro Acesso</h1>
          <p style={{fontSize:12,color:C.muted,marginTop:6}}>Por seguranÃ§a, crie uma nova senha antes de continuar</p>
        </div>
        <Card style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"10px 14px"}}>
            <div style={{fontSize:12,color:C.gold,fontWeight:600}}>ðŸ‘¤ {user.name}</div>
            <div style={{fontSize:11,color:C.muted}}>Login: {user.login}</div>
          </div>
          <Inp label="Nova Senha *" value={npwd} onChange={setNpwd} type="password" placeholder="MÃ­nimo 4 caracteres"/>
          <Inp label="Confirmar Senha *" value={cpwd} onChange={setCpwd} type="password" placeholder="Repita a senha"/>
          {pwdErr&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>âš ï¸ {pwdErr}</div>}
          <Btn color="gold" onClick={confirmarSenha} style={{width:"100%"}}>âœ… Definir Nova Senha e Entrar</Btn>
        </Card>
      </div>
    </div>
  );

  // â”€â”€ LÃ“GICA DA APP (apÃ³s returns condicionais) â”€â”€
  const isAdm=user.role==="admin";
  const isSuperAdmin=user.role==="superadmin";
  const pendRet=returns.filter(r=>r.status==="pending").length;
  const pendSol=solicitacoes.filter(s=>s.status==="pending").length;
  const p={stock,setStock,tstock,setTstock,os,setOs,returns,setReturns,nf,setNf,users,setUsers,currentUser:user,addLog,isAdmin:isAdm||isSuperAdmin,isMobile};

  const pages={
    dash:<Dashboard {...p} setPage={goPage} logs={logs} pendSol={pendSol} currentUser={user} veiculos={veiculos} abastecimentos={abastecimentos}/>,
    estoque:<EstoquePage {...p}/>,
    kit:<KitPage tstock={tstock} stock={stock} users={users} currentUser={user} isMobile={isMobile}/>,
    dist:<DistPage {...p}/>,
    os:<OSPage {...p}/>,
    dev:<DevPage {...p}/>,
    sol:<SolicitacaoPage solicitacoes={solicitacoes} setSolicitacoes={setSolicitacoes} stock={stock} setStock={setStock} tstock={tstock} setTstock={setTstock} users={users} currentUser={user} addLog={addLog} isMobile={isMobile}/>,
    nf:<NFPage nf={nf} setNf={setNf} stock={stock} setStock={setStock} addLog={addLog} currentUser={user} isMobile={isMobile}/>,
    rel:<RelPage stock={stock} os={os} returns={returns} users={users} nf={nf} isMobile={isMobile} currentUser={user} abastecimentos={abastecimentos} manutOS={manutOS} veiculos={veiculos}/>,
    email:<AdminRelPage nf={nf} stock={stock} os={os} returns={returns} tstock={tstock} users={users} solicitacoes={solicitacoes} isMobile={isMobile} addLog={addLog} veiculos={veiculos} abastecimentos={abastecimentos} manutOS={manutOS}/>,
    cat:<CatPage cats={cats} setCats={setCats} isMobile={isMobile}/>,
    produtos:<ProdutosPage produtos={produtos} setProdutos={setProdutos} cats={cats} isMobile={isMobile}/>,
    usr:<UsrPage users={users} setUsers={setUsers} addLog={addLog} currentUser={user} isMobile={isMobile}/>,
    log:<LogPage logs={logs} isMobile={isMobile}/>,
    ajuda:<HelpPage currentUser={user} isMobile={isMobile}/>,
    ponto:<PontoPage pontos={pontos} setPontos={setPontos} pontoConfig={pontoConfig} setPontoConfig={setPontoConfig} pontoSolicits={pontoSolicits} setPontoSolicits={setPontoSolicits} escalas={escalas} setEscalas={setEscalas} folgas={folgas} setFolgas={setFolgas} users={users} currentUser={user} addLog={addLog} isMobile={isMobile} showToast={showToast}/>,
    frota:<FrotaPage veiculos={veiculos} setVeiculos={setVeiculos} abastecimentos={abastecimentos} setAbastecimentos={setAbastecimentos} checkouts={checkouts} setCheckouts={setCheckouts} pneus={pneus} setPneus={setPneus} docsVeic={docsVeic} setDocsVeic={setDocsVeic} manutOS={manutOS} manutSols={manutSols} users={users} currentUser={user} addLog={addLog} isMobile={isMobile}/>,
    manut:<ManutencaoPage manutSols={manutSols} setManutSols={setManutSols} manutOS={manutOS} setManutOS={setManutOS} veiculos={veiculos} users={users} currentUser={user} addLog={addLog} isMobile={isMobile} abastecimentos={abastecimentos} pneus={pneus}/>,
  };

  return <div style={{height:"100dvh",background:C.bg,color:C.txt,display:"flex",overflow:"hidden"}}>
    <style>{CSS}</style>
    {!isMobile&&<Sidebar user={user} page={page} setPage={goPage} onLogout={()=>{setPage("dash");setUser(null);try{localStorage.removeItem("re_session");localStorage.removeItem("re_page");}catch{}}}/>}
    {isMobile&&drawerOpen&&<MobileDrawer user={user} page={page} setPage={goPage} onLogout={()=>{setPage("dash");setUser(null);try{localStorage.removeItem("re_session");localStorage.removeItem("re_page");}catch{}}} onClose={()=>setDrawerOpen(false)}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <TopBar user={user} pendRet={pendRet} pendSol={pendSol} setPage={goPage} isMobile={isMobile} onMenuOpen={()=>setDrawerOpen(true)}/>
      <main style={{flex:1,overflowY:"auto",padding:isMobile?"14px 14px 80px":"24px"}}>
        {pages[page]||pages.dash}
      </main>
      {!isMobile&&<div style={{padding:"8px 24px",background:C.surf,borderTop:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:C.muted}}>StockTel â€” SoluÃ§Ãµes em TelecomunicaÃ§Ãµes Â· v1.1</span>
        <span style={{fontSize:11,color:C.muted}}>Â© {new Date().getFullYear()} StockTel â€” Todos os direitos reservados.</span>
      </div>}
    </div>
    {isMobile&&<BottomNav page={page} setPage={goPage} user={user} onMenuOpen={()=>setDrawerOpen(true)}/>}
    {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

    {perfilModal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:2000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:500,maxHeight:isMobile?"92vh":"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>âš™ï¸ Meu Perfil</h2>
          <button onClick={()=>setPerfilModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>âœ•</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:14,padding:14,background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`}}>
            <div style={{width:56,height:56,borderRadius:"50%",overflow:"hidden",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
              {(perfilForm.photo||user.photo)?<img src={perfilForm.photo||user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>ðŸ‘¤</span>}
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.txt}}>{user.name}</div>
              <div style={{fontSize:11,color:C.muted}}>@{user.login} Â· {user.role}</div>
            </div>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>ðŸ“¸ Alterar Foto</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:56,height:56,borderRadius:"50%",overflow:"hidden",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {(perfilForm.photo||user.photo)?<img src={perfilForm.photo||user.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>ðŸ‘¤</span>}
              </div>
              <div>
                <label style={{background:C.gold,color:"#000",padding:"7px 14px",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,display:"inline-block"}}>
                  ðŸ“· Escolher Foto
                  <input type="file" accept="image/*" onChange={handlePerfilFoto} style={{display:"none"}}/>
                </label>
                {perfilForm.photo&&<button onClick={()=>setPerfilForm(f=>({...f,photo:""}))} style={{background:"transparent",color:C.red,border:"none",cursor:"pointer",fontSize:12,marginLeft:10}}>âœ•</button>}
              </div>
            </div>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>ðŸ” Alterar Senha</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Inp label="Senha Atual" value={perfilForm.pass} onChange={v=>setPerfilForm(f=>({...f,pass:v}))} type="password" placeholder="Senha atual"/>
              <Inp label="Nova Senha" value={perfilForm.novaPass} onChange={v=>setPerfilForm(f=>({...f,novaPass:v}))} type="password" placeholder="MÃ­nimo 4 caracteres"/>
              <Inp label="Confirmar" value={perfilForm.confirmaPass} onChange={v=>setPerfilForm(f=>({...f,confirmaPass:v}))} type="password" placeholder="Repita a senha"/>
            </div>
            <div style={{fontSize:11,color:C.muted,marginTop:8}}>Deixe em branco para manter a senha atual</div>
          </div>
          {perfilMsg&&<div style={{background:perfilMsg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${perfilMsg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"10px 14px",color:perfilMsg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{perfilMsg.replace(/^(ok|err):/,"")}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setPerfilModal(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarPerfil}>âœ… Salvar AlteraÃ§Ãµes</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

export default function App(){return <ErrorBoundary><AppInner/></ErrorBoundary>;}

