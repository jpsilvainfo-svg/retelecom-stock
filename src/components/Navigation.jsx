import { C } from '../utils/colors.js';
import { ALL_MODULES, DEFAULT_PERMS } from '../utils/constants.js';
import { today } from '../utils/formatters.js';

function Sidebar({user,page,setPage,onLogout}){
  const basePerms=user.perms||DEFAULT_PERMS[user.role]||["dash"];
  // Garante que módulos novos do perfil apareçam mesmo em users antigos
  const roleDefaults=DEFAULT_PERMS[user.role]||[];
  const perms=[...new Set([...basePerms,...roleDefaults])];
  const nav=ALL_MODULES.filter(m=>perms.includes(m.k)).map(m=>({k:m.k,icon:m.icon,label:m.l,group:m.group}));
  const groupLabels={geral:"GERAL",operacional:"OPERAÇÃO",estoque:"ESTOQUE",relatorios:"RELATÓRIOS",admin:"ADMIN",mecanico:"MECÂNICO"};
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
      <div style={{fontSize:10,color:C.muted,letterSpacing:".18em",textTransform:"uppercase",lineHeight:1.5}}>Soluções em Telecomunicações</div>
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
          {user.photo?<img src={user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>👤</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:800,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
          <div style={{fontSize:9,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
        </div>
        <span style={{background:`linear-gradient(135deg,${C.gold},${C.goldL})`,color:"#fff",fontSize:8,fontWeight:900,padding:"3px 6px",borderRadius:6,flexShrink:0,letterSpacing:".06em"}}>{user.role==="admin"?"ADM":user.role==="estoque"?"EST":user.role==="mecanico"?"MEC":user.role==="financeiro"?"FIN":"TEC"}</span>
      </div>
      <div onClick={()=>window.dispatchEvent(new CustomEvent("openPerfil"))} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",cursor:"pointer",color:C.muted,fontSize:12,borderRadius:8,fontWeight:700}}>
        <span>⚙️</span>Meu Perfil
      </div>
      <div onClick={onLogout} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",cursor:"pointer",color:C.red,fontSize:12,borderRadius:8,fontWeight:800}}>
        <span>🚪</span>Sair
      </div>
    </div>
  </div>;
}

/* ── DRAWER MOBILE (menu lateral deslizante) ── */
/* ── DRAWER MOBILE (menu lateral deslizante) ── */
function MobileDrawer({user,page,setPage,onLogout,onClose}){
  const basePerms=user.perms||DEFAULT_PERMS[user.role]||["dash"];
  // Garante que módulos novos do perfil apareçam mesmo em users antigos
  const roleDefaults=DEFAULT_PERMS[user.role]||[];
  const perms=[...new Set([...basePerms,...roleDefaults])];
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
    {isMobile&&<button onClick={onMenuOpen} style={{background:"rgba(255,255,255,.04)",color:C.txt,width:38,height:38,borderRadius:12,fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",padding:4,border:`1px solid ${C.bdr}`}}>☰</button>}
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:isMobile?13:15,fontWeight:900,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        Olá, <span style={{color:C.gold,textShadow:"0 0 14px rgba(209,0,0,.45)"}}>{user.name.split(" ")[0]}</span>
      </div>
      {!isMobile&&<div style={{fontSize:11,color:C.muted,letterSpacing:".02em"}}>{today()}</div>}
    </div>
    {pendSol>0&&<div onClick={()=>setPage("sol")} style={{display:"flex",alignItems:"center",gap:6,background:C.blueD,border:`1px solid ${C.blue}55`,borderRadius:12,padding:isMobile?"7px 10px":"7px 13px",cursor:"pointer",flexShrink:0,boxShadow:"0 0 18px rgba(33,150,243,.16)"}}>
      <span style={{fontSize:13}}>📋</span>
      <span style={{fontSize:12,color:C.blue,fontWeight:900}}>{pendSol}</span>
      {!isMobile&&<span style={{fontSize:12,color:C.blue,fontWeight:800}}>solicitação{pendSol>1?"ões":""}</span>}
    </div>}
    {pendRet>0&&<div onClick={()=>setPage("dev")} style={{display:"flex",alignItems:"center",gap:6,background:C.ylwD,border:`1px solid ${C.ylw}55`,borderRadius:12,padding:isMobile?"7px 10px":"7px 13px",cursor:"pointer",flexShrink:0,boxShadow:"0 0 18px rgba(255,152,0,.16)"}}>
      <span style={{fontSize:13}}>🔔</span>
      {!isMobile&&<span style={{fontSize:12,color:C.ylw,fontWeight:800}}>{pendRet} devolução{pendRet>1?"ões":""}</span>}
      {isMobile&&<span style={{fontSize:12,color:C.ylw,fontWeight:900}}>{pendRet}</span>}
    </div>}
    {!isMobile&&<div style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,.035)",border:`1px solid ${C.bdr2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer",boxShadow:"0 0 20px rgba(209,0,0,.10)"}}>🔔</div>}
  </div>;
}

/* ── BOTTOM NAV MOBILE ── */
/* ── BOTTOM NAV MOBILE ── */
function BottomNav({page,setPage,user,onMenuOpen}){
  const basePerms=user.perms||DEFAULT_PERMS[user.role]||["dash"];
  const roleDefaults=DEFAULT_PERMS[user.role]||[];
  const perms=[...new Set([...basePerms,...roleDefaults])];
  const allItems=ALL_MODULES.filter(m=>perms.includes(m.k)).map(m=>({k:m.k,icon:m.icon,label:m.l.split(" ")[0]}));
  const visible=allItems.slice(0,5);
  const items=[...visible,{k:"__menu",icon:"☰",label:"Menu"}];

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


export { Sidebar, MobileDrawer, TopBar, BottomNav };

