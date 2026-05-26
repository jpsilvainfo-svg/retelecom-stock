// src/App.jsx
import React, { lazy, Suspense, useState, useEffect } from "react";
import { ToastProvider } from "./contexts/ToastContext";
import { useIsMobile } from "./hooks/useIsMobile";
import { useLS } from "./hooks/useLS";
import { C, ALL_MODULES, DEFAULT_PERMS, USERS0, STOCK0, TSTOCK0, OS0, RET0, NF0, LOGS0 } from "./lib/constants";
import { uid, now, fmt } from "./lib/utils";
import { Btn, Inp, Sel, Card, Bdg, Modal } from "./components/ui";
import { Spinner } from "./components/ui/Toast";
import { useToast } from "./hooks/useToast";
import { Sidebar, MobileDrawer, TopBar, BottomNav } from "./components/layout";

// Páginas principais (carregamento imediato)
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import EstoquePage from "./pages/EstoquePage";
import KitPage from "./pages/KitPage";
import DistPage from "./pages/DistPage";
import OSPage from "./pages/OSPage";
import DevPage from "./pages/DevPage";
import NFPage from "./pages/NFPage";
import UsrPage from "./pages/UsrPage";
import LogPage from "./pages/LogPage";
import CatPage from "./pages/CatPage";
import ProdutosPage from "./pages/ProdutosPage";
import SolicitacaoPage from "./pages/SolicitacaoPage";

// Páginas pesadas (lazy loading)
const RelPage       = lazy(() => import("./pages/RelPage"));
const AdminRelPage  = lazy(() => import("./pages/AdminRelPage"));
const FrotaPage     = lazy(() => import("./pages/FrotaPage"));
const ManutencaoPage= lazy(() => import("./pages/ManutencaoPage"));

const fallback = <Spinner/>;

class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e){return{hasError:true,error:e};}
  render(){
    if(this.state.hasError){
      return <div style={{minHeight:"100vh",background:"#161616",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
        <div style={{fontSize:40}}>⚠️</div>
        <div style={{fontSize:18,fontWeight:700,color:"#cc0000"}}>Erro ao carregar o sistema</div>
        <div style={{fontSize:13,color:"#888",maxWidth:500,textAlign:"center"}}>{String(this.state.error?.message||this.state.error)}</div>
        <button onClick={()=>window.location.reload()} style={{background:"#cc0000",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:8}}>
          🔄 Recarregar
        </button>
      </div>;
    }
    return this.props.children;
  }
}


/* ── TOAST NOTIFICATION ── */

function AppInner(){
  // ── TODOS OS HOOKS PRIMEIRO (regra do React) ──
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
  const isMobile=useIsMobile();
  const { showToast } = useToast();

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
  },[]);

  // ── FUNÇÕES E LÓGICA (após hooks) ──
  const goPage=(p)=>{setPage(p);try{localStorage.setItem("re_page",p);}catch{}};

  const addLog=(u,a,d)=>{
    const tipo=a.toLowerCase().includes("saída")||a.toLowerCase().includes("saida")?"saida":
      a.toLowerCase().includes("entrada")?"entrada":
      a.toLowerCase().includes("aprovada")?"aprovada":
      a.toLowerCase().includes("devolução")||a.toLowerCase().includes("solicitada")?"dev":"outro";
    setLogs(p=>[{id:uid(),date:now(),user:u,action:a,detail:d,tipo},...p]);
  };

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

  const confirmarSenha=()=>{
    if(npwd.length<4){setPwdErr("Senha deve ter ao menos 4 caracteres.");return;}
    if(npwd!==cpwd){setPwdErr("As senhas não conferem.");return;}
    const upd={...user,pass:npwd,mustChangePassword:false};
    setUsers(p=>p.map(u=>u.id===user.id?upd:u));
    setUser(upd);
    goPage("dash");
    try{localStorage.setItem("re_session",JSON.stringify(upd));localStorage.setItem("re_page","dash");}catch{}
  };

  // ── RETURNS CONDICIONAIS (após todos os hooks) ──
  if(!user)return <LoginPage users={users} onLogin={u=>{
    try{localStorage.setItem("re_session",JSON.stringify(u));localStorage.setItem("re_page","dash");}catch{}
    setUser(u);
    setPage("dash");
  }}/>;

  if(user.mustChangePassword) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
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
    rel:<Suspense fallback={fallback}><RelPage stock={stock} os={os} returns={returns} users={users} nf={nf} isMobile={isMobile} currentUser={user}/></Suspense>,
    email:<Suspense fallback={fallback}><AdminRelPage nf={nf} stock={stock} os={os} returns={returns} tstock={tstock} users={users} solicitacoes={solicitacoes} isMobile={isMobile} addLog={addLog}/></Suspense>,
    cat:<CatPage cats={cats} setCats={setCats} isMobile={isMobile}/>,
    produtos:<ProdutosPage produtos={produtos} setProdutos={setProdutos} cats={cats} isMobile={isMobile}/>,
    usr:<UsrPage users={users} setUsers={setUsers} addLog={addLog} currentUser={user} isMobile={isMobile}/>,
    log:<LogPage logs={logs} isMobile={isMobile}/>,
    frota:<Suspense fallback={fallback}><FrotaPage veiculos={veiculos} setVeiculos={setVeiculos} abastecimentos={abastecimentos} setAbastecimentos={setAbastecimentos} checkouts={checkouts} setCheckouts={setCheckouts} users={users} currentUser={user} addLog={addLog} isMobile={isMobile}/></Suspense>,
    manut:<Suspense fallback={fallback}><ManutencaoPage manutSols={manutSols} setManutSols={setManutSols} manutOS={manutOS} setManutOS={setManutOS} veiculos={veiculos} users={users} currentUser={user} addLog={addLog} isMobile={isMobile}/></Suspense>,
  };

  return <div style={{height:"100dvh",background:C.bg,color:C.txt,display:"flex",overflow:"hidden"}}>
    {!isMobile&&<Sidebar user={user} page={page} setPage={goPage} onLogout={()=>{setPage("dash");setUser(null);try{localStorage.removeItem("re_session");localStorage.removeItem("re_page");}catch{}}}/>}
    {isMobile&&drawerOpen&&<MobileDrawer user={user} page={page} setPage={goPage} onLogout={()=>{setPage("dash");setUser(null);try{localStorage.removeItem("re_session");localStorage.removeItem("re_page");}catch{}}} onClose={()=>setDrawerOpen(false)}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <TopBar user={user} pendRet={pendRet} pendSol={pendSol} setPage={goPage} isMobile={isMobile} onMenuOpen={()=>setDrawerOpen(true)}/>
      <main style={{flex:1,overflowY:"auto",padding:isMobile?"14px 14px 80px":"24px"}}>
        {pages[page]||pages.dash}
      </main>
      {!isMobile&&<div style={{padding:"8px 24px",background:C.surf,borderTop:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:C.muted}}>StockTel — Soluções em Telecomunicações · v1.1</span>
        <span style={{fontSize:11,color:C.muted}}>© {new Date().getFullYear()} StockTel — Todos os direitos reservados.</span>
      </div>}
    </div>
    {isMobile&&<BottomNav page={page} setPage={goPage} user={user} onMenuOpen={()=>setDrawerOpen(true)}/>}

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

export default function App(){
  return (
    <ToastProvider>
      <ErrorBoundary>
        <AppInner/>
      </ErrorBoundary>
    </ToastProvider>
  );
}
