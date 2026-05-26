// src/components/layout/TopBar.jsx
import React, { useState, useEffect } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../../lib/constants";
import { Btn, Bdg } from "../ui";

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

export default TopBar;
