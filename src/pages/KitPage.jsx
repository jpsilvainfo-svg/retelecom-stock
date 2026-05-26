// src/pages/KitPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

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

export default KitPage;
