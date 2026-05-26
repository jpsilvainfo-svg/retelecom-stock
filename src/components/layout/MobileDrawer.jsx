// src/components/layout/MobileDrawer.jsx
import React, { useState, useEffect } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../../lib/constants";
import { Btn, Bdg } from "../ui";

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

export default MobileDrawer;
