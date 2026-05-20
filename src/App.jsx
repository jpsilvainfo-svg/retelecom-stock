import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";

const C = {
  bg:"#141414",surf:"#1c1c1c",card:"#222222",bdr:"#2e2e2e",bdr2:"#383838",
  gold:"#f0a500",goldD:"#f0a50022",goldL:"#f5b830",
  red:"#e53935",redD:"#e5393522",grn:"#43a047",grnD:"#43a04722",
  ylw:"#fb8c00",ylwD:"#fb8c0022",blue:"#1e88e5",
  txt:"#ffffff",txt2:"#cccccc",muted:"#888888",muted2:"#555555",
};
const PIE=["#f0a500","#666666","#999999","#444444","#bbbbbb"];
let _id=300;
const uid=()=>`${++_id}_${Date.now()}`;
const now=()=>new Date().toLocaleString("pt-BR");
const today=()=>new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})+" - "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const fmt=(n)=>new Intl.NumberFormat("pt-BR").format(n??0);

const USERS0=[
  {id:"u1",name:"Administrador",email:"admin@retelecom.com",phone:"(21)99999-0001",cpf:"000.000.000-01",login:"admin",pass:"admin123",role:"admin"},
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
  {id:"os4",uid:"u6",os:"OS-20250520018",client:"Carlos Lima",cpf:"222.222.222-04",date:"20/05/2025 11:00",items:[{sid:"s6",qty:35},{sid:"s9",qty:3},{sid:"s1",qty:1}],notes:"Reconexão"},
  {id:"os5",uid:"u7",os:"OS-20250519011",client:"Lucia Santos",cpf:"222.222.222-05",date:"19/05/2025 09:30",items:[{sid:"s6",qty:25},{sid:"s8",qty:2}],notes:"Upgrade"},
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
  {id:"l1",date:"23/05/2025 10:30",user:"João Silva",action:"Saída",detail:"Liberação para técnico · OS: OS-20250523001",tipo:"saida"},
  {id:"l2",date:"23/05/2025 09:15",user:"Carlos Alberto",action:"Devolução Solicitada",detail:"Técnico: Carlos Alberto · OS: OS-20250522045",tipo:"dev"},
  {id:"l3",date:"22/05/2025 16:45",user:"Administrador",action:"Entrada",detail:"Nota Fiscal: 1258 · Fornecedor: Fiber Total",tipo:"entrada"},
  {id:"l4",date:"22/05/2025 14:20",user:"Administrador",action:"Devolução Aprovada",detail:"Técnico: João Paulo · OS: OS-20250521032",tipo:"aprovada"},
  {id:"l5",date:"21/05/2025 11:00",user:"João Paulo",action:"Saída",detail:"Liberação para técnico · OS: OS-20250521032",tipo:"saida"},
];

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#141414;font-family:'Inter',sans-serif;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:#1c1c1c;}
::-webkit-scrollbar-thumb{background:#333;border-radius:4px;}
button{cursor:pointer;border:none;font-family:'Inter',sans-serif;}
input,select,textarea{font-family:'Inter',sans-serif;border:none;outline:none;}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.fi{animation:fadeIn .2s ease}
`;

function Btn({children,onClick,color="gold",size="md",disabled,style:sx={},outline,full}){
  const pal={gold:{bg:C.gold,fg:"#000"},red:{bg:C.red,fg:"#fff"},grn:{bg:C.grn,fg:"#fff"},ghost:{bg:"transparent",fg:C.muted}};
  const p=pal[color]||pal.gold;
  const sz={xs:{padding:"4px 10px",fontSize:11},sm:{padding:"6px 14px",fontSize:12},md:{padding:"9px 20px",fontSize:13},lg:{padding:"11px 24px",fontSize:14}}[size];
  return <button onClick={onClick} disabled={disabled} style={{background:outline?"transparent":p.bg,color:outline?p.bg:p.fg,border:outline?`1px solid ${p.bg}`:"none",borderRadius:6,fontWeight:600,opacity:disabled?.4:1,width:full?"100%":"auto",...sz,...sx}}>{children}</button>;
}
function Inp({label,value,onChange,type="text",placeholder,style:sx={}}){
  return <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase"}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"9px 12px",color:C.txt,fontSize:13,width:"100%",...sx}}/>
  </div>;
}
function Sel({label,value,onChange,options,style:sx={}}){
  return <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase"}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"9px 12px",color:C.txt,fontSize:13,width:"100%",...sx}}>
      {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>;
}
function Card({children,style:sx={},onClick}){
  return <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,...sx}}>{children}</div>;
}
function Bdg({children,color="gold"}){
  const p={gold:{bg:C.goldD,fg:C.gold},red:{bg:C.redD,fg:C.red},grn:{bg:C.grnD,fg:C.grn},ylw:{bg:C.ylwD,fg:C.ylw},muted:{bg:"#88888820",fg:C.muted}}[color]||{bg:C.goldD,fg:C.gold};
  return <span style={{background:p.bg,color:p.fg,padding:"3px 10px",borderRadius:4,fontSize:11,fontWeight:700,letterSpacing:".04em",display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>{children}</span>;
}
function Modal({title,children,onClose,wide}){
  return <div style={{position:"fixed",inset:0,background:"#000000bb",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"48px 16px",overflowY:"auto"}}>
    <div className="fi" style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:12,padding:28,width:wide?740:480,maxWidth:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,paddingBottom:16,borderBottom:`1px solid ${C.bdr}`}}>
        <h2 style={{fontSize:16,fontWeight:700,color:C.txt}}>{title}</h2>
        <button onClick={onClose} style={{background:C.surf,color:C.muted,width:30,height:30,borderRadius:6,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      {children}
    </div>
  </div>;
}
function THead({cols}){
  return <tr>{cols.map((c,i)=><th key={i} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",background:C.surf,borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{c}</th>)}</tr>;
}
function TRow({cells}){
  return <tr style={{borderBottom:`1px solid ${C.bdr}22`}}>
    {cells.map((c,i)=><td key={i} style={{padding:"10px 14px",fontSize:13,color:C.txt2,verticalAlign:"middle"}}>{c}</td>)}
  </tr>;
}

function LoginPage({users,onLogin}){
  const[login,setLogin]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const go=()=>{const u=users.find(u=>u.login===login&&u.pass===pass);if(u)onLogin(u);else setErr("Login ou senha inválidos.");};
  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <style>{CSS}</style>
    <div style={{position:"fixed",inset:0,backgroundImage:`radial-gradient(ellipse at 50% 0%,${C.gold}18 0%,transparent 60%)`,pointerEvents:"none"}}/>
    <div className="fi" style={{width:420,position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{marginBottom:12,display:"flex",justifyContent:"center"}}>
          <img src="/logo-retelecom.jpg" alt="R&E Telecom" style={{height:90,objectFit:"contain",filter:"drop-shadow(0 4px 16px rgba(240,165,0,0.3))"}}/>
        </div>
        <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".12em",textTransform:"uppercase",marginBottom:4}}>Sistema de Gestão de Estoque</div>
        <div style={{fontSize:13,color:C.muted}}>para Provedores FTTH</div>
      </div>
      <Card style={{padding:28,display:"flex",flexDirection:"column",gap:16}}>
        <Inp label="Login" value={login} onChange={setLogin} placeholder="Digite seu usuário"/>
        <Inp label="Senha" value={pass} onChange={setPass} type="password" placeholder="Digite sua senha"/>
        {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:6,padding:"9px 12px",color:C.red,fontSize:12}}>⚠️ {err}</div>}
        <Btn onClick={go} color="gold" size="lg" style={{width:"100%",marginTop:4,borderRadius:8}}>Entrar</Btn>
      </Card>

    </div>
  </div>;
}

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
    {k:"rel",icon:"📊",label:"Relatórios"},
    isAdm&&{k:"usr",icon:"👥",label:"Usuários"},
    isAdm&&{k:"log",icon:"📋",label:"Logs do Sistema"},
  ].filter(Boolean);
  return <div style={{width:220,minWidth:220,background:C.surf,borderRight:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column",height:"100vh",flexShrink:0}}>
    <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <img src="/logo-retelecom.jpg" alt="R&E Telecom" style={{height:52,objectFit:"contain",filter:"drop-shadow(0 2px 8px rgba(240,165,0,0.25))"}}/>
    </div>
    <div style={{padding:"10px 16px 8px",borderBottom:`1px solid ${C.bdr}`}}>
      <div style={{fontSize:11,color:C.muted2,lineHeight:1.4}}>Sistema de Gestão de Estoque para Provedores FTTH</div>
    </div>
    <nav style={{flex:1,padding:"8px 8px",overflowY:"auto"}}>
      {nav.map(n=>(
        <div key={n.k} onClick={()=>setPage(n.k)}
          style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:7,cursor:"pointer",marginBottom:2,
            background:page===n.k?`${C.gold}18`:"transparent",
            borderLeft:page===n.k?`3px solid ${C.gold}`:"3px solid transparent",
            color:page===n.k?C.gold:C.muted,fontWeight:page===n.k?600:400,fontSize:13}}>
          <span style={{fontSize:15,flexShrink:0}}>{n.icon}</span><span>{n.label}</span>
        </div>
      ))}
    </nav>
    <div style={{padding:"12px 12px",borderTop:`1px solid ${C.bdr}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 10px",background:C.card,borderRadius:8}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>👤</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
          <div style={{fontSize:10,color:C.muted}}>{user.email}</div>
        </div>
        <span style={{background:C.gold,color:"#000",fontSize:9,fontWeight:800,padding:"2px 5px",borderRadius:3,letterSpacing:".05em",flexShrink:0}}>
          {user.role==="admin"?"ADM":user.role==="estoque"?"EST":"TEC"}
        </span>
      </div>
      <div onClick={onLogout} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer",color:C.muted,fontSize:12,marginTop:4,borderRadius:6}}>
        <span>🚪</span>Sair do sistema
      </div>
    </div>
  </div>;
}

function TopBar({user,pendRet,setPage}){
  return <div style={{height:56,background:C.surf,borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",padding:"0 24px",gap:16,flexShrink:0}}>
    <div style={{flex:1}}>
      <div style={{fontSize:14,fontWeight:600,color:C.txt}}>Bem-vindo, <span style={{color:C.gold}}>{user.name}</span></div>
      <div style={{fontSize:11,color:C.muted}}>{today()}</div>
    </div>
    {pendRet>0&&<div onClick={()=>setPage("dev")} style={{display:"flex",alignItems:"center",gap:6,background:C.ylwD,border:`1px solid ${C.ylw}44`,borderRadius:6,padding:"5px 12px",cursor:"pointer"}}>
      <span style={{fontSize:13}}>🔔</span>
      <span style={{fontSize:12,color:C.ylw,fontWeight:600}}>{pendRet} devolução{pendRet>1?"ões":""} pendente{pendRet>1?"s":""}</span>
    </div>}
    <div style={{width:34,height:34,borderRadius:"50%",background:C.card,border:`1px solid ${C.bdr2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer"}}>🔔</div>
  </div>;
}

function Dashboard({stock,tstock,users,os,returns,logs,setPage}){
  const totalQty=stock.reduce((a,s)=>a+s.qty,0);
  const techQty=tstock.reduce((a,t)=>a+t.qty,0);
  const pendRet=returns.filter(r=>r.status==="pending").length;
  const low=stock.filter(s=>s.qty<=s.min);
  const catData=useMemo(()=>{const m={};stock.forEach(s=>{m[s.cat]=(m[s.cat]||0)+s.qty;});return Object.entries(m).map(([name,value])=>({name,value}));},[stock]);
  const techUsage=useMemo(()=>{const m={};os.forEach(o=>{const u=users.find(x=>x.id===o.uid);const nm=u?.name.split(" ")[0]||"?";const tot=o.items.reduce((a,i)=>a+i.qty,0);if(!m[o.uid])m[o.uid]={name:nm,value:0};m[o.uid].value+=tot;});return Object.values(m).sort((a,b)=>b.value-a.value);},[os,users]);
  const maxU=techUsage[0]?.value||1;
  const lc={saida:C.gold,entrada:C.grn,dev:C.ylw,aprovada:C.grn};
  const li={saida:"→",entrada:"↓",dev:"↺",aprovada:"✓"};
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:20}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
      {[
        {label:"TOTAL DE ITENS",value:fmt(stock.length),sub:"Itens cadastrados",icon:"📦"},
        {label:"ESTOQUE TOTAL",value:fmt(totalQty),sub:"Unidades disponíveis",icon:"🗄️"},
        {label:"MATERIAIS EM USO",value:fmt(techQty),sub:"Com técnicos",icon:"👷"},
        {label:"DEVOLUÇÕES PENDENTES",value:fmt(pendRet),sub:"Aguardando aprovação",icon:"↩️"},
      ].map((s,i)=>(
        <Card key={i} style={{padding:20,display:"flex",gap:16,alignItems:"center"}}>
          <div style={{width:52,height:52,borderRadius:12,background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{s.icon}</div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:".08em",marginBottom:4}}>{s.label}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:28,fontWeight:800,color:C.txt,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>{s.sub}</div>
          </div>
        </Card>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr",gap:16}}>
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.bdr}`}}>
          <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Movimentações Recentes</span>
          <Btn size="xs" color="ghost" outline onClick={()=>setPage("log")} style={{fontSize:11}}>Ver todas</Btn>
        </div>
        <div style={{padding:"4px 0"}}>
          {logs.slice(0,4).map(l=>(
            <div key={l.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 18px",borderBottom:`1px solid ${C.bdr}18`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:`${lc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,color:lc[l.tipo]||C.gold,fontWeight:700}}>{li[l.tipo]||"·"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:lc[l.tipo]||C.gold}}>{l.action.toUpperCase()}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,flexShrink:0}}>{l.date}</span>
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.detail}</div>
                {l.tipo==="dev"&&<span style={{display:"inline-block",marginTop:4}}><Bdg color="ylw">Pendente</Bdg></span>}
                {l.tipo==="aprovada"&&<span style={{display:"inline-block",marginTop:4}}><Bdg color="grn">Aprovado</Bdg></span>}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Estoque por Categoria</span>
          <Btn size="xs" color="ghost" outline onClick={()=>setPage("rel")} style={{fontSize:11}}>Ver relatório</Btn>
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
        <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6}}>
          {catData.map((d,i)=>(
            <div key={d.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:PIE[i%PIE.length],flexShrink:0}}/>
                <span style={{color:C.txt2}}>{d.name}</span>
              </div>
              <span style={{color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{Math.round(d.value/totalQty*100)}%</span>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Técnicos - Consumo (Mês)</span>
          <Btn size="xs" color="ghost" outline onClick={()=>setPage("rel")} style={{fontSize:11}}>Ver relatório</Btn>
        </div>
        {techUsage.map((t,i)=>(
          <div key={t.name} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
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
        <div onClick={()=>setPage("rel")} style={{marginTop:10,fontSize:12,color:C.gold,cursor:"pointer",textAlign:"center",fontWeight:600}}>Ver todos os técnicos →</div>
      </Card>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16}}>
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.bdr}`}}>
          <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Estoque - Itens com Baixo Nível</span>
          <Btn size="xs" color="ghost" outline onClick={()=>setPage("estoque")} style={{fontSize:11}}>Ver todos</Btn>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÓDIGO","DESCRIÇÃO","CATEGORIA","ESTOQUE","MÍNIMO","SITUAÇÃO"]}/></thead>
            <tbody>
              {low.slice(0,5).map(s=>{
                const crit=s.qty<=s.min*0.6;
                return <TRow key={s.id} cells={[
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
          {[
            {icon:"📥",label:"Nova Entrada de Materiais",p:"nf"},
            {icon:"🚀",label:"Liberar Material para Técnico",p:"dist"},
            {icon:"↩️",label:"Devolução de Material",p:"dev"},
            {icon:"🔧",label:"Nova OS",p:"os"},
            {icon:"📦",label:"Estoque Base Completo",p:"estoque"},
            {icon:"🎒",label:"Estoque por Técnico",p:"kit"},
            {icon:"📊",label:"Relatório Entradas e Saídas",p:"rel"},
            {icon:"👥",label:"Relatório de Técnicos",p:"rel"},
            {icon:"📋",label:"Relatório de Devoluções",p:"rel"},
          ].map((a,i)=>(
            <div key={i} onClick={()=>setPage(a.p)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 8px",background:C.surf,borderRadius:8,cursor:"pointer",border:`1px solid ${C.bdr}`,textAlign:"center"}}>
              <span style={{fontSize:20}}>{a.icon}</span>
              <span style={{fontSize:10,color:C.muted2,lineHeight:1.3}}>{a.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>;
}

function EstoquePage({stock,setStock,isAdmin,addLog,currentUser}){
  const[q,setQ]=useState("");
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({code:"",name:"",cat:"Equipamentos",unit:"un",qty:"",min:""});
  const cats=["Equipamentos","Cabos e Fios","Conectores","Caixas e Acessórios","Acessórios","Ferramentas"];
  const filtered=stock.filter(s=>s.name.toLowerCase().includes(q.toLowerCase())||s.code.toLowerCase().includes(q.toLowerCase())||s.cat.toLowerCase().includes(q.toLowerCase()));
  const save=()=>{
    if(!form.name||!form.qty)return;
    if(modal==="new"){setStock(p=>[...p,{id:uid(),code:form.code,name:form.name,cat:form.cat,unit:form.unit,qty:parseInt(form.qty)||0,min:parseInt(form.min)||0}]);addLog(currentUser.name,"Entrada","Novo item: "+form.name);}
    else{setStock(p=>p.map(s=>s.id===modal?{...s,code:form.code,name:form.name,cat:form.cat,unit:form.unit,qty:parseInt(form.qty)||0,min:parseInt(form.min)||0}:s));addLog(currentUser.name,"Edição",form.name);}
    setModal(null);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div><h1 style={{fontSize:20,fontWeight:700,color:C.txt}}>Estoque Base</h1><p style={{fontSize:12,color:C.muted,marginTop:2}}>Gestão do estoque principal do provedor</p></div>
      <div style={{display:"flex",gap:10}}>
        <Inp value={q} onChange={setQ} placeholder="🔍 Buscar..." style={{minWidth:240}}/>
        {isAdmin&&<Btn onClick={()=>{setForm({code:"",name:"",cat:"Equipamentos",unit:"un",qty:"",min:""});setModal("new");}}>+ Novo Item</Btn>}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
      {["Total de itens","Nível OK","Nível baixo","Crítico"].map((l,i)=>{
        const vals=[stock.length,stock.filter(s=>s.qty>s.min*1.5).length,stock.filter(s=>s.qty<=s.min&&s.qty>s.min*0.6).length,stock.filter(s=>s.qty<=s.min*0.6).length];
        const cols=[C.gold,C.grn,C.ylw,C.red];
        return <Card key={i} style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:8,height:40,borderRadius:4,background:cols[i],flexShrink:0}}/>
          <div><div style={{fontSize:11,color:C.muted}}>{l}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:800,color:C.txt}}>{vals[i]}</div></div>
        </Card>;
      })}
    </div>
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["CÓDIGO","DESCRIÇÃO","CATEGORIA","UNIDADE","QTD ATUAL","QTD MÍNIMA","SITUAÇÃO",isAdmin?"AÇÕES":""]}/></thead>
          <tbody>
            {filtered.map(s=>{
              const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;
              return <TRow key={s.id} cells={[
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
    {modal&&<Modal title={modal==="new"?"Novo Item":"Editar Item"} onClose={()=>setModal(null)}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
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

function DistPage({stock,setStock,tstock,setTstock,users,addLog,currentUser}){
  const techs=users.filter(u=>u.role==="tecnico");
  const[techId,setTechId]=useState(techs[0]?.id||"");
  const[items,setItems]=useState([{sid:"",qty:""}]);
  const[msg,setMsg]=useState("");
  const updRow=(i,k,v)=>setItems(p=>p.map((r,j)=>j===i?{...r,[k]:v}:r));
  const send=()=>{
    const valid=items.filter(r=>r.sid&&parseInt(r.qty)>0);if(!valid.length)return;
    let ok=true;valid.forEach(r=>{const si=stock.find(s=>s.id===r.sid);if(!si||si.qty<parseInt(r.qty)){ok=false;alert(`Estoque insuficiente: ${si?.name||r.sid}`);}});
    if(!ok)return;
    setStock(p=>p.map(s=>{const it=valid.find(r=>r.sid===s.id);return it?{...s,qty:s.qty-parseInt(it.qty)}:s;}));
    setTstock(p=>{let n=[...p];valid.forEach(r=>{const ex=n.find(t=>t.uid===techId&&t.sid===r.sid);if(ex)n=n.map(t=>t.id===ex.id?{...t,qty:t.qty+parseInt(r.qty)}:t);else n.push({id:uid(),uid:techId,sid:r.sid,qty:parseInt(r.qty)});});return n;});
    const tech=users.find(u=>u.id===techId);
    addLog(currentUser.name,"Saída",`Liberação para técnico · ${tech?.name} · ${valid.length} item(s)`);
    setMsg(`✅ Materiais liberados para ${tech?.name}!`);setItems([{sid:"",qty:""}]);setTimeout(()=>setMsg(""),4000);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><h1 style={{fontSize:20,fontWeight:700,color:C.txt}}>Saída / Liberação de Materiais</h1><p style={{fontSize:12,color:C.muted,marginTop:2}}>Libere materiais do estoque base para técnicos em campo</p></div>
    {msg&&<div style={{background:C.grnD,border:`1px solid ${C.grn}44`,borderRadius:6,padding:"10px 14px",color:C.grn,fontSize:13}}>{msg}</div>}
    <Card style={{padding:22}}>
      <Sel label="Técnico Destinatário" value={techId} onChange={setTechId} options={techs.map(t=>({value:t.id,label:t.name}))}/>
      <div style={{margin:"20px 0 10px",fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Materiais a Liberar</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {items.map((it,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 140px auto",gap:10,alignItems:"end"}}>
            <Sel value={it.sid} onChange={v=>updRow(i,"sid",v)} options={[{value:"",label:"Selecionar material..."},...stock.map(s=>({value:s.id,label:`[${s.code}] ${s.name} — ${fmt(s.qty)} ${s.unit}`}))]}/>
            <Inp value={it.qty} onChange={v=>updRow(i,"qty",v)} placeholder="Quantidade" type="number"/>
            <Btn size="sm" color="red" outline onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))}>✕</Btn>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginTop:16}}>
        <Btn color="ghost" outline onClick={()=>setItems(p=>[...p,{sid:"",qty:""}])} size="sm">+ Adicionar Material</Btn>
        <Btn color="gold" onClick={send}>🚀 Liberar Materiais</Btn>
      </div>
    </Card>
  </div>;
}

function KitPage({tstock,stock,users,currentUser}){
  const isTec=currentUser.role==="tecnico";
  const[selTech,setSelTech]=useState(users.filter(u=>u.role==="tecnico")[0]?.id||"");
  const viewId=isTec?currentUser.id:selTech;
  const myItems=tstock.filter(t=>t.uid===viewId);
  const tech=users.find(u=>u.id===viewId);
  const total=myItems.reduce((a,t)=>a+t.qty,0);
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div><h1 style={{fontSize:20,fontWeight:700,color:C.txt}}>{isTec?"Meu Estoque":"Estoque Técnico"}</h1></div>
      {!isTec&&<Sel value={selTech} onChange={setSelTech} options={users.filter(u=>u.role==="tecnico").map(t=>({value:t.id,label:t.name}))} style={{width:220}}/>}
    </div>
    {tech&&<Card style={{padding:16,display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:44,height:44,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👷</div>
      <div style={{flex:1}}>
        <div style={{fontSize:15,fontWeight:700,color:C.txt}}>{tech.name}</div>
        <div style={{fontSize:12,color:C.muted}}>{tech.email} · {tech.phone}</div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontSize:11,color:C.muted}}>Total em posse</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:800,color:C.gold}}>{fmt(total)}</div>
      </div>
    </Card>}
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["CÓDIGO","MATERIAL","CATEGORIA","UNIDADE","QTD EM POSSE"]}/></thead>
          <tbody>
            {myItems.length===0
              ?<tr><td colSpan={5} style={{padding:30,textAlign:"center",color:C.muted}}>Nenhum material em posse.</td></tr>
              :myItems.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?<TRow key={t.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
                <span style={{fontWeight:500,color:C.txt}}>{s.name}</span>,
                <span style={{fontSize:12,color:C.muted}}>{s.cat}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.unit}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:18}}>{fmt(t.qty)}</span>
              ]}/>:null;})}
          </tbody>
        </table>
      </div>
    </Card>
  </div>;
}

function OSPage({os,setOs,tstock,setTstock,stock,users,currentUser,addLog}){
  const isTec=currentUser.role==="tecnico";
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({os:"",client:"",cpf:"",notes:"",items:[{sid:"",qty:""}]});
  const[err,setErr]=useState("");
  const myTstock=tstock.filter(t=>t.uid===currentUser.id);
  const myOpts=[{value:"",label:"Selecionar material..."},...myTstock.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?{value:s.id,label:`[${s.code}] ${s.name} — Disponível: ${t.qty} ${s.unit}`}:null;}).filter(Boolean)];
  const updRow=(i,k,v)=>setForm(f=>({...f,items:f.items.map((r,j)=>j===i?{...r,[k]:v}:r)}));
  const viewOs=isTec?os.filter(o=>o.uid===currentUser.id):os;
  const save=()=>{
    if(!form.os||!form.client){setErr("Preencha OS e Cliente.");return;}
    const valid=form.items.filter(r=>r.sid&&parseInt(r.qty)>0);
    if(!valid.length){setErr("Adicione ao menos 1 material.");return;}
    let ok=true;
    valid.forEach(r=>{const ts=myTstock.find(t=>t.sid===r.sid);if(!ts||ts.qty<parseInt(r.qty)){ok=false;setErr(`Qtd insuficiente: ${stock.find(s=>s.id===r.sid)?.name}`);}});
    if(!ok)return;
    setOs(p=>[{id:uid(),uid:currentUser.id,os:form.os,client:form.client,cpf:form.cpf,date:now(),items:valid.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),notes:form.notes},...p]);
    setTstock(p=>p.map(t=>{const it=valid.find(r=>r.sid===t.sid&&t.uid===currentUser.id);return it?{...t,qty:t.qty-parseInt(it.qty)}:t;}));
    addLog(currentUser.name,"Saída",`OS: ${form.os} · Cliente: ${form.client}`);
    setModal(false);setErr("");setForm({os:"",client:"",cpf:"",notes:"",items:[{sid:"",qty:""}]});
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div><h1 style={{fontSize:20,fontWeight:700,color:C.txt}}>Ordens de Serviço</h1></div>
      {isTec&&<Btn color="gold" onClick={()=>setModal(true)}>+ Nova OS</Btn>}
    </div>
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["OS","TÉCNICO","CLIENTE","CPF","DATA","MATERIAIS","OBS"]}/></thead>
          <tbody>
            {viewOs.length===0?<tr><td colSpan={7} style={{padding:30,textAlign:"center",color:C.muted}}>Nenhuma OS lançada.</td></tr>
            :viewOs.map(o=>{const t=users.find(u=>u.id===o.uid);const mats=o.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name.split(" ")[0]} ×${it.qty}`:it.sid;}).join(", ");
              return <TRow key={o.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold,fontWeight:700}}>{o.os}</span>,
                <span style={{fontWeight:500,fontSize:12}}>{t?.name||"?"}</span>,
                <span style={{fontWeight:500}}>{o.client}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{o.cpf}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{o.date}</span>,
                <span style={{fontSize:11,color:C.muted}}>{mats}</span>,
                <span style={{fontSize:11,color:C.muted}}>{o.notes}</span>
              ]}/>;
            })}
          </tbody>
        </table>
      </div>
    </Card>
    {modal&&<Modal title="Nova Ordem de Serviço" onClose={()=>{setModal(false);setErr("");}} wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Nº da OS *" value={form.os} onChange={v=>setForm(f=>({...f,os:v}))} placeholder="OS-20250523001"/>
          <Inp label="Nome do Cliente *" value={form.client} onChange={v=>setForm(f=>({...f,client:v}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="CPF do Cliente" value={form.cpf} onChange={v=>setForm(f=>({...f,cpf:v}))} placeholder="000.000.000-00"/>
          <Inp label="Observação" value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))}/>
        </div>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginTop:4}}>Materiais Utilizados</div>
        {form.items.map((it,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 110px auto",gap:10,alignItems:"end"}}>
            <Sel value={it.sid} onChange={v=>updRow(i,"sid",v)} options={myOpts}/>
            <Inp value={it.qty} onChange={v=>updRow(i,"qty",v)} placeholder="Qtd" type="number"/>
            <Btn size="sm" color="red" outline onClick={()=>setForm(f=>({...f,items:f.items.filter((_,j)=>j!==i)}))}>✕</Btn>
          </div>
        ))}
        {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:6,padding:"9px 12px",color:C.red,fontSize:12}}>⚠️ {err}</div>}
        <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:4}}>
          <Btn color="ghost" outline size="sm" onClick={()=>setForm(f=>({...f,items:[...f.items,{sid:"",qty:""}]}))}>+ Material</Btn>
          <div style={{display:"flex",gap:8}}>
            <Btn color="ghost" outline onClick={()=>{setModal(false);setErr("");}}>Cancelar</Btn>
            <Btn color="gold" onClick={save}>Confirmar Baixa</Btn>
          </div>
        </div>
      </div>
    </Modal>}
  </div>;
}

function DevPage({returns,setReturns,tstock,setTstock,stock,users,currentUser,addLog}){
  const isTec=currentUser.role==="tecnico";
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({notes:"",items:[{sid:"",qty:""}]});
  const myTstock=tstock.filter(t=>t.uid===currentUser.id);
  const myOpts=[{value:"",label:"Selecionar..."},...myTstock.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?{value:s.id,label:`[${s.code}] ${s.name} — Disponível: ${t.qty}`}:null;}).filter(Boolean)];
  const updRow=(i,k,v)=>setForm(f=>({...f,items:f.items.map((r,j)=>j===i?{...r,[k]:v}:r)}));
  const viewRet=isTec?returns.filter(r=>r.uid===currentUser.id):returns;
  const submit=()=>{
    const valid=form.items.filter(r=>r.sid&&parseInt(r.qty)>0);if(!valid.length)return;
    setReturns(p=>[{id:uid(),uid:currentUser.id,date:now(),items:valid.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),status:"pending",notes:form.notes,rDate:null,rBy:null},...p]);
    addLog(currentUser.name,"Devolução Solicitada",`Técnico: ${currentUser.name} · ${valid.length} item(s)`);
    setModal(false);setForm({notes:"",items:[{sid:"",qty:""}]});
  };
  const approve=(r)=>{
    setTstock(p=>p.map(t=>{const it=r.items.find(i=>i.sid===t.sid&&t.uid===r.uid);return it?{...t,qty:Math.max(0,t.qty-it.qty)}:t;}));
    setReturns(p=>p.map(x=>x.id===r.id?{...x,status:"approved",rDate:now(),rBy:currentUser.name}:x));
    const tech=users.find(u=>u.id===r.uid);
    addLog(currentUser.name,"Devolução Aprovada",`Técnico: ${tech?.name}`);
  };
  const sc={pending:"ylw",approved:"grn",rejected:"red"};
  const sl={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div><h1 style={{fontSize:20,fontWeight:700,color:C.txt}}>Devoluções</h1></div>
      {isTec&&<Btn color="gold" onClick={()=>setModal(true)}>↩ Solicitar Devolução</Btn>}
    </div>
    {viewRet.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted,fontSize:13}}>Nenhuma devolução registrada.</span></Card>}
    {viewRet.map(r=>{
      const tech=users.find(u=>u.id===r.uid);
      return <Card key={r.id} style={{padding:18,borderLeft:`3px solid ${r.status==="pending"?C.ylw:r.status==="approved"?C.grn:C.red}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <Bdg color={sc[r.status]}>{sl[r.status]}</Bdg>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{r.date}</span>
              <span style={{fontSize:13,fontWeight:600,color:C.txt}}>Técnico: {tech?.name||"?"}</span>
            </div>
            {r.notes&&<div style={{fontSize:12,color:C.muted}}>"{r.notes}"</div>}
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {r.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return <div key={i} style={{background:C.surf,borderRadius:5,padding:"4px 10px",fontSize:11,color:C.txt2}}>{s?.name||it.sid} <span style={{color:C.gold,fontFamily:"'JetBrains Mono',monospace"}}>×{it.qty}</span></div>;})}
            </div>
            {r.rBy&&<div style={{fontSize:11,color:C.muted}}>{sl[r.status]} por <strong style={{color:C.txt2}}>{r.rBy}</strong> em {r.rDate}</div>}
          </div>
          {!isTec&&r.status==="pending"&&<div style={{display:"flex",gap:8}}>
            <Btn size="sm" color="grn" onClick={()=>approve(r)}>✓ Aprovar</Btn>
            <Btn size="sm" color="red" outline onClick={()=>setReturns(p=>p.map(x=>x.id===r.id?{...x,status:"rejected",rDate:now(),rBy:currentUser.name}:x))}>✕ Rejeitar</Btn>
          </div>}
        </div>
      </Card>;
    })}
    {modal&&<Modal title="Solicitar Devolução" onClose={()=>setModal(false)} wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Inp label="Observação" value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))} placeholder="Ex: Sobrou do serviço"/>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>Materiais a Devolver</div>
        {form.items.map((it,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 110px auto",gap:10,alignItems:"end"}}>
            <Sel value={it.sid} onChange={v=>updRow(i,"sid",v)} options={myOpts}/>
            <Inp value={it.qty} onChange={v=>updRow(i,"qty",v)} placeholder="Qtd" type="number"/>
            <Btn size="sm" color="red" outline onClick={()=>setForm(f=>({...f,items:f.items.filter((_,j)=>j!==i)}))}>✕</Btn>
          </div>
        ))}
        <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:4}}>
          <Btn color="ghost" outline size="sm" onClick={()=>setForm(f=>({...f,items:[...f.items,{sid:"",qty:""}]}))}>+ Material</Btn>
          <div style={{display:"flex",gap:8}}>
            <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn color="gold" onClick={submit}>Enviar Solicitação</Btn>
          </div>
        </div>
      </div>
    </Modal>}
  </div>;
}

function NFPage({nf,setNf,stock,setStock,addLog,currentUser}){
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({num:"",supplier:"",date:"",items:[{sid:"",qty:"",val:""}],obs:""});
  const updRow=(i,k,v)=>setForm(f=>({...f,items:f.items.map((r,j)=>j===i?{...r,[k]:v}:r)}));
  const save=()=>{
    const valid=form.items.filter(r=>r.sid&&parseInt(r.qty)>0);if(!form.num||!valid.length)return;
    const total=valid.reduce((a,r)=>a+(parseFloat(r.val)||0),0);
    setNf(p=>[{id:uid(),num:form.num,supplier:form.supplier,date:form.date,items:valid.map(r=>({sid:r.sid,qty:parseInt(r.qty),val:parseFloat(r.val)||0})),total,obs:form.obs},...p]);
    setStock(p=>p.map(s=>{const it=valid.find(r=>r.sid===s.id);return it?{...s,qty:s.qty+parseInt(it.qty)}:s;}));
    addLog(currentUser.name,"Entrada",`Nota Fiscal: ${form.num} · Fornecedor: ${form.supplier}`);
    setModal(false);setForm({num:"",supplier:"",date:"",items:[{sid:"",qty:"",val:""}],obs:""});
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><h1 style={{fontSize:20,fontWeight:700,color:C.txt}}>Entrada de Materiais</h1><p style={{fontSize:12,color:C.muted,marginTop:2}}>Registro de notas fiscais e entrada no estoque</p></div>
      <Btn color="gold" onClick={()=>setModal(true)}>+ Nova Nota Fiscal</Btn>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {nf.map(n=>(
        <Card key={n.id} style={{padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.gold,fontSize:15}}>{n.num}</span>
                <span style={{fontSize:13,color:C.txt2,fontWeight:500}}>{n.supplier}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{n.date}</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {n.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return <div key={i} style={{background:C.surf,borderRadius:5,padding:"4px 10px",fontSize:11,color:C.txt2}}>{s?.name||it.sid} <span style={{color:C.grn,fontFamily:"'JetBrains Mono',monospace"}}>+{it.qty}</span></div>;})}
              </div>
              {n.obs&&<div style={{fontSize:11,color:C.muted}}>{n.obs}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:C.muted}}>VALOR TOTAL</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:800,color:C.grn}}>R$ {fmt(n.total)}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
    {modal&&<Modal title="Nova Nota Fiscal" onClose={()=>setModal(false)} wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Número NF *" value={form.num} onChange={v=>setForm(f=>({...f,num:v}))} placeholder="NF-1259"/>
          <Inp label="Fornecedor" value={form.supplier} onChange={v=>setForm(f=>({...f,supplier:v}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Data" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date"/>
          <Inp label="Observação" value={form.obs} onChange={v=>setForm(f=>({...f,obs:v}))}/>
        </div>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginTop:4}}>Itens da Nota</div>
        {form.items.map((it,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 80px 110px auto",gap:10,alignItems:"end"}}>
            <Sel value={it.sid} onChange={v=>updRow(i,"sid",v)} options={[{value:"",label:"Material..."},...stock.map(s=>({value:s.id,label:`[${s.code}] ${s.name}`}))]}/>
            <Inp value={it.qty} onChange={v=>updRow(i,"qty",v)} placeholder="Qtd" type="number"/>
            <Inp value={it.val} onChange={v=>updRow(i,"val",v)} placeholder="R$ Valor" type="number"/>
            <Btn size="sm" color="red" outline onClick={()=>setForm(f=>({...f,items:f.items.filter((_,j)=>j!==i)}))}>✕</Btn>
          </div>
        ))}
        <div style={{display:"flex",gap:10,justifyContent:"space-between",marginTop:4}}>
          <Btn color="ghost" outline size="sm" onClick={()=>setForm(f=>({...f,items:[...f.items,{sid:"",qty:"",val:""}]}))}>+ Item</Btn>
          <div style={{display:"flex",gap:8}}>
            <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn color="gold" onClick={save}>Registrar NF</Btn>
          </div>
        </div>
      </div>
    </Modal>}
  </div>;
}

function RelPage({stock,os,returns,users}){
  const[tab,setTab]=useState("estoque");
  const catData=useMemo(()=>{const m={};stock.forEach(s=>{m[s.cat]=(m[s.cat]||0)+s.qty;});return Object.entries(m).map(([name,value])=>({name,value}));},[stock]);
  const matData=useMemo(()=>{const m={};os.forEach(o=>o.items.forEach(it=>{m[it.sid]=(m[it.sid]||0)+it.qty;}));return Object.entries(m).map(([sid,value])=>{const s=stock.find(x=>x.id===sid);return{name:s?.name?.split(" ").slice(0,2).join(" ")||sid,value};}).sort((a,b)=>b.value-a.value);},[os,stock]);
  const techData=useMemo(()=>{const m={};os.forEach(o=>{const u=users.find(x=>x.id===o.uid);const nm=u?.name.split(" ")[0]||"?";const tot=o.items.reduce((a,i)=>a+i.qty,0);m[nm]=(m[nm]||0)+tot;});return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);},[os,users]);
  const maxT=techData[0]?.value||1;
  const exportXLS=(name,data)=>{const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,name);XLSX.writeFile(wb,`RE_Telecom_${name}_${new Date().toISOString().slice(0,10)}.xlsx`);};
  const print=()=>{
    const w=window.open("","_blank","width=960,height=700");
    w.document.write(`<html><head><title>R&E Telecom — Relatório</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111;}h1{color:#c68500;font-size:22px;}h2{margin:24px 0 10px;font-size:15px;border-bottom:2px solid #f0a500;padding-bottom:6px;}table{width:100%;border-collapse:collapse;margin-bottom:18px;font-size:12px;}th{background:#f5f5f5;padding:8px 10px;text-align:left;border:1px solid #ddd;}td{padding:7px 10px;border:1px solid #eee;}.ok{color:green;font-weight:700}.low{color:orange;font-weight:700}.crit{color:red;font-weight:700}@media print{button{display:none!important}}</style></head><body>
    <h1>⚡ R&E TELECOM ESTOQUE</h1><p style="color:#888;font-size:12px">Relatório gerado em ${now()}</p>
    <button onclick="window.print()" style="margin:12px 0;padding:8px 18px;background:#f0a500;color:#000;border:none;cursor:pointer;border-radius:4px;font-weight:700">🖨️ Imprimir PDF</button>
    <h2>Estoque Principal</h2><table><tr><th>Código</th><th>Material</th><th>Categoria</th><th>Qtd</th><th>Mín.</th><th>Status</th></tr>
    ${stock.map(s=>`<tr><td>${s.code}</td><td>${s.name}</td><td>${s.cat}</td><td class="${s.qty<=s.min*0.6?"crit":s.qty<=s.min?"low":"ok"}">${fmt(s.qty)} ${s.unit}</td><td>${s.min}</td><td class="${s.qty<=s.min*0.6?"crit":s.qty<=s.min?"low":"ok"}">${s.qty<=s.min*0.6?"▲ CRÍTICO":s.qty<=s.min?"● BAIXO":"✓ OK"}</td></tr>`).join("")}
    </table><h2>Ordens de Serviço</h2><table><tr><th>OS</th><th>Técnico</th><th>Cliente</th><th>CPF</th><th>Data</th></tr>
    ${os.map(o=>{const t=users.find(u=>u.id===o.uid);return`<tr><td><b>${o.os}</b></td><td>${t?.name||"?"}</td><td>${o.client}</td><td>${o.cpf}</td><td>${o.date}</td></tr>`;}).join("")}
    </table><p style="margin-top:40px;font-size:11px;color:#999">R&E Telecom Estoque — v1.0.0 © ${new Date().getFullYear()} R&E Telecom</p></body></html>`);
    w.document.close();
  };
  const tabs=[{k:"estoque",l:"Estoque"},{k:"os",l:"Ordens de Serviço"},{k:"tecnicos",l:"Técnicos"},{k:"dev",l:"Devoluções"}];
  const sc2={pending:"ylw",approved:"grn",rejected:"red"};
  const sl2={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div><h1 style={{fontSize:20,fontWeight:700,color:C.txt}}>Relatórios</h1></div>
      <div style={{display:"flex",gap:8}}>
        <Btn color="gold" outline size="sm" onClick={print}>🖨️ Imprimir / PDF</Btn>
        <Btn color="grn" size="sm" onClick={()=>{
          if(tab==="estoque")exportXLS("Estoque",stock.map(s=>({Código:s.code,Material:s.name,Categoria:s.cat,Unidade:s.unit,"Qtd Atual":s.qty,"Qtd Mínima":s.min,Status:s.qty<=s.min*0.6?"CRÍTICO":s.qty<=s.min?"BAIXO":"OK"})));
          else if(tab==="os"){const rows=[];os.forEach(o=>{const t=users.find(u=>u.id===o.uid);o.items.forEach(it=>{const s=stock.find(x=>x.id===it.sid);rows.push({OS:o.os,Técnico:t?.name||"?",Cliente:o.client,CPF:o.cpf,Data:o.date,Material:s?.name||it.sid,Qtd:it.qty});});});exportXLS("Ordens_Servico",rows);}
          else if(tab==="tecnicos")exportXLS("Tecnicos",techData.map((t,i)=>({Posição:i+1,Técnico:t.name,"Total Consumido":t.value})));
          else exportXLS("Devoluções",returns.map(r=>{const t=users.find(u=>u.id===r.uid);return{Técnico:t?.name||"?",Data:r.date,Status:sl2[r.status]||r.status,"Aprovado Por":r.rBy||"—"};}));
        }}>📥 Exportar Excel</Btn>
      </div>
    </div>
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`}}>
      {tabs.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 18px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted}}>{t.l}</div>)}
    </div>
    {tab==="estoque"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card style={{padding:18}}>
          <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>Distribuição por Categoria</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {catData.map((_,i)=><Cell key={i} fill={PIE[i%PIE.length]}/>)}
            </Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{padding:18}}>
          <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>Materiais Mais Consumidos</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={matData.slice(0,6)} layout="vertical">
              <XAxis type="number" tick={{fill:C.muted,fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fill:C.muted,fontSize:9}} width={110}/>
              <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/><Bar dataKey="value" fill={C.gold} radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÓDIGO","MATERIAL","CATEGORIA","UNIDADE","QTD ATUAL","QTD MÍNIMA","SITUAÇÃO"]}/></thead>
            <tbody>{stock.map(s=>{const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;return <TRow key={s.id} cells={[<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,s.name,s.cat,s.unit,<span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:low?C.ylw:C.txt}}>{fmt(s.qty)}</span>,fmt(s.min),crit?<Bdg color="red">▲ Crítico</Bdg>:low?<Bdg color="ylw">● Baixo</Bdg>:<Bdg color="grn">✓ OK</Bdg>]}/>;})}</tbody>
          </table>
        </div>
      </Card>
    </div>}
    {tab==="os"&&<Card style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><THead cols={["OS","TÉCNICO","CLIENTE","CPF","DATA","QTDE ITENS"]}/></thead>
      <tbody>{os.map(o=>{const t=users.find(u=>u.id===o.uid);return <TRow key={o.id} cells={[<span style={{fontFamily:"'JetBrains Mono',monospace",color:C.gold,fontSize:12}}>{o.os}</span>,t?.name||"?",o.client,o.cpf,<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{o.date}</span>,<span style={{color:C.gold,fontWeight:700}}>{o.items.reduce((a,i)=>a+i.qty,0)} un.</span>]}/>;})}</tbody>
    </table></div></Card>}
    {tab==="tecnicos"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card style={{padding:18}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>Consumo por Técnico</div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart><Pie data={techData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
            {techData.map((_,i)=><Cell key={i} fill={i===0?C.gold:PIE[i%PIE.length]}/>)}
          </Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart>
        </ResponsiveContainer>
      </Card>
      <Card style={{padding:18}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>Ranking de Consumo</div>
        {techData.map((t,i)=>(
          <div key={t.name} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,minWidth:20}}>{i+1}</span>
                <span style={{fontSize:13,color:C.txt,fontWeight:500}}>{t.name}</span>
              </div>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold,fontWeight:700}}>{fmt(t.value)}</span>
            </div>
            <div style={{height:8,background:C.bdr,borderRadius:4}}>
              <div style={{height:"100%",width:`${(t.value/maxT)*100}%`,background:i===0?C.gold:"#555",borderRadius:4}}/>
            </div>
          </div>
        ))}
      </Card>
    </div>}
    {tab==="dev"&&<Card style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><THead cols={["TÉCNICO","DATA SOLICITAÇÃO","STATUS","MATERIAIS","APROVADO POR","DATA RESOLUÇÃO"]}/></thead>
      <tbody>{returns.map(r=>{const t=users.find(u=>u.id===r.uid);const mats=r.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return`${s?.name?.split(" ")[0]||it.sid} ×${it.qty}`;}).join(", ");return <TRow key={r.id} cells={[t?.name||"?",<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{r.date}</span>,<Bdg color={sc2[r.status]}>{sl2[r.status]}</Bdg>,<span style={{fontSize:11,color:C.muted}}>{mats}</span>,r.rBy||"—",r.rDate||"—"]}/>;})}</tbody>
    </table></div></Card>}
  </div>;
}

function UsrPage({users,setUsers,addLog,currentUser}){
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico"});
  const roles=[{value:"admin",label:"Administrador"},{value:"estoque",label:"Estoque"},{value:"tecnico",label:"Técnico"}];
  const rl={admin:"ADM",estoque:"EST",tecnico:"TEC"};
  const save=()=>{
    if(!form.name||!form.login||!form.pass)return;
    if(modal==="new"){setUsers(p=>[...p,{id:uid(),...form}]);addLog(currentUser.name,"Usuário Criado",`${form.name} (${form.role})`);}
    else{setUsers(p=>p.map(u=>u.id===modal?{...u,...form}:u));addLog(currentUser.name,"Usuário Editado",form.name);}
    setModal(null);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><h1 style={{fontSize:20,fontWeight:700,color:C.txt}}>Usuários</h1></div>
      <Btn color="gold" onClick={()=>{setForm({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico"});setModal("new");}}>+ Novo Usuário</Btn>
    </div>
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["USUÁRIO","LOGIN","E-MAIL","TELEFONE","CPF","PERFIL","AÇÕES"]}/></thead>
          <tbody>
            {users.map(u=>(
              <TRow key={u.id} cells={[
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>👤</div>
                  <span style={{fontWeight:600,color:C.txt}}>{u.name}</span>
                </div>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold}}>{u.login}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.email}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.phone}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{u.cpf}</span>,
                <span style={{background:C.gold,color:"#000",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:4}}>{rl[u.role]}</span>,
                <div style={{display:"flex",gap:6}}>
                  <Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf,login:u.login,pass:u.pass,role:u.role});setModal(u.id);}}>Editar</Btn>
                  {u.id!==currentUser.id&&<Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover ${u.name}?`)){setUsers(p=>p.filter(x=>x.id!==u.id));addLog(currentUser.name,"Usuário Removido",u.name);}}}>✕</Btn>}
                </div>
              ]}/>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
    {modal&&<Modal title={modal==="new"?"Novo Usuário":"Editar Usuário"} onClose={()=>setModal(null)} wide>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Nome Completo *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
          <Inp label="E-mail" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} type="email"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Telefone" value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="(00) 00000-0000"/>
          <Inp label="CPF" value={form.cpf} onChange={v=>setForm(f=>({...f,cpf:v}))} placeholder="000.000.000-00"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Inp label="Login *" value={form.login} onChange={v=>setForm(f=>({...f,login:v}))}/>
          <Inp label="Senha *" value={form.pass} onChange={v=>setForm(f=>({...f,pass:v}))} type="password"/>
          <Sel label="Perfil" value={form.role} onChange={v=>setForm(f=>({...f,role:v}))} options={roles}/>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <Btn color="ghost" outline onClick={()=>setModal(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar Usuário</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

function LogPage({logs}){
  const tc={saida:C.gold,entrada:C.grn,dev:C.ylw,aprovada:C.grn};
  const ic={saida:"→",entrada:"↓",dev:"↺",aprovada:"✓"};
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div><h1 style={{fontSize:20,fontWeight:700,color:C.txt}}>Logs do Sistema</h1></div>
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["DATA/HORA","USUÁRIO","AÇÃO","DETALHE"]}/></thead>
          <tbody>
            {logs.map(l=>(
              <TRow key={l.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{l.date}</span>,
                <span style={{fontSize:12,fontWeight:600,color:C.txt}}>{l.user}</span>,
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:`${tc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:tc[l.tipo]||C.gold,fontWeight:700}}>{ic[l.tipo]||"·"}</div>
                  <span style={{fontSize:12,fontWeight:600,color:tc[l.tipo]||C.gold}}>{l.action}</span>
                </div>,
                <span style={{fontSize:12,color:C.muted}}>{l.detail}</span>
              ]}/>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>;
}

export default function App(){
  const[user,setUser]=useState(null);
  const[page,setPage]=useState("dash");
  const[users,setUsers]=useState(USERS0);
  const[stock,setStock]=useState(STOCK0);
  const[tstock,setTstock]=useState(TSTOCK0);
  const[os,setOs]=useState(OS0);
  const[returns,setReturns]=useState(RET0);
  const[nf,setNf]=useState(NF0);
  const[logs,setLogs]=useState(LOGS0);
  const addLog=(u,a,d)=>{
    const tipo=a.toLowerCase().includes("saída")||a.toLowerCase().includes("saida")?"saida":a.toLowerCase().includes("entrada")?"entrada":a.toLowerCase().includes("aprovada")?"aprovada":a.toLowerCase().includes("devolução")||a.toLowerCase().includes("solicitada")?"dev":"outro";
    setLogs(p=>[{id:uid(),date:now(),user:u,action:a,detail:d,tipo},...p]);
  };
  if(!user)return <LoginPage users={users} onLogin={u=>{setUser(u);setPage("dash");}}/>;
  const isAdm=user.role==="admin";
  const pendRet=returns.filter(r=>r.status==="pending").length;
  const p={stock,setStock,tstock,setTstock,os,setOs,returns,setReturns,nf,setNf,users,setUsers,currentUser:user,addLog,isAdmin:isAdm};
  const pages={
    dash:<Dashboard {...p} setPage={setPage} logs={logs}/>,
    estoque:<EstoquePage {...p}/>,
    kit:<KitPage tstock={tstock} stock={stock} users={users} currentUser={user}/>,
    dist:<DistPage {...p}/>,
    os:<OSPage {...p}/>,
    dev:<DevPage {...p}/>,
    nf:<NFPage nf={nf} setNf={setNf} stock={stock} setStock={setStock} addLog={addLog} currentUser={user}/>,
    rel:<RelPage stock={stock} os={os} returns={returns} users={users}/>,
    usr:<UsrPage users={users} setUsers={setUsers} addLog={addLog} currentUser={user}/>,
    log:<LogPage logs={logs}/>,
  };
  return <div style={{height:"100vh",background:C.bg,color:C.txt,display:"flex",overflow:"hidden"}}>
    <style>{CSS}</style>
    <Sidebar user={user} page={page} setPage={setPage} onLogout={()=>setUser(null)}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <TopBar user={user} pendRet={pendRet} setPage={setPage}/>
      <main style={{flex:1,overflowY:"auto",padding:24}}>
        {pages[page]||pages.dash}
      </main>
      <div style={{padding:"8px 24px",background:C.surf,borderTop:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:C.muted}}>R&E Telecom Estoque — v1.0.0</span>
        <span style={{fontSize:11,color:C.muted}}>© {new Date().getFullYear()} R&E Telecom — Todos os direitos reservados.</span>
      </div>
    </div>
  </div>;
}