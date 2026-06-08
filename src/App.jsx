// StockTel v1.3.1 - sistema de estoque, frota, ponto e operacao tecnica
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import { sbGet, sbSet, sbPing } from "./supabase.js"; // sbPing usado no Diagnóstico
import { useLS, pushToCloud, queueGet, queueRemove, queueSize } from "./hooks/useLS.js";
import { useIsMobile } from "./hooks/useIsMobile.js";
import { ErrorBoundary, Spinner, Toast } from "./components/feedback.jsx";
import { BottomNav, MobileDrawer, Sidebar, TopBar } from "./components/Navigation.jsx";
import { Bdg, Btn, Card, Inp, Modal, Sel, THead, TRow } from "./components/ui.jsx";
import { C, catColor, consumptionColor, PIE } from "./utils/colors.js";
import { ACTION_LABELS, ALL_MODULES, APP_RELEASE_DATE, APP_VERSION, APP_VERSION_LABEL, DEFAULT_ACTION_PERMS, DEFAULT_PERMS, ROOT_ONLY } from "./utils/constants.js";
import { fmt, now, today, uid } from "./utils/formatters.js";
import { hashSenha, sessaoValida, verificarSenha } from "./modules/auth/session.js";
import DiagnosticoModule from "./modules/diag/Diagnostico.jsx";
import CustomizeModule from "./modules/customize/Customize.jsx";
import OSModule from "./modules/operacional/OSPage.jsx";
import DevModule from "./modules/operacional/DevPage.jsx";
import SolicitacaoModule from "./modules/operacional/SolicitacaoPage.jsx";
import EstoqueModule from "./modules/estoque/EstoquePage.jsx";
import KitModule from "./modules/estoque/KitPage.jsx";
import DistModule from "./modules/estoque/DistPage.jsx";
import NFModule from "./modules/estoque/NFPage.jsx";
import PontoModule from "./modules/grandes/PontoPage.jsx";
import FrotaModule from "./modules/grandes/FrotaPage.jsx";
import RelatoriosModule from "./modules/grandes/RelatoriosPage.jsx";

// ── SEGURANÇA: Hashing de senhas (PBKDF2 + SHA-256, nativo do browser) ──
// ── NOTIFICAÇÕES PUSH DO BROWSER ─────────────────────────────────────────
function solicitarPermissaoNotificacao(){
  if("Notification" in window && Notification.permission==="default"){
    Notification.requestPermission();
  }
}

function pushBrowser(titulo, corpo, opcoes={}){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  try{
    new Notification(titulo,{
      body:corpo,
      icon:"/favicon-stocktel.png",
      badge:"/favicon-stocktel.png",
      tag:opcoes.tag||"stocktel",
      ...opcoes
    });
  }catch{}
}

// ── TELEGRAM: Notificações gratuitas via Bot ──────────────────────────────
async function notificar(mensagem, cfg=null){
  if(!cfg?.token||!cfg?.ativo)return;
  // Suporta múltiplos destinatários: chat_ids (array) ou chat_id (string única)
  const ids=[
    ...(cfg.chat_ids||[]),
    ...(cfg.chat_id?[cfg.chat_id]:[]),
  ].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i); // remove duplicatas
  if(!ids.length)return;
  for(const chat_id of ids){
    try{
      await fetch("/api/notify",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:mensagem,token:cfg.token,chat_id})
      });
    }catch{}
  }
}

// useLS importado do topo do arquivo

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

/* ── PREMIUM UI ── */
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

/* ── LOGIN ── */
function LoginPage({users,onLogin}){
  const isMobile=useIsMobile();
  const[login,setLogin]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);
  const[showPass,setShowPass]=useState(false);
  const loginGuardKey="re_login_guard";

  const getLoginGuard=()=>{
    try{return JSON.parse(localStorage.getItem(loginGuardKey)||"{}");}catch{return {};}
  };
  const setLoginGuard=(value)=>{
    try{localStorage.setItem(loginGuardKey,JSON.stringify(value));}catch{}
  };

  const doLogin=async()=>{
    if(!login||!pass){setErr("Preencha login e senha.");return;}
    const guard=getLoginGuard();
    if(guard.lockUntil&&Date.now()<guard.lockUntil){
      const secs=Math.ceil((guard.lockUntil-Date.now())/1000);
      setErr(`Muitas tentativas. Aguarde ${secs}s.`);
      return;
    }
    setLoading(true);
    try{
      const u=users.find(u=>u.login===login);
      const ok=u&&await verificarSenha(pass,u);
      if(ok){
        setErr("");
        setLoginGuard({attempts:0});
        // Migra senha legada para hash seguro automaticamente
        if(!u.passHash){
          const{hash,salt}=await hashSenha(pass);
          onLogin(u,{passHash:hash,passSalt:salt,pass:undefined});
        }else{
          onLogin(u,null);
        }
      }else{
        const attempts=(guard.attempts||0)+1;
        const lockUntil=attempts>=5?Date.now()+60000:0;
        setLoginGuard({attempts,lockUntil});
        setErr(lockUntil?"Muitas tentativas. Login bloqueado por 60 segundos.":"Login ou senha incorretos.");
        setLoading(false);
      }
    }catch(e){
      setErr("Erro ao autenticar. Tente novamente.");
      setLoading(false);
    }
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
            <div style={{fontSize:12,color:"#9a9a9a",letterSpacing:".08em",textTransform:"uppercase"}}>Soluções em Telecom</div>
          </div>
        </div>
        <div style={{fontSize:14,color:"#666",marginTop:4}}>Gestão inteligente para provedores FTTH</div>
      </div>

      {/* Card */}
      <div style={{background:"rgba(23,23,23,0.95)",border:"1px solid #2d2d2d",borderRadius:16,padding:isMobile?24:32,boxShadow:"0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)"}}>
        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4}}>Bem-vindo de volta 👋</h2>
          <p style={{fontSize:13,color:"#666"}}>Entre com suas credenciais de acesso</p>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Login field */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#666",letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Login</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"#444"}}>👤</span>
              <input value={login} onChange={e=>setLogin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}
                placeholder="Seu usuário" autoComplete="username"
                style={{width:"100%",background:"#101010",border:"1px solid #2d2d2d",borderRadius:10,padding:"12px 12px 12px 38px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}
                onFocus={e=>e.target.style.borderColor="#d10000"} onBlur={e=>e.target.style.borderColor="#2d2d2d"}/>
            </div>
          </div>

          {/* Password field */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#666",letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Senha</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"#444"}}>🔒</span>
              <input value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}
                type={showPass?"text":"password"} placeholder="Sua senha" autoComplete="current-password"
                style={{width:"100%",background:"#101010",border:"1px solid #2d2d2d",borderRadius:10,padding:"12px 42px 12px 38px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}
                onFocus={e=>e.target.style.borderColor="#d10000"} onBlur={e=>e.target.style.borderColor="#2d2d2d"}/>
              <button onClick={()=>setShowPass(!showPass)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:"#444",padding:0}}>
                {showPass?"🙈":"👁️"}
              </button>
            </div>
          </div>

          {/* Error */}
          {err&&<div style={{background:"rgba(209,0,0,0.12)",border:"1px solid rgba(209,0,0,0.3)",borderRadius:8,padding:"10px 14px",color:"#ff4444",fontSize:13,display:"flex",alignItems:"center",gap:8}}>
            <span>⚠️</span> {err}
          </div>}

          {/* Submit */}
          <button onClick={doLogin} disabled={loading}
            style={{width:"100%",padding:"13px",borderRadius:10,border:"none",cursor:loading?"not-allowed":"pointer",fontSize:14,fontWeight:700,letterSpacing:".04em",transition:"all 0.2s",marginTop:4,
              background:loading?"#333":"linear-gradient(135deg,#d10000 0%,#ff1a1a 100%)",
              color:"#fff",boxShadow:loading?"none":"0 4px 20px rgba(209,0,0,0.4)"}}>
            {loading?"Verificando...":"Entrar →"}
          </button>
        </div>

        {/* Footer */}
        <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid #1a1a1a",textAlign:"center"}}>
          <div style={{display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
            {[{icon:"📦",label:"Estoque"},{icon:"🔧",label:"OS"},{icon:"🚗",label:"Frota"},{icon:"📊",label:"Relatórios"}].map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#444"}}>
                <span>{f.icon}</span><span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#333"}}>
        StockTel {APP_VERSION_LABEL} · © {new Date().getFullYear()} · Todos os direitos reservados
      </div>
    </div>
  </div>;
}


function ConnectionBanner({isMobile,status}){
  if(status==="online")return null;
  const map={
    checking:{label:"Verificando conexão com o banco de dados...",bg:C.blueD,border:C.blue,color:C.blue,icon:"🔄"},
    browser_offline:{label:"Sem internet neste dispositivo. Alterações ficarão pendentes.",bg:C.redD,border:C.red,color:C.red,icon:"📴"},
    supabase_offline:{label:"Supabase não respondeu. O sistema continua local e tentará sincronizar depois.",bg:C.ylwD,border:C.ylw,color:C.ylw,icon:"☁️"}
  };
  const s=map[status]||map.checking;
  return <div style={{padding:isMobile?"8px 14px":"9px 24px",background:s.bg,borderBottom:`1px solid ${s.border}55`,color:s.color,fontSize:isMobile?11:12,fontWeight:800,display:"flex",alignItems:"center",gap:8}}>
    <span>{s.icon}</span><span>{s.label}</span>
  </div>;
}


/* ── DIAGNÓSTICO DO SISTEMA ── */
const DIAG_MODULES=[
  {key:"re_stock",label:"Estoque Base",icon:"📦"},
  {key:"re_tstock",label:"Estoque Técnico",icon:"🎒"},
  {key:"re_os",label:"Ordens de Serviço",icon:"🔧"},
  {key:"re_pontos",label:"Ponto Eletrônico",icon:"🕐"},
  {key:"re_veiculos",label:"Frota",icon:"🚗"},
  {key:"re_abast",label:"Abastecimentos",icon:"⛽"},
  {key:"re_returns",label:"Devoluções",icon:"↩️"},
  {key:"re_nf",label:"Entradas NF",icon:"📥"},
  {key:"re_users",label:"Usuários",icon:"👥"},
  {key:"re_sol",label:"Solicitações",icon:"📋"},
  {key:"re_logs",label:"Logs",icon:"🗒️"},
  {key:"re_checkouts",label:"Checklist Frota",icon:"✅"},
  {key:"re_pneus",label:"Pneus",icon:"🔄"},
  {key:"re_docs_veic",label:"Docs Veículos",icon:"📄"},
  {key:"re_manut_os",label:"Manutenção OS",icon:"🔩"},
  {key:"re_escalas",label:"Escalas",icon:"📅"},
  {key:"re_folgas",label:"Folgas",icon:"🌴"},
  {key:"re_cats",label:"Categorias",icon:"🏷️"},
  {key:"re_produtos",label:"Produtos",icon:"🔩"},
];

/* ── PERSONALIZAR SISTEMA ── */
function CustomizePage({currentUser,isMobile,customization,setCustomization}){
  const isRoot=currentUser?.login==="root";
  const[draft,setDraft]=useState(()=>({...customization}));
  const[saved,setSaved]=useState(false);
  const[tab,setTab]=useState("marca"); // marca | menu | cores

  if(!isRoot)return<div style={{padding:40,textAlign:"center",color:C.red,fontSize:15,fontWeight:700}}>🔒 Acesso restrito ao usuário Root.</div>;

  const upd=(k,v)=>setDraft(p=>({...p,[k]:v}));

  const save=()=>{
    setCustomization(draft);
    setSaved(true);
    setTimeout(()=>setSaved(false),2500);
    // Aplica cor de destaque via CSS var imediatamente
    document.documentElement.style.setProperty("--accent",draft.accentColor);
  };

  const reset=()=>{
    const def={logoUrl:null,companyName:"StockTel",companySlogan:"Soluções em Telecomunicações",accentColor:"#d10000",sidebarBg:"#101010",menuOrder:ALL_MODULES.map(m=>m.k),menuLabels:{},menuIcons:{},menuHidden:[]};
    setDraft(def);setCustomization(def);
  };

  // Upload de logo
  const handleLogo=(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>500000){alert("Logo muito grande. Use imagens menores que 500KB.");return;}
    const reader=new FileReader();
    reader.onload=ev=>upd("logoUrl",ev.target.result);
    reader.readAsDataURL(file);
  };

  // Menu reorder
  const moveMenu=(k,dir)=>{
    const order=[...(draft.menuOrder||ALL_MODULES.map(m=>m.k))];
    const i=order.indexOf(k);if(i<0)return;
    const ni=i+dir;if(ni<0||ni>=order.length)return;
    [order[i],order[ni]]=[order[ni],order[i]];
    upd("menuOrder",order);
  };

  const toggleHide=(k)=>{
    const h=[...(draft.menuHidden||[])];
    const i=h.indexOf(k);
    if(i>=0)h.splice(i,1);else h.push(k);
    upd("menuHidden",h);
  };

  const orderedModules=(draft.menuOrder||ALL_MODULES.map(m=>m.k))
    .map(k=>ALL_MODULES.find(m=>m.k===k)).filter(Boolean);

  const TABS=[{k:"marca",label:"🏷️ Marca"},{k:"menu",label:"📋 Menu"},{k:"grupos",label:"🗂️ Submenus"},{k:"cores",label:"🎨 Cores"},{k:"telegram",label:"📱 Telegram"}];

  // ── Export / Import ──
  const exportConfig=()=>{
    const blob=new Blob([JSON.stringify(draft,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="stocktel-customization.json";a.click();
    URL.revokeObjectURL(url);
  };
  const importConfig=(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{const cfg=JSON.parse(ev.target.result);setDraft(cfg);setSaved(false);}
      catch{alert("Arquivo inválido. Use um JSON exportado pelo sistema.");}
    };
    reader.readAsText(file);
    e.target.value="";
  };

  // ── Grupos / Submenus ──
  const groups=draft.menuGroups||[];
  const addGroup=()=>upd("menuGroups",[...groups,{id:"g"+Date.now(),icon:"📁",label:"Novo Grupo",items:[]}]);
  const delGroup=(id)=>upd("menuGroups",groups.filter(g=>g.id!==id));
  const updGroup=(id,k,v)=>upd("menuGroups",groups.map(g=>g.id===id?{...g,[k]:v}:g));
  const addToGroup=(gid,k)=>{
    // Remove do grupo anterior se estiver
    const updated=groups.map(g=>({...g,items:(g.items||[]).filter(i=>i!==k)}));
    upd("menuGroups",updated.map(g=>g.id===gid?{...g,items:[...(g.items||[]),k]}:g));
  };
  const removeFromGroup=(gid,k)=>upd("menuGroups",groups.map(g=>g.id===gid?{...g,items:(g.items||[]).filter(i=>i!==k)}:g));
  const moveGroupItem=(gid,k,dir)=>{
    upd("menuGroups",groups.map(g=>{
      if(g.id!==gid)return g;
      const items=[...(g.items||[])];
      const i=items.indexOf(k);if(i<0)return g;
      const ni=i+dir;if(ni<0||ni>=items.length)return g;
      [items[i],items[ni]]=[items[ni],items[i]];
      return{...g,items};
    }));
  };
  const moveGroup=(id,dir)=>{
    const arr=[...groups];const i=arr.findIndex(g=>g.id===id);if(i<0)return;
    const ni=i+dir;if(ni<0||ni>=arr.length)return;
    [arr[i],arr[ni]]=[arr[ni],arr[i]];
    upd("menuGroups",arr);
  };
  // Itens já em algum grupo
  const inGroups=new Set(groups.flatMap(g=>g.items||[]));
  // Itens disponíveis para adicionar a grupos (não ocultos)
  const availItems=(draft.menuOrder||ALL_MODULES.map(m=>m.k))
    .map(k=>ALL_MODULES.find(m=>m.k===k)).filter(Boolean);

  const previewAccent=draft.accentColor||"#d10000";

  return<div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:isMobile?17:21,fontWeight:800,color:C.txt,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:26}}>🎨</span> Personalizar Sistema
        </div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Editor visual · Acesso exclusivo Root · Alterações aplicadas em tempo real</div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <label style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:7,cursor:"pointer",fontSize:12,color:C.txt2,fontWeight:600}}>
          📂 Importar JSON
          <input type="file" accept=".json" onChange={importConfig} style={{display:"none"}}/>
        </label>
        <Btn size="sm" color="ghost" outline onClick={exportConfig}>⬇️ Exportar JSON</Btn>
        <Btn size="sm" color="ghost" outline onClick={reset}>↩️ Resetar</Btn>
        <Btn size="sm" color={saved?"grn":"gold"} onClick={save}>{saved?"✅ Salvo!":"💾 Salvar"}</Btn>
      </div>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",gap:4,borderBottom:`1px solid ${C.bdr}`,paddingBottom:0}}>
      {TABS.map(t=>(
        <div key={t.k} onClick={()=>setTab(t.k)}
          style={{padding:"9px 18px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?previewAccent:"transparent"}`,color:tab===t.k?previewAccent:C.muted,transition:"all .15s"}}>
          {t.label}
        </div>
      ))}
    </div>

    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 300px",gap:16,alignItems:"start"}}>
      {/* Painel de edição */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>

        {/* ── ABA MARCA ── */}
        {tab==="marca"&&<>
          <Card style={{padding:20}}>
            <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:16}}>🏷️ Logomarca</div>
            {/* Preview atual */}
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16,padding:14,background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`}}>
              <div style={{width:80,height:60,background:draft.sidebarBg||"#101010",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                {draft.logoUrl
                  ?<img src={draft.logoUrl} alt="logo" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
                  :<span style={{fontSize:22}}>🏢</span>}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.txt}}>{draft.companyName||"Nome da empresa"}</div>
                <div style={{fontSize:11,color:C.muted}}>{draft.companySlogan||"Slogan"}</div>
              </div>
            </div>
            {/* Upload */}
            <label style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:`${previewAccent}18`,border:`2px dashed ${previewAccent}44`,borderRadius:10,cursor:"pointer",fontSize:13,color:previewAccent,fontWeight:600}}>
              <span style={{fontSize:20}}>📁</span>
              {draft.logoUrl?"Trocar logomarca":"Carregar logomarca (PNG, JPG — máx. 500KB)"}
              <input type="file" accept="image/*" onChange={handleLogo} style={{display:"none"}}/>
            </label>
            {draft.logoUrl&&<Btn size="sm" color="ghost" outline onClick={()=>upd("logoUrl",null)} style={{marginTop:8}}>🗑️ Remover logo</Btn>}
          </Card>

          <Card style={{padding:20}}>
            <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:14}}>✏️ Nome e Slogan</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:11,color:C.muted,fontWeight:600,display:"block",marginBottom:4}}>NOME DO SISTEMA / EMPRESA</label>
                <input value={draft.companyName||""} onChange={e=>upd("companyName",e.target.value)}
                  placeholder="Ex: StockTel"
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"9px 12px",color:C.txt,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:C.muted,fontWeight:600,display:"block",marginBottom:4}}>SLOGAN / SUBTÍTULO</label>
                <input value={draft.companySlogan||""} onChange={e=>upd("companySlogan",e.target.value)}
                  placeholder="Ex: Soluções em Telecomunicações"
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"9px 12px",color:C.txt,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
          </Card>
        </>}

        {/* ── ABA MENU ── */}
        {tab==="menu"&&<Card style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>📋 Ordem e visibilidade dos menus</span>
            <span style={{fontSize:11,color:C.muted}}>Use ↑↓ para reordenar · 👁️ para ocultar</span>
          </div>
          {orderedModules.map((mod,i)=>{
            const hidden=(draft.menuHidden||[]).includes(mod.k);
            const label=draft.menuLabels?.[mod.k]||mod.l;
            const icon=draft.menuIcons?.[mod.k]||mod.icon;
            return<div key={mod.k} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:`1px solid ${C.bdr}18`,background:hidden?`${C.muted}08`:"transparent",opacity:hidden?.5:1}}>
              {/* Ícone editável */}
              <input value={icon} onChange={e=>upd("menuIcons",{...draft.menuIcons,[mod.k]:e.target.value})}
                style={{width:36,textAlign:"center",background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:6,padding:"4px",fontSize:16,color:C.txt,outline:"none"}}/>
              {/* Label editável */}
              <input value={label} onChange={e=>upd("menuLabels",{...draft.menuLabels,[mod.k]:e.target.value})}
                style={{flex:1,background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:C.txt,outline:"none"}}/>
              <span style={{fontSize:9,color:C.muted,fontFamily:"monospace",minWidth:60}}>{mod.k}</span>
              {/* Ocultar/mostrar */}
              <button onClick={()=>toggleHide(mod.k)} title={hidden?"Mostrar no menu":"Ocultar do menu"}
                style={{width:28,height:28,borderRadius:6,background:hidden?`${C.muted}22`:`${previewAccent}22`,border:"none",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {hidden?"🚫":"👁️"}
              </button>
              {/* Reordenar */}
              <div style={{display:"flex",flexDirection:"column",gap:1}}>
                <button onClick={()=>moveMenu(mod.k,-1)} disabled={i===0}
                  style={{width:22,height:16,background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:3,cursor:i===0?"not-allowed":"pointer",fontSize:9,color:C.muted,display:"flex",alignItems:"center",justifyContent:"center",opacity:i===0?.3:1}}>▲</button>
                <button onClick={()=>moveMenu(mod.k,1)} disabled={i===orderedModules.length-1}
                  style={{width:22,height:16,background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:3,cursor:i===orderedModules.length-1?"not-allowed":"pointer",fontSize:9,color:C.muted,display:"flex",alignItems:"center",justifyContent:"center",opacity:i===orderedModules.length-1?.3:1}}>▼</button>
              </div>
            </div>;
          })}
        </Card>}

        {/* ── ABA GRUPOS / SUBMENUS ── */}
        {tab==="grupos"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:12,color:C.muted}}>Itens <strong style={{color:C.txt}}>sem grupo</strong> aparecem soltos no menu. Itens <strong style={{color:C.txt}}>com grupo</strong> aparecem como submenu.</div>
            <Btn size="sm" color="gold" onClick={addGroup}>+ Novo Grupo</Btn>
          </div>

          {groups.length===0&&<Card style={{padding:32,textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:8}}>🗂️</div>
            <div style={{fontSize:13,color:C.muted}}>Nenhum grupo criado. Clique em "+ Novo Grupo" para criar um submenu.</div>
          </Card>}

          {groups.map((g,gi)=>(
            <Card key={g.id} style={{padding:0,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
              {/* Header do grupo */}
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:C.surf,borderBottom:`1px solid ${C.bdr}`}}>
                <input value={g.icon} onChange={e=>updGroup(g.id,"icon",e.target.value)}
                  style={{width:36,textAlign:"center",background:C.bg,border:`1px solid ${C.bdr}`,borderRadius:6,padding:"4px",fontSize:18,color:C.txt,outline:"none"}}/>
                <input value={g.label} onChange={e=>updGroup(g.id,"label",e.target.value)} placeholder="Nome do grupo"
                  style={{flex:1,background:C.bg,border:`1px solid ${C.bdr}`,borderRadius:6,padding:"6px 10px",fontSize:13,fontWeight:700,color:C.txt,outline:"none"}}/>
                <div style={{display:"flex",gap:3}}>
                  <button onClick={()=>moveGroup(g.id,-1)} disabled={gi===0} style={{width:24,height:24,background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:4,cursor:"pointer",fontSize:10,color:C.muted,opacity:gi===0?.3:1}}>▲</button>
                  <button onClick={()=>moveGroup(g.id,1)} disabled={gi===groups.length-1} style={{width:24,height:24,background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:4,cursor:"pointer",fontSize:10,color:C.muted,opacity:gi===groups.length-1?.3:1}}>▼</button>
                  <button onClick={()=>delGroup(g.id)} style={{width:24,height:24,background:`${C.red}22`,border:`1px solid ${C.red}44`,borderRadius:4,cursor:"pointer",fontSize:11,color:C.red}}>✕</button>
                </div>
              </div>

              {/* Itens do grupo */}
              <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:4}}>
                {(g.items||[]).length===0&&<div style={{fontSize:11,color:C.muted,padding:"8px 4px",fontStyle:"italic"}}>Nenhum item. Adicione abaixo.</div>}
                {(g.items||[]).map((k,ii)=>{
                  const mod=ALL_MODULES.find(m=>m.k===k);if(!mod)return null;
                  const icon=draft.menuIcons?.[k]||mod.icon;
                  const label=draft.menuLabels?.[k]||mod.l;
                  return<div key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.bg,borderRadius:7,border:`1px solid ${C.bdr}18`}}>
                    <span style={{fontSize:14}}>{icon}</span>
                    <span style={{flex:1,fontSize:12,color:C.txt}}>{label}</span>
                    <span style={{fontSize:9,color:C.muted,fontFamily:"monospace"}}>{k}</span>
                    <div style={{display:"flex",gap:2}}>
                      <button onClick={()=>moveGroupItem(g.id,k,-1)} disabled={ii===0} style={{width:20,height:20,background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:3,cursor:"pointer",fontSize:9,color:C.muted,opacity:ii===0?.3:1}}>▲</button>
                      <button onClick={()=>moveGroupItem(g.id,k,1)} disabled={ii===(g.items||[]).length-1} style={{width:20,height:20,background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:3,cursor:"pointer",fontSize:9,color:C.muted,opacity:ii===(g.items||[]).length-1?.3:1}}>▼</button>
                      <button onClick={()=>removeFromGroup(g.id,k)} style={{width:20,height:20,background:`${C.red}22`,border:"none",borderRadius:3,cursor:"pointer",fontSize:10,color:C.red}}>✕</button>
                    </div>
                  </div>;
                })}
                {/* Adicionar item ao grupo */}
                <select defaultValue="" onChange={e=>{if(e.target.value){addToGroup(g.id,e.target.value);e.target.value="";}}}
                  style={{marginTop:4,background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"6px 10px",color:C.txt,fontSize:12,cursor:"pointer",outline:"none"}}>
                  <option value="">+ Adicionar item ao grupo...</option>
                  {availItems.filter(m=>!(g.items||[]).includes(m.k)).map(m=>(
                    <option key={m.k} value={m.k}>{draft.menuIcons?.[m.k]||m.icon} {draft.menuLabels?.[m.k]||m.l} {inGroups.has(m.k)?"(em outro grupo)":""}</option>
                  ))}
                </select>
              </div>
            </Card>
          ))}

          {/* Itens soltos (sem grupo) */}
          {availItems.filter(m=>!inGroups.has(m.k)&&!(draft.menuHidden||[]).includes(m.k)).length>0&&<Card style={{padding:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:8}}>ITENS SEM GRUPO (aparecem soltos no menu)</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {availItems.filter(m=>!inGroups.has(m.k)&&!(draft.menuHidden||[]).includes(m.k)).map(m=>(
                <div key={m.k} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:11,color:C.txt2}}>
                  <span>{draft.menuIcons?.[m.k]||m.icon}</span>
                  <span>{draft.menuLabels?.[m.k]||m.l}</span>
                </div>
              ))}
            </div>
          </Card>}
        </div>}

        {/* ── ABA CORES ── */}
        {tab==="cores"&&<Card style={{padding:20}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:16}}>🎨 Cores do Sistema</div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {[
              {k:"accentColor",label:"Cor de destaque",sub:"Botões, seleção de menu, badges"},
              {k:"sidebarBg",label:"Fundo da barra lateral",sub:"Cor de fundo do menu esquerdo"},
            ].map(item=>(
              <div key={item.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.txt}}>{item.label}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{item.sub}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:8,background:draft[item.k]||"#000",border:`2px solid ${C.bdr2}`}}/>
                  <input type="color" value={draft[item.k]||"#000000"} onChange={e=>upd(item.k,e.target.value)}
                    style={{width:44,height:36,border:"none",borderRadius:8,cursor:"pointer",padding:2,background:"transparent"}}/>
                  <span style={{fontFamily:"monospace",fontSize:11,color:C.muted}}>{draft[item.k]}</span>
                </div>
              </div>
            ))}
            {/* Paleta rápida */}
            <div>
              <div style={{fontSize:11,color:C.muted,fontWeight:600,marginBottom:8}}>PALETA RÁPIDA — COR DE DESTAQUE</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["#d10000","#e65100","#f9a825","#2e7d32","#1565c0","#6a1b9a","#00838f","#37474f","#c62828","#ad1457"].map(cor=>(
                  <div key={cor} onClick={()=>upd("accentColor",cor)}
                    style={{width:32,height:32,borderRadius:"50%",background:cor,cursor:"pointer",border:draft.accentColor===cor?`3px solid #fff`:`3px solid transparent`,boxShadow:draft.accentColor===cor?"0 0 0 2px "+cor:"none",transition:"all .15s"}}/>
                ))}
              </div>
            </div>
          </div>
        </Card>}

        {/* ── ABA TELEGRAM ── */}
        {tab==="telegram"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card style={{padding:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <span style={{fontSize:28}}>📱</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.txt}}>Notificações via Telegram</div>
                <div style={{fontSize:11,color:C.muted}}>Bot gratuito · Sem limites · Funciona 24h</div>
              </div>
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:draft.telegram?.ativo?C.grn:C.muted}}>{draft.telegram?.ativo?"● Ativo":"● Inativo"}</span>
                <div onClick={()=>upd("telegram",{...draft.telegram,ativo:!draft.telegram?.ativo})}
                  style={{width:44,height:24,borderRadius:12,background:draft.telegram?.ativo?C.grn:"#333",cursor:"pointer",position:"relative",transition:"all .2s"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:draft.telegram?.ativo?23:3,transition:"all .2s"}}/>
                </div>
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:4}}>TOKEN DO BOT</label>
                <input value={draft.telegram?.token||""} onChange={e=>upd("telegram",{...draft.telegram,token:e.target.value})}
                  placeholder="1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"9px 12px",color:C.txt,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:4}}>CHAT ID PRINCIPAL (grupo ou você mesmo)</label>
                <input value={draft.telegram?.chat_id||""} onChange={e=>upd("telegram",{...draft.telegram,chat_id:e.target.value})}
                  placeholder="-5229565123 (grupo) ou 236353850 (pessoal)"
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"9px 12px",color:C.txt,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
              </div>

              {/* Múltiplos destinatários */}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <label style={{fontSize:11,color:C.muted,fontWeight:700}}>DESTINATÁRIOS ADICIONAIS (chat IDs pessoais)</label>
                  <Btn size="xs" color="gold" outline onClick={()=>upd("telegram",{...draft.telegram,chat_ids:[...(draft.telegram?.chat_ids||[]),{id:Date.now(),chat_id:"",nome:""}]})}>+ Adicionar</Btn>
                </div>
                {(draft.telegram?.chat_ids||[]).map((dest,i)=>(
                  <div key={dest.id||i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
                    <input value={dest.nome||""} onChange={e=>{const ids=[...(draft.telegram?.chat_ids||[])];ids[i]={...ids[i],nome:e.target.value};upd("telegram",{...draft.telegram,chat_ids:ids});}}
                      placeholder="Nome (ex: Desenvolvedor)"
                      style={{flex:"0 0 140px",background:C.bg,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"8px 10px",color:C.txt,fontSize:12,outline:"none"}}/>
                    <input value={dest.chat_id||""} onChange={e=>{const ids=[...(draft.telegram?.chat_ids||[])];ids[i]={...ids[i],chat_id:e.target.value};upd("telegram",{...draft.telegram,chat_ids:ids});}}
                      placeholder="Chat ID (ex: 236353850)"
                      style={{flex:1,background:C.bg,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"8px 10px",color:C.txt,fontSize:12,outline:"none",fontFamily:"monospace"}}/>
                    <button onClick={()=>{const ids=(draft.telegram?.chat_ids||[]).filter((_,j)=>j!==i);upd("telegram",{...draft.telegram,chat_ids:ids});}}
                      style={{width:28,height:28,background:`${C.red}22`,border:"none",borderRadius:6,cursor:"pointer",color:C.red,fontSize:14}}>✕</button>
                  </div>
                ))}
                {(draft.telegram?.chat_ids||[]).length===0&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>Nenhum destinatário adicional. Clique em "+ Adicionar".</div>}
              </div>

              {/* Testar bot */}
              <Btn color="blue" outline onClick={async()=>{
                if(!draft.telegram?.token){alert("Preencha o Token primeiro.");return;}
                const ids=[(draft.telegram.chat_id||""),...(draft.telegram.chat_ids||[]).map(d=>d.chat_id)].filter(Boolean);
                if(!ids.length){alert("Adicione ao menos um Chat ID.");return;}
                let ok=0,fail=0;
                for(const cid of ids){
                  const r=await fetch("/api/notify",{method:"POST",headers:{"Content-Type":"application/json"},
                    body:JSON.stringify({message:"StockTel Bot - Teste OK! Notificacoes ativas para todos os destinatarios.",token:draft.telegram.token,chat_id:cid})});
                  const d=await r.json();
                  if(d.ok)ok++;else fail++;
                }
                alert(`Resultado: ${ok} enviado(s) com sucesso${fail>0?" · "+fail+" falhou(aram)":""}`);
              }}>📤 Testar para todos os destinatários ({[(draft.telegram?.chat_id||""),...(draft.telegram?.chat_ids||[]).map(d=>d.chat_id)].filter(Boolean).length})</Btn>
            </div>
          </Card>

          {/* Guia de configuração */}
          <Card style={{padding:18,border:`1px solid ${C.blue}33`,background:`${C.blue}08`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>📖 Como configurar em 3 passos</div>
            {[
              {n:"1",icon:"🤖",title:"Criar o Bot",desc:'Abra o Telegram → pesquise @BotFather → envie /newbot → escolha um nome → copie o TOKEN gerado'},
              {n:"2",icon:"🆔",title:"Pegar seu Chat ID",desc:'Pesquise @userinfobot no Telegram → envie /start → seu ID aparece. Para grupo: adicione o bot ao grupo e pesquise @getidsbot'},
              {n:"3",icon:"💾",title:"Salvar e Ativar",desc:'Cole o Token e Chat ID acima → ative o toggle → clique Salvar → teste com o botão acima'},
            ].map(s=>(
              <div key={s.n} style={{display:"flex",gap:12,marginBottom:12,padding:10,background:C.surf,borderRadius:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${C.blue}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{s.n}</div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.txt}}>{s.icon} {s.title}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2,lineHeight:1.5}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </Card>

          <Card style={{padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.txt,marginBottom:8}}>🔔 Alertas automáticos configurados</div>
            {[
              {icon:"🔴",label:"Estoque crítico",desc:"Quando item cai abaixo de 60% do mínimo"},
              {icon:"🟡",label:"Estoque baixo",desc:"Quando item fica abaixo do mínimo"},
              {icon:"🔧",label:"Nova OS criada",desc:"Quando técnico registra uma OS"},
              {icon:"🚀",label:"Material liberado",desc:"Quando estoque é distribuído a técnico"},
              {icon:"↩️",label:"Devolução pendente",desc:"Quando técnico solicita devolução"},
            ].map(a=>(
              <div key={a.icon} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.bdr}22`}}>
                <span>{a.icon}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{a.label}</div>
                  <div style={{fontSize:10,color:C.muted}}>{a.desc}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>}
      </div>

      {/* Preview da sidebar */}
      {!isMobile&&<div style={{position:"sticky",top:0}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8,letterSpacing:".05em"}}>👁️ PRÉVIA EM TEMPO REAL</div>
        <div style={{width:"100%",background:draft.sidebarBg||"#101010",borderRadius:12,border:`1px solid ${C.bdr}`,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.4)"}}>
          {/* Logo preview */}
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.bdr}44`,display:"flex",alignItems:"center",justifyContent:"center",minHeight:60}}>
            {draft.logoUrl
              ?<img src={draft.logoUrl} alt="logo" style={{maxWidth:"100%",maxHeight:48,objectFit:"contain"}}/>
              :<div style={{fontSize:14,fontWeight:800,color:previewAccent}}>{draft.companyName||"Sistema"}</div>}
          </div>
          <div style={{padding:"4px 10px 6px",borderBottom:`1px solid ${C.bdr}44`}}>
            <div style={{fontSize:9,color:"#666"}}>{draft.companySlogan||"Slogan"}</div>
          </div>
          {/* Menu items preview */}
          <div style={{padding:"6px"}}>
            {orderedModules.filter(m=>!(draft.menuHidden||[]).includes(m.k)).slice(0,8).map((mod,i)=>(
              <div key={mod.k} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:6,marginBottom:1,
                background:i===0?`${previewAccent}22`:"transparent",
                borderLeft:i===0?`3px solid ${previewAccent}`:"3px solid transparent",
                color:i===0?previewAccent:"#777",fontSize:11,fontWeight:i===0?600:400}}>
                <span style={{fontSize:12}}>{draft.menuIcons?.[mod.k]||mod.icon}</span>
                <span>{draft.menuLabels?.[mod.k]||mod.l}</span>
              </div>
            ))}
            {orderedModules.filter(m=>!(draft.menuHidden||[]).includes(m.k)).length>8&&
              <div style={{fontSize:10,color:"#555",padding:"4px 10px"}}>+ {orderedModules.filter(m=>!(draft.menuHidden||[]).includes(m.k)).length-8} mais...</div>}
          </div>
        </div>
        <div style={{marginTop:10,padding:"10px 12px",background:C.surf,borderRadius:8,border:`1px solid ${C.bdr}`,fontSize:11,color:C.muted}}>
          💡 As alterações são aplicadas no sistema inteiro após salvar.
        </div>
      </div>}
    </div>
  </div>;
}

function DiagnosticoPage({currentUser,isMobile}){
  const isAdm=currentUser?.login==="root";
  const[connStatus,setConnStatus]=useState("idle");// idle|checking|ok|error
  const[ping,setPing]=useState(null);
  const[results,setResults]=useState([]);
  const[checking,setChecking]=useState(false);
  const[syncing,setSyncing]=useState(false);
  const[syncingKey,setSyncingKey]=useState(null);
  const[syncLog,setSyncLog]=useState([]);
  const[showLog,setShowLog]=useState(false);
  const[lastCheck,setLastCheck]=useState(null);

  if(!isAdm)return<div style={{padding:40,textAlign:"center",color:C.red,fontSize:15,fontWeight:700}}>🔒 Acesso restrito a administradores.</div>;

  const testConn=async()=>{
    setConnStatus("checking");
    const r=await sbPing();
    setPing(r.ms);
    setConnStatus(r.ok?"ok":"error");
    if(!r.ok)setSyncLog(p=>[{key:"conexão",label:"Teste de Conexão",result:"erro",detail:r.error,ts:new Date().toLocaleTimeString("pt-BR")},...p]);
  };

  const checkAll=async()=>{
    setChecking(true);
    setConnStatus("checking");
    const t0=Date.now();
    const rows=[];
    for(const mod of DIAG_MODULES){
      let localCount=0,localTs="0";
      try{const localRaw=localStorage.getItem(mod.key);localTs=localStorage.getItem(mod.key+"__ts")||"0";const d=localRaw?JSON.parse(localRaw):null;localCount=Array.isArray(d)?d.length:(d&&typeof d==="object"?1:0);}catch{}
      try{
        const remote=await sbGet(mod.key);
        const remoteCount=remote&&!remote.empty?( Array.isArray(remote.value)?remote.value.length:(remote.value&&typeof remote.value==="object"?1:0) ):0;
        const remoteTs=remote?.updated_at||"0";
        let st="ok";
        if(!remote||remote.empty||remote.value===null)st="sem_dados";
        else if(localTs>remoteTs)st="desatualizado";
        rows.push({...mod,localCount,remoteCount,localTs,remoteTs,st});
      }catch(e){rows.push({...mod,localCount,remoteCount:0,localTs,remoteTs:"?",st:"erro",errMsg:e?.message});}
    }
    setPing(Date.now()-t0);
    setConnStatus("ok");
    setResults(rows);
    setLastCheck(new Date().toLocaleString("pt-BR"));
    setChecking(false);
  };

  const syncOne=async(mod)=>{
    setSyncingKey(mod.key);setShowLog(true);
    try{
      const raw=localStorage.getItem(mod.key);
      if(!raw){setSyncLog(p=>[{key:mod.key,label:mod.label,result:"sem_dados_local",detail:"Sem dados locais para enviar",ts:new Date().toLocaleTimeString("pt-BR")},...p]);setSyncingKey(null);return;}
      const data=JSON.parse(raw);
      const res=await sbSet(mod.key,data);
      if(res.ok){const ts=new Date().toISOString();localStorage.setItem(mod.key+"__ts",ts);}
      setSyncLog(p=>[{key:mod.key,label:mod.label,result:res.ok?"ok":"erro",detail:res.error||null,ts:new Date().toLocaleTimeString("pt-BR")},...p]);
    }catch(e){setSyncLog(p=>[{key:mod.key,label:mod.label,result:"erro",detail:e?.message||"Erro desconhecido",ts:new Date().toLocaleTimeString("pt-BR")},...p]);}
    setSyncingKey(null);
  };

  const syncAll=async()=>{
    setSyncing(true);setSyncLog([]);setShowLog(true);
    for(const mod of DIAG_MODULES){
      setSyncingKey(mod.key);
      try{
        const raw=localStorage.getItem(mod.key);
        if(!raw){setSyncLog(p=>[...p,{key:mod.key,label:mod.label,result:"skip",detail:"Sem dados locais",ts:new Date().toLocaleTimeString("pt-BR")}]);continue;}
        const data=JSON.parse(raw);
        const res=await sbSet(mod.key,data);
        if(res.ok){const ts=new Date().toISOString();localStorage.setItem(mod.key+"__ts",ts);}
        setSyncLog(p=>[...p,{key:mod.key,label:mod.label,result:res.ok?"ok":"erro",detail:res.error||null,ts:new Date().toLocaleTimeString("pt-BR")}]);
      }catch(e){setSyncLog(p=>[...p,{key:mod.key,label:mod.label,result:"erro",detail:e?.message||"Erro desconhecido",ts:new Date().toLocaleTimeString("pt-BR")}]);}
    }
    setSyncingKey(null);setSyncing(false);
    await checkAll();
  };

  const stColor={ok:C.grn,desatualizado:C.ylw,sem_dados:C.muted,erro:C.red,checking:"#60a5fa"};
  const stLabel={ok:"✅ Sincronizado",desatualizado:"⚠️ Desatualizado",sem_dados:"⬜ Sem dados remoto",erro:"❌ Erro",checking:"⏳..."};
  const logColor={ok:C.grn,erro:C.red,skip:C.muted,sem_dados_local:C.ylw};

  const okCount=results.filter(r=>r.st==="ok").length;
  const errCount=results.filter(r=>r.st==="erro").length;
  const desat=results.filter(r=>r.st==="desatualizado").length;

  return<div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:isMobile?17:22,fontWeight:800,color:C.txt,display:"flex",alignItems:"center",gap:8}}>🛡️ Diagnóstico do Sistema</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Painel exclusivo para administradores · Acesso restrito</div>
      </div>
      {lastCheck&&<div style={{fontSize:11,color:C.muted,background:C.surf,padding:"4px 10px",borderRadius:6,border:`1px solid ${C.bdr}`}}>Última verificação: {lastCheck}</div>}
    </div>

    {/* Status conexão */}
    <Card style={{padding:isMobile?14:20,display:"flex",flexDirection:isMobile?"column":"row",alignItems:isMobile?"flex-start":"center",justifyContent:"space-between",gap:14,borderLeft:`4px solid ${connStatus==="ok"?C.grn:connStatus==="error"?C.red:connStatus==="checking"?"#60a5fa":C.bdr}`}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:48,height:48,borderRadius:12,background:`${connStatus==="ok"?C.grn:connStatus==="error"?C.red:C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
          {connStatus==="ok"?"🟢":connStatus==="error"?"🔴":connStatus==="checking"?"⏳":"⚫"}
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.txt}}>Conexão com Supabase</div>
          <div style={{fontSize:12,color:connStatus==="ok"?C.grn:connStatus==="error"?C.red:C.muted,fontWeight:600,marginTop:2}}>
            {connStatus==="ok"?`Conectado · ${ping}ms`:connStatus==="error"?"Falha na conexão":connStatus==="checking"?"Verificando...":"Não testado"}
          </div>
          <div style={{fontSize:10,color:C.muted,marginTop:1}}>enwlwudxtxpebxqfzkku.supabase.co</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn size="sm" color="ghost" outline onClick={testConn} disabled={connStatus==="checking"}>🔌 Testar Conexão</Btn>
        <Btn size="sm" color="gold" onClick={checkAll} disabled={checking||syncing}>{checking?"⏳ Verificando...":"🔍 Verificar Todos"}</Btn>
        <Btn size="sm" color="grn" onClick={syncAll} disabled={syncing||checking}>{syncing?"⏳ Sincronizando...":"☁️ Forçar Sincronização"}</Btn>
      </div>
    </Card>

    {/* Resumo */}
    {results.length>0&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
      {[
        {label:"TOTAL MÓDULOS",value:results.length,icon:"🗃️",color:C.gold},
        {label:"SINCRONIZADOS",value:okCount,icon:"✅",color:C.grn},
        {label:"DESATUALIZADOS",value:desat,icon:"⚠️",color:C.ylw},
        {label:"COM ERRO",value:errCount,icon:"❌",color:errCount>0?C.red:C.muted},
      ].map((s,i)=>(
        <Card key={i} style={{padding:"14px 16px",display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:22}}>{s.icon}</span>
          <div>
            <div style={{fontSize:8,fontWeight:700,color:C.muted,letterSpacing:".06em"}}>{s.label}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
          </div>
        </Card>
      ))}
    </div>}

    {/* Tabela de módulos */}
    {results.length>0&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:700,color:C.txt}}>Status por Módulo</span>
        <span style={{fontSize:11,color:C.muted}}>{results.length} módulos verificados</span>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:`${C.surf}88`}}>
              {["MÓDULO","LOCAL","REMOTO","ÚLT. SYNC LOCAL","STATUS","AÇÃO"].map(h=>(
                <th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:9,fontWeight:700,color:C.muted,letterSpacing:".06em",borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map(r=>(
              <tr key={r.key} style={{borderBottom:`1px solid ${C.bdr}18`,background:syncingKey===r.key?`${C.gold}11`:"transparent"}}>
                <td style={{padding:"10px 14px",whiteSpace:"nowrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>{r.icon}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{r.label}</div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{r.key}</div>
                    </div>
                  </div>
                </td>
                <td style={{padding:"10px 14px"}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>{r.localCount}</span>
                  <span style={{fontSize:10,color:C.muted,marginLeft:4}}>registros</span>
                </td>
                <td style={{padding:"10px 14px"}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:r.remoteCount>0?C.blue:C.muted,fontSize:16}}>{r.remoteCount}</span>
                  <span style={{fontSize:10,color:C.muted,marginLeft:4}}>registros</span>
                </td>
                <td style={{padding:"10px 14px"}}>
                  <span style={{fontSize:10,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{r.localTs==="0"?"—":new Date(r.localTs).toLocaleString("pt-BR")}</span>
                </td>
                <td style={{padding:"10px 14px",whiteSpace:"nowrap"}}>
                  <span style={{fontSize:11,fontWeight:700,color:stColor[r.st]||C.muted}}>{stLabel[r.st]||r.st}</span>
                </td>
                <td style={{padding:"10px 14px"}}>
                  <Btn size="xs" color="ghost" outline onClick={()=>syncOne(r)} disabled={syncing||!!syncingKey}>
                    {syncingKey===r.key?"⏳":"☁️ Sync"}
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>}

    {/* Log de sincronização */}
    {syncLog.length>0&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setShowLog(p=>!p)}>
        <span style={{fontSize:13,fontWeight:700,color:C.txt}}>📋 Log de Sincronização ({syncLog.length})</span>
        <span style={{fontSize:11,color:C.muted}}>{showLog?"▲ Recolher":"▼ Expandir"}</span>
      </div>
      {showLog&&<div style={{maxHeight:240,overflowY:"auto"}}>
        {syncLog.map((l,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 16px",borderBottom:`1px solid ${C.bdr}18`,background:i%2===0?"transparent":`${C.surf}44`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
              <span style={{color:logColor[l.result]||C.muted,fontSize:14,flexShrink:0}}>{l.result==="ok"?"✅":l.result==="erro"?"❌":l.result==="skip"?"⬛":"⚠️"}</span>
              <div style={{minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,color:C.txt,fontWeight:600}}>{l.label}</span>
                  <span style={{fontSize:10,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{l.key}</span>
                </div>
                {l.detail&&<div style={{fontSize:10,color:C.red,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.detail}</div>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <span style={{fontSize:11,fontWeight:700,color:logColor[l.result]||C.muted}}>{l.result==="ok"?"Enviado":l.result==="erro"?"Falhou":l.result==="skip"?"Pulado":"Sem dado local"}</span>
              <span style={{fontSize:10,color:C.muted}}>{l.ts}</span>
            </div>
          </div>
        ))}
      </div>}
    </Card>}

    {/* Estado inicial */}
    {results.length===0&&!checking&&<Card style={{padding:40,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>🔬</div>
      <div style={{fontSize:15,fontWeight:700,color:C.txt,marginBottom:8}}>Painel de Diagnóstico</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:20,maxWidth:400,margin:"0 auto 20px"}}>Clique em "Verificar Todos" para testar a conexão e checar o status de sincronização de cada módulo do sistema.</div>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <Btn color="gold" onClick={checkAll}>🔍 Verificar Todos</Btn>
        <Btn color="grn" outline onClick={syncAll}>☁️ Forçar Sincronização Completa</Btn>
      </div>
    </Card>}
  </div>;
}

/* ── DASHBOARD ── */
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
            <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>Técnicos - Consumo</div>
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
                    <span style={{fontSize:10,fontWeight:900,color:c,letterSpacing:".06em"}}>{pct>=75?"ALTO":pct>=50?"MÉDIO":"OK"}</span>
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
                  <span>Baixo</span><span>Médio</span><span>Alto</span>
                </div>
              </div>;
            })}
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
function DistPage({stock,setStock,tstock,setTstock,users,addLog,currentUser,isMobile,customization}){
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
    // Notificação push no browser (se app estiver aberto no dispositivo do técnico)
    pushBrowser("📦 Material Liberado!",`${validItems.length} item(s) liberado(s) para ${tech?.name} por ${currentUser.name}`,{tag:"liberacao"});
    // Telegram para o técnico específico (se tiver chat_id pessoal configurado)
    const tg=customization?.telegram;
    if(tg?.ativo&&tg?.token&&tech?.telegram_chat_id){
      const itens=validItems.map(r=>{const s=stock.find(x=>x.id===r.sid);return`• ${s?.name||r.sid}: ${r.qty} ${s?.unit||"un"}`;}).join("\n");
      notificar(`Material liberado para ${tech.name}!\n\n${itens}\n\nLiberado por: ${currentUser.name}\n${new Date().toLocaleString("pt-BR")}`,{...tg,chat_id:tech.telegram_chat_id});
    }
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
  const[fotos,setFotos]=useState([]); // Array de base64
  const[viewFotos,setViewFotos]=useState(null); // OS para ver fotos
  const blank=()=>({id:uid(),sid:"",qty:""});
  const myTstock=tstock.filter(t=>t.uid===currentUser.id);
  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));
  const viewOs=isTec?os.filter(o=>o.uid===currentUser.id):os;
  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);
  const myStockOpts=myTstock.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?{...s,qty:t.qty}:null;}).filter(Boolean);

  // Adiciona foto via câmera ou galeria
  const adicionarFoto=(e)=>{
    const files=Array.from(e.target.files||[]);
    files.forEach(file=>{
      if(file.size>2*1024*1024){alert("Foto muito grande. Máx 2MB por imagem.");return;}
      const reader=new FileReader();
      reader.onload=ev=>setFotos(p=>[...p,ev.target.result]);
      reader.readAsDataURL(file);
    });
    e.target.value="";
  };

  const save=()=>{
    if(!osNum.trim()){setErr("Informe o número da OS.");return;}
    if(!client.trim()){setErr("Informe o nome do cliente.");return;}
    if(!validItems.length){setErr("Adicione ao menos 1 material.");return;}
    let ok=true;
    validItems.forEach(r=>{const ts=myTstock.find(t=>t.sid===r.sid);if(!ts||ts.qty<parseInt(r.qty)){ok=false;setErr("Qtd insuficiente: "+(stock.find(s=>s.id===r.sid)?.name));}});
    if(!ok)return;
    setOs(p=>[{id:uid(),uid:currentUser.id,os:osNum.trim(),client:client.trim(),date:now(),items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),notes,fotos},...p]);
    setTstock(p=>p.map(t=>{const it=validItems.find(r=>r.sid===t.sid&&t.uid===currentUser.id);return it?{...t,qty:t.qty-parseInt(it.qty)}:t;}));
    addLog(currentUser.name,"Saída","OS: "+osNum.trim()+" · "+client.trim()+(fotos.length?` · ${fotos.length} foto(s)`:""));
    setModal(false);setErr("");setOsNum("");setClient("");setNotes("");setItems([]);setFotos([]);
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
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <Bdg color="grn">✓ Concluída</Bdg>
              {o.fotos?.length>0&&<Bdg color="blue" onClick={()=>setViewFotos(o)} style={{cursor:"pointer"}}>📷 {o.fotos.length} foto{o.fotos.length>1?"s":""}</Bdg>}
            </div>
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
          {/* Fotos do serviço */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:".06em",marginBottom:8}}>📷 FOTOS DO SERVIÇO (opcional)</div>
            <label style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:`${C.blue}14`,border:`2px dashed ${C.blue}44`,borderRadius:8,cursor:"pointer",fontSize:13,color:C.blue,fontWeight:600}}>
              <span style={{fontSize:20}}>📷</span>
              {fotos.length>0?`${fotos.length} foto(s) adicionada(s) — Adicionar mais`:"Tirar foto ou escolher da galeria"}
              <input type="file" accept="image/*" capture="environment" multiple onChange={adicionarFoto} style={{display:"none"}}/>
            </label>
            {fotos.length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
              {fotos.map((f,i)=>(
                <div key={i} style={{position:"relative",width:80,height:80}}>
                  <img src={f} alt={`foto ${i+1}`} style={{width:80,height:80,objectFit:"cover",borderRadius:8,border:`1px solid ${C.bdr}`}}/>
                  <button onClick={()=>setFotos(p=>p.filter((_,j)=>j!==i))}
                    style={{position:"absolute",top:-6,right:-6,width:18,height:18,borderRadius:"50%",background:C.red,color:"#fff",border:"none",cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>✕</button>
                </div>
              ))}
            </div>}
          </div>
          {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {err}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={save} disabled={validItems.length===0}>✅ Confirmar Baixa</Btn>
        </div>
      </div>
    </div>}

    {/* Viewer de fotos */}
    {viewFotos&&<div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setViewFotos(null)}>
      <div style={{color:C.muted,fontSize:13,marginBottom:12}} onClick={e=>e.stopPropagation()}>
        📷 Fotos da OS <span style={{color:C.gold,fontWeight:700}}>{viewFotos.os}</span> · {viewFotos.client}
        <button onClick={()=>setViewFotos(null)} style={{marginLeft:16,background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>✕</button>
      </div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",maxHeight:"80vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        {viewFotos.fotos?.map((f,i)=>(
          <img key={i} src={f} alt={`foto ${i+1}`} style={{maxWidth:isMobile?"90vw":400,maxHeight:"70vh",objectFit:"contain",borderRadius:10,border:`2px solid ${C.bdr2}`}}/>
        ))}
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
    if(!form.num.trim()){setErr("Informe o número da NF.");return;}
    if(!form.supplier.trim()){setErr("Informe o fornecedor.");return;}
    if(!validItems.length){setErr("Adicione ao menos 1 item com material e quantidade.");return;}
    const total=validItems.reduce((a,r)=>a+(parseFloat(r.val)||0),0);
    setNf(p=>[{id:uid(),num:form.num.trim(),supplier:form.supplier.trim(),date:form.date,obs:form.obs,pdfName:form.pdfName,pdfData:form.pdfData,
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
              {n.pdfData&&<button onClick={()=>window.open(n.pdfData,"_blank")} style={{marginTop:6,background:`${C.gold}22`,border:`1px solid ${C.gold}55`,borderRadius:6,padding:"6px 10px",color:C.gold,fontSize:11,fontWeight:700,cursor:"pointer"}}>📎 Visualizar PDF da NF {n.pdfName?`· ${n.pdfName}`:""}</button>}
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
            <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase"}}>Anexar PDF da Nota Fiscal</label>
              <label style={{background:C.card,border:`1.5px dashed ${C.gold}`,borderRadius:8,padding:"12px 14px",color:C.txt2,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{form.pdfName?`📎 ${form.pdfName}`:"📄 Clique para anexar a NF em PDF"}</span>
                <span style={{color:C.gold,fontWeight:800,flexShrink:0}}>Upload</span>
                <input type="file" accept="application/pdf" onChange={e=>handlePdfUpload(e.target.files?.[0])} style={{display:"none"}}/>
              </label>
              {form.pdfData&&<button type="button" onClick={()=>window.open(form.pdfData,"_blank")} style={{background:"transparent",color:C.gold,fontSize:12,textAlign:"left",cursor:"pointer",fontWeight:700}}>👁️ Visualizar PDF anexado</button>}
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
function RelPage({stock,os,returns,users,nf,isMobile,currentUser,abastecimentos=[],manutOS=[],veiculos=[]}){
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
  const parseDateBR=useCallback((dateStr)=>{
    if(!dateStr)return null;
    // formato DD/MM/YYYY HH:MM ou DD/MM/YYYY
    const parts=dateStr.split(" ")[0].split("/");
    if(parts.length===3)return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    // formato YYYY-MM-DD
    return new Date(dateStr);
  },[]);
  const inRange=useCallback((dateStr)=>{
    const d=parseDateBR(dateStr);
    if(!d)return true;
    const ini=new Date(dtInicio+"T00:00:00");
    const fim=new Date(dtFim+"T23:59:59");
    return d>=ini&&d<=fim;
  },[parseDateBR,dtInicio,dtFim]);

  const viewOs=useMemo(()=>{
    const base=isTec?os.filter(o=>o.uid===currentUser.id):os;
    return base.filter(o=>inRange(o.date));
  },[os,isTec,currentUser,inRange]);

  const viewRet=useMemo(()=>{
    const base=isTec?returns.filter(r=>r.uid===currentUser.id):returns;
    return base.filter(r=>inRange(r.date));
  },[returns,isTec,currentUser,inRange]);

  const viewNF=useMemo(()=>nf.filter(n=>inRange(n.date)),[nf,inRange]);

  const catData=useMemo(()=>{const m={};stock.forEach(s=>{m[s.cat]=(m[s.cat]||0)+s.qty;});return Object.entries(m).map(([name,value])=>({name,value}));},[stock]);
  const matData=useMemo(()=>{const m={};viewOs.forEach(o=>o.items.forEach(it=>{m[it.sid]=(m[it.sid]||0)+it.qty;}));return Object.entries(m).map(([sid,value])=>{const s=stock.find(x=>x.id===sid);return{name:s?.name?.split(" ").slice(0,2).join(" ")||sid,value};}).sort((a,b)=>b.value-a.value);},[viewOs,stock]);
  const techData=useMemo(()=>{const m={};viewOs.forEach(o=>{const u=users.find(x=>x.id===o.uid);const nm=u?.name.split(" ")[0]||"?";const tot=o.items.reduce((a,i)=>a+i.qty,0);m[nm]=(m[nm]||0)+tot;});return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);},[viewOs,users]);
  const maxT=techData[0]?.value||1;

  const totalNFGasto=viewNF.reduce((a,n)=>a+(n.total||0),0);

  // ── Variáveis de frota (adicionadas para o resumo) ──
  const fmtMoeda=(n)=>"R$ "+new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2}).format(n??0);
  const viewAbastAdmin=abastecimentos.filter(a=>inRange(a.dtAbast));
  const viewManutAdmin=manutOS.filter(o=>inRange(o.dtEntrada||o.date||""));
  const totalCombFrota=viewAbastAdmin.reduce((s,a)=>s+(parseFloat(a.valor)||0),0);
  const totalManutFrota=viewManutAdmin.reduce((s,o)=>s+(o.pecas?.reduce((ps,p)=>ps+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0),0);
  const totalGeralFrota=totalCombFrota+totalManutFrota;
  const fotosFrota=viewAbastAdmin.filter(a=>a.foto);
  const gastosFrotaPorVeiculo=(()=>{
    const map={};
    veiculos.forEach(v=>{map[v.id]={id:v.id,placa:v.placa,modelo:v.modelo,combustivel:0,manutencao:0,total:0,qtdAbast:0,qtdManut:0,fotos:0};});
    viewAbastAdmin.forEach(a=>{
      const v=veiculos.find(x=>x.id===a.veiculoId)||{};
      const id=a.veiculoId||"sem";
      if(!map[id])map[id]={id,placa:v.placa||"-",modelo:v.modelo||"Sem veiculo",combustivel:0,manutencao:0,total:0,qtdAbast:0,qtdManut:0,fotos:0};
      map[id].combustivel+=parseFloat(a.valor)||0;
      map[id].qtdAbast+=1;
      if(a.foto)map[id].fotos+=1;
    });
    viewManutAdmin.forEach(o=>{
      const v=veiculos.find(x=>x.id===o.veiculoId)||{};
      const id=o.veiculoId||"sem";
      const manut=(o.pecas?.reduce((ps,p)=>ps+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0)+(parseFloat(o.valorMaoObra)||0)+(parseFloat(o.valorTotal)||0)+(parseFloat(o.custo)||0);
      if(!map[id])map[id]={id,placa:v.placa||"-",modelo:v.modelo||"Sem veiculo",combustivel:0,manutencao:0,total:0,qtdAbast:0,qtdManut:0,fotos:0};
      map[id].manutencao+=manut;
      map[id].qtdManut+=1;
      map[id].fotos+=(o.fotos||o.fotosComprovante||o.fotosServico||[]).filter(Boolean).length;
    });
    return Object.values(map).map(v=>({...v,total:v.combustivel+v.manutencao})).filter(v=>v.total>0||v.qtdAbast>0||v.qtdManut>0||v.fotos>0).sort((a,b)=>b.total-a.total);
  })();
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
      @media print{...no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{padding:16px;}}
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
        <div>Gerado em ${new Date().toLocaleString("pt-BR")} · ${APP_VERSION_LABEL}</div>
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




    {/* RESUMO DE GASTOS DA FROTA */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
      {[
        {l:"COMBUSTÍVEL",v:fmtMoeda(totalCombFrota),s:`${viewAbastAdmin.length} abastecimento(s)`,i:"⛽",c:C.grn},
        {l:"MANUTENÇÃO",v:fmtMoeda(totalManutFrota),s:`${viewManutAdmin.length} OS mecânica(s)`,i:"🔧",c:C.ylw},
        {l:"TOTAL FROTA",v:fmtMoeda(totalGeralFrota),s:"combustível + manutenção",i:"🚗",c:C.red},
        {l:"COMPROVANTES",v:fmt(fotosFrota.length),s:"fotos/anexos no período",i:"📸",c:C.blue},
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


    {/* FROTA / GASTOS */}
    {tab==="frota"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card style={{padding:18}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:12}}>🚗 Gastos com Veículos — {periodoLabel}</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
          {[
            {l:"Combustível",v:fmtMoeda(totalCombFrota),c:C.grn},
            {l:"Manutenção",v:fmtMoeda(totalManutFrota),c:C.ylw},
            {l:"Total",v:fmtMoeda(totalGeralFrota),c:C.red},
            {l:"Comprovantes",v:fmt(fotosFrota.length),c:C.blue},
          ].map((x,i)=><div key={i} style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:10,padding:12}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{x.l}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:800,color:x.c,marginTop:4}}>{x.v}</div>
          </div>)}
        </div>
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,fontSize:14,fontWeight:700,color:C.txt}}>📋 Gasto por veículo</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["PLACA","MODELO","COMBUSTÍVEL","MANUTENÇÃO","TOTAL","REGISTROS","FOTOS"]}/></thead>
            <tbody>
              {gastosFrotaPorVeiculo.length===0?<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhum gasto de frota no período selecionado.</td></tr>
              :gastosFrotaPorVeiculo.map(v=><TRow key={v.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold}}>{v.placa||"—"}</span>,
                <span style={{fontWeight:600,color:C.txt}}>{v.modelo||"—"}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.grn}}>{fmtMoeda(v.combustivel)}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.ylw}}>{fmtMoeda(v.manutencao)}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.red}}>{fmtMoeda(v.total)}</span>,
                <span style={{fontSize:12,color:C.muted}}>{v.qtdAbast} abast. · {v.qtdManut} manut.</span>,
                <Bdg color={v.fotos>0?"grn":"muted"}>📸 {v.fotos}</Bdg>
              ]}/>) }
            </tbody>
          </table>
        </div>
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,fontSize:14,fontWeight:700,color:C.txt}}>📸 Comprovantes/Fotos vinculados aos gastos</div>
        {fotosFrota.length===0?<div style={{padding:22,textAlign:"center",color:C.muted,fontSize:13}}>Nenhuma foto de comprovante no período.</div>
        :<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(220px,1fr))",gap:10,padding:14}}>
          {fotosFrota.map((f,i)=><div key={i} style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:10,padding:10}}>
            <img src={f.foto} alt="comprovante" style={{width:"100%",height:120,objectFit:"cover",borderRadius:8,border:`1px solid ${C.bdr2}`,cursor:"pointer"}} onClick={()=>window.open(f.foto,"_blank")}/>
            <div style={{marginTop:8,display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.tipo} · {f.veiculo?.placa||"—"}</div>
                <div style={{fontSize:10,color:C.muted}}>{f.data||"Sem data"} · {f.desc}</div>
              </div>
              <span style={{fontSize:12,fontWeight:800,color:C.grn,whiteSpace:"nowrap"}}>{fmtMoeda(f.valor)}</span>
            </div>
          </div>)}
        </div>}
      </Card>
    </div>}

    {/* TÉCNICOS */}
    {tab==="tecnicos"&&(()=>{
      const techs=users.filter(u=>u.role==="tecnico");
      return<div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* KPIs globais */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
          {[
            {label:"Técnicos Ativos",value:techs.length,icon:"👷",color:C.blue},
            {label:"OS no Período",value:viewOs.length,icon:"🔧",color:C.gold},
            {label:"Itens Consumidos",value:viewOs.reduce((a,o)=>a+o.items.reduce((b,i)=>b+i.qty,0),0),icon:"📦",color:C.grn},
            {label:"Devoluções Pend.",value:viewRet.filter(r=>r.status==="pending").length,icon:"↩️",color:C.ylw},
          ].map((s,i)=>(
            <Card key={i} style={{padding:"12px 14px",display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:22}}>{s.icon}</span>
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:800,color:s.color}}>{fmt(s.value)}</div>
                <div style={{fontSize:9,color:C.muted}}>{s.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Gráfico de consumo */}
        {!isMobile&&techData.length>0&&<Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:14}}>Distribuição de Consumo — {periodoLabel}</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={techData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {techData.map((_,i)=><Cell key={i} fill={i===0?C.gold:PIE[i%PIE.length]}/>)}
            </Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart>
          </ResponsiveContainer>
        </Card>}

        {/* Cards por técnico */}
        {techs.map(tech=>{
          const techOs=viewOs.filter(o=>o.uid===tech.id);
          const techRet=viewRet.filter(r=>r.uid===tech.id);
          const totalItens=techOs.reduce((a,o)=>a+o.items.reduce((b,i)=>b+i.qty,0),0);
          const pendRet=techRet.filter(r=>r.status==="pending").length;
          // Item mais usado
          const itemCount={};techOs.forEach(o=>o.items.forEach(i=>{itemCount[i.sid]=(itemCount[i.sid]||0)+i.qty;}));
          const topItem=Object.entries(itemCount).sort((a,b)=>b[1]-a[1])[0];
          const topItemName=topItem?stock.find(s=>s.id===topItem[0])?.name:"—";
          return<Card key={tech.id} style={{padding:0,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:`1px solid ${C.bdr}`,background:C.surf}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:`${C.blue}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,overflow:"hidden",flexShrink:0}}>
                {tech.photo?<img src={tech.photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={tech.name}/>:"👷"}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.txt}}>{tech.name}</div>
                <div style={{fontSize:10,color:C.muted}}>{tech.login} · {tech.phone}</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <Bdg color="gold">{techOs.length} OS</Bdg>
                {pendRet>0&&<Bdg color="ylw">{pendRet} dev. pend.</Bdg>}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:0}}>
              {[
                {label:"OS realizadas",value:techOs.length,color:C.gold},
                {label:"Itens consumidos",value:totalItens,color:C.grn},
                {label:"Devoluções",value:techRet.length,color:C.ylw},
                {label:"Item mais usado",value:topItemName,color:C.blue,small:true},
              ].map((s,i)=>(
                <div key={i} style={{padding:"12px 14px",borderRight:i<3?`1px solid ${C.bdr}18`:"none"}}>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:".05em",marginBottom:4}}>{s.label.toUpperCase()}</div>
                  <div style={{fontFamily:s.small?"inherit":"'JetBrains Mono',monospace",fontSize:s.small?11:18,fontWeight:800,color:s.color,lineHeight:1.3}}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* Últimas OS do técnico */}
            {techOs.length>0&&<div style={{borderTop:`1px solid ${C.bdr}18`,padding:"8px 16px"}}>
              <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:6}}>ÚLTIMAS OS</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {techOs.slice(0,3).map(o=>(
                  <div key={o.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"4px 0",borderBottom:`1px solid ${C.bdr}11`}}>
                    <span style={{color:C.gold,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{o.os}</span>
                    <span style={{color:C.txt2}}>{o.client}</span>
                    <span style={{color:C.muted}}>{o.date?.slice(0,10)}</span>
                  </div>
                ))}
              </div>
            </div>}
          </Card>;
        })}
      </div>;
    })()}

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
  const[form,setForm]=useState({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico",photo:"",perms:DEFAULT_PERMS["tecnico"],actionPerms:DEFAULT_ACTION_PERMS["tecnico"],mustChangePassword:true});
  const roles=[{value:"admin",label:"Administrador"},{value:"estoque",label:"Estoque"},{value:"tecnico",label:"Técnico"},{value:"financeiro",label:"Financeiro"},{value:"mecanico",label:"Mecânico"}];
  const isRoot=currentUser?.role==="superadmin";
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

  const usaFrota=(role)=>["tecnico","mecanico","admin","superadmin"].includes(role);

  const save=()=>{
    if(!form.name.trim()||!form.login.trim()||!form.pass.trim())return;
    const loginExists=users.some(u=>u.login?.trim().toLowerCase()===form.login.trim().toLowerCase()&&u.id!==modal);
    if(loginExists){alert("Já existe um usuário com este login.");return;}
    // CNH obrigatória para quem usa frota
    if(form.usa_frota){
      if(!form.cnh_numero?.trim()){alert("CNH obrigatória para usuários que utilizam frota.");return;}
      if(!form.cnh_validade){alert("Data de validade da CNH é obrigatória.");return;}
      if(!form.cnh_categoria?.trim()){alert("Categoria da CNH é obrigatória.");return;}
    }
    const permsToSave=form.perms.length>0?form.perms:DEFAULT_PERMS[form.role]||["dash"];
    const actionPermsToSave=form.actionPerms||DEFAULT_ACTION_PERMS[form.role]||[];
    if(modal==="new"){
      setUsers(p=>[...p,{id:uid(),...form,perms:permsToSave,actionPerms:actionPermsToSave}]);
      addLog(currentUser.name,"Usuário Criado",form.name+" ("+form.role+")");
    } else {
      // Admin não pode alterar login/senha de outros usuários — só o próprio ou superadmin
      setUsers(p=>p.map(u=>{
        if(u.id!==modal)return u;
        if(isRoot){
          return{...u,...form,perms:permsToSave,actionPerms:actionPermsToSave};
        }
        // Admin pode editar nome, email, telefone, foto, perfil e permissões
        // mas NÃO pode alterar login ou senha de outros
        return{...u,name:form.name,email:form.email,phone:form.phone,cpf:form.cpf,role:form.role,photo:form.photo,perms:permsToSave,actionPerms:actionPermsToSave,mustChangePassword:form.mustChangePassword};
      }));
      addLog(currentUser.name,"Usuário Editado",form.name);
    }
    setModal(null);
  };

  const togglePerm=(k)=>{
    setForm(f=>({...f,perms:f.perms.includes(k)?f.perms.filter(p=>p!==k):[...f.perms,k]}));
  };
  const toggleAction=(k)=>{
    setForm(f=>{
      const cur=f.actionPerms||DEFAULT_ACTION_PERMS[f.role]||[];
      return {...f,actionPerms:cur.includes(k)?cur.filter(p=>p!==k):[...cur,k]};
    });
  };
  const setRoleAndPerms=(role)=>{
    setForm(f=>({...f,role,perms:DEFAULT_PERMS[role]||["dash"],actionPerms:DEFAULT_ACTION_PERMS[role]||[]}));
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
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setForm({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico",photo:"",perms:DEFAULT_PERMS["tecnico"],actionPerms:DEFAULT_ACTION_PERMS["tecnico"],mustChangePassword:true});setModal("new");}}>+ Novo</Btn>
    </div>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {users.filter(u=>isRoot||u.role!=="superadmin").map(u=>(
          <Card key={u.id} style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
            <Avatar user={u} size={44}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,fontWeight:600,color:C.txt}}>{u.name}</span>
                {u.usa_frota&&(()=>{
                  if(!u.cnh_validade)return<Bdg color="red">🪪 CNH ausente</Bdg>;
                  const dias=Math.ceil((new Date(u.cnh_validade)-new Date())/(1000*60*60*24));
                  if(dias<0)return<Bdg color="red">⛔ CNH vencida</Bdg>;
                  if(dias<=30)return<Bdg color="ylw">⚠️ CNH vence em {dias}d</Bdg>;
                  return null;
                })()}
              </div>
              <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {u.login} · {u.email}
                {u.usa_frota&&u.cnh_validade&&<span style={{marginLeft:6,color:C.blue}}>🚗 CNH {u.cnh_categoria} · val. {new Date(u.cnh_validade).toLocaleDateString("pt-BR")}</span>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
              <span style={{background:rc[u.role],color:"#000",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:3}}>{rl[u.role]}</span>
              <div style={{display:"flex",gap:6}}>
                <Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf||"",login:u.login,pass:u.pass,role:u.role,photo:u.photo||"",perms:u.perms||DEFAULT_PERMS[u.role]||["dash"],actionPerms:u.actionPerms||DEFAULT_ACTION_PERMS[u.role]||[],mustChangePassword:u.mustChangePassword||false,usa_frota:u.usa_frota||false,cnh_numero:u.cnh_numero||"",cnh_categoria:u.cnh_categoria||"",cnh_validade:u.cnh_validade||"",telegram_chat_id:u.telegram_chat_id||""});setModal(u.id);}}>Editar</Btn>
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
            <tbody>{users.filter(u=>isRoot||u.role!=="superadmin").map(u=>{
              if(u.role==="superadmin"&&!isRoot)return null;
              return <TRow key={u.id} cells={[
                <Avatar user={u} size={36}/>,
                <span style={{fontWeight:600,color:C.txt}}>{u.name}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold}}>{u.login}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.email}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.phone}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{u.cpf||"—"}</span>,
                <span style={{background:rc[u.role]||C.gold,color:u.role==="superadmin"?"#fff":"#000",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:4}}>{rl[u.role]||u.role}</span>,
                <div style={{display:"flex",gap:6}}>
                  {isRoot&&<Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf||"",login:u.login,pass:u.pass,role:u.role,photo:u.photo||"",perms:u.perms||DEFAULT_PERMS[u.role]||["dash"],actionPerms:u.actionPerms||DEFAULT_ACTION_PERMS[u.role]||[],mustChangePassword:u.mustChangePassword||false});setModal(u.id);}}>Editar</Btn>}
                  {isRoot&&u.role!=="superadmin"&&<Btn size="xs" color="red" outline onClick={()=>{if(window.confirm("Remover "+u.name+"?")){setUsers(p=>p.filter(x=>x.id!==u.id));addLog(currentUser.name,"Usuário Removido",u.name);}}}>✕</Btn>}
                  {!isRoot&&<span style={{fontSize:11,color:C.muted}}>—</span>}
                </div>
              ]}/>;
            })}</tbody>
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

        {/* Telegram Chat ID do técnico */}
        {(form.role==="tecnico"||form.role==="mecanico")&&<Inp
          label="Telegram Chat ID (opcional — para notificações pessoais)"
          value={form.telegram_chat_id||""}
          onChange={v=>setForm(f=>({...f,telegram_chat_id:v}))}
          placeholder="Ex: 236353850 (obter via @userinfobot no Telegram)"/>}

        {/* USO DE FROTA + CNH */}
        <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:form.usa_frota?14:0}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.txt}}>🚗 Uso de Frota</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>Este usuário utilizará veículos da empresa?</div>
            </div>
            <div onClick={()=>setForm(f=>({...f,usa_frota:!f.usa_frota}))}
              style={{width:44,height:24,borderRadius:12,background:form.usa_frota?C.grn:"#333",cursor:"pointer",position:"relative",transition:"all .2s",flexShrink:0}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:form.usa_frota?23:3,transition:"all .2s"}}/>
            </div>
          </div>
          {form.usa_frota&&<>
            <div style={{height:1,background:C.bdr,marginBottom:14}}/>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",marginBottom:10}}>🪪 CNH — OBRIGATÓRIO PARA USO DE FROTA</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
              <Inp label="Número da CNH *" value={form.cnh_numero||""} onChange={v=>setForm(f=>({...f,cnh_numero:v}))} placeholder="Ex: 12345678900"/>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>CATEGORIA *</label>
                <select value={form.cnh_categoria||""} onChange={e=>setForm(f=>({...f,cnh_categoria:e.target.value}))}
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"9px 12px",color:form.cnh_categoria?C.txt:C.muted,fontSize:13,outline:"none"}}>
                  <option value="">— Selecionar —</option>
                  {["A","B","C","D","E","AB","AC","AD","AE"].map(c=><option key={c} value={c}>Categoria {c}</option>)}
                </select>
              </div>
              <Inp label="Validade da CNH *" value={form.cnh_validade||""} onChange={v=>setForm(f=>({...f,cnh_validade:v}))} type="date"/>
            </div>
            {form.cnh_validade&&(()=>{
              const dias=Math.ceil((new Date(form.cnh_validade)-new Date())/(1000*60*60*24));
              if(dias<0)return<div style={{marginTop:8,padding:"8px 12px",background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,fontSize:12,color:C.red}}>⛔ CNH VENCIDA há {Math.abs(dias)} dias!</div>;
              if(dias<=30)return<div style={{marginTop:8,padding:"8px 12px",background:C.ylwD,border:`1px solid ${C.ylw}44`,borderRadius:8,fontSize:12,color:C.ylw}}>⚠️ CNH vence em {dias} dias! Providencie a renovação.</div>;
              if(dias<=90)return<div style={{marginTop:8,padding:"8px 12px",background:`${C.blue}15`,border:`1px solid ${C.blue}44`,borderRadius:8,fontSize:12,color:C.blue}}>ℹ️ CNH válida por {dias} dias.</div>;
              return<div style={{marginTop:8,padding:"8px 12px",background:`${C.grn}15`,border:`1px solid ${C.grn}44`,borderRadius:8,fontSize:12,color:C.grn}}>✅ CNH válida por {dias} dias.</div>;
            })()}
          </>}
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

        {/* Permissões por ação sensível */}
        <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>🧭 Ações Sensíveis</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
            {Object.entries(ACTION_LABELS).map(([k,label])=>{
              const enabled=(form.actionPerms||DEFAULT_ACTION_PERMS[form.role]||[]).includes(k);
              return <div key={k} onClick={()=>toggleAction(k)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,cursor:"pointer",background:enabled?`${C.grn}14`:C.card,border:`1px solid ${enabled?`${C.grn}55`:C.bdr2}`}}>
                <div style={{width:16,height:16,borderRadius:4,background:enabled?C.grn:C.bdr2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {enabled&&<span style={{fontSize:10,color:"#000",fontWeight:800}}>✓</span>}
                </div>
                <span style={{fontSize:12,color:enabled?C.txt:C.muted}}>{label}</span>
              </div>;
            })}
          </div>
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
      isRoot
          ?<Btn size="sm" color="red" outline onClick={()=>{if(window.confirm("ATENÇÃO: Apaga TODOS os dados. Confirmar?")){Object.keys(localStorage).filter(k=>k.startsWith("re_")).forEach(k=>localStorage.removeItem(k));window.location.reload();}}}>🗑️ Resetar Todos os Dados</Btn>
          :<span style={{fontSize:12,color:C.muted}}>🔒 Apenas o usuário Root pode resetar o sistema.</span>
    </div>
  </div>;
}
/* ── LOGS ── */
function LogPage({logs,isMobile}){
  const[filtroTipo,setFiltroTipo]=useState("");
  const[filtroTexto,setFiltroTexto]=useState("");
  const logsOrdenados=[...(logs||[])].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  const logsFiltrados=logsOrdenados.filter(l=>{
    const tipoOk=filtroTipo?l.tipo===filtroTipo:true;
    const alvo=`${l.date||""} ${l.user||""} ${l.action||""} ${l.detail||""} ${l.origin||""}`.toLowerCase();
    return tipoOk&&alvo.includes(filtroTexto.toLowerCase());
  });
  const resumo=logsOrdenados.reduce((acc,l)=>({...acc,[l.tipo||"outro"]:(acc[l.tipo||"outro"]||0)+1}),{});
  const exportarCSV=()=>{
    const esc=(v)=>`"${String(v??"").replace(/"/g,'""')}"`;
    const rows=[["Data","Usuario","Perfil","Acao","Detalhe","Tipo","Origem"],...logsFiltrados.map(l=>[l.date,l.user,l.role,l.action,l.detail,l.tipo,l.origin])];
    const csv=rows.map(r=>r.map(esc).join(";")).join("\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`stocktel-auditoria-${new Date().toISOString().slice(0,10)}.csv`;a.click();
    URL.revokeObjectURL(url);
  };
  const tc={saida:C.gold,entrada:C.grn,dev:C.ylw,aprovada:C.grn};
  const ic={saida:"→",entrada:"↓",dev:"↺",aprovada:"✓"};
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:10,flexWrap:"wrap"}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Auditoria do Sistema</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Trilha de ações operacionais, administrativas e financeiras.</p>
      </div>
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={exportarCSV}>Exportar CSV</Btn>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)",gap:10}}>
      <Card style={{padding:12}}><div style={{fontSize:10,color:C.muted,textTransform:"uppercase",fontWeight:700}}>Eventos</div><div style={{fontSize:22,fontWeight:800,color:C.txt}}>{logsOrdenados.length}</div></Card>
      {["entrada","saida","dev","aprovada"].map(t=><Card key={t} style={{padding:12}}>
        <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",fontWeight:700}}>{t}</div>
        <div style={{fontSize:22,fontWeight:800,color:tc[t]||C.gold}}>{resumo[t]||0}</div>
      </Card>)}
    </div>
    <Card style={{padding:14}}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"180px 1fr",gap:10}}>
        <Sel label="Tipo" value={filtroTipo} onChange={setFiltroTipo} options={[
          {value:"",label:"Todos"},{value:"entrada",label:"Entrada"},{value:"saida",label:"Saida"},{value:"dev",label:"Devolucao/Solicitacao"},{value:"aprovada",label:"Aprovada"},{value:"outro",label:"Outros"}
        ]}/>
        <Inp label="Buscar" value={filtroTexto} onChange={setFiltroTexto} placeholder="Usuario, acao, detalhe ou origem"/>
      </div>
    </Card>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {logsFiltrados.map(l=>(
          <Card key={l.id} style={{padding:14,borderLeft:`3px solid ${tc[l.tipo]||C.gold}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:700,color:tc[l.tipo]||C.gold}}>{l.action}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,flexShrink:0}}>{l.date}</span>
            </div>
            <div style={{fontSize:12,fontWeight:600,color:C.txt,marginBottom:2}}>{l.user}</div>
            <div style={{fontSize:11,color:C.muted}}>{l.detail}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:6}}>Origem: {l.origin||"StockTel Web"}</div>
          </Card>
        ))}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["DATA/HORA","USUÁRIO","AÇÃO","DETALHE","ORIGEM"]}/></thead>
            <tbody>{logsFiltrados.map(l=>(
              <TRow key={l.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{l.date}</span>,
                <span style={{fontSize:12,fontWeight:600,color:C.txt}}>{l.user}<span style={{display:"block",fontSize:10,color:C.muted,fontWeight:400}}>{l.role||""}</span></span>,
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:`${tc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:tc[l.tipo]||C.gold,fontWeight:700}}>{ic[l.tipo]||"·"}</div>
                  <span style={{fontSize:12,fontWeight:600,color:tc[l.tipo]||C.gold}}>{l.action}</span>
                </div>,
                <span style={{fontSize:12,color:C.muted}}>{l.detail}</span>,
                <span style={{fontSize:11,color:C.muted}}>{l.origin||"StockTel Web"}</span>
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
function AdminRelPage({nf,stock,os,returns,tstock,users,solicitacoes,isMobile,addLog,veiculos=[],abastecimentos=[],manutOS=[]}){
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

  const parseDateBR=useCallback((s)=>{if(!s)return null;const p=s.split(" ")[0].split("/");if(p.length===3)return new Date(`${p[2]}-${p[1]}-${p[0]}`);return new Date(s);},[]);
  const inRange=useCallback((s)=>{const d=parseDateBR(s);if(!d)return true;return d>=new Date(dtInicio+"T00:00:00")&&d<=new Date(dtFim+"T23:59:59");},[parseDateBR,dtInicio,dtFim]);
  const periodoLabel=dtInicio===dtFim?dtInicio.split("-").reverse().join("/"):`${dtInicio.split("-").reverse().join("/")} a ${dtFim.split("-").reverse().join("/")}`;

  // ── Cálculos financeiros ──
  const viewNFAdmin=useMemo(()=>nf.filter(n=>inRange(n.date)),[nf,inRange]);
  const viewOsAdmin=useMemo(()=>os.filter(o=>inRange(o.date)),[os,inRange]);
  const viewRetAdmin=useMemo(()=>returns.filter(r=>inRange(r.date)),[returns,inRange]);

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
  },[users,viewOsAdmin,tstock,viewRetAdmin,solicitacoes]);

  const totalGasto=viewNFAdmin.reduce((a,n)=>a+(n.total||0),0);
  const totalNFs=viewNFAdmin.length;
  const mediaGastoPorNF=totalNFs>0?totalGasto/totalNFs:0;
  const maxMes=gastoPorMes.length>0?Math.max(...gastoPorMes.map(m=>m.total)):1;
  const alertasAlta=alertasPreco.filter(a=>a.up);
  const alertasBaixa=alertasPreco.filter(a=>!a.up);


  // ── Gastos da frota no Relatório Administrativo ──
  const fmtMoeda=(n)=>"R$ "+new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0));
  const veicById=useCallback((id)=>veiculos.find(v=>v.id===id)||{},[veiculos]);
  const custoManut=useCallback((o)=>{
    const pecas=o.pecas?.reduce((s,p)=>s+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0;
    return pecas+(parseFloat(o.valorMaoObra)||0)+(parseFloat(o.valorTotal)||0)+(parseFloat(o.custo)||0);
  },[]);
  const viewAbastAdmin=useMemo(()=>abastecimentos.filter(a=>inRange(a.dtAbast||a.date||a.data)),[abastecimentos,inRange]);
  const viewManutAdmin=useMemo(()=>manutOS.filter(o=>inRange(o.dtEntrada||o.dtSaida||o.date||o.data)),[manutOS,inRange]);
  const totalCombFrota=viewAbastAdmin.reduce((s,a)=>s+(parseFloat(a.valor)||0),0);
  const totalManutFrota=viewManutAdmin.reduce((s,o)=>s+custoManut(o),0);
  const totalGeralFrota=totalCombFrota+totalManutFrota;
  const fotosFrota=useMemo(()=>[
    ...viewAbastAdmin.filter(a=>a.foto).map(a=>({tipo:"Abastecimento",data:a.dtAbast||a.date||a.data,veiculo:veicById(a.veiculoId),valor:parseFloat(a.valor)||0,foto:a.foto,desc:a.posto||a.combustivel||"Comprovante"})),
    ...viewManutAdmin.flatMap(o=>(o.fotos||o.fotosComprovante||o.fotosServico||[]).filter(Boolean).map(f=>({tipo:"Manutenção",data:o.dtEntrada||o.dtSaida||o.date||o.data,veiculo:veicById(o.veiculoId),valor:custoManut(o),foto:f,desc:o.descricao||o.tipo||"Comprovante"})))
  ],[viewAbastAdmin,viewManutAdmin,veicById,custoManut]);
  const gastosFrotaPorVeiculo=useMemo(()=>{
    const map={};
    veiculos.forEach(v=>{map[v.id]={id:v.id,placa:v.placa,modelo:v.modelo,combustivel:0,manutencao:0,total:0,qtdAbast:0,qtdManut:0,fotos:0};});
    viewAbastAdmin.forEach(a=>{
      const v=veicById(a.veiculoId); const id=a.veiculoId||"sem";
      if(!map[id])map[id]={id,placa:v.placa||"—",modelo:v.modelo||"Sem veículo",combustivel:0,manutencao:0,total:0,qtdAbast:0,qtdManut:0,fotos:0};
      map[id].combustivel+=parseFloat(a.valor)||0; map[id].qtdAbast+=1; if(a.foto)map[id].fotos+=1;
    });
    viewManutAdmin.forEach(o=>{
      const v=veicById(o.veiculoId); const id=o.veiculoId||"sem";
      if(!map[id])map[id]={id,placa:v.placa||"—",modelo:v.modelo||"Sem veículo",combustivel:0,manutencao:0,total:0,qtdAbast:0,qtdManut:0,fotos:0};
      map[id].manutencao+=custoManut(o); map[id].qtdManut+=1; map[id].fotos+=(o.fotos||o.fotosComprovante||o.fotosServico||[]).filter(Boolean).length;
    });
    return Object.values(map).map(v=>({...v,total:v.combustivel+v.manutencao})).sort((a,b)=>b.total-a.total);
  },[veiculos,viewAbastAdmin,viewManutAdmin,veicById,custoManut]);

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


      <!-- GASTOS DA FROTA -->
      <div class="section">
        <div class="section-title">🚗 Gastos com Veículos/Frota — ${periodoLabel}</div>
        <div class="cards" style="grid-template-columns:repeat(4,1fr);">
          <div class="card card-green"><div class="card-title">Combustível</div><div class="card-value" style="font-size:18px;">${fmtR(totalCombFrota)}</div><div class="card-sub">${fmt2(viewAbastAdmin.length)} abastecimento(s)</div></div>
          <div class="card card-orange"><div class="card-title">Manutenção</div><div class="card-value" style="font-size:18px;">${fmtR(totalManutFrota)}</div><div class="card-sub">${fmt2(viewManutAdmin.length)} OS mecânica(s)</div></div>
          <div class="card card-red"><div class="card-title">Total Frota</div><div class="card-value" style="font-size:18px;">${fmtR(totalGeralFrota)}</div><div class="card-sub">combustível + manutenção</div></div>
          <div class="card card-blue"><div class="card-title">Comprovantes</div><div class="card-value">${fmt2(fotosFrota.length)}</div><div class="card-sub">fotos/anexos</div></div>
        </div>
        <table>
          <thead><tr><th>Placa</th><th>Modelo</th><th>Combustível</th><th>Manutenção</th><th>Total</th><th>Registros</th><th>Fotos</th></tr></thead>
          <tbody>
            ${gastosFrotaPorVeiculo.length?gastosFrotaPorVeiculo.map(v=>`<tr>
              <td style="font-weight:800;color:#cc0000;">${v.placa||"—"}</td>
              <td>${v.modelo||"—"}</td>
              <td style="font-weight:700;color:#2e7d32;">${fmtR(v.combustivel)}</td>
              <td style="font-weight:700;color:#e65100;">${fmtR(v.manutencao)}</td>
              <td style="font-weight:800;color:#cc0000;">${fmtR(v.total)}</td>
              <td>${v.qtdAbast} abast. · ${v.qtdManut} manut.</td>
              <td>${v.fotos}</td>
            </tr>`).join(""):`<tr><td colspan="7" style="text-align:center;color:#888;">Nenhum gasto de frota no período.</td></tr>`}
          </tbody>
        </table>
        ${fotosFrota.length?`<div style="margin-top:14px;font-size:11px;color:#666;">📸 Comprovantes/fotos existem no sistema e podem ser visualizados na tela do Relatório Administrativo.</div>`:""}
      </div>

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
        <div class="footer-logo">StockTel — Soluções em Telecomunicações · ${APP_VERSION_LABEL}</div>
        <div>Relatório gerado em ${new Date().toLocaleString("pt-BR")} · ${APP_VERSION_LABEL}</div>
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


    // Aba 6: Frota / Gastos
    const frotaData=[
      ["STOCKTEL — GASTOS COM VEÍCULOS/FROTA","","","","","",""],
      [`Período: ${periodoLabel} | Combustível: ${fmtR2(totalCombFrota)} | Manutenção: ${fmtR2(totalManutFrota)} | Total: ${fmtR2(totalGeralFrota)}` ,"","","","","",""],
      [""],
      ["PLACA","MODELO","COMBUSTÍVEL","MANUTENÇÃO","TOTAL","QTD ABAST.","QTD MANUT.","FOTOS"],
      ...gastosFrotaPorVeiculo.map(v=>[v.placa||"—",v.modelo||"—",Number(v.combustivel||0),Number(v.manutencao||0),Number(v.total||0),v.qtdAbast,v.qtdManut,v.fotos]),
      [""],
      ["COMPROVANTES/FOTOS","","","","","","",""],
      ["TIPO","DATA","PLACA","MODELO","DESCRIÇÃO","VALOR","POSSUI FOTO",""],
      ...fotosFrota.map(f=>[f.tipo,f.data||"",f.veiculo?.placa||"—",f.veiculo?.modelo||"—",f.desc||"",Number(f.valor||0),"SIM",""])
    ];
    const wsFrota=XLSX.utils.aoa_to_sheet(frotaData);
    wsFrota["!cols"]=[{wch:12},{wch:24},{wch:16},{wch:16},{wch:16},{wch:12},{wch:12},{wch:8}];
    XLSX.utils.book_append_sheet(wb,wsFrota,"🚗 Frota Gastos");

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
    setMsg("ok:✅ Excel gerado com 7 abas!");
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

  const tabs2=[{k:"financeiro",l:"💰 Financeiro"},{k:"frota",l:"🚗 Frota/Gastos"},{k:"tecnicos",l:"👷 Técnicos"},{k:"sla",l:"⏱️ SLA"},{k:"tendencia",l:"📈 Tendência"},{k:"alertas",l:"🔔 Alertas de Preço"},{k:"email",l:"📧 Enviar"}];

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

    {/* FROTA */}
    {tab==="frota"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card style={{padding:18}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:4}}>🚗 Gastos por Veículo — {periodoLabel}</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:16}}>Combustível + Manutenção no período selecionado</div>
        {veiculos.length===0?<div style={{color:C.muted}}>Nenhum veículo cadastrado.</div>:
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
                <Bdg color={v.status==="ativo"?"grn":v.status==="manutenção"?"ylw":"red"}>{v.status}</Bdg>
              </div>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:16,color:C.grn}}>R$ {fmt(Math.round(total))}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10,marginBottom:10}}>
              {[
                {l:"COMBUSTÍVEL",v:`R$ ${fmt(Math.round(gastoComb))}`,s:`${qtdAbast} abast · ${Math.round(litrosV)}L`,c:C.gold,i:"⛽"},
                {l:"MANUTENÇÃO",v:`R$ ${fmt(Math.round(gastoManut))}`,s:`${manutOS.filter(o=>o.veiculoId===v.id).length} OS`,c:C.red,i:"🔧"},
                {l:"TOTAL",v:`R$ ${fmt(Math.round(total))}`,s:"no período",c:C.grn,i:"💰"},
                {l:"% COMBUSTÍVEL",v:`${pctComb}%`,s:"do total",c:C.blue,i:"📊"},
              ].map((s,i)=>(
                <div key={i} style={{background:C.card,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:16,marginBottom:3}}>{s.i}</div>
                  <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",marginBottom:2,fontWeight:700}}>{s.l}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:13,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.s}</div>
                </div>
              ))}
            </div>
            {/* Barra de composição */}
            <div style={{marginTop:6}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4}}>
                <span>⛽ Combustível {pctComb}%</span><span>🔧 Manutenção {100-pctComb}%</span>
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
            <div style={{fontSize:13,fontWeight:700,color:C.txt}}>💰 Total Geral da Frota</div>
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
      <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:16}}>⏱️ SLA — Análise de Desempenho no Período</div>
      {(()=>{
        const osP=os.filter(o=>inRange(o.date));
        if(osP.length===0) return <div style={{color:C.muted}}>Nenhuma OS no período selecionado.</div>;
        const techSLA=users.filter(u=>u.role==="tecnico").map(t=>{
          const myOs=osP.filter(o=>o.uid===t.id);
          const totalMat=myOs.reduce((s,o)=>s+o.items.reduce((a,i)=>a+i.qty,0),0);
          return{name:t.name.split(" ")[0],photo:t.photo,total:myOs.length,totalMat};
        }).filter(t=>t.total>0).sort((a,b)=>b.total-a.total);
        const maxOS=techSLA[0]?.total||1;
        return <>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:12,marginBottom:20}}>
            {[
              {l:"OS NO PERÍODO",v:osP.length,i:"🔧",c:C.gold},
              {l:"TÉCNICOS ATIVOS",v:techSLA.length,i:"👷",c:C.grn},
              {l:"MÉDIA OS/TÉCNICO",v:techSLA.length>0?Math.round(osP.length/techSLA.length):0,i:"📊",c:C.blue},
            ].map((s,i)=>(
              <div key={i} style={{background:C.surf,borderRadius:10,padding:14,textAlign:"center",border:`1px solid ${C.bdr}`}}>
                <div style={{fontSize:20,marginBottom:4}}>{s.i}</div>
                <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{s.l}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:22,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["#","TÉCNICO","OS","MATERIAIS","PERFORMANCE"]}/></thead>
            <tbody>{techSLA.map((t,i)=>{
              const pct=Math.round((t.total/maxOS)*100);
              return <TRow key={t.name} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:[C.gold,C.muted,C.ylw][i]||C.muted,fontSize:14}}>{i+1}</span>,
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:"50%",overflow:"hidden",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {t.photo?<img src={t.photo} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:12}}>👤</span>}
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

  {/* TENDÊNCIA */}
  {tab==="tendencia"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <Card style={{padding:18}}>
      <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:16}}>📈 Tendência de Consumo e Previsão de Ruptura</div>
      {/* Consumo mensal */}
      <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>📊 Consumo Mensal de Materiais</div>
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
      {/* Previsão de ruptura */}
      <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>⚠️ Previsão de Ruptura (próximos 90 dias)</div>
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
        if(previsoes.length===0) return <div style={{background:`${C.grn}18`,border:`1px solid ${C.grn}44`,borderRadius:8,padding:"10px 14px",color:C.grn,fontSize:13}}>✅ Nenhum item com risco de ruptura nos próximos 90 dias.</div>;
        return <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["MATERIAL","ESTOQUE","CONSUMO/DIA","DIAS RESTANTES","AÇÃO"]}/></thead>
          <tbody>{previsoes.map((s,i)=>(
            <TRow key={i} cells={[
              <span style={{fontWeight:600,fontSize:12}}>{s.name}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:s.qty<=s.min?C.red:C.ylw}}>{s.qty} {s.unit}</span>,
              <span style={{fontSize:11,color:C.muted}}>{s.cDia}/dia</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:14,color:s.dias<=15?C.red:s.dias<=30?C.ylw:C.gold}}>{s.dias===999?"∞":s.dias+"d"}</span>,
              <Bdg color={s.dias<=15?"red":s.dias<=30?"ylw":"gold"}>{s.dias<=15?"COMPRAR JÁ":s.dias<=30?"ATENÇÃO":"MONITORAR"}</Bdg>
            ]}/>
          ))}</tbody>
        </table>;
      })()}
      {/* Variação de preços */}
      <div style={{fontSize:13,fontWeight:700,color:C.txt,margin:"20px 0 12px"}}>💹 Variação de Preços por Material</div>
      {(()=>{
        const pm={};
        [...nf].sort((a,b)=>(a.date||"").localeCompare(b.date||"")).forEach(n=>n.items?.forEach(it=>{if(!pm[it.sid])pm[it.sid]=[];if(it.unitCost)pm[it.sid].push({price:it.unitCost});}));
        const trends=Object.entries(pm).filter(([,v])=>v.length>=2).map(([sid,prices])=>{
          const s=stock.find(x=>x.id===sid);
          const vp=((prices[prices.length-1].price-prices[0].price)/prices[0].price*100).toFixed(1);
          return{name:s?.name||sid,first:prices[0].price,last:prices[prices.length-1].price,vp:parseFloat(vp)};
        }).sort((a,b)=>Math.abs(b.vp)-Math.abs(a.vp)).slice(0,8);
        if(trends.length===0) return <div style={{color:C.muted,fontSize:12}}>Mínimo 2 NFs do mesmo produto para análise.</div>;
        return <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["MATERIAL","PREÇO INICIAL","PREÇO ATUAL","VARIAÇÃO"]}/></thead>
          <tbody>{trends.map((t,i)=>(
            <TRow key={i} cells={[
              <span style={{fontWeight:600,fontSize:12}}>{t.name.slice(0,35)}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.muted}}>R$ {(t.first||0).toFixed(2)}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>R$ {(t.last||0).toFixed(2)}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:t.vp>5?C.red:t.vp<-5?C.grn:C.muted}}>
                {t.vp>0?"↑":"↓"} {Math.abs(t.vp)}%
              </span>
            ]}/>
          ))}</tbody>
        </table>;
      })()}
    </Card>
  </div>}

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
function FrotaPage({veiculos,setVeiculos,abastecimentos,setAbastecimentos,checkouts,setCheckouts,pneus,setPneus,docsVeic,setDocsVeic,manutOS=[],setManutOS,manutSols=[],setManutSols,users,currentUser,addLog,isMobile}){
  const role=currentUser.role;
  const isTec=role==="tecnico";
  const isMec=role==="mecanico";
  const isAdm=["admin","superadmin"].includes(role);
  const isFin=role==="financeiro";
  const canFrotaDashboard=isAdm;
  const canVehicles=isAdm||isMec;
  const canFuel=isAdm||isFin;
  const canChecklist=isAdm||isTec||isMec;
  const canTires=isAdm||isTec||isMec;
  const canHistory=isAdm||isMec;
  const canCosts=isAdm||isFin;
  const canMaintenance=isAdm||isMec;

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
  const FOTOS_ICONS=["⬆️","⬅️","➡️","⬇️"];
  const STATUS_OPTS=["ativo","manutenção","inativo"];
  const STATUS_COLOR={ativo:C.grn,manutenção:C.ylw,inativo:C.red};
  const COMB_OPTS=["gasolina","etanol","diesel","flex","gnv"];
  const COMB_NIVEL=["reserva","1/4","1/2","3/4","cheio"];
  const COMB_COLOR={reserva:C.red,"1/4":C.ylw,"1/2":C.ylw,"3/4":C.grn,cheio:C.grn};
  const PNEU_OPTS=["ok","baixo","problema"];
  const PNEU_COLOR={ok:C.grn,baixo:C.ylw,problema:C.red};
  const PNEU_ICON={ok:"✅",baixo:"⚠️",problema:"❌"};

  const hoje=useMemo(()=>new Date(),[]);
  const diasAte=useCallback((dataStr)=>{
    if(!dataStr)return null;
    const d=new Date(dataStr);
    return Math.floor((d-hoje)/(1000*60*60*24));
  },[hoje]);

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

  // ── KM helpers ──
  const getKmAtual=useCallback((veicId)=>{
    const regs=[...abastecimentos.filter(a=>a.veiculoId===veicId&&parseInt(a.odometro)>0),...checkouts.filter(c=>c.veiculoId===veicId&&parseInt(c.km)>0)];
    if(!regs.length){const v=veiculos.find(x=>x.id===veicId);return parseInt(v?.kmCadastro)||0;}
    return Math.max(...regs.map(r=>parseInt(r.odometro||r.km)||0));
  },[abastecimentos,checkouts,veiculos]);
  const getAlertaOleo=useCallback((veic)=>{
    const kmAtual=getKmAtual(veic.id);
    const kmBase=parseInt(veic.kmCadastro)||0;
    const proxima=Math.ceil((kmAtual-kmBase+1)/10000)*10000+kmBase;
    const faltam=proxima-kmAtual;
    return{kmAtual,faltam,urgente:faltam<=500,alerta:faltam<=2000};
  },[getKmAtual]);

  // ── Consumo médio ──
  const getConsumo=(veicId)=>{
    const regs=abastecimentos.filter(a=>a.veiculoId===veicId&&a.litros&&a.odometro).sort((a,b)=>parseInt(a.odometro)-parseInt(b.odometro));
    if(regs.length<2)return null;
    const km=parseInt(regs[regs.length-1].odometro)-parseInt(regs[0].odometro);
    const litros=regs.slice(1).reduce((s,r)=>s+(parseFloat(r.litros)||0),0);
    return litros>0?(km/litros).toFixed(1):null;
  };

  // ── Custo por km ──
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

  // ── Notificações ──
  const getNotificacoes=useMemo(()=>{
    const notifs=[];
    veiculos.filter(v=>v.status==="ativo").forEach(v=>{
      const oleo=getAlertaOleo(v);
      if(oleo.urgente) notifs.push({tipo:"urgente",veic:v,msg:`🔴 Troca de óleo URGENTE — ${v.placa} (faltam ${fmt(oleo.faltam)} km)`,icon:"⚙️"});
      else if(oleo.alerta) notifs.push({tipo:"alerta",veic:v,msg:`🟡 Troca de óleo em breve — ${v.placa} (faltam ${fmt(oleo.faltam)} km)`,icon:"⚙️"});
      const checkVenc=[
        {campo:"vencIPVA",label:"IPVA"},
        {campo:"vencLicenc",label:"Licenciamento"},
        {campo:"vencSeguro",label:"Seguro"},
      ];
      checkVenc.forEach(({campo,label})=>{
        const dias=diasAte(v[campo]);
        if(dias!==null&&dias<=30) notifs.push({tipo:dias<=7?"urgente":"alerta",veic:v,msg:`${dias<=7?"🔴":"🟡"} ${label} vencendo — ${v.placa} (${dias<=0?"VENCIDO":dias+" dias"})`});
      });
    });
    const solsAbertas=manutSols.filter(s=>s.status==="aberta").length;
    if(solsAbertas>0) notifs.push({tipo:"info",msg:`📋 ${solsAbertas} solicitação(ões) de manutenção aguardando análise`,icon:"🔧"});
    return notifs;
  },[veiculos,manutSols,diasAte,getAlertaOleo]);

  // ── Gastos mensais combustível ──
  const gastosMensisComb=useMemo(()=>{
    const m={};
    abastecimentos.forEach(a=>{
      const mes=(a.dtAbast||"").slice(0,7);
      if(!mes)return;
      m[mes]=(m[mes]||0)+(parseFloat(a.valor)||0);
    });
    return Object.entries(m).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6);
  },[abastecimentos]);

  // ── Ranking técnicos ──
  const rankingTec=useMemo(()=>{
    return techs.map(t=>{
      const abasts=abastecimentos.filter(a=>a.tecnicoId===t.id);
      const gasto=abasts.reduce((s,a)=>s+(parseFloat(a.valor)||0),0);
      const veicsResp=veiculos.filter(v=>v.tecnicoId===t.id).length;
      return{...t,abasts:abasts.length,gasto,veicsResp};
    }).sort((a,b)=>b.abasts-a.abasts);
  },[techs,abastecimentos,veiculos]);

  const viewAbast=canFuel?abastecimentos:[];
  const viewCheck=isTec?checkouts.filter(c=>c.tecnicoId===currentUser.id):checkouts;

  // ── File handlers ──
  const handleFotoVeic=(idx,e)=>{const f=e.target.files[0];if(!f)return;if(f.size>3*1024*1024){alert("Máx 3MB");return;}const r=new FileReader();r.onload=ev=>setFormVeic(fv=>({...fv,fotos:fv.fotos.map((ft,i)=>i===idx?ev.target.result:ft)}));r.readAsDataURL(f);};
  const handleDocPDF=(e)=>{const f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024){alert("Máx 5MB");return;}const r=new FileReader();r.onload=ev=>setFormVeic(fv=>({...fv,docPDF:ev.target.result}));r.readAsDataURL(f);};
  const handleFotoAbast=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setFormAbast(fa=>({...fa,foto:ev.target.result}));r.readAsDataURL(f);};
  const handleFotoOdo=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setFormCheck(fc=>({...fc,fotoOdometro:ev.target.result}));r.readAsDataURL(f);};
  const handleFotoAvaria=(idx,e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setFormCheck(fc=>({...fc,fotosAvarias:fc.fotosAvarias.map((ft,i)=>i===idx?ev.target.result:ft)}));r.readAsDataURL(f);};

  // ── Salvar veículo ──
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
    if(!formAbast.litros||!formAbast.valor){setErrAbast("Informe litros e valor.");return;}
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
    addLog(currentUser.name,formCheck.tipo==="retirada"?"Retirada":"Devolução",`${veic?.placa||"?"} · ${formCheck.km} km`);
    setModalCheck(null);setErrCheck("");
  };

  const salvarPneu=()=>{
    if(!formPneu.veiculoId){alert("Selecione o veículo.");return;}
    if(!formPneu.marca){alert("Informe a marca.");return;}
    setPneus(p=>[{...formPneu,id:uid(),registradoPor:currentUser.id},...p]);
    addLog(currentUser.name,"Pneu",`${veiculos.find(v=>v.id===formPneu.veiculoId)?.placa||"?"} · ${formPneu.posicao} · ${formPneu.marca}`);
    setModalPneu(null);setFormPneu(blankPneu());
  };

  // ── Tab list ──
  const tabList=[
    canFrotaDashboard&&{k:"dash",l:"Dashboard"},
    canVehicles&&{k:"veic",l:"Veiculos"},
    canMaintenance&&{k:"manut",l:"Manutencao"},
    canFuel&&{k:"abast",l:"Abastecimento"},
    canChecklist&&{k:"check",l:"Checklist"},
    canTires&&{k:"pneus",l:"Pneus"},
    canHistory&&{k:"hist",l:"Historico"},
    canCosts&&{k:"custos",l:"Custos"},
  ].filter(Boolean);
  const activeTab=tabList.find(t=>t.k===tab)?.k||tabList[0]?.k||"";
  // Filtro de data ──
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

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>🚗 Frota</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Gestão completa de veículos, combustível e manutenção</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {isAdm&&activeTab==="veic"&&<Btn color="gold" size="sm" onClick={()=>{setFormVeic(blankVeic());setModalVeic("new");setErrVeic("");}}>+ Veículo</Btn>}
        {canFuel&&activeTab==="abast"&&<Btn color="gold" size="sm" onClick={()=>{setFormAbast(blankAbast());setModalAbast(true);setErrAbast("");}}>⛽ Abastecimento</Btn>}
        {canChecklist&&activeTab==="check"&&<div style={{display:"flex",gap:8}}>
          <Btn color="gold" size="sm" onClick={()=>{setFormCheck(blankCheck("retirada"));setModalCheck("new");}}>📋 Retirada</Btn>
          <Btn color="ghost" outline size="sm" onClick={()=>{setFormCheck(blankCheck("devolucao"));setModalCheck("new");}}>↩️ Devolução</Btn>
        </div>}
        {canTires&&activeTab==="pneus"&&<Btn color="gold" size="sm" onClick={()=>{setFormPneu(blankPneu());setModalPneu("new");}}>🔄 Registrar Pneu</Btn>}
      </div>
    </div>

    {/* Notificações */}
    {getNotificacoes.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
      {getNotificacoes.map((n,i)=>(
        <div key={i} style={{background:n.tipo==="urgente"?C.redD:`${C.ylw}18`,border:`1px solid ${n.tipo==="urgente"?C.red:C.ylw}44`,borderRadius:8,padding:"10px 14px",fontSize:12,color:n.tipo==="urgente"?C.red:C.ylw,fontWeight:600}}>
          {n.msg}
        </div>
      ))}
    </div>}

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`,overflowX:"auto",gap:0}}>
      {tabList.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:12,fontWeight:600,borderBottom:`2px solid ${activeTab===t.k?C.gold:"transparent"}`,color:activeTab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>)}
    </div>

    {/* Filtro de Período */}
    <Card style={{padding:12}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:11,fontWeight:700,color:C.gold}}>📅 PERÍODO:</span>
        {[{k:"hoje",l:"Hoje"},{k:"semana",l:"Semana"},{k:"mes",l:"Mês"},{k:"ano",l:"Ano"},{k:"tudo",l:"Tudo"}].map(p=>(
          <button key={p.k} onClick={()=>aplicarFiltroFrota(p.k)} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${modoFiltro===p.k?C.gold:C.bdr2}`,background:modoFiltro===p.k?`${C.gold}22`:"transparent",color:modoFiltro===p.k?C.gold:C.muted,fontSize:12,fontWeight:modoFiltro===p.k?700:400,cursor:"pointer"}}>
            {p.l}
          </button>
        ))}
        <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input type="date" value={dtFrIn} onChange={e=>{setDtFrIn(e.target.value);setModoFiltro("custom");}} style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"5px 10px",color:C.txt,fontSize:12}}/>
            <span style={{color:C.muted,fontSize:12}}>até</span>
            <input type="date" value={dtFrFim} onChange={e=>{setDtFrFim(e.target.value);setModoFiltro("custom");}} style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"5px 10px",color:C.txt,fontSize:12}}/>
          </div>
          <div style={{background:`${C.gold}18`,border:`1px solid ${C.gold}44`,borderRadius:6,padding:"4px 12px",fontSize:11,fontWeight:700,color:C.gold}}>
            📅 {frotaLabel} · {viewAbastFilt.length} abast · {viewCheckFilt.length} checks
          </div>
        </div>
      </div>
    </Card>

    {/* ── DASHBOARD FROTA ── */}
    {activeTab==="dash"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* KPI Cards */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
        {[
          {l:"VEÍCULOS ATIVOS",v:fmt(veiculos.filter(v=>v.status==="ativo").length),i:"🚗",c:C.grn},
          {l:"EM MANUTENÇÃO",v:fmt(veiculos.filter(v=>v.status==="manutenção").length),i:"🔧",c:C.ylw},
          {l:"TROCA ÓLEO PENDENTE",v:fmt(veiculos.filter(v=>getAlertaOleo(v).alerta).length),i:"⚙️",c:C.red},
          {l:"OS ABERTAS",v:fmt(manutOS.filter(o=>o.status!=="concluida").length),i:"📋",c:C.gold},
        ].map((s,i)=>(
          <Card key={i} style={{padding:isMobile?12:16,display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:40,height:40,borderRadius:10,background:`${s.c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{s.i}</div>
            <div><div style={{fontSize:9,fontWeight:700,color:C.muted}}>{s.l}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?16:22,fontWeight:800,color:s.c}}>{s.v}</div></div>
          </Card>
        ))}
      </div>

      {/* Gastos combustível e Consumo */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>⛽ Gastos com Combustível (6 meses)</div>
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
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>📊 Consumo e Custo por Veículo</div>
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
                {consumo&&<span style={{color:C.blue}}>⛽ {consumo} km/L</span>}
                {custoKm&&<span style={{color:C.grn}}>R${custoKm}/km</span>}
                {oleo.alerta&&<span style={{color:oleo.urgente?C.red:C.ylw}}>{oleo.urgente?"🔴":"🟡"}{fmt(oleo.faltam)}km</span>}
              </div>
            </div>;
          })}
        </Card>
      </div>

      {/* Ranking técnicos */}
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>🏆 Ranking de Técnicos (Abastecimentos)</div>
        {rankingTec.length===0?<div style={{color:C.muted,fontSize:12}}>Sem dados</div>:
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <THead cols={["Técnico","Veículos","Abastecimentos","Gasto Total"]}/>
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
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>📅 Vencimentos de Documentos</div>
        {veiculos.filter(v=>{
          const campos=[v.vencIPVA,v.vencLicenc,v.vencSeguro];
          return campos.some(c=>c&&diasAte(c)!==null&&diasAte(c)<=90);
        }).length===0?<div style={{color:C.muted,fontSize:12}}>Todos os documentos em dia ✅</div>:
        veiculos.filter(v=>[v.vencIPVA,v.vencLicenc,v.vencSeguro].some(c=>c&&diasAte(c)!==null&&diasAte(c)<=90)).map(v=>(
          <div key={v.id} style={{marginBottom:10,padding:"10px 14px",background:C.surf,borderRadius:8}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.gold,fontSize:12,marginBottom:6}}>{v.placa} — {v.modelo}</div>
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

    {/* ── VEÍCULOS ── */}
    {activeTab==="veic"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
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
                {v.docPDF&&<Bdg color="muted">📄 Doc</Bdg>}
              </div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:12,color:C.muted,marginBottom:8}}>
                {v.cor&&<span>🎨 {v.cor}</span>}
                <span>👷 {tech?.name||"—"}</span>
                {v.dtAquisicao&&<span>📅 {v.dtAquisicao}</span>}
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.blue}}>🛣️ {fmt(oleo.kmAtual)} km</span>
                {oleo.alerta&&<span style={{color:oleo.urgente?C.red:C.ylw,fontWeight:700}}>⚙️ Faltam {fmt(oleo.faltam)} km</span>}
                {getConsumo(v.id)&&<span style={{color:C.grn}}>⛽ {getConsumo(v.id)} km/L</span>}
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
              <Btn size="xs" color="gold" outline onClick={()=>setModalHist(v)}>📖 Histórico</Btn>
              {v.docPDF&&<Btn size="xs" color="ghost" outline onClick={()=>setModalDoc(v)}>📄 Doc</Btn>}
              {temFoto&&<Btn size="xs" color="ghost" outline onClick={()=>setModalFotos(v)}>🖼️</Btn>}
              {isAdm&&<>
                <Btn size="xs" color="gold" outline onClick={()=>{setFormVeic({...v,fotos:v.fotos||["","","",""],docPDF:v.docPDF||""});setModalVeic(v.id);setErrVeic("");}}>Editar</Btn>
                <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Excluir ${v.placa}?`)){setVeiculos(p=>p.filter(x=>x.id!==v.id));addLog(currentUser.name,"Frota","Excluído: "+v.placa);}}}>✕</Btn>
              </>}
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* ── ABASTECIMENTO ── */}
    {activeTab==="manut"&&<ManutencaoPage manutSols={manutSols} setManutSols={setManutSols} manutOS={manutOS} setManutOS={setManutOS} veiculos={veiculos} users={users} currentUser={currentUser} addLog={addLog} isMobile={isMobile}/>}

    {activeTab==="abast"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {/* resumo */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
        {[{l:"ABASTECIMENTOS",v:fmt(viewAbast.length),i:"⛽",c:C.gold},{l:"LITROS",v:fmt(Math.round(totalLitros)),i:"🛢️",c:C.blue},{l:"GASTO TOTAL",v:`R$ ${fmt(Math.round(totalGastoComb))}`,i:"💰",c:C.grn}].map((s,i)=>(
          <Card key={i} style={{padding:isMobile?12:14,display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${s.c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{s.i}</div>
            <div><div style={{fontSize:9,fontWeight:700,color:C.muted}}>{s.l}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?15:19,fontWeight:800,color:s.c}}>{s.v}</div></div>
          </Card>
        ))}
      </div>
      {viewAbastFilt.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum abastecimento no período selecionado.</span></Card>}
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
    {activeTab==="check"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {viewCheckFilt.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum checklist no período.</span></Card>}
      {viewCheckFilt.map(c=>{
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
                <span style={{fontSize:11,color:C.muted}}>{c.dtCheck}</span>
                {!isTec&&<span style={{fontSize:11,color:C.muted}}>· {tech?.name||"?"}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginBottom:8}}>
                {[
                  {l:"KM",v:`${fmt(parseInt(c.km)||0)} km`,c:C.blue},
                  {l:"COMBUSTÍVEL",v:`⛽ ${c.combustivel||"?"}`,c:COMB_COLOR[c.combustivel]||C.gold},
                  {l:"PNEUS",v:pneuProb?"❌ Problema":pneuBaixo?"⚠️ Baixo":"✅ OK",c:pneuProb?C.red:pneuBaixo?C.ylw:C.grn},
                  {l:"AVARIAS",v:c.avarias?"⚠️ Sim":"✅ Não",c:c.avarias?C.ylw:C.grn},
                ].map((s,i)=>(
                  <div key={i} style={{background:C.surf,borderRadius:8,padding:"6px 10px"}}>
                    <div style={{fontSize:9,color:C.muted,marginBottom:2}}>{s.l}</div>
                    <div style={{fontSize:12,fontWeight:700,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
              {c.avarias&&c.descAvarias&&<div style={{fontSize:11,color:C.ylw,marginBottom:6}}>⚠️ {c.descAvarias}</div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {c.fotoOdometro&&<img src={c.fotoOdometro} alt="odômetro" style={{width:60,height:50,objectFit:"cover",borderRadius:6,border:`1px solid ${C.bdr2}`,cursor:"pointer"}} onClick={()=>window.open(c.fotoOdometro,"_blank")}/>}
                {c.fotosAvarias?.filter(f=>f).map((foto,i)=><img key={i} src={foto} alt={`avaria`} style={{width:60,height:50,objectFit:"cover",borderRadius:6,border:`1px solid ${C.red}44`,cursor:"pointer"}} onClick={()=>window.open(foto,"_blank")}/>)}
              </div>
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* ── PNEUS ── */}
    {activeTab==="pneus"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
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
              <div style={{fontSize:12,color:C.txt,fontWeight:600}}>{p.marca} {p.dot&&`· DOT: ${p.dot}`}</div>
              <div style={{display:"flex",gap:12,fontSize:11,color:C.muted,marginTop:4,flexWrap:"wrap"}}>
                {p.dtTroca&&<span>📅 Trocado: {p.dtTroca}</span>}
                {p.kmTroca&&<span style={{fontFamily:"'JetBrains Mono',monospace"}}>🛣️ {fmt(parseInt(p.kmTroca)||0)} km</span>}
                {p.obs&&<span>📝 {p.obs}</span>}
              </div>
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* ── HISTÓRICO POR VEÍCULO ── */}
    {activeTab==="hist"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Card style={{padding:14}}>
        <Sel label="Selecionar Veículo" value={selVeicHist} onChange={setSelVeicHist} options={[{value:"",label:"— Todos os veículos —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
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
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.blue}}>🛣️ {fmt(oleo.kmAtual)} km</span>
                {getConsumo(v.id)&&<span style={{color:C.grn}}>⛽ {getConsumo(v.id)} km/L</span>}
                <span>{vAbast.length} abast · {vCheck.length} checks · {vManut.length} OS · {vPneus.length} pneus</span>
              </div>
            </div>
          </div>
          {/* Linha do tempo */}
          <div style={{padding:14,display:"flex",flexDirection:"column",gap:8,maxHeight:400,overflowY:"auto"}}>
            {[
              ...vAbast.map(a=>({tipo:"abast",dt:a.dtAbast,label:canFuel?`Abastecimento ${a.dtAbast} - ${a.litros}L R$ ${a.valor} (${a.combustivel}) - ${fmt(parseInt(a.odometro)||0)} km`:`Abastecimento ${a.dtAbast} - ${a.litros}L (${a.combustivel}) - ${fmt(parseInt(a.odometro)||0)} km`,color:C.gold})),
              ...vCheck.map(c=>({tipo:"check",dt:c.dtCheck,label:`${c.tipo==="retirada"?"🚗":"↩️"} ${c.dtCheck} — ${c.tipo} · ${fmt(parseInt(c.km)||0)} km · Pneus: ${Object.values(c.pneus||{}).some(p=>p==="problema")?"❌":"✅"} · Avarias: ${c.avarias?"⚠️":"✅"}`,color:c.tipo==="retirada"?C.gold:C.grn})),
              ...vManut.map(o=>({tipo:"manut",dt:o.dtEntrada,label:`🔧 ${o.dtEntrada} — ${o.tipo} · ${o.descricao?.slice(0,40)} · ${o.status}`,color:C.red})),
              ...vPneus.map(p=>({tipo:"pneu",dt:p.dtTroca,label:`🔄 ${p.dtTroca} — Pneu ${p.posicao}: ${p.marca} (DOT: ${p.dot||"?"})`,color:C.blue})),
            ].sort((a,b)=>(b.dt||"").localeCompare(a.dt||"")).map((e,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:e.color,flexShrink:0,marginTop:5}}/>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{e.label}</div>
              </div>
            ))}
            {[...vAbast,...vCheck,...vManut,...vPneus].length===0&&<div style={{color:C.muted,fontSize:12,textAlign:"center",padding:16}}>Sem registros para este veículo.</div>}
          </div>
        </Card>;
      })}
    </div>}

    {/* ── CUSTOS ── */}
    {activeTab==="custos"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
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
              {l:"COMBUSTÍVEL",v:`R$ ${fmt(Math.round(gastoComb))}`,c:C.gold,i:"⛽"},
              {l:"MANUTENÇÃO",v:`R$ ${fmt(Math.round(gastoManut))}`,c:C.red,i:"🔧"},
              {l:"TOTAL GERAL",v:`R$ ${fmt(Math.round(gastoComb+gastoManut))}`,c:C.grn,i:"💰"},
              {l:"KM RODADOS",v:fmt(kmRodados),c:C.blue,i:"🛣️"},
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

    {/* ── MODAIS ── */}

    {/* Fotos */}
    {modalFotos&&<div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:12,width:"100%",maxWidth:700,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,color:C.txt}}>🖼️ Fotos — {modalFotos.placa} {modalFotos.modelo}</span>
          <button onClick={()=>setModalFotos(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
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
          <span style={{fontSize:15,fontWeight:700,color:C.txt}}>📄 Documento — {modalDoc.placa}</span>
          <div style={{display:"flex",gap:8}}>
            <Btn size="sm" color="gold" onClick={()=>window.open(modalDoc.docPDF,"_blank")}>⬇️ Abrir PDF</Btn>
            <button onClick={()=>setModalDoc(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,padding:20}}><iframe src={modalDoc.docPDF} title="Doc" style={{width:"100%",height:"60vh",border:"none",borderRadius:8}}/></div>
      </div>
    </div>}

    {/* Modal Cadastro Veículo */}
    {modalVeic&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:680,height:isMobile?"95vh":"94vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>🚗 {modalVeic==="new"?"Cadastrar":"Editar"} Veículo</h2>
          <button onClick={()=>setModalVeic(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          {/* Dados básicos */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>📋 DADOS DO VEÍCULO</div>
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
              <Inp label="Data Aquisição" value={formVeic.dtAquisicao} onChange={v=>setFormVeic(f=>({...f,dtAquisicao:v}))} type="date"/>
              <Sel label="Técnico Responsável" value={formVeic.tecnicoId} onChange={v=>setFormVeic(f=>({...f,tecnicoId:v}))} options={[{value:"",label:"— Sem responsável —"},...techs.map(t=>({value:t.id,label:t.name}))]}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginTop:10}}>
              <Sel label="Status" value={formVeic.status} onChange={v=>setFormVeic(f=>({...f,status:v}))} options={STATUS_OPTS.map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))}/>
              <Inp label="Observações" value={formVeic.obs} onChange={v=>setFormVeic(f=>({...f,obs:v}))} placeholder="Obs opcionais"/>
            </div>
          </div>
          {/* Vencimentos */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>📅 VENCIMENTOS</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
              <Inp label="Venc. IPVA" value={formVeic.vencIPVA||""} onChange={v=>setFormVeic(f=>({...f,vencIPVA:v}))} type="date"/>
              <Inp label="Venc. Licenciamento" value={formVeic.vencLicenc||""} onChange={v=>setFormVeic(f=>({...f,vencLicenc:v}))} type="date"/>
              <Inp label="Venc. Seguro" value={formVeic.vencSeguro||""} onChange={v=>setFormVeic(f=>({...f,vencSeguro:v}))} type="date"/>
            </div>
          </div>
          {/* Documento PDF */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>📄 DOCUMENTO DO VEÍCULO (PDF)</div>
            {formVeic.docPDF?(
              <div style={{display:"flex",alignItems:"center",gap:12,background:C.card,borderRadius:8,padding:"12px 14px",border:`1px solid ${C.bdr2}`}}>
                <span style={{fontSize:28}}>📄</span>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.grn}}>✓ Documento anexado</div></div>
                <div style={{display:"flex",gap:8}}>
                  <Btn size="xs" color="gold" onClick={()=>window.open(formVeic.docPDF,"_blank")}>Ver</Btn>
                  <button onClick={()=>setFormVeic(f=>({...f,docPDF:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              </div>
            ):(
              <label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:C.card,border:`2px dashed ${C.bdr2}`,borderRadius:8,padding:"14px 18px"}}>
                <span style={{fontSize:28}}>📄</span>
                <div><div style={{fontSize:13,fontWeight:600,color:C.txt}}>Anexar CRVL / Licenciamento</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>PDF · Máx 5MB</div></div>
                <input type="file" accept=".pdf,application/pdf" onChange={handleDocPDF} style={{display:"none"}}/>
              </label>
            )}
          </div>
          {/* 4 Fotos */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>📸 FOTOS (4 ângulos)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {FOTOS_LABELS.map((label,i)=>(
                <div key={i} style={{borderRadius:8,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
                  <div style={{background:C.card,padding:"6px 10px",fontSize:11,fontWeight:700,color:C.muted}}>{FOTOS_ICONS[i]} {label}</div>
                  {formVeic.fotos?.[i]?(
                    <div style={{position:"relative"}}>
                      <img src={formVeic.fotos[i]} alt={label} style={{width:"100%",height:110,objectFit:"cover"}}/>
                      <button onClick={()=>setFormVeic(f=>({...f,fotos:f.fotos.map((ft,j)=>j===i?"":ft)}))} style={{position:"absolute",top:4,right:4,background:"#000000bb",color:"#fff",border:"none",borderRadius:4,width:22,height:22,cursor:"pointer",fontSize:12}}>✕</button>
                    </div>
                  ):(
                    <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:110,cursor:"pointer",background:C.bg,gap:4}}>
                      <span style={{fontSize:22}}>📷</span><span style={{fontSize:10,color:C.muted}}>Foto</span>
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

    {/* Modal Abastecimento */}
    {modalAbast&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:560,height:isMobile?"95vh":"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>⛽ Registrar Abastecimento</h2>
          <button onClick={()=>setModalAbast(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="Veículo *" value={formAbast.veiculoId} onChange={v=>setFormAbast(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
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
          {formAbast.litros&&formAbast.valor&&parseFloat(formAbast.litros)>0&&(
            <div style={{background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:C.muted}}>Preço por litro:</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>R$ {(parseFloat(formAbast.valor)/parseFloat(formAbast.litros)).toFixed(2)}/L</span>
            </div>
          )}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>📸 Nota Fiscal</div>
            {formAbast.foto?(
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <img src={formAbast.foto} alt="nota" style={{width:80,height:80,objectFit:"cover",borderRadius:8,border:`2px solid ${C.gold}55`}}/>
                <button onClick={()=>setFormAbast(f=>({...f,foto:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12}}>✕ Remover</button>
              </div>
            ):(
              <label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:C.card,border:`2px dashed ${C.bdr2}`,borderRadius:8,padding:"12px 16px"}}>
                <span style={{fontSize:24}}>📷</span>
                <div><div style={{fontSize:13,fontWeight:600,color:C.txt}}>Tirar foto da nota</div><div style={{fontSize:11,color:C.muted}}>JPG, PNG · Máx 3MB</div></div>
                <input type="file" accept="image/*" capture="environment" onChange={handleFotoAbast} style={{display:"none"}}/>
              </label>
            )}
          </div>
          {errAbast&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errAbast}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalAbast(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarAbast}>✅ Registrar</Btn>
        </div>
      </div>
    </div>}

    {/* Modal Checklist */}
    {modalCheck&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:640,height:isMobile?"95vh":"92vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>{formCheck.tipo==="retirada"?"🚗 Checklist de Retirada":"↩️ Checklist de Devolução"}</h2>
            <p style={{fontSize:11,color:C.muted,marginTop:2}}>Registre as condições do veículo</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
              {["retirada","devolucao"].map(t=>(
                <div key={t} onClick={()=>setFormCheck(f=>({...f,tipo:t}))} style={{padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:600,background:formCheck.tipo===t?C.gold:"transparent",color:formCheck.tipo===t?"#000":C.muted}}>{t==="retirada"?"🚗":"↩️"} {t}</div>
              ))}
            </div>
            <button onClick={()=>setModalCheck(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="Veículo *" value={formCheck.veiculoId} onChange={v=>setFormCheck(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
            <Inp label="Data" value={formCheck.dtCheck} onChange={v=>setFormCheck(f=>({...f,dtCheck:v}))} type="date"/>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>🛣️ QUILOMETRAGEM *</div>
            <Inp label="KM Atual" value={formCheck.km} onChange={v=>setFormCheck(f=>({...f,km:v}))} type="number" placeholder="Ex: 45320"/>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>⛽ NÍVEL DE COMBUSTÍVEL</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {COMB_NIVEL.map(n=>(
                <div key={n} onClick={()=>setFormCheck(f=>({...f,combustivel:n}))} style={{flex:1,minWidth:60,textAlign:"center",padding:"10px 8px",borderRadius:8,cursor:"pointer",border:`2px solid ${formCheck.combustivel===n?COMB_COLOR[n]:C.bdr2}`,background:formCheck.combustivel===n?`${COMB_COLOR[n]}22`:"transparent"}}>
                  <div style={{fontSize:16,marginBottom:4}}>⛽</div>
                  <div style={{fontSize:11,fontWeight:700,color:formCheck.combustivel===n?COMB_COLOR[n]:C.muted}}>{n.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>🔄 PNEUS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["diant_esq","↙️ Diant. Esq"],["diant_dir","↘️ Diant. Dir"],["tras_esq","↖️ Tras. Esq"],["tras_dir","↗️ Tras. Dir"]].map(([key,label])=>(
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
              <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",flex:1}}>⚠️ AVARIAS</div>
              <div style={{display:"flex",gap:8}}>
                {[{v:false,l:"✅ Sem avarias"},{v:true,l:"⚠️ Com avarias"}].map(opt=>(
                  <div key={String(opt.v)} onClick={()=>setFormCheck(f=>({...f,avarias:opt.v}))} style={{padding:"7px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,border:`2px solid ${formCheck.avarias===opt.v?(opt.v?C.ylw:C.grn):C.bdr2}`,background:formCheck.avarias===opt.v?`${opt.v?C.ylw:C.grn}22`:"transparent",color:formCheck.avarias===opt.v?(opt.v?C.ylw:C.grn):C.muted}}>{opt.l}</div>
                ))}
              </div>
            </div>
            {formCheck.avarias&&<div>
              <label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Descrição</label>
              <textarea value={formCheck.descAvarias} onChange={e=>setFormCheck(f=>({...f,descAvarias:e.target.value}))} rows={3} placeholder="Descreva as avarias..." style={{width:"100%",background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
            </div>}
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>📸 FOTOS</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>📟 Foto do Odômetro</div>
              {formCheck.fotoOdometro?(
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <img src={formCheck.fotoOdometro} alt="odômetro" style={{width:80,height:70,objectFit:"cover",borderRadius:8,border:`2px solid ${C.gold}55`}}/>
                  <button onClick={()=>setFormCheck(f=>({...f,fotoOdometro:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              ):(
                <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",background:C.card,border:`1.5px dashed ${C.bdr2}`,borderRadius:8,padding:"10px 16px"}}>
                  <span style={{fontSize:20}}>📷</span><span style={{fontSize:12,color:C.muted}}>Fotografar odômetro</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleFotoOdo} style={{display:"none"}}/>
                </label>
              )}
            </div>
            {formCheck.avarias&&<div>
              <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>⚠️ Fotos das Avarias (até 3)</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {formCheck.fotosAvarias.map((foto,i)=>foto?(
                  <div key={i} style={{position:"relative"}}>
                    <img src={foto} alt={`avaria`} style={{width:80,height:70,objectFit:"cover",borderRadius:8,border:`2px solid ${C.ylw}55`}}/>
                    <button onClick={()=>setFormCheck(f=>({...f,fotosAvarias:f.fotosAvarias.map((ft,j)=>j===i?"":ft)}))} style={{position:"absolute",top:2,right:2,background:"#000000bb",color:"#fff",border:"none",borderRadius:4,width:18,height:18,cursor:"pointer",fontSize:10}}>✕</button>
                  </div>
                ):(
                  <label key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:80,height:70,cursor:"pointer",background:C.card,border:`1.5px dashed ${C.bdr2}`,borderRadius:8}}>
                    <span style={{fontSize:18}}>📷</span><span style={{fontSize:9,color:C.muted}}>Avaria {i+1}</span>
                    <input type="file" accept="image/*" capture="environment" onChange={e=>handleFotoAvaria(i,e)} style={{display:"none"}}/>
                  </label>
                ))}
              </div>
            </div>}
          </div>
          {errCheck&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errCheck}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalCheck(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarCheck}>✅ Registrar {formCheck.tipo==="retirada"?"Retirada":"Devolução"}</Btn>
        </div>
      </div>
    </div>}

    {/* Modal Pneu */}
    {modalPneu&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:480,maxHeight:isMobile?"88vh":"82vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>🔄 Registrar Pneu</h2>
          <button onClick={()=>setModalPneu(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Sel label="Veículo *" value={formPneu.veiculoId} onChange={v=>setFormPneu(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
          <Sel label="Posição" value={formPneu.posicao} onChange={v=>setFormPneu(f=>({...f,posicao:v}))} options={[{value:"diant_esq",label:"↙️ Dianteiro Esquerdo"},{value:"diant_dir",label:"↘️ Dianteiro Direito"},{value:"tras_esq",label:"↖️ Traseiro Esquerdo"},{value:"tras_dir",label:"↗️ Traseiro Direito"},{value:"estepe",label:"🔄 Estepe"}]}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Marca *" value={formPneu.marca} onChange={v=>setFormPneu(f=>({...f,marca:v}))} placeholder="Ex: Michelin"/>
            <Inp label="DOT" value={formPneu.dot} onChange={v=>setFormPneu(f=>({...f,dot:v}))} placeholder="Ex: 2024"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Data de Troca" value={formPneu.dtTroca} onChange={v=>setFormPneu(f=>({...f,dtTroca:v}))} type="date"/>
            <Inp label="KM na Troca" value={formPneu.kmTroca} onChange={v=>setFormPneu(f=>({...f,kmTroca:v}))} type="number" placeholder="45000"/>
          </div>
          <Inp label="Observações" value={formPneu.obs} onChange={v=>setFormPneu(f=>({...f,obs:v}))} placeholder="Recapagem, rodízio, etc."/>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalPneu(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarPneu}>✅ Salvar Pneu</Btn>
        </div>
      </div>
    </div>}
  </div>;
}


/* ── MANUTENÇÃO (MECÂNICO) ── */
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

  const TYPE_OPTS=["corretiva","preventiva","revisão","elétrica","pneus","outros"];
  const URG_COLOR={normal:C.muted,alta:C.ylw,urgente:C.red};
  const STATUS_SOL_COLOR={aberta:"ylw",analisada:"blue",aprovada:"grn",pendente_fin:"gold",liberada:"blue",em_andamento:"blue",concluida:"grn",cancelada:"red"};
  const STATUS_SOL_LABEL={aberta:"⏳ Aberta",analisada:"🔍 Analisada",aprovada:"✅ Aprovada",pendente_fin:"💰 Ag. Financeiro",liberada:"🔓 Liberada",em_andamento:"🔧 Em Andamento",concluida:"✅ Concluída",cancelada:"❌ Cancelada"};
  const STATUS_OS_COLOR={aberta:"ylw",em_andamento:"blue",concluida:"grn"};
  const STATUS_OS_LABEL={aberta:"⏳ Aberta",em_andamento:"🔧 Em Andamento",concluida:"✅ Concluída"};

  const getVeic=(id)=>veiculos.find(v=>v.id===id);
  const getUser=(id)=>users.find(u=>u.id===id);
  const totalPecas=(os)=>os.pecas?.reduce((a,p)=>a+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0;

  const salvarSol=()=>{
    if(!formSol.veiculoId){setErrSol("Selecione o veículo.");return;}
    if(!formSol.descricao.trim()){setErrSol("Descreva o problema.");return;}
    setManutSols(p=>[{...formSol,id:uid()},...p]);
    addLog(currentUser.name,"Manutenção","Solicitação: "+formSol.tipo+" · "+(getVeic(formSol.veiculoId)?.placa||"?"));
    setModalSol(false);setErrSol("");setFormSol(blankSol());
  };

  const salvarOS=()=>{
    if(!formOS.veiculoId){setErrOS("Selecione o veículo.");return;}
    if(!formOS.descricao.trim()){setErrOS("Descreva o serviço.");return;}
    if(modalOS==="new"){
      setManutOS(p=>[{...formOS,id:uid()},...p]);
      addLog(currentUser.name,"OS Mecânica","Aberta: "+(getVeic(formOS.veiculoId)?.placa||"?")+" · "+formOS.tipo);
    } else {
      setManutOS(p=>p.map(o=>o.id===modalOS?{...formOS}:o));
      addLog(currentUser.name,"OS Mecânica","Atualizada: "+(getVeic(formOS.veiculoId)?.placa||"?"));
    }
    setModalOS(null);setErrOS("");
  };

  const concluirOS=(os,kmSaida)=>{
    setManutOS(p=>p.map(o=>o.id===os.id?{...o,status:"concluida",kmSaida,dtSaida:new Date().toISOString().slice(0,10)}:o));
    if(os.solicitacaoId) setManutSols(p=>p.map(s=>s.id===os.solicitacaoId?{...s,status:"concluida"}:s));
    addLog(currentUser.name,"OS Mecânica","Concluída: "+(getVeic(os.veiculoId)?.placa||"?"));
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>🔩 Manutenção</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Solicitações e ordens de serviço</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn color="gold" size="sm" onClick={()=>{setFormSol(blankSol());setModalSol(true);setErrSol("");}}>+ Solicitação</Btn>
        {(isAdm||isMec)&&<Btn color="red" size="sm" onClick={()=>{setFormOS(blankOS());setModalOS("new");setErrOS("");}}>🔧 Nova OS</Btn>}
      </div>
    </div>

    {/* Resumo */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
      {[
        {l:"SOLICITAÇÕES",v:fmt(manutSols.length),i:"📋",c:C.gold},
        {l:"EM ABERTO",v:fmt(manutSols.filter(s=>s.status==="aberta").length),i:"⏳",c:C.ylw},
        {l:"OS ABERTAS",v:fmt(manutOS.filter(o=>o.status!=="concluida").length),i:"🔧",c:C.red},
        {l:"CONCLUÍDAS",v:fmt(manutOS.filter(o=>o.status==="concluida").length),i:"✅",c:C.grn},
      ].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?12:14,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${s.c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{s.i}</div>
          <div><div style={{fontSize:9,fontWeight:700,color:C.muted}}>{s.l}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?16:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
        </Card>
      ))}
    </div>

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`}}>
      {[{k:"sols",l:"📋 Solicitações"},{k:"os",l:"🔧 Ordens de Serviço"},{k:"hist",l:"📊 Histórico"}].map(t=>(
        <div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>
      ))}
    </div>

    {/* Solicitações */}
    {tab==="sols"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {manutSols.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhuma solicitação ainda. Clique em "+ Solicitação".</span></Card>}
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
                {s.urgencia==="urgente"&&<Bdg color="red">🔴 URGENTE</Bdg>}
                {s.urgencia==="alta"&&<Bdg color="ylw">🟡 Alta</Bdg>}
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:4}}>🔧 {s.tipo} · {sol?.name||"?"} · {s.dtSol}</div>
              <div style={{fontSize:13,color:C.txt2}}>{s.descricao}</div>
              {osVinc&&<div style={{marginTop:8,background:C.surf,borderRadius:6,padding:"6px 10px",fontSize:11,color:C.muted}}>OS vinculada: <strong style={{color:C.gold}}>#{osVinc.id.slice(-4)}</strong> — {STATUS_OS_LABEL[osVinc.status]}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {isMec&&s.status==="aberta"&&<Btn size="xs" color="blue" onClick={()=>setManutSols(p=>p.map(x=>x.id===s.id?{...x,status:"analisada",analisadoPor:currentUser.name,dtAnalise:now()}:x))}>🔍 Analisar</Btn>}
              {isAdm&&s.status==="analisada"&&<Btn size="xs" color="grn" onClick={()=>setManutSols(p=>p.map(x=>x.id===s.id?{...x,status:"aprovada",aprovadoPor:currentUser.name,dtAprovacao:now()}:x))}>✅ Aprovar</Btn>}
              {currentUser.role==="financeiro"&&s.status==="aprovada"&&<Btn size="xs" color="gold" onClick={()=>setManutSols(p=>p.map(x=>x.id===s.id?{...x,status:"liberada",liberadoPor:currentUser.name,dtLiberacao:now()}:x))}>🔓 Liberar</Btn>}
              {(isAdm||isMec)&&(s.status==="aberta"||s.status==="liberada")&&<Btn size="xs" color="gold" onClick={()=>{setFormOS({...blankOS(),solicitacaoId:s.id,veiculoId:s.veiculoId,tipo:s.tipo,descricao:s.descricao});setModalOS("new");setTab("os");}}>🔧 Criar OS</Btn>}
              {(isAdm||isMec)&&s.status!=="concluida"&&s.status!=="cancelada"&&<Btn size="xs" color="red" outline onClick={()=>setManutSols(p=>p.map(x=>x.id===s.id?{...x,status:"cancelada"}:x))}>Cancelar</Btn>}
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* OS */}
    {tab==="os"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {manutOS.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhuma OS. Clique em "🔧 Nova OS".</span></Card>}
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
                <span style={{fontSize:11,color:C.muted}}>🔧 {os.tipo}</span>
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:6}}>👨‍🔧 {mec?.name||"?"} · {os.dtEntrada}{os.dtSaida&&` → ${os.dtSaida}`}</div>
              <div style={{fontSize:13,color:C.txt2,marginBottom:6}}>{os.descricao}</div>
              <div style={{display:"flex",gap:14,fontSize:12,flexWrap:"wrap"}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>KM entrada: <strong style={{color:C.txt}}>{fmt(parseInt(os.kmEntrada)||0)}</strong></span>
                {os.kmSaida&&<span style={{fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>KM saída: <strong style={{color:C.txt}}>{fmt(parseInt(os.kmSaida)||0)}</strong></span>}
              </div>
              {os.servicos&&<div style={{fontSize:12,color:C.txt2,marginTop:4}}><strong>Serviços:</strong> {os.servicos}</div>}
              {os.pecas?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                {os.pecas.map((p,i)=>(
                  <div key={i} style={{background:C.surf,borderRadius:6,padding:"4px 10px",fontSize:11,border:`1px solid ${C.bdr}`}}>{p.nome} ×{p.qtd}{p.valor&&<span style={{color:C.gold}}> R${(parseFloat(p.valor)*parseInt(p.qtd)).toFixed(2)}</span>}</div>
                ))}
                {tp>0&&<div style={{fontSize:12,color:C.grn,fontWeight:700,alignSelf:"center"}}>Total: R${tp.toFixed(2)}</div>}
              </div>}
            </div>
            {os.status!=="concluida"&&(isAdm||isMec)&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
              <Btn size="xs" color="gold" outline onClick={()=>{setFormOS({...os,pecas:os.pecas||[]});setModalOS(os.id);}}>Editar</Btn>
              <Btn size="xs" color="grn" onClick={()=>{const km=prompt("KM de saída:");if(km)concluirOS(os,km);}}>✅ Concluir</Btn>
            </div>}
          </div>
        </Card>;
      })}
    </div>}

    {/* Histórico por veículo */}
    {tab==="hist"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {veiculos.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum veículo cadastrado.</span></Card>}
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
            <span style={{fontSize:12,color:C.muted}}>{fmt(osV.length)} OS · {fmt(solV.length)} Sol.</span>
          </div>
          {osV.map(os=>(
            <div key={os.id} style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}18`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:2}}>
                  <Bdg color={STATUS_OS_COLOR[os.status]||"gold"}>{STATUS_OS_LABEL[os.status]}</Bdg>
                  <span style={{fontSize:12,color:C.txt}}>{os.tipo} — {os.descricao.slice(0,50)}</span>
                </div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>KM {fmt(parseInt(os.kmEntrada)||0)} → {os.kmSaida?fmt(parseInt(os.kmSaida)):"-"} · {os.dtEntrada}</span>
              </div>
              {totalPecas(os)>0&&<span style={{fontSize:12,color:C.grn,fontWeight:700}}>R${totalPecas(os).toFixed(2)}</span>}
            </div>
          ))}
        </Card>;
      }).filter(Boolean)}
    </div>}

    {/* Modal Solicitação */}
    {modalSol&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:560,maxHeight:isMobile?"92vh":"85vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>📋 Nova Solicitação</h2>
          <button onClick={()=>setModalSol(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Sel label="Veículo *" value={formSol.veiculoId} onChange={v=>setFormSol(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Sel label="Tipo" value={formSol.tipo} onChange={v=>setFormSol(f=>({...f,tipo:v}))} options={TYPE_OPTS.map(t=>({value:t,label:t.charAt(0).toUpperCase()+t.slice(1)}))}/>
            <Sel label="Urgência" value={formSol.urgencia} onChange={v=>setFormSol(f=>({...f,urgencia:v}))} options={[{value:"normal",label:"Normal"},{value:"alta",label:"🟡 Alta"},{value:"urgente",label:"🔴 Urgente"}]}/>
          </div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Descrição *</label><textarea value={formSol.descricao} onChange={e=>setFormSol(f=>({...f,descricao:e.target.value}))} rows={4} placeholder="Descreva o problema..." style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/></div>
          {errSol&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errSol}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalSol(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarSol}>✅ Enviar Solicitação</Btn>
        </div>
      </div>
    </div>}

    {/* Modal OS */}
    {modalOS&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:640,height:isMobile?"95vh":"90vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>🔧 {modalOS==="new"?"Nova OS":"Editar OS"}</h2>
          <button onClick={()=>setModalOS(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Sel label="Veículo *" value={formOS.veiculoId} onChange={v=>setFormOS(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Sel label="Tipo" value={formOS.tipo} onChange={v=>setFormOS(f=>({...f,tipo:v}))} options={TYPE_OPTS.map(t=>({value:t,label:t.charAt(0).toUpperCase()+t.slice(1)}))}/>
            <Sel label="Status" value={formOS.status} onChange={v=>setFormOS(f=>({...f,status:v}))} options={Object.entries(STATUS_OS_LABEL).map(([k,l])=>({value:k,label:l}))}/>
          </div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Problema / Descrição *</label><textarea value={formOS.descricao} onChange={e=>setFormOS(f=>({...f,descricao:e.target.value}))} rows={3} style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif",marginBottom:10}}/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Serviços Executados</label><textarea value={formOS.servicos} onChange={e=>setFormOS(f=>({...f,servicos:e.target.value}))} rows={2} placeholder="Ex: Troca de óleo..." style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:10}}>
            <Inp label="KM Entrada" value={formOS.kmEntrada} onChange={v=>setFormOS(f=>({...f,kmEntrada:v}))} type="number" placeholder="45000"/>
            <Inp label="KM Saída" value={formOS.kmSaida} onChange={v=>setFormOS(f=>({...f,kmSaida:v}))} type="number" placeholder="45050"/>
            <Inp label="Data Entrada" value={formOS.dtEntrada} onChange={v=>setFormOS(f=>({...f,dtEntrada:v}))} type="date"/>
            <Inp label="Data Saída" value={formOS.dtSaida} onChange={v=>setFormOS(f=>({...f,dtSaida:v}))} type="date"/>
          </div>
          {/* Peças */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase"}}>🔩 Peças Utilizadas</span>
              <Btn size="xs" color="gold" onClick={()=>setFormOS(f=>({...f,pecas:[...f.pecas,blankPeca()]}))}>+ Peça</Btn>
            </div>
            {formOS.pecas?.length===0&&<div style={{color:C.muted,fontSize:12,textAlign:"center",padding:"8px 0"}}>Nenhuma peça</div>}
            {formOS.pecas?.map((p,i)=>(
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"2fr 70px 100px 30px",gap:8,alignItems:"end",marginBottom:8}}>
                <Inp label={i===0?"Nome":"_"} value={p.nome} onChange={v=>setFormOS(f=>({...f,pecas:f.pecas.map((x,j)=>j===i?{...x,nome:v}:x)}))} placeholder="Nome da peça"/>
                <Inp label={i===0?"Qtd":"_"} value={p.qtd} onChange={v=>setFormOS(f=>({...f,pecas:f.pecas.map((x,j)=>j===i?{...x,qtd:v}:x)}))} type="number"/>
                <Inp label={i===0?"Valor R$":"_"} value={p.valor} onChange={v=>setFormOS(f=>({...f,pecas:f.pecas.map((x,j)=>j===i?{...x,valor:v}:x)}))} type="number"/>
                <button onClick={()=>setFormOS(f=>({...f,pecas:f.pecas.filter((_,j)=>j!==i)}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,height:36,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2}}>✕</button>
              </div>
            ))}
            {formOS.pecas?.length>0&&<div style={{textAlign:"right",fontSize:12,color:C.grn,fontWeight:700}}>Total: R${totalPecas(formOS).toFixed(2)}</div>}
          </div>
          <Inp label="Observações" value={formOS.obs} onChange={v=>setFormOS(f=>({...f,obs:v}))} placeholder="Observações"/>
          {errOS&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errOS}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalOS(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarOS}>✅ Salvar OS</Btn>
        </div>
      </div>
    </div>}
  </div>;
}


/* ── DOCUMENTAÇÃO / AJUDA ── */
function HelpPage({currentUser,isMobile}){
  const[section,setSection]=useState("inicio");
  const isAdm=["admin","superadmin"].includes(currentUser?.role);
  const gerarManualPDF=()=>{
    const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
    <title>StockTel - Manual ${APP_VERSION_LABEL}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#181818;background:#fff;line-height:1.55}
      .wrap{max-width:920px;margin:0 auto;padding:28px}
      .top{display:flex;justify-content:space-between;gap:20px;border-bottom:4px solid #d10000;padding-bottom:18px;margin-bottom:22px}
      h1{margin:0;color:#d10000;font-size:28px} h2{color:#d10000;margin-top:26px;border-bottom:1px solid #eee;padding-bottom:6px}
      h3{margin-bottom:6px;color:#333}.meta{font-size:12px;color:#666;text-align:right}.box{background:#f7f7f7;border:1px solid #ddd;border-radius:8px;padding:14px;margin:12px 0}
      li{margin:5px 0}.badge{display:inline-block;background:#d10000;color:#fff;border-radius:4px;padding:3px 7px;font-size:11px;font-weight:bold}
      .print{position:fixed;right:18px;top:18px;background:#d10000;color:#fff;border:0;border-radius:7px;padding:10px 16px;font-weight:bold;cursor:pointer}
      @media print{.print{display:none}.wrap{padding:0 18px}.box{break-inside:avoid}}
    </style></head><body>
    <button class="print" onclick="window.print()">Imprimir / Salvar PDF</button>
    <div class="wrap">
      <div class="top"><div><h1>StockTel</h1><div>Sistema de gestao de estoque, frota, ponto e operacao tecnica</div></div><div class="meta"><b>${APP_VERSION_LABEL}</b><br/>Atualizado em ${APP_RELEASE_DATE}<br/>Gerado em ${new Date().toLocaleString("pt-BR")}</div></div>
      <div class="box"><b>Objetivo:</b> centralizar materiais, kits dos tecnicos, ordens de servico, frota, ponto eletronico, relatorios e auditoria para a operacao da StockTel.</div>
      <h2>1. Perfis de acesso</h2>
      <ul><li><b>Root/Master:</b> administra permissoes, personalizacao e funcoes sensiveis.</li><li><b>Administrador:</b> acompanha operacao, usuarios, estoque, frota, relatorios e aprovacoes.</li><li><b>Estoque:</b> controla materiais, notas fiscais, liberacoes e devolucoes.</li><li><b>Tecnico:</b> consulta kit, registra OS, solicita material, usa ponto e checklist de frota.</li><li><b>Mecanico:</b> acompanha veiculos, manutencoes, pneus e historico da frota.</li><li><b>Financeiro:</b> acompanha notas, custos, relatorios financeiros e gastos de frota.</li></ul>
      <h2>2. Fluxo de materiais</h2>
      <ol><li>Entrada por NF aumenta o estoque base.</li><li>Saida/liberacao transfere material para o kit do tecnico.</li><li>Na OS, o tecnico informa materiais usados e o sistema baixa do kit.</li><li>Devolucao volta material excedente para o estoque base apos aprovacao.</li><li>Solicitacoes permitem pedir reposicao sem sair do app.</li></ol>
      <h2>3. Ordens de servico</h2>
      <p>Use a OS para vincular cliente, numero da ordem, tecnico responsavel, fotos e materiais consumidos. Esse registro cria historico e alimenta relatorios.</p>
      <h2>4. Frota e manutencao</h2>
      <ul><li>Cadastro de veiculos com documento, fotos, vencimentos e responsavel.</li><li>Checklist de retirada/devolucao com KM, combustivel, pneus e avarias.</li><li>Pneus e manutencao ficam dentro da area de Frota.</li><li>Custos e abastecimento ficam restritos a perfis administrativos/financeiros.</li></ul>
      <h2>5. Ponto eletronico</h2>
      <p>O colaborador registra entrada, almoco, retorno e saida. Quando estiver fora da regra de horario ou local, deve justificar para analise administrativa. Escalas e folgas ficam visiveis aos colaboradores e configuraveis por administradores.</p>
      <h2>6. Relatorios</h2>
      <ul><li>Relatorios por periodo de estoque, OS, tecnicos e devolucoes.</li><li>Relatorio administrativo com financeiro, frota, SLA e alertas.</li><li>Exportacao para PDF e Excel quando disponivel na tela.</li></ul>
      <h2>7. Sincronizacao e status</h2>
      <p>O sistema usa Supabase na nuvem e localStorage como apoio offline. Se aparecer aviso de offline ou Supabase sem resposta, continue operando com cuidado e use Diagnostico para verificar/sincronizar quando a conexao voltar.</p>
      <h2>8. Boas praticas</h2>
      <ul><li>Nunca compartilhe usuario e senha.</li><li>Confirme tecnico, OS e quantidade antes de liberar material.</li><li>Anexe fotos/documentos quando a tela permitir.</li><li>Use relatorios para conferencia diaria de estoque, devolucoes e frota.</li></ul>
      <p class="meta">StockTel ${APP_VERSION_LABEL} - Manual operacional</p>
    </div></body></html>`;
    const w=window.open("","_blank");
    if(!w)return alert("O navegador bloqueou a janela do PDF. Libere pop-ups e tente novamente.");
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),500);
  };

  const sections=[
    {k:"inicio",l:"🏠 Início",icon:"🏠"},
    {k:"estoque",l:"📦 Estoque",icon:"📦"},
    {k:"os",l:"🔧 Ordens de Serviço",icon:"🔧"},
    {k:"frota",l:"🚗 Frota",icon:"🚗"},
    {k:"relatorios",l:"📊 Relatórios",icon:"📊"},
    {k:"usuarios",l:"👥 Usuários",icon:"👥"},
    {k:"faq",l:"❓ FAQ",icon:"❓"},
    {k:"atalhos",l:"⌨️ Atalhos",icon:"⌨️"},
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
            <span style={{color,fontSize:12,marginTop:2,flexShrink:0}}>▶</span>
            <span style={{fontSize:13,color:C.txt2,lineHeight:1.5}}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const TipCard=({tip,color=C.ylw})=>(
    <div style={{background:`${color}15`,border:`1px solid ${color}44`,borderRadius:8,padding:"10px 14px",marginBottom:8,display:"flex",gap:10,alignItems:"flex-start"}}>
      <span style={{fontSize:16,flexShrink:0}}>💡</span>
      <span style={{fontSize:12,color:C.txt2,lineHeight:1.5}}>{tip}</span>
    </div>
  );

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
      <div>
      <h1 style={{fontSize:isMobile?17:22,fontWeight:700,color:C.txt}}>📚 Documentação & Ajuda</h1>
      <p style={{fontSize:12,color:C.muted,marginTop:4}}>Guia completo do StockTel — Sistema de Gestão para Provedores FTTH</p>
    </div>
      <Btn color="red" size={isMobile?"sm":"md"} onClick={gerarManualPDF}>Baixar manual em PDF</Btn>
    </div>

    {/* Quick stats */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
      {[
        {l:"VERSÃO",v:APP_VERSION_LABEL,i:"🚀",c:C.gold},
        {l:"MÓDULOS",v:"15+",i:"📦",c:C.blue},
        {l:"PERFIS",v:"6",i:"👥",c:C.grn},
        {l:"SUPORTE",v:"24/7",i:"🎧",c:C.ylw},
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
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>SEÇÕES</div>
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
              <div style={{fontSize:48}}>🚀</div>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:C.txt}}>Bem-vindo ao StockTel</div>
                <div style={{fontSize:13,color:C.muted,marginTop:4}}>Sistema completo de gestão para provedores de internet FTTH</div>
                <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Bdg color="grn">Logado como {currentUser?.role}</Bdg>
                  <Bdg color="gold">{APP_VERSION_LABEL}</Bdg>
                </div>
              </div>
            </div>
          </Card>
          <InfoCard icon="🎯" title="O que é o StockTel?" color={C.gold} items={[
            "Sistema web de gestão de estoque e operações para provedores FTTH",
            "Controle completo de materiais: ONU, ONT, cabos, conectores, splitters e mais",
            "Gestão de frota: veículos, abastecimento, manutenção e checklists",
            "Ordens de Serviço com baixa automática do estoque do técnico",
            "Relatórios gerenciais com PDF e Excel profissionais",
            "Acesso via web e celular — sincronização em tempo real via Supabase",
          ]}/>
          <InfoCard icon="👥" title="Perfis de Usuário" color={C.blue} items={[
            "🔴 Admin: acesso total — gerencia usuários, estoque, frota, relatórios",
            "📦 Estoque: cadastro e controle de materiais, liberação para técnicos",
            "🔧 Técnico: kit pessoal, OS, checklists de frota e abastecimento",
            "🔩 Mecânico: ordens de serviço de manutenção e pneus",
            "💰 Financeiro: NFs, relatórios financeiros e aprovação de manutenção",
            "🔐 ROOT (stocktelmaster): único que pode deletar usuários e resetar o sistema",
          ]}/>
          <TipCard tip="Dica: Use o botão ⚙️ Meu Perfil no menu lateral para alterar sua senha e foto de perfil a qualquer momento."/>
        </>}

        {section==="estoque"&&<>
          <InfoCard icon="📦" title="Estoque Base" color={C.gold} items={[
            "Cadastre materiais com código, nome, categoria, unidade e quantidade mínima",
            "Alertas automáticos quando o estoque atinge o nível mínimo (🔴 CRÍTICO / 🟡 BAIXO)",
            "Categorias personalizáveis: Equipamentos, Cabos, Conectores, Acessórios, etc.",
            "Entrada via Nota Fiscal: registre o fornecedor, valor e itens recebidos",
          ]}/>
          <InfoCard icon="🎒" title="Estoque Técnico (Kit)" color={C.blue} items={[
            "Cada técnico tem seu kit individual de materiais",
            "Admin/Estoque libera materiais do estoque base para o kit do técnico",
            "Técnico registra OS com baixa automática dos materiais do seu kit",
            "Devoluções: técnico devolve materiais excedentes para o estoque base",
            "Relatório de kit por técnico disponível nos Relatórios",
          ]}/>
          <InfoCard icon="🔁" title="Fluxo de Materiais" color={C.grn} items={[
            "1️⃣ Entrada de NF → material entra no Estoque Base",
            "2️⃣ Saída/Liberação → do Estoque Base para o Kit do Técnico",
            "3️⃣ OS → técnico usa materiais do seu kit, baixa automática",
            "4️⃣ Devolução → material volta do kit para o Estoque Base",
            "5️⃣ Solicitação → técnico pede mais materiais pelo app",
          ]}/>
          <TipCard tip="Materiais Preventivos (óleos, correias, pastilhas) ficam em categoria especial no Estoque Base. O Mecânico pode solicitar diretamente."/>
        </>}

        {section==="os"&&<>
          <InfoCard icon="🔧" title="Ordens de Serviço" color={C.red} items={[
            "Registre OS com número, cliente, data e materiais utilizados",
            "Baixa automática dos materiais no kit do técnico ao salvar a OS",
            "Filtro por período e por técnico nos Relatórios",
            "Exportação PDF e Excel com listagem completa",
          ]}/>
          <InfoCard icon="↩️" title="Devoluções" color={C.ylw} items={[
            "Técnico solicita devolução de materiais excedentes",
            "Admin/Estoque aprova ou rejeita a devolução",
            "Material aprovado retorna automaticamente ao Estoque Base",
            "Histórico completo de todas as devoluções",
          ]}/>
          <InfoCard icon="📋" title="Solicitações" color={C.blue} items={[
            "Técnico solicita materiais diretamente pelo sistema",
            "Admin/Estoque recebe alerta de solicitação pendente",
            "Ao confirmar, o material é transferido do Estoque Base para o Kit",
            "Urgência: Normal, Alta ou Urgente",
          ]}/>
        </>}

        {section==="frota"&&<>
          <InfoCard icon="🚗" title="Gestão de Veículos" color={C.gold} items={[
            "Cadastre veículos com placa, modelo, ano, cor, técnico responsável",
            "Upload do documento do veículo (CRVL/licenciamento em PDF)",
            "4 fotos do veículo: Frente, Lado Esq, Lado Dir, Traseira",
            "Controle de vencimentos: IPVA, Licenciamento, Seguro — alertas automáticos",
            "Alerta de troca de óleo a cada 10.000 km",
          ]}/>
          <InfoCard icon="⛽" title="Abastecimento" color={C.grn} items={[
            "Registre combustível, litros, valor, KM e posto",
            "Cálculo automático do preço por litro",
            "Foto da nota fiscal diretamente pela câmera do celular",
            "Consumo médio por veículo (km/L) calculado automaticamente",
          ]}/>
          <InfoCard icon="📋" title="Checklist (Retirada/Devolução)" color={C.blue} items={[
            "Preencha ao retirar e ao devolver cada veículo",
            "Registre: KM, nível de combustível, estado dos 4 pneus",
            "Foto do odômetro e fotos de avarias",
            "Histórico completo disponível na aba Histórico",
          ]}/>
          <InfoCard icon="🔄" title="Controle de Pneus" color={C.ylw} items={[
            "Registre marca, DOT, data de troca, KM e posição",
            "5 posições: Dianteiro Esq/Dir, Traseiro Esq/Dir, Estepe",
            "Histórico de todos os pneus por veículo",
          ]}/>
        </>}

        {section==="relatorios"&&<>
          <InfoCard icon="📊" title="Relatórios Disponíveis" color={C.gold} items={[
            "📦 Estoque: listagem completa com situação (OK/Baixo/Crítico)",
            "🔧 OS: todas as ordens por período e técnico",
            "👷 Técnicos: ranking com materiais consumidos e devoluções",
            "↩️ Devoluções: histórico de todas as devoluções",
            "💰 NFs: notas fiscais com valor total no período",
          ]}/>
          <InfoCard icon="📈" title="Relatório Administrativo" color={C.blue} items={[
            "💰 Financeiro: gastos mensais com NFs e fornecedores",
            "🚗 Frota: gastos por veículo (combustível + manutenção)",
            "👷 Técnicos: ranking completo de performance",
            "⏱️ SLA: tempo médio de atendimento por técnico",
            "📈 Tendência: crescimento de OS e gastos mês a mês",
            "🔔 Alertas de Preço: detecta variações de preço entre NFs",
          ]}/>
          <InfoCard icon="🖨️" title="Exportação" color={C.grn} items={[
            "PDF profissional: abre em nova aba para imprimir ou salvar",
            "Excel: múltiplas abas organizadas por categoria",
            "Filtro de período: Hoje, Semana, Mês, Trimestre ou personalizado",
          ]}/>
        </>}

        {section==="usuarios"&&<>
          <InfoCard icon="👥" title="Gestão de Usuários (Admin)" color={C.gold} items={[
            "Crie usuários com login, senha, perfil e permissões personalizadas",
            "Defina quais módulos cada usuário pode acessar",
            "Foto de perfil e matrícula para identificação",
            "Opção de exigir troca de senha no primeiro acesso",
          ]}/>
          <InfoCard icon="🔐" title="Segurança" color={C.red} items={[
            "Apenas o usuário ROOT pode deletar usuários ou resetar o sistema",
            "Admin não pode alterar senha de outros usuários — cada um altera a própria em Meu Perfil",
            "Sessão persistente: não perde login ao fechar o navegador",
            "Dados sincronizados com Supabase (nuvem segura)",
          ]}/>
          <TipCard tip="O usuário ROOT (login: stocktelmaster) é oculto para todos e só você deve conhecer a senha. Guarde-a em local seguro!" color={C.red}/>
        </>}

        {section==="faq"&&<>
          {[
            {p:"Por que o sistema mostra tela preta?",r:"Pressione Ctrl+Shift+R para forçar o reload. Se persistir, limpe o cache do navegador."},
            {p:"Como recuperar senha de um usuário?",r:"O Admin edita o usuário e define nova senha. Cada usuário pode alterar a própria em ⚙️ Meu Perfil."},
            {p:"Os dados são salvos onde?",r:"No Supabase (PostgreSQL na nuvem) + localStorage como backup offline. Os dados ficam salvos mesmo sem internet."},
            {p:"Como liberar material para técnico?",r:"Estoque Base → Saída/Liberação → selecione técnico e materiais → confirmar."},
            {p:"Como registrar que um técnico fez uma OS?",r:"Menu Ordens de Serviço → Nova OS → preencha os dados e materiais usados. A baixa do kit é automática."},
            {p:"O técnico não vê o menu Estoque Base. Por quê?",r:"O perfil Técnico tem acesso apenas ao Kit (estoque pessoal), OS, Solicitações e Frota. O Admin controla as permissões."},
            {p:"Como cadastrar um veículo novo?",r:"Frota → aba Veículos → + Veículo. Preencha os dados e faça upload das fotos e documento PDF."},
            {p:"Como o sistema avisa sobre troca de óleo?",r:"Automaticamente quando faltam 2.000 km (🟡 alerta) ou 500 km (🔴 urgente) para completar 10.000 km."},
          ].map((f,i)=>(
            <Card key={i} style={{padding:14}}>
              <div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:6}}>❓ {f.p}</div>
              <div style={{fontSize:12,color:C.txt2,lineHeight:1.6}}>↳ {f.r}</div>
            </Card>
          ))}
        </>}

        {section==="atalhos"&&<>
          <Card style={{padding:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>⌨️ Atalhos e Dicas de Uso</div>
            {[
              ["Ctrl+Shift+R","Forçar reload / limpar cache","teclado"],
              ["F12","Abrir DevTools para ver erros","teclado"],
              ["Ctrl+P (na tela PDF)","Imprimir ou salvar como PDF","teclado"],
              ["Swipe ← →","Navegar entre abas no mobile","mobile"],
              ["Segurar botão Home","Instalar como app no celular","mobile"],
              ["Câmera no upload de foto","Use 'capture' para foto direta","mobile"],
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
            <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>📞 Suporte</div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.8}}>
              <div>📧 Sistema desenvolvido com React + Vite + Supabase + Vercel</div>
              <div>🚀 Deploy automático via GitHub → Vercel</div>
              <div>💾 Banco de dados: Supabase (PostgreSQL)</div>
              <div style={{marginTop:10,padding:"10px 14px",background:C.surf,borderRadius:8,color:C.txt2,fontSize:11}}>
                Para suporte técnico, acesse o repositório ou entre em contato com o desenvolvedor.
              </div>
            </div>
          </Card>
        </>}

      </div>
    </div>
  </div>;
}


/* ── PONTO ELETRÔNICO ── */
function PontoPage({pontos,setPontos,pontoConfig,setPontoConfig,pontoSolicits,setPontoSolicits,pontoFechamentos=[],setPontoFechamentos,escalas=[],setEscalas,folgas=[],setFolgas,users,currentUser,addLog,isMobile,showToast}){
  const isAdm=["admin","superadmin"].includes(currentUser.role);
  const isFinanceiro=currentUser.role==="financeiro";
  const canViewFechamento=isAdm||isFinanceiro;
  const actionPerms=currentUser.actionPerms||DEFAULT_ACTION_PERMS[currentUser.role]||[];
  const canExportar=actionPerms.includes("exportar")||isAdm;
  const canAprovarPonto=actionPerms.includes("aprovar_ponto")||isAdm;
  const canReabrirPonto=actionPerms.includes("reabrir_ponto")||isAdm;
  const canEditarPonto=actionPerms.includes("editar_ponto")||isAdm;
  const hoje=new Date().toISOString().slice(0,10);

  // ── Haversine ──
  const haversine=(lat1,lng1,lat2,lng2)=>{
    const R=6371000,toRad=d=>d*Math.PI/180;
    const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  // ── Estado local ──
  const[geoLoading,setGeoLoading]=useState(false);
  const[geoErro,setGeoErro]=useState("");
  const[tab,setTab]=useState(isAdm?"admin":isFinanceiro?"fechamento":"meu");
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
  const[modalConfig,setModalConfig]=useState(false);
  const[formConfig,setFormConfig]=useState({...pontoConfig});
  const[filtroUser,setFiltroUser]=useState("");
  const[filtroDt,setFiltroDt]=useState(hoje);
  const[modalEdit,setModalEdit]=useState(null);
  const[fechamentoMes,setFechamentoMes]=useState(new Date().toISOString().slice(0,7));
  const[fechamentoUser,setFechamentoUser]=useState("");

  // ── Helpers ──
  const TIPOS={
    entrada:   {l:"Entrada",      icon:"🟢",geo:true,  cor:C.grn},
    saida_almoco:{l:"Saída Almoço",icon:"🟡",geo:false, cor:C.ylw},
    volta_almoco:{l:"Volta Almoço",icon:"🔵",geo:false, cor:C.blue},
    saida:     {l:"Saída",        icon:"🔴",geo:true,  cor:C.red},
  };
  const SEQUENCIA=["entrada","saida_almoco","volta_almoco","saida"];

  const pontosHoje=(uid)=>pontos.filter(p=>p.funcionarioId===uid&&p.dt.startsWith(hoje));
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
  const minHora=(hhmm)=>{
    if(!hhmm||!String(hhmm).includes(":"))return 0;
    const [h,m]=String(hhmm).split(":").map(Number);
    return (h||0)*60+(m||0);
  };
  const minFmt=(mins)=>{
    const sign=mins<0?"-":"";
    const abs=Math.abs(Math.round(mins||0));
    return `${sign}${Math.floor(abs/60)}h${String(abs%60).padStart(2,"0")}m`;
  };
  const dataLocal=(ds)=>new Date(`${ds}T12:00:00`);
  const diasCurto=["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];
  const normDia=(v)=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").slice(0,3);
  const escalaDo=(uid)=>escalas.find(e=>e.userId===uid)||null;
  const folgaNoDia=(uid,ds)=>folgas.find(f=>(f.userId===uid||f.todos)&&f.data===ds)||null;
  const previstoNoDia=(uid,ds)=>{
    const e=escalaDo(uid);
    if(!e)return 0;
    const d=dataLocal(ds);
    const dia=diasCurto[d.getDay()];
    const trabalha=(e.diasSemana||[]).map(normDia).includes(dia);
    if(!trabalha||folgaNoDia(uid,ds))return 0;
    const bruto=minHora(e.saida)-minHora(e.entrada);
    const almoco=e.almEntrada&&e.almSaida?Math.max(0,minHora(e.almSaida)-minHora(e.almEntrada)):0;
    return Math.max(0,bruto-almoco);
  };
  const realizadoNoDia=(uid,ds)=>{
    const regs=pontos.filter(p=>p.funcionarioId===uid&&String(p.dt||"").startsWith(ds)).sort((a,b)=>new Date(a.dt)-new Date(b.dt));
    const ent=regs.find(p=>p.tipo==="entrada");
    const sai=[...regs].reverse().find(p=>p.tipo==="saida");
    const almS=regs.find(p=>p.tipo==="saida_almoco");
    const almV=regs.find(p=>p.tipo==="volta_almoco");
    if(!ent||!sai)return {mins:0,regs,ent,sai,almS,almV};
    const bruto=(new Date(sai.dt)-new Date(ent.dt))/60000;
    const almoco=almS&&almV?Math.max(0,(new Date(almV.dt)-new Date(almS.dt))/60000):0;
    return {mins:Math.max(0,bruto-almoco),regs,ent,sai,almS,almV};
  };
  const fechamentoUsuarios=()=>users.filter(u=>["tecnico","mecanico","estoque","admin","superadmin","financeiro"].includes(u.role));
  const montarFechamento=()=>{
    const [ano,mes]=fechamentoMes.split("-").map(Number);
    const dias=new Date(ano,mes,0).getDate();
    const selecionados=fechamentoUsuarios().filter(u=>fechamentoUser?u.id===fechamentoUser:true);
    return selecionados.map(u=>{
      const linhas=Array.from({length:dias},(_,i)=>{
        const ds=`${ano}-${String(mes).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
        const d=dataLocal(ds);
        const real=realizadoNoDia(u.id,ds);
        const previsto=previstoNoDia(u.id,ds);
        const folga=folgaNoDia(u.id,ds);
        const manuais=real.regs.filter(p=>p.aprovadoPor||p.localValido===false);
        const foraGeo=real.regs.filter(p=>p.localValido===false);
        const incompleto=real.regs.length>0&&(!real.ent||!real.sai);
        const ausencia=previsto>0&&real.regs.length===0&&!folga;
        const status=folga?folga.tipoFolga:ausencia?"ausente":incompleto?"incompleto":foraGeo.length?"manual/geo":real.mins>0?"ok":previsto>0?"pendente":"sem escala";
        return {ds,dia:d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"}),previsto,realizado:real.mins,diff:real.mins-previsto,folga,regs:real.regs,ent:real.ent,sai:real.sai,almS:real.almS,almV:real.almV,manuais,foraGeo,incompleto,ausencia,status};
      });
      const relevantes=linhas.filter(l=>l.previsto>0||l.realizado>0||l.folga||l.regs.length);
      return {
        user:u,
        linhas:relevantes,
        previsto:linhas.reduce((a,l)=>a+l.previsto,0),
        realizado:linhas.reduce((a,l)=>a+l.realizado,0),
        manuais:linhas.reduce((a,l)=>a+l.manuais.length,0),
        ausencias:linhas.filter(l=>l.ausencia).length,
        incompletos:linhas.filter(l=>l.incompleto).length,
        folgas:linhas.filter(l=>l.folga).length,
      };
    });
  };
  const fechamentoAtual=pontoFechamentos.find(f=>f.mes===fechamentoMes&&(fechamentoUser?f.userId===fechamentoUser:!f.userId));
  const mesTravado=(uid,iso)=>{
    const mes=String(iso||new Date().toISOString()).slice(0,7);
    return pontoFechamentos.some(f=>f.mes===mes&&(!f.userId||f.userId===uid)&&["fechado","aprovado"].includes(f.status));
  };
  const salvarFechamento=(status)=>{
    const dados=montarFechamento();
    if(!dados.length){showToast("Nenhum funcionario para fechar.","warning");return;}
    const idAtual=fechamentoAtual?.id||uid();
    const base={
      id:idAtual,
      mes:fechamentoMes,
      userId:fechamentoUser||"",
      status,
      funcionarios:dados.length,
      previsto:dados.reduce((a,d)=>a+d.previsto,0),
      realizado:dados.reduce((a,d)=>a+d.realizado,0),
      alertas:dados.reduce((a,d)=>a+d.ausencias+d.incompletos+d.manuais,0),
      fechadoPor:fechamentoAtual?.fechadoPor||currentUser.name,
      fechadoEm:fechamentoAtual?.fechadoEm||new Date().toISOString(),
      aprovadoPor:status==="aprovado"?currentUser.name:fechamentoAtual?.aprovadoPor,
      aprovadoEm:status==="aprovado"?new Date().toISOString():fechamentoAtual?.aprovadoEm,
    };
    setPontoFechamentos(prev=>[base,...prev.filter(f=>f.id!==idAtual)]);
    addLog(currentUser.name,status==="aprovado"?"Ponto Fechamento Aprovado":"Ponto Fechamento",`${fechamentoMes} · ${fechamentoUser||"todos"} · ${dados.length} funcionario(s)`);
    showToast(status==="aprovado"?"Fechamento aprovado e travado.":"Fechamento salvo e travado.","success");
  };
  const exportarExcelPonto=()=>{
    const dados=montarFechamento();
    if(!dados.length){showToast("Nenhum dado para exportar.","warning");return;}
    const linhas=dados.flatMap(d=>d.linhas.map(l=>({
      Funcionario:d.user.name,
      Perfil:d.user.role,
      Mes:fechamentoMes,
      Dia:l.dia,
      Entrada:l.ent?fmtHora(l.ent.dt):"",
      SaidaAlmoco:l.almS?fmtHora(l.almS.dt):"",
      VoltaAlmoco:l.almV?fmtHora(l.almV.dt):"",
      Saida:l.sai?fmtHora(l.sai.dt):"",
      Previsto:minFmt(l.previsto),
      Realizado:minFmt(l.realizado),
      Saldo:minFmt(l.diff),
      Status:l.status,
    })));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(linhas),"Fechamento");
    XLSX.writeFile(wb,`stocktel-fechamento-ponto-${fechamentoMes}${fechamentoUser?`-${fechamentoUser}`:""}.xlsx`);
    addLog(currentUser.name,"Fechamento Ponto",`Excel ${fechamentoMes} - ${dados.length} funcionario(s)`);
  };
  const escPdf=(v)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const gerarPDFPonto=()=>{
    const dados=montarFechamento();
    if(!dados.length){showToast("Nenhum funcionario para o fechamento.","warning");return;}
    const periodo=new Date(`${fechamentoMes}-01T12:00:00`).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
    const resumo=dados.map(d=>`
      <tr>
        <td>${escPdf(d.user.name)}</td><td>${escPdf(d.user.role)}</td><td>${minFmt(d.previsto)}</td><td>${minFmt(d.realizado)}</td>
        <td>${minFmt(d.realizado-d.previsto)}</td><td>${d.ausencias}</td><td>${d.incompletos}</td><td>${d.manuais}</td><td>${d.folgas}</td>
      </tr>`).join("");
    const detalhes=dados.map(d=>`
      <section class="func">
        <h2>${escPdf(d.user.name)} <small>${escPdf(d.user.role)}</small></h2>
        <table>
          <thead><tr><th>Dia</th><th>Entrada</th><th>Almoco</th><th>Retorno</th><th>Saida</th><th>Previsto</th><th>Realizado</th><th>Saldo</th><th>Status</th></tr></thead>
          <tbody>${(d.linhas.length?d.linhas:[{dia:"Sem movimentos",previsto:0,realizado:0,diff:0,status:"sem registros"}]).map(l=>`
            <tr>
              <td>${escPdf(l.dia)}</td><td>${l.ent?fmtHora(l.ent.dt):"--:--"}</td><td>${l.almS?fmtHora(l.almS.dt):"--:--"}</td><td>${l.almV?fmtHora(l.almV.dt):"--:--"}</td><td>${l.sai?fmtHora(l.sai.dt):"--:--"}</td>
              <td>${minFmt(l.previsto)}</td><td>${minFmt(l.realizado)}</td><td>${minFmt(l.diff)}</td><td>${escPdf(l.status)}</td>
            </tr>`).join("")}</tbody>
        </table>
      </section>`).join("");
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>StockTel - Fechamento de Ponto</title><style>
      @page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;color:#202124;margin:0;background:#fff}header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #d10000;padding-bottom:14px;margin-bottom:18px}.brand{display:flex;align-items:center;gap:12px}.brand img{width:58px;height:58px;object-fit:contain}h1{font-size:22px;margin:0;color:#111}h2{font-size:15px;margin:22px 0 8px;color:#d10000}small{color:#666;font-size:11px}.meta{text-align:right;font-size:11px;color:#555;line-height:1.5}.box{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.kpi{border:1px solid #ddd;border-radius:8px;padding:10px}.kpi b{display:block;font-size:16px;color:#111}.kpi span{font-size:10px;color:#666;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:6px 7px;font-size:10px;text-align:left}th{background:#f3f3f3;color:#333;text-transform:uppercase;font-size:9px}.func{page-break-inside:avoid}.sign{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:38px}.line{border-top:1px solid #333;text-align:center;padding-top:6px;font-size:11px;color:#555}.print{position:fixed;right:16px;top:16px;background:#d10000;color:#fff;border:0;border-radius:6px;padding:9px 14px;font-weight:700}@media print{.print{display:none}}
    </style></head><body><button class="print" onclick="window.print()">Imprimir / Salvar PDF</button><header><div class="brand"><img src="/logo-stocktel.png"><div><h1>Fechamento Mensal de Ponto</h1><small>StockTel - ${escPdf(periodo)}</small></div></div><div class="meta">Gerado em ${new Date().toLocaleString("pt-BR")}<br>Responsavel: ${escPdf(currentUser.name)}<br>Origem: StockTel Web</div></header>
    <div class="box"><div class="kpi"><b>${dados.length}</b><span>Funcionarios</span></div><div class="kpi"><b>${minFmt(dados.reduce((a,d)=>a+d.previsto,0))}</b><span>Previsto</span></div><div class="kpi"><b>${minFmt(dados.reduce((a,d)=>a+d.realizado,0))}</b><span>Realizado</span></div><div class="kpi"><b>${dados.reduce((a,d)=>a+d.ausencias+d.incompletos+d.manuais,0)}</b><span>Alertas</span></div></div>
    <h2>Resumo para o financeiro</h2><table><thead><tr><th>Funcionario</th><th>Perfil</th><th>Previsto</th><th>Realizado</th><th>Saldo</th><th>Aus.</th><th>Inc.</th><th>Manuais</th><th>Folgas</th></tr></thead><tbody>${resumo}</tbody></table>
    <h2>Detalhamento por funcionario</h2>${detalhes}<div class="sign"><div class="line">Responsavel pelo fechamento</div><div class="line">Financeiro</div></div></body></html>`;
    const w=window.open("","_blank");
    if(!w){showToast("O navegador bloqueou a janela do PDF. Libere pop-ups.","warning");return;}
    w.document.write(html);w.document.close();w.focus();
    addLog(currentUser.name,"Fechamento Ponto",`PDF ${periodo} - ${dados.length} funcionario(s)`);
  };

  // ── Bater ponto (com geo quando necessário) ──
  const baterPonto=(tipo)=>{
    if(mesTravado(currentUser.id,new Date().toISOString())){showToast("Este mês já foi fechado. Solicite reabertura ao administrador.","warning");return;}
    const cfg=pontoConfig;
    const precisaGeo=TIPOS[tipo].geo;
    if(!precisaGeo){
      // Salva sem geo
      const reg={id:uid(),funcionarioId:currentUser.id,funcionarioNome:currentUser.name,tipo,dt:new Date().toISOString(),lat:null,lng:null,distancia:null,localValido:true,aprovado:true};
      setPontos(p=>[...p,reg]);
      addLog(currentUser.name,"Ponto",`${TIPOS[tipo].l} registrada`);
      showToast(`${TIPOS[tipo].icon} ${TIPOS[tipo].l} registrada!`,"success");
      return;
    }
    // Precisa de geo
    if(!cfg.lat||!cfg.lng){
      showToast("Geolocalização da empresa não configurada. Contate o administrador.","error");
      return;
    }
    if(!navigator.geolocation){
      showToast("Navegador não suporta geolocalização.","error");
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
          const reg={id:uid(),funcionarioId:currentUser.id,funcionarioNome:currentUser.name,tipo,dt:new Date().toISOString(),lat:ulat,lng:ulng,distancia:Math.round(dist),localValido:true,aprovado:true,accuracy:Math.round(accuracy)};
          setPontos(p=>[...p,reg]);
          addLog(currentUser.name,"Ponto",`${TIPOS[tipo].l} — ${Math.round(dist)}m da empresa`);
          showToast(`${TIPOS[tipo].icon} ${TIPOS[tipo].l} registrada! (${Math.round(dist)}m da empresa)`,"success");
        } else {
          setGeoErro(`Você está a ${Math.round(dist)}m da empresa. Limite: ${cfg.raio}m. Solicite aprovação manual.`);
          setTipoSolicit(tipo);
          showToast(`Fora do raio permitido (${Math.round(dist)}m). Solicite aprovação.`,"warning");
        }
      },
      (err)=>{
        setGeoLoading(false);
        const msgs={1:"Permissão de localização negada.",2:"Posição indisponível.",3:"Tempo esgotado."};
        const msg=msgs[err.code]||"Erro de geolocalização.";
        setGeoErro(msg+" Solicite aprovação manual se necessário.");
        setTipoSolicit(tipo);
        showToast(msg,"error");
      },
      {enableHighAccuracy:true,timeout:10000,maximumAge:0}
    );
  };

  const enviarSolicit=()=>{
    if(!motivoSolicit.trim()){showToast("Descreva o motivo.","warning");return;}
    const sol={id:uid(),funcionarioId:currentUser.id,funcionarioNome:currentUser.name,tipo:tipoSolicit,dt:new Date().toISOString(),motivo:motivoSolicit.trim(),status:"pendente",adminNotif:true};
    setPontoSolicits(p=>[...p,sol]);
    addLog(currentUser.name,"Ponto Solicitação",`${TIPOS[tipoSolicit]?.l||tipoSolicit} — ${motivoSolicit.slice(0,40)}`);
    showToast("Solicitação enviada! O administrador será notificado.","success");
    setModalSolicit(false);setMotivoSolicit("");setTipoSolicit("");setGeoErro("");
  };

  const aprovarSolicit=(sol,aprovar)=>{
    if(aprovar&&mesTravado(sol.funcionarioId,sol.dt)){showToast("Não é possível aprovar ponto em mês fechado.","warning");return;}
    // Aprova: cria registro de ponto; rejeita: apenas atualiza status
    if(aprovar){
      const reg={id:uid(),funcionarioId:sol.funcionarioId,funcionarioNome:sol.funcionarioNome,tipo:sol.tipo,dt:sol.dt,lat:null,lng:null,distancia:null,localValido:false,aprovado:true,aprovadoPor:currentUser.name,solicitacaoId:sol.id};
      setPontos(p=>[...p,reg]);
    }
    setPontoSolicits(p=>p.map(s=>s.id===sol.id?{...s,status:aprovar?"aprovado":"rejeitado",resolvidoPor:currentUser.name,resolvidoEm:new Date().toISOString()}:s));
    addLog(currentUser.name,"Ponto Admin",`Solicitação ${aprovar?"aprovada":"rejeitada"}: ${sol.funcionarioNome} — ${TIPOS[sol.tipo]?.l}`);
    showToast(`Solicitação ${aprovar?"aprovada":"rejeitada"}!`,aprovar?"success":"warning");
  };

  const salvarConfig=()=>{
    if(!formConfig.lat||!formConfig.lng){showToast("Informe latitude e longitude.","warning");return;}
    setPontoConfig({...formConfig});
    setModalConfig(false);
    showToast("Configuração salva!","success");
    addLog(currentUser.name,"Ponto Config",`Raio: ${formConfig.raio}m | Empresa: ${formConfig.nome}`);
  };

  const getMinhaLocalizacao=()=>{
    if(!navigator.geolocation){showToast("Navegador não suporta geo.","error");return;}
    navigator.geolocation.getCurrentPosition(
      pos=>{ setFormConfig(f=>({...f,lat:pos.coords.latitude.toFixed(7),lng:pos.coords.longitude.toFixed(7)})); showToast("Localização obtida!","success"); },
      ()=>showToast("Não foi possível obter localização.","error"),
      {enableHighAccuracy:true,timeout:8000}
    );
  };

  // Pendentes para notif
  const solicsPendentes=pontoSolicits.filter(s=>s.status==="pendente");
  const meuProximo=proximoTipo(currentUser.id);
  const meusPontosHoje=pontosHoje(currentUser.id);

  // Usuários com acesso ao ponto
  const usersComPonto=users.filter(u=>["tecnico","mecanico","estoque","admin","superadmin","financeiro"].includes(u.role));

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>🕐 Ponto Eletrônico</h1>
        <p style={{fontSize:12,color:C.muted}}>
          {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}
        </p>
      </div>
      {isAdm&&<div style={{display:"flex",gap:8}}>
        {solicsPendentes.length>0&&<div style={{background:C.redD,border:`1px solid ${C.red}55`,borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,color:C.red}}>
          🔔 {solicsPendentes.length} solicit.
        </div>}
        <Btn size="sm" color="ghost" outline onClick={()=>{setFormConfig({...pontoConfig});setModalConfig(true);}}>⚙️ Configurar</Btn>
      </div>}
    </div>

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`,gap:0}}>
      {[
        ...(!isFinanceiro?[{k:"meu",l:"Meu Ponto"}]:[]),
        {k:"escala",l:"📅 Escala & Folgas"},
        ...(canViewFechamento?[{k:"fechamento",l:"Fechamento"}]:[]),
        ...(isAdm?[{k:"admin",l:`📋 Gestão${solicsPendentes.length>0?` (${solicsPendentes.length})`:""}`,},{k:"config_view",l:"📊 Resumo Equipe"}]:[]),
      ].map(t=>(
        <div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>
      ))}
    </div>

    {/* ── MEU PONTO ── */}
    {tab==="meu"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>

      {/* Relógio */}
      <Card style={{padding:20,textAlign:"center",background:"linear-gradient(135deg,#161616,#1a1a1a)"}}>
        <RelogioAtual/>
        <div style={{fontSize:12,color:C.muted,marginTop:6}}>
          {meuProximo?`Próximo: ${TIPOS[meuProximo]?.l}`:meusPontosHoje.find(p=>p.tipo==="saida")?"✅ Jornada encerrada":"Sem pontos hoje"}
        </div>
        {meusPontosHoje.length>0&&calcHoras(currentUser.id)&&(
          <div style={{marginTop:8,display:"inline-block",background:`${C.grn}22`,border:`1px solid ${C.grn}44`,borderRadius:8,padding:"4px 14px",fontSize:13,fontWeight:700,color:C.grn}}>
            ⏱ Trabalhadas: {calcHoras(currentUser.id)}
          </div>
        )}
      </Card>

      {/* Botões de ponto */}
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
            {ehProximo&&!jaBateu&&geoLoading&&<div style={{fontSize:10,color:C.ylw}}>📡 Buscando localização...</div>}
          </div>;
        })}
      </div>

      {/* Erro geo + solicitar */}
      {geoErro&&<Card style={{padding:14,border:`1px solid ${C.red}55`,background:C.redD}}>
        <div style={{fontSize:13,color:C.red,fontWeight:600,marginBottom:10}}>⚠️ {geoErro}</div>
        <Btn color="gold" onClick={()=>{setModalSolicit(true);}}>📝 Solicitar Aprovação Manual</Btn>
      </Card>}

      {/* Histórico do dia */}
      {meusPontosHoje.length>0&&<Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",background:C.surf,borderBottom:`1px solid ${C.bdr}`,fontSize:12,fontWeight:700,color:C.gold}}>📋 Registros de Hoje</div>
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
              {p.localValido?<Bdg color="grn">✅ Válido</Bdg>:<Bdg color="ylw">⚠️ Manual</Bdg>}
              {p.distancia!==null&&<span style={{fontSize:11,color:C.muted}}>{p.distancia}m</span>}
              {p.aprovadoPor&&<span style={{fontSize:10,color:C.muted}}>por {p.aprovadoPor}</span>}
            </div>
          </div>
        ))}
      </Card>}

      {/* Histórico semana */}
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>📅 Histórico da Semana</div>
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
                {ent?<span style={{color:C.grn}}>▶ {fmtHora(ent.dt)}</span>:<span>▶ --:--</span>}
                {sai?<span style={{color:C.red}}>■ {fmtHora(sai.dt)}</span>:<span>■ --:--</span>}
                {ent&&sai&&<span style={{color:C.grn,fontWeight:700}}>⏱{calcHoras(currentUser.id)||"?"}</span>}
                {dp.length===0&&<span style={{color:C.muted}}>Sem registros</span>}
              </div>
            </div>;
          });
        })()}
      </Card>
    </div>}

    {/* ── GESTÃO ADMIN ── */}
    {tab==="admin"&&isAdm&&<div style={{display:"flex",flexDirection:"column",gap:12}}>

      {/* Solicitações pendentes */}
      {solicsPendentes.length>0&&<div>
        <div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:8}}>🔔 Solicitações Pendentes ({solicsPendentes.length})</div>
        {solicsPendentes.map(s=>(
          <Card key={s.id} style={{padding:14,marginBottom:8,border:`1px solid ${C.red}44`,background:C.redD}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
                  <span style={{fontWeight:700,color:C.txt}}>{s.funcionarioNome}</span>
                  <Bdg color="red">{TIPOS[s.tipo]?.l}</Bdg>
                  <span style={{fontSize:11,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{new Date(s.dt).toLocaleString("pt-BR")}</span>
                </div>
                <div style={{fontSize:12,color:C.txt2,background:C.surf,borderRadius:6,padding:"6px 10px"}}>📝 {s.motivo}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
                <Btn size="xs" color="grn" onClick={()=>aprovarSolicit(s,true)}>✅ Aprovar</Btn>
                <Btn size="xs" color="red" outline onClick={()=>aprovarSolicit(s,false)}>✕ Rejeitar</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>}

      {/* Filtros */}
      <Card style={{padding:14}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
          <Sel label="Funcionário" value={filtroUser} onChange={setFiltroUser}
            options={[{value:"",label:"— Todos —"},...usersComPonto.map(u=>({value:u.id,label:`${u.name} (${u.role})`}))]}/>
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
              <THead cols={["Funcionário","Tipo","Horário","Local","Dist.","Status",""]}/>
              <tbody>
                {filtered.map(p=>(
                  <TRow key={p.id} cells={[
                    <span style={{fontWeight:600,color:C.txt,fontSize:12}}>{p.funcionarioNome}</span>,
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span>{TIPOS[p.tipo]?.icon}</span>
                      <span style={{fontSize:12,color:TIPOS[p.tipo]?.cor}}>{TIPOS[p.tipo]?.l}</span>
                    </div>,
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.txt}}>{fmtHora(p.dt)}</span>,
                    p.lat?<span style={{fontSize:10,color:C.muted}}>{parseFloat(p.lat).toFixed(4)},{parseFloat(p.lng).toFixed(4)}</span>:<span style={{color:C.muted,fontSize:11}}>—</span>,
                    p.distancia!==null?<span style={{fontSize:12,color:p.distancia<=parseInt(pontoConfig.raio)?C.grn:C.red}}>{p.distancia}m</span>:<span style={{color:C.muted}}>—</span>,
                    p.localValido?<Bdg color="grn">✅ Geo</Bdg>:p.aprovado?<Bdg color="ylw">👤 Manual</Bdg>:<Bdg color="red">❌</Bdg>,
                    canEditarPonto?<button onClick={()=>setModalEdit(p)} style={{background:"transparent",border:"none",cursor:"pointer",color:C.muted,fontSize:14}}>✏️</button>:null,
                  ]}/>
                ))}
              </tbody>
            </table>
          </div>
        </Card>;
      })()}

      {/* Histórico de solicitações */}
      {pontoSolicits.filter(s=>s.status!=="pendente").length>0&&<>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginTop:4}}>📋 Histórico de Solicitações</div>
        {pontoSolicits.filter(s=>s.status!=="pendente").slice(0,10).map(s=>(
          <Card key={s.id} style={{padding:12,marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div>
                <span style={{fontWeight:600,color:C.txt,fontSize:12}}>{s.funcionarioNome}</span>
                <span style={{color:C.muted,fontSize:11,marginLeft:8}}>{TIPOS[s.tipo]?.l} · {new Date(s.dt).toLocaleDateString("pt-BR")}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <Bdg color={s.status==="aprovado"?"grn":"red"}>{s.status==="aprovado"?"✅ Aprovado":"❌ Rejeitado"}</Bdg>
                {s.resolvidoPor&&<span style={{fontSize:10,color:C.muted}}>por {s.resolvidoPor}</span>}
              </div>
            </div>
            <div style={{fontSize:11,color:C.muted,marginTop:4}}>📝 {s.motivo}</div>
          </Card>
        ))}
      </>}
    </div>}

    {/* ── RESUMO EQUIPE ── */}
    {tab==="config_view"&&isAdm&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:13,fontWeight:700,color:C.txt}}>📊 Resumo de Hoje — {new Date().toLocaleDateString("pt-BR")}</div>
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
                <span style={{color:ent?C.grn:C.muted}}>▶ {ent?fmtHora(ent.dt):"--:--"}</span>
                <span style={{color:almS?C.ylw:C.muted}}>☀ {almS?fmtHora(almS.dt):"--:--"}</span>
                <span style={{color:almV?C.blue:C.muted}}>↩ {almV?fmtHora(almV.dt):"--:--"}</span>
                <span style={{color:sai?C.red:C.muted}}>■ {sai?fmtHora(sai.dt):"--:--"}</span>
              </div>
              {hTrab&&<Bdg color="grn">⏱ {hTrab}</Bdg>}
              {!ent&&<Bdg color="red">Ausente</Bdg>}
              {ent&&!sai&&<Bdg color="ylw">Em jornada</Bdg>}
              {ent&&sai&&<Bdg color="grn">Encerrado</Bdg>}
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {tab==="fechamento"&&canViewFechamento&&(()=>{
      const dados=montarFechamento();
      const totais=dados.reduce((acc,d)=>({
        previsto:acc.previsto+d.previsto,
        realizado:acc.realizado+d.realizado,
        ausencias:acc.ausencias+d.ausencias,
        alertas:acc.alertas+d.ausencias+d.incompletos+d.manuais,
      }),{previsto:0,realizado:0,ausencias:0,alertas:0});
      return <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Card style={{padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"180px minmax(220px,1fr)",gap:10,flex:1}}>
              <Inp label="Mes de fechamento" value={fechamentoMes} onChange={setFechamentoMes} type="month"/>
              <Sel label="Funcionario" value={fechamentoUser} onChange={setFechamentoUser}
                options={[{value:"",label:"Todos os funcionarios"},...fechamentoUsuarios().map(u=>({value:u.id,label:`${u.name} (${u.role})`}))]}/>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {canExportar&&<Btn color="ghost" outline onClick={exportarExcelPonto}>Excel</Btn>}
              <Btn color="red" onClick={gerarPDFPonto}>Gerar PDF</Btn>
              {canAprovarPonto&&<Btn color="gold" outline onClick={()=>salvarFechamento("fechado")}>Fechar mes</Btn>}
              {canAprovarPonto&&<Btn color="grn" onClick={()=>salvarFechamento("aprovado")}>Aprovar</Btn>}
            </div>
          </div>
        </Card>
        {fechamentoAtual&&<Card style={{padding:12,border:`1px solid ${fechamentoAtual.status==="aprovado"?C.grn:C.gold}55`,background:fechamentoAtual.status==="aprovado"?`${C.grn}12`:`${C.gold}12`}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:fechamentoAtual.status==="aprovado"?C.grn:C.gold}}>
                {fechamentoAtual.status==="aprovado"?"Fechamento aprovado":"Fechamento fechado"}
              </div>
              <div style={{fontSize:11,color:C.muted}}>Fechado por {fechamentoAtual.fechadoPor} em {new Date(fechamentoAtual.fechadoEm).toLocaleString("pt-BR")}{fechamentoAtual.aprovadoPor?` · aprovado por ${fechamentoAtual.aprovadoPor}`:""}</div>
            </div>
            {canReabrirPonto&&<Btn size="xs" color="red" outline onClick={()=>{setPontoFechamentos(prev=>prev.filter(f=>f.id!==fechamentoAtual.id));addLog(currentUser.name,"Ponto Reabertura",`${fechamentoMes} · ${fechamentoUser||"todos"}`);showToast("Fechamento reaberto.","warning");}}>Reabrir</Btn>}
          </div>
        </Card>}

        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
          <Card style={{padding:14}}><div style={{fontSize:10,color:C.muted,textTransform:"uppercase",fontWeight:700}}>Funcionarios</div><div style={{fontSize:22,fontWeight:800,color:C.txt}}>{dados.length}</div></Card>
          <Card style={{padding:14}}><div style={{fontSize:10,color:C.muted,textTransform:"uppercase",fontWeight:700}}>Previsto</div><div style={{fontSize:22,fontWeight:800,color:C.gold}}>{minFmt(totais.previsto)}</div></Card>
          <Card style={{padding:14}}><div style={{fontSize:10,color:C.muted,textTransform:"uppercase",fontWeight:700}}>Realizado</div><div style={{fontSize:22,fontWeight:800,color:C.grn}}>{minFmt(totais.realizado)}</div></Card>
          <Card style={{padding:14}}><div style={{fontSize:10,color:C.muted,textTransform:"uppercase",fontWeight:700}}>Alertas</div><div style={{fontSize:22,fontWeight:800,color:totais.alertas?C.red:C.grn}}>{totais.alertas}</div></Card>
        </div>

        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"10px 16px",background:C.surf,borderBottom:`1px solid ${C.bdr}`,fontSize:12,fontWeight:700,color:C.gold}}>Resumo mensal para financeiro</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
              <THead cols={["Funcionario","Previsto","Realizado","Saldo","Ausencias","Incompletos","Manuais","Folgas"]}/>
              <tbody>
                {dados.map(d=><TRow key={d.user.id} cells={[
                  <span style={{fontWeight:700,color:C.txt,fontSize:12}}>{d.user.name}<span style={{fontWeight:400,color:C.muted}}> ({d.user.role})</span></span>,
                  <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.gold}}>{minFmt(d.previsto)}</span>,
                  <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.grn}}>{minFmt(d.realizado)}</span>,
                  <span style={{fontFamily:"'JetBrains Mono',monospace",color:d.realizado-d.previsto<0?C.red:C.grn}}>{minFmt(d.realizado-d.previsto)}</span>,
                  d.ausencias? <Bdg color="red">{d.ausencias}</Bdg>:<span style={{color:C.muted}}>0</span>,
                  d.incompletos? <Bdg color="ylw">{d.incompletos}</Bdg>:<span style={{color:C.muted}}>0</span>,
                  d.manuais? <Bdg color="ylw">{d.manuais}</Bdg>:<span style={{color:C.muted}}>0</span>,
                  d.folgas? <Bdg color="blue">{d.folgas}</Bdg>:<span style={{color:C.muted}}>0</span>,
                ]}/>)}
              </tbody>
            </table>
          </div>
        </Card>
      </div>;
    })()}

    {/* ── ABA ESCALA & FOLGAS ── */}
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


    {/* ── MODAL SOLICITAR APROVAÇÃO ── */}
    {modalSolicit&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:480,maxHeight:"80vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>📝 Solicitar Aprovação Manual</h2>
            <p style={{fontSize:11,color:C.muted,marginTop:2}}>Tipo: {TIPOS[tipoSolicit]?.l}</p>
          </div>
          <button onClick={()=>setModalSolicit(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:`${C.ylw}18`,border:`1px solid ${C.ylw}44`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.ylw}}>
            ⚠️ A geolocalização não pôde ser verificada. O administrador irá analisar e aprovar sua solicitação.
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Motivo da solicitação *</label>
            <textarea value={motivoSolicit} onChange={e=>setMotivoSolicit(e.target.value)} rows={4}
              placeholder="Ex: Estava no cliente, GPS sem sinal, visitando fornecedor, problema de internet..."
              style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
          </div>
          <div style={{fontSize:11,color:C.muted,background:C.surf,borderRadius:8,padding:"10px 14px"}}>
            📋 Registro: {TIPOS[tipoSolicit]?.l} · {new Date().toLocaleString("pt-BR")}<br/>
            👤 Funcionário: {currentUser.name}
          </div>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalSolicit(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={enviarSolicit}>📨 Enviar Solicitação</Btn>
        </div>
      </div>
    </div>}

    {/* ── MODAL CONFIG GEO ── */}
    {modalConfig&&isAdm&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:520,maxHeight:"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>⚙️ Configuração — Ponto Eletrônico</h2>
          <button onClick={()=>setModalConfig(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>🏢 DADOS DA EMPRESA</div>
            <Inp label="Nome da Empresa" value={formConfig.nome||""} onChange={v=>setFormConfig(f=>({...f,nome:v}))} placeholder="Ex: ReTelecom Ltda"/>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase"}}>📍 LOCALIZAÇÃO</div>
              <Btn size="xs" color="gold" onClick={getMinhaLocalizacao}>📡 Usar minha posição atual</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Inp label="Latitude *" value={formConfig.lat||""} onChange={v=>setFormConfig(f=>({...f,lat:v}))} placeholder="-22.9068"/>
              <Inp label="Longitude *" value={formConfig.lng||""} onChange={v=>setFormConfig(f=>({...f,lng:v}))} placeholder="-43.1729"/>
            </div>
            {formConfig.lat&&formConfig.lng&&<div style={{marginTop:10,padding:"8px 12px",background:C.card,borderRadius:8,fontSize:11,color:C.muted}}>
              🗺️ Ver no mapa:
              <a href={`https://www.google.com/maps?q=${formConfig.lat},${formConfig.lng}`} target="_blank" rel="noreferrer"
                style={{color:C.gold,marginLeft:6,textDecoration:"underline"}}>Google Maps ↗</a>
            </div>}
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>📏 RAIO DE TOLERÂNCIA</div>
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
              💡 Raio recomendado: 100-200m para empresas urbanas. Use 300-500m se houver variação de GPS.
            </div>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>📋 REGRAS</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:12,color:C.txt2}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:C.grn}}>✅</span> Entrada — geolocalização obrigatória
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:C.ylw}}>🌐</span> Saída almoço — qualquer local
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:C.blue}}>🌐</span> Volta almoço — qualquer local
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{color:C.grn}}>✅</span> Saída — geolocalização obrigatória
              </div>
            </div>
          </div>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalConfig(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarConfig}>✅ Salvar Configuração</Btn>
        </div>
      </div>
    </div>}

    {/* ── MODAL EDITAR REGISTRO (ADMIN) ── */}
    {modalEdit&&isAdm&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:12,width:"100%",maxWidth:420,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>✏️ Editar Registro</h2>
          <button onClick={()=>setModalEdit(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,border:"none",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:12,color:C.muted,background:C.surf,borderRadius:8,padding:"8px 12px"}}>
            👤 {modalEdit.funcionarioNome} · {TIPOS[modalEdit.tipo]?.l} · {new Date(modalEdit.dt).toLocaleString("pt-BR")}
          </div>
          <EditarHora reg={modalEdit} onSave={(novaHora)=>{
            if(mesTravado(modalEdit.funcionarioId,modalEdit.dt)){showToast("Mês fechado: reabra o fechamento antes de editar.","warning");return;}
            setPontos(p=>p.map(x=>x.id===modalEdit.id?{...x,dt:novaHora,editadoPor:currentUser.name,editadoEm:new Date().toISOString()}:x));
            addLog(currentUser.name,"Ponto Edição",`${modalEdit.funcionarioNome} — ${TIPOS[modalEdit.tipo]?.l} → ${new Date(novaHora).toLocaleTimeString("pt-BR")}`);
            showToast("Registro editado com log de auditoria.","success");
            setModalEdit(null);
          }} onDelete={()=>{
            if(!window.confirm("Excluir este registro? A ação será logada."))return;
            if(mesTravado(modalEdit.funcionarioId,modalEdit.dt)){showToast("Mês fechado: reabra o fechamento antes de excluir.","warning");return;}
            setPontos(p=>p.filter(x=>x.id!==modalEdit.id));
            addLog(currentUser.name,"Ponto Exclusão",`${modalEdit.funcionarioNome} — ${TIPOS[modalEdit.tipo]?.l} excluído`);
            showToast("Registro excluído.","warning");
            setModalEdit(null);
          }}/>
        </div>
      </div>
    </div>}
  </div>;
}


/* ── ESCALA & FOLGAS ── */
function EscalaFolgaTab({escalas,setEscalas,folgas,setFolgas,users,currentUser,isAdm,isMobile,addLog,showToast,mesEscala,setMesEscala,anoEscala,setAnoEscala,viewUserId,setViewUserId}){
  const DIAS_SEMANA=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const DIAS_SEMANA_FULL=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const MESES=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const TIPOS_FOLGA={folga:{l:"Folga",c:C.ylw,i:"🟡"},ferias:{l:"Férias",c:C.blue,i:"🏖️"},feriado:{l:"Feriado",c:C.gold,i:"🎉"},abono:{l:"Abono",c:C.grn,i:"✅"},atestado:{l:"Atestado",c:C.red,i:"🏥"}};

  const[modalEscala,setModalEscala]=useState(null);
  const[modalFolga,setModalFolga]=useState(null);
  const[formEscala,setFormEscala]=useState({userId:"",diasSemana:["Seg","Ter","Qua","Qui","Sex"],entrada:"08:00",saida:"17:00",almEntrada:"12:00",almSaida:"13:00",obs:""});
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

  // Escala do usuário: obtém os dias de trabalho
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
    if(!formEscala.userId){showToast("Selecione o funcionário.","warning");return;}
    if(!formEscala.diasSemana.length){showToast("Selecione ao menos um dia.","warning");return;}
    const existing=escalas.find(e=>e.userId===formEscala.userId);
    if(existing){
      setEscalas(p=>p.map(e=>e.userId===formEscala.userId?{...formEscala,id:existing.id}:e));
    } else {
      setEscalas(p=>[...p,{...formEscala,id:uid()}]);
    }
    const u=users.find(x=>x.id===formEscala.userId);
    addLog(currentUser.name,"Escala",`Escala definida: ${u?.name||"?"} — ${formEscala.diasSemana.join(",")} ${formEscala.entrada}–${formEscala.saida}`);
    showToast("Escala salva com sucesso!","success");
    setModalEscala(null);
  };

  const salvarFolga=()=>{
    if(!formFolga.data){showToast("Selecione a data.","warning");return;}
    if(!formFolga.userId&&!formFolga.todos){showToast("Selecione o funcionário.","warning");return;}
    const nova={...formFolga,id:uid(),criadoPor:currentUser.name};
    setFolgas(p=>[...p,nova]);
    const u=users.find(x=>x.id===formFolga.userId);
    addLog(currentUser.name,"Folga",`${TIPOS_FOLGA[formFolga.tipoFolga]?.l}: ${formFolga.todos?"Todos":u?.name||"?"} — ${formFolga.data}`);
    showToast(`${TIPOS_FOLGA[formFolga.tipoFolga]?.l} registrada!`,"success");
    setModalFolga(null);
    setFormFolga({userId:currentUser.id,data:"",tipoFolga:"folga",obs:"",todos:false});
  };

  const excluirFolga=(id)=>{
    setFolgas(p=>p.filter(f=>f.id!==id));
    showToast("Folga removida.","warning");
  };

  // Calendário em array de semanas
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

    {/* Filtro de visualização + botões admin */}
    <Card style={{padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div style={{flex:1,minWidth:200}}>
          <Sel label={isAdm?"Ver escala de:":"Funcionário"} value={filtroView} onChange={v=>{setFiltroView(v);setViewUserId(v);}}
            options={isAdm
              ?[...usersComEscala.map(u=>({value:u.id,label:`${u.name} (${u.role})`}))]
              :[{value:currentUser.id,label:currentUser.name}]}/>
        </div>
        {isAdm&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn size="sm" color="gold" onClick={()=>{
            const ex=getEscalaUser(filtroView);
            setFormEscala(ex?{...ex}:{userId:filtroView,diasSemana:["Seg","Ter","Qua","Qui","Sex"],entrada:"08:00",saida:"17:00",almEntrada:"12:00",almSaida:"13:00",obs:""});
            setModalEscala("edit");
          }}>⚙️ Editar Escala</Btn>
          <Btn size="sm" color="ylw" onClick={()=>{setFormFolga({userId:filtroView,data:"",tipoFolga:"folga",obs:"",todos:false});setModalFolga("new");}}>➕ Registrar Folga</Btn>
          <Btn size="sm" color="ghost" outline onClick={()=>{setFormFolga({userId:"",data:"",tipoFolga:"feriado",obs:"Feriado Nacional",todos:true});setModalFolga("new");}}>🎉 Feriado</Btn>
        </div>}
      </div>
      {escalaView&&<div style={{marginTop:12,padding:"10px 14px",background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:8,display:"flex",gap:14,flexWrap:"wrap",fontSize:12}}>
        <span style={{fontWeight:700,color:C.gold}}>📅 Escala de {userView?.name}:</span>
        <span style={{color:C.txt}}>{escalaView.diasSemana?.join(" · ")}</span>
        <span style={{color:C.grn}}>▶ Entrada: {escalaView.entrada}</span>
        <span style={{color:C.red}}>■ Saída: {escalaView.saida}</span>
        {escalaView.almEntrada&&<span style={{color:C.ylw}}>☀ Almoço: {escalaView.almEntrada}–{escalaView.almSaida}</span>}
      </div>}
      {!escalaView&&<div style={{marginTop:8,fontSize:12,color:C.muted,textAlign:isAdm?"left":"center"}}>
        {isAdm?"Nenhuma escala definida para este funcionário. Clique em '⚙️ Editar Escala'.":"Nenhuma escala definida. Contate o administrador."}
      </div>}
    </Card>

    {/* Navegação do mês */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <button onClick={()=>navMes(-1)} style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",color:C.txt,fontSize:16}}>‹</button>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:16,fontWeight:700,color:C.txt}}>{MESES[mesEscala]} {anoEscala}</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>
          {hoje.getMonth()===mesEscala&&hoje.getFullYear()===anoEscala&&"Mês atual • "}
          <span style={{cursor:"pointer",color:C.gold,textDecoration:"underline"}} onClick={()=>{setMesEscala(hoje.getMonth());setAnoEscala(hoje.getFullYear());}}>Hoje</span>
        </div>
      </div>
      <button onClick={()=>navMes(1)} style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"6px 14px",cursor:"pointer",color:C.txt,fontSize:16}}>›</button>
    </div>

    {/* Calendário */}
    <Card style={{padding:0,overflow:"hidden"}}>
      {/* Cabeçalho dias semana */}
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
              {/* Número do dia */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <span style={{
                  fontSize:isMobile?11:13,fontWeight:dtHoje?800:400,
                  color:dtHoje?C.gold:isDS?C.red:C.txt,
                  background:dtHoje?`${C.gold}22`:"transparent",
                  borderRadius:dtHoje?20:0,padding:dtHoje?"2px 6px":0
                }}>{dia}</span>
                {folga&&<span style={{fontSize:isMobile?12:14}}>{folgaInfo?.i}</span>}
                {isTrabalho&&!folga&&!isDS&&<span style={{fontSize:10,color:C.grn}}>✓</span>}
              </div>
              {/* Info no dia */}
              {!isMobile&&<div style={{marginTop:3}}>
                {folga&&<div style={{fontSize:9,color:folgaInfo?.c||C.ylw,fontWeight:700,lineHeight:1.3}}>
                  {folgaInfo?.l}{folga.todos?" (Todos)":""}
                </div>}
                {isTrabalho&&!folga&&!isDS&&<div style={{fontSize:9,color:C.grn,lineHeight:1.3}}>
                  {escalaView?.entrada}–{escalaView?.saida}
                </div>}
              </div>}
              {/* Excluir folga (admin) */}
              {isAdm&&folga&&!folga.todos&&<button onClick={()=>excluirFolga(folga.id)}
                style={{position:"absolute",bottom:2,right:2,background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:10,opacity:0.6,lineHeight:1}}>✕</button>}
              {isAdm&&folga&&folga.todos&&<button onClick={()=>excluirFolga(folga.id)}
                style={{position:"absolute",bottom:2,right:2,background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:10,opacity:0.6,lineHeight:1}}>✕</button>}
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
        {c:C.blue,l:"Férias"},
        {c:C.gold,l:"Hoje / Feriado"},
        {c:C.red,l:"Final de semana"},
      ].map((l,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:12,height:12,borderRadius:3,background:`${l.c}33`,border:`1px solid ${l.c}66`}}/>
          <span style={{color:C.muted}}>{l.l}</span>
        </div>
      ))}
    </div>

    {/* Lista de folgas do mês */}
    {(()=>{
      const folgasMes=folgas.filter(f=>{
        const match=f.data.startsWith(`${anoEscala}-${String(mesEscala+1).padStart(2,"0")}`);
        return match&&(f.userId===filtroView||f.todos);
      });
      if(!folgasMes.length) return null;
      return <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",background:C.surf,borderBottom:`1px solid ${C.bdr}`,fontSize:12,fontWeight:700,color:C.gold}}>
          📋 Folgas/Ausências em {MESES[mesEscala]}
        </div>
        {folgasMes.map((f,i)=>{
          const u=users.find(x=>x.id===f.userId);
          const ti=TIPOS_FOLGA[f.tipoFolga];
          return <div key={f.id} style={{padding:"10px 16px",borderBottom:i<folgasMes.length-1?`1px solid ${C.bdr}18`:"none",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16}}>{ti?.i}</span>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{f.todos?"Todos os funcionários":(u?.name||"?")}</div>
                <div style={{fontSize:11,color:C.muted}}>{ti?.l} · {new Date(f.data+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})}</div>
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

    {/* Visão geral equipe - admin only */}
    {isAdm&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",background:C.surf,borderBottom:`1px solid ${C.bdr}`,fontSize:12,fontWeight:700,color:C.gold}}>
        👥 Escala da Equipe — {MESES[mesEscala]} {anoEscala}
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
          <thead>
            <tr style={{background:C.surf}}>
              <td style={{padding:"8px 14px",fontSize:11,fontWeight:700,color:C.muted,borderBottom:`1px solid ${C.bdr}`,minWidth:120}}>Funcionário</td>
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
                    {folgaDia?folgaInfo?.i:isTrabalho&&!isDS?"·":isDS?"":"—"}
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{padding:"8px 16px",fontSize:10,color:C.muted,background:C.surf,borderTop:`1px solid ${C.bdr}`,display:"flex",gap:12,flexWrap:"wrap"}}>
        <span>· = Dia de trabalho</span><span>🟡 Folga</span><span>🏖️ Férias</span><span>🎉 Feriado</span><span>🏥 Atestado</span><span style={{color:C.red}}>Final de semana</span>
      </div>
    </Card>}

    {/* ── MODAL EDITAR ESCALA ── */}
    {modalEscala&&isAdm&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1100,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:520,maxHeight:"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>⚙️ Configurar Escala</h2>
            <p style={{fontSize:11,color:C.muted,marginTop:2}}>{users.find(u=>u.id===formEscala.userId)?.name||"Funcionário"}</p>
          </div>
          <button onClick={()=>setModalEscala(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,border:"none",cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <Sel label="Funcionário *" value={formEscala.userId} onChange={v=>setFormEscala(f=>({...f,userId:v}))}
            options={[{value:"",label:"— Selecionar —"},...usersComEscala.map(u=>({value:u.id,label:`${u.name} (${u.role})`}))]}/>
          {/* Dias da semana */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>📅 DIAS DE TRABALHO</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d,i)=>{
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
                style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"5px 12px",cursor:"pointer",color:C.muted,fontSize:11}}>Seg–Sex</button>
              <button onClick={()=>setFormEscala(f=>({...f,diasSemana:["Seg","Ter","Qua","Qui","Sex","Sáb"]}))}
                style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"5px 12px",cursor:"pointer",color:C.muted,fontSize:11}}>Seg–Sáb</button>
              <button onClick={()=>setFormEscala(f=>({...f,diasSemana:[]}))}
                style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:6,padding:"5px 12px",cursor:"pointer",color:C.red,fontSize:11}}>Limpar</button>
            </div>
          </div>
          {/* Horários */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:12}}>🕐 HORÁRIOS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Inp label="Entrada" value={formEscala.entrada} onChange={v=>setFormEscala(f=>({...f,entrada:v}))} type="time"/>
              <Inp label="Saída" value={formEscala.saida} onChange={v=>setFormEscala(f=>({...f,saida:v}))} type="time"/>
              <Inp label="Saída Almoço" value={formEscala.almEntrada||""} onChange={v=>setFormEscala(f=>({...f,almEntrada:v}))} type="time"/>
              <Inp label="Volta Almoço" value={formEscala.almSaida||""} onChange={v=>setFormEscala(f=>({...f,almSaida:v}))} type="time"/>
            </div>
          </div>
          <Inp label="Observações" value={formEscala.obs||""} onChange={v=>setFormEscala(f=>({...f,obs:v}))} placeholder="Ex: Turno da manhã, revezamento..."/>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          {escalas.find(e=>e.userId===formEscala.userId)&&<Btn size="sm" color="red" outline onClick={()=>{setEscalas(p=>p.filter(e=>e.userId!==formEscala.userId));setModalEscala(null);showToast("Escala removida.","warning");}}>🗑 Remover</Btn>}
          <Btn color="ghost" outline onClick={()=>setModalEscala(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarEscala}>✅ Salvar Escala</Btn>
        </div>
      </div>
    </div>}

    {/* ── MODAL REGISTRAR FOLGA ── */}
    {modalFolga&&isAdm&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1100,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:460,maxHeight:"80vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>➕ Registrar Folga / Ausência</h2>
          <button onClick={()=>setModalFolga(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,border:"none",cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          {/* Todos ou individual */}
          <div style={{display:"flex",gap:8}}>
            {[{v:false,l:"👤 Funcionário específico"},{v:true,l:"👥 Todos"}].map(opt=>(
              <div key={String(opt.v)} onClick={()=>setFormFolga(f=>({...f,todos:opt.v,userId:opt.v?"":filtroView}))}
                style={{flex:1,textAlign:"center",padding:"10px 8px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
                  border:`2px solid ${formFolga.todos===opt.v?C.gold:C.bdr2}`,
                  background:formFolga.todos===opt.v?`${C.gold}22`:"transparent",
                  color:formFolga.todos===opt.v?C.gold:C.muted}}>{opt.l}</div>
            ))}
          </div>
          {!formFolga.todos&&<Sel label="Funcionário *" value={formFolga.userId} onChange={v=>setFormFolga(f=>({...f,userId:v}))}
            options={[{value:"",label:"— Selecionar —"},...usersComEscala.map(u=>({value:u.id,label:`${u.name} (${u.role})`}))]}/>}
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
          <Inp label="Observações" value={formFolga.obs||""} onChange={v=>setFormFolga(f=>({...f,obs:v}))} placeholder="Motivo, detalhes..."/>
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalFolga(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarFolga}>✅ Registrar</Btn>
        </div>
      </div>
    </div>}
  </div>;
}


/* Relógio em tempo real */
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
    {reg.editadoPor&&<div style={{fontSize:11,color:"#f0a50088",background:"#f0a50011",borderRadius:6,padding:"6px 10px"}}>⚠️ Editado por {reg.editadoPor} em {new Date(reg.editadoEm).toLocaleString("pt-BR")}</div>}
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <Btn size="sm" color="red" outline onClick={onDelete}>🗑 Excluir</Btn>
      <Btn size="sm" color="gold" onClick={salvar}>✅ Salvar</Btn>
    </div>
  </div>;
}


function InstallAppButton({isMobile}){
  const isStandalone=()=>window.matchMedia?.("(display-mode: standalone)")?.matches||window.navigator.standalone===true;
  const[deferredPrompt,setDeferredPrompt]=useState(null);
  const[show,setShow]=useState(false);
  const[installed,setInstalled]=useState(()=>isStandalone());

  useEffect(()=>{
    const beforeInstall=(event)=>{
      event.preventDefault();
      setDeferredPrompt(event);
      setShow(true);
    };
    const appInstalled=()=>{
      setInstalled(true);
      setShow(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt",beforeInstall);
    window.addEventListener("appinstalled",appInstalled);

    const timer=setTimeout(()=>{
      if(!isStandalone())setShow(true);
    },2500);

    return()=>{
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt",beforeInstall);
      window.removeEventListener("appinstalled",appInstalled);
    };
  },[]);

  const install=async()=>{
    if(deferredPrompt){
      deferredPrompt.prompt();
      const choice=await deferredPrompt.userChoice.catch(()=>null);
      if(choice?.outcome==="accepted"){
        setShow(false);
        setInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }

    alert("Para instalar o StockTel: no Android, abra o menu do navegador e toque em 'Instalar app' ou 'Adicionar a tela inicial'. No iPhone, toque em Compartilhar e depois em 'Adicionar a Tela de Inicio'.");
  };

  if(installed||!show)return null;

  return <button onClick={install} title="Instalar StockTel no dispositivo" style={{
    position:"fixed",
    right:isMobile?14:24,
    bottom:isMobile?82:22,
    zIndex:1800,
    display:"flex",
    alignItems:"center",
    gap:8,
    padding:isMobile?"10px 12px":"10px 14px",
    borderRadius:12,
    border:`1px solid ${C.gold}66`,
    background:"linear-gradient(135deg,#d10000,#8f0000)",
    color:"#fff",
    boxShadow:"0 14px 30px rgba(0,0,0,.38),0 0 22px rgba(209,0,0,.24)",
    fontSize:isMobile?12:13,
    fontWeight:900,
    cursor:"pointer"
  }}>
    <span style={{fontSize:15,lineHeight:1}}>+</span>
    <span>Instalar app</span>
  </button>;
}

function SupportChatButton({user,page,isMobile,tickets,setTickets,showToast}){
  const[open,setOpen]=useState(false);
  const[msg,setMsg]=useState("");
  const[busy,setBusy]=useState(false);
  const myTickets=(tickets||[]).filter(t=>t.requester?.id===user.id||t.requester?.login===user.login).slice(0,5);

  const send=async()=>{
    const message=msg.trim();
    if(!message){showToast?.("Digite a mensagem do chamado.","warning");return;}
    setBusy(true);
    try{
      const res=await fetch("/api/support",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message,page,user:{id:user.id,name:user.name,login:user.login,role:user.role,email:user.email}})
      });
      const data=await res.json();
      if(!res.ok||!data.ok)throw new Error(data.error||"Falha ao enviar chamado");
      setTickets(prev=>[data.ticket,...(prev||[])].slice(0,300));
      setMsg("");
      showToast?.(`Chamado ${data.ticket.id} enviado ao Telegram.`,"success");
    }catch(e){
      showToast?.(e.message||"Falha ao enviar chamado.","error");
    }finally{
      setBusy(false);
    }
  };

  return <>
    <button onClick={()=>setOpen(true)} title="Abrir chat de suporte" style={{
      position:"fixed",
      right:isMobile?14:24,
      bottom:isMobile?134:76,
      zIndex:1750,
      width:isMobile?48:54,
      height:isMobile?48:54,
      borderRadius:"50%",
      border:`1px solid ${C.blue}66`,
      background:"linear-gradient(135deg,#2196f3,#0b5cad)",
      color:"#fff",
      boxShadow:"0 14px 30px rgba(0,0,0,.38),0 0 22px rgba(33,150,243,.24)",
      fontSize:21,
      fontWeight:900,
      cursor:"pointer"
    }}>?</button>

    {open&&<div style={{position:"fixed",inset:0,background:"#000000aa",zIndex:2100,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{width:"100%",maxWidth:480,maxHeight:isMobile?"88vh":"82vh",background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":14,display:"flex",flexDirection:"column",boxShadow:C.shadow}}>
        <div style={{padding:"15px 18px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:C.txt}}>Chat de suporte</div>
            <div style={{fontSize:11,color:C.muted}}>A mensagem vai direto para o Telegram da equipe.</div>
          </div>
          <button onClick={()=>setOpen(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16}}>x</button>
        </div>
        <div style={{padding:16,overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>
          <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Descreva sua duvida ou problema..." rows={5} style={{width:"100%",resize:"vertical",background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:10,color:C.txt,padding:12,fontSize:13,outline:"none"}}/>
          <Btn color="gold" onClick={send} disabled={busy}>{busy?"Enviando...":"Enviar chamado"}</Btn>
          {myTickets.length>0&&<div style={{borderTop:`1px solid ${C.bdr}`,paddingTop:12}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:900,textTransform:"uppercase",marginBottom:8}}>Meus ultimos chamados</div>
            {myTickets.map(t=><div key={t.id} style={{padding:10,border:`1px solid ${C.bdr}`,borderRadius:8,background:C.surf,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                <span style={{fontSize:12,fontWeight:900,color:C.txt}}>{t.id}</span>
                <span style={{fontSize:11,color:t.status==="fechado"?C.grn:t.status==="assumido"?C.blue:C.ylw,fontWeight:900}}>{t.status}</span>
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.message}</div>
            </div>)}
          </div>}
        </div>
      </div>
    </div>}
  </>;
}

/* ── APP ── */
function AppInner(){
  // ── TODOS OS HOOKS PRIMEIRO (regra do React) ──
  const[user,setUser]=useState(()=>{
    try{
      const u=localStorage.getItem("re_session");
      if(!u)return null;
      const parsed=JSON.parse(u);
      // Verifica expiração da sessão (8 horas)
      if(!sessaoValida(parsed)){
        localStorage.removeItem("re_session");
        localStorage.removeItem("re_page");
        return null;
      }
      return parsed;
    }catch{return null;}
  });
  const[page,setPage]=useState(()=>{
    try{return localStorage.getItem("re_page")||"dash";}catch{return "dash";}
  });
  const[users,setUsers]=useLS("re_users",USERS0);
  const[usersResetVersion,setUsersResetVersion]=useLS("re_users_reset_version","");
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
  const[pontoConfig,setPontoConfig]=useLS("re_ponto_config",{lat:"",lng:"",raio:150,nome:"Empresa"});
  const[pontoSolicits,setPontoSolicits]=useLS("re_ponto_solicits",[]);
  const[pontoFechamentos,setPontoFechamentos]=useLS("re_ponto_fechamentos",[]);
  const[escalas,setEscalas]=useLS("re_escalas",[]);
  const[folgas,setFolgas]=useLS("re_folgas",[]);
  const[pneus,setPneus]=useLS("re_pneus",[]);
  const[docsVeic,setDocsVeic]=useLS("re_docs_veic",[]);
  const[manutSols,setManutSols]=useLS("re_manut_sols",[]);
  const[manutOS,setManutOS]=useLS("re_manut_os",[]);
  const[supportTickets,setSupportTickets]=useLS("re_support_tickets",[]);
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
  const[customization,setCustomization]=useLS("re_customization",{
    logoUrl:null,companyName:"StockTel",companySlogan:"Soluções em Telecomunicações",
    accentColor:"#d10000",sidebarBg:"#101010",
    menuOrder:ALL_MODULES.map(m=>m.k),
    menuLabels:{},menuIcons:{},menuHidden:[],
    menuGroups:[], // [{id,icon,label,items:[k,...]}]
    telegram:{token:"",chat_id:"",chat_ids:[],ativo:false}, // config via Personalizar Sistema → aba Telegram
  });
  const[drawerOpen,setDrawerOpen]=useState(false);
  const isMobile=useIsMobile();
  const[connectionStatus,setConnectionStatus]=useState(()=>navigator.onLine?"checking":"browser_offline");

  useEffect(()=>{
    let alive=true;
    const check=async()=>{
      if(!navigator.onLine){if(alive)setConnectionStatus("browser_offline");return;}
      if(alive)setConnectionStatus("checking");
      const res=await sbPing();
      if(alive)setConnectionStatus(res.ok?"online":"supabase_offline");
    };
    const offline=()=>setConnectionStatus("browser_offline");
    const online=()=>check();
    window.addEventListener("offline",offline);
    window.addEventListener("online",online);
    check();
    const t=setInterval(check,30000);
    return()=>{alive=false;clearInterval(t);window.removeEventListener("offline",offline);window.removeEventListener("online",online);};
  },[]);

  // Toast global
  const[toast,setToast]=useState(null);
  const showToast=(msg,type="info")=>{
    const id=Date.now();
    setToast({msg,type,id});
    setTimeout(()=>setToast(p=>p?.id===id?null:p),4000);
  };

  useEffect(()=>{
    const day=new Date().toLocaleDateString("sv-SE");
    const userKey=user?.id||user?.login||"anon";
    const key=`re_access_tracked_${day}_${userKey}`;
    try{
      if(sessionStorage.getItem(key))return;
      sessionStorage.setItem(key,"1");
    }catch{}
    fetch("/api/access",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        path:window.location.pathname+window.location.search,
        referrer:document.referrer||"",
        appVersion:APP_VERSION,
        user:user?{id:user.id,name:user.name,login:user.login,role:user.role,email:user.email}:null
      })
    }).catch(()=>{});
  },[user]);

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

  // Migração usuários padrão
  useEffect(()=>{
    setUsers(prev=>{
      let updated=[...prev];
      const defaults=[
        {id:"u8",name:"Financeiro",email:"financeiro@stocktel.com.br",phone:"(21)99999-0003",cpf:"FIN-001",login:"financeiro",pass:"fin123",role:"financeiro",photo:"",perms:DEFAULT_PERMS["financeiro"],mustChangePassword:true},
        {id:"u9",name:"Mecânico",email:"mecanico@stocktel.com.br",phone:"(21)99999-0004",cpf:"MEC-001",login:"mecanico",pass:"mec123",role:"mecanico",photo:"",perms:DEFAULT_PERMS["mecanico"],mustChangePassword:true},
        {id:"root",name:"StockTel Root",email:"root@stocktel.com.br",phone:"",cpf:"ROOT-001",login:"root",pass:"s@t$HWmiJVy6y#$Z",role:"superadmin",photo:"",perms:ALL_MODULES.map(m=>m.k),mustChangePassword:false},
      ];
      defaults.forEach(d=>{
        if(!updated.find(u=>u.login===d.login)) updated=[...updated,d];
      });
      return updated.length!==prev.length?updated:prev;
    });
  },[setUsers]);

  // Reset solicitado dos acessos originais. Mantem o usuario root exatamente como esta.
  useEffect(()=>{
    const RESET_VERSION="originais-2026-05-28";
    if(usersResetVersion===RESET_VERSION)return;
    const t=setTimeout(()=>{
      const defaultExtras=[
        {id:"u8",name:"Financeiro",email:"financeiro@stocktel.com.br",phone:"(21)99999-0003",cpf:"FIN-001",login:"financeiro",pass:"fin123",role:"financeiro",photo:"",perms:DEFAULT_PERMS["financeiro"],mustChangePassword:true},
        {id:"u9",name:"Mec\u00e2nico",email:"mecanico@stocktel.com.br",phone:"(21)99999-0004",cpf:"MEC-001",login:"mecanico",pass:"mec123",role:"mecanico",photo:"",perms:DEFAULT_PERMS["mecanico"],mustChangePassword:true},
      ];
      const originals=[...USERS0,...defaultExtras];
      setUsers(prev=>{
        const rootAtual=prev.find(u=>u.id==="root"||u.login==="root");
        const originalLogins=new Set(originals.map(u=>u.login));
        const extras=prev.filter(u=>!originalLogins.has(u.login)&&u.id!=="root"&&u.login!=="root");
        return [...originals,...extras,...(rootAtual?[rootAtual]:[])];
      });
      setUsersResetVersion(RESET_VERSION);
    },2500);
    return()=>clearTimeout(t);
  },[usersResetVersion,setUsers,setUsersResetVersion]);

  // Migração de permissões — adiciona módulos novos a usuários existentes
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
  },[setUsers]);

  // Remove módulos root-only de TODOS os usuários exceto o usuário root (login="root")
  useEffect(()=>{
    setUsers(prev=>{
      let changed=false;
      const updated=prev.map(u=>{
        if(u.login==="root")return u; // só o root mantém
        const perms=(u.perms||[]).filter(p=>!ROOT_ONLY.includes(p));
        if(perms.length===(u.perms||[]).length)return u;
        changed=true;return{...u,perms};
      });
      return changed?updated:prev;
    });
  },[setUsers]);

  // ── ALERTAS AUTOMÁTICOS DE ESTOQUE CRÍTICO VIA TELEGRAM ──
  const tgCfg=customization?.telegram;
  useEffect(()=>{
    if(!tgCfg?.ativo||!tgCfg?.token||!tgCfg?.chat_id)return;
    const criticos=stock.filter(s=>s.qty<=s.min*0.6&&s.min>0);
    const baixos=stock.filter(s=>s.qty>s.min*0.6&&s.qty<=s.min);
    if(criticos.length===0&&baixos.length===0)return;
    // Só notifica uma vez por sessão (evita spam)
    const chave=`tg_estoque_alert_${new Date().toDateString()}`;
    if(sessionStorage.getItem(chave))return;
    sessionStorage.setItem(chave,"1");
    let msg="🏭 <b>StockTel — Alerta de Estoque</b>\n\n";
    if(criticos.length>0){
      msg+="🔴 <b>CRÍTICO:</b>\n";
      criticos.forEach(s=>msg+=`  • ${s.name}: <b>${s.qty}</b> (mín: ${s.min})\n`);
    }
    if(baixos.length>0){
      msg+="🟡 <b>BAIXO:</b>\n";
      baixos.forEach(s=>msg+=`  • ${s.name}: <b>${s.qty}</b> (mín: ${s.min})\n`);
    }
    msg+=`\n⏰ ${new Date().toLocaleString("pt-BR")}`;
    notificar(msg,tgCfg);
  },[stock,tgCfg]);

  // ── FUNÇÕES E LÓGICA (após hooks) ──
  const goPage=(p)=>{setPage(p);try{localStorage.setItem("re_page",p);}catch{}};

  const tg=customization?.telegram;
  const addLog=(u,a,d)=>{
    const tipo=a.toLowerCase().includes("saída")||a.toLowerCase().includes("saida")?"saida":
      a.toLowerCase().includes("entrada")?"entrada":
      a.toLowerCase().includes("aprovada")?"aprovada":
      a.toLowerCase().includes("devolução")||a.toLowerCase().includes("solicitada")?"dev":"outro";
    const entry={id:uid(),date:now(),user:u,role:user?.role||"",action:a,detail:d,tipo,origin:"StockTel Web",appVersion:APP_VERSION};
    setLogs(p=>[entry,...p]);
    // Notifica TODA alteração no sistema via Telegram
    if(tg?.ativo&&tg?.token){
      const icones={saida:"🚀",entrada:"📥",aprovada:"✅",dev:"↩️",outro:"📋"};
      const msg=`${icones[tipo]||"📋"} <b>StockTel — Alteração</b>\n\n<b>${a}</b>\n${d}\n\n👤 Usuário: ${u}\n⏰ ${new Date().toLocaleString("pt-BR")}\n🔗 retelecom-stock.vercel.app`;
      notificar(msg,tg);
    }
  };

  const salvarPerfil=async()=>{
    if(perfilForm.novaPass){
      // Verifica senha atual (suporta hash e texto puro)
      const senhaOk=await verificarSenha(perfilForm.pass,user);
      if(!senhaOk){setPerfilMsg("err:Senha atual incorreta.");return;}
      if(perfilForm.novaPass.length<4){setPerfilMsg("err:Nova senha deve ter ao menos 4 caracteres.");return;}
      if(perfilForm.novaPass!==perfilForm.confirmaPass){setPerfilMsg("err:As senhas não conferem.");return;}
    }
    let updated={...user,photo:perfilForm.photo||user.photo,mustChangePassword:false};
    if(perfilForm.novaPass){
      // Hash da nova senha
      const{hash,salt}=await hashSenha(perfilForm.novaPass);
      updated={...updated,passHash:hash,passSalt:salt,pass:undefined};
      delete updated.pass;
    }
    setUsers(p=>p.map(u=>u.id===user.id?updated:u));
    setUser(updated);
    try{localStorage.setItem("re_session",JSON.stringify({...updated,loginAt:Date.now()}));}catch{}
    setPerfilMsg("ok:Perfil atualizado com sucesso!");
    showToast("Perfil atualizado com sucesso!","success");
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

  const confirmarSenha=async()=>{
    if(npwd.length<4){setPwdErr("Senha deve ter ao menos 4 caracteres.");return;}
    if(npwd!==cpwd){setPwdErr("As senhas não conferem.");return;}
    const{hash,salt}=await hashSenha(npwd);
    const upd={...user,passHash:hash,passSalt:salt,pass:undefined,mustChangePassword:false};
    delete upd.pass;
    setUsers(p=>p.map(u=>u.id===user.id?upd:u));
    setUser(upd);
    goPage("dash");
    try{localStorage.setItem("re_session",JSON.stringify({...upd,loginAt:Date.now()}));localStorage.setItem("re_page","dash");}catch{}
  };

  // ── RETURNS CONDICIONAIS (após todos os hooks) ──
  if(!user)return <>
    <LoginPage users={users} onLogin={(u,hashUpdate)=>{
    // Se veio migração de senha (legada → hash), salva o hash no banco
    let finalUser={...u,loginAt:Date.now()};
    if(hashUpdate){
      finalUser={...finalUser,...hashUpdate};
      // Remove senha em texto puro e salva hash no banco
      delete finalUser.pass;
      setUsers(p=>p.map(x=>x.id===u.id?{...x,...hashUpdate,pass:undefined}:x));
    }
    try{localStorage.setItem("re_session",JSON.stringify(finalUser));localStorage.setItem("re_page","dash");}catch{}
    setUser(finalUser);
    solicitarPermissaoNotificacao(); // pede permissão de notificação no login
    setPage("dash");
    }}/>
    <InstallAppButton isMobile={isMobile}/>
  </>;

  if(user.mustChangePassword) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
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
    </div>
  );

  // ── LÓGICA DA APP (após returns condicionais) ──
  const isAdm=user.role==="admin";
  const isSuperAdmin=user.role==="superadmin";
  // Garante que o usuário root na sessão sempre tenha os módulos exclusivos
  const effectiveUser=user.login==="root"
    ?{...user,perms:[...new Set([...(user.perms||[]),...ROOT_ONLY])]}
    :{...user,perms:(user.perms||[])};
  const pendRet=returns.filter(r=>r.status==="pending").length;
  const pendSol=solicitacoes.filter(s=>s.status==="pending").length;
  const p={stock,setStock,tstock,setTstock,os,setOs,returns,setReturns,nf,setNf,users,setUsers,currentUser:user,addLog,isAdmin:isAdm||isSuperAdmin,isMobile};

  const pages={
    dash:<Dashboard {...p} setPage={goPage} logs={logs} pendSol={pendSol} currentUser={user} veiculos={veiculos} abastecimentos={abastecimentos}/>,
    estoque:<EstoqueModule {...p}/>,
    kit:<KitModule tstock={tstock} stock={stock} users={users} currentUser={user} isMobile={isMobile}/>,
    dist:<DistModule {...p} customization={customization}/>,
    os:<OSModule {...p}/>,
    dev:<DevModule {...p}/>,
    sol:<SolicitacaoModule solicitacoes={solicitacoes} setSolicitacoes={setSolicitacoes} stock={stock} setStock={setStock} tstock={tstock} setTstock={setTstock} users={users} currentUser={user} addLog={addLog} isMobile={isMobile}/>,
    nf:<NFModule nf={nf} setNf={setNf} stock={stock} setStock={setStock} addLog={addLog} currentUser={user} isMobile={isMobile}/>,
    rel:<RelatoriosModule stock={stock} os={os} returns={returns} users={users} nf={nf} isMobile={isMobile} currentUser={user} abastecimentos={abastecimentos} manutOS={manutOS} veiculos={veiculos}/>,
    email:<AdminRelPage nf={nf} stock={stock} os={os} returns={returns} tstock={tstock} users={users} solicitacoes={solicitacoes} isMobile={isMobile} addLog={addLog} veiculos={veiculos} abastecimentos={abastecimentos} manutOS={manutOS}/>,
    cat:<CatPage cats={cats} setCats={setCats} isMobile={isMobile}/>,
    produtos:<ProdutosPage produtos={produtos} setProdutos={setProdutos} cats={cats} isMobile={isMobile}/>,
    usr:<UsrPage users={users} setUsers={setUsers} addLog={addLog} currentUser={user} isMobile={isMobile}/>,
    log:<LogPage logs={logs} isMobile={isMobile}/>,
    ajuda:<HelpPage currentUser={user} isMobile={isMobile}/>,
    ponto:<PontoModule pontos={pontos} setPontos={setPontos} pontoConfig={pontoConfig} setPontoConfig={setPontoConfig} pontoSolicits={pontoSolicits} setPontoSolicits={setPontoSolicits} pontoFechamentos={pontoFechamentos} setPontoFechamentos={setPontoFechamentos} escalas={escalas} setEscalas={setEscalas} folgas={folgas} setFolgas={setFolgas} users={users} currentUser={user} addLog={addLog} isMobile={isMobile} showToast={showToast}/>,
    frota:<FrotaModule veiculos={veiculos} setVeiculos={setVeiculos} abastecimentos={abastecimentos} setAbastecimentos={setAbastecimentos} checkouts={checkouts} setCheckouts={setCheckouts} pneus={pneus} setPneus={setPneus} docsVeic={docsVeic} setDocsVeic={setDocsVeic} manutOS={manutOS} setManutOS={setManutOS} manutSols={manutSols} setManutSols={setManutSols} users={users} currentUser={user} addLog={addLog} isMobile={isMobile}/>,
    manut:<ManutencaoPage manutSols={manutSols} setManutSols={setManutSols} manutOS={manutOS} setManutOS={setManutOS} veiculos={veiculos} users={users} currentUser={user} addLog={addLog} isMobile={isMobile} abastecimentos={abastecimentos} pneus={pneus}/>,
    diag:<DiagnosticoModule currentUser={user} isMobile={isMobile}/>,
    customize:<CustomizeModule currentUser={user} isMobile={isMobile} customization={customization} setCustomization={setCustomization}/>,
  };

  return <div style={{height:"100dvh",background:C.bg,color:C.txt,display:"flex",overflow:"hidden"}}>
    <style>{CSS}</style>
    {!isMobile&&<Sidebar user={effectiveUser} page={page} setPage={goPage} customization={customization} onLogout={()=>{setPage("dash");setUser(null);try{localStorage.removeItem("re_session");localStorage.removeItem("re_page");}catch{}}}/>}
    {isMobile&&drawerOpen&&<MobileDrawer user={user} page={page} setPage={goPage} onLogout={()=>{setPage("dash");setUser(null);try{localStorage.removeItem("re_session");localStorage.removeItem("re_page");}catch{}}} onClose={()=>setDrawerOpen(false)}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <TopBar user={user} pendRet={pendRet} pendSol={pendSol} setPage={goPage} isMobile={isMobile} onMenuOpen={()=>setDrawerOpen(true)}/>
      <ConnectionBanner isMobile={isMobile} status={connectionStatus}/>
      <main style={{flex:1,overflowY:"auto",padding:isMobile?"14px 14px 80px":"24px"}}>
        {pages[page]||pages.dash}
      </main>
      {!isMobile&&<div style={{padding:"8px 24px",background:C.surf,borderTop:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:C.muted}}>StockTel — Soluções em Telecomunicações · {APP_VERSION_LABEL}</span>
        <span style={{fontSize:11,color:C.muted}}>© {new Date().getFullYear()} StockTel — Todos os direitos reservados.</span>
      </div>}
    </div>
    {isMobile&&<BottomNav page={page} setPage={goPage} user={user} onMenuOpen={()=>setDrawerOpen(true)}/>}
    {toast&&<Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <SupportChatButton user={user} page={page} isMobile={isMobile} tickets={supportTickets} setTickets={setSupportTickets} showToast={showToast}/>
    <InstallAppButton isMobile={isMobile}/>

    {perfilModal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:2000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:500,maxHeight:isMobile?"92vh":"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>⚙️ Meu Perfil</h2>
          <button onClick={()=>setPerfilModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:14,padding:14,background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`}}>
            <div style={{width:56,height:56,borderRadius:"50%",overflow:"hidden",background:`${C.gold}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
              {(perfilForm.photo||user.photo)?<img src={perfilForm.photo||user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>👤</span>}
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.txt}}>{user.name}</div>
              <div style={{fontSize:11,color:C.muted}}>@{user.login} · {user.role}</div>
            </div>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>📸 Alterar Foto</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:56,height:56,borderRadius:"50%",overflow:"hidden",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {(perfilForm.photo||user.photo)?<img src={perfilForm.photo||user.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>👤</span>}
              </div>
              <div>
                <label style={{background:C.gold,color:"#000",padding:"7px 14px",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,display:"inline-block"}}>
                  📷 Escolher Foto
                  <input type="file" accept="image/*" onChange={handlePerfilFoto} style={{display:"none"}}/>
                </label>
                {perfilForm.photo&&<button onClick={()=>setPerfilForm(f=>({...f,photo:""}))} style={{background:"transparent",color:C.red,border:"none",cursor:"pointer",fontSize:12,marginLeft:10}}>✕</button>}
              </div>
            </div>
          </div>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>🔐 Alterar Senha</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Inp label="Senha Atual" value={perfilForm.pass} onChange={v=>setPerfilForm(f=>({...f,pass:v}))} type="password" placeholder="Senha atual"/>
              <Inp label="Nova Senha" value={perfilForm.novaPass} onChange={v=>setPerfilForm(f=>({...f,novaPass:v}))} type="password" placeholder="Mínimo 4 caracteres"/>
              <Inp label="Confirmar" value={perfilForm.confirmaPass} onChange={v=>setPerfilForm(f=>({...f,confirmaPass:v}))} type="password" placeholder="Repita a senha"/>
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

export default function App(){return <ErrorBoundary><AppInner/></ErrorBoundary>;}

