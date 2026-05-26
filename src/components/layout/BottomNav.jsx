// src/components/layout/BottomNav.jsx
import React, { useState, useEffect } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../../lib/constants";
import { Btn, Bdg } from "../ui";

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

export default BottomNav;
