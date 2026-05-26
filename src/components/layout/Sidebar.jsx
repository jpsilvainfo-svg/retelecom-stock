// src/components/layout/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../../lib/constants";
import { Btn, Bdg } from "../ui";

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

export default Sidebar;
